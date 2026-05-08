import { useState, useEffect } from 'react';
import { showInterstitial, BannerAd } from '../utils/ads';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { RING_GRADE_CONFIG } from '../utils/ringGame';
import type { RingGrade, NavigateFn } from '../types';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

export default function Result({ navigate, params }: Props) {
  const score = (params.score as number) ?? 0;
  const perfectCount = (params.perfectCount as number) ?? 0;
  const totalRings = (params.totalRings as number) ?? 10;
  const grade = (params.grade as RingGrade) ?? 'newbie';

  const [bestScore, setBestScore] = useState(0);
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [adFree, setAdFree] = useState(false);

  useEffect(() => {
    (async () => {
      const [best, adR, ringToday] = await Promise.all([
        getItem<number>(STORAGE_KEYS.RING_BEST_SCORE),
        getItem<boolean>(STORAGE_KEYS.AD_REMOVE),
        getItem<{ date: string; count: number }>(STORAGE_KEYS.RING_TODAY),
      ]);
      setBestScore(best ?? 0);
      setAdFree(adR === true);
      const today = new Date().toISOString().slice(0, 10);
      if (!ringToday || ringToday.date !== today) {
        setCanPlayFree(true);
      } else {
        setCanPlayFree(ringToday.count < 2);
      }
    })();
  }, []);

  async function handleRetry() {
    if (canPlayFree) {
      const today = new Date().toISOString().slice(0, 10);
      const ringToday = await getItem<{ date: string; count: number }>(STORAGE_KEYS.RING_TODAY);
      const count = (ringToday?.date === today ? ringToday.count : 0) + 1;
      await setItem(STORAGE_KEYS.RING_TODAY, { date: today, count });
      navigate('rings');
    } else {
      await showInterstitial();
      navigate('rings');
    }
  }

  const gradeConfig = RING_GRADE_CONFIG[grade];
  const isNewBest = score > 0 && score >= bestScore;
  const missCount = totalRings - perfectCount - Math.max(0, totalRings - perfectCount);
  const greatCount = Math.max(0, totalRings - perfectCount - missCount);

  return (
    <div style={s.container}>
      <h1 style={s.title}>🎯 결과</h1>

      {/* 점수 */}
      <div style={s.scoreCard}>
        <p style={{ ...s.scoreNum, color: gradeConfig.color }}>
          {score.toLocaleString()}
        </p>
        <p style={s.gradeLabel}>
          {gradeConfig.emoji} {gradeConfig.label}
        </p>
        {isNewBest && (
          <p style={s.newBest}>🎉 새 최고 기록!</p>
        )}
      </div>

      {/* 세부 결과 */}
      <div style={s.detailCard}>
        <div style={s.detailRow}>
          <span style={{ color: '#FFD700' }}>PERFECT</span>
          <span>{perfectCount}회</span>
        </div>
        <div style={s.detailRow}>
          <span style={{ color: '#FF6B35' }}>GREAT</span>
          <span>—</span>
        </div>
        <div style={s.detailRow}>
          <span style={{ color: '#4ECDC4' }}>GOOD</span>
          <span>—</span>
        </div>
        <div style={s.detailDivider} />
        <div style={s.detailRow}>
          <span style={{ color: '#8892A0' }}>최고 기록</span>
          <span style={{ color: '#8892A0' }}>{Math.max(bestScore, score).toLocaleString()}</span>
        </div>
      </div>

      {/* 버튼 */}
      <div style={s.btnRow}>
        <button style={s.retryBtn} onClick={handleRetry}>
          {canPlayFree ? '다시 도전' : '🎬 광고 보고 한판 더'}
        </button>
        <button
          style={s.shareBtn}
          onClick={() => navigate('share', { fromRings: true })}
        >
          결과 공유
        </button>
      </div>

      <button style={s.homeBtn} onClick={() => navigate('index')}>
        흡연장으로 돌아가기
      </button>

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
    padding: '52px 20px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    color: '#EAEAEA',
    letterSpacing: '-0.5px',
  },
  scoreCard: {
    textAlign: 'center',
    padding: '24px 0',
    width: '100%',
  },
  scoreNum: {
    fontSize: 64,
    fontWeight: 900,
    letterSpacing: '-3px',
    lineHeight: 1,
  },
  gradeLabel: {
    fontSize: 20,
    fontWeight: 700,
    color: '#EAEAEA',
    marginTop: 8,
  },
  newBest: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FFD700',
    marginTop: 8,
  },
  detailCard: {
    background: '#16213E',
    borderRadius: 16,
    padding: '20px 24px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 14,
    fontWeight: 600,
    color: '#EAEAEA',
  },
  detailDivider: {
    height: 1,
    background: '#2A2A4E',
    margin: '2px 0',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    width: '100%',
  },
  retryBtn: {
    flex: 1,
    padding: '16px 8px',
    fontSize: 15,
    fontWeight: 800,
    color: '#1A1A2E',
    background: '#FF6B35',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.3px',
  },
  shareBtn: {
    flex: 1,
    padding: 16,
    fontSize: 15,
    fontWeight: 700,
    color: '#EAEAEA',
    background: '#16213E',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  homeBtn: {
    background: 'none',
    border: 'none',
    color: '#8892A0',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '4px 0',
  },
  adArea: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 8,
  },
};
