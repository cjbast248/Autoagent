# Zoho CRM - Get Picklist Values

## Ce face această operațiune?

Operațiunea **"Get Picklist Values"** extrage toate valorile disponibile dintr-un câmp dropdown (picklist) din Zoho CRM.

## Când să o folosești?

Folosește această operațiune când ai nevoie să:
- **Afli ce statusuri există** pentru Leads (ex: "New Lead", "Contacted", "Qualified")
- **Extragi stage-urile** pentru Deals (ex: "Negotiation", "Proposal", "Closed Won")
- **Obții valorile** din orice câmp dropdown custom
- **Construiești filtre dinamice** bazate pe valori reale din CRM

## Exemple practice

### Exemplu 1: Extrage statusurile pentru Leads

**Configurare:**
```
Resource: Leads
Operation: Get Picklist Values
Picklist Field: Lead_Status
```

**Output (zoho_picklist_values):**
```json
[
  {
    "display_value": "New Lead",
    "actual_value": "New Lead",
    "id": "123456000000000001",
    "sequence_number": 1
  },
  {
    "display_value": "Contacted",
    "actual_value": "Contacted",
    "id": "123456000000000002",
    "sequence_number": 2
  },
  {
    "display_value": "Qualified",
    "actual_value": "Qualified",
    "id": "123456000000000003",
    "sequence_number": 3
  }
]
```

### Exemplu 2: Extrage stage-urile pentru Deals

**Configurare:**
```
Resource: Deals
Operation: Get Picklist Values
Picklist Field: Stage
```

**Output:**
```json
[
  {
    "display_value": "Qualification",
    "actual_value": "Qualification",
    "id": "123456000000000010",
    "sequence_number": 1
  },
  {
    "display_value": "Needs Analysis",
    "actual_value": "Needs Analysis",
    "id": "123456000000000011",
    "sequence_number": 2
  },
  {
    "display_value": "Proposal",
    "actual_value": "Proposal",
    "id": "123456000000000012",
    "sequence_number": 3
  },
  {
    "display_value": "Closed Won",
    "actual_value": "Closed Won",
    "id": "123456000000000013",
    "sequence_number": 4
  }
]
```

## Cum să folosești rezultatul?

### Opțiunea 1: Filtrare dinamică

După ce extragi valorile, le poți folosi într-un node **"Get Many"** cu filtre:

1. **Node 1**: Get Picklist Values pentru Lead_Status
2. **Node 2**: Code node care selectează o valoare (ex: primul status)
   ```javascript
   const firstStatus = $json.zoho_picklist_values[0].actual_value;
   return { selected_status: firstStatus };
   ```
3. **Node 3**: Get Many Leads cu filtru `Lead_Status = {{ $json.selected_status }}`

### Opțiunea 2: Creare recorduri cu valori corecte

Folosește valorile extrase pentru a crea recorduri cu statusuri valide:

1. **Node 1**: Get Picklist Values pentru Lead_Status
2. **Node 2**: Create Lead cu câmpul `Lead_Status` setat la una din valorile extrase

### Opțiunea 3: Validare date

Verifică dacă un status primit din webhook există în CRM:

1. **Node 1**: Webhook primește date
2. **Node 2**: Get Picklist Values pentru Lead_Status
3. **Node 3**: Code node verifică dacă valoarea din webhook există în lista de valori

## Structura răspunsului

Răspunsul conține următoarele câmpuri:

| Câmp | Descriere | Exemplu |
|------|-----------|---------|
| `zoho_picklist_field` | Numele câmpului pentru care s-au extras valorile | `"Lead_Status"` |
| `zoho_picklist_values` | Array cu toate valorile disponibile | Vezi exemplele de mai sus |
| `zoho_picklist_count` | Numărul total de valori | `3` |

### Câmpuri în fiecare valoare:

| Câmp | Descriere | Exemplu |
|------|-----------|---------|
| `display_value` | Valoarea afișată în UI | `"New Lead"` |
| `actual_value` | Valoarea efectivă (folosită în API) | `"New Lead"` |
| `id` | ID-ul unic al valorii în Zoho | `"123456000000000001"` |
| `sequence_number` | Ordinea de afișare | `1` |

## Tipuri de câmpuri suportate

Această operațiune funcționează cu:
- ✅ **Picklist** (dropdown simplu)
- ✅ **Multiselectpicklist** (dropdown cu selecție multiplă)

## Câmpuri picklist comune în Zoho CRM

### Leads
- `Lead_Status` - Statusul lead-ului
- `Lead_Source` - Sursa lead-ului
- `Industry` - Industrie
- `Rating` - Rating (Hot, Warm, Cold)

### Deals
- `Stage` - Etapa deal-ului
- `Type` - Tipul deal-ului
- `Lead_Source` - Sursa lead-ului

### Contacts
- `Lead_Source` - Sursa contactului
- `Salutation` - Salut (Mr., Mrs., Dr.)

### Accounts
- `Industry` - Industrie
- `Account_Type` - Tipul contului
- `Rating` - Rating

## Greșeli frecvente

### ❌ Eroare: "Field not found"
**Cauză**: Câmpul specificat nu există în modulul selectat.
**Soluție**: Verifică că numele câmpului este corect și că aparține modulului selectat.

### ❌ Eroare: "Field is not a picklist"
**Cauză**: Câmpul selectat nu este de tip picklist/dropdown.
**Soluție**: Selectează doar câmpuri de tip picklist sau multiselectpicklist.

### ❌ Lista este goală
**Cauză**: Câmpul nu are valori configurate în Zoho CRM.
**Soluție**: Mergi în Zoho CRM → Settings → Modules → [Modul] → Fields și configurează valorile pentru câmpul respectiv.

## Integrare în workflow-uri complexe

### Workflow: Sincronizare statusuri între sisteme

```
1. Webhook → Primește lead din sistem extern
2. Get Picklist Values (Lead_Status) → Extrage statusurile din Zoho
3. Code → Mapează statusul din sistemul extern la unul din Zoho
4. Create or Update Lead → Creează/actualizează lead-ul cu statusul corect
```

### Workflow: Raportare dinamică

```
1. Get Picklist Values (Stage) → Extrage toate stage-urile
2. Split Out → Împarte în câte un item per stage
3. Get Many Deals → Pentru fiecare stage, extrage deal-urile
4. Code → Calculează total/medie per stage
5. Email → Trimite raport cu breakdown per stage
```

## Performanță

- ⚡ Foarte rapid - face doar 1 request la API-ul Zoho
- 💾 Cache-ul nu este necesar - valorile se schimbă rar
- 📊 Recomandare: Rulează la începutul workflow-ului, nu în bucle

## Support

Pentru întrebări sau probleme:
- 📧 Email: support@kallina.info
- 📚 Documentație completă: [docs.kallina.info](https://docs.kallina.info)
