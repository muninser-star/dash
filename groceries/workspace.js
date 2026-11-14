const workspaceState = {
 stores: [], entries: [], cashback: null, ready: false,
 busy: new WeakSet(), retries: new Map(),
};
const sections = {
 sectionPurchases: 'purchases', sectionPlanned: 'planned', sectionCatalog: 'catalog', sectionStores: 'stores',
};

function storeNames() {
 return [...new Set([...C.STORES, ...workspaceState.stores.map(store => store.name), ...rows().map(row => row.store)])];
}

function storeOptions(selected, useId, empty) {
 const names = useId ? workspaceState.stores.map(store => [store.id, store.name]) : storeNames().map(name => [name, name]);
 return (empty ? '<option value="">' + esc(empty) + '</option>' : '') +
  names.map(([value, label]) => '<option value="' + esc(value) + '"' + (value === selected ? ' selected' : '') + '>' + esc(label) + '</option>').join('');
}

function refreshStoreOptions() {
 for (const [id, empty] of [['uploadStore', ''], ['storeView', 'Все магазины']]) {
  const input = $(id);
  input.innerHTML = storeOptions(input.value, false, empty);
 }
 const purchaseStore = $('purchaseForm').elements.store;
 purchaseStore.innerHTML = storeOptions(purchaseStore.value, true, 'Пока без магазина');
 $('shopNames').innerHTML = workspaceState.stores.map(store => '<li>' + esc(store.name) + '</li>').join('');
 $('shopCount').textContent = workspaceState.stores.length ? '· ' + workspaceState.stores.length : '';
}

function cashbackLines(observation, product, price = observation.price, unit = weighed(observation) ? '/' + observation.unit : '') {
 if (!Number.isFinite(price) || price <= 0) return '<span class="muted">Нет цены</span>';
 const shop = workspaceState.stores.find(store => store.name === observation.store);
 const {main, alternatives} = C.cashbackFor(price, shop?.id, product.category, workspaceState.cashback);
 const available = Array.isArray(workspaceState.cashback);
 const moneyUnit = amount => money(amount) + unit;
 const mainLine = main ? '<span><small>Кэшбэк</small><b>' + moneyUnit(main.benefit / 100) + ' · ' + esc(main.pct) + '%</b></span>' +
    '<span><small>Итого с кэшбэком</small><strong>' + moneyUnit(main.net / 100) + '</strong></span>' :
    '<span><small>Кэшбэк</small><b>' + (available ? 'Нет данных' : 'Недоступен') + '</b></span>';
 return '<div class="price-breakdown"><div class="price-points"><span><small>Цена</small><b>' + moneyUnit(price) + '</b></span>' + mainLine + '</div>' +
    (main ? '<small class="cashback-detail">' + esc([main.program, main.conditions].filter(Boolean).join(' · ')) + '</small>' : '') +
    alternatives.map(rule => '<small class="cashback-detail"><b>' + esc(rule.program) + ' · ' + esc(rule.pct) + '%' +
       (rule.reward ? ' ' + esc(rule.reward) : '') + '</b>' +
       (rule.net !== null ? ' · итог при выполнении условий ' + moneyUnit(rule.net / 100) : ' · рублёвый эквивалент не уточнён') +
       (rule.conditions ? '<br>' + esc(rule.conditions) : '') + '</small>').join('') + '</div>';
}

function purchaseObservation(entry, groups) {
 if (!entry.store_id) return null;
 const store = workspaceState.stores.find(item => item.id === entry.store_id);
 if (!store) return null;
 const group = entry.product_key
  ? groups.find(g => g.key === entry.product_key || g.all.some(o => o.productKey === entry.product_key))
  : groups.find(g => C.norm(g.title) === C.norm(entry.title));
 if (!group) return null;
 const observation = group.byStore[store.name];
 if (!observation) return null;
 return {group, observation, price: C.purchasePrice(observation)};
}

