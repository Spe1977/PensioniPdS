import { Component, computed, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline } from 'ionicons/icons';
import { SimulationStateService } from '../services/simulation-state.service';
import { Durata, ScenarioCalcoloPensione } from '../services/pension-engine.models';

@Component({
  selector: 'app-risultati',
  templateUrl: './risultati.page.html',
  styleUrls: ['./risultati.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonText,
  ],
  providers: [DatePipe],
})
export class RisultatiPage {
  private state = inject(SimulationStateService);
  private datePipe = inject(DatePipe);

  /** Risultato dal motore di calcolo */
  risultato = this.state.risultato;

  /** Computed signals per il template */
  hasRisultato = computed(() => this.risultato() !== null);
  dataDecorrenza = computed(() => this.risultato()?.dataDecorrenza ?? null);
  dataMaturazione = computed(() => this.risultato()?.dataMaturazioneDiritto ?? null);
  servizioEffettivo = computed(() => this.risultato()?.servizioEffettivo ?? null);
  maggiorazione = computed(() => this.risultato()?.maggiorazione ?? null);
  servizioUtile = computed(() => this.risultato()?.servizioUtile ?? null);
  requisitiApplicati = computed(() => this.risultato()?.requisitiApplicati ?? null);
  pensioneNetta = computed(() => this.risultato()?.pensioneNetta ?? null);
  etaRichiesta = computed(() => {
    const requisiti = this.requisitiApplicati();
    if (!requisiti?.etaAnniRichiesti) return null;
    return {
      anni: requisiti.etaAnniRichiesti,
      mesi: requisiti.etaMesiExtra ?? 0,
      giorni: 0,
    };
  });
  avviso = computed(() => this.risultato()?.avviso ?? null);

  constructor() {
    addIcons({ downloadOutline });
  }

  /** Formatta una Durata in stringa leggibile */
  formatDurata(d: Durata | null): string {
    if (!d) return '-';
    const parts: string[] = [];
    if (d.anni > 0) parts.push(`${d.anni} ann${d.anni === 1 ? 'o' : 'i'}`);
    if (d.mesi > 0) parts.push(`${d.mesi} mes${d.mesi === 1 ? 'e' : 'i'}`);
    if (d.giorni > 0) parts.push(`${d.giorni} giorn${d.giorni === 1 ? 'o' : 'i'}`);
    return parts.length > 0 ? parts.join(' e ') : '0';
  }

