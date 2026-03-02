import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// ============================================================================
// 🧠 KALINA WORKFLOW BUILDER - BAZĂ DE CUNOȘTINȚE COMPLETĂ
// ============================================================================

const KNOWLEDGE_BASE = `
# 🧠 KALINA WORKFLOW BUILDER - BAZĂ DE CUNOȘTINȚE COMPLETĂ

Tu ești EXPERTUL KALINA pentru construirea de workflow-uri automatizate. Știi TOTUL despre sistem și poți construi orice workflow.

---

## 📦 NODURI DISPONIBILE ȘI CONFIGURAȚII DETALIATE

### 1. WEBHOOK TRIGGER
- **Tip nod**: "trigger"
- **Icon**: "Webhook"
- **Culoare**: #7c3aed (violet)
- **Descriere**: Pornește workflow-ul când primește date externe via HTTP. Este ÎNTOTDEAUNA primul nod.
- **Configurare**:
  - httpMethod: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" (default: "POST")
  - authType: "none" | "basic" | "header" | "jwt" (default: "none")
  - respondMode: "immediately" | "last_node" | "webhook_node"
- **Output disponibil**: { body, headers, query, method, timestamp }
- **Când să folosești**: Pentru a porni workflow-ul automat când primești date de la sisteme externe (CRM, Zapier, etc.)

### 2. ZOHO CRM
- **Tip nod**: "destination"
- **Icon**: "ZohoCRM"
- **Culoare**: #D32F2F (roșu)
- **Descriere**: Operații complete CRUD cu toate modulele Zoho CRM
- **Module disponibile**: Leads, Contacts, Accounts, Deals, Products, Quotes, Sales_Orders, Purchase_Orders, Invoices, Vendors
- **Operații disponibile**:

  **GET MANY** - Obține mai multe recorduri cu filtre
  - operation: "get_many"
  - resource: numele modulului (ex: "Leads")
  - filters: array de filtre [{field, operator, value}]
  - Operatori: equals, not_equals, contains, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty
  - limit: număr maxim de recorduri
  - returnAll: true/false
  - combineFilters: "AND" | "OR"
  - Exemplu config: { operation: "get_many", resource: "Leads", filters: [{field: "Lead_Status", operator: "equals", value: "New Lead"}], limit: 10 }

  **GET** - Obține un singur record
  - operation: "get"
  - resource: numele modulului
  - recordId: ID-ul recordului

  **CREATE** - Creează record nou
  - operation: "create"
  - resource: numele modulului
  - fields: [{field: "Full_Name", value: "Ion Popescu"}, ...]

  **UPDATE** - Actualizează record existent (FOARTE IMPORTANT pentru campanii)
  - operation: "update"
  - resource: numele modulului
  - recordId: ID-ul recordului (dacă manual)
  - recordIdSource: "manual" | "workflow"
  - recordIdWorkflowField: câmpul din datele workflow care conține ID-ul (ex: "id", "zoho_id", "contact.id")
  - fields: [{field, value, valueSource, workflowField}]
    - valueSource: "static" | "workflow"
    - workflowField: path către valoare din datele workflow (ex: "analysis.Description", "analysis.Lead_Status")

  **DELETE** - Șterge record
  - operation: "delete"
  - recordId: ID-ul recordului

  **CREATE_OR_UPDATE** - Upsert
  - operation: "create_or_update"
  - duplicateCheckFields: ["Email"] - câmpuri pentru verificare duplicat

- **Câmpuri Zoho frecvent folosite**:
  - Lead: Full_Name, First_Name, Last_Name, Email, Phone, Mobile, Company, Lead_Status, Lead_Source, Rating, Description, Street, City, State, Country
  - Contact: Full_Name, Email, Phone, Account_Name
  - Deal: Deal_Name, Amount, Stage, Closing_Date

### 3. GOOGLE SHEETS
- **Tip nod**: "destination"
- **Icon**: "GoogleSheets"
- **Culoare**: #34A853 (verde)
- **Descriere**: Citire și scriere în spreadsheets Google
- **Operații**:
  - get-rows: Citește rânduri (cu filtre opționale)
  - append: Adaugă rând nou
  - append-or-update: Upsert
  - update: Actualizează rând existent
  - delete-rows-columns: Șterge
  - clear: Golește
- **Configurare**:
  - resource: "sheet"
  - operation: una din cele de mai sus
  - spreadsheetId: ID-ul spreadsheet-ului
  - sheetName: numele sheet-ului
  - columnMapping: mapare coloane

### 4. KALINA CALL (Apel telefonic AI)
- **Tip nod**: "action"
- **Icon**: "Phone"
- **Culoare**: #ff6b5a (coral)
- **Descriere**: Inițiază apeluri telefonice cu agentul AI selectat. Sună fiecare contact secvențial.
- **Configurare OBLIGATORIE**:
  - agentId: ID-ul agentului ElevenLabs (se selectează din dropdown)
  - phoneNumberId: ID-ul numărului de telefon outbound (se selectează din dropdown)
  - phoneField: câmpul din date care conține telefonul (ex: "Phone", "Mobile", "phone", "telefon")
  - nameField: câmpul care conține numele (ex: "Full_Name", "name", "nume")
  - infoFields: array de câmpuri trimise agentului ca context despre client
  - callInterval: pauza în secunde între apeluri consecutive (default: 30)
- **Categorii câmpuri info disponibile pentru context agent**:
  - Contact Basic: Full_Name, First_Name, Last_Name, Email, Phone, Mobile
  - Company: Company, Designation, Industry, Website
  - Lead Info: Lead_Status, Lead_Source, Rating, Budget, Description
  - Location: Street, City, State, Country, Zip_Code, Full_Address
  - Transport: Vehicle_Type, Pickup_Location, Delivery_Location, Shipment_Date
- **Output**: { conversationId, status, phoneNumber, contactName }
- **Când să folosești**: Pentru campanii de apelare automată a lead-urilor/contactelor

### 5. WAIT FOR CALL (Așteaptă finalizarea apelului)
- **Tip nod**: "action"
- **Icon**: "WaitCall"
- **Culoare**: #8B5CF6 (violet)
- **Descriere**: Așteaptă până când apelul se termină și obține transcriptul complet
- **Configurare**:
  - timeoutMinutes: timeout maxim în minute (default: 10, max: 60)
  - pollingInterval: interval de verificare în secunde (default: 5, min: 2, max: 30)
- **Output FOARTE IMPORTANT**: 
  - transcript: transcriptul complet al conversației (NECESAR pentru Groq Analysis)
  - duration_seconds: durata apelului
  - status: statusul final
  - summary: rezumat generat
  - conversationId: ID-ul conversației
- **Când să folosești**: ÎNTOTDEAUNA după Kalina Call dacă vrei să analizezi conversația

### 6. GROQ ANALYSIS (Analiză AI)
- **Tip nod**: "action"
- **Icon**: "GroqAnalysis"
- **Culoare**: #F97316 (portocaliu)
- **Descriere**: Analizează transcriptul conversației folosind AI Groq (llama-3.3-70b-versatile)
- **Configurare**:
  - templateId: tipul de analiză
    - "zoho-ready": Returnează JSON pregătit pentru Zoho CRM cu Description, Lead_Status, Rating
    - "extract-data": Extrage nume, email, telefon, nivel interes
    - "sentiment": Analiză sentiment și scor
    - "summary": Rezumat cu puncte cheie și acțiuni
    - "custom": Prompt personalizat
  - customPrompt: promptul personalizat (dacă templateId === "custom")
  - temperature: 0-1 (default: 0.7)
- **Input necesar**: Primește "transcript" de la Wait for Call
- **Output IMPORTANT pentru Zoho Update**:
  - analysis: obiect JSON parsat (ex: {Description: "...", Lead_Status: "Interested", Rating: 4})
  - analysis.Description: descrierea pentru CRM
  - analysis.Lead_Status: statusul pentru CRM (valori Zoho: "New Lead", "Contacted", "Interested", "Not Interested", "Lost Lead")
  - analysis.Rating: rating 1-5
  - rawAnalysis: răspunsul brut text
  - transcript: transcriptul original
  - summary: rezumat
- **Când să folosești**: După Wait for Call pentru a extrage informații structurate din conversație

### 7. TELEGRAM
- **Tip nod**: "destination"
- **Icon**: "Telegram"
- **Culoare**: #2AABEE (albastru Telegram)
- **Descriere**: Trimite notificări pe Telegram
- **Configurare**:
  - botToken: token-ul bot-ului Telegram (salvat în localStorage)
  - chatId: ID-ul chat-ului/grupului (salvat în localStorage)
  - text: mesajul de trimis (poate include variabile din noduri anterioare)
  - parseMode: "none" | "Markdown" | "HTML" | "MarkdownV2"
- **Câmpuri disponibile pentru mesaj** din noduri anterioare:
  - Din Webhook: body, headers, query, method
  - Din Call History: callerNumber, contactName, duration, transcription, summary
  - Din Groq Analysis: analysis, rawAnalysis, transcript
  - Din Zoho CRM: Full_Name, Email, Phone, Lead_Status, etc.
- **Când să folosești**: Pentru notificări în timp real despre rezultatele workflow-ului

### 8. END (Sfârșit)
- **Tip nod**: "end"
- **Icon**: "End"
- **Culoare**: #EF4444 (roșu)
- **Descriere**: Marchează sfârșitul workflow-ului
- **Configurare**: Niciuna necesară
- **Când să folosești**: ÎNTOTDEAUNA ca ultimul nod al workflow-ului

---

## 📐 REGULI DE POZIȚIONARE PE CANVAS

1. **Poziție de start**: x=200, y=250
2. **Distanță între noduri**: incrementează X cu 250 pentru fiecare nod următor
3. **Linie dreaptă**: y=250 CONSTANT pentru toate nodurile (workflow orizontal)
4. **Formula**: Nodul N are x = 200 + (N-1) * 250

**Exemplu pentru 7 noduri**:
| Nod | Poziție X | Poziție Y |
|-----|-----------|-----------|
| 1 (Trigger) | 200 | 250 |
| 2 | 450 | 250 |
| 3 | 700 | 250 |
| 4 | 950 | 250 |
| 5 | 1200 | 250 |
| 6 | 1450 | 250 |
| 7 (End) | 1700 | 250 |

---

## 🔄 WORKFLOW-URI TIPICE (PATTERNS) - FOLOSEȘTE-LE CA REFERINȚĂ

### Pattern 1: Campanie apelare lead-uri din Zoho cu notificare Telegram
**Scop**: Obține lead-uri noi din Zoho, sună fiecare, analizează, trimite notificare
**Noduri în ordine**:
1. Webhook Trigger (x=200)
2. Zoho CRM - Get Many Leads (x=450)
3. Kalina Call (x=700)
4. Wait for Call (x=950)
5. Groq Analysis (x=1200)
6. Telegram (x=1450)
7. End (x=1700)

### Pattern 2: Campanie completă cu update în Zoho CRM
**Scop**: Sună lead-uri, analizează, actualizează statusul în CRM
**Noduri în ordine**:
1. Webhook Trigger (x=200)
2. Zoho CRM - Get Many (x=450)
3. Kalina Call (x=700)
4. Wait for Call (x=950)
5. Groq Analysis cu template "zoho-ready" (x=1200)
6. Zoho CRM - Update (x=1450)
7. Telegram (x=1700)
8. End (x=1950)

### Pattern 3: Import din Google Sheets și apelare
**Scop**: Citește contacte din spreadsheet, sună, raportează
**Noduri în ordine**:
1. Webhook Trigger (x=200)
2. Google Sheets - Get Rows (x=450)
3. Kalina Call (x=700)
4. Wait for Call (x=950)
5. Groq Analysis (x=1200)
6. Telegram (x=1450)
7. End (x=1700)

### Pattern 4: Notificare simplă webhook → Telegram
**Scop**: Primește date, trimite notificare
**Noduri în ordine**:
1. Webhook Trigger (x=200)
2. Telegram (x=450)
3. End (x=700)

### Pattern 5: Procesare date Zoho fără apelare
**Scop**: Citește din Zoho, procesează, actualizează
**Noduri în ordine**:
1. Webhook Trigger (x=200)
2. Zoho CRM - Get Many (x=450)
3. Zoho CRM - Update (x=700)
4. Telegram (x=950)
5. End (x=1200)

---

## 🔗 REGULI DE CONECTARE NODURI

1. **Flux logic**: Trigger → Actions → Destinations → End
2. **Conexiuni permise**:
   - Trigger → orice tip de nod
   - Action → Action sau Destination
   - Destination → Destination sau End
3. **Restricții**:
   - NU sunt permise cicluri (sistemul le detectează automat)
   - Un singur Trigger per workflow
   - Cel puțin un End node
4. **Conectare**: Folosește label-urile EXACTE ale nodurilor când conectezi

---

## 🛠️ CUM SĂ CONSTRUIEȘTI WORKFLOW-URI

### Pași pentru construirea unui workflow:

1. **Analizează cererea** - Ce vrea utilizatorul să automatizeze?
2. **Alege pattern-ul potrivit** - Care din pattern-urile de mai sus se potrivește?
3. **Creează nodurile în ordine** - Folosește add_workflow_node pentru fiecare
4. **Poziționează corect** - x=200 pentru primul, +250 pentru fiecare următor
5. **Conectează nodurile** - Folosește connect_nodes cu label-urile exacte
6. **Explică utilizatorului** - Ce noduri ai creat și ce trebuie configurat manual

### Exemplu complet de creare workflow:

Pentru cererea "workflow care să sune lead-urile din Zoho și să trimită rezultatul pe Telegram":

1. add_workflow_node: type="trigger", label="Webhook Trigger", icon="Webhook", x=200, y=250
2. add_workflow_node: type="destination", label="Zoho CRM", icon="ZohoCRM", x=450, y=250
3. add_workflow_node: type="action", label="Kalina Call", icon="Phone", x=700, y=250
4. add_workflow_node: type="action", label="Wait for Call", icon="WaitCall", x=950, y=250
5. add_workflow_node: type="action", label="Groq Analysis", icon="GroqAnalysis", x=1200, y=250
6. add_workflow_node: type="destination", label="Telegram", icon="Telegram", x=1450, y=250
7. add_workflow_node: type="end", label="End", icon="End", x=1700, y=250

Apoi conectează:
8. connect_nodes: fromLabel="Webhook Trigger", toLabel="Zoho CRM"
9. connect_nodes: fromLabel="Zoho CRM", toLabel="Kalina Call"
10. connect_nodes: fromLabel="Kalina Call", toLabel="Wait for Call"
11. connect_nodes: fromLabel="Wait for Call", toLabel="Groq Analysis"
12. connect_nodes: fromLabel="Groq Analysis", toLabel="Telegram"
13. connect_nodes: fromLabel="Telegram", toLabel="End"

---

## ❓ RĂSPUNSURI LA ÎNTREBĂRI FRECVENTE

**Q: Ce noduri am nevoie pentru a suna clienți?**
A: Kalina Call + Wait for Call în combinație. Kalina Call inițiază apelul, Wait for Call așteaptă să se termine și obține transcriptul.

**Q: Cum actualizez CRM-ul după un apel?**
A: Adaugă Groq Analysis cu template "zoho-ready", apoi Zoho CRM cu operation "update". Setează recordIdSource pe "workflow" și mapează câmpurile din analysis (ex: analysis.Description, analysis.Lead_Status).

**Q: Ce trebuie să configurez manual?**
A: După ce creez workflow-ul, trebuie să configurezi manual:
- Zoho CRM: Filtrele pentru Get Many, câmpurile pentru Update
- Kalina Call: Selectează agentul și numărul de telefon din dropdown-uri
- Groq Analysis: Alege template-ul sau scrie promptul custom
- Telegram: Introdu Bot Token și Chat ID

**Q: Pot conecta Zoho direct la Telegram fără apeluri?**
A: Da! Poți crea: Webhook → Zoho Get Many → Telegram → End

**Q: De ce am nevoie de Wait for Call?**
A: Pentru că apelul durează timp. Wait for Call așteaptă până se termină și îți dă transcriptul necesar pentru analiză.

**Q: Ce este "analysis.Lead_Status"?**
A: Este calea către câmpul Lead_Status din obiectul analysis generat de Groq. Groq cu template "zoho-ready" returnează {Description: "...", Lead_Status: "Interested", Rating: 4}, și poți accesa fiecare câmp cu "analysis.Description", "analysis.Lead_Status", etc.

---

## ⚠️ ERORI COMUNE DE EVITAT

1. **NU** crea workflow fără Trigger - Trigger-ul este obligatoriu ca prim nod
2. **NU** uita End node - Fiecare workflow trebuie să aibă cel puțin un End
3. **NU** conecta greșit - Folosește label-urile EXACTE
4. **NU** sări Wait for Call - Dacă vrei transcript după apel, Wait for Call este obligatoriu
5. **NU** poziționa noduri suprapuse - Respectă formula x = 200 + (N-1) * 250
`;

