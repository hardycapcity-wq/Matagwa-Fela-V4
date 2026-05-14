/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MainTab = 'SQUAD' | 'COUPLES' | 'VAULT' | 'PROFILE';

export type GameMode = 'Squad' | 'Couples';

export type VibeType = 'Icebreaker' | 'Arena' | 'AfterDark';

export interface Player {
  id: string;
  name: string;
  sips: number;
}

export type ScreenType = 
  | 'TAB_VIEW'
  | 'GAME_PLAY'
  | 'LEADERBOARD';

export interface Challenge {
  id: string;
  text: string;
  punishment: number;
  type: 'TRUTH' | 'DARE' | 'SWAP' | 'DOUBLE_SIPS' | 'RULE' | 'GROUP';
  isTrap?: boolean;
}

export interface GameConfig {
  totalTurns: number;
  soundEnabled: boolean;
  ageVerified: boolean;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalSips: number;
  favouriteMode: GameMode | 'None';
  wins: number;
}

export const VIBE_CONFIG = {
  Icebreaker: {
    title: 'ICEBREAKER',
    subtitle: 'LIGHT & FUNNY',
    description: 'Ease into the night with lighthearted questions and silly dares. Perfect for new groups.',
    sips: '1-2 SIPS',
    color: 'primary'
  },
  Arena: {
    title: 'ARENA',
    subtitle: 'COMPETITIVE',
    description: 'High stakes, intense challenges, and zero mercy. Only the strongest squad survives the toxic green night.',
    sips: '2-4 SIPS',
    color: 'secondary'
  },
  AfterDark: {
    title: 'AFTER DARK',
    subtitle: 'ADULTS ONLY',
    description: "Explicit truths and daring risks. Hot pink neon for those who aren't afraid of the heat.",
    sips: '3-5 SIPS',
    color: 'tertiary'
  }
} as const;
