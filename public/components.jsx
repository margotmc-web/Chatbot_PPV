/* global React */
// Shared UI primitives & icons

const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* =========================================================
   Icon helper
   ========================================================= */
function Icon(props) {
  const { d, size = 16, stroke = 1.6, fill = 'none', children, ...rest } = props;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {d ? <path d={d}/> : children}
    </svg>
  );
}

// Build icons via a factory to avoid heavy JSX inside object-literal values
function path(d) {
  return function (p) { return <Icon {...p} d={d}/>; };
}
function multi(...children) {
  return function (p) {
    return <Icon {...p}>{children.map((c, i) => React.cloneElement(c, { key: i }))}</Icon>;
  };
}

const I = {
  Plus:        path("M12 5v14M5 12h14"),
  Send:        path("M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"),
  Search:      multi(<circle cx="11" cy="11" r="7"/>, <path d="m20 20-3.5-3.5"/>),
  Home:        path("m3 11 9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2V11z"),
  Ticket:      path("M3 8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z M13 6v12"),
  Book:        path("M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14zM4 19.5A2.5 2.5 0 0 0 6.5 22H20"),
  Coin:        multi(<circle cx="12" cy="12" r="9"/>, <path d="M15 9.5C15 8 13.66 7 12 7s-3 1-3 2.5S10.34 12 12 12s3 1 3 2.5S13.66 17 12 17s-3-1-3-2.5M12 5v2M12 17v2"/>),
  Bot:         multi(<rect x="4" y="7" width="16" height="12" rx="3"/>, <path d="M12 7V3M9 12v1M15 12v1M9 19v2M15 19v2"/>),
  Spark:       path("M12 3v4M12 17v4M5 12H1M23 12h-4M6 6l-2-2M20 20l-2-2M18 6l2-2M4 20l2-2"),
  Stethoscope: path("M6 3v6a4 4 0 0 0 8 0V3M8 21a3 3 0 0 0 6 0v-2M14 19a4 4 0 0 0 4-4v-2"),
  Activity:    path("M22 12h-4l-3 9L9 3l-3 9H2"),
  Alert:       multi(<circle cx="12" cy="12" r="9"/>, <path d="M12 8v5M12 16v.5"/>),
  Check:       path("m5 12 5 5 9-13"),
  X:           path("M18 6 6 18M6 6l12 12"),
  ArrowRight:  path("M5 12h14M13 6l6 6-6 6"),
  ArrowLeft:   path("M19 12H5M11 6l-6 6 6 6"),
  Chevron:     path("m6 9 6 6 6-6"),
  Refresh:     path("M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"),
  Power:       path("M12 3v9M5.6 7.6a8 8 0 1 0 12.8 0"),
  Clock:       multi(<circle cx="12" cy="12" r="9"/>, <path d="M12 7v5l3 2"/>),
  Paperclip:   path("m21 11-9 9a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5L11 17a2 2 0 0 1-3-3l7-7"),
  Mic:         multi(<rect x="9" y="3" width="6" height="11" rx="3"/>, <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>),
  Sliders:     path("M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"),
  Sparkle:     path("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"),
  Server:      multi(<rect x="3" y="4" width="18" height="7" rx="1.5"/>, <rect x="3" y="13" width="18" height="7" rx="1.5"/>, <path d="M7 8h.01M7 17h.01"/>),
  User:        multi(<circle cx="12" cy="8" r="4"/>, <path d="M4 21a8 8 0 0 1 16 0"/>),
  Eye:         path("M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"),
  More:        multi(<circle cx="5" cy="12" r="1.2"/>, <circle cx="12" cy="12" r="1.2"/>, <circle cx="19" cy="12" r="1.2"/>),
  Wifi:        path("M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0M12 20h.01M2 9a16 16 0 0 1 20 0"),
  Cog:         multi(<circle cx="12" cy="12" r="3"/>, <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>),
  Bell:        path("M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"),
  HelpCircle:  multi(<circle cx="12" cy="12" r="9"/>, <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.4-1 1-1 1.7v.5M12 17v.01"/>),
  Folder:      path("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"),
  Copy:        multi(<rect x="9" y="9" width="11" height="11" rx="2"/>, <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>),
  External:    multi(<path d="M14 4h6v6"/>, <path d="M10 14 20 4"/>, <path d="M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"/>),
};

/* =========================================================
   Reusable components
   ========================================================= */
function Avatar(props) {
  const initials = props.initials || 'JD';
  const bot = !!props.bot;
  const size = props.size || 'md';
  const cls = size === 'sm' ? 'avatar avatar--sm' : size === 'lg' ? 'avatar avatar--lg' : 'avatar';
  if (bot) {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 20 : 16;
    return (
      <div className={`${cls} avatar--bot`} aria-hidden>
        <I.Bot size={iconSize}/>
      </div>
    );
  }
  return <div className={cls} aria-hidden>{initials}</div>;
}

function StatusPill(props) {
  const tone = props.tone || 'neutral';
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <span className="status-pill__dot"/>
      {props.children}
    </span>
  );
}

function Typing() {
  return (
    <span className="typing" aria-label="Assistant typing">
      <span className="typing__dot"/>
      <span className="typing__dot"/>
      <span className="typing__dot"/>
    </span>
  );
}

function Gauge(props) {
  const value = props.value == null ? 70 : props.value;
  const tone = props.tone || 'good';
  const label = props.label;
  const desc = props.desc;
  const r = 26;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const fillCls = tone === 'good' ? 'gauge__fill gauge__fill--good'
    : tone === 'warn' ? 'gauge__fill gauge__fill--warn'
    : tone === 'bad' ? 'gauge__fill gauge__fill--bad'
    : 'gauge__fill';
  return (
    <div className="gauge">
      <div className="gauge__ring">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r={r} className="gauge__track"/>
          <circle cx="32" cy="32" r={r} className={fillCls}
                  strokeDasharray={c} strokeDashoffset={offset}/>
        </svg>
        <div className="gauge__num">{value}</div>
      </div>
      <div className="gauge__body">
        <div className="gauge__label">{label}</div>
        {desc ? <div className="gauge__desc">{desc}</div> : null}
      </div>
    </div>
  );
}

function FieldRow(props) {
  return (
    <div className="field-row">
      <div className="field-row__label">{props.label}</div>
      <div className="field-row__value">{props.children}</div>
    </div>
  );
}

function Steps(props) {
  const total = props.total;
  const current = props.current;
  const arr = [];
  for (let i = 0; i < total; i++) arr.push(i);
  return (
    <div className="steps">
      {arr.map(function (i) {
        const cls = i < current ? 'step is-done' : i === current ? 'step is-active' : 'step';
        return <div key={i} className={cls}/>;
      })}
    </div>
  );
}

function Banner(props) {
  const tone = props.tone || 'info';
  const title = props.title;
  const children = props.children;
  const customIcon = props.icon;
  const Ico = customIcon || (tone === 'success' ? I.Check : tone === 'danger' ? I.Alert : tone === 'warning' ? I.Alert : I.Spark);
  return (
    <div className={`banner banner--${tone}`}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Ico size={16}/></span>
      <div className="banner__body">
        {title ? <div className="banner__title">{title}</div> : null}
        {children ? <div style={{ fontSize: 12.5 }}>{children}</div> : null}
      </div>
    </div>
  );
}

// Export to window for cross-file use
Object.assign(window, {
  I, Icon, Avatar, StatusPill, Typing, Gauge, FieldRow, Steps, Banner,
});
