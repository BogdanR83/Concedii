import type { User } from './types';
import { eachDayOfInterval } from 'date-fns';

export const MOCK_USERS: User[] = [
    { id: 'admin-rusanescu', name: 'Rusănescu Irina Petruța', role: 'ADMIN' },
    { id: 'admin-tarsitu', name: 'Tarșițu Roxana', role: 'ADMIN' },
    { id: '1', name: 'Stancu Ana-Maria', role: 'EDUCATOR' },
    { id: '2', name: 'Brișculescu Mihaela', role: 'EDUCATOR' },
    { id: '3', name: 'Monoreanu Paula', role: 'EDUCATOR' },
    { id: '4', name: 'Chirilă Aurelia', role: 'EDUCATOR' },
    { id: '5', name: 'Popa Gabriela', role: 'EDUCATOR' },
    { id: '6', name: 'Marin Elena', role: 'EDUCATOR' },
    { id: '7', name: 'Croitoru Georgiana', role: 'EDUCATOR' },
    { id: '8', name: 'Ghiciu Marinela', role: 'AUXILIARY' },
    { id: '9', name: 'Farcaș Gabriela', role: 'AUXILIARY' },
    { id: '10', name: 'Burduje Elena', role: 'AUXILIARY' },
    { id: '11', name: 'Alecu Mihaela', role: 'AUXILIARY' },
    { id: '12', name: 'Cojocaru Ana-Maria', role: 'AUXILIARY' },
    { id: '13', name: 'Alaref Daniela', role: 'AUXILIARY' },
    { id: '14', name: 'Dumitrache Florentina', role: 'AUXILIARY' },
    { id: '15', name: 'Todor Mihaela', role: 'AUXILIARY' },
];

export function formatDate(date: Date): string {
    // Use local date components to avoid timezone issues
    // This ensures the date string matches what the user sees in the calendar
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD) to local date string without timezone conversion
 * This prevents the date from shifting by one day when converting from UTC
 */
export function formatDateStringToLocal(dateString: string, options?: Intl.DateTimeFormatOptions): string {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('ro-RO', options);
}

// Interface for holiday API response
interface HolidayDate {
    date: string;
    weekday: string;
}

interface Holiday {
    name: string;
    date: HolidayDate[];
}

// Cache for holidays to avoid multiple API calls
const holidaysCache: Map<number, Holiday[]> = new Map();

/**
 * Calculates Easter date for Orthodox calendar (Gregorian calendar)
 * Uses the algorithm for calculating Orthodox Easter
 */
function calculateOrthodoxEaster(year: number): Date {
    // Orthodox Easter calculation (Gregorian calendar)
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    
    // Convert from Julian to Gregorian (add 13 days for dates after 1900)
    const easter = new Date(year, month - 1, day);
    if (year > 1900) {
        easter.setDate(easter.getDate() + 13);
    }
    
    return easter;
}

/**
 * Gets hardcoded Romanian legal holidays for a given year
 */
function getHardcodedRomanianHolidays(year: number): Date[] {
    const holidays: Date[] = [];
    
    // Fixed holidays
    holidays.push(new Date(year, 0, 1));   // 1 ianuarie - Anul Nou
    holidays.push(new Date(year, 0, 2));   // 2 ianuarie - A doua zi de Anul Nou
    holidays.push(new Date(year, 0, 24));   // 24 ianuarie - Ziua Unirii Principatelor Române
    holidays.push(new Date(year, 4, 1));    // 1 mai - Ziua Muncii
    holidays.push(new Date(year, 5, 1));    // 1 iunie - Ziua Copilului
    holidays.push(new Date(year, 7, 15));   // 15 august - Adormirea Maicii Domnului
    holidays.push(new Date(year, 10, 30));  // 30 noiembrie - Sfântul Andrei
    holidays.push(new Date(year, 11, 1));   // 1 decembrie - Ziua Națională
    holidays.push(new Date(year, 11, 25));  // 25 decembrie - Crăciunul
    holidays.push(new Date(year, 11, 26));  // 26 decembrie - A doua zi de Crăciun
    
    // Variable holidays (Orthodox Easter)
    const easter = calculateOrthodoxEaster(year);
    holidays.push(new Date(easter)); // Paște
    
    // Second day of Easter (Monday after Easter)
    const easterMonday = new Date(easter);
    easterMonday.setDate(easterMonday.getDate() + 1);
    holidays.push(easterMonday);
    
    // Pentecost (Rusalii) - 50 days after Easter
    const pentecost = new Date(easter);
    pentecost.setDate(pentecost.getDate() + 49);
    holidays.push(pentecost);
    
    // Second day of Pentecost
    const pentecostMonday = new Date(pentecost);
    pentecostMonday.setDate(pentecostMonday.getDate() + 1);
    holidays.push(pentecostMonday);
    
    return holidays;
}

