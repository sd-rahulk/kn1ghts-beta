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
import type { SiteContent } from "@/backend/lib/schema";

export type ProgressRef = React.MutableRefObject<number>;
export type PointerRef = React.MutableRefObject<{ x: number; y: number }>;
/** Seconds of the intro sequence played so far (0 → OPENING_END). */
export type OpeningRef = React.MutableRefObject<number>;

export function SiteExperience({ data, preview = false, contactReady = false }: { data: SiteContent; preview?: boolean; contactReady?: boolean }) {
  const progress = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const opening = useRef(0);
  const [revealed, setRevealed] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const skipIntro = useRef<() => void>(() => {});
  const transitionRef = useRef<HTMLDivElement>(null);

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
    let skipRequested = false;
    let skipTween: gsap.core.Timeline | undefined;
    let navigationFrame = 0;
    const previousScrollRestoration = window.history.scrollRestoration;

    skipIntro.current = () => {
      if (complete || skipRequested) return;
      skipRequested = true;
      setSkipping(true);
      skipTween = gsap.timeline()
        .to(transitionRef.current, { opacity: 1, duration: reduceMotion ? 0 : 0.3, ease: "power2.inOut" })
        .call(() => {
          opening.current = OPENING_END;
          window.scrollTo(0, 0);
          shown = true;
          complete = true;
          setRevealed(true);
          setIntroComplete(true);
          root.classList.remove("intro-lock");
          lenis.start();
          ScrollTrigger.refresh();
        })
        .to(transitionRef.current, { opacity: 0, duration: reduceMotion ? 0 : 0.75, ease: "power2.out" });
    };

    const navigate = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      const hash = link?.getAttribute("href");
      const target = hash ? document.getElementById(hash.slice(1)) : null;
      if (!target || !hash) return;
      event.preventDefault();
      if (!complete) {
        skipIntro.current();
        return;
      }
      cancelAnimationFrame(navigationFrame);
      navigationFrame = requestAnimationFrame(() => {
        window.history.pushState(null, "", hash);
        lenis.scrollTo(target, {
          duration: 1.3,
          immediate: reduceMotion,
          onComplete: () => {
            target.setAttribute("tabindex", "-1");
            target.focus({ preventScroll: true });
          },
        });
      });
    };
    document.addEventListener("click", navigate);

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
          setIntroComplete(true);
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
      cancelAnimationFrame(navigationFrame);
      document.removeEventListener("click", navigate);
      skipTween?.kill();
      skipIntro.current = () => {};
      window.history.scrollRestoration = previousScrollRestoration;
      root.classList.remove("intro-lock");
      lenis.destroy();
      ctx.revert();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  useEffect(() => {
    // Keep the original chapter spacing, but allow edited copy and longer lists
    // to grow beyond it instead of covering the following section.
    const chapters = Array.from(document.querySelectorAll<HTMLElement>(".story > section[data-section-type]"));
    let frame = 0;
    let disposed = false;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        for (const chapter of chapters) {
          chapter.style.minHeight = "";
          let required = 0;
          for (const child of Array.from(chapter.children) as HTMLElement[]) {
            if (child.getAttribute("aria-hidden") === "true") continue;
            required = Math.max(required, child.offsetTop + child.offsetHeight);
          }
          if (required > chapter.offsetHeight) chapter.style.minHeight = `${required + 64}px`;
        }
        ScrollTrigger.refresh();
      });
    };
    const observer = new ResizeObserver(measure);
    chapters.forEach((chapter) => Array.from(chapter.children).forEach((child) => observer.observe(child)));
    window.addEventListener("resize", measure);
    void document.fonts.ready.then(measure);
    measure();
    return () => { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [data]);

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => window.removeEventListener("pointermove", onPointer);
  }, []);

  return (
    <main className={revealed ? "experience is-loaded" : "experience is-opening"} style={{ "--ink": data.settings.theme.ink, "--deep": data.settings.theme.deep, "--tactical": data.settings.theme.tactical, "--paper": data.settings.theme.paper, "--soft": data.settings.theme.soft, "--acid": data.settings.theme.accent } as React.CSSProperties}>
      <a className="skip-link" href="#story">{data.settings.labels.skipContent}</a>
      <ExperienceCanvas progress={progress} pointer={pointer} opening={opening} />
      <div ref={transitionRef} className="intro-transition" aria-hidden="true" />
      {!introComplete && <button className="intro-skip" disabled={skipping} onClick={() => skipIntro.current()}>{skipping ? data.settings.labels.entering : data.settings.labels.skipIntro}<span aria-hidden="true"> →</span></button>}
      <div className="atmosphere" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Header site={data} />
      <Cursor />
      <Story site={data} contactReady={contactReady && !preview} />
      {preview && <div className="draft-banner" role="status">DRAFT PREVIEW · Not published</div>}
    </main>
  );
}
