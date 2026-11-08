import { addDays, departureTime, isHealthTitle, minutes, participants, validDate } from '../../../school/schedule.mjs';

const moscow = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Moscow', dateStyle: 'short', timeStyle: 'short',
});
const localTitle = title => title.toLowerCase().replace(/ё/g, 'е').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const names = { дима: 'dima', даня: 'danya', аня: 'anya', анна: 'anya' };
const clubTitle = /^(?:бассейн|английский|гимнастика|футбол|лего[- ]конструирование)$/iu;

function calendarTime(value) {
  if (validDate(value)) return { date: value, time: '00:00', allDay: true };
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const [date, time] = moscow.format(timestamp).split(' ');
  return { date, time, allDay: false };
}

function occurrences(event, from, to) {
  const start = calendarTime(event.start);
  const end = calendarTime(event.end);
  if (!start || !end || !event.id || start.allDay !== end.allDay) return [];
  const endDate = end.time === '00:00' ? addDays(end.date, -1) : end.date;
  const name = String(event.title || '').trim();
  const namedPerson = /^(дима|даня|аня|анна|денис)[\s.,:·–—-]+/iu.exec(name);
  const nameKey = namedPerson?.[1].toLowerCase();
  if (localTitle(name) === 'офис' || nameKey === 'денис' || event.child === 'denis') return [];
  const child = names[nameKey] ?? (Object.hasOwn(participants, event.child) ? event.child : 'family');
  const title = (namedPerson ? name.slice(namedPerson[0].length) : name) || 'Событие';
  const category = isHealthTitle(title) ? 'health' : child !== 'family' && clubTitle.test(title) ? 'club' : 'other';
  const result = [];
  for (let date = start.date < from ? from : start.date; date <= endDate && date <= to; date = addDays(date, 1)) {
    const startTime = start.date === date ? start.time : '00:00';
    const endTime = end.date === date ? end.time : '24:00';
    if (endTime <= startTime) continue;
    result.push({
      id: 'google-' + event.id, source: 'google', all_day: start.allDay,
      title, child, category, occurrence: date,
      start_time: startTime, end_time: endTime, place: event.place || '',
      start: date + 'T' + startTime + ':00+03:00',
      end: endTime === '24:00' ? addDays(date, 1) + 'T00:00:00+03:00' : date + 'T' + endTime + ':00+03:00',
    });
  }
  return result;
}

export function mergeGoogleEvents(rows, google, from, to, routeMinutes) {
  const unmatched = new Set(rows);
  const imported = google.flatMap(event => occurrences(event, from, to)).map(event => {
    if (event.all_day || event.child === 'family') return event;
    let match, distance = 91;
    const title = localTitle(event.title);
    for (const row of unmatched) {
      if (row.child !== event.child || row.occurrence !== event.occurrence || row.category === 'school' || localTitle(row.title) !== title) continue;
      const shift = Math.abs(minutes(row.start_time) - minutes(event.start_time));
      if (shift >= distance) continue;
      match = row;
      distance = shift;
    }
    if (!match) return event;
    unmatched.delete(match);
    const travel = match.travel_out ?? routeMinutes.get(match.route_id);
    return {
      ...match, ...event,
      category: event.category === 'health' ? 'health' : match.category,
      place: event.place || match.place,
      tentative: false,
      departure_time: travel == null ? null : departureTime(event.start_time, travel),
    };
  });
  return [...unmatched, ...imported].sort((a, b) =>
    a.occurrence.localeCompare(b.occurrence) || a.start_time.localeCompare(b.start_time));
}
