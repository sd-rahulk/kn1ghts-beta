"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Preload } from "@react-three/drei";
import type { PointerRef, ProgressRef } from "../SiteExperience";
import { CyberWorld } from "./CyberWorld";

export function ExperienceCanvas({ progress, pointer }: { progress: ProgressRef; pointer: PointerRef }) {
  return (
    <div className="canvas-shell" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.1, 8], fov: 43, near: 0.1, far: 80 }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        fallback={<div className="canvas-fallback" />}
      >
        <color attach="background" args={["#050706"]} />
        <fog attach="fog" args={["#050706", 7, 22]} />
        <ambientLight intensity={0.16} />
        <pointLight position={[3, 4, 5]} color="#b7ff3c" intensity={18} distance={12} />
        <pointLight position={[-4, -2, 2]} color="#466353" intensity={8} distance={10} />
        <CyberWorld progress={progress} pointer={pointer} />
        <AdaptiveDpr pixelated />
        <Preload all />
      </Canvas>
    </div>
  );
}
