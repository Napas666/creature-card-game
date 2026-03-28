import * as THREE from 'three';

const BURST_CONFIGS = {
  ember:  { color: 0xff4400, size: 0.14, count: 50, speed: 0.13, gravity: 0.006 },
  frost:  { color: 0x88eeff, size: 0.12, count: 45, speed: 0.09, gravity: 0.001 },
  spark:  { color: 0xffee00, size: 0.10, count: 60, speed: 0.18, gravity: 0.004 },
  bubble: { color: 0x44ff88, size: 0.13, count: 40, speed: 0.08, gravity: -0.003 },
  rift:   { color: 0xcc00ff, size: 0.16, count: 55, speed: 0.12, gravity: 0.002 },
};

export class ParticleSystem {
  constructor(scene) {
    this.scene     = scene;
    this._bursts   = [];
  }

  burst(position, type = 'spark') {
    const cfg   = BURST_CONFIGS[type] ?? BURST_CONFIGS.spark;
    const count = cfg.count;
    const pos   = new Float32Array(count * 3);
    const vel   = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = position.x;
      pos[i * 3 + 1] = position.y + 0.5;
      pos[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.random() * Math.PI;
      const sp    = cfg.speed * (0.5 + Math.random());
      vel.push({
        x: sp * Math.sin(phi) * Math.cos(theta),
        y: sp * Math.sin(phi) * Math.sin(theta) + cfg.speed * 0.5,
        z: sp * Math.cos(phi),
      });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color:       cfg.color,
      size:        cfg.size,
      transparent: true,
      opacity:     1.0,
      sizeAttenuation: true,
      blending:    THREE.AdditiveBlending,
      depthWrite:  false,
    });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this._bursts.push({ pts, vel, life: 1.0, posAttr: geo.attributes.position, gravity: cfg.gravity });
  }

  /* Add a continuous ambient glow emitter at a position */
  ambientEmitter(position, type = 'spark') {
    this._ambientPos  = position;
    this._ambientType = type;
    this._ambientTimer = 0;
  }

  tick() {
    for (let i = this._bursts.length - 1; i >= 0; i--) {
      const b = this._bursts[i];
      b.life -= 0.022;
      b.pts.material.opacity = Math.max(0, b.life * b.life);

      const pa = b.posAttr.array;
      for (let j = 0; j < b.vel.length; j++) {
        pa[j * 3]     += b.vel[j].x;
        pa[j * 3 + 1] += b.vel[j].y;
        pa[j * 3 + 2] += b.vel[j].z;
        b.vel[j].y    -= b.gravity;
        b.vel[j].x    *= 0.98;
        b.vel[j].z    *= 0.98;
      }
      b.posAttr.needsUpdate = true;

      if (b.life <= 0) {
        this.scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        this._bursts.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const b of this._bursts) {
      this.scene.remove(b.pts);
      b.pts.geometry.dispose();
      b.pts.material.dispose();
    }
    this._bursts = [];
  }
}
