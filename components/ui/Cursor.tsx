"use client";

import { useEffect, useRef } from "react";

export function Cursor() {
  const cursor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const node = cursor.current;
    if (!node) return;
    let x = -100, y = -100, frame = 0;
    // The system cursor is hidden, so draw exactly at the pointer (once per frame, no easing):
    // easing made the cursor trail behind the mouse, more so whenever a frame took longer.
    const draw = () => {
      frame = 0;
      node.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };
    const move = (event: PointerEvent) => {
      x = event.clientX; y = event.clientY;
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      node.classList.toggle("is-active", Boolean(target.closest("a, button, [data-cursor]")));
      node.dataset.label = target.closest<HTMLElement>("[data-cursor]")?.dataset.cursor || "OPEN";
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
    };
  }, []);
  return <div ref={cursor} className="cursor" aria-hidden="true" />;
}
