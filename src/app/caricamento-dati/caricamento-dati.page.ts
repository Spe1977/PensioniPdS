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
  DocumentParserService,
  ParsedDocumentData,
  ParsedPeriodoContributivo,
  TipoDocumentoPensione,
} from '../services/document-parser.service';
import {
  ContributoAnnuale,
  PensioneNettaAnzianitaInput,
  PensionResult,
  ScenarioCalcoloPensione,
  TassoRivalutazioneManuale,
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
  private documentParser = inject(DocumentParserService);

  filesForm: FormGroup;

  // Nomi dei file selezionati per feedback UI
  fileNames = {
    inps: '',
    cu: '',
    bustaPaga: '',
  };
  parsedDocuments: ParsedDocumentData[] = [];
  parsingError = '';

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
      anniQuotaA: [0, [Validators.min(0)]],
      anniQuotaB: [0, [Validators.min(0)]],
      retribuzionePensionabileFinale: [0, [Validators.min(0)]],
      imponibile1996: [0, [Validators.min(0)]],
      percentualeRivalutazioneQuotaB: [0, [Validators.min(0), Validators.max(100)]],
      contributiFuturi: this.fb.array([]),
    });
  }

  isSistemaMisto(): boolean {
    return this.filesForm.get('scenarioPensione')?.value !== 'contributivo_puro';
  }

  get contributiFuturi() {
    return this.filesForm.get('contributiFuturi') as FormArray;
  }

  aggiungiContributoFuturo() {
    const contributoForm = this.fb.group({
      anno: ['', [Validators.required, Validators.min(2020), Validators.max(2100)]],
      importo: ['', [Validators.required, Validators.min(0)]],
      tassoRivalutazione: ['1.0', [Validators.required, Validators.min(0)]],
    });
    this.contributiFuturi.push(contributoForm);
  }

  rimuoviContributoFuturo(index: number) {
    this.contributiFuturi.removeAt(index);
  }

  async onFileSelected(event: Event, tipo: TipoDocumentoPensione) {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (file) {
      this.fileNames[tipo] = file.name;
      this.filesForm.patchValue({ [`${tipo}File`]: file });
      this.parsingError = '';

      try {
        const parsed = await this.documentParser.parse(file, tipo);
        this.parsedDocuments = [
          ...this.parsedDocuments.filter((documento) => documento.tipo !== tipo),
          parsed,
        ];
        this.filesForm.patchValue(parsed.values);
        this.aggiornaSistemaPensionisticoAutomatico();
      } catch (error) {
        this.parsingError =
          error instanceof Error
            ? error.message
            : 'Documento non leggibile. Inserisci o correggi i dati manualmente.';
      }
    }
  }

  onCalcola() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const tipo = this.state.tipoSimulazione();
    const dataNascita = this.parseDateInput(this.state.dataNascita());
    const dataAssunzione = this.parseDateInput(this.state.dataAssunzione());
    this.aggiornaSistemaPensionisticoAutomatico();

    if (tipo === 'anzianita') {
      const risultato = this.engine.calcolaDataPensionamento(dataNascita, dataAssunzione);
      risultato.pensioneNetta = this.engine.calcolaPensioneNettaAnzianita(
        this.creaInputPensioneNettaAnzianita(dataNascita, risultato),
      );
      this.state.risultato.set(risultato);
    }

    if (tipo === 'eta_anzianita') {
      const risultato = this.engine.calcolaDataPensionamentoEtaAnzianita(
        dataNascita,
        dataAssunzione,
      );
      risultato.pensioneNetta = this.engine.calcolaPensioneNettaEtaAnzianita(
        this.creaInputPensioneNettaAnzianita(dataNascita, risultato),
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
        ...this.creaInputPensioneNettaAnzianita(dataNascita, risultato),
        applicaMoltiplicatore: true,
      });
      this.state.risultato.set(risultato);
    }

    // Naviga alla pagina risultati
    this.router.navigate(['/risultati']);
  }

  private creaInputPensioneNettaAnzianita(
    dataNascita: Date,
    risultato: PensionResult,
  ): PensioneNettaAnzianitaInput {
    const raw = this.filesForm.getRawValue();
    const coefficienteTrasformazione =
      this.engine.getCoefficienteTrasformazionePerData(dataNascita, risultato.dataDecorrenza) ??
      this.numero(raw.coefficienteTrasformazione);

    return {
      scenario: raw.scenarioPensione as ScenarioCalcoloPensione,
      quotaRetributivaAnnua: this.numero(raw.quotaRetributivaAnnua),
      montanteContributivo: this.numero(raw.montanteContributivo),
      annoBaseMontante: this.numero(raw.annoBaseMontante) || 2025,
      annoCalcolo: risultato.dataDecorrenza.getFullYear(),
      contributiAnnuali: this.contributiAnnualiDaDocumenti(),
      contributiFuturi: this.contributiFuturiDaForm(),
      tassiRivalutazioneManuali: this.tassiRivalutazioneManualiDaForm(),
      coefficienteTrasformazione,
      ultimoImponibileAnnuo: this.numero(raw.ultimoImponibileAnnuo),
      detrazioniAnnue: this.numero(raw.detrazioniAnnue),
      addizionaleRegionalePercentuale: this.numero(raw.addizionaleRegionalePercentuale),
      addizionaleComunalePercentuale: this.numero(raw.addizionaleComunalePercentuale),
      carichiFamiliariDetrazioniAnnue: this.numero(raw.carichiFamiliariDetrazioniAnnue),
      applicaSeiScatti: true,
      quoteMiste: this.creaQuoteMisteDaForm(raw),
    };
  }

  private creaQuoteMisteDaForm(raw: Record<string, unknown>) {
    const anniQuotaA = this.numero(raw['anniQuotaA']);
    const anniQuotaB = this.numero(raw['anniQuotaB']);
    const retribuzionePensionabileFinale = this.numero(raw['retribuzionePensionabileFinale']);
    const imponibile1996 = this.numero(raw['imponibile1996']);
    const percentualeRivalutazioneQuotaB = this.numero(raw['percentualeRivalutazioneQuotaB']) / 100;

    const haDati =
      anniQuotaA > 0 || anniQuotaB > 0 || retribuzionePensionabileFinale > 0 || imponibile1996 > 0;
    if (!haDati) return undefined;

    return {
      anniQuotaA,
      anniQuotaB,
      retribuzionePensionabileFinale,
      imponibile1996,
      percentualeRivalutazioneQuotaB,
    };
  }

  sistemaPensionisticoLabel(): string {
    const scenario = this.determinaSistemaPensionistico();
    if (scenario === 'retributivo_pro_rata') return 'Retributivo pro-rata';
    if (scenario === 'misto') return 'Misto';
    return 'Contributivo puro';
  }

  sistemaPensionisticoFonte(): string {
    const periodi = this.periodiContributiviDaDocumenti();
    if (periodi.length > 0) {
      return 'Rilevato dai periodi contributivi INPS caricati.';
    }

    return 'Stimato dalla data di arruolamento inserita.';
  }

  private aggiornaSistemaPensionisticoAutomatico(): void {
    this.filesForm.patchValue(
      { scenarioPensione: this.determinaSistemaPensionistico() },
      { emitEvent: false },
    );
  }

  private determinaSistemaPensionistico(): ScenarioCalcoloPensione {
    const dataAssunzione = this.parseDateInput(this.state.dataAssunzione());
    const periodi = this.periodiContributiviDaDocumenti();
    const primeDate = [
      ...periodi.map((periodo) => periodo.dal),
      ...(Number.isFinite(dataAssunzione.getTime()) ? [dataAssunzione] : []),
    ].filter((data) => Number.isFinite(data.getTime()));

    if (primeDate.length === 0) {
      return 'contributivo_puro';
    }

    const primoContributo = new Date(Math.min(...primeDate.map((data) => data.getTime())));
    if (primoContributo >= new Date(1996, 0, 1)) {
      return 'contributivo_puro';
    }

    return this.mesiContributiviAnte1996(dataAssunzione, periodi) >= 18 * 12
      ? 'retributivo_pro_rata'
      : 'misto';
  }

  private mesiContributiviAnte1996(
    dataAssunzione: Date,
    periodi: ParsedPeriodoContributivo[],
  ): number {
    const limite = new Date(1995, 11, 31);
    const mesi = new Set<number>();

    if (Number.isFinite(dataAssunzione.getTime()) && dataAssunzione <= limite) {
      this.aggiungiMesiPeriodo(mesi, dataAssunzione, limite);
    }

    periodi.forEach((periodo) => this.aggiungiMesiPeriodo(mesi, periodo.dal, periodo.al));

    return mesi.size;
  }

  private aggiungiMesiPeriodo(mesi: Set<number>, dal: Date, al: Date): void {
    const inizio = new Date(Math.max(dal.getTime(), new Date(1900, 0, 1).getTime()));
    const fine = new Date(Math.min(al.getTime(), new Date(1995, 11, 31).getTime()));
    if (inizio > fine) return;

    let anno = inizio.getFullYear();
    let mese = inizio.getMonth();
    const ultimoMese = fine.getFullYear() * 12 + fine.getMonth();

    while (anno * 12 + mese <= ultimoMese) {
      mesi.add(anno * 12 + mese);
      mese++;
      if (mese > 11) {
        mese = 0;
        anno++;
      }
    }
  }

  private numero(value: unknown): number {
    return Number(value) || 0;
  }

  private contributiAnnualiDaDocumenti(): ContributoAnnuale[] {
    return this.parsedDocuments.flatMap((documento) => documento.values.contributiAnnuali ?? []);
  }

  private periodiContributiviDaDocumenti(): ParsedPeriodoContributivo[] {
    return this.parsedDocuments.flatMap((documento) => documento.periodiContributivi ?? []);
  }

  private contributiFuturiDaForm(): ContributoAnnuale[] {
    return this.contributiFuturi.controls
      .map((control) => ({
        anno: Math.trunc(this.numero(control.get('anno')?.value)),
        importo: this.numero(control.get('importo')?.value),
      }))
      .filter((contributo) => contributo.anno > 0 && contributo.importo > 0);
  }

  private tassiRivalutazioneManualiDaForm(): TassoRivalutazioneManuale[] {
    return this.contributiFuturi.controls
      .map((control) => ({
        anno: Math.trunc(this.numero(control.get('anno')?.value)),
        tassoPercentuale: this.numero(control.get('tassoRivalutazione')?.value),
      }))
      .filter((tasso) => tasso.anno > 0);
  }

  private parseDateInput(value: string): Date {
    const [anno, mese, giorno] = value.split('-').map(Number);

    if (anno && mese && giorno) {
      return new Date(anno, mese - 1, giorno);
    }

    return new Date(value);
  }
}
