/**
 * Cycle de vie de la connexion au BB — architecture.md §3.
 * Le vrai transport BLE arrive à l'étape 7 ; en attendant, le boîtier
 * simulé (mode démonstration, cahier-des-charges.md F-70/F-71) est la seule
 * source disponible. Ce hook est monté une fois (layout racine) et
 * alimente `deviceStore`, seul point de lecture pour les écrans.
 *
 * Le scénario du boîtier simulé est modifiable en direct (`setScenario`),
 * exposé via `BoardConnectionContext` pour l'écran de développement — la
 * même connexion est ainsi utilisée par la Carte et par `/dev`, plutôt que
 * deux boîtiers simulés indépendants qui ne se voient pas.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { BleClient } from '@/src/ble/client';
import { SimulatedBoard } from '@/src/ble/mock/simulatedBoard';
import type { ScenarioName } from '@/src/ble/mock/scenarios';
import { useDeviceStore } from '@/src/store/deviceStore';

/** Scénario de démonstration par défaut de l'app (hors écran de développement). */
const DEMO_SCENARIO: ScenarioName = 'nominal';

export interface BoardConnection {
  client: BleClient;
  scenario: ScenarioName;
  setScenario: (scenario: ScenarioName) => void;
}

export function useBoardConnection(): BoardConnection {
  const setConnectionState = useDeviceStore((s) => s.setConnectionState);
  const setStatus = useDeviceStore((s) => s.setStatus);
  const setActiveAlarm = useDeviceStore((s) => s.setActiveAlarm);

  const [scenario, setScenarioState] = useState<ScenarioName>(DEMO_SCENARIO);
  // Le boîtier simulé est créé une seule fois : changer de scénario modifie
  // son état interne (`board.setScenario`) sans reconnecter ni perdre les
  // abonnements ci-dessous.
  const board = useMemo(() => new SimulatedBoard({ scenario: DEMO_SCENARIO }), []);
  const client = useMemo(() => new BleClient(board), [board]);

  useEffect(() => {
    const unsubscribeConnection = client.onConnectionStateChange(setConnectionState);
    const unsubscribeEvents = client.onEvent((event) => {
      switch (event.evt) {
        case 'status':
          setStatus(event);
          break;
        case 'alarm':
          // F-36 : l'alarme reste affichée jusqu'à acquittement explicite.
          setActiveAlarm(event);
          break;
        case 'alarm_clear':
          setActiveAlarm(null);
          break;
        default:
          break;
      }
    });

    void client.connect();

    return () => {
      unsubscribeConnection();
      unsubscribeEvents();
      void client.disconnect();
    };
  }, [client, setConnectionState, setStatus, setActiveAlarm]);

  const setScenario = useCallback(
    (next: ScenarioName) => {
      board.setScenario(next);
      setScenarioState(next);
    },
    [board]
  );

  return { client, scenario, setScenario };
}
