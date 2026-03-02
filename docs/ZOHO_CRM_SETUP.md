# Configurare Zoho CRM - Ghid Complet

Acest ghid te va ajuta să conectezi contul tău Zoho CRM cu Kallina prin intermediul OAuth 2.0. Vei avea nevoie să creezi o aplicație în Zoho API Console și să obții credențialele necesare (Client ID și Client Secret).

## Prerequisite

- Cont activ Zoho CRM
- Acces de administrator la contul Zoho
- Acces la Zoho API Console

## Pasul 1: Identifică Regiunea Contului Tău Zoho

Zoho operează pe mai multe data center-uri regionale. Este important să identifici regiunea corectă a contului tău:

### Regiuni Disponibile:

- **Europe (.eu)** - Pentru conturi europene
- **United States (.com)** - Pentru conturi din SUA
- **India (.in)** - Pentru conturi din India
- **Australia (.au)** - Pentru conturi din Australia
- **Japan (.jp)** - Pentru conturi din Japonia

### Cum Identifici Regiunea:

1. Autentifică-te în contul tău Zoho CRM
2. Verifică URL-ul din bara de adrese a browserului:
   - Dacă vezi `zoho.eu` → Regiunea ta este **Europe**
   - Dacă vezi `zoho.com` → Regiunea ta este **United States**
   - Dacă vezi `zoho.in` → Regiunea ta este **India**
   - Dacă vezi `zoho.com.au` → Regiunea ta este **Australia**
   - Dacă vezi `zoho.jp` → Regiunea ta este **Japan**

## Pasul 2: Accesează Zoho API Console

Deschide Zoho API Console corespunzător regiunii tale:

- **Europe**: https://api-console.zoho.eu/
- **United States**: https://api-console.zoho.com/
- **India**: https://api-console.zoho.in/
- **Australia**: https://api-console.zoho.com.au/
- **Japan**: https://api-console.zoho.jp/

**Important**: Asigură-te că accesezi consola corectă pentru regiunea ta, altfel vei întâmpina erori la conectare.

## Pasul 3: Creează o Aplicație Self Client

1. În Zoho API Console, click pe butonul **"ADD CLIENT"** sau **"CREATE NEW CLIENT"**

2. Selectează tipul de client: **"Self Client"**
   - Self Client este potrivit pentru integrări personale și aplicații private
   - Nu necesită aprobare de la Zoho (spre deosebire de Published Apps)

3. Completează detaliile aplicației:
   - **Client Name**: Poți folosi "Kallina Integration" sau orice nume descriptiv
   - **Company Name**: Numele companiei tale (opțional)
   - **Homepage URL**: `https://app.kallina.info` (URL-ul aplicației Kallina)

4. Click pe **"CREATE"**

## Pasul 4: Configurează Redirect URI

Aceasta este cea mai importantă parte a configurării:

1. După crearea aplicației, vei vedea secțiunea **"Client Secret"**

2. Găsește câmpul **"Authorized Redirect URIs"**

3. Adaugă următorul URI **exact așa cum este scris**:
   ```
   https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/zoho-oauth-callback
   ```

   **Important**:
   - URI-ul trebuie să fie **exact identic** cu cel de mai sus
   - OAuth nu va funcționa dacă URI-ul este diferit
   - Nu adăuga slash (`/`) la final
   - Verifică că începe cu `https://`
   - **Nu schimba nimic** în acest URI

4. Click pe **"UPDATE"** sau **"SAVE"** pentru a salva modificările

## Pasul 5: Obține Client ID și Client Secret

1. După salvarea Redirect URI, vei vedea:
   - **Client ID**: Un șir lung de caractere (ex: `1000.XXXXXXXXXXXXXX`)
   - **Client Secret**: Un alt șir de caractere (click pe "Show" pentru a-l vizualiza)

2. **Copiază ambele valori cu atenție**:
   - Click pe iconița de copiere lângă Client ID
   - Click pe iconița de copiere lângă Client Secret
   - Păstrează-le într-un loc sigur temporar (de ex. Notepad)

**Important**:
- Nu împărtăși niciodată aceste credențiale cu alții
- Client Secret este sensibil și trebuie păstrat în siguranță
- Dacă pierzi Client Secret, poți să-l regenerezi din consolă

## Pasul 6: Configurează Scopes (Permisiuni)

Aplicația Kallina necesită următoarele permisiuni pentru a funcționa corect:

- **ZohoCRM.modules.ALL** - Acces complet la modulele CRM (Leads, Contacts, Accounts, etc.)
- **ZohoCRM.settings.ALL** - Acces la setările CRM (picklist values, custom fields, etc.)

**Notă**: Aceste scope-uri sunt configurate automat în procesul de OAuth, nu trebuie să le configurezi manual în consolă.

## Pasul 7: Conectează Zoho CRM în Kallina

1. Autentifică-te în contul tău Kallina

2. Navighează la pagina **Integrări** din meniu

3. Găsește cardul **Zoho CRM**

4. Click pe butonul **"Configurează OAuth Credentials"**

5. Completează formularul:
   - **Zoho Region**: Selectează regiunea identificată la Pasul 1
   - **Client ID**: Lipește Client ID-ul copiat din Zoho API Console
   - **Client Secret**: Lipește Client Secret-ul copiat din Zoho API Console

6. Click pe **"Conectează Zoho CRM"**

7. Vei fi redirecționat către pagina de autorizare Zoho:
   - Verifică permisiunile solicitate
   - Click pe **"Accept"** sau **"Allow"** pentru a autoriza accesul
   - Vei fi redirecționat înapoi în Kallina

8. După redirecționare, conexiunea va fi finalizată automat

9. Verifică că badge-ul **"Conectat"** apare în cardul Zoho CRM

## Verificare Conexiune