function purchaseHTML(entry, priced) {
 const {observation, group, price} = priced || {};
 let pricing = '<small class="muted">Нет свежей цены</small>';
 if (price) pricing = cashbackLines(observation, group, price);
 else if (observation && Number(observation.price) > 0) {
  pricing = '<small class="muted">' + esc(statusLabel(observation)) + ' · ' + mainPrice(observation) +
   (observation.conditions || observation.conditionsUnclear ? ' · есть условия' : '') + '</small>';
 }
 return '<li class="workspace-entry" data-entry="' + esc(entry.id) + '">' +
  '<div class="entry-main"><strong>' + esc(entry.title) + '</strong>' + (entry.completed || !entry.store_id ? '' : pricing) + '</div>' +
  '<div class="entry-actions"><label class="entry-store"><span>Магазин</span><select data-entry-store>' +
    storeOptions(entry.store_id, true, 'Пока без магазина') + '</select></label>' +
   '<button type="button" data-entry-action="toggle">' + (entry.completed ? 'Вернуть в список' : 'Куплено') + '</button>' +
   '<button type="button" class="quiet" data-entry-action="delete">Удалить</button></div></li>';
}

function estimateShop(entries, priced) {
 let gross = 0, knownPrice = 0, reward = 0, knownReward = 0;
 for (const entry of entries) {
  const offer = priced.get(entry.id);
  if (!offer?.price) continue;
  knownPrice += 1;
  gross += Math.round((offer.price + Number.EPSILON) * 100);
  const {main} = C.cashbackFor(offer.price, entry.store_id, offer.group.category, workspaceState.cashback);
  if (main) {
   reward += main.benefit;
   knownReward += 1;
  }
 }
 return {gross, knownPrice, reward, knownReward};
}

function shopTotals(entries, priced) {
 const {gross, knownPrice, reward, knownReward} = estimateShop(entries, priced);
 if (!knownPrice) return '<p class="muted small">Пока нет свежих цен для расчёта.</p>';
 const partial = knownPrice < entries.length || knownReward < knownPrice;
 return '<div class="shop-totals"><div class="price-points">' +
  '<span><small>К оплате' + (knownPrice < entries.length ? ' по известным ценам' : '') + '</small><b>' + money(gross / 100) + '</b></span>' +
  (knownReward ? '<span><small>Известный кэшбэк</small><b>' + money(reward / 100) + '</b></span>' +
   '<span><small>Расчётный итог' + (partial ? ' по известным данным' : ' с кэшбэком') + '</small><strong>' + money((gross - reward) / 100) + '</strong></span>' : '') +
  '</div>' + (knownPrice < entries.length ? '<small>Свежие цены у ' + knownPrice + ' из ' + entries.length + ' позиций.</small>' : '') +
  (knownReward < knownPrice ? '<small>Ставка известна у ' + knownReward + ' из ' + knownPrice + ' позиций с ценой.</small>' : '') + '</div>';
}

function renderPurchases(groups) {
 const entries = workspaceState.entries.filter(entry => entry.kind === 'purchase');
 const active = entries.filter(entry => !entry.completed);
 const done = entries.filter(entry => entry.completed);
 const shops = new Map();
 const prices = new Map();
 for (const entry of active) {
  if (!shops.has(entry.store_id)) shops.set(entry.store_id, []);
  shops.get(entry.store_id).push(entry);
  prices.set(entry.id, purchaseObservation(entry, groups));
 }
 const markup = [...shops].map(([storeId, items]) => {
  const shop = workspaceState.stores.find(store => store.id === storeId);
  return '<section class="workspace-group"><h3>' + esc(shop?.name || 'Пока без магазина') + '</h3>' +
   (shop ? shopTotals(items, prices) : '') + '<ul class="workspace-entries">' +
   items.map(entry => purchaseHTML(entry, prices.get(entry.id))).join('') + '</ul></section>';
 }).join('');
 $('purchases').innerHTML = markup || (workspaceState.ready ? '<p class="muted">Добавьте первую покупку или выберите товар в каталоге.</p>' : '');
 if (done.length) $('purchases').insertAdjacentHTML('beforeend', '<details class="workspace-completed"><summary>Куплено · ' + done.length +
  '</summary><ul class="workspace-entries">' + done.map(entry => purchaseHTML(entry, null)).join('') + '</ul></details>');
}

function planHTML(entry) {
 const date = entry.due_on ? entry.due_on.split('-').reverse().join('.') : '';
 const overdue = !entry.completed && entry.due_on && entry.due_on < C.day();
 return '<li class="workspace-entry" data-entry="' + esc(entry.id) + '">' +
  '<div class="entry-main"><strong>' + esc(entry.title) + '</strong><small class="' + (overdue ? 'overdue' : 'muted') + '">' +
  (entry.plan_type === 'service' ? 'Обслуживание' : 'Покупка') + (date ? ' · ' + esc(date) : '') + (overdue ? ' · Просрочено' : '') + '</small>' +
  (entry.note ? '<p class="entry-note">' + esc(entry.note) + '</p>' : '') + '</div>' +
  '<div class="entry-actions"><button type="button" data-entry-action="edit">Изменить</button><button type="button" data-entry-action="toggle">' +
  (entry.completed ? 'Вернуть в планы' : 'Выполнено') + '</button></div></li>';
}

