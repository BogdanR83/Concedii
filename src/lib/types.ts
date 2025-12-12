// Role type
export type Role = 'EDUCATOR' | 'AUXILIARY' | 'ADMIN';

// User type
export type User = {
    id: string;
    name: string;
    role: Role;
    username?: string;
    mustChangePassword?: boolean;
    maxVacationDays?: number;
    remainingDaysFromPreviousYear?: number;
    lastYearReset?: number;
    active?: boolean;
};

// Booking type
export type Booking = {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    createdAt: number;
};

// Medical Leave type
export type MedicalLeave = {
    id: string;
    userId: string;
    startDate: string;
    endDate: string;
    diseaseCode: string;
    workingDays: number;
    year: number;
    createdAt: number;
};

// BookingState type
export type BookingState = {
    currentUser: User | null;
    users: User[];
    bookings: Booking[];
    medicalLeaves: MedicalLeave[];
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>;
    logout: () => void;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
    resetUserPassword: (userId: string) => Promise<{ success: boolean; error?: string }>;
    setUserMaxVacationDays: (userId: string, days: number) => Promise<{ success: boolean; error?: string }>;
    addBooking: (startDate: string, endDate: string) => Promise<{ success: boolean; error?: string }>;
    addBookingForUser: (userId: string, startDate: string, endDate: string) => Promise<{ success: boolean; error?: string }>;
    removeBooking: (bookingId: string) => Promise<void>;
    addMedicalLeave: (userId: string, startDate: string, endDate: string, diseaseCode: string) => Promise<{ success: boolean; error?: string }>;
    removeMedicalLeave: (medicalLeaveId: string) => Promise<void>;
    createUser: (name: string, role: Role, username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    toggleUserActive: (userId: string) => Promise<{ success: boolean; error?: string }>;
};
