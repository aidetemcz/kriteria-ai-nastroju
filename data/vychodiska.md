# Východiska — proč kritéria vznikají

Zdroj: *Kritéria pro AI nástroje ve výuce*, Národní pedagogický institut ČR, červen 2026 (část A dokumentu).

## Co říká současný výzkum

Tři klíčové analýzy z let 2025–2026 docházejí ke konzistentnímu závěru: **stejný typ AI nástroje může
v jednom designu učení podporovat, v jiném mu vážně škodit.** Otázka, kterou tyto studie kladou, není,
zda má AI ve školách být, ale jak je nástroj postaven a jaké má zabudované ochrany.

**Brookings Institution** (Burns, Winthrop, Luther, Venetis, Karim, 2026) na základě ročního globálního
výzkumu (500+ respondentů z 50+ zemí, revize 400+ studií, expertní Delphi panel) uzavírá, že při
současné praxi rizika generativní AI ve vzdělávání převažují nad přínosy. Mnoho aktuálních AI nástrojů
pro děti přejímá designové vzorce sociálních sítí — gamifikaci založenou na FOMO, parasociální vazbu na
polidšťovanou AI personu, optimalizaci na čas strávený v aplikaci. Tyto vzorce u dětí poškozují
kognitivní, sociální a emocionální vývoj. Rámec Prosper-Prepare-Protect klade odpovědnost na úroveň
designu produktu, ne na učitele. Tento závěr vychází především z expertního konsenzu (Delphi panel)
a kvalitativních konzultací; tvrdou kauzální evidenci v dokumentu nesou experiment Bastani et al.
(PNAS 2025) a zjištění Stanford SCALE, že silné kauzální evidence je zatím málo.

**OECD Digital Education Outlook 2026** syntetizuje aktuální evidence o GenAI ve vzdělávání. Klíčový
experiment publikovaný v PNAS 2025 (Bastani et al.) testoval na turecké střední škole dvě varianty
stejné AI: obecný ChatGPT a „GPT Tutor", který kladl otázky a vedl žáka krok po kroku. Obecná verze
učení škodila — žáci s ní vyřešili o 48 % více cvičných úloh, ale na následném testu bez AI dosáhli
o 17 % horších výsledků než kontrolní skupina. Verze s pedagogickým designem tento destruktivní efekt
neměla. OECD pojmenovává jev jako **„iluzi kompetence"** a uzavírá, že rozdíl mezi nástrojem, který
učení podporuje, a nástrojem, který ho ničí, je v designu, ne v základní technologii.

**Stanford SCALE** (Fesler, Martinez Claeys, Agnew, Loeb, 2026) prošel přes 800 akademických prací
o AI ve vzdělávání K-12, z nichž jen 20 splňovalo kritéria silné kauzální evidence. Závěr: trh je
zaplaven nástroji, jejichž dopad na učení není ověřen, a školy nemají sdílený rámec, podle kterého by
mohly rozlišit nástroj podporující učení od marketingové aplikace.

## Potřeby

Pro MŠMT a NPI je tato sada kritérií zároveň pracovním podkladem pro vyhodnocování nově vznikajících
nástrojů. Doba tzv. vibecodingu (rychlé skládání aplikací s pomocí AI) snížila vstupní bariéru natolik,
že jednotlivec s několika hodinami práce dokáže postavit aplikaci nad obecným modelem a nabídnout ji
školám. Bez sdíleného rámce, podle kterého lze nástroj posoudit, nemůže škola, zřizovatel či vedení
školy odpovědně rozhodnout, který nástroj do školy patří. Vývojářům zároveň chybí vodítko, jak nástroje
navrhovat. Cílem těchto kritérií je tento rámec poskytnout.

---

# Klíčové pojmy

**AI Act.** Evropská regulace umělé inteligence (Nařízení EU 2024/1689) účinná od srpna 2024, postupně
se zavádí do roku 2027. Rozděluje AI systémy podle rizika a stanovuje povinnosti pro poskytovatele,
distributory i zavádějící subjekty. Pro vzdělávání jsou klíčové čl. 4 (gramotnost), čl. 5 (zakázané
praktiky včetně rozpoznávání emocí ve školách), čl. 13 (dokumentace), čl. 50 (transparentnost)
a čl. 53 (povinnosti obecných AI modelů).

