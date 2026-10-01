"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OpeningRef, PointerRef, ProgressRef } from "../SiteExperience";
import { buildKnight, buildKnightFromImage, KNIGHT_KIND, KNIGHT_SOURCE, loadKnightGeometry, loadKnightImage, type KnightAsset } from "./knightModel";
import { buildLogo, type LogoAsset } from "./logoModel";

/*
 * Master storyboard: 01 → 02 → 03 → 04 → 08 → 09 → 10, time driven with scrolling locked.
 * Intro progress ip, 0 → 1 over INTRO_DURATION:
 *   0.00  01 START           dark world, thin central light on the horizon, HUD boot text
 *   0.08  02 PARTICLES       volumetric particle field, slow move through it
 *   0.26  03 KNIGHT FORMS    particles converge into the front-facing knight
 *   0.48  04 SCAN BEAM       vertical beam through the same knight, cross flare at the visor, radar rings
 *   0.635 08 GLITCH / BURST  knight destabilises and shatters from the visor outwards
 *   0.73  09 KN1GHTS LOGO    effect particles reverse into the crest + wordmark, framed full screen
 *   0.86  10 FINAL HERO      camera pulls back: knight reassembled behind, city, columns, rocks, floor
 * After the intro the same world stays behind the site (knight dimmed) and panel 10 returns at the final section.
 */

export const INTRO_DURATION = 18;
/** Seconds into the intro when the page content (hero tagline, header) fades in. */
export const OPENING_REVEAL = INTRO_DURATION * 0.95;
export const OPENING_END = INTRO_DURATION;
/** The intro waits at the end of the particle stage until the knight is ready. */
const HOLD_AT = INTRO_DURATION * 0.25;
/** Seconds the intro may wait at HOLD_AT before carrying on without the knight. */
const KNIGHT_WAIT = 15;

const TAN_HALF = Math.tan(THREE.MathUtils.degToRad(21.5));
const HERO_CAMERA = new THREE.Vector3(0, 0.4, 10);
/** Depth of each panel-10 layer: knight behind, wordmark in front. */
const LAYER = { knight: -4, logo: 1.5 };
/** Panel 10, as fractions of the screen height from the top. */
const FRAME = { helmTop: 0.01, knightHeight: 0.43, wordmarkBottom: 0.66, logoHeight: 0.305 };
const START_FLOOR = -1.9;
const EMERALD = new THREE.Color("#0b6f5e");
const NEON = new THREE.Color("#45f5d2");
const CYAN = new THREE.Color("#2ad2ff");
const TEAL = "#2ef2c4";

type Budget = { knight: number; fx: number; lines: number; shards: number; size: number };

function deviceBudget(): Budget {
  const w = window.innerWidth;
  if (w < 700) return { knight: 14000, fx: 4000, lines: 6000, shards: 120, size: 2.5 };
  if (w < 1100) return { knight: 20000, fx: 6000, lines: 14000, shards: 200, size: 2 };
  return { knight: 40000, fx: 10000, lines: 30000, shards: 420, size: 2.05 };
}

type Story = {
  ip: number; t: number; done: boolean; scroll: number;
  hero: number; finale: number; comp: number; ambient: number;
  flow: number; deep: number; startLight: number;
  form: number; lines: number; solid: boolean;
  scan: number; sweep: number; scanX: number; cross: number;
  unstable: number; burstKnight: number; burstFx: number; impact: number; glitch: number; shards: number;
  gather: number; reveal: number; logoOpacity: number; shine: number;
  knightGlow: number; env: number; haze: number; radar: number; bokeh: number; fieldW: number; fieldBoost: number;
  logoRect: THREE.Vector4; logoMask: number;
  knightPos: THREE.Vector3; knightScale: number; knightMatrix: THREE.Matrix4; visor: THREE.Vector3; impactPoint: THREE.Vector3;
  logo: THREE.Vector4; logoBottom: number; floorY: number;
};
type StoryRef = React.MutableRefObject<Story>;

// ---------------------------------------------------------------- helpers

function seeded(index: number, salt = 0) {
  const x = Math.sin(index * 129.17 + salt * 71.31) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number) {
  return 1 - (1 - clamp01(value)) ** 3;
}

let glowCache: THREE.CanvasTexture | null = null;
function glowTexture() {
  if (glowCache) return glowCache;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,.55)");
    g.addColorStop(0.45, "rgba(255,255,255,.14)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  }
  glowCache = new THREE.CanvasTexture(canvas);
  return glowCache;
}

const ringCache: THREE.CanvasTexture[] = [];
/** Radar ring styles: ticked dial, dashed track, segmented outer arcs. */
function ringTexture(kind: 0 | 1 | 2) {
  if (ringCache[kind]) return ringCache[kind];
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.translate(256, 256);
    ctx.strokeStyle = ctx.fillStyle = "#fff";
    if (kind === 0) {
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 236, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const inner = i % 10 === 0 ? 206 : 222;
        ctx.lineWidth = i % 10 === 0 ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner); ctx.lineTo(Math.cos(a) * 236, Math.sin(a) * 236); ctx.stroke();
      }
    } else if (kind === 1) {
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, 200, a, a + 0.36); ctx.stroke();
      }
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 178, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.lineWidth = 7;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        ctx.beginPath(); ctx.arc(0, 0, 244, a, a + 1.25); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 226, Math.sin(a) * 226, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ringCache[kind] = new THREE.CanvasTexture(canvas);
  return ringCache[kind];
}

