// ThinkingIndicator.tsx
import React from 'react';
import { useStage } from '../../context/StageContext';

interface ThinkingIndicatorProps {
  size?: number;
  color?: string;
  dotCount?: number;
}

const ThinkingIndicator: React.FC<ThinkingIndicatorProps> = ({
  size = 128,
  color = '#6366f1',
  dotCount = 3,
}) => {
  const {stage} = useStage();
  const dotSize = size * 0.18;
  const gap = size * 0.12;
  const totalWidth = dotCount * dotSize + (dotCount - 1) * gap;

  return (
    <div
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: totalWidth,
        height: dotSize,
      }}
      role="status"
      aria-label="Thinking"
      className={`${stage !== 'thinking' ? "hidden": "inline-flex fixed  top-[50%] left-[80%] -translate-x-1/2 "}`}
    >
      <style>{`
        @keyframes thinking-bounce {
          0%, 80%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.5;
          }
          40% {
            transform: translateY(-${size * 0.25}px) scale(1.15);
            opacity: 1;
          }
        }
        .thinking-dot {
          width: ${dotSize}px;
          height: ${dotSize}px;
          border-radius: 50%;
          background-color: ${color};
          animation: thinking-bounce 1.4s infinite ease-in-out both;
          box-shadow: 0 0 ${dotSize * 0.6}px ${color}80;
        }
      `}</style>
      {Array.from({ length: dotCount }).map((_, i) => (
        <span
          key={i}
          className="thinking-dot"
          style={{
            marginLeft: i === 0 ? 0 : gap,
            animationDelay: `${i * 0.16}s`,
          }}
        />
      ))}
    </div>
  );
};

export default ThinkingIndicator;