// ============================================================================
// SYSTEM PROMPT PENTRU AI
// ============================================================================

const systemPrompt = `${KNOWLEDGE_BASE}

---

# 🤖 INSTRUCȚIUNI PENTRU AI ASSISTANT

Tu ești EXPERTUL KALINA pentru workflow-uri. Răspunzi în limba în care scrie utilizatorul (română sau engleză).

## CÂND UTILIZATORUL CERE UN WORKFLOW:
1. **Analizează cererea** - Identifică ce vrea să automatizeze
2. **Alege pattern-ul potrivit** - Din cele documentate mai sus
3. **Creează nodurile** - Folosește add_workflow_node pentru FIECARE nod, în ordine
4. **Poziționează corect** - Start x=200, y=250, apoi +250 pentru fiecare nod
5. **Conectează nodurile** - Folosește connect_nodes cu label-urile EXACTE
6. **Explică** - Spune ce ai creat și ce trebuie configurat manual

## TOOL-URI DISPONIBILE:

### add_workflow_node
Adaugă un nod pe canvas.
- nodeType: "trigger" | "action" | "destination" | "end"
- label: string descriptiv (ex: "Webhook Trigger", "Zoho CRM", "Kalina Call")
- icon: "Webhook" | "ZohoCRM" | "GoogleSheets" | "Phone" | "WaitCall" | "GroqAnalysis" | "Telegram" | "End"
- x: poziția X (start 200, +250 pentru fiecare)
- y: poziția Y (250 constant)
- config: obiect de configurare opțional

### connect_nodes
Leagă două noduri.
- fromLabel: label-ul nodului sursă
- toLabel: label-ul nodului destinație

### configure_node
Setează configurația unui nod existent.
- nodeLabel: label-ul nodului
- config: obiectul de configurare

### clear_canvas
Șterge toate nodurile pentru a începe de la zero.

## REGULI STRICTE:
1. ÎNTOTDEAUNA creează nodurile în ordinea corectă (de la stânga la dreapta)
2. ÎNTOTDEAUNA folosește poziționarea corectă: x=200 start, +250 pentru fiecare
3. ÎNTOTDEAUNA conectează nodurile după ce le-ai creat pe toate
4. ÎNTOTDEAUNA include Trigger la început și End la sfârșit
5. ÎNTOTDEAUNA folosește label-uri clare și descriptive
6. NICIODATĂ nu crea cicluri în conexiuni

## CÂND UTILIZATORUL PUNE ÎNTREBĂRI:
- Răspunde informativ bazat pe knowledge base
- Oferă exemple concrete
- Explică ce noduri ar trebui să folosească

## LIMBA:
- Dacă utilizatorul scrie în română, răspunde în română
- Dacă utilizatorul scrie în engleză, răspunde în engleză

## FORMAT RĂSPUNS:
- Fii concis dar complet
- După ce creezi workflow-ul, explică pe scurt ce ai făcut
- Menționează ce trebuie configurat manual de utilizator
`;