function additive(color: THREE.ColorRepresentation, opacity = 0) {
  return { color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
}

// ---------------------------------------------------------------- particle data

/**
 * Attributes for one particle system. Field positions and seeds are fixed from the first frame; knight and logo
 * targets are filled in once those assets exist (the geometry is rebuilt with identical field data, so nothing jumps).
 */
function particleGeometry(count: number, salt: number, knight: KnightAsset | null, logo: LogoAsset | null, fx: boolean) {
  const seeds = new Float32Array(count), sizes = new Float32Array(count), kinds = new Float32Array(count);
  const orders = new Float32Array(count), letters = new Float32Array(count), tones = new Float32Array(count).fill(0.6);
  const field = new Float32Array(count * 3), target = new Float32Array(count * 3), normal = new Float32Array(count * 3);
  const burst = new Float32Array(count * 3), logoTarget = new Float32Array(count * 3), colors = new Float32Array(count * 3).fill(1);
  for (let i = 0; i < count; i++) {
    const k = i + salt;
    seeds[i] = seeded(k, 3);
    // foreground, midground and background layers of the volumetric field
    const layer = seeded(k, 7);
    field[i * 3] = seeded(k, 4) - 0.5;
    field[i * 3 + 1] = ((seeded(k, 5) + seeded(k, 6) + seeded(k, 19)) / 3 - 0.5) * (seeded(k, 20) < 0.6 ? 5 : 11);
    field[i * 3 + 2] = layer < 0.15 ? 2 + seeded(k, 8) * 7 : layer < 0.55 ? -8 + seeded(k, 8) * 10 : -30 + seeded(k, 8) * 22;
    let kind: number = KNIGHT_KIND.surface;
    if (knight) {
      const n = knight.kinds.length;
      const src = fx ? Math.floor(seeded(k, 40) * n) : i % n;
      for (let j = 0; j < 3; j++) {
        target[i * 3 + j] = knight.targets[src * 3 + j];
        normal[i * 3 + j] = knight.normals[src * 3 + j];
        colors[i * 3 + j] = knight.colors[src * 3 + j];
      }
      kind = fx ? KNIGHT_KIND.surface : knight.kinds[src];
      orders[i] = knight.orders[src];
      tones[i] = knight.tones[src];
      // burst: away from the visor, wider sideways, with spread
      const tx = (target[i * 3] - knight.visor.x) * 1.3, ty = target[i * 3 + 1] - knight.visor.y, tz = target[i * 3 + 2] + 0.2;
      const len = Math.hypot(tx, ty, tz) || 1;
      const dist = (fx ? 1.5 : 0.9) * (0.35 + seeded(k, 9) ** 2 * 1.7);
      burst[i * 3] = (tx / len + (seeded(k, 10) - 0.5) * 0.8) * dist * 1.3;
      burst[i * 3 + 1] = (ty / len + (seeded(k, 11) - 0.5) * 0.8) * dist * 0.75;
      burst[i * 3 + 2] = (tz / len + seeded(k, 12) * 0.9) * dist * 0.8;
    }
    if (fx && logo) {
      const src = i % (logo.targets.length / 3);
      for (let j = 0; j < 3; j++) logoTarget[i * 3 + j] = logo.targets[src * 3 + j];
      letters[i] = logo.letters[src];
      if (seeded(k, 41) > 0.82) kind = 5; // sheds off the letters
    }
    kinds[i] = kind;
    const base = fx ? (kind === 5 ? 0.75 : 1) : 0.75 + tones[i] * 0.45;
    sizes[i] = (seeded(k, 17) > 0.965 ? 2.2 : 1) * base * (0.7 + seeded(k, 18) * 0.6);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(field, 3));
  geometry.setAttribute("aField", new THREE.BufferAttribute(field, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
  geometry.setAttribute("aOrder", new THREE.BufferAttribute(orders, 1));
  geometry.setAttribute("aLetter", new THREE.BufferAttribute(letters, 1));
  geometry.setAttribute("aTone", new THREE.BufferAttribute(tones, 1));
  geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aTarget", new THREE.BufferAttribute(target, 3));
  geometry.setAttribute("aNormal", new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute("aBurst", new THREE.BufferAttribute(burst, 3));
  geometry.setAttribute("aLogo", new THREE.BufferAttribute(logoTarget, 3));
  return geometry;
}

// ---------------------------------------------------------------- shaders

const particleVertex = `
  attribute float aSeed;
  attribute float aSize;
  attribute float aKind;
  attribute float aOrder;
  attribute float aLetter;
  attribute float aTone;
  attribute vec3 aColor;
  attribute vec3 aField;
  attribute vec3 aTarget;
  attribute vec3 aNormal;
  attribute vec3 aBurst;
  attribute vec3 aLogo;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uFieldW;
  uniform float uFlow;
  uniform float uDeep;
  uniform mat4 uKnight;
  uniform float uKnightZ;
  uniform float uKnightScale;
  uniform float uForm;
  uniform float uBurst;
  uniform vec3 uImpact;
  uniform float uUnstable;
  uniform float uGather;
  uniform vec4 uLogo;
  uniform float uRelease;
  uniform float uScan;
  uniform float uScanX;
  uniform float uBokeh;
  uniform float uFocus;
  uniform float uKnightDist;
  uniform float uFieldGain;
  uniform float uFieldSize;
  uniform vec4 uLogoRect;
  uniform float uLogoMask;
  varying float vAlpha;
  varying float vGlow;
  varying float vTone;
  varying float vSeed;
  varying float vCoc;
  varying float vKnight;
  varying vec3 vColor;

  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }

  void main() {
    // volumetric field: the raw material every shape is built from
    vec3 field = vec3(
      aField.x * uFieldW + sin(uTime * 0.21 + aSeed * 30.0) * 0.2,
      aField.y + cos(uTime * 0.17 + aSeed * 20.0) * 0.14,
      mod(aField.z + 30.0 + uFlow * (0.6 + aSeed * 0.8), 39.0) - 30.0);
    vec3 p = field - vec3(0.0, 0.0, uDeep);
    float alpha = 1.0;

    // knight: brightness follows the armour (edges bright, interior dim), formed progressively by order
    float tone = aTone;
    vec3 local = aTarget;
    if (aKind > 2.5 && aKind < 3.5) {
      float c = fract(uTime * 0.05 + aSeed * 7.0);
      local += aNormal * c * 0.12 + vec3(0.0, c * 0.04, 0.0);
      alpha *= sin(c * 3.14159);
    }
    float form = ease((uForm - aOrder * 0.7) / 0.3);
    vec3 k = (uKnight * vec4(local, 1.0)).xyz;
    float near = clamp((k.z - uKnightZ) / uKnightScale * 2.0 + 0.5, 0.0, 1.0);
    if (uUnstable > 0.0) {
      float tick = floor(uTime * 24.0);
      k.x += (hash(aSeed * 91.0 + tick) - 0.5) * uUnstable * 0.04 * uKnightScale;
      float band = floor(local.y * 18.0 + tick * 0.37);
      k.x += step(0.8, hash(band + tick)) * (hash(band * 3.1 + tick) - 0.5) * 0.1 * uUnstable * uKnightScale;
    }
    // break apart in a wave from the visor; lowering uBurst reverses it and reassembles the knight
    float wave = clamp(uBurst * 1.5 - length(aTarget - uImpact) * 1.3 - aSeed * 0.25, 0.0, 1.6);
    k += mat3(uKnight) * aBurst * (1.0 - pow(1.0 - min(wave, 1.0), 3.0) + max(wave - 1.0, 0.0) * 0.5);
    p = mix(p, k, form);
    float knightness = form * (1.0 - min(wave, 1.0) * 0.5);

    // KN1GHTS: fragments arrive letter by letter; some keep shedding off the letters
    float g = ease(uGather * 1.6 - aLetter * 0.6 - aSeed * 0.15);
    vec3 logo = vec3(uLogo.xy + aLogo.xy * uLogo.w, uLogo.z + aLogo.z * uLogo.w);
    if (aKind > 4.5) {
      float c = fract(uTime * 0.07 + aSeed * 5.0);
      logo += vec3(sin(c * 6.0 + aSeed * 20.0) * 0.015, c * 0.12, c * 0.03) * uLogo.w;
      alpha *= mix(1.0, sin(c * 3.14159), g);
    }
    p = mix(p, logo, g);
    knightness *= 1.0 - g;

    float release = ease(uRelease * 1.3 - aSeed * 0.3);
    p = mix(p, field, release);
    knightness *= 1.0 - release;

    // scan: hot at the beam, a fading trail behind it; dim interior lights up as the beam passes
    float dx = p.x - uScanX;
    float glow = uScan * knightness * (exp(-abs(dx) * 14.0 / uKnightScale) * 1.1 + step(dx, 0.0) * exp(dx * 3.0 / uKnightScale) * 0.18);
    glow *= mix(1.5, 1.0, aTone);

    vec4 mv = viewMatrix * vec4(p, 1.0);
    float dist = max(0.1, -mv.z);
    float shaped = clamp(form + g, 0.0, 1.0) * (1.0 - release);
    vCoc = clamp(abs(dist - uFocus) / 5.0, 0.0, 1.0) * uBokeh * (1.0 - shaped);
    vSeed = aSeed;
    vGlow = glow;
    vTone = mix(0.85, mix(tone, 1.0, g), shaped);
    vKnight = knightness;
    vColor = aColor;
    float free = 1.0 - shaped;
    vAlpha = alpha * mix(1.0, mix(0.55, 1.0, near), knightness) * (0.74 + 0.26 * sin(uTime * 1.7 + aSeed * 61.0)) * smoothstep(0.3, 2.0, dist) * mix(1.0, uFieldGain, free);
    float size = uSize * uPixelRatio * aSize * (8.0 / mix(dist, uKnightDist, knightness * 0.65)) * (1.0 + vCoc * 2.5) * (1.0 + min(glow, 1.5) * 0.25) * mix(1.0, uFieldSize, free);
    gl_PointSize = min(size, 64.0 * uPixelRatio);
    gl_Position = projectionMatrix * mv;
    // the background knight steps back where it sits directly behind the wordmark
    vec2 ndc = gl_Position.xy / gl_Position.w;
    float outside = max(max(uLogoRect.x - ndc.x, ndc.x - uLogoRect.z), max(uLogoRect.y - ndc.y, ndc.y - uLogoRect.w));
    vAlpha *= 1.0 - uLogoMask * (1.0 - smoothstep(0.0, 0.12, outside)) * knightness;
  }
`;

const particleFragment = `
  uniform vec3 uEmerald;
  uniform vec3 uNeon;
  uniform vec3 uCyan;
  uniform float uOpacity;
  uniform float uKnightGlow;
  uniform float uGlitch;
  varying float vAlpha;
  varying float vGlow;
  varying float vTone;
  varying float vSeed;
  varying float vCoc;
  varying float vKnight;
  varying vec3 vColor;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = pow(smoothstep(0.5, 0.0, d), 1.8);
    float disc = smoothstep(0.5, 0.38, d) * (0.5 + 0.5 * smoothstep(0.2, 0.48, d));
    float a = mix(core, disc, vCoc) * uOpacity * vAlpha * (0.15 + vTone * 0.85) / (1.0 + vCoc * 3.0);
    a *= mix(1.0, uKnightGlow, vKnight);
    vec3 palette = mix(uEmerald, uNeon, vTone);
    palette = mix(palette, uCyan, step(0.64, fract(vSeed * 3.7)) * 0.6);
    vec3 color = mix(palette, vColor * mix(0.75, 1.1, vTone), vKnight * 0.85);
    color = mix(color, vec3(0.85, 1.0, 0.95), clamp(vGlow, 0.0, 1.0) * 0.55);
    vec3 glitch = fract(vSeed * 11.3) > 0.5 ? vec3(1.0, 0.16, 0.3) : vec3(0.15, 0.95, 1.0);
    color = mix(color, glitch, uGlitch * step(0.7, fract(vSeed * 7.13)));
    gl_FragColor = vec4(color * (1.0 + vGlow * 0.8), a * (1.0 + vGlow));
  }
`;

const lineVertex = `
  uniform float uScanX;
  uniform float uScan;
  uniform float uKnightScale;
  varying float vGlow;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float dx = world.x - uScanX;
    vGlow = uScan * (exp(-abs(dx) * 9.0 / uKnightScale) * 1.6 + step(dx, 0.0) * exp(dx * 2.0 / uKnightScale) * 0.4);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const lineFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vGlow;
  void main() { gl_FragColor = vec4(uColor * (1.0 + vGlow), uOpacity * (0.5 + vGlow)); }
`;

const shardVertex = `
  attribute vec3 aBary;
  attribute vec3 aAnchor;
  attribute vec3 aAnchorNormal;
  attribute vec3 aDir;
  attribute vec3 aTint;
  attribute float aSpin;
  attribute float aScale;
  uniform mat4 uKnight;
  uniform float uBurst;
  varying vec3 vBary;
  varying vec3 vTint;
  mat3 spin(float a) {
    float c = cos(a), s = sin(a);
    return mat3(c, s * 0.6, -s * 0.8, -s * 0.6, c, s * 0.3, s * 0.8, -s * 0.3, c);
  }
  void main() {
    vec3 n = normalize(aAnchorNormal + vec3(0.0, 0.0, 0.0001));
    vec3 t = normalize(cross(n, abs(n.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
    vec3 b = cross(n, t);
    vec3 shard = spin(aSpin * (0.2 + uBurst * 3.0)) * (t * position.x + b * position.y) * aScale;
    vec3 local = aAnchor + aDir * (1.0 - pow(1.0 - min(uBurst, 1.0), 3.0)) + shard;
    vBary = aBary;
    vTint = aTint;
    gl_Position = projectionMatrix * viewMatrix * uKnight * vec4(local, 1.0);
  }
`;

const shardFragment = `
  uniform float uOpacity;
  varying vec3 vBary;
  varying vec3 vTint;
  void main() {
    float line = 1.0 - smoothstep(0.0, 0.07, min(min(vBary.x, vBary.y), vBary.z));
    gl_FragColor = vec4(vTint * (0.5 + line * 1.1), (0.22 + line * 0.9) * uOpacity);
  }
`;

const wordmarkVertex = `
  attribute float aLetter;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  varying float vLetter;
  void main() {
    vLocal = position;
    vLetter = aLetter;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** Energy-metal letters: pale teal face with a slow sheen, neon rim on the bevels, fragment-by-fragment reveal. */
const wordmarkFragment = `
  uniform float uReveal;
  uniform float uTime;
  uniform float uShine;
  uniform float uOpacity;
  uniform float uAspect;
  uniform float uMirror;
  uniform float uFloorY;
  varying vec3 vLocal;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vWorld;
  varying float vLetter;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    float n = hash(floor(vLocal * vec3(120.0, 120.0, 1.0)));
    float threshold = clamp(uReveal * 1.5 - vLetter * 0.5, 0.0, 1.0);
    float resolved = smoothstep(0.0, 0.35, threshold * 1.35 - n * 0.35);
    if (resolved < 0.01) discard;
    float forming = (1.0 - resolved) * step(threshold, 0.999);
    vec3 normal = normalize(vNormal);
    float facing = abs(normal.z);
    float y = clamp(vLocal.y / uAspect + 0.5, 0.0, 1.0);
    vec3 face = mix(vec3(0.5, 0.9, 0.82), vec3(0.95, 1.0, 0.98), smoothstep(0.0, 1.0, y));
    float sweep = smoothstep(0.05, 0.0, abs(vLocal.x + vLocal.y * 0.35 - (fract(uTime * 0.07) * 1.8 - 0.9)));
    face += vec3(0.55, 1.0, 0.9) * sweep * 0.35 * uShine;
    vec3 rim = mix(vec3(0.25, 1.0, 0.82), vec3(0.3, 0.88, 1.0), 0.5 + 0.5 * sin(vLocal.x * 7.0 + uTime * 0.4)) * (1.1 + uShine * 0.5);
    vec3 color = mix(rim, face, smoothstep(0.6, 0.92, facing));
    color += rim * pow(1.0 - max(dot(normal, normalize(vView)), 0.0), 2.0) * 0.45;
    color += vec3(0.25, 1.0, 0.8) * forming * 0.5;
    float alpha = uOpacity * resolved;
    if (uMirror > 0.5) alpha *= (1.0 - smoothstep(0.0, 0.9, uFloorY - vWorld.y)) * 0.2;
    gl_FragColor = vec4(color, alpha);
  }
`;

const gradientVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

const beamFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 3.0);
    float y = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
    gl_FragColor = vec4(uColor, x * y * uOpacity);
  }
`;

const columnFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    float x = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.0);
    float y = smoothstep(0.0, 0.03, vUv.y) * (0.35 + 0.65 * pow(1.0 - vUv.y, 0.8));
    gl_FragColor = vec4(uColor * (1.0 + x), x * y * uOpacity);
  }
`;

const floorVertex = `
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const floorFragment = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uNear;
  uniform float uFar;
  uniform vec2 uGlow;
  varying vec3 vWorld;
  void main() {
    vec2 g = vWorld.xz * 0.75 + vec2(0.0, uTime * 0.3);
    vec2 grid = abs(fract(g - 0.5) - 0.5) / fwidth(g);
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);
    float fade = smoothstep(uFar, uFar + 22.0, vWorld.z) * smoothstep(uNear, uNear - 6.0, vWorld.z) * smoothstep(30.0, 6.0, abs(vWorld.x));
    float glow = smoothstep(12.0, 0.0, length(vWorld.xz - uGlow));
    vec3 color = mix(uColorA, uColorB, smoothstep(-10.0, 10.0, vWorld.x));
    gl_FragColor = vec4(color * (1.0 + glow), (line * (0.4 + glow * 0.7) + glow * 0.06) * fade * uOpacity);
  }
