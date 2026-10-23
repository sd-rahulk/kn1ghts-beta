"use client";

import { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import type { OpeningRef, PointerRef, ProgressRef } from "../SiteExperience";
import { CyberWorld } from "./CyberWorld";

const glitchBars = [8, 17, 29, 41, 46, 58, 67, 79, 88];

export function ExperienceCanvas({ progress, pointer, opening }: { progress: ProgressRef; pointer: PointerRef; opening: OpeningRef }) {
  const glitch = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  return (
    <div className="canvas-shell" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.35, 13.5], fov: 43, near: 0.1, far: 90 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        fallback={<div className="canvas-fallback" />}
      >
        <color attach="background" args={["#010403"]} />
        <CyberWorld progress={progress} pointer={pointer} opening={opening} glitch={glitch} hud={hud} />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
      {/* Storyboard HUD readouts for each intro stage; values count up from the 3D scene. */}
      <div ref={hud} className="intro-hud" data-stage="start">
        <div className="ih ih-start">
          <span>KN1GHTS.BETA</span>
          <span>INITIALIZING<i className="ih-dots" /></span>
          <span>SYSTEMS ONLINE</span>
          <span>LOADING ASSETS</span>
          <span>ESTABLISHING SECURE LINK</span>
        </div>
        <div className="ih ih-particles">
          <span>PARTICLES: <b data-count="12480" data-at="0.13" data-dur="0.1">0</b></span>
          <span>DEPTH: <b data-count="3.2" data-dec="1" data-at="0.13" data-dur="0.08">0.0</b></span>
          <span>INTENSITY: <b data-count="0.68" data-dec="2" data-at="0.13" data-dur="0.09">0.00</b></span>
        </div>
        <div className="ih ih-knight">
          <div className="ih-target">
            <svg viewBox="0 0 24 26"><path d="M12 1.5C6.5 1.5 3 5.5 3 11.5V19l4 3 5 3 5-3 4-3v-7.5C21 5.5 17.5 1.5 12 1.5Z M12 1.5V25 M4.5 12.5l6-1 M19.5 12.5l-6-1" /></svg>
          </div>
          <span>TARGET: KNIGHT</span>
          <span>STATUS: FORMING</span>
          <span>CONFIDENCE: <b data-count="87" data-at="0.3" data-dur="0.15">0</b>%</span>
        </div>
        <div className="ih ih-scan">
          <span className="ih-title">SCANNING<i className="ih-dots" /></span>
          <span>&gt; STRUCTURE: <b data-count="84" data-at="0.5" data-dur="0.1">0</b>%</span>
          <span>&gt; PATTERN: <b data-count="76" data-at="0.52" data-dur="0.1">0</b>%</span>
          <span>&gt; INTEGRITY: <b data-count="92" data-at="0.54" data-dur="0.08">0</b>%</span>
          <span>&gt; THREAT: <em>UNKNOWN</em></span>
        </div>
        <div className="ih ih-coords">
          <span>X: <b data-hud="x">12.480</b></span>
          <span>Y: <b data-hud="y">03.240</b></span>
          <span>Z: <b data-hud="z">56.281</b></span>
        </div>
        <div className="ih ih-burst">
          <span>SIGNAL LOST // 0x7F3A</span>
          <span>INTEGRITY: <b data-count="0" data-from="100" data-at="0.665" data-dur="0.04">100</b>%</span>
          <span>RECOMPILING…</span>
        </div>
        <p className="ih ih-logo">SECURE <i>/</i> EXPLOIT <i>/</i> DEFEND</p>
      </div>
      <div ref={glitch} className="canvas-glitch" data-active="false">
        {glitchBars.map((top, i) => <span key={top} style={{ top: `${top}%`, height: `${1 + (i % 3)}px`, animationDelay: `${i * 0.05}s` }} />)}
      </div>
    </div>
  );
}
