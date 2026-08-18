/**
 * API métier au-dessus du transport — architecture.md §3 et §5.7.
 *
 * Câble `transport` → `framing` → `protocol`, gère le délai d'attente des
 * réponses (5 s), les 2 tentatives de renvoi avec le même `id` (idempotence),
 * et expose des méthodes nommées plutôt que des trames JSON brutes aux écrans
 * (`ui/` ne parle jamais directement à `ble/`, guidelines-de-developpement.md §3.3).
 */
import { FrameAssembler } from './framing';
import {
  decodeIncoming,
  encodeCommand,
  type BoardEvent,
  type CommandResponse,
  type ErrorCode,
  type IncomingMessage,
  type OutgoingCommand,
  type RadioBand,
} from './protocol';
import type { BleTransport, ConnectionState } from './transport';

/** Délai d'attente d'une réponse et nombre de tentatives — architecture.md §5.7. */
const RESPONSE_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3; // 1 envoi + 2 tentatives

export class CommandTimeoutError extends Error {
  constructor(command: OutgoingCommand) {
    super(`No response from board for command "${command.cmd}" (id=${command.id})`);
  }
}

export class CommandRejectedError extends Error {
  constructor(public readonly err: ErrorCode) {
    super(`Board rejected command: ${err}`);
  }
}

type PendingRequest = {
  resolve: (response: CommandResponse) => void;
  reject: (error: Error) => void;
};

export class BleClient {
  private readonly transport: BleTransport;
  private readonly assembler = new FrameAssembler();
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private readonly eventListeners = new Set<(event: BoardEvent) => void>();
  private readonly invalidFrameListeners = new Set<(reason: string, raw: string) => void>();
  private unsubscribeData: (() => void) | null = null;

  constructor(transport: BleTransport) {
    this.transport = transport;
  }

  async connect(): Promise<void> {
    this.assembler.reset();
    this.unsubscribeData = this.transport.onData((chunk) => this.handleChunk(chunk));
    await this.transport.connect();
  }

  async disconnect(): Promise<void> {
    this.unsubscribeData?.();
    this.unsubscribeData = null;
    await this.transport.disconnect();
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    return this.transport.onConnectionStateChange(callback);
  }

  /** Événements spontanés du BB (status, alarm, ...) — jamais les réponses de commande. */
  onEvent(callback: (event: BoardEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /** Trames reçues mais invalides : ignorées pour l'état, journalisées ici. */
  onInvalidFrame(callback: (reason: string, raw: string) => void): () => void {
    this.invalidFrameListeners.add(callback);
    return () => this.invalidFrameListeners.delete(callback);
  }

  // -- Commandes nommées (architecture.md §5.3) ---------------------------

  hello(proto: number) {
    return this.send({ id: this.allocateId(), cmd: 'hello', proto });
  }

  getSettings() {
    return this.send({ id: this.allocateId(), cmd: 'get_settings' });
  }

  setSettings(settings: { tel1?: string; tel2?: string; sim_pin?: string; rf?: RadioBand; vol?: number }) {
    return this.send({ id: this.allocateId(), cmd: 'set_settings', ...settings });
  }

  startAnchor(toleranceM: number) {
    return this.send({ id: this.allocateId(), cmd: 'anchor_start', tol: toleranceM });
  }

  stopAnchor() {
    return this.send({ id: this.allocateId(), cmd: 'anchor_stop' });
  }

  setTolerance(toleranceM: number) {
    return this.send({ id: this.allocateId(), cmd: 'set_tol', tol: toleranceM });
  }

  ackAlarm() {
    return this.send({ id: this.allocateId(), cmd: 'alarm_ack' });
  }

  testSms() {
    return this.send({ id: this.allocateId(), cmd: 'test_sms' });
  }

  testAlarm(on: boolean) {
    return this.send({ id: this.allocateId(), cmd: 'test_alarm', on });
  }

  // -- Interne -------------------------------------------------------------

  private allocateId(): number {
    const id = this.nextId;
    this.nextId += 1;
    return id;
  }

  /**
   * Envoie une commande et attend sa réponse (même `id`). Renvoie la même
   * commande (même `id`) jusqu'à `MAX_ATTEMPTS` fois si aucune réponse
   * n'arrive : le BB doit être idempotent (architecture.md §5.7).
   */
  private send(command: OutgoingCommand): Promise<CommandResponse> {
    return new Promise((resolve, reject) => {
      this.pending.set(command.id, { resolve, reject });

      let attempt = 0;
      const trySend = () => {
        attempt += 1;
        this.transport.write(encodeCommand(command));

        const timer = setTimeout(() => {
          if (!this.pending.has(command.id)) return; // déjà résolue
          if (attempt < MAX_ATTEMPTS) {
            trySend();
          } else {
            this.pending.delete(command.id);
            reject(new CommandTimeoutError(command));
          }
        }, RESPONSE_TIMEOUT_MS);

        const existing = this.pending.get(command.id);
        if (existing) {
          this.pending.set(command.id, {
            resolve: (response) => {
              clearTimeout(timer);
              resolve(response);
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
          });
        }
      };

      trySend();
    });
  }

  private handleChunk(chunk: string): void {
    for (const line of this.assembler.push(chunk)) {
      this.handleLine(line);
    }
  }

  private handleLine(line: string): void {
    const decoded = decodeIncoming(line);
    if (!decoded.ok) {
      for (const listener of this.invalidFrameListeners) listener(decoded.reason, line);
      return;
    }
    this.dispatch(decoded.value);
  }

  private dispatch(message: IncomingMessage): void {
    if ('evt' in message) {
      for (const listener of this.eventListeners) listener(message);
      return;
    }

    const pendingRequest = this.pending.get(message.id);
    if (!pendingRequest) return; // réponse tardive à une commande déjà abandonnée
    this.pending.delete(message.id);

    if (message.ok) {
      pendingRequest.resolve(message);
    } else {
      pendingRequest.reject(new CommandRejectedError(message.err));
    }
  }
}
