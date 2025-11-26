import { create } from 'zustand';
import type { BookingState, Booking, User } from './types';
import { usersApi, bookingsApi, settingsApi } from './api';
import { formatDate } from './utils';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url !== '' && key !== '');
};

export const useStore = create<BookingState>((set, get) => {
  // Initialize state
  const initialState = {
    currentUser: null as User | null,
    users: [] as User[],
    bookings: [] as Booking[],
    maxVacationDays: 28,
  };

  // Load initial data if Supabase is configured
  if (isSupabaseConfigured()) {
    // Load users
    usersApi.getAll()
      .then(users => {
        const sorted = users.sort((a, b) => {
          if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
          if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
          return a.name.localeCompare(b.name, 'ro');
        });
        set({ users: sorted });
      })
      .catch(err => {
        console.error('Failed to load users:', err);
      });

    // Load bookings
    bookingsApi.getAll()
      .then(bookings => {
        set({ bookings });
      })
      .catch(err => {
        console.error('Failed to load bookings:', err);
      });

    // Load settings
    settingsApi.getMaxVacationDays()
      .then(days => {
        set({ maxVacationDays: days });
      })
      .catch(err => {
        console.error('Failed to load settings:', err);
      });
  }

  return {
    ...initialState,

    login: (userId: string) => {
      const { users } = get();
      const user = users.find((u) => u.id === userId);
      if (user) {
        set({ currentUser: user });
      }
    },

    logout: () => {
      set({ currentUser: null });
    },

    addBooking: async (startDate: string, endDate: string) => {
      const { bookings, currentUser, users } = get();

      if (!currentUser) {
        return { success: false, error: 'Trebuie să fii autentificat.' };
      }

      // Convert date strings to Date objects for comparison
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return { success: false, error: 'Data de început trebuie să fie înainte de data de sfârșit.' };
      }

      // Check if user already has a booking that overlaps with this period
      const existingUserBooking = bookings.find((b) => {
        const bStart = new Date(b.startDate);
        const bEnd = new Date(b.endDate);
        return (
          b.userId === currentUser.id &&
          !(end < bStart || start > bEnd)
        );
      });
      if (existingUserBooking) {
        return { success: false, error: 'Ai deja concediu în această perioadă.' };
      }

      // Check constraints for each day in the period
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const daysToCheck: string[] = [];
      
      for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
        daysToCheck.push(formatDate(d));
      }

      // Check each day in the period
      for (const dateStr of daysToCheck) {
        // Get all bookings that overlap with this date
        const bookingsOnDate = bookings.filter((b) => {
          const bStart = new Date(b.startDate);
          const bEnd = new Date(b.endDate);
          const checkDate = new Date(dateStr);
          return checkDate >= bStart && checkDate <= bEnd;
        });

        // Get roles of people booked on this date
        const bookedUsers = bookingsOnDate.map(b => users.find(u => u.id === b.userId)).filter(Boolean) as User[];

        const educatorsCount = bookedUsers.filter(u => u.role === 'EDUCATOR').length;
        const auxiliaryCount = bookedUsers.filter(u => u.role === 'AUXILIARY').length;

        if (currentUser.role === 'EDUCATOR' && educatorsCount >= 1) {
          return { success: false, error: `Există deja o educatoare în concediu pe data ${new Date(dateStr).toLocaleDateString('ro-RO')}.` };
        }

        if (currentUser.role === 'AUXILIARY' && auxiliaryCount >= 1) {
          return { success: false, error: `Există deja o persoană auxiliară în concediu pe data ${new Date(dateStr).toLocaleDateString('ro-RO')}.` };
        }
      }

      // Create booking
      try {
        if (isSupabaseConfigured()) {
          const newBooking = await bookingsApi.create({
            userId: currentUser.id,
            startDate,
            endDate,
          });

          // Update local state
          set({ bookings: [...bookings, newBooking] });
          return { success: true };
        } else {
          // Fallback to local storage behavior
          const newBooking: Booking = {
            id: Math.random().toString(36).substr(2, 9),
            userId: currentUser.id,
            startDate,
            endDate,
            createdAt: Date.now(),
          };

          set({ bookings: [...bookings, newBooking] });
          return { success: true };
        }
      } catch (error) {
        console.error('Error creating booking:', error);
        return { success: false, error: 'A apărut o eroare la salvarea rezervării.' };
      }
    },

    removeBooking: async (bookingId: string) => {
      const { bookings } = get();

      try {
        if (isSupabaseConfigured()) {
          await bookingsApi.delete(bookingId);
        }

        // Update local state
        set({ bookings: bookings.filter((b) => b.id !== bookingId) });
      } catch (error) {
        console.error('Error deleting booking:', error);
        // Still update local state even if API call fails
        set({ bookings: bookings.filter((b) => b.id !== bookingId) });
      }
    },

    setMaxVacationDays: async (days: number) => {
      try {
        if (isSupabaseConfigured()) {
          await settingsApi.setMaxVacationDays(days);
        }

        set({ maxVacationDays: days });
      } catch (error) {
        console.error('Error setting max vacation days:', error);
        // Still update local state
        set({ maxVacationDays: days });
      }
    },
  };
});

