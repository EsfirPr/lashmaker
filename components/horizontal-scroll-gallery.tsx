"use client";

import type {
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent
} from "react";
import { useRef, useState } from "react";
import { useDragScroll } from "@/hooks/useDragScroll";

type HorizontalScrollGalleryProps = {
  children: ReactNode;
  className: string;
  showAffordance?: boolean;
  hintLabel?: string;
};

export function HorizontalScrollGallery({
  children,
  className,
  hintLabel = "← Скрольте →",
  showAffordance = false
}: HorizontalScrollGalleryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const { bind, canScrollLeft, canScrollRight, isDragging } = useDragScroll(containerRef, {
    desktopMinWidth: 801,
    dragThreshold: 6,
    enableWheelScroll: true,
    enabled: true
  });

  const classNames = [
    className,
    "gallery-scroll",
    "horizontal-scroll",
    isDragging ? "is-dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellClassNames = [
    "horizontal-scroll-shell",
    canScrollLeft ? "can-scroll-left" : "",
    canScrollRight ? "can-scroll-right" : "",
    showAffordance && !hasInteracted && (canScrollLeft || canScrollRight) ? "is-hint-visible" : ""
  ]
    .filter(Boolean)
    .join(" ");

  function markInteracted() {
    if (!showAffordance || hasInteracted) {
      return;
    }

    setHasInteracted(true);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    markInteracted();
    bind.onPointerDown(event);
  }

  function handleScroll() {
    if (containerRef.current?.scrollLeft) {
      markInteracted();
    }
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    markInteracted();
    bind.onWheel(event);
  }

  return (
    <div className={shellClassNames}>
      <div
        className={classNames}
        onClickCapture={bind.onClickCapture}
        onPointerCancel={bind.onPointerCancel}
        onPointerDown={handlePointerDown}
        onPointerLeave={bind.onPointerLeave}
        onPointerMove={bind.onPointerMove}
        onPointerUp={bind.onPointerUp}
        onScroll={handleScroll}
        onWheel={handleWheel}
        ref={containerRef}
      >
        {children}
      </div>

      {showAffordance ? (
        <>
          <span aria-hidden="true" className="horizontal-scroll-fade horizontal-scroll-fade--left" />
          <span aria-hidden="true" className="horizontal-scroll-fade horizontal-scroll-fade--right" />
          <span aria-hidden="true" className="horizontal-scroll-hint">
            {hintLabel}
          </span>
        </>
      ) : null}
    </div>
  );
}
