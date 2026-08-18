/**
 * Boîtier simulé — architecture.md §10, plan-de-developpement.md étape 1.
 *
 * Implémente le contrat §5 « comme si » on parlait à un vrai BB : il reçoit
 * des lignes JSON (via `write`, comme la caractéristique RX), et envoie des
 * fragments (via `onData`, comme la caractéristique TX en notification) —
 * fragmentés à la taille d'un MTU BLE pour exercer réellement `framing.ts`.
 *
 * Permet de développer et démontrer l'app sans matériel, et de rejouer les
 * 9 scénarios listés dans `scenarios.ts`.
 */
import { offsetCoordinate, distanceM } from '@/src/domain/geo';
import type { ConnectionState, BleTransport } from '@/src/ble/transport';
import { FrameAssembler } from '@/src/ble/framing';
import {
  decodeCommand,
  encodeMessage,
  MAX_TOLERANCE_M,
  MIN_TOLERANCE_M,
  PROTOCOL_VERSION,
  type AnchorFix,
  type BatteryStatus,
  type BoardState,
  type BoatFix,
  type GsmStatus,
  type IncomingMessage,
  type OutgoingCommand,
  type RadioBand,
  type ReferenceFix,
} from '@/src/ble/protocol';
import { SCENARIOS, type ScenarioConfig, type ScenarioName } from './scenarios';

/** Simule un MTU BLE typique (bien inférieur à la taille max d'un message). */
const DEFAULT_CHUNK_SIZE = 20;

const HOME_COORDINATE = { lat: 43.123456, lon: 5.987654 };

interface BoardState_ {
  st: BoardState;
  tol: number;
  boatOffsetM: { north: number; east: number };
  turretOffsetM: { north: number; east: number };
  ref: ReferenceFix;
  out: number;
  bat: BatteryStatus;
  gsm: GsmStatus;
  vol: number;
  rf: RadioBand;
  tel1: string;
  tel2: string;
  simPin: string;
  ticksSinceLastEmit: number;
}

export interface SimulatedBoardOptions {
  scenario: ScenarioName;
  chunkSize?: number;
  /** Injectable pour des tests déterministes (défaut : Math.random). */
  random?: () => number;
}

function initialState(): BoardState_ {
  return {
    st: 'idle',
    tol: MIN_TOLERANCE_M,
    boatOffsetM: { north: 0, east: 0 },
    turretOffsetM: { north: 8, east: 3 },
    ref: { lat: 0, lon: 0, valid: false, ts: 0 },
    out: 0,
    bat: { bb: 82, bbc: false, tur: 57, turc: false },
    gsm: { reg: true, rssi: -75 },
    vol: 80,
    rf: 868,
    tel1: '',
    tel2: '',
    simPin: '',
    ticksSinceLastEmit: 0,
  };
}

/** Cadences imposées au firmware — architecture.md §5.4. */
const EMIT_EVERY_TICKS: Record<BoardState, number> = {
  idle: 10,
  anchored: 2,
  alarm: 1,
  test: 2,
};

export class SimulatedBoard implements BleTransport {
  private scenario: ScenarioName;
  private config: ScenarioConfig;
  private state: BoardState_ = initialState();
  private connectionState: ConnectionState = 'disconnected';
  private dataListeners = new Set<(chunk: string) => void>();
  private connectionListeners = new Set<(state: ConnectionState) => void>();
  private incomingAssembler = new FrameAssembler();
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly chunkSize: number;
  private readonly random: () => number;

  constructor(options: SimulatedBoardOptions) {
    this.scenario = options.scenario;
    this.config = SCENARIOS[options.scenario];
    this.chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    this.random = options.random ?? Math.random;
  }

  // -- BleTransport -----------------------------------------------------

  async connect(): Promise<void> {
    this.setConnectionState('connecting');
    this.setConnectionState('connected');
    this.startTicking();
  }

  async disconnect(): Promise<void> {
    this.stopTicking();
    this.setConnectionState('disconnected');
  }

  write(chunk: string): void {
    for (const line of this.incomingAssembler.push(chunk)) {
      this.handleIncomingLine(line);
    }
  }

  onData(callback: (chunk: string) => void): () => void {
    this.dataListeners.add(callback);
    return () => this.dataListeners.delete(callback);
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionListeners.add(callback);
    return () => this.connectionListeners.delete(callback);
  }

  // -- Contrôle du scénario (écran de développement) ---------------------

  setScenario(scenario: ScenarioName): void {
    this.scenario = scenario;
    this.config = SCENARIOS[scenario];
    this.state = initialState();
    this.emitStatus();
  }

  getScenario(): ScenarioName {
    return this.scenario;
  }

  /** Fait avancer la simulation d'un pas sans attendre le minuteur réel (tests). */
  advance(): void {
    this.runTickCycle();
  }

