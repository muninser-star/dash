import { addDays, categories, children, days, departureTime, eventInput, formatDate, loadMinutes, minutes,
  monday, schoolKinds, timeOf, timelineLanes, today, travelClock, validDate, validTime, weekday } from './schedule.mjs';
import { parseSchedule } from './import.mjs';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const option = (value, label, current) => '<option value="' + esc(value) + '"' + (value === current ? ' selected' : '') + '>' + esc(label) + '</option>';
const options = (values, current) => Object.entries(values).map(([value, label]) => option(value, label, current)).join('');
const nOrNull = value => value === '' ? null : Number(value);
const field = (form, name) => form.elements.namedItem(name);
const duration = n => [n >= 60 ? Math.floor(n / 60) + ' ч' : '', n % 60 ? n % 60 + ' мин' : ''].filter(Boolean).join(' ') || '0 мин';
const fmt = date => formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
const keyName = 'dash_key';
let key;
try { key = localStorage.getItem(keyName); } catch {}
const url = new URL(location.href);
if (url.searchParams.has('k')) {
  key = url.searchParams.get('k');
  url.searchParams.delete('k');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
}
let moscowDay = today();
const state = { day: moscowDay, week: monday(moscowDay), filter: 'all', rows: [], bells: [], closures: new Map(), routes: new Map(), available: false, request: 0, editing: null, draftId: null };
const apiUrl = 'https://cuhplpukqhdfutcymtmv.supabase.co/functions/v1/school';
const apiKey = 'sb_publishable_ILfqT6mCyHBOu6BVVRxHKQ_0bPQtNi3';
async function api(action, body = {}) {
  const response = await fetch(apiUrl, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: apiKey, 'x-mk-key': key || '' },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json();
  if (!response.ok || data.status !== 'ok') throw Error(data.code || 'network');
  return data;
}
const errors = {
  forbidden: 'Для этого раздела нужен семейный код дашборда.',
  invalid_event: 'Проверьте название, дни и время. Конец должен быть позже начала.',
  invalid_bells: 'Проверьте номера и время звонков. Для одного номера укажите один интервал.',
  invalid_import: 'Добавьте фото или текст расписания.',
  import_unavailable: 'Фото не распознано. Попробуйте более чёткий снимок или вставьте текст.',
  conflict: 'Событие уже изменилось. Закройте карточку и откройте её заново.',
  image: 'Фото не открылось. Попробуйте JPEG или PNG.',
};
const describeError = error => errors[error.message] || 'Не удалось связаться с календарём. Попробуйте ещё раз.';
function message(id, value, error = false) {
  const el = $(id);
  el.textContent = value;
  el.hidden = !value;
  el.toggleAttribute('data-error', error);
}
function remember(value) {
  try { value ? localStorage.setItem(keyName, value) : localStorage.removeItem(keyName); } catch {}
}
function gate(reason = '') {
  $('calendar').hidden = $('loading').hidden = $('header-actions').hidden = true;
  $('gate').hidden = false;
  message('gate-message', reason);
}
async function load(success = '') {
  const request = ++state.request;
  if (!key) return gate();
  $('loading').hidden = false;
  $('loading').textContent = 'Открываю календарь…';
  if (!$('calendar').hidden) $('loading').hidden = true;
  try {
    const result = await api('list', { from: state.week, to: addDays(state.week, 6) });
    if (request !== state.request) return;
    remember(key);
    state.rows = result.events;
    state.bells = result.bells;
    state.closures = new Map((result.closures || []).map(day => [day.date, day]));
    state.routes = new Map((result.routes || []).map(route => [route.id, route]));
    state.available = true;
    $('gate').hidden = $('loading').hidden = true;
    $('calendar').hidden = $('header-actions').hidden = false;
    render();
    message('notice', success);
  } catch (error) {
    if (request !== state.request) return;
    if (error.message === 'forbidden') { key = null; remember(null); gate(describeError(error)); return; }
    state.rows = [];
    state.closures.clear();
    state.available = false;
    if (!$('calendar').hidden) {
      $('loading').hidden = true;
      render(false);
      message('notice', describeError(error), true);
    } else {
      $('loading').textContent = describeError(error) + ' ';
      const button = document.createElement('button');
      button.textContent = 'Повторить';
      button.onclick = () => load();
      $('loading').append(button);
    }
  }
}
$('gate').addEventListener('submit', event => {
  event.preventDefault();
  const value = field($('gate'), 'code').value.trim();
  key = value.match(/[?&]k=([^&\s]+)/)?.[1] || value;
  load();
});

