# Deploy Timely online gratis — Guida completa

Questa guida ti permette di mettere online Timely **gratis** usando:
- **Vercel** — hosting Next.js (free tier illimitato per progetti personali)
- **Supabase** — database PostgreSQL (free tier: 500MB, 2 progetti)
- **Firebase** — autenticazione + storage immagini (free Spark plan)

---

## 1. Prepara il database su Supabase

1. Vai su [supabase.com](https://supabase.com) → crea account → **New Project**
2. Scegli un nome (es. `timely`) e una password per il database
3. Vai su **Settings → Database → Connection string → URI**
4. Copia la stringa (es. `postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres`)

---

## 2. Configura Firebase (per login reale e immagini)

1. Vai su [console.firebase.google.com](https://console.firebase.google.com)
2. **Crea un nuovo progetto** (es. `timely-app`)
3. Vai su **Authentication → Sign-in method** → abilita **Email/Password** (e Google se vuoi)
4. Vai su **Project Settings → Your apps → Add app → Web**
   - Copia i valori: `apiKey`, `authDomain`, `projectId`, `storageBucket`, ecc.
5. Vai su **Storage → Get started** → scegli regione → copia il bucket name
6. Vai su **Project Settings → Service accounts → Generate new private key**
   - Scarica il file JSON con le credenziali admin

---

## 3. Prepara il file .env.local

Crea `.env.local` nella root del progetto con questi valori:

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres:TUA_PASSWORD@db.XXXX.supabase.co:5432/postgres"

# Session
SESSION_SECRET="una-stringa-casuale-di-almeno-32-caratteri-sicura"

# Firebase Client (dal pannello Firebase → Project Settings → Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="timely-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="timely-app"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="timely-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"

# Firebase Admin (dal file JSON scaricato)
FIREBASE_PROJECT_ID="timely-app"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@timely-app.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Disabilita demo mode
NEXT_PUBLIC_DEMO_MODE="false"
```

---

## 4. Migra il database a PostgreSQL

Modifica `prisma/schema.prisma` — cambia il provider da `sqlite` a `postgresql`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Poi esegui:

```bash
npx prisma migrate deploy
# oppure per la prima volta:
npx prisma db push
```

---

## 5. Deploy su Vercel

1. Installa Vercel CLI: `npm i -g vercel`
2. Dalla cartella del progetto: `vercel`
3. Segui il wizard (scegli il tuo account, progetto nuovo)
4. Vai su [vercel.com](https://vercel.com) → il tuo progetto → **Settings → Environment Variables**
5. Aggiungi **tutte** le variabili di `.env.local` (stessa chiave, stesso valore)
6. In `FIREBASE_PRIVATE_KEY` incolla la chiave **inclusi** gli `\n` come testo letterale

Dopo il primo deploy, ogni `git push` aggiorna automaticamente il sito.

---

## 6. Invita i tuoi amici

Una volta online, condividi il link Vercel (es. `https://timely-xxx.vercel.app`).

I tuoi amici possono:
1. Aprire il link
2. Cliccare **Sign up** → creare account con email e password
3. Iniziare a postare!

---

## Note importanti

- **Storage immagini**: funziona con Firebase Storage (free tier: 5GB). Senza Firebase, le immagini vengono salvate localmente (non funziona su Vercel — usa Firebase!).
- **Database**: Supabase free tier ha 500MB e si "mette in pausa" dopo 7 giorni di inattività. Per riattivarlo vai su Supabase → il tuo progetto → Restore.
- **Dominio custom**: Vercel permette di collegare un dominio personalizzato gratuitamente.

---

## Sviluppo locale con amici (alternativa rapida)

Se vuoi testare subito senza configurare Firebase/Supabase, usa [ngrok](https://ngrok.com):

```bash
# Avvia il server locale
npm run dev

# In un altro terminale — esponi il server online
npx ngrok http 3000
```

Ngrok ti darà un URL pubblico (es. `https://abc123.ngrok.io`) che i tuoi amici possono usare. **Funziona solo mentre il tuo PC è acceso.**
