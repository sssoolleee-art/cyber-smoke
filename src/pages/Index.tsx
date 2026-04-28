import { useState, useEffect } from 'react';
import { BannerAd } from '../utils/ads';
import { getItem, useStorage, STORAGE_KEYS } from '../utils/storage';
import { CHARACTERS, FREE_CHARACTERS } from '../data/characters';
import type { CharacterId, NavigateFn } from '../types';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

export default function Index({ navigate }: Props) {
  const [selectedChar, setSelectedChar] = useStorage<CharacterId>(
    STORAGE_KEYS.SELECTED_CHARACTER, 'pepe'
  );
  const [totalSmokes, setTotalSmokes] = useState(0);
  const [todaySmokes, setTodaySmokes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const [adFree, setAdFree] = useState(false);

  useEffect(() => {
    (async () => {
      const [total, today, s, unlocked, adR] = await Promise.all([
        getItem<number>(STORAGE_KEYS.TOTAL_SMOKES),
        getItem<{ date: string; count: number }>(STORAGE_KEYS.TODAY_SMOKES),
        getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK),
        getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS),
        getItem<boolean>(STORAGE_KEYS.AD_REMOVE),
      ]);
      setTotalSmokes(total ?? 0);
      const todayStr = new Date().toISOString().slice(0, 10);
      setTodaySmokes(today?.date === todayStr ? today.count : 0);
      setStreak(s?.count ?? 0);
      setUnlockedCount((unlocked ?? ['pepe']).length);
      setAdFree(adR === true);
    })();
  }, []);

  const char = CHARACTERS.find(c => c.id === selectedChar);

  return (
    <div style={s.container}>
      <h1 style={s.title}>🚬 사이버흡연장</h1>
      <p style={s.subtitle}>실제 흡연과 무관한 가상 휴식 공간</p>

      {/* 캐릭터 카드 */}
      <div style={s.card}>
        <div style={s.charEmoji}>{char?.emoji ?? '🐸'}</div>
        <p style={s.charName}>{char?.name ?? '흡연 개구리'}</p>
        <p style={s.statText}>
          오늘 {todaySmokes}번째 · 총 {totalSmokes.toLocaleString()}번째
        </p>
        {streak > 0 && (
          <p style={s.streakText}>🔥 {streak}일째 연속 출석</p>
        )}
      </div>

      {/* 메인 CTA */}
      <button
        style={s.mainBtn}
        onClick={() => navigate('smoke', { selectedCharacter: selectedChar })}
      >
        한 대 피우러 가기
      </button>

      {/* 서브 버튼 */}
      <div style={s.subBtns}>
        <button style={s.subBtn} onClick={() => navigate('rings')}>
          🎯 연기 고리
        </button>
        <button style={s.subBtn} onClick={() => navigate('collection')}>
          📦 도감 {unlockedCount}/{FREE_CHARACTERS.length}
        </button>
      </div>

      {/* 공유 버튼 */}
      <button style={s.shareBtn} onClick={() => navigate('share')}>
        내 흡연장 카드 보기 →
      </button>

      {/* 배너 광고 */}
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
    gap: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 900,
    color: '#EAEAEA',
    letterSpacing: '-1px',
  },
  subtitle: {
    fontSize: 11,
    color: '#8892A0',
    marginTop: -6,
  },
  card: {
    background: '#16213E',
    borderRadius: 20,
    padding: '28px 24px',
    width: '100%',
    textAlign: 'center',
    marginTop: 8,
  },
  charEmoji: {
    fontSize: 64,
    lineHeight: 1,
    marginBottom: 8,
  },
  charName: {
    fontSize: 15,
    fontWeight: 700,
    color: '#EAEAEA',
    marginBottom: 6,
  },
  statText: {
    fontSize: 14,
    color: '#8892A0',
  },
  streakText: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FF6B35',
    marginTop: 6,
  },
  mainBtn: {
    width: '100%',
    padding: '18px',
    fontSize: 17,
    fontWeight: 800,
    color: '#1A1A2E',
    background: '#FF6B35',
    border: 'none',
    borderRadius: 16,
    letterSpacing: '-0.5px',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  subBtns: {
    display: 'flex',
    gap: 10,
    width: '100%',
  },
  subBtn: {
    flex: 1,
    padding: '14px 8px',
    fontSize: 14,
    fontWeight: 700,
    color: '#EAEAEA',
    background: '#16213E',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.3px',
  },
  shareBtn: {
    background: 'none',
    border: 'none',
    color: '#8892A0',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.2px',
    padding: '4px 0',
  },
  adArea: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 16,
  },
};
