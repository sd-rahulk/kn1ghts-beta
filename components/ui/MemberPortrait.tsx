"use client";

import { useEffect, useRef, useState } from "react";

// Fills its positioned parent (an aspect-square frame).
export function MemberPortrait({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return <div className="absolute inset-0 grid place-items-center font-cyber text-5xl font-black gradient-text" aria-hidden="true">KN1</div>;
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={`${name}, KN1GHTS team member`}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
      onError={() => setFailed(true)}
    />
  );
}
