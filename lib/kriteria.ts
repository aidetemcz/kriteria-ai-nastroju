import fs from 'node:fs';
import path from 'node:path';

/** Tři úrovně závaznosti podle části A dokumentu NPI. */
export type UrovenKod = 'zakonna' | 'klicove' | 'doporucene';

export interface Uroven {
  kod: UrovenKod;
  nazev: string;
  znacka: string;
  barva: string;
  popis: string;
  dopadNaVerdikt: string;
}

export interface Kriterium {
  id: string;
  nazev: string;
  uroven: UrovenKod;
  /** Odkaz na právní normu — jen u zákonných podmínek. */
  odkaz?: string;
  proVyvojare: string;
  veVyuce: string;
  poznamka?: string;
}

export interface Oblast {
  cislo: number;
  kod: string;
  nazev: string;
  popis: string;
  kriteria: Kriterium[];
}

export interface KriteriaDokument {
  meta: {
    nazev: string;
    podtitul: string;
    vydavatel: string;
    datum: string;
    status: string;
    autorka: string;
    spolupracovali: string[];
    pocty: { celkem: number; zakonna: number; klicove: number; doporucena: number; oblasti: number };
  };
  rozsah: { pokryva: string[]; nepokryva: string[]; poznamka: string; roleNPI: string };
  urovne: Uroven[];
  oblasti: Oblast[];
}

const DATA_DIR = path.join(process.cwd(), 'data');

let cached: KriteriaDokument | null = null;

/** Načte strukturovaná kritéria z data/kriteria.json (jednou za běh procesu). */
export function loadKriteria(): KriteriaDokument {
  if (!cached) {
    cached = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'kriteria.json'), 'utf-8')) as KriteriaDokument;
  }
  return cached;
}

/** Načte část A dokumentu — východiska, klíčové pojmy, zdroje. */
export function loadVychodiska(): string {
  return fs.readFileSync(path.join(DATA_DIR, 'vychodiska.md'), 'utf-8').trim();
}

export function vsechnaKriteria(doc: KriteriaDokument): Kriterium[] {
  return doc.oblasti.flatMap((o) => o.kriteria);
}

export function getUroven(doc: KriteriaDokument, kod: UrovenKod): Uroven {
  const u = doc.urovne.find((x) => x.kod === kod);
  if (!u) throw new Error(`Neznámá úroveň závaznosti: ${kod}`);
  return u;
}

/**
 * Vyrenderuje celý katalog kritérií do Markdownu pro vložení do system promptu.
 * Text je deterministický — proto se dá cachovat na straně Anthropic API.
 */
export function renderKriteriaProPrompt(doc: KriteriaDokument): string {
  const out: string[] = [];

  out.push(`# ${doc.meta.nazev}`);
  out.push(`*${doc.meta.podtitul}*`);
  out.push('');
  out.push(`- Vydavatel: ${doc.meta.vydavatel}`);
  out.push(`- Datum: ${doc.meta.datum}`);
  out.push(`- Status dokumentu: **${doc.meta.status}**`);
  out.push(`- Autorka: ${doc.meta.autorka}`);
  out.push(`- Připomínkovali: ${doc.meta.spolupracovali.join('; ')}`);
  out.push('');

  out.push('## Rozsah dokumentu');
  out.push(doc.rozsah.poznamka);
  out.push('');
  out.push('**Kritéria se vztahují na:**');
  for (const x of doc.rozsah.pokryva) out.push(`- ${x}`);
  out.push('');
  out.push('**Kritéria NEPOKRÝVAJÍ:**');
  for (const x of doc.rozsah.nepokryva) out.push(`- ${x}`);
  out.push('');
  out.push('**Role NPI ČR:** ' + doc.rozsah.roleNPI);
  out.push('');

  out.push('## Tři úrovně závaznosti');
  for (const u of doc.urovne) {
    out.push(`### ${u.znacka} ${u.nazev} (kód \`${u.kod}\`, barva v dokumentu: ${u.barva})`);
    out.push(u.popis);
    out.push(`*Dopad na posouzení:* ${u.dopadNaVerdikt}`);
    out.push('');
  }

  const p = doc.meta.pocty;
  out.push(
    `## Přehled: ${p.oblasti} oblastí, ${p.celkem} kritérií ` +
      `(${p.zakonna} zákonných podmínek, ${p.klicove} klíčových, ${p.doporucena} doporučených)`,
  );
  out.push('');

  for (const o of doc.oblasti) {
    out.push(`# Oblast ${o.cislo} — ${o.nazev}`);
    out.push(o.popis);
    out.push('');
    for (const k of o.kriteria) {
      const u = getUroven(doc, k.uroven);
      out.push(`## ${k.id} ${k.nazev}`);
      out.push(`**Úroveň:** ${u.znacka} ${u.nazev}`);
      if (k.odkaz) out.push(`**Právní odkaz:** ${k.odkaz}`);
      out.push('');
      out.push(`**Pro vývojáře:** ${k.proVyvojare}`);
      out.push('');
      out.push(`**Ve výuce:** ${k.veVyuce}`);
      if (k.poznamka) {
        out.push('');
        out.push(`**Poznámka:** ${k.poznamka}`);
      }
      out.push('');
    }
  }

  return out.join('\n').trim();
}
