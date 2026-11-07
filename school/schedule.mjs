export const children = { dima: 'Дима', danya: 'Даня' };
export const categories = { school: 'Школа / сад', club: 'Кружки', other: 'Прочее' };
export const schoolKinds = { school: 'Школа', lesson: 'Урок', aftercare: 'Продлёнка', kindergarten: 'Сад' };
export const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const today = (now = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(now);
export const weekday = date => new Date(date + 'T00:00:00Z').getUTCDay() || 7;
export const monday = date => addDays(date, 1 - weekday(date));
export const validDate = date => typeof date === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(date)
  && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && addDays(date, 0) === date;
export const validTime = time => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
export const minutes = time => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const timeOf = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
export const formatDate = (date, options = { day: 'numeric', month: 'long' }) =>
  new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' }).format(new Date(date + 'T00:00:00Z'));
export const normalizeTime = value => typeof value === 'string' ? value.slice(0, 5).padStart(5, '0') : '';

export function occurs(event, date) {
  if (date < event.date || (event.until && date > event.until)) return false;
  return event.weekdays.length ? event.weekdays.includes(weekday(date)) : date === event.date;
}

export function travelClock(time, delta) {
  const value = minutes(time) + delta;
  const day = Math.floor(value / 1440);
  return timeOf((value + 1440) % 1440) + (day < 0 ? ' накануне' : day > 0 ? ' на следующий день' : '');
}

export function loadMinutes(events) {
  const slots = events.filter(e => !e.tentative).map(e => [minutes(e.start_time), minutes(e.end_time)]).sort((a, b) => a[0] - b[0]);
  let total = 0, end = 0;
  for (const [start, nextEnd] of slots) {
    total += Math.max(0, nextEnd - Math.max(start, end));
    end = Math.max(end, nextEnd);
  }
  return total;
}

export function eventInput(value) {
  if (!value || typeof value !== 'object') throw Error('invalid_event');
  const title = typeof value.title === 'string' ? value.title.trim() : '';
  const { child, category, date, start_time, end_time } = value;
  const weekdays = value.weekdays ?? [];
  const until = value.until || null;
  const school_kind = category === 'school' ? value.school_kind || 'school' : null;
  const lesson = school_kind === 'lesson' && value.lesson != null ? Number(value.lesson) : null;
  const travelOut = value.travel_out ?? null, travelBack = value.travel_back ?? null;
  const travelOk = n => n === null || (Number.isInteger(n) && n >= 0 && n <= 360);
  if (!title || title.length > 120 || !Object.hasOwn(children, child) || !Object.hasOwn(categories, category)
    || !validDate(date) || !validTime(start_time) || !validTime(end_time) || start_time >= end_time
    || !Array.isArray(weekdays) || weekdays.length > 7 || weekdays.some(n => !Number.isInteger(n) || n < 1 || n > 7)
    || (until && (!weekdays.length || !validDate(until) || until < date))
    || (school_kind && !Object.hasOwn(schoolKinds, school_kind))
    || (lesson !== null && (!Number.isInteger(lesson) || lesson < 1 || lesson > 12))
    || !travelOk(travelOut) || !travelOk(travelBack)) throw Error('invalid_event');
  return {
    title, child, category, school_kind, lesson, date, start_time, end_time,
    weekdays: [...new Set(weekdays)].sort(), until,
    place: typeof value.place === 'string' ? value.place.trim().slice(0, 140) : '',
    note: typeof value.note === 'string' ? value.note.trim().slice(0, 300) : '',
    travel_out: travelOut, travel_back: travelBack, tentative: value.tentative === true,
  };
}
