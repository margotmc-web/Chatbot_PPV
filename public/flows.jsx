/* global React, I, Avatar, StatusPill, Typing, Gauge, FieldRow, Steps, Banner */
// Conversation flows: diagnostic, ticket, tracking, FAQ, cost

const { useState: useStateF, useEffect: useEffectF, useMemo: useMemoF } = React;

/* =========================================================
   FLOW: Diagnostic VM — guided multi-step
   ========================================================= */
const DIAG_STEPS = [
  {
    id: 'vmtype',
    question: "S'agit-il d'une VM Standard ou d'une VM Clone ?",
    hint: "VM Standard = persistante · VM Clone = réinitialisée à chaque déconnexion.",
    options: [
      { id: 'standard', label: 'VM Standard (persistante)' },
      { id: 'clone',    label: 'VM Clone (volatile)' },
      { id: 'unsure',   label: 'Je ne sais pas' },
    ],
  },
  {
    id: 'platform',
    question: "Sur quel environnement rencontrez-vous le problème ?",
    options: [
      { id: 'avd',    label: 'AVD (Azure Virtual Desktop)' },
      { id: 'citrix', label: 'Citrix' },
      { id: 'unsure', label: 'Je ne suis pas sûr·e' },
    ],
  },
  {
    id: 'since',
    question: "Depuis quand le problème existe-t-il ?",
    options: [
      { id: 'now',     label: "À l'instant" },
      { id: 'today',   label: "Aujourd'hui" },
      { id: 'days',    label: 'Depuis quelques jours' },
      { id: 'weeks',   label: 'Plus d\u2019une semaine' },
    ],
  },
  {
    id: 'type',
    question: "Quel type de problème rencontrez-vous ?",
    options: [
      { id: 'connect', label: 'Connexion impossible',          category: 'Connexion',   base: 'P1' },
      { id: 'slow',    label: 'Lenteurs / latence',            category: 'Performance', base: 'P2' },
      { id: 'error',   label: 'Message d\u2019erreur',          category: 'Application', base: 'P3' },
      { id: 'app',     label: 'Une application ne répond pas',  category: 'Application', base: 'P2' },
    ],
  },
];

