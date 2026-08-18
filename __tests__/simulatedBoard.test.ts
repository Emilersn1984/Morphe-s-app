import { FrameAssembler } from '@/src/ble/framing';
import { decodeIncoming, type IncomingMessage } from '@/src/ble/protocol';
import { SimulatedBoard } from '@/src/ble/mock/simulatedBoard';
import { SCENARIO_NAMES } from '@/src/ble/mock/scenarios';

const activeBoards: SimulatedBoard[] = [];

afterEach(async () => {
  // Le minuteur interne (setInterval) doit être arrêté pour ne pas laisser
  // de handle actif entre deux tests.
  await Promise.all(activeBoards.map((board) => board.disconnect()));
  activeBoards.length = 0;
});

function trackedBoard(options: ConstructorParameters<typeof SimulatedBoard>[0]): SimulatedBoard {
  const board = new SimulatedBoard(options);
  activeBoards.push(board);
  return board;
}

/** Câble un SimulatedBoard à un décodeur, comme le ferait `client.ts`. */
function collectMessages(board: SimulatedBoard) {
  const assembler = new FrameAssembler();
  const messages: IncomingMessage[] = [];
  const invalid: string[] = [];

  board.onData((chunk) => {
    for (const line of assembler.push(chunk)) {
      const result = decodeIncoming(line);
      if (result.ok) {
        messages.push(result.value);
      } else {
        invalid.push(result.reason);
      }
    }
  });

  return { messages, invalid };
}

describe('SimulatedBoard: tous les scénarios sont rejouables', () => {
  it('exposes exactly the 9 scenarios required by architecture.md §10', () => {
    expect(SCENARIO_NAMES).toHaveLength(9);
    expect(SCENARIO_NAMES).toEqual([
      'nominal',
      'derapage',
      'batterie_faible_bb',
      'batterie_faible_tourelle',
      'en_charge',
      'sans_fix_gps',
      'tourelle_perdue',
      'liaison_instable',
      'firmware_incompatible',
    ]);
  });

  it.each(SCENARIO_NAMES)('instantiates and emits a first status for "%s"', async (scenario) => {
    const board = trackedBoard({ scenario, random: () => 0.9 });
    const { messages } = collectMessages(board);

    await board.connect();

    const statusMessages = messages.filter((m) => 'evt' in m && m.evt === 'status');
    expect(statusMessages.length).toBeGreaterThan(0);

    await board.disconnect();
  });
});

describe('SimulatedBoard: cycle de commande complet (démarrer → surveiller → arrêter)', () => {
  it('acknowledges anchor_start then anchor_stop for the nominal scenario', async () => {
    const board = trackedBoard({ scenario: 'nominal', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"anchor_start","tol":15}\n');
    const startAck = messages.find((m) => 'id' in m && m.id === 1);
    expect(startAck).toEqual({ id: 1, ok: true });

    const statusAfterStart = [...messages].reverse().find((m) => 'evt' in m && m.evt === 'status');
    expect(statusAfterStart).toMatchObject({ evt: 'status', st: 'anchored' });

    board.write('{"id":2,"cmd":"anchor_stop"}\n');
    const stopAck = messages.find((m) => 'id' in m && m.id === 2);
    expect(stopAck).toEqual({ id: 2, ok: true });
  });

  it('refuses anchor_start with ERR_NO_FIX when there is no GPS fix', async () => {
    const board = trackedBoard({ scenario: 'sans_fix_gps', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"anchor_start","tol":15}\n');
    expect(messages).toContainEqual({ id: 1, ok: false, err: 'ERR_NO_FIX' });
  });

  it('refuses anchor_start with ERR_NO_TURRET when the turret is lost', async () => {
    const board = trackedBoard({ scenario: 'tourelle_perdue', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"anchor_start","tol":15}\n');
    expect(messages).toContainEqual({ id: 1, ok: false, err: 'ERR_NO_TURRET' });
  });

  it('raises a drag alarm after enough consecutive out-of-tolerance readings (derapage)', async () => {
    const board = trackedBoard({ scenario: 'derapage', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"anchor_start","tol":5}\n');
    for (let i = 0; i < 10; i += 1) board.advance();

    const alarm = messages.find((m) => 'evt' in m && m.evt === 'alarm');
    expect(alarm).toMatchObject({ evt: 'alarm', reason: 'drag' });

    board.write('{"id":2,"cmd":"alarm_ack"}\n');
    expect(messages).toContainEqual({ evt: 'alarm_clear', by: 'app' });
  });

  it('drains the board battery over time (batterie_faible_bb)', async () => {
    const board = trackedBoard({ scenario: 'batterie_faible_bb', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    // Cadence "idle" = 1 émission tous les 10 ticks (architecture.md §5.4).
    for (let i = 0; i < 10; i += 1) board.advance();

    const statuses = messages.filter((m) => 'evt' in m && m.evt === 'status');
    const last = statuses[statuses.length - 1] as { bat: { bb: number } };
    expect(last.bat.bb).toBeLessThan(82);
  });

  it('reports a charging state for both battery holders (en_charge)', async () => {
    const board = trackedBoard({ scenario: 'en_charge', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();
    for (let i = 0; i < 10; i += 1) board.advance();

    const statuses = messages.filter((m) => 'evt' in m && m.evt === 'status') as Array<{
      bat: { bbc: boolean; turc?: boolean };
    }>;
    expect(statuses[statuses.length - 1].bat.bbc).toBe(true);
    expect(statuses[statuses.length - 1].bat.turc).toBe(true);
  });

  it('answers hello with an unknown protocol version (firmware_incompatible)', async () => {
    const board = trackedBoard({ scenario: 'firmware_incompatible', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"hello","proto":1}\n');
    const helloResponse = messages.find((m) => 'id' in m && m.id === 1) as { proto: number };
    expect(helloResponse.proto).not.toBe(1);
  });

  it('responds to test_sms and test_alarm', async () => {
    const board = trackedBoard({ scenario: 'nominal', random: () => 0.9 });
    const { messages } = collectMessages(board);
    await board.connect();

    board.write('{"id":1,"cmd":"test_sms"}\n');
    expect(messages).toContainEqual({ id: 1, ok: true });
    expect(messages).toContainEqual({ evt: 'sms_result', ok: true });

    board.write('{"id":2,"cmd":"test_alarm","on":true}\n');
    expect(messages).toContainEqual({ id: 2, ok: true });
  });
});

describe('SimulatedBoard: robustesse aux trames corrompues (unstable link + injection directe)', () => {
  it('never crashes the decoder when frames are injected corrupted (liaison_instable)', async () => {
    // Générateur pseudo-aléatoire déterministe mais varié, pour obtenir un
    // mélange de trames perdues, corrompues et valides sur la durée du test.
    let seed = 0;
    const random = () => {
      seed = (seed + 0.137) % 1;
      return seed;
    };
    const board = trackedBoard({ scenario: 'liaison_instable', random });
    const { messages, invalid } = collectMessages(board);
    await board.connect();

    for (let i = 0; i < 20; i += 1) board.advance();

    // Certaines trames sont volontairement tronquées : elles doivent être
    // journalisées comme invalides, jamais provoquer de crash ni d'état fantôme.
    expect(invalid.length + messages.length).toBeGreaterThan(0);
  });

  it('lets tests inject an arbitrary corrupted frame directly', async () => {
    const board = trackedBoard({ scenario: 'nominal', random: () => 0.9 });
    const { invalid } = collectMessages(board);
    await board.connect();

    board.injectRawFrame('{"evt":"status","st":"anch\n');
    expect(invalid).toContain('INVALID_JSON');
  });
});
