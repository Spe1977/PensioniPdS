import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, arrowForwardOutline } from 'ionicons/icons';
import { SimulationStateService } from '../services/simulation-state.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, IonContent, IonItem, IonLabel, IonInput, IonButton, IonIcon],
})
export class HomePage {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private state = inject(SimulationStateService);

  homeForm: FormGroup = this.fb.nonNullable.group({
    dataNascita: ['', Validators.required],
    dataAssunzione: ['', Validators.required],
  });

  constructor() {
    addIcons({ trashOutline, arrowForwardOutline });
  }

  onAvanti() {
    if (this.homeForm.valid) {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      // Salva i dati nello state condiviso
      this.state.dataNascita.set(this.homeForm.value.dataNascita!);
      this.state.dataAssunzione.set(this.homeForm.value.dataAssunzione!);
      this.router.navigate(['/scelta-pensione']);
    } else {
      this.homeForm.markAllAsTouched();
    }
  }

  onCancella() {
    this.homeForm.reset();
    this.state.reset();
  }
}
