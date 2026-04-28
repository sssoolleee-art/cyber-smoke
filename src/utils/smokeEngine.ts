export interface SmokeParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
}

export function generateSmokePuff(tapX: number, tapY: number): Omit<SmokeParticle, 'id'>[] {
  const count = 3 + Math.floor(Math.random() * 4); // 3~6개
  return Array.from({ length: count }, () => ({
    x: tapX + (Math.random() - 0.5) * 20,
    y: tapY,
    size: 8 + Math.random() * 16,
    opacity: 0.3 + Math.random() * 0.4,
    duration: 2 + Math.random() * 3,
    delay: Math.random() * 0.5,
    drift: (Math.random() - 0.5) * 60,
  }));
}

// CSS keyframes (index.css에 정의됨)
// .smoke-particle: smokeRise 애니메이션
// .ember: emberGlow 애니메이션
