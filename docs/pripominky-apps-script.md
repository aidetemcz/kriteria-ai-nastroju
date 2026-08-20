# Sběr připomínek do Google Sheetu (bez databáze)

Připomínky z prototypu (tlačítko „Odeslat připomínku" vpravo nahoře a „Připomínkovat odpověď" pod každou odpovědí) se ukládají jako řádky do Google Sheetu. Appka je **neposílá do Sheetu přímo** — pošle je na vlastní endpoint `/api/feedback`, který je server-to-server přepošle do **Google Apps Script web app**. Díky tomu není potřeba databáze, řeší se tím CORS a URL webhooku se neukazuje v prohlížeči.

## 1. Vytvoř Sheet

1. Založ nový Google Sheet (např. „Připomínky — prototyp KPO").
2. Do prvního řádku dej hlavičky (nepovinné, ale ať se to čte):

   | čas | typ | skupina | autor | připomínka | dotaz učitele | odpověď chatbota | user agent |
   |---|---|---|---|---|---|---|---|

## 2. Přidej Apps Script

V Sheetu **Rozšíření → Apps Script** a vlož tento kód (přepiš výchozí `myFunction`):

```javascript
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // ať se souběžné zápisy nepřepíšou
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var d = JSON.parse(e.postData.contents);
    sheet.appendRow([
      d.cas || new Date().toISOString(),
      d.typ || '',
      d.skupina || '',
      d.autor || '',
      d.text || '',
      d.dotaz || '',
      d.odpoved || '',
      d.userAgent || ''
    ]);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

## 3. Nasaď jako web app

1. **Nasadit → Nové nasazení → typ: Webová aplikace.**
2. *Spouštět jako:* já (tvůj účet).
3. *Kdo má přístup:* **Kdokoli** (bez toho nemůže náš server zapisovat).
4. Nasaď, odsouhlas oprávnění a **zkopíruj URL** (`https://script.google.com/macros/s/…/exec`).

## 4. Vlož URL do prostředí

- **Vercel:** Settings → Environment Variables → `FEEDBACK_WEBHOOK_URL` = ta URL. Redeploy.
- **Lokálně:** do `.env.local` řádek `FEEDBACK_WEBHOOK_URL=…`.

Hotovo. Každá odeslaná připomínka se objeví jako nový řádek v Sheetu.

## Poznámky

- Když `FEEDBACK_WEBHOOK_URL` není nastavená, appka připomínku neodešle a v okně ukáže chybu „Připomínky nejsou nakonfigurované" — samotný chat funguje dál.
- Když upravíš Apps Script, musíš vytvořit **nové nasazení** (nebo aktualizovat stávající), jinak se změny neprojeví.
- Sheet je tabulka jako každá jiná — dá se filtrovat, komentovat, přidat sloupec „vyřešeno" apod.
