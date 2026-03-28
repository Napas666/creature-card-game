import * as THREE from 'three';
import { statsToTraits } from '../utils/statsToTraits.js';

/* ─── Material presets per ability type ─────────────────────────────────── */
const MATS = {
  FIRE:      { roughness: 0.55, metalness: 0.15, envMapIntensity: 0.8 },
  ICE:       { roughness: 0.10, metalness: 0.05, envMapIntensity: 1.5 },
  LIGHTNING: { roughness: 0.30, metalness: 0.80, envMapIntensity: 1.2 },
  POISON:    { roughness: 0.80, metalness: 0.00, envMapIntensity: 0.4 },
  VOID:      { roughness: 0.20, metalness: 0.60, envMapIntensity: 1.0 },
};

export class CreatureBuilder {
  constructor(cardStats) {
    this.traits   = statsToTraits(cardStats);
    this.group    = new THREE.Group();
    this._bs      = { rx: 1, ry: 1, rz: 1 }; // body size cache
    this._build();
  }

  /* shared material factory */
  _mat(colorHex, options = {}) {
    const { atk, hp, spd, theme } = this.traits;
    const preset = MATS[theme.name] ?? MATS.FIRE;
    return new THREE.MeshStandardMaterial({
      color:             colorHex,
      emissive:          theme.emissive,
      emissiveIntensity: options.emissiveIntensity ?? 0.12,
      roughness:         options.roughness ?? preset.roughness,
      metalness:         options.metalness ?? preset.metalness,
      transparent:       options.transparent ?? false,
      opacity:           options.opacity    ?? 1.0,
      side:              options.side       ?? THREE.FrontSide,
    });
  }

  _build() {
    const { atk, hp, spd, theme } = this.traits;
    this._addBody(hp, theme);
    this._addNeck(hp, theme);
    this._addHead(hp, atk, theme);
    this._addLegs(hp, spd, theme);
    this._addArms(atk, theme);
    this._addTail(atk, hp, theme);
    if (spd > 0.08) this._addWings(spd, theme);
    this._addAbilityAppendage(theme);
    this._addInnerLight(theme);
  }

  /* ─── Organic body via LatheGeometry ───────────────────────────────────── */
  _addBody(hp, theme) {
    const rx = 0.55 + hp * 0.55;
    const ry = 0.50 + hp * 0.40;
    const rz = 0.50 + hp * 0.50;
    this._bs = { rx, ry, rz };

    // Profile curve for lathe — dragon-belly silhouette
    const pts = [
      new THREE.Vector2(0,            ry),
      new THREE.Vector2(rx * 0.55,    ry * 0.6),
      new THREE.Vector2(rx,           0),
      new THREE.Vector2(rx * 0.75,   -ry * 0.5),
      new THREE.Vector2(rx * 0.35,   -ry * 0.9),
      new THREE.Vector2(0,           -ry),
    ];
    const geo  = new THREE.LatheGeometry(pts, 24, 0, Math.PI * 2);
    const mesh = new THREE.Mesh(geo, this._mat(theme.primary));
    mesh.scale.set(1, 1, rz / rx);          // squeeze into ellipsoid
    mesh.rotation.x = -Math.PI / 2;        // stand upright
    mesh.castShadow    = true;
    mesh.receiveShadow = true;
    mesh.name = 'body';
    this.group.add(mesh);
    this._bodyMesh = mesh;
  }

