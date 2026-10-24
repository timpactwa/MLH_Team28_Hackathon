"use client";

import { useEffect, useRef } from "react";

/**
 * The heading for a step. When the user moves to a new step it takes focus,
 * so screen-reader and keyboard users land at the top of the new content.
 */
export function StepHeading({ children, focusOnMount }: { children: React.ReactNode; focusOnMount: boolean }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
  }, [focusOnMount]);
  return (
    <h2 ref={ref} tabIndex={-1} className="text-2xl font-semibold text-stone-900 outline-none">
      {children}
    </h2>
  );
}
