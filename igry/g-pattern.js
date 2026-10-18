/* «Что дальше?»: закономерности — картинки, числа, рост. 10 уровней по 5 заданий. */
(function () {
  var h = FVG.h, rnd = FVG.rnd, sh = FVG.shuffle;
  var EM = ['🍎', '🍌', '🍇', '🍓', '⭐', '🌙', '🚀', '🐱', '🐶', '🦋', '🌸', '🔵', '🔴', '🟢', '🟡', '🟣', '🍊', '🐸'];
  function pick(n) { return sh(EM).slice(0, n); }
  function ensure(opts, ans) { if (opts.indexOf(ans) < 0) opts[0] = ans; return sh(opts); }

  function cyc(unit, len) { // повторяющийся узор
    var seq = []; for (var k = 0; k < len; k++) seq.push(unit[k % unit.length]); return seq;
  }
  function mkCycle(units, len) {
    return function () {
      var e = pick(3), u = units(e), seq = cyc(u, len), hide = len - 1 - rnd(2), ans = seq[hide];
      var opts = ensure(e.slice(0, 3).concat([pick(4)[3]]), ans);
      return { seq: seq.map(function (v, k) { return k === hide ? null : v; }), ans: ans, opts: opts };
    };
  }
  function mkNum(step, from, len, hideLast) {
    return function () {
      var s = typeof step === 'function' ? step() : step, a = typeof from === 'function' ? from() : from, seq = [];
      for (var k = 0; k < len; k++) seq.push(String(a + s * k));
      var ans = seq[len - 1], opts = [ans, String(+ans + s + 1), String(+ans - 1), String(+ans + 2), String(+ans - s)];
      return { seq: seq.map(function (v, k) { return k === len - 1 ? null : v; }), ans: ans, opts: ensure(opts.filter(function (o, k, a2) { return +o >= 0 && a2.indexOf(o) === k; }).slice(0, 4), ans) };
    };
  }
  function growing() {
    var e = pick(1)[0], n = 1 + rnd(2), seq;
    seq = [e.repeat(n), e.repeat(n + 1), e.repeat(n + 2)]; var ans = e.repeat(n + 3);
    return { seq: seq.concat([null]), ans: ans, opts: ensure([ans, e.repeat(n + 2), e.repeat(n + 4), e.repeat(n + 1)], ans) };
  }
  function mul(m) { return function () {
    var a = 1 + rnd(2), seq = [a, a * m, a * m * m, a * m * m * m], ans = String(a * m * m * m * m);
    return { seq: seq.map(String).concat([null]), ans: ans, opts: ensure([ans, String(a * m * m * m + m), String(a * m * m * m * m + m), String(a * m * m * m * (m + 1))], ans) };
  }; }
  function inter() { // два ряда вперемешку: 1, 10, 2, 20, 3, ? → 30
    var a = 1 + rnd(3), b = 10 * (1 + rnd(2)), s = [], k;
    for (k = 0; k < 3; k++) { s.push(String(a + k)); s.push(String(b * (k + 1))); }
    var ans = s.pop();
    return { seq: s.concat([null]), ans: ans, opts: ensure([ans, String(+ans + 10), String(+ans - 10), String(+ans + 1)], ans) };
  }
  function fib() {
    var s = [1, 1, 2, 3, 5], ans = '8'; return { seq: s.map(String).concat([null]), ans: ans, opts: ensure(['8', '7', '9', '10'], ans) };
  }
  function squares() {
    var s = ['1', '4', '9', '16'], ans = '25'; return { seq: s.concat([null]), ans: ans, opts: ensure(['25', '20', '24', '36'], ans) };
  }
  function down() {
    var step = 2 + rnd(3), start = 20 + rnd(10), seq = []; for (var k = 0; k < 5; k++) seq.push(String(start - step * k));
    var ans = String(start - step * 5); return { seq: seq.concat([null]), ans: ans, opts: ensure([ans, String(+ans + step), String(+ans - 1), String(+ans + 1)], ans) };
  }
  var GEN = [
    mkCycle(function (e) { return [e[0], e[1]]; }, 6),
    mkCycle(function (e) { return [e[0], e[1], e[2]]; }, 7),
    mkCycle(function (e) { return [e[0], e[0], e[1]]; }, 8),
    mkNum(function () { return 1 + rnd(2); }, function () { return 1 + rnd(4); }, 5),
    growing,
    mkNum(function () { return 2 + rnd(4); }, function () { return rnd(5); }, 5),
    down,
    inter,
    mul(2),
    function () { return [fib, squares][rnd(2)](); }
  ];
  var TIPS = ['Узор повторяется. Что стоит на месте вопроса?', 'Теперь три картинки в повторе.', 'Две одинаковые, потом одна другая — и снова.', 'Числа растут на одно и то же.', 'Каждый раз добавляется ещё одна.', 'Числа растут шагами побольше.', 'Числа убывают — на сколько?', 'Два ряда чисел идут вперемешку!', 'Каждое число больше предыдущего в несколько раз.', 'Хитрые ряды: ищи, как получается каждое следующее.'];

  function play(box, i, ctl) {
    var rounds = [], R = 5, cur = 0, miss = 0;
    for (var k = 0; k < R; k++) rounds.push(GEN[i]());
    box.appendChild(h('p', 'kd-tip', TIPS[i]));
    var dots = h('div', 'pt-dots'); box.appendChild(dots);
    var seq = h('div', 'pt-seq'); box.appendChild(seq);
    var opts = h('div', 'pt-opts'); box.appendChild(opts);
    var say = h('div', 'fvg-say'); box.appendChild(say);
    var timer; ctl.onLeave(function () { clearTimeout(timer); });
    function show() {
      var r = rounds[cur]; dots.innerHTML = ''; for (var k = 0; k < R; k++) dots.appendChild(h('i', k < cur ? 'on' : k === cur ? 'cur' : ''));
      seq.innerHTML = ''; r.seq.forEach(function (v) { seq.appendChild(h('div', 'pt-it' + (v === null ? ' q' : ''), v === null ? '?' : v)); });
      opts.innerHTML = '';
      r.opts.forEach(function (o) {
        var b = h('button', '', o);
        b.onclick = function () {
          if (o === r.ans) {
            seq.querySelector('.q').textContent = o; say.className = 'fvg-say ok'; say.textContent = 'Верно!'; cur++;
            timer = setTimeout(function () { say.textContent = ''; if (cur >= R) ctl.win(miss === 0 ? 3 : miss <= 2 ? 2 : 1, 'Ошибок: ' + miss + '.'); else show(); }, 650);
          } else { miss++; b.disabled = true; b.style.opacity = .35; say.className = 'fvg-say bad'; say.textContent = 'Не то, подумай ещё'; opts.classList.add('fvg-shake'); setTimeout(function () { opts.classList.remove('fvg-shake'); }, 400); }
        }; opts.appendChild(b);
      });
    }
    show();
  }
  FVG.mount({ slug: 'pattern', count: GEN.length, play: play,
    intro: '🔮 Найди закономерность и скажи, что стоит на месте вопроса. В каждом уровне 5 заданий; ряды становятся хитрее.' });
})();
