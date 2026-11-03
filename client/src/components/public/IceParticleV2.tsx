import { useEffect, useRef } from 'react';

export type IceParticlesLayer = 'background' | 'foreground';

export interface IceParticlesProps {
  layer?: IceParticlesLayer;
  spriteSrc: string | string[];
  particleCount?: number;
  minSize?: number;
  maxSize?: number;
  minSpeed?: number;
  maxSpeed?: number;
  swayAmount?: number;
  swaySpeed?: number;
  rotationSpeed?: number;
  opacity?: number;
  className?: string;
  zIndex?: number;
  paused?: boolean;

  /* --- NEW: scroll interaction --- */
  /** Master switch for scroll-driven speed. */
  scrollReactive?: boolean;
  /**
   * How strongly scroll velocity affects particle speed.
   * 0 = no effect, 1 = subtle, 3 = strong, 10 = wild.
   */
  scrollSensitivity?: number;
  /**
   * If true: scrolling DOWN pushes ice faster.
   * If false: scrolling UP pushes ice faster.
   * (Default: true — feels like you're dragging the ice along.)
   */
  scrollDownBoosts?: boolean;
  /** Max absolute speed boost (clamped). */
  maxScrollBoost?: number;
  /** How fast the boost decays back to 0 (0–1). Lower = longer tail. */
  scrollDecay?: number;
}

