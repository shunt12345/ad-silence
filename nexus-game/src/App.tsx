import { useMemo, useState } from 'react';
import { Puzzle, PUZZLES, isCorrectGuess, randomPuzzle, todaysPuzzle } from './puzzles';

// Clue order is [direct, indirect, tangent, direct, indirect, tangent]. The
// board opens on the first triad (indices 0-2, one of each type). The second
// triad (indices 3-5) is held back and revealed one at a time, in the same
// direct/indirect/tangent order, as hints.
const INITIAL_INDICES = [0, 1, 2];
const HINT_INDICES = [3, 4, 5];

const HINT_PENALTY = 30;
const WRONG_GUESS_PENALTY = 5;
const BASE_SCORE = 100;

type NodeAngleDeg = number;

const NODE_ANGLES: NodeAngleDeg[] = [270, 330, 30, 90, 150, 210];

type Status = 'playing' | 'won' | 'gaveUp';

function scoreFor(hintsRevealed: number, wrongGuesses: number): number {
  const raw = BASE_SCORE - hintsRevealed * HINT_PENALTY - wrongGuesses * WRONG_GUESS_PENALTY;
  return Math.max(10, raw);
}

export default function App() {
  const [mode, setMode] = useState<'daily' | 'practice'>('daily');
  const [puzzle, setPuzzle] = useState<Puzzle>(() => todaysPuzzle());
  const [revealedHints, setRevealedHints] = useState<number[]>([]);
  const [guess, setGuess] = useState('');
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('playing');

  const visibleIndices = useMemo(
    () => [...INITIAL_INDICES, ...revealedHints].sort((a, b) => a - b),
    [revealedHints],
  );

  function newGame(nextMode: 'daily' | 'practice') {
    setMode(nextMode);
    setPuzzle(nextMode === 'daily' ? todaysPuzzle() : randomPuzzle(puzzle.id));
    setRevealedHints([]);
    setGuess('');
    setWrongGuesses([]);
    setStatus('playing');
  }

  function submitGuess(e: React.FormEvent) {
    e.preventDefault();
    if (status !== 'playing' || !guess.trim()) return;
    if (isCorrectGuess(puzzle, guess)) {
      setStatus('won');
    } else {
      setWrongGuesses((w) => [...w, guess.trim()]);
      setGuess('');
    }
  }

  function revealHint() {
    if (status !== 'playing') return;
    const next = HINT_INDICES.find((i) => !revealedHints.includes(i));
    if (next === undefined) return;
    setRevealedHints((r) => [...r, next]);
  }

  function giveUp() {
    if (status !== 'playing') return;
    setStatus('gaveUp');
  }

  const finalScore = status === 'won' ? scoreFor(revealedHints.length, wrongGuesses.length) : 0;
  const hintsLeft = HINT_INDICES.length - revealedHints.length;

  function shareText(): string {
    const nodesUsed = 3 + revealedHints.length;
    if (status === 'won') {
      return `Nexus — ${puzzle.id}\nSolved with ${nodesUsed}/6 nodes, ${wrongGuesses.length} wrong guess${
        wrongGuesses.length === 1 ? '' : 'es'
      }. Score: ${finalScore}`;
    }
    return `Nexus — ${puzzle.id}\nGave up. The answer was ${puzzle.answer}.`;
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText());
    } catch {
      // clipboard access denied — nothing to fall back to, silently ignore
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Nexus</h1>
        <p className="tagline">Six clues orbit a hidden topic — direct, indirect, tangent, then that trio again. Name the center.</p>
        <div className="mode-toggle">
          <button className={mode === 'daily' ? 'active' : ''} onClick={() => newGame('daily')}>
            Daily
          </button>
          <button className={mode === 'practice' ? 'active' : ''} onClick={() => newGame('practice')}>
            Practice
          </button>
        </div>
      </header>

      <div className="board">
        <div className="center-node">
          {status === 'playing' ? (
            <span className="center-mark">?</span>
          ) : (
            <span className="center-answer">{puzzle.answer}</span>
          )}
        </div>

        {NODE_ANGLES.map((angle, i) => {
          const visible = visibleIndices.includes(i);
          const clue = puzzle.clues[i];
          const radius = 38;
          const rad = (angle * Math.PI) / 180;
          const x = 50 + radius * Math.cos(rad);
          const y = 50 + radius * Math.sin(rad);
          return (
            <div
              key={i}
              className={`node ${visible ? `node-${clue.type}` : 'node-hidden'}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              {visible ? (
                <>
                  <span className="node-type">{clue.type}</span>
                  <p>{clue.text}</p>
                </>
              ) : (
                <span className="node-lock">locked hint</span>
              )}
            </div>
          );
        })}
      </div>

      {status === 'playing' && (
        <div className="controls">
          <form onSubmit={submitGuess}>
            <input
              autoFocus
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="What's at the center?"
            />
            <button type="submit">Guess</button>
          </form>
          <div className="secondary-actions">
            <button onClick={revealHint} disabled={hintsLeft === 0}>
              Reveal a hint node ({hintsLeft} left, -{HINT_PENALTY} pts)
            </button>
            <button className="give-up" onClick={giveUp}>
              Give up
            </button>
          </div>
          {wrongGuesses.length > 0 && (
            <p className="wrong-log">
              Not it: {wrongGuesses.join(', ')}
            </p>
          )}
        </div>
      )}

      {status !== 'playing' && (
        <div className="result">
          {status === 'won' ? (
            <>
              <h2>Nailed it — {puzzle.answer}</h2>
              <p>
                Solved using {3 + revealedHints.length}/6 nodes and {wrongGuesses.length} wrong guess
                {wrongGuesses.length === 1 ? '' : 'es'}.
              </p>
              <p className="score">Score: {finalScore}</p>
            </>
          ) : (
            <>
              <h2>The center was: {puzzle.answer}</h2>
              <p>No shame — some of these tangents are unreasonable.</p>
            </>
          )}
          <div className="result-actions">
            <button onClick={copyShare}>Copy result</button>
            <button onClick={() => newGame('practice')}>Play another</button>
          </div>
        </div>
      )}

      <footer>
        <p>{PUZZLES.length} puzzles loaded. Built on the same direct / indirect / tangent branch logic as Hypha.</p>
      </footer>
    </div>
  );
}
