import * as THREE from 'three';
import { EffectComposer }   from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }       from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }  from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass }       from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CreatureBuilder }  from './CreatureBuilder.js';
import { BattleAnimator }   from './BattleAnimator.js';
import { ParticleSystem }   from './ParticleSystem.js';

export class BattleScene {
  constructor(canvas) {
    /* ── Renderer ── */
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace  = THREE.SRGBColorSpace;

    /* ── Scene ── */
    this.scene = new THREE.Scene();

    /* ── Starfield background ── */
    this._buildStarfield();

    /* ── Fog ── */
    this.scene.fog = new THREE.FogExp2(0x04040f, 0.028);

    /* ── Camera ── */
    this.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 200);
    this.camera.position.set(0, 4.0, 11);
    this.camera.lookAt(0, 0.8, 0);

    /* ── Lighting ── */
    this.scene.add(new THREE.AmbientLight(0x111133, 0.9));

    const key = new THREE.DirectionalLight(0xeeeeff, 1.6);
    key.position.set(7, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far  = 40;
    key.shadow.camera.left = key.shadow.camera.bottom = -12;
    key.shadow.camera.right = key.shadow.camera.top   =  12;
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x334466, 0.6);
    fill.position.set(-7, 4, -5);
    this.scene.add(fill);

    const under = new THREE.PointLight(0x2233aa, 1.2, 18);
    under.position.set(0, -3, 0);
    this.scene.add(under);

    /* ── Arena ── */
    this._buildArena();

    /* ── Post-processing ── */
    this.composer = null;  // init in resize()

    /* ── State ── */
    this.animator  = null;
    this.particles = null;
    this._running  = false;
    this._rafId    = null;
    this._lastT    = 0;
    this.challengerGroup = null;
    this.opponentGroup   = null;
  }

  /* ────────────────────────────────────────────────────────────────────────
     Starfield: 2000 stars in a large sphere
  ─────────────────────────────────────────────────────────────────────── */
  _buildStarfield() {
    const count  = 2000;
    const pos    = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const starColors = [
      [1.0, 0.9, 0.8], [0.8, 0.9, 1.0], [1.0, 0.8, 0.6],
      [0.7, 0.8, 1.0], [1.0, 1.0, 1.0],
    ];

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 60 + Math.random() * 80;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      const col = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3]     = col[0];
      colors[i * 3 + 1] = col[1];
      colors[i * 3 + 2] = col[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size:          0.35,
      vertexColors:  true,
      sizeAttenuation: true,
      transparent:   true,
      opacity:       0.9,
    });
    this.scene.add(new THREE.Points(geo, mat));
  }

  /* ────────────────────────────────────────────────────────────────────────
     Arena: hexagonal floor + glowing rings + energy pillars
  ─────────────────────────────────────────────────────────────────────── */
  _buildArena() {
    /* Floor */
    const floorMat = new THREE.MeshStandardMaterial({
      color:     0x080820,
      roughness: 0.9,
      metalness: 0.0,
      emissive:  0x0a0a3a,
      emissiveIntensity: 0.4,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 6), floorMat);
    floor.rotation.x    = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    /* Hex grid lines */
    const lineMat = new THREE.LineBasicMaterial({ color: 0x223399, transparent: true, opacity: 0.35 });
    for (let r = 1; r <= 3; r++) {
      const pts = [];
      for (let a = 0; a <= 6; a++) {
        const angle = (a / 6) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(angle) * r * 2, 0.01, Math.sin(angle) * r * 2));
      }
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }
    for (let a = 0; a < 6; a++) {
      const angle = (a / 6) * Math.PI * 2;
      const pts = [
        new THREE.Vector3(0, 0.01, 0),
        new THREE.Vector3(Math.cos(angle) * 7, 0.01, Math.sin(angle) * 7),
      ];
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat));
    }

    /* Outer glow ring */
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x2255ee, transparent: true, opacity: 0.6 });
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(6.8, 0.06, 6, 80), ringMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.02;
    this.scene.add(outerRing);

    /* Inner ring */
    const innerMat = new THREE.MeshBasicMaterial({ color: 0x113388, transparent: true, opacity: 0.5 });
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.04, 6, 60), innerMat);
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.02;
    this.scene.add(innerRing);

    /* 6 energy corner pillars */
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x112244, emissive: 0x2244cc, emissiveIntensity: 0.8, roughness: 0.4
    });
    for (let i = 0; i < 6; i++) {
      const angle   = (i / 6) * Math.PI * 2;
      const pillar  = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3, 8), pillarMat);
      pillar.position.set(Math.cos(angle) * 6.8, 1.5, Math.sin(angle) * 6.8);
      this.scene.add(pillar);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), new THREE.MeshStandardMaterial({
        color: 0x4466ff, emissive: 0x4466ff, emissiveIntensity: 2.0, roughness: 0.0
      }));
      orb.position.set(Math.cos(angle) * 6.8, 3.2, Math.sin(angle) * 6.8);
      this.scene.add(orb);
      // Point light per orb
      const plight = new THREE.PointLight(0x2244ff, 0.7, 6);
      plight.position.copy(orb.position);
      this.scene.add(plight);
    }

    /* VS divider line */
    const vsMat = new THREE.MeshBasicMaterial({ color: 0x441111, transparent: true, opacity: 0.4 });
    const vsLine = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.01, 14), vsMat);
    vsLine.position.y = 0.02;
    vsLine.rotation.y = Math.PI / 2;
    this.scene.add(vsLine);
  }

  /* ── Post-processing setup ── */
  _setupComposer(w, h) {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.45, 0.72);
    this.composer.addPass(bloom);
    this.composer.addPass(new OutputPass());
  }

  /* ── Load creatures ── */
  loadCreatures(challengerStats, opponentStats) {
    if (this.challengerGroup) this.scene.remove(this.challengerGroup);
    if (this.opponentGroup)   this.scene.remove(this.opponentGroup);
    if (this.particles)       this.particles.dispose?.();

    this.challengerGroup = new CreatureBuilder(challengerStats).getGroup();
    this.opponentGroup   = new CreatureBuilder(opponentStats).getGroup();

    this.challengerGroup.position.set(-3.4, 0.2, 0);
    this.opponentGroup.position.set(3.4, 0.2, 0);
    this.opponentGroup.rotation.y = Math.PI;

    this.scene.add(this.challengerGroup, this.opponentGroup);
    this.particles = new ParticleSystem(this.scene);
    this.animator  = new BattleAnimator(this.challengerGroup, this.opponentGroup);
  }

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
    const now = performance.now();
    const dt  = (now - this._lastT) * 0.001;
    this._lastT = now;

    const t = now * 0.001;

    /* Idle animations */
    if (this.animator) this.animator.playIdle(dt);
    if (this.particles) this.particles.tick();

    /* Void rings rotation */
    [this.challengerGroup, this.opponentGroup].forEach(g => {
      if (!g) return;
      for (let i = 0; i < 3; i++) {
        const r = g.getObjectByName(`voidRing_${i}`);
        if (r) r.rotation.y += dt * (0.4 + i * 0.3);
      }
      /* Inner light pulse */
      const light = g.getObjectByName('innerLight');
      if (light) light.intensity = 1.4 + Math.sin(t * 2.5) * 0.4;
    });

    this.composer
      ? this.composer.render()
      : this.renderer.render(this.scene, this.camera);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._setupComposer(w, h);
  }

  dispose() {
    this.stop();
    this.particles?.dispose?.();
    this.composer?.dispose();
    this.renderer.dispose();
  }
}
