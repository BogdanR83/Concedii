import { supabase } from './supabase';
import type { User, Booking, MedicalLeave, ClosedPeriod, Role } from './types';
import { hashPassword, verifyPassword } from './auth';
import { eachDayOfInterval, isWeekend } from 'date-fns';
import { calculateWorkingDaysExcludingHolidays, calculateWorkingDaysExcludingHolidaysSync } from './utils';

// Users API
export const usersApi = {
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, username, must_change_password, max_vacation_days, remaining_days_from_previous_year, last_year_reset, active')
      .order('role', { ascending: false })
      .order('name');

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    return (data || []).map((u: any) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      username: u.username,
      mustChangePassword: u.must_change_password,
      maxVacationDays: u.max_vacation_days || 28,
      remainingDaysFromPreviousYear: u.remaining_days_from_previous_year || 0,
      lastYearReset: u.last_year_reset || new Date().getFullYear(),
      active: u.active ?? true, // Default to true for existing users (handles both null and undefined)
    }));
  },

  async login(username: string, password: string): Promise<{ user: User | null; mustChangePassword: boolean }> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return { user: null, mustChangePassword: false };
    }

    // Check if user is active
    if (data.active === false) {
      return { user: null, mustChangePassword: false };
    }

    // Verify password
    if (!verifyPassword(password, data.password_hash)) {
      return { user: null, mustChangePassword: false };
    }

    return {
      user: {
        id: data.id,
        name: data.name,
        role: data.role,
        username: data.username,
        mustChangePassword: data.must_change_password,
        maxVacationDays: data.max_vacation_days || 28,
        remainingDaysFromPreviousYear: data.remaining_days_from_previous_year || 0,
        lastYearReset: data.last_year_reset || new Date().getFullYear(),
        active: data.active ?? true, // Default to true for existing users (handles both null and undefined)
      },
      mustChangePassword: data.must_change_password,
    };
  },

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    // Get user to verify old password
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return false;
    }

    // Verify old password
    if (!verifyPassword(oldPassword, user.password_hash)) {
      return false;
    }

    // Update password
    const newPasswordHash = hashPassword(newPassword);
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        must_change_password: false,
      })
      .eq('id', userId);

    return !error;
  },

  async resetPassword(userId: string): Promise<boolean> {
    const defaultPasswordHash = hashPassword('12345');
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: defaultPasswordHash,
        must_change_password: true,
      })
      .eq('id', userId);

    return !error;
  },

  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, role, username, must_change_password, max_vacation_days, remaining_days_from_previous_year, last_year_reset, active')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      role: data.role,
      username: data.username,
      mustChangePassword: data.must_change_password,
      maxVacationDays: data.max_vacation_days || 28,
      remainingDaysFromPreviousYear: data.remaining_days_from_previous_year || 0,
      lastYearReset: data.last_year_reset || new Date().getFullYear(),
      active: data.active ?? true, // Default to true for existing users (handles both null and undefined)
    };
  },

  async setUserMaxVacationDays(userId: string, days: number): Promise<void> {
    const { error } = await supabase
      .from('users')
      .update({ max_vacation_days: days })
      .eq('id', userId);

    if (error) {
      console.error('Error setting user max vacation days:', error);
      throw error;
    }
  },

  async resetYearlyVacationDays(): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    // Get all users
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id, last_year_reset, remaining_days_from_previous_year, max_vacation_days');

    if (fetchError) {
      console.error('Error fetching users for yearly reset:', fetchError);
      throw fetchError;
    }

    // Get all bookings to calculate used days
    const allBookings = await bookingsApi.getAll();
    
    // Get all closed periods
    const allClosedPeriods = await closedPeriodsApi.getAll();

    // Update each user if needed
    for (const user of users || []) {
      if (user.last_year_reset < currentYear) {
        // Calculate what was remaining at end of previous year
        const previousYear = user.last_year_reset;
        const previousYearBookings = allBookings.filter(b => {
          const bookingYear = new Date(b.startDate).getFullYear();
          return bookingYear === previousYear && b.userId === user.id;
        });
        
        // Calculate used days in previous year for this user
        let usedDaysPreviousYear = 0;
        previousYearBookings.forEach(booking => {
          const start = new Date(booking.startDate);
          const end = new Date(booking.endDate);
          const days = eachDayOfInterval({ start, end });
          usedDaysPreviousYear += days.filter(day => !isWeekend(day)).length;
        });
        
        // Add closed periods from previous year (everyone is on vacation during closed periods)
        if (allClosedPeriods && allClosedPeriods.length > 0) {
          for (const period of allClosedPeriods) {
            const periodStart = new Date(period.startDate);
            const periodEnd = new Date(period.endDate);
            const periodStartYear = periodStart.getFullYear();
            const periodEndYear = periodEnd.getFullYear();
            
            // Check if period overlaps with previous year
            if (periodStartYear <= previousYear && periodEndYear >= previousYear) {
              // Calculate working days for the part of the period that's in previous year
              let actualStart = periodStart;
              let actualEnd = periodEnd;
              
              if (periodStartYear < previousYear) {
                actualStart = new Date(previousYear, 0, 1); // January 1 of previous year
              }
              if (periodEndYear > previousYear) {
                actualEnd = new Date(previousYear, 11, 31); // December 31 of previous year
              }
              
              const days = eachDayOfInterval({ start: actualStart, end: actualEnd });
              usedDaysPreviousYear += days.filter(day => !isWeekend(day)).length;
            }
          }
        }
        
        // Calculate remaining from previous year
        // Total available previous year = max days + remaining from year before that
        const maxDays = user.max_vacation_days || 28;
        const previousRemaining = user.remaining_days_from_previous_year || 0;
        const totalPreviousYear = maxDays + previousRemaining;
        const newRemainingDays = Math.max(0, totalPreviousYear - usedDaysPreviousYear);
        
        // Update user: carry over remaining days and reset year
        const { error } = await supabase
          .from('users')
          .update({
            remaining_days_from_previous_year: newRemainingDays,
            last_year_reset: currentYear,
          })
          .eq('id', user.id);

        if (error) {
          console.error(`Error resetting yearly days for user ${user.id}:`, error);
        }
      }
    }
  },

  async create(userData: { name: string; role: Role; username: string; password: string }): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      // Check if username already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', userData.username)
        .single();

      // Handle errors from the username check
      if (checkError) {
        // PGRST116 is the Supabase error code for "no rows found" (expected case)
        // If it's a different error, it's a real database error that should be reported
        if (checkError.code !== 'PGRST116') {
          console.error('Error checking username existence:', checkError);
          return { success: false, error: 'Eroare la verificarea username-ului' };
        }
        // If error is PGRST116 (no rows found), that's expected - username is available
        // Continue to create the user
      } else if (existingUser) {
        // No error and data exists means username is already taken
        return { success: false, error: 'Username-ul există deja' };
      }

      // Generate ID if not provided
      const userId = `${userData.role.toLowerCase()}-${Date.now()}`;
      
      // Hash password
      const passwordHash = hashPassword(userData.password);

      // Insert user
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userId,
          name: userData.name,
          role: userData.role,
          username: userData.username,
          password_hash: passwordHash,
          must_change_password: true,
          max_vacation_days: 28,
          remaining_days_from_previous_year: 0,
          last_year_reset: new Date().getFullYear(),
          active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: {
          id: data.id,
          name: data.name,
          role: data.role,
          username: data.username,
          mustChangePassword: data.must_change_password,
          maxVacationDays: data.max_vacation_days || 28,
          remainingDaysFromPreviousYear: data.remaining_days_from_previous_year || 0,
          lastYearReset: data.last_year_reset || new Date().getFullYear(),
          active: data.active ?? true, // Default to true for existing users (handles both null and undefined)
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Eroare la crearea utilizatorului' };
    }
  },

  async toggleActive(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current active status
      const { data: user, error: fetchError } = await supabase
        .from('users')
        .select('active')
        .eq('id', userId)
        .single();

      if (fetchError || !user) {
        return { success: false, error: 'Utilizatorul nu a fost găsit' };
      }

      // Toggle active status
      // Explicitly check for true to handle null/undefined cases properly
      const newActiveStatus = user.active === true ? false : true;
      const { error } = await supabase
        .from('users')
        .update({ active: newActiveStatus })
        .eq('id', userId);

      if (error) {
        console.error('Error toggling user active status:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Eroare la actualizarea statusului' };
    }
  },

  async bulkCreate(users: User[]): Promise<void> {
    const { error } = await supabase
      .from('users')
      .upsert(users, { onConflict: 'id' });

    if (error) {
      console.error('Error bulk creating users:', error);
      throw error;
    }
  },
};

