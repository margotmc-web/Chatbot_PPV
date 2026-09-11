# 🔌 Guide d'Intégration LLM dans app.jsx

Ce guide te montre comment passer du prototype (avec regex mock) à une vraie API LLM.

---

## Étape 1️⃣ : Remplacer la fonction `onSend()`

### Avant (Prototype)

Ton `app.jsx` actuel a cette fonction vers la ligne ~806:

```javascript
const onSend = () => {
  const text = composerText.trim();
  if (!text) return;
  setComposerText('');
  sendUser(text);
  
  // crude intent detection for demo
  const lower = text.toLowerCase();
  setTimeout(() => {
    if (/(lent|conne|diag|...)/.test(lower)) {
      // ... réponses hardcodées
    }
  }, 300);
};
```

### Après (Production avec LLM)

Remplace par:

```javascript
const onSend = async () => {
  const text = composerText.trim();
  if (!text) return;
  
  setComposerText('');
  sendUser(text);
  
  // Affiche typing indicator
  setTimeout(() => {
    pushMessage({
      id: `typing-${Date.now()}`,
      role: 'bot',
      typing: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
  }, 200);

  try {
    // Construit l'historique pour le LLM
    const chatHistory = messages
      .filter(m => !m.typing)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content 
          : '[composant React complexe]'
      }));

    // Appelle l'API du backend
    const response = await window.apiCall('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: chatHistory })
    });

    // Supprime le typing indicator
    setMessages(prev => prev.filter(m => !m.typing));

    // Ajoute la réponse du LLM
    botRespond(response.response);
    
  } catch (error) {
    setMessages(prev => prev.filter(m => !m.typing));
    botRespond(
      <div className="api-error">
        ⚠️ Erreur: {error.message}
      </div>
    );
  }
};
```

---

## Étape 2️⃣ : Ajouter l'helper API

Ajoute ceci **au début** de `app.jsx` (avant les autres fonctions):

```javascript
/* ============================================================
   LLM API Helper
   ============================================================ */
const callLLMApi = async (messages) => {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    throw new Error(`API Error ${response.status}`);
  }

  const data = await response.json();
  return data.response;
};

const callDiagnosticApi = async (userInput, context = {}) => {
  const response = await fetch('/api/diagnostic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userInput, context })
  });

  if (!response.ok) {
    throw new Error(`Diagnostic failed`);
  }

  return response.json();
};
```

---

## Étape 3️⃣ : Adapter le `startDiagnostic()` (optionnel mais recommandé)

### Avant

```javascript
const startDiagnostic = () => {
  // ... lance les étapes guidées hardcodées
  botRespond(<DiagnosticChoice onChoice={...} />);
  // etc.
};
```

### Après (avec IA pour affiner le diagnostic)

```javascript
const startDiagnostic = async () => {
  // Étape 1: Introduction
  botRespond(
    <p>Lancez le diagnostic. Décrivez le problème que vous rencontrez avec votre VM.</p>
  );
  
  // Attendre que l'utilisateur envoie quelque chose...
  // (ou proposer un choix)
  setMessages(prev => {
    const copy = [...prev];
    if (copy.length > 0) {
      const last = copy[copy.length - 1];
      if (last.role === 'bot') {
        copy[copy.length - 1] = {
          ...last,
          choices: [
            { id: 'diag-vm-slow', label: 'VM lente', kind: 'jump-diagnostic' },
            { id: 'diag-connection', label: 'Problème de connexion', kind: 'jump-diagnostic' },
            { id: 'diag-error', label: 'Message d\'erreur', kind: 'jump-diagnostic' }
          ]
        };
      }
    }
    return copy;
  });
};
```

Ou encore mieux, appelle l'API pour un diagnostic intelligent:

```javascript
const startDiagnosticAI = async () => {
  const userDescription = "VM lente, connexion RDP lente depuis ce matin";
  
  try {
    const result = await callDiagnosticApi(userDescription, {
      vmName: VM.name,
      vmStatus: VM.status
    });

    botRespond(result.analysis);
    
    if (result.actions && result.actions.length > 0) {
      // Affiche les actions recommandées
      const choices = result.actions.map((action, idx) => ({
        id: `diag-${idx}`,
        label: action,
        primary: idx === 0
      }));

      setMessages(prev => {
        const copy = [...prev];
        if (copy.length > 0) {
          copy[copy.length - 1] = { ...copy[copy.length - 1], choices };
        }
        return copy;
      });
    }

    if (result.escalate) {
      setTimeout(() => startTicketBlank(), 1000);
    }
  } catch (error) {
    botRespond(`Erreur diagnostic: ${error.message}`);
  }
};
```

