# 🧠 Guide RAG — Retrieval-Augmented Generation

## TL;DR — La solution au problème des tokens

### Le problème

```
❌ Avant (Sans RAG):
Utilisateur: "Quel est le coût d'une VM Standard?"
    ↓
LLM appelle SharePoint COMPLET (~500 pages)
    ↓
LLM envoie 5000 tokens au LLM
    ↓
Coût: 0.05€ par requête
Latence: 5-10 secondes
```

### La solution (RAG)

```
✅ Après (Avec RAG):
Utilisateur: "Quel est le coût d'une VM Standard?"
    ↓
RAG cherche dans le cache local
    ↓
RAG retourne SEULEMENT 3 paragraphes pertinents (500 tokens)
    ↓
LLM répond
    ↓
Coût: 0.005€ par requête (90% moins cher!)
Latence: < 1 seconde
```

**Économies: 90% du budget LLM** 💰

---

## 🏗️ Architecture RAG

```
┌─────────────────────────────────────────────────────────┐
│  📄 SharePoint SNCF                                     │
│     (Tous les docs PPV)                                 │
└──────────────────┬──────────────────────────────────────┘
                   │ (One-time)
                   ↓
        ┌──────────────────────┐
        │ 📝 Vectorization     │
        │ (vectorize-docs.js)  │
        └──────────┬───────────┘
                   │
                   ↓
┌──────────────────────────────────────────────────────────┐
│  🗄️ Vector Database (Chroma Local ou Pinecone Cloud)    │
│     - Docs parsés en chunks                             │
│     - Convertis en embeddings                           │
│     - Indexés pour recherche rapide                     │
└──────────────────┬───────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ↓                   ↓
    ┌─────────┐      ┌──────────────┐
    │ Utilisateur │    │ Requête API │
    │ (Navigateur)│    │ (LLM)       │
    └─────────┬──┘    └──────┬───────┘
              │               │
              └───────┬───────┘
                      ↓
          ┌───────────────────────┐
          │ 🔍 Retrieval          │
          │ (rag-service.js)      │
          │ - Cherche les docs    │
          │   pertinents (top-3)  │
          └───────────┬───────────┘
                      │
                      ↓
        ┌─────────────────────────────┐
        │ 🧠 LLM (ChatGPT/Claude)     │
        │ - Reçoit contexte étroit    │
        │ - Génère réponse            │
        │ - Économise 90% de tokens   │
        └─────────────────────────────┘
```

---

## 🚀 Setup du RAG

### 1️⃣ Installation des dépendances

```bash
cd chatbot-production

npm install \
  langchain@0.0.200 \
  @langchain/community@0.0.200 \
  chroma-js \
  openai
```

### 2️⃣ Lancer Chroma (le vectorstore)

#### Option A: Docker (Recommandé)

```bash
# Lancer Chroma en background
docker run -d -p 8000:8000 chromadb/chroma

# Vérifier que c'est up
curl http://localhost:8000/api/v1/heartbeat
# Doit retourner: {"nanosecond timestamp":...}
```

#### Option B: Installation locale

```bash
pip install chromadb
chroma run --host 0.0.0.0 --port 8000
```

### 3️⃣ Vectoriser les documents

```bash
# Utiliser les docs de test (recommandé d'abord)
node vectorize-docs.js --source=sample

# Résultat:
# 🚀 PPV Document Vectorization
# ✅ 4 documents de test chargés
# 🧠 Vectorisation en cours...
# 📦 128 chunks créés
# ✅ Vectorstore créé avec succès!
```

### 4️⃣ Lancer le serveur avec RAG

```bash
# Remplacer server.js par server-rag.js
npm start -- server-rag.js

# Ou modifier package.json:
# "start": "node server-rag.js"
```

### 5️⃣ Vérifier la santé du RAG

```bash
curl http://localhost:3001/api/rag/health

# Résultat:
# {
#   "rag_status": "ready",
#   "status": "online",
#   "vectorStoreReady": true,
#   "embedding_model": "text-embedding-3-small",
#   "chunk_size": 1000,
#   "top_k": 3
# }
```

---

## 💻 Utiliser le RAG

