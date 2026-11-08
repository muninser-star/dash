import { addDays, isHealthTitle, minutes, normalizeTime, timeOf, validDate, validTime } from './schedule.mjs?v=6';

const week = [
  'пн|понедельник(?:ам)?', 'вт|вторник(?:ам)?', 'ср|сред[ауы]|средам', 'чт|четверг(?:ам)?',
  'пт|пятниц[ауы]|пятницам', 'сб|суббот[ауы]|субботам', 'вс|вск|воскресень[ея]|воскресеньям',
];
const word = pattern => new RegExp('(?<![\\p{L}])(?:' + pattern + ')(?![\\p{L}])', 'iu');
const dayPatterns = week.map(word);
const childPatterns = { dima: word('дима|димы|диме'), danya: word('даня|дани|дане'), anya: word('аня|ани|ане|анна|анны|анне') };
const clear = line => line.replace(/^[\s,;|:–—\-•]+|[\s,;|:–—\-•]+$/g, '').replace(/\s{2,}/g, ' ').trim();
const lessonPattern = /(?:^|[^\d])(\d{1,2})(?:[-–]?(?:й|ый))?\s*(?:урок|ур\.)/iu;
const durationPattern = /(?:^|\s)(\d{1,3})\s*мин(?:ут[аы]?)?(?![\p{L}])/iu;
const datePattern = /\b(20\d{2}-\d{2}-\d{2})\b|\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/;
const timePattern = /(?<!\d)([0-2ОоOo]?[0-9ОоOo])\s*[:.;]\s*[‚‘']?\s*([0-5ОоOo][0-9ОоOo])(?!\d)/gu;
const timeFromMatch = match => normalizeTime((match[1] + ':' + match[2]).replace(/[ОоOo]/g, '0'));
const extractDate = match => match && (match[1] || match[4] + '-' + match[3].padStart(2, '0') + '-' + match[2].padStart(2, '0'));

function classify(title) {
  if (/продл[её]н/iu.test(title)) return { category: 'school', school_kind: 'aftercare' };
  if (/^(?:детский\s+)?сад(?:ик)?$/iu.test(title)) return { category: 'school', school_kind: 'kindergarten' };
  if (/^школа$/iu.test(title)) return { category: 'school', school_kind: 'school' };
  if (isHealthTitle(title)) return { category: 'health', school_kind: null };
  if (/музей|театр|выставк|экскурс/iu.test(title)) return { category: 'other', school_kind: null };
  return { category: 'club', school_kind: null };
}

export function parseSchedule(raw, anchor) {
  const events = [], bells = [], warnings = [];
  let child = '', date = '', weekdays = [], bellsOnly = false, missed = 0;
  const lines = raw.normalize('NFKC').split(/\r?\n/).map(clear).filter(Boolean).map(line =>
    line.replace(/^[Зз](?=\s*урок)/u, '3').replace(/^[IІl{|](?=\s*урок)/u, '1'));
  for (const line of lines) {
    if (/расписание\s+звонков/iu.test(line)) { bellsOnly = true; continue; }
    const foundChild = Object.keys(childPatterns).find(id => childPatterns[id].test(line));
    const foundDays = dayPatterns.flatMap((pattern, i) => pattern.test(line) ? [i + 1] : []);
    const dateMatch = line.match(datePattern);
    const relative = word('сегодня|завтра|послезавтра').exec(line);
    const foundDate = extractDate(dateMatch) || (relative && validDate(anchor) ?
      addDays(anchor, { сегодня: 0, завтра: 1, послезавтра: 2 }[relative[0].toLowerCase()]) : '');
    const lessonMatch = line.match(lessonPattern);
    const numbered = lessonMatch || (bellsOnly && line.match(/^\s*(\d{1,2})[.)\s]+(?=\D|\d{1,2}\s*[:.])/u));
    const lesson = numbered && Number(numbered[1]) >= 1 && Number(numbered[1]) <= 12 ? Number(numbered[1]) : null;
    const content = dateMatch ? line.replace(dateMatch[0], ' '.repeat(dateMatch[0].length)) : line;
    const times = [...content.matchAll(timePattern)].filter(match => validTime(timeFromMatch(match)));
    let start_time = times[0] ? timeFromMatch(times[0]) : '', end_time = times[1] ? timeFromMatch(times[1]) : '';
    const duration = Number(line.match(durationPattern)?.[1]);
    if (start_time && !end_time && duration > 0 && minutes(start_time) + duration < 1440) {
      end_time = timeOf(minutes(start_time) + duration);
    }
    if (lesson && (bellsOnly || (!foundDate && !foundDays.length && !date && !weekdays.length &&
      times.length > 0 && !clear(content.replace(lessonPattern, '').replace(timePattern, ''))))) {
      if (!start_time || !end_time || start_time >= end_time) missed++;
      if (bells.length < 12 && !bells.some(row => row.lesson === lesson)) bells.push({ lesson, start_time, end_time });
      continue;
    }
    if (bellsOnly) { missed++; continue; }
    const removeContext = value => {
      let cleaned = value.replace(datePattern, '').replace(durationPattern, '').replace(/^(?:[-–—•]|\d+[.)])\s*/, '');
      if (foundChild) cleaned = cleaned.replace(childPatterns[foundChild], '');
      if (relative) cleaned = cleaned.replace(word('сегодня|завтра|послезавтра'), '');
      if (foundDays.length) {
        for (const i of foundDays) cleaned = cleaned.replace(dayPatterns[i - 1], '');
        cleaned = cleaned.replace(new RegExp(word('и|по|в|во|каждый|каждую|неделю|еженедельно').source, 'giu'), ' ');
      }
      return clear(cleaned);
    };
    const first = times[0]?.index, last = times.at(-1);
    const before = removeContext(first === undefined ? content : content.slice(0, first));
    const after = last ? removeContext(content.slice(last.index + last[0].length)) : '';
    const hasContext = !!(foundChild || foundDays.length || foundDate);
    if (!before && !after && hasContext && !times.length && !lesson) {
      if (foundChild) child = foundChild;
      if (foundDays.length || foundDate) {
        weekdays = foundDate ? [] : foundDays;
        date = validDate(foundDate) ? foundDate : '';
      }
      continue;
    }
    if (!start_time && !lesson) {
      if (!/^(расписание|занятия|кружки)\b/iu.test(line)) missed++;
      continue;
    }
    const title = before || after || (lesson ? lesson + '-й урок' : '');
    if (!title) { missed++; continue; }
    const category = lesson ? { category: 'school', school_kind: 'lesson' } : classify(title);
    const eventDate = validDate(foundDate) ? foundDate : foundDays.length ? '' : date;
    events.push({
      title: title.slice(0, 120), child: foundChild || child, date: eventDate,
      weekdays: eventDate ? [] : foundDays.length ? foundDays : weekdays, lesson, ...category,
      start_time, end_time, place: before ? after.slice(0, 140) : '', note: '', travel_out: null, travel_back: null,
    });
    if (events.length === 40) break;
  }
  if (missed) warnings.push('Строк без распознанного времени или номера урока: ' + missed + '. Проверьте исходный текст.');
  if (events.length === 40) warnings.push('За один раз можно разобрать до 40 событий.');
  return { events, bells: bells.sort((a,b) => a.lesson-b.lesson), warnings };
}
