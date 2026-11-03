// src/context/StageContext.tsx
import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

// ---- 1. Define the possible states ----
export type Stage = 'idle' | 'speaking' | 'thinking';

// ---- 2. Define the shape of the context value ----
type StageContextValue = {
  stage: Stage;
  setStage: (s: Stage) => void;
  // optional convenience helpers
  next: () => void;
  prev: () => void;
};

// ---- 3. Create the context (undefined default = forces hook to be used inside provider) ----
const StageContext = createContext<StageContextValue | undefined>(undefined);

// ---- 4. Provider component ----
export function StageProvider({
  children,
  initial = 'idle',
}: {
  children: ReactNode;
  initial?: Stage;
}) {
  const [stage, setStage] = useState<Stage>(initial);

  const value = useMemo<StageContextValue>(() => {
    const order: Stage[] = ['idle', 'speaking', 'thinking'];

    return {
      stage,
      setStage,
      next: () => {
        const i = order.indexOf(stage);
        setStage(order[(i + 1) % order.length]);
      },
      prev: () => {
        const i = order.indexOf(stage);
        setStage(order[(i - 1 + order.length) % order.length]);
      },
    };
  }, [stage]);

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

// ---- 5. Custom hook ----
export function useStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error('useStage must be used inside <StageProvider>');
  return ctx;
}