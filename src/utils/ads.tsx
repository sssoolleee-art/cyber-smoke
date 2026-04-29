import { useEffect, useRef } from 'react';
import { TossAds, loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

// ── Ad IDs ───────────────────────────────────────────────────────────────────
// TODO: 앱인토스 콘솔에서 발급받은 실제 ID로 교체 필요
export const AD_IDS = {
  banner: 'ait.v2.live.b774adde663d4ac2',
  interstitial: 'ait.v2.live.6a0a5836df854760',
  rewarded: 'ait.v2.live.84cbcfd3536a4571',
};

// ── Banner Ad ─────────────────────────────────────────────────────────────────
export function BannerAd() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || !TossAds.attachBanner.isSupported()) return;
    const result = TossAds.attachBanner(AD_IDS.banner, ref.current);
    return () => result.destroy();
  }, []);
  return <div ref={ref} style={{ width: '100%', minHeight: 50 }} />;
}

// ── Interstitial Ad ───────────────────────────────────────────────────────────
let lastInterstitialTime = 0;
const INTERSTITIAL_COOLDOWN_MS = 60_000;

export async function showInterstitial(): Promise<void> {
  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) return;
  if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) return;

  lastInterstitialTime = now;

  return new Promise<void>((resolve) => {
    const cleanupLoad = loadFullScreenAd({
      options: { adGroupId: AD_IDS.interstitial },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          cleanupLoad();
          showFullScreenAd({
            options: { adGroupId: AD_IDS.interstitial },
            onEvent: (showEvent) => {
              if (showEvent.type === 'dismissed' || showEvent.type === 'failedToShow') {
                resolve();
              }
            },
            onError: () => resolve(),
          });
        }
      },
      onError: () => resolve(),
    });
    // 10초 타임아웃
    setTimeout(() => resolve(), 10_000);
  });
}

// ── Rewarded Ad ───────────────────────────────────────────────────────────────
export async function showRewarded(): Promise<boolean> {
  if (!loadFullScreenAd.isSupported() || !showFullScreenAd.isSupported()) return false;

  return new Promise<boolean>((resolve) => {
    let earned = false;
    const cleanupLoad = loadFullScreenAd({
      options: { adGroupId: AD_IDS.rewarded },
      onEvent: (event) => {
        if (event.type === 'loaded') {
          cleanupLoad();
          showFullScreenAd({
            options: { adGroupId: AD_IDS.rewarded },
            onEvent: (showEvent) => {
              if (showEvent.type === 'userEarnedReward') earned = true;
              if (showEvent.type === 'dismissed' || showEvent.type === 'failedToShow') {
                resolve(earned);
              }
            },
            onError: () => resolve(false),
          });
        }
      },
      onError: () => resolve(false),
    });
    setTimeout(() => resolve(false), 10_000);
  });
}
