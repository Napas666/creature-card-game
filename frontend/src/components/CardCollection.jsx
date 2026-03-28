import { useState, useEffect, useRef } from 'react';
import { CreatureBuilder } from '../three/CreatureBuilder.js';
import { PACK_INFO } from '../hooks/useCards.js';
import * as THREE from 'three';

const ABILITY_NAMES  = ['FIRE', 'ICE', 'LIGHTNING', 'POISON', 'VOID'];
const ABILITY_COLORS = ['#ff5522', '#44ccff', '#ffee22', '#44ff88', '#cc44ff'];
const ABILITY_ICONS  = ['🔥', '❄️', '⚡', '☠️', '🌀'];

/* ── 3D preview ─────────────────────────────────────────────────────────── */
function CreaturePreview({ card }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: ref.current, antialias: true, alpha: true });
    renderer.setSize(130, 130);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    camera.position.set(0, 1.5, 7.5);
    camera.lookAt(0, 0.3, 0);

    scene.add(new THREE.AmbientLight(0x334466, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.0);
    key.position.set(4, 7, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(new THREE.Color(ABILITY_COLORS[card.abilityType ?? 0]), 1.0);
    rim.position.set(-4, 2, -3);
    scene.add(rim);

    const group = new CreatureBuilder(card).getGroup();
    scene.add(group);

    let raf;
    const loop = () => { raf = requestAnimationFrame(loop); group.rotation.y += 0.010; renderer.render(scene, camera); };
    loop();
    return () => { cancelAnimationFrame(raf); renderer.dispose(); };
  }, [card.id]);

  return <canvas ref={ref} style={{ width: 130, height: 130, display: 'block', borderRadius: '50%' }} />;
}

/* ── Stat bar ────────────────────────────────────────────────────────────── */
function StatBar({ label, value, max = 200, color }) {
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: '#556677', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: '#0d0d2a', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(100, (value / max) * 100)}%`,
                      background: `linear-gradient(90deg, ${color}66, ${color})`,
                      transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

/* ── Level badge ─────────────────────────────────────────────────────────── */
function LevelBadge({ level }) {
  const colors = ['#667788','#4488ff','#aa44ff','#ffaa00','#ff4422'];
  const tier   = Math.min(4, Math.floor(level / 4));
  const labels = ['⚪','🔵','🟣','🟡','🔴'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                  background: `${colors[tier]}22`, border: `1px solid ${colors[tier]}44`,
                  borderRadius: 20, padding: '2px 8px', fontSize: 11 }}>
      <span>{labels[tier]}</span>
      <span style={{ color: colors[tier], fontWeight: 700 }}>LVL {level}</span>
    </div>
  );
}

/* ── Card tile ───────────────────────────────────────────────────────────── */
function CardTile({ card, selected, onSelect }) {
  const ac = ABILITY_COLORS[card.abilityType ?? 0];
  const ai = ABILITY_ICONS[card.abilityType ?? 0];
  const an = ABILITY_NAMES[card.abilityType ?? 0];

  return (
    <div onClick={() => onSelect(card)}
      style={{ width: 182, borderRadius: 16, padding: 13, cursor: 'pointer',
               background: selected
                 ? `linear-gradient(160deg, ${ac}18, #0d0d2a)`
                 : 'linear-gradient(160deg, #0c0c1e, #070715)',
               border: `1.5px solid ${selected ? ac : '#181840'}`,
               boxShadow: selected ? `0 0 22px ${ac}44, 0 4px 20px #00000088` : '0 4px 16px #00000066',
               display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
               transition: 'all 0.18s', transform: selected ? 'translateY(-4px)' : 'none' }}>

      {/* Top row: ability + id + level */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: ac, fontWeight: 700, letterSpacing: 1.5,
                       background: `${ac}18`, padding: '3px 7px', borderRadius: 20 }}>
          {ai} {an}
        </span>
        <LevelBadge level={card.level ?? 0} />
      </div>

      {/* 3D preview */}
      <div style={{ borderRadius: '50%', overflow: 'hidden', border: `2px solid ${ac}44`,
                    boxShadow: `0 0 16px ${ac}33` }}>
        <CreaturePreview card={card} />
      </div>

      {/* Stat bars */}
      <div style={{ width: '100%' }}>
        <StatBar label="⚔ ATK" value={card.attack}  color="#ff5522" />
        <StatBar label="❤ HP"  value={card.health}  color="#44ff88" />
        <StatBar label="💨 SPD" value={card.speed}   color="#88aaff" />
      </div>

      {/* W/L + card id */}
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 11 }}>
        <span style={{ color: '#334' }}>#{card.id}</span>
        <span>
          <span style={{ color: '#44ff88' }}>✓{card.wins}</span>
          <span style={{ color: '#445', margin: '0 4px' }}>·</span>
          <span style={{ color: '#ff5544' }}>✗{card.losses}</span>
        </span>
      </div>

      {selected && (
        <div style={{ fontSize: 11, color: ac, fontWeight: 700, letterSpacing: 2 }}>ВЫБРАНО ✓</div>
      )}
    </div>
  );
}

