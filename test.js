// 斷言測試,無框架:node test.js
// 每個題型隨機產生大量題目,確認算式正確、選項條件成立、每一位剛好一格空、答案唯一。
const fs = require('fs');
const src = f => fs.readFileSync(`public/${f}`, 'utf8');
const types = fs.readdirSync('public/types').map(f => src(`types/${f}`)).join('\n');
// app.js 前半段是純函式的 M,後半段才碰 DOM
const { M, needsBorrow, needsCarry } = new Function(
  src('app.js').split('const COUNTS')[0] + types + '\nreturn { M, needsBorrow, needsCarry };')();

const CHECK = {
  'sub-fill': { op: (x, y) => x - y, opt: 'borrow', has: (a, b, n) => needsBorrow(a, b, n) },
  'add-fill': { op: (x, y) => x + y, opt: 'carry', has: (a, b, n) => needsCarry(a, b, n) },
};
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

for (const t of M.types) {
  const c = CHECK[t.id];
  assert(c, `新題型 ${t.id} 要在 test.js 的 CHECK 補上驗證方式`);
  for (const n of ['2', '3', '4']) for (const mode of ['any', 'yes', 'no']) for (let k = 0; k < 200; k++) {
    const p = t.make({ n, [c.opt]: mode }), N = +n;
    const [a, b, r] = p.nums.map(x => +x.join(''));
    assert(c.op(a, b) === r, `${t.id} 算式錯 ${a},${b},${r}`);
    const has = c.has(a, b, N);
    assert(!(mode === 'yes' && !has) && !(mode === 'no' && has), `${t.id} ${c.opt}=${mode} 不符 ${a},${b}`);
    assert(p.blankRow.length === N && new Set(p.blankRow).size === Math.min(N, 3), `${t.id} 空格分配錯`);
    // 窮舉所有空格填法,只能有一組成立
    let sols = 0;
    for (let q = 0; q < 10 ** N; q++) {
      const nums = p.nums.map(x => [...x]);
      p.blankRow.forEach((row, col) => nums[row][col] = Math.floor(q / 10 ** col) % 10);
      const [x, y, z] = nums.map(v => +v.join(''));
      if (nums.every(v => v[0] !== 0) && c.op(x, y) === z) sols++;
    }
    assert(sols === 1, `${t.id} 答案不唯一 ${JSON.stringify(p)}`);
  }
}
// 教學動畫:每一步的進位/借位算對,最後一格拼起來要等於答案
const stub = () => new Proxy(() => {}, { get: () => stub(), set: () => true, apply: () => stub() });
new Function('M', 'document', src('howto.js'))(M, { getElementById: stub() });

for (const t of M.types.filter(t => t.howto)) {
  const { a, b, sign } = t.howto, n = String(a).length, op = sign === 'plus' ? a + b : a - b;
  const steps = M.howtoSteps(t.howto);
  assert(steps.length === n + 1, `${t.id} 教學步數應為 ${n + 1},實際 ${steps.length}`);
  assert(steps.at(-1).res.join('') === String(op).padStart(n, '0'), `${t.id} 教學算錯 ${a},${b}`);
  // 每一步只多算出一欄,由右往左
  steps.slice(0, n).forEach((s, k) => assert(s.col === n - 1 - k && s.res.filter(d => d !== null).length === k + 1,
    `${t.id} 教學第 ${k + 1} 步不是從右邊數來第 ${k + 1} 欄`));
}
// 隨機數字也要算對(進位、借位、連續借位)
for (let k = 0; k < 2000; k++) {
  const n = M.rand(2, 4), lo = 10 ** (n - 1), hi = 10 ** n - 1;
  const x = M.rand(lo, hi), y = M.rand(lo, hi), [a, b] = [Math.max(x, y), Math.min(x, y)];
  assert(M.howtoSteps({ a: b, b: a - b, sign: 'plus' }).at(-1).res.join('') === String(a).padStart(n, '0'), `教學加法錯 ${b}+${a - b}`);
  assert(M.howtoSteps({ a, b, sign: 'minus' }).at(-1).res.join('') === String(a - b).padStart(n, '0'), `教學減法錯 ${a}-${b}`);
}

console.log('ok', M.types.map(t => t.id).join(', '), '+ howto');