const filtered = date => state.rows.filter(e => e.occurrence === date && (state.filter === 'all' || e.child === state.filter));
const type = e => e.school_kind ? schoolKinds[e.school_kind] : categories[e.category];
const weekKind = e => e.school_kind === 'lesson' ? 'lesson' : e.category;
const weekKinds = { ...categories, lesson: 'Уроки' };
const dayOffLabels = { holiday: 'Праздник', vacation: 'Каникулы', weekend: 'Выходной' };
const rowKey = e => e.id + '/' + e.occurrence;
const childTag = child => '<span class="child-tag child-' + child + '">' + children[child] + '</span>';
const routeFor = e => state.routes.get(e.route_id);
const walkTime = route => '≈ ' + route.minutes + ' мин';
const schoolDayEvent = e => e.category === 'school' && e.school_kind !== 'kindergarten';
const leaveAt = (e, travel) => e.departure_time || departureTime(e.start_time, travel);
const hourHeight = 96, minimumCardHeight = 48, axisWidth = 48;
function weekLabel() {
  const end = addDays(state.week, 6);
  if (end.slice(0, 7) === state.week.slice(0, 7)) return Number(state.week.slice(8)) + '–' + formatDate(end);
  const opts = end.slice(0, 4) !== state.week.slice(0, 4) ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' };
  return formatDate(state.week, opts) + ' – ' + formatDate(end, opts);
}
function weekEvent(e, shownSchoolWalks) {
  const route = routeFor(e);
  const schoolWalk = route && e.school_kind === 'lesson' ? e.child + '/' + route.id : '';
  const showWalk = route && !shownSchoolWalks.has(schoolWalk);
  if (schoolWalk) shownSchoolWalks.add(schoolWalk);
  const length = minutes(e.end_time) - minutes(e.start_time);
  const elapsed = e.category === 'school' ? '' : '<span class="week-duration">' + length + ' мин</span>';
  return '<button type="button" class="week-item ' + weekKind(e) + (e.tentative ? ' tentative' : '') + '" data-event="' + rowKey(e) +
    '" title="' + esc(children[e.child] + ' · ' + e.title) + '"><span class="week-item-head"><time>' + e.start_time +
    '</time>' + elapsed + '</span><span class="week-item-title">' + esc(e.title) +
    '</span><span class="week-item-meta">' + childTag(e.child) +
    (showWalk ? '<span class="week-walk" role="img" title="Пешком от дома" aria-label="Пешком от дома ' + walkTime(route) + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="5" r="2"/><path d="m7 21 4-6-1-4m8 10-4-5 1-6m-8 3 4-5 4 2 4 3"/></svg>' +
      walkTime(route) + '</span>' : '') + '</span></button>';
}
function schoolPlan(events) {
  const school = new Map();
  for (const e of events) {
    if (!schoolDayEvent(e)) continue;
    if (!school.has(e.child)) school.set(e.child, { first: e, last: e, route: routeFor(e) });
    const block = school.get(e.child);
    if (e.end_time >= block.last.end_time) block.last = e;
    block.route ||= routeFor(e);
  }
  $('school-walk').hidden = !school.size;
  $('school-walk').innerHTML = [...school.values()].map(({ first, last, route }) => {
    const travel = first.travel_out ?? route?.minutes;
    const leave = travel == null ? '' : '<span>Выйти из дома <strong>' + leaveAt(first, travel) + '</strong></span>';
    const endLabel = last.school_kind === 'lesson' ? 'Уроки до' : 'Забрать';
    return '<p>' + childTag(first.child) + leave + '<span>' + endLabel + ' <strong>' + last.end_time + '</strong></span></p>';
  }).join('');
}
function renderRoutes() {
  $('walking').hidden = !state.routes.size;
  $('walking-routes').innerHTML = [...state.routes.values()].map(route =>
    '<li><div><strong>' + esc(route.label) + '</strong><span>' + esc(route.place) + '</span></div><div class="walk-value"><strong>' +
    walkTime(route) + '</strong><span>' + route.meters.toLocaleString('ru-RU') + ' м</span></div></li>').join('');
}
function renderWeek(current, available) {
  const daily = days.map((label, i) => {
    const date = addDays(state.week, i);
    return { label, date, events: filtered(date) };
  });
  const weekEvents = daily.flatMap(day => day.events);
  const fromHour = Math.floor(Math.min(8 * 60, ...weekEvents.map(e => minutes(e.start_time))) / 60);
  const toHour = Math.ceil(Math.max(20 * 60, ...weekEvents.map(e => minutes(e.end_time))) / 60);
  const columns = daily.map(day => timelineLanes(day.events, fromHour * 60, hourHeight, minimumCardHeight));
  const trackHeight = Math.max((toHour - fromHour) * hourHeight, ...columns.flat().map(item => item.top + item.height));
  const widths = columns.map(items => Math.max(130, ...items.map(item => item.lanes * 102)));
  const hours = Array.from({ length: toHour - fromHour + 1 }, (_, i) => '<span>' + timeOf((fromHour + i) * 60) + '</span>').join('');
  const week = $('week');
  week.style.setProperty('--hour-height', hourHeight + 'px');
  week.style.setProperty('--track-height', trackHeight + 'px');
  week.style.minWidth = axisWidth + widths.reduce((a, b) => a + b, 0) + 'px';
  week.style.gridTemplateColumns = axisWidth + 'px ' + widths.map(width => 'minmax(' + width + 'px, 1fr)').join(' ');
  week.innerHTML = '<div class="time-axis" aria-hidden="true"><div class="time-axis-head">Время</div><div class="hour-labels">' + hours + '</div></div>' +
    daily.map(({ label, date, events }) => {
    const shownSchoolWalks = new Set();
    const kinds = [...new Set(events.map(weekKind))];
    const dayChildren = Object.keys(children).filter(child => events.some(e => e.child === child));
    const closed = state.closures.get(date);
    const details = [...dayChildren.map(child => children[child]), ...kinds.map(kind => weekKinds[kind])];
    const labelFull = fmt(date) + (closed ? ', ' + closed.label : '') +
      (!available ? ', нет данных' : events.length ? ', событий: ' + events.length + ', ' + details.join(', ') : ', без событий');
    const special = closed && closed.kind !== 'weekend';
    return '<div class="day-cell' + (date === state.day ? ' active' : '') + (special ? ' special-day' : '') + '">' +
      '<button type="button" class="day-button" data-day="' + date + '" aria-label="' + esc(labelFull) +
      '" aria-pressed="' + (date === state.day) + '"' + (date === current ? ' aria-current="date"' : '') +
      '><span>' + label + '</span><strong>' + Number(date.slice(8)) + '</strong>' +
      (closed ? '<span class="day-off-label" aria-hidden="true">' + dayOffLabels[closed.kind] + '</span>' : '') + '</button>' +
      '<div class="day-track">' + events.map(e => weekEvent(e, shownSchoolWalks)).join('') + '</div></div>';
  }).join('');
  for (const [i, track] of [...week.querySelectorAll('.day-track')].entries()) {
    for (const [j, card] of [...track.children].entries()) {
      const item = columns[i][j], portion = 100 / item.lanes;
      card.style.top = item.top + 'px';
      card.style.height = item.height + 'px';
      card.style.left = 'calc(' + item.lane * portion + '% + 3px)';
      card.style.width = 'calc(' + portion + '% - 6px)';
      if (item.lanes > 1) card.classList.add('week-item-overlap');
    }
  }
  const scroll = $('week-scroll');
  if (scroll.dataset.alignedDay !== state.day) {
    scroll.dataset.alignedDay = state.day;
    requestAnimationFrame(() => {
      const active = week.querySelector('.day-cell.active');
      if (active) scroll.scrollLeft = active.offsetLeft - axisWidth;
    });
  }
}
function render(available = state.available) {
  const current = today();
  $('week-title').textContent = weekLabel();
  for (const button of document.querySelectorAll('[data-filter]')) button.setAttribute('aria-pressed', String(button.dataset.filter === state.filter));
  renderWeek(current, available);
  const label = fmt(state.day);
  $('day-title').textContent = state.day === current ? 'Сегодня · ' + label : label[0].toUpperCase() + label.slice(1);
  const closed = state.closures.get(state.day);
  message('day-off-note', closed ? closed.label + ' · Без школы и сада' : '');
  const events = filtered(state.day);
  schoolPlan(events);
  $('day-load').innerHTML = Object.keys(children).filter(id => state.filter === 'all' || state.filter === id).map(id => {
    const own = events.filter(e => e.child === id);
    return '<span class="child-load">' + childTag(id) + ' ' + (available ? duration(loadMinutes(own)) : 'нет данных') +
      (own.some(e => e.tentative) ? ' + уточнить' : '') + '</span>';
  }).join('');
  $('agenda').innerHTML = events.length ? events.map(agendaRow).join('') : '<p class="empty">' +
    (available ? 'На этот день ничего не запланировано.' : 'Расписание на неделю недоступно. Перезагрузите страницу, чтобы повторить.') + '</p>';
  $('bells').innerHTML = state.bells.length ? '<ol>' + state.bells.map(b => '<li><span>' + b.lesson + '-й урок</span><time>' + b.start_time + '–' + b.end_time + '</time></li>').join('') +
    '</ol>' : '<p>Загрузите звонки через импорт.</p>';
  renderRoutes();
}
function agendaRow(e) {
  const route = routeFor(e);
  const school = schoolDayEvent(e);
  const there = e.travel_out ?? route?.minutes;
  const home = e.travel_back ?? route?.minutes;
  const trip = [];
  if (!school) {
    if (there != null) trip.push('Выйти из дома <strong>' + leaveAt(e, there) + '</strong>');
    if ((e.category === 'club' && (there != null || home != null)) || e.school_kind === 'kindergarten') trip.push('Забрать <strong>' + e.end_time + '</strong>');
    if (home != null) trip.push('Дома около <strong>' + travelClock(e.end_time, home) + '</strong>');
  }
  const place = e.place || (!school && route?.place);
  return '<article class="agenda-row' + (school ? ' academic-row' : '') + '"><div class="when">' + e.start_time + '–' + e.end_time + '</div><div><h3 class="event-title">' + esc(e.title) + '</h3>' +
    '<div class="meta">' + childTag(e.child) + '<span class="tag ' + e.category + '">' + type(e) + '</span>' +
    (e.tentative ? '<span class="tag tentative">Уточнить</span>' : '') + '</div>' +
    (place ? '<p class="place">' + esc(place) + '</p>' : '') +
    (trip.length ? '<p class="travel"><span>' + trip.join('</span><span>') + '</span></p>' : '') +
    (e.note ? '<p class="event-note">' + esc(e.note) + '</p>' : '') +
    '</div><button type="button" class="event-edit" data-event="' + rowKey(e) + '" aria-label="Изменить: ' + esc(e.title) +
    '" title="Изменить"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 4 4 4M4 20l4-.8L21 6.2 17.8 3 4.8 16z"/></svg></button></article>';
}
function go(date) {
  if (!validDate(date)) return;
  state.day = date;
  const next = monday(date);
  if (state.week === next) { render(); return; }
  state.week = next;
  state.rows = [];
  state.closures.clear();
  state.available = false;
  render(false);
  message('notice', 'Загружаю неделю…');
  load();
}
$('prev').onclick = () => go(addDays(state.day, -7));
$('next').onclick = () => go(addDays(state.day, 7));
$('today').onclick = event => showAgenda(today(), event.detail === 0);
$('show-week').onclick = event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const calendar = $('week-calendar');
  if (event.detail === 0) calendar.focus({ preventScroll: true });
  calendar.scrollIntoView({ block: 'start' });
};
function showAgenda(date, focus) {
  go(date);
  if (focus) $('day-title').focus({ preventScroll: true });
  $('day-title').scrollIntoView({ block: 'start' });
}
function refreshToday() {
  const date = today();
  if (date === moscowDay) return;
  const followingToday = state.day === moscowDay;
  moscowDay = date;
  if ($('calendar').hidden) {
    state.day = date;
    state.week = monday(date);
    if (key && $('gate').hidden) load();
  } else if (followingToday) go(date);
  else render();
}
window.addEventListener('focus', refreshToday);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshToday(); });
setInterval(() => { if (!document.hidden) refreshToday(); }, 60000);
for (const button of document.querySelectorAll('[data-filter]')) button.onclick = () => { state.filter = button.dataset.filter; render(); };
$('calendar').addEventListener('click', event => {
  const button = event.target.closest('button');
  if (button?.dataset.day) showAgenda(button.dataset.day, event.detail === 0);
  if (button?.dataset.event) {
    const row = state.rows.find(e => rowKey(e) === button.dataset.event);
    if (!row) return;
    if (state.day !== row.occurrence) { state.day = row.occurrence; render(); }
    openEvent(row);
  }
});

