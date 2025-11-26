# Database Setup Instructions

## Quick Start with Supabase

### 1. Create Supabase Account & Project

1. Go to https://supabase.com and sign up (free)
2. Click "New Project"
3. Fill in:
   - **Name**: Concedii (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Wait 2-3 minutes for project creation

### 2. Get Your API Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string)

### 3. Configure Environment Variables

1. Create a `.env` file in the project root (same level as `package.json`)
2. Add:
   ```
   VITE_SUPABASE_URL=your_project_url_here
   VITE_SUPABASE_ANON_KEY=your_anon_key_here
   ```
3. Replace the values with your actual credentials

### 4. Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `database/schema.sql`
4. Paste and click **Run**
5. You should see "Success. No rows returned"

### 5. Import Initial Users

**Option A: Using SQL (Recommended)**
1. Go to SQL Editor in Supabase
2. Run this query (update with your actual users):

```sql
INSERT INTO users (id, name, role) VALUES
('admin-rusanescu', 'Rusănescu Irina Petruța', 'ADMIN'),
('admin-tarsitu', 'Tarșițu Roxana', 'ADMIN'),
('1', 'Popa Ana-Maria', 'EDUCATOR'),
('2', 'Brișculescu Mihaela', 'EDUCATOR'),
('3', 'Monoreanu Paula', 'EDUCATOR'),
('4', 'Chirilă Aurelia', 'EDUCATOR'),
('5', 'Popa Gabriela', 'EDUCATOR'),
('6', 'Marin Elena', 'EDUCATOR'),
('7', 'Croitoru Georgiana', 'EDUCATOR'),
('8', 'Ghiciu Marinela', 'AUXILIARY'),
('9', 'Farcaș Gabriela', 'AUXILIARY'),
('10', 'Burduje Elena', 'AUXILIARY'),
('11', 'Alecu Mihaela', 'AUXILIARY'),
('12', 'Cojocaru Ana-Maria', 'AUXILIARY'),
('13', 'Alaref Daniela', 'AUXILIARY'),
('14', 'Dumitrache Florentina', 'AUXILIARY'),
('15', 'Todor Mihaela', 'AUXILIARY')
ON CONFLICT (id) DO NOTHING;
```

**Option B: Using the App**
1. Temporarily modify `src/App.tsx` to import and call the migration function
2. Or use the Supabase dashboard Table Editor to add users manually

### 6. Switch to Database Store

Replace the import in your components:

**Before:**
```typescript
import { useStore } from './lib/store';
```

**After:**
```typescript
import { useStore } from './lib/store-db';
```

Or rename `store-db.ts` to `store.ts` (backup the old one first!)

### 7. Test the Connection

1. Restart your dev server: `npm run dev`
2. The app should now load users and bookings from Supabase
3. Try creating a booking - it should save to the database

## Troubleshooting

### "Supabase credentials not found" warning
- Make sure `.env` file exists in the root directory
- Check that variable names start with `VITE_`
- Restart the dev server after creating/modifying `.env`

### "Error fetching users"
- Check that the schema was created successfully
- Verify users exist in the `users` table
- Check browser console for detailed error messages

### Data not persisting
- Check Supabase dashboard → Table Editor to see if data is being saved
- Verify RLS policies allow operations
- Check browser console for API errors

## Migration from LocalStorage

If you have existing data in localStorage:

1. Export your data from the old store
2. Use Supabase dashboard or SQL to import it
3. Or create a migration script to transfer data

## Security Notes

- The current RLS policies allow all operations
- For production, create more restrictive policies based on user roles
- Consider adding authentication (Supabase Auth) for better security

## Next Steps

- [ ] Set up authentication (optional but recommended)
- [ ] Create more restrictive RLS policies
- [ ] Set up backups
- [ ] Configure email notifications (if needed)

