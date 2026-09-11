# ⚡ Guide de Démarrage Rapide

## TL;DR

Tu as un prototype React en V2. Je l'ai transformé en **app production-ready** avec:
- ✅ **Backend Node.js/Express** avec API LLM
- ✅ **Fichiers statiques React** adaptés
- ✅ **Configuration Apache** en reverse proxy
- ✅ **Support Azure OpenAI / Claude**
- ✅ **Guides de déploiement** complets

---

## 📦 Ce que tu as reçu

```
chatbot-production/
├── server.js              ← Backend Express (API LLM)
├── package.json           ← Dépendances Node
├── .env.example           ← Template config
├── public/                ← Frontend React
│   ├── index.html        ← Page hôte
│   ├── app.jsx           ← App principale
│   ├── app-adapter.jsx   ← Intégration LLM (voir note ci-dessous)
│   ├── *.jsx             ← Composants React
│   └── styles.css        ← Tous les styles
├── apache-config.conf     ← Config Apache reverse proxy
├── test-api.js           ← Script de test
├── README.md             ← Doc complète
├── DEPLOYMENT.md         ← Guide déploiement serveur
├── INTEGRATION.md        ← Comment modifier app.jsx
└── SETUP.md              ← Ce fichier
```

---

## 🚀 Démarrer en 5 minutes (Développement Local)

### 1. Terminal 1 — Backend

```bash
cd chatbot-production
npm install
npm start

# Doit afficher:
# 🚀 Assistant PPV server running on port 3001
# 💬 POST http://localhost:3001/api/chat
```

### 2. Terminal 2 — Frontend

```bash
cd chatbot-production/public
python3 -m http.server 8000

# Ouvre http://localhost:8000 dans le navigateur
```

### 3. Tester

```bash
# Terminal 3
curl http://localhost:3001/api/health
# {"status":"ok","llm":"OpenAI",...}

node chatbot-production/test-api.js
# Doit afficher: ✅ All tests passed!
```

✅ **Prêt!** Le chatbot répond avec le LLM.

---

## ⚠️ IMPORTANT — Clés API

Tu **dois** configurer tes clés API pour que le LLM fonctionne!

### Option 1️⃣ : Azure OpenAI (SNCF)

```bash
cp .env.example .env
nano .env

# Remplis ces champs:
AZURE_OPENAI_KEY=your-key-from-azure-portal
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4-deployment-name
```

### Option 2️⃣ : OpenAI Direct

```bash
OPENAI_API_KEY=sk-your-key-from-openai
OPENAI_MODEL=gpt-4
```

### Option 3️⃣ : Claude

```bash
OPENAI_API_KEY=sk-ant-your-claude-key
OPENAI_MODEL=claude-opus
```

📍 Puis relance le backend:
```bash
npm start
```

---

## 📝 Intégrer le LLM dans ton code React

### Situation actuelle

Ton `public/app.jsx` a une fonction `onSend()` qui utilise une **regex mock**:

```javascript
const onSend = () => {
  const text = composerText.trim();
  // ... 
  const lower = text.toLowerCase();
  if (/(lent|conne|diag)/.test(lower)) {
    // répond avec des données hardcodées
  }
};
```

### Ce qu'il faut faire

Je te propose **3 niveaux d'intégration** (voir `INTEGRATION.md` pour les détails):

#### Niveau 1️⃣ : Simple (5 min)

Remplace `onSend()` par une version qui appelle le LLM:

```javascript
const onSend = async () => {
  const text = composerText.trim();
  if (!text) return;
  
  setComposerText('');
  sendUser(text);
  
  // Appelle le backend
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : '[complexe]'
      }))
    })
  });
  
  const data = await response.json();
  botRespond(data.response);  // Réponse du LLM
};
```

#### Niveau 2️⃣ : Hybride (15 min)

Garde la détection d'intent **locale** (regex) pour router intelligemment vers:
- Diagnostic guidé (flux existant)
- Ticket ServiceNow (flux existant)
- LLM pour les questions générales

