import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  EffectComposer,
  EffectPass,
  RenderPass,
  BloomEffect,
} from "postprocessing";

interface SphereVisualizerProps {
  analyser: AnalyserNode | null;
  size?: number;
}

// Energy palette: blue (silence) → red (mid impulse) → purple (max pulse)
const COLOR_BLUE   = new THREE.Color(0.10, 0.30, 1.00);
const COLOR_RED    = new THREE.Color(1.00, 0.15, 0.10);
const COLOR_PURPLE = new THREE.Color(0.75, 0.10, 1.00);

// Reusable scratch color (avoids per-particle allocations)
const scratch = new THREE.Color();

function energyColor(energy: number, out: THREE.Color): THREE.Color {
  if (energy < 0.5) {
    // 0 → 0.5 : blue → red
    out.copy(COLOR_BLUE).lerp(COLOR_RED, energy * 2);
  } else {
    // 0.5 → 1 : red → purple
    out.copy(COLOR_RED).lerp(COLOR_PURPLE, (energy - 0.5) * 2);
  }
  return out;
}

export const SphereVisualizer: React.FC<SphereVisualizerProps> = ({
  analyser,
  size = 520,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current || !analyser) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 4.6;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ——— Bloom ———
    const composer = new EffectComposer(renderer, {
      frameBufferType: THREE.HalfFloatType,
    });
    composer.addPass(new RenderPass(scene, camera));

    const bloomEffect = new BloomEffect({
      intensity: 1.25,
      luminanceThreshold: 0.18,
      luminanceSmoothing: 0.28,
      mipmapBlur: true,
      radius: 0.6,
    });

    const effectPass = new EffectPass(camera, bloomEffect);
    effectPass.renderToScreen = true;
    composer.addPass(effectPass);

    // ——— Audio ———
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.7;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // ——— Particles ———
    const particleCount = 3400;
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const radius = 1.32;

    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = originalPositions[i * 3] = x;
      positions[i * 3 + 1] = originalPositions[i * 3 + 1] = y;
      positions[i * 3 + 2] = originalPositions[i * 3 + 2] = z;

      // Start blue
      colors[i * 3]     = COLOR_BLUE.r;
      colors[i * 3 + 1] = COLOR_BLUE.g;
      colors[i * 3 + 2] = COLOR_BLUE.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.027,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // ——— Core ———
    const coreGeo = new THREE.SphereGeometry(0.46, 48, 48);
    const coreMat = new THREE.MeshBasicMaterial({
      color: COLOR_BLUE.clone(),
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    scene.add(core);

    // ——— Wireframe shell ———
    const shellGeo = new THREE.IcosahedronGeometry(1.52, 2);
    const shellMat = new THREE.MeshBasicMaterial({
      color: COLOR_BLUE.clone(),
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const shell = new THREE.Mesh(shellGeo, shellMat);
    scene.add(shell);

    let animationId: number;
    let time = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.011;

      analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const avg = sum / bufferLength / 255;

      // Bass emphasis
      let bass = 0;
      for (let i = 0; i < 8; i++) bass += dataArray[i];
      const bassNorm = Math.min(1, (bass / 8 / 255) * 1.35);

      const posAttr = geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = geometry.attributes.color as THREE.BufferAttribute;

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const ox = originalPositions[ix];
        const oy = originalPositions[ix + 1];
        const oz = originalPositions[ix + 2];

        const freqIndex = Math.floor((i / particleCount) * bufferLength);
        const freqVal = dataArray[freqIndex] / 255;

        // Controlled expansion
        const pulse =
          1 +
          avg * 0.22 +
          bassNorm * 0.18 +
          freqVal * 0.18;

        const noise =
          Math.sin(time * 2.2 + i * 0.07) * 0.028 * (0.5 + avg);

        posAttr.array[ix]     = ox * pulse + ox * noise;
        posAttr.array[ix + 1] = oy * pulse + oy * noise;
        posAttr.array[ix + 2] = oz * pulse + oz * noise;

        // Blue → Red → Purple
        const energy = Math.min(1, avg * 1.25 + bassNorm * 0.6 + freqVal * 0.55);
        energyColor(energy, scratch);
        colAttr.array[ix]     = scratch.r;
        colAttr.array[ix + 1] = scratch.g;
        colAttr.array[ix + 2] = scratch.b;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      // Core — color follows global energy, biased toward bass
      const coreEnergy = Math.min(1, bassNorm * 0.75 + avg * 0.5);
      energyColor(coreEnergy, scratch);
      coreMat.color.copy(scratch);
      const coreScale = 1 + bassNorm * 0.7 + avg * 0.2;
      core.scale.setScalar(coreScale);
      coreMat.opacity = 0.16 + bassNorm * 0.38 + avg * 0.15;

      // Shell — color follows average energy
      const shellEnergy = Math.min(1, avg * 0.9 + bassNorm * 0.3);
      energyColor(shellEnergy, scratch);
      shellMat.color.copy(scratch);
      shell.scale.setScalar(1 + avg * 0.16 + bassNorm * 0.08);
      shellMat.opacity = 0.09 + avg * 0.14;
      shell.rotation.y = time * 0.2;
      shell.rotation.x = time * 0.08;

      particles.rotation.y = time * 0.15;
      particles.rotation.x = Math.sin(time * 0.25) * 0.1;

      composer.render();
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, [analyser, size]);

  return (
    <div
      style={{
        width: size,
        height: size,
        margin: "0 auto",
        borderRadius: "50%",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};