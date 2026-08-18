/**
 * État local de l'acquittement de l'alarme — cahier-des-charges.md F-34 à
 * F-36. Distinct de `deviceStore.activeAlarm` (ce que le BB signale) : ce
 * magasin retient jusqu'à quel `ts` l'utilisateur a acquitté, pour que le
 * popup/bandeau survive à une coupure BLE (F-36) et que tout nouveau
 * déclenchement (même `reason`, `ts` différent) redevienne visible (F-35).
 */
import { create } from 'zustand';

interface AlarmStoreState {
  /** `ts` de la dernière alarme acquittée par l'utilisateur, ou `null`. */
  acknowledgedTs: number | null;
  acknowledge: (ts: number) => void;
}

export const useAlarmStore = create<AlarmStoreState>((set) => ({
  acknowledgedTs: null,
  acknowledge: (ts) => set({ acknowledgedTs: ts }),
}));
