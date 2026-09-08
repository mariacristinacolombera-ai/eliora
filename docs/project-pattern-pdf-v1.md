# Project Pattern PDF V1 — implementazione e verifica

## Stato ripreso

Il working tree conteneva già modifiche non committate a domain, normalizer,
repository Projects/Storage, migration, azioni con compensazione, coda e UI PDF.
Il lavoro è stato proseguito senza reset o ricostruzione da zero. La build del
codice ripreso passa; non rimangono import incompleti, TODO o errori TypeScript.
La parte da chiudere era soprattutto la verifica dei percorsi di errore,
del parsing, del viewer e della persistenza concorrente.

Il pass finale ha completato i controlli del PDF protetto, il recupero dagli
errori del lettore/salvataggio pagina, la cancellazione degli stream scaricati,
la distribuzione delle licenze degli asset PDF.js e i controlli ripetibili.
Le mutation di pagina e contatore sono funzioni specifiche Projects nello stesso
modulo delle altre azioni, usate sia da App sia dai controlli automatici.

## File finali

Modificati:

- `apps/web/package.json`, `apps/web/pnpm-lock.yaml`: dipendenze PDF.
- `apps/web/vite.config.ts`: worker e asset locali PDF.js.
- `apps/web/src/domain/Project.ts`: contratto authoring PDF interno e lettura legacy.
- `apps/web/src/domain/normalizeProject.ts`: normalizzazione PDF senza effetti collaterali.
- `apps/web/src/lib/projectsRepository.ts`: lettura puntuale affidabile.
- `apps/web/src/App.tsx`: coda per Project e callback di mutation.
- `apps/web/src/pages/ProjectsShell.tsx`, `ProjectsShell.css`: workspace, azioni e contatore sticky.

Creati:

- `apps/web/src/lib/projectPatternsRepository.ts`: file ID, path, upload, delete, signed URL e download.
- `apps/web/src/lib/projectPatternActions.ts`: mutation e compensazione, coda specifica Projects.
- `apps/web/src/lib/projectPdfRuntime.ts`: configurazione e parsing PDF.js.
- `apps/web/src/lib/projectPdfPageState.ts`: clamp e debounce.
- `apps/web/src/pages/ProjectWorkspace.tsx`: upload/replace/remove e azione delete.
- `apps/web/src/pages/ProjectPdfViewer.tsx`, `ProjectPdfViewer.css`: lettore a pagina singola.
- `apps/web/scripts/check-project-pattern.cjs`: harness persistente, senza framework aggiuntivo.
- `supabase/migrations/20260908000000_create_project_patterns_bucket.sql`.
- Questo report.

Nessuna modifica ai file Recipes o alla relativa logica in App. Nessun generic
Storage layer, secret, fixture temporanea o commit. Il form Create mantiene
l'ID lazy e la semantica esistenti. Details resta un placeholder con la sola
azione di eliminazione necessaria al cleanup.

## Contratto, Storage e validazione

L'authoring usa `ProjectPdfPattern`: `fileId` e `storagePath` obbligatori,
`title`/`sourceUrl` opzionali e `viewerState.page` intero 1-based. La lettura
legacy è tollerata ma non viene trasformata in un upload. Un path esistente
viene conservato dal normalizer; il repository ne verifica utente, Project e
fileId prima di usarlo. Nessun UUID nasce nel normalizer.

Il bucket `project-patterns` è privato, ammette `application/pdf` e massimo
5 MiB. Ogni file usa `<userId>/<projectId>/<uuid-v4>.pdf`; il filename utente
serve solo come titolo. UUID via `crypto.randomUUID`, con fallback sicuro
`crypto.getRandomValues`. Upload con `upsert: false`, senza UPDATE policy.
INSERT richiede un Project dell'utente; SELECT e DELETE richiedono la cartella
dell'utente. DELETE non dipende dall'esistenza del Project.

Il client controlla dimensioni, magic bytes `%PDF-`, parsing del documento e
delle pagine con PDF.js. MIME e suffisso non sono prove sufficienti. PDF vuoti,
oltre limite, non leggibili e cifrati/protetti sono rifiutati prima dell'upload,
anche se la password di apertura è vuota ma il documento ha protezione owner.
Il loading task di validazione viene distrutto in `finally`.

Le signed URL durano un'ora e restano solo in memoria. Il viewer scarica al
massimo 5 MiB di bytes, annulla il download all'unmount e rinnova l'URL una sola
volta per risposta 400/401/403. Nessun URL di accesso entra nel Project o nei log
dell'applicazione. I task/canvas del viewer sono gestiti da React-PDF.

## Viewer e scritture

React-PDF è lazy; PDF.js viene richiesto quando si valida un upload o si apre
un PDF. Recipes e lista Projects non hanno un import statico del motore.
Worker, CMaps, font standard e WASM vengono serviti localmente, con le licenze.

