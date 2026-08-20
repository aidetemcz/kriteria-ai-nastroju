import Anthropic from '@anthropic-ai/sdk';
import { getRezim, isRezimKod } from '@/lib/rezimy';
import { buildSystemPrompt } from '@/lib/prompt';

export const runtime = 'nodejs';
// Rešerše na webu + posouzení 38 kritérií je dlouhá odpověď. Na Vercelu vyžaduje
// plán s delším limitem funkcí; na Hobby se hodnota ořízne na 60 s.
export const maxDuration = 300;

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-5';
const MAX_TOKENS = 32000;
/** Server-side smyčka nástrojů může vrátit pause_turn — kolikrát ji smíme obnovit. */
const MAX_POKRACOVANI = 6;

/**
 * Hloubka uvažování modelu. Nižší úroveň znamená méně tokenů úvah, tedy nižší cenu
 * i kratší čekání — za cenu mělčího posouzení.
 */
const EFFORT_HODNOTY = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
type Effort = (typeof EFFORT_HODNOTY)[number];

function nactiEffort(): Effort {
  const x = process.env.ANTHROPIC_EFFORT;
  return EFFORT_HODNOTY.includes(x as Effort) ? (x as Effort) : 'high';
}

const EFFORT = nactiEffort();

function cislo(env: string | undefined, vychozi: number, max: number): number {
  const n = Number(env);
  return Number.isInteger(n) && n > 0 && n <= max ? n : vychozi;
}

/**
 * Rozpočet nástrojů. Model ho zná i z promptu, aby si rešerši rozvrhl.
 * Nesmí se exportovat — Next.js v route souboru povoluje jen vyhrazené exporty.
 */
const ROZPOCET = {
  hledani: cislo(process.env.ANTHROPIC_MAX_SEARCHES, 10, 30),
  cteni: cislo(process.env.ANTHROPIC_MAX_FETCHES, 10, 30),
};

/**
 * Volitelná lokalizace vyhledávání.
 *
 * Pozor: `country` musí být z podporovaného seznamu API a Česko v něm není —
 * hodnota "CZ" vrací 400 "Country code CZ is not supported". Proto je lokalizace
 * ve výchozím stavu vypnutá a české zdroje se řeší instrukcí v promptu.
 */
function nactiLokalizaci(): Anthropic.UserLocation | undefined {
  const country = process.env.ANTHROPIC_SEARCH_COUNTRY?.trim();
  const timezone = process.env.ANTHROPIC_SEARCH_TIMEZONE?.trim();
  if (!country && !timezone) return undefined;
  return {
    type: 'approximate',
    ...(country ? { country } : {}),
    ...(timezone ? { timezone } : {}),
  };
}

const lokalizace = nactiLokalizaci();

/** Vyhledávání najde stránku, čtení ji otevře. Bez druhého nástroje má model jen úryvky. */
const NASTROJE: Anthropic.ToolUnion[] = [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: ROZPOCET.hledani,
    ...(lokalizace ? { user_location: lokalizace } : {}),
  },
  {
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    max_uses: ROZPOCET.cteni,
    // Zásady ochrany údajů bývají dlouhé; strop drží náklady i latenci v mezích.
    max_content_tokens: 30000,
    citations: { enabled: true },
  },
];

