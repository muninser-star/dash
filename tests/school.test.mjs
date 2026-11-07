import assert from 'node:assert/strict';
import test from 'node:test';
import { dayClosure, eventInput, loadMinutes, monday, occurs, today, travelClock } from '../school/schedule.mjs';
import { parseSchedule } from '../school/import.mjs';

const input = {
  title: 'Английский', child: 'dima', category: 'club', date: '2026-11-09',
  start_time: '18:40', end_time: '19:30', weekdays: [3, 1, 3], until: '2026-11-20',
};

test('weekly series is bounded by its effective dates and Moscow days', () => {
  const e = eventInput(input);
  assert.deepEqual(e.weekdays, [1, 3]);
  assert.equal(occurs(e, '2026-11-04'), false);
  assert.equal(occurs(e, '2026-11-11'), true);
  assert.equal(occurs(e, '2026-11-12'), false);
  assert.equal(occurs(e, '2026-11-23'), false);
  const date = today(new Date('2026-11-08T21:01:00Z'));
  assert.equal(date, '2026-11-09');
  assert.equal(monday(date), date);
});

test('day load excludes tentative events and counts overlapping school blocks once', () => {
  assert.equal(loadMinutes([
    { start_time: '08:30', end_time: '13:00' },
    { start_time: '09:30', end_time: '10:10' },
    { start_time: '12:40', end_time: '16:00' },
    { start_time: '16:30', end_time: '17:30', tentative: true },
  ]), 450);
});

test('validates calendar dates, elapsed time, repeat range and road duration', () => {
  assert.throws(() => eventInput({ ...input, date: '2026-11-31' }));
  assert.throws(() => eventInput({ ...input, end_time: '18:30' }));
  assert.throws(() => eventInput({ ...input, weekdays: [], until: '2026-12-01' }));
  assert.throws(() => eventInput({ ...input, travel_out: 361 }));
  assert.equal(eventInput({ ...input, travel_out: 0 }).travel_out, 0);
  assert.equal(travelClock('00:10', -20), '23:50 накануне');
  assert.equal(travelClock('23:50', 20), '00:10 на следующий день');
});

test('text import preserves child, weekday, date, duration and type', () => {
  const { events, bells } = parseSchedule([
    'Даня:',
    'вт и чт, гимнастика, каждую неделю 18:00–19:00, Мари',
    'Дима, завтра нейропсихолог 17:35, 40 минут',
    '2026-11-13 продлёнка 13:00–16:30',
  ].join('\n'), '2026-11-09');
  assert.equal(bells.length, 0);
  assert.deepEqual(events.map(e => [e.title,e.child,e.weekdays,e.date,e.start_time,e.end_time,e.place,e.category]), [
    ['гимнастика','danya',[2,4],'','18:00','19:00','Мари','club'],
    ['нейропсихолог','dima',[],'2026-11-10','17:35','18:15','','other'],
    ['продлёнка','danya',[],'2026-11-13','13:00','16:30','','school'],
  ]);
});

test('bell rows stay separate from lessons scheduled for an actual weekday', () => {
  const sheet = parseSchedule('Расписание звонков\n1 урок 8.30 – 9:10\n2 урок 9:30 – 10:10', '2026-11-09');
  assert.deepEqual(sheet.bells.map(b => [b.lesson,b.start_time,b.end_time]), [[1,'08:30','09:10'],[2,'09:30','10:10']]);
  assert.equal(sheet.events.length, 0);
  const lesson = parseSchedule('Понедельник\n2 урок Математика', '2026-11-09').events[0];
  assert.equal(lesson.lesson, 2);
  assert.equal(lesson.start_time, '');
  assert.deepEqual(lesson.weekdays, [1]);
});

test('common OCR substitutions and trailing punctuation preserve bell times', () => {
  const parsed = parseSchedule('Расписание звонков\nЗ урок 10:30 — 11:10.\n2 урок | 9; ‚30 — 10: 10.', '2026-11-09');
  assert.deepEqual(parsed.bells.map(b => [b.lesson,b.start_time,b.end_time]), [[2,'09:30','10:10'],[3,'10:30','11:10']]);
});

test('closure ranges include both endpoints, and a transferred working Saturday can open', () => {
  const ranges = [
    { kind: 'workday', date_from: '2027-02-20', date_to: '2027-02-20' },
    { kind: 'holiday', date_from: '2027-02-22', date_to: '2027-02-23', label: 'Праздничный выходной' },
    { kind: 'vacation', date_from: '2027-02-22', date_to: '2027-02-28', label: 'Каникулы' },
  ];
  assert.equal(dayClosure('2027-02-20', ranges), null);
  assert.equal(dayClosure('2027-02-21', ranges).kind, 'weekend');
  assert.equal(dayClosure('2027-02-22', ranges).kind, 'holiday');
  assert.equal(dayClosure('2027-02-23', ranges).kind, 'holiday');
  assert.equal(dayClosure('2027-02-28', ranges).kind, 'vacation');
  assert.equal(dayClosure('2027-03-01', ranges), null);
});