  /* ─── Neck ─────────────────────────────────────────────────────────────── */
  _addNeck(hp, theme) {
    const { rx, ry } = this._bs;
    const h = 0.3 + hp * 0.2;
    const geo  = new THREE.CapsuleGeometry(rx * 0.28, h, 6, 10);
    const mesh = new THREE.Mesh(geo, this._mat(theme.primary));
    mesh.position.set(0, ry + h * 0.4, this._bs.rz * 0.25);
    mesh.rotation.x = -0.3;
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  /* ─── Head ─────────────────────────────────────────────────────────────── */
  _addHead(hp, atk, theme) {
    const { rx, ry, rz } = this._bs;
    const hr = 0.28 + hp * 0.14;          // head radius
    const hy = ry + 0.3 + hp * 0.2 + hr; // head Y pos
    const hz = rz * 0.25;

    // Cranium
    const cGeo  = new THREE.SphereGeometry(hr, 16, 14);
    const head  = new THREE.Mesh(cGeo, this._mat(theme.primary));
    head.position.set(0, hy, hz);
    head.castShadow = true;
    head.name = 'head';
    this.group.add(head);

    // Jaw — attack stat stretches it
    const jawLen = 0.18 + atk * 0.38;
    const jawGeo = new THREE.CylinderGeometry(hr * 0.22, hr * 0.35, jawLen, 8);
    const jaw    = new THREE.Mesh(jawGeo, this._mat(theme.primary));
    jaw.rotation.x = Math.PI / 2;
    jaw.position.set(0, hy - hr * 0.25, hz + hr + jawLen / 2);
    jaw.castShadow = true;
    this.group.add(jaw);

    // Eyes — glowing orbs
    const eyeMat = this._mat(0xffffff, { emissiveIntensity: 1.2, roughness: 0.0, metalness: 0.0 });
    eyeMat.emissive = new THREE.Color(theme.emissive);
    const pupilMat = this._mat(theme.secondary, { emissiveIntensity: 2.0 });
    for (const side of [-1, 1]) {
      const eyeR  = hr * 0.20;
      const eye   = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 10), eyeMat.clone());
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 8, 8), pupilMat.clone());
      eye.position.set(side * hr * 0.5, hy + hr * 0.15, hz + hr * 0.75);
      pupil.position.copy(eye.position);
      pupil.position.z += eyeR * 0.5;
      this.group.add(eye, pupil);
    }

    // Brow ridges
    const browMat = this._mat(theme.secondary, { emissiveIntensity: 0.0, roughness: 0.9 });
    for (const side of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(hr * 0.10, hr * 0.3, 4, 6), browMat);
      b.position.set(side * hr * 0.35, hy + hr * 0.38, hz + hr * 0.6);
      b.rotation.z = side * 0.4;
      this.group.add(b);
    }
  }

  /* ─── Legs ─────────────────────────────────────────────────────────────── */
  _addLegs(hp, spd, theme) {
    const { rx, ry, rz } = this._bs;
    const legLen   = 0.45 + hp * 0.25;
    const legRad   = 0.08 + hp * 0.06;
    const footRad  = 0.09 + hp * 0.06;
    const legMat   = this._mat(theme.secondary, { roughness: 0.75 });
    const footMat  = this._mat(theme.secondary, { roughness: 0.9, metalness: 0.0 });

    const positions = [
      [-rx * 0.65, -ry * 0.65, rz * 0.4],
      [ rx * 0.65, -ry * 0.65, rz * 0.4],
      [-rx * 0.55, -ry * 0.65, -rz * 0.4],
      [ rx * 0.55, -ry * 0.65, -rz * 0.4],
    ];

    for (const [x, y, z] of positions) {
      // Upper leg
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(legRad, legLen * 0.55, 4, 8), legMat.clone());
      upper.position.set(x, y - legLen * 0.25, z);
      upper.rotation.z = x > 0 ? 0.18 : -0.18;
      upper.castShadow = true;
      this.group.add(upper);
      // Lower leg
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(legRad * 0.75, legLen * 0.45, 4, 8), legMat.clone());
      lower.position.set(x * 1.1, y - legLen * 0.65, z);
      lower.rotation.z = x > 0 ? 0.35 : -0.35;
      lower.castShadow = true;
      this.group.add(lower);
      // Foot
      const foot = new THREE.Mesh(new THREE.SphereGeometry(footRad, 8, 6), footMat.clone());
      foot.position.set(x * 1.2, y - legLen, z);
      foot.scale.set(1.2, 0.5, 1.5);
      foot.castShadow = true;
      this.group.add(foot);
    }
  }

  /* ─── Arms / Claws ─────────────────────────────────────────────────────── */
  _addArms(atk, theme) {
    const { rx, ry, rz } = this._bs;
    const armLen   = 0.40 + atk * 0.30;
    const armRad   = 0.065 + atk * 0.025;
    const clawLen  = 0.12 + atk * 0.40;
    const clawCnt  = atk > 0.66 ? 3 : atk > 0.33 ? 2 : 1;
    const armMat   = this._mat(theme.primary,   { roughness: 0.65 });
    const clawMat  = this._mat(theme.secondary, { roughness: 0.2, metalness: 0.6, emissiveIntensity: 0.3 });

    for (const side of [-1, 1]) {
      // Upper arm
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(armRad, armLen, 4, 8), armMat.clone());
      arm.position.set(side * (rx + armLen * 0.3), ry * 0.1, rz * 0.3);
      arm.rotation.z = side * (Math.PI / 2 + 0.2);
      arm.castShadow = true;
      this.group.add(arm);

      // Claws spread from wrist
      for (let i = 0; i < clawCnt; i++) {
        const spread = ((i - (clawCnt - 1) / 2) / clawCnt) * 0.8;
        const claw   = new THREE.Mesh(new THREE.ConeGeometry(armRad * 0.45, clawLen, 5), clawMat.clone());
        claw.position.set(
          side * (rx + armLen * 0.9),
          ry * 0.1 - armLen * 0.3 + i * 0.08,
          rz * 0.3 + spread
        );
        claw.rotation.z = side * (Math.PI / 2 + 0.1);
        claw.rotation.y = spread * 0.6;
        claw.castShadow = true;
        this.group.add(claw);
      }
    }
  }

  /* ─── Tail ─────────────────────────────────────────────────────────────── */
  _addTail(atk, hp, theme) {
    const { rx, ry, rz } = this._bs;
    const tailMat = this._mat(theme.secondary, { roughness: 0.7 });
    const segments = 5;
    let posZ = -rz;
    let curRad = rx * 0.28;
    for (let i = 0; i < segments; i++) {
      const seg = new THREE.Mesh(
        new THREE.CapsuleGeometry(curRad * (1 - i * 0.15), 0.35, 4, 6),
        tailMat.clone()
      );
      seg.position.set(0, -ry * 0.25 + Math.sin(i * 0.9) * 0.15, posZ - 0.2);
      seg.rotation.x = 0.2 + i * 0.1;
      seg.castShadow = true;
      this.group.add(seg);
      posZ -= 0.28;
      curRad *= 0.75;
    }
  }

  /* ─── Wings ─────────────────────────────────────────────────────────────── */
  _addWings(spd, theme) {
    const { rx, ry } = this._bs;
    const span     = 0.6 + spd * 1.8;
    const height   = 0.5 + spd * 0.8;
    const segments = 8;

    const wingMat = this._mat(theme.secondary, {
      transparent: true,
      opacity:     0.55 + spd * 0.15,
      side:        THREE.DoubleSide,
      roughness:   0.3,
      metalness:   0.1,
      emissiveIntensity: 0.35,
    });

    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      // Membrane outline — organic bat-wing curve
      shape.bezierCurveTo(
        span * 0.3, height * 0.5,
        span * 0.7, height,
        span, height * 0.6
      );
      shape.bezierCurveTo(
        span * 0.8, height * 0.1,
        span * 0.5, -height * 0.5,
        0.15, -height * 0.3
      );
      shape.closePath();

      // Add finger-bone ribs
      const ribMat = this._mat(theme.secondary, { roughness: 0.3, metalness: 0.4 });
      const ribCount = 4;
      for (let r = 0; r < ribCount; r++) {
        const t = (r + 1) / (ribCount + 1);
        const ribLen = span * (0.5 + t * 0.5) * (1 - r * 0.15);
        const rib    = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.018, ribLen, 3, 6),
          ribMat.clone()
        );
        rib.position.set(
          side * (rx * 0.8 + ribLen / 2),
          ry * 0.3 + t * height * 0.6,
          0
        );
        rib.rotation.z = side * (Math.PI / 2 - t * 0.4);
        this.group.add(rib);
      }

      const geo  = new THREE.ShapeGeometry(shape, segments);
      const wing = new THREE.Mesh(geo, wingMat.clone());
      wing.position.set(side * rx * 0.8, ry * 0.2, 0);
      wing.rotation.y = side * 0.15;
      wing.name = `wing_${side}`;
      this.group.add(wing);
    }
  }

  /* ─── Ability appendages (redesigned) ──────────────────────────────────── */
  _addAbilityAppendage({ name, secondary, emissive }) {
    const { rx, ry, rz } = this._bs;
    const mat = this._mat(secondary, { emissiveIntensity: 0.8, roughness: 0.2 });

    switch (name) {
      case 'FIRE': {
        // Dorsal spine ridge — 6 tapered spines
        for (let i = 0; i < 6; i++) {
          const h    = 0.55 - i * 0.07;
          const mesh = new THREE.Mesh(
            new THREE.ConeGeometry(0.05 + (5 - i) * 0.01, h, 5),
            mat.clone()
          );
          mesh.position.set(0, ry * 0.8 + h / 2, -rz * 0.1 + i * rz * 0.22);
          mesh.rotation.x = i * 0.07;
          this.group.add(mesh);
        }
        break;
      }
      case 'ICE': {
        // Crystal cluster crown
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const size  = 0.14 + (i % 3) * 0.08;
          const shard = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), mat.clone());
          shard.position.set(
            Math.cos(angle) * rx * 0.6, ry * 0.75 + size,
            Math.sin(angle) * rz * 0.5
          );
          shard.rotation.set(Math.random() * 0.4, Math.random() * Math.PI, Math.random() * 0.4);
          this.group.add(shard);
        }
        break;
      }
      case 'LIGHTNING': {
        // Pair of helical horns
        for (const side of [-1, 1]) {
          const horn = new THREE.Mesh(
            new THREE.TorusKnotGeometry(0.12, 0.035, 40, 4, 2, 3),
            mat.clone()
          );
          horn.position.set(side * rx * 0.3, ry + 0.65, rz * 0.2);
          horn.scale.set(1, 1.4, 1);
          this.group.add(horn);
        }
        break;
      }
      case 'POISON': {
        // Scorpion-style tail stinger (extra segment + bulb)
        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 10, 10),
          mat.clone()
        );
        bulb.position.set(0, -this._bs.ry * 0.2, -(rz * 2.2));
        this.group.add(bulb);

        const sting = new THREE.Mesh(
          new THREE.ConeGeometry(0.07, 0.35, 6),
          mat.clone()
        );
        sting.rotation.x = -Math.PI / 2;
        sting.position.set(0, -this._bs.ry * 0.2, -(rz * 2.55));
        this.group.add(sting);
        break;
      }
      case 'VOID': {
        // Three nested orbiting rings
        const rings = [
          { r: rx * 1.0, tube: 0.06, rotX: Math.PI / 3, rotZ: 0 },
          { r: rx * 0.75, tube: 0.05, rotX: Math.PI / 5, rotZ: Math.PI / 4 },
          { r: rx * 0.55, tube: 0.04, rotX: Math.PI * 0.7, rotZ: Math.PI / 6 },
        ];
        rings.forEach((cfg, idx) => {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(cfg.r, cfg.tube, 8, 40),
            mat.clone()
          );
          ring.rotation.x = cfg.rotX;
          ring.rotation.z = cfg.rotZ;
          ring.name = `voidRing_${idx}`;
          this.group.add(ring);
        });
        break;
      }
    }
  }

  /* ─── Inner point light ─────────────────────────────────────────────────── */
  _addInnerLight(theme) {
    const light = new THREE.PointLight(theme.emissive, 1.8, 4.5);
    light.position.set(0, 0, 0);
    light.name = 'innerLight';
    this.group.add(light);
  }

  getGroup() { return this.group; }
}
