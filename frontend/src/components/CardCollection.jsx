import { useEffect, useRef } from 'react';
import { CreatureBuilder } from '../three/CreatureBuilder.js';
import * as THREE from 'three';

const ABILITY_NAMES = ['FIRE', 'ICE', 'LIGHTNING', 'POISON', 'VOID'];
const ABILITY_COLORS = ['#ff4400', '#88ccff', '#ffff00', '#44ff44', '#cc00ff'];

// Mini Three.js canvas per card for the 3D preview
function CreaturePreview({ card }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas   = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(120, 120);
    renderer.setPixelRatio(window.devicePixelRatio);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(0, 1, 6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(3, 5, 3);
    scene.add(dir);

    const group = new CreatureBuilder(card).getGroup();
    scene.add(group);

    let rafId;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      group.rotation.y += 0.012;
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
    };
  }, [card.id]);

  return <canvas ref={canvasRef} style={{ width: 120, height: 120 }} />;
}

function CardTile({ card, selected, onSelect }) {
  const abilityColor = ABILITY_COLORS[card.abilityType] ?? '#888';
  const abilityName  = ABILITY_NAMES[card.abilityType]  ?? '?';

  return (
    <div
      onClick={() => onSelect(card)}
      style={{
        border:        `2px solid ${selected ? '#fff' : abilityColor}`,
        borderRadius:  12,
        padding:       12,
        cursor:        'pointer',
        background:    selected ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           6,
        minWidth:      150,
        transition:    'all 0.15s',
      }}
    >
      <CreaturePreview card={card} />
      <div style={{ color: abilityColor, fontWeight: 700, fontSize: 12 }}>{abilityName} #{card.id}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, width: '100%' }}>
        <Stat label="ATK" value={card.attack}  color="#ff6644" />
        <Stat label="HP"  value={card.health}  color="#44ff88" />
        <Stat label="SPD" value={card.speed}   color="#88aaff" />
      </div>
      <div style={{ fontSize: 11, color: '#888' }}>W:{card.wins} L:{card.losses}</div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ color, fontSize: 14, fontWeight: 700 }}>{value}</div>
      <div style={{ color: '#666', fontSize: 10 }}>{label}</div>
    </div>
  );
}

export function CardCollection({ cards, selectedIds = [], onSelectCard, onOpenPack, loading }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#cce' }}>Мои существа ({cards.length})</h2>
        <button
          onClick={onOpenPack}
          disabled={loading}
          style={btnStyle('#7744cc')}
        >
          {loading ? '...' : '🃏 Открыть пак (0.03 ETH)'}
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {cards.map(card => (
          <CardTile
            key={card.id}
            card={card}
            selected={selectedIds.includes(card.id)}
            onSelect={onSelectCard}
          />
        ))}
        {cards.length === 0 && !loading && (
          <div style={{ color: '#555', padding: 20 }}>Нет карточек. Откройте пак!</div>
        )}
      </div>
    </div>
  );
}

const btnStyle = (bg) => ({
  background:   bg,
  color:        '#fff',
  border:       'none',
  borderRadius: 8,
  padding:      '8px 18px',
  cursor:       'pointer',
  fontSize:     14,
  fontWeight:   600,
});
