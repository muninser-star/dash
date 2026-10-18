/* «Кодик»: ребёнок собирает программу из команд, робот её выполняет. Правила — kodik-core.js, уровни — kodik-levels.json. */
(function () {
  var K = window.KodikCore, LV = window.KODIK_LEVELS, h = FVG.h;
  var WORLDS = [
    { n: 'Луна', f1: '#d8dcec', f2: '#cdd2e6', rk: '#8a8fa8', wt: '#2b2f6b', rock: '🪨', water: '🕳️' },
    { n: 'Джунгли', f1: '#bfe8a8', f2: '#b2de99', rk: '#8c7355', wt: '#58b6f0', rock: '🪨', water: '🌊' },
    { n: 'Замок', f1: '#f2e2c4', f2: '#ead6b0', rk: '#a5775a', wt: '#e8663c', rock: '🧱', water: '🔥' },
    { n: 'Космодром', f1: '#c9c4f0', f2: '#bdb7ea', rk: '#5a5688', wt: '#1d1a52', rock: '☄️', water: '🌌' }
  ];
  var CMD = { f: ['⬆️', 'Вперёд'], l: ['↰', 'Налево'], r: ['↱', 'Направо'], j: ['🦘', 'Прыжок'] };
  var uid = 0;

  function play(box, i, ctl) {
    var def = LV[i], L = K.parse(def.rows), W = WORLDS[def.world || 0], cmds = def.jump === false ? 'flr' : 'flrj';
    var par = K.solve(L, null, 60, cmds).length, prog = [], target = prog, openRep = null, running = false, hinted = 0, st = K.init(L);

    box.innerHTML = '';
    box.appendChild(h('p', 'kd-tip', '<b>' + W.n + ' · ' + def.title + '.</b> ' + def.tip));
    var board = h('div', 'kd-board'); board.style.cssText = '--w:' + L.W + ';--fl1:' + W.f1 + ';--fl2:' + W.f2 + ';--rk:' + W.rk + ';--wt:' + W.wt;
    var cellEl = [];
    for (var y = 0; y < L.H; y++) for (var x = 0; x < L.W; x++) {
      var t = L.cells[y][x], c = h('div', 'kd-c' + (t === '#' ? ' rock' : t === '~' ? ' water' : ''));
      c.textContent = t === '#' ? W.rock : t === '~' ? W.water : t === 'D' ? '🚪' : '';
      cellEl[y * L.W + x] = c; board.appendChild(c);
    }
    function put(p, e) { cellEl[p.y * L.W + p.x].textContent = e; }
    put(L.flag, '🏁'); L.stars.forEach(function (p) { put(p, '⭐'); }); if (L.key) put(L.key, '🗝️');
    var rb = h('div', 'kd-rb', '<span class="dir"></span><span class="face">🤖</span>'); board.appendChild(rb);
    box.appendChild(board);

    function draw() { rb.style.setProperty('--x', st.x); rb.style.setProperty('--y', st.y); rb.querySelector('.dir').style.setProperty('--r', (st.d * 90) + 'deg'); }
    function resetWorld() {
      st = K.init(L); draw();
      L.stars.forEach(function (p) { put(p, '⭐'); }); if (L.key) put(L.key, '🗝️'); if (L.door) put(L.door, '🚪');
    }
    function sync() { // убрать съеденное
      L.stars.forEach(function (p, k) { if (st.got & (1 << k)) put(p, ''); });
      if (L.key && st.key !== 0) put(L.key, '');
      if (L.door && st.open) put(L.door, '');
    }
    resetWorld();

    var say = h('div', 'fvg-say'); box.appendChild(say);
    var progBox = h('div', 'kd-prog'); box.appendChild(progBox);
    var count = h('div', 'kd-count'); box.appendChild(count);
    var pal = h('div', 'kd-pal'); box.appendChild(pal);
    var act = h('div', 'kd-act'); box.appendChild(act);

    function used() { return K.size(prog); }
    function chipOf(it) { var e = h('button', 'kd-chip', CMD[it.c][0]); e.title = CMD[it.c][1]; e.dataset.id = it.id; e.onclick = function () { if (running) return; remove(it); }; return e; }
    function remove(it) {
      function rm(list) { var k = list.indexOf(it); if (k >= 0) { list.splice(k, 1); return true; } return list.some(function (x) { return x.c === 'rep' && rm(x.body); }); }
      if (it === openRep) openRep = null;
      rm(prog); if (!openRep) target = prog; render();
    }
    function renderList(list, into) {
      list.forEach(function (it) {
        if (it.c !== 'rep') { into.appendChild(chipOf(it)); return; }
        var r = h('span', 'kd-rep' + (it === openRep ? ' open' : '')), n = h('button', 'n', '🔁 ×' + it.n);
        n.onclick = function () { if (running) return; it.n = it.n >= 5 ? 2 : it.n + 1; render(); };
        r.appendChild(n);
        renderList(it.body, r);
        if (!it.body.length) r.appendChild(h('span', 'ph', 'добавь команды'));
        var x = h('button', 'kd-chip', '✕'); x.style.cssText = 'font-size:12px;border-color:#bbb;color:#888;padding:2px 6px'; x.onclick = function () { if (!running) remove(it); }; r.appendChild(x);
        r.onclick = function (e) { if (e.target === r && !running) { openRep = it; target = it.body; render(); } };
        into.appendChild(r);
      });
    }
    function render() {
      progBox.innerHTML = '';
      if (!prog.length) progBox.appendChild(h('span', 'ph', 'Здесь появится твоя программа. Нажимай команды ниже ⬇️'));
      renderList(prog, progBox);
      count.textContent = 'Команд: ' + used() + ' из ' + def.limit;
      pal.querySelectorAll('button').forEach(function (b) { b.disabled = running || (b.dataset.c !== 'rep' && used() >= def.limit && !b.dataset.close) || (b.dataset.c === 'rep' && !openRep && used() >= def.limit - 1); });
      go.disabled = running || !prog.length; clr.disabled = running || !prog.length;
      var rp = pal.querySelector('[data-c=rep]'); if (rp) { rp.firstChild.textContent = openRep ? '✔' : '🔁'; rp.lastChild.textContent = openRep ? 'Закрыть повтор' : 'Повтор'; }
    }
    cmds.split('').forEach(function (c) {
      var b = h('button', '', '<span>' + CMD[c][0] + '</span>' + CMD[c][1]); b.dataset.c = c;
      b.onclick = function () { if (used() >= def.limit) return; target.push({ c: c, id: ++uid }); say.textContent = ''; render(); };
      pal.appendChild(b);
    });
    if (def.rep) {
      var rbn = h('button', '', '<span>🔁</span>Повтор'); rbn.dataset.c = 'rep';
      rbn.onclick = function () { if (openRep) { openRep = null; target = prog; } else { var r = { c: 'rep', n: 2, body: [], id: ++uid }; prog.push(r); openRep = r; target = r.body; } render(); };
      pal.appendChild(rbn);
    }
    var go = h('button', 'fvg-btn acc', '▶ Поехали!'), clr = h('button', 'fvg-btn', '🗑 Очистить'), hint = h('button', 'fvg-btn', '💡 Подсказка');
    act.appendChild(go); act.appendChild(clr); act.appendChild(hint);
    clr.onclick = function () { prog.length = 0; openRep = null; target = prog; resetWorld(); say.textContent = ''; render(); };
    hint.onclick = function () {
      var p = K.solve(L, K.init(L), 60, cmds) || [];
      hinted++; say.className = 'fvg-say'; say.textContent = 'Начало пути: ' + p.slice(0, 4).map(function (c) { return CMD[c][0]; }).join(' ') + (p.length > 4 ? ' …' : '');
    };

    var timer;
    ctl.onLeave(function () { clearTimeout(timer); });
    go.onclick = function () {
      if (running) return; running = true; resetWorld(); say.textContent = ''; render();
      var seq = K.flatten(prog), k = 0;
      function end(win, msg) {
        running = false; progBox.querySelectorAll('.run').forEach(function (e) { e.classList.remove('run'); });
        if (win) {
          var u = used(), n = u <= par ? 3 : u <= Math.ceil(par * 1.6) ? 2 : 1;
          if (hinted) n = Math.min(n, 2);
          say.className = 'fvg-say ok'; say.textContent = 'Ура, добрался до флажка!';
          timer = setTimeout(function () { ctl.win(n, 'Команд: ' + u + ' (лучше всего — ' + par + (def.rep ? ' и меньше с повтором' : '') + ').'); }, 500);
        } else {
          say.className = 'fvg-say bad'; say.textContent = msg; render();
          timer = setTimeout(resetWorld, 1100);
        }
      }
      function tick() {
        progBox.querySelectorAll('.run').forEach(function (e) { e.classList.remove('run'); });
        if (k >= seq.length) {
          if (K.won(L, st)) return end(true);
          var left = L.stars.length - bits(st.got);
          return end(false, K.won(L, Object.assign({}, st, { got: (1 << L.stars.length) - 1 })) ? 'Не все звёзды собраны — осталось ' + left + '.' : 'Робот остановился не у флажка. Попробуй ещё раз!');
        }
        var it = seq[k++], chip = progBox.querySelector('[data-id="' + it.id + '"]'); if (chip) chip.classList.add('run');
        var r = K.step(L, st, it.c);
        if (!r.ok) { rb.classList.add('bump'); setTimeout(function () { rb.classList.remove('bump'); }, 450); return end(false, 'Ой! ' + r.why); }
        st = r.s; if (it.c === 'j') { rb.classList.add('jump'); setTimeout(function () { rb.classList.remove('jump'); }, 360); }
        draw(); sync(); timer = setTimeout(tick, it.c === 'l' || it.c === 'r' ? 380 : 520);
      }
      timer = setTimeout(tick, 250);
    };
    function bits(n) { var c = 0; while (n) { c += n & 1; n >>= 1; } return c; }
    render();
  }

  FVG.mount({ slug: 'kodik', count: LV.length, play: play,
    intro: '🤖 Робот Кодик заблудился. Составь для него программу из команд — и он дойдёт до флажка 🏁. С каждым уровнем путь сложнее: камни, река, прыжки, звёзды, ключи и повторы.' });
})();
