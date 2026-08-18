/**
 * Fournit le client BLE (déjà connecté par `useBoardConnection`) aux écrans
 * qui doivent envoyer des commandes (`anchor_start`, `anchor_stop`, ...)
 * sans en créer une deuxième instance ni parler directement à `ble/`
 * transport depuis un composant (guidelines-de-developpement.md §3.3).
 * Les données lues restent exclusivement dans `deviceStore`.
 *
 * Monté à la racine (`app/_layout.tsx`) pour que la Carte, les Réglages et
 * l'écran de développement partagent la même connexion — et donc le même
 * boîtier simulé, dont le scénario est modifiable en direct via
 * `useBoardScenario` (outil de mise au point, pas une fonctionnalité du
 * cahier des charges).
 */
import { createContext, useContext, type ReactNode } from 'react';

import type { BleClient } from './client';
import type { ScenarioName } from './mock/scenarios';
import { useBoardConnection, type BoardConnection } from './useBoardConnection';

const BoardConnectionCtx = createContext<BoardConnection | null>(null);

export function BoardConnectionProvider({ children }: { children: ReactNode }) {
  const connection = useBoardConnection();
  return <BoardConnectionCtx.Provider value={connection}>{children}</BoardConnectionCtx.Provider>;
}

function useBoardConnectionCtx(): BoardConnection {
  const connection = useContext(BoardConnectionCtx);
  if (!connection) {
    throw new Error('useBoardClient/useBoardScenario must be used within a BoardConnectionProvider');
  }
  return connection;
}

/** Le client BLE, pour envoyer des commandes nommées (`ble/client.ts`). */
export function useBoardClient(): BleClient {
  return useBoardConnectionCtx().client;
}

/** Scénario courant du boîtier simulé et moyen de le changer — outil de mise au point (écran `/dev`). */
export function useBoardScenario(): { scenario: ScenarioName; setScenario: (scenario: ScenarioName) => void } {
  const { scenario, setScenario } = useBoardConnectionCtx();
  return { scenario, setScenario };
}
