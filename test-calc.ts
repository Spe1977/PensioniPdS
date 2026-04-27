import { PensionEngineService } from './src/app/services/pension-engine.service';

const service = new PensionEngineService();
const dataNascita = new Date(1977, 4, 23); // 23 May 1977 (month is 0-indexed)
const dataAssunzione = new Date(1998, 8, 30); // 30 Sep 1998

const result = service.calcolaDataPensionamentoLimitiEta(dataNascita, dataAssunzione, 60);
console.log('Maturazione diritto:', result.dataMaturazioneDiritto);
console.log('Decorrenza:', result.dataDecorrenza);
console.log('Servizio Utile Anni:', result.servizioUtile.anni);
console.log('Servizio Utile Mesi:', result.servizioUtile.mesi);
console.log('Requisiti applicati:', result.requisitiApplicati);