// Bookings API
export const bookingsApi = {
  async getAll(): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      throw error;
    }

    // Map database fields to app fields
    return (data || []).map((b: any) => ({
      id: b.id,
      userId: b.user_id,
      startDate: b.start_date,
      endDate: b.end_date,
      createdAt: b.created_at,
    }));
  },

  async getByUserId(userId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }

    return (data || []).map((b: any) => ({
      id: b.id,
      userId: b.user_id,
      startDate: b.start_date,
      endDate: b.end_date,
      createdAt: b.created_at,
    }));
  },

  async create(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking> {
    const newBooking = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: booking.userId,
      start_date: booking.startDate,
      end_date: booking.endDate,
      created_at: Date.now(),
    };

    const { data, error } = await supabase
      .from('bookings')
      .insert(newBooking)
      .select()
      .single();

    if (error) {
      console.error('Error creating booking:', error);
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      startDate: data.start_date,
      endDate: data.end_date,
      createdAt: data.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  },
};

// Medical Leave API
export const medicalLeaveApi = {
  async getAll(): Promise<MedicalLeave[]> {
    const { data, error } = await supabase
      .from('medical_leave')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching medical leave:', error);
      throw error;
    }

    return (data || []).map((ml: any) => ({
      id: ml.id,
      userId: ml.user_id,
      startDate: ml.start_date,
      endDate: ml.end_date,
      diseaseCode: ml.disease_code,
      workingDays: ml.working_days,
      year: ml.year,
      createdAt: ml.created_at ? new Date(ml.created_at).getTime() : Date.now(),
    }));
  },

  async getByUserId(userId: string): Promise<MedicalLeave[]> {
    const { data, error } = await supabase
      .from('medical_leave')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching user medical leave:', error);
      throw error;
    }

    return (data || []).map((ml: any) => ({
      id: ml.id,
      userId: ml.user_id,
      startDate: ml.start_date,
      endDate: ml.end_date,
      diseaseCode: ml.disease_code,
      workingDays: ml.working_days,
      year: ml.year,
      createdAt: ml.created_at ? new Date(ml.created_at).getTime() : Date.now(),
    }));
  },

  async getByUserIdAndYear(userId: string, year: number): Promise<MedicalLeave[]> {
    const { data, error } = await supabase
      .from('medical_leave')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching user medical leave by year:', error);
      throw error;
    }

    return (data || []).map((ml: any) => ({
      id: ml.id,
      userId: ml.user_id,
      startDate: ml.start_date,
      endDate: ml.end_date,
      diseaseCode: ml.disease_code,
      workingDays: ml.working_days,
      year: ml.year,
      createdAt: ml.created_at ? new Date(ml.created_at).getTime() : Date.now(),
    }));
  },

  async create(medicalLeave: Omit<MedicalLeave, 'id' | 'createdAt'>): Promise<MedicalLeave> {
    // Calculate working days
    const start = new Date(medicalLeave.startDate);
    const end = new Date(medicalLeave.endDate);
    const workingDays = await calculateWorkingDaysExcludingHolidays(start, end);

    const newMedicalLeave = {
      id: Math.random().toString(36).substr(2, 9),
      user_id: medicalLeave.userId,
      start_date: medicalLeave.startDate,
      end_date: medicalLeave.endDate,
      disease_code: medicalLeave.diseaseCode,
      working_days: workingDays,
      year: medicalLeave.year,
    };

    const { data, error } = await supabase
      .from('medical_leave')
      .insert(newMedicalLeave)
      .select()
      .single();

    if (error) {
      console.error('Error creating medical leave:', error);
      throw error;
    }

    return {
      id: data.id,
      userId: data.user_id,
      startDate: data.start_date,
      endDate: data.end_date,
      diseaseCode: data.disease_code,
      workingDays: data.working_days,
      year: data.year,
      createdAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('medical_leave')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting medical leave:', error);
      throw error;
    }
  },

  // Calculate total medical leave days for a user in a specific year
  async getTotalDaysForUserInYear(userId: string, year: number): Promise<number> {
    const leaves = await this.getByUserIdAndYear(userId, year);
    return leaves.reduce((total, leave) => total + leave.workingDays, 0);
  },
};

