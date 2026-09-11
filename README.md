# 🤖 Assistant PPV — Production Chatbot

Chatbot IA support N1 pour les Postes Virtuels (PPV) SNCF, avec intégration Azure OpenAI/Claude et déploiement Apache.

---

## 📋 Vue d'ensemble

```
┌─────────────────────────────────────────────────┐
│  🌐 Navigateur (React 18 + Babel)              │
│     (public/index.html + JSX)                   │
└─────────────────┬───────────────────────────────┘
                  │ HTTP/WebSocket
┌─────────────────▼───────────────────────────────┐
│  🔄 Apache 2.4 (Reverse Proxy)                 │
│     Port 80/443                                 │
└─────────────────┬───────────────────────────────┘
                  │ ProxyPass /api → localhost:3001
┌─────────────────▼───────────────────────────────┐
│  🚀 Node.js/Express Backend (server.js)        │
│     Port 3001                                   │
│     • POST /api/chat → LLM                     │
│     • POST /api/diagnostic → Intent Analysis   │
│     • GET /api/health → Status check           │
└─────────────────┬───────────────────────────────┘
                  │ HTTPS
┌─────────────────▼───────────────────────────────┐
│  🧠 Azure OpenAI / Claude API                  │
│     (GPT-4, Claude-opus, etc.)                 │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Développement local

```bash
# 1. Backend
cd chatbot-production
npm install
npm start
# http://localhost:3001/api/health

# 2. Frontend (autre terminal)
cd public
python3 -m http.server 8000
# http://localhost:8000
```

### Production (Apache)

```bash
# Voir DEPLOYMENT.md pour les détails complets

# 1. Copier les fichiers
sudo cp -r chatbot-production /var/www/

# 2. Configurer les envs
sudo nano /var/www/chatbot-production/.env

# 3. Installer Apache et Node.js
sudo apt-get install nodejs apache2
sudo a2enmod proxy proxy_http rewrite headers

# 4. Activer le site
sudo cp apache-config.conf /etc/apache2/sites-available/chatbot-ppv.conf
sudo a2ensite chatbot-ppv

# 5. Lancer le backend
cd /var/www/chatbot-production
npm install --production
sudo pm2 start server.js --name chatbot-ppv

# 6. Tester
curl http://localhost/api/health
```

---

## 📁 Structure

```
chatbot-production/
├── server.js                  # Backend Express avec API LLM
├── package.json              # Dépendances Node.js
├── .env.example              # Template variables d'environnement
├── .env                       # Variables d'env (à créer, git-ignore)
│
├── public/
│   ├── index.html            # Page hôte
│   ├── styles.css            # Tous les styles SNCF
│   ├── app.jsx               # Application React principale
│   ├── components.jsx        # UI primitives (Avatar, Button, etc.)
│   ├── flows.jsx             # Parcours conversationnels
│   ├── dashboard.jsx         # Tableau de bord utilisateur
│   └── tweaks-panel.jsx      # Panneau settings prototype
│
├── app-adapter.jsx           # Intégration LLM (fetch API)
├── apache-config.conf        # Config Apache reverse proxy
│
├── DEPLOYMENT.md             # Guide complet de déploiement
├── INTEGRATION.md            # Comment intégrer LLM dans app.jsx
├── README.md                 # Ce fichier
└── package-lock.json         # Lock versions npm
```

---

## ⚙️ Configuration

### Variables d'environnement

Copie `.env.example` → `.env` et remplis:

```bash
# Backend
PORT=3001
NODE_ENV=production

# Choix 1: Azure OpenAI (SNCF standard)
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4

# OU Choix 2: OpenAI Direct
OPENAI_API_KEY=sk-your-key
OPENAI_MODEL=gpt-4

# CORS (adapter au domaine en production)
CORS_ORIGIN=https://ppv-assistant.sncf.fr
```

---

## 🔌 API Endpoints

### POST `/api/chat`

Envoie un message, reçoit une réponse LLM.

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Ma VM est lente"},
    {"role": "assistant", "content": "Je vais diagnostiquer..."}
  ]
}
```

**Response:**
```json
{
  "response": "Voici ce que j'analyse..."
}
```

### POST `/api/diagnostic`

Analyse structurée avec intent detection.

**Request:**
```json
{
  "userInput": "Mon PPV ne répond plus depuis ce matin",
  "context": {"vmName": "PPV-AVD-CR-04", "vmStatus": "Dégradée"}
}
```

**Response:**
```json
{
  "analysis": "VM dégradée avec symptôme critique",
  "actions": ["Vérifier la connexion VPN", "Redémarrer la VM"],
  "escalate": true
}
```

