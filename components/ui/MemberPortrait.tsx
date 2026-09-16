"use client";

import { useEffect, useRef, useState } from "react";

export function MemberPortrait({ src, name }: { src: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (!src || failed) {
    return <div className="portrait-placeholder" aria-hidden="true">KN1</div>;
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={`${name}, KN1GHTS team member`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
