const { execFile } = require('child_process');

// Windows has no shell-native "set default device volume to N%" command.
// This drives the same Core Audio interface (IAudioEndpointVolume) the
// OS's own volume mixer uses, via a small C# shim compiled on the fly with
// PowerShell's Add-Type — no compiled native addon or external module
// (nircmd, AudioDeviceCmdlets, ...) required. Get/SetMasterVolumeLevelScalar
// give us a real, queryable 0-100 level so ads can be ducked to a specific
// quiet percentage rather than only silenced outright.
//
// If the COM interop fails for any reason (locked-down PowerShell,
// execution policy, missing .NET, etc.) we fall back to the hardware mute
// virtual key, which can only approximate "duck" as "fully muted" or
// "unmuted" — real percentage levels aren't achievable without COM.

const PS_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    int NotImpl1();
    int NotImpl2();
    int GetChannelCount(out uint count);
    int SetMasterVolumeLevel(float level, ref Guid context);
    int SetMasterVolumeLevelScalar(float level, ref Guid context);
    int GetMasterVolumeLevel(out float level);
    int GetMasterVolumeLevelScalar(out float level);
    int SetChannelVolumeLevel(uint channel, float level, ref Guid context);
    int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid context);
    int GetChannelVolumeLevel(uint channel, out float level);
    int GetChannelVolumeLevelScalar(uint channel, out float level);
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    int GetMute(out bool mute);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object endpoint);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    int NotImpl1();
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject { }

public static class DefaultAudioEndpoint {
    public static IAudioEndpointVolume Get() {
        var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorComObject();
        IMMDevice device;
        enumerator.GetDefaultAudioEndpoint(0, 1, out device);
        var iid = typeof(IAudioEndpointVolume).GUID;
        object epv;
        device.Activate(ref iid, 23, IntPtr.Zero, out epv);
        return (IAudioEndpointVolume)epv;
    }
}
"@

$ctx = [Guid]::Empty
$epv = [DefaultAudioEndpoint]::Get()

switch ($env:AD_SILENCER_ACTION) {
  'get' {
    $level = 0.0
    $epv.GetMasterVolumeLevelScalar([ref]$level) | Out-Null
    Write-Output ([Math]::Round($level * 100))
  }
  'set' {
    $target = [float]($env:AD_SILENCER_LEVEL) / 100.0
    $epv.SetMasterVolumeLevelScalar($target, [ref]$ctx) | Out-Null
  }
}
`;

function runComInterop(action, level) {
  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-Command', PS_SCRIPT],
      { env: { ...process.env, AD_SILENCER_ACTION: action, AD_SILENCER_LEVEL: String(level ?? '') } },
      (err, stdout, stderr) => {
        if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
        else resolve(stdout.trim());
      }
    );
  });
}

// Fallback: toggle the hardware mute virtual key (0xAD). Can only
// approximate "duck" as fully muted (0) vs unmuted (assume 100).
let fallbackVolume = 100;

function sendMuteKey() {
  return new Promise((resolve, reject) => {
    const script = '(New-Object -ComObject WScript.Shell).SendKeys([char]173)';
    execFile('powershell', ['-NoProfile', '-Command', script], (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve();
    });
  });
}

let comInteropBroken = false;

async function getVolume() {
  if (!comInteropBroken) {
    try {
      return Number(await runComInterop('get'));
    } catch (err) {
      console.error('[ad-silencer] Core Audio interop failed, falling back to mute-key toggle:', err.message);
      comInteropBroken = true;
    }
  }
  return fallbackVolume;
}

async function setVolume(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  if (!comInteropBroken) {
    try {
      await runComInterop('set', clamped);
      return;
    } catch (err) {
      console.error('[ad-silencer] Core Audio interop failed, falling back to mute-key toggle:', err.message);
      comInteropBroken = true;
    }
  }
  const wantsMuted = clamped === 0;
  const isMuted = fallbackVolume === 0;
  if (wantsMuted !== isMuted) {
    await sendMuteKey();
  }
  fallbackVolume = clamped;
}

module.exports = { getVolume, setVolume };
