// =====================================================================
//  SANDWICH 3D SCENE - realistic toasted sandwich loaf.
//  100% code-built, no GLB files.
//  Reads the guest's choices from the CUSTOMIZE_SANDWICH config.
// =====================================================================
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox,
} from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { getOption } from "./customizeSandwichData";

// ---- Measurements (world units) -------------------------------------
// The loaf is a slightly RECTANGULAR slice (not a perfect square) with
// rounded corners on every edge and a thinner, real-loaf profile.
const BREAD_W = 1.55;
const BREAD_D = 1.35;
const BREAD_THK = 0.2;
const BREAD_R = 0.05; // corner radius applied to every edge of the loaf
const SCENE_SCALE = 0.62;

// Deterministic random
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const seedOf = (text) => text.split("").reduce((s, c) => s + c.charCodeAt(0), 0);

// ---- Toasted loaf bread: WHITE faces + BROWN rounded crust ----------
// A rounded brown crust shell with the white soft interior riding a
// hair proud on the top & bottom faces. No two surfaces are coplanar,
// so the bread never flickers/flash. Corners are rounded on every side.
function BreadSlice({ y }) {
  return (
    <group position={[0, y, 0]}>
      {/* brown crust shell - rounded on every edge */}
      <RoundedBox
        args={[BREAD_W, BREAD_THK, BREAD_D]}
        radius={BREAD_R}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#b07c46" roughness={0.8} />
      </RoundedBox>
      {/* white soft interior - narrower/deeper so only the crust shows
          on the sides, but it rides proud on the faces (no z-fighting) */}
      <RoundedBox
        args={[BREAD_W - 0.11, BREAD_THK + 0.005, BREAD_D - 0.11]}
        radius={0.042}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial color="#fdf6e9" roughness={0.92} />
      </RoundedBox>
    </group>
  );
}

