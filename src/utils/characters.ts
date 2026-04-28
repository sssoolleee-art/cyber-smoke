import { CHARACTERS } from '../data/characters';
import { getItem, setItem, STORAGE_KEYS } from './storage';
import type { CharacterId, AchievementId } from '../types';

// ── 해금 체크 ────────────────────────────────────────────────────────────────

export async function checkUnlocks(): Promise<CharacterId[]> {
  const [
    totalSmokes,
    streak,
    weekdayStreak,
    ringBest,
    unlocked,
    smokeTimeLog,
    speedSmokeCount,
    achievements,
  ] = await Promise.all([
    getItem<number>(STORAGE_KEYS.TOTAL_SMOKES).then(v => v ?? 0),
    getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK),
    getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.WEEKDAY_STREAK),
    getItem<number>(STORAGE_KEYS.RING_BEST_SCORE).then(v => v ?? 0),
    getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS).then(v => v ?? ['pepe']),
    getItem<Record<string, number>>(STORAGE_KEYS.SMOKE_TIME_LOG).then(v => v ?? {}),
    getItem<number>(STORAGE_KEYS.SPEED_SMOKE_COUNT).then(v => v ?? 0),
    getItem<AchievementId[]>(STORAGE_KEYS.ACHIEVEMENTS).then(v => v ?? []),
  ]);

  const newUnlocks: CharacterId[] = [];

  for (const char of CHARACTERS) {
    if (unlocked.includes(char.id)) continue;
    const cond = char.unlockCondition;
    if (cond.type === 'iap') continue;

    let met = false;
    switch (cond.type) {
      case 'default':
        met = true;
        break;
      case 'total_smokes':
        met = totalSmokes >= cond.count;
        break;
      case 'streak':
        met = (streak?.count ?? 0) >= cond.days;
        break;
      case 'ring_score':
        met = ringBest >= cond.score;
        break;
      case 'time_range': {
        const rangeKey = `${cond.hour[0]}-${cond.hour[1]}`;
        met = (smokeTimeLog[rangeKey] ?? 0) >= cond.count;
        break;
      }
      case 'weekday_streak':
        met = (weekdayStreak?.count ?? 0) >= cond.days;
        break;
      case 'speed_smoke':
        met = speedSmokeCount >= cond.count;
        break;
      case 'collection_percent': {
        const freeTotal = CHARACTERS.filter(c => c.unlockCondition.type !== 'iap').length;
        met = (unlocked.length / freeTotal) >= (cond.percent / 100);
        break;
      }
    }

    if (met) newUnlocks.push(char.id);
  }

  if (newUnlocks.length > 0) {
    await setItem(STORAGE_KEYS.UNLOCKED_CHARACTERS, [...unlocked, ...newUnlocks]);
  }

  return newUnlocks;
}

// ── 스트릭 업데이트 ────────────────────────────────────────────────────────────

export async function updateStreak(): Promise<{ count: number; isNew: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  const streak = await getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.STREAK);

  if (!streak) {
    await setItem(STORAGE_KEYS.STREAK, { count: 1, lastDate: today });
    await updateWeekdayStreak(today);
    return { count: 1, isNew: true };
  }

  if (streak.lastDate === today) {
    return { count: streak.count, isNew: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (streak.lastDate === yesterdayStr) {
    const newCount = streak.count + 1;
    await setItem(STORAGE_KEYS.STREAK, { count: newCount, lastDate: today });
    await updateWeekdayStreak(today);
    return { count: newCount, isNew: true };
  }

  // 끊김 → 리셋
  await setItem(STORAGE_KEYS.STREAK, { count: 1, lastDate: today });
  await updateWeekdayStreak(today);
  return { count: 1, isNew: true };
}

async function updateWeekdayStreak(todayStr: string): Promise<void> {
  const dayOfWeek = new Date(todayStr).getDay();
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!isWeekday) return;

  const ws = await getItem<{ count: number; lastDate: string }>(STORAGE_KEYS.WEEKDAY_STREAK);

  if (!ws) {
    await setItem(STORAGE_KEYS.WEEKDAY_STREAK, { count: 1, lastDate: todayStr });
    return;
  }

  if (ws.lastDate === todayStr) return;

  const prev = new Date(todayStr);
  prev.setDate(prev.getDate() - (dayOfWeek === 1 ? 3 : 1));
  const prevStr = prev.toISOString().slice(0, 10);

  const newCount = ws.lastDate === prevStr ? ws.count + 1 : 1;
  await setItem(STORAGE_KEYS.WEEKDAY_STREAK, { count: newCount, lastDate: todayStr });
}

// ── 시간대 로그 업데이트 ──────────────────────────────────────────────────────

export async function updateSmokeTimeLog(): Promise<void> {
  const hour = new Date().getHours();
  const timeLog = await getItem<Record<string, number>>(STORAGE_KEYS.SMOKE_TIME_LOG) ?? {};

  const ranges: [number, number][] = [[2, 5], [6, 7], [12, 13], [22, 2]];
  for (const [start, end] of ranges) {
    const inRange = start < end
      ? (hour >= start && hour < end)
      : (hour >= start || hour < end);
    if (inRange) {
      const key = `${start}-${end}`;
      timeLog[key] = (timeLog[key] ?? 0) + 1;
    }
  }

  await setItem(STORAGE_KEYS.SMOKE_TIME_LOG, timeLog);
}

// ── 업적 체크 ────────────────────────────────────────────────────────────────

export async function checkAchievements(totalSmokes: number): Promise<AchievementId[]> {
  const unlocked = await getItem<AchievementId[]>(STORAGE_KEYS.ACHIEVEMENTS) ?? [];
  const newAch: AchievementId[] = [];

  const checks: [AchievementId, boolean][] = [
    ['first_smoke',    totalSmokes >= 1],
    ['ten_smokes',     totalSmokes >= 10],
    ['hundred_smokes', totalSmokes >= 100],
    ['thousand_smokes', totalSmokes >= 1000],
  ];

  for (const [id, condition] of checks) {
    if (condition && !unlocked.includes(id)) newAch.push(id);
  }

  if (newAch.length > 0) {
    await setItem(STORAGE_KEYS.ACHIEVEMENTS, [...unlocked, ...newAch]);
  }

  return newAch;
}
