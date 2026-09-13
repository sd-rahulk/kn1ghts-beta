"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExperienceCanvas } from "./experience/ExperienceCanvas";
import { Header } from "./ui/Header";
import { SystemLoader } from "./ui/SystemLoader";
import { Cursor } from "./ui/Cursor";
import { Story } from "./sections/Story";

export type ProgressRef = React.MutableRefObject<number>;
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;

export function SiteExperience() {
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const completeLoading = useCallback(() => setLoaded(true), []);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.075, smoothWheel: !reduceMotion, syncTouch: false });
    let frame = 0;
    const update = (time: number) => {
      lenis.raf(time);
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.current = window.scrollY / max;
      frame = requestAnimationFrame(update);
    };
    lenis.on("scroll", ScrollTrigger.update);
    frame = requestAnimationFrame(update);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.fromTo(node, { yPercent: 18, opacity: 0, filter: "blur(14px)" }, {
          yPercent: 0, opacity: 1, filter: "blur(0px)", ease: "power3.out", duration: 1.1,
          scrollTrigger: { trigger: node, start: "top 82%", end: "top 48%", scrub: reduceMotion ? false : 0.8 },
        });
      });
      gsap.utils.toArray<HTMLElement>("[data-track]").forEach((node) => {
        const distance = Math.max(0, node.scrollWidth - window.innerWidth + 80);
        gsap.to(node, { x: -distance, ease: "none", scrollTrigger: { trigger: node.parentElement, start: "top top", end: "bottom bottom", scrub: 1 } });
      });
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  return (
    <main className={loaded ? "experience is-loaded" : "experience"}>
      <a className="skip-link" href="#story">Skip cinematic intro</a>
      <SystemLoader onComplete={completeLoading} />
      <ExperienceCanvas progress={progress} pointer={pointer} />
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Header />
      <Cursor />
      <Story />
    </main>
  );
}
