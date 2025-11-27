import React, { useState, useEffect } from "react";

/**
 * 🚀 Urban Company–Style Loader
 * This loader mimics a rotating "orbit" loader using emoji/tool icons.
 *
 * Props:
 * - show: boolean to hide/show
 * - size: numeric (pixels) - not used for strict sizing here but available
 * - icons: array of icon strings
 * - speed: interval for swapping icons (ms)
 */

const TOOL_ICONS = ["🛠️", "🧹", "🔧", "💡", "🧼", "🔌"]; // rotating icons

export default function ServiceOrbitLoader({
  show = true,
  size = 120,
  icons = TOOL_ICONS,
  speed = 700,
}) {
  const [index, setIndex] = useState(0);

  if (!show) return null;

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % icons.length);
    }, speed);
    return () => clearInterval(timer);
  }, [icons, speed]);

  return (
    <div className="flex items-center justify-center">
      <div
        aria-hidden
        style={{ fontSize: `${Math.floor(size / 2)}px`, lineHeight: 1 }}
        className="animate-fade-swap"
      >
        {icons[index]}
      </div>

      <style>{`
        @keyframes fadeSwap {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.8); }
        }
        .animate-fade-swap {
          animation: fadeSwap ${speed}ms ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
