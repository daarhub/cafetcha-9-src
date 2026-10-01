// =====================================================================
//  FRAPPE 3D SCENE - built 100% from code (no GLB files needed).
//  Reads the guest's choices from the CUSTOMIZE_FRAPPE config, so any
//  option an admin adds/edits/deletes automatically shows up here.
//
//  Layout: a tall, flat-bottomed open glass (lathe - no lid, no base),
//  liquid inside, a foam cap the toppings rest on, an optional whipped-
//  cream spiral piped as one continuous ribbon, scattered toppings,
//  add-ons and zigzag surface drizzles. No lid, no straw, no pouring -
//  the only motion is the slow spin of the OrbitControls camera.
//  =====================================================================
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getOption } from "./customizeFrappeData";

// ---- Cup measurement constants (world units) -------------------------
const CUP_BOTTOM_Y = -1.2; // completely flat bottom (rests on the ground)
const CUP_TOP_Y = 1.2; // open rim - the cup is never covered
const CUP_WALL_R = 0.79; // widest wall radius (profile tapers subtly downward)
const GLASS_T = 0.035; // wall thickness
const LIQUID_TOP_Y = 1.16; // drink fills to just under the rim
const TRAY_Y = 1.16; // foam surface the toppings rest on
const CREAM_R = 0.88; // whipped-cream base radius (overhangs the rim)
const CREAM_H = 0.62; // whipped-cream height above the foam
const CREAM_TURNS = 3.4; // winds in the piped-cream spiral
const SCENE_SCALE = 0.56; // whole drink drawn smaller inside the stage

// Glass profile for the lathe (radius, height): a completely flat
// bottom, a very slight V taper (subtly narrower toward the bottom) and
// a wide open top - no lid and no separate base, one single open vessel.
const GLASS_PROFILE = [
  [0.0, CUP_BOTTOM_Y], // centre of the flat bottom
  [0.52, CUP_BOTTOM_Y], // flat bottom disc
  [0.62, CUP_BOTTOM_Y + 0.012], // rounded bottom corner
  [0.68, CUP_BOTTOM_Y + 0.05],
  [0.705, CUP_BOTTOM_Y + 0.12],
  [0.72, CUP_BOTTOM_Y + 0.24], // subtle V: narrowest just above the base
  [0.735, CUP_BOTTOM_Y + 0.55],
  [0.755, CUP_BOTTOM_Y + 1.0],
  [0.775, CUP_TOP_Y - 0.05], // wall keeps rising to the rim...
  [0.8, CUP_TOP_Y - 0.015],
  [0.8, CUP_TOP_Y], // ...and stops - the top stays wide open
];

// The liquid hugs the inside of the glass and stops at the drink line.
const LIQUID_PROFILE = GLASS_PROFILE.map(([r, y], i) => [
  i === 0 ? 0.0 : Math.max(0.02, r - GLASS_T),
  Math.min(y, LIQUID_TOP_Y),
]);

// Radius of the liquid's outer surface at height y (its lathe profile,
// interpolated). Specks and bubbles sit right on this surface so they
// poke through the liquid wall and show through the glass.
const liquidSurfaceR = (y) => {
  const pts = LIQUID_PROFILE;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [r1, y1] = pts[i];
    const [r2, y2] = pts[i + 1];
    if (y <= y1) return Math.max(0.02, r1);
    if (y <= y2) {
      const t = (y - y1) / Math.max(1e-6, y2 - y1);
      return Math.max(0.02, r1 + (r2 - r1) * t);
    }
  }
  return Math.max(0.02, pts[pts.length - 1][0]);
};

// Deterministic random so toppings stay put between renders.
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
  text.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

// Deterministic 0..1 hash used for subtle per-vertex grain.
const hash01 = (n) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Height of the whipped-cream swirl at a distance r from the centre.
const creamYAt = (r) => {
  if (r >= CREAM_R) return TRAY_Y - 0.02;
  const t = Math.pow(Math.max(0, r / CREAM_R), 2.2);
  return TRAY_Y + CREAM_H * Math.pow(1 - t, 1.3);
};

