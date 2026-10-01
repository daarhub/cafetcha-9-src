// =====================================================================
//  TEA 3D SCENE - built 100% from code (no GLB files needed).
//  Reads the guest's choices from the CUSTOMIZE_TEA config, so any
//  option an admin adds/edits/deletes automatically shows up here.

//  Layout: a tall, flat-bottomed open glass (lathe - no lid, no base),
//  strongly colored tea inside (per-flavor gradient - strawberry matcha
//  gets a white middle layer), NO ice, and every chosen topping piled in
//  natural layers at the BOTTOM of the cup: popping boba in two packed
//  rows per flavor, each extra boba flavor and the tapioca pearls stacked
//  ON TOP of the pieces already in the cup, nata de coco & coffee jelly
//  scattered loosely over the pile - everything fully submerged and
//  visible through the clear glass and liquid. Honey is the only add-on
//  that never sinks: a thin, continuous W-shaped drizzle lying flat on
//  the drink surface (the same squeeze-bottle style as the frappe).
//  The only motion is the slow spin of the OrbitControls camera.
//  =====================================================================
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Instance,
  Instances,
  Lightformer,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getOption } from "./customizeTeaData";

// ---- Cup measurement constants (world units) -------------------------
const CUP_BOTTOM_Y = -1.2; // completely flat bottom (rests on the ground)
const CUP_TOP_Y = 1.2; // open rim - the cup is never covered
const GLASS_T = 0.035; // wall thickness
const LIQUID_TOP_Y = 1.02; // translucent tea fills to just below the rim
const SCENE_SCALE = 0.56; // whole drink drawn smaller inside the stage

// Glass profile for the lathe (radius, height): a completely flat
// bottom, a very slight V taper (subtly narrower toward the bottom) and
// a wide open top - no lid and no separate base, one single open vessel.

const GLASS_PROFILE = [
  [0.0, CUP_BOTTOM_Y], // centre of the flat bottom
  [0.5, CUP_BOTTOM_Y], // flat bottom disc
  [0.6, CUP_BOTTOM_Y + 0.012], // rounded bottom corner
  [0.68, CUP_BOTTOM_Y + 0.08],
  [0.72, CUP_BOTTOM_Y + 0.24], // subtle V: narrowest just above the base
  [0.74, CUP_BOTTOM_Y + 0.55],
  [0.76, CUP_BOTTOM_Y + 1.0],
  [0.79, CUP_TOP_Y -  0.04],
  [0.8, CUP_TOP_Y], // ...and stops - the top stays wide open
];

// The liquid hugs the inside of the glass and stops at the drink line.
// Its floor is lifted a hair above the glass base: sharing the exact
// same plane made the two surfaces z-fight (flicker) while orbiting.

const LIQUID_BOTTOM_LIFT = 0.012;

const LIQUID_PROFILE = GLASS_PROFILE.map(([r, y], i) => [
  i ===  0 ? 0.0 : Math.max(0.02, r - GLASS_T),
  Math.min(y === CUP_BOTTOM_Y ? y + LIQUID_BOTTOM_LIFT : y, LIQUID_TOP_Y),
]);

// Deterministic random so pieces stay put between renders.

const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |=  0;
    a = (a +  0x6d2b79f5) |  0;
    let t = Math.imul(a ^ (a >>>  15),  1 | a);
    t = (t + Math.imul(t ^ (t >>>  7),  61 | t)) ^ t;
    return ((t ^ (t >>>  14)) >>>  0) / 4294967296;
  };
};

const seedOf = (text) =>
  text.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

// Deterministic 0..1 hash used for subtle per-vertex grain.

const hash01 = (n) => {
  const s = Math.sin(n * 127.1 +  311.7) * 43758.5453;
  return s - Math.floor(s);
};

// The tea itself: a lathe fill with a strong, realistic vertical color
// gradient (bottom -> optional middle -> top from the tea option's scene
// colors - strawberry matcha gets solid red / white / matcha green bands)
// plus fine per-vertex grain, kept translucent so the toppings piled
// underneath stay clearly visible through the liquid.
//
// Teas flagged texture:"frappe" (Matcha, Strawberry Matcha, Wintermelon,
// Creamy Milk) get the full FrappeScene3D treatment AND a thick, creamy,
// fully OPAQUE body (same material values, richer saturated colours).
// The body is the same shell with REVERSED winding: its inner (far) wall
// then faces the camera and lights up bright, so the drink reads solid
// while the toppings inside remain clearly visible in front of it. A
// light translucent film over the toppings sells the "submerged in a
// thick drink" look. Peach Green Tea, Lychee Green Tea and Honey Lemon
// keep the clean translucent tea-gradient look.

