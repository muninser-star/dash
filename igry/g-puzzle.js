/* «Пазл-приключение»: картинка по теме поездки, разрезанная на плитки. Тап по двум плиткам — они меняются местами. */
(function () {
  var h = FVG.h;
  var S = function (body) { return body; };
  var SCENES = {
    kosmos: { n: '🚀 Космос', sub: 'Музей космонавтики', svg: S(
      '<rect width="400" height="300" fill="#10103a"/><rect y="170" width="400" height="130" fill="#1b1b5e"/>' +
      '<g fill="#fff"><circle cx="30" cy="30" r="2"/><circle cx="90" cy="70" r="1.5"/><circle cx="150" cy="22" r="2"/><circle cx="210" cy="60" r="1.5"/><circle cx="250" cy="20" r="2"/><circle cx="345" cy="40" r="2"/><circle cx="380" cy="130" r="1.5"/><circle cx="20" cy="140" r="1.5"/><circle cx="120" cy="120" r="2"/><circle cx="230" cy="130" r="1.5"/><circle cx="330" cy="100" r="1.5"/></g>' +
      '<circle cx="310" cy="85" r="48" fill="#ff9d4d"/><ellipse cx="310" cy="85" rx="78" ry="14" fill="none" stroke="#ffd9a0" stroke-width="7" transform="rotate(-18 310 85)"/><circle cx="296" cy="72" r="9" fill="#e87d2e"/><circle cx="326" cy="98" r="6" fill="#e87d2e"/>' +
      '<circle cx="55" cy="265" r="95" fill="#cfd3e6"/><circle cx="35" cy="225" r="15" fill="#aeb3cc"/><circle cx="90" cy="250" r="11" fill="#aeb3cc"/><circle cx="60" cy="285" r="9" fill="#aeb3cc"/>' +
      '<g transform="translate(190 60) rotate(25 40 80)"><path d="M40 0 C70 40 70 100 62 140 L18 140 C10 100 10 40 40 0Z" fill="#f2f4ff"/><circle cx="40" cy="62" r="14" fill="#5fd0ff" stroke="#9aa2d6" stroke-width="4"/><path d="M40 0 C55 18 62 30 64 44 L16 44 C18 30 25 18 40 0Z" fill="#ff5a4f"/><path d="M18 100 L-10 150 L22 135Z M62 100 L90 150 L58 135Z" fill="#ff5a4f"/><path d="M26 140 L40 190 L54 140Z" fill="#ffc83d"/></g>' +
      '<circle cx="200" cy="255" r="22" fill="#6fe0a0"/><circle cx="192" cy="250" r="3" fill="#10103a"/><circle cx="208" cy="250" r="3" fill="#10103a"/><path d="M190 262 Q200 270 210 262" stroke="#10103a" stroke-width="3" fill="none"/>') },
    nizhny: { n: '🏰 Нижний Новгород', sub: 'Кремль на Волге', svg: S(
      '<rect width="400" height="300" fill="#8fd4ff"/><circle cx="330" cy="55" r="34" fill="#ffd95a"/><ellipse cx="90" cy="50" rx="46" ry="16" fill="#fff"/><ellipse cx="120" cy="40" rx="30" ry="13" fill="#fff"/><ellipse cx="240" cy="85" rx="40" ry="12" fill="#fff"/>' +
      '<rect y="225" width="400" height="75" fill="#3a8fd8"/><path d="M0 245 q25-10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#bfe6ff" stroke-width="4" fill="none"/><path d="M0 275 q25-10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#bfe6ff" stroke-width="4" fill="none"/>' +
      '<rect x="0" y="195" width="400" height="38" fill="#8a9a54"/>' +
      '<rect x="20" y="130" width="360" height="75" fill="#c4452e"/><g fill="#a53520"><rect x="20" y="124" width="22" height="10"/><rect x="60" y="124" width="22" height="10"/><rect x="100" y="124" width="22" height="10"/><rect x="278" y="124" width="22" height="10"/><rect x="318" y="124" width="22" height="10"/><rect x="358" y="124" width="22" height="10"/></g>' +
      '<rect x="150" y="60" width="64" height="145" fill="#d4573d"/><path d="M142 62 L182 8 L222 62Z" fill="#2f8f5b"/><rect x="170" y="86" width="24" height="38" rx="12" fill="#2c1b18"/><path d="M182 8 L182-6" stroke="#ffd95a" stroke-width="4"/><circle cx="182" cy="8" r="5" fill="#ffd95a"/>' +
      '<rect x="46" y="86" width="42" height="119" fill="#d4573d"/><path d="M40 88 L67 40 L94 88Z" fill="#2f8f5b"/><rect x="58" y="108" width="18" height="26" rx="9" fill="#2c1b18"/>' +
      '<rect x="300" y="96" width="46" height="109" fill="#d4573d"/><path d="M294 98 L323 48 L352 98Z" fill="#2f8f5b"/><rect x="313" y="118" width="20" height="26" rx="10" fill="#2c1b18"/>' +
      '<g fill="#2c1b18"><rect x="104" y="150" width="14" height="22" rx="7"/><rect x="238" y="150" width="14" height="22" rx="7"/><rect x="266" y="150" width="14" height="22" rx="7"/><rect x="132" y="150" width="14" height="22" rx="7"/></g>' +
      '<path d="M230 260 l40 0 l-8 14 l-24 0Z" fill="#fff"/><path d="M250 232 v28" stroke="#6b4a2a" stroke-width="3"/><path d="M250 234 l20 20 l-20 0Z" fill="#ff6b5a"/>') },
    dino: { n: '🦖 Динозавры', sub: 'Дарвиновский музей', svg: S(
      '<rect width="400" height="300" fill="#ffe3a8"/><circle cx="70" cy="60" r="36" fill="#ff9f43"/>' +
      '<path d="M200 220 L260 70 L300 70 L360 220Z" fill="#7b4a32"/><path d="M250 70 L310 70 L296 92 L264 92Z" fill="#ff5a2e"/><circle cx="275" cy="46" r="14" fill="#8a8a8a" opacity=".6"/><circle cx="292" cy="26" r="10" fill="#8a8a8a" opacity=".5"/><path d="M270 92 q4 30 -6 50 M290 92 q-2 26 8 46" stroke="#ff9f43" stroke-width="5" fill="none"/>' +
      '<rect y="215" width="400" height="85" fill="#6fb04f"/><path d="M0 235 q40-18 80 0 t80 0 t80 0 t80 0 t80 0" fill="#58a03c"/>' +
      '<g transform="translate(40 130)"><ellipse cx="70" cy="95" rx="60" ry="42" fill="#43b05c"/><path d="M118 70 C150 30 160 10 190 20 C206 30 200 52 180 60 C160 70 140 90 120 100Z" fill="#43b05c"/><circle cx="184" cy="30" r="5" fill="#fff"/><circle cx="185" cy="30" r="2.5" fill="#222"/><path d="M174 46 q10 4 20 -2" stroke="#2c6e3b" stroke-width="3" fill="none"/><path d="M20 70 L34 44 L50 66 L66 38 L82 62 L98 40 L108 68Z" fill="#ffc83d"/><path d="M12 100 C-10 105 -25 120 -34 140 C0 138 20 128 30 118Z" fill="#43b05c"/><rect x="48" y="120" width="18" height="40" rx="8" fill="#348f48"/><rect x="88" y="124" width="18" height="36" rx="8" fill="#348f48"/></g>' +
      '<g><rect x="355" y="140" width="9" height="90" fill="#7a5230"/><path d="M360 140 q-30-10-44 12 M360 140 q30-10 44 12 M360 140 q-6-34-30-38 M360 140 q8-34 32-34" stroke="#2f8f3a" stroke-width="9" fill="none" stroke-linecap="round"/></g>' +
      '<ellipse cx="205" cy="268" rx="16" ry="21" fill="#fff5e0" stroke="#d9c7a0" stroke-width="3"/><ellipse cx="238" cy="276" rx="12" ry="16" fill="#fff5e0" stroke="#d9c7a0" stroke-width="3"/><path d="M198 262 l6 6 l5-8 l5 8" stroke="#c9b078" stroke-width="2" fill="none"/>') },
    sea: { n: '⛵ Море', sub: 'Морское приключение', svg: S(
      '<defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6cc7ff"/><stop offset="1" stop-color="#ffd9a0"/></linearGradient></defs><rect width="400" height="300" fill="url(#skyg)"/>' +
      '<circle cx="300" cy="140" r="40" fill="#ffb347"/><rect y="150" width="400" height="150" fill="#1f86d6"/><path d="M0 170 q25-10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#7fd0ff" stroke-width="4" fill="none"/>' +
      '<path d="M0 215 q25-10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#7fd0ff" stroke-width="4" fill="none"/><path d="M0 262 q25-10 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#7fd0ff" stroke-width="4" fill="none"/>' +
      '<path d="M60 175 L170 175 L150 205 L80 205Z" fill="#b5532f"/><path d="M115 175 V70" stroke="#6b4a2a" stroke-width="5"/><path d="M118 72 L118 168 L168 168Z" fill="#fff"/><path d="M112 82 L112 168 L72 168Z" fill="#ff6b5a"/><path d="M115 70 l22 8 l-22 8Z" fill="#ffd95a"/>' +
      '<g transform="translate(250 225)"><ellipse cx="40" cy="22" rx="38" ry="20" fill="#ffa43a"/><path d="M76 22 L104 4 L104 40Z" fill="#ff7a2e"/><circle cx="20" cy="16" r="4" fill="#fff"/><circle cx="20" cy="16" r="2" fill="#111"/><path d="M36 6 q8 16 0 32" stroke="#fff" stroke-width="3" fill="none"/></g>' +
      '<g transform="translate(30 235)"><ellipse cx="30" cy="16" rx="26" ry="14" fill="#9b6bff"/><path d="M56 16 L76 4 L76 30Z" fill="#7c4be0"/><circle cx="14" cy="12" r="3" fill="#fff"/></g>' +
      '<path d="M330 150 q-8-40 6-60 q8 12 4 24 q16-8 22-30 q6 30-8 52z" fill="#2f8f3a"/>') }
  };
  // [столбцов, строк, часов подсказки]
  var SIZES = [[2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [5, 4], [6, 4], [6, 5]];
  var theme = (FVG.load('puzzle').theme) || 'kosmos';
  if (!SCENES[theme]) theme = 'kosmos';

  function tileSvg(col, row, cols, rows) {
    var w = 400 / cols, ht = 300 / rows;
    return '<svg viewBox="' + (col * w) + ' ' + (row * ht) + ' ' + w + ' ' + ht + '" preserveAspectRatio="none"><use href="#pz-scene"/></svg>';
  }

  function play(box, i, ctl) {
    var cols = SIZES[i][0], rows = SIZES[i][1], n = cols * rows, hints = 0, moves = 0, sel = -1;
    var themes = h('div', 'pz-themes');
    Object.keys(SCENES).forEach(function (k) {
      var b = h('button', k === theme ? 'on' : '', SCENES[k].n);
      b.onclick = function () { var d = FVG.load('puzzle'); d.theme = k; FVG.save('puzzle', d); theme = k; build(); themes.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); };
      themes.appendChild(b);
    });
    box.appendChild(themes);
    var sub = h('p', 'kd-tip', ''); box.appendChild(sub);
    var wrap = h('div'); wrap.style.position = 'relative'; box.appendChild(wrap);
    var board = h('div', 'pz-board'); wrap.appendChild(board);
    var prev = h('div', 'pz-prev'); wrap.appendChild(prev);
    var say = h('div', 'fvg-say'); box.appendChild(say);
    var act = h('div', 'kd-act'); box.appendChild(act);
    var hint = h('button', 'fvg-btn', '👁 Показать картинку'); act.appendChild(hint);
    var order; // order[pos] = номер правильной плитки, лежащей на позиции pos

    function scramble() {
      do { order = FVG.shuffle(Array.apply(null, { length: n }).map(function (_, k) { return k; })); }
      while (order.every(function (v, k) { return v === k; }) || order.filter(function (v, k) { return v === k; }).length > n / 3);
    }
    function build() {
      var sc = SCENES[theme];
      sub.innerHTML = '<b>' + sc.n + '</b> · ' + sc.sub + '. Тапни две плитки — они поменяются местами.';
      wrap.querySelector('#pz-defs') && wrap.querySelector('#pz-defs').remove();
      var defs = h('div'); defs.id = 'pz-defs'; defs.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      defs.innerHTML = '<svg width="0" height="0"><defs><g id="pz-scene">' + sc.svg + '</g></defs></svg>';
      wrap.appendChild(defs);
      prev.innerHTML = '<svg viewBox="0 0 400 300"><use href="#pz-scene"/></svg>';
      draw();
    }
    function draw() {
      board.innerHTML = ''; board.style.gridTemplateColumns = 'repeat(' + cols + ',1fr)'; board.style.gridTemplateRows = 'repeat(' + rows + ',1fr)';
      order.forEach(function (v, pos) {
        var t = h('div', 'pz-t' + (v === pos ? ' ok' : '') + (pos === sel ? ' sel' : ''), tileSvg(v % cols, Math.floor(v / cols), cols, rows));
        t.onclick = function () { tap(pos); };
        board.appendChild(t);
      });
    }
    function tap(pos) {
      if (order[pos] === pos) return;
      if (sel < 0) { sel = pos; draw(); return; }
      if (sel === pos) { sel = -1; draw(); return; }
      var t = order[sel]; order[sel] = order[pos]; order[pos] = t; sel = -1; moves++; draw();
      if (order.every(function (v, k) { return v === k; })) {
        var par = n, stars = hints === 0 && moves <= Math.ceil(par * 1.6) ? 3 : hints <= 2 && moves <= par * 3 ? 2 : 1;
        say.className = 'fvg-say ok'; say.textContent = 'Картинка собрана!';
        setTimeout(function () { ctl.win(stars, 'Ходов: ' + moves + ', подсказок: ' + hints + '.'); }, 600);
      }
    }
    var pt;
    hint.onclick = function () { hints++; prev.style.display = 'block'; clearTimeout(pt); pt = setTimeout(function () { prev.style.display = 'none'; }, 2500); };
    ctl.onLeave(function () { clearTimeout(pt); });
    scramble(); build();
  }

  FVG.mount({ slug: 'puzzle', count: SIZES.length, play: play,
    intro: '🧩 Собери картинку из кусочков. Темы — как у наших приключений: космос, Нижний Новгород, динозавры и море. Чем дальше уровень, тем больше кусочков. Три звезды — если справился без подсказок.' });
})();
