# RAG (Retrieval-Augmented Generation) System

## 📚 Overview

Sistemul RAG permite încărcarea și procesarea automată a documentelor mari pentru căutare semantică inteligentă, similar cu Eleven Labs Voice Library.

## ✨ Features

### 1. **Upload Fișiere Mari**
- **Dimensiune maximă**: 100 MB
- **Formate suportate**: 
  - 📄 TXT
  - 📕 PDF
  - 📊 CSV
  - 🔤 JSON
  - 📝 Markdown (MD)

### 2. **Procesare Automată cu AI**
- **Chunking inteligent**: Text-ul este împărțit automat în fragmente de dimensiune configurabilă (500-5000 caractere)
- **Structurare cu Groq AI**: Fiecare chunk este procesat de Llama 3.3 70B pentru:
  - Extragere de keywords/queries reprezentative
  - Optimizare și curățare a conținutului
  - Eliminare noise

### 3. **Căutare Semantică**
- Căutare bazată pe similaritate între query și conținut
- Suport pentru expresii dinamice din noduri anterioare (`{{ $json.query }}`)
- Rezultate relevante ordonate după scor

### 4. **Integrare Groq AI**
- Procesare suplimentară a rezultatelor găsite
- Multiple modele disponibile:
  - Llama 3.3 70B Versatile
  - Llama 3.1 8B Instant
  - Mixtral 8x7B
  - Gemma 2 9B

## 🚀 Cum să folosești

### Pasul 1: Încarcă un document
1. Apasă butonul **"Alege Fișier"**
2. Selectează un fișier (max 100MB)
3. Sistemul va:
   - Citi fișierul
   - Împărți textul în chunks
   - Procesa fiecare chunk cu AI
   - Adăuga automat în baza de cunoștințe

### Pasul 2: Configurează Query-ul
```
={{ $json.body.message }}
```
- Trage câmpuri din nodul INPUT anterior
- Sau scrie manual expresii

### Pasul 3: Activează procesare Groq (opțional)
- Bifează checkbox-ul pentru procesare AI
- Alege modelul dorit
- Setează system prompt-ul

### Pasul 4: Salvează
- Apasă **"Salvează"** pentru a finaliza configurația
- Nodul RAG va fi gata de utilizare în workflow

## 📊 Exemple de Utilizare

### Exemplu 1: Knowledge Base pentru Support
```
Fișier: FAQ_Product.pdf (5MB, 150 pagini)
↓ Procesare automată
↓ 75 chunks generate
↓
Query din Telegram: "Cum resetez parola?"
↓
RAG găsește chunk-ul cu info despre resetare
↓
Groq AI generează răspuns natural
↓
Output: "Pentru a reseta parola..."
```

### Exemplu 2: Documentație Tehnică
```
Fișier: API_Documentation.md (2MB)
↓ Procesare automată
↓ 30 chunks generate
↓
Query: "{{ $json.question }}"
↓
RAG Search → Găsește secțiunea relevantă
↓
Răspuns precis din documentație
```

## 🎯 Avantaje față de metodele tradiționale

| Feature | Tradițional | RAG System |
|---------|-------------|------------|
| **Upload Manual** | ❌ Copy-paste manual | ✅ Upload automat |
| **Structurare** | ❌ Manual | ✅ AI automat |
| **Chunks** | ❌ Nu există | ✅ Automat generate |
| **Căutare** | ❌ Exact match | ✅ Semantică |
| **Contextualizare** | ❌ Lipsă | ✅ Cu Groq AI |
| **Scalabilitate** | ❌ Limitată | ✅ 100MB per file |

## 🔧 Parametri Configurabili

### Chunk Size
- **Min**: 500 caractere
- **Max**: 5000 caractere
- **Default**: 1000 caractere
- **Recomandare**: 
  - 500-1000: Pentru text conversațional
  - 1500-2500: Pentru documentație
  - 3000-5000: Pentru articole lungi

### Groq Models
- **Llama 3.3 70B**: Best pentru procesare complexă
- **Llama 3.1 8B**: Rapid, pentru cazuri simple
- **Mixtral 8x7B**: Balance între viteză și calitate
- **Gemma 2 9B**: Eficient pentru task-uri simple

## 💡 Best Practices

1. **Pregătește documentele**
   - Șterge header/footer repetat
   - Verifică encoding-ul (UTF-8 recomandat)
   - Elimină secțiuni irelevante

2. **Optimizează chunk size-ul**
   - Pentru FAQ: 500-800 caractere
   - Pentru tutoriale: 1500-2000 caractere
   - Pentru whitepapers: 2500-3500 caractere

3. **Testează query-urile**
   - Folosește preview-ul pentru a vedea valoarea actuală
   - Testează cu diferite formulări
   - Verifică relevanța rezultatelor

4. **Monitorizează performanța**
   - Vezi câte chunks sunt generate
   - Verifică metadata (source, chunkIndex)
   - Optimizează dacă rezultatele nu sunt relevante

## 🐛 Troubleshooting

### Fișierul nu se încarcă
- Verifică dimensiunea (max 100MB)
- Verifică formatul (TXT, PDF, CSV, JSON, MD)
- Verifică conexiunea la internet

### Procesarea eșuează
- Verifică API key-ul Groq în `.env`
- Verifică limitele API Groq
- Reduce chunk size-ul

### Rezultate irelevante
- Ajustează chunk size-ul
- Îmbunătățește structura documentului
- Modifică system prompt-ul

## 🔐 Securitate

- Fișierele sunt procesate **client-side**
- Nu sunt salvate pe server
- API key-ul Groq este setat în `.env` (nu este expus)
- Datele RAG sunt salvate în configurația workflow-ului

## 📈 Limitări

- Max 100MB per fișier
- PDF-uri: suport pentru text extractabil (nu scanări)
- Rate limits Groq API (verifică planul tău)
- Browser memory pentru fișiere mari

## 🎓 Tutorial Video

[Link către tutorial] - Coming soon!

---

**Creat pentru kallina.info** | Powered by Groq AI & Llama 3.3