`;

const mistFragment = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), u.x), u.y);
  }
  void main() {
    vec2 p = vUv * vec2(6.0, 1.6) + vec2(uTime * 0.04, 0.0);
    float n = noise(p) * 0.6 + noise(p * 2.3 - uTime * 0.03) * 0.4;
    float band = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.4, vUv.y) * smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
    gl_FragColor = vec4(uColor, n * band * uOpacity);
  }
`;

const buildingVertex = `
  attribute float aSeed;
  varying vec3 vLocal;
  varying vec3 vScale;
  varying float vSeed;
  varying float vDist;
  void main() {
    vLocal = position;
    vSeed = aSeed;
    vScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
    vec4 mv = viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

/** Dark ruined towers: near-black faces, faint teal edges and a few lit windows, fading into fog with distance. */
const buildingFragment = `
  uniform vec3 uGlow;
  uniform vec3 uFog;
  uniform float uOpacity;
  varying vec3 vLocal;
  varying vec3 vScale;
  varying float vSeed;
  varying float vDist;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    bool sideX = abs(vLocal.x) > 0.499;
    vec2 face = sideX ? vec2(vLocal.z * vScale.z, vLocal.y * vScale.y) : vec2(vLocal.x * vScale.x, vLocal.y * vScale.y);
    float across = sideX ? 0.5 * vScale.z - abs(vLocal.z * vScale.z) : 0.5 * vScale.x - abs(vLocal.x * vScale.x);
    float edge = 1.0 - smoothstep(0.0, 0.06, min(across, (1.0 - vLocal.y) * vScale.y));
    vec2 cell = floor(face * vec2(3.0, 4.0));
    vec2 f = fract(face * vec2(3.0, 4.0));
    float lit = step(0.95, hash(cell + vSeed * 17.0)) * step(0.3, f.x) * step(f.x, 0.7) * step(0.35, f.y) * step(f.y, 0.62);
    vec3 color = vec3(0.006, 0.03, 0.03) + uGlow * (edge * (0.05 + vLocal.y * 0.12) + lit * 0.3);
    color = mix(color, uFog, smoothstep(10.0, 46.0, vDist) * 0.85);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