export default function IceParticles({
  layer = 'background',
  spriteSrc,
  particleCount = 60,
  minSize = 20,
  maxSize = 60,
  minSpeed = 0.3,
  maxSpeed = 1.2,
  swayAmount = 15,
  swaySpeed = 0.01,
  rotationSpeed = 0.005,
  opacity = 0.85,
  className = '',
  zIndex,
  paused = false,

  scrollReactive = false,
  scrollSensitivity = 2,
  scrollDownBoosts = true,
  maxScrollBoost = 8,
  scrollDecay = 0.92,
}: IceParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spritesRef = useRef<HTMLImageElement[]>([]);
  const pausedRef = useRef(paused);

  // The "boost" applied to every particle's fall speed.
  // Positive = faster downward, negative = reverse / slower.
  const scrollBoostRef = useRef(0);

  // Tracks the last known scroll position to compute velocity.
  const lastScrollYRef = useRef(0);
  const lastScrollTimeRef = useRef(performance.now());

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  /* ----------------------------------------------------------
     Load sprites
     ---------------------------------------------------------- */
  useEffect(() => {
    const srcs = Array.isArray(spriteSrc) ? spriteSrc : [spriteSrc];
    spritesRef.current = srcs.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, [spriteSrc]);

  /* ----------------------------------------------------------
     Scroll listeners — update boost from scroll velocity
     ---------------------------------------------------------- */
  useEffect(() => {
    if (!scrollReactive) return;

    const applyDelta = (deltaY: number, dt: number) => {
      // pixels per ms, scaled
      const velocity = (deltaY / Math.max(dt, 1)) * scrollSensitivity;
      const direction = scrollDownBoosts ? 1 : -1;
      // Add to boost, then clamp
      scrollBoostRef.current += velocity * direction;
      scrollBoostRef.current = Math.max(
        -maxScrollBoost,
        Math.min(maxScrollBoost, scrollBoostRef.current)
      );
    };

    const onWheel = (e: WheelEvent) => {
      const now = performance.now();
      const dt = now - lastScrollTimeRef.current;
      lastScrollTimeRef.current = now;
      applyDelta(e.deltaY, dt);
    };

    // For scrollbar drag, arrow keys, programmatic scroll, touch
    const onScroll = () => {
      const now = performance.now();
      const dt = now - lastScrollTimeRef.current;
      const currentY = window.scrollY;
      const deltaY = currentY - lastScrollYRef.current;

      lastScrollYRef.current = currentY;
      lastScrollTimeRef.current = now;

      if (Math.abs(deltaY) > 0) {
        applyDelta(deltaY, dt);
      }
    };

    let touchLastY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchLastY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const deltaY = touchLastY - currentY; // swipe up = positive scroll down
      const now = performance.now();
      const dt = now - lastScrollTimeRef.current;
      lastScrollTimeRef.current = now;
      touchLastY = currentY;
      applyDelta(deltaY, dt);
    };

    lastScrollYRef.current = window.scrollY;
    lastScrollTimeRef.current = performance.now();

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [
    scrollReactive,
    scrollSensitivity,
    scrollDownBoosts,
    maxScrollBoost,
  ]);

  /* ----------------------------------------------------------
     Main animation loop
     ---------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0;
    let H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const rand = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    class IceParticle {
      size = 0;
      x = 0;
      baseX = 0;
      y = 0;
      speed = 0;
      rotation = 0;
      rotationSpeed = 0;
      swayOffset = 0;
      swayAmp = 0;
      age = 0;
      sprite: HTMLImageElement | null = null;

      constructor(initial = false) {
        this.reset(initial);
      }

      reset(initial = false) {
        this.size = rand(minSize, maxSize);
        this.baseX = rand(0, W);
        this.x = this.baseX;
        this.y = initial ? rand(0, H) : rand(-this.size * 2, -this.size);
        this.speed = rand(minSpeed, maxSpeed);
        this.rotation = rand(0, Math.PI * 2);
        this.rotationSpeed = rand(-rotationSpeed, rotationSpeed);
        this.swayOffset = rand(0, Math.PI * 2);
        this.swayAmp = rand(5, swayAmount);
        this.age = 0;

        const list = spritesRef.current;
        this.sprite = list.length
          ? list[Math.floor(Math.random() * list.length)]
          : null;
      }

      update() {
        this.age++;

        // 🔑 effective speed = base + scroll boost
        const boost = scrollBoostRef.current;
        const effectiveSpeed = this.speed + boost;

        this.y += effectiveSpeed;

        // Sway stays proportional to movement (feels less frozen when boosted)
        this.x =
          this.baseX +
          Math.sin(this.age * swaySpeed + this.swayOffset) * this.swayAmp;

        this.rotation += this.rotationSpeed;

        // Recycle if it drifts off the TOP too (when boost is negative/reverse)
        if (this.y > H + this.size || this.y < -this.size * 3) {
          this.reset();
        }
      }

      draw() {
        ctx!.save();
        ctx!.globalAlpha = opacity;
        ctx!.translate(this.x, this.y);
        ctx!.rotate(this.rotation);

        const s = this.sprite;
        if (s && s.complete && s.naturalWidth > 0) {
          ctx!.drawImage(
            s,
            -this.size / 2,
            -this.size / 2,
            this.size,
            this.size
          );
        } else {
          ctx!.fillStyle = '#bfe9ff';
          ctx!.beginPath();
          ctx!.moveTo(0, -this.size / 2);
          ctx!.lineTo(this.size / 2, 0);
          ctx!.lineTo(0, this.size / 2);
          ctx!.lineTo(-this.size / 2, 0);
          ctx!.closePath();
          ctx!.fill();
        }

        ctx!.restore();
      }
    }

    const particles: IceParticle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new IceParticle(true));
    }

    const animate = () => {
      if (!pausedRef.current) {
        // 🔑 decay the scroll boost every frame (smooth tail-off)
        scrollBoostRef.current *= scrollDecay;
        // Snap tiny values to 0 to avoid endless drift
        if (Math.abs(scrollBoostRef.current) < 0.001) {
          scrollBoostRef.current = 0;
        }

        ctx.clearRect(0, 0, W, H);
        for (const p of particles) {
          p.update();
          p.draw();
        }
      }
      requestAnimationFrame(animate);
    };
    const raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [
    particleCount,
    minSize,
    maxSize,
    minSpeed,
    maxSpeed,
    swayAmount,
    swaySpeed,
    rotationSpeed,
    opacity,
    scrollDecay,
  ]);

  const baseStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none', // ✅ never blocks UI
  };

  const layerStyle: React.CSSProperties =
    layer === 'background'
      ? { zIndex: zIndex ?? 0 }
      : { zIndex: zIndex ?? 9999 };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ ...baseStyle, ...layerStyle }}
    />
  );
}