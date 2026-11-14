/**
 * Path of Science — приймач заявок із сайту.
 * Кожна заявка: рядок у Google Таблиці + повідомлення в Telegram-групу.
 *
 * Три рядки нижче — усе, що треба змінювати.
 * У публічному репозиторії токен НЕ зберігається: справжній живе лише в проєкті Apps Script.
 */
const TG_TOKEN = "ВСТАВ_ТОКЕН_БОТА";
const TG_CHAT  = "ВСТАВ_ID_ГРУПИ";
const SHEET_ID = "ВСТАВ_ID_ТАБЛИЦІ";

const COLS = ["sentAt", "id", "mode", "name", "channel", "contact", "uni", "year", "event", "org", "position", "message", "page"];
const HEAD = ["Час", "Номер", "Тип", "Ім’я", "Канал", "Контакт", "Університет", "Курс", "Цікавить", "Організація", "Посада", "Повідомлення", "Сторінка", "Статус"];
const MODES = { event: "Подія", partner: "Співпраця" };

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return out({ ok: true });                       // спам-бот заповнив приховане поле
    if (!d.name || !d.contact) return out({ ok: false, error: "empty" });

    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try {
      const clean = v => String(v == null ? "" : v).slice(0, 2000).replace(/^[=+\-@]/, "'$&"); // захист від формул
      const sh = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
      if (sh.getLastRow() === 0) sh.appendRow(HEAD);
      sh.setFrozenRows(1);
      sh.appendRow(COLS.map(c => c === "mode" ? (MODES[d.mode] || d.mode) : clean(d[c])).concat(["Нова"]));
    } finally { lock.releaseLock(); }

    notify(d);
    return out({ ok: true, id: d.id });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

/* Відкрий адресу веб-застосунку в браузері: має показати {"ok":true,"alive":true} */
function doGet() { return out({ ok: true, alive: true }); }

function notify(d) {
  if (!TG_TOKEN || TG_TOKEN.indexOf("ВСТАВ") === 0) return;
  const h = s => String(s || "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const contact = d.channel === "Telegram" ? "@" + String(d.contact).replace(/^@|^https?:\/\/t\.me\//, "") : d.contact;
  const rows = [["Тип", MODES[d.mode] || d.mode], ["Ім’я", d.name], [d.channel, contact], ["Університет", d.uni], ["Курс", d.year],
    ["Цікавить", d.event], ["Організація", d.org], ["Посада", d.position], ["Повідомлення", d.message]];
  const text = "<b>Нова заявка " + h(d.id) + "</b>\n\n" + rows.filter(r => r[1]).map(r => "<b>" + h(r[0]) + ":</b> " + h(r[1])).join("\n") +
    '\n\n<a href="https://docs.google.com/spreadsheets/d/' + SHEET_ID + '">Відкрити таблицю заявок</a>';
  UrlFetchApp.fetch("https://api.telegram.org/bot" + TG_TOKEN + "/sendMessage", {
    method: "post", muteHttpExceptions: true,
    payload: { chat_id: TG_CHAT, text: text.slice(0, 4000), parse_mode: "HTML", disable_web_page_preview: "true" }
  });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
