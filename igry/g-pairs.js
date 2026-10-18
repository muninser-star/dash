/* «Найди пару»: классическая память. Для самых маленьких начинается с четырёх карточек. */
(function () {
  var h = FVG.h;
  var POOL = ['🚀', '🪐', '🌙', '⭐', '☄️', '🛰️', '👽', '🔭', '🦁', '🐘', '🦒', '🐼', '🐧', '🦜', '🐢', '🦋', '🚂', '✈️', '🚒', '⛵', '🍎', '🍌', '🍇', '🍓', '🧁', '🎈', '🎸', '⚽', '🌈', '🐙'];
  var SIZES = [[2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [5, 4], [6, 4], [6, 5]];

  function play(box, i, ctl) {
    var cols = SIZES[i][0], rows = SIZES[i][1], pairs = cols * rows / 2, miss = 0, found = 0, first = -1, lock = false;
    var set = FVG.shuffle(POOL).slice(0, pairs), deck = FVG.shuffle(set.concat(set));
    box.appendChild(h('p', 'kd-tip', 'Переворачивай по две карточки и ищи одинаковые.'));
    var grid = h('div', 'mm-grid'); grid.style.cssText = '--w:' + cols + ';grid-template-columns:repeat(' + cols + ',var(--cs))'; box.appendChild(grid);
    var say = h('div', 'fvg-say'); box.appendChild(say);
    var cards = deck.map(function (e, k) {
      var c = h('button', 'pr-card', '<div><span class="b">?</span><span class="f">' + e + '</span></div>');
      c.onclick = function () { flip(k); }; grid.appendChild(c); return c;
    });
    var timer; ctl.onLeave(function () { clearTimeout(timer); });
    function flip(k) {
      if (lock || cards[k].classList.contains('up') || cards[k].classList.contains('done')) return;
      cards[k].classList.add('up');
      if (first < 0) { first = k; return; }
      var a = first; first = -1;
      if (deck[a] === deck[k]) {
        cards[a].className = cards[k].className = 'pr-card done'; found++;
        if (found === pairs) {
          var n = miss <= pairs * 0.6 ? 3 : miss <= pairs * 1.6 ? 2 : 1;
          say.className = 'fvg-say ok'; say.textContent = 'Все пары найдены!';
          timer = setTimeout(function () { ctl.win(n, 'Промахов: ' + miss + '.'); }, 600);
        }
      } else {
        miss++; lock = true;
        timer = setTimeout(function () { cards[a].classList.remove('up'); cards[k].classList.remove('up'); lock = false; }, 800);
      }
    }
  }
  FVG.mount({ slug: 'pairs', count: SIZES.length, play: play,
    intro: '🃏 Найди все пары одинаковых картинок. Подходит с 4 лет — первые уровни совсем простые. Чем дальше, тем больше карточек.' });
})();
