import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const RARITY = {
  0: { hex: 0x8899aa, css: '#8899aa', name: 'Common'    },
  1: { hex: 0x4488ff, css: '#4488ff', name: 'Rare'      },
  2: { hex: 0xffaa00, css: '#ffaa00', name: 'Legendary' },
  3: { hex: 0xaa44ff, css: '#aa44ff', name: 'Elemental' },
};
const ABILITY_ICONS  = ['🔥', '❄️', '⚡', '☠️', '🌀'];
const ABILITY_COLORS = ['#ff5522', '#44ccff', '#ffee22', '#44ff88', '#cc44ff'];
const ABILITY_NAMES  = ['FIRE', 'ICE', 'LIGHTNING', 'POISON', 'VOID'];

/* ── Procedural chest ──────────────────────────────────────────────────── */
function buildChest(rarityHex) {
  const group = new THREE.Group();

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2a1200, roughness: 0.85, metalness: 0.05 });
  const metalMat = new THREE.MeshStandardMaterial({
    color: rarityHex, roughness: 0.15, metalness: 0.95,
    emissive: rarityHex, emissiveIntensity: 0.4,
  });

  // ── Base box ──
  const base = new THREE.Group();
  base.add(mesh(new THREE.BoxGeometry(2.4, 1.2, 1.5), woodMat, [0, 0.6, 0]));

  // Horizontal bands
  for (const y of [0.28, 0.85]) {
    base.add(mesh(new THREE.BoxGeometry(2.42, 0.13, 1.52), metalMat, [0, y, 0]));
  }
  // Vertical centre band (front)
  base.add(mesh(new THREE.BoxGeometry(0.13, 1.22, 0.02), metalMat, [0, 0.6, 0.762]));

  // Corner pillars
  const cornerGeo = new THREE.CylinderGeometry(0.09, 0.09, 1.22, 8);
  for (const [x, z] of [[-1.2, -0.75], [1.2, -0.75], [-1.2, 0.75], [1.2, 0.75]]) {
    base.add(mesh(cornerGeo, metalMat, [x, 0.6, z]));
  }

  // Lock
  base.add(mesh(new THREE.BoxGeometry(0.28, 0.35, 0.08), metalMat, [0, 0.58, 0.8]));
  const keyhole = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.1, 8), woodMat, [0, 0.54, 0.847]);
  keyhole.rotation.x = Math.PI / 2;
  base.add(keyhole);

  group.add(base);

  // ── Lid (pivot at back-bottom edge) ──
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 1.2, -0.75);

  const lidBox = mesh(new THREE.BoxGeometry(2.4, 0.5, 1.5), woodMat, [0, 0.25, 0.75]);
  lidPivot.add(lidBox);

  // Curved top
  const curve = new THREE.CylinderGeometry(0.38, 0.38, 2.4, 20, 1, false, 0, Math.PI);
  const lidCurve = mesh(curve, woodMat, [0, 0.5, 0.75]);
  lidCurve.rotation.set(0, Math.PI / 2, 0);
  lidPivot.add(lidCurve);

  // Lid band
  lidPivot.add(mesh(new THREE.BoxGeometry(2.42, 0.11, 1.52), metalMat, [0, 0.05, 0.75]));

  // Hinges
  const hingeGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.26, 8);
  for (const x of [-0.8, 0.8]) {
    const h = mesh(hingeGeo, metalMat, [x, 0, 0.02]);
    h.rotation.z = Math.PI / 2;
    lidPivot.add(h);
  }

  group.add(lidPivot);

  // Inner point light (visible when open)
  const innerLight = new THREE.PointLight(rarityHex, 0, 6);
  innerLight.position.set(0, 1.8, 0.15);
  group.add(innerLight);

  return { group, lidPivot, innerLight, metalMat };
}

function mesh(geo, mat, pos) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  return m;
}

/* ── Particle burst ─────────────────────────────────────────────────────── */
function createBurst(count, color) {
  const positions = new Float32Array(count * 3);
  const velocities = Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 5,
    y: Math.random() * 7 + 2,
    z: (Math.random() - 0.5) * 5,
  }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.14, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  points.visible = false;
  return { points, velocities, geo };
}