// ---- Fillings --------------------------------------------------------
// Every filling renderer starts flush at its layer base (y = 0 local) so
// stacked fillings press into each other - nothing floats.
function FillingLayer({ option, y }) {
  const type = option.scene?.type;
  const color = option.scene?.color || "#c98d4b";

  if (type === "grilled-chicken") {
    // Round / oval chicken pieces spread EVENLY (center + ring) so the
    // layer stays covered from every angle while the guest rotates.
    const rand = mulberry32(seedOf("oval-grilled-chicken"));
    const tones = ["#c98d4b", "#b5713a", "#bf7c40", "#d9a060", "#ab6a33"];
    const spots = [[0, 0]];
    for (let k = 0; k < 8; k += 1) {
      const a = (k / 8) * Math.PI * 2 + (rand() - 0.5) * 0.25;
      const r = 0.4 + rand() * 0.06;
      spots.push([Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.85]);
    }
    const pieces = spots.map(([x, z], i) => {
      const ry = 0.038 + rand() * 0.012; // half thickness
      return {
        x,
        z,
        rx: 0.27 + rand() * 0.09, // oval length
        rz: 0.17 + rand() * 0.06, // oval width
        ry,
        rot: Math.atan2(z, x) + (rand() - 0.5) * 0.8,
        tone: tones[i % tones.length],
        key: i,
      };
    });
    return (
      <group position={[0, y, 0]}>
        {pieces.map((pc) => (
          <mesh
            key={pc.key}
            position={[pc.x, pc.ry, pc.z]}
            rotation={[0, pc.rot, 0]}
            scale={[pc.rx, pc.ry, pc.rz]}
            castShadow
          >
            <sphereGeometry args={[1, 20, 14]} />
            <meshStandardMaterial color={pc.tone} roughness={0.72} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "crispy-chicken") {
    const rand = mulberry32(seedOf("crispy-slab"));
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
            <meshStandardMaterial color={tones[b.t % tones.length]} roughness={0.88} />
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

  if (type === "tuna") {
    // Tuna spread: a soft combined base with MANY chunks pressed into it
    // so everything reads as one cohesive layer (not separate pieces).
    // It sits flush on the layer below - sticking to the bottom half of
    // the sandwich, never to the upper loaf.
    const rand = mulberry32(seedOf("tuna-combined-spread"));
    const tones = ["#eed7bb", "#e2c094", "#f4e3ca", "#d9b48f"];
    const base = [
      { x: -0.18, z: 0.1, s: [0.72, 0.06, 0.56] },
      { x: 0.2, z: -0.12, s: [0.7, 0.058, 0.54] },
      { x: 0, z: 0, s: [0.8, 0.062, 0.62] },
      { x: -0.42, z: -0.26, s: [0.4, 0.05, 0.34] },
      { x: 0.42, z: 0.28, s: [0.38, 0.05, 0.32] },
    ];
    const chunks = [];
    for (let i = 0; i < 130; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.74;
      chunks.push({
        pos: [Math.cos(a) * r * 1.05, 0.075 + rand() * 0.035, Math.sin(a) * r * 0.85],
        size: [0.05 + rand() * 0.06, 0.012 + rand() * 0.01, 0.04 + rand() * 0.045],
        rot: [rand() * 0.7, rand() * Math.PI, (rand() - 0.5) * 0.6],
        color: tones[i % tones.length],
        key: i,
      });
    }
    for (let i = 0; i < 90; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.76;
      chunks.push({
        pos: [Math.cos(a) * r, 0.085 + rand() * 0.03, Math.sin(a) * r * 0.85],
        size: [0.035 + rand() * 0.035, 0.009 + rand() * 0.007, 0.03 + rand() * 0.03],
        rot: [rand() * 0.8, rand() * Math.PI, (rand() - 0.5) * 0.7],
        color: tones[(i + 3) % tones.length],
        key: 1000 + i,
      });
    }
    return (
      <group position={[0, y, 0]}>
        {base.map((b, i) => (
          <mesh
            key={`base-${i}`}
            position={[b.x, b.s[1] * 0.85, b.z]}
            scale={b.s}
            castShadow
          >
            <sphereGeometry args={[1, 18, 12]} />
            <meshStandardMaterial
              color={i % 2 ? "#ecd2b2" : "#e6c8a4"}
              roughness={0.8}
            />
          </mesh>
        ))}
        {chunks.map((f) => (
          <mesh key={f.key} position={f.pos} rotation={f.rot} castShadow>
            <boxGeometry args={f.size} />
            <meshStandardMaterial color={f.color} roughness={0.85} />
          </mesh>
        ))}
      </group>
    );
  }

  if (type === "ham") {
    return (
      <group position={[0, y, 0]}>
        <RoundedBox args={[1.75, 0.05, 1.7]} radius={0.025} position={[0, 0.025, 0]}>
          <meshStandardMaterial color={color} roughness={0.55} />
        </RoundedBox>
        <RoundedBox args={[1.7, 0.05, 1.65]} radius={0.025} position={[-0.04, 0.075, 0.03]} rotation={[0, 0.16, 0]}>
          <meshStandardMaterial color="#e98795" roughness={0.55} />
        </RoundedBox>
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
  // its crest reaches the egg's stack height (~0.22) - the filling/bread
  // above rests ON the white instead of hovering over an air gap. The
  // yolk stays nestled in the white, pressing just a hair into the layer
  // above for a natural look.
  const lobes = [
    { x: -0.32, y: 0.09, z: 0.02, s: [0.5, 0.09, 0.42], rz: 0.22 },
    { x: 0.3, y: 0.095, z: 0.08, s: [0.46, 0.09, 0.4], rz: -0.18 },
    { x: -0.06, y: 0.085, z: -0.28, s: [0.46, 0.09, 0.42], rz: 0.12 },
    { x: 0.08, y: 0.09, z: 0.24, s: [0.44, 0.085, 0.4], rz: -0.1 },
    { x: 0.0, y: 0.095, z: 0.0, s: [0.62, 0.12, 0.56], rz: 0.02 },
  ];
  return (
    <group position={[0, y, 0]}>
      {lobes.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, w.z]} scale={w.s} rotation={[0, 0, w.rz]} castShadow>
          <sphereGeometry args={[1, 20, 14]} />
          <meshStandardMaterial color="#f9f3e6" roughness={0.42} />
        </mesh>
      ))}
      <mesh position={[0.02, 0.16, 0.02]} scale={[1, 0.3, 1]} castShadow>
        <sphereGeometry args={[0.3, 22, 18]} />
        <meshStandardMaterial color="#f6a623" roughness={0.28} />
      </mesh>
    </group>
  );
}

// ---- Bacon strap: smooth continuous wavy ribbon ----------------------
// One unbroken strip (single BufferGeometry ribbon) following a sine
// wave - straight across the sandwich, curly along its length, with two
// lighter fat streaks running along the same curve.
function BaconStrap({ z, amp, phase, lift }) {
  const geometry = useMemo(() => {
    const segs = 64;
    const len = 2.15;
    const halfW = 0.14; // slightly narrower bacon strip
    const positions = new Float32Array((segs + 1) * 2 * 3);
    const index = [];
    for (let i = 0; i <= segs; i += 1) {
      const x = (i / segs - 0.5) * len;
      const y =
        lift + 0.005 +
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
        <meshStandardMaterial color="#a3542f" roughness={0.62} side={THREE.DoubleSide} />
      </mesh>
      {/* continuous lighter fat streaks along the same curve */}
      <mesh geometry={geometry} position={[0, 0.002, -0.055]} scale={[1, 1, 0.3]}>
        <meshStandardMaterial color="#d9916e" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.002, 0.065]} scale={[1, 1, 0.22]}>
        <meshStandardMaterial color="#e5a886" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ---- Vegetables ------------------------------------------------------
// Each vegetable scatters INSIDE its layer (never stacked on the others -
// BuildStack places every chosen vegetable on the same single level).
function VegLayer({ option, y }) {
  const type = option.scene?.type;
  const color = option.scene?.color || "#7cb342";

  if (type === "lettuce") {
    const leaves = [ { rot: 0.4, ox: -0.12, oz: 0.05 }, { rot: 2.7, ox: 0.14, oz: -0.07 } ];
    return (
      <group position={[0, y, 0]}>
        {leaves.map((lf, li) => {
          const rand = mulberry32(seedOf("flatleaf-" + li));
          const lobes = Array.from({ length: 5 }, (_, k) => {
            const a = (k / 5) * Math.PI * 2 + rand() * 0.5;
            return { a, r: 0.42 + rand() * 0.15, w: 0.3 + rand() * 0.14, len: 0.7 + rand() * 0.3, lift: (k % 2) * 0.01 + rand() * 0.008, key: k };
          });
          return (
            <group key={li} rotation={[0, lf.rot, 0]} position={[lf.ox, 0, lf.oz]}>
              <mesh position={[0, 0.02, 0]} scale={[1, 0.06, 0.92]} castShadow>
                <sphereGeometry args={[0.92, 20, 12]} />
                <meshStandardMaterial color="#79b63c" roughness={0.62} />
              </mesh>
              {lobes.map((lb) => (
                <mesh key={lb.key} position={[Math.cos(lb.a) * lb.r, 0.01 + lb.lift, Math.sin(lb.a) * lb.r]} scale={[lb.len * 0.5, 0.016 + lb.lift, lb.w * 0.5]} rotation={[0.03, -lb.a, 0.03]} castShadow>
                  <sphereGeometry args={[1, 14, 10]} />
                  <meshStandardMaterial color={lb.key % 3 === 0 ? "#8bc34a" : "#79b63c"} roughness={0.62} />
                </mesh>
              ))}
              <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.05, 0.006, 0.95]} />
                <meshStandardMaterial color="#5d8f2c" roughness={0.5} />
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
        {[[-0.55, -0.3],[0.5, -0.28],[0, 0.45]].map(([x, z], i) => {
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
    return (<group position={[0, y, 0]}>{[[-0.5, -0.25],[0.45, -0.35],[0.1, 0.35],[-0.35, 0.3],[0.55, 0.25]].map(([x, z], i) => (<mesh key={i} position={[x, 0.03, z]} rotation={[Math.PI / 2, 0, i * 0.7]} castShadow><torusGeometry args={[0.2, 0.028, 10, 24]} /><meshStandardMaterial color={color} roughness={0.6} /></mesh>))}</group>);
  }

  if (type === "cucumber") {
    return (
      <group position={[0, y, 0]}>
        {[[-0.5, -0.3],[0.45, -0.32],[-0.1, 0.4],[0.5, 0.3]].map(([x, z], i) => {
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
        {[[-0.55, -0.25],[-0.15, 0.35],[0.25, -0.35],[0.55, 0.15],[-0.4, 0.05]].map(([x, z], i) => {
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
    return (<group position={[0, y, 0]}>{[[-0.55, -0.3],[0.1, -0.4],[0.55, -0.1],[-0.2, 0.15],[0.35, 0.35],[-0.5, 0.4]].map(([x, z], i) => (<mesh key={i} position={[x, 0.03, z]} rotation={[Math.PI / 2, 0, i * 0.7]} castShadow><torusGeometry args={[0.13, 0.048, 8, 18]} /><meshStandardMaterial color={color} roughness={0.55} /></mesh>))}</group>);
  }

  // Coleslaw: shredded cabbage ribbons (no blob)
  const rand = mulberry32(seedOf("cabbage-shreds"));
  const tones = ["#f7f3e6", "#edf2dd", "#e3ecd2", "#f9f6ec", "#e8a54b"];
  const shreds = Array.from({ length: 74 }, (_, i) => {
    const a = rand() * Math.PI * 2; const r = Math.sqrt(rand()) * 0.75;
    const isCarrot = i % 6 === 5; const len = (isCarrot ? 0.14 : 0.2) + rand() * 0.22;
    return { pos: [Math.cos(a) * r * 1.02, 0.012 + rand() * (i % 7 === 0 ? 0.04 : 0.028), Math.sin(a) * r * 0.84],
      size: [len, 0.011 + rand() * 0.01, 0.05 + rand() * 0.05],
      rot: [rand() * 0.5, rand() * Math.PI, (rand() - 0.5) * 0.7],
      color: isCarrot && rand() > 0.22 ? tones[4] : tones[i % 4], rough: isCarrot ? 0.7 : 0.45, key: i };
  });
  return (<group position={[0, y, 0]}>{shreds.map((s) => (<mesh key={s.key} position={s.pos} rotation={s.rot} castShadow><boxGeometry args={s.size} /><meshStandardMaterial color={s.color} roughness={s.rough} /></mesh>))}</group>);
}

// ---- Sauce: ONE continuous drizzle per sauce -------------------------
// A serpentine line (straight runs joined by U-turns) poured across the
// sandwich - not stacked droplets. All chosen sauces share the SAME
// layer; BuildStack's dynamic layout gives each sauce its own center,
// direction and slight height offset so the lines cross naturally. A
// single sauce keeps the default straight centered drizzle.
function SauceDrizzle({ option, y, index = 0 }) {
  const color = option.scene?.color || "#e8c87a";
  const rows = [-0.45, -0.15, 0.15, 0.45];
  const rowLen = 1.35;
  const tubeR = 0.028 + (index % 2) * 0.004;
  return (
    <group position={[0, y + index * 0.004, 0]}>
      {rows.map((z, ri) => (
        <mesh key={ri} position={[0, 0.012, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[tubeR, tubeR, rowLen, 12]} />
          <meshStandardMaterial color={color} roughness={0.45} />
        </mesh>
      ))}
      {/* U-turn connectors joining the runs into one continuous drizzle */}
      {[0, 1, 2].map((ci) => (
        <mesh
          key={`turn-${ci}`}
          position={[ci % 2 === 0 ? rowLen / 2 : -rowLen / 2, 0.012, (rows[ci] + rows[ci + 1]) / 2]}
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

// ---- Dynamic layout engine -------------------------------------------
// Pure function of (index, count, seed): with ONE selected item it
// returns the item's normal/default pose; with several selected it fans
// them out on a golden-angle spiral, each with its own center offset,
// rotation, slight tilt and scale so the stack looks hand-assembled and
// every layer stays visible from the side. It only ever reads the
// CURRENT selection list, so adding or removing an item recalculates
// every remaining slot automatically (no frozen positions, no gaps).
function layoutSlot(index, count, seedText, spread = 0.1) {
  if (count <= 1) return { x: 0, z: 0, rotY: 0, rotZ: 0, scale: 1 };
  const rand = mulberry32(seedOf(`${seedText}#${index}/${count}`));
  // EVEN angular spacing - slots are distributed symmetrically around
  // the center, so the combined silhouette stays balanced (no excessive
  // overhang piling up on one side of the sandwich).
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

// ---- Build the sandwich stack ----------------------------------------
// Order: bottom loaf → lettuce → ALL other vegetables on ONE layer right
// on top of the lettuce → fillings pressed flush (tuna always at the
// BOTTOM of the fillings so it sticks to the lower half, never the upper
// loaf) with dynamic per-filling poses → sauces drizzled on ONE layer
// pressed into the LAST selected filling → top loaf hovering just above.
function BuildStack({ config }) {
  const fillings = config.fillings || [];
  const vegetables = config.vegetables || [];
  const sauces = config.sauces || [];

  // Lettuce is the one vegetable that sits UNDER everything else.
  const lettuceIdx = vegetables.findIndex(
    (v) => getOption("vegetables", v.id)?.scene?.type === "lettuce",
  );
  const otherVeg = vegetables.filter((_, i) => i !== lettuceIdx);

  // Tuna is a spread - it always sits at the BOTTOM of the fillings
  // (sticking to the lower half of the sandwich), the rest keep the
  // guest's selection order above it.
  const isTuna = (f) => getOption("fillings", f.id)?.scene?.type === "tuna";
  const orderedFillings = [
    ...fillings.filter(isTuna),
    ...fillings.filter((f) => !isTuna(f)),
  ];

  const layers = [];
  let y = BREAD_THK / 2; // bottom loaf center - its underside rests at 0

  layers.push({ key: "bread-bottom", comp: <BreadSlice y={y} /> });
  y += BREAD_THK / 2 + 0.01; // top surface of the bottom loaf

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
        comp: <VegLayer option={opt} y={y + i * 0.008} />,
      });
      layerHeight = Math.max(layerHeight, opt.scene?.height || 0.08);
    });
    y += layerHeight;
  }

  // Fillings: tuna first (bottom), then the rest in selection order. The
  // dynamic layout shifts, rotates and tilts each one with EVEN angular
  // spacing so the combined silhouette stays balanced (no excessive
  // overhang on one side) and every layer stays visible. A single
  // filling keeps its normal/default pose.
  const fCount = orderedFillings.length;
  orderedFillings.forEach((f, i) => {
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
      (opt.scene?.height || 0.12) *
      (fCount === 1 ? 1 : fCount === 2 ? 0.9 : 0.82);
  });

  // ALL sauces share ONE layer pressed slightly INTO the last selected
  // filling (the drizzle sinks below its layer base), so the sauce coats
  // the filling instead of sticking to the upper loaf.
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
          <group position={[pose.x, 0, pose.z]} rotation={[0, rotY, 0]}>
            <SauceDrizzle option={opt} y={y} index={i} />
          </group>
        ),
      });
    });
    y += 0.05;
  }

  // Top loaf slice - with a little extra clearance when sauces are
  // present so the drizzle reads as coating the filling, not glued to
  // the underside of the bread.
  layers.push({
    key: "bread-top",
    comp: (
      <BreadSlice y={y + BREAD_THK / 2 + (sauces.length ? 0.03 : 0.005)} />
    ),
  });

  return <group>{layers.map((l) => <group key={l.key}>{l.comp}</group>)}</group>;
}

// ---- Main scene ------------------------------------------------------
export default function SandwichScene3D({ config }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 1.5, 2.4], fov: 42 }}
      gl={{ antialias: true }}
    >
      {/* No scene background/fog here (same as the frappe & tea scenes) -
          the canvas stays transparent so the green stage gradient of the
          modal shows through. */}
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
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="ring" color="#fff6dc" intensity={1} onUpdate={(self) => self.lookAt(0, 0, 0)} />
        </group>
      </Environment>

      <group scale={SCENE_SCALE} position={[0, -0.35, 0]}>
        <BuildStack config={config} />
      </group>

      <ContactShadows position={[0, -0.38, 0]} opacity={0.4} scale={3.5} blur={2.6} far={4} />

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


