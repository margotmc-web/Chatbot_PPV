/* global React, I, Avatar, StatusPill, FieldRow, Banner */
// Personal dashboard — user-specific stats and tracking

const { useState: useStateD, useMemo: useMemoD } = React;

/* =========================================================
   KPI tile
   ========================================================= */
function Kpi({ label, value, delta, deltaTone = 'neutral', icon, hint }) {
  return (
    <div className="kpi">
      <div className="kpi__head">
        <span className="kpi__label">{label}</span>
        {icon ? <span className="kpi__icon">{icon}</span> : null}
      </div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__foot">
        {delta ? (
          <span className={`kpi__delta kpi__delta--${deltaTone}`}>
            {deltaTone === 'down' ? '↓ ' : deltaTone === 'up' ? '↑ ' : ''}{delta}
          </span>
        ) : null}
        {hint ? <span className="kpi__hint">{hint}</span> : null}
      </div>
    </div>
  );
}

/* =========================================================
   My session usage — last 7 days (CPU + session hours)
   ========================================================= */
const MY_USAGE = [
  { d: 'Lun', hours: 7.2, cpu: 42 },
  { d: 'Mar', hours: 8.1, cpu: 58 },
  { d: 'Mer', hours: 6.8, cpu: 51 },
  { d: 'Jeu', hours: 8.4, cpu: 84 },
  { d: 'Ven', hours: 7.9, cpu: 71 },
  { d: 'Sam', hours: 0.3, cpu: 8  },
  { d: 'Dim', hours: 0.0, cpu: 0  },
];

function MySessionChart() {
  const W = 560, H = 220, pad = { l: 32, r: 14, t: 18, b: 28 };
  const inner = { w: W - pad.l - pad.r, h: H - pad.t - pad.b };
  const groupW = inner.w / MY_USAGE.length;
  const barW = Math.min(28, groupW * 0.5);
  const maxHours = 10;

  // CPU line points
  const linePts = MY_USAGE.map((d, i) => {
    const cx = pad.l + groupW * i + groupW / 2;
    const cy = pad.t + inner.h - (d.cpu / 100) * inner.h;
    return [cx, cy];
  });
  const linePath = linePts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0] + ' ' + p[1]).join(' ');

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Mon utilisation cette semaine</div>
          <div className="chart-card__sub">Heures de session et charge CPU moyenne</div>
        </div>
        <div className="chart-legend">
          <span className="chart-legend__item"><span className="dot dot--brand"/> Heures</span>
          <span className="chart-legend__item"><span className="dot dot--info"/> CPU %</span>
        </div>
      </div>
      <div className="chart-card__body">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="220" preserveAspectRatio="xMidYMid meet">
          {[0, 2.5, 5, 7.5, 10].map(v => {
            const y = pad.t + inner.h - (v / maxHours) * inner.h;
            return (
              <g key={v}>
                <line x1={pad.l} x2={W - pad.r} y1={y} y2={y}
                      stroke="#E8ECF3" strokeWidth="1"
                      strokeDasharray={v === 0 ? '0' : '3 3'}/>
                <text x={pad.l - 6} y={y + 3} fontSize="10" textAnchor="end" fill="#7B8597">{v}h</text>
              </g>
            );
          })}
          {/* bars (hours) */}
          {MY_USAGE.map((d, i) => {
            const cx = pad.l + groupW * i + groupW / 2;
            const h = (d.hours / maxHours) * inner.h;
            const y = pad.t + inner.h - h;
            return (
              <g key={i}>
                <rect x={cx - barW / 2} y={y} width={barW} height={h} rx="3" fill="#CC0033" opacity="0.85"/>
                <text x={cx} y={H - 8} fontSize="10.5" textAnchor="middle" fill="#7B8597">{d.d}</text>
              </g>
            );
          })}
          {/* CPU line */}
          <path d={linePath} fill="none" stroke="#2F6BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          {linePts.map((p, i) => (
            <circle key={i} cx={p[0]} cy={p[1]} r="3.5" fill="white" stroke="#2F6BFF" strokeWidth="2"/>
          ))}
        </svg>
      </div>
    </div>
  );
}

/* =========================================================
   My VM health — gauges
   ========================================================= */
function MetricGauge({ label, value, max = 100, unit = '%', tone = 'good', sub }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, (value / max) * 100);
  const offset = c - (pct / 100) * c;
  const stroke = tone === 'bad' ? '#C0392B'
    : tone === 'warn' ? '#B5701A'
    : tone === 'good' ? '#1F8A5B'
    : '#2F6BFF';
  return (
    <div className="metric-gauge">
      <div className="metric-gauge__ring">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#E8ECF3" strokeWidth="7"/>
          <circle cx="40" cy="40" r={r} fill="none" stroke={stroke} strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={c} strokeDashoffset={offset}
                  transform="rotate(-90 40 40)"/>
          <text x="40" y="44" fontSize="15" fontWeight="700" textAnchor="middle" fill="#1A1A1A">
            {value}{unit}
          </text>
        </svg>
      </div>
      <div className="metric-gauge__body">
        <div className="metric-gauge__label">{label}</div>
        {sub ? <div className="metric-gauge__sub">{sub}</div> : null}
      </div>
    </div>
  );
}

