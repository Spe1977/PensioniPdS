import { Injectable } from '@angular/core';
import { ContributoAnnuale, PensioneNettaAnzianitaInput } from './pension-engine.models';

export type TipoDocumentoPensione = 'inps' | 'cu' | 'bustaPaga';

export interface ParsedDocumentData {
  fileName: string;
  tipo: TipoDocumentoPensione;
  formato: 'xml' | 'pdf';
  values: Partial<PensioneNettaAnzianitaInput>;
  riepilogo: string[];
  periodiContributivi?: ParsedPeriodoContributivo[];
}

export interface ParsedPeriodoContributivo {
  dal: Date;
  al: Date;
  mesiDiritto: number;
}

@Injectable({ providedIn: 'root' })
export class DocumentParserService {
  private readonly aliquotaComputo = 0.33;

  async parse(file: File, tipo: TipoDocumentoPensione): Promise<ParsedDocumentData> {
    const formato = this.formatoDocumento(file);
    const text =
      formato === 'xml' ? await file.text() : await this.estraiTestoPdf(await file.arrayBuffer());

    if (tipo === 'inps') {
      return formato === 'xml'
        ? this.parseInpsXml(file.name, text)
        : this.parseInpsPdf(file.name, text);
    }

    if (tipo === 'cu') {
      return this.parseCuPdf(file.name, text);
    }

    return this.parseBustaPagaPdf(file.name, text);
  }

  private formatoDocumento(file: File): 'xml' | 'pdf' {
    const nome = file.name.toLowerCase();
    return nome.endsWith('.xml') || file.type.includes('xml') ? 'xml' : 'pdf';
  }

