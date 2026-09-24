// 直式減法填空:被減數、減數、差都是 n 位數,每一位剛好挖一格
function needsBorrow(a, b, n) {
  const da = M.digits(a, n), db = M.digits(b, n);
  let br = 0, any = false;
  for (let i = n - 1; i >= 0; i--) {
    br = da[i] - br < db[i] ? 1 : 0;
    if (br) any = true;
  }
  return any;
}

M.register({
  id: 'sub-fill',
  name: '減法填空',
  title: '直式<span>減法填空</span>',
  desc: '每一位都有一格要自己想',
  options: [
    { name: 'n', label: '位數', choices: [['2', '2 位'], ['3', '3 位'], ['4', '4 位']], value: '4' },
    { name: 'borrow', label: '借位', choices: [['any', '不限'], ['yes', '要借位'], ['no', '不借位']], value: 'any' },
  ],
  flags: [{ name: 'place', label: '千百十個' }],

  make(opts) {
    const n = +opts.n, lo = 10 ** (n - 1), hi = 10 ** n - 1;
    for (;;) {
      const b = M.rand(lo, hi), d = M.rand(lo, hi), a = b + d;
      if (a > hi) continue;
      const br = needsBorrow(a, b, n);
      if ((opts.borrow === 'yes' && !br) || (opts.borrow === 'no' && br)) continue;
      // 每一欄剛好一個空格 → 由右往左逐欄只有一個未知數,答案唯一
      // 先讓三列各分到一格(2 位數只能分兩列),其餘欄隨機,最後打亂欄順序
      const rows = M.shuffle([0, 1, 2]).slice(0, Math.min(n, 3));
      while (rows.length < n) rows.push(M.rand(0, 2));
      return { n, nums: [a, b, d].map(x => M.digits(x, n)), blankRow: M.shuffle(rows) };
    }
  },

  render(p) {
    const cols = [...Array(p.n).keys()];
    const row = r => cols.map(c => M.cell(p.n, c, p.nums[r][c], p.blankRow[c] === r)).join('');
    return `<div class="prob" style="grid-template-columns:calc(var(--box)*.72) repeat(${p.n},var(--box))">
      <div class="place-row"></div>${cols.map(c => `<div class="place place-row" style="--c:${M.placeColor(p.n, c)}">${M.PLACE[p.n - 1 - c]}</div>`).join('')}
      <div></div>${row(0)}
      <div class="sign" aria-label="減"></div>${row(1)}
      <div class="rule"></div>
      <div></div>${row(2)}
    </div>`;
  },
});
