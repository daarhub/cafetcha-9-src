// =====================================================================
// REALISTIC ICE CREAM BOWL 3D SCENE — SCOOPS / SYRUP / TOPPINGS VERSION
//
// Same conventions as the other Cafétcha 3D customizers:
//   - deterministic randoms (mulberry32)
//   - local Environment (Lightformers)
//   - ContactShadows + OrbitControls
//
// SCOOP UPDATE:
//   - Custom deformed scoop geometry instead of a perfect sphere
//   - Broad flattened patches
//   - Subtle irregular surface variation
//   - Slight hand-scooped deformation
//   - No perfectly smooth spherical silhouette
//   - Thick pressed ice cream base under every scoop: a flattened skirt
//     with an irregular perimeter, uneven thickness and a raised center
//     that merges into the scoop — as if the scoop was pressed down onto
//     a flat surface
// =====================================================================

import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo } from "react";
import { getOption } from "./customizeIceCreamData";

// =====================================================================
// MEASUREMENTS
// =====================================================================

const SCENE_SCALE = 0.78;

// Bowl profile
const BOWL_PROFILE = [
  [0.0, 0.0],
  [0.26, 0.0],
  [0.3, 0.025],
  [0.34, 0.05],
  [0.46, 0.08],
  [0.58, 0.14],
  [0.67, 0.23],
  [0.73, 0.34],
  [0.76, 0.44],
  [0.75, 0.465],
  [0.71, 0.455],
  [0.67, 0.37],
  [0.59, 0.29],
  [0.46, 0.245],
  [0.28, 0.225],
  [0.0, 0.22],
];

// Four scoops
const SCOOPS = [
  { id: "top", center: [0, 0.84, -0.02], r: 0.3 },
  { id: "back", center: [0, 0.55, -0.2], r: 0.32 },
  { id: "left", center: [-0.26, 0.54, 0.12], r: 0.29 },
  { id: "right", center: [0.27, 0.54, 0.14], r: 0.29 },
];

const TOP_SCOOP = SCOOPS[0];

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
// BOWL
// =====================================================================

function makeBowlGeometry() {
  const points = BOWL_PROFILE.map(
    ([radius, height]) => new THREE.Vector2(radius, height),
  );

  const geometry = new THREE.LatheGeometry(points, 48);

  geometry.computeVertexNormals();

  return geometry;
}

function Bowl() {
  const geometry = useMemo(() => makeBowlGeometry(), []);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#f3ecdd"
        roughness={0.32}
        clearcoat={0.55}
        clearcoatRoughness={0.35}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// =====================================================================
// REALISTIC SCOOP GEOMETRY
//
// Instead of a mathematically perfect sphere, the scoop is made from
// a high-resolution sphere and then gently deformed.
//
// The deformation has three layers:
//
// 1. LOW-FREQUENCY IRREGULARITY
//    Creates the uneven hand-scooped silhouette.
//
// 2. BROAD FLATTENED PATCHES
//    Creates the characteristic flat-ish areas left by a scoop.
//
// 3. SMALL SURFACE VARIATION
//    Adds subtle imperfections without making the scoop look rocky.
//
// The deformation is deterministic from the scoop's seed.
// =====================================================================

function makeRealisticScoopGeometry(r, seed) {
  const geometry = new THREE.SphereGeometry(r, 56, 40);

  const position = geometry.attributes.position;

  const rand = mulberry32(seed);

  // ---------------------------------------------------------------
  // Generate deterministic broad surface patches.
  //
  // These represent areas where the ice cream was compressed/scraped
  // by the scoop. Each patch has:
  //   direction = where it appears
  //   size      = how broad it is
  //   strength  = how flattened it becomes
  // ---------------------------------------------------------------

  const patches = [];

  const patchCount = 9;

  for (let i = 0; i < patchCount; i += 1) {
    const theta = rand() * Math.PI * 2;

    // Keep most patches toward the visible upper hemisphere.
    const phi = 0.18 + rand() * 1.15;

    const direction = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ).normalize();

    patches.push({
      direction,
      size: 0.18 + rand() * 0.22,
      strength: 0.035 + rand() * 0.055,
    });
  }

  // ---------------------------------------------------------------
  // Modify every vertex
  // ---------------------------------------------------------------

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);

    // Normalized sphere direction.
    normal.copy(vertex).normalize();

    const y = normal.y;

    // -------------------------------------------------------------
    // LOW-FREQUENCY IRREGULARITY
    //
    // Very broad waves rather than noisy displacement. This keeps
    // the scoop looking creamy instead of rocky.
    // -------------------------------------------------------------

    const wave1 =
      Math.sin(normal.x * 8.5 + seed * 0.013) *
      Math.cos(normal.z * 7.5 - seed * 0.009);

    const wave2 = Math.sin((normal.x + normal.z) * 13.0 + seed * 0.021) * 0.45;

    const broadVariation = (wave1 + wave2) * 0.012;

    // -------------------------------------------------------------
    // BROAD FLATTENED SCOOP MARKS
    // -------------------------------------------------------------

    let flattenAmount = 0;

    // Mostly affect upper / visible portion.
    const upperWeight = THREE.MathUtils.smoothstep(y, -0.05, 0.75);

    for (let p = 0; p < patches.length; p += 1) {
      const patch = patches[p];

      // Angular similarity between this vertex and the patch.
      const similarity = THREE.MathUtils.clamp(
        normal.dot(patch.direction),
        -1,
        1,
      );

      const angle = Math.acos(similarity);

      // Broad soft-edged patch.
      const falloff = Math.max(0, 1 - angle / patch.size);

      // Smooth falloff so the flattened area doesn't have an obvious
      // circular border.
      const smoothFalloff = falloff * falloff * (3 - 2 * falloff);

      flattenAmount += patch.strength * smoothFalloff * upperWeight;
    }

    // -------------------------------------------------------------
    // SUBTLE HAND-SCOOP IMPERFECTION
    //
    // Creates tiny variation around the flattened regions.
    // -------------------------------------------------------------

    const fineVariation =
      Math.sin(normal.x * 25 + seed * 0.03) *
      Math.sin(normal.z * 22 - seed * 0.017) *
      0.0035;

    // -------------------------------------------------------------
    // FINAL RADIAL DEFORMATION
    // -------------------------------------------------------------

    let radiusMultiplier = 1 + broadVariation + fineVariation - flattenAmount;

    // Keep the deformation controlled.
    radiusMultiplier = THREE.MathUtils.clamp(radiusMultiplier, 0.89, 1.035);

    vertex.multiplyScalar(radiusMultiplier);

    // -------------------------------------------------------------
    // VERY SLIGHT VERTICAL COMPRESSION
    //
    // Keeps the scoop from reading as a perfect ball.
    // -------------------------------------------------------------

    vertex.y *= 0.94;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;

  geometry.computeVertexNormals();

  return geometry;
}

