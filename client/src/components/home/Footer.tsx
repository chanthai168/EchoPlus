import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";

const faceBookIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<g fill="none">
		<g clip-path="url(#SVGXv8lpc2Y)">
			<path fill="currentColor" fill-rule="evenodd" d="M0 12.067C0 18.034 4.333 22.994 10 24v-8.667H7V12h3V9.333c0-3 1.933-4.666 4.667-4.666c.866 0 1.8.133 2.666.266V8H15.8c-1.467 0-1.8.733-1.8 1.667V12h3.2l-.533 3.333H14V24c5.667-1.006 10-5.966 10-11.933C24 5.43 18.6 0 12 0S0 5.43 0 12.067" clip-rule="evenodd" />
		</g>
		<defs>
			<clipPath id="SVGXv8lpc2Y">
				<path fill="#fff" d="M0 0h24v24H0z" />
			</clipPath>
		</defs>
	</g>
</svg>
;
const githubIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 24 24">
	<path d="M0 0h24v24H0z" fill="none" />
	<g fill="none">
		<g clip-path="url(#SVGXv8lpc2Y)">
			<path fill="currentColor" fill-rule="evenodd" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12" clip-rule="evenodd" />
		</g>
		<defs>
			<clipPath id="SVGXv8lpc2Y">
				<path fill="#fff" d="M0 0h24v24H0z" />
			</clipPath>
		</defs>
	</g>
</svg>
;
const gmailIcon = <svg xmlns="http://www.w3.org/2000/svg" width="1.4em" height="1.4em" viewBox="0 0 256 193">
	<path d="M0 0h256v193H0z" fill="none" />
	<path fill="#4285f4" d="M58.182 192.05V93.14L27.507 65.077L0 49.504v125.091c0 9.658 7.825 17.455 17.455 17.455z" />
	<path fill="#34a853" d="M197.818 192.05h40.727c9.659 0 17.455-7.826 17.455-17.455V49.505l-31.156 17.837l-27.026 25.798z" />
	<path fill="#ea4335" d="m58.182 93.14l-4.174-38.647l4.174-36.989L128 69.868l69.818-52.364l4.669 34.992l-4.669 40.644L128 145.504z" />
	<path fill="#fbbc04" d="M197.818 17.504V93.14L256 49.504V26.231c0-21.585-24.64-33.89-41.89-20.945z" />
	<path fill="#c5221f" d="m0 49.504l26.759 20.07L58.182 93.14V17.504L41.89 5.286C24.61-7.66 0 4.646 0 26.23z" />
</svg>
;

const NAME = "Echo Plus";
const CURVE_DEPTH = 140;   // px — how deep the middle dips
const MAX_ROTATION = 18;   // deg — edge letters tilt

const Letter: React.FC<{
  char: string;
  index: number;
  total: number;
  curve: MotionValue<number>;
}> = ({ char, index, total, curve }) => {
  const t = total === 1 ? 0 : (index / (total - 1)) * 2 - 1;
  const curveFactor = 1 - t * t;

  const y = useTransform(curve, (c) => curveFactor * c * CURVE_DEPTH);
  const rotate = useTransform(curve, (c) => -t * c * MAX_ROTATION);

  return (
    <motion.span
      style={{ y, rotate, display: "inline-block" }}
      className="text-textColor bg-clip-text will-change-transform"
    >
      {char === " " ? "\u00A0" : char}
    </motion.span>
  );
};

const Footer: React.FC = () => {
  const footerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: footerRef,
    // 0 → footer top hits viewport bottom
    // 1 → footer bottom hits viewport bottom (true page end)
    offset: ["start end", "end end"],
  });

  // ── The "feel" knobs ─────────────────────────────────
  // stiffness: higher = snappier follow of the scroll
  // damping:   higher = less overshoot / wobble
  // mass:      higher = heavier, laggier
  const smooth = useSpring(scrollYProgress, {
    stiffness: 400,
    damping: 24,
    mass: 0.6,
    restDelta: 0.001,
  });

  // Ease the mapping so most of the straightening happens in the
  // middle of the scroll range, not linearly.
  const curve = useTransform(smooth, [0, 0.15, 0.75, 1], [1, 1, 0.35, 0]);

  const chars = NAME.split("");

  return (
    <section ref={footerRef} className="w-full  pt-96 -bg-linear-90 overflow-hidden  bg-layer1 text-textColor">
      <div className="mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-10 flex flex-col items-center md:px-32 gap-6 sm:mb-14 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md text-base  leading-relaxed sm:text-lg">
            Say <span className=" bg-blue-500 px-2 text-white rounded-sm">Hello</span> to us 
          </p>

          {/* <div className="space-y-1 text-sm sm:text-left sm:text-base">
            <p>
              <span className="font-medium">Facebook:</span> San Chanthai
            </p>
            <p>
              <span className="font-medium">Gmail:</span>{" "}
              <a
                href="mailto:sanchanthai012@gmail.com"
                className="hover:underline"
              >
                sanchanthai012@gmail.com
              </a>
            </p>
            <p>
              <span className="font-medium">Github:</span>{" "}
              <a
                href="https://github.com/chanthai168"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                @chanthai168
              </a>
            </p>
          </div> */}

          <div className=" flex gap-1">
            <p className="nav-glass p-2.5 rounded-l-full">{faceBookIcon}</p>
            <p className="nav-glass p-2.5 rounded-full">{githubIcon}</p>
            <p className="nav-glass p-2.5 rounded-r-full">{gmailIcon}</p>
          </div>
        </div>

        <h1 className=" text-[48px] sm:text-[200px] text-center font-bold flex justify-center  pb-6">
          {chars.map((char, i) => (
            <Letter
              key={i}
              char={char}
              index={i}
              total={chars.length}
              curve={curve}
            />
          ))}
        </h1>

        <div className="flex justify-between">
          <p className=" text-sm sm:text-md">©️ All right reserved.</p>
          <p className=" text-sm sm:text-md">2026</p>
          <p className=" text-sm sm:text-md">By San Chanthai</p>
        </div>


      </div>
    </section>
  );
};

export default Footer;