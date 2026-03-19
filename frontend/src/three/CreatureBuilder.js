import * as THREE from 'three';
import { statsToTraits } from '../utils/statsToTraits.js';

export class CreatureBuilder {
  constructor(cardStats) {
    this.traits = statsToTraits(cardStats);
    this.group  = new THREE.Group();
    this._bodySize = { rx: 1, ry: 1, rz: 1 };
    this._build();
  }

  _build() {
    const { atk, hp, spd, theme } = this.traits;
    this._addBody(hp, theme);
    this._addHead(hp, atk, theme);
    this._addClaws(atk, theme);
    this._addWings(spd, theme);
    this._addAbilityAppendage(theme);
  }

  _addBody(hp, theme) {
    const rx = 0.6 + hp * 0.6;  // 0.6–1.2
    const ry = 0.5 + hp * 0.4;  // 0.5–0.9
    const rz = 0.5 + hp * 0.5;  // 0.5–1.0
    this._bodySize = { rx, ry, rz };

    const geo = new THREE.SphereGeometry(1, 20, 20);
    geo.scale(rx, ry, rz);

    const mat = new THREE.MeshPhongMaterial({
      color:              theme.primary,
      emissive:           theme.emissive,
      emissiveIntensity:  0.15,
      shininess:          40,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'body';
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  _addHead(hp, atk, theme) {
    const { rx, ry, rz } = this._bodySize;
    const headRadius = 0.3 + hp * 0.15;
    const headY      = ry + headRadius * 0.8;

    const headMat = new THREE.MeshPhongMaterial({ color: theme.primary, shininess: 60 });
    const head    = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 14, 14), headMat);
    head.position.set(0, headY, rz * 0.3);
    head.name = 'head';
    head.castShadow = true;
    this.group.add(head);

    // Eyes
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: theme.emissive, emissiveIntensity: 0.8 });
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(headRadius * 0.18, 8, 8), eyeMat);
      eye.position.set(side * headRadius * 0.45, headY + headRadius * 0.1, rz * 0.3 + headRadius * 0.8);
      this.group.add(eye);
    }

    // Snout elongates with attack
    const snoutLen = 0.15 + atk * 0.35;
    const snoutGeo = new THREE.ConeGeometry(headRadius * 0.4, snoutLen, 8);
    const snout    = new THREE.Mesh(snoutGeo, headMat);
    snout.rotation.x = -Math.PI / 2;
    snout.position.set(0, headY, rz * 0.3 + headRadius + snoutLen / 2);
    this.group.add(snout);
  }

  _addClaws(atk, theme) {
    const { rx, ry, rz } = this._bodySize;
    const count      = atk > 0.66 ? 3 : atk > 0.33 ? 2 : 1;
    const clawLength = 0.1 + atk * 0.45;
    const clawRadius = 0.04 + atk * 0.04;
    const mat = new THREE.MeshPhongMaterial({ color: theme.secondary, shininess: 80 });

    for (const side of [-1, 1]) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 0.6 - 0.3;
        const geo   = new THREE.ConeGeometry(clawRadius, clawLength, 6);
        const claw  = new THREE.Mesh(geo, mat);
        claw.position.set(
          side * (rx + clawLength * 0.5),
          -ry * 0.2 + i * 0.12,
          Math.sin(angle) * rz * 0.3
        );
        claw.rotation.z = side * (Math.PI / 2 + angle * 0.5);
        claw.castShadow = true;
        this.group.add(claw);
      }
    }
  }

  _addWings(spd, theme) {
    if (spd < 0.05) return;

    const { rx, ry } = this._bodySize;
    const span   = 0.2 + spd * 1.4;
    const height = 0.15 + spd * 0.6;
    const mat    = new THREE.MeshPhongMaterial({
      color:       theme.secondary,
      transparent: true,
      opacity:     0.75,
      side:        THREE.DoubleSide,
    });

    for (const side of [-1, 1]) {
      const verts = new Float32Array([
        0,           0,             0,
        side * span, height * 0.3, -span * 0.5,
        side * span, -height,       0,
      ]);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.computeVertexNormals();
      const wing = new THREE.Mesh(geo, mat.clone());
      wing.position.set(side * rx * 0.8, ry * 0.3, 0);
      wing.name = `wing_${side}`;
      this.group.add(wing);
    }
  }

  _addAbilityAppendage({ name, secondary, emissive }) {
    const { rx, ry, rz } = this._bodySize;
    const mat = new THREE.MeshPhongMaterial({
      color:             secondary,
      emissive:          emissive,
      emissiveIntensity: 0.5,
      shininess:         100,
    });

    switch (name) {
      case 'FIRE': {
        // Ridge of 5 diminishing spine cones along the back
        for (let i = 0; i < 5; i++) {
          const h    = 0.45 - i * 0.07;
          const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.07, h, 5), mat.clone());
          mesh.position.set(0, ry + h / 2, -rz * 0.2 + i * rz * 0.2);
          this.group.add(mesh);
        }
        break;
      }
      case 'ICE': {
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), mat.clone());
          shard.position.set(Math.cos(angle) * rx * 0.5, ry * 0.7, Math.sin(angle) * rz * 0.5);
          shard.rotation.set(Math.random() * 0.5, Math.random() * 0.5, Math.random() * 0.5);
          this.group.add(shard);
        }
        break;
      }
      case 'LIGHTNING': {
        const horn = new THREE.Mesh(new THREE.TorusKnotGeometry(0.18, 0.045, 48, 5, 2, 3), mat.clone());
        horn.position.set(0, ry + 0.65, rz * 0.3);
        this.group.add(horn);
        break;
      }
      case 'POISON': {
        const tailMat = mat.clone();
        const tail    = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, rz, 8), tailMat);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(0, -ry * 0.3, -(rz + rz / 2));
        this.group.add(tail);

        const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 6), tailMat);
        stinger.rotation.x = -Math.PI / 2;
        stinger.position.set(0, -ry * 0.3, -(rz * 2 + 0.12));
        this.group.add(stinger);
        break;
      }
      case 'VOID': {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(rx * 0.95, 0.07, 8, 36), mat.clone());
        ring.rotation.x = Math.PI / 3;
        ring.name = 'voidRing';
        this.group.add(ring);
        break;
      }
    }
  }

  getGroup() { return this.group; }
}
