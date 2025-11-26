-- Function to reset yearly vacation days for all users
-- Run this in January each year to:
-- 1. Calculate remaining days from previous year
-- 2. Carry them over to the new year
-- 3. Update last_year_reset to current year

-- This is a SQL function that can be called from the app or run manually
-- For now, use the API function resetYearlyVacationDays() from the app

-- Manual SQL version (if needed):
-- You would need to:
-- 1. Calculate used days per user for previous year
-- 2. Calculate remaining = (max_vacation_days + remaining_days_from_previous_year) - used_days
-- 3. Update remaining_days_from_previous_year and last_year_reset

-- Note: The app's resetYearlyVacationDays() function handles this automatically