  private async estraiTestoPdf(buffer: ArrayBuffer): Promise<string> {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    if (typeof Worker === 'undefined') {
      (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker =
        await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
    } else {
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs-dist/legacy/build/pdf.worker.mjs';
    }

    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      disableFontFace: true,
      isEvalSupported: false,
      useWorkerFetch: false,
    }).promise;
    const pagine: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pagine.push(
        content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      );
    }

    await pdf.destroy();
    return pagine.join('\n');
  }

  private parseInpsXml(fileName: string, text: string): ParsedDocumentData {
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror')) {
      throw new Error('XML INPS non leggibile.');
    }

    const righe = Array.from(xml.getElementsByTagName('RigaContributiGestionePubblica'));
    const periodiContributivi = this.periodiContributiviDaRigheXml(righe);
    const contributiAnnuali = this.contributiAnnualiDaRigheXml(righe);
    const retribuzioni = righe
      .map((riga) => this.importoDaNodo(riga, 'RetribuzioneEuro'))
      .filter((value) => value > 0);
    const ultimoImporto = this.ultimoImportoXml(righe) ?? retribuzioni.at(-1) ?? 0;
    const totaleRetribuzioni = this.somma(retribuzioni);
    const contributiTotali = this.somma(contributiAnnuali.map((contributo) => contributo.importo));

    return {
      fileName,
      tipo: 'inps',
      formato: 'xml',
      values: {
        contributiAnnuali,
        montanteContributivo: this.arrotondaEuro(contributiTotali),
        annoBaseMontante: 2025,
        ultimoImponibileAnnuo: this.arrotondaEuro(ultimoImporto),
      },
      riepilogo: [
        `${righe.length} periodi INPS letti dall'XML`,
        `Retribuzioni pensionistiche totali: ${this.formatEuro(totaleRetribuzioni)}`,
        `Contributi annui stimati al 33%: ${this.formatEuro(contributiTotali)}`,
      ],
      periodiContributivi,
    };
  }

  private parseInpsPdf(fileName: string, text: string): ParsedDocumentData {
    const retribuzioni = this.estraiImporti(text).filter((value) => value >= 10_000);
    const totaleRetribuzioni = this.somma(retribuzioni);
    const ultimoImporto = retribuzioni.at(-1) ?? 0;
    const montanteContributivo = totaleRetribuzioni * this.aliquotaComputo;

    return {
      fileName,
      tipo: 'inps',
      formato: 'pdf',
      values: {
        montanteContributivo: this.arrotondaEuro(montanteContributivo),
        ultimoImponibileAnnuo: this.arrotondaEuro(ultimoImporto),
      },
      riepilogo: [
        `${retribuzioni.length} importi pensionistici letti dal PDF INPS`,
        `Retribuzioni pensionistiche totali: ${this.formatEuro(totaleRetribuzioni)}`,
        `Montante contributivo stimato al 33%: ${this.formatEuro(montanteContributivo)}`,
      ],
      periodiContributivi: this.periodiContributiviDaPdf(text),
    };
  }

  private parseCuPdf(fileName: string, text: string): ParsedDocumentData {
    const normalizzato = this.normalizzaSpazi(text);
    const reddito =
      this.importoDopo(
        normalizzato,
        /Redditi di lavoro dipendente e assimilati con contratto a tempo indeterminato/i,
        180,
      ) ?? this.importoDopo(normalizzato, /Reddito di lavoro dipendente/i, 100);
    const carichiFamiliari =
      this.importoDopo(normalizzato, /Detrazione per carichi di famiglia/i, 100) ?? 0;
    const addizionaleRegionale =
      this.importoDopo(normalizzato, /Addizionale regionale all'?Irpef/i, 150) ?? 0;
    const addizionaleComunale = this.somma([
      this.importoDopo(normalizzato, /Saldo 2025/i, 80) ?? 0,
      this.importoDopo(normalizzato, /Acconto 2026/i, 80) ?? 0,
    ]);

    const values: Partial<PensioneNettaAnzianitaInput> = {};
    if (reddito) values.ultimoImponibileAnnuo = this.arrotondaEuro(reddito);
    if (carichiFamiliari) {
      values.carichiFamiliariDetrazioniAnnue = this.arrotondaEuro(carichiFamiliari);
    }
    if (reddito && addizionaleRegionale) {
      values.addizionaleRegionalePercentuale = this.arrotondaEuro(
        (addizionaleRegionale / reddito) * 100,
      );
    }
    if (reddito && addizionaleComunale) {
      values.addizionaleComunalePercentuale = this.arrotondaEuro(
        (addizionaleComunale / reddito) * 100,
      );
    }

    return {
      fileName,
      tipo: 'cu',
      formato: 'pdf',
      values,
      riepilogo: [
        reddito ? `Reddito CU letto: ${this.formatEuro(reddito)}` : 'Reddito CU non trovato',
        addizionaleRegionale
          ? `Addizionale regionale letta: ${this.formatEuro(addizionaleRegionale)}`
          : 'Addizionale regionale non trovata',
      ],
    };
  }

  private parseBustaPagaPdf(fileName: string, text: string): ParsedDocumentData {
    const normalizzato = this.normalizzaSpazi(text);
    const competenzeMensili = this.importoDopo(normalizzato, /Totale:\s+[0-9.,]+\s+/i, 25);
    const addRegMensile = this.importoDopo(normalizzato, /ADDIZ\.REG\.IRPEF/i, 80) ?? 0;
    const addComMensile = this.somma([
      this.importoDopo(normalizzato, /ADDIZIONALE COMUNALE - SALDO/i, 80) ?? 0,
      this.importoDopo(normalizzato, /ADDIZIONALE COMUNALE - ACCONTO/i, 80) ?? 0,
    ]);

    const imponibileAnnuo = competenzeMensili ? competenzeMensili * 13 : 0;
    const values: Partial<PensioneNettaAnzianitaInput> = {};
    if (imponibileAnnuo) values.ultimoImponibileAnnuo = this.arrotondaEuro(imponibileAnnuo);
    if (imponibileAnnuo && addRegMensile) {
      values.addizionaleRegionalePercentuale = this.arrotondaEuro(
        ((addRegMensile * 13) / imponibileAnnuo) * 100,
      );
    }
    if (imponibileAnnuo && addComMensile) {
      values.addizionaleComunalePercentuale = this.arrotondaEuro(
        ((addComMensile * 13) / imponibileAnnuo) * 100,
      );
    }

    return {
      fileName,
      tipo: 'bustaPaga',
      formato: 'pdf',
      values,
      riepilogo: [
        competenzeMensili
          ? `Competenze mensili lette: ${this.formatEuro(competenzeMensili)}`
          : 'Competenze mensili non trovate',
        imponibileAnnuo
          ? `Imponibile annuo stimato su 13 mensilita: ${this.formatEuro(imponibileAnnuo)}`
          : 'Imponibile annuo non stimato',
      ],
    };
  }

  private ultimoImportoXml(righe: Element[]): number | null {
    const ordinate = righe
      .map((riga) => ({
        data: this.parseDataIt(this.testoNodo(riga, 'Al')),
        importo: this.importoDaNodo(riga, 'RetribuzioneEuro'),
        mesiDiritto:
          this.numeroDaNodo(riga, 'AnniContribUtiliDiritto') * 12 +
          this.numeroDaNodo(riga, 'MesiContribUtiliDiritto'),
      }))
      .filter((row) => row.data && row.importo > 0 && row.mesiDiritto >= 12)
      .sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0));

    return ordinate.at(-1)?.importo ?? null;
  }

  private contributiAnnualiDaRigheXml(righe: Element[]): ContributoAnnuale[] {
    const perAnno = righe.reduce<Record<number, number>>((totali, riga) => {
      const anno = this.parseDataIt(this.testoNodo(riga, 'Al'))?.getFullYear();
      const retribuzione = this.importoDaNodo(riga, 'RetribuzioneEuro');

      if (anno && retribuzione > 0) {
        totali[anno] = (totali[anno] ?? 0) + retribuzione * this.aliquotaComputo;
      }

      return totali;
    }, {});

    return Object.entries(perAnno)
      .map(([anno, importo]) => ({
        anno: Number(anno),
        importo: this.arrotondaEuro(importo),
      }))
      .sort((a, b) => a.anno - b.anno);
  }

  private periodiContributiviDaRigheXml(righe: Element[]): ParsedPeriodoContributivo[] {
    return righe
      .map((riga) => {
        const dal = this.parseDataIt(this.testoNodo(riga, 'Dal'));
        const al = this.parseDataIt(this.testoNodo(riga, 'Al'));
        const mesiDiritto =
          this.numeroDaNodo(riga, 'AnniContribUtiliDiritto') * 12 +
          this.numeroDaNodo(riga, 'MesiContribUtiliDiritto');

        return dal && al ? { dal, al, mesiDiritto } : null;
      })
      .filter((periodo): periodo is ParsedPeriodoContributivo => periodo !== null);
  }

  private periodiContributiviDaPdf(text: string): ParsedPeriodoContributivo[] {
    return Array.from(
      text.matchAll(
        /(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})[\s\S]{0,180}?(\d+)\s+(\d+)\s+\d+(?:[.,]\d+)?/g,
      ),
    )
      .map((match) => {
        const dal = this.parseDataIt(match[1]);
        const al = this.parseDataIt(match[2]);
        const mesiDiritto = Number(match[3]) * 12 + Number(match[4]);

        return dal && al ? { dal, al, mesiDiritto } : null;
      })
      .filter((periodo): periodo is ParsedPeriodoContributivo => periodo !== null);
  }

  private numeroDaNodo(parent: Element, tagName: string): number {
    return Number(this.testoNodo(parent, tagName).replace(',', '.')) || 0;
  }

  private importoDaNodo(parent: Element, tagName: string): number {
    return this.parseImportoItaliano(this.testoNodo(parent, tagName));
  }

  private testoNodo(parent: Element, tagName: string): string {
    return parent.getElementsByTagName(tagName).item(0)?.textContent?.trim() ?? '';
  }

  private importoDopo(text: string, label: RegExp, maxChars: number): number | null {
    const match = label.exec(text);
    if (!match?.index && match?.index !== 0) return null;

    const area = text.slice(
      match.index + match[0].length,
      match.index + match[0].length + maxChars,
    );
    const importo = area.match(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/);
    return importo ? this.parseImportoItaliano(importo[0]) : null;
  }

  private estraiImporti(text: string): number[] {
    return Array.from(text.matchAll(/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/g), (match) =>
      this.parseImportoItaliano(match[0]),
    );
  }

  private parseImportoItaliano(value: string): number {
    const parsed = Number(value.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private parseDataIt(value: string): Date | null {
    const [giorno, mese, anno] = value.split('/').map(Number);
    if (!giorno || !mese || !anno) return null;
    return new Date(anno, mese - 1, giorno);
  }

  private normalizzaSpazi(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private somma(values: number[]): number {
    return values.reduce((totale, value) => totale + value, 0);
  }

  private arrotondaEuro(valore: number): number {
    return Math.round((valore + Number.EPSILON) * 100) / 100;
  }

  private formatEuro(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.arrotondaEuro(value));
  }
}