Pentru a verifica că totul funcționează corect:

1. În cardul Zoho CRM din pagina Integrări, click pe **"Verifică status"**

2. Dacă vezi iconița verde și mesajul "Zoho CRM este conectat și sincronizează automat", totul este configurat corect

3. Poți acum să folosești workflow-urile Zoho CRM în Kallina:
   - Importă contacte din Zoho CRM
   - Sincronizează call logs în Zoho Activities
   - Actualizează Lead Status automat după apeluri
   - Creează sau actualizează înregistrări în Zoho CRM

## Funcționalități Disponibile

După conectare, vei avea acces la:

- **Call Logs → Zoho Activities**: Apelurile tale din Kallina vor fi sincronizate automat ca activități în Zoho CRM
- **Import Contacte**: Importă contacte din Zoho (Leads, Contacts, Accounts) în campaniile Kallina
- **Update Lead Status**: Actualizează automat statusul Lead-urilor după apeluri
- **Sincronizare Bidirecțională**: Modificările sunt sincronizate în ambele sensuri
- **Get Picklist Values**: Obține valorile dropdown-urilor din Zoho pentru a le folosi în workflow-uri
- **Create/Update Records**: Creează sau actualizează înregistrări în orice modul Zoho CRM

## Troubleshooting - Probleme Comune

### ❌ "Invalid Client ID passed does not exist"

**Cauze**:
- Client ID introdus greșit
- Regiunea selectată nu corespunde cu regiunea contului Zoho
- Client ID copiat incomplet (lipsesc caractere)

**Soluții**:
1. Verifică că ai selectat regiunea corectă în dropdown
2. Copiază din nou Client ID din Zoho API Console
3. Verifică că nu ai spații în plus la început sau sfârșit
4. Asigură-te că accesezi consola API corectă pentru regiunea ta

### ❌ "Redirect URI mismatch"

**Cauze**:
- Redirect URI configurat greșit în Zoho API Console
- URI-ul nu este exact identic cu cel așteptat

**Soluții**:
1. Verifică că ai adăugat URI-ul corect în Zoho API Console:
   ```
   https://your-project-id.supabase.co/functions/v1/zoho-oauth-callback
   ```
2. Verifică că nu ai adăugat slash (`/`) la final
3. Verifică că ai înlocuit `your-project-id` cu ID-ul corect
4. Salvează modificările în consolă și încearcă din nou

### ❌ "Authorization failed" după Accept

**Cauze**:
- Client Secret introdus greșit
- Token-ul OAuth a expirat
- Probleme de rețea

**Soluții**:
1. Verifică Client Secret din nou
2. Încearcă să te reconectezi (procesul va suprascrie conexiunea anterioară)
3. Verifică conexiunea la internet
4. Verifică că contul Zoho este activ și accesibil

### ❌ "Token expired" după un timp

**Cauze**:
- Token-ul de acces a expirat (normal după 1 oră)
- Refresh token-ul nu funcționează

**Soluții**:
1. Nu e nevoie să faci nimic - sistemul reîmprospătează automat token-ul
2. Dacă problema persistă, deconectează și reconectează contul Zoho
3. Verifică că Client Secret este încă valid în Zoho API Console

### ❌ "Insufficient privileges" sau "Permission denied"

**Cauze**:
- Contul Zoho nu are permisiuni de administrator
- Scope-urile nu au fost autorizate corect

**Soluții**:
1. Asigură-te că te-ai autentificat cu un cont care are permisiuni de administrator în Zoho CRM
2. În procesul de OAuth, verifică că ai acceptat toate permisiunile solicitate
3. Încearcă să te deconectezi și reconectezi, acordând toate permisiunile

### ❌ Nu se întâmplă nimic după "Conectează Zoho CRM"

**Cauze**:
- Pop-up blocker activ în browser
- Erori JavaScript în consolă
- Probleme de rețea

**Soluții**:
1. Verifică dacă browser-ul a blocat pop-up-ul
2. Permite pop-up-uri pentru site-ul Kallina
3. Deschide consola browser-ului (F12) și verifică dacă sunt erori
4. Încearcă un alt browser sau modul incognito

## Deconectare

Dacă dorești să deconectezi contul Zoho CRM:

1. În pagina Integrări, găsește cardul Zoho CRM
2. Click pe butonul de deconectare (dacă este disponibil)
3. Sau șterge manual conexiunea din baza de date

**Notă**: După deconectare, workflow-urile care folosesc Zoho CRM nu vor mai funcționa până când te reconectezi.

## Regenerare Credentials

Dacă pierzi Client Secret sau suspectezi că a fost compromis:

1. Accesează Zoho API Console pentru regiunea ta
2. Găsește aplicația creată anterior
3. Click pe **"Regenerate Secret"** sau butonul similar
4. Copiază noul Client Secret
5. În Kallina, deconectează și reconectează contul folosind noul Client Secret

**Important**: După regenerare, vechiul Client Secret nu va mai funcționa.

## Resurse Suplimentare

- [Zoho CRM API Documentation](https://www.zoho.com/crm/developer/docs/api/v2/)
- [Zoho OAuth 2.0 Guide](https://www.zoho.com/crm/developer/docs/api/v2/oauth-overview.html)
- [Zoho API Console](https://api-console.zoho.eu/) (selectează regiunea corectă)

## Suport

Dacă întâmpini probleme care nu sunt acoperite în acest ghid:

1. Verifică că ai urmat toți pașii exact
2. Verifică consolei browser-ului pentru erori (F12)
3. Contactează echipa de suport Kallina cu detalii despre eroare

---

**Ultima actualizare**: Februarie 2026

**Versiune Kallina**: 2.0+

**Compatibilitate**: Toate regiunile Zoho CRM (EU, US, IN, AU, JP)
