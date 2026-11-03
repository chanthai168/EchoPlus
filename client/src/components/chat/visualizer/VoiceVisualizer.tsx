import React, { useEffect, useRef } from "react";

interface VoiceVisualizerProps {
  analyser: AnalyserNode | null;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Voice-optimized configurations
    analyser.fftSize = 128; // Fewer bars look cleaner for AI speech
    analyser.smoothingTimeConstant = 0.65; // Smooths gaps between words

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Keep it perfectly transparent to display over React background
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2;
      let x = 0;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        // Scale visual height relative to voice amplitude
        const barHeight = (val / 255) * canvas.height * 0.8;

        // Glowing effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = "rgba(99, 102, 241, 0.5)"; // Neon Indigo

        // Symmetric vertical gradient (top to bottom)
        const gradient = ctx.createLinearGradient(
          0,
          centerY - barHeight / 2,
          0,
          centerY + barHeight / 2
        );
        gradient.addColorStop(0, "rgba(168, 85, 247, 0.8)"); // Neon Purple
        gradient.addColorStop(0.5, "rgba(99, 102, 241, 1)"); // Bright Indigo Center
        gradient.addColorStop(1, "rgba(168, 85, 247, 0.8)");

        ctx.fillStyle = gradient;

        // Draw voice waves centered vertically
        ctx.fillRect(
          x,
          centerY - barHeight / 2,
          barWidth - 4, // Spacing between bars
          barHeight
        );

        x += barWidth;
      }
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [analyser]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={160}
      className="w-full max-w-xl h-40 pointer-events-none"
    />
  );
};