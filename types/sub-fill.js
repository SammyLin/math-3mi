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
      return { n, nums: [a, b, d].map(x => M.digits(x, n)), blankRow: M.blankPerColumn(n) };
    }
  },

  render: p => M.vertical(p, 'minus'),
});
