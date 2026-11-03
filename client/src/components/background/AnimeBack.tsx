
import { useEffect, useRef, useState } from "react";

import background from '../../assets/mikasa/mikasa.png'

import mikasa from '../../assets/mikasa/mikasa.png';
import pain from '../../assets/pain/pain.png';
import levi from '../../assets/levi/levi-back.png';

import { useStage } from "../../context/StageContext";
import { useCharacter } from "../../context/CharacterContext";

const characters = new Map<string, string>([
  ['mikasa', mikasa],
  ['pain', pain],
  ['levi', levi]
]);

export default function AnimeBackground() {

  const wrapperRef = useRef<HTMLDivElement>(null);

  const {character} = useCharacter();


  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    let currentY = 0;
    let targetY = 0;
    let rafId: number;

    const speed = -0.2;          // parallax strength (0.3–0.5 is nice)
    const lag = 0.08;           // ← lower = more delay / heavier feel
                                //   0.05–0.12 is a good range

    const onScroll = () => {
      targetY = window.scrollY * speed;
    };

    const animate = () => {
      // Smoothly catch up to the target
      currentY += (targetY - currentY) * lag;

      // Optional: stop micro-movements when very close
      if (Math.abs(targetY - currentY) < 0.1) {
        currentY = targetY;
      }

      wrapper.style.transform = `translate3d(0, ${currentY}px, 0)`;
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();          // set initial target
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);


  // inside the component:
  const frameRef = useRef(0);


//className=" fixed inset-0 -z-10 h-[200%] top-[80%] translate-y-[-50%]  left-[50%] translate-x-[-50%]    md:w-[128vw] "
  return (
   <>
    
        <div
          ref={wrapperRef}
          className="fixed inset-0 w-full -z-10 top-[30%] translate-y-[-50%]  left-[50%] translate-x-[-50%]    "
          style={{ transform: "translate3d(0, 0, 0)" }} // initial
        >

        <img src={characters.get(character)}  />
        </div>

       </>   
    
  );
}