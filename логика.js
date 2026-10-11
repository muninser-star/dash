// Логика дашборда: чистые функции, без сети и DOM. Работает и в node (тесты), и в браузере (window.Dash).
(function (root, make) {
  if (typeof module === "object" && module.exports) module.exports = make();
  else root.Dash = make();
})(typeof self !== "undefined" ? self : this, function () {
  const MSK = 3 * 3600 * 1000;          // Москва = UTC+3, без перехода на летнее время
  const DAY = 86400000;
  const DOW_RU = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
  const DOW_KEY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const CHILD = { dima: "Дима", danya: "Даня", family: "Семья" };

  const ms = (v) => (v instanceof Date ? v.getTime() : new Date(v).getTime());
  // момент → московские день (число суток с 1970), минуты от полуночи, день недели 0=Пн
  function msk(v) {
    const t = ms(v) + MSK, day = Math.floor(t / DAY);
    return { day, min: Math.floor((t - day * DAY) / 60000), dow: (day + 3) % 7 };   // 1970-01-01 — четверг
  }
  const ymdToDay = (ymd) => Math.floor(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / DAY);
  const dayToYmd = (day) => new Date(day * DAY).toISOString().slice(0, 10);
  const hhmm = (min) => String(Math.floor(min / 60)).padStart(2, "0") + ":" + String(min % 60).padStart(2, "0");

  // ── Расписание детей (блок 3) ─────────────────────────────────────────────
  function childOf(ev) {
    if (ev && CHILD[ev.child]) return ev.child;
    const t = String((ev && ev.title) || "").trim().toLowerCase();
    if (t.startsWith("дима")) return "dima";
    if (t.startsWith("даня")) return "danya";
    return "family";
  }
  function untilText(min) {
    if (min < 1) return "сейчас";
    if (min < 60) return `через ${min} мин`;
    const h = Math.floor(min / 60), m = min % 60;
    return `через ${h} ч${m ? " " + m + " мин" : ""}`;
  }
  // now — момент, events — [{title, start, end, child?, place?}] (ISO со смещением; дата без времени — весь день)
  function scheduleView(now, events) {
    const n = ms(now), today = msk(n).day, out = { today: [], tomorrow: [] };
    for (const e of events || []) {
      const allDay = !String(e.start).includes("T");
      const s = allDay ? null : ms(e.start), en = allDay ? null : ms(e.end || e.start);
      const day = allDay ? ymdToDay(String(e.start)) : msk(s).day;
      const bucket = day === today ? out.today : day === today + 1 ? out.tomorrow : null;
      if (!bucket) continue;
      const row = { title: e.title, place: e.place || "", child: childOf(e), childName: CHILD[childOf(e)], start: e.start, allDay };
      if (allDay) { row.time = "весь день"; row.status = "later"; row.sort = -1; }
      else {
        row.time = hhmm(msk(s).min); row.sort = s;
        row.status = n >= en ? "past" : n >= s ? "now" : "later";
        row.inMin = Math.ceil((s - n) / 60000);
      }
      bucket.push(row);
    }
    out.today.sort((a, b) => a.sort - b.sort); out.tomorrow.sort((a, b) => a.sort - b.sort);
    const next = out.today.find((r) => r.status === "later" && !r.allDay);
    if (next) next.until = untilText(next.inMin);
    return out;
  }

  // ── Разбор таблицы «Неделя» из Дети/Секции и кружки.md ───────────────────
  function parseSeed(md) {
    const i = md.indexOf("## Неделя"); if (i < 0) return [];
    const lines = md.slice(i).split("\n").slice(1);
    const out = [];
    for (const line of lines) {
      if (/^## /.test(line)) break;
      if (!line.startsWith("|")) continue;
      const c = line.split("|").slice(1, -1).map((x) => x.trim());
      const dow = DOW_RU.indexOf(c[0]);
      if (dow < 0) continue;
      [["dima", c[1]], ["danya", c[2]]].forEach(([child, cell]) => {
        if (!cell || cell === "—") return;
        cell.split("·").forEach((part) => {
          const m = part.trim().match(/^(\d{1,2}):(\d{2})(?:\s*[–-]\s*(\d{1,2}):(\d{2}))?\s+(.+)$/);
          if (!m) return;
          const start = +m[1] * 60 + +m[2], end = m[3] ? +m[3] * 60 + +m[4] : null;
          let title = m[5].trim(), place = "";
          const p = title.match(/^(.*?)\s*\((.*)\)$/);
          if (p) { title = p[1]; place = p[2]; }
          title = title.charAt(0).toUpperCase() + title.slice(1);
          out.push({ child, title, place, dow, start, end, key: `${child}-${DOW_KEY[dow]}-${hhmm(start).replace(":", "")}` });
        });
      });
    }
    return out;
  }

  // ── Здоровье (блок 5): правила срока — те же, что exactDays/taskGroup в Медкнижка.html (ТЗ-025 блок 3)
  const MONTHS = [["январ", 0], ["феврал", 1], ["март", 2], ["апрел", 3], ["ма", 4], ["июн", 5], ["июл", 6], ["август", 7], ["сентябр", 8], ["октябр", 9], ["ноябр", 10], ["декабр", 11]];
  const NOW_RE = /не откладыв|срочно|сейчас|тем же заходом|идёт|идет/;
  function exactDays(str, today) {
    if (!str) return null;
    const s = String(str).toLowerCase(), t = ymdToDay(today);
    const d = (y, mo, dd) => Math.floor(Date.UTC(y, mo, dd) / DAY) - t;
    let m = s.match(/(\d{1,2})[.](\d{1,2})[.](\d{4})/); if (m) return d(+m[3], +m[2] - 1, +m[1]);
    m = s.match(/(\d{1,2})[.](\d{4})/); if (m) return d(+m[2], +m[1] - 1, 1);
    m = s.match(/([а-яё]{3,})\s+(\d{4})/);
    if (m) {
      const hit = MONTHS.find(([k]) => m[1].startsWith(k));
      if (hit) return d(+m[2], hit[1], /конц|конец/.test(s) ? 25 : /серед/.test(s) ? 15 : /начал/.test(s) ? 5 : 1);
    }
    if (NOW_RE.test(s)) return 0;
    return null;
  }
  function taskGroup(x, today) {
    const dated = x.kind === "soon" || x.due === true || x.merged === true;
    const days = dated ? exactDays(x.when, today) : null;
    if (days == null) return { group: "nodate", status: "Срок уточнить", days: null };
    const booked = x.tag === "записан";
    if (days < 0) return { group: "overdue", status: `Просрочено на ${-days} дн.`, days };
    if (days <= 30) return { group: "soon", days, status: booked ? "Записан" : days === 0 ? (NOW_RE.test(String(x.when).toLowerCase()) ? "Не откладывать" : "Сегодня") : days === 1 ? "Завтра" : `Через ${days} дн.` };
    return { group: "later", days, status: booked ? "Записан" : `Через ${days} дн.` };
  }
  // DATA медкнижки ({person:{short, attention:[{t,d,due}], soon:[{what,when,ok}]}}) → плоский список дел
  function healthItems(data) {
    const out = [];
    Object.keys(data || {}).forEach((p) => {
      const d = data[p] || {}, who = d.short || p, seen = new Set();
      (d.soon || []).forEach((x) => { seen.add(String(x.what).toLowerCase()); out.push({ person: p, who, title: x.what, kind: "soon", when: x.when, tag: x.ok ? "записан" : "" }); });
      (d.attention || []).forEach((a) => { if (!a.due || seen.has(String(a.t).toLowerCase())) return; out.push({ person: p, who, title: a.t, kind: "at", due: true, when: a.due }); });
    });
    return out;
  }
  // ключ дела — как в mk → task_state_set: нижний регистр, ё=е, пробелы схлопнуты, до 120 знаков
  const taskKey = (t) => String(t || "").toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim().slice(0, 120);
  // states: {"person|ключ": {s:"done"|"snooze", until:"ГГГГ-ММ-ДД"}}
  function healthCard(today, items, states, opts) {
    const o = Object.assign({ windowDays: 14, limit: 3, urgentDays: 3 }, opts);
    const rows = [];
    for (const x of items) {
      const st = (states || {})[x.person + "|" + taskKey(x.title)];
      if (st && (st.s === "done" || (st.s === "snooze" && st.until > today))) continue;
      const g = taskGroup(x, today);
      if (g.days == null || g.days > o.windowDays) continue;
      rows.push({ person: x.person, who: x.who, title: x.title, status: g.status, days: g.days, urgent: g.days <= o.urgentDays, group: g.group, key: x.person + "|" + x.title });
    }
    rows.sort((a, b) => a.days - b.days);
    return { rows: rows.slice(0, o.limit), total: rows.length, urgent: rows.some((r) => r.urgent) };
  }

  // ── Фильмы (блок 6) ──────────────────────────────────────────────────────
  const normTitle = (t, y) => String(t).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/g, " ").trim() + "|" + (y || "");
  function filterFilms(cands, seen, ctx) {
    const { mode, dow, rules } = ctx, r = rules.modes[mode] || rules.modes.family;
    const seenSet = new Set((seen || []).map((s) => normTitle(s.title, s.year)));
    const wk = dow >= 4 ? "weekend" : "weekday";                 // пт–вс — «выходной» лимит длительности
    const max = r.maxMinutes[wk] || r.maxMinutes.all;
    const banned = dow === 4 ? rules.fridayExcludeGenres.map((g) => g.toLowerCase()) : [];
    return (cands || []).filter((c) => {
      if (seenSet.has(normTitle(c.title, c.year))) return false;
      if (c.minutes && c.minutes > max) return false;
      if (r.ages && c.age != null && !r.ages.includes(c.age)) return false;
      if ((c.genres || []).some((g) => banned.includes(String(g).toLowerCase()))) return false;
      return true;
    });
  }
  function genreAvg(seen) {
    const by = {};
    (seen || []).forEach((s) => { const r = parseFloat(s.rating); if (!s.type || !(r > 0)) return; (by[s.type] = by[s.type] || []).push(r); });
    const out = {};
    Object.keys(by).forEach((g) => { out[g] = Math.round((by[g].reduce((a, b) => a + b, 0) / by[g].length) * 10) / 10; });
    return out;
  }
  function whyFacts(film, avg) {
    const g = (film.genres || [])[0], a = g && avg[g];
    return [film.minutes ? `${film.minutes} мин` : "", g || "", a ? `ваша средняя оценка жанра — ${String(a).replace(".", ",")}` : ""].filter(Boolean).join(" · ");
  }

  // ── Фокус дня (блок 7) ───────────────────────────────────────────────────
  // cards: {health:{urgent, empty}, kids:{empty}, film:{empty}}
  function focusOrder(now, cards) {
    const m = msk(now), h = Math.floor(m.min / 60), c = cards || {};
    let order;
    if (h >= 22 || h < 5) order = ["kids", "health", "film"];
    else if (h < 17) order = ["kids", "health", "film"];
    else if (m.dow >= 4) order = ["film", "kids", "health"];
    else order = ["kids", "film", "health"];
    const urgent = !!(c.health && c.health.urgent);
    if (urgent) order = ["health"].concat(order.filter((k) => k !== "health"));
    const night = h >= 22 || h < 5;
    const collapsed = order.filter((k) => (c[k] && c[k].empty) || (night && k !== "kids" && !(k === "health" && urgent)));
    return { order, urgent, collapsed, night };
  }

  return { childOf, scheduleView, parseSeed, exactDays, taskGroup, healthItems, healthCard, taskKey, normTitle, filterFilms, genreAvg, whyFacts, focusOrder, untilText, msk, hhmm, CHILD, DOW_RU };
});
