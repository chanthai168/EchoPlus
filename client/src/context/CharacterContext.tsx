// src/context/CharacterContext.tsx
import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';

// ---- 1. Define the possible characters ----
export type Character = 'mikasa' | 'pain' | 'levi';

// ---- 2. Define the shape of the context value ----
type CharacterContextValue = {
  character: Character;
  setCharacter: (c: Character) => void;
  // optional convenience helpers
  next: () => void;
  prev: () => void;
};

// ---- 3. Create the context (undefined default = forces hook to be used inside provider) ----
const CharacterContext = createContext<CharacterContextValue | undefined>(undefined);

// ---- 4. Provider component ----
export function CharacterProvider({
  children,
  initial = 'mikasa',
}: {
  children: ReactNode;
  initial?: Character;
}) {
  const [character, setCharacter] = useState<Character>(initial);

  const value = useMemo<CharacterContextValue>(() => {
    const order: Character[] = ['mikasa', 'pain', 'levi'];

    return {
      character,
      setCharacter,
      next: () => {
        const i = order.indexOf(character);
        setCharacter(order[(i + 1) % order.length]);
      },
      prev: () => {
        const i = order.indexOf(character);
        setCharacter(order[(i - 1 + order.length) % order.length]);
      },
    };
  }, [character]);

  return <CharacterContext.Provider value={value}>{children}</CharacterContext.Provider>;
}

// ---- 5. Custom hook ----
export function useCharacter() {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error('useCharacter must be used inside <CharacterProvider>');
  return ctx;
}