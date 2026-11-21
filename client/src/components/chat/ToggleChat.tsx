import React, { useEffect, useState } from "react";

const chatOffIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<g fill="currentColor">
		<path fill-opacity=".4" d="M8.919 4.677L7.417 3.175a9.945 9.945 0 0 1 13.408 13.408Zm-3.951.291l14.064 14.064a9.93 9.93 0 0 1-11.163 2.014l-4.673.935a1 1 0 0 1-1.177-1.177l.935-4.673A9.93 9.93 0 0 1 4.968 4.968" />
		<path d="M1.293 2.707a.999.999 0 1 1 1.414-1.414l20 20a.999.999 0 1 1-1.414 1.414Z" />
	</g>
</svg>

const chatOnIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
	<path d="M0 0h16v16H0z" fill="none" />
	<path fill="currentColor" d="M16 8c0 3.866-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.584.296-1.925.864-4.181 1.234c-.2.032-.352-.176-.273-.362c.354-.836.674-1.95.77-2.966C.744 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7M5 8a1 1 0 1 0-2 0a1 1 0 0 0 2 0m4 0a1 1 0 1 0-2 0a1 1 0 0 0 2 0m3 1a1 1 0 1 0 0-2a1 1 0 0 0 0 2" />
</svg>



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
      <span className="absolute inset-0 text-orange-500 flex items-center justify-between px-2 text-xs select-none pointer-events-none">
        <span className={isClose ? "opacity-50" : "opacity-100"}>{chatOnIcon}</span>
        <span className={isClose ? "opacity-100" : "opacity-50"}>{chatOffIcon}</span>
      </span>

      {/* Sliding knob */}
      <span
        className={`absolute top-1 text-orange-500 left-1 w-6 h-6 rounded-full bg-white shadow-md
                    flex items-center justify-center text-xs
                    transform transition-transform duration-300 ease-in-out
                    ${isClose ? "translate-x-8" : "translate-x-0"}`}
      >
        {isClose ? chatOffIcon : chatOnIcon}
      </span>
    </button>
  );
}