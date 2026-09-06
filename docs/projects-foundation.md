# Projects V1 — fondazione tecnica

## Architettura e confini

Dominio, normalizer e repository indipendenti da Recipes. Nessuna astrazione
condivisa, modifica al dominio Recipe o infrastruttura di test aggiunta.
Il repository locale non contiene la migration della tabella recipes: lo stile
JSON e i filtri user_id sono verificati nel codice; le policy remote Recipes
non sono state verificate. La migration Storage esistente usa auth.uid() e
policy riservate ad authenticated, convenzione adottata anche qui.

## Modello e normalizzazione

Project contiene id, title, status, workState obbligatori e startedAt,
completedAt, description, pattern, selectedSize, yarns, needles, updates,
completion opzionali. I sottotipi seguono Project V1: pattern web/pdf/image,
viewerState predisposto, quantità g/skeins, ferri in mm, due counter,
update testuali e/o fotografici e note di completamento discorsive.

Differenza intenzionale dalla grammatica iniziale: startedAt è opzionale nel
tipo, perché le regole di lettura richiedono di conservare progetti senza data
valida senza inventarla. Il futuro flusso di creazione dovrà fornire una data
valida prima di chiamare createProject, insieme all'ID. Questa invariante di
authoring non è ancora implementata: createProject accetta il modello runtime.
Il normalizer non genera né date né UUID; nessun Create flow è stato aggiunto.

Solo id/title inutilizzabili escludono il progetto. Status valido preservato;
altrimenti inferito esclusivamente da completedAt valido. Completion non
influenza status. Le date usano stringhe trimmed accettate da Date.parse,
come la convenzione di lettura Recipe: non viene imposta una nuova grammatica
ISO. Il futuro form potrà produrre ISO esplicito.

WorkState viene ricostruito con primaryCounter.value = 0 quando necessario.
Interi invalidi non vengono arrotondati: value torna a zero, target/resetEvery
vengono omessi. URL assoluti HTTP/HTTPS, riferimenti immagine deduplicati,
quantità e ferri validati; elementi irrecuperabili rimossi con diagnostics.
Update solo foto preservati, anche senza data: non sono databili come recenti.
Oggetti completion vuoti omessi. Campi estranei non vengono copiati.
Le proprietà opzionali possono avere valore undefined, come in Recipe;
la serializzazione JSON le omette.

ID nested mancanti: legacy-{yarn|needle|update}:{projectId}:{indice originale}.
Sono deterministici sullo stesso input; riordinare import privi di ID ne cambia
il fallback. Per ogni collezione vengono riservati tutti gli ID espliciti trimmed
(anche quelli successivi e quelli su elementi poi esclusi). Un set separato
registra gli ID assegnati agli elementi recuperabili. Se il fallback collide,
si prova :1, :2, ... fino al primo ID libero, con issue disambiguated_legacy_id.
Gli ID espliciti non vengono rinominati: tra elementi recuperabili con lo stesso
ID si conserva il primo, escludendo i successivi con issue duplicate_explicit_id.
Nessun merge implicito, hash o UUID casuale. Gli scarti sono solo runtime durante
load; una successiva write esplicita salva il payload canonico.

## Identità canonica Projects

L'ID canonico è una stringa non vuota uguale al proprio String.trim(); spazi
interni e caratteri non rimossi da trim restano validi. Il normalizer mantiene
questa regola. Il vincolo SQL usa btrim con l'elenco esplicito dei 25 caratteri
ECMAScript WhiteSpace/LineTerminator, inclusi NBSP e BOM, non il btrim predefinito.
Impone PK non vuota/canonica, payload oggetto con id stringa e data.id = PK:
quindi anche data.id deve essere canonico. Non introduce una grammatica UUID.

Load confronta row.id, data.id originale e ID normalizzato: devono coincidere
esattamente. Ogni mismatch esclude la riga con log project_identity_mismatch,
senza correggere il DB o scegliere implicitamente una diversa identità.
Create/update normalizzano prima della write; delete applica lo stesso trim
all'ID e rifiuta un ID vuoto prima della richiesta. Update usa l'ID canonico sia
nel filtro sia nel JSON; create lo usa per PK e JSON.

