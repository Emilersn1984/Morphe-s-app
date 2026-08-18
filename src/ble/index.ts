/**
 * Sélection client réel / simulé — architecture.md §3.
 * Le vrai transport BLE (`react-native-ble-plx`) arrive à l'étape 7 ; en
 * attendant, seul le mode simulé est disponible.
 */
import { BleClient } from './client';
import { SimulatedBoard, type SimulatedBoardOptions } from './mock/simulatedBoard';

export { BleClient } from './client';
export { SimulatedBoard } from './mock/simulatedBoard';
export { SCENARIO_NAMES, type ScenarioName } from './mock/scenarios';
export * from './protocol';

export function createSimulatedClient(options: SimulatedBoardOptions): BleClient {
  return new BleClient(new SimulatedBoard(options));
}
