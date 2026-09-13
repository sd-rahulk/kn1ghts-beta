"use client";

import { useEffect, useRef } from "react";

export function Cursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const node = cursor.current;
    if (!node) return;
    let x = -100, y = -100, cx = x, cy = y, frame = 0;
    const move = (event: PointerEvent) => { x = event.clientX; y = event.clientY; };
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      node.classList.toggle("is-active", Boolean(target.closest("a, button, [data-cursor]")));
      node.dataset.label = target.closest<HTMLElement>("[data-cursor]")?.dataset.cursor || "OPEN";
    };
    const tick = () => {
      cx += (x - cx) * .18; cy += (y - cy) * .18;
      node.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      frame = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);
  return <div ref={cursor} className="cursor" aria-hidden="true" />;
}
