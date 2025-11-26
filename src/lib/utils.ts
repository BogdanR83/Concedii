import type { User } from './types';

export const MOCK_USERS: User[] = [
    { id: 'admin-rusanescu', name: 'Rusănescu Irina Petruța', role: 'ADMIN' },
    { id: 'admin-tarsitu', name: 'Tarșițu Roxana', role: 'ADMIN' },
    { id: '1', name: 'Popa Ana-Maria', role: 'EDUCATOR' },
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
    return date.toISOString().split('T')[0];
}
