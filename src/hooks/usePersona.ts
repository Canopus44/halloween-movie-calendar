import { useCallback, useState } from 'react';
import { Persona } from '../types';
import { personaConfig } from '../config';

const STORAGE_KEY = 'hmc_persona';

export function usePersona() {
  const [persona, setPersonaState] = useState<Persona | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'p1' || raw === 'p2') return raw as Persona;
    return null;
  });

  const setPersona = useCallback((p: Persona | null) => {
    setPersonaState(p);
    if (p) {
      localStorage.setItem(STORAGE_KEY, p);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearPersona = useCallback(() => setPersona(null), [setPersona]);

  return { persona, setPersona, clearPersona, personaLabel: persona ? personaConfig(persona).display : null };
}