function TeaLiquid({ bottom, mid, top, stops, frappeStyle }) {
  const { geometry, bodyGeometry } = useMemo(() => {
    const buildLiquid = (profile) => {
      const g = new THREE.LatheGeometry(
        profile.map(([r, y]) => new THREE.Vector2(r, y)),
        96,
      );
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const base = new THREE.Color(bottom || "#b7c873");
    const middle = mid ? new THREE.Color(mid) : null;
    const surface = new THREE.Color(top || "#dae6a1");
    // layer boundaries as fractions of the fill height (strawberry
    // matcha: 40% red / 25% milk-white / 35% green)
    const [midStart, midEnd] = stops || [0.5, 0.6];
    // frappe-style recipe inputs (same seeds/tones as FrappeScene3D)
    const frappeRand = frappeStyle ? mulberry32(seedOf("liquid-streaks")) : null;
    const streakA = frappeStyle ? 5 + Math.floor(frappeRand() * 4) : 0;
    const streakB = frappeStyle ? 11 + Math.floor(frappeRand() * 5) : 0;
    const phaseA = frappeStyle ? frappeRand() * Math.PI * 2 : 0;
    const phaseB = frappeStyle ? frappeRand() * Math.PI * 2 : 0;
    const lum = frappeStyle
      ? base.r * 0.2126 + base.g * 0.7152 + base.b * 0.0722
      : 0;
    const lightDrink = lum > 0.45;
    const streakTint = frappeStyle
      ? lightDrink
        ? new THREE.Color("#4e463f").lerp(base, 0.22)
        : new THREE.Color("#f4e7d2").lerp(base, 0.3)
      : null;
    const creamTint = frappeStyle
      ? base.clone().lerp(new THREE.Color("#fff6e8"), 0.42)
      : null;
    const tint = new THREE.Color();
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const depth = THREE.MathUtils.clamp(
        (y - CUP_BOTTOM_Y) / (LIQUID_TOP_Y - CUP_BOTTOM_Y),
        0,
        1,
      );
      if (middle) {
        // solid layered bands, softly blended at the boundaries (sharper
        // separation on the thick frappe-style drinks)
        const blend = frappeStyle ? 0.03 : 0.05;
        if (depth < midStart - blend) {
          tint.copy(base);
        } else if (depth < midStart) {
          tint.copy(base).lerp(middle, (depth - (midStart - blend)) / blend);
        } else if (depth <= midEnd) {
          tint.copy(middle);
        } else if (depth <= midEnd + blend) {
          tint.copy(middle).lerp(surface, (depth - midEnd) / blend);
        } else {
          tint.copy(surface);
        }
      } else {
        tint.copy(base).lerp(surface, depth);
      }
      if (frappeStyle) {
        const theta = Math.atan2(z, x);
        // depth shading + blending streaks + soft banding + spiral swirls
        let shade =
          (frappeStyle ? 0.9 + 0.22 * depth : 0.76 + 0.32 * depth) *
          (1 +
            0.06 * Math.sin(theta * streakA + phaseA) +
            0.045 * Math.sin(theta * streakB + phaseB) +
            0.03 * Math.sin(y * 9 + phaseA) +
            0.05 * Math.sin(theta * 2 + y * 5.5 + phaseB));
        if (depth > 0.93) shade *= 1 + (depth - 0.93) * 1.1;
        tint.multiplyScalar(shade);
        // three-octave swirls in the contrast tone
        const broad = Math.pow(
          0.5 +
            0.5 *
              Math.sin(theta * 1.8 + y * 3.6 + phaseA) *
              Math.sin(theta * 3.2 - y * 2.6 + phaseB),
          1.2,
        );
        const midSwirl = Math.pow(
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
          (lightDrink ? 0.56 : 0.46) *
            (0.32 * broad + 0.26 * midSwirl + 0.3 * fine),
        );
        // creamy patches winding through the drink
        const creamSwirl =
          0.5 +
          0.5 *
            Math.sin(theta * 1.6 + y * 3.2 + phaseA) *
            Math.cos(y * 2.1 - phaseB);
        tint.lerp(creamTint, 0.05 + 0.07 * creamSwirl);
      } else {
        // gentle swirl-y tone variation so the tea reads as liquid
        tint.multiplyScalar(
          0.92 +
            0.08 * Math.sin(x * 6.4 + z * 5.1 + depth * 4.2) +
            (hash01(i * 1.73) - 0.5) * 0.06,
        );
      }
      // frappe-style drinks read thicker and richer: saturate and lift
      // the tone so the colour is vibrant and creamy, never watery
      if (frappeStyle) {
        const hsl = { h: 0, s: 0, l: 0 };
        tint.getHSL(hsl);
        tint.setHSL(
          hsl.h,
          Math.min(1, hsl.s * 1.35),
          hsl.l > 0.85 ? hsl.l : Math.min(0.85, hsl.l * 1.08),
        );
      }
      // fine speckle grain across the whole liquid
      const grain = hash01(i * 1.37);
      if (grain > 0.965) tint.multiplyScalar(1.09);
      else if (grain < 0.035) tint.multiplyScalar(0.9);
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
    }
      g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      return g;
    };

    const geometry = buildLiquid(LIQUID_PROFILE);
    // frappe-style body: same shell with REVERSED winding - the inner
    // (far) wall becomes front-facing toward the camera, so it renders
    // bright and solid instead of unlit/black
    const bodyGeometry = frappeStyle
      ? buildLiquid([...LIQUID_PROFILE].reverse())
      : null;
    return { geometry, bodyGeometry };
  }, [bottom, mid, top, stops, frappeStyle]);

  // Tiny suspended specks hugging the wall (frappe-style teas only) -
  // the same suspension dust the frappe liquid carries.
  const specks = useMemo(() => {
    if (!frappeStyle) return [];
    const base = new THREE.Color(bottom || "#b7c873");
    const lum = base.r * 0.2126 + base.g * 0.7152 + base.b * 0.0722;
    const light = lum > 0.45;
    const rand = mulberry32(seedOf("tea-specks"));
    return Array.from({ length: 120 }, (_, i) => {
      const y =
        CUP_BOTTOM_Y + 0.14 + rand() * (LIQUID_TOP_Y - CUP_BOTTOM_Y - 0.24);
      const wallR = innerRadiusAt(y) - 0.004;
      const a = rand() * Math.PI * 2;
      return {
        position: [Math.cos(a) * wallR, y, Math.sin(a) * wallR],
        scale: (0.004 + rand() * 0.006) * (0.75 + rand() * 0.5),
        color: light
          ? new THREE.Color("#5a5148").lerp(base, 0.35).getStyle()
          : new THREE.Color("#f4e7d2").lerp(base, 0.4).getStyle(),
        key: i,
      };
    });
  }, [frappeStyle, bottom]);

  return (
    <group>
      {/* thick opaque body (frappe-style only): reversed winding makes the
          inner far wall front-facing, so it lights up bright and solid */}
      {frappeStyle && bodyGeometry && (
        <mesh geometry={bodyGeometry}>
          <meshPhysicalMaterial
            vertexColors
            roughness={0.34}
            clearcoat={0.4}
            clearcoatRoughness={0.3}
            sheen={0.55}
            sheenRoughness={0.55}
            sheenColor="#ffffff"
            envMapIntensity={0.8}
          />
        </mesh>
      )}
      {/* translucent film: tints the toppings so they read submerged in
          the thick drink while staying clearly visible */}
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          vertexColors
          transparent
          opacity={frappeStyle ? 0.35 : 0.82}
          roughness={frappeStyle ? 0.3 : 0.22}
          clearcoat={0.5}
          clearcoatRoughness={0.25}
          sheen={0.35}
          sheenRoughness={0.5}
          sheenColor="#ffffff"
          side={frappeStyle ? THREE.FrontSide : THREE.DoubleSide}
          depthWrite={false}
          envMapIntensity={0.9}
        />
      </mesh>
      {specks.length > 0 && (
        <Instances
          key={`specks-${bottom}`}
          limit={specks.length}
          range={specks.length}
        >
          <sphereGeometry args={[1, 6, 6]} />
          <meshStandardMaterial roughness={0.6} />
          {specks.map((speck) => (
            <Instance
              key={speck.key}
              position={speck.position}
              scale={speck.scale}
              color={speck.color}
            />
          ))}
        </Instances>
      )}
    </group>
  );
}

