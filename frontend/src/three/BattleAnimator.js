import * as THREE from 'three';

// Lerp a value from `from` to `to` over `durationMs` ms using rAF.
function lerp(from, to, durationMs, setter) {
  return new Promise(resolve => {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      setter(from + (to - from) * easeInOut(t));
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export class BattleAnimator {
  constructor(challengerGroup, opponentGroup) {
    this.groups = {
      challenger: challengerGroup,
      opponent:   opponentGroup,
    };
    // Store original X positions for retreating
    this._originX = {
      challenger: challengerGroup.position.x,
      opponent:   opponentGroup.position.x,
    };
  }

  // round: { attacker: 'challenger'|'opponent', abilityParticleType: string }
  async playRound(round, particles) {
    const attackerKey  = round.attacker;
    const defenderKey  = attackerKey === 'challenger' ? 'opponent' : 'challenger';
    const atk          = this.groups[attackerKey];
    const def          = this.groups[defenderKey];
    const originX      = this._originX[attackerKey];
    const lunge        = attackerKey === 'challenger' ? 1.8 : -1.8;

    // Lunge toward defender
    await lerp(originX, originX + lunge, 180, x => { atk.position.x = x; });

    // Hit flash
    this._flashHit(def);
    if (round.abilityParticleType) {
      particles.burst(def.position.clone().add(new THREE.Vector3(0, 0.5, 0)), round.abilityParticleType);
    }
    await delay(140);

    // Retreat
    await lerp(originX + lunge, originX, 200, x => { atk.position.x = x; });
  }

  async playDeath(loserKey) {
    const group = this.groups[loserKey];
    const start = performance.now();
    await new Promise(resolve => {
      const step = (now) => {
        const t = Math.min((now - start) / 600, 1);
        group.position.y = -t * 1.5;
        group.traverse(obj => {
          if (obj.isMesh) {
            obj.material.transparent = true;
            obj.material.opacity     = 1 - t;
          }
        });
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    group.visible = false;
  }

  playIdle(delta) {
    const t = performance.now() * 0.001;
    for (const [key, group] of Object.entries(this.groups)) {
      if (!group.visible) continue;
      // Gentle bob
      group.position.y = this._baseY(key) + Math.sin(t * 1.3 + (key === 'opponent' ? Math.PI : 0)) * 0.06;
      // Slow rotation for void ring
      const ring = group.getObjectByName('voidRing');
      if (ring) ring.rotation.z += delta * 1.5;
    }
  }

  _baseY(key) { return 0; }

  _flashHit(group) {
    group.traverse(obj => {
      if (!obj.isMesh) return;
      const orig = obj.material.emissive.getHex();
      obj.material.emissive.setHex(0xff0000);
      setTimeout(() => {
        if (obj.material) obj.material.emissive.setHex(orig);
      }, 160);
    });
  }
}
