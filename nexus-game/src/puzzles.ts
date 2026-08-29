export type ClueType = 'direct' | 'indirect' | 'tangent';

export interface Clue {
  type: ClueType;
  text: string;
}

export interface Puzzle {
  id: string;
  answer: string;
  accepted: string[]; // lowercase alt spellings/synonyms that also count as correct
  clues: [Clue, Clue, Clue, Clue, Clue, Clue]; // exactly 2 direct, 2 indirect, 2 tangent
}

function norm(s: string): string {
  return s.toLowerCase().trim();
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'octopus',
    answer: 'Octopus',
    accepted: ['octopus', 'octopi', 'octopuses'],
    clues: [
      {
        type: 'tangent',
        text: 'Whatever soft-bodied thing this is, its escape act obeys the exact rule that decides if a cat clears a fence gap: one hard structure sets the limit, and everything squishier than it just follows along.',
      },
      {
        type: 'tangent',
        text: 'Three separate pumps keep the blood moving here, the same headcount an aircraft carrier keeps on backup generators just in case one quits mid-crisis.',
      },
      {
        type: 'indirect',
        text: 'Neuroscientists arguing that a brain does not need to live in one central place point straight at this animal, since most of its thinking hardware is out in its limbs, not its skull.',
      },
      {
        type: 'indirect',
        text: 'Camouflage engineers trying to build fabric that shifts color on command keep reverse-engineering the light-bending skin trick this creature already perfected.',
      },
      {
        type: 'direct',
        text: 'Its blood runs blue instead of red, because copper does the oxygen-carrying job iron does in humans.',
      },
      {
        type: 'direct',
        text: 'It can wriggle its entire boneless body through any opening wider than its beak, the only rigid part it owns.',
      },
    ],
  },
  {
    id: 'volcano',
    answer: 'Volcano',
    accepted: ['volcano', 'volcanoes', 'volcanos'],
    clues: [
      {
        type: 'tangent',
        text: 'A shaken soda bottle and this landform are running the same script: trap dissolved gas under pressure, drop the pressure suddenly, and watch the contents lose their composure all at once.',
      },
      {
        type: 'tangent',
        text: 'Champagne producers worry about the identical failure mode that geologists study here — bubbles that stayed peacefully dissolved right up until the moment the cap came off.',
      },
      {
        type: 'indirect',
        text: 'Climate scientists trying to explain a mysteriously cold summer centuries ago eventually trace the chill back to sulfur this kind of event punched into the upper atmosphere.',
      },
      {
        type: 'indirect',
        text: 'Farmers on certain islands deliberately work soil that terrifies everyone else, because the same violent history that built the danger also built some of the richest dirt on the planet.',
      },
      {
        type: 'direct',
        text: 'Molten rock rises through a crack in the crust and, given enough built-up pressure, erupts as lava, ash, or gas.',
      },
      {
        type: 'direct',
        text: 'They are ranked as active, dormant, or extinct depending on how recently — and how likely again — they have blown their top.',
      },
    ],
  },
  {
    id: 'coffee',
    answer: 'Coffee',
    accepted: ['coffee', 'coffee bean', 'coffee beans'],
    clues: [
      {
        type: 'tangent',
        text: 'A goat herder noticing his flock would not sleep after snacking on certain red berries is, by legend, the reason half the planet now has a morning ritual involving hot water and anxiety.',
      },
      {
        type: 'tangent',
        text: 'The same molecule that keeps this drink famous also shows up in a defense system some plants run against the insects that try to eat them — it is a pesticide wearing a beverage costume.',
      },
      {
        type: 'indirect',
        text: 'Commodity traders watching frost forecasts in Brazil are really watching the fate of one crop whose price swings can move markets thousands of miles away.',
      },
      {
        type: 'indirect',
        text: 'Enlightenment-era historians credit a wave of newly opened public meeting houses — where this drink, not alcohol, kept patrons sharp — with accelerating the spread of radical new ideas across Europe.',
      },
      {
        type: 'direct',
        text: 'It is brewed from roasted seeds found inside the fruit of a particular flowering shrub.',
      },
      {
        type: 'direct',
        text: 'Caffeine is the active stimulant responsible for the alertness it is famous for delivering.',
      },
    ],
  },
  {
    id: 'great-wall',
    answer: 'The Great Wall of China',
    accepted: ['great wall of china', 'great wall', 'the great wall'],
    clues: [
      {
        type: 'tangent',
        text: 'The persistent myth that this structure is visible from the Moon fails for the same boring reason a single strand of hair fails to show up in a photo taken from across a football field: it is long, but nowhere near wide enough.',
      },
      {
        type: 'tangent',
        text: 'Border collies patrol sheep the same way this structure was meant to patrol a country — not by being unbreakable, but by making the cheap routes through obvious and the expensive ones necessary.',
      },
      {
        type: 'indirect',
        text: 'Historians studying why certain nomadic empires pushed relentlessly westward instead of south point to a very expensive, very long piece of engineering that made the southern route a bad bet.',
      },
      {
        type: 'indirect',
        text: 'Modern debates about whether border barriers actually stop determined crossers often cite this ancient megaproject as the original case study — impressive, expensive, and repeatedly gone around.',
      },
      {
        type: 'direct',
        text: 'It was built and rebuilt across multiple Chinese dynasties, most famously reinforced during the Ming dynasty.',
      },
      {
        type: 'direct',
        text: 'It stretches for thousands of miles across northern China, following mountain ridgelines rather than the shortest path.',
      },
    ],
  },
  {
    id: 'photosynthesis',
    answer: 'Photosynthesis',
    accepted: ['photosynthesis'],
    clues: [
      {
        type: 'tangent',
        text: 'Solar panels and the green stuff carpeting the planet are both running the same hustle: catch photons, convert them into a form of energy the rest of the system can actually use.',
      },
      {
        type: 'tangent',
        text: 'A campfire is this process running in reverse at high speed — stored sunlight, locked away for years, getting cashed out all at once as heat and light.',
      },
      {
        type: 'indirect',
        text: 'Geologists explaining why Earth\'s atmosphere used to be poisonous to most modern life point to a slow-motion pollution event caused entirely by organisms that were, at the time, just trying to make food.',
      },
      {
        type: 'indirect',
        text: 'Every barrel of oil ever pumped out of the ground is, chemically speaking, an IOU written by this process hundreds of millions of years ago.',
      },
      {
        type: 'direct',
        text: 'It converts sunlight, water, and carbon dioxide into glucose, releasing oxygen as a byproduct.',
      },
      {
        type: 'direct',
        text: 'It happens inside chloroplasts, the pigment-packed structures that give plant leaves their green color.',
      },
    ],
  },
  {
    id: 'bitcoin',
    answer: 'Bitcoin',
    accepted: ['bitcoin', 'btc'],
    clues: [
      {
        type: 'tangent',
        text: 'Gold miners chasing a vein that gets harder to find the deeper they dig are, by design, living out the exact same math that makes this digital asset scarcer with every passing year.',
      },
      {
        type: 'tangent',
        text: 'A potluck where everyone keeps an identical copy of the guest list, so no single lying attendee can sneak an extra name onto it, is basically how this technology stops anyone from cheating.',
      },
      {
        type: 'indirect',
        text: 'Energy analysts arguing over whether a payment network should be allowed to consume as much electricity as a mid-sized country are almost always arguing about this specific one.',
      },
      {
        type: 'indirect',
        text: 'Central bankers nervous about losing control of monetary policy watch this alternative currency the way established taxi companies once watched the first ride-share apps.',
      },
      {
        type: 'direct',
        text: 'It was introduced in 2008 by a pseudonymous creator known as Satoshi Nakamoto.',
      },
      {
        type: 'direct',
        text: 'Its total supply is capped at 21 million coins, verified by a decentralized network rather than a bank.',
      },
    ],
  },
  {
    id: 'eiffel-tower',
    answer: 'The Eiffel Tower',
    accepted: ['eiffel tower', 'the eiffel tower'],
    clues: [
      {
        type: 'tangent',
        text: 'This structure grows about six inches taller on a hot summer day for the identical reason a metal lid on a stuck jar loosens after running it under hot water: heated metal simply takes up more room.',
      },
      {
        type: 'tangent',
        text: 'Radio hobbyists in the early twentieth century owe a debt to this structure the same way early aviators owed one to a tall hill with good wind — it just happened to be a very convenient tall thing to hang an antenna off of.',
      },
      {
        type: 'indirect',
        text: 'Architects defending an ugly, unpopular new building often invoke this now-beloved landmark, once mocked so viciously by Parisian artists that many petitioned to have it torn down.',
      },
      {
        type: 'indirect',
        text: 'City planners studying how a temporary structure becomes a permanent civic icon point to this one, which was originally scheduled for demolition twenty years after it went up.',
      },
      {
        type: 'direct',
        text: 'It was built by Gustave Eiffel\'s engineering firm as the entrance arch for the 1889 World\'s Fair.',
      },
      {
        type: 'direct',
        text: 'It stands in Paris, France, and was for decades the tallest man-made structure on Earth.',
      },
    ],
  },
  {
    id: 'dna',
    answer: 'DNA',
    accepted: ['dna', 'deoxyribonucleic acid'],
    clues: [
      {
        type: 'tangent',
        text: 'A cassette tape and this molecule both store their entire message in the exact order of a small alphabet — four letters here, magnetic pulses there — with no meaning left in any single unit alone.',
      },
      {
        type: 'tangent',
        text: 'Zip files and this molecule share the same obsession: cramming an enormous amount of information into the smallest possible physical space through relentless, elegant compression.',
      },
      {
        type: 'indirect',
        text: 'Genealogy companies mailing out cheek-swab kits are selling access to a personal archive that was, until very recently, completely unreadable to anyone.',
      },
      {
        type: 'indirect',
        text: 'Forensic investigators solving decades-old cold cases are really just getting better and better at reading a document that was sitting at the crime scene the entire time.',
      },
      {
        type: 'direct',
        text: 'It is shaped like a double helix, discovered by Watson and Crick with critical help from Rosalind Franklin\'s X-ray images.',
      },
      {
        type: 'direct',
        text: 'It carries genetic instructions using four chemical bases: adenine, thymine, guanine, and cytosine.',
      },
    ],
  },
  {
    id: 'shakespeare',
    answer: 'William Shakespeare',
    accepted: ['william shakespeare', 'shakespeare'],
    clues: [
      {
        type: 'tangent',
        text: 'Every teenager who has ever texted a crush using a phrase they invented on the spot is doing, in miniature, exactly what this writer did to the English language at industrial scale.',
      },
      {
        type: 'tangent',
        text: 'Soap operas thrive on the same tricks this writer leaned on centuries earlier: mistaken identity, poisoned drinks, and family feuds that ruin everyone\'s wedding plans.',
      },
      {
        type: 'indirect',
        text: 'Conspiracy theorists insisting that a commoner could not possibly have written such towering literature have spent four centuries trying to pin this author\'s work on noblemen instead.',
      },
      {
        type: 'indirect',
        text: 'Linguists tracing the first written use of common phrases like "break the ice" or "wild goose chase" keep landing on the plays of one prolific Elizabethan playwright.',
      },
      {
        type: 'direct',
        text: 'He wrote Hamlet, Macbeth, Romeo and Juliet, and dozens of other plays performed at London\'s Globe Theatre.',
      },
      {
        type: 'direct',
        text: 'He was born in Stratford-upon-Avon in 1564 and is widely considered the greatest writer in the English language.',
      },
    ],
  },
  {
    id: 'black-hole',
    answer: 'Black Hole',
    accepted: ['black hole', 'black holes'],
    clues: [
      {
        type: 'tangent',
        text: 'A drain swallowing bathwater and this object are pulling the same trick at wildly different scales: past a certain point, nothing crossing the boundary is coming back out, no matter how hard it fights the current.',
      },
      {
        type: 'tangent',
        text: 'Debt that compounds past the point anyone could ever repay it behaves like this object\'s gravity well — cross a certain threshold and escape stops being mathematically possible, not just difficult.',
      },
      {
        type: 'indirect',
        text: 'Physicists debating whether information can ever truly be destroyed keep returning to this object as the ultimate stress test for the laws of the universe.',
      },
      {
        type: 'indirect',
        text: 'The team that captured the first-ever photograph of one had to link telescopes across an entire hemisphere together, effectively building a camera the size of Earth.',
      },
      {
        type: 'direct',
        text: 'It forms when a massive star collapses under its own gravity after running out of nuclear fuel.',
      },
      {
        type: 'direct',
        text: 'Its gravity is so strong that not even light can escape once it crosses the event horizon.',
      },
    ],
  },
];

export function todaysPuzzle(): Puzzle {
  const epoch = new Date(2026, 0, 1).getTime();
  const daysSinceEpoch = Math.floor((Date.now() - epoch) / 86400000);
  const index = ((daysSinceEpoch % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
  return PUZZLES[index];
}

export function randomPuzzle(excludeId?: string): Puzzle {
  const pool = excludeId ? PUZZLES.filter((p) => p.id !== excludeId) : PUZZLES;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function isCorrectGuess(puzzle: Puzzle, guess: string): boolean {
  const g = norm(guess);
  if (!g) return false;
  if (g === norm(puzzle.answer)) return true;
  return puzzle.accepted.some((a) => norm(a) === g);
}
