import { useState, useEffect } from 'react';
import { IAP } from '@apps-in-toss/web-framework';
import { showRewarded, BannerAd } from '../utils/ads';
import { getItem, setItem, STORAGE_KEYS } from '../utils/storage';
import { CHARACTERS, FREE_CHARACTERS, IAP_CHARACTERS } from '../data/characters';
import type { CharacterId, UnlockCondition, NavigateFn } from '../types';

interface Props {
  navigate: NavigateFn;
  params: Record<string, unknown>;
}

function unlockLabel(cond: UnlockCondition): string {
  switch (cond.type) {
    case 'default':            return '기본 해금';
    case 'total_smokes':       return `총 ${cond.count}회 흡연`;
    case 'streak':             return `${cond.days}일 연속 출석`;
    case 'ring_score':         return `미니게임 ${cond.score.toLocaleString()}점`;
    case 'time_range':         return `특정 시간대 ${cond.count}회`;
    case 'weekday_streak':     return `평일 ${cond.days}일 연속`;
    case 'speed_smoke':        return `30초 흡연 ${cond.count}회`;
    case 'collection_percent': return `캐릭터 ${cond.percent}% 수집`;
    case 'iap':                return '프리미엄';
    default:                   return '';
  }
}

const IAP_PRICES: Record<string, string> = {
  cs_golden_pepe: '₩1,000',
  cs_neon_cat: '₩500',
  cs_hologram: '₩2,000',
  cs_ad_remove: '₩1,900',
};

const SKU_TO_CHAR: Record<string, CharacterId> = {
  cs_golden_pepe: 'golden_pepe',
  cs_neon_cat: 'neon_cat',
  cs_hologram: 'hologram',
};

