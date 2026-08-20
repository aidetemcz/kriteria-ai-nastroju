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

interface UzivatelskaZprava {
  role: 'user';
  content: string;
}

/**
 * Jeden tah asistenta. Odpověď se dělí na segmenty — každý textový blok od modelu
 * je samostatná bublina. Mezi bloky model pracuje (hledá, čte, uvažuje) a v té
 * chvíli se místo další bubliny ukazují tři tečky, ať je vidět, že se něco děje.
 */
interface TahAsistenta {
  role: 'assistant';
  segmenty: string[];
  uvaha?: string;
  hledani?: string[];
  cteni?: string[];
  zdroje?: Zdroj[];
  chyba?: string;
}

type Zprava = UzivatelskaZprava | TahAsistenta;

type Udalost =
  | { t: 'blok' }
  | { t: 'konec' }
  | { t: 'text'; d: string }
  | { t: 'uvaha'; d: string }
  | { t: 'hledani'; d: string }
  | { t: 'cteni'; d: string }
  | { t: 'zdroje'; items: Zdroj[] }
  | { t: 'chyba'; d: string };

export default function Page() {
  const [rezim, setRezim] = useState<RezimKod | null>(null);
  const [zpravy, setZpravy] = useState<Zprava[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  /** Právě teče text do poslední bubliny — pak tečky nezobrazujeme. */
  const [pise, setPise] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackContext | null>(null);
  const [kriteriaOpen, setKriteriaOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [zpravy, busy]);

  function pickRezim(kod: RezimKod) {
    setRezim(kod);
    setZpravy([]);
    setInput('');
    setNavOpen(false);
  }

  function goHome() {
    setRezim(null);
    setZpravy([]);
    setInput('');
    setNavOpen(false);
  }

  /** Aplikuje událost ze streamu na poslední (rozepsaný) tah asistenta. */
  function apply(u: Udalost) {
    if (u.t === 'blok') setPise(true);
    if (u.t === 'konec') setPise(false);

    setZpravy((zs) => {
      const copy = [...zs];
      const posledni = copy[copy.length - 1];
      if (!posledni || posledni.role !== 'assistant') return zs;
      const tah: TahAsistenta = { ...posledni, segmenty: [...posledni.segmenty] };

      switch (u.t) {
        case 'blok':
          // Nový textový blok = nová bublina. Prázdný segment na konci nezdvojujeme.
          if (tah.segmenty.length === 0 || tah.segmenty[tah.segmenty.length - 1] !== '') {
            tah.segmenty.push('');
          }
          break;
        case 'text':
          if (tah.segmenty.length === 0) tah.segmenty.push('');
          tah.segmenty[tah.segmenty.length - 1] += u.d;
          break;
        case 'konec':
          break;
        case 'uvaha':
          tah.uvaha = (tah.uvaha ?? '') + u.d;
          break;
        case 'hledani':
          tah.hledani = [...(tah.hledani ?? []), u.d];
          break;
        case 'cteni':
          tah.cteni = [...(tah.cteni ?? []), u.d];
          break;
        case 'zdroje':
          tah.zdroje = dedup([...(tah.zdroje ?? []), ...u.items]);
          break;
        case 'chyba':
          tah.chyba = u.d;
          break;
      }

      copy[copy.length - 1] = tah;
      return copy;
    });
  }

  async function send(text: string) {
    const dotaz = text.trim();
    if (!dotaz || busy || !rezim) return;

    const historie: Zprava[] = [...zpravy, { role: 'user', content: dotaz }];
    setZpravy([...historie, { role: 'assistant', segmenty: [] }]);
    setInput('');
    setBusy(true);
    setPise(false);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rezim, messages: historie.map(proApi) }),
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
      setPise(false);
      // Model mohl skončit prázdným blokem — ať po něm nezůstane prázdná bublina.
      setZpravy((zs) => {
        const copy = [...zs];
        const posledni = copy[copy.length - 1];
        if (posledni?.role === 'assistant') {
          const segmenty = posledni.segmenty.filter((x) => x.trim() !== '');
          copy[copy.length - 1] = { ...posledni, segmenty };
        }
        return copy;
      });
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
                {zpravy.length === 0 && (
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

                {zpravy.map((m, i) => {
                  if (m.role === 'user') {
                    return (
                      <div key={i} className="msg user">
                        <div className="msg-col">
                          <div className="bubble">{m.content}</div>
                        </div>
                      </div>
                    );
                  }

                  const posledni = i === zpravy.length - 1;
                  const bezi = busy && posledni;
                  const maPrubeh = !!(m.uvaha || m.hledani?.length || m.cteni?.length);
                  const dotaz = zpravy[i - 1]?.role === 'user' ? (zpravy[i - 1] as UzivatelskaZprava).content : '';

                  return (
                    <div key={i} className="msg assistant">
                      <div className="msg-col">
                        {maPrubeh && (
                          <Prubeh
                            uvaha={m.uvaha}
                            hledani={m.hledani}
                            cteni={m.cteni}
                            bezi={bezi && m.segmenty.length === 0}
                          />
                        )}

                        {!!m.zdroje?.length && <Zdroje zdroje={m.zdroje} />}

                        {m.segmenty.map((seg, j) =>
                          seg ? (
                            <div key={j} className="bubble">
                              <Markdown>{seg}</Markdown>
                            </div>
                          ) : null,
                        )}

                        {/* Model pracuje a zrovna nepíše — dej najevo, že se něco děje. */}
                        {bezi && !pise && !m.chyba && (
                          <div className="bubble">
                            <span className="dots">
                              <span>·</span>
                              <span>·</span>
                              <span>·</span>
                            </span>
                          </div>
                        )}

                        {m.chyba && (
                          <div className="bubble">
                            <div className="msg-chyba">⚠️ {m.chyba}</div>
                          </div>
                        )}

                        {!bezi && m.segmenty.some(Boolean) && (
                          <button
                            className="fb-inline"
                            onClick={() =>
                              setFeedback({
                                typ: 'k odpovědi',
                                skupina: r?.nazev,
                                dotaz,
                                odpoved: m.segmenty.join('\n\n'),
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

/** Do API posíláme jen role a text — segmenty spojíme zpátky do jedné odpovědi. */
function proApi(m: Zprava): { role: 'user' | 'assistant'; content: string } {
  return m.role === 'user'
    ? { role: 'user', content: m.content }
    : { role: 'assistant', content: m.segmenty.join('\n\n') };
}

/** Průběh práce modelu — co hledal, co četl a jak uvažoval. Během práce rozbalené, pak sbalené. */
function Prubeh({
  uvaha,
  hledani,
  cteni,
  bezi,
}: {
  uvaha?: string;
  hledani?: string[];
  cteni?: string[];
  bezi: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rozbaleno = open || bezi;
  const casti = [
    hledani?.length ? `${hledani.length}× hledání` : null,
    cteni?.length ? `${cteni.length}× čtení stránky` : null,
  ].filter(Boolean);
  return (
    <div className="prubeh">
      <button className="prubeh-head" onClick={() => setOpen((o) => !o)} aria-expanded={rozbaleno}>
        <span className={`prubeh-sip ${rozbaleno ? 'open' : ''}`}>▸</span>
        {casti.length ? `Rešerše — ${casti.join(', ')}` : 'Postup úvahy'}
      </button>
      {rozbaleno && (
        <div className="prubeh-telo">
          {hledani?.map((q, i) => (
            <div key={`h${i}`} className="prubeh-dotaz">
              🔍 {q}
            </div>
          ))}
          {cteni?.map((u, i) => (
            <div key={`c${i}`} className="prubeh-dotaz">
              📄 {u}
            </div>
          ))}
          {uvaha && <div className="prubeh-uvaha">{uvaha}</div>}
        </div>
      )}
    </div>
  );
}

/** Dohledané zdroje. Ve výchozím stavu sbalené — bývají jich desítky. */
function Zdroje({ zdroje }: { zdroje: Zdroj[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="prubeh zdroje-box">
      <button className="prubeh-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className={`prubeh-sip ${open ? 'open' : ''}`}>▸</span>
        Dohledané zdroje ({zdroje.length})
      </button>
      {open && (
        <div className="prubeh-telo">
          <ol className="zdroje-list">
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
      )}
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
