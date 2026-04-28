import { Storage } from '@apps-in-toss/web-framework';
import { useState, useEffect } from 'react';

export const STORAGE_KEYS = {
  TOTAL_SMOKES: 'cs_total_smokes',
  TODAY_SMOKES: 'cs_today_smokes',
  STREAK: 'cs_streak',
  SELECTED_CHARACTER: 'cs_selected_char',
  UNLOCKED_CHARACTERS: 'cs_unlocked',
  MOOD_HISTORY: 'cs_mood_history',
  RING_BEST_SCORE: 'cs_ring_best',
  RING_HISTORY: 'cs_ring_history',
  ACHIEVEMENTS: 'cs_achievements',
  SMOKE_LOG: 'cs_smoke_log',
  RING_TODAY: 'cs_ring_today',
  AD_REMOVE: 'iap_cs_ad_remove',
  SMOKE_TIME_LOG: 'cs_smoke_time_log',
  SPEED_SMOKE_COUNT: 'cs_speed_smoke_count',
  WEEKDAY_STREAK: 'cs_weekday_streak',
  IAP_PURCHASES: 'cs_iap_purchases',
} as const;

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await Storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  try {
    await Storage.setItem(key, JSON.stringify(value));
  } catch {
    // storage 실패 시 UX 차단 금지
  }
}

export function useStorage<T>(key: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    getItem<T>(key).then(v => {
      if (v !== null) setValue(v);
    });
  }, [key]);
  const update = (v: T) => {
    setValue(v);
    setItem(key, v);
  };
  return [value, update];
}
