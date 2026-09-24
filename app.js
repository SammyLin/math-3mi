// 題型外殼:選項、出題、對答案、列印。每個題型放在 types/*.js,用 M.register() 註冊。
//
// 題型介面:
//   id, name              網址 #id、上方題型切換的名稱
//   title, desc           標題(可含 <span> 強調)與說明
//   options               [{ name, label, choices: [[value, text]...], value }] 會重新出題的選項
//   flags                 [{ name, label }] 只切換顯示,不重出題;勾選時 sheet 加上 flag-<name> class
//   make(opts)            產生一題;opts 是選項值(字串)
//   render(problem)       回傳卡片內的 HTML;要作答的格子用 <input data-ans="正確答案">
const M = {
  types: [],
  register(t) { this.types.push(t); },
  rand: (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1)),
  shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = M.rand(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  digits: (x, n) => String(x).padStart(n, '0').split('').map(Number),
  PLACE: ['個', '十', '百', '千', '萬'],
  // 直式格子:col 從左數,n 為總位數;個=藍 十=綠 百=黃 千=紅
  placeColor: (n, col) => `var(--p${n - 1 - col})`,
  cell(n, col, digit, blank) {
    const style = `style="--c:${M.placeColor(n, col)}"`;
    return blank
      ? `<div class="cell" ${style}><input inputmode="numeric" maxlength="1" autocomplete="off" data-ans="${digit}" aria-label="${M.PLACE[n - 1 - col]}位"></div>`
      : `<div class="cell" ${style}>${digit}</div>`;
  },
};

const COUNTS = ['1', '4', '6', '10'];
const $ = id => document.getElementById(id);
const form = $('opts'), sheet = $('sheet');
let type;

const chip = (kind, name, value, text, checked) =>
  `<label class="chip"><input type="${kind}" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${text}</span></label>`;
const group = (label, inner) => `<div class="group"><b>${label}</b>${inner}</div>`;

function setup() {
  type = M.types.find(t => '#' + t.id === location.hash) || M.types[0];
  document.title = `${type.name} · 數學小練習`;
  $('types').innerHTML = M.types.length < 2 ? '' :
    M.types.map(t => `<a href="#${t.id}" class="chip"><span${t === type ? ' class="on"' : ''}>${t.name}</span></a>`).join('');
  $('title').innerHTML = type.title;
  $('desc').textContent = type.desc;
  $('fields').innerHTML =
    type.options.map(o => group(o.label, o.choices.map(([v, txt]) => chip('radio', o.name, v, txt, v === o.value)).join(''))).join('') +
    group('題數', COUNTS.map(v => chip('radio', 'count', v, v, v === '6')).join('')) +
    (type.flags?.length ? group('顯示', type.flags.map(f => chip('checkbox', f.name, 'on', f.label)).join('')) : '');
  render();
}

function render() {
  const opts = Object.fromEntries(new FormData(form));
  sheet.innerHTML = Array.from({ length: +opts.count }, (_, i) =>
    `<article class="card"><span class="no">${i + 1}.</span>${type.render(type.make(opts))}</article>`).join('');
  $('score').textContent = '';
  flags();
}

function flags() {
  const f = new FormData(form);
  (type.flags || []).forEach(({ name }) => sheet.classList.toggle('flag-' + name, f.has(name)));
}

function check() {
  const inputs = sheet.querySelectorAll('input[data-ans]');
  let ok = 0;
  inputs.forEach(inp => {
    const right = inp.value.trim() === inp.dataset.ans;
    ok += right;
    inp.parentElement.classList.toggle('ok', right);
    inp.parentElement.classList.toggle('bad', !right);
    inp.parentElement.dataset.correct = inp.dataset.ans;
  });
  $('score').textContent = ok === inputs.length ? `全對!${ok} / ${inputs.length}` : `答對 ${ok} / ${inputs.length} 格`;
}

// 已經填了答案就先確認,避免手誤把整張洗掉
const dirty = () => [...sheet.querySelectorAll('input[data-ans]')].some(i => i.value);
const ask = () => !dirty() || confirm('要換一批新題目嗎?目前填的答案會清掉。');

// 只收數字;填完一格自動跳下一個空格
sheet.addEventListener('input', e => {
  const inp = e.target;
  inp.value = inp.value.replace(/\D/g, '');
  inp.parentElement.classList.remove('ok', 'bad');
  if (inp.value) {
    const all = [...sheet.querySelectorAll('input[data-ans]')];
    all[all.indexOf(inp) + 1]?.focus();
  }
});

form.addEventListener('change', e => {
  if (type.flags?.some(f => f.name === e.target.name)) flags();
  else if (ask()) render();
});
$('types').addEventListener('click', e => { if (!ask()) e.preventDefault(); });
window.addEventListener('hashchange', setup);
$('newBtn').onclick = () => ask() && render();
$('checkBtn').onclick = check;
$('printBtn').onclick = () => print();
document.addEventListener('DOMContentLoaded', setup);