/**
 * Fetches holidays for a given year from the API
 * Falls back to hardcoded holidays if API fails (CORS or other errors)
 */
export async function getHolidaysForYear(year: number): Promise<Holiday[]> {
    // Check cache first
    if (holidaysCache.has(year)) {
        return holidaysCache.get(year)!;
    }

    try {
        const response = await fetch(`https://zilelibere.webventure.ro/api/${year}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
            // Add mode: 'cors' explicitly, though it won't help if server doesn't allow it
            mode: 'cors',
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch holidays for year ${year}`);
        }
        
        const holidays: Holiday[] = await response.json();
        holidaysCache.set(year, holidays);
        return holidays;
    } catch (error) {
        // If API fails (CORS or network error), use hardcoded holidays
        console.warn(`Could not fetch holidays from API for year ${year}, using hardcoded holidays:`, error);
        
        // Convert hardcoded dates to Holiday format
        const hardcodedDates = getHardcodedRomanianHolidays(year);
        const holidays: Holiday[] = [
            {
                name: 'Sărbători legale România',
                date: hardcodedDates.map(date => ({
                    date: formatDate(date),
                    weekday: ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'][date.getDay()]
                }))
            }
        ];
        
        holidaysCache.set(year, holidays);
        return holidays;
    }
}

/**
 * Gets all holiday dates as Date objects for a given year
 */
export async function getHolidayDates(year: number): Promise<Date[]> {
    const holidays = await getHolidaysForYear(year);
    const dates: Date[] = [];
    
    for (const holiday of holidays) {
        for (const holidayDate of holiday.date) {
            const date = new Date(holidayDate.date);
            if (!isNaN(date.getTime())) {
                dates.push(date);
            }
        }
    }
    
    return dates;
}

/**
 * Checks if a date is a holiday (non-working day)
 */
export async function isHoliday(date: Date): Promise<boolean> {
    const year = date.getFullYear();
    const holidayDates = await getHolidayDates(year);
    
    const dateStr = formatDate(date);
    return holidayDates.some(hd => formatDate(hd) === dateStr);
}

/**
 * Checks if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Checks if a date is a working day (not weekend and not holiday)
 */
export async function isWorkingDay(date: Date): Promise<boolean> {
    if (isWeekend(date)) {
        return false;
    }
    return !(await isHoliday(date));
}

/**
 * Calculates working days in a date range, excluding weekends and legal holidays
 * This is the function that should be used for calculating vacation days
 * @param startDate Start date of the range
 * @param endDate End date of the range
 * @param holidayDates Optional Set of holiday date strings (YYYY-MM-DD format). If provided, uses this instead of fetching from API.
 */
export async function calculateWorkingDaysExcludingHolidays(startDate: Date, endDate: Date, holidayDates?: Set<string>): Promise<number> {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let workingDays = 0;
    
    let holidaySet: Set<string> | null = null;
    
    if (holidayDates) {
        // Use provided holiday dates
        holidaySet = holidayDates;
    } else {
        // Get holidays for all years in the range
        const startYear = startDate.getFullYear();
        const endYear = endDate.getFullYear();
        const allHolidayDates: Date[] = [];
        
        for (let year = startYear; year <= endYear; year++) {
            const yearHolidays = await getHolidayDates(year);
            allHolidayDates.push(...yearHolidays);
        }
        
        holidaySet = new Set(allHolidayDates.map(d => formatDate(d)));
    }
    
    for (const day of days) {
        // Skip weekends
        if (isWeekend(day)) {
            continue;
        }
        
        // Skip holidays
        if (holidaySet && holidaySet.has(formatDate(day))) {
            continue;
        }
        
        workingDays++;
    }
    
    return workingDays;
}