**Cognitive offloading (kognitivní offloading).** Přenos kognitivní zátěže z lidské mysli na externí
nástroj — v běžném životě užitečný (kalendář, kalkulačka), u AI ve vzdělávání problematický, když
nahrazuje samotný učební proces. Předběžná studie MIT Media Lab (Kosmyna et al., 2025) naznačuje, že
83 % uživatelů ChatGPT nedokázalo bezprostředně citovat vlastní esej a neurální konektivita byla
snížena až o 55 %.

**Dark patterns (manipulativní vzorce).** Designové prvky uživatelského rozhraní, které záměrně
manipulují uživatele k jednání proti jeho zájmu: schované odhlášení, předvybrané souhlasy, falešná
nedostupnost obsahu, gamifikační smyčky FOMO, sociální leaderboardy. U dětských AI nástrojů obzvláště
rizikové.

**DPIA (Data Protection Impact Assessment).** Posouzení vlivu na ochranu osobních údajů — povinný proces
dle čl. 35 GDPR pro zpracování s vysokým rizikem, typicky pro data dětí.

**GDPR.** Obecné nařízení o ochraně osobních údajů (EU 2016/679). U dětí platí zvláštní ochrana dle
čl. 8 a recitálu 38.

**GPAI (General-Purpose AI Model).** Velký jazykový model schopný plnit širokou škálu úkolů (GPT-4,
Claude, Gemini). AI Act pro tyto modely stanovuje specifické povinnosti dle čl. 53.

**Halucinace AI.** Situace, kdy AI model produkuje text, který zní věrohodně, ale není pravdivý nebo
nemá oporu ve vstupních datech. U vzdělávacích nástrojů závažné riziko, protože žák často nemá způsob,
jak halucinaci rozpoznat.

**Iluze kompetence.** Stav, kdy uživatel AI má pocit, že úkol zvládl, ale samotné učení neproběhlo —
po odebrání AI nedokáže úkol vyřešit sám. OECD ji označuje za jedno z hlavních pedagogických rizik AI
ve vzdělávání. Doloženo experimentem Bastani et al. (PNAS 2025).

**Kognitivní brzdy (cognitive forcing functions).** Designové prvky, které zpomalují automatické
rozhodování a vyvolávají vědomé zpracování — například žádost o vlastní hypotézu před zobrazením
odpovědi AI, reflexivní otázky, upozornění na rozdíl mezi tím, co řekl model, a tím, co si myslí žák.

**Model card / system card.** Strukturovaný dokument popisující AI model nebo systém: k čemu je určen,
na čem byl trénován, jaké má známé limity, jaké chyby a halucinace produkuje, jaké jsou bezpečnostní
mechanismy. Mezinárodně standardizovaná praxe — Anthropic, OpenAI, Google publikují system cards pro
každou novou verzi modelu.

**Obecný konverzační chatbot.** Univerzální AI nástroj (ChatGPT, Gemini, Claude, Copilot) určený pro
širokou škálu úkolů — odpovídání na otázky, vysvětlování, psaní textů, shrnování, překlady, plánování.
Není navržen pro jednu konkrétní výukovou situaci: řídí se obecnými bezpečnostními pravidly, ale obvykle
nemá pevně daný vzdělávací cíl, roli učitele ani didaktický postup přizpůsobený konkrétní skupině žáků.
Některé verze nebo školní licence mohou nabízet funkce zaměřené na studium, které ale nemusí být určené
pro přímé použití ve výuce.

**Parasociální vazba (parasocial bonding).** Jednostranná emocionální vazba na osobu nebo entitu, která
ji neopětuje. U AI chatbotů a kamarádských asistentů jde o nový a obzvlášť intenzivní fenomén u dětí:
AI persona vytváří iluzi blízkého vztahu, která může nahrazovat reálné vztahy s vrstevníky, rodiči nebo
učiteli.

**RAG (Retrieval-Augmented Generation).** Architektonický přístup, kdy AI model před vytvořením odpovědi
vyhledá relevantní informace v externí databázi (kurátorovaný obsah, učebnice) a vychází z nich. Snižuje
halucinace a umožňuje citovat zdroje.

**Red teaming.** Systematické testování AI nástroje útoky a edge cases, které ho mají dovést k selhání —
jailbreak, halucinace, úniky dat, nevhodný obsah.