function DiagnosticChoice({ step, onPick, disabled }) {
  return (
    <div className="msg__bubble msg__bubble--bot">
      <p style={{ fontWeight: 600 }}>{step.question}</p>
      {step.hint ? <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '-2px 0 4px' }}>{step.hint}</p> : null}
      <div className="choices">
        {step.options.map((o, idx) => (
          <button key={o.id}
                  className={`choice ${idx === 0 ? 'choice--primary' : ''}`}
                  onClick={() => onPick(step.id, o)}
                  disabled={disabled}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* Diagnostic result card */
function DiagnosticResult({ answers, onCreateTicket, onRestart, onRestartVm }) {
  const isSlow = answers.type?.id === 'slow';
  const isConnect = answers.type?.id === 'connect';
  const tone = isConnect ? 'bad' : isSlow ? 'warn' : 'good';

  const title = isConnect
    ? 'Connexion impossible détectée'
    : isSlow
    ? 'Lenteurs détectées sur la VM'
    : 'Problème intermittent identifié';

  const severity = isConnect ? 'Critique' : isSlow ? 'Dégradé' : 'Modéré';
  const vmType = answers.vmtype?.id === 'clone' ? 'VM Clone'
    : answers.vmtype?.id === 'standard' ? 'VM Standard' : null;

  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className={`bot-card__icon ${isConnect ? 'bot-card__icon--danger' : isSlow ? 'bot-card__icon--warning' : 'bot-card__icon--success'}`}>
          <I.Stethoscope size={16}/>
        </div>
        <div>
          <div className="bot-card__title">Diagnostic terminé</div>
          <div className="bot-card__subtitle">{vmType ? vmType + ' · ' : ''}Réponses analysées</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill tone={isConnect ? 'danger' : isSlow ? 'warning' : 'success'}>
            {severity}
          </StatusPill>
        </div>
      </div>

      <div className="bot-card__body">
        <Banner tone={isConnect ? 'danger' : isSlow ? 'warning' : 'success'} title={title}>
          {isConnect
            ? "La session a échoué à plusieurs reprises ces dernières 24 h. La passerelle réseau semble en cause."
            : isSlow
            ? "L'usage CPU dépasse 85 % depuis 2 h et le disque de la VM est presque saturé. Vérifions ensemble la consommation du disque ci-dessous."
            : "Aucune anomalie majeure. Le redémarrage de session suffit généralement."}
        </Banner>

        <div style={{ marginTop: 14 }}>
          <div className="context__section-title">Pistes recommandées</div>
          <ul className="bullets" style={{ display:'flex', flexDirection:'column', gap:8, listStyle:'none', padding:0, fontSize:13 }}>
            {isConnect && <>
              <li><strong>Vérifier la connexion VPN</strong> — l'accès passerelle nécessite un VPN actif.</li>
              <li><strong>Redémarrer la VM</strong> — souvent suffisant après un incident réseau.</li>
              <li><strong>Créer un ticket</strong> en niveau 2 si le redémarrage échoue.</li>
            </>}
            {isSlow && <>
              <li><strong>Nettoyer le profil utilisateur</strong> — libérer 2,8 Go d'espace temporaire.</li>
              <li><strong>Fermer les applications inactives</strong> — 14 processus consomment plus de 200 Mo.</li>
              <li><strong>Réinitialiser la session</strong> avant de redémarrer la machine.</li>
            </>}
            {!isConnect && !isSlow && <>
              <li><strong>Réinitialiser la session</strong> — restaure l'environnement utilisateur.</li>
              <li><strong>Vider le cache local</strong> de l'application concernée.</li>
              <li><strong>Documenter le message d'erreur exact</strong> avant l'ouverture d'un ticket.</li>
            </>}
          </ul>
        </div>
        {isSlow ? <DiskCheckGuide/> : null}
      </div>

      <div className="bot-card__footer">
        <button className="btn btn--ghost btn--sm" onClick={onRestart}>
          <I.Refresh size={14}/> Refaire
        </button>
        <button className="btn btn--secondary btn--sm" onClick={onRestartVm}>
          <I.Power size={14}/> Redémarrer la VM
        </button>
        <button className="btn btn--primary btn--sm" onClick={onCreateTicket}>
          <I.Ticket size={14}/> Préparer un ticket SNOW
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   Live guides — disk check & VM restart process
   ========================================================= */
function DiskCheckGuide() {
  const steps = [
    <>Dans votre VM, ouvrez l'<strong>Explorateur de fichiers</strong> (icône dossier dans la barre des tâches).</>,
    <>Dans le volet de gauche, cliquez sur <strong>« Ce PC »</strong>.</>,
    <>Repérez le <strong>disque C:</strong> — la barre devient rouge si l'espace libre passe sous 10 %.</>,
    <>Clic droit sur le disque C: → <strong>Propriétés</strong> pour voir l'espace utilisé / disponible.</>,
    <>Si le disque est saturé : videz la <strong>Corbeille</strong> puis lancez le <strong>Nettoyage de disque</strong> (fichiers temporaires).</>,
  ];
  return (
    <div className="live-guide">
      <div className="live-guide__head"><I.Search size={13}/> Vérifier la consommation du disque — en direct</div>
      <ol className="live-guide__steps">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
      <div className="live-guide__hint">Un disque saturé est la première cause de lenteur. Si le disque C: est plein, précisez-le dans votre ticket.</div>
    </div>
  );
}

function RestartVmProcess({ onConfirm }) {
  const steps = [
    <><strong>Enregistrez votre travail</strong> et fermez vos applications — tout document non sauvegardé sera perdu.</>,
    <>Dans le <strong>portail PPV</strong>, ouvrez <strong>« Mon poste virtuel »</strong>.</>,
    <>Sur la vignette de votre VM, cliquez sur les <strong>⋯</strong> puis <strong>« Redémarrer »</strong>.</>,
    <>Confirmez et <strong>patientez environ 2 minutes</strong> le temps du redémarrage.</>,
    <>Reconnectez-vous depuis le portail — votre session repart à neuf.</>,
  ];
  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon bot-card__icon--warning"><I.Power size={16}/></div>
        <div>
          <div className="bot-card__title">Redémarrer ma VM — marche à suivre</div>
          <div className="bot-card__subtitle">5 étapes · ~2 minutes</div>
        </div>
      </div>
      <div className="bot-card__body">
        <Banner tone="warning" title="À sauvegarder avant">
          Pensez à enregistrer votre travail. Toute donnée non sauvegardée pendant le redémarrage sera perdue.
        </Banner>
        <ol className="live-guide__steps" style={{ marginTop: 12 }}>
          {steps.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
      {onConfirm && (
        <div className="bot-card__footer">
          <button className="btn btn--primary btn--sm" onClick={onConfirm}><I.Power size={13}/> C'est fait — et après ?</button>
        </div>
      )}
    </div>
  );
}

function ErrorScreenshotStep({ onSubmit, disabled }) {
  const [shot, setShot] = useStateF(null);
  return (
    <div className="msg__bubble msg__bubble--bot">
      <p style={{ fontWeight: 600 }}>Pouvez-vous joindre une copie d'écran du message d'erreur ?</p>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>Une capture aide l'équipe à identifier l'erreur plus vite. C'est facultatif.</p>
      <div className="attach-row">
        <button className="attach-chip" onClick={() => setShot('capture-erreur.png')} disabled={disabled}>
          <I.Paperclip size={13}/> {shot ? shot : "Joindre une copie d'écran"}
        </button>
        {shot && <button className="attach-remove" onClick={() => setShot(null)} aria-label="Retirer"><I.X size={12}/></button>}
      </div>
      <div className="choices" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="choice" onClick={() => onSubmit(null)} disabled={disabled}>Passer</button>
        <button className="choice choice--primary" onClick={() => onSubmit(shot)} disabled={disabled}>Continuer</button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Diagnostic sheet — printable record
   ========================================================= */
function DiagnosticSheet({ user, vm, answers, diagnostic, onCopy, onPrint, onClose }) {
  const sheetId = useMemoF(() =>
    'DIAG-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' +
    Math.floor(1000 + Math.random() * 9000), []);
  const date = new Date().toLocaleString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const [copied, setCopied] = useStateF(false);

  const isConnect = answers.type?.id === 'connect';
  const isSlow = answers.type?.id === 'slow';
  const score = isConnect ? 28 : isSlow ? 62 : 84;
  const severity = isConnect ? 'Critique' : isSlow ? 'Dégradé' : 'Modéré';
  const sevTone = isConnect ? 'danger' : isSlow ? 'warning' : 'success';
  const priority = isConnect ? 'P1' : isSlow ? 'P2' : 'P3';

  const fullText = `FICHE DIAGNOSTIC PPV — ${sheetId}
Émise le ${date}

UTILISATEUR
  Nom         : ${user.name}
  Identifiant : ${user.id}
  Rôle        : ${user.role}

POSTE VIRTUEL
  VM          : ${vm.name}
  Type        : ${vm.size}
  Région      : ${vm.region}
  État        : ${vm.status}

DIAGNOSTIC
  Plateforme  : ${answers.platform?.label || '—'}
  Apparition  : ${answers.since?.label || '—'}
  Type        : ${answers.type?.label || '—'}
  Score santé : ${score}/100 (${severity})
  Priorité    : ${priority}

RECOMMANDATIONS
${isConnect ? `  • Vérifier la connexion VPN — l'accès passerelle nécessite un VPN actif.
  • Redémarrer la VM — souvent suffisant après un incident réseau.
  • Créer un ticket N2 si le redémarrage échoue.`
: isSlow ? `  • Nettoyer le profil utilisateur — libérer 2,8 Go d'espace temporaire.
  • Fermer les applications inactives — 14 processus > 200 Mo.
  • Réinitialiser la session avant de redémarrer la machine.`
: `  • Réinitialiser la session — restaure l'environnement utilisateur.
  • Vider le cache local de l'application concernée.
  • Documenter le message d'erreur exact avant l'ouverture d'un ticket.`}

Document généré par l'Assistant PPV — à joindre à votre ticket ServiceNow si besoin.`;

  const handleCopy = () => {
    try { navigator.clipboard.writeText(fullText); } catch (e) {}
    setCopied(true);
    onCopy && onCopy(sheetId);
    setTimeout(() => setCopied(false), 2200);
  };

  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Folder size={16}/></div>
        <div>
          <div className="bot-card__title">Fiche diagnostic</div>
          <div className="bot-card__subtitle">Document récapitulatif à conserver ou partager</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill tone="info">Brouillon</StatusPill>
        </div>
      </div>

      <div className="bot-card__body" style={{ padding: 0 }}>
        <div className="sheet" id={'sheet-' + sheetId}>
          <header className="sheet__header">
            <div>
              <div className="sheet__eyebrow">Assistant PPV — fiche diagnostic</div>
              <div className="sheet__ref"><code>{sheetId}</code></div>
              <div className="sheet__date">Émise le {date}</div>
            </div>
            <div className="sheet__score">
              <div className={`sheet__score-num sheet__score-num--${sevTone}`}>{score}</div>
              <div className="sheet__score-label">/ 100 · {severity}</div>
            </div>
          </header>

          <section className="sheet__section">
            <h4 className="sheet__title">Utilisateur</h4>
            <dl className="sheet__list">
              <dt>Nom</dt><dd>{user.name}</dd>
              <dt>Identifiant</dt><dd><code>{user.id}</code></dd>
              <dt>Rôle</dt><dd>{user.role}</dd>
            </dl>
          </section>

          <section className="sheet__section">
            <h4 className="sheet__title">Poste virtuel</h4>
            <dl className="sheet__list">
              <dt>VM</dt><dd><code>{vm.name}</code></dd>
              <dt>Type</dt><dd>{vm.size}</dd>
              <dt>Région</dt><dd>{vm.region}</dd>
              <dt>État</dt><dd>
                <StatusPill tone={vm.status === 'Hors ligne' ? 'danger' : vm.status === 'Dégradée' ? 'warning' : 'online'}>
                  {vm.status}
                </StatusPill>
              </dd>
            </dl>
          </section>

          <section className="sheet__section">
            <h4 className="sheet__title">Diagnostic — réponses guidées</h4>
            <dl className="sheet__list">
              <dt>Plateforme</dt><dd>{answers.platform?.label || '—'}</dd>
              <dt>Apparition</dt><dd>{answers.since?.label || '—'}</dd>
              <dt>Type de problème</dt><dd>{answers.type?.label || '—'}</dd>
              <dt>Priorité estimée</dt><dd>
                <span className={`priority-tag priority-tag--${priority.toLowerCase()}`} style={{ width: 'auto', height: 'auto', padding: '2px 8px', fontSize: 11 }}>{priority}</span>
              </dd>
            </dl>
          </section>

          <section className="sheet__section">
            <h4 className="sheet__title">Recommandations</h4>
            <ul className="sheet__recs">
              {isConnect && <>
                <li><strong>Vérifier la connexion VPN</strong> — l'accès passerelle nécessite un VPN actif.</li>
                <li><strong>Redémarrer la VM</strong> — souvent suffisant après un incident réseau.</li>
                <li><strong>Créer un ticket N2</strong> si le redémarrage échoue.</li>
              </>}
              {isSlow && <>
                <li><strong>Nettoyer le profil utilisateur</strong> — libérer 2,8 Go d'espace temporaire.</li>
                <li><strong>Fermer les applications inactives</strong> — 14 processus &gt; 200 Mo.</li>
                <li><strong>Réinitialiser la session</strong> avant de redémarrer la machine.</li>
              </>}
              {!isConnect && !isSlow && <>
                <li><strong>Réinitialiser la session</strong> — restaure l'environnement utilisateur.</li>
                <li><strong>Vider le cache local</strong> de l'application concernée.</li>
                <li><strong>Documenter le message d'erreur exact</strong> avant l'ouverture d'un ticket.</li>
              </>}
            </ul>
          </section>

          <footer className="sheet__footer">
            Document généré par l'Assistant PPV — à joindre à votre ticket ServiceNow si besoin.
          </footer>
        </div>
      </div>

      <div className="bot-card__footer bot-card__footer--snippet">
        <button className="btn btn--ghost btn--sm" onClick={onClose}>Fermer</button>
        <button className={`btn btn--secondary btn--sm ${copied ? 'is-success' : ''}`} onClick={handleCopy}>
          {copied ? <><I.Check size={13}/> Copié</> : <><I.Copy size={13}/> Copier la fiche</>}
        </button>
        <button className="btn btn--primary btn--sm" onClick={() => onPrint && onPrint(sheetId)}>
          <I.External size={13}/> Imprimer / PDF
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Guided ticket Q&A — before generating the SNOW snippet
   ========================================================= */
const VMTYPE_STEP = {
  id: 'vmtype',
  question: "S'agit-il d'une VM Standard ou d'une VM Clone ?",
  hint: "VM Standard = persistante · VM Clone = réinitialisée à chaque déconnexion.",
  options: [
    { id: 'standard', label: 'VM Standard (persistante)' },
    { id: 'clone',    label: 'VM Clone (volatile)' },
    { id: 'unsure',   label: 'Je ne sais pas' },
  ],
};

const BLOCKING_STEP = {
  id: 'blocking',
  question: "Ce problème bloque-t-il votre activité ?",
  hint: "Cela détermine la priorité du ticket pour l'équipe technique.",
  options: [
    { id: 'full',    label: 'Oui, totalement — je ne peux plus travailler' },
    { id: 'partial', label: 'Partiellement — je peux contourner' },
    { id: 'no',      label: "Non — c'est gênant mais pas bloquant" },
  ],
};

const TICKET_TYPE_STEP = {
  id: 'type',
  question: "Quel type de problème rencontrez-vous ?",
  options: [
    { id: 'connect',    label: 'Connexion impossible au poste virtuel',            category: 'Connexion',     base: 'P1' },
    { id: 'auth',       label: 'Authentification impossible (MFA, mot de passe, SSO)', category: 'Accès',     base: 'P1' },
    { id: 'vpn',        label: 'VPN / accès distant indisponible',                  category: 'Accès',        base: 'P1' },
    { id: 'files',      label: 'Fichiers ou lecteur réseau inaccessibles',          category: 'Données',      base: 'P2' },
    { id: 'slow',       label: 'Poste virtuel lent ou latence',                    category: 'Performance',  base: 'P2' },
    { id: 'display',    label: "Problème d'affichage (écran noir, résolution)",      category: 'Affichage',    base: 'P2' },
    { id: 'app',        label: 'Une application métier ne répond plus',             category: 'Application',  base: 'P2' },
    { id: 'error',      label: "Message d'erreur affiché",                          category: 'Application',  base: 'P3' },
    { id: 'peripheral', label: 'Souris, clavier, audio, micro ou webcam',           category: 'Périphériques', base: 'P3' },
    { id: 'print',      label: "Impossibilité d'imprimer",                          category: 'Impression',   base: 'P3' },
    { id: 'install',    label: "Demande d'installation ou d'ajout de droits",       category: 'Demande',      base: 'P4' },
    { id: 'usage',      label: "Question d'utilisation ou de formation",            category: 'Information',  base: 'P4' },
  ],
};

const TICKET_STEPS = [
  VMTYPE_STEP,
  TICKET_TYPE_STEP,
  BLOCKING_STEP,
  {
    id: 'since',
    question: "Depuis quand le problème existe-t-il ?",
    options: [
      { id: 'now',     label: "À l'instant" },
      { id: 'today',   label: "Aujourd'hui" },
      { id: 'days',    label: 'Depuis quelques jours' },
      { id: 'weeks',   label: "Depuis plus d'une semaine" },
    ],
  },
  {
    id: 'tried',
    question: "Avez-vous déjà tenté quelque chose ?",
    options: [
      { id: 'nothing',  label: "Rien encore" },
      { id: 'restart',  label: "Redémarrer la VM" },
      { id: 'reset',    label: "Réinitialiser la session" },
      { id: 'vpn',      label: "Vérifier le VPN" },
      { id: 'multiple', label: "Plusieurs essais sans succès" },
    ],
  },
];

const PRIORITY_LABELS = { P1: 'Critique', P2: 'Élevée', P3: 'Modérée', P4: 'Demande' };

/* Priority computed from the incident matrix: the blocking answer drives the level. */
function computePriority(type, blockingId) {
  if (!type) return { level: 'P3', label: 'Modérée', rationale: "Priorité par défaut — à réévaluer selon la description." };
  if (type.id === 'install' || type.id === 'usage') {
    return {
      level: 'P4',
      label: type.id === 'install' ? 'Demande' : 'Information',
      rationale: `« ${type.label} » : il ne s'agit pas d'un incident bloquant mais d'une demande de service → P4.`,
    };
  }
  let level;
  if (blockingId === 'full')       level = 'P1';
  else if (blockingId === 'partial') level = 'P2';
  else                              level = type.base === 'P4' ? 'P4' : 'P3';
  const rationale = blockingId === 'full'
    ? `« ${type.label} » signalé comme totalement bloquant pour l'activité → P1 Critique (cf. matrice de priorité).`
    : blockingId === 'partial'
    ? `« ${type.label} » : activité dégradée mais contournement partiel possible → P2 Élevée.`
    : `« ${type.label} » : sans blocage de l'activité, un contournement est possible → ${level} ${PRIORITY_LABELS[level]}.`;
  return { level, label: PRIORITY_LABELS[level], rationale };
}

function SecondDiagnosticStep({ onSubmit, disabled }) {
  const [why, setWhy] = useStateF('');
  const [message, setMessage] = useStateF('');
  const [same, setSame] = useStateF('same');
  return (
    <div className="msg__bubble msg__bubble--bot">
      <p style={{ fontWeight: 600 }}>Aidez-moi à comprendre ce qui bloque encore</p>
      <label className="mini-label">Pourquoi cela ne fonctionne toujours pas, selon vous ?</label>
      <textarea className="textarea" rows={2} value={why} onChange={e => setWhy(e.target.value)}
                placeholder="Ex : j'ai redémarré mais l'écran reste noir…" disabled={disabled}/>
      <label className="mini-label">Quel message recevez-vous ?</label>
      <textarea className="textarea" rows={2} value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Recopiez le message d'erreur exact si possible…" disabled={disabled}/>
      <label className="mini-label">Est-ce le même problème que précédemment ?</label>
      <div className="choices">
        <button className={`choice ${same === 'same' ? 'choice--primary' : ''}`} onClick={() => setSame('same')}>Même problème</button>
        <button className={`choice ${same === 'new' ? 'choice--primary' : ''}`} onClick={() => setSame('new')}>Un nouveau</button>
      </div>
      <div className="choices" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="choice choice--primary" onClick={() => onSubmit({ why: why.trim(), message: message.trim(), same })} disabled={disabled}>Envoyer</button>
      </div>
    </div>
  );
}

function TicketGuidedChoice({ step, onPick, disabled }) {
  return (
    <div className="msg__bubble msg__bubble--bot">
      <p style={{ fontWeight: 600 }}>{step.question}</p>
      {step.hint ? <p style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '-2px 0 4px' }}>{step.hint}</p> : null}
      <div className="choices">
        {step.options.map((o, idx) => (
          <button key={o.id}
                  className={`choice ${idx === 0 ? 'choice--primary' : ''}`}
                  onClick={() => onPick(step.id, o)}
                  disabled={disabled}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TicketDescribeStep({ onSubmit, disabled, allowScreenshot }) {
  const [text, setText] = useStateF('');
  const [shot, setShot] = useStateF(null);
  return (
    <div className="msg__bubble msg__bubble--bot">
      <p style={{ fontWeight: 600 }}>Pouvez-vous décrire le problème en quelques mots ?</p>
      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
        Plus vous êtes précis (message d'erreur, application concernée, étape qui bloque), plus l'équipe peut intervenir vite.
      </p>
      <textarea className="textarea"
                style={{ marginTop: 10 }}
                placeholder="Ex : Quand je clique sur Outlook, la fenêtre s'ouvre 2 s puis disparaît…"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                disabled={disabled}/>
      {allowScreenshot && (
        <div className="attach-row">
          <button className="attach-chip" onClick={() => setShot('capture-erreur.png')} disabled={disabled}>
            <I.Paperclip size={13}/> {shot ? shot : "Joindre une copie d'écran du message d'erreur"}
          </button>
          {shot && <button className="attach-remove" onClick={() => setShot(null)} aria-label="Retirer"><I.X size={12}/></button>}
        </div>
      )}
      <div className="choices" style={{ justifyContent: 'flex-end', marginTop: 10 }}>
        <button className="choice"
                onClick={() => onSubmit('', shot)}
                disabled={disabled}>
          Passer
        </button>
        <button className="choice choice--primary"
                onClick={() => onSubmit(text.trim(), shot)}
                disabled={disabled || !text.trim()}>
          Continuer
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: First VM connection — procedures
   ========================================================= */
const FIRST_CONNECTION_STEPS = [
  {
    n: 1,
    title: "Recevoir et valider votre accès",
    duration: "5 min",
    items: [
      <>Vérifiez dans votre messagerie l'invitation <strong>« Votre poste virtuel PPV est prêt »</strong>.</>,
      <>Cliquez sur le lien d'<strong>activation</strong> pour confirmer votre accès.</>,
      <>Vous recevrez un mot de passe temporaire par <strong>SMS</strong> dans les 5 minutes.</>,
    ],
    note: "Pas d'email reçu après 24 h ? Contactez votre référent DSI ou ouvrez un ticket SNOW « Demande d'accès PPV ».",
  },
  {
    n: 2,
    title: "Installer le client de connexion",
    duration: "10 min",
    items: [
      <>Selon votre profil, installez <strong>AVD</strong> (recommandé) ou <strong>Citrix Workspace</strong>.</>,
      <>Téléchargement depuis le <strong>portail logiciel</strong> interne : <code>portail-soft.intranet/ppv</code>.</>,
      <>L'installation s'effectue avec vos droits utilisateur — aucune escalade administrateur nécessaire.</>,
    ],
  },
  {
    n: 3,
    title: "Se connecter au VPN d'entreprise",
    duration: "2 min",
    items: [
      <>Lancez <strong>Cisco AnyConnect</strong> (ou équivalent fourni par votre DSI).</>,
      <>Adresse de passerelle : <code>vpn.intranet</code>.</>,
      <>Identifiants : votre compte <strong>Active Directory</strong> + code MFA via Microsoft Authenticator.</>,
    ],
    note: "Le VPN doit rester actif pendant toute votre session PPV.",
  },
  {
    n: 4,
    title: "Accéder au portail PPV",
    duration: "1 min",
    items: [
      <>Ouvrez <code>ppv.intranet/connexion</code> dans votre navigateur.</>,
      <>Authentification automatique via <strong>SSO</strong> — pas de mot de passe à ressaisir.</>,
      <>Vous arrivez sur votre tableau de bord personnel.</>,
    ],
  },
  {
    n: 5,
    title: "Lancer votre VM pour la première fois",
    duration: "3 min",
    items: [
      <>Cliquez sur <strong>« Mon poste virtuel »</strong> puis sur votre VM.</>,
      <>Patientez 1 à 2 minutes le temps du démarrage initial (les fois suivantes : 15 s).</>,
      <>Acceptez le certificat de sécurité si demandé.</>,
    ],
  },
  {
    n: 6,
    title: "Premier login Windows",
    duration: "5 min",
    items: [
      <>Saisissez vos identifiants Active Directory.</>,
      <>Configurez <strong>Windows Hello</strong> (PIN ou biométrie) pour les connexions suivantes.</>,
      <>Suivez le <strong>tour guidé</strong> pour découvrir vos applications préinstallées.</>,
    ],
    note: "Vos données et préférences seront conservées entre les sessions (VM Standard).",
  },
];

function FirstConnectionCard({ onTalkToBot, onContactSupport }) {
  const [open, setOpen] = useStateF(0);
  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Power size={16}/></div>
        <div>
          <div className="bot-card__title">Ma première connexion à ma VM</div>
          <div className="bot-card__subtitle">6 étapes · ~25 minutes au total</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill tone="info">Guide</StatusPill>
        </div>
      </div>
      <div className="bot-card__body">
        <Banner tone="info" title="Avant de commencer">
          Vérifiez que vous disposez d'un <strong>poste de travail</strong> connecté au réseau d'entreprise,
          d'un <strong>smartphone</strong> avec Microsoft Authenticator, et de vos <strong>identifiants AD</strong>.
        </Banner>

        <ol className="proc">
          {FIRST_CONNECTION_STEPS.map((s, i) => {
            const isOpen = open === i;
            return (
              <li key={s.n} className={`proc__step ${isOpen ? 'is-open' : ''}`}>
                <button className="proc__head" onClick={() => setOpen(isOpen ? -1 : i)}>
                  <span className="proc__num">{s.n}</span>
                  <span className="proc__title">{s.title}</span>
                  <span className="proc__duration">{s.duration}</span>
                  <span className="proc__chev"><I.Chevron size={14}/></span>
                </button>
                {isOpen ? (
                  <div className="proc__body">
                    <ul className="proc__items">
                      {s.items.map((it, k) => (
                        <li key={k}>{it}</li>
                      ))}
                    </ul>
                    {s.note ? (
                      <div className="proc__note">
                        <I.HelpCircle size={13}/> <span>{s.note}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
      <div className="bot-card__footer">
        <button className="btn btn--ghost btn--sm" onClick={onContactSupport}>
          <I.HelpCircle size={13}/> Je n'y arrive pas
        </button>
        <button className="btn btn--primary btn--sm" onClick={onTalkToBot}>
          <I.Bot size={13}/> Continuer avec l'assistant
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Ticket snippet — content to copy into ServiceNow
   ========================================================= */
function CopyField({ label, value, multiline, onChange, onCopy, hint }) {
  const [copied, setCopied] = useStateF(false);
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(value);
    } catch (e) { /* noop in preview */ }
    setCopied(true);
    onCopy && onCopy(label);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="copy-field">
      <div className="copy-field__head">
        <label className="copy-field__label">{label}</label>
        <button className={`copy-btn ${copied ? 'is-copied' : ''}`} onClick={handleCopy}>
          {copied
            ? <><I.Check size={12}/> Copié</>
            : <><I.Copy size={12}/> Copier</>}
        </button>
      </div>
      {multiline ? (
        <textarea className="copy-field__input copy-field__input--multi"
                  value={value}
                  onChange={e => onChange && onChange(e.target.value)}
                  rows={4}/>
      ) : (
        <input className="copy-field__input"
               value={value}
               onChange={e => onChange && onChange(e.target.value)}/>
      )}
      {hint ? <div className="copy-field__hint">{hint}</div> : null}
    </div>
  );
}

function TicketSnippet({ user, vm, diagnostic, onCancel, onOpenSnow }) {
  // Priority is determined by the chatbot, not editable by the user.
  const priority = diagnostic?.priority || 'P2 — Élevée';
  const priorityLevel = priority.split(' ')[0]; // P1, P2, P3, P4
  const priorityRationale = diagnostic?.priorityRationale
    || "Diagnostic incomplet — priorité par défaut.";
  const priorityTone = priorityLevel === 'P1' ? 'danger'
    : priorityLevel === 'P2' ? 'warning'
    : priorityLevel === 'P3' ? 'info'
    : 'neutral';

  const [category, setCategory] = useStateF(diagnostic?.category || 'Connexion');
  const [title, setTitle] = useStateF(diagnostic?.title
    || "VM AVD — connexion impossible depuis ce matin");
  const [description, setDescription] = useStateF(
    diagnostic?.description
    || `Bonjour,

Je n'arrive plus à me connecter à ma VM AVD depuis ce matin. La session échoue au bout d'environ 30 secondes, sans message d'erreur explicite.

Contexte :
• Utilisateur : ${user.name} (${user.id})
• VM concernée : ${vm.name} — ${vm.size}
• Région : ${vm.region}
• État VM : ${vm.status}
• Diagnostic assistant : ${diagnostic?.label || 'Connexion impossible · score 28/100'}

Pistes déjà testées :
• Vérification du VPN — OK
• Redémarrage tenté — sans effet

Merci d'avance.`
  );

  const [copiedAll, setCopiedAll] = useStateF(false);
  const handleCopyAll = () => {
    const full = `Titre : ${title}
Catégorie : ${category}

${description}`;
    try { navigator.clipboard.writeText(full); } catch (e) {}
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2200);
  };

  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Ticket size={16}/></div>
        <div>
          <div className="bot-card__title">Éléments prêts pour ServiceNow</div>
          <div className="bot-card__subtitle">Copiez-collez ces champs dans votre ticket SNOW</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill tone="info">À copier</StatusPill>
        </div>
      </div>

      <div className="bot-card__body">
        {/* Internal triage block — priority determined by the chatbot */}
        <div className="triage">
          <div className="triage__head">
            <div className="triage__eyebrow">
              <I.Sparkle size={11}/> Analyse de l'assistant — transmis à l'équipe technique
            </div>
          </div>
          <div className="triage__body">
            <div className="triage__priority">
              <div className={`priority-badge priority-badge--${priorityTone}`}>
                <span className="priority-badge__level">{priorityLevel}</span>
                <span className="priority-badge__label">{priority.split('—')[1]?.trim() || ''}</span>
              </div>
              <div className="triage__rationale">
                <div className="triage__rationale-label">Pourquoi cette priorité</div>
                <div className="triage__rationale-text">{priorityRationale}</div>
              </div>
            </div>
            <div className="triage__meta">
              {diagnostic?.originLabel && (
                <div className="triage__meta-row">
                  <span className="triage__meta-label">Article d'origine</span>
                  <span className="triage__meta-value">{diagnostic.originLabel}</span>
                </div>
              )}
              <div className="triage__meta-row">
                <span className="triage__meta-label">Catégorie suggérée</span>
                <span className="triage__meta-value">{category}</span>
              </div>
              <div className="triage__meta-row">
                <span className="triage__meta-label">Source du diagnostic</span>
                <span className="triage__meta-value">{diagnostic?.label || 'Conversation utilisateur'}</span>
              </div>
            </div>
          </div>
        </div>

        <Banner tone="info" title="Pour vous : éléments à coller dans ServiceNow">
          L'assistant ne crée pas le ticket à votre place. Copiez les champs ci-dessous
          dans ServiceNow ; la priorité ci-dessus sera transmise automatiquement à l'équipe
          technique en parallèle.
        </Banner>

        <CopyField label="Titre du ticket"
                   value={title}
                   onChange={setTitle}
                   hint="Court et explicite — ce que le support voit en premier."/>

        <CopyField label="Description"
                   value={description}
                   onChange={setDescription}
                   multiline
                   hint="Personnalisez si besoin avant de coller dans ServiceNow."/>
      </div>

      <div className="bot-card__footer bot-card__footer--snippet">
        <button className="btn btn--ghost btn--sm" onClick={onCancel}>Fermer</button>
        <button className={`btn btn--secondary btn--sm ${copiedAll ? 'is-success' : ''}`} onClick={handleCopyAll}>
          {copiedAll ? <><I.Check size={13}/> Tout copié</> : <><I.Copy size={13}/> Copier tout</>}
        </button>
        <button className="btn btn--primary btn--sm" onClick={() => onOpenSnow({ title, category, priority, description })}>
          <I.External size={13}/> Ouvrir ServiceNow
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Confirmation that snippet was generated
   ========================================================= */
function TicketHandoffCard({ onTrackExisting }) {
  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon bot-card__icon--success"><I.Check size={16}/></div>
        <div>
          <div className="bot-card__title">Direction ServiceNow</div>
          <div className="bot-card__subtitle">Brouillon copié dans le presse-papiers</div>
        </div>
      </div>
      <div className="bot-card__body">
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          Une fois le ticket créé dans <strong>ServiceNow</strong>, revenez ici avec sa
          référence (<code>INC-…</code>) : je peux afficher son avancement en temps réel.
        </p>
      </div>
      <div className="bot-card__footer">
        <button className="btn btn--secondary btn--sm" onClick={onTrackExisting}>
          <I.Eye size={13}/> Suivre un ticket existant
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Ticket tracking card with timeline
   ========================================================= */
function TicketTrackingCard({ ticket }) {
  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Activity size={16}/></div>
        <div>
          <div className="bot-card__title">Suivi du ticket <code style={{ fontSize: 12 }}>{ticket.id}</code></div>
          <div className="bot-card__subtitle">{ticket.summary}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <StatusPill tone={ticket.statusTone}>{ticket.status}</StatusPill>
        </div>
      </div>
      <div className="bot-card__body">
        <ul className="timeline">
          {ticket.timeline.map((t, i) => (
            <li key={i} className={`timeline__item timeline__item--${t.state}`}>
              <span className="timeline__dot"/>
              <div className="timeline__label">
                {t.label}
              </div>
              <div className="timeline__meta">{t.time}{t.author ? ` · ${t.author}` : ''}</div>
              {t.note && <div className="timeline__note">{t.note}</div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: FAQ / info answer
   ========================================================= */
const FAQ_DATA = [
  {
    q: "Quelle est la différence entre une VM Standard et une VM Clone ?",
    short: "Standard = persistante ; Clone = volatile.",
    a: (
      <>
        <p><strong>VM Standard :</strong> persistante, vos fichiers et installations sont conservés entre les sessions. Recommandée pour les profils métier.</p>
        <p><strong>VM Clone :</strong> volatile, réinitialisée à chaque déconnexion. Recommandée pour des usages courts ou en mobilité.</p>
        <p>Les deux types offrent les mêmes performances de base ; la différence porte sur la persistance des données et le coût mensuel.</p>
      </>
    ),
  },
  {
    q: "Combien coûte mon poste virtuel ?",
    short: "Selon le type et l'usage — voir détail.",
    a: (
      <>
        <p>Le coût mensuel dépend du type de VM, du temps d'utilisation et du stockage associé.</p>
        <ul className="bullets" style={{ listStyle:'none', padding:0, display:'flex', flexDirection:'column', gap:6 }}>
          <li><strong>VM Standard :</strong> ~ 28 € / mois en moyenne</li>
          <li><strong>VM Clone :</strong> ~ 14 € / mois en moyenne</li>
          <li><strong>Stockage persistant :</strong> 0,12 € / Go / mois</li>
        </ul>
      </>
    ),
  },
  {
    q: "Comment accéder à mon PPV depuis l'extérieur ?",
    short: "Via VPN + portail AVD ou Citrix Workspace.",
    a: (
      <>
        <p>Connectez-vous d'abord au VPN d'entreprise, puis ouvrez le portail PPV à l'adresse <code>ppv.intranet/connexion</code>.</p>
        <p>Vous pouvez aussi installer le client lourd <strong>Citrix Workspace</strong> ou <strong>Remote Desktop</strong> pour une expérience plus fluide en télétravail.</p>
      </>
    ),
  },
  {
    q: "Qu'est-ce qu'un PC2 ?",
    short: "Le responsable de périmètre.",
    a: (
      <>
        <p>Un <strong>PC2</strong> est le <strong>responsable de périmètre</strong>. C'est lui qui a accès au détail de la facturation PPV de son parc de VM et qui peut simuler le coût d'options sur son parc.</p>
      </>
    ),
  },
  {
    q: "Que faire si ma VM ne démarre pas ?",
    short: "Diagnostiquer, redémarrer, escalader.",
    a: (
      <>
        <p>Lancez d'abord un <strong>diagnostic automatique</strong> depuis l'accueil du chatbot. Dans 7 cas sur 10, un simple redémarrage suffit à corriger le problème.</p>
        <p>Si le problème persiste après deux tentatives, créez un ticket — l'équipe N2 prend le relais sous 4 h ouvrées.</p>
      </>
    ),
  },
];

function FaqList({ onAsk }) {
  const [open, setOpen] = useStateF(null);
  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Book size={16}/></div>
        <div>
          <div className="bot-card__title">Questions fréquentes</div>
          <div className="bot-card__subtitle">Cliquez pour développer une réponse</div>
        </div>
      </div>
      <div className="bot-card__body" style={{ paddingTop: 6 }}>
        <div className="faq-list">
          {FAQ_DATA.map((f, i) => (
            <div key={i} className={`faq-item ${open === i ? 'is-open' : ''}`}>
              <button className="faq-item__q" onClick={() => setOpen(open === i ? null : i)}>
                <span>{f.q}</span>
                <span className="faq-item__icon"><I.Chevron size={16}/></span>
              </button>
              {open === i && <div className="faq-item__a">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FLOW: Cost / pricing — 4 sub-categories + PC2 access gate
   ========================================================= */
function CostGeneral() {
  return (
    <>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        L'offre PPV est facturée selon le <strong>type de poste</strong>, le <strong>temps d'utilisation</strong> et le <strong>stockage</strong>. Voici les ordres de grandeur :
      </p>
      <div className="price-table" style={{ marginTop: 12 }}>
        <div className="price-row"><span>VM Standard (persistante)</span><strong>~ 28 € / mois</strong></div>
        <div className="price-row"><span>VM Clone (volatile)</span><strong>~ 14 € / mois</strong></div>
        <div className="price-row"><span>Stockage persistant</span><strong>0,12 € / Go / mois</strong></div>
        <div className="price-row"><span>Heure de session au-delà du forfait</span><strong>0,03 € / h</strong></div>
      </div>
      <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>Information générale, accessible à tous les utilisateurs PPV.</p>
    </>
  );
}

function CostExtras() {
  return (
    <>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Les options et extras sont facturés en plus du poste de base :
      </p>
      <div className="price-table" style={{ marginTop: 12 }}>
        <div className="price-row"><span>Montée en configuration (+4 vCPU / +16 Go)</span><strong>+ 12 € / mois</strong></div>
        <div className="price-row"><span>Création d'un clone supplémentaire</span><strong>+ 14 € / mois</strong></div>
        <div className="price-row"><span>Disque +50 Go</span><strong>+ 6 € / mois</strong></div>
        <div className="price-row"><span>Disque +100 Go</span><strong>+ 12 € / mois</strong></div>
        <div className="price-row"><span>GPU (usage graphique)</span><strong>+ 35 € / mois</strong></div>
      </div>
      <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-muted)' }}>Accessible à tous — utile pour estimer un changement de config avant de faire une demande.</p>
    </>
  );
}

function CostMyBilling({ period }) {
  return (
    <>
      <Banner tone="success" title="Accès PC2 confirmé">Voici le détail de votre facturation pour {period}.</Banner>
      <div className="cost-grid" style={{ marginTop: 12 }}>
        <div className="cost-stat">
          <div className="cost-stat__label">Coût ce mois-ci</div>
          <div className="cost-stat__value">31,40 €</div>
          <div className="cost-stat__delta cost-stat__delta--down">↓ 4,2 % vs mois -1</div>
        </div>
        <div className="cost-stat">
          <div className="cost-stat__label">Heures de session</div>
          <div className="cost-stat__value">142 h</div>
          <div className="cost-stat__delta">≈ 7 h / jour</div>
        </div>
        <div className="cost-stat">
          <div className="cost-stat__label">Stockage utilisé</div>
          <div className="cost-stat__value">38 Go</div>
          <div className="cost-stat__delta">sur 50 Go alloués</div>
        </div>
        <div className="cost-stat">
          <div className="cost-stat__label">Économies suggérées</div>
          <div className="cost-stat__value" style={{ color: 'var(--success)' }}>6,80 €</div>
          <div className="cost-stat__delta cost-stat__delta--down">en passant en Clone</div>
        </div>
      </div>
      <div className="price-table" style={{ marginTop: 14 }}>
        <div className="price-row"><span>VM Standard · 142 h</span><strong>22,30 €</strong></div>
        <div className="price-row"><span>Stockage · 38 Go</span><strong>4,56 €</strong></div>
        <div className="price-row"><span>Licences logicielles</span><strong>4,54 €</strong></div>
      </div>
    </>
  );
}

function CostFleetOption() {
  const [opt, setOpt] = useStateF('config');
  const fleet = 24;
  const prices = { config: 12, disk: 6, clone: 14 };
  const labels = { config: 'Montée en configuration', disk: 'Disque +50 Go', clone: 'Clone supplémentaire' };
  const monthly = prices[opt] * fleet;
  return (
    <>
      <Banner tone="success" title="Accès PC2 confirmé">Simulez le coût d'une option sur votre parc de {fleet} VM.</Banner>
      <p style={{ fontWeight: 600, margin: '12px 0 6px' }}>Quelle option souhaitez-vous déployer ?</p>
      <div className="choices">
        {Object.keys(labels).map(k => (
          <button key={k} className={`choice ${opt === k ? 'choice--primary' : ''}`} onClick={() => setOpt(k)}>{labels[k]}</button>
        ))}
      </div>
      <div className="price-table" style={{ marginTop: 12 }}>
        <div className="price-row"><span>{labels[opt]} · {prices[opt]} € / VM</span><strong>× {fleet} VM</strong></div>
        <div className="price-row price-row--total"><span>Coût mensuel supplémentaire</span><strong>{monthly} € / mois</strong></div>
        <div className="price-row"><span>Soit sur l'année</span><strong>{monthly * 12} € / an</strong></div>
      </div>
    </>
  );
}

function CostBreakdownCard() {
  const [cat, setCat] = useStateF(null);
  const [role, setRole] = useStateF(null);
  const period = "Juin 2026";

  const CATS = [
    { id: 1, label: "Infos générales sur les coûts de l'offre PPV", tag: 'Accessible à tous', restricted: false },
    { id: 2, label: "Le détail de ma facturation",                  tag: 'Réservé PC2',      restricted: true  },
    { id: 3, label: "Coûts des extras (config, clone, taille de disque)", tag: 'Accessible à tous', restricted: false },
    { id: 4, label: "Coût d'une option sur mon parc de VM",          tag: 'Réservé PC2',      restricted: true  },
  ];
  const current = CATS.find(c => c.id === cat);
  const granted = current && (!current.restricted || role === 'pc2');
  const denied = current && current.restricted && role === 'other';
  const reset = () => { setCat(null); setRole(null); };

  return (
    <div className="bot-card">
      <div className="bot-card__header">
        <div className="bot-card__icon"><I.Coin size={16}/></div>
        <div>
          <div className="bot-card__title">Mécanique tarifaire PPV</div>
          <div className="bot-card__subtitle">{period}</div>
        </div>
        {cat && (
          <div style={{ marginLeft: 'auto' }}>
            <button className="btn btn--ghost btn--sm" onClick={reset}><I.ArrowLeft size={13}/> Catégories</button>
          </div>
        )}
      </div>
      <div className="bot-card__body">
        {!cat && (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-secondary)' }}>Que souhaitez-vous savoir ?</p>
            <div className="cost-cats">
              {CATS.map(c => (
                <button key={c.id} className="cost-cat" onClick={() => { setCat(c.id); setRole(null); }}>
                  <span className="cost-cat__label">{c.label}</span>
                  <span className={`cost-cat__tag ${c.restricted ? 'cost-cat__tag--lock' : ''}`}>
                    {c.restricted ? <I.Eye size={11}/> : null} {c.tag}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {current && current.restricted && !role && (
          <div className="role-gate">
            <Banner tone="info" title="Accès réservé aux responsables de périmètre (PC2)">
              Cette information concerne la facturation. Pour y accéder, indiquez votre rôle.
            </Banner>
            <p style={{ fontWeight: 600, margin: '12px 0 0' }}>Quel est votre rôle ?</p>
            <div className="choices">
              <button className="choice choice--primary" onClick={() => setRole('pc2')}>Je suis PC2 (responsable de périmètre)</button>
              <button className="choice" onClick={() => setRole('other')}>Autre rôle</button>
            </div>
          </div>
        )}

        {denied && (
          <Banner tone="warning" title="Accès refusé">
            L'accès au détail de la facturation est <strong>réservé aux PC2</strong> (responsables de périmètre).
            Pour une question générale sur les coûts, revenez aux catégories accessibles à tous.
          </Banner>
        )}

        {granted && current.id === 1 && <CostGeneral/>}
        {granted && current.id === 2 && <CostMyBilling period={period}/>}
        {granted && current.id === 3 && <CostExtras/>}
        {granted && current.id === 4 && <CostFleetOption/>}
      </div>
    </div>
  );
}

Object.assign(window, {
  DIAG_STEPS, DiagnosticChoice, DiagnosticResult,
  DiskCheckGuide, RestartVmProcess, ErrorScreenshotStep, SecondDiagnosticStep,
  TicketSnippet, TicketHandoffCard, TicketTrackingCard,
  FaqList, CostBreakdownCard, FAQ_DATA, CopyField,
  FirstConnectionCard,
  TICKET_STEPS, TICKET_TYPE_STEP, VMTYPE_STEP, BLOCKING_STEP, computePriority,
  TicketGuidedChoice, TicketDescribeStep,
});
