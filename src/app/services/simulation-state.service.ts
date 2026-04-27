import { Injectable, signal } from '@angular/core';
import { PensionResult, TipoSimulazione } from './pension-engine.models';

/**
 * Stato condiviso della simulazione tra le pagine.
 * Singleton (providedIn: 'root') con Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class SimulationStateService {
  readonly dataNascita = signal('');
  readonly dataAssunzione = signal('');
  readonly tipoSimulazione = signal<TipoSimulazione | ''>('');
  readonly limiteOrdinamentale = signal<number | null>(null);
  readonly risultato = signal<PensionResult | null>(null);

  /** Resetta tutto lo stato */
  reset(): void {
    this.dataNascita.set('');
    this.dataAssunzione.set('');
    this.tipoSimulazione.set('');
    this.limiteOrdinamentale.set(null);
    this.risultato.set(null);
  }
}
