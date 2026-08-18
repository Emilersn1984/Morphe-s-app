/**
 * Couche basse : ce que `client.ts` attend d'un transport, qu'il soit réel
 * (BLE, étape 7) ou simulé (`mock/simulatedBoard.ts`, étape 1).
 * architecture.md §3 et §5.1 (service Nordic UART : une caractéristique RX
 * en écriture, une caractéristique TX en notification).
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface BleTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Envoie une ligne déjà encodée (JSON + "\n") vers le boîtier. */
  write(line: string): void;
  /** Fragments reçus du boîtier (équivalent des notifications BLE, ≤ MTU). */
  onData(callback: (chunk: string) => void): () => void;
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void;
}
