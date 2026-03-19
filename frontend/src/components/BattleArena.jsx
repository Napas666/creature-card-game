import { useEffect, useRef, useState } from 'react';
import { BattleScene } from '../three/BattleScene.js';
import { getAbilityTheme } from '../utils/statsToTraits.js';

export function BattleArena({ challengerCard, opponentCard, battleResult, onBattleEnd }) {
  const canvasRef = useRef(null);
  const sceneRef  = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | fighting | done

  // Initialize Three.js scene
  useEffect(() => {
    if (!canvasRef.current || !challengerCard || !opponentCard) return;

    const canvas = canvasRef.current;
    const scene  = new BattleScene(canvas);
    sceneRef.current = scene;

    const rect = canvas.getBoundingClientRect();
    scene.resize(rect.width || 800, rect.height || 500);
    scene.loadCreatures(challengerCard, opponentCard);
    scene.start();

    const ro = new ResizeObserver(entries => {
      const { width: w, height: h } = entries[0].contentRect;
      scene.resize(w, h);
    });
    ro.observe(canvas);

    return () => {
      scene.dispose();
      ro.disconnect();
    };
  }, [challengerCard, opponentCard]);

  // Trigger battle playback when result arrives
  useEffect(() => {
    if (!battleResult || !sceneRef.current || phase !== 'idle') return;
    setPhase('fighting');

    // Build round-by-round animation data from battle result
    const rounds = buildRoundData(battleResult, challengerCard, opponentCard);
    const winnerKey = battleResult.winnerToken === challengerCard.id ? 'challenger' : 'opponent';

    sceneRef.current.playBattle(rounds, winnerKey, () => {
      setPhase('done');
      onBattleEnd?.(battleResult);
    });
  }, [battleResult]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '500px', display: 'block', borderRadius: 12 }}
      />
      {phase === 'fighting' && (
        <div style={overlayStyle}>⚔️ Битва идёт...</div>
      )}
      {phase === 'done' && battleResult && (
        <div style={{ ...overlayStyle, background: 'rgba(0,20,40,0.85)', fontSize: 22 }}>
          {battleResult.winnerToken === challengerCard?.id ? '🏆 Победа!' : '💀 Поражение'}
          <br />
          <span style={{ fontSize: 14, opacity: 0.7 }}>Раундов: {battleResult.rounds}</span>
        </div>
      )}
    </div>
  );
}

function buildRoundData(battleResult, challengerCard, opponentCard) {
  const rounds = [];
  const cTheme = getAbilityTheme(challengerCard.abilityType);
  const oTheme = getAbilityTheme(opponentCard.abilityType);

  // Alternate attacker based on speed (challenger goes first if speed >=)
  const challengerFirst = challengerCard.speed >= opponentCard.speed;
  for (let i = 0; i < battleResult.rounds; i++) {
    const attackerFirst = i % 2 === 0;
    const attacker      = (challengerFirst ? attackerFirst : !attackerFirst) ? 'challenger' : 'opponent';
    const theme         = attacker === 'challenger' ? cTheme : oTheme;
    rounds.push({ attacker, abilityParticleType: theme.particle });
  }
  return rounds;
}

const overlayStyle = {
  position:        'absolute',
  bottom:           20,
  left:             '50%',
  transform:        'translateX(-50%)',
  background:       'rgba(0,0,0,0.6)',
  color:            '#fff',
  padding:          '10px 28px',
  borderRadius:     8,
  fontSize:         16,
  textAlign:        'center',
  pointerEvents:    'none',
};
