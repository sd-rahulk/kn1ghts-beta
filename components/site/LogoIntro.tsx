"use client";

import { useEffect, useRef } from "react";
import { INTRO_KEY, INTRO_SOURCE } from "./intro";

// Where the helmet sits in the logo (0–1). The logo assembles outward from it.
const HELMET = { x: 0.42, y: 0.33 };
const FORM_SPREAD = 900; // ms between the first and last particle setting off
const FLIGHT = 1000; // ms each particle travels
const REVEAL_AT = FORM_SPREAD + FLIGHT + 100;
const FADE = 550;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

type Point = { x: number; y: number; r: number; g: number; b: number; weight: number };

// Opaque pixels of the logo, weighted so the gold outline (the shape's edges) is denser than the fill.
function samplePixels(image: HTMLImageElement) {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(image, 0, 0);
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  const points: Point[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] < 200) continue;
      const light = (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2]) / 255;
      // Lift the dark navy fill so single particles stay visible on the near-black page.
      const lift = 1 + Math.max(0, 0.45 - light) * 2.2;
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]].map((value) => Math.min(255, Math.round(value * lift)));
      points.push({ x: x / width, y: y / height, r, g, b, weight: 0.35 + light * light * 2.5 });
    }
  }
  return points;
}

function pick(points: Point[], count: number) {
  const totals = new Float64Array(points.length);
  let sum = 0;
  points.forEach((point, i) => { sum += point.weight; totals[i] = sum; });
  return Array.from({ length: count }, () => {
    const target = Math.random() * sum;
    let low = 0, high = totals.length - 1;
    while (low < high) { const mid = (low + high) >> 1; if (totals[mid] < target) low = mid + 1; else high = mid; }
    return points[low];
  });
}

/**
 * Plays once per session on the home page: particles gather from around the hero and build the logo,
 * helmet first, then hand over to the real image. The page stays scrollable and usable throughout.
 * The `data-intro` attribute (set before first paint by the root layout) hides the hero until the
 * hand-over; removing it reveals everything, which is also what every failure path does.
 */
export function LogoIntro() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const canvas = canvasRef.current;
    const target = canvas?.parentElement?.querySelector<HTMLElement>("[data-intro-target]");
    if (!root.hasAttribute("data-intro") || !canvas || !target) { root.removeAttribute("data-intro"); return; }

    const reveal = () => root.removeAttribute("data-intro");
    let started = false, cancelled = false, frame = 0;
    // Never hold the hero back for slow assets.
    const giveUp = window.setTimeout(() => { if (!started) { cancelled = true; reveal(); } }, 1500);

    loadImage(INTRO_SOURCE).then((image) => {
      if (cancelled) return;
      started = true;
      window.clearTimeout(giveUp);
      try { sessionStorage.setItem(INTRO_KEY, "1"); } catch {}

      const area = canvas.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(area.width * dpr);
      canvas.height = Math.round(area.height * dpr);
      const context = canvas.getContext("2d");
      const pixels = samplePixels(image);
      if (!context || !pixels.length) { reveal(); return; }
      context.scale(dpr, dpr);

      // The logo is drawn object-contain inside its square box.
      const aspect = image.naturalWidth / image.naturalHeight;
      const drawW = aspect >= 1 ? box.width : box.height * aspect;
      const drawH = aspect >= 1 ? box.width / aspect : box.height;
      const originX = box.left - area.left + (box.width - drawW) / 2;
      const originY = box.top - area.top + (box.height - drawH) / 2;
      const helmetX = originX + HELMET.x * drawW, helmetY = originY + HELMET.y * drawH;
      const reach = Math.hypot(area.width, area.height) / 2;
      const size = Math.max(1.6, drawW / 260);
      const count = Math.round(Math.min(4200, Math.max(1500, (drawW * drawH) / 55)));

      const particles = pick(pixels, count).map((point) => {
        const tx = originX + point.x * drawW, ty = originY + point.y * drawH;
        const order = Math.min(1, Math.hypot(point.x - HELMET.x, point.y - HELMET.y) / 0.75);
        const angle = Math.atan2(ty - helmetY, tx - helmetX) + (Math.random() - 0.5) * 1.6;
        const distance = reach * (0.7 + Math.random() * 0.9);
        return {
          sx: helmetX + Math.cos(angle) * distance, sy: helmetY + Math.sin(angle) * distance, tx, ty,
          delay: order * FORM_SPREAD + Math.random() * 150,
          swirl: (Math.random() - 0.5) * 0.5,
          color: `rgb(${point.r},${point.g},${point.b})`,
        };
      });

      const start = performance.now();
      let revealed = false;
      const draw = (now: number) => {
        const elapsed = now - start;
        context.clearRect(0, 0, area.width, area.height);
        const fade = 1 - clamp01((elapsed - REVEAL_AT - 150) / FADE);
        for (const p of particles) {
          const t = clamp01((elapsed - p.delay) / FLIGHT);
          if (t <= 0) continue;
          const e = easeOutQuart(t);
          // A slight curve on the way in, straightening as the particle lands.
          const dx = p.tx - p.sx, dy = p.ty - p.sy, bend = p.swirl * (1 - e) * e * 2;
          const x = p.sx + dx * e - dy * bend, y = p.sy + dy * e + dx * bend;
          context.globalAlpha = clamp01(t * 3) * fade;
          context.fillStyle = p.color;
          context.fillRect(x - size / 2, y - size / 2, size, size);
        }
        if (!revealed && elapsed >= REVEAL_AT) { revealed = true; reveal(); }
        if (fade > 0) frame = requestAnimationFrame(draw);
        else context.clearRect(0, 0, area.width, area.height);
      };
      frame = requestAnimationFrame(draw);
    }).catch(() => { cancelled = true; reveal(); });

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      cancelAnimationFrame(frame);
      // In development React mounts effects twice; only a run that actually started owns the reveal.
      if (started) reveal();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full pointer-events-none" aria-hidden="true" />;
}
