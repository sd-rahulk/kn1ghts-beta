import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { mergeGeometries, mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";

/**
 * Where the knight comes from.
 * - "reference": particles sampled from the knight in the master storyboard (panel 03), so the silhouette,
 *   plates, visor and lighting are the reference's own. Depth is added so it reads as a 3D hologram.
 * - "model": a sculpted helmet at public/models/knight.glb, facing +Z (toward the camera), +Y up.
 */
export const KNIGHT_SOURCE = {
  use: "reference" as "reference" | "model",
  image: "/models/knight-reference.png",
  /** The visor's V point in the reference image, in pixels. */
  visor: [147, 132] as const,
  model: "/models/knight.glb",
  /** Rotation that turns the model to face the camera with +Y up. Tune per asset. */
  rotation: new THREE.Euler(0, 0, 0),
  /** Crease angle (degrees) above which a mesh edge counts as an armour edge. */
  edgeAngle: 28,
};

/** Particle roles on the knight, from brightest to dimmest. */
export const KNIGHT_KIND = { surface: 0, edge: 1, silhouette: 2, escape: 3, interior: 4 } as const;

export type KnightAsset = {
  /** Normalised: 1 unit tall, centred; x across, y up, z toward the camera. */
  targets: Float32Array;
  normals: Float32Array;
  kinds: Float32Array;
  /** Formation order, 0 (first) → 1 (last). */
  orders: Float32Array;
  /** Brightness 0 → 1: armour edges brightest, interior dimmest. */
  tones: Float32Array;
  colors: Float32Array;
  lines: THREE.BufferGeometry | null;
  occluder: THREE.BufferGeometry | null;
  anchors: Float32Array;
  anchorNormals: Float32Array;
  /** width / height */
  aspect: number;
  /** The visor point, where the scan flare sits and the burst starts. */
  visor: THREE.Vector3;
};

type Budget = { knight: number; lines: number; shards: number };

function seeded(index: number, salt = 0) {
  const x = Math.sin(index * 129.17 + salt * 71.31) * 43758.5453;
  return x - Math.floor(x);
}

// ---------------------------------------------------------------- reference image → particle hologram

/** Loads the reference knight and returns its pixels. */
export function loadKnightImage(url = KNIGHT_SOURCE.image) {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("2D canvas unavailable"));
      ctx.drawImage(image, 0, 0);
      resolve(ctx.getImageData(0, 0, canvas.width, canvas.height));
    };
    image.onerror = () => reject(new Error(`Could not load ${url}`));
    image.src = url;
  });
}

/**
 * Samples the reference knight into particles: density and brightness follow the artwork (bright armour edges
 * get the most and brightest particles, dark interior the fewest), colour comes from the artwork, and depth is
 * reconstructed (domed helm with a forward visor, shoulders sloping back) so it holds up as a 3D hologram.
 * The bust is extended below the artwork's crop so the shoulders spread behind the wordmark, as in panel 10.
 */
