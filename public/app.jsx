/* global React, ReactDOM,
   I, Avatar, StatusPill, Typing, Gauge, FieldRow, Steps, Banner,
   DIAG_STEPS, DiagnosticChoice, DiagnosticResult,
   DiskCheckGuide, RestartVmProcess, ErrorScreenshotStep, SecondDiagnosticStep,
   TicketSnippet, TicketHandoffCard, TicketTrackingCard,
   FaqList, CostBreakdownCard, FAQ_DATA, CopyField,
   FirstConnectionCard,
   TICKET_STEPS, BLOCKING_STEP, computePriority, TicketGuidedChoice, TicketDescribeStep,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakColor, TweakSelect */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ============================================================
   Mock data
   ============================================================ */
const USER = { name: 'Camille Renard', initials: 'CR', id: 'EMP-58241', role: 'Cheffe de projet · DSI' };

const VM = { name: 'PPV-AVD-CR-04', status: 'Dégradée', region: 'Paris-Nord', size: 'Standard · 4 vCPU / 16 Go' };

const HISTORY = [
  { id: 'h1', title: "Diagnostic VM lente", time: 'Hier · 14:32' },
  { id: 'h2', title: "Création ticket — connexion AVD", time: 'Lun. 11:08' },
  { id: 'h3', title: "Coût VM Standard vs Clone", time: '24 sept.' },
  { id: 'h4', title: "Réinitialiser ma session Citrix", time: '18 sept.' },
];

const TICKETS = [
  {
    id: 'INC-204815',
    summary: "Impossible de se connecter à AVD depuis ce matin",
    status: 'En cours',
    statusTone: 'info',
    timeline: [
      { state: 'done',    label: 'Ticket créé',        time: "Aujourd'hui · 09:14", author: 'Vous',         note: "Brouillon préparé avec l'assistant · diagnostic joint." },
      { state: 'done',    label: 'Pris en charge',     time: "Aujourd'hui · 09:42", author: 'Olivier M.',   note: "Bonjour Camille, je regarde votre VM. Pouvez-vous confirmer que vous êtes bien connectée au VPN ?" },
      { state: 'active',  label: 'Diagnostic en cours', time: "Aujourd'hui · 10:05", author: 'Support N2' },
      { state: 'pending', label: 'Résolu',             time: 'En attente' },
    ],
  },
];

const ARTICLE_LABELS = {
  'first-connection': 'Mes premiers pas — première connexion à ma VM',
  'connection-problem': 'Problème de connexion',
  'diagnostic': 'Diagnostic VM',
  'incident': null,
};

/* ============================================================
   Message renderer
   ============================================================ */
