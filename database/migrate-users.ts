// Migration script to populate initial users
// Run this after setting up Supabase and the schema
// You can run this in the browser console or create a one-time script

import { usersApi } from '../src/lib/api';
import { MOCK_USERS } from '../src/lib/utils';

export async function migrateUsers() {
  try {
    await usersApi.bulkCreate(MOCK_USERS);
    console.log('Users migrated successfully!');
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}

// To run this:
// 1. Import this function in your app temporarily
// 2. Call migrateUsers() once
// 3. Remove the import after migration