Una pagina alla volta, precedente/successiva, `Pagina N di M`, zoom 75–200%,
Adatta, overflow orizzontale confinato al viewer e contatore sticky. Nessun
blocco del pinch zoom globale. Loading, download, password, rendering e lazy
loader hanno percorsi di errore visibili. Il counter resta fuori dall'error
boundary del lettore.

La pagina cambia subito, viene salvata dopo 500 ms e il pending viene inoltrato
all'unmount. La riapertura parte dal dato salvato e corregge gli indici oltre
`numPages`. Le mutation includono il fileId atteso: dopo replace/remove, gli
eventi del precedente file non scrivono.

La coda in App esegue una mutation alla volta per Project, leggendo lo stato
confermato più recente all'inizio dell'operazione. Il recupero via **Ricarica
progetti** chiude la vecchia coda e attende la scrittura attiva prima di
ricaricare: non apre una seconda coda mentre la prima sta ancora scrivendo.
Pagina, counter e cambi
pattern passano tutti dalla coda. Il counter non scende sotto zero; il doppio
click durante la richiesta è bloccato anche con un ref.

## Compensazione

- Upload fallito: nessuna associazione o modifica al Project.
- Save fallito: lettura puntuale con esito `found`, `not_found`, `invalid` o `read_error`.
- Remoto associato al nuovo fileId/path: riconciliazione dello stato.
- Remoto sicuramente non associato: cleanup best-effort del nuovo file.
- Remoto ambiguo o inutilizzabile: file conservato e coda bloccata fino a ricaricamento.
- Replace: nuovo oggetto, pagina 1; cleanup vecchio solo dopo conferma del save.
- Remove: salva senza pattern prima di cancellare il file, con conferma UI.
- Delete: elimina il record prima del cleanup; se la risposta fallisce, richiede conferma di assenza dal remoto.
- Cleanup fallito: avviso/log con soli identificatori/path; il save confermato non viene annullato.

## Verifiche eseguite

Harness ripetibile dalla directory `apps/web`:

```powershell
node scripts/check-project-pattern.cjs
```

17 test passano, usando i moduli TypeScript reali, trasposti con il TypeScript
già presente nel progetto. Il trasporto repository è simulato per forzare
risposte perse, errori e cleanup falliti. Nessuna richiesta di rete nei test.

Nel browser Chromium dell'app sono stati usati App, route, repository client,
React-PDF, worker e validazione reali, con il solo trasporto Supabase simulato.
Le fixture erano un PDF di tre pagine e varianti non-PDF, corrotte e cifrate.
L'entry di prova, le fixture e lo store temporaneo sono stati rimossi.

| Verifica (lettere del prompt di ripresa) | Esito e livello |
| --- | --- |
| A: PDF valido | Browser: parsing, input file, associazione e rendering riusciti |
| B: non-PDF | Browser: rifiutato anche con MIME application/pdf |
| C: oltre 5 MiB | Browser e harness: rifiutato |
| D: PDF corrotto | Browser: rifiutato dal parsing |
| E: PDF protetto | Browser: rifiutati password di apertura e sola protezione owner |
| F: upload failure | Harness: Project invariato, nessun save |
| G: upload + save | Browser con backend simulato e harness |
| H: save fallito, remoto non associato | Harness: elimina solo il nuovo file e riconcilia il vecchio |
| I: risposta persa, remoto associato | Harness: associazione riconosciuta, nessuna cancellazione del nuovo |
| J: replace success | Harness: save prima del cleanup vecchio |
| K: replace failure | Harness: vecchio modello conservato |
| L: remove success | Harness: dissociazione prima del cleanup |
| M: cleanup failure | Harness: stato salvato mantenuto e warning |
| N: pagina salvata | Browser: passaggi fino a pagina 3 persistiti nel trasporto simulato |
| O: pagina ripristinata | Browser: uscita/lista/rientro a pagina 3, counter conservato |
| P: clamp | Browser: dato 99 corretto e risalvato a 3 dopo reload |
| Q: debounce | Harness: timer 500 ms, ultimo valore, flush all'uscita e retry |
| R: counter + pagina | Harness serializzato e browser: entrambi conservati |
| S: delete cleanup | Harness: ordine, risposta persa e cleanup failure |

Altri controlli: MIME assente/errato con PDF valido accettato; file vuoto
rifiutato; UUID senza randomUUID; ownership path; signed URL rinnovata una sola
volta; stream troppo grande cancellato; lettura remota invalida distinta
dall'assenza; eventi vecchi ignorati dopo replace/remove.

`/projects`, `/projects/new` e `/projects/:id` renderizzano nell'App del banco
di prova; creazione del titolo e visualizzazione della data funzionanti.
Nessun errore React nella console osservata durante parsing, mount, cambio
pagina, zoom e reload. Il controllo del dialogo nativo di rimozione ha bloccato
lo strumento browser: conferma/cancellazione del dialogo e flusso UI di delete
vanno verificati manualmente. Il test automatico delle azioni è completato.