const form = $('event-form');
const ef = name => field(form, name);
$('weekdays').innerHTML = days.map((day, i) => '<label class="checkline"><input type="checkbox" name="weekday" value="' + (i + 1) + '"> ' + day + '</label>').join('');
function eventFields() {
  $('school-fields').hidden = ef('category').value !== 'school';
  $('lesson-field').hidden = ef('school_kind').value !== 'lesson';
  $('repeat-fields').hidden = !ef('repeat').checked;
  $('event-date-label').querySelector('span').textContent = ef('repeat').checked ? 'Повторять с' : 'Дата';
  ef('until').disabled = !ef('repeat').checked;
}
function routePlaceholders() {
  const route = state.routes.get(ef('route_id').value);
  for (const name of ['travel_out', 'travel_back']) ef(name).placeholder = route ? walkTime(route) : 'Указать';
}
function openEvent(row = null) {
  state.editing = row;
  state.draftId = crypto.randomUUID();
  form.reset();
  ef('lesson').innerHTML = '<option value="">Время вручную</option>' +
    Array.from({ length: 12 }, (_, i) => option(String(i + 1), (i + 1) + '-й урок', '')).join('');
  $('route-field').hidden = !state.routes.size;
  ef('route_id').innerHTML = '<option value="">Указать минуты вручную</option>' +
    [...state.routes.values()].map(route => option(route.id, route.label + ' · ' + walkTime(route), '')).join('');
  ef('child').value = state.filter === 'all' ? 'dima' : state.filter;
  ef('category').value = 'club';
  ef('date').value = state.day;
  if (row) for (const name of ['title', 'child', 'category', 'school_kind', 'lesson', 'date', 'until', 'start_time', 'end_time', 'place', 'note', 'travel_out', 'travel_back', 'route_id']) {
    if (row[name] != null) ef(name).value = row[name];
  }
  ef('tentative').checked = !!row?.tentative;
  ef('repeat').checked = !!row?.weekdays.length;
  for (const box of form.querySelectorAll('[name=weekday]')) box.checked = (row?.weekdays || [weekday(state.day)]).includes(Number(box.value));
  $('edit-title').textContent = row ? 'Изменить событие' : 'Новое событие';
  message('edit-description', row?.weekdays.length ? 'Изменения применяются ко всей серии. Для разовой отмены пропустите ' + formatDate(row.occurrence) + '.' : '');
  $('skip').hidden = !row?.weekdays.length;
  $('delete').hidden = !row;
  $('delete').textContent = row?.weekdays.length ? 'Удалить серию' : 'Удалить';
  message('edit-message', '');
  eventFields();
  routePlaceholders();
  $('edit').showModal();
}
$('day-add').onclick = () => openEvent();
ef('repeat').onchange = ef('category').onchange = ef('school_kind').onchange = eventFields;
ef('route_id').onchange = routePlaceholders;
ef('lesson').onchange = () => {
  const bell = state.bells.find(b => b.lesson === Number(ef('lesson').value));
  if (bell) { ef('start_time').value = bell.start_time; ef('end_time').value = bell.end_time; }
};
async function editAction(action) {
  const row = state.editing;
  const payload = row ? { id: row.id, revision: row.revision, date: row.occurrence } : { id: state.draftId };
  if (action === 'delete' && !confirm(row.weekdays.length ? 'Удалить все повторения этого события?' : 'Удалить это событие?')) return;
  if (action === 'skip' && !confirm('Пропустить событие ' + formatDate(row.occurrence) + '?')) return;
  const buttons = [...form.querySelectorAll('button')];
  try {
    if (action === 'create' || action === 'update') {
      const values = Object.fromEntries(new FormData(form));
      const weekdays = ef('repeat').checked ? [...form.querySelectorAll('[name=weekday]:checked')].map(box => Number(box.value)) : [];
      if (ef('repeat').checked && !weekdays.length) throw Error('invalid_event');
      payload.event = eventInput({ ...values, weekdays, lesson: nOrNull(values.lesson),
        travel_out: nOrNull(values.travel_out), travel_back: nOrNull(values.travel_back), tentative: ef('tentative').checked });
    }
    buttons.forEach(button => { button.disabled = true; });
    message('edit-message', '');
    await api(action, payload);
    $('edit').close();
    if (payload.event && !row && payload.event.date !== state.day) {
      state.day = payload.event.date;
      state.week = monday(state.day);
    }
    if (payload.event && state.filter !== 'all' && state.filter !== payload.event.child) state.filter = payload.event.child;
    await load(action === 'delete' ? 'Событие удалено.' : action === 'skip' ? 'Этот день пропущен.' : 'Событие сохранено.');
  } catch (error) {
    message('edit-message', describeError(error));
    if (error.message === 'conflict') load();
  } finally { buttons.forEach(button => { button.disabled = false; }); }
}
form.onsubmit = event => { event.preventDefault(); editAction(state.editing ? 'update' : 'create'); };
$('skip').onclick = () => editAction('skip');
$('delete').onclick = () => editAction('delete');
for (const button of document.querySelectorAll('[data-close]')) button.onclick = () => $(button.dataset.close).close();
for (const dialog of document.querySelectorAll('dialog')) dialog.addEventListener('cancel', event => {
  if (dialog.querySelector('button:disabled')) event.preventDefault();
});

