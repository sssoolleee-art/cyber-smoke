import { useState, useEffect } from 'react';
import { BannerAd } from '../utils/ads';
import { getItem, STORAGE_KEYS } from '../utils/storage';
import { CHARACTERS } from '../data/characters';
import { MOOD_CONFIG } from '../data/moods';
import { RING_GRADE_CONFIG } from '../utils/ringGame';
import { getTitle } from '../types';
import type { CharacterId, MoodEntry, SmokerProfile, NavigateFn } from '../types';
import { share } from '@apps-in-toss/web-framework';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

export default function Share({ navigate }: Props) {
  const [profile, setProfile] = useState<SmokerProfile | null>(null);
  const [lastMood, setLastMood] = useState<MoodEntry | null>(null);
  const [selectedCharId, setSelectedCharId] = useState<CharacterId>('pepe');
  const [adFree, setAdFree] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const [
        totalSmokes,
        streak,
        unlocked,
        ringBest,
        smokeLog,
        moodHistory,
        selChar,
        adR,
      ] = await Promise.all([
        getItem<number>(STORAGE_KEYS.TOTAL_SMOKES),
        getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK),
        getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS),
        getItem<number>(STORAGE_KEYS.RING_BEST_SCORE),
        getItem<Record<string, number>>(STORAGE_KEYS.SMOKE_LOG),
        getItem<MoodEntry[]>(STORAGE_KEYS.MOOD_HISTORY),
        getItem<CharacterId>(STORAGE_KEYS.SELECTED_CHARACTER),
        getItem<boolean>(STORAGE_KEYS.AD_REMOVE),
      ]);

      setAdFree(adR === true);
      setSelectedCharId(selChar ?? 'pepe');

      const moods = moodHistory ?? [];
      const moodCounts: Record<string, number> = {};
      moods.forEach(m => { moodCounts[m.mood] = (moodCounts[m.mood] ?? 0) + 1; });
      const favMood = (Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'chill') as any;

      const best = ringBest ?? 0;
      const ringGrade = best >= 1500 ? 'master' : best >= 1000 ? 'expert' :
        best >= 600 ? 'skilled' : best >= 300 ? 'beginner' : 'newbie';

      const p: SmokerProfile = {
        totalSmokes: totalSmokes ?? 0,
        currentStreak: streak?.count ?? 0,
        longestStreak: streak?.count ?? 0,
        favoriteTime: '오후 2시~3시',
        favoriteMood: favMood,
        characterCount: (unlocked ?? ['pepe']).length,
        totalCharacters: CHARACTERS.filter(c => c.unlockCondition.type !== 'iap').length,
        ringBestScore: best,
        ringBestGrade: ringGrade as any,
        daysActive: Object.keys(smokeLog ?? {}).length,
        title: '',
      };
      p.title = getTitle(p);
      setProfile(p);
      setLastMood(moods.length > 0 ? moods[moods.length - 1] : null);
    })();
  }, []);

  async function handleShare() {
    if (!profile) return;
    const text = `${profile.title}의 흡연장\n🚬 ${profile.totalSmokes.toLocaleString()}번째 한 모금 | 🔥 ${profile.currentStreak}일 연속\n\n사이버흡연장에서 한 대 피우고 가세요 → intoss://cyber-smoke`;
    try {
      await share({ message: text });
    } catch {
      // 공유 실패 시 클립보드에 복사
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // 무시
      }
    }
  }

  if (!profile) {
    return (
      <div style={{ background: '#1A1A2E', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#8892A0' }}>불러오는 중...</p>
      </div>
    );
  }

  const char = CHARACTERS.find(c => c.id === selectedCharId);
  const gradeConfig = RING_GRADE_CONFIG[profile.ringBestGrade];
  const moodConfig = lastMood ? MOOD_CONFIG[lastMood.mood] : null;

  return (
    <div style={s.container}>
      {copied && <div className="toast">링크 복사됨 📋</div>}

      {/* 공유 카드 */}
      <div style={s.card}>
        <p style={s.cardLabel}>사이버흡연장 🚬</p>

        <div style={s.charBlock}>
          <div style={s.charEmoji}>{char?.emoji ?? '🐸'}</div>
          <p style={s.charName}>{char?.name ?? '흡연 개구리'}</p>
        </div>

        <div style={s.statsBlock}>
          <p style={s.statLine}>총 {profile.totalSmokes.toLocaleString()}번 한 모금</p>
          {profile.currentStreak > 0 && (
            <p style={s.statLine}>🔥 {profile.currentStreak}일 연속 출석</p>
          )}
          <p style={s.titleLine}>칭호: {profile.title}</p>
        </div>

        {lastMood && moodConfig && (
          <div style={s.moodBlock}>
            <p style={s.moodLabel}>오늘의 한마디</p>
            <p style={s.moodContent}>
              {moodConfig.emoji}{' '}
              {lastMood.message ? `"${lastMood.message}"` : moodConfig.label}
            </p>
          </div>
        )}

        <div style={s.bottomStats}>
          <span style={{ color: gradeConfig.color }}>
            🎯 {gradeConfig.emoji} {gradeConfig.label}
          </span>
          <span style={{ color: '#8892A0' }}>
            📦 {profile.characterCount}/{profile.totalCharacters}
          </span>
        </div>
      </div>

      {/* 버튼 */}
      <button style={s.shareBtn} onClick={handleShare}>
        토스 친구에게 보내기
      </button>
      <button style={s.backBtn} onClick={() => navigate('index')}>
        돌아가기
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
  card: {
    background: '#16213E',
    borderRadius: 20,
    padding: '24px 20px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#8892A0',
    letterSpacing: '0.5px',
  },
  charBlock: {
    textAlign: 'center',
  },
  charEmoji: {
    fontSize: 60,
    lineHeight: 1,
    marginBottom: 6,
  },
  charName: {
    fontSize: 14,
    fontWeight: 700,
    color: '#EAEAEA',
  },
  statsBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    textAlign: 'center',
  },
  statLine: {
    fontSize: 16,
    fontWeight: 700,
    color: '#EAEAEA',
  },
  titleLine: {
    fontSize: 13,
    color: '#8892A0',
    marginTop: 2,
  },
  moodBlock: {
    background: '#1A1A2E',
    borderRadius: 12,
    padding: '12px 16px',
    textAlign: 'center',
  },
  moodLabel: {
    fontSize: 11,
    color: '#8892A0',
    marginBottom: 4,
  },
  moodContent: {
    fontSize: 15,
    fontWeight: 600,
    color: '#EAEAEA',
  },
  bottomStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: 20,
    fontSize: 13,
    fontWeight: 700,
  },
  shareBtn: {
    width: '100%',
    padding: 18,
    fontSize: 17,
    fontWeight: 800,
    color: '#1A1A2E',
    background: '#FF6B35',
    border: 'none',
    borderRadius: 16,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '-0.5px',
  },
  backBtn: {
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
