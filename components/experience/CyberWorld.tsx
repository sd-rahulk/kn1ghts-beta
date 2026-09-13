"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { PointerRef, ProgressRef } from "../SiteExperience";

const vertexShader = `
  uniform float uTime;
  uniform float uPointSize;
  varying float vDepth;
  void main() {
    vec3 p = position;
    p += normal * sin(uTime * 0.65 + position.y * 3.5) * 0.018;
    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vDepth = clamp(1.0 - (-mvPosition.z / 18.0), 0.0, 1.0);
    gl_PointSize = uPointSize * (9.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vDepth;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float alpha = smoothstep(0.5, 0.08, d) * uOpacity * (0.45 + vDepth * 0.55);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

function seeded(index: number, salt = 0) {
  const x = Math.sin(index * 129.17 + salt * 71.31) * 43758.5453;
  return x - Math.floor(x);
}

function smoothstep(a: number, b: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function knightPoint(i: number): [number, number, number] {
  const y = seeded(i, 1) * 4.9 - 2.45;
  const theta = seeded(i, 2) * Math.PI * 2;
  let radius = 0.5;
  let cx = 0;
  if (y < -1.72) radius = 1.2 - (y + 2.45) * 0.42;
  else if (y < -1.25) radius = 0.84 + (y + 1.72) * 0.42;
  else if (y < 0.25) { radius = 0.66 - (y + 1.25) * 0.12; cx = -0.08 * (y + 1.25); }
  else if (y < 1.35) { radius = 0.46 + (y - 0.25) * 0.09; cx = 0.12 + (y - 0.25) * 0.31; }
  else { radius = 0.62 - (y - 1.35) * 0.22; cx = 0.58 - (y - 1.35) * 0.38; }
  const snout = y > 1.05 && y < 1.72 ? Math.pow(seeded(i, 5), 2) * 0.7 : 0;
  return [cx + Math.cos(theta) * radius + snout, y, Math.sin(theta) * radius * 0.78];
}

function networkPoint(i: number): [number, number, number] {
  const cluster = i % 9;
  const cx = ((cluster % 3) - 1) * 2.7;
  const cy = (Math.floor(cluster / 3) - 1) * 1.7;
  return [cx + (seeded(i, 7) - 0.5) * 2.1, cy + (seeded(i, 8) - 0.5) * 1.5, (seeded(i, 9) - 0.5) * 5.5];
}

const glyphs: Record<string, number[][][]> = {
  K: [[[0, 0], [0, 1]], [[0, .5], [.65, 1]], [[0, .5], [.7, 0]]],
  N: [[[0, 0], [0, 1]], [[0, 1], [.68, 0]], [[.68, 0], [.68, 1]]],
  "1": [[[.1, .78], [.36, 1]], [[.36, 1], [.36, 0]], [[.08, 0], [.66, 0]]],
  G: [[[.72, .82], [.55, 1], [.1, 1], [0, .75], [0, .2], [.15, 0], [.7, 0], [.7, .48], [.4, .48]]],
  H: [[[0, 0], [0, 1]], [[.68, 0], [.68, 1]], [[0, .5], [.68, .5]]],
  T: [[[0, 1], [.72, 1]], [[.36, 1], [.36, 0]]],
  S: [[[.7, .82], [.55, 1], [.15, 1], [0, .78], [.08, .55], [.62, .43], [.7, .18], [.55, 0], [.08, 0]]],
};

function logoPoint(i: number): [number, number, number] {
  const word = "KN1GHTS";
  const charIndex = i % word.length;
  const paths = glyphs[word[charIndex]];
  const path = paths[Math.floor(i / word.length) % paths.length];
  const segment = Math.floor(seeded(i, 12) * (path.length - 1));
  const t = seeded(i, 13);
  const a = path[segment];
  const b = path[Math.min(segment + 1, path.length - 1)];
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t;
  return [(charIndex - 3) * 1.02 + x * .78 - .3, (y - .5) * 1.65, (seeded(i, 14) - .5) * .18];
}

function ParticleField({ progress }: { progress: ProgressRef }) {
  const points = useRef<THREE.Points>(null);
  const count = 4600;
  const data = useMemo(() => {
    const knight = new Float32Array(count * 3);
    const network = new Float32Array(count * 3);
    const logo = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      knight.set(knightPoint(i), i * 3);
      network.set(networkPoint(i), i * 3);
      logo.set(logoPoint(i), i * 3);
      normals.set([seeded(i, 20) - .5, seeded(i, 21) - .5, seeded(i, 22) - .5], i * 3);
    }
    return { knight, network, logo, normals };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(data.knight.slice(), 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
    return geo;
  }, [data]);

  const material = useMemo(() => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 }, uPointSize: { value: 3.2 },
      uColor: { value: new THREE.Color("#b7ff3c") }, uOpacity: { value: .84 },
    },
    vertexShader, fragmentShader,
  }), []);

  useFrame(({ clock, size }) => {
    if (!points.current) return;
    const p = progress.current;
    const pos = geometry.attributes.position.array as Float32Array;
    const toNetwork = smoothstep(.045, .19, p);
    const toLogo = smoothstep(.84, .965, p);
    for (let i = 0; i < count * 3; i++) {
      const mid = THREE.MathUtils.lerp(data.knight[i], data.network[i], toNetwork);
      pos[i] = THREE.MathUtils.lerp(mid, data.logo[i], toLogo);
    }
    geometry.attributes.position.needsUpdate = true;
    material.uniforms.uTime.value = clock.elapsedTime;
    material.uniforms.uPointSize.value = size.width < 700 ? 2.3 : 3.2;
    material.uniforms.uOpacity.value = .46 + Math.max(0, 1 - toNetwork * 1.2) * .4 + toLogo * .36;
    points.current.rotation.y += .0007;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

function Network({ progress }: { progress: ProgressRef }) {
  const lines = useRef<THREE.LineSegments>(null);
  const pulses = useRef<THREE.Points>(null);
  const { geometry, nodeGeometry } = useMemo(() => {
    const nodes = Array.from({ length: 80 }, (_, i) => new THREE.Vector3(...networkPoint(i * 53)));
    const positions: number[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].distanceTo(nodes[j]) < 1.55 && positions.length < 1200) positions.push(...nodes[i].toArray(), ...nodes[j].toArray());
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    return { geometry: geo, nodeGeometry: new THREE.BufferGeometry().setFromPoints(nodes) };
  }, []);

  useFrame(({ clock }) => {
    const show = smoothstep(.1, .18, progress.current) * (1 - smoothstep(.36, .45, progress.current));
    if (lines.current) {
      (lines.current.material as THREE.LineBasicMaterial).opacity = show * .36;
      lines.current.rotation.y = clock.elapsedTime * .025;
    }
    if (pulses.current) {
      (pulses.current.material as THREE.PointsMaterial).opacity = show;
      pulses.current.rotation.y = clock.elapsedTime * .025;
    }
  });

  return <group>
    <lineSegments ref={lines} geometry={geometry}><lineBasicMaterial color="#6e927c" transparent opacity={0} depthWrite={false} /></lineSegments>
    <points ref={pulses} geometry={nodeGeometry}><pointsMaterial color="#b7ff3c" size={.055} transparent opacity={0} depthWrite={false} /></points>
  </group>;
}

function AnalysisCore({ progress }: { progress: ProgressRef }) {
  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const rings = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const p = progress.current;
    const show = smoothstep(.26, .32, p) * (1 - smoothstep(.66, .74, p));
    if (!group.current || !scan.current || !rings.current) return;
    group.current.visible = show > .01;
    group.current.rotation.y = clock.elapsedTime * .16 + p * 3;
    group.current.rotation.x = Math.sin(clock.elapsedTime * .28) * .12;
    group.current.scale.setScalar(.6 + show * .55 + smoothstep(.43, .58, p) * .45);
    (scan.current.material as THREE.MeshBasicMaterial).opacity = show * .22;
    scan.current.position.y = Math.sin(clock.elapsedTime * 1.4) * 1.5;
    rings.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      mesh.rotation.z = clock.elapsedTime * (.12 + i * .04) * (i % 2 ? -1 : 1);
      const exploit = smoothstep(.46 + i * .012, .58 + i * .012, p);
      mesh.position.z = exploit * (i - 2.5) * .48;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.set(exploit > .5 ? "#d88438" : "#345244");
      mat.opacity = show * (.2 + exploit * .55);
    });
  });

  return <group ref={group} visible={false}>
    <mesh><icosahedronGeometry args={[1.16, 2]} /><meshStandardMaterial color="#0a1510" emissive="#142a20" emissiveIntensity={.65} roughness={.32} metalness={.84} wireframe /></mesh>
    <group ref={rings}>{[0,1,2,3,4,5].map((i) => <mesh key={i} rotation={[Math.PI / 2 + i * .13, i * .24, 0]}><torusGeometry args={[1.5 + i * .18, .012 + i * .002, 5, 96]} /><meshStandardMaterial color="#345244" emissive="#b7ff3c" emissiveIntensity={.16} transparent opacity={.3} /></mesh>)}</group>
    <mesh ref={scan}><planeGeometry args={[4.6, .018]} /><meshBasicMaterial color="#b7ff3c" transparent opacity={.2} blending={THREE.AdditiveBlending} /></mesh>
  </group>;
}

function FlagCore({ progress }: { progress: ProgressRef }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!group.current) return;
    const show = smoothstep(.57, .64, progress.current) * (1 - smoothstep(.79, .85, progress.current));
    group.current.visible = show > .01;
    group.current.rotation.y = clock.elapsedTime * .22;
    group.current.rotation.z = Math.sin(clock.elapsedTime * .33) * .18;
    group.current.scale.setScalar(show * (1 + Math.sin(clock.elapsedTime * 1.8) * .025));
    group.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material && "opacity" in mesh.material) (mesh.material as THREE.MeshStandardMaterial).opacity = show * (.18 + i * .1);
    });
  });
  return <group ref={group} visible={false}>
    {[0,1,2,3].map((i) => <mesh key={i} scale={1 + i * .28} rotation={[i * .22, i * .4, 0]}><octahedronGeometry args={[.95, 0]} /><meshStandardMaterial color={i === 0 ? "#b7ff3c" : "#183126"} emissive={i === 0 ? "#6aa818" : "#142a20"} emissiveIntensity={.45} metalness={.88} roughness={.18} transparent opacity={.6} wireframe={i > 0} /></mesh>)}
  </group>;
}

export function CyberWorld({ progress, pointer }: { progress: ProgressRef; pointer: PointerRef }) {
  const world = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(({ clock }) => {
    const p = progress.current;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, Math.sin(p * Math.PI * 5) * .7 + pointer.current.x * .22, .035);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, Math.cos(p * Math.PI * 3) * .28 + pointer.current.y * .14, .035);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, 7.8 - smoothstep(.1, .42, p) * 1.65 + smoothstep(.82, .96, p) * 2.1, .035);
    camera.lookAt(0, 0, 0);
    if (world.current) {
      world.current.rotation.y = Math.sin(clock.elapsedTime * .08) * .08 + pointer.current.x * .035;
      world.current.rotation.x = pointer.current.y * .025;
    }
  });
  return <group ref={world}><ParticleField progress={progress} /><Network progress={progress} /><AnalysisCore progress={progress} /><FlagCore progress={progress} /></group>;
}