// Lathe shell that follows creamYAt(r) - hides any gaps between puffs.
function CreamDome() {
  const geometry = useMemo(() => {
    const points = [];
    const STEPS = 24;
    for (let i = 0; i <= STEPS; i += 1) {
      const r = (i / STEPS) * CREAM_R;
      points.push(new THREE.Vector2(r, creamYAt(r) - 0.04));
    }
    return new THREE.LatheGeometry(points, 40);
  }, []);
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color="#fffdf7"
        roughness={0.5}
        clearcoat={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const TAU = Math.PI * 2;

// Cross-section radius of the piped ribbon: fat through the body,
// tapering to a fine tip at the peak, and slightly thinner where the
// piping starts so the beginning of the swirl is not bulky.
const creamRibbonR = (u) => {
  const body = 0.16 * Math.pow(1 - u, 0.62) + 0.02;
  const startTaper = 0.7 + 0.3 * Math.min(1, u / 0.18);
  return body * startTaper;
};

// Rounded end caps of the swirl: the piping start (outer edge) and the
// tiny curl at the tip. Shared by the drawn geometry and the surface
// model below so both stay perfectly in sync.
const CREAM_CAP_R = 0.14;
const CREAM_TIP_R = 0.032;

// Deterministic swirl placement shared by the drawn spiral and the
// surface-height model, so a drizzle can drape onto the exact ridges
// that are rendered.
const swirlRand = mulberry32(seedOf("whipped-cream-spiral"));
const CREAM_PHASE = swirlRand() * Math.PI * 2;
const CREAM_WOBBLE = swirlRand() * Math.PI * 2;

// Centre-line of the piped spiral at parameter u (0 = where the piping
// starts on the outer edge, 1 = the peak).
const spiralCentreAt = (u) => {
  const angle = CREAM_PHASE - u * CREAM_TURNS * Math.PI * 2;
  const base = CREAM_R * (1 - Math.pow(u, 1.08));
  const ripple = Math.sin(angle * 1.9 + CREAM_WOBBLE) * 0.02 * (1 - u * 0.45);
  const r = Math.max(0.012, base + ripple);
  const y = creamYAt(Math.min(r, CREAM_R)) - creamRibbonR(u) * 0.3;
  return new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r);
};

// Builds the piped-cream spiral as ONE continuous ribbon: a helix that
// follows the cream profile, swept with a tapering cross-section. The
// path gently undulates so the winds read as natural curved ridges
// instead of stacked round blobs.
function buildCreamSpiral() {
  const LEN_STEPS = 360;
  const RAD_STEPS = 14;
  const centreAt = spiralCentreAt;

  const positions = new Float32Array((LEN_STEPS + 1) * (RAD_STEPS + 1) * 3);
  const indices = [];
  const tangent = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const binormal = new THREE.Vector3();
  const prevNormal = new THREE.Vector3(1, 0, 0);
  let ptr = 0;

  for (let i = 0; i <= LEN_STEPS; i += 1) {
    const u = i / LEN_STEPS;
    const angle = CREAM_PHASE - u * CREAM_TURNS * Math.PI * 2;
    const c = centreAt(u);
    const ahead = centreAt(Math.min(1, u + 0.004));
    const behind = centreAt(Math.max(0, u - 0.004));

    tangent.subVectors(ahead, behind).normalize();
    normal.set(c.x, 0.0001, c.z);
    if (normal.lengthSq() < 1e-6) normal.copy(prevNormal);
    normal.normalize();
    normal.addScaledVector(tangent, -normal.dot(tangent)).normalize();
    prevNormal.copy(normal);
    binormal.crossVectors(tangent, normal).normalize();

    // Subtle lumps along the ribbon, like cream pressed from a bag.
    const radius =
      creamRibbonR(u) * (1 + 0.1 * Math.sin(angle * 2.3 + CREAM_WOBBLE));

    for (let j = 0; j <= RAD_STEPS; j += 1) {
      const v = (j / RAD_STEPS) * Math.PI * 2;
      const cN = Math.cos(v) * radius;
      const bN = Math.sin(v) * radius;
      positions[ptr++] = c.x + normal.x * cN + binormal.x * bN;
      positions[ptr++] = c.y + normal.y * cN + binormal.y * bN;
      positions[ptr++] = c.z + normal.z * cN + binormal.z * bN;
    }
  }

  for (let i = 0; i < LEN_STEPS; i += 1) {
    for (let j = 0; j < RAD_STEPS; j += 1) {
      const a = i * (RAD_STEPS + 1) + j;
      const b = a + RAD_STEPS + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return { geometry, start: centreAt(0), tip: centreAt(1) };
}

// True top of the whipped cream at plan-view (x, z): the under-dome
// shell, every wind of the piped spiral (identical maths to the drawn
// geometry - ripple, lumps and taper included) and the rounded start/
// tip caps. A drizzle draped onto this height nestles right onto the
// cream - riding the ridges and dipping into the valleys - with natural
// contact: never floating above it, never sunk inside it.
const creamSurfaceAt = (x, z) => {
  const r = Math.min(Math.hypot(x, z), CREAM_R);
  const theta = Math.atan2(z, x);
  let top = creamYAt(r) - 0.04; // the under-dome shell
  const rel = (((CREAM_PHASE - theta) % TAU) + TAU) % TAU;
  for (let n = 0; ; n += 1) {
    const u = (rel + n * TAU) / (CREAM_TURNS * TAU);
    if (u > 1) break;
    const centre = spiralCentreAt(u);
    const cr = Math.hypot(centre.x, centre.z);
    const angle = CREAM_PHASE - u * CREAM_TURNS * TAU;
    const rr =
      creamRibbonR(u) * (1 + 0.1 * Math.sin(angle * 2.3 + CREAM_WOBBLE));
    const d = r - cr;
    if (Math.abs(d) < rr) {
      top = Math.max(top, centre.y + Math.sqrt(rr * rr - d * d));
    }
  }
  // rounded caps: the piping start (outer edge) and the tiny tip curl
  const caps = [
    [spiralCentreAt(0), CREAM_CAP_R],
    [spiralCentreAt(1), CREAM_TIP_R],
  ];
  for (const [c, capR] of caps) {
    const dd = Math.hypot(x - c.x, z - c.z);
    if (dd < capR) {
      top = Math.max(top, c.y + Math.sqrt(capR * capR - dd * dd));
    }
  }
  return top;
};

// Outermost radius where the piped cream actually exists at plan angle
// theta: the outer flank of the spiral's first wind on that ray. Inside
// the reach circle this is the cream's true silhouette - beyond it the
// swirl hasn't reached yet and only the low under-dome (inside the cup,
// below the drink line) remains, so drizzle points there are pulled
// back onto the cream instead of hovering over the gap.
const creamOuterR = (theta) => {
  const rel = (((CREAM_PHASE - theta) % TAU) + TAU) % TAU;
  const u0 = rel / (CREAM_TURNS * TAU);
  const centre = spiralCentreAt(u0);
  const angle = CREAM_PHASE - u0 * CREAM_TURNS * TAU;
  const rr =
    creamRibbonR(u0) * (1 + 0.1 * Math.sin(angle * 2.3 + CREAM_WOBBLE));
  return Math.hypot(centre.x, centre.z) + rr;
};

// Whipped cream - one continuous piped spiral with natural curved
// ridges, sitting on the drink and overhanging the rim.
function WhippedCream() {
  const spiral = useMemo(() => buildCreamSpiral(), []);
  return (
    <group>
      {/* solid under-dome so the spiral never shows gaps */}
      <CreamDome />
      <mesh geometry={spiral.geometry} castShadow>
        <meshPhysicalMaterial
          color="#fffdf7"
          roughness={0.42}
          clearcoat={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* slim rounded cap where the piping started - no open hose end */}
      <mesh position={spiral.start.toArray()}>
        <sphereGeometry args={[CREAM_CAP_R, 18, 18]} />
        <meshPhysicalMaterial
          color="#fffdf7"
          roughness={0.42}
          clearcoat={0.2}
        />
      </mesh>
      {/* tiny tip curl at the peak */}
      <mesh position={spiral.tip.toArray()}>
        <sphereGeometry args={[CREAM_TIP_R, 14, 14]} />
        <meshPhysicalMaterial
          color="#fffdf7"
          roughness={0.42}
          clearcoat={0.2}
        />
      </mesh>
    </group>
  );
}

// =====================================================================
// CURLY SHAVINGS - same helical curls as the ice cream scene
//
// A thin spiral swept along a Catmull-Rom curve, rendered as a tube, so
// each piece reads as a real curled chocolate shaving instead of a
// flat flake. (scale keeps the frappe's per-piece size variation.)
// =====================================================================
function CurlyShaving({ position, rotation, color, index, scale = 1 }) {
  const points = [];

  const turns = 0.75;
  const length = 0.1;
  const radius = 0.015;

  for (let i = 0; i <= 20; i++) {
    const t = i / 20;

    const angle = t * Math.PI * 2 * turns;

    const x = (t - 0.5) * length;

    const y = Math.sin(angle) * radius;

    const z = Math.cos(angle) * radius;

    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);

  const geometry = new THREE.TubeGeometry(curve, 28, 0.022, 8, false);

  return (
    <mesh
      key={index}
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <meshStandardMaterial color={color} roughness={0.38} />
    </mesh>
  );
}

// =====================================================================
// CHOPPED NUTS - same faceted-crumb design as the ice cream scene
//
// Irregular dodecahedron pieces in a warm roasted-nut palette, each
// squashed non-uniformly (see the nuts branch in ToppingMesh) so no
// piece reads as a round lump. The base chunk is sized up from the ice
// cream's 0.018 to suit the frappe's larger cup, and the admin-config
// colour swaps in as the palette's mid tone.
// =====================================================================
function ChoppedNut({ position, rotation, scale, index, color }) {
  const colors = ["#9b632b", "#aa7033", color || "#b97e3d", "#c78c46", "#d29b52"];

  return (
    <mesh
      key={index}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <dodecahedronGeometry args={[0.028, 0]} />

      <meshStandardMaterial
        color={colors[index % colors.length]}
        roughness={0.82}
      />
    </mesh>
  );
}

// =====================================================================
// COOKIE CRUMBS - the same faceted-crumb design as the ice cream scene:
// an irregular dodecahedron chunk with a non-uniform squashed scale, a
// few scattered shards, and an occasional pale inner crumb exposed on a
// fresh break. Sizes are scaled up from the ice cream's to suit the
// frappe's larger cup (same as ChoppedNut). The palette - oreo (dark),
// cookie (tan biscoff), graham (golden) - is picked from the topping's
// scene.crumb field so each crumb style keeps its own look.
// =====================================================================
const CRUMB_PALETTES = {
  oreo: {
    chunk: ["#1f1a15", "#282219", "#2f2921", "#36302a"],
    shard: ["#3d362c", "#494135", "#544b3d"],
    inner: "#f2ecdf",
    shapes: [
      [1.9, 0.8, 1.4],
      [1.5, 1.3, 1.25],
      [2.3, 0.7, 0.9],
      [1.6, 1.1, 1.5],
    ],
  },
  cookie: {
    chunk: ["#8f5628", "#a56a35", "#b97a42", "#c98d4e"],
    shard: ["#7a451f", "#925a2c", "#a8713a"],
    inner: "#d9a768",
    shapes: [
      [2.2, 0.55, 1.5],
      [1.7, 0.9, 1.25],
      [2.6, 0.5, 1.0],
      [1.4, 1.15, 1.1],
    ],
  },
  graham: {
    chunk: ["#9b632b", "#aa7033", "#b97e3d", "#c78c46", "#d29b52"],
    shard: ["#8a5524", "#9b632b", "#b37d3f"],
    inner: "#e6c988",
    shapes: [
      [2.0, 0.6, 1.3],
      [1.6, 1.0, 1.2],
      [2.4, 0.55, 0.95],
      [1.3, 1.2, 1.1],
      [1.8, 0.7, 1.4],
    ],
  },
};

function CookieCrumb({ position, rotation, index, colorPick, palette }) {
  const { shapes } = palette;

  const piece = useMemo(() => {
    const rand = mulberry32(seedOf(`fr-crumb-${index}`));
    const jitter = () => 0.85 + rand() * 0.3;
    const chunk = shapes[index % shapes.length].map(
      (s) => s * jitter(),
    );
    const shards = [];
    const shardCount = index % 2 === 0 ? 2 : 1;
    for (let i = 0; i < shardCount; i += 1) {
      shards.push({
        position: [
          (rand() - 0.5) * 0.05,
          0.004 + rand() * 0.01,
          (rand() - 0.5) * 0.05,
        ],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        scale: 0.55 + rand() * 0.45,
      });
    }
    return { chunk, shards };
  }, [index, shapes]);

  const hasInner = colorPick > 0.62;

  return (
    <group position={position} rotation={rotation}>
      <mesh scale={piece.chunk} castShadow>
        <dodecahedronGeometry args={[0.028, 0]} />
        <meshStandardMaterial
          color={palette.chunk[index % palette.chunk.length]}
          roughness={0.85}
          flatShading
        />
      </mesh>

      {piece.shards.map((shard, i) => (
        <mesh
          key={i}
          position={shard.position}
          rotation={shard.rotation}
          scale={shard.scale}
          castShadow
        >
          <dodecahedronGeometry args={[0.015, 0]} />
          <meshStandardMaterial
            color={palette.shard[(index + i) % palette.shard.length]}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}

      {hasInner && (
        <mesh
          position={[0.006, 0.013, 0.005]}
          rotation={[0.4, index * 1.7, 0.3]}
          scale={[1.3, 0.45, 1]}
        >
          <sphereGeometry args={[0.014, 10, 8]} />
          <meshStandardMaterial color={palette.inner} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// One type of scattered topping. surfaceY(r) gives the height of the
// surface (flat foam cap or whipped-cream swirl) at radius r, so the
// pieces settle naturally on top of - or slightly inside - the drink.
function ToppingMesh({ option, surfaceY }) {
  const type = option.scene?.type || "crumbs";
  const color = option.scene?.color || "#ffffff";
  const rand = mulberry32(seedOf(option.id));
  const counts = {
    chips: 26,
    crumbs: 34,
    graham: 30,
    shavings: 26,
    marshmallow: 16,
    nuts: 30,
  };
  const offsets = {
    chips: 0.03,
    crumbs: 0.005,
    graham: 0.005,
    shavings: 0.02,
    marshmallow: 0.05,
    nuts: 0.008,
  };
  const items = [];
  const count = counts[type] || 14;
  for (let i = 0; i < count; i += 1) {
    const r = 0.1 + Math.sqrt(rand()) * 0.6;
    const angle = rand() * Math.PI * 2;
    items.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      y: surfaceY(r) + (offsets[type] || 0.02) + rand() * 0.02,
      rotY: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.9,
      s: 0.8 + rand() * 0.55,
      pick: rand(),
    });
  }

  return (
    <group>
      {items.map((item, i) => {
        const position = [item.x, item.y, item.z];
        const rotation = [item.tilt, item.rotY, 0];
        if (type === "chips") {
          return (
            <mesh
              key={i}
              position={position}
              rotation={rotation}
              scale={item.s}
            >
              <coneGeometry args={[0.045, 0.11, 5]} />
              <meshPhysicalMaterial color={color} roughness={0.3} />
            </mesh>
          );
        }
        if (type === "graham" || type === "crumbs") {
          // Same faceted-crumb design as the ice cream scene - an
          // irregular dodecahedron chunk with scattered shards and an
          // occasional pale inner crumb. The palette comes from the
          // topping's scene.crumb field (oreo / cookie / graham).
          const palette =
            CRUMB_PALETTES[option.scene?.crumb] || CRUMB_PALETTES.graham;

          return (
            <CookieCrumb
              key={i}
              index={i}
              position={position}
              rotation={rotation}
              colorPick={item.pick}
              palette={palette}
            />
          );
        }
        if (type === "shavings") {
          // Same curled design as the ice cream scene - helical chocolate
          // curls in the same tri-tone dark-chocolate palette (the
          // configured color is the mid tone).
          return (
            <CurlyShaving
              key={i}
              index={i}
              position={position}
              rotation={rotation}
              scale={item.s}
              color={i % 3 === 0 ? "#32170d" : i % 3 === 1 ? color : "#5a321e"}
            />
          );
        }
        if (type === "marshmallow") {
          return (
            <RoundedBox
              key={i}
              args={[0.085, 0.085, 0.085]}
              radius={0.03}
              position={position}
              rotation={rotation}
              scale={item.s}
            >
              <meshPhysicalMaterial color={color} roughness={0.4} />
            </RoundedBox>
          );
        }
        if (type === "nuts") {
          // Same faceted chopped-nut design as the ice cream scene -
          // irregular dodecahedron chunks with varied non-uniform scales
          // in a warm roasted palette (the configured color is the mid
          // tone).
          const scale = [0.65, 0.85, 1.0, 1.15, 1.3][i % 5];

          return (
            <ChoppedNut
              key={i}
              index={i}
              position={position}
              rotation={rotation}
              scale={[scale, 0.5 + (i % 4) * 0.13, 0.7 + (i % 3) * 0.12]}
              color={color}
            />
          );
        }
        return (
          <mesh key={i} position={position} rotation={rotation} scale={item.s}>
            <sphereGeometry args={[0.036, 12, 12]} />
            <meshPhysicalMaterial color={color} roughness={0.45} />
          </mesh>
        );
      })}
    </group>
  );
}

// A realistic scoop of ice cream: smooth rounded body with a bulging
// base, like it was just scooped onto the drink.
function IceCreamScoop({ color, position, seed }) {
  const rand = mulberry32(seed);
  const mainR = 0.21;
  return (
    <group
      position={position}
      rotation={[rand() * 0.15, rand() * Math.PI * 2, rand() * 0.15]}
    >
      {/* smooth main scoop */}
      <mesh castShadow>
        <sphereGeometry args={[mainR, 32, 32]} />
        <meshPhysicalMaterial color={color} roughness={0.2} clearcoat={0.3} />
      </mesh>
      {/* bulging base blobs */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2 + rand() * 0.55;
        const spread = mainR * 0.62;
        const br = mainR * (0.4 + rand() * 0.2);
        return (
          <mesh
            key={i}
            position={[
              Math.cos(a) * spread,
              -mainR * 0.72 + rand() * 0.04,
              Math.sin(a) * spread,
            ]}
            scale={br / mainR}
          >
            <sphereGeometry args={[mainR * 0.42, 22, 22]} />
            <meshPhysicalMaterial
              color={color}
              roughness={0.26}
              clearcoat={0.2}
            />
          </mesh>
        );
      })}
      {/* little swirl peak */}
      <mesh
        position={[rand() * 0.05 - 0.02, mainR * 0.8, rand() * 0.05 - 0.02]}
      >
        <sphereGeometry args={[mainR * 0.28, 20, 20]} />
        <meshPhysicalMaterial color={color} roughness={0.24} clearcoat={0.28} />
      </mesh>
    </group>
  );
}

// Add-ons: ice-cream scoops, brownie / cheesecake bits, oreo cookies.
function AddOnMesh({ option, index, surfaceY, hasCream }) {
  const type = option.scene?.type || "brownie";
  const color = option.scene?.color || "#3b2117";
  const rand = mulberry32(index * 9137 + 41);
  const seed = seedOf(option.id);

  if (type === "scoop") {
    const angle = index * 2.2;
    if (hasCream) {
      // Rest on top of the whipped cream, slightly embedded for support.
      const radius = index === 0 ? 0 : 0.1 + rand() * 0.18;
      return (
        <IceCreamScoop
          color={color}
          seed={seed}
          position={[
            Math.cos(angle) * radius,
            TRAY_Y + CREAM_H + 0.13,
            Math.sin(angle) * radius,
          ]}
        />
      );
    }
    return (
      <IceCreamScoop
        color={color}
        seed={seed}
        position={[
          Math.cos(angle) * 0.18,
          TRAY_Y + 0.14,
          Math.sin(angle) * 0.18,
        ]}
      />
    );
  }

  const count = type === "oreo" ? 8 : 14;
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const r = 0.1 + Math.sqrt(rand()) * 0.62;
    const a = rand() * Math.PI * 2;
    items.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      y: surfaceY(r) + 0.02 + rand() * 0.02,
      rotY: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.7,
      s: 0.9 + rand() * 0.5,
    });
  }
  return (
    <group>
      {items.map((item, i) => {
        const position = [item.x, item.y, item.z];
        const rotation = [item.tilt, item.rotY, 0];
        if (type === "oreo") {
          return (
            <group
              key={i}
              position={position}
              rotation={rotation}
              scale={item.s}
            >
              <mesh position={[0, 0.014, 0]}>
                <cylinderGeometry args={[0.085, 0.085, 0.028, 20]} />
                <meshPhysicalMaterial color={color} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.014, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.034, 20]} />
                <meshPhysicalMaterial color="#f7f3ec" roughness={0.4} />
              </mesh>
            </group>
          );
        }
        if (type === "cheesecake") {
          return (
            <RoundedBox
              key={i}
              args={[0.07, 0.07, 0.07]}
              radius={0.02}
              position={position}
              rotation={rotation}
              scale={item.s}
            >
              <meshPhysicalMaterial color={color} roughness={0.4} />
            </RoundedBox>
          );
        }
        return (
          <mesh key={i} position={position} rotation={rotation} scale={item.s}>
            <boxGeometry args={[0.06, 0.06, 0.06]} />
            <meshPhysicalMaterial color={color} roughness={0.4} />
          </mesh>
        );
      })}
    </group>
  );
}

