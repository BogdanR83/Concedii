-- Script to initialize users with usernames and default passwords
-- Run this after creating the schema
-- Default password for all users: 12345

-- Note: You need to hash the password "12345" using the same hash function
-- The hash for "12345" with salt "concedii-app-salt-2024" is:
-- You can generate this in the browser console: 
-- import CryptoJS from 'crypto-js'; CryptoJS.SHA256('12345' + 'concedii-app-salt-2024').toString()

-- Insert users with usernames and password hashes
-- Default password for all: 12345
-- Hash: SHA256('12345' + 'concedii-app-salt-2024') = 7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13
-- Username format: first letter of first name + last name (lowercase, no diacritics)

INSERT INTO users (id, name, role, username, password_hash, must_change_password, max_vacation_days, remaining_days_from_previous_year, last_year_reset) VALUES
('admin-rusanescu', 'Rusănescu Irina Petruța', 'ADMIN', 'irusanescu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('admin-tarsitu', 'Tarșițu Roxana', 'ADMIN', 'rtarsitu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('1', 'Popa Ana-Maria', 'EDUCATOR', 'apopa', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('2', 'Brișculescu Mihaela', 'EDUCATOR', 'mbrisculescu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('3', 'Monoreanu Paula', 'EDUCATOR', 'pmonoreanu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('4', 'Chirilă Aurelia', 'EDUCATOR', 'achirila', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('5', 'Popa Gabriela', 'EDUCATOR', 'gpopa', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('6', 'Marin Elena', 'EDUCATOR', 'emarin', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('7', 'Croitoru Georgiana', 'EDUCATOR', 'gcroitoru', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('8', 'Ghiciu Marinela', 'AUXILIARY', 'mghiciu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('9', 'Farcaș Gabriela', 'AUXILIARY', 'gfarcas', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('10', 'Burduje Elena', 'AUXILIARY', 'eburduje', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('11', 'Alecu Mihaela', 'AUXILIARY', 'malecu', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('12', 'Cojocaru Ana-Maria', 'AUXILIARY', 'acojocaru', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('13', 'Alaref Daniela', 'AUXILIARY', 'dalaref', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('14', 'Dumitrache Florentina', 'AUXILIARY', 'fdumitrache', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW())),
('15', 'Todor Mihaela', 'AUXILIARY', 'mtodor', '7f946de796ef6fee6f4e1d578423f9089e6038ab58a5cfca3d2f02ec11b82b13', true, 28, 0, EXTRACT(YEAR FROM NOW()))
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    must_change_password = EXCLUDED.must_change_password,
    max_vacation_days = EXCLUDED.max_vacation_days;

