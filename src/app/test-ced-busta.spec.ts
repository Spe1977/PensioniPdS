import { describe, it, expect } from 'vitest';
import { DocumentParserService } from './services/document-parser.service';
import * as fs from 'fs';
import * as path from 'path';

describe('Test Parsing Busta Paga', () => {
  it('should parse ced.pdf correctly', async () => {
    const service = new DocumentParserService();
    const filePath = path.join(__dirname, '..', '..', 'doc', 'ced.pdf');
    const buffer = fs.readFileSync(filePath);
    
    // Create a mock File object
    const file = new File([buffer], 'ced.pdf', { type: 'application/pdf' });
    
    const result = await service.parse(file, 'bustaPaga');
    console.log(JSON.stringify(result, null, 2));
    
    expect(result).toBeDefined();
  });
});