  /** Injecte une trame arbitraire (corrompue ou non) pour les tests de robustesse. */
  injectRawFrame(raw: string): void {
    this.emitLine(raw);
  }

  // -- Boucle de simulation ----------------------------------------------

  private startTicking(): void {
    this.stopTicking();
    this.emitStatus(); // état initial visible immédiatement
    this.timer = setInterval(() => this.runTickCycle(), 1000);
  }

  private stopTicking(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private runTickCycle(): void {
    const previousState = this.state.st;
    this.applyBatteryDrift();
    this.applyDragIfAnchored();
    this.applyTurretLostIfNeeded();

    this.state.ticksSinceLastEmit += 1;
    const stateChanged = this.state.st !== previousState;
    const emitDue = this.state.ticksSinceLastEmit >= EMIT_EVERY_TICKS[this.state.st];

    if (stateChanged || emitDue) {
      this.state.ticksSinceLastEmit = 0;
      this.emitStatus();
    }
  }

  private applyBatteryDrift(): void {
    const { bbDrainPctPerTick, turDrainPctPerTick, charging } = this.config;
    if (charging) {
      this.state.bat = {
        ...this.state.bat,
        bb: Math.min(100, this.state.bat.bb + 2),
        tur: Math.min(100, this.state.bat.tur + 2),
        bbc: true,
        turc: true,
      };
      return;
    }
    if (bbDrainPctPerTick) {
      this.state.bat = { ...this.state.bat, bb: Math.max(0, this.state.bat.bb - bbDrainPctPerTick) };
    }
    if (turDrainPctPerTick) {
      this.state.bat = { ...this.state.bat, tur: Math.max(0, this.state.bat.tur - turDrainPctPerTick) };
    }
  }

  private applyDragIfAnchored(): void {
    if (!this.config.drag || this.state.st !== 'anchored') return;

    // La tourelle s'éloigne d'environ 1 m par tick vers le large.
    this.state.turretOffsetM = {
      north: this.state.turretOffsetM.north + 1,
      east: this.state.turretOffsetM.east,
    };

    const drift = roundMeters(distanceM(this.turretPosition(), this.referencePosition()));
    if (drift > this.state.tol) {
      this.state.out = Math.min(5, this.state.out + 1);
    } else {
      this.state.out = 0;
    }

    if (this.state.out >= 5) {
      this.state.st = 'alarm';
      this.emitLineFor({
        evt: 'alarm',
        reason: 'drag',
        drift,
        out: this.state.out,
        ts: Math.floor(Date.now() / 1000),
      });
    }
  }

  private applyTurretLostIfNeeded(): void {
    if (!this.config.turretLost) return;
    // Rien à faire : `anc.valid=false` est calculé directement dans buildStatusEvent.
  }

  private boatPosition() {
    return roundCoordinate(
      offsetCoordinate(HOME_COORDINATE, this.state.boatOffsetM.north, this.state.boatOffsetM.east)
    );
  }

  private turretPosition() {
    return roundCoordinate(
      offsetCoordinate(HOME_COORDINATE, this.state.turretOffsetM.north, this.state.turretOffsetM.east)
    );
  }

  private referencePosition() {
    return this.state.ref.valid ? { lat: this.state.ref.lat, lon: this.state.ref.lon } : this.turretPosition();
  }

  private buildBoatFix(): BoatFix {
    const position = this.boatPosition();
    return {
      lat: position.lat,
      lon: position.lon,
      fix: this.config.noFix ? 0 : 3,
      sat: this.config.noFix ? 0 : 9,
      acc: this.config.noFix ? 50 : 2.5,
      age: 1,
    };
  }

  private buildAnchorFix(): AnchorFix {
    if (this.config.turretLost) {
      return { lat: 0, lon: 0, valid: false, age: 999 };
    }
    const position = this.turretPosition();
    return { lat: position.lat, lon: position.lon, valid: true, age: 3 };
  }

  private emitStatus(): void {
    const boat = this.buildBoatFix();
    const anc = this.buildAnchorFix();
    const drift = this.state.ref.valid
      ? roundMeters(distanceM(this.turretPosition(), this.referencePosition()))
      : 0;
    const dist = roundMeters(distanceM(this.boatPosition(), this.turretPosition()));

    this.emitLineFor({
      evt: 'status',
      st: this.state.st,
      tol: this.state.tol,
      boat,
      anc,
      ref: this.state.ref,
      drift,
      dist,
      out: this.state.out,
      bat: this.state.bat,
      gsm: this.state.gsm,
      vol: this.state.vol,
      rf: this.state.rf,
    });
  }

  private handleIncomingLine(line: string): void {
    const decoded = decodeCommand(line);
    if (!decoded.ok) {
      // Une vraie carte ignorerait aussi une commande illisible ; rien à répondre.
      return;
    }
    this.handleCommand(decoded.value);
  }

  private handleCommand(command: OutgoingCommand): void {
    switch (command.cmd) {
      case 'hello': {
        const proto = this.config.helloProtoMismatch ? PROTOCOL_VERSION + 1 : PROTOCOL_VERSION;
        this.emitLineFor({ id: command.id, ok: true, proto, fw: '7.1.3', dev: 'MORPHE-1A2B' });
        return;
      }
      case 'get_settings': {
        this.emitLineFor({
          evt: 'settings',
          tel1: this.state.tel1,
          tel2: this.state.tel2,
          sim_pin: this.state.simPin,
          rf: this.state.rf,
          vol: this.state.vol,
        });
        return;
      }
      case 'set_settings': {
        if (command.tel1 !== undefined) this.state.tel1 = command.tel1;
        if (command.tel2 !== undefined) this.state.tel2 = command.tel2;
        if (command.sim_pin !== undefined) this.state.simPin = command.sim_pin;
        if (command.rf !== undefined) this.state.rf = command.rf;
        if (command.vol !== undefined) this.state.vol = command.vol;
        this.emitLineFor({ id: command.id, ok: true });
        return;
      }
      case 'anchor_start': {
        if (this.config.noFix) {
          this.emitLineFor({ id: command.id, ok: false, err: 'ERR_NO_FIX' });
          return;
        }
        if (this.config.turretLost) {
          this.emitLineFor({ id: command.id, ok: false, err: 'ERR_NO_TURRET' });
          return;
        }
        const turret = this.turretPosition();
        this.state.tol = command.tol;
        this.state.ref = { lat: turret.lat, lon: turret.lon, valid: true, ts: Math.floor(Date.now() / 1000) };
        this.state.st = 'anchored';
        this.state.out = 0;
        this.emitLineFor({ id: command.id, ok: true });
        this.emitStatus();
        return;
      }
      case 'anchor_stop': {
        this.state.st = 'idle';
        this.state.ref = { lat: 0, lon: 0, valid: false, ts: 0 };
        this.state.out = 0;
        this.emitLineFor({ id: command.id, ok: true });
        this.emitStatus();
        return;
      }
      case 'set_tol': {
        this.state.tol = clampTolerance(command.tol);
        this.emitLineFor({ id: command.id, ok: true });
        return;
      }
      case 'alarm_ack': {
        if (this.state.st === 'alarm') {
          this.state.st = 'anchored';
          this.state.out = 0;
          this.emitLineFor({ evt: 'alarm_clear', by: 'app' });
        }
        this.emitLineFor({ id: command.id, ok: true });
        this.emitStatus();
        return;
      }
      case 'test_sms': {
        this.emitLineFor({ id: command.id, ok: true });
        this.emitLineFor(
          this.state.gsm.reg
            ? { evt: 'sms_result', ok: true }
            : { evt: 'sms_result', ok: false, err: 'ERR_GSM' }
        );
        return;
      }
      case 'test_alarm': {
        this.state.st = command.on ? 'test' : 'idle';
        this.emitLineFor({ id: command.id, ok: true });
        this.emitStatus();
        return;
      }
    }
  }

  private emitLineFor(message: IncomingMessage): void {
    this.emitLine(encodeMessage(message));
  }

  private emitLine(line: string): void {
    if (this.config.unstableLink && this.random() < 0.3) {
      // Paquet perdu : rien n'est envoyé cette fois (liaison faible).
      return;
    }

    const payload = this.config.unstableLink && this.random() < 0.2 ? corrupt(line, this.random) : line;

    for (let i = 0; i < payload.length; i += this.chunkSize) {
      const chunk = payload.slice(i, i + this.chunkSize);
      for (const listener of this.dataListeners) listener(chunk);
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    for (const listener of this.connectionListeners) listener(state);
  }
}

// 6 décimales ≈ 11 cm de précision, largement suffisant pour un GPS civil
// (architecture.md §9.4 : pas de fausse précision) et indispensable pour
// rester sous la limite de 180 octets par trame (§5.2).
function roundCoordinate<T extends { lat: number; lon: number }>(coordinate: T): T {
  return { ...coordinate, lat: roundTo(coordinate.lat, 6), lon: roundTo(coordinate.lon, 6) };
}

function roundMeters(valueM: number): number {
  return roundTo(valueM, 2);
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function clampTolerance(tol: number): number {
  return Math.min(MAX_TOLERANCE_M, Math.max(MIN_TOLERANCE_M, tol));
}

/** Corrompt une ligne pour tester la robustesse du décodeur côté app. */
function corrupt(line: string, random: () => number): string {
  const withoutNewline = line.endsWith('\n') ? line.slice(0, -1) : line;
  const cutAt = Math.max(1, Math.floor(withoutNewline.length * random()));
  return `${withoutNewline.slice(0, cutAt)}\n`;
}
