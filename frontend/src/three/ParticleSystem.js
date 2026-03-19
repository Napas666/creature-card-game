import * as THREE from 'three';

const PARTICLE_COLORS = {
  ember:  0xff4400,
  frost:  0x88eeff,
  spark:  0xffff44,
  bubble: 0x44ff88,
  rift:   0xcc00ff,
};

export class ParticleSystem {
  constructor(scene) {
    this.scene     = scene;
    this.particles = [];
  }

  burst(position, type, count = 45) {
    const color = PARTICLE_COLORS[type] ?? 0xffffff;

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const vel = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3]     = position.x;
      pos[i * 3 + 1] = position.y;
      pos[i * 3 + 2] = position.z;
      vel.push(new THREE.Vector3(
        (Math.random() - 0.5) * 0.18,
        Math.random() * 0.15 + 0.04,
        (Math.random() - 0.5) * 0.18,
      ));
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat    = new THREE.PointsMaterial({ color, size: 0.14, transparent: true, depthWrite: false });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particles.push({ points, vel, life: 1.0, posAttr: geo.attributes.position });
  }

  tick() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= 0.022;
      p.points.material.opacity = Math.max(0, p.life);

      const pa = p.posAttr;
      for (let j = 0; j < p.vel.length; j++) {
        pa.array[j * 3]     += p.vel[j].x;
        pa.array[j * 3 + 1] += p.vel[j].y - 0.004; // gravity
        pa.array[j * 3 + 2] += p.vel[j].z;
        p.vel[j].x *= 0.97;
        p.vel[j].z *= 0.97;
      }
      pa.needsUpdate = true;

      if (p.life <= 0) {
        this.scene.remove(p.points);
        p.points.geometry.dispose();
        p.points.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  dispose() {
    for (const p of this.particles) {
      this.scene.remove(p.points);
      p.points.geometry.dispose();
      p.points.material.dispose();
    }
    this.particles = [];
  }
}