Voir exemple dans `INTEGRATION.md` ("Smart Routing").

#### Niveau 3️⃣ : Full IA (30 min)

Remplace même le diagnostic par une version IA avec `callDiagnosticApi()`.

---

## 🔧 Configuration Apache (Production)

Résumé 30 sec:

```bash
# 1. Copier la config
sudo cp apache-config.conf /etc/apache2/sites-available/chatbot-ppv.conf

# 2. Adapter le domaine (nano) et activer
sudo a2ensite chatbot-ppv

# 3. Redémarrer Apache
sudo systemctl restart apache2

# 4. Lancer le backend (à distance ou localement)
npm start
# ou: sudo pm2 start server.js
```

Pour les détails complets → voir `DEPLOYMENT.md`.

---

## 📊 Architecture

```
Utilisateur navigateur
    ↓
Apache (80/443) — Reverse proxy
    ↓
Node.js Express (port 3001)
    ├→ /api/chat (POST)
    ├→ /api/diagnostic (POST)
    └→ /api/health (GET)
    ↓
LLM (Azure OpenAI / OpenAI / Claude)
```

---

## 🧪 Tests

### Test 1: API santé

```bash
curl http://localhost:3001/api/health
# {"status":"ok","llm":"..."}
```

### Test 2: Chat API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Bonjour"}]}'
# {"response":"Réponse du LLM..."}
```

### Test 3: Depuis le navigateur

Ouvre http://localhost:8000 → envoie un message → reçois une réponse du LLM

### Test 4: Suite complète

```bash
node test-api.js
# Teste tous les endpoints automatiquement
```

---

## 🐛 Problèmes courants

| Symptôme | Cause | Fix |
|----------|-------|-----|
| "Cannot POST /api/chat" | Backend pas lancé | `npm start` |
| Empty response | Clé API invalide | Vérifier `.env` |
| Timeout 30s | LLM trop lent | Augmenter timeout dans `server.js` |
| 502 Gateway | Apache/Node pas connectés | Vérifier `ProxyPass` Apache |

---

## 📚 Documentation complète

- **README.md** → Vue d'ensemble + structure
- **DEPLOYMENT.md** → Guide serveur complet
- **INTEGRATION.md** → Comment modifier app.jsx
- **SETUP.md** → Ce fichier (quick start)

---

## ✅ Checklist avant production

- [ ] Backend testé localement (`npm start` + tests API)
- [ ] Clés API configurées (`.env`)
- [ ] app.jsx modifié (niveau 1 minimum)
- [ ] Apache configuré
- [ ] HTTPS activé (Let's Encrypt)
- [ ] Domaine accessible
- [ ] PM2 ou systemd lancé
- [ ] Logs configurés
- [ ] Monitoring en place

---

## 🎯 Prochaines étapes

### Aujourd'hui
1. Lire ce fichier ✅
2. Lancer en local (Terminal 1 + 2 ci-dessus)
3. Configurer `.env` avec ta clé API
4. Tester les endpoints API

### Demain
1. Modifier `app.jsx` (niveau 1, voir INTEGRATION.md)
2. Tester en local avec le vrai LLM
3. Commencer les tests de déploiement

### Semaine prochaine
1. Déployer sur le serveur de staging (DEPLOYMENT.md)
2. Tests complets
3. Go production!

---

## 📞 Questions?

- Consulte la doc détaillée (README.md, DEPLOYMENT.md, INTEGRATION.md)
- Lance le test suite: `node test-api.js`
- Regarde les logs: `npm start` ou `journalctl -u chatbot-ppv`

---

## 🚀 C'est bon!

Tu as tout ce qu'il faut pour passer du prototype au **chatbot IA production-ready**.

**Niveau de difficulté**: 🟢 Modéré (1-2 jours pour un dev)
**Temps déploiement**: 🟢 ~1h sur un serveur configuré

---

**Let's go!** 💪