---

## Étape 4️⃣ : Smart Routing (Optionnel)

Tu peux garder une détection d'intent **locale et rapide** pour router intelligemment:

```javascript
const onSend = async () => {
  const text = composerText.trim();
  if (!text) return;
  
  setComposerText('');
  sendUser(text);

  const lower = text.toLowerCase();
  
  // Détection locale rapide
  if (/(lent|conne|diag|probl|panne|marche pas|erreur)/.test(lower)) {
    // Route vers le flux diagnostic (plus rapide que LLM)
    startDiagnostic();
  } else if (/(co[uû]t|prix|tarif|combien|factur)/.test(lower)) {
    // LLM pour la question tarifaire
    const response = await callLLMApi([
      { role: 'user', content: text }
    ]);
    botRespond(response);
    setTimeout(() => {
      pushMessage({ role: 'bot', wide: true, card: <CostBreakdownCard /> });
    }, 800);
  } else {
    // LLM general-purpose fallback
    // ... (voir étape 1)
  }
};
```

---

## Étape 5️⃣ : Modifier le Composer

Remplace le bouton d'envoi pour supporter async:

### Avant

```javascript
<button onClick={onSend}>Envoyer</button>
```

### Après (avec state loading)

```javascript
const [isLoading, setIsLoading] = useState(false);

const onSendWrapper = async () => {
  setIsLoading(true);
  try {
    await onSend();
  } finally {
    setIsLoading(false);
  }
};

// Dans le JSX:
<button 
  onClick={onSendWrapper}
  disabled={isLoading}
  className={isLoading ? 'is-loading' : ''}
>
  {isLoading ? 'Envoi...' : 'Envoyer'}
</button>
```

---

## Étape 6️⃣ : Ajouter des styles pour le loading

Dans `styles.css`, ajoute:

```css
.api-error {
  background: #ffe0e0;
  border-left: 4px solid #e31d23;
  padding: 12px;
  margin: 8px 0;
  border-radius: 4px;
  font-size: 14px;
}

.is-loading {
  opacity: 0.6;
  cursor: not-allowed;
}

.msg__bubble.api-error {
  background: #ffe0e0;
  color: #8b0000;
}
```

---

## 🧪 Tester en local

### 1. Lancer le backend

```bash
cd chatbot-production
npm install
npm start

# Port 3001 doit être accessible
curl http://localhost:3001/api/health
```

### 2. Servir le frontend

```bash
cd chatbot-production/public
python3 -m http.server 8000
# Ou: npx serve
```

### 3. Ouvrir dans le navigateur

```
http://localhost:8000
```

### 4. Tester un message

Envoie un message → doit appeler `/api/chat` → voir la réponse du LLM

Vérifier dans la console du navigateur (F12) → Network tab → `POST /api/chat`

---

## ⚠️ Checklist avant déploiement

- [ ] Backend Node.js lancé et accessible (port 3001)
- [ ] Variables d'env `.env` remplies (clés API)
- [ ] `onSend()` remplacé par version async
- [ ] `callLLMApi` ajoutée dans app.jsx
- [ ] Apache configuré en reverse proxy
- [ ] CORS configuré correctement
- [ ] Tests locaux OK
- [ ] Tests sur serveur de staging OK
- [ ] HTTPS activé (certificate Let's Encrypt)

---

## 🆘 Erreurs courantes

### ❌ "Erreur: Failed to fetch /api/chat"

**Cause**: Le backend n'est pas lancé ou CORS bloqué.

**Fix**:
```bash
sudo pm2 status  # Voir si chatbot-ppv tourne
curl http://localhost:3001/api/health
```

### ❌ "504 Gateway Timeout"

**Cause**: Le LLM prend trop de temps.

**Fix** (dans `server.js`):
```javascript
maxTokens: 1000,
timeout: 60000  // 60 secondes
```

### ❌ "Unauthorized (401)"

**Cause**: Clé API invalide ou expirée.

**Fix**:
```bash
# Vérifier la clé dans .env
echo $AZURE_OPENAI_KEY
echo $OPENAI_API_KEY
```

---

## 📞 Besoin d'aide?

1. Consulte le `DEPLOYMENT.md` pour les problèmes d'infra
2. Regarde les logs: `sudo journalctl -u chatbot-ppv -f`
3. Teste l'API directement: `curl -X POST http://localhost:3001/api/chat ...`

---

**Prêt? C'est parti pour la prod!** 🚀
