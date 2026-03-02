# 🌍 Sistema de Internacionalizare (i18n)

## Prezentare generală

Platforma KALINA include acum un sistem complet de internacionalizare care permite utilizatorilor să selecteze limba preferată pentru interfața aplicației.

## Limbi suportate

- 🇷🇴 **Română** (ro) - Limba implicită
- 🇬🇧 **English** (en)
- 🇪🇸 **Español** (es)
- 🇫🇷 **Français** (fr)
- 🇩🇪 **Deutsch** (de)
- 🇮🇹 **Italiano** (it)
- 🇸🇦 **العربية / Arabic** (ar) - cu suport RTL (Right-to-Left)

## Arhitectură

### Context de limbă (`LanguageContext.tsx`)

Contextul gestionează:
- **Stocarea preferinței**: În localStorage și în baza de date
- **Sincronizarea**: Între browser și profilul utilizatorului
- **Funcția de traducere**: `t(key)` pentru accesarea textelor
- **Suport RTL**: Detectare automată și aplicare direcție pentru limba arabă
- **Flag `isRTL`**: Disponibil în context pentru componente care necesită ajustări RTL

### Fișiere modificate

1. **`/src/contexts/LanguageContext.tsx`** - Nou creat
   - Context React pentru gestionarea limbii
   - Dicționar de traduceri pentru toate limbile
   - Funcționalitate de salvare în Supabase

2. **`/src/App.tsx`** - Actualizat
   - Adăugat `LanguageProvider` la nivel de aplicație

3. **`/src/pages/AccountSettings.tsx`** - Actualizat
   - Integrat hook `useLanguage()`
   - Interfață tradusă folosind funcția `t()`
   - Selector de limbă funcțional

4. **`/supabase/migrations/20251105100000_add_preferred_language_to_profiles.sql`** - Nou creat
   - Adaugă coloana `preferred_language` la tabelul `profiles`

## Utilizare

### În componente

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { language, setLanguage, t, isRTL } = useLanguage();
  
  return (
    <div className={isRTL ? 'rtl-specific-class' : ''}>
      <h1>{t('common.title')}</h1>
      <button onClick={() => setLanguage('en')}>
        Switch to English
      </button>
      <button onClick={() => setLanguage('ar')}>
        التبديل إلى العربية
      </button>
    </div>
  );
}
```

### Adăugarea de noi traduceri

Editați `/src/contexts/LanguageContext.tsx` și adăugați cheile în obiectul `translations`:

```typescript
const translations: Record<Language, Record<string, string>> = {
  ro: {
    'new.key': 'Text în română',
    // ... alte traduceri
  },
  en: {
    'new.key': 'Text in English',
    // ... alte traduceri
  },
  // ... alte limbi
};
```

## Setări utilizator

Utilizatorii pot schimba limba din:
1. **Setări Cont** → **Preferințe** → **Limba implicită**
2. Selecția este salvată automat în:
   - `localStorage` pentru acces rapid
   - Tabelul `profiles` pentru persistență între dispozitive

## Flux de lucru

1. La încărcarea aplicației:
   - Se verifică `localStorage` pentru limba salvată
   - Dacă nu există, se încarcă din profilul utilizatorului
   - Dacă nici acolo nu există, se folosește limba implicită (română)

2. La schimbarea limbii:
   - UI-ul se actualizează instant
   - Preferința se salvează în `localStorage`
   - Se face update în baza de date (pentru utilizatori autentificați)

3. Sincronizare:
   - La login, limba din profil suprascrie cea din `localStorage`
   - La schimbare, ambele surse sunt actualizate

## Cheile de traducere disponibile

### Navigare (`nav.*`)
- `nav.dashboard`, `nav.agents`, `nav.outbound`, etc.

### Comune (`common.*`)
- `common.save`, `common.cancel`, `common.delete`, etc.

### Setări (`settings.*`)
- `settings.title`, `settings.account`, `settings.preferences`, etc.

## Migrare bază de date

Pentru a aplica migrația în Supabase:

```bash
# Local
supabase db push

# Production
# Migrația se va aplica automat la următorul deploy
```

## Viitor

Planuri pentru extinderea sistemului:
- [x] Traducerea completă a tuturor paginilor principale
- [x] Suport pentru RTL (Right-to-Left) pentru limba arabă
- [ ] Detectarea automată a limbii browserului
- [ ] Export/Import traduceri în format JSON
- [ ] Tool pentru verificarea cheilor lipsă
- [ ] Adăugare limbi asiatice (中文, 日本語, 한국어)

## Note tehnice

- Traducerile sunt încărcate în memorie (nu lazy-loaded)
- Pentru performanță optimă, păstrați cheile scurte și descriptive
- Evitați hardcoding-ul textelor în componente - folosiți întotdeauna `t()`
- Testați cu toate limbile înainte de deploy

---

**Autor**: Echipa KALINA Development  
**Dată**: 5 noiembrie 2025