  formatEuro(value: number | null | undefined): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value ?? 0);
  }

  scenarioLabel(scenario: ScenarioCalcoloPensione | undefined): string {
    if (scenario === 'retributivo_pro_rata') return 'A - Retributivo pro-rata';
    if (scenario === 'misto') return 'B - Misto';
    if (scenario === 'contributivo_puro') return 'C - Contributivo puro';
    return '-';
  }

  scaricaRisultatiMarkdown() {
    const res = this.risultato();
    if (!res) return;

    this.scaricaBlob(
      this.creaMarkdownRisultati(),
      'text/markdown;charset=utf-8',
      `Risultati_Simulazione_${this.dataFile()}.md`,
    );
  }

  scaricaRisultatiPdf() {
    const res = this.risultato();
    if (!res) return;

    const blob = this.creaPdfBlob(this.markdownToPdfLines(this.creaMarkdownRisultati()));
    this.scaricaBlob(blob, 'application/pdf', `Risultati_Simulazione_${this.dataFile()}.pdf`);
  }

  private creaMarkdownRisultati(): string {
    const res = this.risultato();
    if (!res) return '';

    const dtMaturazione = this.datePipe.transform(res.dataMaturazioneDiritto, 'dd/MM/yyyy') ?? '-';
    const dtDecorrenza = this.datePipe.transform(res.dataDecorrenza, 'dd/MM/yyyy') ?? '-';
    const req = res.requisitiApplicati;

    let md = `# Risultati Simulazione Pensione\n\n`;
    md += `## Date\n`;
    md += `- **Data Maturazione Requisiti:** ${dtMaturazione}\n`;
    md += `- **Data Decorrenza Pensione:** ${dtDecorrenza}\n`;
    if (req) {
      md += `- **Finestra Mobile:** ${req.finestraMobileMesi} mesi\n`;
    }

    md += `\n## Servizio\n`;
    md += `- **Servizio Effettivo:** ${this.formatDurata(res.servizioEffettivo)}\n`;
    md += `- **Maggiorazione 1/5:** ${this.formatDurata(res.maggiorazione)}\n`;
    md += `- **Servizio Utile Totale:** ${this.formatDurata(res.servizioUtile)}\n`;

    if (res.pensioneNetta) {
      const p = res.pensioneNetta;
      md += `\n## Calcolo Pensione\n`;
      md += `- **Scenario Calcolo:** ${this.scenarioLabel(p.scenario)}\n`;
      if (p.montanteContributivoBase !== undefined) {
        md += `- **Montante Contributivo Base:** ${this.formatEuro(p.montanteContributivoBase)}\n`;
      }
      if (p.montanteContributivoFinale !== undefined) {
        md += `- **Montante Contributivo Finale:** ${this.formatEuro(p.montanteContributivoFinale)}\n`;
      }
      if (p.coefficienteTrasformazione !== undefined) {
        md += `- **Coefficiente di Trasformazione Applicato:** ${this.formatPercentuale(
          p.coefficienteTrasformazione,
        )}\n`;
      }
      md += `- **Quota Retributiva Annua:** ${this.formatEuro(p.quotaRetributivaAnnua)}\n`;
      md += `- **Quota Contributiva Annua:** ${this.formatEuro(p.quotaContributivaAnnua)}\n`;
      md += `- **Sei Scatti su Montante:** ${this.formatEuro(p.seiScattiMontanteFigurativo)}\n`;
      md += `- **Moltiplicatore su Montante:** ${this.formatEuro(p.moltiplicatoreMontante)}\n`;
      md += `- **Pensione Lorda Annua:** ${this.formatEuro(p.pensioneLordaAnnua)}\n`;
      md += `- **Pensione Lorda Mensile:** ${this.formatEuro(p.pensioneLordaMensile)}\n`;
      md += `- **IRPEF Lorda Annua:** ${this.formatEuro(p.irpefLordaAnnua)}\n`;
      md += `- **Detrazioni Annue:** ${this.formatEuro(p.detrazioniAnnue)}\n`;
      md += `- **Addizionali Annue:** ${this.formatEuro(p.addizionaliAnnue)}\n`;
      md += `- **Pensione Netta Annua:** ${this.formatEuro(p.pensioneNettaAnnua)}\n`;
      md += `- **Pensione Netta Mensile:** ${this.formatEuro(p.pensioneNettaMensile)}\n`;
      if (p.noteBenefici && p.noteBenefici.length > 0) {
        md += `\n### Benefici Applicati\n`;
        p.noteBenefici.forEach((nota) => (md += `- ${nota}\n`));
      }
    }

    if (res.avviso) {
      md += `\n## Note\n`;
      md += `> ${res.avviso}\n`;
    }

    return md;
  }

  private creaPdfBlob(lines: string[]): Blob {
    const pagine = this.chunk(lines, 38);
    const objects: string[] = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      `<< /Type /Pages /Kids [${pagine
        .map((_, index) => `${4 + index * 2} 0 R`)
        .join(' ')}] /Count ${pagine.length} >>`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    ];

    pagine.forEach((pageLines, index) => {
      const pageObject = 4 + index * 2;
      const contentObject = pageObject + 1;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObject} 0 R >>`,
      );
      const stream = this.creaPdfTextStream(pageLines);
      objects.push(`<< /Length ${this.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    });

    const encoder = new TextEncoder();
    let body = '%PDF-1.4\n';
    const offsets: number[] = [0];

    objects.forEach((object, index) => {
      offsets.push(encoder.encode(body).length);
      body += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = encoder.encode(body).length;
    body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      body += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

    return new Blob([body], { type: 'application/pdf' });
  }

  private formatPercentuale(value: number): string {
    return new Intl.NumberFormat('it-IT', {
      style: 'percent',
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(value);
  }

  private creaPdfTextStream(lines: string[]): string {
    const righe = lines.map((line, index) => {
      const y = 800 - index * 18;
      return `BT /F1 11 Tf 48 ${y} Td (${this.escapePdfText(line)}) Tj ET`;
    });
    return righe.join('\n');
  }

  private markdownToPdfLines(markdown: string): string[] {
    return markdown
      .split('\n')
      .map((line) =>
        line
          .replace(/^#{1,3}\s*/g, '')
          .replace(/^\s*[->]\s*/g, '')
          .replace(/\*\*/g, '')
          .trim(),
      )
      .filter(Boolean)
      .flatMap((line) => this.wrapLine(this.asciiPdfText(line), 86));
  }

  private wrapLine(line: string, maxLength: number): string[] {
    const words = line.split(/\s+/);
    const lines: string[] = [];
    let current = '';

    words.forEach((word) => {
      const next = current ? `${current} ${word}` : word;
      if (next.length > maxLength && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) lines.push(current);
    return lines;
  }

  private chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks.length ? chunks : [[]];
  }

  private asciiPdfText(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/€/g, 'EUR')
      .replace(/[’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/[^\x20-\x7e]/g, '');
  }

  private escapePdfText(text: string): string {
    return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  }

  private byteLength(text: string): number {
    return new TextEncoder().encode(text).length;
  }

  private scaricaBlob(blobPart: Blob | string, type: string, fileName: string): void {
    const blob = blobPart instanceof Blob ? blobPart : new Blob([blobPart], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  private dataFile(): string {
    return new Date().toISOString().split('T')[0];
  }
}