// =====================================================================
// SCOOPS
// =====================================================================

// Random point on the upper cap of a scoop.
const capOffset = (r, rand, maxTilt = 1.25) => {
  const theta = rand() * Math.PI * 2;

  const phi = Math.acos(1 - rand() * (1 - Math.cos(maxTilt)));

  const sinPhi = Math.sin(phi);

  return [
    Math.cos(theta) * sinPhi * r,
    Math.cos(phi) * r,
    Math.sin(theta) * sinPhi * r,
  ];
};

// =====================================================================
// COMPRESSED ICE CREAM BASE
//
// Creates the thick, flattened portion underneath each scoop as if the
// scoop was pressed down against a flat surface.
//
// IMPORTANT:
// This is NOT a cylinder/disc. The geometry has:
//   - irregular radial outline
//   - chunky/jagged perimeter
//   - uneven thickness
//   - raised center that merges into the scoop
//   - dents and folds across the surface
//   - subtle asymmetry
// =====================================================================

function makeCompressedIceCreamBaseGeometry(r, seed) {
  const rand = mulberry32(seed);

  // Number of radial sections.
  // More sections = more organic perimeter.
  const radialSegments = 48;

  // Concentric rings.
  const rings = 5;

  // The flattened base spreads noticeably beyond the scoop.
  const spread = r * (1.08 + rand() * 0.07);

  // Still thick enough to read as pressed ice cream, but not so deep
  // that the skirt intersects the outside of the bowl.
  const baseThickness = r * (0.24 + rand() * 0.045);

  const vertices = [];
  const indices = [];

  // ---------------------------------------------------------------
  // Generate irregular perimeter values first.
  //
  // Keeping these values consistent between rings makes the surface
  // flow naturally instead of looking like several random circles.
  // ---------------------------------------------------------------

  const edgeVariation = [];

  for (let i = 0; i < radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;

    const variation =
      1 +
      (rand() - 0.5) * 0.2 +
      Math.sin(angle * 3 + seed * 0.01) * 0.055 +
      Math.sin(angle * 7 - seed * 0.017) * 0.035;

    edgeVariation.push(variation);
  }

  // ---------------------------------------------------------------
  // Top surface
  //
  // Center is higher because it disappears into the scoop.
  // Toward the outside it becomes flatter.
  // ---------------------------------------------------------------

  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;

    for (let i = 0; i < radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;

      const edge = edgeVariation[i];

      // Slightly irregular radius.
      const radius = spread * t * edge;

      // Organic local waviness.
      const wave = Math.sin(angle * 4 + seed * 0.02) * 0.018 * r * t;

      const wave2 = Math.sin(angle * 9 - seed * 0.013) * 0.01 * r * t;

      const x = Math.cos(angle) * radius + Math.cos(angle + 1.7) * wave;

      const z = Math.sin(angle) * radius + Math.sin(angle + 1.2) * wave2;

      // Dome-like transition into the scoop.
      //
      // At the center this is high.
      // At the edge it approaches the flattened level.

      // Uneven compressed surface. Scaled by t so the very center ring
      // collapses to a single clean point instead of a jagged spike.
      const surfaceVariation =
        Math.sin(angle * 5 + seed * 0.03) * 0.012 * r * t +
        Math.sin(angle * 11 - seed * 0.02) * 0.006 * r * t;

      const centerRise = Math.pow(1 - t, 1.35) * r * 0.34;

      const y = baseThickness * 0.52 + centerRise + surfaceVariation;

      vertices.push(x, y, z);
    }
  }

  // ---------------------------------------------------------------
  // Top surface triangles
  // ---------------------------------------------------------------

  for (let ring = 0; ring < rings; ring++) {
    for (let i = 0; i < radialSegments; i++) {
      const next = (i + 1) % radialSegments;

      const a = ring * radialSegments + i;

      const b = ring * radialSegments + next;

      const c = (ring + 1) * radialSegments + next;

      const d = (ring + 1) * radialSegments + i;

      // Ring 0 collapses to a single center point, so its (a, b, d)
      // triangle would be zero-area — push only the valid wedge.
      if (ring > 0) {
        indices.push(a, b, d);
      }

      indices.push(b, c, d);
    }
  }

  // ---------------------------------------------------------------
  // Bottom surface
  //
  // Slightly uneven rather than perfectly flat.
  // This prevents the object from reading as a manufactured disk.
  // ---------------------------------------------------------------

  const bottomStart = vertices.length / 3;

  for (let i = 0; i < radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;

    const edge = edgeVariation[i];

    const radius = spread * edge;

    const x = Math.cos(angle) * radius;

    const z = Math.sin(angle) * radius;

    const bottomVariation =
      (Math.sin(angle * 6 + seed) * 0.008 + (rand() - 0.5) * 0.006) * r;

    vertices.push(x, -baseThickness * 0.48 + bottomVariation, z);
  }

  // ---------------------------------------------------------------
  // Connect the outer top edge to the bottom edge.
  // This creates the chunky irregular side wall.
  // ---------------------------------------------------------------

  const outerTopStart = rings * radialSegments;

  for (let i = 0; i < radialSegments; i++) {
    const next = (i + 1) % radialSegments;

    const topA = outerTopStart + i;

    const topB = outerTopStart + next;

    const bottomA = bottomStart + i;

    const bottomB = bottomStart + next;

    // Winding matters: these triangles must be counter-clockwise as seen
    // from OUTSIDE, or the whole thick side wall is backface-culled and
    // the base renders hollow.
    indices.push(topA, topB, bottomA);

    indices.push(topB, bottomB, bottomA);
  }

  // ---------------------------------------------------------------
  // Bottom center
  // ---------------------------------------------------------------

  const bottomCenter = vertices.length / 3;

  vertices.push(0, -baseThickness * 0.48, 0);

  for (let i = 0; i < radialSegments; i++) {
    const next = (i + 1) % radialSegments;

    // Faces DOWN (outward) — the opposite order to the up-facing top fan.
    indices.push(bottomCenter, bottomStart + i, bottomStart + next);
  }

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );

  geometry.setIndex(indices);

  geometry.computeVertexNormals();

  return geometry;
}

