import * as THREE from 'three';
import { CreatureBuilder } from './CreatureBuilder.js';
import { BattleAnimator }  from './BattleAnimator.js';
import { ParticleSystem }  from './ParticleSystem.js';

export class BattleScene {
  constructor(canvas) {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x080818);
    this.scene.fog         = new THREE.FogExp2(0x080818, 0.035);

    // Camera
    this.camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 3.5, 10);
    this.camera.lookAt(0, 0.5, 0);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x334466, 0.7));

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(6, 10, 6);
    keyLight.castShadow          = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x6688aa, 0.5);
    fillLight.position.set(-6, 3, -4);
    this.scene.add(fillLight);

    // Arena floor with glow ring
    const floorMat  = new THREE.MeshPhongMaterial({ color: 0x111233 });
    const floor     = new THREE.Mesh(new THREE.CircleGeometry(7, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x334488, wireframe: true });
    const ring    = new THREE.Mesh(new THREE.TorusGeometry(5, 0.05, 6, 60), ringMat);
    ring.rotation.x = -Math.PI / 2;
    this.scene.add(ring);

    // State
    this.animator  = null;
    this.particles = null;
    this._running  = false;
    this._rafId    = null;
    this._lastT    = 0;

    this.challengerGroup = null;
    this.opponentGroup   = null;
  }

  loadCreatures(challengerStats, opponentStats) {
    // Remove previous if any
    if (this.challengerGroup) this.scene.remove(this.challengerGroup);
    if (this.opponentGroup)   this.scene.remove(this.opponentGroup);
    if (this.particles)       this.particles.dispose();

    this.challengerGroup = new CreatureBuilder(challengerStats).getGroup();
    this.opponentGroup   = new CreatureBuilder(opponentStats).getGroup();

    this.challengerGroup.position.set(-3.2, 0, 0);
    this.opponentGroup.position.set(3.2, 0, 0);
    this.opponentGroup.rotation.y = Math.PI;

    this.scene.add(this.challengerGroup, this.opponentGroup);

    this.particles = new ParticleSystem(this.scene);
    this.animator  = new BattleAnimator(this.challengerGroup, this.opponentGroup);
  }

  // rounds: Array<{ attacker: 'challenger'|'opponent', abilityParticleType: string }>
  // winnerKey: 'challenger'|'opponent'
  async playBattle(rounds, winnerKey, onComplete) {
    if (!this.animator) return;
    for (const round of rounds) {
      await this.animator.playRound(round, this.particles);
    }
    const loserKey = winnerKey === 'challenger' ? 'opponent' : 'challenger';
    await this.animator.playDeath(loserKey);
    onComplete?.();
  }

  start() {
    this._running = true;
    this._lastT   = performance.now();
    this._loop();
  }

  stop() {
    this._running = false;
    cancelAnimationFrame(this._rafId);
  }

  _loop() {
    if (!this._running) return;
    this._rafId = requestAnimationFrame(() => this._loop());

    const now   = performance.now();
    const delta = (now - this._lastT) * 0.001;
    this._lastT = now;

    if (this.animator) this.animator.playIdle(delta);
    if (this.particles) this.particles.tick();

    this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.stop();
    this.particles?.dispose();
    this.renderer.dispose();
  }
}