## Persistence e migration manuale

Applicare manualmente `supabase/migrations/20260906000000_create_projects.sql`
all'ambiente Supabase di destinazione tramite il normale flusso migrations.
Non è stata applicata durante questo lavoro.

Tabella public.projects indipendente: id text primary key, user_id UUID verso
auth.users con cascade, data JSONB, created_at e updated_at timestamptz.
Vincolo di corrispondenza tra ID della riga e del JSON, indice user/data di
creazione, RLS per SELECT/INSERT/UPDATE/DELETE del solo proprietario.
updated_at è aggiornato dal repository; non viene aggiunto un trigger.

projectsRepository esporta loadProjects, createProject, updateProject,
deleteProject. Tutte richiedono autenticazione; lettura/update/delete filtrano
user_id oltre alle policy RLS. Create usa insert (non upsert); update richiede
una riga esistente. Scritture normalizzate restituiscono il Project canonico.
Load normalizza senza riscrivere il DB e registra diagnostics; righe radicalmente
invalide escluse. Delete riguarda soltanto la riga, senza azioni sui file.

## Stato e routing

App mantiene Projects separato con idle/loading/ready/error, reset al cambio
utente, cleanup delle richieste obsolete e retry dopo errore. Cleanup significa
ignorare risultati tardivi, non interrompere la richiesta di rete. Il bootstrap
getSession viene ignorato dopo un evento auth più recente o dopo unmount;
la subscription viene rimossa al cleanup. Nessun nuovo layer auth.
Le shell mostrano
errore, caricamento, lista vuota e progetto non trovato distintamente.
Sono disponibili /projects, /projects/new, /projects/:id, /projects/:id/edit.
Le operazioni di scrittura sono esportate dal repository ma non collegate a
form o pulsanti operativi in questo passaggio.

AreasSection usa path per Ricette e Progetti, senza special-case recipes.

## Verifiche e lavoro futuro

- pnpm run build: passato; warning bundle oltre 500 kB.
- pnpm run lint: passato; warning preesistente sulle dipendenze useEffect
  in src/pages/Recipes.tsx:181, file non modificato.
- git diff --check: passato.
- Nessun runner/test pertinente configurato: nessun framework introdotto.
- Migration, CRUD autenticato e isolamento RLS non verificati su database vivo.
- Verifiche in memoria A-G passate: ID canonico, whitespace esterno, mismatch
  row/payload/runtime esclusi senza write (repository con client simulato),
  fallback semplici, collisioni anche con ID espliciti successivi e suffissi,
  duplicati espliciti, determinismo. Verificate tutte e tre le collezioni,
  non mutazione input e idempotenza del payload normalizzato.
- Elenco trim SQL confrontato con String.trim su tutti i caratteri BMP:
  corrispondenza esatta dei 25 caratteri nel runtime locale. Non è un'esecuzione SQL.
- Verifiche in memoria bootstrap auth: risultato normale applicato, risultato
  dopo evento auth ignorato, risultato dopo unmount ignorato e unsubscribe.

Casi prioritari per futuri test automatici: root privo di id/title; combinazioni
status/completedAt/completion; date mancanti e invalide; workState assente;
counter negativi/frazionari/NaN/Infinity; URL relativi o schemi non HTTP;
PDF con uno solo dei riferimenti validi; immagini vuote e duplicate; quantità
zero e unità invalide; ferri zero; update foto-only senza data; completion vuota;
ID fallback deterministici, non mutazione e idempotenza del payload normalizzato.
Test integrazione futuri: isolamento tra utenti, update inesistente, conflitto
create, errore load/retry, cambio utente durante load e route dirette.

Restano fuori: UI operativa, form, viewer/iframe/PDF reader, upload e Storage,
scroll persistence, Drive/import/Ravelry, media lifecycle, UI Updates e cronologia
automatica dei counter. Nessun commit effettuato.
