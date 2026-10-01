import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/*
 * KN1GHTS crest + wordmark as polygons (y down, 100-unit cap height). Slash cuts are real gaps
 * between polygons, so they stay sharp in the extruded geometry and in the particle targets.
 */
const GLYPHS: { w: number; polys: number[][] }[] = [
  { w: 74, polys: [ // K
    [0, 10, 10, 0, 15, 0, 15, 52, 0, 58], [0, 64, 15, 58, 15, 100, 0, 100],
    [15, 40, 53, 0, 74, 0, 28, 52, 15, 52], [24, 48, 74, 100, 55, 100, 15, 62, 15, 52],
  ] },
  { w: 76, polys: [ // N
    [0, 10, 10, 0, 15, 0, 15, 100, 0, 100], [15, 0, 30, 0, 61, 68, 61, 100, 46, 100, 15, 32],
    [61, 0, 76, 0, 76, 36, 61, 42], [61, 48, 76, 42, 76, 90, 66, 100, 61, 100],
  ] },
  { w: 40, polys: [ // 1
    [24, 0, 39, 0, 39, 100, 24, 100], [0, 26, 24, 0, 24, 20, 11, 33],
  ] },
  { w: 78, polys: [ // G
    [12, 0, 50, 0, 44, 15, 19, 15, 15, 19, 15, 81, 19, 85, 63, 85, 63, 65, 42, 65, 42, 50, 78, 50, 78, 88, 66, 100, 12, 100, 0, 88, 0, 12],
    [56, 0, 78, 0, 78, 15, 50, 15],
  ] },
  { w: 74, polys: [ // H
    [0, 10, 10, 0, 15, 0, 15, 66, 0, 72], [0, 78, 15, 72, 15, 100, 0, 100],
    [59, 0, 74, 0, 74, 90, 64, 100, 59, 100], [15, 43, 59, 43, 59, 57, 15, 57],
  ] },
  { w: 72, polys: [ // T
    [6, 0, 66, 0, 72, 6, 72, 15, 0, 15, 0, 6], [29, 15, 43, 15, 43, 92, 35, 100, 29, 100],
  ] },
  { w: 76, polys: [ // S
    [12, 0, 50, 0, 44, 15, 19, 15, 15, 19, 15, 38, 19, 42, 64, 42, 76, 54, 76, 88, 64, 100, 0, 100, 0, 85, 57, 85, 61, 81, 61, 62, 57, 58, 12, 58, 0, 46, 0, 12],
    [56, 0, 76, 0, 76, 15, 50, 15],
  ] },
];

/** Crest in a 100 × 140 box (as in storyboard panels 09–10): tall spear, two swept blades, a downward chevron. */
const CREST = [
  [50, 0, 57, 18, 54, 98, 50, 114, 46, 98, 43, 18],
  [0, 30, 15, 27, 33, 72, 50, 94, 50, 114, 27, 90],
  [100, 30, 85, 27, 67, 72, 50, 94, 50, 114, 73, 90],
  [22, 104, 33, 104, 50, 124, 67, 104, 78, 104, 50, 140],
];
const CREST_BOX = { w: 100, h: 140 };

/** The storyboard wordmark is extended: letters are drawn on a narrow grid and widened by this factor. */
const STRETCH = 1.4;
const GAP = 20;
const CREST_H = 190;
const CREST_GAP = 26;
const WIDTH = GLYPHS.reduce((sum, g) => sum + g.w * STRETCH, 0) + GAP * (GLYPHS.length - 1);
const HEIGHT = CREST_H + CREST_GAP + 100;
const DEPTH = 10;

type Part = { polys: number[][]; dx: number; dy: number; sx: number; sy: number; order: number };

/** Every polygon of the logo in layout units, with the left-to-right order used to stagger the reveal. */
function layout(): Part[] {
  const parts: Part[] = [];
  const crestScale = CREST_H / CREST_BOX.h;
  parts.push({ polys: CREST, dx: WIDTH / 2 - (CREST_BOX.w / 2) * crestScale, dy: 0, sx: crestScale, sy: crestScale, order: 0.5 });
  let x = 0;
  GLYPHS.forEach((glyph, i) => {
    parts.push({ polys: glyph.polys, dx: x, dy: CREST_H + CREST_GAP, sx: STRETCH, sy: 1, order: i / (GLYPHS.length - 1) });
    x += glyph.w * STRETCH + GAP;
  });
  return parts;
}

