/**
 * État du boîtier — architecture.md §3. Seul point de lecture pour les
 * écrans (guidelines-de-developpement.md §3.3) : aucun écran ne parle
 * directement à `ble/`, tout passe par ce magasin, rempli par
 * `src/ble/useBoardConnection.ts`.
 */
import { create } from 'zustand';

import type { AlarmEvent, StatusEvent } from '@/src/ble/protocol';
import type { ConnectionState } from '@/src/ble/transport';

interface DeviceStoreState {
  connectionState: ConnectionState;
  /** Dernier état connu du BB, conservé même après une coupure (F-05). */
  status: StatusEvent | null;
  /** Horodatage (ms, Date.now()) de la dernière trame `status` reçue. */
  statusReceivedAt: number | null;
  /** Dernière alarme reçue, tant qu'elle n'a pas été acquittée (F-36). */
  activeAlarm: AlarmEvent | null;

  setConnectionState: (state: ConnectionState) => void;
  setStatus: (status: StatusEvent) => void;
  setActiveAlarm: (alarm: AlarmEvent | null) => void;
}

export const useDeviceStore = create<DeviceStoreState>((set) => ({
  connectionState: 'disconnected',
  status: null,
  statusReceivedAt: null,
  activeAlarm: null,

  setConnectionState: (state) => set({ connectionState: state }),
  setStatus: (status) => set({ status, statusReceivedAt: Date.now() }),
  setActiveAlarm: (activeAlarm) => set({ activeAlarm }),
}));
