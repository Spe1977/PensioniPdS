import { readFileSync } from 'node:fs';
import { DocumentParserService } from './document-parser.service';

describe('DocumentParserService', () => {
  let service: DocumentParserService;

  beforeEach(() => {
    service = new DocumentParserService();
  });

  it('parses the real INPS XML and estimates the contributive montante locally', async () => {
    const xml = readFileSync('doc/inps.xml', 'utf8');
    const file = new File([xml], 'inps.xml', { type: 'text/xml' });

    const parsed = await service.parse(file, 'inps');

    expect(parsed.formato).toBe('xml');
    expect(parsed.values.montanteContributivo).toBeGreaterThan(250000);
    expect(parsed.values.ultimoImponibileAnnuo).toBe(54523.98);
    expect(parsed.riepilogo.join(' ')).toContain('periodi INPS');
  });
});