// A drizzle lying on TOP of the drink (or the whipped cream): ONE
// continuous W-shaped zigzag line that snakes across the whole surface
// from edge to edge - straight diagonal strokes with sharp corners and
// short hairpin turns joining the rows, like a real squeeze-bottle
// drizzle drawn in a single motion. Every point is run through
// projectPoint(x, z), which keeps it inside the reach circle, pulls it
// back onto the cream's true outer edge where the swirl doesn't reach
// that circle, and drapes it onto the exact surface height - the ridges
// and valleys alike - so the line nestles directly onto the whipped
// cream with natural contact: no floating above the surface and no
// sinking or cutting into it. maxR controls how far it reaches (the
// full cream swirl when selected).
function SurfaceDrizzle({ color, index, projectPoint, maxR }) {
  const geometry = useMemo(() => {
    const rand = mulberry32(index * 733 + 17);
    const angle = index * 1.15 + rand() * 0.6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rows = 5; // zigzag rows drawn in one continuous stroke
    const halfWid = maxR * 0.78; // spread of the rows across the top
    const amplitude = maxR * 0.12; // sideways swing of each W stroke

    // Plan-view position (along, w) -> 3D point on the drink. The
    // projection drapes the point onto the TRUE surface height at its
    // spot, so the tube follows every bump and dip of the cream (or
    // foam) and sits half-set into it - like a real drizzle on cream.
    const toPoint = (along, w) => {
      const [x, y, z] = projectPoint(
        along * cos - w * sin,
        along * sin + w * cos,
      );
      return new THREE.Vector3(x, y, z);
    };

    // Plan-view corner list of the whole continuous line: zigzag rows
    // (uneven spacing, uneven stroke lengths, uneven swings) joined by
    // short hairpin turns at the edges, boustrophedon style.
    const corners = [];
    let forward = rand() > 0.5; // traversal direction of the first row
    let side = rand() > 0.5 ? 1 : -1;
    for (let p = 0; p < rows; p += 1) {
      // uneven spacing between the rows
      const baseW =
        -halfWid + (p / (rows - 1)) * halfWid * 2 + (rand() - 0.5) * 0.08;
      const chord = Math.sqrt(Math.max(0.01, maxR * maxR - baseW * baseW));
      const strokes = 5 + Math.floor(rand() * 3); // W strokes in this row

      // uneven internal breakpoints -> every stroke gets its own length
      const breaks = Array.from({ length: strokes - 1 }, () => rand()).sort(
        (a, b) => a - b,
      );

      for (let s = 0; s <= strokes; s += 1) {
        const t = s === 0 ? 0 : s < strokes ? breaks[s - 1] : 1;
        corners.push([
          forward ? -chord + t * chord * 2 : chord - t * chord * 2,
          baseW + side * amplitude * (0.55 + rand() * 0.85),
        ]);
        // no flip on the last corner keeps the turn to the next row tight
        if (s < strokes) side *= -1;
      }
      forward = !forward;
    }

    // Drape the straight plan-view strokes onto the surface: intermediate
    // points every ~0.05 units sample the real surface height, so the
    // line follows the dome instead of cutting chords through it.
    const points = [];
    for (let i = 0; i < corners.length - 1; i += 1) {
      const [aAlong, aW] = corners[i];
      const [bAlong, bW] = corners[i + 1];
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(bAlong - aAlong, bW - aW) / 0.05),
      );
      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;
        points.push(
          toPoint(aAlong + (bAlong - aAlong) * t, aW + (bW - aW) * t),
        );
      }
    }
    const [endAlong, endW] = corners[corners.length - 1];
    points.push(toPoint(endAlong, endW));

    // Straight segments joined end to end keep the W corners sharp. The
    // spacing filter skips any points the edge projection pulled onto
    // the same spot, which would break the tube's path frames.
    const path = new THREE.CurvePath();
    let last = null;
    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];
      if (last) {
        if (last.distanceToSquared(p) < 1e-8) continue;
        path.add(new THREE.LineCurve3(last, p));
      }
      last = p;
    }
    return new THREE.TubeGeometry(
      path,
      Math.max(2, path.curves.length),
      0.0125,
      6,
      false,
    );
  }, [index, projectPoint, maxR]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshPhysicalMaterial color={color} roughness={0.2} clearcoat={0.5} />
    </mesh>
  );
}

