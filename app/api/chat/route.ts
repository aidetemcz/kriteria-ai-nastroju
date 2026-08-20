import Anthropic from '@anthropic-ai/sdk';
import { getRezim, isRezimKod } from '@/lib/rezimy';
import { buildSystemPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
// Rešerše na webu + posouzení 38 kritérií je dlouhá odpověď. Na Vercelu vyžaduje
// plán s delším limitem funkcí; na Hobby se hodnota ořízne na 60 s.
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const MAX_TOKENS = 32000;
/** Server-side smyčka vyhledávání může vrátit pause_turn — kolikrát ji smíme obnovit. */
const MAX_POKRACOVANI = 4;

/**
 * Hloubka uvažování modelu. Nižší úroveň znamená méně tokenů úvah, tedy nižší cenu
 * i kratší čekání — za cenu mělčího posouzení. Ladí se přes env, aby změna nákladů
 * nevyžadovala zásah do kódu.
 */
const EFFORT_HODNOTY = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORT_HODNOTY)[number];

function nactiEffort(): Effort {
  const x = process.env.ANTHROPIC_EFFORT;
  return EFFORT_HODNOTY.includes(x as Effort) ? (x as Effort) : 'high';
}

const EFFORT = nactiEffort();

/**
 * Kolikrát smí model během jedné odpovědi hledat na webu. Vyhledávání se účtuje
 * zvlášť, takže je to druhá páka na náklady.
 */
function nactiMaxHledani(): number {
  const n = Number(process.env.ANTHROPIC_MAX_SEARCHES);
  return Number.isInteger(n) && n > 0 && n <= 30 ? n : 12;
}

/** Nástroj vyhledávání na webu. Lokalizace na ČR zlepšuje relevanci českých zdrojů. */
const WEB_SEARCH: Anthropic.ToolUnion = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: nactiMaxHledani(),
  user_location: { type: 'approximate', country: 'CZ', timezone: 'Europe/Prague' },
};

/** Události posílané do prohlížeče jako NDJSON (jeden JSON objekt na řádek). */
type Udalost =
  | { t: 'text'; d: string }
  | { t: 'uvaha'; d: string }
  | { t: 'hledani'; d: string }
  | { t: 'zdroje'; items: { title: string; url: string }[] }
  | { t: 'chyba'; d: string };

export async function POST(req: Request): Promise<Response> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Chybí ANTHROPIC_API_KEY.' }, { status: 500 });
  }

  let body: { rezim?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Neplatné tělo požadavku.' }, { status: 400 });
  }

  const { rezim, messages } = body;
  if (!isRezimKod(rezim)) {
    return Response.json({ error: 'Neznámý nebo chybějící režim.' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: 'Prázdná konverzace.' }, { status: 400 });
  }

  const apiMessages: Anthropic.MessageParam[] = (messages as { role?: unknown; content?: unknown }[])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content as string }));

  if (apiMessages.length === 0) {
    return Response.json({ error: 'Prázdná konverzace.' }, { status: 400 });
  }

  let system: Anthropic.TextBlockParam[];
  try {
    system = buildSystemPrompt(rezim);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Chyba katalogu kritérií.' }, { status: 500 });
  }

  const hleda = getRezim(rezim)?.hleda ?? false;
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (u: Udalost) => controller.enqueue(encoder.encode(JSON.stringify(u) + '\n'));

      // Vstupy nástrojů (dotaz vyhledávače) přicházejí po částech jako JSON —
      // skládáme je podle indexu bloku a čteme až po jeho dokončení.
      let castecnyVstup: Record<number, string> = {};

      try {
        const konverzace: Anthropic.MessageParam[] = [...apiMessages];

        for (let pokus = 0; pokus <= MAX_POKRACOVANI; pokus++) {
          castecnyVstup = {};

          const stream = client.messages.stream({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            thinking: { type: 'adaptive', display: 'summarized' },
            output_config: { effort: EFFORT },
            system,
            messages: konverzace,
            ...(hleda ? { tools: [WEB_SEARCH] } : {}),
          });

          for await (const event of stream) {
            if (event.type === 'content_block_start') {
              const blok = event.content_block;
              if (blok.type === 'server_tool_use') {
                castecnyVstup[event.index] = '';
              } else if (blok.type === 'web_search_tool_result') {
                // Úspěch vrací pole výsledků, chyba objekt — proto větvíme na Array.
                if (Array.isArray(blok.content)) {
                  send({
                    t: 'zdroje',
                    items: blok.content.map((v) => ({ title: v.title, url: v.url })),
                  });
                } else {
                  send({ t: 'hledani', d: `vyhledávání selhalo (${blok.content.error_code})` });
                }
              }
            } else if (event.type === 'content_block_delta') {
              const delta = event.delta;
              if (delta.type === 'text_delta') {
                send({ t: 'text', d: delta.text });
              } else if (delta.type === 'thinking_delta') {
                send({ t: 'uvaha', d: delta.thinking });
              } else if (delta.type === 'input_json_delta' && event.index in castecnyVstup) {
                castecnyVstup[event.index] += delta.partial_json;
              }
            } else if (event.type === 'content_block_stop' && event.index in castecnyVstup) {
              const dotaz = precistDotaz(castecnyVstup[event.index]);
              delete castecnyVstup[event.index];
              if (dotaz) send({ t: 'hledani', d: dotaz });
            }
          }

          const zprava = await stream.finalMessage();

          if (zprava.stop_reason === 'refusal') {
            send({
              t: 'chyba',
              d:
                'Model tento dotaz odmítl zpracovat. Zkuste ho prosím přeformulovat — ' +
                'pomáhá popsat konkrétní nástroj a školní kontext.',
            });
            break;
          }

          // pause_turn = serverová smyčka vyhledávání narazila na svůj limit iterací.
          // Pokračuje se přiložením rozpracované odpovědi zpět do konverzace, bez další
          // uživatelské zprávy — server sám pozná, že má navázat.
          if (zprava.stop_reason === 'pause_turn' && pokus < MAX_POKRACOVANI) {
            konverzace.push({ role: 'assistant', content: zprava.content });
            continue;
          }

          if (zprava.stop_reason === 'pause_turn') {
            send({
              t: 'chyba',
              d: 'Rešerše byla delší, než dovoluje limit. Zkuste dotaz zúžit na konkrétnější otázku.',
            });
          } else if (zprava.stop_reason === 'max_tokens') {
            send({
              t: 'chyba',
              d: 'Odpověď dosáhla limitu délky. Můžete si vyžádat pokračování nebo rozbor po jednotlivých oblastech.',
            });
          }
          break;
        }
      } catch (err) {
        send({ t: 'chyba', d: popisChyby(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

/** Vytáhne dotaz z posbíraného JSON vstupu vyhledávače. Nekompletní JSON tiše ignoruje. */
function precistDotaz(json: string): string | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && 'query' in parsed) {
      const q = (parsed as { query: unknown }).query;
      if (typeof q === 'string' && q.trim()) return q.trim();
    }
  } catch {
    // Model stihl poslat jen část vstupu — dotaz prostě nezobrazíme.
  }
  return null;
}

function popisChyby(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) {
    return 'Služba je momentálně vytížená. Zkuste to prosím za chvíli znovu.';
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Chyba autentizace k API. Zkontrolujte ANTHROPIC_API_KEY.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Spojení s API selhalo. Zkuste to prosím znovu.';
  }
  if (err instanceof Anthropic.APIError) {
    return `Chyba API: ${err.message}`;
  }
  return err instanceof Error ? err.message : 'Chyba při generování odpovědi.';
}