function seeded(index: number, salt = 0) {
  const x = Math.sin(index * 129.17 + salt * 71.31) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Builds the crisp extruded crest + wordmark (width 1, centred, front face at z = 0, +Y up), a soft glow
 * texture for restrained bloom, and particle targets sampled from the same shapes.
 */
export function buildLogo(count: number) {
  const parts = layout();

  const geometries = parts.map((part) => {
    const shapes = part.polys.map((poly) => {
      const shape = new THREE.Shape();
      for (let i = 0; i < poly.length; i += 2) {
        const x = part.dx + poly[i] * part.sx, y = -(part.dy + poly[i + 1] * part.sy);
        if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      return shape;
    });
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: DEPTH, bevelEnabled: true, bevelThickness: 2.4, bevelSize: 1.6, bevelOffset: -1.6, bevelSegments: 2, curveSegments: 1,
    });
    geometry.setAttribute("aLetter", new THREE.Float32BufferAttribute(new Array(geometry.attributes.position.count).fill(part.order), 1));
    return geometry;
  });
  const merged = mergeGeometries(geometries) as THREE.BufferGeometry;
  geometries.forEach((g) => g.dispose());
  merged.translate(-WIDTH / 2, HEIGHT / 2, -(DEPTH + 2.4));
  merged.scale(1 / WIDTH, 1 / WIDTH, 1 / WIDTH);

  // 2D rasterisation shared by the glow texture and the particle targets
  const raster = (scale: number, blur: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil((WIDTH + 80) * scale);
    canvas.height = Math.ceil((HEIGHT + 80) * scale);
    const ctx = canvas.getContext("2d", { willReadFrequently: blur === 0 });
    if (ctx) {
      ctx.scale(scale, scale);
      ctx.translate(40, 40);
      if (blur) ctx.filter = `blur(${blur}px)`;
      ctx.fillStyle = "#fff";
      for (const part of parts) {
        for (const poly of part.polys) {
          ctx.beginPath();
          for (let i = 0; i < poly.length; i += 2) {
            const x = part.dx + poly[i] * part.sx, y = part.dy + poly[i + 1] * part.sy;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    return { canvas, ctx };
  };

  const glowCanvas = raster(1.2, 9).canvas;
  const glow = new THREE.CanvasTexture(glowCanvas);
  glow.colorSpace = THREE.SRGBColorSpace;

  // particle targets: 40% traced along the outlines (crisp fragments), 60% filling the shapes
  const targets = new Float32Array(count * 3);
  const letters = new Float32Array(count);
  const edges: { x0: number; y0: number; x1: number; y1: number; order: number; len: number }[] = [];
  for (const part of parts) {
    for (const poly of part.polys) {
      for (let i = 0; i < poly.length; i += 2) {
        const j = (i + 2) % poly.length;
        const x0 = part.dx + poly[i] * part.sx, y0 = part.dy + poly[i + 1] * part.sy;
        const x1 = part.dx + poly[j] * part.sx, y1 = part.dy + poly[j + 1] * part.sy;
        edges.push({ x0, y0, x1, y1, order: part.order, len: Math.hypot(x1 - x0, y1 - y0) });
      }
    }
  }
  const cumulative: number[] = [];
  edges.reduce((sum, e) => { cumulative.push(sum + e.len); return sum + e.len; }, 0);
  const perimeter = cumulative[cumulative.length - 1];

  const mask = raster(2, 0);
  const hits: number[] = [];
  if (mask.ctx) {
    const { width, height } = mask.canvas;
    const pixels = mask.ctx.getImageData(0, 0, width, height).data;
    for (let y = 0; y < height; y += 2) {
      for (let x = 0; x < width; x += 2) if (pixels[(y * width + x) * 4 + 3] > 128) hits.push(x / 2 - 40, y / 2 - 40);
    }
  }
  const crestLeft = WIDTH / 2 - (CREST_BOX.w / 2) * (CREST_H / CREST_BOX.h), crestRight = WIDTH / 2 + (CREST_BOX.w / 2) * (CREST_H / CREST_BOX.h);
  for (let i = 0; i < count; i++) {
    let x: number, y: number, order: number;
    if (seeded(i, 80) < 0.4 || !hits.length) {
      const target = seeded(i, 81) * perimeter;
      let k = cumulative.findIndex((c) => c >= target);
      if (k < 0) k = edges.length - 1;
      const e = edges[k], t = seeded(i, 82);
      x = e.x0 + (e.x1 - e.x0) * t; y = e.y0 + (e.y1 - e.y0) * t; order = e.order;
    } else {
      const k = Math.floor(seeded(i, 83) * (hits.length / 2));
      x = hits[k * 2] + seeded(i, 84); y = hits[k * 2 + 1] + seeded(i, 85);
      order = y < CREST_H + 10 && x > crestLeft && x < crestRight ? 0.5 : Math.min(1, Math.max(0, x / WIDTH));
    }
    targets[i * 3] = (x - WIDTH / 2) / WIDTH;
    targets[i * 3 + 1] = -(y - HEIGHT / 2) / WIDTH;
    targets[i * 3 + 2] = 0.004 + seeded(i, 86) * 0.01;
    letters[i] = order;
  }

  return {
    geometry: merged,
    glow,
    /** Glow canvas covers the logo plus a 40-unit margin on every side. */
    glowScale: new THREE.Vector2((WIDTH + 80) / WIDTH, (HEIGHT + 80) / WIDTH),
    aspect: HEIGHT / WIDTH,
    /** Height of the wordmark line (without the crest), as a fraction of the logo width. */
    textHeight: 100 / WIDTH,
    targets,
    letters,
  };
}

export type LogoAsset = ReturnType<typeof buildLogo>;