// The full U-cup frappe. Everything is static - no floating, no pour.
// Printed brand on the cup: the rhombus logo.png with the "Cafétcha"
// name underneath, composited onto one canvas texture and wrapped on a
// slim curved patch hugging the middle of the (slightly tapered) wall.
const BRAND_NAME = "Cafétcha";
const LOGO_SRC = "/images/logo.png";

function CupBrand() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 768;
    const ctx = canvas.getContext("2d");
    const draw = (logo) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (logo) {
        const size = 400;
        ctx.drawImage(logo, (canvas.width - size) / 2, 34, size, size);
      }
      ctx.fillStyle = "#41291c";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.letterSpacing = "7px";
      ctx.font = "italic 600 98px Georgia, 'Times New Roman', serif";
      ctx.fillText(BRAND_NAME, canvas.width / 2, 590);
    };
    draw(null); // name first, so the text shows even before the PNG loads
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const img = new Image();
    img.onload = () => {
      draw(img);
      tex.needsUpdate = true;
    };
    img.src = LOGO_SRC;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  // Conical open patch matching the wall taper (+0.004 clearance).
  const geometry = useMemo(
    () =>
      new THREE.CylinderGeometry(0.793, 0.747, 0.95, 24, 1, true, -0.575, 1.15),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} renderOrder={2}>
      <meshStandardMaterial
        map={texture}
        transparent
        alphaTest={0.08}
        roughness={0.42}
        metalness={0}
        depthWrite={false}
      />
    </mesh>
  );
}

