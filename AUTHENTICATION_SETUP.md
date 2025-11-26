# Setup Autentificare - Instrucțiuni

## Pași pentru configurare

### 1. Actualizează schema bazei de date

Rulează în Supabase SQL Editor conținutul actualizat din `database/schema.sql` (care include câmpurile pentru username, password_hash, must_change_password).

### 2. Importă utilizatorii cu username-uri și parole

Rulează în Supabase SQL Editor conținutul din `database/init-users.sql`.

Acest script va crea:
- **Username-uri** pentru fiecare utilizator (format: prima literă din prenume + nume, fără diacritice)
- **Parolă inițială**: `12345` pentru toți utilizatorii
- **Flag must_change_password**: `true` pentru toți (forțează schimbarea la prima logare)

### 3. Username-uri create

| Nume | Username | Parolă inițială |
|------|----------|-----------------|
| Rusănescu Irina Petruța | `irusanescu` | 12345 |
| Tarșițu Roxana | `rtarsitu` | 12345 |
| Popa Ana-Maria | `apopa` | 12345 |
| Brișculescu Mihaela | `mbrisculescu` | 12345 |
| Monoreanu Paula | `pmonoreanu` | 12345 |
| Chirilă Aurelia | `achirila` | 12345 |
| Popa Gabriela | `gpopa` | 12345 |
| Marin Elena | `emarin` | 12345 |
| Croitoru Georgiana | `gcroitoru` | 12345 |
| Ghiciu Marinela | `mghiciu` | 12345 |
| Farcaș Gabriela | `gfarcas` | 12345 |
| Burduje Elena | `eburduje` | 12345 |
| Alecu Mihaela | `malecu` | 12345 |
| Cojocaru Ana-Maria | `acojocaru` | 12345 |
| Alaref Daniela | `dalaref` | 12345 |
| Dumitrache Florentina | `fdumitrache` | 12345 |
| Todor Mihaela | `mtodor` | 12345 |

## Funcționalități

### Pentru utilizatori

1. **Login**: Introdu username-ul și parola inițială (12345)
2. **Schimbare parolă obligatorie**: La prima logare, utilizatorul va fi forțat să-și schimbe parola
3. **Schimbare parolă ulterioară**: Utilizatorul poate schimba parola oricând din setări (dacă este implementat)

### Pentru administratori

1. **Resetare parolă**: În panoul de admin, secțiunea "Gestionare utilizatori", adminul poate reseta parola oricărui utilizator
2. **Parola resetată**: Va fi setată la `12345` și utilizatorul va trebui să o schimbe la următoarea logare

## Securitate

- Parolele sunt hash-uite folosind SHA256 cu salt
- Parolele nu sunt stocate în plain text
- Utilizatorii sunt forțați să schimbe parola la prima logare
- Adminul poate reseta parolele utilizatorilor care le-au uitat

## Note importante

- Parola inițială pentru toți utilizatorii este: **12345**
- După resetarea parolei de către admin, parola devine din nou: **12345**
- Utilizatorul trebuie să schimbe parola la următoarea logare după resetare
- Username-urile sunt generate automat pe baza numelui (prima literă din prenume + nume)

