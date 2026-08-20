# Poradce pro AI nástroje ve výuce

Konverzační poradce pro české školy: **je konkrétní AI nástroj vhodný do výuky?**

Chatbot posuzuje nástroje podle dokumentu **Kritéria pro AI nástroje ve výuce** (Národní pedagogický
institut ČR, červen 2026) — 7 oblastí, 38 kritérií ve třech úrovních závaznosti. Celý dokument má
v kontextu, takže neodpovídá z obecných znalostí, ale z konkrétních kritérií. U nástrojů, které
uživatel zvažuje, si navíc dělá rešerši na internetu a doporučuje alternativy, přednostně české.

Frontend i architektura vycházejí z chatbota
[podpůrná opatření](https://github.com/aidetemcz/podpurna-opatreni).

---

## Co chatbot umí

Levý panel nabízí čtyři režimy. Každý mění instrukce v system promptu, katalog kritérií zůstává stejný.

| Režim | Pro koho | Co dělá | Hledá na webu |
|---|---|---|---|
| **Posoudit konkrétní nástroj** | škola, která něco zvažuje | Dohledá o nástroji veřejné informace a projde ho proti všem 38 kritériím — tabulka po oblastech, souhrn podle úrovní, otázky na dodavatele | ano |
| **Najít vhodný nástroj** | škola, která hledá | Rešerše dostupných nástrojů podle popsané potřeby, s preferencí českých a evropských | ano |
| **Porozumět kritériím** | kdokoli | Vysvětlí jednotlivá kritéria a pojmy — výhradně z dokumentu, bez vyhledávání | ne |
| **Kontrola vlastního nástroje** | vývojáři edtech | Projde produkt z perspektivy „Pro vývojáře" a označí konkrétní mezery, seřazené podle závažnosti | ano |

Tlačítko **Prohlédnout všech 38 kritérií** otevře prohlížeč zdrojového dokumentu — uživatel si tak může
kdykoli ověřit, o co chatbot odpověď opírá.

### Tři úrovně závaznosti

Chatbot je nikdy nemíchá do jednoho průměru:

- ⚖️ **Zákonná podmínka** (11 kritérií) — plyne ze zákona, splnění není volitelné.
- 🔷 **Klíčové kritérium** (18) — NPI považuje za zásadní; nesplnění je signál pro vážné zvážení.
- 💡 **Doporučené kritérium** (9) — známka kvalitního produktu, nesplnění není překážkou.

### Co bylo v návrhu odpovědí nejdůležitější

**Rozlišení „nesplňuje" od „nelze ověřit".** Většina dodavatelů zpracovatelskou smlouvu, dobu uchování
dat ani testovací protokol veřejně nepublikuje. Kdyby chatbot chybějící informaci vyhodnotil jako
nesplněné kritérium, systematicky by poškozoval poctivé dodavatele a školy by dostávaly nepravdivý
obrázek. Prompt proto trvá na třech oddělených závěrech — ✅ splňuje / ❌ nesplňuje / ❓ nelze ověřit —
a z položek označených ❓ skládá seznam konkrétních otázek, které škola pošle dodavateli.

**Chatbot neuděluje certifikaci.** NPI výslovně říká, že kritéria nejsou podkladem pro plošnou ani
závaznou certifikaci, a dokument je zatím pracovní návrh k připomínkám. Výstup je proto formulován jako
podklad pro rozhodnutí školy, ne jako schválení nebo zamítnutí nástroje. Je to i vlastnost produktu:
chatbot, který by „schvaloval" nástroje jménem NPI, by tvrdil něco, k čemu nemá mandát.

**Preference češtiny má vysvětlené proč.** Kritéria 4.2 (funkční čeština a česká kulturní realita)
a 7.3 (sídlo v EU/EHP) dávají českým a evropským nástrojům věcnou výhodu. Prompt ale výslovně zakazuje
doporučit nástroj jen proto, že je český — pokud je nejlepší volbou zahraniční nástroj, chatbot to má
říct a vysvětlit.

---

## Architektura

```
data/kriteria.json      38 kritérií strukturovaně — jediný zdroj pravdy
data/vychodiska.md      část A dokumentu: výzkumná východiska, klíčové pojmy, zdroje
kriteria-pdf/           původní PDF od NPI (provenience)

lib/kriteria.ts         načtení + typy + render katalogu do promptu
lib/rezimy.ts           definice čtyř režimů
lib/prompt.ts           sestavení system promptu

app/page.tsx            chat, výběr režimu, průběh rešerše, zdroje
app/KriteriaPrehled.tsx prohlížeč všech 38 kritérií
app/api/chat/route.ts   streamování odpovědi, vyhledávání na webu
app/api/feedback/route.ts  sběr připomínek do Google Sheetu
```

`data/kriteria.json` je zdroj pravdy pro obojí — pro prompt i pro prohlížeč v UI. Kritéria se tedy nedají
rozejít mezi tím, co chatbot ví, a tím, co uživatel vidí.

### System prompt a cachování

System prompt má tři bloky v tomto pořadí:

1. **Role a pravidla** (~3,6 tis. znaků) — jak zacházet s fakty, jak psát, co je mimo rozsah.
2. **Zdrojový dokument** (~49 tis. znaků) — všechna kritéria a východiska. Tento blok nese
   `cache_control: ephemeral`.
3. **Instrukce režimu** (~2 tis. znaků) — mění se podle vybraného režimu.

Prompt caching je prefixový, takže velký neměnný blok musí být *před* proměnlivou částí. Bloky 1 a 2 jsou
bajt na bajt stejné pro všechny čtyři režimy i všechny tahy konverzace, takže se katalog kritérií načítá
z cache (~10 % ceny vstupu). Blok 3 se liší, ale je až za breakpointem, takže cache neruší.

### Vyhledávání na webu

Používá se serverový nástroj `web_search_20260209` s lokalizací na ČR — vyhledávání běží na infrastruktuře
Anthropicu, aplikace nepotřebuje vlastní vyhledávací API. V režimu „Porozumět kritériím" se nástroj vůbec
nepřipojuje, protože tam má chatbot odpovídat jen z dokumentu.

Serverová smyčka vyhledávání může skončit stavem `pause_turn`, když narazí na limit iterací. Route ji
obnoví přiložením rozpracované odpovědi zpět do konverzace (až 4×), aby se dlouhá rešerše nezastavila
uprostřed.

### Streamování

Route posílá do prohlížeče **NDJSON** — jeden JSON objekt na řádek — aby uživatel viděl i to, co se děje
během několikaminutové rešerše:

| Událost | Význam |
|---|---|
| `{"t":"text","d":…}` | text odpovědi (přírůstkově) |
| `{"t":"uvaha","d":…}` | shrnutí úvah modelu |
| `{"t":"hledani","d":…}` | dotaz položený vyhledávači |
| `{"t":"zdroje","items":[…]}` | nalezené zdroje (titulek + URL) |
| `{"t":"chyba","d":…}` | chyba k zobrazení uvnitř zprávy |

V UI se z toho skládá rozbalovací panel „Rešerše" nad odpovědí a seznam dohledaných zdrojů pod ní.

---

## Spuštění

```bash
npm install
cp .env.example .env.local     # doplň ANTHROPIC_API_KEY
npm run dev
```

Ověření před nasazením:

```bash
npm run typecheck
npm run build
```

### Proměnné prostředí

| Proměnná | Povinná | Výchozí | Popis |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ano | — | Klíč k Anthropic API |
| `ANTHROPIC_MODEL` | ne | `claude-opus-5` | Pro provoz s velkým objemem dotazů lze přepnout na `claude-sonnet-5` |
| `FEEDBACK_WEBHOOK_URL` | ne | — | Google Apps Script pro sběr připomínek (viz `docs/pripominky-apps-script.md`). Bez ní formulář připomínek vrací chybu. |

### Nasazení na Vercel

Framework se detekuje automaticky. Nastav proměnné prostředí v projektu (ne do gitu).

`app/api/chat/route.ts` má `maxDuration = 300`, protože rešerše nástroje a posouzení 38 kritérií trvá
déle než minutu. **Na tarifu Hobby se limit ořízne na 60 s** a dlouhé rešerše se utnou uprostřed — pro
produkční provoz je potřeba tarif s delším limitem funkcí, nebo snížit `max_uses` u vyhledávání.

---

## Aktualizace kritérií

Zdrojový dokument je pracovní návrh a bude se měnit. Po vydání nové verze:

1. Ulož nové PDF do `kriteria-pdf/`.
2. Uprav `data/kriteria.json` — struktura je `oblasti[].kriteria[]` s poli `id`, `nazev`, `uroven`
   (`zakonna` / `klicove` / `doporucene`), volitelně `odkaz` a `poznamka`, dále `proVyvojare` a `veVyuce`.
3. Aktualizuj `meta.pocty` a `meta.datum`; při změně části A i `data/vychodiska.md`.
4. `npm run build` — prompt i prohlížeč kritérií se přegenerují z JSONu, nic dalšího se needituje.

Pozor na `meta.status`: dokud je dokument pracovní návrh, musí to z něj být znát, protože se to promítá
do formulace závěrů.

---

## Známá omezení

- **Kvalita posouzení stojí na tom, co je veřejné.** U nástrojů bez veřejné dokumentace bude většina
  kritérií označena ❓. To je korektní výsledek, ale škole sám o sobě nestačí — musí se doptat dodavatele.
- **Chatbot je sám AI nástroj a může se mýlit.** UI to říká na úvodní obrazovce a v patičce panelu.
- **Rozsah dokumentu je užší, než uživatelé čekají.** Kritéria pokrývají nástroje, které používají přímo
  žáci — ne nástroje výhradně pro učitele, ne školní administrativu, ne vysoce rizikové scénáře
  (přijímací řízení, klasifikace, proctoring). Chatbot je instruován to říct rovnou.
- **Živý provoz nebyl v této větvi ověřen** — v prostředí, kde vznikala, nebyl k dispozici Anthropic API
  klíč. Ověřeno bylo sestavení promptu, tvar odchozího požadavku, cachovatelnost prefixu, validace vstupů,
  streamování a chybové stavy. Kvalitu odpovědí je potřeba otestovat s reálným klíčem.

---

## Zdroj

Böhmová, I. a kol.: *Kritéria pro AI nástroje ve výuce — odborná kritéria pro online nástroje používané
ve výuce přímo žáky.* Národní pedagogický institut ČR, červen 2026. Pracovní návrh k diskuzi a vypořádání
připomínek. Na dokumentu se odbornými komentáři podíleli NPI ČR (Bořivoj Brdička), MŠMT (Jaroslava
Nováková, Veronika Fořtová, Lucie Gregůrková) a AI dětem (Cyril Brom, Pavel Kordík, Eva Nečasová,
Radovan Lupták).
