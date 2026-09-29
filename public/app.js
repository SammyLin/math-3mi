// 題型外殼:選項、出題、對答案。每個題型放在 types/*.js,用 M.register() 註冊。
//
// 題型介面:
//   id, name, path        題型代號、上方切換的名稱、專屬網址
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
      ? `<div class="cell" ${style}><input inputmode="numeric" maxlength="1" autocomplete="off" data-ans="${digit}" data-col="${col}" aria-label="${M.PLACE[n - 1 - col]}位"></div>`
      : `<div class="cell" ${style}>${digit}</div>`;
  },
  // 三列直式填空共用:每一欄剛好一個空格 → 由右往左逐欄只有一個未知數,答案唯一
  // 先讓三列各分到一格(2 位數只能分兩列),其餘欄隨機,最後打亂欄順序
  // 回傳 blankRow[c] = 第 c 欄空在哪一列
  blankPerColumn(n) {
    const rows = M.shuffle([0, 1, 2]).slice(0, Math.min(n, 3));
    while (rows.length < n) rows.push(M.rand(0, 2));
    return M.shuffle(rows);
  },
  // 畫三列直式:nums = [上, 下, 結果] 各為 n 位數字陣列;sign = 'minus' | 'plus'
  vertical(p, sign) {
    const cols = [...Array(p.n).keys()];
    const row = r => cols.map(c => M.cell(p.n, c, p.nums[r][c], p.blankRow[c] === r)).join('');
    return `<div class="prob" style="grid-template-columns:calc(var(--box)*.72) repeat(${p.n},var(--box))">
      <div class="place-row"></div>${cols.map(c => `<div class="place place-row" style="--c:${M.placeColor(p.n, c)}">${M.PLACE[p.n - 1 - c]}</div>`).join('')}
      <div></div>${row(0)}
      <div class="sign ${sign}" aria-label="${sign === 'plus' ? '加' : '減'}"></div>${row(1)}
      <div class="rule"></div>
      <div></div>${row(2)}
    </div>`;
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
  // data-type 由 build.js 填;萬一部署到沒建置過的模板,至少靠網址認得題型
  const want = document.body.dataset.type || M.types.find(t => t.path === location.pathname)?.id || location.hash.slice(1);
  type = M.types.find(t => t.id === want) || M.types[0];
  $('types').innerHTML = M.types.length < 2 ? '' :
    M.types.map(t => `<a href="${t.path}" class="chip"><span${t === type ? ' class="on"' : ''}>${t.name}</span></a>`).join('');
  $('title').innerHTML = type.title;
  $('desc').textContent = type.desc;
  $('fields').innerHTML =
    type.options.map(o => group(o.label, o.choices.map(([v, txt]) => chip('radio', o.name, v, txt, v === o.value)).join(''))).join('') +
    group('題數', COUNTS.map(v => chip('radio', 'count', v, v, v === '1')).join('')) +
    (type.flags?.length ? group('顯示', type.flags.map(f => chip('checkbox', f.name, 'on', f.label)).join('')) : '');
  M.howto?.(type);
  render();
}

function render() {
  const opts = Object.fromEntries(new FormData(form));
  sheet.innerHTML = Array.from({ length: +opts.count }, (_, i) =>
    `<article class="card"><span class="no">${i + 1}.</span>${type.render(type.make(opts))}</article>`).join('');
  $('score').textContent = '';
  $('score').classList.remove('win');
  resetTimer();
  recorded = missed = false;
  paintBoard();
  flags();
}

function flags() {
  const f = new FormData(form);
  (type.flags || []).forEach(({ name }) => sheet.classList.toggle('flag-' + name, f.has(name)));
}

