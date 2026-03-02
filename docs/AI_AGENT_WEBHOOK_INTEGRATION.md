# 🤖 AI Agent Integration: Long-Polling pentru Webhook Response

## Problema

AI agent-ul trimite webhook și primește **202 Accepted**, dar conexiunea se închide înainte ca workflow-ul să se termine. Agent-ul **NU ȘTIE** răspunsul final.

## Soluția: Long-Polling

După ce primești 202 Accepted, faci polling pentru răspuns până este gata.

---

## 📡 Flow Complet

### Step 1: Trimite Webhook

```http
POST https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook/wh_f3e9afa21a3a478c
Content-Type: application/json

{
  "message": "Praga Kiev 24 decembrie"
}
```

**Response** (INSTANT):
```json
{
  "status": "accepted",
  "message": "Webhook received. Workflow will execute shortly.",
  "webhook_id": "d3e25588-50c5-4ca8-9f79-1f697d9d83a4"
}
```

### Step 2: Poll pentru răspuns

Folosește `webhook_id` din răspuns pentru polling:

```http
GET https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook-response?webhook_id=d3e25588-50c5-4ca8-9f79-1f697d9d83a4
```

**Cât timp procesează** (202):
```json
{
  "status": "pending",
  "message": "Webhook is still processing...",
  "log_id": "abc-123"
}
```

**Când este gata** (200):
```json
{
  "status": "completed",
  "response_status": 200,
  "response_body": {
    "routes": [...],
    "available": true
  },
  "execution_time_ms": 15234,
  "triggered_at": "2025-12-24T10:30:00Z"
}
```

---

## 🔄 Implementare în AI Agent

### Pseudo-code:

```javascript
async function callWebhook(data) {
  // Step 1: Trimite webhook
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (response.status === 202 && result.webhook_id) {
    // Step 2: Poll pentru răspuns
    return await pollForResponse(result.webhook_id);
  }
  
  return result;
}

async function pollForResponse(webhookId, maxAttempts = 30, interval = 2000) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(
      `${POLL_URL}?webhook_id=${webhookId}`
    );
    
    const result = await response.json();
    
    if (result.status === 'completed') {
      // Răspunsul este gata!
      return result.response_body;
    }
    
    // Așteaptă 2 secunde înainte de următorul poll
    await sleep(interval);
  }
  
  throw new Error('Timeout: Webhook response not received');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Utilizare:

```javascript
// În tool-ul tău get_routes_n8n
const webhookData = {
  message: "Praga Kiev 24 decembrie"
};

try {
  const response = await callWebhook(webhookData);
  console.log('Răspuns final:', response);
  return response;
} catch (error) {
  console.error('Webhook error:', error);
  throw error;
}
```

---

## 📋 URL-uri

### Webhook URL (POST):
```
https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook/wh_f3e9afa21a3a478c
```

### Polling URL (GET):
```
https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook-response?webhook_id={webhook_id}
```

---

## ⚙️ Configurare Parametri

### Polling Settings:

| Parameter | Value | Description |
|-----------|-------|-------------|
| **Max Attempts** | 30 | Numărul maxim de polling attempts |
| **Interval** | 2000ms | Delay între polling attempts (2 sec) |
| **Total Timeout** | 60 sec | Max time to wait (30 × 2 = 60 sec) |

### Ajustare după nevoie:

- **Workflow rapid** (< 10 sec): `maxAttempts=10, interval=1000` (10 sec total)
- **Workflow mediu** (10-30 sec): `maxAttempts=20, interval=2000` (40 sec total)
- **Workflow lung** (> 30 sec): `maxAttempts=45, interval=2000` (90 sec total)

---

## 🧪 Test Manual

### Test 1: Trimite webhook

```bash
curl -X POST \
  https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook/wh_f3e9afa21a3a478c \
  -H "Content-Type: application/json" \
  -d '{"message": "Praga Kiev 24 decembrie"}'
```

**Output**:
```json
{
  "status": "accepted",
  "webhook_id": "d3e25588-..."
}
```

### Test 2: Poll pentru răspuns

```bash
# Înlocuiește {webhook_id} cu valoarea primită
curl -X GET \
  "https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook-response?webhook_id=d3e25588-..."
```

**Output** (după 15-30 sec):
```json
{
  "status": "completed",
  "response_status": 200,
  "response_body": {
    "analysis": {...}
  }
}
```

---

## 🎯 Integration în ElevenLabs / AI Tool

Dacă folosești ElevenLabs Custom Tools sau similar:

```json
{
  "name": "get_routes_n8n",
  "description": "Get bus routes from Praga to Kiev",
  "parameters": {
    "message": {
      "type": "string",
      "description": "Route query"
    }
  },
  "implementation": {
    "type": "webhook",
    "url": "https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook/wh_f3e9afa21a3a478c",
    "method": "POST",
    "polling": {
      "enabled": true,
      "url": "https://pwfczzxwjfxomqzhhwvj.supabase.co/functions/v1/workflow-webhook-response",
      "max_attempts": 30,
      "interval_ms": 2000
    }
  }
}
```

---

## 🐛 Troubleshooting

### Polling returnează mereu 202?

**Cauza**: Workflow-ul nu se termină sau nu are "Respond to Webhook" node.

**Fix**:
1. Verifică în Kallina că workflow-ul se execută
2. Verifică că ultimul nod este "Respond to Webhook"
3. Check Logs panel pentru erori

### Timeout după 60 sec?

**Cauza**: Workflow-ul durează prea mult (> 60 sec).

**Fix**:
- Crește `maxAttempts` la 45 (90 sec total)
- Optimizează workflow-ul (reduce Groq prompt, etc.)

### Response body este gol?

**Cauza**: "Respond to Webhook" node nu este configurat corect.

**Fix**:
1. Deschide "Respond to Webhook" node
2. Response Body: `{{$json.analysis}}` sau `{{JSON.stringify($json)}}`
3. Save și testează din nou

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| **Initial Response** | < 500ms (202 Accepted) |
| **Workflow Execution** | 15-30 sec (depinde de noduri) |
| **Total Time** | ~20-35 sec (webhook + polling) |
| **Overhead** | ~2-4 sec (polling delay) |

---

**Implementează polling în AI agent și vei primi răspunsul final! 🚀**