function MyVmHealth() {
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Santé de ma VM</div>
          <div className="chart-card__sub"><code>PPV-AVD-CR-04</code> · Standard 4 vCPU / 16 Go</div>
        </div>
        <StatusPill tone="warning">Dégradée</StatusPill>
      </div>
      <div className="chart-card__body">
        <div className="metric-grid">
          <MetricGauge label="CPU"        value={71} tone="warn" sub="moyenne 24 h"/>
          <MetricGauge label="Mémoire"    value={58} tone="good" sub="9,3 / 16 Go"/>
          <MetricGauge label="Stockage"   value={76} tone="warn" sub="38 / 50 Go"/>
          <MetricGauge label="Latence"    value={38} max={150} unit="ms" tone="good" sub="vers passerelle"/>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   My tickets — compact timeline
   ========================================================= */
const MY_TICKETS = [
  { id: 'INC-204815', summary: "Connexion AVD impossible", status: 'En cours', tone: 'info', age: 'il y a 2 h', priority: 'P1' },
  { id: 'INC-204612', summary: "Lenteurs sur Citrix",      status: 'Résolu',   tone: 'success', age: 'il y a 4 j', priority: 'P2' },
  { id: 'INC-204441', summary: "Erreur SSO sur SAP",       status: 'Résolu',   tone: 'success', age: 'il y a 9 j', priority: 'P3' },
  { id: 'INC-204290', summary: "Profil utilisateur saturé", status: 'Résolu',   tone: 'success', age: 'il y a 18 j', priority: 'P3' },
];

function MyTicketsList() {
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Mes tickets récents</div>
          <div className="chart-card__sub">4 tickets sur les 30 derniers jours</div>
        </div>
        <button className="btn btn--ghost btn--sm">Voir tout <I.ArrowRight size={12}/></button>
      </div>
      <div className="chart-card__body" style={{ padding: 0 }}>
        <ul className="my-tickets">
          {MY_TICKETS.map(t => (
            <li key={t.id} className="my-ticket">
              <span className={`priority-tag priority-tag--${t.priority.toLowerCase()}`}>{t.priority}</span>
              <div className="my-ticket__body">
                <div className="my-ticket__top">
                  <code style={{ fontSize: 11 }}>{t.id}</code>
                  <span className="my-ticket__age">{t.age}</span>
                </div>
                <div className="my-ticket__title">{t.summary}</div>
              </div>
              <StatusPill tone={t.tone}>{t.status}</StatusPill>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   My cost block
   ========================================================= */
function MyCostsCard() {
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Mes coûts ce mois-ci</div>
          <div className="chart-card__sub">Juin 2026</div>
        </div>
      </div>
      <div className="chart-card__body">
        <div className="cost-line">
          <div className="cost-line__main">
            <div className="cost-line__value">31,40 €</div>
            <div className="cost-line__label">total</div>
          </div>
          <div className="cost-line__delta cost-line__delta--down">
            ↓ 4,2 % vs mois -1
          </div>
        </div>
        <div className="cost-breakdown">
          <div className="cost-breakdown__row">
            <span>VM Standard · 142 h</span>
            <span><strong>22,30 €</strong></span>
          </div>
          <div className="cost-breakdown__bar"><span style={{ width: '71%', background: 'var(--brand-primary)' }}/></div>
          <div className="cost-breakdown__row">
            <span>Stockage · 38 Go</span>
            <span><strong>4,56 €</strong></span>
          </div>
          <div className="cost-breakdown__bar"><span style={{ width: '15%', background: 'var(--brand-accent)' }}/></div>
          <div className="cost-breakdown__row">
            <span>Licences logicielles</span>
            <span><strong>4,54 €</strong></span>
          </div>
          <div className="cost-breakdown__bar"><span style={{ width: '14%', background: 'var(--raspberry)' }}/></div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   My assistant interactions
   ========================================================= */
function MyAssistantUsage() {
  const stats = [
    { label: 'Conversations',        value: 18, hint: 'ce mois' },
    { label: 'Diagnostics lancés',   value: 6,  hint: '4 finalisés' },
    { label: 'Tickets préparés',     value: 3,  hint: 'via assistant' },
    { label: 'Réponses FAQ utiles',  value: 11, hint: 'sans escalade' },
  ];
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Mes interactions avec l'assistant</div>
          <div className="chart-card__sub">Depuis le 1er du mois</div>
        </div>
      </div>
      <div className="chart-card__body">
        <div className="usage-grid">
          {stats.map(s => (
            <div key={s.label} className="usage-cell">
              <div className="usage-cell__value">{s.value}</div>
              <div className="usage-cell__label">{s.label}</div>
              <div className="usage-cell__hint">{s.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   Personal recommendations
   ========================================================= */
function MyRecommendations() {
  const recs = [
    { tone: 'warning', icon: <I.Alert size={14}/>, title: "Profil utilisateur volumineux (4,8 Go)",
      desc: "Au-dessus du seuil recommandé. Un nettoyage automatique peut libérer 2,8 Go.",
      cta: "Lancer le nettoyage" },
    { tone: 'success', icon: <I.Coin size={14}/>,  title: "Économie possible : 6,80 € / mois",
      desc: "92 % de vos usages sont compatibles avec une VM Clone — moins chère.",
      cta: "Simuler la bascule" },
    { tone: 'info',    icon: <I.Book size={14}/>,  title: "Nouvel article — éviter les lenteurs AVD",
      desc: "Guide en 5 étapes mis à jour la semaine dernière.",
      cta: "Lire l'article" },
  ];
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Recommandations pour vous</div>
          <div className="chart-card__sub">Personnalisées selon votre usage</div>
        </div>
      </div>
      <div className="chart-card__body" style={{ padding: 0 }}>
        <ul className="recs">
          {recs.map((r, i) => (
            <li key={i} className="rec">
              <span className={`rec__icon rec__icon--${r.tone}`}>{r.icon}</span>
              <div className="rec__body">
                <div className="rec__title">{r.title}</div>
                <div className="rec__desc">{r.desc}</div>
              </div>
              <button className="btn btn--secondary btn--sm">{r.cta}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   Activity (personal)
   ========================================================= */
const MY_ACTIVITY = [
  { time: 'il y a 12 min', icon: <I.Stethoscope size={12}/>, tone: 'brand',   text: <>Vous avez lancé un diagnostic — <strong>connexion AVD</strong></> },
  { time: 'il y a 25 min', icon: <I.Ticket size={12}/>,      tone: 'brand',   text: <>Ticket <strong>INC-204815</strong> créé avec l'assistant</> },
  { time: 'il y a 2 h',    icon: <I.Power size={12}/>,       tone: 'neutral', text: <>Connexion à votre VM <code>PPV-AVD-CR-04</code></> },
  { time: 'hier',          icon: <I.Check size={12}/>,       tone: 'success', text: <>Ticket <strong>INC-204612</strong> résolu — lenteurs Citrix</> },
  { time: 'il y a 2 j',    icon: <I.Refresh size={12}/>,     tone: 'neutral', text: <>Session réinitialisée à votre demande</> },
];

function MyActivityFeed() {
  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <div>
          <div className="chart-card__title">Mon activité récente</div>
          <div className="chart-card__sub">Vos interactions avec le service PPV</div>
        </div>
      </div>
      <div className="chart-card__body" style={{ padding: 0 }}>
        <ul className="activity">
          {MY_ACTIVITY.map((a, i) => (
            <li key={i} className="activity__item">
              <span className={`activity__icon activity__icon--${a.tone}`}>{a.icon}</span>
              <div className="activity__body">
                <div className="activity__text">{a.text}</div>
                <div className="activity__time">{a.time}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================
   Dashboard view
   ========================================================= */
function DashboardView({ user, vm }) {
  return (
    <div className="chat__scroll dashboard" data-screen-label="Dashboard">
      <div className="dashboard__inner">
        <header className="dashboard__header">
          <div className="dashboard__heading">
            <Avatar initials={user.initials} size="lg"/>
            <div>
              <div className="hero__eyebrow">Mon espace PPV</div>
              <h1 className="dashboard__title">Bonjour {user.name.split(' ')[0]}</h1>
              <p className="dashboard__subtitle">
                Voici l'état de votre poste virtuel, vos tickets et votre activité récente.
              </p>
            </div>
          </div>
          <div className="dashboard__filters">
            <button className="filter-chip is-active">7 j</button>
            <button className="filter-chip">30 j</button>
            <button className="filter-chip">90 j</button>
          </div>
        </header>

        <div className="kpi-row">
          <Kpi label="Mes tickets ouverts"
               value="1"
               delta="P1 — priorité haute"
               deltaTone="up"
               icon={<I.Ticket size={16}/>}/>
          <Kpi label="Résolus ce mois"
               value="3"
               delta="100% dans le SLA"
               deltaTone="down"
               icon={<I.Check size={16}/>}/>
          <Kpi label="Heures de session"
               value="142 h"
               delta="≈ 7 h / jour"
               deltaTone="neutral"
               hint="ce mois"
               icon={<I.Clock size={16}/>}/>
          <Kpi label="Coût ce mois-ci"
               value="31,40 €"
               delta="-4,2%"
               deltaTone="down"
               icon={<I.Coin size={16}/>}/>
        </div>

        <div className="dashboard__grid">
          <div className="dashboard__col dashboard__col--wide">
            <MySessionChart/>
          </div>
          <div className="dashboard__col">
            <MyVmHealth/>
          </div>

          <div className="dashboard__col dashboard__col--wide">
            <MyTicketsList/>
          </div>
          <div className="dashboard__col">
            <MyCostsCard/>
          </div>

          <div className="dashboard__col">
            <MyAssistantUsage/>
          </div>
          <div className="dashboard__col dashboard__col--wide">
            <MyRecommendations/>
          </div>

          <div className="dashboard__col dashboard__col--wide">
            <MyActivityFeed/>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  DashboardView, Kpi,
});