/**
 * Synchronous version that uses a pre-loaded Set of holiday dates
 * Use this when you already have the holiday dates loaded (e.g., from component state)
 */
export function calculateWorkingDaysExcludingHolidaysSync(startDate: Date, endDate: Date, holidayDates: Set<string>): number {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    let workingDays = 0;
    
    for (const day of days) {
        // Skip weekends
        if (isWeekend(day)) {
            continue;
        }
        
        // Skip holidays
        if (holidayDates.has(formatDate(day))) {
            continue;
        }
        
        workingDays++;
    }
    
    return workingDays;
}

/**
 * Gets the last week of August for a given year
 * Returns the start and end dates of the last week (Monday to Sunday)
 * The week must be entirely within August (doesn't extend into September)
 */
export function getLastWeekOfAugust(year: number): { start: Date; end: Date } {
    // August 31st
    const august31 = new Date(year, 7, 31); // Month is 0-indexed, so 7 = August
    
    // Find the last Monday of August
    let lastMonday = new Date(august31);
    while (lastMonday.getDay() !== 1) { // 1 = Monday
        lastMonday.setDate(lastMonday.getDate() - 1);
    }
    
    // The week ends on Sunday (6 days after Monday)
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    
    // If the Sunday is in September, move the week back to be entirely in August
    if (lastSunday.getMonth() !== 7) { // 7 = August
        // Move back one week
        lastMonday.setDate(lastMonday.getDate() - 7);
        lastSunday.setDate(lastSunday.getDate() - 7);
    }
    
    return {
        start: lastMonday,
        end: lastSunday
    };
}

/**
 * Gets the week containing Christmas (December 25) for a given year
 * Returns the start and end dates of the week (Monday to Sunday)
 */
export function getChristmasWeek(year: number): { start: Date; end: Date } {
    // December 25th
    const christmas = new Date(year, 11, 25); // Month is 0-indexed, so 11 = December
    
    // Find the Monday of the week containing Christmas
    let monday = new Date(christmas);
    while (monday.getDay() !== 1) { // 1 = Monday
        monday.setDate(monday.getDate() - 1);
    }
    
    // The week ends on Sunday (6 days after Monday)
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    
    return {
        start: monday,
        end: sunday
    };
}

/**
 * Gets the last week of December for a given year
 * Returns the start and end dates of the last week (Monday to Sunday)
 * The week must be entirely within December (doesn't extend into January)
 */
export function getLastWeekOfDecember(year: number): { start: Date; end: Date } {
    // December 31st
    const december31 = new Date(year, 11, 31); // Month is 0-indexed, so 11 = December
    
    // Find the last Monday of December
    let lastMonday = new Date(december31);
    while (lastMonday.getDay() !== 1) { // 1 = Monday
        lastMonday.setDate(lastMonday.getDate() - 1);
    }
    
    // The week ends on Sunday (6 days after Monday)
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    
    // If the Sunday is in January, move the week back to be entirely in December
    if (lastSunday.getMonth() !== 11) { // 11 = December
        // Move back one week
        lastMonday.setDate(lastMonday.getDate() - 7);
        lastSunday.setDate(lastSunday.getDate() - 7);
    }
    
    return {
        start: lastMonday,
        end: lastSunday
    };
}

/**
 * Gets January 3-5 for a given year
 * Returns the start and end dates
 */
export function getJanuary3to5(year: number): { start: Date; end: Date } {
    return {
        start: new Date(year, 0, 3), // January 3
        end: new Date(year, 0, 5)    // January 5
    };
}

/**
 * Checks if a date is in a special period where everyone can take vacation (no restrictions)
 * Special periods:
 * - Last week of December
 * - January 3-5
 * - Last week of August
 */
