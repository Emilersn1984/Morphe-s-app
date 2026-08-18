import { FrameAssembler } from '@/src/ble/framing';

describe('FrameAssembler', () => {
  it('returns a complete line delivered in one chunk', () => {
    const assembler = new FrameAssembler();
    expect(assembler.push('{"id":1,"ok":true}\n')).toEqual(['{"id":1,"ok":true}']);
  });

  it('reassembles a line fragmented over several small BLE packets', () => {
    const assembler = new FrameAssembler();
    const line = '{"evt":"status","st":"idle"}\n';
    const chunks = chunkString(line, 5);

    const collected: string[] = [];
    for (const chunk of chunks) {
      collected.push(...assembler.push(chunk));
    }

    expect(collected).toEqual(['{"evt":"status","st":"idle"}']);
  });

  it('handles several messages arriving in a single chunk', () => {
    const assembler = new FrameAssembler();
    const result = assembler.push('{"id":1,"ok":true}\n{"id":2,"ok":true}\n');
    expect(result).toEqual(['{"id":1,"ok":true}', '{"id":2,"ok":true}']);
  });

  it('keeps a partial message buffered until the newline arrives', () => {
    const assembler = new FrameAssembler();
    expect(assembler.push('{"id":1,')).toEqual([]);
    expect(assembler.pendingBuffer).toBe('{"id":1,');
    expect(assembler.push('"ok":true}\n')).toEqual(['{"id":1,"ok":true}']);
  });

  it('drops an unterminated buffer that grows unreasonably large (corrupted stream)', () => {
    const assembler = new FrameAssembler();
    const garbage = 'x'.repeat(2000); // jamais de \n
    expect(assembler.push(garbage)).toEqual([]);
    expect(assembler.pendingBuffer).toBe('');
  });

  it('resets cleanly on reconnection', () => {
    const assembler = new FrameAssembler();
    assembler.push('{"id":1,');
    assembler.reset();
    expect(assembler.pendingBuffer).toBe('');
    expect(assembler.push('"ok":true}\n')).toEqual(['"ok":true}']);
  });
});

function chunkString(input: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < input.length; i += size) {
    chunks.push(input.slice(i, i + size));
  }
  return chunks;
}
