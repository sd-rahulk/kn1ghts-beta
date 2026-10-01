"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ExperienceCanvas } from "./experience/ExperienceCanvas";
import { OPENING_END, OPENING_REVEAL } from "./experience/CyberWorld";
import { Header } from "./ui/Header";
import { Cursor } from "./ui/Cursor";
import { Story } from "./sections/Story";
import type { KnightsHomeData } from "@/data/knights";

export type ProgressRef = React.MutableRefObject<number>;
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;
/** Seconds of the intro sequence played so far (0 → OPENING_END). */
export type OpeningRef = React.MutableRefObject<number>;

export function SiteExperience({ data }: { data: KnightsHomeData }) {
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const opening = useRef(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const skipOpening = reduceMotion || new URLSearchParams(window.location.search).has("skipIntro");
    const lenis = new Lenis({ lerp: reduceMotion ? 1 : 0.075, smoothWheel: !reduceMotion, syncTouch: false });
    const root = document.documentElement;
    let frame = 0;
    let last = performance.now();
    let shown = false;
    let complete = false;

    // The intro plays in full from the top of the page with scrolling locked.
    if (skipOpening) {
      opening.current = OPENING_END;
    } else {
      window.history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
      root.classList.add("intro-lock");
      lenis.stop();
    }

    const update = (time: number) => {
      lenis.raf(time);
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      progress.current = window.scrollY / max;
      if (!complete) {
        // Capped step: a slow frame slows the intro down instead of skipping a stage.
        opening.current = Math.min(OPENING_END, opening.current + Math.min(0.05, Math.max(0, time - last) / 1000));
        if (!shown && opening.current >= OPENING_REVEAL) {
          shown = true;
          setRevealed(true);
        }
        if (opening.current >= OPENING_END) {
          complete = true;
          root.classList.remove("intro-lock");
          lenis.start();
          ScrollTrigger.refresh();
        }
      }
      last = time;
      frame = requestAnimationFrame(update);
    };
    lenis.on("scroll", ScrollTrigger.update);
    frame = requestAnimationFrame(update);

    const ctx = gsap.context(() => {
      if (!reduceMotion) {
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
          gsap.fromTo(node, { yPercent: 18, opacity: 0, filter: "blur(14px)" }, {
            yPercent: 0, opacity: 1, filter: "blur(0px)", ease: "power3.out", duration: 1.1,
            scrollTrigger: { trigger: node, start: "top 82%", end: "top 48%", scrub: 0.8 },
          });
        });
      }

      const media = gsap.matchMedia();
      media.add("(min-width: 1101px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-track]").forEach((node) => {
          gsap.to(node, {
            x: () => -Math.max(0, node.scrollWidth - window.innerWidth + 80),
            ease: "none",
            scrollTrigger: {
              trigger: node.parentElement,
              start: "top top",
              end: "bottom bottom",
              scrub: 1,
              invalidateOnRefresh: true,
            },
          });
        });
      });

      return () => media.revert();
    });
    return () => {
      cancelAnimationFrame(frame);
      root.classList.remove("intro-lock");
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
    <main className={revealed ? "experience is-loaded" : "experience is-opening"}>
      <a className="skip-link" href="#story">Skip to content</a>
      <ExperienceCanvas progress={progress} pointer={pointer} opening={opening} />
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Header />
      <Cursor />
      <Story data={data} />
    </main>
  );
}
