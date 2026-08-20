# Právní rámec a dozorové orgány — referenční přehled

**K čemu to je:** tohle je hotová znalost, kterou máš rovnou v kontextu. Znění a výklad norem,
role úřadů ani obsah varování NÚKIB **nedohledávej na webu** — je to tady. Rešeršní rozpočet
patří nástroji, který posuzuješ, ne legislativě.

Stav k srpnu 2026. U varování národních autorit platí, že seznam může být neúplný (viz níže).

---

## Normy, na které se kritéria odvolávají

### GDPR — Nařízení EU 2016/679

Česká úprava: **zákon č. 110/2019 Sb.**, o zpracování osobních údajů.

| Ustanovení | Co říká v kontextu školy a AI nástroje |
|---|---|
| čl. 5 | Zásady: účelové omezení, minimalizace, omezení uložení, integrita a důvěrnost |
| čl. 6 | Právní základ zpracování. Ve škole obvykle plnění právní povinnosti nebo úkol ve veřejném zájmu, ne souhlas |
| čl. 8 + recitál 38 | Zvláštní ochrana dětí. Práh digitálního souhlasu je v ČR **15 let** (§ 7 zákona č. 110/2019 Sb.) |
| čl. 12–22 | Práva subjektu údajů: informování, přístup, oprava, výmaz, přenositelnost, námitka |
| čl. 28 | Zpracovatelská smlouva (DPA) mezi školou jako správcem a dodavatelem jako zpracovatelem |
| čl. 33 a 34 | Ohlašování porušení zabezpečení. Zpracovatel informuje správce bez zbytečného odkladu, správce ÚOOÚ do 72 hodin |
| čl. 35 | DPIA — posouzení vlivu, povinné u vysokého rizika, typicky u dat dětí |
| čl. 44–50 (kapitola V) | Předávání do třetích zemí: standardní smluvní doložky (SCC), rozhodnutí o adekvátnosti, doplňková opatření |

**Schrems II** (rozsudek SDEU, 2020): pro přenos do USA nestačí samotné SCC, je třeba posoudit
i doplňková opatření. Praktický důsledek pro AI nástroje: u API amerických poskytovatelů modelů se
posuzuje celý smluvní řetězec, ne jen fyzické umístění serveru.

**Anonymizace vs. pseudonymizace:** pokud dodavatel tvrdí, že data před odesláním modelu anonymizuje,
je to relevantní pro čl. 44–50 — na skutečně anonymní data se GDPR nevztahuje. Ověřuj ale, zda jde
o anonymizaci (nevratnou), nebo jen pseudonymizaci (vratnou, stále osobní údaj). U chatbota je to
křehké: žák může identifikační údaje napsat přímo do zprávy. Ptej se, jak je ošetřen právě tento případ.

### AI Act — Nařízení EU 2024/1689

Účinný od srpna 2024, zavádí se postupně do roku 2027.

| Článek | Co říká |
|---|---|
| čl. 4 | AI gramotnost — povinnost poskytovatelů a zavádějících subjektů |
| čl. 5 | Zakázané praktiky. Pro školy zejména **zákaz odvozování emocí** (odst. 1 písm. f) |
| čl. 6 + příloha III | Klasifikace rizik. Vysoce rizikové ve vzdělávání: přístup ke vzdělávání, hodnocení výstupů s vlivem na průchod, proctoring |
| čl. 13 | Dokumentace a návod k použití: zamýšlený účel, vyloučené použití, přesnost, lidský dohled |
| čl. 14 | Lidský dohled u vysoce rizikových systémů |
| čl. 50 | Transparentnost: informování, že jde o AI (odst. 1), označení AI-generovaného obsahu (odst. 2 a 4) |
| čl. 53 | Povinnosti poskytovatelů obecných modelů (GPAI) |

Podle prozatímní dohody z 5/2026 (předpokládaná účinnost 2. 12. 2026) přibývá do čl. 5 zákaz AI
systémů generujících CSAM a nekonsenzuální intimní zobrazení.

### Další normy

- **Zákon č. 121/2000 Sb.** (autorský zákon) — tvořivé výstupy žáka jsou jeho dílo. Použití nástroje
  ve výuce samo o sobě nezakládá dodavateli právo je využít.
- **Směrnice EU 2019/882** (evropský akt o přístupnosti, EAA) a **2016/2102** — digitální přístupnost.
  Praktickým měřítkem je **WCAG 2.1 úroveň AA**.

---

## Kdo je v ČR příslušný

| Orgán | Působnost | Web |
|---|---|---|
| **ÚOOÚ** — Úřad pro ochranu osobních údajů | Dozor nad GDPR, ohlašování incidentů (72 h) | uoou.gov.cz |
| **NÚKIB** — Národní úřad pro kybernetickou a informační bezpečnost | Kybernetická bezpečnost, vydává **varování** před konkrétními technologiemi | nukib.gov.cz |
| **ČTU** — Český telekomunikační úřad | Dozorový orgán pro AI Act v ČR | ctu.gov.cz |
| **MŠMT** | Závazný výklad ve školské oblasti, spolu s ÚOOÚ/ČTU | msmt.gov.cz |
| **NPI ČR** — Národní pedagogický institut | Metodická podpora, autor těchto kritérií | npi.cz |

---

## Varování NÚKIB relevantní pro AI nástroje

Toto je podklad ke **kritériu 7.2** (dodavatel nepoužívá technologie, před nimiž varuje národní autorita).

| Datum | Čeho se týká |
|---|---|
| 10. 7. 2025 | **Produkty společnosti DeepSeek** — vysoká míra hrozby. Odesílání dat do ČLR, přístup třetích stran. Zákaz pro státní správu, doporučení nepoužívat i pro ostatní |
| 3. 9. 2025 | **Předávání dat do ČLR a vzdálená správa z území ČLR** — obecnější varování, dopadá na technologie s vazbou na Čínu |

**Jak s tím pracovat:** když posuzovaný nástroj staví na modelech od OpenAI, Anthropic, Google,
Microsoftu nebo Mety, žádné varování se ho podle dnešního stavu netýká — nehledej to. Rešerši
k varováním dělej jen tehdy, když nástroj používá čínský model (DeepSeek, Qwen, Kimi, GLM apod.),
model neznámého původu, nebo dodavatele s vazbou na rizikovou jurisdikci.

Seznam výše je k srpnu 2026 a nemusí být úplný. Když má škola pochybnost, odkaž ji na
nukib.gov.cz — sledování varování je podle kritéria 7.2 povinnost **dodavatele**, ne školy.
