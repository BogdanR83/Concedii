# Instrucțiuni pentru migrarea bazei de date în Supabase

## Pași pentru a adăuga câmpurile noi la tabelele existente

### 1. Accesează Supabase Dashboard

1. Mergi la [https://supabase.com](https://supabase.com)
2. Loghează-te în contul tău
3. Selectează proiectul tău (cel cu URL-ul: `https://lbqadjvcrbrgiwxctayc.supabase.co`)

### 2. Deschide SQL Editor

1. În meniul din stânga, click pe **"SQL Editor"** (sau **"SQL"**)
2. Click pe butonul **"New query"** sau **"+"** pentru a crea o nouă interogare

### 3. Rulează scriptul de migrare

Copiază și lipește următorul script în editorul SQL:

```sql
-- Add new columns to users table if they don't exist
DO $$ 
BEGIN
    -- Add max_vacation_days column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'max_vacation_days'
    ) THEN
        ALTER TABLE users ADD COLUMN max_vacation_days INTEGER DEFAULT 28;
    END IF;

    -- Add remaining_days_from_previous_year column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'remaining_days_from_previous_year'
    ) THEN
        ALTER TABLE users ADD COLUMN remaining_days_from_previous_year INTEGER DEFAULT 0;
    END IF;

    -- Add last_year_reset column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'last_year_reset'
    ) THEN
        ALTER TABLE users ADD COLUMN last_year_reset INTEGER DEFAULT EXTRACT(YEAR FROM NOW());
    END IF;
END $$;

-- Update existing users to have default values
UPDATE users 
SET 
    max_vacation_days = COALESCE(max_vacation_days, 28),
    remaining_days_from_previous_year = COALESCE(remaining_days_from_previous_year, 0),
    last_year_reset = COALESCE(last_year_reset, EXTRACT(YEAR FROM NOW()))
WHERE 
    max_vacation_days IS NULL 
    OR remaining_days_from_previous_year IS NULL 
    OR last_year_reset IS NULL;
```

### 4. Execută scriptul

1. Click pe butonul **"Run"** sau apasă `Ctrl+Enter` (sau `Cmd+Enter` pe Mac)
2. Așteaptă confirmarea că scriptul a rulat cu succes
3. Ar trebui să vezi un mesaj de tipul: "Success. No rows returned"

### 5. Verifică că câmpurile au fost adăugate

Pentru a verifica că totul a funcționat, rulează această interogare:

```sql
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
    AND column_name IN ('max_vacation_days', 'remaining_days_from_previous_year', 'last_year_reset')
ORDER BY column_name;
```

Ar trebui să vezi cele 3 câmpuri noi listate.

### 6. Verifică datele utilizatorilor

Rulează această interogare pentru a vedea valorile pentru utilizatori:

```sql
SELECT 
    id, 
    name, 
    max_vacation_days, 
    remaining_days_from_previous_year, 
    last_year_reset
FROM users
LIMIT 5;
```

Toți utilizatorii ar trebui să aibă:
- `max_vacation_days` = 28
- `remaining_days_from_previous_year` = 0
- `last_year_reset` = anul curent (ex: 2025)

## Alternativă: Rulează schema.sql complet

Dacă preferi, poți rula întregul `schema.sql` care verifică automat dacă câmpurile există înainte de a le adăuga. Scriptul este gata de rulare și nu va produce erori dacă tabelele există deja.

## Note importante

- Scriptul este **idempotent** - poate fi rulat de mai multe ori fără probleme
- Nu va șterge date existente
- Va seta valori default pentru utilizatorii existenti
- Dacă întâmpini erori, verifică că ai permisiuni de administrator în Supabase

## Dacă întâmpini probleme

1. **Eroare de permisiuni**: Asigură-te că ești logat ca administrator al proiectului
2. **Eroare de sintaxă**: Verifică că ai copiat întregul script, inclusiv `DO $$ ... END $$;`
3. **Câmpuri deja existente**: Nu este o problemă - scriptul va sări peste câmpurile care există deja

