/* 
  INSTRUCTIONS D'INTÉGRATION:
  
  Remplace les fonctions suivantes dans app.jsx avec celles-ci:
  
  1. const onSend = () => { ... }  → onSendWithLLM() ci-dessous
  2. Ajoute: const callLLMApi = () => { ... }
  3. Ajoute: const callDiagnosticApi = () => { ... }
  
  Attention: Le reste de ton UI et de ta logique reste identique.
*/

// ============================================================
// Configuration API
// ============================================================
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ============================================================
// Appel API Chat LLM
// ============================================================
const callLLMApi = async (messages) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.response || 'Erreur de réponse du serveur';
  } catch (error) {
    console.error('API Error:', error);
    return `Erreur de connexion au serveur: ${error.message}`;
  }
};

// ============================================================
// Appel API Diagnostic
// ============================================================
const callDiagnosticApi = async (userInput, context = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/diagnostic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userInput, context })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Diagnostic API Error:', error);
    return { error: 'Diagnostic indisponible' };
  }
};

// ============================================================
// REMPLACER onSend() par ceci:
// ============================================================
const onSendWithLLM = async () => {
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

  // Construis l'historique des messages pour le LLM
  const chatHistory = messages
    .filter(m => !m.typing) // Exclure les typing indicators
    .map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : '[composant React rendu]'
    }));

  // Appelle l'API LLM
  const llmResponse = await callLLMApi(chatHistory);

  // Supprime typing indicator
  setMessages(prev => prev.filter(m => !m.typing));

  // Ajoute la réponse du LLM
  botRespond(llmResponse);

  // Optionnel: Analyse l'intention pour afficher des suggestions
  // (tu peux garder cette logique pour améliorer le contexte)
};

// ============================================================
// ALTERNATIVE: Version avec gestion d'intent + diagnostic auto
// ============================================================
const onSendWithSmartRouting = async () => {
  const text = composerText.trim();
  if (!text) return;
  
  setComposerText('');
  sendUser(text);

  // Typing indicator
  const typingId = `typing-${Date.now()}`;
  setTimeout(() => {
    pushMessage({
      id: typingId,
      role: 'bot',
      typing: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
  }, 200);

  // Détection basique locale (rapide)
  const lower = text.toLowerCase();
  let useAutoFlow = false;
  let autoFlowType = null;

  if (/(lent|conne|diag|probl|panne|marche pas|erreur)/.test(lower)) {
    useAutoFlow = true;
    autoFlowType = 'diagnostic';
  } else if (/(co[uû]t|prix|tarif|combien|factur)/.test(lower)) {
    useAutoFlow = true;
    autoFlowType = 'pricing';
  } else if (/(suivi|ticket|statut|avancement|incident)/.test(lower)) {
    useAutoFlow = true;
    autoFlowType = 'tracking';
  }

  setMessages(prev => prev.filter(m => m.id !== typingId));

  if (useAutoFlow) {
    // Lance le flux guidé correspondant
    if (autoFlowType === 'diagnostic') {
      startDiagnostic();
    } else if (autoFlowType === 'pricing') {
      // Appelle LLM pour répondre à la question tarifaire
      const response = await callLLMApi([
        { role: 'user', content: text }
      ]);
      botRespond(response);
      setTimeout(() => {
        pushMessage({ role: 'bot', wide: true, card: <CostBreakdownCard /> });
      }, 800);
    } else if (autoFlowType === 'tracking') {
      startTracking();
    }
  } else {
    // Appelle directement le LLM
    const chatHistory = messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : '[contenu complexe]'
    }));

    const llmResponse = await callLLMApi(chatHistory);
    botRespond(llmResponse);
  }
};

// ============================================================
// Diagnostic avec IA
// ============================================================
const startDiagnosticWithAI = async () => {
  // Remplace l'ancien startDiagnostic() avec celui-ci pour une version améliorée

  const context = {
    vmName: VM.name,
    vmStatus: VM.status,
    region: VM.region,
    userRole: USER.role
  };

  // Étape 1: Analyse de l'intention
  const diagResult = await callDiagnosticApi(
    'VM lente ou problème de connexion',
    context
  );

  if (diagResult.error) {
    botRespond(`Erreur lors du diagnostic: ${diagResult.error}`);
    return;
  }

  botRespond(diagResult.analysis);
  
  if (diagResult.actions && diagResult.actions.length > 0) {
    const choices = diagResult.actions.map((action, idx) => ({
      id: `diag-action-${idx}`,
      label: action,
      primary: idx === 0,
      kind: 'diag-action'
    }));

    setMessages(prev => {
      const copy = [...prev];
      if (copy.length > 0) {
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          choices
        };
      }
      return copy;
    });
  }

  if (diagResult.escalate) {
    setTimeout(() => {
      botRespond(
        <p><strong>⚠️ Escalade recommandée.</strong> Je prépare un ticket prioritaire pour ServiceNow.</p>
      );
      setTimeout(() => startTicketBlank(), 1000);
    }, 800);
  }
};

// ============================================================
// Export pour utilisation dans app.jsx
// ============================================================
Object.assign(window, {
  callLLMApi,
  callDiagnosticApi,
  onSendWithLLM,
  onSendWithSmartRouting,
  startDiagnosticWithAI,
  API_BASE_URL
});
