"use client";

import { useEffect, useRef } from "react";

// Moves keyboard and screen-reader focus to an element when it appears (e.g. a new question),
// so the user is not left on a button that just disappeared.
export function useFocusOnMount<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}
