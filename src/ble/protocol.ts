/**
 * Contrat d'échange BLE — architecture.md §5.
 *
 * ⚠️ Document contractuel : toute modification doit être répercutée ici,
 * versionnée via PROTOCOL_VERSION, et validée avec l'électronicien
 * (guidelines-de-developpement.md §1.6). Aucun code ne s'appuie sur un
 * comportement non écrit dans architecture.md §5.
 *
 * Toute donnée venant du boîtier est validée (type + bornes) avant usage :
 * une trame invalide est ignorée et journalisée, jamais propagée
 * (guidelines-de-developpement.md §3.1).
 */

/** Version de protocole actuellement supportée par l'app (architecture.md §5.7). */
export const PROTOCOL_VERSION = 1;

/** Taille maximale d'un message, contrat §5.2. */
export const MAX_MESSAGE_BYTES = 400;

export const RADIO_BANDS = [868, 915] as const;
export type RadioBand = (typeof RADIO_BANDS)[number];

export const MIN_TOLERANCE_M = 5;
export const MAX_TOLERANCE_M = 25;

export const ERROR_CODES = [
  'ERR_PIN',
  'ERR_NO_FIX',
  'ERR_NO_TURRET',
  'ERR_BUSY',
  'ERR_RANGE',
  'ERR_GSM',
  'ERR_SIM',
  'ERR_UNKNOWN',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const BOARD_STATES = ['idle', 'anchored', 'alarm', 'test'] as const;
export type BoardState = (typeof BOARD_STATES)[number];

export const ALARM_REASONS = ['drag', 'turret_lost', 'low_bat'] as const;
export type AlarmReason = (typeof ALARM_REASONS)[number];

export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

// ---------------------------------------------------------------------------
// Commandes app → BB (architecture.md §5.3)
// ---------------------------------------------------------------------------

export interface HelloCommand {
  id: number;
  cmd: 'hello';
  proto: number;
}

export interface GetSettingsCommand {
  id: number;
  cmd: 'get_settings';
}

export interface SetSettingsCommand {
  id: number;
  cmd: 'set_settings';
  tel1?: string;
  tel2?: string;
  sim_pin?: string;
  rf?: RadioBand;
  vol?: number;
}

export interface AnchorStartCommand {
  id: number;
  cmd: 'anchor_start';
  tol: number;
}

export interface AnchorStopCommand {
  id: number;
  cmd: 'anchor_stop';
}

export interface SetTolCommand {
  id: number;
  cmd: 'set_tol';
  tol: number;
}

export interface AlarmAckCommand {
  id: number;
  cmd: 'alarm_ack';
}

export interface TestSmsCommand {
  id: number;
  cmd: 'test_sms';
}

export interface TestAlarmCommand {
  id: number;
  cmd: 'test_alarm';
  on: boolean;
}

export type OutgoingCommand =
  | HelloCommand
  | GetSettingsCommand
  | SetSettingsCommand
  | AnchorStartCommand
  | AnchorStopCommand
  | SetTolCommand
  | AlarmAckCommand
  | TestSmsCommand
  | TestAlarmCommand;

// ---------------------------------------------------------------------------
// Réponses BB → app aux commandes (même `id`, architecture.md §5.3)
// ---------------------------------------------------------------------------

export interface OkResponse {
  id: number;
  ok: true;
}

export interface HelloResponse {
  id: number;
  ok: true;
  proto: number;
  fw: string;
  dev: string;
}

export interface ErrResponse {
  id: number;
  ok: false;
  err: ErrorCode;
}

export type CommandResponse = OkResponse | HelloResponse | ErrResponse;

// ---------------------------------------------------------------------------
// Notifications spontanées BB → app (architecture.md §5.4 et §5.5)
// ---------------------------------------------------------------------------

export interface BoatFix {
  lat: number;
  lon: number;
  fix: 0 | 2 | 3;
  sat: number;
  acc: number;
  age: number;
}

export interface AnchorFix {
  lat: number;
  lon: number;
  valid: boolean;
  age: number;
}

export interface ReferenceFix {
  lat: number;
  lon: number;
  valid: boolean;
  ts: number;
}

export interface BatteryStatus {
  bb: number;
  bbc: boolean;
  tur: number;
  turc?: boolean;
}

export interface GsmStatus {
  reg: boolean;
  rssi: number;
}

export interface StatusEvent {
  evt: 'status';
  st: BoardState;
  tol: number;
  boat: BoatFix;
  anc: AnchorFix;
  ref: ReferenceFix;
  drift: number;
  dist: number;
  out: number;
  bat: BatteryStatus;
  gsm: GsmStatus;
  vol: number;
  rf: RadioBand;
}

export interface AlarmEvent {
  evt: 'alarm';
  reason: AlarmReason;
  drift: number;
  out: number;
  ts: number;
}

export interface AlarmClearEvent {
  evt: 'alarm_clear';
  by: string;
}

export interface SettingsEvent {
  evt: 'settings';
  tel1: string;
  tel2: string;
  sim_pin: string;
  rf: RadioBand;
  vol: number;
}

export interface SmsResultEvent {
  evt: 'sms_result';
  ok: boolean;
  err?: ErrorCode;
}

export interface LogEvent {
  evt: 'log';
  lvl: LogLevel;
  msg: string;
}

export type BoardEvent =
  | StatusEvent
  | AlarmEvent
  | AlarmClearEvent
  | SettingsEvent
  | SmsResultEvent
  | LogEvent;

/** Tout ce que l'app peut recevoir du BB : un événement spontané ou une réponse de commande. */
export type IncomingMessage = BoardEvent | CommandResponse;

// ---------------------------------------------------------------------------
// Encodage / décodage
// ---------------------------------------------------------------------------

export type DecodeResult<T> = { ok: true; value: T } | { ok: false; reason: string };

/** ASCII imprimable uniquement — architecture.md §5.2. */
const PRINTABLE_ASCII_RE = /^[\x20-\x7E]*$/;

function byteLengthAscii(text: string): number {
  // Le contrat impose de l'ASCII imprimable : 1 caractère = 1 octet.
  return text.length;
}

function encodeLine(payload: unknown): string {
  const json = JSON.stringify(payload);
  const line = `${json}\n`;
  if (byteLengthAscii(json) > MAX_MESSAGE_BYTES) {
    throw new Error(`Message too large: ${byteLengthAscii(json)} bytes > ${MAX_MESSAGE_BYTES}`);
  }
  return line;
}

export function encodeCommand(command: OutgoingCommand): string {
  return encodeLine(command);
}

export function encodeMessage(message: IncomingMessage): string {
  return encodeLine(message);
}

function parseLine(rawLine: string): DecodeResult<Record<string, unknown>> {
  const line = rawLine.endsWith('\n') ? rawLine.slice(0, -1) : rawLine;

  if (line.length === 0) {
    return { ok: false, reason: 'EMPTY_LINE' };
  }
  if (!PRINTABLE_ASCII_RE.test(line)) {
    return { ok: false, reason: 'NON_ASCII' };
  }
  if (byteLengthAscii(line) > MAX_MESSAGE_BYTES) {
    return { ok: false, reason: 'TOO_LARGE' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { ok: false, reason: 'INVALID_JSON' };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'NOT_AN_OBJECT' };
  }

  return { ok: true, value: parsed as Record<string, unknown> };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= min && value <= max;
}

function isLat(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -90 && value <= 90;
}

function isLon(value: unknown): value is number {
  return isFiniteNumber(value) && value >= -180 && value <= 180;
}

function isRadioBand(value: unknown): value is RadioBand {
  return RADIO_BANDS.includes(value as RadioBand);
}

function isErrorCode(value: unknown): value is ErrorCode {
  return ERROR_CODES.includes(value as ErrorCode);
}

function isBatteryPct(value: unknown): value is number {
  return isIntInRange(value, 0, 100);
}

function validateBoatFix(value: unknown): value is BoatFix {
  if (typeof value !== 'object' || value === null) return false;
  const boat = value as Record<string, unknown>;
  return (
    isLat(boat.lat) &&
    isLon(boat.lon) &&
    (boat.fix === 0 || boat.fix === 2 || boat.fix === 3) &&
    isFiniteNumber(boat.sat) &&
    boat.sat >= 0 &&
    isFiniteNumber(boat.acc) &&
    boat.acc >= 0 &&
    isFiniteNumber(boat.age) &&
    boat.age >= 0
  );
}

function validateAnchorFix(value: unknown): value is AnchorFix {
  if (typeof value !== 'object' || value === null) return false;
  const anc = value as Record<string, unknown>;
  return (
    isLat(anc.lat) &&
    isLon(anc.lon) &&
    typeof anc.valid === 'boolean' &&
    isFiniteNumber(anc.age) &&
    anc.age >= 0
  );
}

function validateReferenceFix(value: unknown): value is ReferenceFix {
  if (typeof value !== 'object' || value === null) return false;
  const ref = value as Record<string, unknown>;
  return (
    isLat(ref.lat) &&
    isLon(ref.lon) &&
    typeof ref.valid === 'boolean' &&
    isFiniteNumber(ref.ts) &&
    ref.ts >= 0
  );
}

function validateBatteryStatus(value: unknown): value is BatteryStatus {
  if (typeof value !== 'object' || value === null) return false;
  const bat = value as Record<string, unknown>;
  if (!isBatteryPct(bat.bb) || typeof bat.bbc !== 'boolean' || !isBatteryPct(bat.tur)) {
    return false;
  }
  // `turc` est facultatif (architecture.md §5.4) : absent → pas d'éclair côté ancre.
  return bat.turc === undefined || typeof bat.turc === 'boolean';
}

function validateGsmStatus(value: unknown): value is GsmStatus {
  if (typeof value !== 'object' || value === null) return false;
  const gsm = value as Record<string, unknown>;
  return typeof gsm.reg === 'boolean' && isFiniteNumber(gsm.rssi);
}

function validateStatusEvent(msg: Record<string, unknown>): DecodeResult<StatusEvent> {
  if (!BOARD_STATES.includes(msg.st as BoardState)) {
    return { ok: false, reason: 'VALIDATION_FAILED:st' };
  }
  if (!isIntInRange(msg.tol, MIN_TOLERANCE_M, MAX_TOLERANCE_M)) {
    return { ok: false, reason: 'VALIDATION_FAILED:tol' };
  }
  if (!validateBoatFix(msg.boat)) {
    return { ok: false, reason: 'VALIDATION_FAILED:boat' };
  }
  if (!validateAnchorFix(msg.anc)) {
    return { ok: false, reason: 'VALIDATION_FAILED:anc' };
  }
  if (!validateReferenceFix(msg.ref)) {
    return { ok: false, reason: 'VALIDATION_FAILED:ref' };
  }
  if (!isFiniteNumber(msg.drift) || msg.drift < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:drift' };
  }
  if (!isFiniteNumber(msg.dist) || msg.dist < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:dist' };
  }
  if (!isIntInRange(msg.out, 0, 5)) {
    return { ok: false, reason: 'VALIDATION_FAILED:out' };
  }
  if (!validateBatteryStatus(msg.bat)) {
    return { ok: false, reason: 'VALIDATION_FAILED:bat' };
  }
  if (!validateGsmStatus(msg.gsm)) {
    return { ok: false, reason: 'VALIDATION_FAILED:gsm' };
  }
  if (!isIntInRange(msg.vol, 0, 100)) {
    return { ok: false, reason: 'VALIDATION_FAILED:vol' };
  }
  if (!isRadioBand(msg.rf)) {
    return { ok: false, reason: 'VALIDATION_FAILED:rf' };
  }

  return {
    ok: true,
    value: {
      evt: 'status',
      st: msg.st as BoardState,
      tol: msg.tol as number,
      boat: msg.boat as BoatFix,
      anc: msg.anc as AnchorFix,
      ref: msg.ref as ReferenceFix,
      drift: msg.drift as number,
      dist: msg.dist as number,
      out: msg.out as number,
      bat: msg.bat as BatteryStatus,
      gsm: msg.gsm as GsmStatus,
      vol: msg.vol as number,
      rf: msg.rf as RadioBand,
    },
  };
}

function validateAlarmEvent(msg: Record<string, unknown>): DecodeResult<AlarmEvent> {
  if (!ALARM_REASONS.includes(msg.reason as AlarmReason)) {
    return { ok: false, reason: 'VALIDATION_FAILED:reason' };
  }
  if (!isFiniteNumber(msg.drift) || msg.drift < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:drift' };
  }
  if (!isIntInRange(msg.out, 0, 5)) {
    return { ok: false, reason: 'VALIDATION_FAILED:out' };
  }
  if (!isFiniteNumber(msg.ts) || msg.ts < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:ts' };
  }
  return {
    ok: true,
    value: {
      evt: 'alarm',
      reason: msg.reason as AlarmReason,
      drift: msg.drift as number,
      out: msg.out as number,
      ts: msg.ts as number,
    },
  };
}

function validateAlarmClearEvent(msg: Record<string, unknown>): DecodeResult<AlarmClearEvent> {
  if (typeof msg.by !== 'string' || msg.by.length === 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:by' };
  }
  return { ok: true, value: { evt: 'alarm_clear', by: msg.by } };
}

function isPhoneNumberOrEmpty(value: unknown): value is string {
  return typeof value === 'string' && (value === '' || /^\+\d{8,15}$/.test(value));
}

function validateSettingsEvent(msg: Record<string, unknown>): DecodeResult<SettingsEvent> {
  if (!isPhoneNumberOrEmpty(msg.tel1) || !isPhoneNumberOrEmpty(msg.tel2)) {
    return { ok: false, reason: 'VALIDATION_FAILED:tel' };
  }
  if (typeof msg.sim_pin !== 'string' || !/^\d{4}$/.test(msg.sim_pin)) {
    return { ok: false, reason: 'VALIDATION_FAILED:sim_pin' };
  }
  if (!isRadioBand(msg.rf)) {
    return { ok: false, reason: 'VALIDATION_FAILED:rf' };
  }
  if (!isIntInRange(msg.vol, 0, 100)) {
    return { ok: false, reason: 'VALIDATION_FAILED:vol' };
  }
  return {
    ok: true,
    value: {
      evt: 'settings',
      tel1: msg.tel1 as string,
      tel2: msg.tel2 as string,
      sim_pin: msg.sim_pin as string,
      rf: msg.rf as RadioBand,
      vol: msg.vol as number,
    },
  };
}

function validateSmsResultEvent(msg: Record<string, unknown>): DecodeResult<SmsResultEvent> {
  if (typeof msg.ok !== 'boolean') {
    return { ok: false, reason: 'VALIDATION_FAILED:ok' };
  }
  if (msg.err !== undefined && !isErrorCode(msg.err)) {
    return { ok: false, reason: 'VALIDATION_FAILED:err' };
  }
  return {
    ok: true,
    value: { evt: 'sms_result', ok: msg.ok, ...(msg.err !== undefined ? { err: msg.err as ErrorCode } : {}) },
  };
}

function validateLogEvent(msg: Record<string, unknown>): DecodeResult<LogEvent> {
  if (!LOG_LEVELS.includes(msg.lvl as LogLevel)) {
    return { ok: false, reason: 'VALIDATION_FAILED:lvl' };
  }
  if (typeof msg.msg !== 'string') {
    return { ok: false, reason: 'VALIDATION_FAILED:msg' };
  }
  return { ok: true, value: { evt: 'log', lvl: msg.lvl as LogLevel, msg: msg.msg } };
}

function validateCommandResponse(msg: Record<string, unknown>): DecodeResult<CommandResponse> {
  if (!isFiniteNumber(msg.id) || msg.id < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:id' };
  }
  if (msg.ok === true) {
    // `hello` renvoie proto/fw/dev en plus ; les autres commandes n'ont que id+ok.
    if (msg.proto !== undefined || msg.fw !== undefined || msg.dev !== undefined) {
      if (!isFiniteNumber(msg.proto) || typeof msg.fw !== 'string' || typeof msg.dev !== 'string') {
        return { ok: false, reason: 'VALIDATION_FAILED:hello' };
      }
      return {
        ok: true,
        value: { id: msg.id, ok: true, proto: msg.proto, fw: msg.fw, dev: msg.dev },
      };
    }
    return { ok: true, value: { id: msg.id, ok: true } };
  }
  if (msg.ok === false) {
    if (!isErrorCode(msg.err)) {
      return { ok: false, reason: 'VALIDATION_FAILED:err' };
    }
    return { ok: true, value: { id: msg.id, ok: false, err: msg.err } };
  }
  return { ok: false, reason: 'VALIDATION_FAILED:ok' };
}

/** Décode une ligne reçue du BB (événement spontané ou réponse de commande). */
export function decodeIncoming(rawLine: string): DecodeResult<IncomingMessage> {
  const parsed = parseLine(rawLine);
  if (!parsed.ok) return parsed;
  const msg = parsed.value;

  if (typeof msg.evt === 'string') {
    switch (msg.evt) {
      case 'status':
        return validateStatusEvent(msg);
      case 'alarm':
        return validateAlarmEvent(msg);
      case 'alarm_clear':
        return validateAlarmClearEvent(msg);
      case 'settings':
        return validateSettingsEvent(msg);
      case 'sms_result':
        return validateSmsResultEvent(msg);
      case 'log':
        return validateLogEvent(msg);
      default:
        return { ok: false, reason: `UNKNOWN_EVT:${msg.evt}` };
    }
  }

  if ('id' in msg && 'ok' in msg) {
    return validateCommandResponse(msg);
  }

  return { ok: false, reason: 'UNRECOGNIZED_MESSAGE' };
}

function validateSetSettingsCommand(msg: Record<string, unknown>): DecodeResult<SetSettingsCommand> {
  if (!isFiniteNumber(msg.id)) return { ok: false, reason: 'VALIDATION_FAILED:id' };
  if (msg.tel1 !== undefined && !isPhoneNumberOrEmpty(msg.tel1)) {
    return { ok: false, reason: 'VALIDATION_FAILED:tel1' };
  }
  if (msg.tel2 !== undefined && !isPhoneNumberOrEmpty(msg.tel2)) {
    return { ok: false, reason: 'VALIDATION_FAILED:tel2' };
  }
  if (msg.sim_pin !== undefined && (typeof msg.sim_pin !== 'string' || !/^\d{4}$/.test(msg.sim_pin))) {
    return { ok: false, reason: 'VALIDATION_FAILED:sim_pin' };
  }
  if (msg.rf !== undefined && !isRadioBand(msg.rf)) {
    return { ok: false, reason: 'VALIDATION_FAILED:rf' };
  }
  if (msg.vol !== undefined && !isIntInRange(msg.vol, 0, 100)) {
    return { ok: false, reason: 'VALIDATION_FAILED:vol' };
  }
  return {
    ok: true,
    value: {
      id: msg.id as number,
      cmd: 'set_settings',
      ...(msg.tel1 !== undefined ? { tel1: msg.tel1 as string } : {}),
      ...(msg.tel2 !== undefined ? { tel2: msg.tel2 as string } : {}),
      ...(msg.sim_pin !== undefined ? { sim_pin: msg.sim_pin as string } : {}),
      ...(msg.rf !== undefined ? { rf: msg.rf as RadioBand } : {}),
      ...(msg.vol !== undefined ? { vol: msg.vol as number } : {}),
    },
  };
}

/** Décode une ligne reçue de l'app (côté BB) — utilisé par le boîtier simulé. */
export function decodeCommand(rawLine: string): DecodeResult<OutgoingCommand> {
  const parsed = parseLine(rawLine);
  if (!parsed.ok) return parsed;
  const msg = parsed.value;

  if (!isFiniteNumber(msg.id) || msg.id < 0) {
    return { ok: false, reason: 'VALIDATION_FAILED:id' };
  }
  if (typeof msg.cmd !== 'string') {
    return { ok: false, reason: 'VALIDATION_FAILED:cmd' };
  }

  switch (msg.cmd) {
    case 'hello':
      if (!isFiniteNumber(msg.proto)) return { ok: false, reason: 'VALIDATION_FAILED:proto' };
      return { ok: true, value: { id: msg.id, cmd: 'hello', proto: msg.proto } };
    case 'get_settings':
      return { ok: true, value: { id: msg.id, cmd: 'get_settings' } };
    case 'set_settings':
      return validateSetSettingsCommand(msg);
    case 'anchor_start':
      if (!isIntInRange(msg.tol, MIN_TOLERANCE_M, MAX_TOLERANCE_M)) {
        return { ok: false, reason: 'VALIDATION_FAILED:tol' };
      }
      return { ok: true, value: { id: msg.id, cmd: 'anchor_start', tol: msg.tol } };
    case 'anchor_stop':
      return { ok: true, value: { id: msg.id, cmd: 'anchor_stop' } };
    case 'set_tol':
      if (!isIntInRange(msg.tol, MIN_TOLERANCE_M, MAX_TOLERANCE_M)) {
        return { ok: false, reason: 'VALIDATION_FAILED:tol' };
      }
      return { ok: true, value: { id: msg.id, cmd: 'set_tol', tol: msg.tol } };
    case 'alarm_ack':
      return { ok: true, value: { id: msg.id, cmd: 'alarm_ack' } };
    case 'test_sms':
      return { ok: true, value: { id: msg.id, cmd: 'test_sms' } };
    case 'test_alarm':
      if (typeof msg.on !== 'boolean') return { ok: false, reason: 'VALIDATION_FAILED:on' };
      return { ok: true, value: { id: msg.id, cmd: 'test_alarm', on: msg.on } };
    default:
      return { ok: false, reason: `UNKNOWN_CMD:${msg.cmd}` };
  }
}