// 音效現場合成,不放音檔。notes = [頻率, 幾秒後開始, 長度, 波形, 音量, 滑到的頻率]
// 正弦主音再疊一個高八度的弱泛音,聽起來像鐵琴,不會像舊款電子錶那麼刺
const SOUND_KEY = 'math-sound';
const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) !== 'off'; } catch { return true; } };
let audio;
function play(notes) {
  if (!soundOn()) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    for (const [freq, at, dur, wave = 'sine', vol = .16, glide] of notes) {
      const t = audio.currentTime + at;
      for (const [mul, v] of wave === 'sine' ? [[1, vol], [2, vol * .25]] : [[1, vol]]) {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = wave;
        o.frequency.setValueAtTime(freq * mul, t);
        if (glide) o.frequency.exponentialRampToValueAtTime(glide * mul, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(v, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
    }
  } catch { /* 沒有 WebAudio 就靜音,別讓對答案掛掉 */ }
}
// 全對:Do Mi Sol 高Do 往上爬,最後兩顆亮晶晶的高音
const CHEER = [[1047, 0, .2], [1319, .09, .2], [1568, .18, .2], [2093, .27, .6], [2637, .42, .35, 'sine', .06], [3136, .5, .45, 'sine', .05]];
// 有錯:柔一點的「嗯—嗯」往下滑,不要嚇到小孩
const NOPE = [[392, 0, .22, 'triangle', .14, 330], [294, .2, .38, 'triangle', .14, 247]];
const TAP = [[1760, 0, .06, 'sine', .04]];

// 計時:第一次填答才開始,對完答案停住,重新出題歸零
let t0 = null, ticking = null;
const secs = () => (t0 ? Math.round((Date.now() - t0) / 1000) : 0);
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const human = s => (s >= 60 ? `${Math.floor(s / 60)} 分 ${s % 60} 秒` : `${s} 秒`);
const paintClock = () => { $('clock').textContent = mmss(secs()); };
function startTimer() {
  if (t0) return;
  t0 = Date.now();
  ticking = setInterval(paintClock, 1000);
  $('timer').classList.add('run');
  $('timer').hidden = false;
  paintClock();
}
function stopTimer() {
  clearInterval(ticking);
  ticking = null;
  $('timer').classList.remove('run');
}
function resetTimer() {
  stopTimer();
  t0 = null;
  $('clock').textContent = '00:00';
  $('timer').hidden = true; // 還沒開始作答就不顯示 00:00
}

function check() {
  stopTimer();
  const inputs = [...sheet.querySelectorAll('input[data-ans]')];
  const right = inp => inp.value.trim() === inp.dataset.ans;
  const ok = inputs.filter(right).length;
  const all = ok === inputs.length;
  const used = secs();

  // 先清掉再重上,連按兩次對答案動畫才會重播
  inputs.forEach(inp => { inp.parentElement.classList.remove('ok', 'bad'); inp.parentElement.style.animationDelay = ''; });
  requestAnimationFrame(() => answerOrder().forEach((inp, i) => {
    const cell = inp.parentElement;
    cell.style.animationDelay = `${i * 45}ms`;
    cell.classList.add(right(inp) ? 'ok' : 'bad');
    cell.dataset.correct = inp.dataset.ans;
  }));

  $('score').textContent =
    (all ? (missed ? `訂正完成!${ok} / ${inputs.length}` : `全對!${ok} / ${inputs.length}`) : `答對 ${ok} / ${inputs.length} 格`) +
    (t0 ? `,用了 ${human(used)}` : '');
  // 對過一次有錯,之後改對只算訂正:不撒彩帶、不上排行榜
  const win = all && !missed;
  if (!all) missed = true;
  $('score').classList.toggle('win', win);
  play(win ? CHEER : all ? [[1047, 0, .2], [1319, .1, .3]] : NOPE);
  if (win) { confetti(); if (t0) record(used); }
}

// 全對撒彩帶:一張蓋全畫面、不吃點擊的 canvas,放完就拆掉
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas'), x = c.getContext('2d');
  c.className = 'confetti';
  c.width = innerWidth;
  c.height = innerHeight;
  document.body.append(c);
  const r = $('score').getBoundingClientRect(), ox = r.left + r.width / 2, oy = r.top;
  const colors = ['#3d9be0', '#5fa52e', '#e0a100', '#e8603f', '#ca8a04'];
  const bits = Array.from({ length: 140 }, () => ({
    x: ox, y: oy, vx: (Math.random() - .5) * 16, vy: -6 - Math.random() * 14,
    a: Math.random() * 6, va: (Math.random() - .5) * .4, s: 7 + Math.random() * 6, c: colors[M.rand(0, 4)],
  }));
  const start = performance.now();
  (function frame(now) {
    x.clearRect(0, 0, c.width, c.height);
    for (const b of bits) {
      b.vy += .4; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.a += b.va;
      x.save(); x.translate(b.x, b.y); x.rotate(b.a);
      x.fillStyle = b.c; x.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
      x.restore();
    }
    now - start < 2600 ? requestAnimationFrame(frame) : c.remove();
  })(start);
}

// 排行榜:全站共用(functions/api/board.js + D1),同一組選項(題型、進借位、題數)比全對用時,留前 10 名
// 擠進前 10 才跳出視窗問名字;名字記在這台裝置,下次預先填好
const NAME_KEY = 'math-name';
const picked = () => [...form.querySelectorAll('input[type=radio]:checked')];
const boardKey = () => [type.id, ...picked().map(i => i.value)].join('|');
const esc = s => s.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
let recorded = false, missed = false, board = { k: '', rows: [] };

async function fetchBoard() {
  const k = boardKey();
  const rows = await fetch('/api/board?k=' + encodeURIComponent(k)).then(r => (r.ok ? r.json() : [])).catch(() => []);
  return (board = { k, rows });
}
function drawBoard(fresh) {
  $('boardList').innerHTML = board.rows.length
    ? board.rows.map((r, i) => `<li${r.id === fresh ? ' class="new"' : ''}><b>${i + 1}</b><span>${esc(r.name)}</span><time>${mmss(r.secs)}</time></li>`).join('')
    : '<li class="empty">還沒有人上榜,全對就有機會</li>';
}
async function paintBoard() {
  $('boardFor').textContent = [type.name, ...picked().map(i => i.nextElementSibling.textContent + (i.name === 'count' ? ' 題' : ''))].join(' · ');
  const k = boardKey();
  await fetchBoard();
  if (k === boardKey()) drawBoard(); // 抓的時候又換了選項,就別蓋掉新的
}

async function record(secs) {
  if (recorded || secs < 1) return; // 同一批題目連按對答案只記一次
  recorded = true;
  const k = boardKey(), { rows } = await fetchBoard();
  if (rows.length >= 10 && secs >= rows[9].secs) return;
  const dlg = $('rankDlg');
  $('rankRank').textContent = rows.filter(r => r.secs <= secs).length + 1;
  $('rankTime').textContent = human(secs);
  try { $('rankName').value = localStorage.getItem(NAME_KEY) || ''; } catch { /* 無痕模式 */ }
  // 等彩帶噴一下再跳出來
  setTimeout(() => dlg.showModal(), 900);
  dlg.onclose = async () => {
    const name = $('rankName').value.trim();
    if (dlg.returnValue !== 'ok' || !name) return;
    try { localStorage.setItem(NAME_KEY, name); } catch { /* 無痕模式存不了就算了 */ }
    const res = await fetch('/api/board', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ k, name, secs }),
    }).then(r => r.json()).catch(() => null);
    if (!res?.rows || k !== boardKey()) return;
    board = { k, rows: res.rows };
    drawBoard(res.id);
    $('board').scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}

