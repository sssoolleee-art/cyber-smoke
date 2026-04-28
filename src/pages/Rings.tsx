import { useState, useRef, useEffect, useCallback } from 'react';
import { showInterstitial } from '../utils/ads';
import { BannerAd } from '../utils/ads';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import {
  generateRound, judgeRing, calculateScore, getRingGrade,
  JUDGMENT_CONFIG, RING_GRADE_CONFIG,
} from '../utils/ringGame';
import type { RingJudgment, NavigateFn } from '../types';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

export default function Rings({ navigate }: Props) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [targets] = useState(() => generateRound(1));
  const [ringPos, setRingPos] = useState({ x: -100, y: -100 });
  const [judgment, setJudgment] = useState<RingJudgment | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [adFree, setAdFree] = useState(false);
  const animRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const roundStartRef = useRef(0);

  useEffect(() => {
    getItem<boolean>(STORAGE_KEYS.AD_REMOVE).then(v => setAdFree(v === true));
  }, []);

  // 고리 이동 애니메이션
  useEffect(() => {
    if (round >= 10 || isGameOver || judgment !== null) return;
    const target = targets[round];
    roundStartRef.current = performance.now();

    const animate = (now: number) => {
      const t = (now - roundStartRef.current) / 1000;
      const progress = t * target.speed / 300;
      const w = window.innerWidth;
      const h = window.innerHeight;

      let x: number, y: number;
      if (target.direction === 'right') {
        x = -50 + progress * (w + 100);
        y = (target.targetY / 100) * h;
      } else if (target.direction === 'left') {
        x = w + 50 - progress * (w + 100);
        y = (target.targetY / 100) * h;
      } else {
        x = (target.targetX / 100) * w;
        y = h + 50 - progress * (h + 100);
      }

      setRingPos({ x, y });

      const outOfBounds = x < -100 || x > w + 100 || y < -100;
      if (outOfBounds) {
        handleResult('miss', target.points);
        return;
      }
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [round, isGameOver, judgment]);

  const handleTap = useCallback(() => {
    if (judgment !== null || isGameOver || round >= 10) return;
    cancelAnimationFrame(animRef.current);
    const target = targets[round];
    const tx = (target.targetX / 100) * window.innerWidth;
    const ty = (target.targetY / 100) * window.innerHeight;
    const j = judgeRing(ringPos, { x: tx, y: ty });
    handleResult(j, target.points);
  }, [ringPos, judgment, isGameOver, round]);

  function handleResult(j: RingJudgment, basePoints: number) {
    setJudgment(j);
    if (j !== 'miss') {
      const newCombo = (j === 'perfect' || j === 'great') ? combo + 1 : 0;
      setCombo(newCombo);
      const mul = Math.min(1 + newCombo * 0.2, 3.0);
      const gained = Math.round(calculateScore(j, basePoints) * mul);
      setScore(prev => {
        const next = prev + gained;
        scoreRef.current = next;
        return next;
      });
      if (j === 'perfect') setPerfectCount(p => p + 1);
    } else {
      setCombo(0);
    }

    setTimeout(() => {
      setJudgment(null);
      if (round + 1 >= 10) {
        finishGame();
      } else {
        setRound(r => r + 1);
      }
    }, 700);
  }

  async function finishGame() {
    setIsGameOver(true);
    const finalScore = scoreRef.current;
    const prevBest = await getItem<number>(STORAGE_KEYS.RING_BEST_SCORE) ?? 0;
    if (finalScore > prevBest) {
      await setItem(STORAGE_KEYS.RING_BEST_SCORE, finalScore);
    }
    await showInterstitial();
    navigate('result', {
      score: finalScore,
      perfectCount,
      totalRings: 10,
      grade: getRingGrade(finalScore),
    });
  }

  const currentTarget = targets[round];
  const targetSizePx = { small: 30, medium: 50, large: 70 }[currentTarget?.size ?? 'medium'];
  const gradeConfig = RING_GRADE_CONFIG[getRingGrade(score)];

  return (
    <div style={s.container} onPointerDown={handleTap}>
      {/* 상단 정보 */}
      <div style={s.header}>
        <div>
          <p style={s.roundText}>ROUND {Math.min(round + 1, 10)}/10</p>
          <p style={s.scoreText}>{score.toLocaleString()}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          {combo > 1 && <p style={s.comboText}>COMBO ×{combo}</p>}
          <p style={{ ...s.gradeText, color: gradeConfig.color }}>
            {gradeConfig.emoji} {gradeConfig.label}
          </p>
        </div>
      </div>

      {/* 과녁 */}
      {!isGameOver && currentTarget && (
        <div style={{
          position: 'absolute',
          left: `${currentTarget.targetX}%`,
          top: `${currentTarget.targetY}%`,
          transform: 'translate(-50%,-50%)',
          width: targetSizePx,
          height: targetSizePx,
          borderRadius: '50%',
          border: '2.5px dashed #FF6B35',
          opacity: 0.7,
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)',
            width: 6, height: 6,
            borderRadius: '50%',
            background: '#FF6B35',
            opacity: 0.8,
          }} />
        </div>
      )}

      {/* 연기 고리 */}
      {!judgment && !isGameOver && (
        <div style={{
          position: 'absolute',
          left: ringPos.x,
          top: ringPos.y,
          transform: 'translate(-50%,-50%)',
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '3px solid #C8C8C8',
          pointerEvents: 'none',
          boxShadow: '0 0 8px rgba(200,200,200,0.4)',
        }} />
      )}

      {/* 판정 */}
      {judgment && (
        <div
          className="judgment-label"
          style={{ color: JUDGMENT_CONFIG[judgment].color }}
        >
          {JUDGMENT_CONFIG[judgment].label}
        </div>
      )}

      {/* 안내 텍스트 */}
      <div style={s.tapHint}>
        <p style={{ fontSize: 12, color: '#4A4A6A' }}>화면을 탭해서 고리를 맞추세요</p>
      </div>

      {/* 하단 배너 */}
      {!adFree && (
        <div style={s.adArea}>
          <BannerAd />
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: '#1A1A2E',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    touchAction: 'none',
  },
  header: {
    position: 'absolute',
    top: 52,
    left: 20,
    right: 20,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
    pointerEvents: 'none',
  },
  roundText: {
    fontSize: 12,
    color: '#8892A0',
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: 900,
    color: '#EAEAEA',
    letterSpacing: '-1px',
  },
  comboText: {
    fontSize: 14,
    fontWeight: 800,
    color: '#FFD700',
    marginBottom: 4,
    textAlign: 'right',
  },
  gradeText: {
    fontSize: 12,
    fontWeight: 700,
    textAlign: 'right',
  },
  tapHint: {
    position: 'absolute',
    bottom: 70,
    width: '100%',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  adArea: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
};
