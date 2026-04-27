import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  addOutline,
  trashOutline,
  calculatorOutline,
  cloudUploadOutline,
} from 'ionicons/icons';
import { SimulationStateService } from '../services/simulation-state.service';
import { PensionEngineService } from '../services/pension-engine.service';
import {
  PensioneNettaAnzianitaInput,
  ScenarioCalcoloPensione,
} from '../services/pension-engine.models';

@Component({
  selector: 'app-caricamento-dati',
  templateUrl: './caricamento-dati.page.html',
  styleUrls: ['./caricamento-dati.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonGrid,
    IonRow,
    IonCol,
  ],
})
export class CaricamentoDatiPage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(SimulationStateService);
  private engine = inject(PensionEngineService);

  filesForm: FormGroup;

  // Nomi dei file selezionati per feedback UI
  fileNames = {
    inps: '',
    cu: '',
    bustaPaga: '',
  };

  constructor() {
    addIcons({
      documentTextOutline,
      addOutline,
      trashOutline,
      calculatorOutline,
      cloudUploadOutline,
    });

    this.filesForm = this.fb.group({
      inpsFile: [null],
      cuFile: [null],
      bustaPagaFile: [null],
      scenarioPensione: ['misto', Validators.required],
      quotaRetributivaAnnua: [9000, [Validators.required, Validators.min(0)]],
      montanteContributivo: [350000, [Validators.required, Validators.min(0)]],
      coefficienteTrasformazione: [5.2, [Validators.required, Validators.min(0)]],
      ultimoImponibileAnnuo: [35000, [Validators.required, Validators.min(0)]],
      detrazioniAnnue: [1955, [Validators.required, Validators.min(0)]],
      addizionaleRegionalePercentuale: [1.73, [Validators.required, Validators.min(0)]],
      addizionaleComunalePercentuale: [0.8, [Validators.required, Validators.min(0)]],
      carichiFamiliariDetrazioniAnnue: [0, [Validators.required, Validators.min(0)]],
      contributiFuturi: this.fb.array([]),
    });
  }

  get contributiFuturi() {
    return this.filesForm.get('contributiFuturi') as FormArray;
  }

  aggiungiContributoFuturo() {
    const contributoForm = this.fb.group({
      anno: ['', [Validators.required, Validators.min(2020), Validators.max(2100)]],
      importo: ['', [Validators.required, Validators.min(0)]],
      tassoRivalutazione: ['1.0', [Validators.required, Validators.min(0)]], // E.g., 1.05 per 5%
    });
    this.contributiFuturi.push(contributoForm);
  }

  rimuoviContributoFuturo(index: number) {
    this.contributiFuturi.removeAt(index);
  }

  onFileSelected(event: Event, tipo: 'inps' | 'cu' | 'bustaPaga') {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      this.fileNames[tipo] = file.name;
      // Il caricamento e l'analisi avverranno localmente in una fase successiva
      this.filesForm.patchValue({ [`${tipo}File`]: file });
    }
  }

  onCalcola() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const tipo = this.state.tipoSimulazione();
    const dataNascita = this.parseDateInput(this.state.dataNascita());
    const dataAssunzione = this.parseDateInput(this.state.dataAssunzione());

    if (tipo === 'anzianita') {
      const risultato = this.engine.calcolaDataPensionamento(dataNascita, dataAssunzione);
      risultato.pensioneNetta = this.engine.calcolaPensioneNettaAnzianita(
        this.creaInputPensioneNettaAnzianita(),
      );
      this.state.risultato.set(risultato);
    }

    if (tipo === 'eta_anzianita') {
      const risultato = this.engine.calcolaDataPensionamentoEtaAnzianita(
        dataNascita,
        dataAssunzione,
      );
      risultato.pensioneNetta = this.engine.calcolaPensioneNettaEtaAnzianita(
        this.creaInputPensioneNettaAnzianita(),
      );
      this.state.risultato.set(risultato);
    }

    if (tipo === 'limiti_eta') {
      const limiteOrdinamentale = this.state.limiteOrdinamentale() ?? 60;
      const risultato = this.engine.calcolaDataPensionamentoLimitiEta(
        dataNascita,
        dataAssunzione,
        limiteOrdinamentale,
      );
      risultato.pensioneNetta = this.engine.calcolaPensioneNettaLimitiEta({
        ...this.creaInputPensioneNettaAnzianita(),
        applicaMoltiplicatore: true,
      });
      this.state.risultato.set(risultato);
    }

    // Naviga alla pagina risultati
    this.router.navigate(['/risultati']);
  }

  private creaInputPensioneNettaAnzianita(): PensioneNettaAnzianitaInput {
    const raw = this.filesForm.getRawValue();

    return {
      scenario: raw.scenarioPensione as ScenarioCalcoloPensione,
      quotaRetributivaAnnua: this.numero(raw.quotaRetributivaAnnua),
      montanteContributivo: this.numero(raw.montanteContributivo),
      coefficienteTrasformazione: this.numero(raw.coefficienteTrasformazione),
      ultimoImponibileAnnuo: this.numero(raw.ultimoImponibileAnnuo),
      detrazioniAnnue: this.numero(raw.detrazioniAnnue),
      addizionaleRegionalePercentuale: this.numero(raw.addizionaleRegionalePercentuale),
      addizionaleComunalePercentuale: this.numero(raw.addizionaleComunalePercentuale),
      carichiFamiliariDetrazioniAnnue: this.numero(raw.carichiFamiliariDetrazioniAnnue),
      applicaSeiScatti: true,
    };
  }

  private numero(value: unknown): number {
    return Number(value) || 0;
  }

  private parseDateInput(value: string): Date {
    const [anno, mese, giorno] = value.split('-').map(Number);

    if (anno && mese && giorno) {
      return new Date(anno, mese - 1, giorno);
    }

    return new Date(value);
  }
}