// Closed Periods API
export const closedPeriodsApi = {
  async getAll(): Promise<ClosedPeriod[]> {
    const { data, error } = await supabase
      .from('closed_periods')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching closed periods:', error);
      return [];
    }

    return (data || []).map((cp: any) => ({
      id: cp.id,
      startDate: cp.start_date,
      endDate: cp.end_date,
      description: cp.description || undefined,
      createdAt: cp.created_at,
    }));
  },

  async create(period: Omit<ClosedPeriod, 'id' | 'createdAt'>): Promise<ClosedPeriod> {
    const newPeriod = {
      id: Math.random().toString(36).substr(2, 9),
      start_date: period.startDate,
      end_date: period.endDate,
      description: period.description || null,
      created_at: Date.now(),
    };

    const { data, error } = await supabase
      .from('closed_periods')
      .insert(newPeriod)
      .select()
      .single();

    if (error) {
      console.error('Error creating closed period:', error);
      throw error;
    }

    return {
      id: data.id,
      startDate: data.start_date,
      endDate: data.end_date,
      description: data.description || undefined,
      createdAt: data.created_at,
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('closed_periods')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting closed period:', error);
      throw error;
    }
  },
};

// Helper function to calculate user's available vacation days (async version)
export async function calculateUserAvailableDays(user: User, bookings: Booking[], closedPeriods?: ClosedPeriod[]): Promise<number> {
  const currentYear = new Date().getFullYear();
  const maxDays = user.maxVacationDays || 28;
  const remainingFromPrevious = user.remainingDaysFromPreviousYear || 0;
  const lastReset = user.lastYearReset || currentYear;
  
  // If we're in a new year and reset hasn't been done, calculate as if it was done
  // (In production, you'd call resetYearlyVacationDays at the start of January)
  let effectiveRemainingFromPrevious = remainingFromPrevious;
  if (lastReset < currentYear) {
    // New year: previous year's remaining days carry over
    // But we need to calculate what was remaining from previous year
    // For now, use the stored value (should be updated by reset function)
    effectiveRemainingFromPrevious = remainingFromPrevious;
  }
  
  // Calculate used days in current year from bookings
  const currentYearBookings = bookings.filter(b => {
    if (b.userId !== user.id) return false;
    const bookingYear = new Date(b.startDate).getFullYear();
    return bookingYear === currentYear;
  });
  
  // Calculate working days used this year (excluding holidays)
  let usedDays = 0;
  for (const booking of currentYearBookings) {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const workingDays = await calculateWorkingDaysExcludingHolidays(start, end);
    usedDays += workingDays;
  }
  
  // Add days from closed periods in current year (everyone is on vacation during closed periods)
  if (closedPeriods && closedPeriods.length > 0) {
    for (const period of closedPeriods) {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      const periodYear = periodStart.getFullYear();
      
      // Only count closed periods from current year
      if (periodYear === currentYear) {
        // Check if period overlaps with current year
        const periodStartYear = periodStart.getFullYear();
        const periodEndYear = periodEnd.getFullYear();
        
        // Calculate working days for the part of the period that's in current year
        let actualStart = periodStart;
        let actualEnd = periodEnd;
        
        if (periodStartYear < currentYear) {
          actualStart = new Date(currentYear, 0, 1); // January 1 of current year
        }
        if (periodEndYear > currentYear) {
          actualEnd = new Date(currentYear, 11, 31); // December 31 of current year
        }
        
        const closedPeriodDays = await calculateWorkingDaysExcludingHolidays(actualStart, actualEnd);
        usedDays += closedPeriodDays;
      }
    }
  }
  
  // Total available = new year's days + remaining from previous - used this year
  const totalAvailable = maxDays + effectiveRemainingFromPrevious;
  return totalAvailable - usedDays;
}