### API Chat (avec RAG automatique)

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Quel est le coût d'une VM Standard?"}
    ],
    "useRAG": true
  }'

# Réponse:
# {
#   "response": "D'après la base de connaissances...",
#   "ragContext": [
#     {
#       "source": "SharePoint/PPV/Pricing",
#       "type": "pricing",
#       "score": 0.92
#     }
#   ]
# }
```

### API de recherche directe (RAG search)

```bash
# Chercher dans la base de connaissances
curl "http://localhost:3001/api/rag/search?q=coût%20VM&k=3"

# Résultat: Les 3 docs les plus pertinents avec scores
```

### Filtrée par type de doc

```bash
# Chercher SEULEMENT dans les docs de diagnostic
curl "http://localhost:3001/api/rag/search?q=VM%20lente&type=diagnostic"
```

---

## 📊 Flux détaillé d'une requête

### Exemple: Utilisateur envoie "Je veux augmenter la RAM"

```
1️⃣ RETRIEVAL
   Input: "Je veux augmenter la RAM"
   ↓
   RAG cherche dans les embeddings
   ↓
   Résultats:
   - [Ref 1] Request ServiceNow (score: 0.95)
   - [Ref 2] VM Upgrade Process (score: 0.87)
   - [Ref 3] Support SLA (score: 0.72)

2️⃣ AUGMENTATION (Construction du prompt)
   
   System Prompt:
   "Tu es Assistant PPV..."
   
   Contexte RAG:
   "=== CONTEXTE ===
   [Ref 1] Pour augmenter les ressources:
   1. Créer un ticket REQ dans ServiceNow
   2. Type: 'Resource Request'
   3. SLA: 24-48h
   === FIN CONTEXTE ==="
   
   User Query:
   "Je veux augmenter la RAM"

3️⃣ GÉNÉRATION
   LLM reçoit le prompt augmenté
   ↓
   LLM génère:
   "Pour augmenter votre RAM, créez un ticket REQ 
    dans ServiceNow avec le type 'Resource Request'. 
    Délai habituel: 24-48 heures."

4️⃣ RÉPONSE À L'UTILISATEUR
   Affiche la réponse du LLM
   + Indique les docs utilisés (Ref 1, 2, 3)
```

---

## 🔧 Configuration avancée

### Tuner les paramètres du RAG

Dans `rag-service.js`, adapter:

```javascript
// Nombre de docs à récupérer
const TOP_K = 3;  // ↑ Plus = plus de contexte, plus de tokens
                   // ↓ Moins = plus rapide, moins de contexte

// Taille des chunks
const CHUNK_SIZE = 1000;  // ↑ Plus = moins de fragments
                           // ↓ Moins = plus granulaire

// Chevauchement entre chunks
const CHUNK_OVERLAP = 200;  // Éviter les coupures au mauvais endroit

// Modèle d'embedding
const EMBEDDING_MODEL = 'text-embedding-3-small';
// Options:
// - text-embedding-3-small    (économique, rapide)
// - text-embedding-3-large    (meilleur, coûteux)
// - local: sentence-transformers/all-MiniLM-L6-v2  (gratuit, lent)
```

### Vectorstore alternatif: Pinecone (Production)

Pour la production, utiliser **Pinecone** (cloud) au lieu de Chroma:

```bash
npm install @pinecone-database/pinecone

# .env
PINECONE_API_KEY=xxx
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=ppv-docs
```

Adapter dans `rag-service.js`:

```javascript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const vectorStore = await Pinecone.fromDocuments(docs, embeddings, {
  pineconeIndex: process.env.PINECONE_INDEX
});
```

---

## 🛠️ Intégrer des docs SharePoint réels

### Option 1: Télécharger manuellement

```bash
# 1. Copier les docs du SharePoint en local
mkdir docs/
# Télécharger les PDFs/Docs du SharePoint → ./docs/

# 2. Vectoriser
node vectorize-docs.js --source=local
```

### Option 2: Intégration automatique (Microsoft Graph API)

Créer `sharepoint-connector.js`:

```javascript
import { Client } = require('@microsoft/microsoft-graph-client');