## Build e limiti della verifica

Dipendenze esatte: `react-pdf@10.5.0`, `pdfjs-dist@5.4.296`, una sola versione
PDF.js nel lockfile. Nessuna libreria UI/UUID/test aggiuntiva.

Build TypeScript/Vite riuscita; dimensioni arrotondate:

| Output | Raw | Gzip |
| --- | ---: | ---: |
| Viewer JS lazy | 28,49 kB | 10,01 kB |
| Runtime PDF lazy | 395,30 kB | 115,89 kB |
| Worker PDF | 1.046,21 kB | non riportato da Vite |
| Viewer CSS | 3,32 kB | 1,13 kB |
| Main JS | 538,25 kB | 152,91 kB |

Vite segnala il chunk main oltre 500 kB. Lint termina con codice 0 e il solo
warning preesistente `react-hooks/exhaustive-deps` in `Recipes.tsx:181`.
`git diff --check` passa; Git segnala solo la conversione LF/CRLF prevista
dalla configurazione Windows. `git status` contiene esclusivamente i 19 file
elencati sopra, non staged; HEAD resta `0f95037` e non sono stati fatti commit.

Non verificati contro servizi reali: applicazione SQL, RLS con due utenti,
upload/download Supabase, durata effettiva delle signed URL e reload dei dati
dal database. Non verificati Safari/iOS, pinch su hardware mobile, PDF molto
grandi come numero di pagine o dimensioni raster e interruzione forzata della
scheda durante una scrittura.

La coda protegge questa istanza App, non scritture simultanee da più tab o
dispositivi. Storage e database non formano una transazione: una chiusura della
scheda o una risposta upload persa può lasciare un file orfano; gli esiti
inconcludenti lo conservano deliberatamente. Il limite di 5 MiB non limita
automaticamente memoria/CPU necessarie a decodificare un PDF complesso.

## Migration e sequenza manuale

La migration non è stata applicata. Dalla root del repository, con il progetto
Supabase già collegato secondo la procedura esistente:

```powershell
Set-Location C:\Projects\Eliora
npx supabase db push
```

Controllare l'elenco delle migration pendenti mostrato dalla CLI prima di
confermare. Il nuovo file atteso è `20260908000000_create_project_patterns_bucket.sql`.

1. Avviare il frontend da `apps/web` con `pnpm run dev` e accedere nel browser abituale.
2. Aprire DevTools Network con cache disabilitata: visitare Recipes e `/projects`; prima di aprire/caricare un PDF non devono partire richieste al runtime/worker PDF.
3. Da `/projects/new` compilare titolo e data, premere **Inizia progetto** e verificare il workspace senza modello.
4. Aggiungere un PDF locale di almeno tre pagine, sotto 5 MiB. Verificare una sola pagina, toolbar e counter. Nel database il pattern deve contenere fileId/path/page, senza signed URL; nello Storage deve esserci un solo oggetto sotto utente/Project.
5. Ripetere con non-PDF rinominato `.pdf`, file vuoto, oltre limite, corrotto e protetto: errore chiaro e associazione invariata.
6. Cambiare rapidamente pagina e incrementare il contatore. Attendere un secondo, uscire in lista, rientrare e ricaricare il browser: ultima pagina e counter devono restare corretti. Verificare che il JSON preservi entrambi.
7. In un Project di prova impostare nel DB `pattern.viewerState.page` a 999; riaprire: ultima pagina disponibile e valore corretto risalvato.
8. Sostituire con un altro PDF: nuovo fileId/path e pagina 1; il vecchio oggetto va eliminato solo dopo il save. Bloccando la richiesta di update a `rest/v1/projects` con DevTools, il vecchio modello deve restare operativo; ripristinare rete e ricaricare.
9. **Rimuovi modello**: annullare prima il dialogo e verificare che nulla cambi; poi confermare. Project senza pattern e file eliminato. Simulare un errore DELETE Storage: Project ancora senza pattern e avviso di cleanup.
10. Aggiungere nuovamente un PDF, aprire **Dettagli progetto → Elimina progetto**, confermare: ritorno alla lista, record assente, file eliminato. Ripetere bloccando il DELETE Storage: Project eliminato, avviso e file orfano conservato.
11. Con un secondo utente verificare che non possa leggere, firmare, inserire o cancellare oggetti del primo; verificare che INSERT senza un Project proprio e overwrite vengano negati. DELETE di un proprio file orfano deve riuscire anche dopo la rimozione del Project.
12. Su telefono e Safari/iOS ripetere apertura, scroll, zoom e counter: counter visibile durante lo scroll, una sola pagina e overflow confinato al lettore. Controllare console e richieste worker/font/WASM.

I casi di risposta persa dopo save e lettura inconcludente sono riproducibili
in modo deterministico nell'harness; un semplice toggle Offline non garantisce
quale operazione il server abbia già completato.
