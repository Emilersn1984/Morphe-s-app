/**
 * Préférences de l'app, distinctes des réglages du BB — architecture.md §3.
 * Pour l'instant : seule la dernière tolérance choisie (F-19, « la valeur
 * proposée est celle du dernier mouillage »). La persistance disque
 * (AsyncStorage) sera ajoutée à l'étape 6 avec le reste des réglages ; en
 * attendant, la valeur survit au moins le temps de la session.
 */
import { create } from 'zustand';

import { DEFAULT_TOLERANCE_M } from '@/src/domain/anchorCommand';

interface SettingsStoreState {
  lastToleranceM: number;
  setLastToleranceM: (toleranceM: number) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  lastToleranceM: DEFAULT_TOLERANCE_M,
  setLastToleranceM: (toleranceM) => set({ lastToleranceM: toleranceM }),
}));
