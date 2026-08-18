import {
  decodeCommand,
  decodeIncoming,
  encodeCommand,
  encodeMessage,
  MAX_MESSAGE_BYTES,
  PROTOCOL_VERSION,
  type StatusEvent,
} from '@/src/ble/protocol';

const validStatus: StatusEvent = {
  evt: 'status',
  st: 'anchored',
  tol: 15,
  boat: { lat: 43.123456, lon: 5.987654, fix: 3, sat: 9, acc: 2.5, age: 1 },
  anc: { lat: 43.1235, lon: 5.9877, valid: true, age: 3 },
  ref: { lat: 43.123498, lon: 5.987695, valid: true, ts: 1786510000 },
  drift: 1.2,
  dist: 8.4,
  out: 0,
  bat: { bb: 82, bbc: true, tur: 57, turc: false },
  gsm: { reg: true, rssi: -75 },
  vol: 80,
  rf: 868,
};

describe('protocol: encoding', () => {
  it('encodes a command as one JSON line terminated by \\n', () => {
    const line = encodeCommand({ id: 1, cmd: 'hello', proto: PROTOCOL_VERSION });
    expect(line.endsWith('\n')).toBe(true);
    expect(JSON.parse(line.trim())).toEqual({ id: 1, cmd: 'hello', proto: PROTOCOL_VERSION });
  });

  it('refuses to encode a message above the size limit', () => {
    const hugeMsg = { evt: 'log' as const, lvl: 'info' as const, msg: 'x'.repeat(500) };
    expect(() => encodeMessage(hugeMsg)).toThrow();
  });
});

describe('protocol: decoding valid frames', () => {
  it('decodes a valid status event (architecture.md §5.4 example)', () => {
    const line = encodeMessage(validStatus);
    const result = decodeIncoming(line);
    expect(result).toEqual({ ok: true, value: validStatus });
  });

  it('decodes a valid alarm event', () => {
    const line = '{"evt":"alarm","reason":"drag","drift":19.4,"out":5,"ts":1786512345}\n';
    const result = decodeIncoming(line);
    expect(result.ok).toBe(true);
  });

  it('decodes a status event where turc is omitted (facultatif)', () => {
    const { turc, ...batWithoutTurc } = validStatus.bat;
    const line = encodeMessage({ ...validStatus, bat: batWithoutTurc });
    const result = decodeIncoming(line);
    expect(result.ok).toBe(true);
  });

  it('decodes a hello response', () => {
    const line = '{"id":1,"ok":true,"proto":1,"fw":"7.1.3","dev":"MORPHE-1A2B"}\n';
    const result = decodeIncoming(line);
    expect(result).toEqual({
      ok: true,
      value: { id: 1, ok: true, proto: 1, fw: '7.1.3', dev: 'MORPHE-1A2B' },
    });
  });

  it('decodes a plain ok response', () => {
    const result = decodeIncoming('{"id":5,"ok":true}\n');
    expect(result).toEqual({ ok: true, value: { id: 5, ok: true } });
  });

  it('decodes an error response with a known error code', () => {
    const result = decodeIncoming('{"id":4,"ok":false,"err":"ERR_NO_FIX"}\n');
    expect(result).toEqual({ ok: true, value: { id: 4, ok: false, err: 'ERR_NO_FIX' } });
  });
});

describe('protocol: decoding corrupted / malformed / unknown frames (§3.1, §5)', () => {
  it('rejects an empty line', () => {
    expect(decodeIncoming('').ok).toBe(false);
  });

  it('rejects invalid JSON (truncated frame)', () => {
    const result = decodeIncoming('{"evt":"status","st":"anch\n');
    expect(result).toEqual({ ok: false, reason: 'INVALID_JSON' });
  });

  it('rejects a JSON array instead of an object', () => {
    const result = decodeIncoming('[1,2,3]\n');
    expect(result.ok).toBe(false);
  });

  it('rejects non-ASCII content', () => {
    const result = decodeIncoming('{"evt":"log","lvl":"info","msg":"café ☠"}\n');
    expect(result).toEqual({ ok: false, reason: 'NON_ASCII' });
  });

  it('rejects a frame above the message size limit', () => {
    const oversized = `{"evt":"log","lvl":"info","msg":"${'x'.repeat(500)}"}\n`;
    expect(oversized.length).toBeGreaterThan(MAX_MESSAGE_BYTES);
    const result = decodeIncoming(oversized);
    expect(result).toEqual({ ok: false, reason: 'TOO_LARGE' });
  });

  it('rejects an unknown evt', () => {
    const result = decodeIncoming('{"evt":"unknown_thing","x":1}\n');
    expect(result).toEqual({ ok: false, reason: 'UNKNOWN_EVT:unknown_thing' });
  });

  it('rejects a status event missing required fields', () => {
    const result = decodeIncoming('{"evt":"status","st":"anchored"}\n');
    expect(result.ok).toBe(false);
  });

  it('rejects a status event with out-of-bounds latitude', () => {
    const bad = { ...validStatus, boat: { ...validStatus.boat, lat: 200 } };
    const result = decodeIncoming(encodeMessage(bad));
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:boat' });
  });

  it('rejects a status event with an invalid state', () => {
    const bad = { ...validStatus, st: 'sinking' };
    const result = decodeIncoming(encodeMessage(bad as unknown as StatusEvent));
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:st' });
  });

  it('rejects a battery percentage above 100', () => {
    const bad = { ...validStatus, bat: { ...validStatus.bat, bb: 150 } };
    const result = decodeIncoming(encodeMessage(bad));
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:bat' });
  });

  it('rejects a radio band outside {868, 915}', () => {
    const bad = { ...validStatus, rf: 900 };
    const result = decodeIncoming(encodeMessage(bad as unknown as StatusEvent));
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:rf' });
  });

  it('rejects a command response with an unknown error code', () => {
    const result = decodeIncoming('{"id":1,"ok":false,"err":"ERR_MADE_UP"}\n');
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:err' });
  });

  it('never throws on garbage input', () => {
    const garbageInputs = ['\u0000\u0001', '{{{', '"just a string"', '12345', 'null', '{}'];
    for (const garbage of garbageInputs) {
      expect(() => decodeIncoming(garbage)).not.toThrow();
    }
  });
});

describe('protocol: decoding commands (côté BB, utilisé par le boîtier simulé)', () => {
  it('round-trips anchor_start', () => {
    const line = encodeCommand({ id: 4, cmd: 'anchor_start', tol: 15 });
    const result = decodeCommand(line);
    expect(result).toEqual({ ok: true, value: { id: 4, cmd: 'anchor_start', tol: 15 } });
  });

  it('rejects anchor_start with an out-of-range tolerance', () => {
    const line = '{"id":4,"cmd":"anchor_start","tol":999}\n';
    const result = decodeCommand(line);
    expect(result).toEqual({ ok: false, reason: 'VALIDATION_FAILED:tol' });
  });

  it('rejects an unknown command', () => {
    const result = decodeCommand('{"id":1,"cmd":"do_a_barrel_roll"}\n');
    expect(result).toEqual({ ok: false, reason: 'UNKNOWN_CMD:do_a_barrel_roll' });
  });

  it('only sends the sim_pin field when explicitly present', () => {
    const line = encodeCommand({ id: 3, cmd: 'set_settings', vol: 80 });
    const result = decodeCommand(line);
    expect(result.ok).toBe(true);
    if (result.ok && result.value.cmd === 'set_settings') {
      expect(result.value.sim_pin).toBeUndefined();
    }
  });
});
