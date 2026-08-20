'use client';

import { useEffect, useState } from 'react';
import doc from '@/data/kriteria.json';

type UrovenKod = 'zakonna' | 'klicove' | 'doporucene';

/** Prohlížeč všech 38 kritérií — aby si uživatel mohl ověřit, o co chatbot odpověď opírá. */
export function KriteriaPrehled({ onClose }: { onClose: () => void }) {
  const [filtr, setFiltr] = useState<UrovenKod | 'vse'>('vse');
  const [otevrene, setOtevrene] = useState<string | null>(null);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const urovne = doc.urovne as { kod: string; nazev: string; znacka: string; popis: string }[];

  return (
    <div className="fb-overlay" onClick={onClose}>
      <div className="kr-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="fb-head">
          <h2>{doc.meta.nazev}</h2>
          <button className="fb-close" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </div>

        <p className="kr-meta">
          {doc.meta.vydavatel}, {doc.meta.datum} — <em>{doc.meta.status}</em>. {doc.meta.pocty.oblasti}{' '}
          oblastí, {doc.meta.pocty.celkem} kritérií.
        </p>

        <div className="kr-filtry">
          <button className={`kr-chip ${filtr === 'vse' ? 'on' : ''}`} onClick={() => setFiltr('vse')}>
            Vše ({doc.meta.pocty.celkem})
          </button>
          {urovne.map((u) => (
            <button
              key={u.kod}
              className={`kr-chip ur-${u.kod} ${filtr === u.kod ? 'on' : ''}`}
              onClick={() => setFiltr(u.kod as UrovenKod)}
              title={u.popis}
            >
              {u.znacka} {u.nazev}
            </button>
          ))}
        </div>

        <div className="kr-body">
          {doc.oblasti.map((o) => {
            const viditelna = o.kriteria.filter((k) => filtr === 'vse' || k.uroven === filtr);
            if (viditelna.length === 0) return null;
            return (
              <section key={o.kod} className="kr-oblast">
                <h3>
                  {o.cislo}. {o.nazev}
                </h3>
                <p className="kr-oblast-popis">{o.popis}</p>
                {viditelna.map((k) => {
                  const u = urovne.find((x) => x.kod === k.uroven);
                  const open = otevrene === k.id;
                  return (
                    <div key={k.id} className={`kr-item ur-${k.uroven}`}>
                      <button
                        className="kr-item-head"
                        onClick={() => setOtevrene(open ? null : k.id)}
                        aria-expanded={open}
                      >
                        <span className="kr-id">{k.id}</span>
                        <span className="kr-nazev">{k.nazev}</span>
                        <span className="kr-uroven" title={u?.nazev}>
                          {u?.znacka}
                        </span>
                      </button>
                      {open && (
                        <div className="kr-detail">
                          {'odkaz' in k && k.odkaz && (
                            <p className="kr-odkaz">
                              <strong>Právní odkaz:</strong> {k.odkaz}
                            </p>
                          )}
                          <p>
                            <strong>Pro vývojáře:</strong> {k.proVyvojare}
                          </p>
                          <p>
                            <strong>Ve výuce:</strong> {k.veVyuce}
                          </p>
                          {'poznamka' in k && k.poznamka && (
                            <p className="kr-pozn">
                              <strong>Poznámka:</strong> {k.poznamka}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
