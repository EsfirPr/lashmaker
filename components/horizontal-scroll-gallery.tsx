"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";

type HorizontalScrollGalleryProps = {
  children: ReactNode;
  className: string;
};

export function HorizontalScrollGallery({
  children,
  className
}: HorizontalScrollGalleryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { bind, canScrollLeft, canScrollRight, isDragging } = useDragScroll(containerRef, {
    desktopMinWidth: 801,
    dragThreshold: 6,
    enableWheelScroll: true,
    enabled: true
  });

  const classNames = [
    className,
    "gallery-scroll",
    isDragging ? "is-dragging" : "",
    canScrollLeft ? "can-scroll-left" : "",
    canScrollRight ? "can-scroll-right" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      ref={containerRef}
      {...bind}
    >
      {children}
    </div>
  );
}
