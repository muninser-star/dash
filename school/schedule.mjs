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

export function dayClosure(date, ranges) {
  const matching = ranges.filter(range => range.date_from <= date && date <= range.date_to);
  const closed = matching.find(range => range.kind === 'vacation') || matching.find(range => range.kind === 'holiday');
  if (closed) return { date, kind: closed.kind, label: closed.label };
  if (weekday(date) > 5 && !matching.some(range => range.kind === 'workday')) {
    return { date, kind: 'weekend', label: 'Выходной' };
  }
  return null;
}

export function schoolBlocks(events) {
  const blocks = new Map();
  for (const event of events) {
    if (event.category !== 'school') continue;
    const kind = event.school_kind === 'kindergarten' ? 'kindergarten' : 'school';
    const key = event.child + '/' + kind;
    if (!blocks.has(key)) blocks.set(key, { kind, first: event, last: event, routeId: event.route_id });
    const block = blocks.get(key);
    if (event.start_time < block.first.start_time) block.first = event;
    if (event.end_time >= block.last.end_time) block.last = event;
    block.routeId ||= event.route_id;
  }
  return [...blocks.values()];
}

export function travelClock(time, delta) {
  const value = minutes(time) + delta;
  const day = Math.floor(value / 1440);
  return timeOf((value + 1440) % 1440) + (day < 0 ? ' накануне' : day > 0 ? ' на следующий день' : '');
}

export const departureTime = (start, travel) => travelClock(start, -(travel + 5));

export function timelineLanes(events, startMinute, hourHeight, minimumHeight) {
  const items = [];
  let groupStart = 0, groupEnd = 0, lanes = [];
  const finishGroup = () => {
    for (let i = groupStart; i < items.length; i++) items[i].lanes = lanes.length;
  };
  for (const event of events) {
    const start = minutes(event.start_time);
    const top = (start - startMinute) * hourHeight / 60;
    const height = Math.max(minimumHeight, (minutes(event.end_time) - start) * hourHeight / 60);
    if (top >= groupEnd) {
      finishGroup();
      groupStart = items.length;
      lanes = [];
    }
    const end = top + height;
    const free = lanes.findIndex(busyUntil => busyUntil <= top);
    const lane = free < 0 ? lanes.length : free;
    lanes[lane] = end;
    groupEnd = Math.max(groupEnd, end);
    items.push({ event, top, height, lane, lanes: 1 });
  }
  finishGroup();
  return items;
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
  const route = value.route_id === '' ? null : value.route_id ?? null;
  const travelOk = n => n === null || (Number.isInteger(n) && n >= 0 && n <= 360);
  if (!title || title.length > 120 || !Object.hasOwn(children, child) || !Object.hasOwn(categories, category)
    || !validDate(date) || !validTime(start_time) || !validTime(end_time) || start_time >= end_time
    || !Array.isArray(weekdays) || weekdays.length > 7 || weekdays.some(n => !Number.isInteger(n) || n < 1 || n > 7)
    || (until && (!weekdays.length || !validDate(until) || until < date))
    || (school_kind && !Object.hasOwn(schoolKinds, school_kind))
    || (lesson !== null && (!Number.isInteger(lesson) || lesson < 1 || lesson > 12))
    || !travelOk(travelOut) || !travelOk(travelBack)
    || (route !== null && (typeof route !== 'string' || !/^[a-z0-9_-]{1,32}$/.test(route)))) throw Error('invalid_event');
  return {
    title, child, category, school_kind, lesson, date, start_time, end_time,
    weekdays: [...new Set(weekdays)].sort(), until,
    place: typeof value.place === 'string' ? value.place.trim().slice(0, 140) : '',
    note: typeof value.note === 'string' ? value.note.trim().slice(0, 300) : '',
    travel_out: travelOut, travel_back: travelBack, tentative: value.tentative === true,
    ...(Object.hasOwn(value, 'route_id') ? { route_id: route } : {}),
  };
}
