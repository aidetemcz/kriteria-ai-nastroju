export const runtime = 'nodejs';

// Přijme připomínku z UI a přepošle ji do Google Sheetu (Apps Script web app).
// URL webhooku je v env FEEDBACK_WEBHOOK_URL — server→server, žádné CORS ani DB.

interface FeedbackBody {
  typ?: unknown;
  skupina?: unknown;
  dotaz?: unknown;
  odpoved?: unknown;
  text?: unknown;
  autor?: unknown;
}

function str(x: unknown, max = 8000): string {
  return typeof x === 'string' ? x.slice(0, max) : '';
}

export async function POST(req: Request): Promise<Response> {
  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url) {
    return Response.json(
      { error: 'Připomínky nejsou nakonfigurované (chybí FEEDBACK_WEBHOOK_URL).' },
      { status: 500 },
    );
  }

  let body: FeedbackBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  const text = str(body.text, 5000).trim();
  if (!text) {
    return Response.json({ error: 'Připomínka je prázdná.' }, { status: 400 });
  }

  const payload = {
    cas: new Date().toISOString(),
    typ: str(body.typ, 40) || 'obecná',
    skupina: str(body.skupina, 200),
    autor: str(body.autor, 200),
    text,
    dotaz: str(body.dotaz),
    odpoved: str(body.odpoved),
    userAgent: str(req.headers.get('user-agent'), 400),
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return Response.json({ error: 'Uložení připomínky selhalo.' }, { status: 502 });
    }
  } catch {
    return Response.json({ error: 'Spojení s úložištěm připomínek selhalo.' }, { status: 502 });
  }

  return Response.json({ ok: true });
}