**Scaffolding (lešení učení).** Postupná, dočasná podpora, která žákovi pomáhá zvládnout úkol, jejž by
sám zatím nezvládl, a která se s rostoucí samostatností postupně odebírá. Úzce souvisí se zónou
nejbližšího vývoje. Kognitivní offloading vzniká mimo jiné tehdy, když je úkol nad aktuální úrovní žáka
— vhodně nastavený scaffolding tomu předchází.

**Schrems II.** Rozsudek Soudního dvora EU z roku 2020, který zpřísnil podmínky pro přenos osobních
údajů z EU do USA. Pro AI nástroje znamená, že pro přenos dat do USA (typicky API velkých AI
poskytovatelů) je nutné použít standardní smluvní doložky a doplňková opatření.

**SLM (Small Language Model).** Menší jazykový model (jednotky miliard parametrů), který lze často
provozovat lokálně nebo v privátním cloudu bez odesílání dat třetí straně. Výhoda: kontrola nad daty,
nižší náklady. Nevýhoda: nižší jazyková kvalita, zejména v menších jazycích jako čeština.

**Vysoce riziková AI.** Kategorie AI systémů dle AI Actu s nejpřísnějšími požadavky. Ve vzdělávacím
kontextu zahrnuje AI určující přístup ke vzdělávání, AI hodnotící vzdělávací výstupy s vlivem na průchod
vzděláváním, AI monitorující zakázané chování při zkouškách (proctoring). Tyto systémy jsou mimo rozsah
tohoto dokumentu.

**Výukový AI asistent.** AI nástroj (chatbot, průvodce úlohou, zpětnovazební asistent) navržený pro
podporu učení v konkrétní vzdělávací situaci. Na rozdíl od obecného konverzačního chatbota má vymezený
účel, nastavené chování a didaktický cíl: vede žáka při řešení úlohy, klade doplňující otázky, poskytuje
zpětnou vazbu, podporuje porozumění. Jeho fungování je vymezené a řízené tak, aby odpovídalo věku žáků,
výukovému cíli, školnímu kontextu a bezpečnému použití.

**XAI (Explainable AI).** Vysvětlitelná AI — souhrnný pojem pro techniky, které mají AI model učinit
srozumitelným pro člověka. U dnešních velkých jazykových modelů se dosahuje technikami jako citace
zdrojů, zobrazení postupu úvahy (chain-of-thought), upozornění na nejistotu nebo vysvětlení na vyžádání.

**Zero-data-retention politika.** Smluvní záruka, že poskytovatel AI modelu data odeslaná přes API
neuchovává a nepoužívá k tréninku nebo zlepšování modelu. Dostupná typicky v enterprise nebo edukačních
verzích služeb.

**Zóna nejbližšího vývoje (ZNV).** Pedagogický koncept Lva Vygotského: rozdíl mezi tím, co dítě umí samo,
a tím, co umí s pomocí kompetentnějšího partnera. Efektivní podpora se odehrává právě v této zóně —
v kontextu AI to znamená nástroj, který poskytuje postupné nápovědy místo hotových řešení.

---

# Klíčové zdroje a inspirace

## Výzkumy, přehledové studie a analýzy

- Brookings Institution (2026): *A New Direction for Students in an AI World — Prosper, Prepare, Protect*
- OECD (2026): *Digital Education Outlook*
- Stanford SCALE (2026): *The Evidence Base on AI in K-12*
- Bastani et al. (PNAS 2025): *Generative AI without guardrails can harm learning*
- UNESCO (2023): *Guidance for Generative AI in Education and Research*
- UK Department for Education: *Generative AI Product Safety Standards* — původně publikováno v lednu
  2025 pod názvem „Product Safety Expectations", v lednu 2026 přejmenováno a rozšířeno o standardy pro
  kognitivní rozvoj, emocionální a sociální rozvoj, duševní zdraví a manipulaci.

## Legislativní dokumenty

- Nařízení EU 2024/1689 (AI Act)
- Nařízení EU 2016/679 (GDPR); česká úprava: zákon č. 110/2019 Sb.
- Zákon č. 121/2000 Sb. (autorský zákon)
- Směrnice EU 2019/882 (Evropský akt o přístupnosti)
