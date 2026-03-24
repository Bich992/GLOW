# ⏱ TIMELY
## *Il primo social network dove il tempo è la valuta*

---

# 1. IL PROBLEMA

I social network tradizionali creano dipendenza dall'accumulo:
- Più follower hai, più visibilità hai — per sempre
- I post restano online in eterno, seppelliti dall'algoritmo
- Chi arriva tardi non ha mai voce
- L'attenzione è infinita e quindi vale zero

**Il risultato:** contenuti mediocri che dominano, voci nuove che non emergono mai, e utenti passivi che scrollano senza partecipare.

---

# 2. LA VISIONE

> **"Ogni momento conta. Ma solo per un momento."**

Timely ripensa il social network partendo da un'idea semplice:
**l'attenzione è una risorsa limitata, e come tale deve avere un valore.**

In Timely ogni post nasce, vive e muore. Non esiste storia permanente. Non esiste archivio. Esiste solo **adesso**.

Questo cambia tutto:
- Il contenuto deve valere il tempo che gli dedichi
- La comunità decide collettivamente cosa sopravvive
- Partecipare attivamente viene ricompensato

---

# 3. COME FUNZIONA

## La regola fondamentale
Ogni post ha **6 ore di vita**. Poi scompare.

```
Pubblichi → [6 ore di vita] → Scade
              ↑
    La community può estendere o amplificare
```

## Il ciclo di vita di un post

```
NASCITA          VITA                    FINE
   │                │                     │
Pubblichi      Like → +TIMT al creator   Scade
(costi 1 TIMT) Commenti → +TIMT          oppure...
               Boost → priorità feed
               Extend → +tempo           Sopravvive
```

---

# 4. L'ECONOMIA TIMT

**TIMT** è la valuta interna di Timely. Non è una crypto — è un sistema di reputazione economica che premia la partecipazione di qualità.

## Come si guadagna TIMT

| Azione | Guadagno |
|--------|----------|
| Ricevi un like sul tuo post | +0.05 TIMT |
| Ricevi un commento valido (min 10 char) | +0.20 TIMT |
| Il tuo post raggiunge ER60 ≥ 10 | +0.50 TIMT ogni 6h |
| Ricevi un tip su un tuo commento | +0.50 TIMT |

## Come si spende TIMT

| Azione | Costo |
|--------|-------|
| Pubblicare un post | -1 TIMT |
| Amplificare (boost) un post | -0.5 a -20 TIMT |
| Premiare un commento (tip) | -0.5 TIMT |

## Perché questo sistema funziona

**Per i creator:** Ogni contenuto di qualità genera reddito in TIMT. Più la community apprezza, più guadagni.

**Per i lettori:** Spendi TIMT per amplificare ciò che ritieni importante. Il tuo TIMT diventa il tuo voto.

**Per la piattaforma:** I TIMT spesi circolano nella community — non spariscono. Creano un ecosistema chiuso e sostenibile.

### Il principio del cap giornaliero
Per evitare farming e spam, ogni utente ha un limite di guadagno giornaliero. Questo mantiene il valore del TIMT stabile e incoraggia la partecipazione distribuita.

---

# 5. COSA RENDE TIMELY DIVERSO

## Confronto con i social esistenti

| Feature | Twitter/X | Instagram | TikTok | **Timely** |
|---------|-----------|-----------|--------|------------|
| Post permanenti | ✅ | ✅ | ✅ | ❌ (by design) |
| Algoritmo opaco | ✅ | ✅ | ✅ | ❌ trasparente |
| Monetizzazione passiva | ❌ | parziale | parziale | ✅ |
| Community cura il feed | ❌ | ❌ | ❌ | ✅ |
| Follower = potere assoluto | ✅ | ✅ | ✅ | ❌ |
| Nuovi utenti svantaggiati | ✅ | ✅ | parziale | ❌ |

## I 3 principi unici