// =====================================================================
// COMPRESSED ICE CREAM BASE COMPONENT
// =====================================================================

function CompressedIceCreamBase({ center, r, flavor, seed }) {
  const geometry = useMemo(
    () => makeCompressedIceCreamBaseGeometry(r, seed),
    [r, seed],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  // The scoop's vertical deformation is 0.94.
  // Therefore the bottom sits approximately here.
  const bottomY = center[1] - r * 0.94 + r * 0.055;

  return (
    <mesh
      geometry={geometry}
      position={[center[0], bottomY, center[2]]}
      castShadow
      receiveShadow
    >
      <meshPhysicalMaterial
        color={flavor?.scene?.scoop || "#f8f0dc"}
        roughness={0.72}
        clearcoat={0.08}
        clearcoatRoughness={0.85}
        flatShading={false}
      />
    </mesh>
  );
}

function Scoop({ center, r, flavor, seed }) {
  const rand = useMemo(() => mulberry32(seed), [seed]);

  // ---------------------------------------------------------------
  // CUSTOM REALISTIC SCOOP GEOMETRY
  // ---------------------------------------------------------------

  const geometry = useMemo(
    () => makeRealisticScoopGeometry(r, seed),
    [r, seed],
  );

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  // ---------------------------------------------------------------
  // FLECKS
  //
  // The scoop itself is vertically compressed by 0.94.
  //
  // Instead of pushing the flecks deeply inside the scoop, we place
  // them almost exactly on the compressed scoop surface, with only
  // a VERY tiny amount of intersection.
  //
  // This keeps the dots:
  //   - visible
  //   - attached to the ice cream
  //   - not floating
  //   - not disappearing inside the scoop
  // ---------------------------------------------------------------

  const cookieChunk = flavor?.id === "cookies-and-cream";

  const flecks = useMemo(() => {
    const count = cookieChunk ? 26 : 14;

    const list = [];

    for (let i = 0; i < count; i += 1) {
      const offset = capOffset(r, rand, 1.5);

      // -----------------------------------------------------------
      // Get the direction from the scoop center.
      // -----------------------------------------------------------

      const direction = new THREE.Vector3(
        offset[0],
        offset[1],
        offset[2],
      ).normalize();

      // -----------------------------------------------------------
      // The actual scoop is:
      //
      // X = r
      // Y = r * 0.94
      // Z = r
      //
      // Find the exact surface distance for this direction.
      // -----------------------------------------------------------

      const denominator =
        (direction.x * direction.x) / (r * r) +
        (direction.y * direction.y) / (r * 0.94 * (r * 0.94)) +
        (direction.z * direction.z) / (r * r);

      const surfaceDistance = 1 / Math.sqrt(denominator);

      // -----------------------------------------------------------
      // VERY SMALL outward offset.
      //
      // The previous version used 0.965 which put the flecks way
      // too far inside the scoop.
      //
      // 1.004 puts the CENTER of the fleck just slightly outside
      // the theoretical surface, while the sphere itself still
      // intersects the ice cream.
      //
      // This creates the visual effect of the fleck being stuck
      // onto the ice cream instead of floating.
      // -----------------------------------------------------------

      const isVanilla = flavor?.id === "vanilla";
      const isTopScoop = center === TOP_SCOOP.center;

      const surfaceDistanceWithOffset =
        surfaceDistance * (isVanilla && isTopScoop ? 0.95 : 1.004);

      const localPosition = new THREE.Vector3(
        direction.x * surfaceDistanceWithOffset,
        direction.y * surfaceDistanceWithOffset,
        direction.z * surfaceDistanceWithOffset,
      );

      list.push({
        position: [
          center[0] + localPosition.x,
          center[1] + localPosition.y,
          center[2] + localPosition.z,
        ],

        // Keep the original sizes so the dots remain clearly visible.
        size: cookieChunk ? 0.011 + rand() * 0.007 : 0.006 + rand() * 0.004,

        shade: rand() > 0.5 ? flavor?.scene?.accent : flavor?.scene?.shade,
      });
    }

    return list;
  }, [cookieChunk, rand, r, center, flavor]);

  return (
    <group>
      {/* =========================================================
        COMPRESSED ICE CREAM BASE
        ========================================================= */}

      <CompressedIceCreamBase
        center={center}
        r={r}
        flavor={flavor}
        seed={seed + 9173}
      />

      {/* =========================================================
        REALISTIC SCOOP
        ========================================================= */}

      <mesh geometry={geometry} position={center} castShadow receiveShadow>
        <meshPhysicalMaterial
          color={flavor?.scene?.scoop || "#f8f0dc"}
          roughness={0.62}
          clearcoat={0.12}
          clearcoatRoughness={0.7}
          flatShading={false}
        />
      </mesh>

      {/* =========================================================
          FLAVOR FLECKS

          Flecks are positioned directly against the compressed
          scoop surface with a tiny intersection so they remain
          visible and look attached.
          ========================================================= */}

      {flecks.map((fleck, i) => (
        <mesh key={i} position={fleck.position}>
          <sphereGeometry args={[fleck.size, 8, 8]} />

          <meshStandardMaterial
            color={fleck.shade || flavor?.scene?.accent}
            roughness={0.7}
          />
        </mesh>
      ))}
    </group>
  );
}

// =====================================================================
// SYRUP
// =====================================================================

const SYRUP_REACH_RATIO = 0.9;

// Approximate scoop dome height.
// Kept compatible with the original drizzle system.
const scoopCapY = (rr, scoopR) =>
  0.94 * Math.sqrt(Math.max(0.0001, scoopR * scoopR - rr * rr));

function SyrupDrizzle({ color, index, scoop }) {
  const lift = index * 0.014;

  const reach = scoop.r * SYRUP_REACH_RATIO;

  const geometry = useMemo(() => {
    const rand = mulberry32(seedOf(`syrup-${scoop.id}-${index}-${color}`));

    const angle = index * 1.15 + rand() * 0.6;

    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const rows = 5;

    const halfWid = reach * 0.78;

    const amplitude = reach * 0.12;

    const toPoint = (along, w) => {
      let x = along * cos - w * sin;

      let z = along * sin + w * cos;

      const rr = Math.hypot(x, z);

      if (rr > reach) {
        const k = reach / rr;

        x *= k;
        z *= k;
      }

      return new THREE.Vector3(
        scoop.center[0] + x,

        scoop.center[1] + scoopCapY(Math.hypot(x, z), scoop.r) + lift + 0.002,

        scoop.center[2] + z,
      );
    };

    const corners = [];

    let forward = rand() > 0.5;

    let side = rand() > 0.5 ? 1 : -1;

    for (let p = 0; p < rows; p += 1) {
      const baseW =
        -halfWid + (p / (rows - 1)) * halfWid * 2 + (rand() - 0.5) * 0.08;

      const chord = Math.sqrt(Math.max(0.01, reach * reach - baseW * baseW));

      const strokes = 5 + Math.floor(rand() * 3);

      const breaks = Array.from(
        {
          length: strokes - 1,
        },
        () => rand(),
      ).sort((a, b) => a - b);

      for (let s = 0; s <= strokes; s += 1) {
        const t = s === 0 ? 0 : s < strokes ? breaks[s - 1] : 1;

        corners.push([
          forward ? -chord + t * chord * 2 : chord - t * chord * 2,

          baseW + side * amplitude * (0.55 + rand() * 0.85),
        ]);

        if (s < strokes) {
          side *= -1;
        }
      }

      forward = !forward;
    }

    const points = [];

    for (let i = 0; i < corners.length - 1; i += 1) {
      const [aAlong, aW] = corners[i];

      const [bAlong, bW] = corners[i + 1];

      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(bAlong - aAlong, bW - aW) / 0.03),
      );

      for (let s = 0; s < steps; s += 1) {
        const t = s / steps;

        points.push(
          toPoint(
            aAlong + (bAlong - aAlong) * t,

            aW + (bW - aW) * t,
          ),
        );
      }
    }

    const [endAlong, endW] = corners[corners.length - 1];

    points.push(toPoint(endAlong, endW));

    const path = new THREE.CurvePath();

    let last = null;

    for (let i = 0; i < points.length; i += 1) {
      const p = points[i];

      if (last) {
        if (last.distanceToSquared(p) < 1e-8) {
          continue;
        }

        path.add(new THREE.LineCurve3(last, p));
      }

      last = p;
    }

    return new THREE.TubeGeometry(
      path,
      Math.max(2, path.curves.length),
      0.012,
      6,
      false,
    );
  }, [scoop, index, color, lift, reach]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const drips = useMemo(() => {
    const rand = mulberry32(
      seedOf(`syrup-drips-${scoop.id}-${index}-${color}`),
    );

    const list = [];

    const isTop = scoop.id === "top";

    const outward = Math.atan2(scoop.center[2], scoop.center[0]);

    const count = isTop ? 5 : 3;

    for (let i = 0; i < count; i += 1) {
      const angle = isTop
        ? rand() * Math.PI * 2
        : outward + (rand() - 0.5) * Math.PI;

      const length = isTop ? 0.1 + rand() * 0.09 : 0.07 + rand() * 0.05;

      list.push({
        position: [
          scoop.center[0] + Math.cos(angle) * reach,

          scoop.center[1] + scoopCapY(reach, scoop.r) - length / 2 + lift,

          scoop.center[2] + Math.sin(angle) * reach,
        ],

        length,
      });
    }

    return list;
  }, [scoop, index, color, lift, reach]);

  return (
    <group>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.18}
          clearcoat={0.8}
          clearcoatRoughness={0.2}
        />
      </mesh>

      {drips.map((drip, i) => (
        <mesh
          key={`drip-${i}`}
          position={drip.position}
          scale={[1, drip.length / 0.05, 1]}
        >
          <sphereGeometry args={[0.034, 12, 12]} />

          <meshPhysicalMaterial
            color={color}
            roughness={0.18}
            clearcoat={0.8}
            clearcoatRoughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

// =====================================================================
// TOPPINGS
// =====================================================================

const TOPPING_COUNTS = {
  chips: 34,
  marshmallow: 16,
  nuts: 60,
  "choc-candy": 12,
  "fruity-candy": 12,
  oreo: 34,
  "biscoff-crumbs": 32,
  sprinkles: 44,
  "choc-shav": 38,
  "straw-slices": 12,
  blueberry: 14,
  "mango-chunks": 16,
};

const SPRINKLE_COLORS = [
  "#f25c5c",
  "#f2b03c",
  "#ffe066",
  "#5cc46a",
  "#4ba3e0",
  "#e06cc8",
];

const FRUITY_COLORS = ["#e85d75", "#f2a24b", "#8fc96b", "#7f9fe8", "#e878b0"];

// =====================================================================
// TOPPING SCATTER
// =====================================================================

const buildToppingPieces = (type, typeIndex) => {
  const count = TOPPING_COUNTS[type] || 20;

  const rand = mulberry32(seedOf(`${type}-${typeIndex}-icecream`));

  const pieces = [];

  // ---------------------------------------------------------------
  // MANGO
  // ---------------------------------------------------------------

  if (type === "mango-chunks") {
    for (let i = 0; i < count; i += 1) {
      const scoop =
        rand() < 0.4
          ? TOP_SCOOP
          : SCOOPS[1 + Math.floor(rand() * (SCOOPS.length - 1))];

      const offset = capOffset(scoop.r, rand, 1.72);

      const shape = MANGO_CHUNK_SHAPES[i % MANGO_CHUNK_SHAPES.length].map(
        (s) => s * (0.85 + rand() * 0.3),
      );

      const normal = new THREE.Vector3(
        offset[0],
        offset[1],
        offset[2],
      ).normalize();

      const quaternion = new THREE.Quaternion()
        .setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal)
        .multiply(
          new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            rand() * Math.PI * 2,
          ),
        );

      const ellipsoidR =
        scoop.r /
        Math.sqrt(normal.x ** 2 + normal.z ** 2 + (normal.y / 0.94) ** 2);

      const dist = ellipsoidR + 0.024 * shape[1] * 0.55;

      pieces.push({
        type,
        index: i,
        position: [
          scoop.center[0] + normal.x * dist,

          scoop.center[1] + normal.y * dist,

          scoop.center[2] + normal.z * dist,
        ],
        quaternion,
        shape,
        colorPick: rand(),
      });
    }

    return pieces;
  }

  // ---------------------------------------------------------------
  // NORMAL TOPPINGS
  // ---------------------------------------------------------------

  for (let i = 0; i < count; i += 1) {
    const pick = rand();

    const scoop =
      pick < 0.45
        ? TOP_SCOOP
        : SCOOPS[1 + Math.floor(rand() * (SCOOPS.length - 1))];

    const offset = capOffset(scoop.r, rand);

    pieces.push({
      type,
      index: i,

      position: [
        scoop.center[0] + offset[0] * 1.005,

        scoop.center[1] + offset[1] * 1.01,

        scoop.center[2] + offset[2] * 1.005,
      ],

      rotation: [
        (rand() - 0.5) * Math.PI,

        rand() * Math.PI * 2,

        (rand() - 0.5) * Math.PI,
      ],

      colorPick: rand(),
    });
  }

  return pieces;
};

// =====================================================================
// CURLY SHAVINGS
// =====================================================================

function CurlyShaving({ position, rotation, color, index }) {
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
      castShadow
    >
      <meshStandardMaterial color={color} roughness={0.38} />
    </mesh>
  );
}

// =====================================================================
// CHOPPED NUTS
// =====================================================================

function ChoppedNut({ position, rotation, scale, index }) {
  const colors = ["#9b632b", "#aa7033", "#b97e3d", "#c78c46", "#d29b52"];

  return (
    <mesh
      key={index}
      position={position}
      rotation={rotation}
      scale={scale}
      castShadow
    >
      <dodecahedronGeometry args={[0.018, 0]} />

      <meshStandardMaterial
        color={colors[index % colors.length]}
        roughness={0.82}
      />
    </mesh>
  );
}

// =====================================================================
// OREO CRUMBS
// =====================================================================

const OREO_COOKIE_COLORS = ["#1f1a15", "#282219", "#2f2921", "#36302a"];

const OREO_CRUMB_COLORS = ["#3d362c", "#494135", "#544b3d"];

const OREO_CREAM_COLOR = "#f2ecdf";

const OREO_CHUNK_SHAPES = [
  [1.9, 0.8, 1.4],
  [1.5, 1.3, 1.25],
  [2.3, 0.7, 0.9],
  [1.6, 1.1, 1.5],
];

function OreoCrumb({ position, rotation, index, colorPick }) {
  const piece = useMemo(() => {
    const rand = mulberry32(seedOf(`oreo-crumb-${index}`));

    const jitter = () => 0.85 + rand() * 0.3;

    const chunk = OREO_CHUNK_SHAPES[index % OREO_CHUNK_SHAPES.length].map(
      (s) => s * jitter(),
    );

    const shards = [];

    const shardCount = index % 2 === 0 ? 2 : 1;

    for (let i = 0; i < shardCount; i++) {
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

    return {
      chunk,
      shards,
    };
  }, [index]);

  const hasCream = colorPick > 0.62;

  return (
    <group position={position} rotation={rotation}>
      <mesh scale={piece.chunk} castShadow>
        <dodecahedronGeometry args={[0.02, 0]} />

        <meshStandardMaterial
          color={OREO_COOKIE_COLORS[index % OREO_COOKIE_COLORS.length]}
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
          <dodecahedronGeometry args={[0.011, 0]} />

          <meshStandardMaterial
            color={OREO_CRUMB_COLORS[(index + i) % OREO_CRUMB_COLORS.length]}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}

      {hasCream && (
        <mesh
          position={[0.006, 0.013, 0.005]}
          rotation={[0.4, index * 1.7, 0.3]}
          scale={[1.3, 0.45, 1]}
        >
          <sphereGeometry args={[0.011, 10, 8]} />

          <meshStandardMaterial color={OREO_CREAM_COLOR} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

// =====================================================================
// BISCOFF CRUMBS
// =====================================================================

const BISCOFF_COOKIE_COLORS = ["#8f5628", "#a56a35", "#b97a42", "#c98d4e"];

const BISCOFF_SHARD_COLORS = ["#7a451f", "#925a2c", "#a8713a"];

const BISCOFF_INNER_COLOR = "#d9a768";

const BISCOFF_CHUNK_SHAPES = [
  [2.2, 0.55, 1.5],
  [1.7, 0.9, 1.25],
  [2.6, 0.5, 1.0],
  [1.4, 1.15, 1.1],
];

function BiscoffCrumb({ position, rotation, index, colorPick }) {
  const piece = useMemo(() => {
    const rand = mulberry32(seedOf(`biscoff-crumb-${index}`));

    const jitter = () => 0.85 + rand() * 0.3;

    const chunk = BISCOFF_CHUNK_SHAPES[index % BISCOFF_CHUNK_SHAPES.length].map(
      (s) => s * jitter(),
    );

    const shards = [];

    const shardCount = index % 3 === 0 ? 2 : 1;

    for (let i = 0; i < shardCount; i++) {
      shards.push({
        position: [
          (rand() - 0.5) * 0.05,
          0.004 + rand() * 0.01,
          (rand() - 0.5) * 0.05,
        ],

        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],

        scale: 0.5 + rand() * 0.45,
      });
    }

    return {
      chunk,
      shards,
    };
  }, [index]);

  const hasInner = colorPick > 0.62;

  const color =
    BISCOFF_COOKIE_COLORS[
      (index + (colorPick > 0.5 ? 1 : 0)) % BISCOFF_COOKIE_COLORS.length
    ];

  return (
    <group position={position} rotation={rotation}>
      <mesh scale={piece.chunk} castShadow>
        <dodecahedronGeometry args={[0.021, 0]} />

        <meshStandardMaterial color={color} roughness={0.8} flatShading />
      </mesh>

      {piece.shards.map((shard, i) => (
        <mesh
          key={i}
          position={shard.position}
          rotation={shard.rotation}
          scale={shard.scale}
          castShadow
        >
          <dodecahedronGeometry args={[0.011, 0]} />

          <meshStandardMaterial
            color={
              BISCOFF_SHARD_COLORS[(index + i) % BISCOFF_SHARD_COLORS.length]
            }
            roughness={0.85}
            flatShading
          />
        </mesh>
      ))}

      {hasInner && (
        <mesh
          position={[0.005, 0.012, 0.004]}
          rotation={[0.4, index * 1.7, 0.3]}
          scale={[1.25, 0.4, 0.95]}
        >
          <sphereGeometry args={[0.011, 10, 8]} />

          <meshStandardMaterial color={BISCOFF_INNER_COLOR} roughness={0.7} />
        </mesh>
      )}
    </group>
  );
}

// =====================================================================
// MANGO CHUNKS
// =====================================================================

const MANGO_FLESH_COLORS = ["#ffc21e", "#ffcb2e", "#f7b421", "#ffd23a"];

const MANGO_PALE_COLOR = "#ffe066";

const MANGO_CORE_COLOR = "#f29c14";

const MANGO_CHUNK_SHAPES = [
  [1.25, 1.0, 1.1],
  [1.0, 0.9, 1.3],
  [1.45, 0.8, 1.0],
  [1.1, 1.2, 0.95],
  [0.9, 1.1, 1.15],
];

function MangoChunk({ position, quaternion, shape, index, colorPick }) {
  const cuts = useMemo(() => {
    const rand = mulberry32(seedOf(`mango-cut-${index}`));

    return {
      tilt: (rand() - 0.5) * 0.9,

      shift: (rand() - 0.5) * 0.012,
    };
  }, [index]);

  const flesh =
    MANGO_FLESH_COLORS[
      (index + (colorPick > 0.5 ? 1 : 0)) % MANGO_FLESH_COLORS.length
    ];

  return (
    <group position={position} quaternion={quaternion}>
      <RoundedBox
        args={[0.058, 0.048, 0.052]}
        radius={0.012}
        smoothness={4}
        scale={shape}
        castShadow
      >
        <meshPhysicalMaterial
          color={flesh}
          roughness={0.32}
          clearcoat={0.65}
          clearcoatRoughness={0.3}
        />

        <mesh
          position={[cuts.shift, 0.002, 0.023]}
          rotation={[cuts.tilt, 0, cuts.tilt * 0.6]}
          scale={[1.35, 1.0, 0.32]}
        >
          <sphereGeometry args={[0.016, 12, 10]} />

          <meshPhysicalMaterial
            color={MANGO_PALE_COLOR}
            roughness={0.34}
            clearcoat={0.5}
            clearcoatRoughness={0.35}
          />
        </mesh>

        <mesh
          position={[0, -0.002, -0.023]}
          rotation={[0, cuts.tilt, 0]}
          scale={[1.1, 0.95, 0.3]}
        >
          <sphereGeometry args={[0.014, 12, 10]} />

          <meshPhysicalMaterial
            color={MANGO_CORE_COLOR}
            roughness={0.34}
            clearcoat={0.6}
            clearcoatRoughness={0.3}
          />
        </mesh>
      </RoundedBox>
    </group>
  );
}

// =====================================================================
// STRAWBERRY SLICES
// =====================================================================

const STRAW_SLICE_STEPS = 72;

function makeStrawSliceShape({ taper, p1, p2, p3, scale, stretchY = 1 }) {
  const shape = new THREE.Shape();

  for (let i = 0; i <= STRAW_SLICE_STEPS; i++) {
    const t = (i / STRAW_SLICE_STEPS) * Math.PI * 2;

    const ex = Math.sin(t) * 0.82;

    const ey = Math.cos(t);

    const v = (1 - ey) / 2;

    const teardrop = 1 - taper * v ** 1.7;

    const wobble =
      1 +
      0.05 * Math.sin(3 * t + p1) +
      0.035 * Math.sin(5 * t + p2) +
      0.02 * Math.sin(7 * t + p3);

    const x = ex * teardrop * wobble * scale;

    const y = ey * wobble * scale * stretchY;

    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }

  shape.closePath();

  return shape;
}

function StrawberrySlice({ position, rotation, index }) {
  const { skin, flesh, core } = useMemo(() => {
    const rand = mulberry32(seedOf(`straw-slice-${index}`));

    const outline = {
      taper: 0.72 + rand() * 0.16,

      p1: rand() * Math.PI * 2,

      p2: rand() * Math.PI * 2,

      p3: rand() * Math.PI * 2,
    };

    const scale = 0.054 + rand() * 0.012;

    const skin = new THREE.ExtrudeGeometry(
      makeStrawSliceShape({
        ...outline,
        scale,
      }),
      {
        depth: 0.005,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 3,
      },
    );

    skin.center();

    const flesh = new THREE.ExtrudeGeometry(
      makeStrawSliceShape({
        ...outline,
        scale: scale * 0.85,
      }),
      {
        depth: 0.012,
        bevelEnabled: true,
        bevelThickness: 0.0008,
        bevelSize: 0.0008,
        bevelSegments: 1,
      },
    );

    flesh.center();

    const core = new THREE.ExtrudeGeometry(
      makeStrawSliceShape({
        ...outline,
        scale: scale * (0.2 + rand() * 0.08),
        stretchY: 1.45,
      }),
      {
        depth: 0.0144,
        bevelEnabled: false,
      },
    );

    core.center();

    return {
      skin,
      flesh,
      core,
    };
  }, [index]);

  useEffect(
    () => () => {
      skin.dispose();
      flesh.dispose();
      core.dispose();
    },
    [skin, flesh, core],
  );

  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={skin} castShadow>
        <meshPhysicalMaterial
          color="#c9243f"
          roughness={0.3}
          clearcoat={0.7}
          clearcoatRoughness={0.25}
        />
      </mesh>

      <mesh geometry={flesh} castShadow>
        <meshPhysicalMaterial
          color="#ee6377"
          roughness={0.42}
          clearcoat={0.6}
          clearcoatRoughness={0.3}
        />
      </mesh>

      <mesh geometry={core}>
        <meshStandardMaterial color="#f8bfc9" roughness={0.5} />
      </mesh>
    </group>
  );
}

// =====================================================================
// TOPPING PIECE
// =====================================================================

function ToppingPiece({ piece }) {
  const { type, index, position, rotation, quaternion, colorPick } = piece;

  if (type === "chips") {
    return (
      <mesh position={position} rotation={rotation} castShadow>
        <coneGeometry args={[0.016, 0.05, 6]} />

        <meshStandardMaterial
          color={colorPick > 0.5 ? "#3a2313" : "#46291a"}
          roughness={0.35}
        />
      </mesh>
    );
  }

  if (type === "marshmallow") {
    return (
      <RoundedBox
        args={[0.085, 0.085, 0.085]}
        radius={0.03}
        position={position}
        rotation={rotation}
        scale={0.8 + colorPick * 0.55}
        castShadow
      >
        <meshPhysicalMaterial color="#fffdf7" roughness={0.4} />
      </RoundedBox>
    );
  }

  if (type === "nuts") {
    const scale = [0.65, 0.85, 1.0, 1.15, 1.3][index % 5];

    return (
      <ChoppedNut
        index={index}
        position={position}
        rotation={rotation}
        scale={[scale, 0.5 + (index % 4) * 0.13, 0.7 + (index % 3) * 0.12]}
      />
    );
  }

  if (type === "choc-candy") {
    return (
      <mesh position={position} scale={0.8 + colorPick * 0.55} castShadow>
        <sphereGeometry args={[0.036, 16, 12]} />

        <meshPhysicalMaterial
          color={colorPick > 0.5 ? "#5c3a22" : "#6b4429"}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.15}
        />
      </mesh>
    );
  }

  if (type === "fruity-candy") {
    return (
      <mesh position={position} scale={0.8 + colorPick * 0.55} castShadow>
        <sphereGeometry args={[0.036, 16, 12]} />

        <meshPhysicalMaterial
          color={FRUITY_COLORS[index % FRUITY_COLORS.length]}
          roughness={0.2}
          clearcoat={0.9}
          clearcoatRoughness={0.15}
        />
      </mesh>
    );
  }

  if (type === "oreo") {
    return (
      <OreoCrumb
        index={index}
        position={position}
        rotation={rotation}
        colorPick={colorPick}
      />
    );
  }

  if (type === "biscoff-crumbs") {
    return (
      <BiscoffCrumb
        index={index}
        position={position}
        rotation={rotation}
        colorPick={colorPick}
      />
    );
  }

  if (type === "sprinkles") {
    return (
      <mesh position={position} rotation={rotation} castShadow>
        <cylinderGeometry args={[0.007, 0.007, 0.05, 6]} />

        <meshStandardMaterial
          color={SPRINKLE_COLORS[index % SPRINKLE_COLORS.length]}
          roughness={0.3}
        />
      </mesh>
    );
  }

  if (type === "choc-shav") {
    return (
      <CurlyShaving
        index={index}
        position={position}
        rotation={rotation}
        color={
          index % 3 === 0 ? "#32170d" : index % 3 === 1 ? "#4a2818" : "#5a321e"
        }
      />
    );
  }

  if (type === "straw-slices") {
    return (
      <StrawberrySlice index={index} position={position} rotation={rotation} />
    );
  }

  if (type === "blueberry") {
    return (
      <group
        position={position}
        rotation={[0, rotation[1], 0]}
        scale={0.8 + colorPick * 0.55}
      >
        <mesh castShadow>
          <sphereGeometry args={[0.036, 20, 16]} />

          <meshStandardMaterial
            color={index % 2 === 0 ? "#263f91" : "#3152aa"}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, 0.0345, 0]}>
          <cylinderGeometry args={[0.0072, 0.0112, 0.0056, 6]} />

          <meshStandardMaterial color="#182d6d" roughness={0.42} />
        </mesh>
      </group>
    );
  }

  if (type === "mango-chunks") {
    return (
      <MangoChunk
        position={position}
        quaternion={quaternion}
        shape={piece.shape}
        index={index}
        colorPick={colorPick}
      />
    );
  }

  return null;
}

