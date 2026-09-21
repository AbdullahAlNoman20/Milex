// server/test/unit/fileValidation.util.test.ts
import { validateUploadedFile, isExtensionBlocked } from '../../src/common/utils/fileValidation.util';

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(64, 0x20)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 0)]);
const ELF = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(64, 0)]);

describe('validateUploadedFile', () => {
  it('accepts a genuine PDF', async () => {
    const r = await validateUploadedFile(PDF, 'trade-licence.pdf');
    expect(r.valid).toBe(true);
    expect(r.detectedMime).toBe('application/pdf');
  });

  it('accepts a genuine PNG', async () => {
    const r = await validateUploadedFile(PNG, 'scan.png');
    expect(r.valid).toBe(true);
  });

  it('rejects an executable renamed as a PDF', async () => {
    const r = await validateUploadedFile(ELF, 'report.pdf');
    expect(r.valid).toBe(false);
  });

  it('rejects an unrecognised binary with an unknown extension', async () => {
    const r = await validateUploadedFile(Buffer.from([0x01, 0x00, 0x02, 0x00, 0x03]), 'thing.bin');
    expect(r.valid).toBe(false);
  });

  it('accepts real plain text but rejects binary wearing a .txt name', async () => {
    const ok = await validateUploadedFile(Buffer.from('hello, this is a note'), 'note.txt');
    expect(ok.valid).toBe(true);
    const bad = await validateUploadedFile(Buffer.from([0x68, 0x00, 0x69]), 'note.txt');
    expect(bad.valid).toBe(false);
  });

  it('rejects an empty file', async () => {
    const r = await validateUploadedFile(Buffer.alloc(0), 'empty.pdf');
    expect(r.valid).toBe(false);
  });

  it('blocks dangerous extensions outright', () => {
    expect(isExtensionBlocked('payload.svg')).toBe(true);
    expect(isExtensionBlocked('payload.html')).toBe(true);
    expect(isExtensionBlocked('licence.pdf')).toBe(false);
  });
});