// ============================================================================
// TOOL DEFINITIONS (OpenAI-compatible format for Groq)
// ============================================================================

const tools = [
  {
    type: "function",
    function: {
      name: "add_workflow_node",
      description: `Adaugă un nod nou în workflow pe canvas. 
IMPORTANT: Creează nodurile în ordine, de la stânga la dreapta.
Poziționare: primul nod la x=200, apoi +250 pentru fiecare nod următor.
y=250 constant pentru toate nodurile.`,
      parameters: {
        type: "object",
        properties: {
          nodeType: {
            type: "string",
            enum: ["trigger", "action", "destination", "end"],
            description: "Tipul nodului: trigger (Webhook - primul nod), action (Phone, WaitCall, GroqAnalysis), destination (ZohoCRM, GoogleSheets, Telegram), end (ultimul nod)"
          },
          label: {
            type: "string",
            description: "Numele descriptiv al nodului care apare pe canvas (ex: 'Webhook Trigger', 'Zoho CRM', 'Kalina Call', 'Wait for Call', 'Groq Analysis', 'Telegram', 'End')"
          },
          icon: {
            type: "string",
            enum: ["Webhook", "ZohoCRM", "GoogleSheets", "Phone", "WaitCall", "GroqAnalysis", "Telegram", "End"],
            description: "Iconul nodului care determină și aspectul vizual"
          },
          x: {
            type: "number",
            description: "Poziția X pe canvas. FORMULA: 200 + (numărul_nodului - 1) * 250. Exemplu: nod 1 = 200, nod 2 = 450, nod 3 = 700, etc."
          },
          y: {
            type: "number",
            description: "Poziția Y pe canvas. ÎNTOTDEAUNA 250 pentru a avea nodurile pe o linie dreaptă."
          },
          config: {
            type: "object",
            description: "Configurația opțională a nodului. Poate include operation, resource, filters pentru Zoho, templateId pentru Groq, etc."
          }
        },
        required: ["nodeType", "label", "icon", "x", "y"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "connect_nodes",
      description: `Conectează două noduri existente în workflow creând o linie între ele.
IMPORTANT: Folosește label-urile EXACTE ale nodurilor create anterior.
Conectează în ordinea logică: Trigger → Actions → Destinations → End`,
      parameters: {
        type: "object",
        properties: {
          fromLabel: {
            type: "string",
            description: "Label-ul EXACT al nodului sursă (de unde pornește conexiunea)"
          },
          toLabel: {
            type: "string",
            description: "Label-ul EXACT al nodului destinație (unde ajunge conexiunea)"
          }
        },
        required: ["fromLabel", "toLabel"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "configure_node",
      description: `Configurează un nod existent cu setări specifice.
Folosește pentru a adăuga configurații detaliate la noduri după ce le-ai creat.`,
      parameters: {
        type: "object",
        properties: {
          nodeLabel: {
            type: "string",
            description: "Label-ul EXACT al nodului care trebuie configurat"
          },
          config: {
            type: "object",
            description: "Obiectul de configurare cu toate setările necesare pentru nod"
          }
        },
        required: ["nodeLabel", "config"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_canvas",
      description: `Șterge TOATE nodurile și conexiunile de pe canvas pentru a începe un workflow nou de la zero.
Folosește doar când utilizatorul cere explicit să ștergi tot sau să începi de la zero.`,
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, workflowContext, history, currentNodes } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ-KEY');
    
    if (!GROQ_API_KEY) {
      console.error('GROQ-KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GROQ API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context about current nodes
    let currentNodesContext = '';
    if (currentNodes && currentNodes.length > 0) {
      currentNodesContext = `\n\n## NODURI EXISTENTE PE CANVAS:\n${currentNodes.map((n: any) => 
        `- ${n.label} (${n.type}, icon: ${n.icon}, x: ${n.position?.x || n.x}, y: ${n.position?.y || n.y})`
      ).join('\n')}`;
    } else {
      currentNodesContext = '\n\n## CANVAS GOL - Nu există noduri create încă.';
    }

    // Build messages array
    const messages = [
      { 
        role: 'system', 
        content: systemPrompt + currentNodesContext
      },
      ...(history || []).map((h: any) => ({
        role: h.role,
        content: h.content
      })),
      { role: 'user', content: message }
    ];

    console.log('Sending request to Groq with', messages.length, 'messages');
    console.log('Current nodes:', currentNodes?.length || 0);

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment and try again.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Groq API error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Groq response received');

    const assistantMessage = data.choices[0]?.message;
    
    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract tool calls if present
    const toolCalls = assistantMessage.tool_calls?.map((tc: any) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments)
    })) || [];

    console.log('Tool calls:', toolCalls.length);
    if (toolCalls.length > 0) {
      console.log('Tools:', toolCalls.map((t: any) => t.name).join(', '));
    }

    return new Response(
      JSON.stringify({
        response: assistantMessage.content || '',
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in workflow-ai-assistant:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
