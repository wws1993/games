import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { CHARACTER_SKIN_SHOP_DEFS, WEAPON_COSMETIC_SHOP_DEFS } from '../game/meta/metaUnlockShopConfig';
import type { PlayableHeroId } from '../game/meta/playableHeroConfig';
import { PLAYABLE_HERO_DEFS } from '../game/meta/playableHeroConfig';
import {
  loadAchievementSave,
  setSelectedCharacterSkin,
  setSelectedPlayableHero,
  setSelectedWeaponCosmetic,
  tryPurchaseCharacterSkin,
  tryPurchasePlayableHero,
  tryPurchaseWeaponCosmetic,
} from '../game/meta/achievementStore';

/** 商店顶部分类：玩法角色 / 游击队员配色 / 枪皮 */
type ShopTabId = 'heroes' | 'skins' | 'weaponSkin';

const SHOP_TAB_ROWS: readonly { id: ShopTabId; label: string; short: string }[] = [
  { id: 'heroes', label: '玩法角色', short: '角色' },
  { id: 'skins', label: '造型配色', short: '配色' },
  { id: 'weaponSkin', label: '枪皮外观', short: '枪皮' },
];

/** 从 URL `tab` 解析分类；`character` 兼容旧链接 */
function shopTabFromSearchParams(searchParams: URLSearchParams): ShopTabId {
  const raw = searchParams.get('tab');
  if (raw === 'weaponSkin') {
    return 'weaponSkin';
  }
  if (raw === 'skins') {
    return 'skins';
  }
  if (raw === 'heroes' || raw === 'character' || raw == null) {
    return 'heroes';
  }
  return 'heroes';
}

/**
 * 局外商店：金币解锁玩法角色、游击队员矢量配色与枪皮；主武器仅在局内紫箱缴获
 */
