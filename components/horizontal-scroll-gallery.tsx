"use client";

import type { PointerEvent, ReactNode } from "react";
import { useCallback, useRef } from "react";

type HorizontalScrollGalleryProps = {
  children: ReactNode;
  className: string;
};

const desktopMediaQuery = "(min-width: 801px)";

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia(desktopMediaQuery).matches;
}

export function HorizontalScrollGallery({
  children,
  className
}: HorizontalScrollGalleryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0
  });

  const stopDragging = useCallback((pointerId?: number) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (pointerId !== undefined && container.hasPointerCapture(pointerId)) {
      container.releasePointerCapture(pointerId);
    }

    dragStateRef.current.isDragging = false;
    container.classList.remove("is-dragging");
  }, []);

  const handlePointerDown = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isDesktopViewport() || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft
    };

    container.classList.add("is-dragging");
    container.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.isDragging || event.pointerType !== "mouse") {
      return;
    }

    const container = containerRef.current;

    if (!container) {
      return;
    }

    const deltaX = event.clientX - dragStateRef.current.startX;
    container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  }, []);

  const handlePointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    stopDragging(event.pointerId);
  }, [stopDragging]);

  const handlePointerCancel = useCallback((event: PointerEvent<HTMLDivElement>) => {
    stopDragging(event.pointerId);
  }, [stopDragging]);

  return (
    <div
      className={`${className} gallery-scroll`}
      onPointerCancel={handlePointerCancel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={containerRef}
    >
      {children}
    </div>
  );
}