// The clear U-cup glass: the drink stays visible through it so every piece
// of boba and add-on shows through the wall.

function TeaCup() {
  const geometry = useMemo(() => {
    return new THREE.LatheGeometry(
      GLASS_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      64,
    );
  }, []);

  return (
    <mesh geometry={geometry} castShadow>
      <meshPhysicalMaterial
        color="#e8f4ff"
        transparent
        opacity={0.2}
        roughness={0.05}
        metalness={0}
        envMapIntensity={1.4}
        clearcoat={1}
        clearcoatRoughness={0.06}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
// Inside radius of the glass wall at a given height (profile minus the
// wall thickness) - keeps every topping piece inside the liquid.

function innerRadiusAt(y) {
  const pts = GLASS_PROFILE;
  if (y <= pts[0][1]) return pts[1][0] - GLASS_T;
  for (let i = 1; i < pts.length; i += 1) {
    const [r1, y1] = pts[i];
    const [r0, y0] = pts[i - 1];
    if (y <= y1) {
      const t = (y - y0) / Math.max(1e-6, y1 - y0);
      return r0 + (r1 - r0) * t - GLASS_T;
    }
  }
  return pts[pts.length - 1][0] - GLASS_T;
}

// Golden-angle (phyllotaxis) disc packing: pieces sit snugly side by side
// like real settled toppings - never a sparse grid, never a single row.

function packDisc(count, rMax, y, phase, rand, sink) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const rr = rMax * Math.sqrt((i + 0.5) / count);
    const a = i * golden + phase + (rand() - 0.5) * 0.24;
    items.push({
      x: Math.cos(a) * rr + (rand() - 0.5) * 0.02,
      z: Math.sin(a) * rr + (rand() - 0.5) * 0.02,
      y: y - rand() * sink,
      s: 0.9 + rand() * 0.2,
    });
  }
  return items;
}

