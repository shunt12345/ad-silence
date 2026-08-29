export type ClueType = 'direct' | 'indirect' | 'tangent';

export interface Clue {
  type: ClueType;
  text: string;
}

export interface Puzzle {
  id: string;
  answer: string;
  accepted: string[]; // lowercase alt spellings/synonyms that also count as correct
  // Clue order is always [direct, indirect, tangent, direct, indirect, tangent].
  // The board opens on the first triad (one of each type); the second triad is
  // held back and revealed one at a time, in the same direct/indirect/tangent
  // order, as hints.
  clues: [Clue, Clue, Clue, Clue, Clue, Clue];
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
        type: 'direct',
        text: 'Its blood runs blue instead of red — copper handles the oxygen-carrying job that iron does in humans.',
      },
      {
        type: 'indirect',
        text: 'Neuroscientists arguing that a brain does not need to live in one central place point straight at this animal, since most of its thinking hardware is out in its limbs, not its skull.',
      },
      {
        type: 'tangent',
        text: 'Whatever soft-bodied thing this is, its escape act obeys the exact rule that decides if a cat clears a fence gap: one hard structure sets the limit, and everything squishier than it just follows along.',
      },
      {
        type: 'direct',
        text: 'A female of some species will starve herself guarding a single clutch of over 50,000 eggs for months, dying shortly after they finally hatch.',
      },
      {
        type: 'indirect',
        text: 'Camouflage engineers trying to build fabric that shifts color on command keep reverse-engineering the light-bending skin trick this creature already perfected.',
      },
      {
        type: 'tangent',
        text: 'Three separate pumps keep the blood moving here, the same headcount an aircraft carrier keeps on backup generators just in case one quits mid-crisis.',
      },
    ],
  },
  {
    id: 'volcano',
    answer: 'Volcano',
    accepted: ['volcano', 'volcanoes', 'volcanos'],
    clues: [
      {
        type: 'direct',
        text: 'Magma sitting miles underground can exceed 2,000 degrees Fahrenheit before it ever reaches daylight.',
      },
      {
        type: 'indirect',
        text: 'Climate scientists trying to explain a mysteriously cold summer centuries ago eventually trace the chill back to sulfur this kind of event punched into the upper atmosphere.',
      },
      {
        type: 'tangent',
        text: 'A shaken soda bottle and this landform are running the same script: trap dissolved gas under pressure, drop the pressure suddenly, and watch the contents lose their composure all at once.',
      },
      {
        type: 'direct',
        text: 'One widely used scale rates eruptions from 0 to 8, where each step up represents roughly a tenfold increase in material ejected.',
      },
      {
        type: 'indirect',
        text: 'Farmers on certain islands deliberately work soil that terrifies everyone else, because the same violent history that built the danger also built some of the richest dirt on the planet.',
      },
      {
        type: 'tangent',
        text: 'Champagne producers worry about the identical failure mode that geologists study here — bubbles that stayed peacefully dissolved right up until the moment the cap came off.',
      },
    ],
  },
  {
    id: 'coffee',
    answer: 'Coffee',
    accepted: ['coffee', 'coffee bean', 'coffee beans'],
    clues: [
      {
        type: 'direct',
        text: 'The plant it comes from produces a fruit that looks and tastes far more like a cherry than anything associated with the drink itself.',
      },
      {
        type: 'indirect',
        text: 'Commodity traders watching frost forecasts in Brazil are really watching the fate of one crop whose price swings can move markets thousands of miles away.',
      },
      {
        type: 'tangent',
        text: 'A goat herder noticing his flock would not sleep after snacking on certain red berries is, by legend, the reason half the planet now has a morning ritual involving hot water and anxiety.',
      },
      {
        type: 'direct',
        text: 'A typical serving delivers somewhere around 80 to 100 milligrams of a stimulant that takes the body roughly six hours to clear half of.',
      },
      {
        type: 'indirect',
        text: 'Enlightenment-era historians credit a wave of newly opened public meeting houses — where this drink, not alcohol, kept patrons sharp — with accelerating the spread of radical new ideas across Europe.',
      },
      {
        type: 'tangent',
        text: 'The same molecule that keeps this drink famous also shows up in a defense system some plants run against the insects that try to eat them — it is a pesticide wearing a beverage costume.',
      },
    ],
  },
  {
    id: 'great-wall',
    answer: 'The Great Wall of China',
    accepted: ['great wall of china', 'great wall', 'the great wall'],
    clues: [
      {
        type: 'direct',
        text: 'Some stretches are less a single continuous structure than a patchwork of trenches, rammed-earth mounds, and natural cliffs stitched into one defensive line.',
      },
      {
        type: 'indirect',
        text: 'Historians studying why certain nomadic empires pushed relentlessly westward instead of south point to a very expensive, very long piece of engineering that made the southern route a bad bet.',
      },
      {
        type: 'tangent',
        text: 'The persistent myth that this structure is visible from the Moon fails for the same boring reason a single strand of hair fails to show up in a photo taken from across a football field: it is long, but nowhere near wide enough.',
      },
      {
        type: 'direct',
        text: 'Watchtowers along it could relay a warning across the countryside within hours, using smoke by day and fire beacons by night.',
      },
      {
        type: 'indirect',
        text: 'Modern debates about whether border barriers actually stop determined crossers often cite this ancient megaproject as the original case study — impressive, expensive, and repeatedly gone around.',
      },
      {
        type: 'tangent',
        text: 'Border collies patrol sheep the same way this structure was meant to patrol a country — not by being unbreakable, but by making the cheap routes through obvious and the expensive ones necessary.',
      },
    ],
  },
  {
    id: 'photosynthesis',
    answer: 'Photosynthesis',
    accepted: ['photosynthesis'],
    clues: [
      {
        type: 'direct',
        text: 'The green pigment responsible absorbs nearly every wavelength of visible light except the one it reflects straight back at your eyes.',
      },
      {
        type: 'indirect',
        text: "Geologists explaining why Earth's atmosphere used to be poisonous to most modern life point to a slow-motion pollution event caused entirely by organisms that were, at the time, just trying to make food.",
      },
      {
        type: 'tangent',
        text: 'Solar panels and the green stuff carpeting the planet are both running the same hustle: catch photons, convert them into a form of energy the rest of the system can actually use.',
      },
      {
        type: 'direct',
        text: "A single large tree can produce roughly enough breathable gas in a day to cover one person's needs for that same day.",
      },
      {
        type: 'indirect',
        text: 'Every barrel of oil ever pumped out of the ground is, chemically speaking, an IOU written by this process hundreds of millions of years ago.',
      },
      {
        type: 'tangent',
        text: 'A campfire is this process running in reverse at high speed — stored sunlight, locked away for years, getting cashed out all at once as heat and light.',
      },
    ],
  },
  {
    id: 'bitcoin',
    answer: 'Bitcoin',
    accepted: ['bitcoin', 'btc'],
    clues: [
      {
        type: 'direct',
        text: 'It was introduced in 2008 by a pseudonymous creator known as Satoshi Nakamoto.',
      },
      {
        type: 'indirect',
        text: 'Energy analysts arguing over whether a payment network should be allowed to consume as much electricity as a mid-sized country are almost always arguing about this specific one.',
      },
      {
        type: 'tangent',
        text: 'Gold miners chasing a vein that gets harder to find the deeper they dig are, by design, living out the exact same math that makes this digital asset scarcer with every passing year.',
      },
      {
        type: 'direct',
        text: 'Its total supply is hard-capped at 21 million units, enforced by a decentralized network instead of a bank.',
      },
      {
        type: 'indirect',
        text: 'Central bankers nervous about losing control of monetary policy watch this alternative currency the way established taxi companies once watched the first ride-share apps.',
      },
      {
        type: 'tangent',
        text: 'A potluck where everyone keeps an identical copy of the guest list, so no single lying attendee can sneak an extra name onto it, is basically how this technology stops anyone from cheating.',
      },
    ],
  },
  {
    id: 'eiffel-tower',
    answer: 'The Eiffel Tower',
    accepted: ['eiffel tower', 'the eiffel tower'],
    clues: [
      {
        type: 'direct',
        text: "Its design firm was run by a bridge engineer who, a few years earlier, had built the internal iron framework holding up the Statue of Liberty.",
      },
      {
        type: 'indirect',
        text: 'Architects defending an ugly, unpopular new building often invoke this now-beloved landmark, once mocked so viciously by Parisian artists that many petitioned to have it torn down.',
      },
      {
        type: 'tangent',
        text: 'This structure grows about six inches taller on a hot summer day for the identical reason a metal lid on a stuck jar loosens after running it under hot water: heated metal simply takes up more room.',
      },
      {
        type: 'direct',
        text: 'For 41 years it held the record as the tallest man-made structure on the planet, until a New York skyscraper took the title in 1930.',
      },
      {
        type: 'indirect',
        text: 'City planners studying how a temporary structure becomes a permanent civic icon point to this one, which was originally scheduled for demolition twenty years after it went up.',
      },
      {
        type: 'tangent',
        text: 'Radio hobbyists in the early twentieth century owe a debt to this structure the same way early aviators owed one to a tall hill with good wind — it just happened to be a very convenient tall thing to hang an antenna off of.',
      },
    ],
  },
  {
    id: 'dna',
    answer: 'DNA',
    accepted: ['dna', 'deoxyribonucleic acid'],
    clues: [
      {
        type: 'direct',
        text: "One scientist's X-ray photograph, later nicknamed 'Photo 51,' handed two other researchers the critical clue that let them claim credit for describing its structure in 1953.",
      },
      {
        type: 'indirect',
        text: 'Genealogy companies mailing out cheek-swab kits are selling access to a personal archive that was, until very recently, completely unreadable to anyone.',
      },
      {
        type: 'tangent',
        text: 'A cassette tape and this molecule both store their entire message in the exact order of a small alphabet — four letters here, magnetic pulses there — with no meaning left in any single unit alone.',
      },
      {
        type: 'direct',
        text: 'Stretched out end to end, the strands packed inside a single one of your cells would measure around six feet long.',
      },
      {
        type: 'indirect',
        text: 'Forensic investigators solving decades-old cold cases are really just getting better and better at reading a document that was sitting at the crime scene the entire time.',
      },
      {
        type: 'tangent',
        text: 'Zip files and this molecule share the same obsession: cramming an enormous amount of information into the smallest possible physical space through relentless, elegant compression.',
      },
    ],
  },
  {
    id: 'shakespeare',
    answer: 'William Shakespeare',
    accepted: ['william shakespeare', 'shakespeare'],
    clues: [
      {
        type: 'direct',
        text: "Two of his fellow actors published a collected edition of his plays seven years after his death, without which roughly half of them might have been lost forever.",
      },
      {
        type: 'indirect',
        text: 'Conspiracy theorists insisting that a commoner could not possibly have written such towering literature have spent four centuries trying to pin this author\'s work on noblemen instead.',
      },
      {
        type: 'tangent',
        text: 'Every teenager who has ever texted a crush using a phrase they invented on the spot is doing, in miniature, exactly what this writer did to the English language at industrial scale.',
      },
      {
        type: 'direct',
        text: "He was baptized in a small English market town in 1564, and later left his wife only their 'second-best bed' in his will.",
      },
      {
        type: 'indirect',
        text: 'Linguists tracing the first written use of common phrases like "break the ice" or "wild goose chase" keep landing on the plays of one prolific Elizabethan playwright.',
      },
      {
        type: 'tangent',
        text: "Soap operas thrive on the same tricks this writer leaned on centuries earlier: mistaken identity, poisoned drinks, and family feuds that ruin everyone's wedding plans.",
      },
    ],
  },
  {
    id: 'black-hole',
    answer: 'Black Hole',
    accepted: ['black hole', 'black holes'],
    clues: [
      {
        type: 'direct',
        text: 'The largest known examples, sitting at the centers of galaxies, can weigh as much as several billion Suns.',
      },
      {
        type: 'indirect',
        text: 'Physicists debating whether information can ever truly be destroyed keep returning to this object as the ultimate stress test for the laws of the universe.',
      },
      {
        type: 'tangent',
        text: 'A drain swallowing bathwater and this object are pulling the same trick at wildly different scales: past a certain point, nothing crossing the boundary is coming back out, no matter how hard it fights the current.',
      },
      {
        type: 'direct',
        text: 'The boundary marking its point of no return would measure only about 3.7 miles across for an object with the mass of our Sun.',
      },
      {
        type: 'indirect',
        text: 'The team that captured the first-ever photograph of one had to link telescopes across an entire hemisphere together, effectively building a camera the size of Earth.',
      },
      {
        type: 'tangent',
        text: "Debt that compounds past the point anyone could ever repay it behaves like this object's gravity well — cross a certain threshold and escape stops being mathematically possible, not just difficult.",
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
