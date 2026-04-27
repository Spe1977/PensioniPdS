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

  scaricaRisultati() {
    const res = this.risultato();
    if (!res) return;

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
      md += `- **Pensione Lorda Annua:** ${this.formatEuro(p.pensioneLordaAnnua)}\n`;
      md += `- **Pensione Lorda Mensile:** ${this.formatEuro(p.pensioneLordaMensile)}\n`;
      md += `- **Pensione Netta Annua:** ${this.formatEuro(p.pensioneNettaAnnua)}\n`;
      md += `- **Pensione Netta Mensile:** ${this.formatEuro(p.pensioneNettaMensile)}\n`;
      if (p.noteBenefici && p.noteBenefici.length > 0) {
        md += `\n### Benefici Applicati\n`;
        p.noteBenefici.forEach(nota => md += `- ${nota}\n`);
      }
    }

    if (res.avviso) {
      md += `\n## Note\n`;
      md += `> ${res.avviso}\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Risultati_Simulazione_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
