/**
 * Path of Science — приймач заявок із сайту.
 * Кожна заявка: рядок у Google Таблиці + сповіщення в Telegram.
 *
 * Налаштування (Параметри проєкту → Властивості скрипта):
 *   TG_TOKEN — токен бота від @BotFather
 *   TG_CHAT  — id чату або групи, куди слати сповіщення
 * Якщо властивостей немає, заявки просто пишуться в таблицю.
 */
const COLS = ["sentAt", "id", "mode", "name", "channel", "contact", "uni", "year", "event", "role", "org", "position", "message", "page"];
const HEAD = ["Час", "Номер", "Тип", "Ім’я", "Канал", "Контакт", "Університет", "Курс", "Цікавить", "Роль", "Організація", "Посада", "Повідомлення", "Сторінка", "Статус"];
const MODES = { event: "Подія", team: "Команда", partner: "Партнерство" };

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return out({ ok: true });                       // спам-бот
    if (!d.name || !d.contact) return out({ ok: false, error: "empty" });

    const clean = v => String(v == null ? "" : v).slice(0, 2000).replace(/^[=+\-@]/, "'$&"); // захист від формул
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sh.getLastRow() === 0) { sh.appendRow(HEAD); sh.setFrozenRows(1); }
    sh.appendRow(COLS.map(c => c === "mode" ? (MODES[d.mode] || d.mode) : clean(d[c])).concat(["Нова"]));

    notify(d);
    return out({ ok: true, id: d.id });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function notify(d) {
  const p = PropertiesService.getScriptProperties();
  const token = p.getProperty("TG_TOKEN"), chat = p.getProperty("TG_CHAT");
  if (!token || !chat) return;
  const rows = [["Тип", MODES[d.mode]], ["Ім’я", d.name], [d.channel, d.contact], ["Університет", d.uni], ["Курс", d.year],
    ["Цікавить", d.event], ["Роль", d.role], ["Організація", d.org], ["Посада", d.position], ["Повідомлення", d.message]];
  const text = "Нова заявка " + d.id + "\n\n" + rows.filter(r => r[1]).map(r => r[0] + ": " + r[1]).join("\n");
  UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "post", muteHttpExceptions: true,
    payload: { chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: "true" }
  });
}

function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
