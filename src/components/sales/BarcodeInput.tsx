"use client";

import { useRef, useState, useCallback } from "react";
import { Scan, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeInputProps {
  onScan: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Manual barcode entry field.
 * - Works with physical USB/Bluetooth barcode scanner guns (they type fast + Enter)
 * - Also accepts manual keyboard input
 * - Shows a brief green flash on successful scan submission
 */
export default function BarcodeInput({
  onScan,
  placeholder = "Scan barcode or type medicine code…",
  className,
}: BarcodeInputProps) {
  const [value, setValue] = useState("");
  const [scanned, setScanned] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const submitScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      onScan(trimmed);
      setValue("");

      // Brief green flash feedback
      setScanned(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setScanned(false), 900);
    },
    [onScan]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submitScan(value);
    }
  };

  return (
    <div className={cn("relative flex items-center", className)}>
      {/* Icon: scanner or checkmark */}
      <div className="absolute left-3 pointer-events-none transition-all duration-200">
        {scanned ? (
          <CheckCircle2 size={16} className="text-emerald-500" />
        ) : (
          <Scan size={16} className="text-indigo-500" />
        )}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border transition-all duration-200",
          "placeholder:text-indigo-300 focus:outline-none focus:ring-2",
          scanned
            ? "bg-emerald-50 border-emerald-300 ring-emerald-200 text-emerald-700"
            : "bg-indigo-50 border-indigo-200 focus:ring-indigo-300 focus:bg-white"
        )}
        aria-label="Barcode scanner input"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  );
}
