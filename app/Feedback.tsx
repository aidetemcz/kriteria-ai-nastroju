'use client';

import { useEffect, useRef, useState } from 'react';

export interface FeedbackContext {
  typ: 'obecná' | 'k odpovědi';
  skupina?: string;
  dotaz?: string;
  odpoved?: string;
}

export function FeedbackModal({ ctx, onClose }: { ctx: FeedbackContext; onClose: () => void }) {
  const [text, setText] = useState('');
  const [autor, setAutor] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    taRef.current?.focus();
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  async function submit() {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typ: ctx.typ,
          skupina: ctx.skupina ?? '',
          dotaz: ctx.dotaz ?? '',
          odpoved: ctx.odpoved ?? '',
          autor: autor.trim(),
          text: t,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Odeslání selhalo.' }));
        setError(err.error ?? 'Odeslání selhalo.');
        return;
      }
      setDone(true);
    } catch {
      setError('Spojení se serverem selhalo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fb-overlay" onClick={onClose}>
      <div className="fb-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="fb-head">
          <h2>{ctx.typ === 'k odpovědi' ? 'Připomínka k odpovědi' : 'Odeslat připomínku'}</h2>
          <button className="fb-close" onClick={onClose} aria-label="Zavřít">
            ×
          </button>
        </div>

        {done ? (
          <div className="fb-done">
            <p>Díky! Připomínka byla odeslána.</p>
            <button className="fb-submit" onClick={onClose}>
              Zavřít
            </button>
          </div>
        ) : (
          <>
            {ctx.typ === 'k odpovědi' && ctx.odpoved && (
              <div className="fb-context">
                <span className="fb-context-label">Připomínkovaná odpověď:</span>
                <div className="fb-context-text">
                  {ctx.odpoved.length > 280 ? ctx.odpoved.slice(0, 280) + '…' : ctx.odpoved}
                </div>
              </div>
            )}
            <label className="fb-label" htmlFor="fb-text">
              Vaše připomínka
            </label>
            <textarea
              id="fb-text"
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                ctx.typ === 'k odpovědi'
                  ? 'Co na této odpovědi sedí/nesedí? Bylo to věcně správně, srozumitelně, v souladu s katalogem?'
                  : 'Obecná připomínka k fungování chatbota — co funguje, co chybí, co byste změnili.'
              }
              rows={5}
            />
            <label className="fb-label" htmlFor="fb-autor">
              Jméno / e-mail <span className="fb-optional">(nepovinné)</span>
            </label>
            <input
              id="fb-autor"
              className="fb-input"
              value={autor}
              onChange={(e) => setAutor(e.target.value)}
              placeholder="ať víme, kdo připomínku poslal"
            />
            {error && <div className="fb-error">⚠️ {error}</div>}
            <div className="fb-actions">
              <button className="fb-cancel" onClick={onClose} disabled={busy}>
                Zrušit
              </button>
              <button className="fb-submit" onClick={submit} disabled={busy || !text.trim()}>
                {busy ? 'Odesílám…' : 'Odeslat připomínku'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