export function buildKnightFromImage(image: ImageData, budget: Budget): KnightAsset {
  const { width, height, data } = image;
  const aspect = width / height;
  const [vx, vy] = KNIGHT_SOURCE.visor;
  const toU = (x: number) => (x - vx) / height;
  const toV = (y: number) => 0.5 - y / height;
  const visor = new THREE.Vector3(0, toV(vy), 0.26);

  // brightness-weighted pixel distribution
  const lum = new Float32Array(width * height);
  const cumulative = new Float64Array(width * height);
  let total = 0;
  const feather = (x: number, y: number) => {
    const side = Math.min(x, width - 1 - x) / (width * 0.2);
    const bottom = (height - 1 - y) / (height * 0.08);
    return Math.min(1, side) ** 1.5 * Math.min(1, 0.35 + bottom);
  };
  for (let i = 0; i < width * height; i++) {
    const l = (data[i * 4] * 0.25 + data[i * 4 + 1] * 0.45 + data[i * 4 + 2] * 0.3) / 255;
    lum[i] = l;
    total += l > 0.08 ? l ** 1.8 * feather(i % width, Math.floor(i / width)) : 0;
    cumulative[i] = total;
  }
  const pick = (u: number) => {
    let lo = 0, hi = cumulative.length - 1;
    const target = u * total;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1; else hi = mid;
    }
    return lo;
  };

  // depth: domed helm (with a raised centre ridge) in front of shoulders that slope away
  const helm = { v: toV(98), rx: 0.25, ry: 0.41 };
  const depthAt = (u: number, v: number, l: number) => {
    const hx = u / helm.rx, hy = (v - helm.v) / helm.ry;
    const dome = 1 - hx * hx - hy * hy;
    const shoulders = 0.1 * (1 - Math.min(1, Math.abs(u) / (aspect / 2))) - 0.04 - Math.max(0, -v - 0.2) * 0.15;
    const helmZ = dome > 0 ? 0.2 * Math.sqrt(dome) + 0.05 * Math.max(0, 1 - Math.abs(hx)) : -1;
    return Math.max(helmZ, shoulders) + l * 0.025;
  };

  const count = budget.knight;
  const targets = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const kinds = new Float32Array(count), orders = new Float32Array(count), tones = new Float32Array(count), colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const p = pick(seeded(i, 21));
    const px = p % width, py = Math.floor(p / width);
    const l = lum[p];
    let u = toU(px + 0.15 + seeded(i, 22) * 0.7), v = toV(py + 0.15 + seeded(i, 23) * 0.7);
    let z = depthAt(u, v, l);
    let tone = Math.min(1, l * 1.3) ** 0.85;
    let kind: number = tone > 0.7 ? KNIGHT_KIND.edge : tone > 0.42 ? KNIGHT_KIND.silhouette : KNIGHT_KIND.surface;
    const role = seeded(i, 24);
    let src = p;
    if (role < 0.2) {
      // shoulder mass below the artwork's crop (panel 10): the reference bust's own lower band, repeated wider
      // and lower in two layers, so the shoulders keep the artwork's texture instead of becoming lines or a fill
      let q = p;
      for (let tries = 0; tries < 10 && Math.floor(q / width) < height * 0.5; tries++) q = pick(seeded(i, 40 + tries));
      src = q;
      const layer = seeded(i, 25) < 0.6 ? { sx: 1.75, dy: 0.26, gain: 1 } : { sx: 2.6, dy: 0.52, gain: 0.72 };
      const qx = q % width, qy = Math.floor(q / width);
      u = toU(qx + seeded(i, 22)) * layer.sx;
      v = toV(qy + seeded(i, 23)) - layer.dy;
      tone = Math.min(1, lum[q] * 1.3) ** 0.85 * layer.gain;
      kind = tone > 0.55 ? KNIGHT_KIND.edge : KNIGHT_KIND.surface;
      z = 0.04 - layer.dy * 0.3 - Math.abs(u) * 0.06;
    } else if (role < 0.22 && tone < 0.45) {
      kind = KNIGHT_KIND.escape;
    } else if (role < 0.3) {
      z += (seeded(i, 28) - 0.5) * 0.05;
    }
    targets[i * 3] = u; targets[i * 3 + 1] = v; targets[i * 3 + 2] = z;
    const n = new THREE.Vector3(u * 1.5, (v - helm.v) * 0.8, 1).normalize();
    normals[i * 3] = n.x; normals[i * 3 + 1] = n.y; normals[i * 3 + 2] = n.z;
    kinds[i] = kind;
    tones[i] = tone;
    // colour from the artwork, normalised so brightness is carried by tone
    const r = data[src * 4] / 255, g = data[src * 4 + 1] / 255, b = data[src * 4 + 2] / 255;
    const m = Math.max(r, g, b, 0.05);
    const white = Math.max(0, (lum[src] - 0.75) / 0.25);
    colors[i * 3] = THREE.MathUtils.lerp(r / m, 1, white);
    colors[i * 3 + 1] = THREE.MathUtils.lerp(g / m, 1, white);
    colors[i * 3 + 2] = THREE.MathUtils.lerp(b / m, 1, white);
    // silhouette and crown first, then the plates, then the dim interior and drifting particles
    orders[i] = Math.min(1, 0.1 * seeded(i, 29) + 0.38 * (0.5 - v) + 0.3 * (1 - tone) + (kind === KNIGHT_KIND.escape || role < 0.2 ? 0.25 : 0));
  }

  // fragments break off the brightest armour
  const anchors = new Float32Array(budget.shards * 3), anchorNormals = new Float32Array(budget.shards * 3);
  for (let i = 0, found = 0; found < budget.shards && i < count * 4; i++) {
    const k = Math.floor(seeded(i, 60) * count);
    if (tones[k] < 0.5 && i < count * 3) continue;
    anchors.set([targets[k * 3], targets[k * 3 + 1], targets[k * 3 + 2]], found * 3);
    anchorNormals.set([normals[k * 3], normals[k * 3 + 1], normals[k * 3 + 2]], found * 3);
    found++;
  }

  return { targets, normals, kinds, orders, tones, colors, lines: null, occluder: null, anchors, anchorNormals, aspect, visor };
}

