// 直式加法填空:兩個加數與和都是 n 位數(和不多一位),每一位剛好挖一格
function needsCarry(a, b, n) {
  const da = M.digits(a, n), db = M.digits(b, n);
  // 沒有任何一欄相加 ≥ 10 就不會產生進位
  return da.some((x, i) => x + db[i] >= 10);
}

M.register({
  id: 'add-fill',
  name: '加法填空',
  title: '直式<span>加法填空</span>',
  desc: '每一位都有一格要自己想',
  options: [
    { name: 'n', label: '位數', choices: [['2', '2 位'], ['3', '3 位'], ['4', '4 位']], value: '4' },
    { name: 'carry', label: '進位', choices: [['any', '不限'], ['yes', '要進位'], ['no', '不進位']], value: 'any' },
  ],
  flags: [{ name: 'place', label: '千百十個' }],
  // 動畫教學用的固定例子:每一欄都會遇到進位/借位
  howto: { a: 476, b: 258, sign: 'plus' },

  make(opts) {
    const n = +opts.n, lo = 10 ** (n - 1), hi = 10 ** n - 1;
    for (;;) {
      const a = M.rand(lo, hi), b = M.rand(lo, hi), s = a + b;
      if (s > hi) continue;
      const c = needsCarry(a, b, n);
      if ((opts.carry === 'yes' && !c) || (opts.carry === 'no' && c)) continue;
      return { n, nums: [a, b, s].map(x => M.digits(x, n)), blankRow: M.blankPerColumn(n) };
    }
  },

  render: p => M.vertical(p, 'plus'),
});