// =====================================================================
// MARASCHINO CHERRY
// =====================================================================

function MaraschinoCherry() {
  const apex = [
    TOP_SCOOP.center[0],
    TOP_SCOOP.center[1] + TOP_SCOOP.r * 0.94 + 0.055,
    TOP_SCOOP.center[2],
  ];

  const stemGeometry = useMemo(() => {
    const points = [
      new THREE.Vector3(0.0, 0.05, 0.0),

      new THREE.Vector3(0.014, 0.125, 0.0),

      new THREE.Vector3(0.042, 0.19, 0.0),

      new THREE.Vector3(0.086, 0.24, 0.0),

      new THREE.Vector3(0.126, 0.258, 0.0),
    ];

    const curve = new THREE.CatmullRomCurve3(points);

    return new THREE.TubeGeometry(curve, 24, 0.008, 8, false);
  }, []);

  useEffect(() => () => stemGeometry.dispose(), [stemGeometry]);

  return (
    <group position={apex}>
      <mesh castShadow>
        <sphereGeometry args={[0.072, 20, 16]} />

        <meshPhysicalMaterial
          color="#c2263c"
          roughness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </mesh>

      <mesh geometry={stemGeometry} castShadow>
        <meshStandardMaterial color="#5d7a34" roughness={0.6} />
      </mesh>
    </group>
  );
}

