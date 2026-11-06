"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseBarcodeSccannerOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  /** Max ms between keystrokes to be considered scanner input (default 50ms) */
  threshold?: number;
  enabled?: boolean;
}

/**
 * Listens for rapid keyboard input that resembles a USB/Bluetooth barcode scanner.
 * Scanner guns type all chars < 50ms apart, then send Enter.
 * Manual typing is much slower (> 100ms per key) so we ignore it here.
 *
 * Only fires when the focused element is NOT an input/textarea/select —
 * that way manual fields are not intercepted.
 */
export function useBarcodeScanner({
  onScan,
  minLength = 3,
  threshold = 50,
  enabled = true,
}: UseBarcodeSccannerOptions) {
  const bufferRef      = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const timerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    const code = bufferRef.current.trim();
    bufferRef.current = "";
    if (code.length >= minLength) {
      onScan(code);
    }
  }, [onScan, minLength]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Let the user type normally in form fields
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now   = Date.now();
      const delta = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        if (timerRef.current) clearTimeout(timerRef.current);
        flush();
        return;
      }

      // If gap too large, this is manual typing — reset buffer
      if (bufferRef.current.length > 0 && delta > 300) {
        bufferRef.current = "";
      }

      // Only printable single chars
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }

      // Scanner sometimes skips Enter (older models) — auto-flush after quiet period
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        flush();
      }, threshold * 6); // 300ms quiet = scanner done
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, flush, threshold]);
}
