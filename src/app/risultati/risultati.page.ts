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
    console.log('Scaricamento risultati in corso...');
    alert('Funzionalità di download (.md/.pdf) in arrivo con il motore di calcolo definitivo.');
  }
}