// =====================================================================
// SCATTER ROUTER
// =====================================================================

function ScatterToppings({ toppings }) {
  const pieces = useMemo(
    () =>
      toppings.flatMap((entry, typeIndex) => {
        const option = getOption("toppings", entry.id);

        if (!option || option.scene?.type === "cherry") {
          return [];
        }

        return buildToppingPieces(option.scene?.type, typeIndex);
      }),
    [toppings],
  );

  return (
    <group>
      {pieces.map((piece) => (
        <ToppingPiece key={`${piece.type}-${piece.index}`} piece={piece} />
      ))}
    </group>
  );
}

// =====================================================================
// FULL BOWL ASSEMBLY
// =====================================================================

function BuildBowl({ config }) {
  const flavor = getOption("flavor", config.flavor);

  const hasCherry = config.toppings.some(
    (entry) => getOption("toppings", entry.id)?.scene?.type === "cherry",
  );

  return (
    <group>
      <Bowl />

      {SCOOPS.map((scoop) => (
        <Scoop
          key={scoop.id}
          center={scoop.center}
          r={scoop.r}
          flavor={flavor}
          seed={seedOf(`scoop-${scoop.id}-${config.flavor}`)}
        />
      ))}

      {config.syrup.map((entry, index) => {
        const option = getOption("syrup", entry.id);

        if (!option) return null;

        return SCOOPS.map((scoop) => (
          <SyrupDrizzle
            key={`${entry.id}-${scoop.id}`}
            color={option.scene?.color}
            index={index}
            scoop={scoop}
          />
        ));
      })}

      <ScatterToppings toppings={config.toppings} />

      {hasCherry && <MaraschinoCherry />}
    </group>
  );
}

// =====================================================================
// EXPORTED SCENE
// =====================================================================

export default function IceCreamScene3D({ config }) {
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

      <group scale={SCENE_SCALE} position={[0, -0.42, 0]}>
        <BuildBowl config={config} />
      </group>

      <ContactShadows
        position={[0, -0.44, 0]}
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