// The whole topping stack, built bottom-up the way a barista assembles
// the cup - everything rests at the BOTTOM of the drink, fully submerged
// and visible through the glass and tea:
//   - popping boba: two packed rows per flavor, starting on the cup floor;
//   - each extra boba flavor and the tapioca pearls layer ON TOP of the
//     pieces already in the cup, so the pile simply grows taller;
//   - nata de coco & coffee jelly are loose bites scattered over the pile.

function ToppingStack({ boba, addOns }) {
  const { spheres, pearls, pearlColor, cubes } = useMemo(() => {
    const rand = mulberry32(
      seedOf([...boba, ...addOns].map((o) => o.id).join("|") || "none") + 101,
    );
    const spheres = [];
    const pearls = [];
    const cubes = [];
    let pearlColor = "#4a2f21";

    // Sphere rows laid bottom-up: two rows of popping boba per flavor,
    // then two rows of tapioca pearls - everything sinks to the bottom.
    const rows = [];
    boba.forEach((option) => {
      const color = option.scene?.color || "#ee5d92";
      rows.push({ color, count: 38, r: 0.075, pearl: false });
      rows.push({ color, count: 30, r: 0.075, pearl: false });
    });
    addOns.forEach((option) => {
      if (option.scene?.type === "tapioca") {
        pearlColor = option.scene?.color || "#4a2f21";
        rows.push({ count: 32, r: 0.085, pearl: true });
        rows.push({ count: 26, r: 0.085, pearl: true });
      }
    });

    // Rows overlap slightly so the pile reads as one natural mound; when
    // a lot of toppings are chosen the rows pack tighter to stay low.
    const spacing = Math.min(
      0.105,
      Math.max(0.06, 0.82 / Math.max(1, rows.length)),
    );
    let cursor = CUP_BOTTOM_Y + 0.012; // the first row rests ON the floor
    let prevR = 0.46;
    rows.forEach((row, index) => {
      const y = cursor + row.r;
      const rMax = Math.min(prevR + 0.05, innerRadiusAt(y) - row.r - 0.02);
      const phase = index * 1.9 + rand() * Math.PI * 2;
      packDisc(row.count, rMax, y, phase, rand, 0.016).forEach((piece) => {
        const item = {
          ...piece,
          s: piece.s * (row.r / (row.pearl ? 0.088 : 0.078)),
        };
        if (row.pearl) pearls.push(item);
        else spheres.push({ ...item, color: row.color });
      });
      cursor += spacing;
      prevR = rMax;
    });

    // Nata de coco & coffee jelly: loose bites resting ON TOP of the pile,
    // some sunk halfway in so they look settled rather than floating.
    let pileTop = Math.max(CUP_BOTTOM_Y + 0.05, cursor - spacing + 0.03);
    addOns.forEach((option) => {
      const type = option.scene?.type;
      if (type !== "nata" && type !== "jelly") return;
      const size = type === "jelly" ? 0.12 : 0.115;
      const count = type === "jelly" ? 26 : 30;
      for (let i = 0; i < count; i += 1) {
        const a = rand() * Math.PI * 2;
        const y = pileTop + size * 0.42 + rand() * 0.06;
        const rMax = Math.min(0.5, innerRadiusAt(y) - size * 0.8);
        const r = Math.sqrt(rand()) * rMax;
        cubes.push({
          x: Math.cos(a) * r,
          y: y - rand() * 0.02,
          z: Math.sin(a) * r,
          rotX: (rand() - 0.5) * 0.9,
          rotY: rand() * Math.PI * 2,
          rotZ: (rand() - 0.5) * 0.9,
          s: 0.85 + rand() * 0.3,
          type,
          color: option.scene?.color || "#f6f0e6",
        });
      }
      pileTop += 0.05; // a second loose add-on rests a touch higher
    });

    return { spheres, pearls, pearlColor, cubes };
  }, [boba, addOns]);

  if (!spheres.length && !pearls.length && !cubes.length) return null;

  return (
    <group>
      {/* all popping boba flavors in one instanced mesh (per-piece color) */}
      {spheres.length > 0 && (
        <Instances
          key={`boba-${spheres.length}`}
          limit={spheres.length}
          range={spheres.length}
        >
          <sphereGeometry args={[0.078, 18, 18]} />
          <meshPhysicalMaterial
            roughness={0.3}
            clearcoat={0.6}
            clearcoatRoughness={0.25}
          />
          {spheres.map((item, i) => (
            <Instance
              key={i}
              position={[item.x, item.y, item.z]}
              scale={item.s}
              color={item.color}
            />
          ))}
        </Instances>
      )}
      {/* tapioca pearls: their own, slightly bigger + matte instanced mesh */}
      {pearls.length > 0 && (
        <Instances
          key={`pearl-${pearls.length}`}
          limit={pearls.length}
          range={pearls.length}
        >
          <sphereGeometry args={[0.088, 18, 18]} />
          <meshPhysicalMaterial
            color={pearlColor}
            roughness={0.45}
            clearcoat={0.15}
          />
          {pearls.map((item, i) => (
            <Instance
              key={i}
              position={[item.x, item.y, item.z]}
              scale={item.s}
            />
          ))}
        </Instances>
      )}
      {/* nata de coco / coffee jelly bites resting on the pile */}
      {cubes.map((item, i) => (
        <RoundedBox
          key={`c-${i}`}
          args={[0.115, 0.115, 0.115]}
          radius={0.026}
          position={[item.x, item.y, item.z]}
          rotation={[item.rotX, item.rotY, item.rotZ]}
          scale={item.s}
        >
          <meshPhysicalMaterial
            color={item.color}
            roughness={item.type === "jelly" ? 0.2 : 0.32}
            clearcoat={0.25}
            clearcoatRoughness={0.3}
          />
        </RoundedBox>
      ))}
    </group>
  );
}
// Honey is the ONLY add-on that never sinks: the same continuous
// W-shaped squeeze-bottle drizzle the frappe customizer draws - straight
// diagonal strokes with sharp corners and hairpin turns, lying flat ON
// the drink surface (clamped inside the liquid radius and resting right
// on the tea line: never floating above it, never cutting into it).

