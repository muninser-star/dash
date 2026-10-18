/* «Шифровка»: слово записано символами или сдвинутыми буквами — расшифруй. */
(function () {
  var h = FVG.h;
  var ALPHA = 'АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ';
  var SYMS = ['●', '▲', '■', '★', '♥', '☀', '☾', '✿', '♪', '⚑', '☂', '✈', '♞', '◆', '☘', '✂', '☎', '⚓', '❄', '✎'];
  // { w: слово, mode: sym | part | shift, shift }
  var LV = [
    { w: 'ЛУНА', mode: 'sym' }, { w: 'РАКЕТА', mode: 'sym' }, { w: 'ПЛАНЕТА', mode: 'sym' }, { w: 'ТЕЛЕСКОП', mode: 'sym' },
    { w: 'КОСМОНАВТ', mode: 'part', hide: 2 }, { w: 'ГАЛАКТИКА', mode: 'part', hide: 3 }, { w: 'МЕТЕОРИТ', mode: 'part', hide: 3 },
    { w: 'ЗВЕЗДА', mode: 'shift', shift: 1 }, { w: 'КОМЕТА', mode: 'shift', shift: 2 }, { w: 'ЛУНОХОД', mode: 'shift', shift: 3 }
  ];
  function shifted(ch, k) { return ALPHA[(ALPHA.indexOf(ch) + k) % ALPHA.length]; }

  function play(box, i, ctl) {
    var d = LV[i], word = d.w.split(''), uniq = word.filter(function (c, k) { return word.indexOf(c) === k; });
    var syms = FVG.shuffle(SYMS), map = {}; uniq.forEach(function (c, k) { map[c] = syms[k]; });
    var shown = {}; // для part — какие буквы видны в таблице
    var hide = d.hide || 0, hiddenLetters = hide ? FVG.shuffle(uniq).slice(0, hide) : [];
    var ans = word.map(function () { return ''; }), fixed = word.map(function () { return false; }), hints = 0, miss = 0;
    var cipher = word.map(function (c) { return d.mode === 'shift' ? shifted(c, d.shift) : map[c]; });

    var tip = { sym: 'Слово записано значками. Таблица подскажет, какой значок — какая буква.',
      part: 'В таблице не хватает ' + hide + ' ' + (hide < 5 ? 'букв' : 'букв') + ' (помечены «?»). Угадай их — слово из космоса!',
      shift: 'Каждая буква сдвинута на ' + d.shift + ' вперёд по алфавиту. Чтобы расшифровать — сдвинь на ' + d.shift + ' назад.' }[d.mode];
    box.appendChild(h('p', 'kd-tip', tip));
    if (d.mode === 'shift') {
      var strip = h('div', 'cp-strip'); ALPHA.split('').forEach(function (c) { strip.appendChild(h('span', '', c)); }); box.appendChild(strip);
    } else {
      var key = h('div', 'cp-key');
      uniq.forEach(function (c) { key.appendChild(h('div', hiddenLetters.indexOf(c) >= 0 ? 'q' : '', map[c] + ' = ' + (hiddenLetters.indexOf(c) >= 0 ? '?' : c))); });
      box.appendChild(key);
    }
    var wordBox = h('div', 'cp-word'); box.appendChild(wordBox);
    var say = h('div', 'fvg-say'); box.appendChild(say);
    var kb = h('div', 'cp-kb'); box.appendChild(kb);
    var act = h('div', 'kd-act'); box.appendChild(act);
    var back = h('button', 'fvg-btn', '⌫ Стереть'), hint = h('button', 'fvg-btn', '💡 Открыть букву'); act.appendChild(back); act.appendChild(hint);

    function drawWord() {
      wordBox.innerHTML = '';
      word.forEach(function (c, k) {
        var s = h('div', 'cp-sl' + (fixed[k] ? ' hint' : ''), '<div class="s">' + cipher[k] + '</div><div class="a">' + (ans[k] || '') + '</div>');
        s.querySelector('.a').onclick = function () { if (!fixed[k]) { ans[k] = ''; drawWord(); } };
        wordBox.appendChild(s);
      });
    }
    var letters = FVG.shuffle(uniq.concat(FVG.shuffle(ALPHA.split('').filter(function (c) { return uniq.indexOf(c) < 0 && 'ЪЬЫЙ'.indexOf(c) < 0; })).slice(0, Math.max(5, 12 - uniq.length))));
    letters.forEach(function (c) {
      var b = h('button', '', c); b.onclick = function () {
        var k = ans.indexOf(''); if (k < 0) return;
        ans[k] = c; drawWord(); check();
      }; kb.appendChild(b);
    });
    back.onclick = function () { for (var k = word.length - 1; k >= 0; k--) if (ans[k] && !fixed[k]) { ans[k] = ''; break; } drawWord(); };
    hint.onclick = function () {
      var k = word.findIndex(function (c, j) { return ans[j] !== c; }); if (k < 0) return;
      hints++; ans[k] = word[k]; fixed[k] = true; drawWord(); check();
    };
    var timer; ctl.onLeave(function () { clearTimeout(timer); });
    function check() {
      if (ans.indexOf('') >= 0) return;
      if (ans.join('') === d.w) {
        say.className = 'fvg-say ok'; say.textContent = 'Расшифровано: ' + d.w + '!';
        var n = Math.max(1, (miss === 0 ? 3 : miss <= 2 ? 2 : 1) - hints);
        timer = setTimeout(function () { ctl.win(n, 'Слово — «' + d.w.toLowerCase() + '». Ошибок: ' + miss + ', подсказок: ' + hints + '.'); }, 700);
      } else {
        miss++; say.className = 'fvg-say bad'; say.textContent = 'Не сходится. Попробуй ещё!'; wordBox.classList.add('fvg-shake');
        timer = setTimeout(function () { wordBox.classList.remove('fvg-shake'); ans = ans.map(function (v, j) { return fixed[j] ? v : ''; }); drawWord(); }, 700);
      }
    }
    drawWord();
  }
  FVG.mount({ slug: 'cipher', count: LV.length, play: play,
    intro: '🔐 Агент, получена шифровка! Слова спрятаны за значками, а потом и за сдвинутыми буквами. Расшифруй их все. Подсказка стоит звезды.' });
})();
