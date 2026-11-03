import React, { useEffect, useState } from "react";

export function ToggleChat({theme,setThemeState}:{theme:boolean,setThemeState:React.Dispatch<React.SetStateAction<boolean>>}) {

  const isClose = theme === false;

  return (
    <button
      onClick={()=>setThemeState(!theme)}
      role="switch"
      aria-checked={isClose}
      aria-label="Toggle theme"
      className={`relative w-16 h-8 rounded-full border border-white/40
                  glass transition-colors duration-300 ease-in-out
                  ${isClose ? "bg-slate-800/70" : "bg-sky-200/60"}`}
    >
      {/* Track icons */}
      <span className="absolute inset-0 flex items-center justify-between px-2 text-xs select-none pointer-events-none">
        <span className={isClose ? "opacity-40" : "opacity-100"}>☀️</span>
        <span className={isClose ? "opacity-100" : "opacity-40"}>🌙</span>
      </span>

      {/* Sliding knob */}
      <span
        className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-md
                    flex items-center justify-center text-xs
                    transform transition-transform duration-300 ease-in-out
                    ${isClose ? "translate-x-8" : "translate-x-0"}`}
      >
        {isClose ? "🌙" : "☀️"}
      </span>
    </button>
  );
}