/** Události posílané do prohlížeče jako NDJSON (jeden JSON objekt na řádek). */
type Udalost =
  /** Začíná nový textový blok — v rozhraní z něj bude samostatná bublina. */
  | { t: 'blok' }
  /** Textový blok skončil; model se vrací k práci, dokud nezačne další. */
  | { t: 'konec' }
  | { t: 'text'; d: string }
  | { t: 'uvaha'; d: string }
  | { t: 'hledani'; d: string }
  | { t: 'cteni'; d: string }
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
    system = buildSystemPrompt(rezim, ROZPOCET);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Chyba katalogu kritérií.' }, { status: 500 });
  }

  const hleda = getRezim(rezim)?.hleda ?? false;
  const client = new Anthropic();
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (u: Udalost) => controller.enqueue(encoder.encode(JSON.stringify(u) + '\n'));

      let vydanoText = false;
      let chybaOdeslana = false;
      const chyba = (d: string) => {
        chybaOdeslana = true;
        send({ t: 'chyba', d });
      };

      /**
       * Odstreamuje jedno volání API a vrátí hotovou zprávu.
       * Vstupy nástrojů (dotaz, URL) chodí po částech jako JSON — skládáme je
       * podle indexu bloku a čteme až po jeho dokončení.
       */
      async function tah(
        konverzace: Anthropic.MessageParam[],
        nastroje: Anthropic.ToolUnion[] | undefined,
      ): Promise<Anthropic.Message> {
        const castecnyVstup: Record<number, { jmeno: string; json: string }> = {};
        const textoveBloky = new Set<number>();

        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          thinking: { type: 'adaptive', display: 'summarized' },
          output_config: { effort: EFFORT },
          system,
          messages: konverzace,
          ...(nastroje ? { tools: nastroje } : {}),
        });

        for await (const event of stream) {
          if (event.type === 'content_block_start') {
            const blok = event.content_block;
            if (blok.type === 'text') {
              textoveBloky.add(event.index);
              send({ t: 'blok' });
            } else if (blok.type === 'server_tool_use') {
              castecnyVstup[event.index] = { jmeno: blok.name, json: '' };
            } else if (blok.type === 'web_search_tool_result') {
              // Úspěch vrací pole výsledků, chyba objekt — proto větvíme na Array.
              if (Array.isArray(blok.content)) {
                send({ t: 'zdroje', items: blok.content.map((v) => ({ title: v.title, url: v.url })) });
              } else {
                send({ t: 'hledani', d: popisLimitu(blok.content.error_code, 'vyhledávání') });
              }
            } else if (blok.type === 'web_fetch_tool_result') {
              if (blok.content.type === 'web_fetch_tool_result_error') {
                send({ t: 'cteni', d: popisLimitu(blok.content.error_code, 'čtení stránky') });
              }
            }
          } else if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if (delta.type === 'text_delta') {
              if (delta.text) vydanoText = true;
              send({ t: 'text', d: delta.text });
            } else if (delta.type === 'thinking_delta') {
              send({ t: 'uvaha', d: delta.thinking });
            } else if (delta.type === 'input_json_delta' && event.index in castecnyVstup) {
              castecnyVstup[event.index].json += delta.partial_json;
            }
          } else if (event.type === 'content_block_stop' && textoveBloky.has(event.index)) {
            textoveBloky.delete(event.index);
            send({ t: 'konec' });
          } else if (event.type === 'content_block_stop' && event.index in castecnyVstup) {
            const { jmeno, json } = castecnyVstup[event.index];
            delete castecnyVstup[event.index];
            if (jmeno === 'web_search') {
              const q = precistPole(json, 'query');
              if (q) send({ t: 'hledani', d: q });
            } else if (jmeno === 'web_fetch') {
              const url = precistPole(json, 'url');
              if (url) send({ t: 'cteni', d: url });
            }
          }
        }

        return stream.finalMessage();
      }

      try {
        const konverzace: Anthropic.MessageParam[] = [...apiMessages];
        const nastroje = hleda ? NASTROJE : undefined;
        let zprava: Anthropic.Message | null = null;

        for (let pokus = 0; pokus <= MAX_POKRACOVANI; pokus++) {
          zprava = await tah(konverzace, nastroje);

          if (zprava.stop_reason === 'refusal') {
            chyba(
              'Model tento dotaz odmítl zpracovat. Zkuste ho prosím přeformulovat — ' +
                'pomáhá popsat konkrétní nástroj a školní kontext.',
            );
            break;
          }

          // pause_turn = serverová smyčka nástrojů narazila na svůj limit iterací.
          // Pokračuje se přiložením rozpracované odpovědi zpět do konverzace, bez další
          // uživatelské zprávy — server sám pozná, že má navázat.
          if (zprava.stop_reason === 'pause_turn' && pokus < MAX_POKRACOVANI) {
            konverzace.push({ role: 'assistant', content: zprava.content });
            continue;
          }

          if (zprava.stop_reason === 'max_tokens') {
            chyba(
              'Odpověď dosáhla limitu délky. Můžete si vyžádat pokračování nebo rozbor po jednotlivých oblastech.',
            );
          }
          break;
        }

        // Pojistka: model může spotřebovat celý tah na rešerši a neodpovědět vůbec.
        // Pak ho vyzveme, ať posouzení sepíše z toho, co už nasbíral — bez nástrojů,
        // aby nemohl začít hledat znovu.
        if (!vydanoText && !chybaOdeslana && zprava) {
          konverzace.push({ role: 'assistant', content: zprava.content });
          konverzace.push({
            role: 'user',
            content:
              'Rešerše skončila — další hledání ani čtení stránek už není k dispozici. ' +
              'Napiš teď celé posouzení z toho, co ses dozvěděl. Co se nepodařilo ověřit, ' +
              'označ jako „nelze ověřit" a zařaď mezi otázky na dodavatele.',
          });
          const dopsani = await tah(konverzace, undefined);
          if (!vydanoText && dopsani.stop_reason !== 'refusal') {
            chyba('Odpověď se nepodařilo sestavit. Zkuste prosím dotaz zúžit na konkrétnější otázku.');
          }
        }
      } catch (err) {
        chyba(popisChyby(err));
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

/** Vytáhne textové pole z posbíraného JSON vstupu nástroje. Nekompletní JSON tiše ignoruje. */
function precistPole(json: string, klic: string): string | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && klic in parsed) {
      const v = (parsed as Record<string, unknown>)[klic];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
  } catch {
    // Model stihl poslat jen část vstupu — hodnotu prostě nezobrazíme.
  }
  return null;
}

function popisLimitu(kod: string, cinnost: string): string {
  if (kod === 'max_uses_exceeded') return `⚠️ vyčerpán limit pro ${cinnost}`;
  if (kod === 'too_many_requests') return `⚠️ ${cinnost} dočasně omezeno`;
  return `⚠️ ${cinnost} selhalo (${kod})`;
}

/**
 * Přeloží chybu do věty pro učitele. Plný technický detail jde do logu serveru
 * (na Vercelu Runtime Logs) — do rozhraní školy nepatří výpis JSONu z API.
 */
function popisChyby(err: unknown): string {
  console.error('[api/chat] selhalo generování odpovědi:', err);

  if (err instanceof Anthropic.RateLimitError) {
    return 'Služba je momentálně vytížená. Zkuste to prosím za chvíli znovu.';
  }
  if (err instanceof Anthropic.AuthenticationError) {
    return 'Chyba přihlášení k AI službě. Zkontrolujte nastavení ANTHROPIC_API_KEY.';
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return 'Spojení s AI službou selhalo. Zkuste to prosím znovu.';
  }
  if (err instanceof Anthropic.APIError) {
    if (err.status === 400) {
      return 'Požadavek se nepodařilo zpracovat kvůli chybě v nastavení aplikace. Podrobnosti jsou v logu serveru.';
    }
    if (typeof err.status === 'number' && err.status >= 500) {
      return 'AI služba je dočasně nedostupná. Zkuste to prosím za chvíli znovu.';
    }
    return 'Odpověď se nepodařilo vygenerovat. Podrobnosti jsou v logu serveru.';
  }
  return 'Odpověď se nepodařilo vygenerovat. Zkuste to prosím znovu.';
}