export default function Collection({ navigate }: Props) {
  const [unlocked, setUnlocked] = useState<CharacterId[]>(['pepe']);
  const [selectedChar, setSelectedChar] = useState<CharacterId>('pepe');
  const [previewChar, setPreviewChar] = useState<CharacterId | null>(null);
  const [adFree, setAdFree] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [ul, sel, adR] = await Promise.all([
        getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS),
        getItem<CharacterId>(STORAGE_KEYS.SELECTED_CHARACTER),
        getItem<boolean>(STORAGE_KEYS.AD_REMOVE),
      ]);
      setUnlocked(ul ?? ['pepe']);
      setSelectedChar(sel ?? 'pepe');
      setAdFree(adR === true);
    })();
  }, []);

  // 구매 이력 복원 (재설치 시 대비)
  useEffect(() => {
    (async () => {
      try {
        const result = await IAP.getCompletedOrRefundedOrders();
        const completedSkus = result?.orders
          .filter(o => o.status === 'COMPLETED')
          .map(o => o.sku) ?? [];

        if (completedSkus.length === 0) return;

        const current = await getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS) ?? ['pepe'];
        const restoredChars = completedSkus
          .map(sku => SKU_TO_CHAR[sku])
          .filter((id): id is CharacterId => !!id);
        const updated = [...new Set([...current, ...restoredChars])];
        await setItem(STORAGE_KEYS.UNLOCKED_CHARACTERS, updated);
        setUnlocked(updated);

        if (completedSkus.includes('cs_ad_remove')) {
          await setItem(STORAGE_KEYS.AD_REMOVE, true);
          setAdFree(true);
        }
      } catch {}
    })();
  }, []);

  async function handleSelect(id: CharacterId) {
    if (!unlocked.includes(id)) return;
    setSelectedChar(id);
    await setItem(STORAGE_KEYS.SELECTED_CHARACTER, id);
  }

  async function handlePreview(id: CharacterId) {
    const rewarded = await showRewarded();
    if (rewarded) {
      setPreviewChar(id);
      setTimeout(() => setPreviewChar(null), 3000);
    }
  }

  async function handleIapPurchase(sku: string, characterId?: CharacterId) {
    if (purchasing) return;
    setPurchasing(sku);

    const cleanup = IAP.createOneTimePurchaseOrder({
      options: {
        sku,
        processProductGrant: async () => {
          try {
            if (characterId) {
              const current = await getItem<CharacterId[]>(STORAGE_KEYS.UNLOCKED_CHARACTERS) ?? ['pepe'];
              const updated = [...new Set([...current, characterId])];
              await setItem(STORAGE_KEYS.UNLOCKED_CHARACTERS, updated);
              setUnlocked(updated);
            } else if (sku === 'cs_ad_remove') {
              await setItem(STORAGE_KEYS.AD_REMOVE, true);
              setAdFree(true);
            }
            return true;
          } catch {
            return false;
          }
        },
      },
      onEvent: () => {
        cleanup();
        setPurchasing(null);
      },
      onError: () => {
        cleanup();
        setPurchasing(null);
      },
    });
  }

  const ownedFree = FREE_CHARACTERS.filter(c => unlocked.includes(c.id));
  const lockedFree = FREE_CHARACTERS.filter(c => !unlocked.includes(c.id));

  return (
    <div style={s.container}>
      <h1 style={s.title}>
        📦 캐릭터 도감 {ownedFree.length}/{FREE_CHARACTERS.length}
      </h1>

      {/* 보유 캐릭터 */}
      {ownedFree.length > 0 && (
        <>
          <p style={s.sectionLabel}>보유</p>
          <div style={s.grid}>
            {ownedFree.map(c => (
              <div
                key={c.id}
                onClick={() => handleSelect(c.id)}
                style={{
                  ...s.charCard,
                  background: selectedChar === c.id ? '#FF6B35' : '#16213E',
                  outline: selectedChar === c.id ? '2px solid #FF6B35' : 'none',
                }}
              >
                <div style={s.charEmoji}>{c.emoji}</div>
                <p style={s.charName}>{c.name}</p>
                {selectedChar === c.id && (
                  <p style={s.selectedBadge}>선택됨</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* 미해금 */}
      {lockedFree.length > 0 && (
        <>
          <p style={s.sectionLabel}>미해금</p>
          <div style={s.grid}>
            {lockedFree.map(c => (
              <div
                key={c.id}
                onClick={() => handlePreview(c.id)}
                style={{ ...s.charCard, ...s.lockedCard }}
              >
                <div style={s.charEmoji}>
                  {previewChar === c.id ? c.emoji : '🔒'}
                </div>
                <p style={s.charName}>{c.name}</p>
                <p style={s.unlockHint}>{unlockLabel(c.unlockCondition)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 프리미엄 */}
      <p style={s.sectionLabel}>프리미엄 캐릭터</p>
      <div style={{ ...s.grid, gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {IAP_CHARACTERS.map(c => {
          const owned = unlocked.includes(c.id);
          const cond = c.unlockCondition;
          const sku = cond.type === 'iap' ? cond.productId : '';
          const price = IAP_PRICES[sku] ?? '';
          const isBuying = purchasing === sku;
          return (
            <div
              key={c.id}
              style={{ ...s.charCard, cursor: owned ? 'default' : 'pointer', opacity: isBuying ? 0.6 : 1 }}
              onClick={() => !owned && !isBuying && handleIapPurchase(sku, c.id)}
            >
              <div style={s.charEmoji}>{c.emoji}</div>
              <p style={s.charName}>{c.name}</p>
              {owned ? (
                <p style={s.ownedTag}>보유</p>
              ) : (
                <p style={s.priceTag}>{isBuying ? '...' : price}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* 광고 제거 */}
      {!adFree && (
        <div
          style={{ ...s.charCard, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', opacity: purchasing === 'cs_ad_remove' ? 0.6 : 1 }}
          onClick={() => !purchasing && handleIapPurchase('cs_ad_remove')}
        >
          <div>
            <p style={{ ...s.charName, fontSize: 13, textAlign: 'left' }}>🚫 광고 영구 제거</p>
            <p style={{ ...s.unlockHint, fontSize: 10, textAlign: 'left', marginTop: 2 }}>배너 광고를 완전히 없애요</p>
          </div>
          <p style={s.priceTag}>{purchasing === 'cs_ad_remove' ? '...' : IAP_PRICES['cs_ad_remove']}</p>
        </div>
      )}

      <button style={s.backBtn} onClick={() => navigate('index')}>
        ← 돌아가기
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
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 900,
    color: '#EAEAEA',
    letterSpacing: '-0.5px',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: '#8892A0',
    letterSpacing: '0.5px',
    marginTop: 8,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 10,
  },
  charCard: {
    background: '#16213E',
    borderRadius: 14,
    padding: '12px 8px',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    transition: 'background 0.2s',
  },
  lockedCard: {
    opacity: 0.55,
  },
  premiumCard: {
    cursor: 'default',
  },
  charEmoji: {
    fontSize: 28,
    lineHeight: 1,
  },
  charName: {
    fontSize: 10,
    fontWeight: 700,
    color: '#EAEAEA',
  },
  unlockHint: {
    fontSize: 9,
    color: '#8892A0',
    marginTop: 2,
  },
  selectedBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: '#fff',
  },
  priceTag: {
    fontSize: 10,
    fontWeight: 700,
    color: '#FF6B35',
  },
  ownedTag: {
    fontSize: 9,
    color: '#4ECDC4',
    fontWeight: 700,
  },
  backBtn: {
    background: 'none',
    border: 'none',
    color: '#8892A0',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: '8px 0',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  adArea: {
    marginTop: 'auto',
    paddingTop: 16,
    width: '100%',
  },
};
