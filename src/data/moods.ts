import type { MoodId } from '../types';

export const MOOD_CONFIG: Record<MoodId, { label: string; emoji: string }> = {
  chill:    { label: '여유',    emoji: '😌' },
  tired:    { label: '피곤',   emoji: '😮‍💨' },
  happy:    { label: '기분좋음', emoji: '😊' },
  stressed: { label: '스트레스', emoji: '😤' },
  bored:    { label: '심심',   emoji: '😑' },
  thinking: { label: '생각중', emoji: '🤔' },
  angry:    { label: '화남',   emoji: '😡' },
  sad:      { label: '슬픔',   emoji: '😢' },
  excited:  { label: '신남',   emoji: '🤩' },
  sleepy:   { label: '졸림',   emoji: '😴' },
};

export const MOOD_IDS = Object.keys(MOOD_CONFIG) as MoodId[];
