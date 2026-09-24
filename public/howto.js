// 動畫教學:拿一個固定例子,從個位一欄一欄算給小孩看。
// 題型用 howto:{ a, b, sign } 給例子(sign 是 'plus' | 'minus'),沒給就不顯示這一段。
// 每一步存的是「整個畫面的狀態」,換步就整個重畫,不用去記動畫做到哪。
(() => {
  const $ = id => document.getElementById(id);
  const tut = $('tut'), stage = $('tutStage'), note = $('tutNote'), playBtn = $('tutPlay');
  const ICON = {
    play: '<svg class="i" viewBox="0 0 24 24"><polygon points="6 3 20 12 6 21 6 3"/></svg>',
    pause: '<svg class="i" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>',
  };
  const place = (n, i) => M.PLACE[n - 1 - i];

  let prob = null, steps = [], at = 0, timer = null;

  function plusSteps(a, b, n) {
    const da = M.digits(a, n), db = M.digits(b, n);
    const res = Array(n).fill(null), marks = Array(n).fill(null), out = [];
    let carry = 0;
    for (let i = n - 1; i >= 0; i--) {
      const had = carry, sum = da[i] + db[i] + carry;
      res[i] = sum % 10;
      carry = sum >= 10 ? 1 : 0;
      if (carry && i > 0) marks[i - 1] = { kind: 'carry', text: '1' };
      out.push({
        col: i, res: [...res], marks: marks.map(m => m && { ...m }),
        note: `${place(n, i)}位:${da[i]} + ${db[i]}${had ? ' + 進位的 1' : ''} = ${sum}` +
          (carry && i > 0
            ? `,${place(n, i)}位寫 ${res[i]},進位的 1 記到${place(n, i - 1)}位`
            : `,${place(n, i)}位寫 ${res[i]}`),
      });
    }
    out.push({ col: -1, res: [...res], marks, note: `算完了:${a} + ${b} = ${a + b}` });
    return out;
  }

  function minusSteps(a, b, n) {
    const top = M.digits(a, n), db = M.digits(b, n);
    const res = Array(n).fill(null), marks = Array(n).fill(null), out = [];
    for (let i = n - 1; i >= 0; i--) {
      const before = top[i];
      let borrowed = false;
      if (top[i] < db[i] && i > 0) {
        top[i - 1] -= 1;
        marks[i - 1] = { kind: 'borrow', text: String(top[i - 1]) };
        top[i] += 10;
        marks[i] = { kind: 'borrow', text: String(top[i]) };
        borrowed = true;
      }
      res[i] = top[i] - db[i];
      out.push({
        col: i, res: [...res], marks: marks.map(m => m && { ...m }),
        note: borrowed
          ? `${place(n, i)}位:${before} 比 ${db[i]} 小,跟${place(n, i - 1)}位借 1 變成 ${top[i]},${top[i]} - ${db[i]} = ${res[i]}`
          : `${place(n, i)}位:${top[i]} - ${db[i]} = ${res[i]}`,
      });
    }
    out.push({ col: -1, res: [...res], marks, note: `算完了:${a} - ${b} = ${a - b}` });
    return out;
  }

  function draw(s) {
    const { n, da, db, sign } = prob;
    const cols = [...Array(n).keys()];
    const cell = (c, d, cls) =>
      `<div class="cell ${cls}" style="--c:${M.placeColor(n, c)}">${d ?? ''}</div>`;
    const marks = cols.map(c => {
      const m = s.marks[c], fresh = m && (c === s.col || c === s.col - 1) ? ' pop' : '';
      return `<div class="mk ${m ? m.kind : ''}${fresh}">${m ? m.text : ''}</div>`;
    }).join('');
    const on = c => (c === s.col ? ' on' : '');
    const rowTop = cols.map(c => cell(c, da[c], (s.marks[c]?.kind === 'borrow' ? 'struck' : '') + on(c))).join('');
    const rowBot = cols.map(c => cell(c, db[c], on(c))).join('');
    const rowRes = cols.map(c => cell(c, s.res[c], (c === s.col ? 'on pop' : ''))).join('');

    stage.innerHTML = `<div class="prob" style="grid-template-columns:calc(var(--box)*.72) repeat(${n},var(--box))">
      <div></div>${marks}
      <div></div>${rowTop}
      <div class="sign ${sign}" aria-label="${sign === 'plus' ? '加' : '減'}"></div>${rowBot}
      <div class="rule"></div>
      <div></div>${rowRes}
    </div>`;
    note.textContent = s.note;
  }

  const stop = () => { clearInterval(timer); timer = null; playBtn.innerHTML = ICON.play + '播放'; };
  const show = i => {
    at = Math.max(0, Math.min(steps.length - 1, i));
    draw(steps[at]);
    if (at === steps.length - 1) stop();
  };
  const play = () => {
    if (at === steps.length - 1) show(0);
    timer = setInterval(() => show(at + 1), 2000);
    playBtn.innerHTML = ICON.pause + '暫停';
  };

  playBtn.onclick = () => (timer ? stop() : play());
  $('tutPrev').onclick = () => { stop(); show(at - 1); };
  $('tutNext').onclick = () => { stop(); show(at + 1); };
  // 展開就自動播一次,收起來就停,不要在看不到的地方空轉
  tut.addEventListener('toggle', () => (tut.open ? (show(0), play()) : stop()));

  // 純算的部分獨立出來,test.js 直接驗
  M.howtoSteps = ({ a, b, sign }) => {
    const n = String(a).length;
    return sign === 'plus' ? plusSteps(a, b, n) : minusSteps(a, b, n);
  };

  // app.js 切題型時呼叫
  M.howto = type => {
    stop();
    const ex = type.howto;
    tut.hidden = !ex;
    if (!ex) return;
    const n = String(ex.a).length;
    prob = { n, da: M.digits(ex.a, n), db: M.digits(ex.b, n), sign: ex.sign };
    steps = M.howtoSteps(ex);
    show(0);
  };
})();