### GET `/api/health`

Vérifier la santé du serveur et du LLM.

**Response:**
```json
{
  "status": "ok",
  "llm": "Azure OpenAI",
  "timestamp": "2026-09-07T14:32:00Z"
}
```

---

## 📊 Intégration LLM

Trois options supportées:

### 1️⃣ Azure OpenAI (Recommandé SNCF)

```javascript
// server.js auto-détecte la présence de AZURE_OPENAI_KEY
const USE_AZURE = process.env.AZURE_OPENAI_KEY && process.env.AZURE_OPENAI_ENDPOINT;

if (USE_AZURE) {
  const { OpenAIClient, AzureKeyCredential } = require('@azure/openai');
  azureClient = new OpenAIClient(
    process.env.AZURE_OPENAI_ENDPOINT,
    new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
  );
}
```

### 2️⃣ OpenAI Direct

```javascript
import OpenAI from 'openai';
const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

### 3️⃣ Claude (via OpenAI-compatible)

```javascript
// Même interface OpenAI, change juste la clé et le model
OPENAI_API_KEY=sk-ant-...
OPENAI_MODEL=claude-opus
```

---

## 🧪 Tests

### Santé du backend

```bash
curl http://localhost:3001/api/health
```

### Chat simple

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Bonjour"}]}'
```

### Diagnostic

```bash
curl -X POST http://localhost:3001/api/diagnostic \
  -H "Content-Type: application/json" \
  -d '{"userInput":"VM lente","context":{"vmName":"PPV-1"}}'
```

---

## 🔐 Sécurité

- ✅ CORS configuré (adapter le domaine)
- ✅ Content-Security-Policy headers
- ✅ .env jamais en git (`.gitignore`)
- ✅ HTTPS en production (Let's Encrypt)
- ✅ Clés API en variables d'env, pas en hardcode
- ⚠️ Adapter les headers de sécurité Apache (`apache-config.conf` ligne 80+)

---

## 📈 Déploiement

Voir **DEPLOYMENT.md** pour:
- Installation Node.js
- Configuration Apache
- PM2 ou systemd
- HTTPS/SSL
- Monitoring

**Résumé 30 sec:**
```bash
npm install --production
# Créer .env avec clés API
sudo cp apache-config.conf /etc/apache2/sites-available/chatbot-ppv.conf
sudo a2ensite chatbot-ppv
sudo pm2 start server.js
sudo systemctl restart apache2
```

---

## 🐛 Dépannage

| Problème | Cause | Fix |
|----------|-------|-----|
| 502 Bad Gateway | Backend pas lancé | `sudo pm2 status` |
| 404 /api/* | Proxy mal configuré | Vérifier `ProxyPass` dans Apache |
| CORS Error | Domaine pas autorisé | Adapter `Access-Control-Allow-Origin` |
| Timeout LLM | Requête trop longue | Augmenter `maxTokens` timeout |
| API Key invalid | Clé expirée/invalide | Vérifier `.env` |

Logs:
```bash
sudo journalctl -u chatbot-ppv -f  # systemd
sudo pm2 logs chatbot-ppv          # PM2
sudo tail -f /var/log/apache2/ppv-chatbot-*.log  # Apache
```

---

## 📝 Intégration dans le code React

Voir **INTEGRATION.md** pour modifier `app.jsx`:

1. Remplacer `onSend()` par version async/await
2. Ajouter `callLLMApi()` helper
3. Adapter `startDiagnostic()` (optionnel)
4. Tester en local d'abord

---

## 🔄 Mise à jour

```bash
cd /var/www/chatbot-ppv
git pull origin main
npm install --production
sudo pm2 restart chatbot-ppv
```

---

## 📞 Contacts

- **Slack**: #ppv-assistant-dev
- **Email**: margot.xxx@sncf.fr
- **Issues**: [Repo GitHub/GitLab]

---

## 📄 License

MIT (adapter selon la politique SNCF)

---

## ✅ Checklist déploiement

- [ ] Backend lancé et répondant (port 3001)
- [ ] Variables d'env remplies
- [ ] Apache configuré et redémarré
- [ ] CORS paramétré pour ton domaine
- [ ] Tests `/api/health` OK
- [ ] Tests `/api/chat` OK
- [ ] Frontend accessible via Apache
- [ ] HTTPS activé
- [ ] Logs configurés
- [ ] Backups en place
- [ ] Monitoring en place

**Tu es prêt.e?** 🚀 Lance le déploiement!