// ---------------------------------------------------------------- sculpted model → particle hologram

/** Rotates, centres and scales triangles so the knight is 1 unit tall. */
function normalize(geometry: THREE.BufferGeometry, rotation: THREE.Euler) {
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(rotation));
  geometry.computeBoundingBox();
  const box = geometry.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  geometry.translate(-centre.x, -centre.y, -centre.z);
  geometry.scale(1 / size.y, 1 / size.y, 1 / size.y);
  return geometry;
}

/** Loads the knight model and merges every mesh into one triangle soup in a normalised pose. */
export async function loadKnightGeometry(url = KNIGHT_SOURCE.model) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  gltf.scene.updateMatrixWorld(true);
  const parts: THREE.BufferGeometry[] = [];
  const v = new THREE.Vector3();
  gltf.scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const source = mesh.isMesh ? mesh.geometry.attributes.position : undefined;
    if (!source) return;
    const index = mesh.geometry.index;
    const count = index ? index.count : source.count;
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(source, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      out[i * 3] = v.x; out[i * 3 + 1] = v.y; out[i * 3 + 2] = v.z;
    }
    const part = new THREE.BufferGeometry();
    part.setAttribute("position", new THREE.BufferAttribute(out, 3));
    parts.push(part);
  });
  if (!parts.length) throw new Error(`No meshes in ${url}`);
  const merged = parts.length === 1 ? parts[0] : mergeGeometries(parts);
  if (!merged) throw new Error(`Could not merge meshes in ${url}`);
  return normalize(merged, KNIGHT_SOURCE.rotation);
}

/**
 * Turns knight triangles into particle targets with roles and a formation order
 * (silhouette → crown → surfaces → edges → interior → escaping), armour edge lines, a depth-only occluder
 * and anchor points for the burst fragments.
 */
