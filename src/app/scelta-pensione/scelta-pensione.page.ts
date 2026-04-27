import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonRadioGroup,
  IonRadio,
  IonSelect,
  IonSelectOption,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowForwardOutline, arrowBackOutline } from 'ionicons/icons';
import { SimulationStateService } from '../services/simulation-state.service';
import { TipoSimulazione } from '../services/pension-engine.models';

@Component({
  selector: 'app-scelta-pensione',
  templateUrl: './scelta-pensione.page.html',
  styleUrls: ['./scelta-pensione.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonRadioGroup,
    IonRadio,
    IonSelect,
    IonSelectOption,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
  ],
})
export class SceltaPensionePage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(SimulationStateService);

  sceltaForm: FormGroup;

  constructor() {
    addIcons({ arrowForwardOutline, arrowBackOutline });

    this.sceltaForm = this.fb.group({
      tipoSimulazione: ['', Validators.required],
      limiteOrdinamentale: [''],
    });

    // Update validators based on selection
    this.sceltaForm.get('tipoSimulazione')?.valueChanges.subscribe((tipo) => {
      const limiteControl = this.sceltaForm.get('limiteOrdinamentale');
      if (tipo === 'limiti_eta') {
        limiteControl?.setValidators([Validators.required]);
      } else {
        limiteControl?.clearValidators();
        limiteControl?.setValue('');
      }
      limiteControl?.updateValueAndValidity();
    });
  }

  onContinua() {
    if (this.sceltaForm.valid) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Salva la scelta nello state condiviso
      const tipo = this.sceltaForm.value.tipoSimulazione as TipoSimulazione;
      this.state.tipoSimulazione.set(tipo);
      if (tipo === 'limiti_eta') {
        this.state.limiteOrdinamentale.set(Number(this.sceltaForm.value.limiteOrdinamentale));
      } else {
        this.state.limiteOrdinamentale.set(null);
      }
      this.router.navigate(['/caricamento-dati']);
    } else {
      this.sceltaForm.markAllAsTouched();
    }
  }
}
