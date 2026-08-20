// Režimy práce chatbota. Každý režim mění instrukce v system promptu i uvítací obrazovku,
// katalog kritérií zůstává vždy stejný (a tím pádem cachovatelný).
export type RezimKod = 'posoudit' | 'najit' | 'porozumet' | 'vyvojar';

export interface Rezim {
  kod: RezimKod;
  nazev: string;
  /** Krátký popis do levého panelu. */
  popis: string;
  /** Delší uvedení na uvítací obrazovce. */
  uvod: string;
  /** Nápověda do prázdného vlákna. */
  napoveda: string;
  /** Ukázkové dotazy — klik je vloží do pole zprávy. */
  priklady: string[];
  /** Zda má režim ve výchozím stavu hledat na internetu. */
  hleda: boolean;
}

export const REZIMY: Rezim[] = [
  {
    kod: 'posoudit',
    nazev: 'Posoudit konkrétní nástroj',
    popis: 'Vyhovuje nástroj, který zvažujeme?',
    uvod:
      'Napište, jaký AI nástroj zvažujete. Dohledám o něm veřejně dostupné informace a projdu ho ' +
      'proti všem 38 kritériím NPI — oblast po oblasti, se zdroji a s jasným rozlišením mezi „kritérium ' +
      'nesplňuje" a „z veřejných zdrojů to nejde ověřit".',
    napoveda:
      'Napište název nástroje (ideálně i odkaz na jeho web) a pro jaké žáky ho zvažujete — věk/stupeň, ' +
      'předmět, k čemu by sloužil. Čím konkrétnější kontext, tím použitelnější posouzení.',
    priklady: [
      'Zvažujeme Khanmigo pro druhý stupeň v matematice. Vyhovuje kritériím NPI?',
      'Můžeme dát žákům 8. třídy běžný ChatGPT na psaní slohu?',
      'Posuďte Umíme to (umimeto.org) pro první stupeň.',
      'Chceme nasadit Duolingo for Schools v hodinách angličtiny na SŠ.',
    ],
    hleda: true,
  },
  {
    kod: 'najit',
    nazev: 'Najít vhodný nástroj',
    popis: 'Co doporučujete pro naši situaci?',
    uvod:
      'Popište, co ve výuce potřebujete. Udělám rešerši dostupných nástrojů, přednostně českých ' +
      'a evropských, a doporučím ty, které nejlépe odpovídají kritériím NPI — včetně toho, co u nich ' +
      'zbývá ověřit u dodavatele.',
    napoveda:
      'Popište situaci: jaký předmět a ročník, co má nástroj dělat, jaké máte vybavení a jaká je vaše ' +
      'představa o rozpočtu. Doporučím konkrétní nástroje a vysvětlím, jak si u nich stojí proti kritériím.',
    priklady: [
      'Hledáme český nástroj na procvičování češtiny pro 6.–9. třídu.',
      'Potřebujeme AI tutora na matematiku pro SŠ, data musí zůstat v EU.',
      'Co doporučujete pro výuku programování na druhém stupni?',
      'Chceme nástroj pro žáky s dyslexií na čtení s porozuměním.',
    ],
    hleda: true,
  },
  {
    kod: 'porozumet',
    nazev: 'Porozumět kritériím',
    popis: 'Co které kritérium znamená?',
    uvod:
      'Zeptejte se na kterékoli z 38 kritérií — vysvětlím, co znamená v praxi, odkud plyne a jak si ' +
      'jeho splnění ověřit u dodavatele. Odpovídám výhradně z dokumentu NPI.',
    napoveda:
      'Zeptejte se na konkrétní kritérium, oblast nebo pojem. Můžete se také ptát prakticky — co si ' +
      'vyžádat od dodavatele, na co se ptát před podpisem smlouvy, co musí řešit škola a co vývojář.',
    priklady: [
      'Co přesně znamená zákaz biometrického rozpoznávání emocí?',
      'Jaká kritéria jsou zákonné podmínky a co se stane, když je nástroj nesplní?',
      'Co si máme vyžádat od dodavatele před nasazením do výuky?',
      'Vysvětlete rozdíl mezi obecným chatbotem a výukovým AI asistentem.',
    ],
    hleda: false,
  },
  {
    kod: 'vyvojar',
    nazev: 'Kontrola vlastního nástroje',
    popis: 'Pro vývojáře: kde má náš produkt mezery?',
    uvod:
      'Popište svůj produkt a projdu ho proti kritériím z perspektivy „Pro vývojáře" — co je potřeba ' +
      'doložit, co dopracovat a co stačí popsat v dokumentaci. Kritéria NPI cílí primárně právě na vývojáře.',
    napoveda:
      'Popište produkt: co dělá, pro jakou věkovou skupinu, nad jakým modelem stojí, jak nakládáte ' +
      's daty a co už máte zdokumentované. Projdu s vámi kritéria a označím konkrétní mezery.',
    priklady: [
      'Stavíme chatbota na procvičování dějepisu pro 2. stupeň nad GPT-5. Kde máme mezery?',
      'Co musí obsahovat model card pro malý český edtech produkt?',
      'Jak doložit bezpečnostní testování, když jsme tříčlenný tým?',
      'Jaká dokumentace podle AI Actu je potřeba pro výukového asistenta?',
    ],
    hleda: true,
  },
];

export function isRezimKod(x: unknown): x is RezimKod {
  return typeof x === 'string' && REZIMY.some((r) => r.kod === x);
}

export function getRezim(kod: string): Rezim | undefined {
  return REZIMY.find((r) => r.kod === kod);
}
