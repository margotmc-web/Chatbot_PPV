/**
 * RAG Adapter pour Frontend React
 * 
 * Intègre le RAG dans l'UI du chatbot:
 * - Affiche les références documentaires
 * - Indicateurs de score de pertinence
 * - Sources des réponses
 */

/* ============================================================
   Composant: Document Reference
   ============================================================ */
function DocumentReference({ docs, compact = false }) {
  if (!docs || docs.length === 0) {
    return null;
  }

  return (
    <div className="rag-references">
      <div className="rag-label">📚 Sources</div>
      {docs.map((doc, idx) => (
        <div key={idx} className="rag-ref-item">
          <span className="rag-ref-badge">[Ref {idx + 1}]</span>
          <span className="rag-ref-source">{doc.source}</span>
          <span className="rag-ref-type" data-type={doc.type}>{doc.type}</span>
          <span className="rag-ref-score">{(doc.score * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   Composant: RAG Status Indicator
   ============================================================ */
function RAGStatus({ isReady, docCount = 0 }) {
  if (!isReady) {
    return (
      <div className="rag-status offline">
        <I.AlertTriangle size={14} />
        <span>RAG offline — réponses sans contexte</span>
      </div>
    );
  }

  return (
    <div className="rag-status ready">
      <I.Check size={14} />
      <span>{docCount} docs indexés</span>
    </div>
  );
}

/* ============================================================
   Hook: useRAGContext
   ============================================================ */
function useRAGContext() {
  const [ragReady, setRAGReady] = React.useState(false);
  const [ragStats, setRAGStats] = React.useState(null);

  React.useEffect(() => {
    // Vérifier la santé du RAG au démarrage
    fetch('/api/rag/health')
      .then(res => res.json())
      .then(data => {
        setRAGReady(data.rag_status === 'ready');
        setRAGStats(data);
      })
      .catch(err => {
        console.warn('RAG health check failed:', err);
        setRAGReady(false);
      });
  }, []);

  return { ragReady, ragStats };
}

/* ============================================================
   Style CSS pour le RAG
   ============================================================ */
const RAG_STYLES = `
/* ============================================================
   References et indicateurs RAG
   ============================================================ */
.rag-references {
  margin-top: 12px;
  padding: 8px 12px;
  background: rgba(0, 61, 130, 0.05);
  border-left: 3px solid var(--brand-primary);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.rag-label {
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.rag-ref-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  flex-wrap: wrap;
}

.rag-ref-badge {
  font-weight: 600;
  color: var(--brand-accent);
}

.rag-ref-source {
  color: var(--text-secondary);
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}

.rag-ref-type {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
}

.rag-ref-type[data-type="pricing"] {
  background: #ffe0b6;
  color: #8b4500;
}

.rag-ref-type[data-type="diagnostic"] {
  background: #c8e6c9;
  color: #1b5e20;
}

.rag-ref-type[data-type="process"] {
  background: #bbdefb;
  color: #0d47a1;
}

.rag-ref-type[data-type="faq"] {
  background: #f8bbd0;
  color: #880e4f;
}

.rag-ref-score {
  padding: 2px 6px;
  background: var(--neutral-200);
  border-radius: 3px;
  font-weight: 600;
  min-width: 35px;
  text-align: right;
}

/* Status indicator */
.rag-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin: 8px 0;
}

.rag-status.ready {
  background: #c8e6c9;
  color: #1b5e20;
}

.rag-status.offline {
  background: #ffe0e0;
  color: #b71c1c;
}
`;

/* ============================================================
   Modifier le composant Message pour afficher les refs
   ============================================================ */
function MessageWithRAG({ msg, onAction }) {
  // Message utilisateur (inchangé)
  if (msg.role === 'user') {
    return (
      <div className="msg msg--user">
        <div className="msg__avatar"><Avatar initials={USER.initials}/></div>
        <div className="msg__body">
          <div className="msg__bubble msg__bubble--user">{msg.content}</div>
          <div className="msg__meta">{msg.time}</div>
        </div>
      </div>
    );
  }

  // Message bot (avec RAG references)
  return (
    <div className="msg">
      <div className="msg__avatar"><Avatar bot/></div>
      <div className="msg__body" style={{ width: msg.wide ? '100%' : undefined }}>
        {msg.content && (
          <div className="msg__bubble msg__bubble--bot">
            {typeof msg.content === 'string' ? <p>{msg.content}</p> : msg.content}
            
            {/* Afficher les références RAG */}
            {msg.ragContext && msg.ragContext.length > 0 && (
              <DocumentReference docs={msg.ragContext} />
            )}
            
            {msg.choices && (
              <div className="choices">
                {msg.choices.map((c, idx) => (
                  <button key={c.id}
                          className={`choice ${c.primary ? 'choice--primary' : ''} ${msg.spent ? 'is-disabled' : ''}`}
                          onClick={() => !msg.spent && onAction(c)}
                          disabled={msg.spent}>
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {msg.card && <div style={{ marginTop: msg.content ? 8 : 0 }}>{msg.card}</div>}
        {msg.typing && <div className="msg__bubble msg__bubble--bot"><Typing/></div>}
        <div className="msg__meta">
          <I.Sparkle size={11} style={{ color:'var(--brand-accent)' }}/>
          Assistant PPV (RAG) · {msg.time}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modifier onSend pour capturer ragContext
   ============================================================ */
const onSendWithRAG = async () => {
  const text = composerText.trim();
  if (!text) return;
  
  setComposerText('');
  sendUser(text);
  
  // Typing indicator
  setTimeout(() => {
    pushMessage({
      id: `typing-${Date.now()}`,
      role: 'bot',
      typing: true,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
  }, 200);

  try {
    const chatHistory = messages
      .filter(m => !m.typing)
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' 
          ? m.content 
          : '[composant React]'
      }));

    // Appeler l'API avec RAG activé
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        messages: chatHistory,
        useRAG: true  // ← Activer le RAG
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Supprimer typing indicator
    setMessages(prev => prev.filter(m => !m.typing));

    // Ajouter la réponse avec références RAG
    pushMessage({
      id: `msg-${Date.now()}`,
      role: 'bot',
      content: data.response,
      ragContext: data.ragContext,  // ← Ajouter les refs
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    
  } catch (error) {
    setMessages(prev => prev.filter(m => !m.typing));
    botRespond(
      <div className="api-error">
        ⚠️ Erreur: {error.message}
      </div>
    );
  }
};

/* ============================================================
   Hero avec statut RAG
   ============================================================ */
function HeroWithRAGStatus({ user, onSuggest }) {
  const { ragReady, ragStats } = useRAGContext();

  return (
    <div className="hero">
      <Avatar bot size={64}/>
      <h1>Bienvenue, {user.name}</h1>
      <p>Assistant PPV — Support N1 avec IA</p>
      
      {/* Afficher le statut RAG */}
      <RAGStatus isReady={ragReady} docCount={ragStats?.documentsIndexed || 0} />
      
      {/* Reste du contenu hero ... */}
      <div className="suggest-grid">
        <button className="suggest-card suggest-card--featured" onClick={() => onSuggest('first-connection')}>
          🚀 Premiers pas
        </button>
        <button className="suggest-card" onClick={() => onSuggest('diagnose')}>
          🔍 Diagnostiquer
        </button>
        <button className="suggest-card" onClick={() => onSuggest('incident')}>
          🆘 Signaler un incident
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Export des composants et styles
   ============================================================ */
Object.assign(window, {
  DocumentReference,
  RAGStatus,
  useRAGContext,
  MessageWithRAG,
  onSendWithRAG,
  HeroWithRAGStatus,
  RAG_STYLES
});

// Injecter les styles CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = RAG_STYLES;
document.head.appendChild(styleSheet);