// Synchronous version that uses a pre-loaded Set of holiday dates
// Use this in components where you already have holidayDates in state
export function calculateUserAvailableDaysSync(user: User, bookings: Booking[], holidayDates: Set<string>, closedPeriods?: ClosedPeriod[]): number {
  const currentYear = new Date().getFullYear();
  const maxDays = user.maxVacationDays || 28;
  const remainingFromPrevious = user.remainingDaysFromPreviousYear || 0;
  const lastReset = user.lastYearReset || currentYear;
  
  let effectiveRemainingFromPrevious = remainingFromPrevious;
  if (lastReset < currentYear) {
    effectiveRemainingFromPrevious = remainingFromPrevious;
  }
  
  // Calculate used days in current year from bookings
  const currentYearBookings = bookings.filter(b => {
    if (b.userId !== user.id) return false;
    const bookingYear = new Date(b.startDate).getFullYear();
    return bookingYear === currentYear;
  });
  
  // Calculate working days used this year (excluding holidays)
  let usedDays = 0;
  for (const booking of currentYearBookings) {
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const workingDays = calculateWorkingDaysExcludingHolidaysSync(start, end, holidayDates);
    usedDays += workingDays;
  }
  
  // Add days from closed periods in current year (everyone is on vacation during closed periods)
  if (closedPeriods && closedPeriods.length > 0) {
    for (const period of closedPeriods) {
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      const periodYear = periodStart.getFullYear();
      
      // Only count closed periods from current year
      if (periodYear === currentYear) {
        // Check if period overlaps with current year
        const periodStartYear = periodStart.getFullYear();
        const periodEndYear = periodEnd.getFullYear();
        
        // Calculate working days for the part of the period that's in current year
        let actualStart = periodStart;
        let actualEnd = periodEnd;
        
        if (periodStartYear < currentYear) {
          actualStart = new Date(currentYear, 0, 1); // January 1 of current year
        }
        if (periodEndYear > currentYear) {
          actualEnd = new Date(currentYear, 11, 31); // December 31 of current year
        }
        
        const closedPeriodDays = calculateWorkingDaysExcludingHolidaysSync(actualStart, actualEnd, holidayDates);
        usedDays += closedPeriodDays;
      }
    }
  }
  
  // Total available = new year's days + remaining from previous - used this year
  const totalAvailable = maxDays + effectiveRemainingFromPrevious;
  return totalAvailable - usedDays;
}

