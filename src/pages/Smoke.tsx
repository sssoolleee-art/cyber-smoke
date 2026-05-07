import { useState, useRef, useEffect, useCallback } from 'react';
import { generateHapticFeedback } from '@apps-in-toss/web-bridge';
import { showInterstitial } from '../utils/ads';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { generateSmokePuff } from '../utils/smokeEngine';
import { checkUnlocks, updateStreak, updateSmokeTimeLog } from '../utils/characters';
import { checkAchievements } from '../utils/characters';
import { CHARACTERS } from '../data/characters';
import { MOOD_CONFIG, MOOD_IDS } from '../data/moods';
import type { CharacterId, MoodId, MoodEntry, NavigateFn } from '../types';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

type Phase = 'smoking' | 'complete' | 'mood';

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
}

export default function Smoke({ navigate, params }: Props) {
  const characterId = (params.selectedCharacter as CharacterId) ?? 'pepe';

  const [phase, setPhase] = useState<Phase>('smoking');
  const [tapCount, setTapCount] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isInhaling, setIsInhaling] = useState(false);
  const [inhaleTick, setInhaleTick] = useState(0);
  const [ashParticles, setAshParticles] = useState<{ id: number; x: number; y: number; drift: number }[]>([]);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);
  const [message, setMessage] = useState('');
  const [totalSmokes, setTotalSmokes] = useState(0);
  const [todaySmokes, setTodaySmokes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [newUnlocks, setNewUnlocks] = useState<CharacterId[]>([]);

  const particleIdRef = useRef(0);
  const ashIdRef = useRef(0);
  const smokeStartTimeRef = useRef(0);
  const cigaretteRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const char = CHARACTERS.find(c => c.id === characterId);
  const smokeColor = char?.smokeColor ?? '#C8C8C8';

  // 담배 끝에서 지속적으로 연기 생성
  useEffect(() => {
    if (phase !== 'smoking') return;
    const interval = setInterval(() => {
      if (cigaretteRef.current && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const tipRect = cigaretteRef.current.getBoundingClientRect();
        const sx = tipRect.right - containerRect.left;
        const sy = tipRect.top + tipRect.height / 2 - containerRect.top;
        const ambient = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
          x: sx,
          y: sy,
          size: 6 + Math.random() * 10,
          opacity: 0.1 + Math.random() * 0.15,
          duration: 3 + Math.random() * 2,
          delay: 0,
          drift: (Math.random() - 0.3) * 50,
          id: ++particleIdRef.current,
        }));
        setParticles(prev => [...prev.slice(-32), ...ambient]);
      }
    }, 1800);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    (async () => {
      const total = await getItem<number>(STORAGE_KEYS.TOTAL_SMOKES) ?? 0;
      setTotalSmokes(total);
      const today = await getItem<{ date: string; count: number }>(STORAGE_KEYS.TODAY_SMOKES);
      const todayStr = new Date().toISOString().slice(0, 10);
      setTodaySmokes(today?.date === todayStr ? today.count : 0);
      const s = await getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK);
      setStreak(s?.count ?? 0);
    })();
  }, []);

  const handleTap = useCallback((e: React.PointerEvent) => {
    if (phase !== 'smoking') return;
    e.preventDefault();

    if (tapCount === 0) smokeStartTimeRef.current = Date.now();

    setIsInhaling(true);
    setInhaleTick(t => t + 1);
    setTimeout(() => setIsInhaling(false), 400);

    // 햅틱 (AIT 네이티브)
    generateHapticFeedback({ type: tapCount === 4 ? 'basicMedium' : 'tap' }).catch(() => {});

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let smokeX: number, smokeY: number;
    if (cigaretteRef.current) {
      const tipRect = cigaretteRef.current.getBoundingClientRect();
      smokeX = tipRect.right - rect.left;
      smokeY = tipRect.top + tipRect.height / 2 - rect.top;

      // 재 낙하 파티클
      const ashX = tipRect.right - rect.left - 22;
      const ashY = tipRect.bottom - rect.top;
      const ashCount = 1 + Math.floor(Math.random() * 3);
      const newAsh = Array.from({ length: ashCount }, () => ({
        id: ++ashIdRef.current,
        x: ashX + (Math.random() - 0.5) * 12,
        y: ashY,
        drift: (Math.random() - 0.4) * 35,
      }));
      setAshParticles(prev => [...prev.slice(-12), ...newAsh]);
    } else {
      smokeX = e.clientX - rect.left;
      smokeY = e.clientY - rect.top;
    }

    // 마지막 탭은 연기 3배, 나머지는 2배
    const isLastPuff = tapCount === 4;
    const newParticles = Array.from({ length: isLastPuff ? 3 : 2 }, (_, i) =>
      generateSmokePuff(smokeX + (Math.random() - 0.5) * (i * 6), smokeY)
    ).flat().map(p => ({ ...p, id: ++particleIdRef.current }));
    setParticles(prev => [...prev.slice(-36), ...newParticles]);

    const next = tapCount + 1;
    setTapCount(next);

    if (next >= 5) {
      setTimeout(() => completeSmoke(), 400);
    }
  }, [phase, tapCount]);

  async function completeSmoke() {
    setPhase('complete');

    const newTotal = totalSmokes + 1;
    const todayStr = new Date().toISOString().slice(0, 10);
    const newToday = todaySmokes + 1;

    await setItem(STORAGE_KEYS.TOTAL_SMOKES, newTotal);
    await setItem(STORAGE_KEYS.TODAY_SMOKES, { date: todayStr, count: newToday });

    const log = await getItem<Record<string, number>>(STORAGE_KEYS.SMOKE_LOG) ?? {};
    log[todayStr] = (log[todayStr] ?? 0) + 1;
    await setItem(STORAGE_KEYS.SMOKE_LOG, log);

    await updateStreak();
    await updateSmokeTimeLog();

    // 스피드 흡연 체크 (30초 이내)
    const elapsed = Date.now() - smokeStartTimeRef.current;
    if (smokeStartTimeRef.current > 0 && elapsed <= 30_000) {
      const speedCount = await getItem<number>(STORAGE_KEYS.SPEED_SMOKE_COUNT) ?? 0;
      await setItem(STORAGE_KEYS.SPEED_SMOKE_COUNT, speedCount + 1);
    }

    const [unlocks] = await Promise.all([
      checkUnlocks(),
      checkAchievements(newTotal),
    ]);
    setNewUnlocks(unlocks);
    setTotalSmokes(newTotal);
    setTodaySmokes(newToday);

    const s = await getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK);
    setStreak(s?.count ?? 1);

    setTimeout(() => setPhase('mood'), 800);
  }

  async function handleSave() {
    if (selectedMood) {
      const entry: MoodEntry = {
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        mood: selectedMood,
        message: message.trim() || undefined,
        characterId,
      };
      const history = await getItem<MoodEntry[]>(STORAGE_KEYS.MOOD_HISTORY) ?? [];
      history.push(entry);
      if (history.length > 100) history.shift();
      await setItem(STORAGE_KEYS.MOOD_HISTORY, history);
    }
    await showInterstitial();
    navigate('index');
  }

  async function handleSkip() {
    await showInterstitial();
    navigate('index');
  }

  // ── 무드 선택 화면 ──────────────────────────────────────────────────────────
  if (phase === 'mood') {
    return (
      <div style={s.moodContainer}>
        <div style={s.moodHeader}>
          <div style={s.completeBadge}>✅ 한 대 완료!</div>
          <p style={s.moodStats}>
            오늘 {todaySmokes}번째 · 총 {totalSmokes.toLocaleString()}번째
          </p>
          {streak > 0 && (
            <p style={s.streakLine}>🔥 {streak}일째 연속 출석</p>
          )}
        </div>

        {/* 새 캐릭터 해금 알림 */}
        {newUnlocks.length > 0 && (
          <div style={s.unlockBanner} className="unlock-banner">
            <p style={s.unlockTitle}>🔓 새 캐릭터 해금!</p>
            {newUnlocks.map(id => {
              const c = CHARACTERS.find(ch => ch.id === id);
              return (
                <p key={id} style={s.unlockChar}>{c?.emoji} {c?.name}</p>
              );
            })}
          </div>
        )}

        <p style={s.moodQuestion}>지금 기분은?</p>
        <div style={s.moodGrid}>
          {MOOD_IDS.map(id => {
            const { emoji, label } = MOOD_CONFIG[id];
            return (
              <button
                key={id}
                style={{
                  ...s.moodBtn,
                  background: selectedMood === id ? '#FF6B35' : '#16213E',
                  color: selectedMood === id ? '#fff' : '#EAEAEA',
                }}
                onClick={() => setSelectedMood(selectedMood === id ? null : id)}
              >
                <span style={{ fontSize: 20 }}>{emoji}</span>
                <span style={{ fontSize: 11, marginTop: 2 }}>{label}</span>
              </button>
            );
          })}
        </div>

        <div style={s.inputWrapper}>
          <input
            style={s.messageInput}
            placeholder="한마디 (선택, 50자)"
            value={message}
            maxLength={50}
            onChange={e => setMessage(e.target.value)}
          />
          {message.length > 0 && (
            <span style={s.charCount}>{message.length}/50</span>
          )}
        </div>

        <button style={s.saveBtn} onClick={handleSave}>
          기록하기
        </button>
        <button style={s.skipBtn} onClick={handleSkip}>
          그냥 나가기
        </button>
      </div>
    );
  }

  // ── 흡연 화면 ────────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      style={s.smokeContainer}
      onPointerDown={handleTap}
    >
      {/* 배경 연기 분위기 */}
      <div style={s.smokeBg} />

      {/* 흡입 vignette - key로 매 탭마다 animation 재시작 */}
      {inhaleTick > 0 && <div key={inhaleTick} className="vignette-flash" />}

      {/* 재 낙하 파티클 */}
      {ashParticles.map(a => (
        <div
          key={a.id}
          className="ash-particle"
          style={{ left: a.x, top: a.y, '--ash-drift': `${a.drift}px` } as React.CSSProperties}
        />
      ))}

      {/* 연기 파티클 */}
      {particles.map(p => (
        <div
          key={p.id}
          className="smoke-particle"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            '--smoke-opacity': p.opacity,
            '--smoke-duration': `${p.duration}s`,
            '--smoke-delay': `${p.delay}s`,
            '--smoke-drift': `${p.drift}px`,
            '--smoke-color': smokeColor,
          } as React.CSSProperties}
        />
      ))}

      {/* 캐릭터 */}
      <div style={s.characterArea}>
        <div
          className={isInhaling ? 'character-inhaling' : 'character-idle'}
          style={s.characterEmoji}
        >
          {char?.emoji ?? '🐸'}
        </div>
        {/* 줄어드는 커스텀 담배 */}
        <div ref={cigaretteRef} style={s.cigaretteWrap}>
          <div style={s.cigaretteFilter} />
          <div style={{ ...s.cigaretteBody, width: Math.max(4, 60 - tapCount * 11) }} />
          <div style={s.cigaretteAsh} />
          <div className={`ember ${isInhaling ? 'inhaling' : ''}`} style={s.cigaretteEmber} />
        </div>
      </div>

      {/* 하단 정보 */}
      <div style={s.bottomInfo}>
        {tapCount === 0 && phase === 'smoking' && (
          <p style={s.hint}>탭해서 한 모금 💨</p>
        )}
        {tapCount > 0 && tapCount < 5 && (
          <p style={s.hint}>💨 {tapCount}/5</p>
        )}
        <p style={s.totalCount}>총 {totalSmokes.toLocaleString()}번째 한 모금</p>
      </div>

      {/* 완료 오버레이 */}
      {phase === 'complete' && (
        <div style={s.completeOverlay}>
          <p style={s.completeText}>✅ 한 대 완료!</p>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  smokeContainer: {
    background: '#1A1A2E',
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    cursor: 'pointer',
    touchAction: 'none',
  },
  characterArea: {
    position: 'absolute',
    bottom: '32%',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'flex-end',
    gap: 4,
  },
  characterEmoji: {
    fontSize: 72,
    lineHeight: 1,
    display: 'block',
    position: 'relative',
  },
  cigaretteWrap: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    marginBottom: 18,
    transform: 'rotate(-8deg)',
    transformOrigin: 'left center',
  },
  cigaretteFilter: {
    width: 16,
    height: 14,
    background: '#C4854A',
    borderRadius: '3px 0 0 3px',
    flexShrink: 0,
  },
  cigaretteBody: {
    height: 12,
    background: '#F0EDE8',
    transition: 'width 0.4s ease',
    flexShrink: 0,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },
  cigaretteAsh: {
    width: 8,
    height: 12,
    background: '#BBBBBB',
    borderRadius: '0 2px 2px 0',
    flexShrink: 0,
  },
  cigaretteEmber: {
    width: 12,
    height: 12,
    position: 'relative' as const,
    flexShrink: 0,
  },
  smokeBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse at 35% 30%, rgba(200,200,200,0.10) 0%, transparent 50%), radial-gradient(ellipse at 65% 60%, rgba(180,180,180,0.08) 0%, transparent 45%)',
    pointerEvents: 'none',
  },
  bottomInfo: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  hint: {
    fontSize: 15,
    color: '#8892A0',
    marginBottom: 8,
  },
  totalCount: {
    fontSize: 12,
    color: '#4A4A6A',
    marginTop: 4,
  },
  completeOverlay: {
    position: 'absolute',
    top: '42%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  completeText: {
    fontSize: 28,
    fontWeight: 900,
    color: '#EAEAEA',
  },
  // 무드 화면
  moodContainer: {
    background: '#1A1A2E',
    minHeight: '100vh',
    padding: '52px 20px 36px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  moodHeader: {
    textAlign: 'center',
  },
  completeBadge: {
    fontSize: 22,
    fontWeight: 900,
    color: '#EAEAEA',
    marginBottom: 8,
  },
  moodStats: {
    fontSize: 14,
    color: '#8892A0',
  },
  streakLine: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FF6B35',
    marginTop: 4,
  },
  unlockBanner: {
    background: '#16213E',
    borderRadius: 14,
    padding: '14px 16px',
    border: '1px solid #FF6B35',
  },
  unlockTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: '#FF6B35',
    marginBottom: 6,
  },
  unlockChar: {
    fontSize: 15,
    color: '#EAEAEA',
    marginTop: 4,
  },
  moodQuestion: {
    fontSize: 15,
    fontWeight: 700,
    color: '#EAEAEA',
    marginTop: 4,
  },
  moodGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 8,
  },
  moodBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 4px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    gap: 2,
    transition: 'background 0.2s',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
  },
  messageInput: {
    width: '100%',
    padding: '14px 48px 14px 16px',
    background: '#16213E',
    border: '1px solid #2A2A4E',
    borderRadius: 14,
    color: '#EAEAEA',
    fontSize: 15,
    fontFamily: 'inherit',
    outline: 'none',
  },
  charCount: {
    position: 'absolute',
    right: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: 11,
    color: '#8892A0',
  },
  saveBtn: {
    width: '100%',
    padding: 17,
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
  skipBtn: {
    width: '100%',
    padding: 14,
    fontSize: 15,
    fontWeight: 500,
    color: '#8892A0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};