function FrappeCup({ config, flavorOption, cupScale }) {
  const flavorColor = flavorOption?.scene?.color || "#5b3a21";
  const creamColor = flavorOption?.scene?.cream || "#fbf1da";
  const toppings = config.toppings
    .map((id) => getOption("toppings", id))
    .filter(Boolean);
  const addOns = config.addOns
    .map((id) => getOption("addOns", id))
    .filter(Boolean);
  const drizzles = config.drizzles
    .map((id) => getOption("drizzles", id))
    .filter(Boolean);
  const hasCream = toppings.some((option) => option.scene?.type === "cream");
  const creamToppings = toppings.filter(
    (option) => option.scene?.type === "cream",
  );
  const otherToppings = toppings.filter(
    (option) => option.scene?.type !== "cream",
  );

  // Surface toppings settle on: the cream swirl or the flat foam cap.
  const surfaceY = (r) => (hasCream ? creamYAt(r) : TRAY_Y + 0.015);
  // How far the drizzle may reach: all the way across the whipped cream
  // to its very edges, or just inside the foam cap when there is none.
  const drizzleMaxR = hasCream ? CREAM_R - 0.02 : CUP_WALL_R - 0.09;
  // Projects a plan-view drizzle point onto the drink: kept inside the
  // reach circle, pulled back onto the cream's true outer edge wherever
  // the swirl doesn't reach that circle (so the sauce never hovers over
  // the rim gap), then draped onto the exact surface height there -
  // riding the ridges AND valleys with natural contact, with a floor at
  // the drink's foam line so it can never sink below the top. The tiny
  // +0.002 only stops the tube's skin from z-fighting with the cream.
  const projectDrizzle = (x, z) => {
    let r = Math.hypot(x, z);
    if (r > drizzleMaxR) {
      const k = drizzleMaxR / r;
      x *= k;
      z *= k;
    }
    if (hasCream) {
      const edge = creamOuterR(Math.atan2(z, x)) - 0.02;
      r = Math.hypot(x, z);
      if (r > edge) {
        const k = edge / r;
        x *= k;
        z *= k;
      }
      return [x, Math.max(creamSurfaceAt(x, z), TRAY_Y + 0.036) + 0.002, z];
    }
    return [x, TRAY_Y + 0.027, z];
  };

  const glassGeometry = useMemo(
    () =>
      new THREE.LatheGeometry(
        GLASS_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
        64,
      ),
    [],
  );
  // Liquid lathe with baked-in realism: a vertical depth gradient
  // (denser and darker toward the bottom, lighter toward the drink line)
  // and soft blending streaks around the wall and up the height, like a
  // freshly blended frappe - no plain flat colour.
  const liquidGeometry = useMemo(() => {
    const geometry = new THREE.LatheGeometry(
      LIQUID_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      96,
    );
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(flavorColor);
    const rand = mulberry32(seedOf("liquid-streaks"));
    const streakA = 5 + Math.floor(rand() * 4);
    const streakB = 11 + Math.floor(rand() * 5);
    const phaseA = rand() * Math.PI * 2;
    const phaseB = rand() * Math.PI * 2;
    // contrast detail tones derived from the flavour colour, so the
    // details always read against the base: deep cookie-grey streaks on
    // light drinks, creamy milk streaks on dark ones.
    const lum = base.r * 0.2126 + base.g * 0.7152 + base.b * 0.0722;
    const lightDrink = lum > 0.45;
    const streakTint = lightDrink
      ? new THREE.Color("#4e463f").lerp(base, 0.22)
      : new THREE.Color("#f4e7d2").lerp(base, 0.3);
    const tint = new THREE.Color();
    const creamTint = new THREE.Color(flavorColor).lerp(
      new THREE.Color("#fff6e8"),
      0.42,
    );
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const depth = THREE.MathUtils.clamp(
        (y - CUP_BOTTOM_Y) / (LIQUID_TOP_Y - CUP_BOTTOM_Y),
        0,
        1,
      );
      const theta = Math.atan2(z, x);
      let shade =
        (0.76 + 0.32 * depth) * // depth gradient
        (1 +
          0.06 * Math.sin(theta * streakA + phaseA) + // blending streaks
          0.045 * Math.sin(theta * streakB + phaseB) +
          0.03 * Math.sin(y * 9 + phaseA) + // soft horizontal banding
          0.05 * Math.sin(theta * 2 + y * 5.5 + phaseB)); // spiral swirls
      if (depth > 0.93) shade *= 1 + (depth - 0.93) * 1.1; // foam-mix at the line
      tint.copy(base).multiplyScalar(shade);
      // three-octave swirls in the contrast tone - a broad blending
      // spiral, mid swirls and fine streaks - so the drink shows natural
      // flowing swirls instead of a flat solid fill
      const broad = Math.pow(
        0.5 +
          0.5 *
            Math.sin(theta * 1.8 + y * 3.6 + phaseA) *
            Math.sin(theta * 3.2 - y * 2.6 + phaseB),
        1.2,
      );
      const mid = Math.pow(
        0.5 +
          0.5 *
            Math.sin(theta * 4.2 - y * 6.4 + phaseB) *
            Math.sin(y * 8.0 + theta * 2.4 + phaseA),
        1.6,
      );
      const fine = Math.pow(
        0.5 +
          0.5 *
            Math.sin(theta * 7.5 + y * 11.0 + phaseB) *
            Math.sin(y * 14.0 + theta * 3.4 + phaseA),
        2,
      );
      tint.lerp(
        streakTint,
        (lightDrink ? 0.56 : 0.46) * (0.32 * broad + 0.26 * mid + 0.3 * fine),
      );
      // creamy patches winding through the drink (natural variation)
      const creamSwirl =
        0.5 +
        0.5 *
          Math.sin(theta * 1.6 + y * 3.2 + phaseA) *
          Math.cos(y * 2.1 - phaseB);
      tint.lerp(creamTint, 0.05 + 0.07 * creamSwirl);
      // fine speckle grain across the whole liquid
      const grain = hash01(i * 1.37);
      if (grain > 0.965) tint.multiplyScalar(1.09);
      else if (grain < 0.035) tint.multiplyScalar(0.9);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [flavorColor]);

  // Ultra-fine speckles: hundreds of tiny dust dots hugging the liquid
  // wall - cookie crumb dust for flecked flavours, soft tone-on-tone
  // dust for the rest. Small enough to read as natural suspension,
  // numerous enough to stay clearly visible through the glass.
  const specks = useMemo(() => {
    const fine = !!flavorOption?.scene?.flecks;
    const base = new THREE.Color(flavorColor);
    const lum = base.r * 0.2126 + base.g * 0.7152 + base.b * 0.0722;
    const light = lum > 0.45;
    const rand = mulberry32(seedOf("liquid-specks"));
    const count = fine ? 240 : 120;
    return Array.from({ length: count }, () => {
      const y =
        CUP_BOTTOM_Y + 0.14 + rand() * (LIQUID_TOP_Y - CUP_BOTTOM_Y - 0.24);
      const wallR = liquidSurfaceR(y) - 0.003;
      const a = rand() * Math.PI * 2;
      const size = fine ? 0.005 + rand() * 0.009 : 0.004 + rand() * 0.006;
      const tone = rand();
      let color;
      if (fine) {
        color = light
          ? tone > 0.55
            ? "#37312b"
            : tone > 0.25
              ? "#57504a"
              : "#6e675f"
          : tone > 0.55
            ? "#f4e7d2"
            : tone > 0.25
              ? "#e3cba4"
              : "#caa06a";
      } else {
        color = light
          ? new THREE.Color("#5a5148").lerp(base, 0.35).getStyle()
          : new THREE.Color("#f4e7d2").lerp(base, 0.4).getStyle();
      }
      return {
        position: [Math.cos(a) * wallR, y, Math.sin(a) * wallR],
        scale: size * (0.75 + rand() * 0.5),
        color,
      };
    });
  }, [flavorOption, flavorColor]);

  // Foam cap with baked froth texture: swirls, a soft radial gradient
  // and grain across the top surface, so the drink still shows natural
  // detail when the guest orbits to the top view. The thin side band is
  // a touch darker, like a poured cap of foam.
  const foamGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(0.74, 0.77, 0.05, 96, 1, false);
    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cream = new THREE.Color(creamColor);
    const lum = cream.r * 0.2126 + cream.g * 0.7152 + cream.b * 0.0722;
    const streak =
      lum > 0.45
        ? new THREE.Color("#4e463f").lerp(cream, 0.25)
        : new THREE.Color("#f4e7d2").lerp(cream, 0.3);
    const rand = mulberry32(seedOf("foam-cap"));
    const foamA = rand() * TAU;
    const foamB = rand() * TAU;
    const tint = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const r = Math.min(Math.hypot(x, z) / 0.77, 1);
      const theta = Math.atan2(z, x);
      if (y > 0.01) {
        // top surface: froth swirls + radial gradient + grain
        const swirl = Math.pow(
          0.5 +
            0.5 *
              Math.sin(theta * 3.2 + r * 4.2 + foamA) *
              Math.sin(theta * 1.7 - r * 6.0 + foamB),
          1.4,
        );
        const fine = Math.pow(
          0.5 +
            0.5 *
              Math.sin(theta * 8.0 - r * 11.0 + foamB) *
              Math.sin(r * 16.0 + theta * 4.0 + foamA),
          2,
        );
        const grain = hash01(i * 2.13);
        const shade =
          (1.05 - 0.1 * r) * // brighter centre, slightly darker rim
          (1 +
            0.05 * Math.sin(theta * 6.0 + r * 8.0 + foamB) +
            0.04 * Math.sin(r * 13.0 + foamA));
        tint
          .copy(cream)
          .lerp(streak, Math.min(0.34, 0.15 * swirl + 0.2 * fine))
          .multiplyScalar(shade);
        if (grain > 0.96) tint.multiplyScalar(1.07);
        else if (grain < 0.04) tint.multiplyScalar(0.93);
      } else {
        // thin side band
        tint.copy(cream).multiplyScalar(0.94);
      }
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geometry;
  }, [creamColor]);

  // Dust speckles scattered across the foam top - cookie dust on flecked
  // flavours, subtle tone-on-tone dust otherwise. Hidden when whipped
  // cream is selected, since the swirl covers the whole top then.
  const foamSpecks = useMemo(() => {
    const chunky = !!flavorOption?.scene?.flecks;
    const cream = new THREE.Color(creamColor);
    const lum = cream.r * 0.2126 + cream.g * 0.7152 + cream.b * 0.0722;
    const light = lum > 0.45;
    const rand = mulberry32(seedOf("foam-specks"));
    const count = chunky ? 150 : 70;
    return Array.from({ length: count }, () => {
      const r = Math.sqrt(rand()) * 0.71;
      const a = rand() * Math.PI * 2;
      const size = chunky ? 0.005 + rand() * 0.009 : 0.004 + rand() * 0.006;
      const tone = rand();
      let color;
      if (chunky) {
        color = light
          ? tone > 0.5
            ? "#37312b"
            : tone > 0.22
              ? "#57504a"
              : "#6e675f"
          : tone > 0.5
            ? "#e8d3b0"
            : tone > 0.22
              ? "#caa06a"
              : "#a97b4a";
      } else {
        color = light
          ? new THREE.Color("#6b6157").lerp(cream, 0.4).getStyle()
          : new THREE.Color("#fdf6ea").lerp(cream, 0.4).getStyle();
      }
      return {
        position: [Math.cos(a) * r, TRAY_Y + 0.0265, Math.sin(a) * r],
        scale: [
          size * (0.85 + rand() * 0.4),
          size * 0.45,
          size * (0.85 + rand() * 0.4),
        ],
        color,
      };
    });
  }, [flavorOption, creamColor]);

  return (
    <group scale={cupScale * SCENE_SCALE}>
      {/* ---------- Liquid ---------- */}
      <mesh geometry={liquidGeometry} castShadow>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.34}
          clearcoat={0.4}
          clearcoatRoughness={0.3}
          sheen={0.55}
          sheenRoughness={0.55}
          sheenColor="#ffffff"
          envMapIntensity={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Ultra-fine speckle dust hugging the liquid wall - cookies,
          cocoa or fruit dots that show clearly through the glass */}
      <group>
        {specks.map((speck, i) => (
          <mesh key={i} position={speck.position} scale={speck.scale}>
            <sphereGeometry args={[1, 6, 5]} />
            <meshStandardMaterial color={speck.color} roughness={0.9} />
          </mesh>
        ))}
      </group>

      {/* Foam cap the toppings rest on - froth swirls, gradient and
          grain baked into the top so it reads naturally from above */}
      <mesh geometry={foamGeometry} position={[0, TRAY_Y, 0]} castShadow>
        <meshPhysicalMaterial
          vertexColors
          roughness={0.62}
          clearcoat={0.06}
          sheen={0.45}
          sheenRoughness={0.5}
          sheenColor="#ffffff"
        />
      </mesh>

      {/* Dust speckles on the foam top - visible from the top view */}
      {!hasCream && (
        <group>
          {foamSpecks.map((speck, i) => (
            <mesh key={i} position={speck.position} scale={speck.scale}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshStandardMaterial color={speck.color} roughness={0.9} />
            </mesh>
          ))}
        </group>
      )}

      {/* Whipped-cream swirl covering the rim */}
      {creamToppings.map((option) => (
        <WhippedCream key={option.id} />
      ))}

      {/* Toppings settle on the cream swirl / foam */}
      {otherToppings.map((option) => (
        <ToppingMesh key={option.id} option={option} surfaceY={surfaceY} />
      ))}

      {/* Add-ons */}
      {addOns.map((option, index) => (
        <AddOnMesh
          key={option.id}
          option={option}
          index={index}
          surfaceY={surfaceY}
          hasCream={hasCream}
        />
      ))}

      {/* Drizzle lies on top of the drink / cream / toppings */}
      {drizzles.map((option, index) => (
        <SurfaceDrizzle
          key={option.id}
          color={option.scene?.color || "#c0812f"}
          index={index}
          projectPoint={projectDrizzle}
          maxR={drizzleMaxR}
        />
      ))}

      {/* ---------- U-cup glass ---------- */}
      <mesh geometry={glassGeometry} castShadow>
        <meshPhysicalMaterial
          color="#e8f4ff"
          transparent
          opacity={0.3}
          roughness={0.06}
          metalness={0}
          envMapIntensity={1.4}
          clearcoat={1}
          clearcoatRoughness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Printed brand: rhombus logo + Cafétcha name, centred mid-cup */}
      <CupBrand />

      {/* The rim is the bare glass edge - no lid, no cover, no base. */}
    </group>
  );
}

