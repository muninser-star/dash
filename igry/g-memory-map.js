/* «Запомни и расставь»: предметы показываются на поле несколько секунд, потом их надо вернуть на свои места. */
(function () {
  var h = FVG.h;
  var THEMES = [
    ['🚀', '🛰️', '🪐', '🌙', '👽', '☄️', '🔭', '🛸', '🌍', '☀️', '⭐', '👨‍🚀', '🧑‍🚀', '🌠'],
    ['🦁', '🐘', '🦒', '🐒', '🐼', '🦓', '🐧', '🦜', '🐯', '🐻', '🦊', '🦘', '🐊', '🦩'],
    ['🚗', '🚌', '🚒', '🚑', '🚲', '🚂', '✈️', '⛵', '🚁', '🛴', '🚜', '🏍️', '🚕', '🛶']
  ];
  var NAMES = ['Космос', 'Зоопарк', 'Транспорт'];
  // [столбцов, строк, предметов, секунд на запоминание]
  var LV = [[3, 3, 3, 8], [3, 3, 4, 8], [4, 3, 5, 9], [4, 4, 6, 10], [4, 4, 7, 10], [5, 4, 8, 10], [5, 5, 9, 10], [5, 5, 10, 9], [6, 5, 12, 10], [6, 6, 14, 10]];

  function play(box, i, ctl) {
    var cols = LV[i][0], rows = LV[i][1], cnt = LV[i][2], secs = LV[i][3], th = i % THEMES.length;
    var items = FVG.shuffle(THEMES[th]).slice(0, cnt), cells = FVG.shuffle(Array.apply(null, { length: cols * rows }).map(function (_, k) { return k; })).slice(0, cnt);
    var answer = {}; cells.forEach(function (c, k) { answer[c] = items[k]; });
    var mine = {}, sel = null, checks = 0, peeks = 0, timer, raf, phase = 'show';
    ctl.onLeave(function () { clearTimeout(timer); cancelAnimationFrame(raf); });

    var tip = h('p', 'kd-tip', ''); box.appendChild(tip);
    var tm = h('div', 'mm-time', '<i></i>'); box.appendChild(tm);
    var grid = h('div', 'mm-grid'); grid.style.cssText = '--w:' + cols + ';grid-template-columns:repeat(' + cols + ',var(--cs))'; box.appendChild(grid);
    var say = h('div', 'fvg-say'); box.appendChild(say);
    var tray = h('div', 'mm-tray'); box.appendChild(tray);
    var act = h('div', 'kd-act'); box.appendChild(act);
    var ready = h('button', 'fvg-btn pri', 'Запомнил!'), chk = h('button', 'fvg-btn acc', '✔ Проверить'), peek = h('button', 'fvg-btn', '👀 Подсмотреть (−★)');

    function cellsDraw(show, marks) {
      grid.innerHTML = '';
      for (var k = 0; k < cols * rows; k++) {
        (function (k) {
          var e = show ? answer[k] : mine[k], c = h('div', 'mm-cell' + (!show && sel ? ' can' : '') + (marks && marks[k] ? ' ' + marks[k] : ''), e || '');
          if (!show && phase === 'build') c.onclick = function () { place(k); };
          grid.appendChild(c);
        })(k);
      }
    }
    function trayDraw() {
      tray.innerHTML = '';
      var used = {}; Object.keys(mine).forEach(function (k) { used[mine[k]] = 1; });
      items.forEach(function (e) {
        if (used[e]) return;
        var b = h('button', e === sel ? 'sel' : '', e); b.onclick = function () { sel = sel === e ? null : e; trayDraw(); cellsDraw(false); }; tray.appendChild(b);
      });
      chk.disabled = Object.keys(mine).length < cnt;
    }
    function place(k) {
      if (mine[k] && !sel) { delete mine[k]; }
      else if (sel) { var old = mine[k]; mine[k] = sel; sel = null; if (old) sel = null; }
      say.textContent = ''; cellsDraw(false); trayDraw();
    }
    function startShow() {
      phase = 'show'; tip.textContent = 'Запомни, где что стоит. Скоро всё спрячется!';
      tm.style.display = ''; cellsDraw(true); tray.innerHTML = ''; act.innerHTML = ''; act.appendChild(ready);
      var t0 = Date.now(), bar = tm.firstChild;
      (function loop() { var k = 1 - (Date.now() - t0) / (secs * 1000); bar.style.width = Math.max(0, k * 100) + '%'; if (k > 0) raf = requestAnimationFrame(loop); })();
      timer = setTimeout(startBuild, secs * 1000);
    }
    function startBuild() {
      clearTimeout(timer); cancelAnimationFrame(raf); phase = 'build'; tm.style.display = 'none';
      tip.textContent = 'Выбери предмет внизу и тапни клетку, куда он стоял. Тап по поставленному — вернёт его.';
      act.innerHTML = ''; act.appendChild(chk); act.appendChild(peek); cellsDraw(false); trayDraw();
    }
    ready.onclick = startBuild;
    peek.onclick = function () {
      if (phase !== 'build') return; peeks++; phase = 'peek'; cellsDraw(true); trayDraw();
      timer = setTimeout(function () { phase = 'build'; cellsDraw(false); trayDraw(); }, 1800);
    };
    chk.onclick = function () {
      if (chk.disabled || phase !== 'build') return; checks++;
      var marks = {}, bad = 0;
      cells.forEach(function (c) { if (mine[c] === answer[c]) marks[c] = 'good'; else { marks[c] = 'bad'; bad++; } });
      Object.keys(mine).forEach(function (k) { if (answer[k] === undefined) { marks[k] = 'bad'; } });
      if (!bad && Object.keys(mine).every(function (k) { return answer[k] !== undefined; })) {
        cellsDraw(false, marks);
        var n = Math.max(1, (checks === 1 ? 3 : checks === 2 ? 2 : 1) - peeks);
        say.className = 'fvg-say ok'; say.textContent = 'Всё на своих местах!';
        timer = setTimeout(function () { ctl.win(n, 'Проверок: ' + checks + (peeks ? ', подсматривал: ' + peeks : '') + '.'); }, 600);
      } else {
        say.className = 'fvg-say bad'; say.textContent = 'Не все на месте — неверные подсвечены красным. Поправь!';
        cellsDraw(false, marks);
        timer = setTimeout(function () { // неверные возвращаются в лоток
          Object.keys(marks).forEach(function (k) { if (marks[k] === 'bad') delete mine[k]; });
          cellsDraw(false); trayDraw();
        }, 1300);
      }
    };
    box.insertBefore(h('p', 'kd-tip', '<b>' + NAMES[th] + ' · ' + cnt + ' предм.</b>'), tip);
    startShow();
  }
  FVG.mount({ slug: 'memory-map', count: LV.length, play: play,
    intro: '🗺️ Несколько секунд смотришь, где что лежит на поле. Потом поле очищается — расставь всё по своим местам. С каждым уровнем предметов больше.' });
})();
