/* Правила игры «Кодик»: чистая логика без DOM. Работает и в браузере (window.KodikCore), и в node (тесты). */
(function (g) {
  var DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // вверх, вправо, вниз, влево
  var START = '^>v<';

  function parse(rows) {
    var L = { H: rows.length, W: rows[0].length, cells: [], stars: [], start: null, flag: null, key: null, door: null };
    for (var y = 0; y < L.H; y++) {
      L.cells[y] = [];
      for (var x = 0; x < L.W; x++) {
        var ch = rows[y][x], t = '.';
        if (ch === '#' || ch === '~') t = ch;
        else if (ch === 'D') { t = 'D'; L.door = { x: x, y: y }; }
        else if (ch === '*') L.stars.push({ x: x, y: y });
        else if (ch === 'k') L.key = { x: x, y: y };
        else if (ch === 'F') L.flag = { x: x, y: y };
        else if (START.indexOf(ch) >= 0) L.start = { x: x, y: y, d: START.indexOf(ch) };
        L.cells[y][x] = t;
      }
    }
    return L;
  }

  function init(L) { return { x: L.start.x, y: L.start.y, d: L.start.d, got: 0, key: 0, open: 0 }; }

  function inside(L, x, y) { return x >= 0 && y >= 0 && x < L.W && y < L.H; }
  function blocked(L, s, x, y) {
    if (!inside(L, x, y)) return true;
    var t = L.cells[y][x];
    if (t === '#' || t === '~') return true;
    if (t === 'D' && !s.open && s.key !== 1) return true;
    return false;
  }
  function arrive(L, s) {
    L.stars.forEach(function (p, i) { if (p.x === s.x && p.y === s.y) s.got |= 1 << i; });
    if (L.key && L.key.x === s.x && L.key.y === s.y && s.key === 0) s.key = 1;
    if (L.cells[s.y][s.x] === 'D' && !s.open && s.key === 1) { s.open = 1; s.key = 2; }
  }

  /* Один шаг. Команды: f — вперёд, l — налево, r — направо, j — прыжок через клетку.
     Возвращает { s, ok, why }: если нельзя — ok:false и причина. */
  function step(L, s0, c) {
    var s = { x: s0.x, y: s0.y, d: s0.d, got: s0.got, key: s0.key, open: s0.open };
    if (c === 'l') { s.d = (s.d + 3) % 4; return { s: s, ok: true }; }
    if (c === 'r') { s.d = (s.d + 1) % 4; return { s: s, ok: true }; }
    var v = DIRS[s.d];
    if (c === 'f') {
      var nx = s.x + v[0], ny = s.y + v[1];
      if (blocked(L, s, nx, ny)) return { s: s0, ok: false, why: inside(L, nx, ny) ? 'Впереди преграда — через неё можно только перепрыгнуть.' : 'Дальше край поля.' };
      s.x = nx; s.y = ny; arrive(L, s); return { s: s, ok: true };
    }
    if (c === 'j') {
      var mx = s.x + v[0], my = s.y + v[1], lx = s.x + 2 * v[0], ly = s.y + 2 * v[1];
      if (!inside(L, lx, ly)) return { s: s0, ok: false, why: 'Прыгать некуда — там край поля.' };
      if (inside(L, mx, my) && L.cells[my][mx] === 'D' && !s.open) return { s: s0, ok: false, why: 'Дверь высокая — перепрыгнуть нельзя. Найди ключ.' };
      if (blocked(L, s, lx, ly)) return { s: s0, ok: false, why: 'Приземляться некуда — там преграда.' };
      s.x = lx; s.y = ly; arrive(L, s); return { s: s, ok: true };
    }
    return { s: s0, ok: false, why: '?' };
  }

  function won(L, s) { return !!L.flag && s.x === L.flag.x && s.y === L.flag.y && s.got === (1 << L.stars.length) - 1; }
  function key(s) { return s.x + ',' + s.y + ',' + s.d + ',' + s.got + ',' + s.key + ',' + s.open; }

  /* Самая короткая программа без повторов (поиск в ширину) — для звёзд и подсказок. */
  function solve(L, from, maxDepth, cmds) {
    cmds = cmds || 'flrj';
    var s0 = from || init(L), seen = {}, q = [{ s: s0, p: [] }];
    seen[key(s0)] = 1;
    if (won(L, s0)) return [];
    for (var qi = 0; qi < q.length; qi++) {
      var cur = q[qi];
      if (cur.p.length >= (maxDepth || 60)) continue;
      for (var k = 0; k < cmds.length; k++) {
        var c = cmds[k], r = step(L, cur.s, c);
        if (!r.ok) continue;
        var kk = key(r.s);
        if (seen[kk]) continue;
        seen[kk] = 1;
        var p = cur.p.concat(c);
        if (won(L, r.s)) return p;
        q.push({ s: r.s, p: p });
      }
    }
    return null;
  }

  /* Размер программы: каждая команда — 1, блок «повтор» — 1 + его содержимое. */
  function size(list) { return list.reduce(function (n, it) { return n + (it.c === 'rep' ? 1 + size(it.body) : 1); }, 0); }
  function flatten(list, out) {
    out = out || [];
    list.forEach(function (it) { if (it.c === 'rep') { for (var i = 0; i < it.n; i++) flatten(it.body, out); } else out.push(it); });
    return out;
  }

  g.KodikCore = { parse: parse, init: init, step: step, won: won, solve: solve, size: size, flatten: flatten };
})(typeof window !== 'undefined' ? window : globalThis);
