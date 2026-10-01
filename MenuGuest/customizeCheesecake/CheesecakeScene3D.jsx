import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { getOption } from "./customizeCheesecakeData";

// =====================================================================
// MEASUREMENTS
// =====================================================================

const SLICE_THETA = (65 * Math.PI) / 180;

const PLATE_H = 0.05;
const CRUST_H = 0.12;
const BODY_H = 0.3;
const GLAZE_H = 0.05;

const SCENE_SCALE = 0.75;

const SLICE_RADIUS = 0.9;
const HALF_W = Math.sin(SLICE_THETA / 2);

const SLICE_CENTRE =
  (2 * SLICE_RADIUS * Math.sin(SLICE_THETA / 2)) / (3 * (SLICE_THETA / 2));

const TOP_CX = 0;
const TOP_CZ = 0.61;

// =====================================================================
// DETERMINISTIC RANDOM
// =====================================================================

const mulberry32 = (seed) => {
  let a = seed >>> 0;

  return () => {
    a |= 0;
    a = (a + 0x6d2f79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedOf = (text) =>
  String(text)
    .split("")
    .reduce((s, c) => s + c.charCodeAt(0), 0);

// =====================================================================
// SLICE GEOMETRY
// =====================================================================

function makeSectorGeometry(radius, theta, depth) {
  const shape = new THREE.Shape();

  shape.moveTo(0, 0);

  shape.absarc(0, 0, radius, -theta / 2, theta / 2, false);

  shape.lineTo(0, 0);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 32,
  });

  geometry.rotateX(-Math.PI / 2);
  geometry.rotateY(-Math.PI / 2);

  geometry.computeVertexNormals();

  return geometry;
}

const SLICE_GEO = {
  crust: makeSectorGeometry(SLICE_RADIUS, SLICE_THETA, CRUST_H),
  body: makeSectorGeometry(SLICE_RADIUS, SLICE_THETA, BODY_H),
  glaze: makeSectorGeometry(SLICE_RADIUS, SLICE_THETA, GLAZE_H),
};

// =====================================================================
// WHIPPED CREAM
// =====================================================================

function WhippedCream({ y }) {
  const rings = [
    { y: 0.025, r: 0.19, tube: 0.06 },
    { y: 0.075, r: 0.165, tube: 0.056 },
    { y: 0.125, r: 0.135, tube: 0.05 },
    { y: 0.17, r: 0.105, tube: 0.045 },
    { y: 0.215, r: 0.073, tube: 0.039 },
    { y: 0.255, r: 0.04, tube: 0.03 },
  ];

  return (
    <group position={[TOP_CX, y, TOP_CZ]}>
      {rings.map((ring, i) => (
        <mesh
          key={i}
          position={[0, ring.y, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <torusGeometry args={[ring.r, ring.tube, 20, 48]} />

          <meshStandardMaterial color="#fffdf8" roughness={0.38} />
        </mesh>
      ))}

      <mesh position={[0, 0.285, 0]} castShadow>
        <sphereGeometry args={[0.038, 20, 16]} />

        <meshStandardMaterial color="#fffdf8" roughness={0.38} />
      </mesh>
    </group>
  );
}

// =====================================================================
// CREAM HEIGHT PROFILE
// =====================================================================

const CREAM_PROFILE = [
  [0.0, 0.3],
  [0.025, 0.285],
  [0.055, 0.255],
  [0.085, 0.215],
  [0.115, 0.155],
  [0.145, 0.095],
  [0.175, 0.035],
  [0.195, 0.0],
];

function creamSurfaceY(r) {
  for (let i = 1; i < CREAM_PROFILE.length; i++) {
    const [r0, h0] = CREAM_PROFILE[i - 1];
    const [r1, h1] = CREAM_PROFILE[i];

    if (r <= r1) {
      const t = (r - r0) / (r1 - r0);

      return h0 + (h1 - h0) * t;
    }
  }

  return 0;
}

// =====================================================================
// SURFACE
// =====================================================================

function sliceSurfaceY(x, z, hasCream) {
  if (!hasCream) return 0;

  const r = Math.hypot(x - TOP_CX, z - TOP_CZ);

  return creamSurfaceY(r);
}

// =====================================================================
// SLICE BOUNDARY CHECK
// =====================================================================

function insideSlice(x, z, padding = 0.035) {
  const distance = Math.hypot(x, z);

  if (distance > SLICE_RADIUS - padding) {
    return false;
  }

  const maxX = Math.max(0, z * HALF_W - padding);

  return Math.abs(x) <= maxX;
}

// =====================================================================
// LEMON ZEST
// =====================================================================
function LemonZestPiece({ position, rotation, index }) {
  const rand = mulberry32(5100 + index * 29);

  // Short and irregular — real zest strips are small, broken-off
  // curls, not long continuous ribbons.
  const length = 0.02 + rand() * 0.018;
  const half = length / 2;

  const curlY = 0.005 + rand() * 0.009;
  const curlZ = (rand() - 0.5) * 0.016;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-half, 0, 0),
    new THREE.Vector3(-half * 0.45, curlY * 0.55, curlZ * 0.4),
    new THREE.Vector3(0, -curlY * 0.35, -curlZ * 0.3),
    new THREE.Vector3(half * 0.45, curlY * 0.7, curlZ * 0.6),
    new THREE.Vector3(half, curlY * 0.15, -curlZ * 0.5),
  ]);

  const thickness = 0.0032 + rand() * 0.0026;

  const geometry = new THREE.TubeGeometry(curve, 10, thickness, 6, false);

  const colorVariants = ["#f6cf45", "#f8d65a", "#eec73e", "#fbe07a"];
  const color = colorVariants[index % colorVariants.length];
  const roughness = 0.46 + rand() * 0.14;

  return (
    <mesh
      key={index}
      geometry={geometry}
      position={position}
      rotation={rotation}
      castShadow
    >
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

// =====================================================================
// CHOCOLATE / WHITE CHOCOLATE SHAVINGS
// =====================================================================

function createShavingRibbonGeometry(
  seed,
  { length, curlTurns, curlRadius, widthStart, widthEnd, waviness, segments = 22 },
) {
  const rand = mulberry32(seed);

  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = t * Math.PI * 2 * curlTurns;

    // Slight irregularity in the curl radius so it doesn't read as a
    // perfect machine-wound spring.
    const wobble = 1 + (rand() - 0.5) * 0.12;

    const x = (t - 0.5) * length;
    const y = Math.sin(angle) * curlRadius * wobble;
    const z = Math.cos(angle) * curlRadius * wobble;

    points.push(new THREE.Vector3(x, y, z));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const frames = curve.computeFrenetFrames(segments, false);

  const positions = [];
  const normalsArr = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const p = curve.getPointAt(t);
    const binormal = frames.binormals[i];
    const normal = frames.normals[i];

    const width = widthStart + (widthEnd - widthStart) * t;
    const halfW = width / 2;

    // Small ruffle: nudges the ribbon's centreline slightly along its
    // normal so it isn't a perfectly flat plane end-to-end, like a
    // real peeled curl catching light unevenly.
    const ruffle = Math.sin(t * Math.PI * 5 + seed) * waviness;

    const centre = p.clone().addScaledVector(normal, ruffle);

    const p0 = centre.clone().addScaledVector(binormal, -halfW);
    const p1 = centre.clone().addScaledVector(binormal, halfW);

    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    normalsArr.push(
      normal.x,
      normal.y,
      normal.z,
      normal.x,
      normal.y,
      normal.z,
    );
    uvs.push(0, t, 1, t);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;

    indices.push(a, b, c, b, d, c);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(normalsArr, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  geometry.computeVertexNormals();

  return geometry;
}

function CurlyShaving({ position, rotation, color, index, white = false }) {
  const seed = (white ? 6100 : 6600) + index * 47;
  const rand = mulberry32(seed);

  // Real chocolate curls vary a lot piece to piece: some are tight
  // little corkscrews, others are looser, wider, almost-flat peels.
  const length = 0.075 + rand() * 0.055;
  const curlTurns = 0.4 + rand() * 0.9;
  const curlRadius = 0.011 + rand() * 0.017;
  const widthStart = (white ? 0.016 : 0.017) + rand() * 0.009;
  const widthEnd = widthStart * (0.45 + rand() * 0.4);
  const waviness = 0.004 + rand() * 0.004;

  const geometry = createShavingRibbonGeometry(seed, {
    length,
    curlTurns,
    curlRadius,
    widthStart,
    widthEnd,
    waviness,
  });

  return (
    <mesh
      key={index}
      geometry={geometry}
      position={position}
      rotation={rotation}
      castShadow
    >
      <meshStandardMaterial
        color={color}
        roughness={white ? 0.32 : 0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// =====================================================================
// GRAHAM CRUMB
// =====================================================================

function createIrregularCrumbGeometry(seed) {
  const geometry = new THREE.DodecahedronGeometry(0.011, 0);
  const rand = mulberry32(seed);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const jitter = 0.4;

    position.setXYZ(
      i,
      position.getX(i) * (1 + (rand() - 0.5) * jitter),
      position.getY(i) * (1 + (rand() - 0.5) * jitter),
      position.getZ(i) * (1 + (rand() - 0.5) * jitter),
    );
  }

  geometry.computeVertexNormals();

  return geometry;
}

// A handful of distinct irregular-crumb shapes, reused (not one per
// instance) to keep this cheap while still looking non-uniform.
const CRUMB_GEO_VARIANTS = Array.from({ length: 10 }, (_, i) =>
  createIrregularCrumbGeometry(4200 + i * 53),
);

function GrahamCrumb({ position, rotation, scale, index, cluster = false }) {
  const colors = ["#9b632b", "#aa7033", "#b97e3d", "#c78c46", "#d29b52"];

  const geometry = CRUMB_GEO_VARIANTS[index % CRUMB_GEO_VARIANTS.length];

  return (
    <mesh
      key={index}
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
      receiveShadow={cluster}
    >
      <meshStandardMaterial
        color={colors[index % colors.length]}
        roughness={cluster ? 0.86 : 0.82}
      />
    </mesh>
  );
}

// =====================================================================
// CRUST CRUMB EDGE — crumbly base texture
// =====================================================================

const CRUST_EDGE_Z_MAX = 0.84;

function buildCrustCrumbEdge() {
  const rand = mulberry32(seedOf("crust-crumb-edge-cheesecake"));
  const pieces = [];

  // ---- Straight side edges (left & right cut faces) ----
  const straightSteps = 24;

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < straightSteps; i++) {
      const t = i / (straightSteps - 1);

      const z = 0.08 + t * (CRUST_EDGE_Z_MAX - 0.12);

      // Small outward push + jitter so crumbs don't sit in a
      // perfectly straight, mechanical line.
      const outward = 0.004 + rand() * 0.012;

      const x = side * (z * HALF_W + outward);

      pieces.push({
        x,
        z: z + (rand() - 0.5) * 0.02,
        yFrac: rand(),
        scale: 0.5 + rand() * 0.55,
        rotation: [
          (rand() - 0.5) * Math.PI * 2,
          rand() * Math.PI * 2,
          (rand() - 0.5) * Math.PI * 2,
        ],
        seedIndex: Math.floor(rand() * 4096),
      });
    }
  }

  // ---- Curved back / outer edge ----
  const arcSteps = 20;

  for (let i = 0; i < arcSteps; i++) {
    const t = i / (arcSteps - 1);

    const angle = -SLICE_THETA / 2 + t * SLICE_THETA;

    const r = SLICE_RADIUS - 0.01 + rand() * 0.018;

    pieces.push({
      x: r * Math.sin(angle),
      z: r * Math.cos(angle),
      yFrac: rand(),
      scale: 0.5 + rand() * 0.6,
      rotation: [
        (rand() - 0.5) * Math.PI * 2,
        rand() * Math.PI * 2,
        (rand() - 0.5) * Math.PI * 2,
      ],
      seedIndex: Math.floor(rand() * 4096),
    });
  }

  return pieces;
}

const CRUST_CRUMB_EDGE_PIECES = buildCrustCrumbEdge();

function buildFallenCrumbs() {
  const rand = mulberry32(seedOf("fallen-crumbs-cheesecake"));
  const pieces = [];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const useArc = rand() < 0.45;

    let x;
    let z;

    if (useArc) {
      const angle = -SLICE_THETA / 2 + rand() * SLICE_THETA;
      const r = SLICE_RADIUS + 0.02 + rand() * 0.055;

      x = r * Math.sin(angle);
      z = r * Math.cos(angle);
    } else {
      const side = rand() < 0.5 ? -1 : 1;
      const z0 = 0.1 + rand() * (CRUST_EDGE_Z_MAX - 0.18);

      x = side * (z0 * HALF_W + 0.02 + rand() * 0.055);
      z = z0 + (rand() - 0.5) * 0.05;
    }

    pieces.push({
      x,
      z,
      scale: 0.45 + rand() * 0.5,
      rotation: [
        (rand() - 0.5) * Math.PI * 2,
        rand() * Math.PI * 2,
        (rand() - 0.5) * Math.PI * 2,
      ],
      seedIndex: Math.floor(rand() * 4096),
    });
  }

  return pieces;
}

const FALLEN_CRUMB_PIECES = buildFallenCrumbs();

function CrustCrumbs({ crustBaseY }) {
  return (
    <group>
      {CRUST_CRUMB_EDGE_PIECES.map((p, i) => (
        <GrahamCrumb
          key={`crust-edge-${i}`}
          index={p.seedIndex}
          position={[
            p.x,
            crustBaseY + 0.012 + p.yFrac * (CRUST_H - 0.024),
            p.z,
          ]}
          rotation={p.rotation}
          scale={[p.scale, p.scale * 0.85, p.scale]}
        />
      ))}

      {FALLEN_CRUMB_PIECES.map((p, i) => (
        <GrahamCrumb
          key={`fallen-${i}`}
          index={p.seedIndex}
          position={[p.x, crustBaseY + 0.006, p.z]}
          rotation={p.rotation}
          scale={[p.scale, p.scale * 0.7, p.scale]}
        />
      ))}
    </group>
  );
}

// =====================================================================
// SCATTER ZONES
// =====================================================================

const SCATTER_ZONES = [
  // Tip (thin front end)
  [0.0, 0.1],
  [-0.025, 0.16],
  [0.025, 0.16],

  // Front third
  [0.0, 0.22],
  [-0.07, 0.22],
  [0.07, 0.22],

  [0.0, 0.3],
  [-0.1, 0.3],
  [0.1, 0.3],

  [0.0, 0.38],
  [-0.13, 0.38],
  [0.13, 0.38],

  // Middle
  [-0.16, 0.46],
  [0.0, 0.46],
  [0.16, 0.46],

  [-0.18, 0.54],
  [0.0, 0.54],
  [0.18, 0.54],

  [-0.21, 0.62],
  [0.0, 0.62],
  [0.21, 0.62],

  // Back (thick rounded end)
  [-0.24, 0.7],
  [0.0, 0.7],
  [0.24, 0.7],

  [-0.27, 0.78],
  [0.0, 0.78],
  [0.27, 0.78],

  [-0.24, 0.82],
  [0.0, 0.84],
  [0.24, 0.82],
];

// -----------------------------------------------------------------
// RANDOM WEDGE SAMPLING (toppings)
// -----------------------------------------------------------------

function randomWedgePoint(
  rand,
  { padding = 0.02, zMin = 0.05, zMax = SLICE_RADIUS - 0.03 } = {},
) {
  for (let attempt = 0; attempt < 40; attempt++) {
    // Bias z toward the (wider) back of the wedge so sample density
    // reads as roughly uniform across the sector's area, since the
    // wedge is narrow near the tip and wide near the back.
    const u = rand();
    const z = Math.sqrt(u * (zMax * zMax - zMin * zMin) + zMin * zMin);

    const maxX = Math.max(0.02, z * HALF_W);
    const x = (rand() * 2 - 1) * maxX;

    if (insideSlice(x, z, padding)) {
      return { x, z };
    }
  }

  return { x: 0, z: (zMin + zMax) / 2 };
}

function randomWedgeEdgePoint(
  rand,
  { bandWidth = 0.05, zMin = 0.06, zMax = SLICE_RADIUS - 0.03 } = {},
) {
  // Picks a point close to one of the wedge's three exposed edges
  // (left cut face, right cut face, curved back edge), weighted
  // roughly by each edge's length, then jitters slightly inward.
  const straightLength = zMax - zMin;
  const arcLength = SLICE_RADIUS * SLICE_THETA;
  const total = straightLength * 2 + arcLength;

  const r = rand() * total;

  if (r < straightLength) {
    const z = zMin + rand() * straightLength;
    const inward = rand() * bandWidth;

    return { x: -(z * HALF_W - inward), z };
  }

  if (r < straightLength * 2) {
    const z = zMin + rand() * straightLength;
    const inward = rand() * bandWidth;

    return { x: z * HALF_W - inward, z };
  }

  const angle = -SLICE_THETA / 2 + rand() * SLICE_THETA;
  const inward = rand() * bandWidth;
  const radius = SLICE_RADIUS - inward;

  return { x: radius * Math.sin(angle), z: radius * Math.cos(angle) };
}

// A few fixed spots for the "larger visible crumb cluster" pass.
const GRAHAM_CLUSTER_ZONES = [
  [-0.19, 0.4],
  [0.21, 0.58],
  [-0.09, 0.75],
];

// =====================================================================
// TOPPING LAYOUT 
// =====================================================================

function buildToppingLayout({ toppings, hasCream, avoidSpots = [] }) {
  const pieces = [];

  const toppingTypes = [];

  toppings.forEach((t) => {
    const type = getOption("toppings", t.id)?.scene?.type;

    if (type && !toppingTypes.includes(type)) {
      toppingTypes.push(type);
    }
  });

  // -------------------------------------------------------------
  // Topping counts
  // -------------------------------------------------------------

  const COUNTS = {
    zest: 90,
    "white-shav": 50,
    graham: 480,
    "choc-shav": 50,
  };

  // Graham crumbs sit a touch too flush with the cream surface once
  // placed there. This extra lift is added on top of the normal
  // cream baseHeight (below) for graham pieces only, so they read as
  // sitting more visibly on top of the whipped cream rather than
  // resting right at its surface. Non-embedded pieces only —
  // embedded crumbs are meant to look sunk in, so they're untouched.
  const GRAHAM_CREAM_LIFT = 0.016;

  const isNearAvoidSpot = (x, z) =>
    avoidSpots.some((spot) => Math.hypot(x - spot.x, z - spot.z) < spot.radius);

  toppingTypes.forEach((type, typeIndex) => {
    const count = COUNTS[type] || 20;

    const rand = mulberry32(seedOf(`${type}-${typeIndex}-cheesecake`));

    const isGraham = type === "graham";

    for (let i = 0; i < count; i++) {
      // Graham crumbs lean toward the wedge's edges about 60% of the
      // time (so the rim still reads as denser, like real crumb
      // garnish settling), the rest placed fully at random. Every
      // other topping is placed fully at random across the whole top
      // surface — no fixed zone list, so no repeating pattern.
      const useEdge = isGraham && rand() < 0.6;

      const point = useEdge
        ? randomWedgeEdgePoint(rand)
        : randomWedgePoint(rand);

      const x = point.x;
      const z = point.z;

      // Additional safety.
      if (!insideSlice(x, z, 0.02)) {
        continue;
      }

      // Fewer graham crumbs directly beneath large fruit/bar
      // garnish — thin the scatter there rather than removing it
      // outright.
      if (isGraham && isNearAvoidSpot(x, z) && rand() < 0.75) {
        continue;
      }

      const creamHeight = hasCream
        ? creamSurfaceY(Math.hypot(x - TOP_CX, z - TOP_CZ))
        : 0;

      const baseHeight = hasCream ? 0.026 : 0.032;

      let heightOffset;

      const embedded = isGraham && rand() < 0.4;

      if (embedded) {
        heightOffset = creamHeight + (-0.006 + rand() * 0.008);
      } else {
        heightOffset =
          creamHeight +
          baseHeight +
          rand() * 0.018 +
          (isGraham && hasCream ? GRAHAM_CREAM_LIFT : 0);
      }

      // Graham crumbs tumble freely (full-range rotation on every
      // axis); other toppings keep their original gentler tilt.
      const rotation = isGraham
        ? [
            (rand() - 0.5) * Math.PI * 2,
            rand() * Math.PI * 2,
            (rand() - 0.5) * Math.PI * 2,
          ]
        : [
            (rand() - 0.5) * 0.9,
            rand() * Math.PI * 2,
            (rand() - 0.5) * 0.9,
          ];

      pieces.push({
        type,
        x,
        z,

        y: heightOffset,

        rotation,

        index: i,

        embedded,
      });
    }

    // -----------------------------------------------------------
    // A FEW LARGER, VISIBLE CRUMB CLUSTERS (graham only)
    // -----------------------------------------------------------

    if (isGraham) {
      const clusterRand = mulberry32(seedOf("graham-clusters-cheesecake"));

      GRAHAM_CLUSTER_ZONES.forEach((zone, ci) => {
        const clusterSize = 4 + Math.floor(clusterRand() * 3); // 4-6 pieces

        for (let k = 0; k < clusterSize; k++) {
          const x = zone[0] + (clusterRand() - 0.5) * 0.05;

          const z = zone[1] + (clusterRand() - 0.5) * 0.045;

          if (!insideSlice(x, z, 0.02)) {
            continue;
          }

          const creamHeight = hasCream
            ? creamSurfaceY(Math.hypot(x - TOP_CX, z - TOP_CZ))
            : 0;

          pieces.push({
            type,
            x,
            z,

            y:
              creamHeight +
              0.034 +
              clusterRand() * 0.02 +
              (hasCream ? GRAHAM_CREAM_LIFT : 0),

            rotation: [
              (clusterRand() - 0.5) * Math.PI * 2,
              clusterRand() * Math.PI * 2,
              (clusterRand() - 0.5) * Math.PI * 2,
            ],

            index: 900 + ci * 10 + k,

            cluster: true,
          });
        }
      });
    }
  });

  return pieces;
}

// =====================================================================
// RENDER TOPPINGS
// =====================================================================

function ScatterToppings({ y, pieces }) {
  return (
    <group>
      {pieces.map((p, i) => {
        const position = [p.x, y + p.y, p.z];

        // -----------------------------------------------------------
        // LEMON ZEST
        // -----------------------------------------------------------

        if (p.type === "zest") {
          return (
            <LemonZestPiece
              key={`zest-${i}`}
              index={i}
              position={position}
              rotation={p.rotation}
            />
          );
        }

        // -----------------------------------------------------------
        // WHITE CHOCOLATE
        // -----------------------------------------------------------

        if (p.type === "white-shav") {
          return (
            <CurlyShaving
              key={`white-${i}`}
              index={i}
              position={position}
              rotation={p.rotation}
              color="#fff7e9"
              white
            />
          );
        }

        // -----------------------------------------------------------
        // DARK CHOCOLATE
        // -----------------------------------------------------------

        if (p.type === "choc-shav") {
          return (
            <CurlyShaving
              key={`choc-${i}`}
              index={i}
              position={position}
              rotation={p.rotation}
              color={
                i % 3 === 0 ? "#32170d" : i % 3 === 1 ? "#4a2818" : "#5a321e"
              }
            />
          );
        }

        // -----------------------------------------------------------
        // GRAHAM CRUMBS
        // -----------------------------------------------------------

        if (p.type === "graham") {
          if (p.cluster) {
            const s = 1.7 + (i % 3) * 0.35;

            return (
              <GrahamCrumb
                key={`graham-cluster-${i}`}
                index={p.index}
                position={position}
                rotation={p.rotation}
                scale={[
                  s * (0.85 + (i % 4) * 0.08),
                  s * (0.7 + (i % 3) * 0.1),
                  s * (0.8 + (i % 5) * 0.07),
                ]}
                cluster
              />
            );
          }

          const scale = [0.4, 0.5, 0.6, 0.7, 0.85][i % 5];

          return (
            <GrahamCrumb
              key={`graham-${i}`}
              index={p.index}
              position={position}
              rotation={p.rotation}
              scale={[
                scale * (0.75 + (i % 4) * 0.13),
                (p.embedded ? 0.35 : 0.5) + (i % 4) * 0.13,
                scale * (0.65 + (i % 3) * 0.14),
              ]}
            />
          );
        }

        return null;
      })}
    </group>
  );
}

// =====================================================================
// BLUEBERRIES — SCATTERED GARNISH
// =====================================================================

function createBlueberryGeometry(seed) {
  const radius = 0.041;
  const geometry = new THREE.IcosahedronGeometry(radius, 3);
  const rand = mulberry32(seed);
  const position = geometry.attributes.position;
  const vertex = new THREE.Vector3();

  const lobes = Array.from({ length: 3 }, () => ({
    dir: new THREE.Vector3(
      rand() - 0.5,
      rand() - 0.5,
      rand() - 0.5,
    ).normalize(),
    strength: 0.05 + rand() * 0.06,
  }));

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);
    const normalized = vertex.clone().normalize();

    // Smooth low-frequency deformation (overall lumpy, non-spherical
    // shape) driven by a few random directional "lobes".
    let lobeFactor = 1;

    lobes.forEach((lobe) => {
      const align = Math.max(0, normalized.dot(lobe.dir));
      lobeFactor += align * align * lobe.strength;
    });

    vertex.multiplyScalar(lobeFactor);

    // Tiny high-frequency surface roughness.
    const roughnessNoise =
      Math.sin(vertex.x * 180 + seed) *
      Math.cos(vertex.y * 160 + seed * 1.7) *
      Math.sin(vertex.z * 170 - seed * 0.6);

    vertex.multiplyScalar(1 + roughnessNoise * 0.015);

    // Subtle indentation at the top (calyx / stem scar).
    const topFactor = THREE.MathUtils.smoothstep(normalized.y, 0.55, 1);

    if (topFactor > 0) {
      const pull = topFactor * 0.3;

      vertex.y -= pull * radius;
      vertex.x *= 1 - pull * 0.3;
      vertex.z *= 1 - pull * 0.3;
    }

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.computeVertexNormals();

  return geometry;
}

// Reused pool of distinct berry shapes (cheap, still reads as varied).
const BLUEBERRY_GEO_VARIANTS = Array.from({ length: 8 }, (_, i) =>
  createBlueberryGeometry(7100 + i * 37),
);

function FreshBlueberries({ y, spots, surfaceAt }) {
  return (
    <group>
      {spots.map((s, i) => {
        const h = surfaceAt(s.x, s.z);

        const rand = mulberry32(seedOf(`blueberry-${i}-cheesecake`));

        // Slight per-berry size variation.
        const berryScale = 0.85 + rand() * 0.3;

        // Random tumble — the dimple and stem scar are both authored
        // at the local +Y pole, so they rotate together and stay
        // aligned no matter the orientation.
        const rotation = [
          rand() * Math.PI * 2,
          rand() * Math.PI * 2,
          rand() * Math.PI * 2,
        ];

        // Original alternating blueberry color, plus a tiny
        // per-berry roughness jitter so the skin isn't uniform.
        const color = i % 2 === 0 ? "#263f91" : "#3152aa";
        const roughness = 0.26 + rand() * 0.16;

        const geometry =
          BLUEBERRY_GEO_VARIANTS[i % BLUEBERRY_GEO_VARIANTS.length];

        return (
          <group
            key={i}
            position={[s.x, y + h + 0.04 * berryScale, s.z]}
            rotation={rotation}
            scale={berryScale}
          >
            <mesh geometry={geometry} castShadow>
              <meshStandardMaterial color={color} roughness={roughness} />
            </mesh>

            <mesh position={[0, 0.028, 0]}>
              <cylinderGeometry args={[0.009, 0.014, 0.007, 6]} />

              <meshStandardMaterial color="#182d6d" roughness={0.42} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// =====================================================================
// STRAWBERRY BODY
// =====================================================================

function StrawberryBody() {
  const points = [
    new THREE.Vector2(0.006, -0.09),
    new THREE.Vector2(0.025, -0.078),
    new THREE.Vector2(0.045, -0.055),
    new THREE.Vector2(0.06, -0.02),
    new THREE.Vector2(0.072, 0.02),
    new THREE.Vector2(0.069, 0.048),
    new THREE.Vector2(0.056, 0.07),
    new THREE.Vector2(0.035, 0.086),
    new THREE.Vector2(0.0, 0.092),
  ];

  return new THREE.LatheGeometry(points, 32);
}

// =====================================================================
// STRAWBERRY SEEDS — FULL SURFACE COVERAGE
// FINAL BACK-MIDDLE VISIBILITY FIX
// =====================================================================

function StrawberrySeeds() {
  const seeds = [];

  const rows = [
    { y: 0.087, radiusX: 0.014, radiusZ: 0.014, count: 5, offset: 0 },
    { y: 0.078, radiusX: 0.03, radiusZ: 0.025, count: 8, offset: Math.PI / 8 },
    { y: 0.068, radiusX: 0.044, radiusZ: 0.037, count: 10, offset: 0 },
    {
      y: 0.056,
      radiusX: 0.052,
      radiusZ: 0.046,
      count: 11,
      offset: Math.PI / 11,
    },
    { y: 0.034, radiusX: 0.059, radiusZ: 0.054, count: 12, offset: 0 },
    {
      y: 0.014,
      radiusX: 0.062,
      radiusZ: 0.058,
      count: 12,
      offset: Math.PI / 12,
    },
    { y: -0.009, radiusX: 0.06, radiusZ: 0.056, count: 11, offset: 0 },
    {
      y: -0.032,
      radiusX: 0.053,
      radiusZ: 0.048,
      count: 10,
      offset: Math.PI / 10,
    },
    { y: -0.054, radiusX: 0.04, radiusZ: 0.035, count: 8, offset: 0 },
    {
      y: -0.073,
      radiusX: 0.023,
      radiusZ: 0.02,
      count: 5,
      offset: Math.PI / 5,
    },
  ];

  rows.forEach((row, rowIndex) => {
    for (let i = 0; i < row.count; i++) {
      const angle = (i / row.count) * Math.PI * 2 + row.offset;

      const x = Math.cos(angle) * row.radiusX;
      const z = Math.sin(angle) * row.radiusZ;

      const length = Math.sqrt(x * x + z * z);

      let outward = 0.005;

      if (row.y >= 0.056) {
        outward = 0.014;
      } else if (row.y >= 0.034) {
        outward = 0.009;
      } else if (row.y >= -0.009) {
        outward = z > 0 ? 0.014 : 0.008;
      } else {
        outward = 0.007;
      }

      const sx = length > 0 ? x + (x / length) * outward : x;

      const sz = length > 0 ? z + (z / length) * outward : z;

      let sy = row.y;

      if (z > 0 && row.y >= -0.009 && row.y <= 0.034) {
        sy += 0.0025;
      }

      seeds.push({ x: sx, y: sy, z: sz, angle, rowIndex });
    }
  });

  return (
    <group>
      {seeds.map((s, i) => {
        const seedScale =
          s.rowIndex <= 3 ? [0.95, 1.5, 0.95] : [0.8, 1.35, 0.8];

        return (
          <mesh
            key={i}
            position={[s.x, s.y, s.z]}
            rotation={[0, -s.angle, 0.2]}
            scale={seedScale}
            castShadow
          >
            <sphereGeometry args={[0.0055, 8, 8]} />

            <meshStandardMaterial
              color={i % 3 === 0 ? "#fff0ad" : "#ffe59a"}
              roughness={0.34}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// =====================================================================
// STRAWBERRY LEAVES — TIGHT CROWN / CALYX STYLE
// =====================================================================

function StrawberryLeaves() {
  const leaves = [
    { rot: 0, tilt: -0.62, scale: 1.08 },
    { rot: (Math.PI * 2) / 5, tilt: -0.67, scale: 1.05 },
    { rot: (Math.PI * 4) / 5, tilt: -0.7, scale: 1.05 },
    { rot: (Math.PI * 6) / 5, tilt: -0.67, scale: 1.05 },
    { rot: (Math.PI * 8) / 5, tilt: -0.62, scale: 1.08 },
  ];

  return (
    <group position={[0, 0.088, 0]}>
      <mesh position={[0, 0.014, 0]} scale={[1.15, 0.72, 1.15]} castShadow>
        <sphereGeometry args={[0.029, 20, 12]} />

        <meshStandardMaterial color="#3f8233" roughness={0.56} />
      </mesh>

      {leaves.map((leaf, i) => (
        <group key={i} rotation={[0, leaf.rot, 0]} scale={leaf.scale}>
          <mesh
            position={[0, 0.018, 0.025]}
            rotation={[leaf.tilt, 0, 0]}
            castShadow
          >
            <coneGeometry args={[0.034, 0.095, 7]} />

            <meshStandardMaterial
              color={i % 2 === 0 ? "#3d7c31" : "#4e923d"}
              roughness={0.56}
            />
          </mesh>
        </group>
      ))}

      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;

        return (
          <mesh
            key={`inner-${i}`}
            position={[Math.cos(angle) * 0.009, 0.026, Math.sin(angle) * 0.009]}
            rotation={[-0.42, angle, 0.08]}
            scale={[0.82, 0.82, 0.82]}
            castShadow
          >
            <coneGeometry args={[0.027, 0.065, 7]} />

            <meshStandardMaterial color="#478b38" roughness={0.55} />
          </mesh>
        );
      })}
    </group>
  );
}

// =====================================================================
// REALISTIC STRAWBERRY
// =====================================================================
function RealisticStrawberry({ position, rotation, scale = 1 }) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={StrawberryBody()} castShadow receiveShadow>
        <meshStandardMaterial color="#d72e32" roughness={0.3} />
      </mesh>

      <mesh position={[0, -0.091, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.012, 0.032, 10]} />

        <meshStandardMaterial color="#bd2429" roughness={0.34} />
      </mesh>

      <StrawberrySeeds />

      <StrawberryLeaves />
    </group>
  );
}

// =====================================================================
// STRAWBERRIES — FOCAL-POINT GARNISH (3 berries, hero + 2 supporting)
// =====================================================================
function FreshStrawberries({ y, spots, surfaceAt }) {
  return (
    <group>
      {spots.map((s, i) => {
        const h = surfaceAt(s.x, s.z);

        const scale = s.scale;

        return (
          <RealisticStrawberry
            key={i}
            // Slightly raised (0.1 -> 0.12) so the focal cluster sits
            // a touch proud of the surrounding toppings/glaze.
            position={[s.x, y + h + 0.12 * scale, s.z]}
            rotation={[0, s.yaw, 0]}
            scale={scale}
          />
        );
      })}
    </group>
  );
}

// =====================================================================
// MANGO — SCATTERED GARNISH
// =====================================================================

const MANGO_SIZES = [
  { w: 0.13, d: 0.075, h: 0.042 },
  { w: 0.1, d: 0.085, h: 0.04 },
  { w: 0.12, d: 0.075, h: 0.043 },
  { w: 0.105, d: 0.075, h: 0.04 },
];

function MangoSlices({ y, spots, surfaceAt }) {
  return (
    <group>
      {spots.map((s, i) => {
        const size = MANGO_SIZES[i % MANGO_SIZES.length];

        const h = surfaceAt(s.x, s.z);

        return (
          <RoundedBox
            key={i}
            args={[size.w, size.h, size.d]}
            radius={0.008}
            smoothness={4}
            position={[s.x, y + h + size.h / 2 + 0.022, s.z]}
            rotation={[
              s.roll * 0.3,
              s.yaw,
              (i % 2 === 0 ? -1 : 1) * 0.06,
            ]}
            castShadow
          >
            <meshStandardMaterial
              color={
                i % 4 === 0
                  ? "#f7a719"
                  : i % 4 === 1
                    ? "#ffb72f"
                    : i % 4 === 2
                      ? "#f39a12"
                      : "#ffc13b"
              }
              roughness={0.36}
            />
          </RoundedBox>
        );
      })}
    </group>
  );
}

// =====================================================================
// CHOCOLATE BAR GARNISH — CENTERED STACKED FOCAL PILE (v5)
// =====================================================================

const CHOC_BAR_COLORS = ["#3a2114", "#402616", "#341d10"];
const CHOC_BAR_FOOTPRINT_RADIUS = 0.22;
const CHOC_BAR_PIECE_COUNT = 3;

// Target center point for the pile — aligned with the whipped
// cream's own center (TOP_CX, TOP_CZ), so the pile reads as sitting
// deliberately in the middle of the cream swirl rather than off to
// one side of it.
const CHOC_BAR_CENTER = { x: TOP_CX, z: TOP_CZ };

// Extra lift added on top of the read surface height so the pile
// clears the whipped-cream dollop/rings at the swirl's peak (which
// rise a bit above the flat cream-profile height used for surface
// placement) instead of sinking into it.
const CHOC_BAR_LIFT = 0.040;

// When whipped cream is present, the pile is centered on the cream's
// peak (r=0 in CREAM_PROFILE, the tallest point of the swirl), so
// CHOC_BAR_LIFT alone would leave it perched right at the very tip.
// This pulls it back down so the pile nestles into the swirl -
// resting against the upper rings - instead of sitting at the very
// topmost point.
const CHOC_BAR_CREAM_SINK = 0.11;

function buildChocBarLayout({ hasBar, avoidSpots = [] }) {
  if (!hasBar) return null;

  const rand = mulberry32(seedOf("chocolate-bar-cheesecake"));

  // Try the exact center first; only if something else (fruit
  // garnish) already occupies that spot does the pile drift outward,
  // in a small jittered spiral, to the nearest clear spot.
  let spot = null;

  for (let attempt = 0; attempt < 30; attempt++) {
    const jitterRadius = attempt === 0 ? 0 : 0.015 + attempt * 0.012;
    const angle = rand() * Math.PI * 2;

    const candidate = {
      x:
        CHOC_BAR_CENTER.x +
        (attempt === 0 ? 0 : Math.cos(angle) * jitterRadius),
      z:
        CHOC_BAR_CENTER.z +
        (attempt === 0 ? 0 : Math.sin(angle) * jitterRadius),
    };

    if (!insideSlice(candidate.x, candidate.z, 0.16)) {
      continue;
    }

    const clear = !avoidSpots.some(
      (s) =>
        Math.hypot(candidate.x - s.x, candidate.z - s.z) < s.radius + 0.13,
    );

    if (clear) {
      spot = candidate;
      break;
    }
  }

  if (!spot) {
    spot = { ...CHOC_BAR_CENTER };
  }

  // Build a small loosely-stacked pile: piece 0 is the base resting
  // flat-ish on the surface; each following piece is smaller, offset
  // from the one below by a random amount (sometimes barely, so it
  // looks precarious/leaning), and tilted at a random angle, as if
  // dropped rather than carefully placed. `size` is the side length
  // of ONE square in that piece's two-square segment (see
  // ChocBarSegment) — the piece's actual footprint is roughly
  // 2 x size along its local x-axis.
  const pieces = [];
  let stackHeight = 0;
  let prevSize = null;

  for (let i = 0; i < CHOC_BAR_PIECE_COUNT; i++) {
    // Each piece shrinks a little going up the pile, on top of its
    // own random variation, so the stack silhouette narrows upward
    // like real stacked bar segments rather than three identical
    // pieces.
    const shrink = 1 - i * 0.12;

    const size = (0.09 + rand() * 0.03) * shrink;
    const thickness = 0.03 + rand() * 0.012;

    const offsetRange = i === 0 ? 0 : (prevSize ?? size) * 0.5;

    const offsetX = i === 0 ? 0 : (rand() - 0.5) * offsetRange;
    const offsetZ = i === 0 ? 0 : (rand() - 0.5) * offsetRange;

    // The base piece sits close to flat with only a faint resting
    // tilt; pieces stacked on top lean more noticeably, like broken
    // bar segments balanced against each other.
    const tiltRange = i === 0 ? 0.08 : 0.38;

    const tiltX = (rand() - 0.5) * tiltRange;
    const tiltZ = (rand() - 0.5) * tiltRange;
    const yaw = rand() * Math.PI * 2;

    pieces.push({
      size,
      thickness,
      offsetX,
      offsetZ,
      tiltX,
      tiltZ,
      yaw,
      y: stackHeight,
      colorIndex: Math.floor(rand() * CHOC_BAR_COLORS.length),
    });

    // Rough lift for the next piece to rest on top of this one. Using
    // less than the full thickness accounts for the tilt letting one
    // edge sink slightly into the piece below, so the stack doesn't
    // look like it's floating piece-to-piece.
    stackHeight += thickness * 0.85;
    prevSize = size;
  }

  return {
    x: spot.x,
    z: spot.z,
    baseYaw: rand() * Math.PI * 2,
    pieces,
  };
}

// A rectangular chocolate-bar segment made of two connected squares:
// two square tiles placed side by side along the local x-axis, with
// a thin scored groove running down the seam between them — the
// classic look of a snapped-off two-square piece of a chocolate bar,
// rather than a single plain square block.
function ChocBarSegment({ size, thickness, color }) {
  const seam = 0.0015;
  const half = size / 2;

  return (
    <group>
      {[-1, 1].map((side) => (
        <RoundedBox
          key={side}
          args={[size - seam, thickness, size]}
          radius={0.006}
          smoothness={5}
          position={[side * (half + seam / 2), thickness / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={color} roughness={0.32} />
        </RoundedBox>
      ))}

      {/* Scored groove marking where the two squares are joined */}
      <mesh position={[0, thickness - 0.0015, 0]}>
        <boxGeometry args={[size * 0.02, 0.003, size * 0.94]} />

        <meshStandardMaterial color="#20110a" roughness={0.6} />
      </mesh>
    </group>
  );
}

function ChocolateBar({ y, surfaceAt, spot, hasCream }) {
  if (!spot) return null;

  const groundY =
    y +
    surfaceAt(spot.x, spot.z) +
    CHOC_BAR_LIFT -
    (hasCream ? CHOC_BAR_CREAM_SINK : 0);

  return (
    <group
      position={[spot.x, groundY, spot.z]}
      rotation={[0, spot.baseYaw, 0]}
    >
      {spot.pieces.map((p, i) => (
        <group
          key={i}
          position={[p.offsetX, p.y, p.offsetZ]}
          rotation={[p.tiltX, p.yaw, p.tiltZ]}
        >
          <ChocBarSegment
            size={p.size}
            thickness={p.thickness}
            color={CHOC_BAR_COLORS[p.colorIndex]}
          />
        </group>
      ))}
    </group>
  );
}

// =====================================================================
// FRUIT (GARNISH) LAYOUT — SCATTERED
// =====================================================================

const FRUIT_ORDER = ["blueberry", "strawberry", "mango"];

const FRUIT_SPECS = {
  blueberry: { count: 16, pad: 0.06 },
  strawberry: { count: 3, pad: 0.13 },
  mango: { count: 9, pad: 0.08 },
};

const FRUIT_ZONE_STRIDE = 7;

// -----------------------------------------------------------------
// STRAWBERRIES — FOCAL-POINT CLUSTER
// -----------------------------------------------------------------

const STRAWBERRY_STRATEGIC_SPOTS = [
  { x: 0.02, z: 0.44, clearRadius: 0.15 }, // hero berry, front and centred
  { x: -0.13, z: 0.58, clearRadius: 0.13 }, // supporting berry, back-left
  { x: 0.12, z: 0.6, clearRadius: 0.13 }, // supporting berry, back-right
];

function buildFruitLayout({ fruitTypes }) {
  const layout = {};

  fruitTypes.forEach((type, typeIndex) => {
    const spec = FRUIT_SPECS[type];

    if (!spec) {
      return;
    }

    const count = spec.count;

    const rand = mulberry32(seedOf(`${type}-garnish-cheesecake`));

    // Strawberries use their own strategic placement instead of the
    // generic zone-stride scatter used by the other fruit.
    if (type === "strawberry") {
      const spots = STRAWBERRY_STRATEGIC_SPOTS.map((spot, spotIndex) => {
        let x = spot.x + (rand() - 0.5) * 0.02;

        let z = spot.z + (rand() - 0.5) * 0.02;

        if (!insideSlice(x, z, 0.02)) {
          x = spot.x;
          z = spot.z;
        }

        // Dialed back slightly from the previous pass — the hero
        // (front) berry stays a touch larger than the two supporting
        // berries behind it, which reads as an intentional grouping
        // rather than three identical pieces.
        const scale =
          spotIndex === 0 ? 1.15 + rand() * 0.1 : 1.02 + rand() * 0.1;

        return {
          x,
          z,

          yaw: rand() * Math.PI * 2,

          roll: (rand() - 0.5) * 0.5,

          scale,

          clearRadius: spot.clearRadius,
        };
      });

      layout[type] = spots;

      return;
    }

    const spots = [];

    const offset =
      Math.floor(SCATTER_ZONES.length / fruitTypes.length) * typeIndex;

    for (let i = 0; i < count; i++) {
      const zone =
        SCATTER_ZONES[
          (i * FRUIT_ZONE_STRIDE + offset) % SCATTER_ZONES.length
        ];

      let x = zone[0] + (rand() - 0.5) * 0.07;

      let z = zone[1] + (rand() - 0.5) * 0.07;

      z = THREE.MathUtils.clamp(z, 0.16, 0.8);

      const maxD = SLICE_RADIUS - spec.pad;

      const maxX =
        Math.min(z * HALF_W, Math.sqrt(Math.max(0, maxD * maxD - z * z))) -
        0.02;

      if (maxX < 0.02) {
        x = 0;
      } else {
        x = THREE.MathUtils.clamp(x, -maxX, maxX);
      }

      const d = Math.hypot(x, z);

      if (d > maxD) {
        const t = maxD / d;

        x *= t;
        z *= t;
      }

      if (!insideSlice(x, z, 0.015)) {
        continue;
      }

      spots.push({
        x,
        z,

        yaw: rand() * Math.PI * 2,

        roll: (rand() - 0.5) * 0.5,

        scale: 0.9 + rand() * 0.2,
      });
    }

    layout[type] = spots;
  });

  return layout;
}

// =====================================================================
// MAIN SLICE
// =====================================================================

function BuildSlice({ config }) {
  const cake = getOption("cake", config.cake) || getOption("cake", "blueberry");

  const bodyColor = cake.scene?.body || "#f5ead3";

  const glazeColor = cake.scene?.glaze || "#d9c9a8";

  const toppings = config.toppings || [];

  const garnishes = config.garnishes || [];

  const hasCream = toppings.some(
    (t) => getOption("toppings", t.id)?.scene?.type === "whip",
  );

  const hasBar = garnishes.some(
    (g) => getOption("garnishes", g.id)?.scene?.type === "choc-bar",
  );

  const fruitTypes = FRUIT_ORDER.filter((type) =>
    garnishes.some((g) => getOption("garnishes", g.id)?.scene?.type === type),
  );

  // Fruit garnish is laid out first so graham crumb + chocolate bar
  // placement can avoid clustering directly underneath/inside the
  // large pieces.
  const fruitSpots = buildFruitLayout({ fruitTypes });

  const avoidSpots = [
    ...(fruitSpots.strawberry || []).map((s) => ({
      x: s.x,
      z: s.z,
      // clearRadius (set per-spot in buildFruitLayout) gives the
      // focal-point cluster extra breathing room from crumb scatter.
      radius: s.clearRadius ?? 0.1 * s.scale,
    })),
    ...(fruitSpots.mango || []).map((s) => ({
      x: s.x,
      z: s.z,
      radius: 0.075,
    })),
  ];

  // Chocolate bar is placed next, avoiding the fruit garnish above;
  // its own footprint then joins avoidSpots so graham crumbs steer
  // clear of it too.
  const chocBarLayout = buildChocBarLayout({ hasBar, avoidSpots });

  if (chocBarLayout) {
    avoidSpots.push({
      x: chocBarLayout.x,
      z: chocBarLayout.z,
      radius: CHOC_BAR_FOOTPRINT_RADIUS,
    });
  }

  const toppingPieces = buildToppingLayout({
    toppings,
    hasCream,
    avoidSpots,
  });

  const surfaceAt = (x, z) => sliceSurfaceY(x, z, hasCream);

  const layers = [];

  let y = PLATE_H;

  layers.push(
    <mesh
      key="crust"
      geometry={SLICE_GEO.crust}
      position={[0, y, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color="#a96f2f" roughness={0.78} />
    </mesh>,
  );

  layers.push(<CrustCrumbs key="crust-crumbs" crustBaseY={PLATE_H} />);

  y += CRUST_H;

  layers.push(
    <mesh
      key="body"
      geometry={SLICE_GEO.body}
      position={[0, y, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={bodyColor} roughness={0.48} />
    </mesh>,
  );

  y += BODY_H;

  layers.push(
    <mesh
      key="glaze"
      geometry={SLICE_GEO.glaze}
      position={[0, y, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={glazeColor} roughness={0.27} />
    </mesh>,
  );

  if (toppingPieces.length) {
    layers.push(
      <ScatterToppings key="toppings" y={y} pieces={toppingPieces} />,
    );
  }

  if (hasCream) {
    layers.push(<WhippedCream key="cream" y={y} />);
  }

  if (fruitTypes.includes("blueberry")) {
    layers.push(
      <FreshBlueberries
        key="blueberry"
        y={y}
        spots={fruitSpots.blueberry || []}
        surfaceAt={surfaceAt}
      />,
    );
  }

  if (fruitTypes.includes("strawberry")) {
    layers.push(
      <FreshStrawberries
        key="strawberry"
        y={y}
        spots={fruitSpots.strawberry || []}
        surfaceAt={surfaceAt}
      />,
    );
  }

  if (fruitTypes.includes("mango")) {
    layers.push(
      <MangoSlices
        key="mango"
        y={y}
        spots={fruitSpots.mango || []}
        surfaceAt={surfaceAt}
      />,
    );
  }

  if (hasBar && chocBarLayout) {
    layers.push(
      <ChocolateBar
        key="chocolate-bar"
        y={y}
        surfaceAt={surfaceAt}
        spot={chocBarLayout}
        hasCream={hasCream}
      />,
    );
  }

  return (
    <group>
      <mesh position={[0, PLATE_H / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.05, PLATE_H, 64]} />

        <meshStandardMaterial color="#f8f5ef" roughness={0.3} />
      </mesh>

      <group position={[0, 0, -SLICE_CENTRE]}>{layers}</group>
    </group>
  );
}

// =====================================================================
// MAIN SCENE
// =====================================================================

export default function CheesecakeScene3D({ config }) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{
        position: [0, 1.35, 2.35],
        fov: 42,
      }}
      gl={{
        antialias: true,
        alpha: true,
      }}
    >
      <ambientLight intensity={0.48} />

      <directionalLight
        position={[3.5, 5.5, 3.5]}
        intensity={1.25}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      <directionalLight position={[-3, 3, -2]} intensity={0.38} />

      <directionalLight position={[0, 2, 4]} intensity={0.25} />

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

      <group scale={SCENE_SCALE} position={[0, -0.32, 0]}>
        <BuildSlice config={config} />
      </group>

      <ContactShadows
        position={[0, -0.35, 0]}
        opacity={0.42}
        scale={3.5}
        blur={2.4}
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
