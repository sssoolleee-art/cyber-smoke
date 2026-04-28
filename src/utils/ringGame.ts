import type { RingGrade, RingJudgment } from '../types';

export interface RingTarget {
  id: number;
  targetX: number;
  targetY: number;
  size: 'small' | 'medium' | 'large';
  speed: number;
  points: number;
  direction: 'left' | 'right' | 'up';
}

export const JUDGMENT_CONFIG: Record<RingJudgment, {
  label: string; color: string; multiplier: number; threshold: number;
}> = {
  perfect: { label: 'PERFECT', color: '#FFD700', multiplier: 3.0, threshold: 15 },
  great:   { label: 'GREAT',   color: '#FF6B35', multiplier: 2.0, threshold: 35 },
  good:    { label: 'GOOD',    color: '#4ECDC4', multiplier: 1.0, threshold: 60 },
  miss:    { label: 'MISS',    color: '#8892A0', multiplier: 0,   threshold: Infinity },
};

export const RING_GRADE_CONFIG: Record<RingGrade, {
  label: string; emoji: string; color: string; minScore: number;
}> = {
  master:   { label: '연기의 달인', emoji: '🏆', color: '#FFD700', minScore: 1500 },
  expert:   { label: '숙련자',     emoji: '⭐', color: '#FF6B35', minScore: 1000 },
  skilled:  { label: '솜씨 좋은',  emoji: '💨', color: '#4ECDC4', minScore: 600  },
  beginner: { label: '초보',       emoji: '🌬️', color: '#95A5A6', minScore: 300  },
  newbie:   { label: '첫 한 모금', emoji: '🚬', color: '#8892A0', minScore: 0    },
};

export function generateRound(level: number): RingTarget[] {
  return Array.from({ length: 10 }, (_, i) => {
    const difficulty = Math.min(level + i * 0.3, 10);
    return {
      id: i,
      targetX: 15 + Math.random() * 70,
      targetY: 15 + Math.random() * 55,
      size: difficulty > 7 ? 'small' : difficulty > 4 ? 'medium' : 'large',
      speed: 50 + difficulty * 15,
      points: Math.round(50 + difficulty * 20),
      direction: (['left', 'right', 'up'] as const)[Math.floor(Math.random() * 3)],
    };
  });
}

export function judgeRing(
  ringPos: { x: number; y: number },
  targetPos: { x: number; y: number },
): RingJudgment {
  const dist = Math.sqrt(
    Math.pow(ringPos.x - targetPos.x, 2) + Math.pow(ringPos.y - targetPos.y, 2)
  );
  if (dist <= JUDGMENT_CONFIG.perfect.threshold) return 'perfect';
  if (dist <= JUDGMENT_CONFIG.great.threshold) return 'great';
  if (dist <= JUDGMENT_CONFIG.good.threshold) return 'good';
  return 'miss';
}

export function calculateScore(judgment: RingJudgment, basePoints: number): number {
  return Math.round(basePoints * JUDGMENT_CONFIG[judgment].multiplier);
}

export function getRingGrade(score: number): RingGrade {
  if (score >= 1500) return 'master';
  if (score >= 1000) return 'expert';
  if (score >= 600) return 'skilled';
  if (score >= 300) return 'beginner';
  return 'newbie';
}
