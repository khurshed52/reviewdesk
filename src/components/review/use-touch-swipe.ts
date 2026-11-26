"use client";
import { useEffect, useRef, type RefObject } from "react";

// Native non-passive touchmove is needed to stop Safari claiming a horizontal
// gesture as page scrolling. Pointer capture alone can be cancelled on iOS.
export function useTouchSwipe(
  element: RefObject<HTMLDivElement | null>,
  onSwipe: (direction: number) => void,
  onTouch: () => void,
  disabled: boolean,
) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  useEffect(() => {
    const node = element.current;
    if (!node) return;
    const begin = (event: TouchEvent) => {
      start.current = null;
      if (disabled || event.touches.length !== 1 ||
        (event.target as Element).closest("button, textarea, input")) return;
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
      onTouch();
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) { start.current = null; return; }
      const origin = start.current;
      if (!origin || disabled) return;
      const touch = event.touches[0];
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.2 && event.cancelable)
        event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const origin = start.current;
      start.current = null;
      if (!origin || disabled) return;
      const touch = Array.from(event.changedTouches).find(t => t.identifier === origin.id);
      if (!touch) return;
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;
      if (Math.abs(dx) >= 30 && Math.abs(dx) > Math.abs(dy) * 1.2)
        onSwipe(dx < 0 ? 1 : -1);
    };
    const cancel = () => { start.current = null; };
    node.addEventListener("touchstart", begin, { passive: true });
    node.addEventListener("touchmove", move, { passive: false });
    node.addEventListener("touchend", end);
    node.addEventListener("touchcancel", cancel);
    return () => {
      node.removeEventListener("touchstart", begin);
      node.removeEventListener("touchmove", move);
      node.removeEventListener("touchend", end);
      node.removeEventListener("touchcancel", cancel);
    };
  }, [element, onSwipe, onTouch, disabled]);
}