export function buildKnight(source: THREE.BufferGeometry, budget: Budget): KnightAsset {
  const welded = mergeVertices(source, 1e-4);
  welded.computeVertexNormals();
  welded.computeBoundingBox();
  const box = welded.boundingBox as THREE.Box3;
  const size = box.getSize(new THREE.Vector3());
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(welded)).build();

  const pool = Math.max(budget.knight, 4000);
  const poolPos = new Float32Array(pool * 3), poolNormal = new Float32Array(pool * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pool; i++) {
    sampler.sample(p, n);
    poolPos[i * 3] = p.x; poolPos[i * 3 + 1] = p.y; poolPos[i * 3 + 2] = p.z;
    poolNormal[i * 3] = n.x; poolNormal[i * 3 + 1] = n.y; poolNormal[i * 3 + 2] = n.z;
  }

  const edgeGeometry = new THREE.EdgesGeometry(welded, KNIGHT_SOURCE.edgeAngle);
  const ep = edgeGeometry.attributes.position.array as Float32Array;
  const segs = ep.length / 6;
  const cumulative = new Float32Array(Math.max(segs, 1));
  let total = 0;
  for (let k = 0; k < segs; k++) {
    const o = k * 6;
    total += Math.hypot(ep[o + 3] - ep[o], ep[o + 4] - ep[o + 1], ep[o + 5] - ep[o + 2]);
    cumulative[k] = total;
  }
  const onEdge = (u: number, t: number, out: THREE.Vector3) => {
    let lo = 0, hi = segs - 1;
    const target = u * total;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < target) lo = mid + 1; else hi = mid;
    }
    const o = lo * 6;
    return out.set(ep[o] + (ep[o + 3] - ep[o]) * t, ep[o + 1] + (ep[o + 4] - ep[o + 1]) * t, ep[o + 2] + (ep[o + 5] - ep[o + 2]) * t);
  };
  const keep = Math.min(1, budget.lines / Math.max(segs, 1));
  const lineList: number[] = [];
  for (let k = 0; k < segs; k++) if (seeded(k, 71) < keep) for (let j = 0; j < 6; j++) lineList.push(ep[k * 6 + j]);
  const lines = new THREE.BufferGeometry();
  lines.setAttribute("position", new THREE.Float32BufferAttribute(lineList, 3));
  edgeGeometry.dispose();

  // silhouette as seen from the front: pool points on the outline of the XY occupancy grid
  const rows = 150, cols = Math.max(8, Math.round((rows * size.x) / size.y));
  const grid = new Uint8Array(rows * cols);
  const cell = (x: number, y: number) => {
    const c = Math.min(cols - 1, Math.max(0, Math.floor(((x - box.min.x) / size.x) * cols)));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(((y - box.min.y) / size.y) * rows)));
    return r * cols + c;
  };
  for (let i = 0; i < pool; i++) grid[cell(poolPos[i * 3], poolPos[i * 3 + 1])] = 1;
  const outline: number[] = [];
  for (let i = 0; i < pool; i++) {
    const id = cell(poolPos[i * 3], poolPos[i * 3 + 1]);
    const r = Math.floor(id / cols), c = id % cols;
    const empty = (rr: number, cc: number) => rr < 0 || cc < 0 || rr >= rows || cc >= cols || !grid[rr * cols + cc];
    if (empty(r - 1, c) || empty(r + 1, c) || empty(r, c - 1) || empty(r, c + 1)) outline.push(i);
  }

  const count = budget.knight;
  const targets = new Float32Array(count * 3), normals = new Float32Array(count * 3);
  const kinds = new Float32Array(count), orders = new Float32Array(count), tones = new Float32Array(count), colors = new Float32Array(count * 3);
  const toneOf = [0.4, 1, 0.82, 0.55, 0.18];
  for (let i = 0; i < count; i++) {
    const role = seeded(i, 30);
    let kind: number = KNIGHT_KIND.surface;
    const from = (k: number) => {
      p.set(poolPos[k * 3], poolPos[k * 3 + 1], poolPos[k * 3 + 2]);
      n.set(poolNormal[k * 3], poolNormal[k * 3 + 1], poolNormal[k * 3 + 2]);
    };
    if (role < 0.3 && segs > 0) {
      kind = KNIGHT_KIND.edge;
      onEdge(seeded(i, 31), seeded(i, 32), p);
      n.copy(p).normalize();
    } else if (role < 0.42 && outline.length) {
      kind = KNIGHT_KIND.silhouette;
      from(outline[Math.floor(seeded(i, 33) * outline.length)]);
    } else if (role < 0.8) {
      from(i % pool);
    } else if (role < 0.9) {
      kind = KNIGHT_KIND.interior;
      from(Math.floor(seeded(i, 34) * pool));
      p.addScaledVector(n, -(0.004 + seeded(i, 35) * 0.035));
    } else {
      kind = KNIGHT_KIND.escape;
      from(Math.floor(seeded(i, 36) * pool));
    }
    targets[i * 3] = p.x; targets[i * 3 + 1] = p.y; targets[i * 3 + 2] = p.z;
    normals[i * 3] = n.x; normals[i * 3 + 1] = n.y; normals[i * 3 + 2] = n.z;
    kinds[i] = kind;
    tones[i] = toneOf[kind];
    const cyan = seeded(i, 37) > 0.64;
    colors.set(cyan ? [0.15, 0.85, 1] : [0.24, 1, 0.62], i * 3);
    const fromTop = 1 - (p.y - box.min.y) / size.y;
    const base = kind === KNIGHT_KIND.silhouette ? 0 : kind === KNIGHT_KIND.surface ? 0.12 : kind === KNIGHT_KIND.edge ? 0.42 : kind === KNIGHT_KIND.interior ? 0.62 : 0.78;
    orders[i] = Math.min(1, base + fromTop * (kind === KNIGHT_KIND.silhouette ? 0.12 : 0.3) + seeded(i, 3) * 0.1);
  }

  const occluder = welded.clone();
  const op = occluder.attributes.position.array as Float32Array, on = occluder.attributes.normal.array as Float32Array;
  for (let i = 0; i < op.length; i++) op[i] -= on[i] * 0.006;

  const anchors = new Float32Array(budget.shards * 3), anchorNormals = new Float32Array(budget.shards * 3);
  for (let i = 0; i < budget.shards; i++) {
    const k = Math.floor(seeded(i, 60) * pool);
    anchors.set([poolPos[k * 3], poolPos[k * 3 + 1], poolPos[k * 3 + 2]], i * 3);
    anchorNormals.set([poolNormal[k * 3], poolNormal[k * 3 + 1], poolNormal[k * 3 + 2]], i * 3);
  }

  return {
    targets, normals, kinds, orders, tones, colors, lines, occluder, anchors, anchorNormals,
    aspect: size.x / size.y,
    visor: new THREE.Vector3(0, 0.05, (size.z / size.y) * 0.5),
  };
}
