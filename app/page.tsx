'use client';

import { useEffect, useRef, useState } from 'react';
import { REZIMY, getRezim, type RezimKod } from '@/lib/rezimy';
import { Logo } from './Logo';
import { Markdown } from './Markdown';
import { FeedbackModal, type FeedbackContext } from './Feedback';
import { KriteriaPrehled } from './KriteriaPrehled';

interface Zdroj {
  title: string;
  url: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  /** Shrnutí úvah modelu — zobrazuje se sbalené, dokud odpověď neběží. */
  uvaha?: string;
  /** Dotazy, které model položil vyhledávači. */
  hledani?: string[];
  zdroje?: Zdroj[];
  chyba?: string;
}

type Udalost =
  | { t: 'text'; d: string }
  | { t: 'uvaha'; d: string }
  | { t: 'hledani'; d: string }
  | { t: 'zdroje'; items: Zdroj[] }
  | { t: 'chyba'; d: string };

export default function Page() {
  const [rezim, setRezim] = useState<RezimKod | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackContext | null>(null);
  const [kriteriaOpen, setKriteriaOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  function pickRezim(kod: RezimKod) {
    setRezim(kod);
    setMessages([]);
    setInput('');
    setNavOpen(false);
  }

  function goHome() {
    setRezim(null);
    setMessages([]);
    setInput('');
    setNavOpen(false);
  }

  /** Aplikuje událost ze streamu na poslední (rozepsanou) zprávu asistenta. */
  function apply(u: Udalost) {
    setMessages((m) => {
      const copy = [...m];
      const last = { ...copy[copy.length - 1] };
      if (u.t === 'text') last.content += u.d;
      else if (u.t === 'uvaha') last.uvaha = (last.uvaha ?? '') + u.d;
      else if (u.t === 'hledani') last.hledani = [...(last.hledani ?? []), u.d];
      else if (u.t === 'zdroje') last.zdroje = dedup([...(last.zdroje ?? []), ...u.items]);
      else if (u.t === 'chyba') last.chyba = u.d;
      copy[copy.length - 1] = last;
      return copy;
    });
  }

  async function send(text: string) {
    const dotaz = text.trim();
    if (!dotaz || busy || !rezim) return;

    const next: Msg[] = [...messages, { role: 'user', content: dotaz }];
    setMessages([...next, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rezim,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: 'Chyba serveru.' }));
        apply({ t: 'chyba', d: err.error ?? 'Chyba serveru.' });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // NDJSON: poslední kus může být neúplný řádek, ten si necháme na příště.
        const radky = buffer.split('\n');
        buffer = radky.pop() ?? '';
        for (const radek of radky) {
          if (!radek.trim()) continue;
          try {
            apply(JSON.parse(radek) as Udalost);
          } catch {
            // Poškozený řádek přeskočíme, ať kvůli němu nespadne celá odpověď.
          }
        }
      }
    } catch {
      apply({ t: 'chyba', d: 'Spojení se serverem selhalo.' });
    } finally {
      setBusy(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  }

  function autoGrow(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
  }

  const r = rezim ? getRezim(rezim) : undefined;

  return (
    <div className="app">
      {/* ---------- Levý panel: režimy ---------- */}
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <button className="brand" onClick={goHome} aria-label="Zpět na úvod">
          <Logo size={44} />
          <div className="brand-text">
            <span className="brand-title">AI nástroje ve výuce</span>
            <span className="brand-sub">Kritéria NPI ČR</span>
          </div>
        </button>

        <div className="nav-label">S čím pomoct</div>
        <nav className="nav">
          {REZIMY.map((x) => (
            <button
              key={x.kod}
              className={`nav-item ${rezim === x.kod ? 'active' : ''}`}
              onClick={() => pickRezim(x.kod)}
            >
              <span className="nav-name">{x.nazev}</span>
              <span className="nav-desc">{x.popis}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="foot-kriteria" onClick={() => setKriteriaOpen(true)}>
            Prohlédnout všech 38 kritérií
          </button>
          <a href="https://aidetem.cz/" target="_blank" rel="noopener noreferrer" className="foot-brand">
            AI dětem
          </a>
          <p className="foot-note">
            Poradce vychází z dokumentu <em>Kritéria pro AI nástroje ve výuce</em> (pracovní návrh,
            červen 2026) od{' '}
            <a href="https://npi.cz/" target="_blank" rel="noopener noreferrer">
              Národního pedagogického institutu ČR
            </a>
            . Výstup je podklad pro rozhodnutí školy, ne certifikace nástroje.
          </p>
        </div>
      </aside>

      {navOpen && <div className="scrim" onClick={() => setNavOpen(false)} />}

      {/* ---------- Hlavní oblast ---------- */}
      <main className="main">
        <header className="topbar">
          <button className="menu-btn" aria-label="Menu" onClick={() => setNavOpen((o) => !o)}>
            <span />
            <span />
            <span />
          </button>
          <div className="topbar-title">
            {r ? (
              <>
                {r.nazev}
                <small>{r.hleda ? 'Hledá na internetu · kritéria NPI' : 'Odpovídá z dokumentu NPI'}</small>
              </>
            ) : (
              <>Vyberte, s čím pomoct</>
            )}
          </div>
          <button className="fb-open" onClick={() => setFeedback({ typ: 'obecná', skupina: r?.nazev })}>
            Odeslat připomínku
          </button>
        </header>

        {!rezim ? (
          <div className="welcome">
            <div className="welcome-inner">
              <Logo size={64} />
              <h1>Je ten AI nástroj vhodný do výuky?</h1>
              <p className="lead">
                Poradce pro školy, který posuzuje AI nástroje podle kritérií Národního pedagogického
                institutu ČR — 7 oblastí, 38 kritérií od zákonných podmínek po doporučení. Dohledá
                o nástroji veřejné informace a řekne, co sedí, co ne a na co se zeptat dodavatele.
                Vyberte, s čím pomoct.
              </p>
              <div className="welcome-grid">
                {REZIMY.map((x) => (
                  <button key={x.kod} className="welcome-card" onClick={() => pickRezim(x.kod)}>
                    <span className="wc-name">{x.nazev}</span>
                    <span className="wc-desc">{x.uvod}</span>
                  </button>
                ))}
              </div>
              <p className="welcome-note">
                Poradce je sám AI nástroj — může se mýlit. Jeho závěry si u důležitých rozhodnutí ověřte
                v <button className="linkish" onClick={() => setKriteriaOpen(true)}>původním dokumentu</button>{' '}
                a u dodavatele.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="messages" ref={scrollRef}>
              <div className="thread">
                {messages.length === 0 && (
                  <div className="hint">
                    <p>{r?.napoveda}</p>
                    <div className="priklady">
                      {r?.priklady.map((p) => (
                        <button key={p} className="priklad" onClick={() => void send(p)}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => {
                  const isLast = i === messages.length - 1;
                  const isStreaming = busy && isLast;
                  const prazdna = !m.content && !m.chyba;
                  const canReview = m.role === 'assistant' && !!m.content && !isStreaming;
                  return (
                    <div key={i} className={`msg ${m.role}`}>
                      <div className="msg-col">
                        {m.role === 'assistant' && (m.uvaha || m.hledani?.length) && (
                          <Prubeh uvaha={m.uvaha} hledani={m.hledani} bezi={isStreaming && !m.content} />
                        )}

                        <div className="bubble">
                          {m.content ? (
                            m.role === 'assistant' ? (
                              <Markdown>{m.content}</Markdown>
                            ) : (
                              m.content
                            )
                          ) : isStreaming && prazdna ? (
                            <span className="dots">
                              <span>·</span>
                              <span>·</span>
                              <span>·</span>
                            </span>
                          ) : (
                            ''
                          )}
                          {m.chyba && <div className="msg-chyba">⚠️ {m.chyba}</div>}
                        </div>

                        {m.zdroje && m.zdroje.length > 0 && <Zdroje zdroje={m.zdroje} />}

                        {canReview && (
                          <button
                            className="fb-inline"
                            onClick={() =>
                              setFeedback({
                                typ: 'k odpovědi',
                                skupina: r?.nazev,
                                dotaz: messages[i - 1]?.role === 'user' ? messages[i - 1].content : '',
                                odpoved: m.content,
                              })
                            }
                          >
                            Připomínkovat odpověď
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="composer">
              <form
                className="thread"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(input);
                }}
              >
                <textarea
                  ref={taRef}
                  value={input}
                  onChange={autoGrow}
                  onKeyDown={onKeyDown}
                  placeholder="Napište zprávu… (Enter odešle, Shift+Enter nový řádek)"
                  rows={1}
                />
                <button className="send" type="submit" disabled={busy || !input.trim()} aria-label="Odeslat">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path
                      d="M16.5038 0.103303C18.028 -0.404458 19.4777 1.0458 18.9696 2.5701L13.9129 17.74C13.379 19.3405 11.2021 19.5535 10.368 18.0867L7.73619 13.4578L10.8641 10.3308C11.4496 9.74512 11.4496 8.79547 10.8641 8.20975C10.2784 7.62404 9.32883 7.62421 8.74302 8.20975L5.61509 11.3367L0.986186 8.70487C-0.480688 7.8707 -0.267055 5.69358 1.33384 5.15994L16.5038 0.103303Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </form>
            </div>
          </>
        )}
      </main>

      {feedback && <FeedbackModal ctx={feedback} onClose={() => setFeedback(null)} />}
      {kriteriaOpen && <KriteriaPrehled onClose={() => setKriteriaOpen(false)} />}
    </div>
  );
}

/** Průběh práce modelu — co hledal a jak uvažoval. Během psaní rozbalené, pak sbalené. */
function Prubeh({ uvaha, hledani, bezi }: { uvaha?: string; hledani?: string[]; bezi: boolean }) {
  const [open, setOpen] = useState(false);
  const rozbaleno = open || bezi;
  return (
    <div className="prubeh">
      <button className="prubeh-head" onClick={() => setOpen((o) => !o)} aria-expanded={rozbaleno}>
        <span className={`prubeh-sip ${rozbaleno ? 'open' : ''}`}>▸</span>
        {hledani?.length ? `Rešerše — ${hledani.length}× hledání` : 'Postup úvahy'}
      </button>
      {rozbaleno && (
        <div className="prubeh-telo">
          {hledani?.map((q, i) => (
            <div key={i} className="prubeh-dotaz">
              🔍 {q}
            </div>
          ))}
          {uvaha && <div className="prubeh-uvaha">{uvaha}</div>}
        </div>
      )}
    </div>
  );
}

function Zdroje({ zdroje }: { zdroje: Zdroj[] }) {
  return (
    <div className="zdroje">
      <div className="zdroje-label">Dohledané zdroje ({zdroje.length})</div>
      <ol>
        {zdroje.map((z) => (
          <li key={z.url}>
            <a href={z.url} target="_blank" rel="noopener noreferrer">
              {z.title || z.url}
            </a>
            <span className="zdroj-host">{host(z.url)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function dedup(zdroje: Zdroj[]): Zdroj[] {
  const videno = new Set<string>();
  return zdroje.filter((z) => (videno.has(z.url) ? false : (videno.add(z.url), true)));
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
