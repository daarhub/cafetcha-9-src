// =====================================================================
//  BURGER 3D SCENE - realistic sesame-seed burger buns + stacked
//  fillings. 100% code-built, no GLB files.
//  Reads the guest's choices from the CUSTOMIZE_BURGER config.
// =====================================================================
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { getOption } from "./customizeBurgerData";

// ---- Measurements (world units) -------------------------------------
// The buns are built from HALF-SPHERES (like real burger buns) instead
// of square bread slabs - so the burger reads as a burger, not a loaf.
const BUN_R = 0.8; // bun radius (both halves share the same footprint)
const BUN_BOTTOM_K = 0.55; // bottom bun vertical squash (wide + low)
const BUN_TOP_K = 0.85; // crown dome vertical stretch (tall rounded top)
const SCENE_SCALE = 0.62;

// Deterministic random
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seedOf = (text) =>
  text.split("").reduce((s, c) => s + c.charCodeAt(0), 0);

// ---- Bottom bun: rounded half-sphere bun -----------------------------
// A wide, low half-sphere (the lower half of a squashed ball) - the cut
// crumb face is on top where the fillings sit.
function BottomBun({ y }) {
  return (
    <group position={[0, y, 0]}>
      <mesh scale={[1, BUN_BOTTOM_K, 1]} castShadow receiveShadow>
        <sphereGeometry
          args={[BUN_R, 32, 18, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]}
        />
        <meshStandardMaterial color="#d9973f" roughness={0.75} />
      </mesh>
      {/* pale cut crumb face on top */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BUN_R * 1.02, 32]} />
        <meshStandardMaterial color="#f8efdd" roughness={0.92} />
      </mesh>
    </group>
  );
}