// 已經填了答案就先確認,避免手誤把整張洗掉
const dirty = () => [...sheet.querySelectorAll('input[data-ans]')].some(i => i.value);
const ask = () => !dirty() || confirm('要換一批新題目嗎?目前填的答案會清掉。');

// 作答順序跟著直式的算法走:同一題從個位往左(個、十、百、千),整題填完才換下一題。
// DOM 是一列一列排的(讀屏軟體要照這個順序唸),所以順序在這裡另外算,不動版面。
const answerOrder = () => [...sheet.querySelectorAll('.card')].flatMap(card =>
  [...card.querySelectorAll('input[data-ans]')].sort((a, b) => b.dataset.col - a.dataset.col));
const step = (inp, by) => {
  const all = answerOrder();
  return all[all.indexOf(inp) + by];
};

// 只收數字;填完一格自動跳下一格
sheet.addEventListener('input', e => {
  const inp = e.target;
  inp.value = inp.value.replace(/\D/g, '');
  inp.parentElement.classList.remove('ok', 'bad');
  if (inp.value) { startTimer(); play(TAP); step(inp, 1)?.focus(); }
});

// Tab 也照同一個順序;走到頭就讓瀏覽器接手,才出得了這張卷子
sheet.addEventListener('keydown', e => {
  if (!e.target.dataset.ans) return;
  if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); check(); return; }
  if (e.key !== 'Tab') return;
  const next = step(e.target, e.shiftKey ? -1 : 1);
  if (next) { e.preventDefault(); next.focus(); }
});

form.addEventListener('change', e => {
  if (type.flags?.some(f => f.name === e.target.name)) flags();
  else if (ask()) render();
});
$('types').addEventListener('click', e => { if (!ask()) e.preventDefault(); });
window.addEventListener('hashchange', setup);
// 出題按鈕一律確認(容易手誤點到);換選項只在已作答時確認
$('newBtn').onclick = () => confirm('要換一批新題目嗎?') && render();
$('checkBtn').onclick = check;

const SPEAKER = '<svg class="i" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14"/></svg>';
const MUTED = '<svg class="i" viewBox="0 0 24 24"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m22 9-6 6M16 9l6 6"/></svg>';
function paintSound() {
  const on = soundOn();
  $('soundBtn').innerHTML = on ? SPEAKER : MUTED;
  $('soundBtn').setAttribute('aria-pressed', String(on));
  $('soundBtn').title = on ? '音效開著,點一下關掉' : '音效關著,點一下打開';
}
$('soundBtn').onclick = () => {
  try { localStorage.setItem(SOUND_KEY, soundOn() ? 'off' : 'on'); } catch { /* 無痕模式存不了就算了 */ }
  paintSound();
  if (soundOn()) play([[659, 0, .12]]);
};
paintSound();
document.addEventListener('DOMContentLoaded', setup);