export function ShopPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = useMemo(() => shopTabFromSearchParams(searchParams), [searchParams]);
  const setTab = useCallback(
    (next: ShopTabId) => {
      if (next === 'heroes') {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: next }, { replace: true });
      }
    },
    [setSearchParams],
  );
  const [save, setSave] = useState(() => loadAchievementSave());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSave(loadAchievementSave());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  }, []);

  const onBack = useCallback(() => {
    void navigate('/');
  }, [navigate]);

  const onBuyCharacter = (id: string): void => {
    const r = tryPurchaseCharacterSkin(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('解锁成功');
  };

  const onSelectCharacter = (id: string): void => {
    const r = setSelectedCharacterSkin(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('已切换造型配色');
  };

  const onBuySkin = (id: string): void => {
    const r = tryPurchaseWeaponCosmetic(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('解锁成功');
  };

  const onSelectSkin = (id: string): void => {
    const r = setSelectedWeaponCosmetic(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('已切换枪皮');
  };

  const onBuyPlayableHero = (id: PlayableHeroId): void => {
    const r = tryPurchasePlayableHero(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('解锁成功');
  };

  const onSelectPlayableHero = (id: PlayableHeroId): void => {
    const r = setSelectedPlayableHero(id);
    if (!r.ok) {
      showToast(r.reason);
      return;
    }
    refresh();
    showToast('已切换玩法角色');
  };

  const tabHint =
    tab === 'heroes'
      ? '决定开局武器池与被动；游击队员可在「造型配色」中换矢量底色；燕双鹰等为固定配色。'
      : tab === 'skins'
        ? '仅「游击队员」局内与图鉴使用该配色；解锁后点「使用」立即生效。'
        : '仅影响木托、机匣与弹丸着色；不改变武器数值。';

  return (
    <div className="page page-shop">
      <header className="shop-header">
        <button type="button" className="codex-back" onClick={onBack} aria-label="返回">
          <span aria-hidden className="codex-back-chevron" />
        </button>
        <h1 className="shop-header-title">商店</h1>
        <div className="shop-coins" aria-live="polite">
          <span className="shop-coins-label">金币</span>
          <span className="shop-coins-value">{save.coins}</span>
        </div>
      </header>

      <div className="shop-tabs" role="tablist" aria-label="商店分类">
        {SHOP_TAB_ROWS.map((row) => (
          <button
            key={row.id}
            type="button"
            role="tab"
            aria-selected={tab === row.id}
            className={`shop-tab ${tab === row.id ? 'shop-tab--active' : ''}`}
            onClick={() => setTab(row.id)}
          >
            <span className="shop-tab-label-full">{row.label}</span>
            <span className="shop-tab-label-short">{row.short}</span>
          </button>
        ))}
      </div>

      <p className="shop-hint">{tabHint}</p>
      <p className="shop-hint shop-hint--secondary">单局结算金币来自击杀与存活；主武器由局内紫箱解锁，不在此购买。</p>

      <div className="shop-scroll">
        {tab === 'heroes' ? (
          <section className="shop-section" aria-labelledby="shop-section-heroes">
            <h2 id="shop-section-heroes" className="shop-section-title">
              玩法角色
              <span className="shop-section-count">{PLAYABLE_HERO_DEFS.length}</span>
            </h2>
            <ul className="shop-grid">
              {PLAYABLE_HERO_DEFS.map((d) => {
                const owned = save.unlockedPlayableHeroIds.includes(d.id);
                const sel = save.selectedPlayableHeroId === d.id;
                return (
                  <li key={d.id} className="shop-card">
                    <div
                      className="shop-card-preview shop-card-preview--char"
                      style={{
                        background: `linear-gradient(145deg, #${d.palette.uniformBody.toString(16).padStart(6, '0')} 0%, #${d.palette.capBody.toString(16).padStart(6, '0')} 100%)`,
                      }}
                    />
                    <div className="shop-card-body">
                      <div className="shop-card-title">{d.name}</div>
                      <div className="shop-card-desc">{d.description}</div>
                      <div className="shop-card-actions">
                        {owned ? (
                          <>
                            {sel ? (
                              <span className="shop-pill shop-pill--muted">开局选用</span>
                            ) : (
                              <button
                                type="button"
                                className="page-btn-primary shop-card-btn"
                                onClick={() => onSelectPlayableHero(d.id)}
                              >
                                选用
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="page-btn-primary shop-card-btn"
                            disabled={save.coins < d.costCoins}
                            onClick={() => onBuyPlayableHero(d.id)}
                          >
                            {d.costCoins > 0 ? `${d.costCoins} 金币 解锁` : '—'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {tab === 'skins' ? (
          <section className="shop-section" aria-labelledby="shop-section-skins">
            <h2 id="shop-section-skins" className="shop-section-title">
              造型配色
              <span className="shop-section-count">{CHARACTER_SKIN_SHOP_DEFS.length}</span>
            </h2>
            <ul className="shop-grid">
              {CHARACTER_SKIN_SHOP_DEFS.map((d) => {
                const owned = save.unlockedCharacterIds.includes(d.id);
                const sel = save.selectedCharacterId === d.id;
                return (
                  <li key={d.id} className="shop-card">
                    <div
                      className="shop-card-preview shop-card-preview--char"
                      style={{
                        background: `linear-gradient(145deg, #${d.palette.uniformBody.toString(16).padStart(6, '0')} 0%, #${d.palette.capBody.toString(16).padStart(6, '0')} 100%)`,
                      }}
                    />
                    <div className="shop-card-body">
                      <div className="shop-card-title">{d.name}</div>
                      <div className="shop-card-desc">{d.description}</div>
                      <div className="shop-card-actions">
                        {owned ? (
                          <>
                            {sel ? (
                              <span className="shop-pill shop-pill--muted">使用中</span>
                            ) : (
                              <button
                                type="button"
                                className="page-btn-primary shop-card-btn"
                                onClick={() => onSelectCharacter(d.id)}
                              >
                                使用
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="page-btn-primary shop-card-btn"
                            disabled={save.coins < d.costCoins}
                            onClick={() => onBuyCharacter(d.id)}
                          >
                            {d.costCoins > 0 ? `${d.costCoins} 金币 解锁` : '—'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {tab === 'weaponSkin' ? (
          <section className="shop-section" aria-labelledby="shop-section-weapon">
            <h2 id="shop-section-weapon" className="shop-section-title">
              枪皮外观
              <span className="shop-section-count">{WEAPON_COSMETIC_SHOP_DEFS.length}</span>
            </h2>
            <ul className="shop-grid">
              {WEAPON_COSMETIC_SHOP_DEFS.map((d) => {
                const owned = save.unlockedWeaponSkinIds.includes(d.id);
                const sel = save.selectedWeaponSkinId === d.id;
                const swatch =
                  d.bulletColor != null ? `#${d.bulletColor.toString(16).padStart(6, '0')}` : '#888888';
                return (
                  <li key={d.id} className="shop-card shop-card--weapon">
                    <div
                      className="shop-card-preview shop-card-preview--skin"
                      style={{
                        background: `linear-gradient(90deg, #${d.gunWood.toString(16).padStart(6, '0')} 0%, #${d.gunMetal.toString(16).padStart(6, '0')} 55%, ${swatch} 100%)`,
                      }}
                    />
                    <div className="shop-card-body">
                      <div className="shop-card-title">{d.name}</div>
                      <div className="shop-card-desc">{d.description}</div>
                      <div className="shop-card-actions">
                        {owned ? (
                          <>
                            {sel ? (
                              <span className="shop-pill shop-pill--muted">使用中</span>
                            ) : (
                              <button
                                type="button"
                                className="page-btn-primary shop-card-btn"
                                onClick={() => onSelectSkin(d.id)}
                              >
                                使用
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            type="button"
                            className="page-btn-primary shop-card-btn"
                            disabled={save.coins < d.costCoins}
                            onClick={() => onBuySkin(d.id)}
                          >
                            {d.costCoins > 0 ? `${d.costCoins} 金币 解锁` : '—'}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>

      {toast ? (
        <div className="shop-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
