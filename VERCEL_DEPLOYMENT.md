# Ghid de Deployment pe Vercel

## Pași pentru a deploya aplicația pe Vercel

### 1. Pregătirea codului

✅ **Verifică că ai:**
- `vercel.json` (deja creat)
- `.gitignore` cu `.env` (deja configurat)
- Build script în `package.json` (deja configurat)

### 2. Pregătirea repository-ului Git

Dacă nu ai deja un repository Git:

```bash
git init
git add .
git commit -m "Initial commit - ready for Vercel deployment"
```

Dacă ai deja un repository, asigură-te că toate modificările sunt commit-uite:

```bash
git add .
git commit -m "Add Vercel configuration"
```

### 3. Push la GitHub/GitLab/Bitbucket

1. Creează un repository nou pe GitHub (sau GitLab/Bitbucket)
2. Adaugă remote-ul:

```bash
git remote add origin https://github.com/yourusername/your-repo-name.git
git branch -M main
git push -u origin main
```

### 4. Deploy pe Vercel

#### Opțiunea 1: Deploy prin Vercel Dashboard (Recomandat)

1. **Accesează Vercel:**
   - Mergi la [https://vercel.com](https://vercel.com)
   - Loghează-te cu GitHub/GitLab/Bitbucket

2. **Importă proiectul:**
   - Click pe **"Add New..."** → **"Project"**
   - Selectează repository-ul tău
   - Click pe **"Import"**

3. **Configurează proiectul:**
   - **Framework Preset:** Vite (ar trebui detectat automat)
   - **Root Directory:** `./` (lasă gol dacă e în root)
   - **Build Command:** `npm run build` (ar trebui detectat automat)
   - **Output Directory:** `dist` (ar trebui detectat automat)

4. **Adaugă Environment Variables:**
   - Click pe **"Environment Variables"**
   - Adaugă următoarele variabile:
     - **Name:** `VITE_SUPABASE_URL`
     - **Value:** `https://lbqadjvcrbrgiwxctayc.supabase.co`
     - **Environment:** Production, Preview, Development (bifează toate)
   
   - Click pe **"Add Another"**
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicWFkanZjcmJyZ2l3eGN0YXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODAwNjUsImV4cCI6MjA3OTc1NjA2NX0.9qk6BRRqaj_rsd_UZwvam1Ioi16JXATn7afqoPmfQV8`
   - **Environment:** Production, Preview, Development (bifează toate)

5. **Deploy:**
   - Click pe **"Deploy"**
   - Așteaptă câteva minute pentru build și deploy

#### Opțiunea 2: Deploy prin Vercel CLI

1. **Instalează Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   La întrebări:
   - "Set up and deploy?": Yes
   - "Which scope?": Selectează contul tău
   - "Link to existing project?": No (pentru prima dată)
   - "Project name?": concedii (sau alt nume)
   - "Directory?": ./
   - "Override settings?": No

4. **Adaugă Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   # Introdu: https://lbqadjvcrbrgiwxctayc.supabase.co
   
   vercel env add VITE_SUPABASE_ANON_KEY
   # Introdu: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxicWFkanZjcmJyZ2l3eGN0YXljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODAwNjUsImV4cCI6MjA3OTc1NjA2NX0.9qk6BRRqaj_rsd_UZwvam1Ioi16JXATn7afqoPmfQV8
   ```

5. **Deploy pentru producție:**
   ```bash
   vercel --prod
   ```

### 5. Verificare după deploy

1. **Accesează URL-ul:**
   - Vercel va genera un URL de tipul: `https://your-project-name.vercel.app`
   - Accesează URL-ul în browser

2. **Testează funcționalitățile:**
   - Login cu un utilizator
   - Verifică că datele se încarcă din Supabase
   - Testează crearea unei rezervări

### 6. Configurare Domain (Opțional)

1. În Vercel Dashboard, mergi la **Settings** → **Domains**
2. Adaugă domeniul tău
3. Urmează instrucțiunile pentru configurarea DNS

## Troubleshooting

### Build Errors

**Eroare: "Module not found"**
- Verifică că toate dependențele sunt în `package.json`
- Rulează `npm install` local și verifică că totul funcționează

**Eroare: "Environment variable not found"**
- Verifică că ai adăugat variabilele în Vercel Dashboard
- Asigură-te că variabilele încep cu `VITE_` pentru Vite

### Runtime Errors

**Eroare: "Supabase connection failed"**
- Verifică că `VITE_SUPABASE_URL` și `VITE_SUPABASE_ANON_KEY` sunt setate corect
- Verifică că RLS policies permit accesul anonim în Supabase

**Eroare: "CORS"**
- Verifică în Supabase Dashboard → Settings → API că URL-ul Vercel este adăugat în "Allowed Origins"

## Actualizări ulterioare

După ce ai conectat repository-ul la Vercel:
- Orice push la branch-ul `main` va declanșa automat un deploy
- Pull requests vor genera preview deployments
- Poți face manual deploy din Vercel Dashboard

## Note importante

- ✅ Environment variables sunt necesare pentru fiecare environment (Production, Preview, Development)
- ✅ Vercel detectează automat Vite și configurează build-ul
- ✅ `vercel.json` asigură routing-ul corect pentru SPA (Single Page Application)
- ✅ Build-ul se face automat la fiecare push

## Support

Dacă întâmpini probleme:
1. Verifică logs-urile în Vercel Dashboard → Deployments → [Deployment] → Logs
2. Verifică că toate environment variables sunt setate
3. Verifică că Supabase permite conexiuni de la domeniul Vercel