const HONEY_MAX_R = 0.66; // stays well inside the liquid's inner wall

function HoneyDrizzle() {
  const geometry = useMemo(() => {
    const rand = mulberry32(seedOf("tea-honey-drizzle"));
    const angle = rand() * 0.6;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rows = 5; // zigzag rows drawn in one continuous stroke
    const halfWid = HONEY_MAX_R * 0.78;
    const amplitude = HONEY_MAX_R * 0.12;

    // Flat liquid surface: clamp the plan-view point inside the reach
    // circle and rest it right on the tea line.
    const toPoint = (along, w) => {
      let x = along * cos - w * sin;
      let z = along * sin + w * cos;
      const r = Math.hypot(x, z);
      if (r > HONEY_MAX_R) {
        x *= HONEY_MAX_R / r;
        z *= HONEY_MAX_R / r;
      }
      return new THREE.Vector3(x, LIQUID_TOP_Y + 0.008, z);
    };

    // Plan-view corner list: uneven zigzag rows (uneven spacing, stroke
    // lengths and swings) joined by short hairpin turns, boustrophedon.
    const corners = [];
    let forward = rand() > 0.5;
    let side = rand() > 0.5 ? 1 : -1;
    for (let p = 0; p < rows; p += 1) {
      const baseW =
        -halfWid + (p / (rows - 1)) * halfWid * 2 + (rand() - 0.5) * 0.08;
      const chord = Math.sqrt(
        Math.max(0.01, HONEY_MAX_R * HONEY_MAX_R - baseW * baseW),
      );
      const strokes = 5 + Math.floor(rand() * 3);
      const breaks = Array.from({ length: strokes - 1 }, () => rand()).sort(
        (a, b) => a - b,
      );
      for (let s = 0; s <= strokes; s += 1) {
        const t = s === 0 ? 0 : s < strokes ? breaks[s - 1] : 1;
        corners.push([
          forward ? -chord + t * chord * 2 : chord - t * chord * 2,
          baseW + side * amplitude * (0.55 + rand() * 0.85),
        ]);
        if (s < strokes) side *= -1;
      }
      forward = !forward;
    }

    // Sample the straight strokes densely so the clamp keeps every point
    // on the surface circle, then join them with sharp W corners.
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

    const path = new THREE.CurvePath();
    let last = null;
    for (const point of points) {
      if (last) {
        if (last.distanceToSquared(point) < 1e-8) continue;
        path.add(new THREE.LineCurve3(last, point));
      }
      last = point;
    }
    return new THREE.TubeGeometry(
      path,
      Math.max(2, path.curves.length),
      0.0125,
      6,
      false,
    );
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow>
      <meshPhysicalMaterial
        color="#f2a63d"
        roughness={0.2}
        clearcoat={0.6}
        clearcoatRoughness={0.15}
      />
    </mesh>
  );
}

// (No ice in this drink by design - keeping the view clear so the
// layered popping boba and add-ons at the bottom stay the star.)

// Printed brand on the cup: the rhombus logo.png with the "Cafétcha"
// name underneath, composited onto one canvas texture and wrapped on a
// slim curved patch hugging the middle of the (slightly tapered) wall.



const BRAND_NAME = "Cafétcha";
const LOGO_SRC = "/images/logo.png";

function CupBrand() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height =  768;
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

  // Conical open patch matching the wall taper (+0.004 clearance..
  const geometry = useMemo(
    () =>
      new THREE.CylinderGeometry(0.76, 0.71, 1.0, 24, 1, true, -0.6, 1.2),
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
// Reusable 3D stage. Pass it a config from buildTeaConfig().
//   config      - { size, tea, boba[], addOns[], sugar, }
//   interactive - allow drag/rotate (false = static preview)
//   autoRotate  - slowly spin when idle
export function TeaScene3D({
  config,
  interactive = true,
  autoRotate = true,
}) {
  const sizeOption = getOption("size", config.size);
  const teaOption = getOption("tea", config.tea);
  const cupScale = sizeOption?.scene?.cupScale || 1;
  // Shadow plane always hugs the actual bottom of the scaled cup.

  const groundY = CUP_BOTTOM_Y * cupScale * SCENE_SCALE;
const boba = (config.boba || []).map((id) => getOption("boba", id)).filter(Boolean);
  const addOns = (config.addOns || []).map((id) => getOption("addOns", id)).filter(Boolean);
  const hasHoney = addOns.some((option) => option.scene?.type === "honey");
  const bottomAddOns = addOns.filter((option) => option.scene?.type !== "honey");

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [3.7, 1.9, 3.8], fov:  30 }}
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
          scale={[7, 3,  1]}
          color="#ffffff"
        />
        <Lightformer
          intensity={1.2}
          position={[-4, 1, -3]}
          scale={[6, 2,  1]}
          color="#bfe0ff"
        />
        <Lightformer
          intensity={1.5}
          position={[0, 5,  0]}
          scale={[9, 1,1]}
          color="#ffe8c9"
        />
      </Environment>

      <group scale={cupScale * SCENE_SCALE}>
        <TeaCup />
        <TeaLiquid
          bottom={teaOption?.scene?.bottom}
          mid={teaOption?.scene?.mid}
          top={teaOption?.scene?.top}
          stops={teaOption?.scene?.stops}
          frappeStyle={teaOption?.scene?.texture === "frappe"}
        />
        {/* every topping piled in natural layers at the bottom */}
        <ToppingStack boba={boba} addOns={bottomAddOns} />
        {hasHoney && <HoneyDrizzle />}
        <CupBrand />
      </group>

      <ContactShadows
        position={[0, groundY - 0.02, 0]}
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

export default TeaScene3D;