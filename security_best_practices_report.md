# Security Best Practices Report

Data audit: 2026-04-28

## Executive summary

Ho verificato il progetto Angular/Ionic/PWA `pensionipds` con controlli statici mirati, test automatici, build produzione e audit dipendenze.

Non ho trovato vulnerabilita critiche o alte nel codice applicativo: non risultano sink XSS diretti (`innerHTML`, `eval`, `document.write`, `postMessage` non validati), non risultano token/segreti hardcoded, e il parsing PDF disabilita l'eval di pdf.js.

Sono emersi tre punti da correggere o verificare:

1. Dipendenza dev vulnerabile: `postcss@8.5.6`, advisory moderato.
2. CSP/security headers non visibili nel repository: da configurare/verificare nel deploy.
3. Validazione upload documenti solo lato UI/euristica: va aggiunto un controllo applicativo su MIME/estensione/dimensione prima del parsing.

## Verifiche eseguite

- `npm test`: 8 file, 90 test passati.
- `npm run lint`: nessun errore.
- `npm run build`: build produzione completata.
- `npm run e2e`: 39 test Playwright passati.
- `npm audit --audit-level=moderate`: 1 vulnerabilita moderata.
- Ricerca statica per sink frontend: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, string timeout/interval, `bypassSecurityTrust`, `localStorage`, `sessionStorage`, `postMessage`, redirect/location.
- Ricerca statica per segreti: API key, secret, token, password, private key, authorization, bearer, cookie.

## Critical

Nessuna finding critica identificata.

## High

Nessuna finding alta identificata.

## Medium

### SEC-001: `postcss@8.5.6` vulnerabile nel dependency tree

- Rule ID: JS-DEP-001
- Severity: Medium
- Location: `package-lock.json:12510`, `package-lock.json:1457`
- Evidence:

```json
"node_modules/postcss": {
  "version": "8.5.6"
}
```

```json
"node_modules/@angular/build/node_modules/vite": {
  "dependencies": {
    "postcss": "^8.5.6"
  }
}
```

- Impact: `npm audit` segnala `GHSA-qx2v-qp2m-jg93`, XSS tramite CSS stringify in `postcss <8.5.10`. Nel progetto risulta come dipendenza dev/build, quindi il rischio runtime per gli utenti finali e' inferiore rispetto a una dipendenza servita in produzione, ma rimane un rischio per pipeline di build o contenuti CSS non fidati processati dagli strumenti.
- Fix: eseguire `npm audit fix` e verificare che `postcss` venga risolto almeno a `8.5.10`; poi rilanciare `npm test`, `npm run lint`, `npm run build`, `npm run e2e`.
- Mitigation: evitare di processare CSS proveniente da fonti non fidate nella pipeline fino all'upgrade.
- False positive notes: `npm ls postcss` mostra anche `vite@8.0.10 -> postcss@8.5.12`, ma `@angular/build@21.2.8 -> vite@7.3.2` risolve ancora `postcss@8.5.6`.

### SEC-002: CSP e security headers non visibili nel repository

- Rule ID: JS-CSP-001
- Severity: Medium
- Location: `src/index.html:3`, `src/index.html:22`
- Evidence:

```html
<head>
  ...
  <link rel="manifest" href="manifest.webmanifest" />
</head>
```

- Impact: l'app gestisce documenti fiscali/pensionistici locali. Anche se non ho trovato sink XSS diretti, una CSP forte riduce l'impatto di regressioni future, script injection da dipendenze o contenuti statici compromessi. Gli header potrebbero essere configurati su hosting/CDN e quindi non essere visibili nel repo.
- Fix: preferire header HTTP in hosting/CDN, ad esempio `Content-Security-Policy` con `default-src 'self'`, `script-src 'self'`, `style-src 'self' 'unsafe-inline'` solo se richiesto da Ionic/Angular e da verificare, `img-src 'self' data: blob:`, `font-src 'self' data:`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`.
- Mitigation: se il deploy e' solo statico e non consente header, usare una meta CSP molto precoce in `index.html`, sapendo che non supporta direttive come `frame-ancestors`.
- False positive notes: non e' possibile confermare dagli artefatti locali se il deploy imposta gia questi header. Verificare l'ambiente reale con `curl -I` o strumenti browser.

## Low

### SEC-003: validazione file caricati non centralizzata prima del parsing

- Rule ID: JS-FILE-001
- Severity: Low
- Location: `src/app/caricamento-dati/caricamento-dati.page.html:20`, `src/app/caricamento-dati/caricamento-dati.page.html:90`, `src/app/caricamento-dati/caricamento-dati.page.ts:129`, `src/app/services/document-parser.service.ts:18`
- Evidence:

```html
<input type="file" accept=".xml,.pdf" ... />
<input type="file" accept=".pdf" ... />
```

```ts
const parsed = await this.documentParser.parse(file, tipo);
```

```ts
const formato = this.formatoDocumento(file);
const text = formato === 'xml'
  ? await file.text()
  : await this.estraiTestoPdf(await file.arrayBuffer());
```

- Impact: `accept` e' solo un vincolo UI e puo' essere aggirato. Un file molto grande o con estensione/MIME inattesi viene comunque letto in memoria e passato al parser PDF/XML, con possibile blocco del browser o consumo memoria. Il rischio e' principalmente client-side DoS locale; non ho visto upload verso server.
- Fix: aggiungere una validazione applicativa prima del parsing: estensioni ammesse per tipo documento, MIME ammessi quando disponibili, dimensione massima ragionevole, messaggio di errore esplicito. Per PDF complessi, valutare anche un limite massimo di pagine dopo `getDocument`.
- Mitigation: mantenere `isEvalSupported: false`, `disableFontFace: true` e `useWorkerFetch: false` in pdf.js, gia presenti in `src/app/services/document-parser.service.ts:53`.
- False positive notes: l'utente deve comunque selezionare localmente il file; questo non espone direttamente dati a terzi, ma puo' compromettere disponibilita/UX.

## Positive findings

- Nessun uso rilevato di `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, `postMessage`, `localStorage` o `sessionStorage` nel codice app.
- I file caricati vengono elaborati localmente nel browser; non ho rilevato chiamate HTTP/API per inviare documenti o dati fiscali.
- pdf.js e' configurato con `isEvalSupported: false`, `disableFontFace: true`, `useWorkerFetch: false`.
- I nomi file e i riepiloghi documento sono renderizzati con interpolazione Angular, non con HTML non sanitizzato.

## Debug status

La base funzionale risulta stabile al momento dell'audit:

- Unit test: pass.
- Lint: pass.
- Production build: pass.
- E2E browser: pass.

## Recommended next steps

1. Aggiornare `postcss` tramite `npm audit fix`, con attenzione alle modifiche gia presenti in `package.json` e `package-lock.json`.
2. Aggiungere validazione centralizzata dei file prima di `DocumentParserService.parse`.
3. Definire/verificare gli header di deploy, in particolare CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy` e `Permissions-Policy`.