const rockFragment = `
  uniform vec3 uRim;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec3 color = vec3(0.004, 0.016, 0.014) + uRim * smoothstep(0.6, 1.0, vUv.y) * 0.2;
    gl_FragColor = vec4(color, uOpacity);
  }
`;

const glitchVertex = `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const glitchFragment = `
  uniform sampler2D tDiffuse;
  uniform float uAmount;
  uniform float uTime;
  varying vec2 vUv;
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  void main() {
    vec2 uv = vUv;
    float tick = floor(uTime * 24.0);
    float band = floor(uv.y * 26.0);
    uv.x += step(0.86, hash(band * 13.1 + tick)) * (hash(band + tick * 7.3) - 0.5) * 0.05 * uAmount;
    float split = 0.007 * uAmount;
    vec4 base = texture2D(tDiffuse, uv);
    float r = texture2D(tDiffuse, uv + vec2(split, 0.002 * uAmount)).r;
    float b = texture2D(tDiffuse, uv - vec2(split, 0.0)).b;
    vec3 color = vec3(r, base.g, b);
    color *= 1.0 - 0.08 * uAmount * step(0.5, fract(vUv.y * 220.0));
    float row = floor(uv.y * 180.0);
    float streak = step(0.988, hash(row + tick * 3.1)) * uAmount;
    color += streak * mix(vec3(1.0, 0.12, 0.28), vec3(0.1, 0.95, 1.0), step(0.5, hash(row * 1.7))) * 0.35;
    gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
  }
