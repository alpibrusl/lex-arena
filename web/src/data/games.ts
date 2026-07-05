export interface GameMeta {
  id: string
  icon: string
  title: string
  desc: string
  tags: string[]
  /** New React route (this game has the pro rewrite). */
  path?: string
  /** Legacy static page, still served from examples/ (not yet rewritten). */
  legacyFile?: string
}

export const GAMES: GameMeta[] = [
  {
    id: 'ttt',
    icon: '✕⊙',
    title: 'Tic-Tac-Toe',
    desc: 'Classic 3×3 grid. First to line up three marks wins. Your capability-signed token prevents playing out of turn — the server refuses even a duplicate move attempt.',
    tags: ['2-player', 'competitive'],
    path: '/play/ttt',
  },
  {
    id: 'shop',
    icon: '🛍',
    title: 'Bazaar Draft',
    desc: 'Two shoppers alternate drafting from a shared 6-item pool under a 30-credit budget. Each item has a public price but a hidden true value — highest total cart value wins.',
    tags: ['2-player', 'competitive', 'draft'],
    path: '/play/shop',
  },
  {
    id: 'love',
    icon: '💘',
    title: 'Consent Match',
    desc: 'Swipe right or left on 6 candidates. Only matches where the contact is genuinely interested score charm points. Detecting fake signals is the capability layer’s job.',
    tags: ['2-player', 'competitive', 'social'],
    path: '/play/love',
  },
  {
    id: 'charge',
    icon: '⚡',
    title: 'Charger Duel',
    desc: 'Race to claim the best EV chargers before a departure deadline. Each charger costs minutes and delivers kWh. Fit the most energy into your 60-min budget — the knapsack wins.',
    tags: ['2-player', 'competitive', 'resource race'],
    path: '/play/ev',
  },
  {
    id: 'heist',
    icon: '🔓',
    title: 'Heist Co-op',
    desc: 'Hacker (P1) and Muscle (P2) must clear 6 locked stages in order. Each stage requires the matching role — use the wrong capability and the alarm trips. Three trips and the team is busted.',
    tags: ['2-player', 'co-op', 'capability-gated'],
    path: '/play/heist',
  },
  {
    id: 'football',
    icon: '⚽',
    title: 'Strategy Football',
    desc: 'Two home players (H0, H1) work together to score past a defence of two. Set the squad strategy, coordinate via in-game signals, and find a gap before 24 turns run out.',
    tags: ['2-player', 'co-op', 'strategy'],
    path: '/play/football',
  },
  {
    id: 'notary',
    icon: '🔏',
    title: 'Stamp of Destiny',
    desc: 'You are Milo Quill, mistaken for the harbor\'s new Notary. Bosun Kettle wants a barrel of eels notarized into cash — but your license only covers certain chit categories, and the stamp is genuinely magic. A point-and-click case where the capability grant is the game.',
    tags: ['1-player', 'adventure', 'capability-gated'],
    path: '/play/notary',
  },
]
