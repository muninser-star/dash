/* Общий движок мини-игр: экран уровней, звёзды, прогресс в браузере, окно победы. Без зависимостей. */
(function () {
  'use strict';
  var KEY = 'fv:games:';
  function h(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function load(slug) { try { return JSON.parse(localStorage.getItem(KEY + slug) || '{}') || {}; } catch (e) { return {}; } }
  function save(slug, v) { try { localStorage.setItem(KEY + slug, JSON.stringify(v)); } catch (e) { /* без хранилища играем без сохранения */ } }
  function stars(n, total) { total = total || 3; var s = ''; for (var i = 0; i < total; i++) s += i < n ? '★' : '<i>★</i>'; return s; }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function rnd(n) { return Math.floor(Math.random() * n); }
  function confetti(n) {
    var em = ['⭐', '🎉', '✨', '🚀', '🎈', '🌟'];
    for (var i = 0; i < (n || 24); i++) {
      (function (i) { setTimeout(function () {
        var c = h('span', 'fvg-conf', em[rnd(em.length)]); c.style.left = rnd(96) + 'vw'; c.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
        document.body.appendChild(c); setTimeout(function () { c.remove(); }, 3200); }, i * 40); })(i);
    }
  }

  var FVG = {
    h: h, load: load, save: save, stars: stars, shuffle: shuffle, rnd: rnd, confetti: confetti,
    summary: function (slug, count) {
      var s = (load(slug).stars || []), sum = 0, done = 0;
      for (var i = 0; i < s.length; i++) if (s[i]) { sum += s[i]; done++; }
      return { done: done, sum: sum, count: count };
    },
    /* cfg: { slug, title, count, intro, play(box, i, ctl) } */
    mount: function (cfg) {
      var root = document.getElementById('game'), data = load(cfg.slug), cur = -1, cleanups = [];
      root.className = 'fvg'; data.stars = data.stars || [];
      function open(i) { return data.all || i === 0 || data.stars[i - 1] > 0 || data.stars[i] > 0; }
      function leave() { cleanups.forEach(function (f) { try { f(); } catch (e) {} }); cleanups = []; var w = document.querySelector('.fvg-win'); if (w) w.remove(); }

      function levels() {
        leave(); cur = -1; try { history.replaceState(null, '', location.pathname); } catch (e) {}
        root.innerHTML = '';
        if (cfg.intro) root.appendChild(h('div', 'fvg-intro', cfg.intro));
        var grid = h('div', 'fvg-levels');
        for (var i = 0; i < cfg.count; i++) {
          (function (i) {
            var b = h('button', 'fvg-lv', '<b>' + (i + 1) + '</b><small>' + (open(i) ? stars(data.stars[i] || 0) : '🔒') + '</small>');
            if (!open(i)) b.disabled = true; else b.onclick = function () { play(i); };
            grid.appendChild(b);
          })(i);
        }
        root.appendChild(grid);
        var foot = h('div', 'fvg-foot');
        if (!data.all) { var u = h('button', '', 'Открыть все уровни'); u.onclick = function () { data.all = 1; save(cfg.slug, data); levels(); }; foot.appendChild(u); }
        else { var r = h('button', '', 'Сбросить прогресс'); r.onclick = function () { if (confirm('Стереть звёзды и закрыть уровни заново?')) { data = { stars: [] }; save(cfg.slug, data); levels(); } }; foot.appendChild(r); }
        root.appendChild(foot);
      }

      function play(i) {
        leave(); cur = i; root.innerHTML = '';
        try { history.replaceState(null, '', '#L' + (i + 1)); } catch (e) {}
        var bar = h('div', 'fvg-bar'), back = h('button', 'fvg-btn', '← Уровни'), again = h('button', 'fvg-btn', '↺ Начать заново');
        back.onclick = levels; again.onclick = function () { play(i); };
        bar.appendChild(back); bar.appendChild(h('div', 't', 'Уровень ' + (i + 1) + ' из ' + cfg.count)); bar.appendChild(again);
        root.appendChild(bar);
        var box = h('div', 'fvg-box'); root.appendChild(box);
        var ctl = {
          i: i, onLeave: function (f) { cleanups.push(f); },
          restart: function () { play(i); },
          win: function (n, msg) { done(n, msg); }
        };
        cfg.play(box, i, ctl);
      }

      function done(n, msg) {
        n = Math.max(1, Math.min(3, n | 0));
        if (n > (data.stars[cur] || 0)) data.stars[cur] = n;
        save(cfg.slug, data);
        confetti(n * 10);
        var last = cur >= cfg.count - 1, i = cur;
        var w = h('div', 'fvg-win'), c = h('div'), row = h('div', 'row');
        c.innerHTML = '<h2>' + (last ? '🏆 Все уровни пройдены!' : ['Получилось!', 'Отлично!', 'Супер!'][n - 1]) + '</h2><div class="st">' + stars(n) + '</div><p>' + (msg || (n === 3 ? 'Идеально, три звезды!' : 'Попробуй ещё раз — можно получить три звезды.')) + '</p>';
        var b1 = h('button', 'fvg-btn', '↺ Ещё раз'), b2 = h('button', 'fvg-btn', 'К уровням');
        b1.onclick = function () { play(i); }; b2.onclick = levels;
        if (!last) { var nx = h('button', 'fvg-btn pri', 'Дальше ▶'); nx.onclick = function () { play(i + 1); }; row.appendChild(nx); }
        row.appendChild(b1); row.appendChild(b2); c.appendChild(row); w.appendChild(c); document.body.appendChild(w);
      }

      var m = /^#L(\d+)$/.exec(location.hash || '');
      if (m && +m[1] >= 1 && +m[1] <= cfg.count && open(+m[1] - 1)) play(+m[1] - 1); else levels();
    }
  };
  window.FVG = FVG;
})();