`;

// ---------------------------------------------------------------- 01 · start

function GridFloor({ story, y, near, far, glow, visible }: {
  story: StoryRef; y: (st: Story) => number; near: number; far: number; glow: [number, number]; visible: (st: Story) => number;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uColorA: { value: NEON.clone() }, uColorB: { value: CYAN.clone() }, uOpacity: { value: 0 }, uTime: { value: 0 },
      uNear: { value: near }, uFar: { value: far }, uGlow: { value: new THREE.Vector2(...glow) },
    },
    vertexShader: floorVertex, fragmentShader: floorFragment,
  }), [near, far, glow]);
  useFrame(() => {
    if (!mesh.current) return;
    const st = story.current;
    const show = visible(st);
    mesh.current.visible = show > 0.005;
    mesh.current.position.y = y(st);
    const u = (mesh.current.material as THREE.ShaderMaterial).uniforms;
    u.uOpacity.value = show;
    u.uTime.value = st.t;
  });
  return (
    <mesh ref={mesh} material={material} rotation-x={-Math.PI / 2} position={[0, 0, -10]} visible={false}>
      <planeGeometry args={[90, 60]} />
    </mesh>
  );
}

const startFloorY = () => START_FLOOR;
const startFloorVisible = (st: Story) => smoothstep(0, 0.07, st.ip) * (1 - smoothstep(0.16, 0.26, st.ip)) * 0.4;
const START_GLOW: [number, number] = [0, -14];

/** Panel 01: a thin, precise vertical light rising from the horizon of a dark grid. */
function Start({ story }: { story: StoryRef }) {
  const group = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTexture(), []);
  useFrame(() => {
    if (!group.current) return;
    const { startLight, t, ip } = story.current;
    group.current.visible = startLight > 0.005;
    group.current.scale.y = 0.15 + smoothstep(0, 0.1, ip) * 0.85;
    const flicker = 0.94 + Math.sin(t * 6) * 0.03 + Math.sin(t * 2.1) * 0.03;
    group.current.children.forEach((child, i) => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = startLight * flicker * [1, 0.3, 0.8, 0.4, 0.5][i];
    });
  });
  return (
    <>
      <GridFloor story={story} y={startFloorY} near={10} far={-38} glow={START_GLOW} visible={startFloorVisible} />
      <group ref={group} position={[0, START_FLOOR, -14]} visible={false}>
        <mesh position-y={9} scale={[0.06, 24, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#e8f6ff")} /></mesh>
        <mesh position-y={8} scale={[1.2, 26, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#2a8fd6")} /></mesh>
        <mesh scale={[2.2, 1.4, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#ffffff")} /></mesh>
        <mesh scale={[36, 0.18, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#7cc8ff")} /></mesh>
        <mesh position-y={-3} scale={[0.5, 6, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#4fb6ff")} /></mesh>
      </group>
    </>
  );
}

// ---------------------------------------------------------------- 10 · world

const finalFloorY = (st: Story) => st.floorY;
const finalFloorVisible = (st: Story) => st.env * 0.12;
const FINAL_GLOW: [number, number] = [0, -4];
const COLUMNS = [-12.2, -8.6, -5.8, 6, 8.9, 12.8];

/** Jagged dark rock/ruin silhouettes along the ground, low in the centre, higher toward the sides. */
function rockGeometry() {
  const shape = new THREE.Shape();
  const left = -26, right = 26;
  shape.moveTo(left, -1);
  for (let x = left, i = 0; x <= right; x += 0.35 + seeded(i, 1) * 0.8, i++) {
    const side = Math.min(1, Math.max(0, (Math.abs(x) - 2.5) / 9));
    const h = 0.45 + seeded(i, 2) * 0.5 + side * (0.8 + seeded(i, 3) * 1.6) + (seeded(i, 4) > 0.85 ? seeded(i, 5) * 1.1 * side : 0);
    shape.lineTo(x, h);
  }
  shape.lineTo(right, -1);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 1);
  // uv.y: 0 at the base, 1 at the highest peak, for the rim light
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  let max = 0;
  for (let i = 0; i < pos.count; i++) max = Math.max(max, pos.getY(i));
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - left) / (right - left), Math.max(0, pos.getY(i)) / max);
  return geometry;
}

/** Panel 10's world: ruined city both sides, teal light columns reflected in the ground, rocks, fog, radar rings. */
function World({ story }: { story: StoryRef }) {
  const haze = useRef<THREE.Group>(null);
  const env = useRef<THREE.Group>(null);
  const radar = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTexture(), []);
  const ringMaps = useMemo(() => [ringTexture(0), ringTexture(1), ringTexture(2)], []);
  const scene = useMemo(() => {
    const mist = [0, 1, 2].map(() => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#169e85") }, uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: gradientVertex, fragmentShader: mistFragment,
    }));
    const column = () => new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uColor: { value: new THREE.Color("#2ef2c4") }, uOpacity: { value: 0 } },
      vertexShader: gradientVertex, fragmentShader: columnFragment,
    });
    const columns = COLUMNS.map((x, i) => ({ x, z: -13 - seeded(i, 40) * 5, w: 0.22 + seeded(i, 41) * 0.2, material: column(), mirror: column() }));
    const rocks = new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uRim: { value: new THREE.Color("#2ef2c4") }, uOpacity: { value: 0 } },
      vertexShader: gradientVertex, fragmentShader: rockFragment,
    });
    // towers: a near layer flanking the knight and a hazier far layer
    const items = Array.from({ length: 96 }, (_, i) => {
      const side = i % 2 ? -1 : 1;
      const far = i >= 52;
      const x = side * (far ? 11.5 + seeded(i, 1) * 20 : 7.5 + seeded(i, 1) * 12);
      const tall = Math.min(1, (Math.abs(x) - 6) / 9);
      return {
        x, z: far ? -32 - seeded(i, 2) * 12 : -15 - seeded(i, 2) * 8,
        w: 0.9 + seeded(i, 5) * 2.2, d: 0.9 + seeded(i, 6) * 1.6,
        h: (far ? 6 + seeded(i, 3) * 12 : 4 + seeded(i, 3) * 9) * (0.55 + tall * 0.45),
      };
    });
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const seeds = new Float32Array(items.length);
    const towers = new THREE.InstancedMesh(box, new THREE.ShaderMaterial({
      transparent: true,
      uniforms: { uGlow: { value: NEON.clone() }, uFog: { value: new THREE.Color("#04211b") }, uOpacity: { value: 0 } },
      vertexShader: buildingVertex, fragmentShader: buildingFragment,
    }), items.length);
    const matrix = new THREE.Matrix4();
    items.forEach((b, i) => {
      towers.setMatrixAt(i, matrix.makeScale(b.w, b.h, b.d).setPosition(b.x, 0, b.z));
      seeds[i] = seeded(i, 9);
    });
    box.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));
    towers.frustumCulled = false;
    towers.userData = { base: 1 };
    return { mist, columns, rocks, towers, rockShape: rockGeometry() };
  }, []);

  useFrame(() => {
    if (!haze.current || !env.current || !radar.current) return;
    const st = story.current;
    haze.current.visible = st.haze > 0.005;
    haze.current.position.set(st.knightPos.x, st.knightPos.y, st.knightPos.z - 2);
    haze.current.scale.setScalar(st.knightScale / 4.7);
    haze.current.children.forEach((child, i) => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = st.haze * [0.32, 0.16][i];
    });
    const show = st.env + st.ambient * 0.18;
    env.current.visible = show > 0.005;
    env.current.position.y = st.floorY;
    env.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.ShaderMaterial | THREE.MeshBasicMaterial;
      const value = show * ((mesh.userData.base as number | undefined) ?? 1);
      if ("uniforms" in material) {
        material.uniforms.uOpacity.value = value;
        if (material.uniforms.uTime) material.uniforms.uTime.value = st.t;
      } else {
        material.opacity = value;
      }
    });
    // radar rings behind the knight's head
    radar.current.visible = st.radar > 0.005;
    radar.current.position.set(st.visor.x, st.visor.y, st.knightPos.z - 0.4);
    radar.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.scale.setScalar(st.knightScale * [1.05, 0.86, 1.25][i]);
      mesh.rotation.z = st.t * [0.04, -0.07, 0.025][i];
      (mesh.material as THREE.MeshBasicMaterial).opacity = st.radar * [0.14, 0.1, 0.08][i];
    });
  });

  return (
    <>
      <group ref={haze} visible={false}>
        <mesh scale={[24, 18, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#0b6a5a")} /></mesh>
        <mesh scale={[9, 9, 1]} position={[0, 1.4, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#13b49a")} /></mesh>
      </group>
      <group ref={radar} visible={false}>
        {ringMaps.map((map, i) => (
          <mesh key={i}><planeGeometry /><meshBasicMaterial map={map} {...additive(i === 1 ? "#25d8ff" : TEAL)} /></mesh>
        ))}
      </group>
      <GridFloor story={story} y={finalFloorY} near={9} far={-30} glow={FINAL_GLOW} visible={finalFloorVisible} />
      <group ref={env} visible={false}>
        <mesh position={[0, 4, -40]} scale={[150, 46, 1]} userData={{ base: 0.22 }}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#0d5f52")} /></mesh>
        <primitive object={scene.towers} />
        {scene.columns.map((c, i) => (
          <mesh key={`c${i}`} material={c.material} position={[c.x, 8, c.z]} scale={[c.w, 16, 1]} userData={{ base: 0.75 }}><planeGeometry /></mesh>
        ))}
        {scene.columns.map((c, i) => (
          <mesh key={`r${i}`} material={c.mirror} position={[c.x, -5, c.z]} scale={[c.w * 1.4, -10, 1]} userData={{ base: 0.36 }}><planeGeometry /></mesh>
        ))}
        <mesh position={[0, 0.2, -9]} scale={[70, 2.4, 1]} userData={{ base: 0.55 }}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#2ef2c4")} /></mesh>
        <mesh geometry={scene.rockShape} material={scene.rocks} position={[0, 0, -3.2]} userData={{ base: 1 }} />
        <mesh position={[0, 0.5, -2]} scale={[40, 2.2, 1]} material={scene.mist[0]} userData={{ base: 0.3 }}><planeGeometry /></mesh>
        <mesh position={[0, 0.9, 1.5]} scale={[30, 1.8, 1]} material={scene.mist[1]} userData={{ base: 0.22 }}><planeGeometry /></mesh>
        <mesh position={[0, 2.4, -7]} scale={[50, 5, 1]} material={scene.mist[2]} userData={{ base: 0.16 }}><planeGeometry /></mesh>
      </group>
    </>
  );
}

// ---------------------------------------------------------------- particles

function useParticleMaterial() {
  const gl = useThree((state) => state.gl);
  return useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uSize: { value: 2 }, uPixelRatio: { value: Math.min(gl.getPixelRatio(), 1.75) },
      uFieldW: { value: 10 }, uFlow: { value: 0 }, uDeep: { value: 30 },
      uKnight: { value: new THREE.Matrix4() }, uKnightZ: { value: 0 }, uKnightScale: { value: 1 },
      uForm: { value: 0 }, uBurst: { value: 0 }, uImpact: { value: new THREE.Vector3() }, uUnstable: { value: 0 },
      uGather: { value: 0 }, uLogo: { value: new THREE.Vector4() }, uRelease: { value: 0 },
      uScan: { value: 0 }, uScanX: { value: 0 }, uBokeh: { value: 0 }, uFocus: { value: 11 }, uKnightDist: { value: 6.5 },
      uFieldGain: { value: 1 }, uFieldSize: { value: 1 }, uLogoRect: { value: new THREE.Vector4(0, 0, 0, 0) }, uLogoMask: { value: 0 },
      uEmerald: { value: EMERALD.clone() }, uNeon: { value: NEON.clone() }, uCyan: { value: CYAN.clone() },
      uOpacity: { value: 0 }, uKnightGlow: { value: 1 }, uGlitch: { value: 0 },
    },
    vertexShader: particleVertex, fragmentShader: particleFragment,
  }), [gl]);
}

/** Knight particles (fx = false) and effect particles (fx = true) share one shader; only their targets differ. */
function Particles({ story, geometry, fx, size }: { story: StoryRef; geometry: THREE.BufferGeometry; fx: boolean; size: number }) {
  const points = useRef<THREE.Points>(null);
  const material = useParticleMaterial();
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    if (!points.current) return;
    const st = story.current;
    const u = (points.current.material as THREE.ShaderMaterial).uniforms;
    u.uTime.value = st.t;
    u.uSize.value = size;
    u.uFieldW.value = st.fieldW;
    u.uFlow.value = st.flow;
    u.uDeep.value = st.deep;
    (u.uKnight.value as THREE.Matrix4).copy(st.knightMatrix);
    u.uKnightZ.value = st.knightPos.z;
    u.uKnightScale.value = st.knightScale;
    u.uForm.value = st.form;
    (u.uImpact.value as THREE.Vector3).copy(st.impactPoint);
    u.uUnstable.value = st.unstable;
    u.uScan.value = st.scan;
    u.uScanX.value = st.scanX;
    u.uBokeh.value = st.bokeh;
    u.uKnightGlow.value = st.knightGlow;
    u.uFieldGain.value = 1 + 1.3 * st.fieldBoost;
    u.uFieldSize.value = 1 + 0.6 * st.fieldBoost;
    (u.uLogoRect.value as THREE.Vector4).copy(st.logoRect);
    u.uLogoMask.value = st.logoMask;
    u.uGlitch.value = Math.max(st.unstable * 0.7, st.glitch * 0.9);
    const fieldFade = 0.3 + 0.7 * smoothstep(0.05, 0.18, st.ip);
    if (fx) {
      u.uBurst.value = st.burstFx;
      u.uGather.value = st.gather;
      u.uRelease.value = st.ambient;
      (u.uLogo.value as THREE.Vector4).copy(st.logo);
      u.uOpacity.value = 0.75 * fieldFade * (1 + st.finale * 0.3);
    } else {
      u.uBurst.value = st.burstKnight;
      u.uOpacity.value = 0.72 * fieldFade;
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}

// ---------------------------------------------------------------- knight structure, scan and fragments

/** For a sculpted model: armour edge lines and a depth-only copy so its back half stays hidden. */
function KnightStructure({ story, knight }: { story: StoryRef; knight: KnightAsset }) {
  const group = useRef<THREE.Group>(null);
  const lines = useRef<THREE.LineSegments>(null);
  const occluder = useRef<THREE.Mesh>(null);
  const lineMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(TEAL) }, uOpacity: { value: 0 }, uScan: { value: 0 }, uScanX: { value: 0 }, uKnightScale: { value: 1 } },
    vertexShader: lineVertex, fragmentShader: lineFragment,
  }), []);

  useFrame(() => {
    if (!group.current) return;
    const st = story.current;
    group.current.matrix.copy(st.knightMatrix);
    group.current.matrixWorldNeedsUpdate = true;
    if (lines.current) {
      lines.current.visible = st.lines > 0.005;
      const u = (lines.current.material as THREE.ShaderMaterial).uniforms;
      u.uOpacity.value = st.lines * 0.45;
      u.uScan.value = st.scan;
      u.uScanX.value = st.scanX;
      u.uKnightScale.value = st.knightScale;
    }
    if (occluder.current) occluder.current.visible = st.solid;
  });

  return (
    <group ref={group} matrixAutoUpdate={false}>
      {knight.occluder ? (
        <mesh ref={occluder} geometry={knight.occluder} renderOrder={1} visible={false}>
          <meshBasicMaterial transparent colorWrite={false} depthWrite side={THREE.DoubleSide} />
        </mesh>
      ) : null}
      {knight.lines ? <lineSegments ref={lines} geometry={knight.lines} material={lineMaterial} frustumCulled={false} visible={false} renderOrder={2} /> : null}
    </group>
  );
}

/** Panel 04: vertical beam through the knight, a cross flare where it meets the visor, rings travelling with it. */
function Scan({ story }: { story: StoryRef }) {
  const beam = useRef<THREE.Group>(null);
  const flare = useRef<THREE.Group>(null);
  const glow = useMemo(() => glowTexture(), []);
  const bandMaterial = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color("#3dffc8") }, uOpacity: { value: 0 } },
    vertexShader: gradientVertex, fragmentShader: beamFragment,
  }), []);

  useFrame(() => {
    if (!beam.current || !flare.current) return;
    const st = story.current;
    const show = st.scan;
    beam.current.visible = show > 0.005;
    flare.current.visible = show * st.cross > 0.005;
    if (!beam.current.visible) return;
    const s = st.knightScale;
    beam.current.position.set(st.scanX, st.knightPos.y, st.knightPos.z + 0.4 * s);
    beam.current.scale.set(s, s * 1.6, 1);
    beam.current.children.forEach((child, i) => {
      const material = (child as THREE.Mesh).material as THREE.ShaderMaterial | THREE.MeshBasicMaterial;
      const opacity = show * [0.95, 0.45, 0.5][i];
      if ("uniforms" in material) material.uniforms.uOpacity.value = opacity;
      else material.opacity = opacity;
    });
    flare.current.position.set(st.scanX, st.visor.y, st.visor.z + 0.1 * s);
    flare.current.scale.setScalar(s);
    flare.current.children.forEach((child, i) => {
      ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = show * st.cross * [0.9, 0.8, 0.5][i];
    });
  });

  return (
    <>
      <group ref={beam} visible={false} renderOrder={3}>
        <mesh scale={[0.03, 1, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#f0fffa")} /></mesh>
        <mesh scale={[0.2, 1, 1]} material={bandMaterial}><planeGeometry /></mesh>
        <mesh scale={[0.09, 1.05, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#2ef2c4")} /></mesh>
      </group>
      <group ref={flare} visible={false}>
        <mesh scale={[0.9, 0.035, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#e8fff8")} /></mesh>
        <mesh scale={[0.22, 0.22, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#bfffee")} /></mesh>
        <mesh scale={[0.5, 0.16, 1]}><planeGeometry /><meshBasicMaterial map={glow} {...additive("#2ef2c4")} /></mesh>
      </group>
    </>
  );
}

/** Panel 08: glass-like armour shards torn off the knight's surface, flying outwards with red/cyan edges. */
function Fragments({ story, knight, count }: { story: StoryRef; knight: KnightAsset; count: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const { geometry, material } = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0.6, 0, -0.45, -0.4, 0, 0.5, -0.3, 0], 3));
    geo.setAttribute("aBary", new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1], 3));
    const dir = new Float32Array(count * 3), tint = new Float32Array(count * 3), spin = new Float32Array(count), scale = new Float32Array(count);
    const palette = [[0.9, 1, 0.97], [0.2, 1, 0.8], [0.15, 0.85, 1], [1, 0.22, 0.3]];
    for (let i = 0; i < count; i++) {
      const ax = (knight.anchors[i * 3] - knight.visor.x) * 1.3, ay = knight.anchors[i * 3 + 1] - knight.visor.y, az = knight.anchors[i * 3 + 2] + 0.2;
      const len = Math.hypot(ax, ay, az) || 1;
      const dist = 0.3 + seeded(i, 64) * 1.1;
      dir.set([(ax / len + (seeded(i, 61) - 0.5) * 0.6) * dist * 1.4, (ay / len + (seeded(i, 62) - 0.5) * 0.6) * dist * 0.7, (az / len + seeded(i, 63) * 0.8) * dist * 0.35], i * 3);
      tint.set(palette[i % 6 === 0 ? 3 : i % 4 === 0 ? 2 : i % 3 === 0 ? 0 : 1], i * 3);
      spin[i] = (seeded(i, 65) - 0.5) * 8;
      scale[i] = 0.012 + seeded(i, 66) ** 2 * 0.045;
    }
    geo.setAttribute("aAnchor", new THREE.InstancedBufferAttribute(knight.anchors, 3));
    geo.setAttribute("aAnchorNormal", new THREE.InstancedBufferAttribute(knight.anchorNormals, 3));
    geo.setAttribute("aDir", new THREE.InstancedBufferAttribute(dir, 3));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(tint, 3));
    geo.setAttribute("aSpin", new THREE.InstancedBufferAttribute(spin, 1));
    geo.setAttribute("aScale", new THREE.InstancedBufferAttribute(scale, 1));
    geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uKnight: { value: new THREE.Matrix4() }, uBurst: { value: 0 }, uOpacity: { value: 0 } },
      vertexShader: shardVertex, fragmentShader: shardFragment,
    });
    return { geometry: geo, material: mat };
  }, [knight, count]);

  useFrame(() => {
    if (!mesh.current) return;
    const st = story.current;
    mesh.current.visible = st.shards > 0.005;
    const u = (mesh.current.material as THREE.ShaderMaterial).uniforms;
    (u.uKnight.value as THREE.Matrix4).copy(st.knightMatrix);
    u.uBurst.value = easeOutCubic((st.ip - 0.664) / 0.08) + Math.max(0, st.ip - 0.74) * 0.8;
    u.uOpacity.value = st.shards;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} frustumCulled={false} visible={false} renderOrder={2} />;
}

// ---------------------------------------------------------------- 09 · 10 wordmark

/** The KN1GHTS crest + wordmark as real geometry in front of the knight, with restrained glow and a floor reflection. */
function Wordmark({ story, logo }: { story: StoryRef; logo: LogoAsset }) {
  const front = useRef<THREE.Mesh>(null);
  const mirror = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const [frontMaterial, mirrorMaterial] = useMemo(() => [0, 1].map((m) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: m === 0, side: m ? THREE.DoubleSide : THREE.FrontSide,
    uniforms: {
      uReveal: { value: 0 }, uTime: { value: 0 }, uShine: { value: 1 }, uOpacity: { value: 0 },
      uAspect: { value: logo.aspect }, uMirror: { value: m }, uFloorY: { value: 0 },
    },
    vertexShader: wordmarkVertex, fragmentShader: wordmarkFragment,
  })), [logo]);

  useFrame(() => {
    if (!front.current || !mirror.current || !halo.current) return;
    const st = story.current;
    const { x, y, z, w } = st.logo;
    const visible = st.reveal > 0.001 && st.logoOpacity > 0.005;
    front.current.visible = mirror.current.visible = halo.current.visible = visible;
    if (!visible) return;
    for (const mesh of [front.current, mirror.current]) {
      const u = (mesh.material as THREE.ShaderMaterial).uniforms;
      u.uReveal.value = st.reveal;
      u.uTime.value = st.t;
      u.uShine.value = st.shine;
      u.uOpacity.value = st.logoOpacity * (mesh === mirror.current ? st.env : 1);
      u.uFloorY.value = st.floorY;
    }
    front.current.position.set(x, y, z);
    front.current.scale.setScalar(w);
    mirror.current.position.set(x, 2 * st.floorY - y, z);
    mirror.current.scale.set(w, -w, w);
    halo.current.position.set(x, y, z - 0.05);
    halo.current.scale.set(w * logo.glowScale.x, w * logo.glowScale.y, 1);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = st.logoOpacity * st.reveal * 0.4 * st.shine;
  });

  return (
    <>
      <mesh ref={halo} visible={false} renderOrder={3}><planeGeometry /><meshBasicMaterial map={logo.glow} {...additive("#2bd9b0")} /></mesh>
      <mesh ref={mirror} geometry={logo.geometry} material={mirrorMaterial} visible={false} renderOrder={3} />
      <mesh ref={front} geometry={logo.geometry} material={frontMaterial} visible={false} renderOrder={4} />
    </>
  );
}

// ---------------------------------------------------------------- glitch pass

type GlitchPass = { target: THREE.WebGLRenderTarget; scene: THREE.Scene; camera: THREE.OrthographicCamera; material: THREE.ShaderMaterial };

function createGlitchPass(): GlitchPass {
  const target = new THREE.WebGLRenderTarget(1, 1, { colorSpace: THREE.SRGBColorSpace });
  const material = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 }, uTime: { value: 0 } },
    vertexShader: glitchVertex, fragmentShader: glitchFragment, depthTest: false, depthWrite: false,
  });
  const scene = new THREE.Scene();
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  return { target, scene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), material };
}

/** Renders the scene directly; only during the burst does it go through RGB split, tearing and scanlines. */
function Renderer({ story }: { story: StoryRef }) {
  const pass = useRef<GlitchPass | null>(null);
  const buffer = useRef(new THREE.Vector2());
  useEffect(() => () => {
    pass.current?.target.dispose();
    pass.current?.material.dispose();
  }, []);
  useFrame(({ gl, scene, camera, clock }) => {
    const amount = story.current.glitch;
    if (amount < 0.003) {
      gl.setRenderTarget(null);
      gl.render(scene, camera);
      return;
    }
    pass.current ??= createGlitchPass();
    const p = pass.current;
    gl.getDrawingBufferSize(buffer.current);
    if (p.target.width !== buffer.current.x || p.target.height !== buffer.current.y) p.target.setSize(buffer.current.x, buffer.current.y);
    gl.setRenderTarget(p.target);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    const u = p.material.uniforms;
    u.tDiffuse.value = p.target.texture;
    u.uAmount.value = amount;
    u.uTime.value = clock.elapsedTime;
    gl.render(p.scene, p.camera);
  }, 1);
  return null;
}

// ---------------------------------------------------------------- world

/** Storyboard HUD readouts shown per intro stage. */
function hudStage(ip: number) {
  if (ip < 0.1) return "start";
  if (ip > 0.12 && ip < 0.25) return "particles";
  if (ip > 0.3 && ip < 0.47) return "knight";
  if (ip > 0.5 && ip < 0.63) return "scan";
  if (ip > 0.64 && ip < 0.74) return "burst";
  if (ip > 0.84) return "logo";
  return "none";
}

export function CyberWorld({ progress, pointer, opening, glitch, hud }: {
  progress: ProgressRef;
  pointer: PointerRef;
  opening: OpeningRef;
  glitch: React.RefObject<HTMLDivElement | null>;
  hud: React.RefObject<HTMLDivElement | null>;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const budget = useMemo(() => deviceBudget(), []);
  const [knight, setKnight] = useState<KnightAsset | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fromReference = () => loadKnightImage().then((image) => buildKnightFromImage(image, budget));
    const source = KNIGHT_SOURCE.use === "model"
      ? loadKnightGeometry().then((geometry) => buildKnight(geometry, budget)).catch((error: unknown) => {
        console.warn("[KN1GHTS] knight model unavailable, using the reference knight:", error instanceof Error ? error.message : error);
        return fromReference();
      })
      : fromReference();
    source
      .then((asset) => { if (!cancelled) setKnight(asset); })
      .catch((error: unknown) => console.warn("[KN1GHTS] knight unavailable:", error instanceof Error ? error.message : error));
    return () => { cancelled = true; };
  }, [budget]);

  const logo = useMemo(() => buildLogo(budget.fx), [budget]);
  const knightGeometry = useMemo(() => particleGeometry(budget.knight, 0, knight, null, false), [budget, knight]);
  const fxGeometry = useMemo(() => particleGeometry(budget.fx, 90000, knight, logo, true), [budget, knight, logo]);

  const story = useRef<Story>({
    ip: 0, t: 0, done: false, scroll: 0, hero: 1, finale: 0, comp: 1, ambient: 0,
    flow: 0, deep: 30, startLight: 0, form: 0, lines: 0, solid: false,
    scan: 0, sweep: 0, scanX: 0, cross: 0, unstable: 0, burstKnight: 0, burstFx: 0, impact: 0, glitch: 0, shards: 0,
    gather: 0, reveal: 0, logoOpacity: 0, shine: 1, knightGlow: 1, env: 0, haze: 0, radar: 0, bokeh: 0, fieldW: 10, fieldBoost: 0,
    logoRect: new THREE.Vector4(), logoMask: 0,
    knightPos: new THREE.Vector3(), knightScale: 4, knightMatrix: new THREE.Matrix4(), visor: new THREE.Vector3(), impactPoint: new THREE.Vector3(),
    logo: new THREE.Vector4(0, 0, LAYER.logo, 4), logoBottom: 0, floorY: -2.6,
  });
  const anchors = useRef({ wait: 0, updates: 0.1, contact: 0.9 });
  const temp = useRef({
    quaternion: new THREE.Quaternion(), scale: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0),
    path: new THREE.Vector3(), knightFrame: new THREE.Vector3(), logoFrame: new THREE.Vector3(), ambient: new THREE.Vector3(),
    look: new THREE.Vector3(), probe: new THREE.Vector3(),
  });
  const hudState = useRef<{ stage: string; counters: HTMLElement[]; fields: Record<string, HTMLElement> } | null>(null);
  const glitchOn = useRef(false);
  const holding = useRef<{ since: number | null; gaveUp: boolean }>({ since: null, gaveUp: false });

  useFrame(({ clock, size }, delta) => {
    const st = story.current;
    const tmp = temp.current;
    const dt = Math.min(delta, 0.1);
    // hold the intro at the end of the particle stage until the knight is ready
    const hold = holding.current;
    if (!knight && !hold.gaveUp && opening.current >= HOLD_AT && opening.current < OPENING_END) {
      opening.current = HOLD_AT;
      hold.since ??= clock.elapsedTime;
      if (clock.elapsedTime - hold.since > KNIGHT_WAIT) {
        hold.gaveUp = true;
        console.warn(`[KN1GHTS] knight not ready after ${KNIGHT_WAIT}s, continuing without it`);
      }
    }
    const ip = clamp01(opening.current / INTRO_DURATION);
    const done = ip >= 1;
    st.ip = ip;
    st.done = done;
    st.t = clock.elapsedTime;

    // page sections (after the intro)
    const a = anchors.current;
    if (a.wait-- <= 0) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const at = (id: string, fallback: number) => {
        const node = document.getElementById(id);
        return node ? Math.min(1, (node.getBoundingClientRect().top + window.scrollY) / max) : fallback;
      };
      a.updates = at("updates", 0.1);
      a.contact = at("contact", 0.9);
      a.wait = 30;
    }
    const scroll = done ? progress.current : 0;
    st.scroll = scroll;
    st.hero = done ? 1 - smoothstep(a.updates * 0.35, a.updates * 0.95, scroll) : 1;
    st.finale = done ? smoothstep(a.contact - 0.02, a.contact + (1 - a.contact) * 0.5, scroll) : 0;
    st.comp = Math.max(st.hero, st.finale);
    st.ambient = done ? 1 - st.comp : 0;

    // stages
    st.startLight = smoothstep(0.02, 0.1, ip) * (1 - smoothstep(0.17, 0.26, ip));
    st.deep = (1 - smoothstep(0.05, 0.2, ip)) * 30;
    st.flow += dt * (0.1 + 1.2 * smoothstep(0.07, 0.13, ip) * (1 - smoothstep(0.24, 0.3, ip)) + st.ambient * 0.08);
    st.form = done ? 1 : clamp01((ip - 0.27) / 0.18);
    st.scan = done ? 0 : smoothstep(0.48, 0.5, ip) * (1 - smoothstep(0.625, 0.64, ip));
    st.sweep = smoothstep(0.5, 0.58, ip);
    st.cross = smoothstep(0.55, 0.59, ip);
    st.unstable = done ? 0 : smoothstep(0.635, 0.66, ip) * (1 - smoothstep(0.672, 0.69, ip));
    const explode = easeOutCubic((ip - 0.665) / 0.07);
    st.burstKnight = done ? 0 : explode * 1.3 * (1 - smoothstep(0.84, 0.97, ip));
    st.burstFx = explode * 1.35;
    st.impact = done ? 0 : smoothstep(0.665, 0.67, ip) * (1 - smoothstep(0.675, 0.7, ip));
    st.glitch = done ? 0 : Math.max(st.unstable * 0.2, 0.42 * smoothstep(0.665, 0.672, ip) * (1 - smoothstep(0.69, 0.715, ip)));
    st.shards = done ? 0 : smoothstep(0.667, 0.675, ip) * (1 - smoothstep(0.735, 0.77, ip));
    st.gather = done ? 1 : clamp01((ip - 0.705) / 0.14);
    st.reveal = done ? 1 : smoothstep(0.81, 0.92, ip);
    st.logoOpacity = done ? st.comp : 1;
    st.shine = 1 + st.finale * 0.5;
    st.env = done ? st.comp : smoothstep(0.86, 0.99, ip);
    const introGlow = 1 - 0.5 * smoothstep(0.71, 0.78, ip);
    st.knightGlow = done ? 0.3 + 0.2 * st.hero + 0.38 * st.finale : introGlow;
    st.logoMask = done ? st.comp * 0.7 : smoothstep(0.86, 0.97, ip) * 0.7;
    st.lines = (done ? 1 : smoothstep(0.36, 0.46, ip) * (1 - smoothstep(0.655, 0.67, ip)) + smoothstep(0.95, 1, ip)) * st.knightGlow;
    st.solid = done || (ip > 0.45 && ip < 0.665) || ip > 0.975;
    st.haze = done ? 0.5 + 0.5 * st.comp : smoothstep(0.3, 0.45, ip) * 0.6 + st.env * 0.4;
    st.radar = done ? 0.55 * st.comp + 0.15 * st.ambient : st.scan * 0.9 + st.env * 0.55;
    st.bokeh = 0.2 * (1 - smoothstep(0.06, 0.1, ip)) + 0.3 * smoothstep(0.08, 0.14, ip) * (1 - smoothstep(0.24, 0.3, ip)) + st.ambient * 0.35;
    st.fieldBoost = done ? 0 : smoothstep(0.07, 0.13, ip) * (1 - smoothstep(0.25, 0.31, ip));

    // panel 10 layout, framed from the hero camera; the knight never moves, the camera frames each stage
    const aspect = size.width / size.height;
    const visH = (d: number) => 2 * d * TAN_HALF;
    const kAspect = knight?.aspect ?? 1.16;
    const dK = HERO_CAMERA.z - LAYER.knight;
    st.knightScale = visH(dK) * FRAME.knightHeight;
    st.knightPos.set(0, HERO_CAMERA.y + (0.5 - FRAME.helmTop) * visH(dK) - st.knightScale / 2, LAYER.knight);
    const sway = Math.sin(st.t * 0.25) * 0.012 + (done ? pointer.current.x * 0.02 : 0);
    tmp.quaternion.setFromAxisAngle(tmp.up, sway);
    st.knightMatrix.compose(st.knightPos, tmp.quaternion, tmp.scale.setScalar(st.knightScale));
    const visor = knight?.visor ?? tmp.probe.set(0, 0, 0.26);
    st.visor.copy(visor).multiplyScalar(st.knightScale).add(st.knightPos);
    st.impactPoint.copy(visor);
    st.scanX = st.knightPos.x + (THREE.MathUtils.lerp(-0.42, 0, st.sweep) * kAspect + Math.sin(st.t * 0.8) * 0.015 * st.cross) * st.knightScale;

    const dL = HERO_CAMERA.z - LAYER.logo;
    const logoW = Math.min((visH(dL) * FRAME.logoHeight) / logo.aspect, visH(dL) * aspect * 0.86);
    const logoH = logoW * logo.aspect;
    st.logoBottom = HERO_CAMERA.y + (0.5 - FRAME.wordmarkBottom) * visH(dL);
    st.logo.set(0, st.logoBottom + logoH / 2, LAYER.logo, logoW);
    tmp.probe.set(-logoW / 2, st.logoBottom, LAYER.logo).project(camera);
    st.logoRect.x = tmp.probe.x; st.logoRect.y = tmp.probe.y;
    tmp.probe.set(logoW / 2, st.logoBottom + logo.textHeight * logoW, LAYER.logo).project(camera);
    st.logoRect.z = tmp.probe.x; st.logoRect.w = tmp.probe.y;
    st.floorY = HERO_CAMERA.y - 3;
    st.fieldW = Math.max(visH(9) * aspect * 1.6, 9);

    // camera: push toward the light, through the field, frame the knight (03–08), frame the logo (09), pull back (10)
    const fitKnight = Math.max(st.knightScale / (0.95 * 2 * TAN_HALF), (st.knightScale * kAspect * 0.62) / (aspect * 2 * TAN_HALF));
    tmp.knightFrame.set(0, st.knightPos.y, LAYER.knight + fitKnight);
    const fitLogo = Math.max(logoH / (0.62 * 2 * TAN_HALF), logoW / (0.88 * aspect * 2 * TAN_HALF));
    tmp.logoFrame.set(0, st.logo.y - 0.04 * visH(fitLogo), LAYER.logo + fitLogo);
    const path = tmp.path.set(0, HERO_CAMERA.y, 14);
    path.z = THREE.MathUtils.lerp(path.z, 12.5, smoothstep(0, 0.1, ip));
    path.z = THREE.MathUtils.lerp(path.z, 9.5, smoothstep(0.08, 0.26, ip));
    path.lerp(tmp.knightFrame, smoothstep(0.24, 0.42, ip));
    path.z -= smoothstep(0.5, 0.62, ip) * 0.2 - st.impact * 0.25;
    path.lerp(tmp.logoFrame, smoothstep(0.72, 0.84, ip));
    path.lerp(HERO_CAMERA, smoothstep(0.86, 0.985, ip));
    if (done) path.lerpVectors(HERO_CAMERA, tmp.ambient.set(0, HERO_CAMERA.y + 0.6, 10.5 - scroll * 1.2), st.ambient);
    const parallax = done ? 1 : 0.3;
    path.x += pointer.current.x * 0.22 * parallax;
    path.y += pointer.current.y * 0.1 * parallax;
    camera.position.lerp(path, 1 - Math.exp(-dt * (done ? 3 : 6)));
    camera.position.x += (Math.random() - 0.5) * st.impact * 0.06;
    camera.position.y += (Math.random() - 0.5) * st.impact * 0.04;
    tmp.look.set(camera.position.x * 0.6, camera.position.y, camera.position.z - 10);
    camera.lookAt(tmp.look);
    const fov = 43 + st.impact * 3;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }

    // page-wide glitch bars during the burst
    if (glitch.current && (st.glitch > 0.01 || glitchOn.current)) {
      glitchOn.current = st.glitch > 0.01;
      glitch.current.style.opacity = String(st.glitch * 0.5);
      glitch.current.dataset.active = glitchOn.current ? "true" : "false";
    }

    // storyboard HUD readouts
    if (hud.current && !hudState.current) {
      const fields: Record<string, HTMLElement> = {};
      hud.current.querySelectorAll<HTMLElement>("[data-hud]").forEach((node) => { fields[node.dataset.hud ?? ""] = node; });
      hudState.current = { stage: "", counters: Array.from(hud.current.querySelectorAll<HTMLElement>("[data-count]")), fields };
    }
    const h = hudState.current;
    if (h && hud.current) {
      const stage = done ? "none" : hudStage(ip);
      if (stage !== h.stage) {
        h.stage = stage;
        hud.current.dataset.stage = stage;
      }
      if (stage !== "none") {
        for (const node of h.counters) {
          const { count: to = "0", from = "0", at = "0", dur = "0.1", dec = "0" } = node.dataset;
          const value = Number(from) + (Number(to) - Number(from)) * easeOutCubic((ip - Number(at)) / Number(dur));
          node.textContent = value.toLocaleString("en-US", { minimumFractionDigits: Number(dec), maximumFractionDigits: Number(dec) });
        }
      }
      if (stage === "scan") {
        const f = h.fields;
        if (f.x) f.x.textContent = (12.48 + (st.scanX - st.knightPos.x) * 0.9).toFixed(3);
        if (f.y) f.y.textContent = (3.24 + Math.sin(st.t * 1.7) * 0.05).toFixed(3).padStart(6, "0");
        if (f.z) f.z.textContent = (56.281 + Math.cos(st.t * 1.3) * 0.02).toFixed(3);
      }
      if (stage === "logo") {
        // tagline tracks the wordmark while the camera pulls back from panel 09 to panel 10
        tmp.probe.set(0, st.logoBottom, LAYER.logo).project(camera);
        hud.current.style.setProperty("--tagline-y", `${(-tmp.probe.y * 0.5 + 0.5) * size.height}px`);
      }
    }
  });

  return (
    <group>
      <Start story={story} />
      <World story={story} />
      <Particles story={story} geometry={knightGeometry} fx={false} size={budget.size} />
      <Particles story={story} geometry={fxGeometry} fx size={budget.size} />
      {knight ? <KnightStructure story={story} knight={knight} /> : null}
      {knight ? <Fragments story={story} knight={knight} count={budget.shards} /> : null}
      <Scan story={story} />
      <Wordmark story={story} logo={logo} />
      <Renderer story={story} />
    </group>
  );
}