const imp = $('import-form'), preview = $('preview');
let draft = null;
$('import-open').onclick = () => {
  imp.reset();
  field(imp, 'child').value = state.filter === 'all' ? 'dima' : state.filter;
  field(imp, 'date').value = state.day;
  preview.hidden = true;
  preview.replaceChildren();
  message('import-message', '');
  $('import').showModal();
};
imp.onsubmit = async event => {
  event.preventDefault();
  const { child, date } = Object.fromEntries(new FormData(imp));
  const textField = field(imp, 'text');
  const photo = field(imp, 'photo').files[0];
  if (!photo?.size && !textField.value.trim()) return message('import-message', errors.invalid_import);
  if (photo?.size > 25_000_000) return message('import-message', 'Фото больше 25 МБ. Выберите файл поменьше.');
  preview.hidden = true;
  $('analyze').disabled = true;
  try {
    if (photo?.size) {
      message('import-message', 'Загружаю распознавание на устройство…');
      const { photoText } = await import('./ocr.mjs');
      const score = text => {
        const parsed = parseSchedule(text, today());
        return [...parsed.bells, ...parsed.events].filter(row => row.start_time && row.end_time && row.start_time < row.end_time).length;
      };
      textField.value = (await photoText(photo, percent => message('import-message', 'Распознаю фото… ' + percent + '%'), score)).slice(0, 8000);
      field(imp, 'photo').value = '';
    }
    const result = parseSchedule(textField.value, today());
    if (result.bells.length && result.warnings.length) {
      for (const bell of state.bells) {
        if (!result.bells.some(row => row.lesson === bell.lesson)) {
          result.bells.push({ lesson: bell.lesson, start_time: '', end_time: '' });
        }
      }
      result.bells.sort((a, b) => a.lesson - b.lesson);
    }
    draft = { ...result, child, date };
    renderPreview();
    message('import-message', result.events.length || result.bells.length ? '' : 'События или звонки не распознаны. Проверьте, что видны названия и время.');
  } catch (error) { message('import-message', error.message === 'image' ? errors.image : errors.import_unavailable); }
  finally { $('analyze').disabled = false; }
};
const input = (name, value, kind = 'text', attrs = '') => '<input data-field="' + name + '" type="' + kind + '" value="' + esc(value) + '" ' + attrs + '>';
function renderPreview() {
  const sections = [];
  if (draft.warnings.length) sections.push('<p class="message">' + esc(draft.warnings.join(' · ')) + '</p>');
  if (draft.events.length) sections.push('<h3>События</h3><p class="hint">Проверьте даты и время. Снимите галочку с лишних строк.</p>' + draft.events.map(previewEvent).join('') +
    '<div class="preview-actions"><p class="message" id="preview-events" role="alert" hidden></p><button type="submit" class="primary" value="events">Записать события</button></div>');
  if (draft.bells.length) sections.push('<h3>Звонки</h3><p class="hint">Сверьте время с источником и отметьте строки, которые хотите записать.</p>' +
    draft.bells.map(previewBell).join('') +
    '<div class="preview-actions"><p class="message" id="preview-bells" role="alert" hidden></p><button type="submit" class="primary" value="bells">Обновить звонки</button></div>');
  preview.innerHTML = sections.join('');
  preview.hidden = !sections.length;
}
function previewBell(b) {
  const current = state.bells.find(row => row.lesson === b.lesson);
  const complete = b.start_time && b.end_time && b.start_time < b.end_time;
  const identical = current && current.start_time === b.start_time && current.end_time === b.end_time;
  const check = complete && (!current || identical) ? ' checked' : '';
  const reference = current && !identical ? '<p class="hint">Сейчас ' + current.start_time + '–' + current.end_time + '</p>' : '';
  const label = !complete ? ' · проверьте время' : current && !identical ? ' · время отличается' : '';
  return '<div class="preview-row" data-bell><label class="checkline"><input type="checkbox" data-include' + check +
    '> ' + b.lesson + '-й урок' + label + '</label>' + reference + '<div class="fields">' +
    input('lesson', b.lesson, 'hidden') + '<label>Начало' + input('start_time', b.start_time, 'time') + '</label><label>Конец' +
    input('end_time', b.end_time, 'time') + '</label></div></div>';
}
function previewEvent(e) {
  const b = draft.bells.find(row => row.lesson === e.lesson) || state.bells.find(row => row.lesson === e.lesson);
  const start = e.start_time || b?.start_time || '', end = e.end_time || b?.end_time || '';
  const category = e.category || 'club';
  return '<div class="preview-row" data-draft><div class="checkline"><input type="checkbox" data-include checked aria-label="Включить в импорт">' +
    input('title', e.title, 'text', 'data-title aria-label="Название" maxlength="120"') + '</div>' +
    '<div class="fields time-fields"><label>' + (e.weekdays.length ? 'Повторять с' : 'Дата') + input('date', e.date || draft.date, 'date') +
    '</label><label>Начало' + input('start_time', start, 'time') + '</label><label>Конец' + input('end_time', end, 'time') + '</label></div>' +
    (e.weekdays.length ? '<p class="hint">Каждую неделю · ' + e.weekdays.map(n => days[n - 1]).join(', ') + '</p>' : '') +
    '<details><summary>Ребёнок, тип, дни, место и дорога</summary><div class="fields"><label>Ребёнок<select data-field="child">' + options(children, e.child || draft.child) +
    '</select></label><label>Тип<select data-field="category">' + options(categories, category) +
    '</select></label><label>Для школы или сада<select data-field="school_kind">' + options(schoolKinds, e.school_kind || 'school') + '</select></label>' +
    '<label>Место' + input('place', e.place, 'text', 'maxlength="140"') + '</label></div>' +
    '<label>Дни повтора (пусто для разового события)</label><div class="day-checks">' +
    days.map((day, i) => '<label class="checkline"><input type="checkbox" data-weekday value="' + (i + 1) + '"' +
      (e.weekdays.includes(i + 1) ? ' checked' : '') + '> ' + day + '</label>').join('') + '</div>' +
    '<div class="fields"><label>Туда, мин' + input('travel_out', e.travel_out, 'number', 'min="0" max="360"') +
    '</label><label>Обратно, мин' + input('travel_back', e.travel_back, 'number', 'min="0" max="360"') + '</label></div>' +
    '<label>Заметка' + input('note', e.note, 'text', 'maxlength="300"') + '</label>' +
    input('lesson', e.lesson, 'hidden') + '</details></div>';
}
preview.onsubmit = async event => {
  event.preventDefault();
  const kind = event.submitter?.value;
  if (!kind) return;
  const status = 'preview-' + kind;
  const rows = [...preview.querySelectorAll(kind === 'bells' ? '[data-bell]' : '[data-draft]')];
  const selected = rows.filter(row => row.querySelector('[data-include]').checked);
  if (!selected.length) return message(status, 'Выберите хотя бы одну строку.');
  const controls = [...$('import').querySelectorAll('button')];
  try {
    const values = selected.map(row => {
      const data = Object.fromEntries([...row.querySelectorAll('[data-field]')].map(el => [el.dataset.field, el.value]));
      if (kind === 'bells') {
        if (!validTime(data.start_time) || !validTime(data.end_time) || data.start_time >= data.end_time) throw Error('invalid_bells');
        return { ...data, lesson: Number(data.lesson) };
      }
      return eventInput({ ...data, lesson: nOrNull(data.lesson), travel_out: nOrNull(data.travel_out),
        travel_back: nOrNull(data.travel_back), weekdays: [...row.querySelectorAll('[data-weekday]:checked')].map(el => Number(el.value)) });
    });
    controls.forEach(button => { button.disabled = true; });
    message(status, 'Записываю…');
    await api(kind === 'bells' ? 'bells' : 'import', { [kind]: values });
    // Keep the other review section and its edits if the import contained both kinds.
    rows.forEach(row => { row.hidden = true; row.querySelector('[data-include]').checked = false; });
    draft[kind] = [];
    event.submitter.closest('.preview-actions').hidden = true;
    const saved = kind === 'bells' ? 'Звонки обновлены.' : 'События записаны.';
    if (!draft.events.length && !draft.bells.length) $('import').close();
    else message('import-message', saved);
    await load(saved);
  } catch (error) { message(status, describeError(error)); }
  finally { controls.forEach(button => { button.disabled = false; }); }
};
load();