function Message({ msg, onAction }) {
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
  // bot
  return (
    <div className="msg">
      <div className="msg__avatar"><Avatar bot/></div>
      <div className="msg__body" style={{ width: msg.wide ? '100%' : undefined }}>
        {msg.content && (
          <div className="msg__bubble msg__bubble--bot">
            {typeof msg.content === 'string' ? <p>{msg.content}</p> : msg.content}
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
          Assistant PPV · {msg.time}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Hero / empty state
   ============================================================ */
function Hero({ user, onSuggest }) {
  const suggestions = [
    { id: 'diagnose', icon: <I.Stethoscope size={18}/>, title: 'Peux-tu m\'aider avec ma VM ?',    desc: "Quelques questions guidées pour cibler la panne." },
    { id: 'incident', icon: <I.Ticket size={18}/>,      title: 'Préparer un ticket SNOW',   desc: "Brouillon prết à coller dans ServiceNow." },
    { id: 'track',    icon: <I.Activity size={18}/>,    title: 'Suivre un incident',     desc: "Voir l'avancement de mes tickets en cours." },
    { id: 'cost',     icon: <I.Coin size={18}/>,        title: 'Mécanique tarifaire',   desc: "Comprendre les coûts de l'offre PPV." },
  ];

  const firstName = user.name.split(' ')[0];
  return (
    <div className="hero">
      <div className="hero__eyebrow">Assistant PPV · Poste virtuel</div>
      <h1 className="hero__title">Bonjour {firstName}, comment puis-je vous aider ?</h1>
      <p className="hero__subtitle">
        As-tu une question sur l'offre PPV ? Comment puis-je t'aider avec ta VM ? Choisis un parcours
        ci-dessous ou écris-moi directement.
      </p>

      {/* Featured onboarding card */}
      <button className="suggest-card suggest-card--featured" onClick={() => onSuggest('first-connection')}>
        <span className="suggest-card__icon suggest-card__icon--featured">
          <I.Power size={22}/>
        </span>
        <span className="suggest-card__body">
          <span className="suggest-card__eyebrow">Premiers pas</span>
          <span className="suggest-card__title">Ma première connexion à ma VM</span>
          <span className="suggest-card__desc">
            Guide complet en 6 étapes pour activer votre accès, installer le client et lancer
            votre poste virtuel pour la première fois.
          </span>
        </span>
        <span className="suggest-card__arrow"><I.ArrowRight size={16}/></span>
      </button>

      <div className="suggest-grid">
        {suggestions.map(s => (
          <button key={s.id} className="suggest-card" onClick={() => onSuggest(s.id)}>
            <span className="suggest-card__icon">{s.icon}</span>
            <span className="suggest-card__body">
              <span className="suggest-card__title">{s.title}</span>
              <span className="suggest-card__desc">{s.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Context panel (right side) — VM card + quick actions
   ============================================================ */
function ContextPanel({ vm, user, activeTicket, onAction, onClose }) {
  return (
    <aside className="context">
      <div className="context__header">
        <div className="context__title">Contexte de session</div>
        <button className="context__close" onClick={onClose} aria-label="Fermer le panneau">
          <I.X size={14}/>
        </button>
      </div>
      <div className="context__body">

        <div className="context__section">
          <div className="context__section-title">Votre poste virtuel</div>
          <div className="bot-card" style={{ boxShadow: 'none' }}>
            <div className="bot-card__header" style={{ padding: '12px 14px 10px' }}>
              <div className="bot-card__icon"><I.Server size={14}/></div>
              <div style={{ minWidth: 0 }}>
                <div className="bot-card__title" style={{ fontSize: 13 }}>
                  <code style={{ fontSize: 12 }}>{vm.name}</code>
                </div>
                <div className="bot-card__subtitle">{vm.size}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <StatusPill tone={vm.status === 'Dégradée' ? 'warning' : vm.status === 'Hors ligne' ? 'danger' : 'online'}>
                  {vm.status}
                </StatusPill>
              </div>
            </div>
            <div className="bot-card__body" style={{ padding: '10px 14px 12px' }}>
              <FieldRow label="Région">{vm.region}</FieldRow>
              <FieldRow label="Utilisateur">
                <Avatar initials={user.initials} size="sm"/>
                <span>{user.name}</span>
              </FieldRow>
              <FieldRow label="ID Employé"><code>{user.id}</code></FieldRow>
            </div>
          </div>
        </div>

        <div className="context__section">
          <div className="context__section-title">Actions rapides</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button className="btn btn--secondary" style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => onAction('restart-vm')}>
              <I.Power size={14}/> Redémarrer la VM
            </button>
            <button className="btn btn--secondary" style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => onAction('reset-session')}>
              <I.Refresh size={14}/> Réinitialiser ma session
            </button>
            <button className="btn btn--secondary" style={{ justifyContent: 'flex-start', width: '100%' }}
                    onClick={() => onAction('new-ticket')}>
              <I.Plus size={14}/> Préparer un ticket SNOW
            </button>
          </div>
        </div>

        {activeTicket && (
          <div className="context__section">
            <div className="context__section-title">Ticket en cours</div>
            <div className="bot-card" style={{ boxShadow: 'none' }}>
              <div className="bot-card__header" style={{ padding: '12px 14px 10px' }}>
                <div className="bot-card__icon"><I.Ticket size={14}/></div>
                <div style={{ minWidth: 0 }}>
                  <div className="bot-card__title" style={{ fontSize: 13 }}><code style={{ fontSize: 12 }}>{activeTicket.id}</code></div>
                  <div className="bot-card__subtitle" style={{
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth: 220
                  }}>{activeTicket.summary}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <StatusPill tone={activeTicket.statusTone}>{activeTicket.status}</StatusPill>
                </div>
              </div>
              <div className="bot-card__body" style={{ padding: '10px 14px 12px' }}>
                <ul className="timeline" style={{ paddingLeft: 18 }}>
                  {activeTicket.timeline.slice(0, 3).map((t, i) => (
                    <li key={i} className={`timeline__item timeline__item--${t.state}`} style={{ paddingBottom: 12 }}>
                      <span className="timeline__dot"/>
                      <div className="timeline__label" style={{ fontSize: 12.5 }}>{t.label}</div>
                      <div className="timeline__meta">{t.time}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="context__section">
          <div className="context__section-title">À propos de l'assistant</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            L'assistant PPV peut diagnostiquer votre poste, créer des tickets et répondre à vos questions
            d'usage. Pour les demandes complexes, un agent humain prend automatiquement le relais.
          </div>
        </div>

      </div>
    </aside>
  );
}

/* ============================================================
   App root
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "accent": "#CC0033",
  "showHero": true
}/*EDITMODE-END*/;

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [view, setView] = useState('chat'); // chat | tickets | faq | cost
  const [messages, setMessages] = useState([]);
  const [composerText, setComposerText] = useState('');
  const [diagAnswers, setDiagAnswers] = useState({});
  const [diagStep, setDiagStep] = useState(0);
  const [tickets, setTickets] = useState(TICKETS);
  const [activeTicketId, setActiveTicketId] = useState(TICKETS[0].id);
  const [ticketOrigin, setTicketOrigin] = useState(null);
  const [toasts, setToasts] = useState([]);
  const scrollRef = useRef(null);
  const idRef = useRef(0);
  const diagCountRef = useRef(0);
  const newId = () => `m${++idRef.current}`;
  const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    document.documentElement.style.setProperty('--composer-pad',
      tweaks.density === 'compact' ? '8px 24px 14px' : '14px 36px 22px');
  }, [tweaks.density]);

  // Apply accent
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', tweaks.accent);
    // derive hover/active
    document.documentElement.style.setProperty('--brand-primary-hover',
      shade(tweaks.accent, -8));
    document.documentElement.style.setProperty('--brand-primary-active',
      shade(tweaks.accent, -16));
  }, [tweaks.accent]);

  // Scroll: anchor the most recent USER message to the top of the chat,
  // so the user always sees the start of the bot's reply (ChatGPT-style).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const userMsgs = el.querySelectorAll('.msg--user');
    const last = userMsgs[userMsgs.length - 1];
    if (last) {
      const elRect = el.getBoundingClientRect();
      const msgRect = last.getBoundingClientRect();
      const target = msgRect.top - elRect.top + el.scrollTop - 20;
      el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const pushMessage = (msg) => {
    setMessages(prev => [...prev, { id: newId(), time: now(), ...msg }]);
  };

  const replaceLast = (updater) => {
    setMessages(prev => {
      if (!prev.length) return prev;
      const copy = [...prev];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = updater(last);
      return copy;
    });
  };

  /* User says something */
  const sendUser = (text) => {
    pushMessage({ role: 'user', content: text });
  };

  /* Bot typing then content (simulate latency) */
  const botRespond = (content, opts = {}, delay = 700) => {
    pushMessage({ role: 'bot', typing: true });
    setTimeout(() => {
      replaceLast(() => ({ id: newId(), role: 'bot', time: now(), content, ...opts }));
    }, delay);
  };

  /* =========================================================
     SUGGEST HANDLERS
     ========================================================= */
  const startDiagnostic = () => {
    if (diagCountRef.current > 0) { return startSecondDiagnostic(); }
    diagCountRef.current += 1;
    sendUser("Peux-tu m'aider avec ma VM ?");
    setDiagAnswers({});
    setDiagStep(0);
    botRespond(
      <>
        <p>Avec plaisir — je vais vous poser <strong>quelques questions rapides</strong> pour cibler la panne et vous proposer des actions concrètes.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>Vos réponses ne sont partagées qu'avec votre ticket si vous décidez d'en créer un.</p>
      </>,
      {},
      700
    );
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <DiagnosticChoice step={DIAG_STEPS[0]}
                                 onPick={(stepId, choice) => handleDiag(stepId, choice, 0)}/>,
      });
    }, 1500);
  };

  const startSecondDiagnostic = () => {
    diagCountRef.current += 1;
    sendUser("Ça ne fonctionne toujours pas.");
    botRespond(
      <>
        <p>On a déjà fait un premier diagnostic ensemble. Plutôt que de tout reprendre, dites-moi ce qui a changé :</p>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
          <li>Pourquoi cela ne fonctionne toujours pas, selon vous ?</li>
          <li>Quel est le message que vous recevez ?</li>
          <li>Est-ce le même message / problème que précédemment, ou un nouveau ?</li>
        </ul>
      </>,
      {},
      700
    );
    setTimeout(() => {
      pushMessage({ role: 'bot', wide: true, card: <SecondDiagnosticStep onSubmit={handleSecondDiagnostic}/> });
    }, 1500);
  };

  const handleSecondDiagnostic = (data) => {
    sendUser(`${data.why || '(pas de précision)'}${data.message ? ' — Message : ' + data.message : ''}`);
    botRespond(
      <p>Merci, c'est plus clair. {data.same === 'same'
        ? "Comme c'est le même message qu'avant et que les actions de base n'ont rien donné, on passe à l'étape supérieure : un ticket prioritaire pour l'équipe technique."
        : "Comme il s'agit d'un nouveau message, je le joins au diagnostic pour que l'équipe ait l'historique complet."}</p>,
      { choices: [
        { id: 'sd-ticket', label: "Préparer un ticket pour l'équipe", primary: true, kind: 'jump-ticket' },
        { id: 'sd-restart', label: 'Revoir comment redémarrer la VM', kind: 'show-restart' },
      ] },
      700
    );
  };

  const showRestartProcess = () => {
    pushMessage({
      role: 'bot', wide: true,
      card: <RestartVmProcess onConfirm={() => botRespond(
        <p>Si le problème persiste après le redémarrage, préparez un ticket et l'équipe prend le relais.</p>,
        { choices: [{ id: 'ar-ticket', label: 'Préparer un ticket', primary: true, kind: 'jump-ticket' }] },
        400
      )}/>,
    });
  };

  const showDiagResult = (finalAnswers) => {
    pushMessage({ role: 'bot', typing: true });
    setTimeout(() => {
      replaceLast(() => ({
        id: newId(), role: 'bot', wide: true, time: now(),
        content: <p>J'ai analysé vos réponses. Voici ce que je propose :</p>,
        card: <DiagnosticResult
                answers={finalAnswers}
                onCreateTicket={() => startTicketFromDiag(finalAnswers)}
                onRestart={startDiagnostic}
                onRestartVm={showRestartProcess}/>,
      }));
    }, 900);
  };

  const handleDiag = (stepId, choice, fromStep) => {
    setDiagAnswers(prev => ({ ...prev, [stepId]: choice }));
    sendUser(choice.label);

    const next = fromStep + 1;
    if (next < DIAG_STEPS.length) {
      setDiagStep(next);
      setTimeout(() => {
        pushMessage({ role: 'bot', typing: true });
        setTimeout(() => {
          replaceLast(() => ({
            id: newId(),
            role: 'bot',
            wide: true,
            time: now(),
            card: <DiagnosticChoice
                    step={DIAG_STEPS[next]}
                    onPick={(stepId, c) => handleDiag(stepId, c, next)}/>,
          }));
        }, 600);
      }, 300);
    } else {
      const finalAnswers = { ...diagAnswers, [stepId]: choice };
      if (stepId === 'type' && choice.id === 'error') {
        setTimeout(() => {
          pushMessage({ role: 'bot', typing: true });
          setTimeout(() => {
            replaceLast(() => ({
              id: newId(), role: 'bot', wide: true, time: now(),
              content: <p>Un message d'erreur s'affiche — une capture m'aiderait à l'identifier.</p>,
              card: <ErrorScreenshotStep onSubmit={(shot) => showDiagResult({ ...finalAnswers, screenshot: shot })}/>,
            }));
          }, 700);
        }, 400);
      } else {
        setTimeout(() => showDiagResult(finalAnswers), 400);
      }
    }
  };

  /* Ticket snippet flow */
  const startTicketFromDiag = (answers) => {
    sendUser("Prépare un ticket pour ServiceNow.");
    setTicketOrigin('diagnostic');
    botRespond(
      <p>Avant de préparer le ticket, une précision importante pour définir la priorité :</p>,
      {},
      500
    );
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <TicketGuidedChoice step={BLOCKING_STEP}
                onPick={(_sid, c) => generateDiagTicket(answers, c)}/>,
      });
    }, 1100);
  };

  const generateDiagTicket = (answers, blocking) => {
    sendUser(blocking.label);
    const type = answers.type;
    const prio = computePriority(type, blocking.id);
    const isConnect = type?.id === 'connect';
    const isSlow = type?.id === 'slow';
    const vmTypeLabel = answers.vmtype?.id === 'clone' ? 'VM Clone'
      : answers.vmtype?.id === 'standard' ? 'VM Standard' : 'Type de VM non précisé';
    const diag = {
      label: `${type?.label || 'Problème'} · ${answers.since?.label || ''}`,
      priority: `${prio.level} — ${prio.label}`,
      priorityRationale: prio.rationale,
      category: type?.category || 'Autre',
      originLabel: 'Diagnostic VM',
      title: isConnect ? `Poste virtuel (${vmTypeLabel}) — connexion impossible`
        : isSlow ? `Poste virtuel (${vmTypeLabel}) — lenteurs importantes`
        : type?.id === 'error' ? `Poste virtuel (${vmTypeLabel}) — message d'erreur`
        : `Poste virtuel (${vmTypeLabel}) — ${type?.label || 'incident'}`,
      description: `Bonjour,

${type?.label || 'Problème'} sur mon poste virtuel (${vmTypeLabel})${answers.since?.label ? ' — ' + answers.since.label.toLowerCase() : ''}.

Contexte :
• Utilisateur : ${USER.name} (${USER.id})
• VM concernée : ${VM.name} — ${VM.size}
• Type de VM : ${vmTypeLabel}
• Plateforme : ${answers.platform?.label || '—'}
• Région : ${VM.region}
• Caractère bloquant : ${blocking.label}
• Article d'origine : Diagnostic VM${answers.screenshot ? '\n• Pièce jointe : ' + answers.screenshot : ''}
${isSlow ? "\nJ'ai vérifié la consommation du disque de la VM comme indiqué par l'assistant.\n" : ''}
Merci d'avance.`,
    };

    setTimeout(() => {
      pushMessage({ role: 'bot', typing: true });
      setTimeout(() => {
        replaceLast(() => ({
          id: newId(), role: 'bot', wide: true, time: now(),
          content: <p>Voici un brouillon à coller dans <strong>ServiceNow</strong>. Vous pouvez ajuster chaque champ avant de copier.</p>,
          card: <TicketSnippet user={USER} vm={VM} diagnostic={diag} onCancel={cancelTicket} onOpenSnow={openSnow}/>,
        }));
      }, 800);
    }, 400);
  };

  const startTicketBlank = (origin) => {
    setTicketOrigin(origin || 'incident');
    sendUser("Je veux déclarer un incident.");
    const intro = origin === 'first-connection'
      ? <p>On part de votre guide <strong>« Mes premiers pas »</strong>. Je vous pose <strong>quelques questions</strong> pour préparer un ticket bien renseigné, que vous pourrez copier dans ServiceNow.</p>
      : <p>Je vais vous poser <strong>quelques questions rapides</strong> pour préparer un brouillon de ticket bien renseigné. Vous pourrez ensuite le copier dans ServiceNow.</p>;
    botRespond(intro, {}, 600);
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <TicketGuidedChoice step={TICKET_STEPS[0]}
                                   onPick={(stepId, c) => handleTicketStep({}, stepId, c, 0)}/>,
      });
    }, 1300);
  };

  const handleTicketStep = (prev, stepId, choice, fromStep) => {
    const answers = { ...prev, [stepId]: choice };
    sendUser(choice.label);
    const next = fromStep + 1;

    if (next < TICKET_STEPS.length) {
      setTimeout(() => {
        pushMessage({ role: 'bot', typing: true });
        setTimeout(() => {
          replaceLast(() => ({
            id: newId(),
            role: 'bot',
            wide: true,
            time: now(),
            card: <TicketGuidedChoice step={TICKET_STEPS[next]}
                                       onPick={(sid, c) => handleTicketStep(answers, sid, c, next)}/>,
          }));
        }, 500);
      }, 250);
    } else {
      // Move to free-text description step
      setTimeout(() => {
        pushMessage({ role: 'bot', typing: true });
        setTimeout(() => {
          replaceLast(() => ({
            id: newId(),
            role: 'bot',
            wide: true,
            time: now(),
            card: <TicketDescribeStep
                    allowScreenshot={answers.type?.id === 'error'}
                    onSubmit={(desc, shot) => handleTicketDescribe(answers, desc, shot)}/>,
          }));
        }, 500);
      }, 250);
    }
  };

  const handleTicketDescribe = (answers, userDescription, screenshot) => {
    if (userDescription) sendUser(userDescription);
    else sendUser("(Je préfère ne pas préciser pour l'instant.)");

    const typeOpt = answers.type;
    const sinceOpt = answers.since;
    const triedOpt = answers.tried;
    let blockingId = answers.blocking?.id;
    let blockingLabel = answers.blocking?.label || '—';
    // Règle métier : un message d'erreur lors de la première connexion est considéré comme bloquant.
    const errorAtFirstConnection = ticketOrigin === 'first-connection' && typeOpt?.id === 'error';
    if (errorAtFirstConnection) { blockingId = 'full'; blockingLabel = "Oui — message d'erreur à la première connexion (bloquant)"; }
    const prio = computePriority(typeOpt, blockingId);
    const vmTypeLabel = answers.vmtype?.id === 'clone' ? 'VM Clone'
      : answers.vmtype?.id === 'standard' ? 'VM Standard' : 'Type de VM non précisé';
    const originLabel = ARTICLE_LABELS[ticketOrigin] || null;

    const triedSection = triedOpt && triedOpt.id !== 'nothing'
      ? `\nPistes déjà testées :\n• ${triedOpt.label}` : '';
    const userPart = userDescription ? `\nDescription utilisateur :\n${userDescription}\n` : '';
    const shotPart = screenshot ? `\nPièce jointe : ${screenshot}\n` : '';
    const firstConnNote = errorAtFirstConnection
      ? "\n⚠ Message d'erreur lors de la première connexion — considéré comme bloquant (P1).\n" : '';

    const diag = {
      label: `${typeOpt?.label || 'Problème non précisé'} · ${sinceOpt?.label || ''}`,
      priority: `${prio.level} — ${prio.label}`,
      priorityRationale: prio.rationale,
      category: typeOpt?.category || 'Autre',
      originLabel,
      title: `Poste virtuel (${vmTypeLabel}) — ${typeOpt ? typeOpt.label.toLowerCase() : 'incident utilisateur'}`,
      description: `Bonjour,

${typeOpt?.label || 'Problème'} sur mon poste virtuel — ${sinceOpt?.label || 'date inconnue'}.

Contexte :
• Utilisateur : ${USER.name} (${USER.id})
• VM concernée : ${VM.name} — ${VM.size}
• Type de VM : ${vmTypeLabel}
• Région : ${VM.region}
• Caractère bloquant : ${blockingLabel}${originLabel ? '\n• Article d\'origine : ' + originLabel : ''}${firstConnNote}${userPart}${shotPart}${triedSection}

Merci d'avance.`,
    };

    setTimeout(() => {
      pushMessage({ role: 'bot', typing: true });
      setTimeout(() => {
        replaceLast(() => ({
          id: newId(), role: 'bot', wide: true, time: now(),
          content: <p>Merci ! Voici votre <strong>brouillon de ticket</strong> à coller dans ServiceNow :</p>,
          card: <TicketSnippet user={USER} vm={VM} diagnostic={diag} onCancel={cancelTicket} onOpenSnow={openSnow}/>,
        }));
      }, 800);
    }, 400);
  };

  const cancelTicket = () => {
    pushMessage({ role: 'bot', content: <p>Pas de souci — je laisse de côté. Dites-moi quand vous voulez reprendre.</p> });
  };

  const openSnow = (data) => {
    // Demo: simulate open in new tab
    try {
      const subject = encodeURIComponent(data.title || '');
      window.open('about:blank#servicenow-mock-' + subject, '_blank', 'noopener,noreferrer');
    } catch (e) { /* noop */ }
    toast('ServiceNow ouvert dans un nouvel onglet', 'success');
    pushMessage({
      role: 'bot',
      wide: true,
      content: <p>J'ai ouvert ServiceNow dans un nouvel onglet. Une fois le ticket créé, revenez avec sa référence (<code>INC-…</code>) et je peux suivre son avancement ici.</p>,
      card: <TicketHandoffCard onTrackExisting={startTracking}/>,
    });
  };

  /* Tracking */
  const startTracking = () => {
    sendUser("Suivre mes incidents.");
    botRespond(<p>Voici vos tickets en cours. Vous avez un ticket actif :</p>, {}, 600);
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <TicketTrackingCard ticket={tickets[0]}/>,
      });
    }, 1300);
  };

  const showTrackingFor = (id) => {
    const t = tickets.find(x => x.id === id) || tickets[0];
    pushMessage({
      role: 'bot',
      wide: true,
      content: <p>Voici le détail du ticket <code>{t.id}</code> :</p>,
      card: <TicketTrackingCard ticket={t}/>,
    });
  };

  /* FAQ */
  const startFaq = () => {
    sendUser("J'ai une question générale.");
    botRespond(
      <p>Voici les questions les plus fréquentes. Vous pouvez aussi me poser la vôtre directement.</p>,
      {},
      600
    );
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <FaqList/>,
      });
    }, 1300);
  };

  /* Cost */
  const startCost = () => {
    sendUser("J'ai une question sur la mécanique tarifaire.");
    botRespond(
      <p>Bien sûr. Que souhaitez-vous savoir sur la tarification PPV ?</p>,
      {},
      600
    );
    setTimeout(() => {
      pushMessage({ role: 'bot', wide: true, card: <CostBreakdownCard/> });
    }, 1300);
  };


  /* First VM connection */
  const startFirstConnection = () => {
    sendUser("Comment me connecter à ma première VM ?");
    botRespond(
      <p>Bienvenue ! Je vous accompagne pas à pas. Voici le guide complet pour activer et lancer votre poste virtuel pour la <strong>première fois</strong> :</p>,
      {},
      600
    );
    setTimeout(() => {
      pushMessage({
        role: 'bot',
        wide: true,
        card: <FirstConnectionCard
                onTalkToBot={() => botRespond(
                  <p>Dites-moi à quelle étape vous bloquez et je vous aide à la résoudre.</p>,
                  { choices: [
                    { id: 'fc-1', label: "Étape 1 — Activation", kind: 'first-step', step: 1 },
                    { id: 'fc-3', label: "Étape 3 — VPN",        kind: 'first-step', step: 3 },
                    { id: 'fc-5', label: "Étape 5 — Lancer la VM", kind: 'first-step', step: 5 },
                  ] }
                )}
                onContactSupport={() => startTicketBlank('first-connection')}/>,
      });
    }, 1300);
  };

  /* Quick actions from context panel */
  const quickAction = (action) => {
    if (action === 'restart-vm') {
      sendUser("Comment redémarrer ma VM ?");
      botRespond(<p>Voici la marche à suivre pour redémarrer votre VM en toute sécurité :</p>, {}, 500);
      setTimeout(showRestartProcess, 1100);
    } else if (action === 'reset-session') {
      sendUser("Réinitialise ma session.");
      botRespond(
        <p>Je réinitialise votre session… Cela ferme vos applications mais conserve votre profil. Voulez-vous continuer ?</p>,
        { choices: [
          { id: 'confirm-reset', label: 'Oui, réinitialiser', primary: true, kind: 'do-reset' },
          { id: 'cancel-reset', label: 'Non', kind: 'cancel-reset' },
        ] },
        500
      );
    } else if (action === 'new-ticket') {
      startTicketBlank();
    }
  };

  /* Handle in-bubble action button (confirm/cancel of pending action) */
  const handleAction = (choice) => {
    // Mark spent
    setMessages(prev => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].choices) { copy[i] = { ...copy[i], spent: true }; break; }
      }
      return copy;
    });
    if (choice.kind === 'do-restart') {
      sendUser('Confirmer le redémarrage');
      botRespond(<p><strong>Redémarrage lancé.</strong> La VM sera disponible dans environ 2 minutes.</p>);
      toast('Redémarrage de la VM lancé', 'success');
    } else if (choice.kind === 'cancel-restart') {
      sendUser('Annuler');
      botRespond(<p>D'accord, j'ai annulé. Aucune action effectuée sur votre VM.</p>);
    } else if (choice.kind === 'do-reset') {
      sendUser('Oui, réinitialiser');
      botRespond(<p><strong>Session réinitialisée.</strong> Reconnectez-vous au portail PPV pour reprendre votre travail.</p>);
      toast('Session réinitialisée', 'success');
    } else if (choice.kind === 'cancel-reset') {
      sendUser('Non');
      botRespond(<p>Très bien — votre session est intacte.</p>);
    } else if (choice.kind === 'jump-diagnostic') {
      startDiagnostic();
    } else if (choice.kind === 'jump-ticket') {
      startTicketBlank();
    } else if (choice.kind === 'jump-faq') {
      startFaq();
    } else if (choice.kind === 'show-restart') {
      showRestartProcess();
    } else if (choice.kind === 'first-step') {
      sendUser(choice.label);
      botRespond(
        <p>Pour <strong>{choice.label}</strong> : reprenez la procédure dépliée ci-dessus, puis dites-moi précisément où ça coince (message d'erreur, écran bloqué, etc.).</p>,
        {},
        500
      );
    }
  };

  /* Composer submit */
  const onSend = () => {
    const text = composerText.trim();
    if (!text) return;
    setComposerText('');
    sendUser(text);
    // crude intent detection for demo
    const lower = text.toLowerCase();
    setTimeout(() => {
      if (/(lent|conne|diag|probl|panne|marche pas)/.test(lower)) {
        botRespond(
          <p>Je vais vous aider. Voulez-vous lancer un <strong>diagnostic guidé</strong> ou préparer directement un <strong>ticket pour ServiceNow</strong> ?</p>,
          { choices: [
            { id: 'go-diag', label: 'Lancer le diagnostic', primary: true, kind: 'jump-diagnostic' },
            { id: 'go-tick', label: 'Préparer un ticket',  kind: 'jump-ticket' },
          ] }
        );
      } else if (/(co[uû]t|prix|tarif|combien|factur)/.test(lower)) {
        botRespond(<p>Voici les informations tarifaires. Choisissez ce qui vous intéresse :</p>);
        setTimeout(() => {
          pushMessage({ role: 'bot', wide: true, card: <CostBreakdownCard/> });
        }, 1200);
      } else if (/(suivi|ticket|statut|avancement|incident)/.test(lower)) {
        startTracking();
      } else if (/(diff[ée]rence|clone|standard|acc[èe]s|comprends|comment)/.test(lower)) {
        botRespond(<p>Voici une réponse rapide. Si la question n'est pas couverte, parcourez les FAQ ou demandez-moi autrement.</p>);
        setTimeout(() => {
          pushMessage({ role: 'bot', wide: true, card: <FaqList/> });
        }, 1100);
      } else {
        botRespond(
          <p>Je peux vous aider à <strong>diagnostiquer votre VM</strong>, préparer un <strong>brouillon de ticket pour ServiceNow</strong>, ou répondre à vos questions sur le PPV. Que souhaitez-vous faire ?</p>,
          { choices: [
            { id: 'diag', label: 'Diagnostic', primary: true, kind: 'jump-diagnostic' },
            { id: 'tick', label: 'Préparer un ticket', kind: 'jump-ticket' },
            { id: 'faq',  label: 'Voir la FAQ',  kind: 'jump-faq' },
          ] }
        );
      }
    }, 300);
  };

  const onSuggest = (id) => {
    if (id === 'diagnose') return startDiagnostic();
    if (id === 'incident') return startTicketBlank();
    if (id === 'track') return startTracking();
    if (id === 'cost') return startCost();
    if (id === 'first-connection') return startFirstConnection();
  };

  /* Toast helper */
  const toast = (text, tone = 'success') => {
    const id = newId();
    setToasts(prev => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  /* Reset chat */
  const resetChat = () => {
    setMessages([]);
    setDiagAnswers({});
    setDiagStep(0);
    setTicketOrigin(null);
    diagCountRef.current = 0;
  };

  const activeTicket = tickets.find(t => t.id === activeTicketId) || tickets[0];

  /* =========================================================
     VIEWS
     ========================================================= */
  const renderMainView = () => {
    if (view === 'chat') {
      return (
        <>
          <div className="chat__scroll" ref={scrollRef} data-screen-label="Chat">
            <div className="chat__inner">
              {tweaks.showHero && messages.length === 0 && (
                <Hero user={USER} onSuggest={onSuggest}/>
              )}
              {messages.map(m => (
                <Message key={m.id} msg={m} onAction={handleAction}/>
              ))}
            </div>
          </div>
          <div className="composer">
            <div className="composer__inner">
              <div className="composer__box">
                <textarea className="composer__input" rows={1}
                          placeholder="Comment puis-je vous aider ?"
                          value={composerText}
                          onChange={e => setComposerText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
                          }}/>
                <div className="composer__bottom">
                  <div className="composer__tools">
                    <button className="composer__tool" title="Joindre un fichier"><I.Paperclip size={15}/></button>
                    <button className="composer__tool" title="Dicter"><I.Mic size={15}/></button>
                  </div>
                  <button className="composer__send" onClick={onSend} disabled={!composerText.trim()}>
                    Envoyer <I.Send size={13}/>
                  </button>
                </div>
              </div>
              <div className="composer__hint">
                Une première phase d'analyse est faite par l'assistant mais toute action critique doit être validée dans un ticket.
              </div>
            </div>
          </div>
        </>
      );
    }
    if (view === 'tickets') {
      return <TicketsView tickets={tickets} activeId={activeTicketId} onSelect={setActiveTicketId}/>;
    }
    if (view === 'faq') {
      return <FaqView/>;
    }
    if (view === 'cost') {
      return <CostView/>;
    }
  };

  const breadcrumb = view === 'chat' ? 'Nouvelle conversation'
    : view === 'tickets' ? 'Mes tickets'
    : view === 'faq' ? 'Questions fréquentes'
    : 'Suivi des coûts';

  return (
    <div className="app" data-screen-label="App">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo">PPV</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__title">Assistant PPV</div>
            <div className="sidebar__subtitle">Postes virtuels</div>
          </div>
        </div>

        <button className="sidebar__new" onClick={() => { resetChat(); setView('chat'); }}>
          <I.Plus size={14}/> Nouvelle conversation
        </button>

        <div className="sidebar__section">
          <div className="sidebar__section-label">Navigation</div>
          <button className={`sidebar__item ${view === 'chat' ? 'is-active' : ''}`} onClick={() => { resetChat(); setView('chat'); }}>
            <I.Home size={16}/><span className="sidebar__item-label">Accueil</span>
          </button>
          <button className={`sidebar__item ${view === 'tickets' ? 'is-active' : ''}`} onClick={() => setView('tickets')}>
            <I.Ticket size={16}/><span className="sidebar__item-label">Mes tickets</span>
            <span className="sidebar__item-badge">{tickets.length}</span>
          </button>
          <button className={`sidebar__item ${view === 'faq' ? 'is-active' : ''}`} onClick={() => setView('faq')}>
            <I.Book size={16}/><span className="sidebar__item-label">Questions fréquentes</span>
          </button>
          <button className={`sidebar__item ${view === 'cost' ? 'is-active' : ''}`} onClick={() => setView('cost')}>
            <I.Coin size={16}/><span className="sidebar__item-label">Coûts</span>
          </button>
        </div>

        <div className="sidebar__section" style={{ paddingBottom: 4 }}>
          <div className="sidebar__section-label">Historique</div>
        </div>
        <div className="sidebar__history">
          <div style={{ padding: '0 14px' }}>
            {HISTORY.map(h => (
              <button key={h.id} className="sidebar__history-item">
                <div>{h.title}</div>
                <div className="meta">{h.time}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="sidebar__user">
          <Avatar initials={USER.initials}/>
          <div className="sidebar__user-info">
            <div className="sidebar__user-name">{USER.name}</div>
            <div className="sidebar__user-role">{USER.role}</div>
          </div>
          <button className="composer__tool" aria-label="Paramètres"><I.Cog size={14}/></button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Assistant PPV</span>
            <span className="breadcrumb__sep">›</span>
            <span className="breadcrumb__current">{breadcrumb}</span>
          </div>
          <div className="topbar__spacer"/>
          <StatusPill tone="online">Service opérationnel</StatusPill>
          <button className="topbar__action" aria-label="Notifications">
            <I.Bell size={15}/>
          </button>
        </header>

        <div className="workspace workspace--single">
          <section className="chat">{renderMainView()}</section>
        </div>
      </main>

      {/* Toasts */}
      <div className="toast-region">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            <I.Check size={14}/> {t.text}
          </div>
        ))}
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Apparence">
          <TweakColor label="Couleur principale" value={tweaks.accent}
                      options={['#CC0033', '#B5005C', '#E2231A', '#1F4B99', '#0F172A']}
                      onChange={v => setTweak('accent', v)}/>
          <TweakRadio label="Densité" value={tweaks.density}
                      options={['compact', 'comfortable']}
                      onChange={v => setTweak('density', v)}/>
        </TweakSection>
        <TweakSection title="Layout">
          <TweakToggle label="Écran d'accueil" checked={tweaks.showHero}
                       onChange={v => setTweak('showHero', v)}/>
        </TweakSection>
        <TweakSection title="Réinitialiser">
          <button className="btn btn--secondary" style={{ width: '100%' }} onClick={resetChat}>
            <I.Refresh size={14}/> Réinitialiser la conversation
          </button>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ============================================================
   Other views
   ============================================================ */
function TicketsView({ tickets, activeId, onSelect }) {
  const active = tickets.find(t => t.id === activeId) || tickets[0];
  return (
    <div className="chat__scroll" data-screen-label="Tickets">
      <div className="chat__inner" style={{ maxWidth: 880 }}>
        <div className="hero" style={{ padding: '8px 0 4px' }}>
          <div className="hero__eyebrow">Suivi</div>
          <h1 className="hero__title" style={{ fontSize: 24 }}>Mes tickets</h1>
          <p className="hero__subtitle">Suivez l'état de vos demandes au support PPV.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginTop: 18 }}>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {tickets.map(t => (
              <button key={t.id}
                      onClick={() => onSelect(t.id)}
                      className="bot-card"
                      style={{ textAlign:'left', cursor:'pointer', padding: 12,
                               borderColor: t.id === active.id ? 'var(--brand-accent)' : 'var(--border-soft)',
                               boxShadow: t.id === active.id ? 'var(--shadow-sm)' : 'var(--shadow-xs)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <code style={{ fontSize: 11.5 }}>{t.id}</code>
                  <StatusPill tone={t.statusTone}>{t.status}</StatusPill>
                </div>
                <div style={{ fontSize: 13, marginTop: 6, fontWeight: 500, lineHeight: 1.4 }}>{t.summary}</div>
              </button>
            ))}
          </div>
          <TicketTrackingCard ticket={active}/>
        </div>
      </div>
    </div>
  );
}

function FaqView() {
  const [q, setQ] = useState('');
  const filtered = FAQ_DATA.filter(f => !q || f.q.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="chat__scroll" data-screen-label="FAQ">
      <div className="chat__inner" style={{ maxWidth: 760 }}>
        <div className="hero" style={{ padding: '8px 0 4px' }}>
          <div className="hero__eyebrow">Questions fréquentes</div>
          <h1 className="hero__title" style={{ fontSize: 24 }}>Trouvez vos réponses</h1>
          <p className="hero__subtitle">Questions fréquentes sur le poste virtuel PPV.</p>
        </div>
        <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', gap: 8 }}>
          <div style={{ position:'relative', flex: 1 }}>
            <I.Search size={15} style={{ position:'absolute', left: 12, top: 11, color:'var(--text-muted)' }}/>
            <input className="input" placeholder="Rechercher…"
                   value={q} onChange={e => setQ(e.target.value)}
                   style={{ paddingLeft: 36 }}/>
          </div>
        </div>
        <FaqListExpanded items={filtered}/>
      </div>
    </div>
  );
}

function FaqListExpanded({ items }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="faq-list">
      {items.map((f, i) => (
        <div key={i} className={`faq-item ${open === i ? 'is-open' : ''}`}>
          <button className="faq-item__q" onClick={() => setOpen(open === i ? -1 : i)}>
            <span>{f.q}</span>
            <span className="faq-item__icon"><I.Chevron size={16}/></span>
          </button>
          {open === i && <div className="faq-item__a">{f.a}</div>}
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', color:'var(--text-muted)' }}>
          Aucune question ne correspond à votre recherche.
        </div>
      )}
    </div>
  );
}

function CostView() {
  return (
    <div className="chat__scroll" data-screen-label="Costs">
      <div className="chat__inner" style={{ maxWidth: 760 }}>
        <div className="hero" style={{ padding: '8px 0 4px' }}>
          <div className="hero__eyebrow">Mécanique tarifaire</div>
          <h1 className="hero__title" style={{ fontSize: 24 }}>La tarification PPV</h1>
          <p className="hero__subtitle">Coûts de l'offre, extras et facturation par périmètre.</p>
        </div>
        <div style={{ marginTop: 16 }}>
          <CostBreakdownCard/>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Color helper
   ============================================================ */
function shade(hex, pct) {
  const f = parseInt(hex.slice(1), 16);
  const t = pct < 0 ? 0 : 255;
  const p = Math.abs(pct) / 100;
  const R = f >> 16, G = (f >> 8) & 0x00FF, B = f & 0x0000FF;
  const r = Math.round((t - R) * p) + R;
  const g = Math.round((t - G) * p) + G;
  const b = Math.round((t - B) * p) + B;
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/* ============================================================
   Mount
   ============================================================ */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
