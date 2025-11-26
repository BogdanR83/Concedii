# Database Setup Guide

## Supabase Setup

1. **Create a Supabase account** (if you don't have one):
   - Go to https://supabase.com
   - Sign up for a free account

2. **Create a new project**:
   - Click "New Project"
   - Choose a name and database password
   - Select a region close to you
   - Wait for the project to be created (2-3 minutes)

3. **Get your API credentials**:
   - Go to Project Settings → API
   - Copy the "Project URL" and "anon public" key

4. **Set up environment variables**:
   - Copy `.env.example` to `.env`
   - Paste your Supabase URL and anon key

5. **Run the database schema**:
   - Go to SQL Editor in Supabase dashboard
   - Copy the contents of `schema.sql`
   - Paste and run it

6. **Import initial users** (optional):
   - You can use the Supabase dashboard to insert users
   - Or use the app's bulk create function after setting up the API

## Database Schema

- **users**: Stores all staff members (educators, auxiliaries, admins)
- **bookings**: Stores vacation bookings with date ranges
- **settings**: Stores app configuration (max vacation days, etc.)

## Row Level Security (RLS)

The schema includes basic RLS policies that allow all operations. In production, you should create more restrictive policies based on user roles.

