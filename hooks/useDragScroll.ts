"use client";

import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
  WheelEvent as ReactWheelEvent
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type UseDragScrollOptions = {
  enabled?: boolean;
  enableWheelScroll?: boolean;
  dragThreshold?: number;
  desktopMinWidth?: number;
};

type DragScrollBindings<T extends HTMLElement> = {
  onClickCapture: (event: ReactMouseEvent<T>) => void;
  onPointerCancel: (event: ReactPointerEvent<T>) => void;
  onPointerDown: (event: ReactPointerEvent<T>) => void;
  onPointerLeave: (event: ReactPointerEvent<T>) => void;
  onPointerMove: (event: ReactPointerEvent<T>) => void;
  onPointerUp: (event: ReactPointerEvent<T>) => void;
  onWheel: (event: ReactWheelEvent<T>) => void;
};

type UseDragScrollResult<T extends HTMLElement> = {
  bind: DragScrollBindings<T>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isDragging: boolean;
};

type DragState = {
  didDrag: boolean;
  pointerId: number | null;
  startScrollLeft: number;
  startX: number;
};

function createMediaQuery(minWidth: number) {
  return `(min-width: ${minWidth}px)`;
}

export function useDragScroll<T extends HTMLElement>(
  ref: RefObject<T | null>,
  {
    enabled = true,
    enableWheelScroll = true,
    dragThreshold = 6,
    desktopMinWidth = 801
  }: UseDragScrollOptions = {}
): UseDragScrollResult<T> {
  const dragStateRef = useRef<DragState>({
    didDrag: false,
    pointerId: null,
    startScrollLeft: 0,
    startX: 0
  });
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const element = ref.current;

    if (!element) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }

    setCanScrollLeft(element.scrollLeft > 1);
    setCanScrollRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);
  }, [ref]);

  const stopDragging = useCallback((pointerId?: number) => {
    const element = ref.current;

    if (element && pointerId !== undefined && element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }

    dragStateRef.current.pointerId = null;
    setIsDragging(false);
  }, [ref]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(createMediaQuery(desktopMinWidth));
    const element = ref.current;
    const handleViewportChange = () => {
      setIsDesktop(mediaQuery.matches);
      updateScrollState();
    };

    handleViewportChange();

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleViewportChange);
    } else {
      mediaQuery.addListener(handleViewportChange);
    }

    window.addEventListener("resize", updateScrollState);
    element?.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && element
        ? new ResizeObserver(updateScrollState)
        : null;

    if (resizeObserver && element) {
      resizeObserver.observe(element);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleViewportChange);
      } else {
        mediaQuery.removeListener(handleViewportChange);
      }

      window.removeEventListener("resize", updateScrollState);
      element?.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
    };
  }, [desktopMinWidth, enabled, ref, updateScrollState]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<T>) => {
    if (!enabled || !isDesktop || event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }

    const element = ref.current;

    if (!element) {
      return;
    }

    dragStateRef.current = {
      didDrag: false,
      pointerId: event.pointerId,
      startScrollLeft: element.scrollLeft,
      startX: event.clientX
    };

    element.setPointerCapture(event.pointerId);
  }, [enabled, isDesktop, ref]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<T>) => {
    const element = ref.current;
    const dragState = dragStateRef.current;

    if (
      !enabled ||
      !isDesktop ||
      !element ||
      event.pointerType !== "mouse" ||
      dragState.pointerId !== event.pointerId
    ) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;

    if (!dragState.didDrag && Math.abs(deltaX) < dragThreshold) {
      return;
    }

    if (!dragState.didDrag) {
      dragState.didDrag = true;
      setIsDragging(true);
    }

    event.preventDefault();
    element.scrollLeft = dragState.startScrollLeft - deltaX;
    updateScrollState();
  }, [dragThreshold, enabled, isDesktop, ref, updateScrollState]);

  const handlePointerUp = useCallback((event: ReactPointerEvent<T>) => {
    stopDragging(event.pointerId);
    updateScrollState();
  }, [stopDragging, updateScrollState]);

  const handlePointerCancel = useCallback((event: ReactPointerEvent<T>) => {
    stopDragging(event.pointerId);
    updateScrollState();
  }, [stopDragging, updateScrollState]);

  const handlePointerLeave = useCallback((event: ReactPointerEvent<T>) => {
    if (!dragStateRef.current.didDrag) {
      return;
    }

    stopDragging(event.pointerId);
    updateScrollState();
  }, [stopDragging, updateScrollState]);

  const handleWheel = useCallback((event: ReactWheelEvent<T>) => {
    const element = ref.current;

    if (!enabled || !isDesktop || !enableWheelScroll || !element) {
      return;
    }

    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const delta = event.deltaX || event.deltaY;

    if (!delta) {
      return;
    }

    event.preventDefault();
    element.scrollLeft += delta;
    updateScrollState();
  }, [enableWheelScroll, enabled, isDesktop, ref, updateScrollState]);

  const handleClickCapture = useCallback((event: ReactMouseEvent<T>) => {
    if (!dragStateRef.current.didDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.didDrag = false;
  }, []);

  return {
    bind: {
      onClickCapture: handleClickCapture,
      onPointerCancel: handlePointerCancel,
      onPointerDown: handlePointerDown,
      onPointerLeave: handlePointerLeave,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onWheel: handleWheel
    },
    canScrollLeft,
    canScrollRight,
    isDragging
  };
}