export function isDateInSpecialPeriod(date: Date): boolean {
    const year = date.getFullYear();
    const dateStr = formatDate(date);
    
    // Check last week of December
    const lastWeekDecember = getLastWeekOfDecember(year);
    const lastWeekDecStartStr = formatDate(lastWeekDecember.start);
    const lastWeekDecEndStr = formatDate(lastWeekDecember.end);
    if (dateStr >= lastWeekDecStartStr && dateStr <= lastWeekDecEndStr) {
        return true;
    }
    
    // Check January 3-5
    const jan3to5 = getJanuary3to5(year);
    const jan3to5StartStr = formatDate(jan3to5.start);
    const jan3to5EndStr = formatDate(jan3to5.end);
    if (dateStr >= jan3to5StartStr && dateStr <= jan3to5EndStr) {
        return true;
    }
    
    // Check last week of August
    const lastWeekAugust = getLastWeekOfAugust(year);
    const lastWeekAugStartStr = formatDate(lastWeekAugust.start);
    const lastWeekAugEndStr = formatDate(lastWeekAugust.end);
    if (dateStr >= lastWeekAugStartStr && dateStr <= lastWeekAugEndStr) {
        return true;
    }
    
    return false;
}

/**
 * Checks if a date range overlaps with any special period (where everyone can take vacation)
 */
export function isDateRangeInSpecialPeriod(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check all years that might be in the range
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
        // Check last week of December
        const lastWeekDecember = getLastWeekOfDecember(year);
        const startStr = formatDate(start);
        const endStr = formatDate(end);
        const lastWeekDecStartStr = formatDate(lastWeekDecember.start);
        const lastWeekDecEndStr = formatDate(lastWeekDecember.end);
        
        if (!(endStr < lastWeekDecStartStr || startStr > lastWeekDecEndStr)) {
            return true;
        }
        
        // Check January 3-5
        const jan3to5 = getJanuary3to5(year);
        const jan3to5StartStr = formatDate(jan3to5.start);
        const jan3to5EndStr = formatDate(jan3to5.end);
        
        if (!(endStr < jan3to5StartStr || startStr > jan3to5EndStr)) {
            return true;
        }
        
        // Check last week of August
        const lastWeekAugust = getLastWeekOfAugust(year);
        const lastWeekAugStartStr = formatDate(lastWeekAugust.start);
        const lastWeekAugEndStr = formatDate(lastWeekAugust.end);
        
        if (!(endStr < lastWeekAugStartStr || startStr > lastWeekAugEndStr)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Checks if a date range overlaps with a blocked period
 */
export function isDateInBlockedPeriod(date: Date, year: number): boolean {
    const lastWeekAugust = getLastWeekOfAugust(year);
    const christmasWeek = getChristmasWeek(year);
    
    const dateStr = formatDate(date);
    const lastWeekStartStr = formatDate(lastWeekAugust.start);
    const lastWeekEndStr = formatDate(lastWeekAugust.end);
    const christmasStartStr = formatDate(christmasWeek.start);
    const christmasEndStr = formatDate(christmasWeek.end);
    
    return (
        (dateStr >= lastWeekStartStr && dateStr <= lastWeekEndStr) ||
        (dateStr >= christmasStartStr && dateStr <= christmasEndStr)
    );
}

/**
 * Checks if a date range overlaps with any blocked period
 */
export function isDateRangeBlocked(startDate: string, endDate: string): boolean {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check all years that might be in the range
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    for (let year = startYear; year <= endYear; year++) {
        const lastWeekAugust = getLastWeekOfAugust(year);
        const christmasWeek = getChristmasWeek(year);
        
        const startStr = formatDate(start);
        const endStr = formatDate(end);
        const lastWeekStartStr = formatDate(lastWeekAugust.start);
        const lastWeekEndStr = formatDate(lastWeekAugust.end);
        const christmasStartStr = formatDate(christmasWeek.start);
        const christmasEndStr = formatDate(christmasWeek.end);
        
        // Check if range overlaps with last week of August
        if (!(endStr < lastWeekStartStr || startStr > lastWeekEndStr)) {
            return true;
        }
        
        // Check if range overlaps with Christmas week
        if (!(endStr < christmasStartStr || startStr > christmasEndStr)) {
            return true;
        }
    }
    
    return false;
}