### 1. Scarcity of Time
Un post non può restare in cima al feed perché è "famoso". Deve guadagnarsi ogni ora di vita. Questo livella il campo da gioco.

### 2. Skin in the Game
Pubblicare costa qualcosa (1 TIMT). Questo filtra i contenuti spazzatura e incoraggia la qualità. Se posso perdere qualcosa, ci penso due volte prima di postare.

### 3. Community as Algorithm
Non è un algoritmo di una corporation a decidere cosa è rilevante. È la community che, spendendo TIMT, vota con i propri "soldi" cosa merita visibilità.

---

# 6. FEATURE ATTUALI

## ✅ Core
- Post con testo e immagini, scadenza 6 ore
- Countdown live su ogni post
- Feed ordinato per: urgenza di scadenza → boost priority → ER60 → freschezza
- Login/signup reale con Supabase Auth
- Profili con avatar, header, bio, location

## ✅ Economia
- Wallet TIMT con storico transazioni completo
- Guadagno da like, commenti, bonus engagement
- Boost post con TIMT (priorità feed per 20 minuti)
- Extend post (prolunga gratis con decadimento)
- Tip commenti (+0.5 TIMT all'autore)

## ✅ Social
- Follow/unfollow con contatori
- Feed "Seguiti" vs "Tutti"
- Commenti con risposte annidate
- Notifiche (like, commenti, follow, boost)
- Segnalazione contenuti

## ✅ UX
- Tema dark/light/system
- Lingua italiano/inglese
- Mobile-first responsive
- Aggiornamento wallet istantaneo (no reload)

---

# 7. ROADMAP — LE PROSSIME EVOLUZIONI

## Fase 1 — Engagement (prossime settimane)
Obiettivo: rendere Timely più coinvolgente e social

| Feature | Descrizione | Impatto |
|---------|-------------|---------|
| **Reazioni rapide** | 🔥 Hot, ⏰ Extend!, 💡 Insight — oltre al semplice like | Aumenta interazione |
| **Echo** | Ricondividi un post aggiungendo il tuo commento | Viralità organica |
| **Streak** | Bonus TIMT per chi posta N giorni consecutivi | Retention |
| **Last Minute Surge** | Negli ultimi 30 min, il boost vale +50% | Drammaticità |
| **Salva momento** | Paga 0.2 TIMT per "cristallizzare" un post nella tua libreria prima che scada | FOMO positivo |

## Fase 2 — Community (1-2 mesi)
Obiettivo: costruire una community con identità

| Feature | Descrizione | Impatto |
|---------|-------------|---------|
| **Canali tematici** | #sport #musica #tech — feed filtrati per argomento | Nicchie di qualità |
| **Post privati** | Visibili solo ai follower | Contenuti esclusivi |
| **Weekly Champion** | Classifica del post più amplificato della settimana | Competizione sana |
| **Menzioni @utente** | Tagga altri utenti nei post | Social graph più ricco |
| **Profilo verificato** | Badge per creator attivi e affidabili | Trust |

## Fase 3 — Monetizzazione reale (2-4 mesi)
Obiettivo: creare valore economico reale per i creator

| Feature | Descrizione | Impatto |
|---------|-------------|---------|
| **TIMT Premium** | Acquista TIMT con euro (€1 = 10 TIMT) | Revenue diretto |
| **Creator Fund** | Pool mensile distribuito ai top creator per ER60 | Attrae talenti |
| **Post Sponsorizzati** | Brand pagano in TIMT per boost garantito | B2B revenue |
| **Abbonamenti** | Paga X TIMT/mese per accesso a contenuti esclusivi di un creator | Creator economy |
| **TIMT Marketplace** | Scambia TIMT con altri utenti (peer-to-peer) | Liquidità |

## Fase 4 — Scalabilità (4-6 mesi)
Obiettivo: preparare l'app per migliaia di utenti

| Feature | Descrizione |
|---------|-------------|
| **App mobile nativa** | iOS + Android con React Native |
| **Push notifications** | Notifiche push reali via Firebase |
| **CDN immagini** | Cloudflare per immagini veloci globalmente |
| **Real-time feed** | WebSocket per aggiornamenti live senza refresh |
| **Moderazione AI** | Filtro automatico contenuti inappropriati |

---

# 8. MODELLO DI BUSINESS

## Come Timely genera valore

```
UTENTI GRATUITI
    │
    ├── Guadagnano TIMT con contenuti di qualità
    ├── Spendono TIMT per amplificare
    └── Possono comprare TIMT per accelerare

CREATOR PREMIUM
    │
    ├── Abbonamenti dai fan
    ├── Quota del Creator Fund
    └── Visibilità garantita

BRAND / AZIENDE
    │
    ├── Post sponsorizzati con boost garantito
    ├── Canali brandizzati
    └── Analytics avanzate
```

## Proiezione semplificata

| Scenario | Utenti Attivi | TIMT venduto/mese | Revenue stimata |
|---------|---------------|-------------------|-----------------|
| Early (oggi) | 10-50 | — | 0 (testing) |
| Lancio | 500-2.000 | 5.000 TIMT | ~500€/mese |
| Crescita | 10.000+ | 100.000 TIMT | ~10.000€/mese |
| Scale | 100.000+ | partnership brand | >100.000€/mese |

---

# 9. STACK TECNICO

```
Frontend    Next.js 14 (React) — Vercel (hosting gratuito)
Backend     Next.js API Routes — serverless
Database    PostgreSQL via Supabase (hosting gratuito fino a 500MB)
Auth        Supabase Auth (email, Google OAuth)
Storage     Supabase Storage (immagini post e profili)
ORM         Prisma
UI          Tailwind CSS + shadcn/ui
Deploy      Vercel (CI/CD automatico da git push)
```

**Costo attuale di gestione: €0/mese** (tutti free tier)
**Costo a 10.000 utenti attivi: ~€50-100/mese** (Supabase Pro + Vercel Pro)

---

# 10. COSA CERCHIAMO

## Per il beta test (ora)
- **Utenti early adopter** che testino e diano feedback onesto
- **Creator di contenuto** (anche piccoli) che provino l'economia TIMT
- **Feedback su UX** — cosa confonde, cosa manca, cosa emoziona

## Per la crescita
- **Community manager** per costruire le prime nicchie tematiche
- **Feedback da creator** per calibrare la generosità del sistema TIMT
- **Discussione sul posizionamento** — B2C consumer? Nicchia creativa? Tool professionale?

---

# 11. DOMANDE APERTE PER LA DISCUSSIONE

1. **Il cap di 6 ore è giusto?** O dovremmo avere durate variabili (1h, 6h, 24h) a scelta dell'utente?

2. **TIMT deve avere un valore reale in euro?** O meglio tenerlo come valuta puramente virtuale per evitare complicazioni legali?

3. **Quale nicchia aggredire prima?** Musica underground? Startup tech? Studenti universitari?

4. **Il nome "Timely" è giusto?** Evoca urgenza e tempo, ma in Italia potrebbe non essere immediato.

5. **App mobile subito o dopo?** Una PWA (Progressive Web App) potrebbe essere un compromesso veloce.

6. **Moderazione** — come gestiamo contenuti inappropriati in un social dove tutto scade in 6 ore?

---

# CONCLUSIONE

> Timely non è un'altra copia di Twitter.
>
> È un esperimento su cosa succede quando togli la permanenza dai social network.
> Quando ogni voce ha le stesse 6 ore.
> Quando la qualità del momento conta più della storia accumulata.
>
> **Il tempo è democratico. Timely anche.**

---

*Versione presentazione: Marzo 2026*
*Stack: Next.js 14 · Supabase · Vercel*
*Status: Beta privato — invito su https://timely-ochre.vercel.app*