// Reusable 3D stage. Pass it a config from buildFrappeConfig().
//   config      - { size, flavor, toppings[], drizzles[], addOns[], sugar }
//   interactive - allow drag/rotate (false = static preview)
//   autoRotate  - slowly spin when idle
export function FrappeScene3D({
  config,
  interactive = true,
  autoRotate = true,
}) {
  const sizeOption = getOption("size", config.size);
  const flavorOption = getOption("flavor", config.flavor);
  const cupScale = sizeOption?.scene?.cupScale || 1;
  // Shadow plane always hugs the actual bottom of the scaled cup.
  const groundY = CUP_BOTTOM_Y * cupScale * SCENE_SCALE;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3.7, 1.9, 3.8], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight
        position={[4, 6, 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight
        position={[-4, 3, -3]}
        intensity={0.4}
        color="#cfe0ff"
      />
      <pointLight position={[0, 2, 4]} intensity={0.5} color="#ffd9b8" />

      {/* Local environment map - no downloads, same on every device */}
      <Environment resolution={256} frames={1}>
        <Lightformer
          intensity={2.2}
          position={[3, 2, 4]}
          scale={[7, 3, 1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.2}
          position={[-4, 1, -3]}
          scale={[6, 2, 1]}
          color="#bfe0ff"
        />
        <Lightformer
          intensity={1.5}
          position={[0, 5, 0]}
          scale={[9, 1, 1]}
          color="#ffe8c9"
        />
      </Environment>

      <FrappeCup
        config={config}
        flavorOption={flavorOption}
        cupScale={cupScale}
      />

      <ContactShadows
        position={[0, groundY, 0]}
        opacity={0.5}
        scale={8}
        blur={2.4}
        far={2.6}
      />

      {interactive && (
        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          minDistance={2.4}
          maxDistance={8}
          maxPolarAngle={Math.PI / 2.05}
          enablePan={false}
        />
      )}
    </Canvas>
  );
}

export default FrappeScene3D;
