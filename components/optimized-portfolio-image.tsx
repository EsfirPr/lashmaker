"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type OptimizedPortfolioImageProps = {
  alt: string;
  className?: string;
  fallbackSrc: string;
  src: string | null | undefined;
};

const portfolioImageSizes =
  "(max-width: 767px) 78vw, (max-width: 1120px) 280px, 280px";

export function OptimizedPortfolioImage({
  alt,
  className,
  fallbackSrc,
  src
}: OptimizedPortfolioImageProps) {
  const normalizedSrc = typeof src === "string" && src.trim() ? src.trim() : fallbackSrc;
  const [currentSrc, setCurrentSrc] = useState(normalizedSrc);

  useEffect(() => {
    setCurrentSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      alt={alt}
      className={className}
      fill
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
      quality={72}
      sizes={portfolioImageSizes}
      src={currentSrc}
    />
  );
}