/* ── Card reveal tile ───────────────────────────────────────────────────── */
function RevealTile({ card, idx, visible }) {
  const ac = ABILITY_COLORS[card.abilityType ?? 0];
  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.85)',
      transition: `opacity 0.5s ${idx * 0.15}s ease, transform 0.5s ${idx * 0.15}s ease`,
      background: `linear-gradient(160deg, ${ac}18, #07071a)`,
      border: `1.5px solid ${ac}55`,
      borderRadius: 14,
      padding: '14px 16px',
      minWidth: 150,
      textAlign: 'center',
      boxShadow: `0 0 20px ${ac}33`,
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>{ABILITY_ICONS[card.abilityType ?? 0]}</div>
      <div style={{ fontSize: 12, color: ac, fontWeight: 700, letterSpacing: 1.5, marginBottom: 8 }}>
        {ABILITY_NAMES[card.abilityType ?? 0]}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 12 }}>
        <span>⚔ <b style={{ color: '#ff6644' }}>{card.attack}</b></span>
        <span>❤ <b style={{ color: '#44ff88' }}>{card.health}</b></span>
        <span>💨 <b style={{ color: '#88aaff' }}>{card.speed}</b></span>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: '#334455' }}>#{card.id}</div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */
export function PackOpeningScene({ packRarity, newCards, onClose }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef({ phase: 'floating', phaseTime: 0 }); // shared with render loop
  const [uiPhase,  setUiPhase]  = useState('floating'); // 'floating' | 'opening' | 'revealed'
  const [revealed, setRevealed] = useState(false);

  const rc = RARITY[packRarity] ?? RARITY[0];

  /* Three.js scene (runs once) */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const W = canvas.clientWidth  || 600;
    const H = canvas.clientHeight || 360;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(W, H, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;

    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x00000a, 0.07);

    const camera = new THREE.PerspectiveCamera(44, W / H, 0.1, 100);
    camera.position.set(0, 2.8, 9);
    camera.lookAt(0, 1.1, 0);

    // Lights
    scene.add(new THREE.AmbientLight(0x112244, 1.8));
    const key = new THREE.DirectionalLight(0xffffff, 2.5);
    key.position.set(5, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(rc.hex, 2.5);
    rim.position.set(-5, 3, -4);
    scene.add(rim);

    // Stars
    const starPos = new Float32Array(600 * 3);
    for (let i = 0; i < 600; i++) {
      starPos[i*3]   = (Math.random() - 0.5) * 70;
      starPos[i*3+1] = (Math.random() - 0.5) * 70;
      starPos[i*3+2] = (Math.random() - 0.5) * 70;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6,
    }));
    scene.add(stars);

    // Floor glow circle
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.5, 64),
      new THREE.MeshStandardMaterial({
        color: rc.hex, emissive: rc.hex, emissiveIntensity: 0.5,
        transparent: true, opacity: 0.12, side: THREE.DoubleSide,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.01;
    scene.add(floor);

    // Chest
    const { group: chest, lidPivot, innerLight, metalMat } = buildChest(rc.hex);
    chest.position.y = -8;
    scene.add(chest);

    // Particles
    const burst = createBurst(100, rc.hex);
    scene.add(burst.points);

    const clock     = new THREE.Clock();
    let   burstTime = -1;
    let   raf;

    function animate() {
      raf = requestAnimationFrame(animate);
      const dt      = clock.getDelta();
      const elapsed = clock.elapsedTime;
      const { phase } = stateRef.current;

      stars.rotation.y += 0.00025;

      if (phase === 'floating') {
        // Rise up from below
        const t  = Math.min(1, elapsed / 1.4);
        const e3 = 1 - Math.pow(1 - t, 3);
        chest.position.y = -8 + 8 * e3;
        if (t >= 1) {
          chest.position.y = Math.sin(elapsed * 1.4) * 0.09;
          chest.rotation.y = Math.sin(elapsed * 0.7) * 0.1;
        }
        metalMat.emissiveIntensity = 0.25 + Math.sin(elapsed * 2.8) * 0.18;
        innerLight.intensity = 0;

      } else if (phase === 'opening') {
        stateRef.current.phaseTime += dt;
        const pt = stateRef.current.phaseTime;

        // Shake (0–0.5s)
        if (pt < 0.5) {
          const shake = Math.sin(pt * 55) * 0.07 * (1 - pt / 0.5);
          chest.rotation.z = shake;
          chest.rotation.x = shake * 0.4;
        }

        // Lid opens (0.35–1.3s)
        const lidT = Math.max(0, Math.min(1, (pt - 0.35) / 0.95));
        const ease = 1 - Math.pow(1 - lidT, 2);
        lidPivot.rotation.x = ease * (-Math.PI * 0.9);

        metalMat.emissiveIntensity = 0.4 + ease * 1.8;
        innerLight.intensity = ease * 10;

        // Particle burst at mid-open
        if (lidT > 0.45 && burstTime < 0) {
          burstTime = 0;
          burst.points.visible = true;
          // Reset positions to chest interior
          const pos = burst.geo.attributes.position.array;
          for (let i = 0; i < 100; i++) {
            pos[i*3] = 0; pos[i*3+1] = 1.8; pos[i*3+2] = 0.2;
          }
          burst.geo.attributes.position.needsUpdate = true;
        }

        chest.rotation.z *= 0.88;

        if (pt > 1.4) {
          stateRef.current.phase = 'done';
          setUiPhase('revealed');
        }

      } else {
        // Done — idle float
        chest.position.y = Math.sin(elapsed * 1.1) * 0.06;
        chest.rotation.y = Math.sin(elapsed * 0.55) * 0.07;
        lidPivot.rotation.x = -Math.PI * 0.9;
        innerLight.intensity = 5 + Math.sin(elapsed * 2.5) * 1.5;
        metalMat.emissiveIntensity = 0.8 + Math.sin(elapsed * 1.8) * 0.3;
      }

      // Particle physics
      if (burstTime >= 0) {
        burstTime += dt;
        const pos = burst.geo.attributes.position.array;
        for (let i = 0; i < burst.velocities.length; i++) {
          pos[i*3]   += burst.velocities[i].x * dt;
          pos[i*3+1] += burst.velocities[i].y * dt;
          pos[i*3+2] += burst.velocities[i].z * dt;
          burst.velocities[i].y -= 5 * dt;
        }
        burst.geo.attributes.position.needsUpdate = true;
        burst.points.material.opacity = Math.max(0, 1 - burstTime * 0.65);
        if (burstTime > 2) burst.points.visible = false;
      }

      renderer.render(scene, camera);
    }

    animate();
    return () => { cancelAnimationFrame(raf); renderer.dispose(); };
  }, []); // eslint-disable-line

  // Sync click-triggered phase to render loop
  const handleClick = () => {
    if (uiPhase === 'floating') {
      stateRef.current = { phase: 'opening', phaseTime: 0 };
      setUiPhase('opening');
    }
  };

  // Stagger card reveal after animation
  useEffect(() => {
    if (uiPhase !== 'revealed') return;
    const t = setTimeout(() => setRevealed(true), 100);
    return () => clearTimeout(t);
  }, [uiPhase]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,10,0.97)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflowY: 'auto',
    }}>
      {/* 3D canvas — clickable during floating */}
      <div
        onClick={handleClick}
        style={{ width: '100%', maxWidth: 640, cursor: uiPhase === 'floating' ? 'pointer' : 'default' }}
      >
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: 360, display: 'block' }}
        />
      </div>

      {/* Prompt text */}
      {uiPhase === 'floating' && (
        <p style={{
          color: rc.css, fontSize: 15, letterSpacing: 3, fontWeight: 700,
          marginTop: -8, marginBottom: 0,
          animation: 'pulse 1.6s ease-in-out infinite',
        }}>
          НАЖМИ ЧТОБЫ ОТКРЫТЬ
        </p>
      )}
      {uiPhase === 'opening' && (
        <p style={{ color: rc.css, fontSize: 14, letterSpacing: 2, marginTop: -8 }}>
          ✨ ОТКРЫВАЕТСЯ...
        </p>
      )}

      {/* Cards */}
      {uiPhase === 'revealed' && (
        <div style={{ padding: '4px 20px 40px', width: '100%', maxWidth: 720 }}>
          <h3 style={{
            textAlign: 'center', color: rc.css,
            letterSpacing: 3, fontSize: 20, marginBottom: 24, fontWeight: 800,
          }}>
            ✨ {newCards.length} НОВЫХ СУЩЕСТВА
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            {newCards.map((card, i) => (
              <RevealTile key={card.id} card={card} idx={i} visible={revealed} />
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button onClick={onClose} style={{
              background: `linear-gradient(135deg, ${rc.css}44, ${rc.css}99)`,
              color: '#fff', border: `1px solid ${rc.css}`,
              borderRadius: 10, padding: '12px 44px',
              cursor: 'pointer', fontSize: 16, fontWeight: 800, letterSpacing: 1,
              boxShadow: `0 0 24px ${rc.css}44`,
            }}>
              В КОЛЛЕКЦИЮ →
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