function renderPlans() {
 const entries = workspaceState.entries.filter(entry => entry.kind === 'plan');
 const active = entries.filter(entry => !entry.completed).sort((a,b)=>(a.due_on||'9999').localeCompare(b.due_on||'9999'));
 const done = entries.filter(entry => entry.completed);
 $('plans').innerHTML = active.length ? '<ul class="workspace-entries">' + active.map(planHTML).join('') + '</ul>' :
   workspaceState.ready ? '<p class="muted">Добавьте будущую покупку или обслуживание.</p>' : '';
 if (done.length) $('plans').insertAdjacentHTML('beforeend', '<details class="workspace-completed"><summary>Выполнено · ' + done.length +
  '</summary><ul class="workspace-entries">' + done.map(planHTML).join('') + '</ul></details>');
}

function renderSection(allGroups) {
 const current = S.section;
 const catalog = current === 'catalog' || current === 'stores';
 for (const [id, section] of Object.entries(sections)) $(id).setAttribute('aria-pressed', String(current === section));
 $('purchasePanel').hidden = current !== 'purchases';
 $('plannedPanel').hidden = current !== 'planned';
 $('catalogPanel').hidden = !catalog;
 $('workspaceStatus').hidden = workspaceState.ready || catalog;
 $('storePanel').hidden = !workspaceState.ready || current === 'planned';
 $('purchaseForm').hidden = !workspaceState.ready;
 $('newPlan').hidden = !workspaceState.ready;
 $('organize').hidden = current !== 'catalog';
 $('catalogViews').hidden = current !== 'catalog';
 if (current === 'purchases') renderPurchases(allGroups);
 if (current === 'planned') renderPlans();
 return catalog;
}

function upsertLocal(entry) {
 const index = workspaceState.entries.findIndex(item => item.id === entry.id);
 if (index < 0) {
  if (!entry.deleted) workspaceState.entries.push(entry);
 } else if (entry.deleted) workspaceState.entries.splice(index, 1);
 else workspaceState.entries[index] = entry;
}

async function writeEntry(action, entry, previous, retryKey) {
 const fields = {expectedRevision: previous?.revision || null, ...(entry ? {entry} : {id: previous.id})};
 const signature = JSON.stringify(fields);
 const cached = workspaceState.retries.get(retryKey);
 const revision = cached?.signature === signature ? cached.revision : uid();
 workspaceState.retries.set(retryKey, {signature, revision});
 try {
  const result = await api(action, {...fields, revision});
  workspaceState.retries.delete(retryKey);
  upsertLocal(result.entry);
 } catch (error) {
  if (error.status === 409) {
   workspaceState.retries.delete(retryKey);
   await loadWorkspace();
  }
  throw error;
 }
}

function workspaceStatus(message) {
 const status = $('workspaceStatus');
 const retry = document.createElement('button');
 retry.textContent = 'Повторить';
 retry.type = 'button';
 retry.onclick = () => loadWorkspace();
 status.replaceChildren(document.createTextNode(message + ' '), retry);
 status.hidden = S.section !== 'purchases' && S.section !== 'planned';
}

async function loadWorkspace() {
 try {
  const result = await api('workspace');
  workspaceState.stores = result.stores;
  workspaceState.entries = result.entries;
  workspaceState.cashback = result.cashback;
  workspaceState.ready = true;
  refreshStoreOptions();
  renderDrafts();
  render();
 } catch (error) {
  workspaceState.cashback = null;
  if (!workspaceState.ready) workspaceStatus(error.message);
  else {
   notify('Список не обновился. ' + error.message);
   render();
  }
 }
}

async function workspaceAction(control, task) {
 if (workspaceState.busy.has(control)) return;
 workspaceState.busy.add(control);
 control.disabled = true;
 try {
  await task();
  render();
 } catch (error) {
  notify(error.message);
 } finally {
  control.disabled = false;
  workspaceState.busy.delete(control);
 }
}

