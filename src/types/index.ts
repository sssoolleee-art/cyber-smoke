// ── Character types ──────────────────────────────────────────────────────────

export type CharacterId =
  | 'pepe'
  | 'kirby'
  | 'dog'
  | 'cat'
  | 'pikachu'
  | 'skeleton'
  | 'astronaut'
  | 'office'
  | 'penguin'
  | 'bear'
  | 'ghost'
  | 'dragon'
  | 'robot'
  | 'alien'
  | 'wizard'
  | 'ninja'
  | 'cowboy'
  | 'vampire'
  | 'chef'
  | 'king'
  | 'golden_pepe'
  | 'neon_cat'
  | 'hologram';

export type UnlockCondition =
  | { type: 'default' }
  | { type: 'total_smokes'; count: number }
  | { type: 'streak'; days: number }
  | { type: 'ring_score'; score: number }
  | { type: 'time_range'; hour: [number, number]; count: number }
  | { type: 'weekday_streak'; days: number }
  | { type: 'speed_smoke'; count: number }
  | { type: 'collection_percent'; percent: number }
  | { type: 'iap'; productId: string };

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  emoji: string;
  unlockCondition: UnlockCondition;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'premium';
  smokeColor: string;
  description: string;
}

// ── Mood types ───────────────────────────────────────────────────────────────

export type MoodId =
  | 'chill'
  | 'tired'
  | 'happy'
  | 'stressed'
  | 'bored'
  | 'thinking'
  | 'angry'
  | 'sad'
  | 'excited'
  | 'sleepy';

export interface MoodEntry {
  date: string;
  time: string;
  mood: MoodId;
  message?: string;
  characterId: CharacterId;
}

// ── Ring game types ──────────────────────────────────────────────────────────

export type RingGrade = 'master' | 'expert' | 'skilled' | 'beginner' | 'newbie';

export interface RingSession {
  date: string;
  score: number;
  perfectCount: number;
  totalRings: number;
  grade: RingGrade;
}

export type RingJudgment = 'perfect' | 'great' | 'good' | 'miss';

// ── Achievement types ────────────────────────────────────────────────────────

export type AchievementId =
  | 'first_smoke'
  | 'ten_smokes'
  | 'hundred_smokes'
  | 'thousand_smokes'
  | 'streak_3'
  | 'streak_7'
  | 'streak_14'
  | 'streak_30'
  | 'ring_perfect_5'
  | 'ring_master'
  | 'night_owl'
  | 'early_bird'
  | 'full_day'
  | 'collector_half'
  | 'collector_all'
  | 'mood_variety';

// ── Stats types ──────────────────────────────────────────────────────────────

export interface SmokerProfile {
  totalSmokes: number;
  currentStreak: number;
  longestStreak: number;
  favoriteTime: string;
  favoriteMood: MoodId;
  characterCount: number;
  totalCharacters: number;
  ringBestScore: number;
  ringBestGrade: RingGrade;
  daysActive: number;
  title: string;
}

export function getTitle(profile: SmokerProfile): string {
  if (profile.totalSmokes >= 1000) return '흡연장의 전설';
  if (profile.currentStreak >= 30) return '개근상 수상자';
  if (profile.characterCount >= 15) return '캐릭터 수집왕';
  if (profile.ringBestGrade === 'master') return '연기의 달인';
  if (profile.totalSmokes >= 500) return '단골손님';
  if (profile.totalSmokes >= 100) return '흡연장 주민';
  if (profile.currentStreak >= 7) return '꾸준한 흡연러';
  if (profile.totalSmokes >= 30) return '흡연장 상비군';
  if (profile.totalSmokes >= 10) return '흡연장 입문자';
  return '흡연장 새내기';
}

// ── Navigation types ─────────────────────────────────────────────────────────

export type PageName = 'index' | 'smoke' | 'rings' | 'result' | 'collection' | 'share';

export interface NavState {
  page: PageName;
  params?: Record<string, unknown>;
}

export type NavigateFn = (page: PageName, params?: Record<string, unknown>) => void;
