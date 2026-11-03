// ThinkingIndicator.tsx
import React from 'react';
import { useStage } from '../../context/StageContext';

interface ThinkingIndicatorProps {
  size?: number;
  color?: string;
  dotCount?: number;
}

const RecordingIndicator: React.FC<ThinkingIndicatorProps> = ({
  size = 128,
  color = '#6366f1',
  dotCount = 3,
}) => {
  const dotSize = size * 0.18;
  const gap = size * 0.05;

  const isVisible = true;

  return (
    <div
      role="status"
      aria-label="Thinking"
      className={[
        'items-center justify-center',
        isVisible
          ? 'inline-flex  '
          : 'hidden',
      ].join(' ')}
      style={{
        gap: `${gap}px`,
        height: `${dotSize}px`,
      }}
    >
      <style>{`
        @keyframes thinking-bounces {
          0%, 80%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-${size * 0.2}px) scale(1.15);
            opacity: 1;
          }
        }
        .thinking-dots {
          animation: thinking-bounces 1s infinite ease-in-out both;
        }
      `}</style>
      {Array.from({ length: dotCount }).map((_, i) => (
        <span
          key={i}
          className="thinking-dots rounded-full"
          style={{
            width: `${dotSize/2}px`,
            height: `${dotSize}px`,
            backgroundColor: `${color}`,
            boxShadow: `0 0 ${dotSize * 0.6}px ${color}80`,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
};

export default RecordingIndicator;