function showPlanForm(entry = null) {
 const form = $('planForm');
 form.reset();
 form.elements.id.value = entry?.id || uid();
 form.elements.title.value = entry?.title || '';
 form.elements.type.value = entry?.plan_type || 'purchase';
 form.elements.date.value = entry?.due_on || '';
 form.elements.note.value = entry?.note || '';
 form.hidden = false;
 form.elements.title.focus();
}

function purchaseId(form, name) {
 if (form.dataset.pendingTitle !== name) {
  form.dataset.pendingTitle = name;
  form.dataset.pendingId = uid();
 }
 return form.dataset.pendingId;
}

$('storeForm').onsubmit = event => {
 event.preventDefault();
 const form = event.currentTarget;
 workspaceAction(event.submitter || form.querySelector('button'), async () => {
  const {store, existed} = await api('add_store', {name: form.elements.name.value});
  if (!workspaceState.stores.some(item => item.id === store.id)) workspaceState.stores.push(store);
  refreshStoreOptions();
  renderDrafts();
  form.reset();
  notify(existed ? 'Магазин уже в списке.' : 'Магазин добавлен.');
 });
};

$('purchaseForm').onsubmit = event => {
 event.preventDefault();
 const form = event.currentTarget;
 const title = form.elements.title.value.trim();
 if (!title) return notify('Введите название покупки.');
 workspaceAction(event.submitter || form.querySelector('button'), async () => {
  const entry = {id: purchaseId(form, title), title, store_id: form.elements.store.value || null, completed: false};
  await writeEntry('save_purchase', entry, null, entry.id);
  delete form.dataset.pendingTitle;
  delete form.dataset.pendingId;
  form.reset();
  form.elements.title.focus();
 });
};

$('newPlan').onclick = () => showPlanForm();
$('cancelPlan').onclick = () => {
 $('planForm').hidden = true;
 $('newPlan').focus();
};
$('planForm').onsubmit = event => {
 event.preventDefault();
 const form = event.currentTarget;
 const input = form.elements;
 const previous = workspaceState.entries.find(entry => entry.id === input.id.value);
 workspaceAction(event.submitter || form.querySelector('[type=submit]'), async () => {
  const entry = {
   id: input.id.value, title: input.title.value.trim(), plan_type: input.type.value,
   due_on: input.date.value || null, note: input.note.value, completed: previous?.completed || false,
  };
  await writeEntry('save_plan', entry, previous, entry.id);
  form.hidden = true;
  $('newPlan').focus();
 });
};

document.addEventListener('click', event => {
 const button = event.target.closest('[data-entry-action],[data-add-purchase]');
 if (!button) return;
 if (button.hasAttribute('data-add-purchase')) {
  const group = C.groups(rows()).find(g => g.key === button.dataset.addPurchase);
  if (!group || !workspaceState.ready) return notify('Откройте дашборд по семейной ссылке.');
  workspaceAction(button, async () => {
   const key = 'catalog/' + group.key;
   button.dataset.pendingId ||= workspaceState.retries.get(key)?.entryId || uid();
   const entry = {id: button.dataset.pendingId, title: group.title, product_key: group.all[0].productKey, completed: false};
   try {
    await writeEntry('save_purchase', entry, null, key);
    notify('Покупка добавлена в список.');
   } catch (error) {
    const retry = workspaceState.retries.get(key);
    if (retry) retry.entryId = entry.id;
    throw error;
   }
  });
  return;
 }
 const entry = workspaceState.entries.find(item => item.id === button.closest('[data-entry]')?.dataset.entry);
 if (!entry) return;
 const action = button.dataset.entryAction;
 if (action === 'edit') return showPlanForm(entry);
 workspaceAction(button, async () => {
  if (action === 'delete') await writeEntry('delete_purchase', null, entry, entry.id);
  else await writeEntry(entry.kind === 'plan' ? 'save_plan' : 'save_purchase', {...entry, completed: !entry.completed}, entry, entry.id);
 });
});

$('purchases').addEventListener('change', event => {
 const select = event.target.closest('[data-entry-store]');
 if (!select) return;
 const entry = workspaceState.entries.find(item => item.id === select.closest('[data-entry]')?.dataset.entry);
 if (!entry) return;
 workspaceAction(select, async () => {
  try {
   await writeEntry('save_purchase', {...entry, store_id: select.value || null}, entry, entry.id);
  } catch (error) {
   select.value = entry.store_id || '';
   throw error;
  }
 });
});

init();