/* ── Pack shop ───────────────────────────────────────────────────────────── */
const ELEMENTAL_OPTIONS = [
  { type: 0, label: '🔥 Fire',      color: '#ff5522' },
  { type: 1, label: '❄️ Ice',       color: '#44ccff' },
  { type: 2, label: '⚡ Lightning', color: '#ffee22' },
  { type: 3, label: '☠️ Poison',    color: '#44ff88' },
  { type: 4, label: '🌀 Void',      color: '#cc44ff' },
];

function PackShop({ onOpenPack, onOpenElementalPack, loading }) {
  const [elemType, setElemType] = useState(0);
  const [showElem, setShowElem] = useState(false);

  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{ fontSize: 14, color: '#667799', letterSpacing: 2, marginBottom: 14, fontWeight: 700 }}>
        🏪 МАГ. ЛАВКА
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {PACK_INFO.map(pack => (
          <div key={pack.rarity} style={{ position: 'relative' }}>
            {pack.rarity === 3 ? (
              /* Elemental pack — special UI */
              <div style={{ display: 'flex', gap: 6, flexDirection: 'column',
                            background: '#0d0d22', border: '1px solid #281840',
                            borderRadius: 12, padding: '10px 12px', minWidth: 170 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 20 }}>{pack.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pack.color }}>{pack.name}</div>
                    <div style={{ fontSize: 11, color: '#445566' }}>{pack.price} ETH · {pack.count} карты</div>
                  </div>
                </div>
                {/* Elemental type selector */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ELEMENTAL_OPTIONS.map(o => (
                    <button key={o.type} onClick={() => setElemType(o.type)}
                      style={{ background: elemType === o.type ? `${o.color}22` : 'transparent',
                               border: `1px solid ${elemType === o.type ? o.color : '#223'}`,
                               color: elemType === o.type ? o.color : '#445',
                               borderRadius: 6, padding: '3px 7px', cursor: 'pointer', fontSize: 11 }}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <button disabled={loading}
                  onClick={() => onOpenElementalPack(elemType)}
                  style={{ background: loading ? '#111' : `linear-gradient(135deg, ${ELEMENTAL_OPTIONS[elemType].color}44, ${ELEMENTAL_OPTIONS[elemType].color}88)`,
                           color: '#fff', border: `1px solid ${ELEMENTAL_OPTIONS[elemType].color}`,
                           borderRadius: 8, padding: '7px 12px', cursor: loading ? 'default' : 'pointer',
                           fontSize: 13, fontWeight: 700 }}>
                  {loading ? '⏳' : `Открыть ${ELEMENTAL_OPTIONS[elemType].label}`}
                </button>
              </div>
            ) : (
              /* Standard pack button */
              <button disabled={loading} onClick={() => onOpenPack(pack.rarity)}
                style={{ background: loading ? '#0a0a1a' : `linear-gradient(135deg, ${pack.color}18, #0d0d2a)`,
                         border: `1px solid ${loading ? '#181830' : pack.color + '55'}`,
                         borderRadius: 12, padding: '10px 14px', cursor: loading ? 'default' : 'pointer',
                         color: '#dde', display: 'flex', flexDirection: 'column', gap: 4,
                         alignItems: 'flex-start', minWidth: 130,
                         boxShadow: loading ? 'none' : `0 0 14px ${pack.color}22`,
                         transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{pack.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: pack.color }}>{pack.name}</div>
                    <div style={{ fontSize: 11, color: '#445566' }}>{pack.price} ETH · {pack.count} карты</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#445' }}>Статы: {pack.statRange}</div>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export function CardCollection({ cards, selectedIds = [], onSelectCard, onOpenPack, onOpenElementalPack, loading }) {
  return (
    <div>
      <PackShop onOpenPack={onOpenPack} onOpenElementalPack={onOpenElementalPack} loading={loading} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#667799', letterSpacing: 2 }}>
          МОИ СУЩЕСТВА
        </h2>
        <span style={{ fontSize: 12, color: '#334455', background: '#0d0d22',
                       padding: '2px 10px', borderRadius: 20 }}>{cards.length}</span>
        {cards.length >= 2 && selectedIds.length < 2 && (
          <span style={{ fontSize: 12, color: '#334455', fontStyle: 'italic' }}>
            Выбери 2 для битвы
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {cards.map(c => (
          <CardTile key={c.id} card={c} selected={selectedIds.includes(c.id)} onSelect={onSelectCard} />
        ))}
        {cards.length === 0 && !loading && (
          <div style={{ color: '#2a2a4a', padding: '30px 0', fontSize: 14 }}>
            Нет существ. Открой пак в лавке выше ↑
          </div>
        )}
      </div>
    </div>
  );
}