// ---- Top bun: rounded crown dome with sesame seeds -------------------
function SesameSeeds() {
  const seeds = useMemo(() => {
    const rand = mulberry32(42);
    return Array.from({ length: 18 }, () => {
      const theta = 0.12 + rand() * 1.05; // seeds stay on the upper cap
      const phi = rand() * Math.PI * 2;
      const r = BUN_R * 0.985;
      return {
        pos: [
          Math.sin(theta) * Math.cos(phi) * r,
          Math.cos(theta) * r * BUN_TOP_K + 0.005,
          Math.sin(theta) * Math.sin(phi) * r,
        ],
        rotY: rand() * Math.PI,
        key: rand(),
      };
    });
  }, []);
  return (
    <group>
      {seeds.map((s, i) => (
        <mesh
          key={i}
          position={s.pos}
          rotation={[0, s.rotY, 0]}
          scale={[0.032, 0.014, 0.024]}
          castShadow
        >
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color="#fff3d6" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function TopBun({ y }) {
  return (
    <group position={[0, y, 0]}>
      {/* golden crown dome - upper half-sphere */}
      <mesh scale={[1, BUN_TOP_K, 1]} castShadow receiveShadow>
        <sphereGeometry
          args={[BUN_R, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2]}
        />
        <meshStandardMaterial color="#e09c3e" roughness={0.7} />
      </mesh>
      {/* pale cut crumb face on the underside */}
      <mesh position={[0, -0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BUN_R * 0.98, 32]} />
        <meshStandardMaterial color="#f8efdd" roughness={0.92} />
      </mesh>
      <SesameSeeds />
    </group>
  );
}

// ---- Fillings --------------------------------------------------------
// Every filling renderer starts flush at its layer base (y = 0 local) so
// stacked fillings press into each other - nothing floats.
function FillingLayer({ option, y }) {
  const type = option.scene?.type;
  const color = option.scene?.color || "#c98d4b";

  if (type === "crispy-chicken") {
    // Golden breaded fillet - blob cluster with crunchy crumbs.
    const rand = mulberry32(seedOf("burger-crispy-chicken"));
    const tones = ["#d9912f", "#cf8324", "#e0a04a", "#c67a1e"];
    const blobs = [
      { x: 0, y: 0.05, z: 0, s: [0.85, 0.15, 0.66], t: 0 },
      { x: 0.42, y: 0.025, z: -0.16, s: [0.45, 0.12, 0.42], t: 1 },
      { x: -0.45, y: 0.02, z: 0.12, s: [0.4, 0.115, 0.4], t: 2 },
      { x: 0.11, y: -0.015, z: 0.42, s: [0.5, 0.115, 0.42], t: 3 },
      { x: -0.06, y: 0.03, z: -0.38, s: [0.48, 0.12, 0.42], t: 1 },
    ];
    const crumbs = Array.from({ length: 16 }, (_, i) => ({
      x: (rand() * 2 - 1) * 0.55,
      z: (rand() * 2 - 1) * 0.48,
      y: 0.06 + rand() * 0.05,
      s: 0.03 + rand() * 0.02,
      key: i,
    }));
    return (
      <group position={[0, y, 0]}>
        {blobs.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]} scale={b.s} castShadow>
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial
              color={tones[b.t % tones.length]}
              roughness={0.88}
            />
          </mesh>
        ))}
        {crumbs.map((c) => (
          <mesh key={c.key} position={[c.x, c.y, c.z]} scale={c.s}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#ecb45f" roughness={0.95} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "crispy-chicken-extra") {
    // EXTRA crispy: darker fry, craggier crumbs piled on top.
    const rand = mulberry32(seedOf("burger-extra-crispy"));
    const tones = ["#c67a1e", "#b56a15", "#d98a2b", "#a85f12"];
    const blobs = [
      { x: 0, y: 0.06, z: 0, s: [0.88, 0.16, 0.7], t: 0 },
      { x: 0.4, y: 0.03, z: -0.18, s: [0.46, 0.13, 0.44], t: 1 },
      { x: -0.44, y: 0.02, z: 0.14, s: [0.42, 0.12, 0.42], t: 2 },
      { x: 0.1, y: -0.01, z: 0.42, s: [0.5, 0.12, 0.44], t: 3 },
      { x: -0.08, y: 0.04, z: -0.4, s: [0.48, 0.13, 0.44], t: 0 },
    ];
    const crumbs = Array.from({ length: 26 }, (_, i) => ({
      x: (rand() * 2 - 1) * 0.58,
      z: (rand() * 2 - 1) * 0.5,
      y: 0.08 + rand() * 0.06,
      s: 0.028 + rand() * 0.024,
      key: i,
    }));
    return (
      <group position={[0, y, 0]}>
        {blobs.map((b, i) => (
          <mesh key={i} position={[b.x, b.y, b.z]} scale={b.s} castShadow>
            <sphereGeometry args={[1, 18, 14]} />
            <meshStandardMaterial
              color={tones[b.t % tones.length]}
              roughness={0.9}
            />
          </mesh>
        ))}
        {crumbs.map((c) => (
          <mesh key={c.key} position={[c.x, c.y, c.z]} scale={c.s}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#d9903c" roughness={0.95} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "beef-patty" || type === "beef-patty-double") {
    // Grilled beef patty: a SINGLE rounded-disc shape (scaled oblate
    // sphere) so every edge has a smooth radius, with crosshatch grill
    // lines that stay inside the disc. No dome circle, no sharp rims.
    const patties =
      type === "beef-patty-double"
        ? [
            { py: 0, rot: 0 },
            { py: 0.135, rot: 0.12 },
          ]
        : [{ py: 0, rot: 0 }];
    const pattyR = 0.8; // widest radius of the disc (matches mesh scale)
    const domeHalf = 0.12; // vertical half-thickness (crest = domeHalf * 2)
    return (
      <group position={[0, y, 0]}>
        {patties.map((p, i) => (
          <group key={i} position={[0, p.py, 0]} rotation={[0, p.rot, 0]}>
            {/* patty body - one rounded disc (oblate spheroid) */}
            <mesh
              position={[0, domeHalf, 0]}
              scale={[0.8, domeHalf, 0.8]}
              castShadow
            >
              <sphereGeometry args={[1, 32, 18]} />
              <meshStandardMaterial color={color} roughness={0.82} />
            </mesh>
            {/* grill lines - 3 PARALLEL charred stripes, EVENLY DIVIDED
               across the patty (equal perpendicular spacing). Each stripe
               is a ribbon whose vertices lie ON the ellipsoid surface, so
               the marks hug the curved meat exactly like a real grill -
               never floating above it as a separate layer. */}
            {[-0.5, 0, 0.5].map((off) => (
              <GrillLine
                key={`grill-${off}`}
                iso={off / Math.SQRT2}
                pattyR={pattyR}
                domeHalf={domeHalf}
              />
            ))}
          </group>
        ))}
      </group>
    );
  }

  if (type === "bacon") {
    // Bacon: ONE continuous smooth ribbon per strip (not cut-by-cut
    // segments) that runs straight across but keeps its wavy curl.
    const straps = [
      { z: -0.5, amp: 0.04, phase: 0, lift: 0 },
      { z: 0.0, amp: 0.06, phase: 1.7, lift: 0.01 },
      { z: 0.5, amp: 0.05, phase: 3.4, lift: 0 },
    ];
    return (
      <group position={[0, y, 0]}>
        {straps.map((strap, si) => (
          <BaconStrap key={si} {...strap} />
        ))}
      </group>
    );
  }

  // Egg: wide flat irregular oval (never square). The white is raised so
  // its crest reaches the egg's stack height (~0.20) - the bun/filling
  // above rests ON the white instead of hovering over an air gap. The
  // yolk stays nestled in the white, pressing just a hair into the layer
  // above for a natural look.
  const lobes = [
    { x: -0.32, y: 0.07, z: 0.02, s: [0.5, 0.09, 0.42], rz: 0.22 },
    { x: 0.3, y: 0.075, z: 0.08, s: [0.46, 0.09, 0.4], rz: -0.18 },
    { x: -0.06, y: 0.065, z: -0.28, s: [0.46, 0.09, 0.42], rz: 0.12 },
    { x: 0.08, y: 0.07, z: 0.24, s: [0.44, 0.085, 0.4], rz: -0.1 },
    { x: 0.0, y: 0.075, z: 0.0, s: [0.62, 0.12, 0.56], rz: 0.02 },
  ];
  return (
    <group position={[0, y, 0]}>
      {lobes.map((w, i) => (
        <mesh
          key={i}
          position={[w.x, w.y, w.z]}
          scale={w.s}
          rotation={[0, 0, w.rz]}
          castShadow
        >
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color="#f9f3e6" roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0.02, 0.135, 0.02]} scale={[1, 0.3, 1]} castShadow>
        <sphereGeometry args={[0.3, 22, 18]} />
        <meshStandardMaterial color="#f6a623" roughness={0.28} />
      </mesh>
    </group>
  );
}

// ---- Grill line: charred stripe ON the patty surface ------------------
// A thin ribbon (single BufferGeometry) whose vertices are computed from
// the patty's ellipsoid equation, so the stripe follows the curved meat
// surface exactly - hugging it with only a hair of lift. It can never
// float above the patty or poke into the layer above (max height = the
// patty's own crest), so no gap appears against buns or other patties.
function GrillLine({ iso, pattyR, domeHalf }) {
  const geometry = useMemo(() => {
    const segs = 24;
    const w = 0.05; // stripe width across the surface
    const dx = Math.SQRT1_2; // 45° run direction (x, z)
    const dz = Math.SQRT1_2;
    const px = -Math.SQRT1_2; // perpendicular direction in the surface plane
    const pz = Math.SQRT1_2;
    // half-length so both ends stay inside the disc (r <= pattyR)
    const half = Math.sqrt(Math.max(0.01, pattyR * pattyR - iso * iso)) - 0.03;
    const positions = new Float32Array((segs + 1) * 2 * 3);
    const index = [];
    for (let i = 0; i <= segs; i += 1) {
      const t = (i / segs - 0.5) * 2 * half;
      for (let s = 0; s < 2; s += 1) {
        const side = s === 0 ? 1 : -1;
        const sx = iso * px + t * dx + side * (w / 2) * px;
        const sz = iso * pz + t * dz + side * (w / 2) * pz;
        // ellipsoid top-surface height at (sx, sz), plus a hair of lift
        const rr = Math.min(1, (sx * sx + sz * sz) / (pattyR * pattyR));
        const sy = domeHalf + domeHalf * Math.sqrt(1 - rr) + 0.003;
        const o = (i * 2 + s) * 3;
        positions[o] = sx;
        positions[o + 1] = sy;
        positions[o + 2] = sz;
      }
    }
    for (let i = 0; i < segs; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  }, [iso, pattyR, domeHalf]);
  return (
    <mesh geometry={geometry} castShadow>
      <meshStandardMaterial
        color="#2b1608"
        roughness={0.95}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---- Bacon strap: smooth continuous wavy ribbon ----------------------
// One unbroken strip (single BufferGeometry ribbon) following a sine
// wave - straight across the burger, curly along its length, with two
// lighter fat streaks running along the same curve.
function BaconStrap({ z, amp, phase, lift }) {
  const geometry = useMemo(() => {
    const segs = 64;
    const len = 1.8;
    const halfW = 0.15; // reduced bacon width (strip ~0.18 wide)
    const positions = new Float32Array((segs + 1) * 2 * 3);
    const index = [];
    for (let i = 0; i <= segs; i += 1) {
      const x = (i / segs - 0.5) * len;
      const y =
        lift +
        0.005 +
        Math.abs(Math.sin(x * 2.5 + phase)) * amp +
        Math.sin(x * 1.4 + phase * 0.8) * 0.01;
      const o = i * 6;
      positions[o] = x;
      positions[o + 1] = y;
      positions[o + 2] = -halfW;
      positions[o + 3] = x;
      positions[o + 4] = y;
      positions[o + 5] = halfW;
    }
    for (let i = 0; i < segs; i += 1) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  }, [amp, phase, lift]);

  return (
    <group position={[0, 0, z]}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial
          color="#a3542f"
          roughness={0.62}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* continuous lighter fat streaks along the same curve */}
      <mesh
        geometry={geometry}
        position={[0, 0.002, -0.055]}
        scale={[1, 1, 0.3]}
      >
        <meshStandardMaterial
          color="#d9916e"
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        geometry={geometry}
        position={[0, 0.002, 0.065]}
        scale={[1, 1, 0.22]}
      >
        <meshStandardMaterial
          color="#e5a886"
          roughness={0.7}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// ---- Vegetables ------------------------------------------------------
// Same proven one-row renderer as the sandwich customizer: each
// vegetable scatters INSIDE its layer, and BuildStack keeps every chosen
// vegetable together in that single row on top of the lettuce.
function VegLayer({ option, y }) {
  const type = option.scene?.type;
  const color = option.scene?.color || "#7cb342";

  if (type === "lettuce") {
    const leaves = [
      { rot: 0.4, ox: -0.12, oz: 0.05 },
      { rot: 2.7, ox: 0.14, oz: -0.07 },
    ];
    return (
      <group position={[0, y, 0]}>
        {leaves.map((lf, li) => {
          const rand = mulberry32(seedOf("flatleaf-" + li));
          const lobes = Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
            return {
              a,
              r: 0.42 + rand() * 0.15,
              w: 0.3 + rand() * 0.14,
              len: 0.7 + rand() * 0.3,
              lift: (k % 2) * 0.01 + rand() * 0.008,
              key: k,
            };
          });
          return (
            <group
              key={li}
              rotation={[0, lf.rot, 0]}
              position={[lf.ox, 0, lf.oz]}
            >
              <mesh position={[0, 0.02, 0]} scale={[1, 0.06, 0.92]} castShadow>
                <sphereGeometry args={[0.92, 20, 12]} />
                <meshStandardMaterial color="#79b63c" roughness={0.62} />
              </mesh>
              {lobes.map((lb) => (
                <mesh
                  key={lb.key}
                  position={[
                    Math.cos(lb.a) * lb.r,
                    0.01 + lb.lift,
                    Math.sin(lb.a) * lb.r,
                  ]}
                  scale={[lb.len * 0.5, 0.016 + lb.lift, lb.w * 0.5]}
                  rotation={[0.03, -lb.a, 0.03]}
                  castShadow
                >
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshStandardMaterial
                    color={lb.key % 3 === 0 ? "#8bc34a" : "#79b63c"}
                    roughness={0.62}
                  />
                </mesh>
              ))}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.05, 0.006, 0.95]} />
                <meshStandardMaterial
                  color="#5d8f2c"
                  roughness={0.5}
                  transparent
                  opacity={0.5}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (type === "tomato") {
    return (
      <group position={[0, y, 0]}>
        {[
          [-0.55, -0.3],
          [0.5, -0.28],
          [0, 0.45],
        ].map(([x, z], i) => {
          const yaw = (i * 0.7 + 0.35) % Math.PI; // unique angle per slice
          return (
            <group key={i} position={[x, 0.03, z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.42, 0.42, 0.06, 28]} />
                <meshStandardMaterial color={color} roughness={0.5} />
              </mesh>
              {/* flesh cap raised clearly above the body - planes never
                  coincide so there is no z-fighting / flashing */}
              <mesh position={[0, 0.048, 0]}>
                <cylinderGeometry args={[0.28, 0.28, 0.018, 28]} />
                <meshStandardMaterial color="#ef8a7e" roughness={0.55} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (type === "onion") {
    return (
      <group position={[0, y, 0]}>
        {[
          [-0.5, -0.25],
          [0.45, -0.35],
          [0.1, 0.35],
          [-0.35, 0.3],
          [0.55, 0.25],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            position={[x, 0.03, z]}
            rotation={[Math.PI / 2, 0, i * 0.7]}
            castShadow
          >
            <torusGeometry args={[0.2, 0.028, 10, 24]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "cucumber") {
    return (
      <group position={[0, y, 0]}>
        {[
          [-0.5, -0.3],
          [0.45, -0.32],
          [-0.1, 0.4],
          [0.5, 0.3],
        ].map(([x, z], i) => {
          const yaw = (i * 0.9 + 0.2) % Math.PI;
          return (
            <group key={i} position={[x, 0.0275, z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 0.055, 22]} />
                <meshStandardMaterial color={color} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.048, 0]}>
                <cylinderGeometry args={[0.2, 0.2, 0.018, 22]} />
                <meshStandardMaterial color="#cfe6a8" roughness={0.65} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (type === "pickles") {
    return (
      <group position={[0, y, 0]}>
        {[
          [-0.55, -0.25],
          [-0.15, 0.35],
          [0.25, -0.35],
          [0.55, 0.15],
          [-0.4, 0.05],
        ].map(([x, z], i) => {
          const yaw = (i * 0.85 + 0.55) % Math.PI;
          return (
            <group key={i} position={[x, 0.03, z]} rotation={[0, yaw, 0]}>
              <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.06, 20]} />
                <meshStandardMaterial color={color} roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.048, 0]}>
                <cylinderGeometry args={[0.12, 0.12, 0.018, 20]} />
                <meshStandardMaterial color="#aed581" roughness={0.65} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  if (type === "jalapenos") {
    return (
      <group position={[0, y, 0]}>
        {[
          [-0.55, -0.3],
          [0.1, -0.4],
          [0.55, -0.1],
          [-0.2, 0.15],
          [0.35, 0.35],
          [-0.5, 0.4],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            position={[x, 0.03, z]}
            rotation={[Math.PI / 2, 0, i * 0.7]}
            castShadow
          >
            <torusGeometry args={[0.13, 0.048, 8, 18]} />
            <meshStandardMaterial color={color} roughness={0.55} />
          </mesh>
        ))}
      </group>
    );
  }

  // Coleslaw: shredded cabbage ribbons (no blob)
  const rand = mulberry32(seedOf("cabbage-shreds"));
  const tones = ["#f7f3e6", "#edf2dd", "#e3ecd2", "#f9f6ec", "#e8a54b"];
  const shreds = Array.from({ length: 74 }, (_, i) => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * 0.75;
    const isCarrot = i % 6 === 5;
    const len = (isCarrot ? 0.14 : 0.2) + rand() * 0.22;
    return {
      pos: [
        Math.cos(a) * r * 1.02,
        0.012 + rand() * (i % 7 === 0 ? 0.04 : 0.028),
        Math.sin(a) * r * 0.84,
      ],
      size: [len, 0.011 + rand() * 0.01, 0.05 + rand() * 0.05],
      rot: [rand() * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.7],
      color: isCarrot && rand() > 0.22 ? tones[4] : tones[i % 4],
      rough: isCarrot ? 0.7 : 0.45,
      key: i,
    };
  });
  return (
    <group position={[0, y, 0]}>
      {shreds.map((s) => (
        <mesh key={s.key} position={s.pos} rotation={s.rot} castShadow>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={s.color} roughness={s.rough} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Sauce: ONE continuous drizzle per sauce -------------------------
// A serpentine line (straight runs joined by U-turns) poured across the
// burger - not stacked droplets. All chosen sauces share the SAME layer;
// BuildStack's dynamic layout gives each sauce its own center, direction
// and slight height offset. A single sauce keeps the default straight
// centered drizzle. Also reused by the Cheese Sauce option.
function SauceDrizzle({ option, y, index = 0 }) {
  const color = option.scene?.color || "#e8c87a";
  const rows = [-0.45, -0.15, 0.15, 0.45];
  const rowLen = 1.3;
  const tubeR = 0.028 + (index % 2) * 0.004;
  return (
    <group position={[0, y + index * 0.004, 0]}>
      {rows.map((z, ri) => (
        <mesh
          key={ri}
          position={[0, 0.012, z]}
          rotation={[0, 0, Math.PI / 2]}
          castShadow
        >
          <cylinderGeometry args={[tubeR, tubeR, rowLen, 12]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      ))}
      {/* U-turn connectors joining the runs into one continuous drizzle */}
      {[0, 1, 2].map((ci) => (
        <mesh
          key={`turn-${ci}`}
          position={[
            ci % 2 === 0 ? rowLen / 2 : -rowLen / 2,
            0.012,
            (rows[ci] + rows[ci + 1]) / 2,
          ]}
          rotation={[-Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry args={[0.15, tubeR, 10, 20, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      ))}
    </group>
  );
}

// ---- Cheese layer ----------------------------------------------------
// American / Cheddar render as melted square slices; Cheese Sauce
// reuses the continuous drizzle.
function CheeseLayer({ option, index = 0 }) {
  const type = option.scene?.type;
  const color = option.scene?.color || "#f7c064";

  if (type === "sauce") {
    return <SauceDrizzle option={option} y={0} index={index} />;
  }

  // cheese slice - thin square, pressed a hair into the layer below
  return (
    <group position={[0, index * 0.004, 0]}>
      <RoundedBox
        args={[1.3, 0.03, 1.3]}
        radius={0.014}
        smoothness={4}
        position={[0, 0.012, 0]}
        castShadow
      >
        <meshStandardMaterial color={color} roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

// ---- Dynamic layout engine -------------------------------------------
// Pure function of (index, count, seed): with ONE selected item it
// returns the item's normal/default pose; with several selected it fans
// them out with EVEN angular spacing, each with its own center offset,
// rotation, slight tilt and scale so the stack looks hand-assembled and
// every layer stays visible from the side. It only ever reads the
// CURRENT selection list, so adding or removing an item recalculates
// every remaining slot automatically (no frozen positions, no gaps).
function layoutSlot(index, count, seedText, spread = 0.1) {
  if (count <= 1) return { x: 0, z: 0, rotY: 0, rotZ: 0, scale: 1 };
  const rand = mulberry32(seedOf(`${seedText}#${index}/${count}`));
  // EVEN angular spacing - slots are distributed symmetrically around
  // the center, so the combined silhouette stays balanced (no excessive
  // overhang piling up on one side of the burger).
  const angle = (index / count) * Math.PI * 2 + Math.PI / count;
  const radius =
    count === 2 ? spread : Math.min(spread * (1 + count * 0.08), spread * 1.5);
  return {
    x: Math.cos(angle) * radius + (rand() - 0.5) * 0.02,
    z: Math.sin(angle) * radius * 0.85 + (rand() - 0.5) * 0.02,
    rotY: (index % 2 ? 1 : -1) * (0.1 + rand() * 0.15),
    rotZ: (rand() - 0.5) * 0.05,
    scale: 0.98 + rand() * 0.03,
  };
}

// ---- Build the burger stack ------------------------------------------
// Order: bottom bun → lettuce → ALL other vegetables in ONE row right on
// top of the lettuce → fillings pressed flush with dynamic per-filling
// poses → cheese (slices + sauce) melted on ONE layer → sauces drizzled
// on ONE layer pressed into the stack → sesame crown hovering just above.
function BuildStack({ config }) {
  const fillings = config.fillings || [];
  const vegetables = config.vegetables || [];
  const cheeses = config.cheeses || [];
  const sauces = config.sauces || [];

  // Lettuce is the one vegetable that sits UNDER everything else.
  const lettuceIdx = vegetables.findIndex(
    (v) => getOption("vegetables", v.id)?.scene?.type === "lettuce",
  );
  const otherVeg = vegetables.filter((_, i) => i !== lettuceIdx);

  const layers = [];
  // Bottom bun is a lower HALF-sphere: its flat cut-crumb face sits at
  // the bun's center height (local y=0), the apex curves down to
  // BUN_R*BUN_BOTTOM_K below. So with the group centered at
  // BUN_R*BUN_BOTTOM_K, the apex rests on 0 AND the top face is exactly
  // at that same height - so the fillings base goes only +0.01 above.
  let y = BUN_R * BUN_BOTTOM_K;

  layers.push({ key: "bun-bottom", comp: <BottomBun y={y} /> });
  y += 0.01; // just above the cut-crumb face - no big gap

  if (lettuceIdx >= 0) {
    const opt = getOption("vegetables", vegetables[lettuceIdx].id);
    layers.push({ key: "lettuce", comp: <VegLayer option={opt} y={y} /> });
    y += 0.045;
  }

  // ALL other vegetables share ONE single row/layer exactly like the
  // single-vegetable case (same spread, same scale, one row) directly on
  // top of the lettuce - so no matter how many are combined, every one
  // of them stays visible in that row instead of hiding.
  if (otherVeg.length) {
    let layerHeight = 0;
    otherVeg.forEach((v, i) => {
      const opt = getOption("vegetables", v.id);
      if (!opt) return;
      layers.push({
        key: `veg-${i}`,
        comp: <VegLayer option={opt} y={y + i * 0.004} />,
      });
      layerHeight = Math.max(layerHeight, opt.scene?.height || 0.08);
    });
    y += layerHeight;
  }

  // Fillings: the dynamic layout shifts, rotates and tilts each one with
  // EVEN angular spacing so the combined silhouette stays balanced (no
  // excessive overhang on one side) and every layer stays visible. A
  // single filling keeps its normal/default pose.
  const fCount = fillings.length;
  fillings.forEach((f, i) => {
    const opt = getOption("fillings", f.id);
    if (!opt) return;
    const pose = layoutSlot(i, fCount, `filling-${opt.id}`);
    layers.push({
      key: `filling-${i}`,
      comp: (
        <group
          position={[pose.x, y, pose.z]}
          rotation={[0, pose.rotY, pose.rotZ]}
          scale={pose.scale}
        >
          {/* y=0 inside the posed wrapper - the wrapper itself carries the
              absolute stack height so scaling never sinks the layer */}
          <FillingLayer option={opt} y={0} />
        </group>
      ),
    });
    // Several fillings press into each other (no floating gaps); a
    // single filling keeps its full natural thickness.
    y +=
      (opt.scene?.height || 0.14) *
      (fCount === 1 ? 1 : fCount === 2 ? 0.9 : 0.82);
  });

  // Cheese: ONE layer melted over the fillings - slices fan out with
  // even spacing, the cheese sauce drizzles across. Slices are 0.03
  // thick, so the stack advances by exactly that (no floating air).
  if (cheeses.length) {
    const cCount = cheeses.length;
    cheeses.forEach((c, i) => {
      const opt = getOption("cheese", c.id);
      if (!opt) return;
      const pose = layoutSlot(i, cCount, `cheese-${opt.id}`, 0.05);
      const rotY = cCount === 1 ? 0 : (i * Math.PI) / cCount + pose.rotY * 0.4;
      layers.push({
        key: `cheese-${i}`,
        comp: (
          <group position={[pose.x, y, pose.z]} rotation={[0, rotY, 0]}>
            <CheeseLayer option={opt} index={i} />
          </group>
        ),
      });
    });
    y += 0.03;
  }

  // ALL sauces share ONE layer pressed slightly INTO the cheese/fillings
  // below (the drizzle sinks below its layer base), so the sauce coats
  // the stack instead of sticking to the crown. No air is added after
  // this block - the crown places itself just above the drizzle tops.
  if (sauces.length) {
    const sCount = sauces.length;
    sauces.forEach((s, i) => {
      const opt = getOption("sauces", s.id);
      if (!opt) return;
      const pose = layoutSlot(i, sCount, `sauce-${opt.id}`, 0.06);
      const rotY = sCount === 1 ? 0 : (i * Math.PI) / sCount + pose.rotY * 0.4;
      layers.push({
        key: `sauce-${i}`,
        comp: (
          <group position={[pose.x, y, pose.z]} rotation={[0, rotY, 0]}>
            <SauceDrizzle option={opt} y={0} index={i} />
          </group>
        ),
      });
    });
  }

  // Sesame crown - seated SNUGLY on the stack (small ~0.02 hover so it
  // reads as resting on the fillings). With drizzles we give the crown
  // just enough room (0.055) to clear the sauce tube tops so the sauce
  // stays visible instead of being smeared against the bun.
  const hasDrizzle =
    sauces.length > 0 ||
    cheeses.some((c) => getOption("cheese", c.id)?.scene?.type === "sauce");
  layers.push({
    key: "bun-top",
    comp: <TopBun y={y + (hasDrizzle ? 0.055 : 0.02)} />,
  });

  return (
    <group>
      {layers.map((l) => (
        <group key={l.key}>{l.comp}</group>
      ))}
    </group>
  );
}

// ---- Main scene ------------------------------------------------------
// No scene background/fog here (same as the frappe, tea & sandwich
// scenes) - the canvas stays transparent so the green stage gradient of
// the modal shows through.
export default function BurgerScene3D({ config }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.5, 2.4], fov: 42 }}
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 3, -2]} intensity={0.4} />

      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer
            form="circle"
            intensity={4}
            rotation-x={Math.PI / 2}
            position={[0, 5, -9]}
            scale={2}
          />
          <Lightformer
            form="circle"
            intensity={2}
            rotation-y={Math.PI / 2}
            position={[-5, 1, -1]}
            scale={2}
          />
          <Lightformer
            form="ring"
            color="#fff6dc"
            intensity={1}
            onUpdate={(self) => self.lookAt(0, 0, 0)}
          />
        </group>
      </Environment>

      <group scale={SCENE_SCALE} position={[0, -0.45, 0]}>
        <BuildStack config={config} />
      </group>

      <ContactShadows
        position={[0, -0.48, 0]}
        opacity={0.4}
        scale={3.5}
        blur={2.6}
        far={4}
      />

      <OrbitControls
        enablePan={false}
        minDistance={1.5}
        maxDistance={5}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.05}
        autoRotate
        autoRotateSpeed={0.6}
      />
    </Canvas>
  );
}