async function syncSharePointDocs() {
  const client = Client.init({
    authProvider: (done) => {
      // Utiliser Azure AD pour auth
      done(null, accessToken);
    }
  });

  // Récupérer les docs du SharePoint
  const items = await client
    .api('/sites/ppv/lists')
    .get();

  // Vectoriser chaque doc
  for (const item of items) {
    const doc = await client
      .api(`/sites/ppv/items/${item.id}`)
      .get();
    
    // Ajouter au vectorstore
    await addToVectorStore(doc);
  }
}

syncSharePointDocs();
```

### Option 3: Créer un webhook SharePoint

SharePoint → Webhook → Nouveau doc automatiquement vectorisé

---

## 📈 Monitoring du RAG

### Logs détaillés

```bash
# Dans server-rag.js, ajouter du logging:
console.log('📝 Query:', userMessage);
console.log('🔍 Retrieved:', ragContext.length, 'docs');
ragContext.forEach(doc => {
  console.log(`   • ${doc.source} (${(doc.score * 100).toFixed(0)}%)`);
});
```

### Métriques à tracker

```javascript
// Ajouter au /api/health:
{
  rag: {
    total_queries: 1234,
    avg_retrieval_time_ms: 250,
    avg_docs_returned: 2.8,
    cache_hit_rate: 0.87,
    embedding_model: "text-embedding-3-small",
    vectorstore_size_mb: 45
  }
}
```

---

## 🚨 Troubleshooting RAG

### ❌ "Chroma non trouvé"

```bash
# Lancer Chroma en background
docker run -d -p 8000:8000 chromadb/chroma

# Attendre que c'est up
sleep 5

# Relancer le serveur
npm start
```

### ❌ "Pas de résultats pertinents"

1. Vérifier que la vectorisation s'est bien passée:
```bash
curl http://localhost:8000/api/v1/collections
```

2. Tester la recherche directement:
```bash
curl "http://localhost:3001/api/rag/search?q=votre-query"
```

3. Ajuster `TOP_K` ou `CHUNK_SIZE`

### ❌ "Trop de tokens utilisés"

- Réduire `TOP_K` (de 3 à 2)
- Réduire `CHUNK_SIZE` (de 1000 à 500)
- Utiliser un modèle LLM plus petit

---

## 💰 Calcul des économies

### Coûts par requête (sans RAG)

```
Avant (Sans RAG):
- Docs SharePoint: 500 pages
- Tokens par page: 500
- Total tokens: 250,000
- Coût: 250,000 × $0.0001 (GPT-4) = $0.025

💸 $0.025 par requête
```

### Coûts par requête (avec RAG)

```
Après (Avec RAG):
- Docs récupérés: 3 docs pertinents
- Tokens par doc: 100
- Total tokens: 300
- Coût: 300 × $0.0001 = $0.00003

💰 $0.00003 par requête

ÉCONOMIE: 99.88% (!)
```

### Sur 1 mois (10,000 requêtes/mois)

```
Sans RAG:  10,000 × $0.025 = $250/mois
Avec RAG:  10,000 × $0.00003 = $0.30/mois

Économie: $249.70 / mois

Sur 1 an: $2,997 d'économies! 🎉
```

---

## ✅ Checklist RAG

- [ ] Docker/Chroma lancé sur port 8000
- [ ] Dépendances npm installées (langchain, chroma-js)
- [ ] `.env` complété avec clés API
- [ ] Docs vectorisés (`node vectorize-docs.js`)
- [ ] RAG health check: `curl /api/rag/health`
- [ ] RAG search fonctionne: `curl /api/rag/search?q=...`
- [ ] Chat API retourne `ragContext`
- [ ] Frontend affiche les références [Ref 1, 2, 3]
- [ ] Performance acceptable (< 1 sec par requête)
- [ ] Monitoring en place (logs + métriques)

---

## 🔗 Ressources

- **LangChain**: https://js.langchain.com/
- **Chroma**: https://www.trychroma.com/
- **Pinecone**: https://www.pinecone.io/
- **OpenAI Embeddings**: https://platform.openai.com/docs/models/embeddings

---

**Le RAG, c'est la clé pour un chatbot IA vraiment scalable et économique!** 🚀
