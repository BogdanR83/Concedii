import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BookingState, Booking, User } from './types';
import { MOCK_USERS, formatDate } from './utils';
import { usersApi, bookingsApi } from './api';

// Check if Supabase is configured
const isSupabaseConfigured = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url !== '' && key !== '');
};

export const useStore = create<BookingState>()(
    persist(
        (set, get) => {
            // Initialize with default values
            const initialState = {
                currentUser: null as User | null,
                users: [...MOCK_USERS].sort((a, b) => {
                    // Sort: ADMIN first, then by name
                    if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                    if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                    return a.name.localeCompare(b.name, 'ro');
                }),
                bookings: [] as Booking[],
            };

            // Load data from Supabase if configured (async, won't block initial render)
            if (isSupabaseConfigured()) {
                // Load users
                usersApi.getAll()
                    .then(users => {
                        if (users.length > 0) {
                            const sorted = users.sort((a, b) => {
                                if (a.role === 'ADMIN' && b.role !== 'ADMIN') return -1;
                                if (a.role !== 'ADMIN' && b.role === 'ADMIN') return 1;
                                return a.name.localeCompare(b.name, 'ro');
                            });
                            set({ users: sorted });
                        }
                    })
                    .catch(err => {
                        console.error('Failed to load users from Supabase:', err);
                    });

                // Load bookings
                bookingsApi.getAll()
                    .then(bookings => {
                        set({ bookings });
                    })
                    .catch(err => {
                        console.error('Failed to load bookings from Supabase:', err);
                    });
            }

            return {
                ...initialState,

                login: async (username: string, password: string) => {
                    if (isSupabaseConfigured()) {
                        try {
                            const result = await usersApi.login(username, password);
                            if (result.user) {
                                set({ currentUser: result.user });
                                return { 
                                    success: true, 
                                    mustChangePassword: result.mustChangePassword 
                                };
                            }
                            return { success: false, error: 'Username sau parolă incorectă.' };
                        } catch (error) {
                            console.error('Login error:', error);
                            return { success: false, error: 'A apărut o eroare la autentificare.' };
                        }
                    } else {
                        // Fallback: find user by username in local users
                        const user = get().users.find((u) => u.username === username);
                        if (user) {
                            set({ currentUser: user });
                            return { success: true, mustChangePassword: user.mustChangePassword || false };
                        }
                        return { success: false, error: 'Username sau parolă incorectă.' };
                    }
                },

                changePassword: async (oldPassword: string, newPassword: string) => {
                    const { currentUser } = get();
                    if (!currentUser) {
                        return { success: false, error: 'Nu ești autentificat.' };
                    }

                    if (newPassword.length < 4) {
                        return { success: false, error: 'Parola trebuie să aibă cel puțin 4 caractere.' };
                    }

                    if (isSupabaseConfigured()) {
                        try {
                            const success = await usersApi.changePassword(currentUser.id, oldPassword, newPassword);
                            if (success) {
                                // Update current user to reflect password change
                                const updatedUser = await usersApi.getById(currentUser.id);
                                if (updatedUser) {
                                    set({ currentUser: updatedUser });
                                }
                                return { success: true };
                            }
                            return { success: false, error: 'Parola veche este incorectă.' };
                        } catch (error) {
                            console.error('Change password error:', error);
                            return { success: false, error: 'A apărut o eroare la schimbarea parolei.' };
                        }
                    }
                    return { success: false, error: 'Funcționalitatea nu este disponibilă.' };
                },

                resetUserPassword: async (userId: string) => {
                    if (isSupabaseConfigured()) {
                        try {
                            const success = await usersApi.resetPassword(userId);
                            if (success) {
                                return { success: true };
                            }
                            return { success: false, error: 'A apărut o eroare la resetarea parolei.' };
                        } catch (error) {
                            console.error('Reset password error:', error);
                            return { success: false, error: 'A apărut o eroare la resetarea parolei.' };
                        }
                    }
                    return { success: false, error: 'Funcționalitatea nu este disponibilă.' };
                },

            logout: () => set({ currentUser: null }),

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
                const newBooking: Booking = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId: currentUser.id,
                    startDate,
                    endDate,
                    createdAt: Date.now(),
                };

                // Save to Supabase if configured
                if (isSupabaseConfigured()) {
                    try {
                        await bookingsApi.create({
                            userId: currentUser.id,
                            startDate,
                            endDate,
                        });
                    } catch (error) {
                        console.error('Error saving booking to Supabase:', error);
                        return { success: false, error: 'A apărut o eroare la salvarea rezervării.' };
                    }
                }

                set({ bookings: [...bookings, newBooking] });
                return { success: true };
            },

            addBookingForUser: async (userId: string, startDate: string, endDate: string) => {
                // Admin function - no restrictions, can book for any user
                const { bookings } = get();

                // Basic validation
                const start = new Date(startDate);
                const end = new Date(endDate);

                if (start > end) {
                    return { success: false, error: 'Data de început trebuie să fie înainte de data de sfârșit.' };
                }

                // Create booking
                const newBooking: Booking = {
                    id: Math.random().toString(36).substr(2, 9),
                    userId,
                    startDate,
                    endDate,
                    createdAt: Date.now(),
                };

                // Save to Supabase if configured
                if (isSupabaseConfigured()) {
                    try {
                        await bookingsApi.create({
                            userId,
                            startDate,
                            endDate,
                        });
                    } catch (error) {
                        console.error('Error saving booking to Supabase:', error);
                        return { success: false, error: 'A apărut o eroare la salvarea rezervării.' };
                    }
                }

                set({ bookings: [...bookings, newBooking] });
                return { success: true };
            },

            removeBooking: async (bookingId: string) => {
                // Delete from Supabase if configured
                if (isSupabaseConfigured()) {
                    try {
                        await bookingsApi.delete(bookingId);
                    } catch (error) {
                        console.error('Error deleting booking from Supabase:', error);
                    }
                }

                set((state) => ({
                    bookings: state.bookings.filter((b) => b.id !== bookingId),
                }));
            },

            setUserMaxVacationDays: async (userId: string, days: number) => {
                if (isSupabaseConfigured()) {
                    try {
                        await usersApi.setUserMaxVacationDays(userId, days);
                        // Update local user data
                        const updatedUsers = get().users.map(u => 
                            u.id === userId ? { ...u, maxVacationDays: days } : u
                        );
                        set({ users: updatedUsers });
                        return { success: true };
                    } catch (error) {
                        console.error('Error setting user max vacation days:', error);
                        return { success: false, error: 'A apărut o eroare la actualizarea zilelor.' };
                    }
                }
                return { success: false, error: 'Funcționalitatea nu este disponibilă.' };
            },
            };
        },
        {
            name: 'vacation-storage',
        }
    )
);
