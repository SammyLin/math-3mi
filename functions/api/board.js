// 全域排行榜。GET ?k= 拿前 10 名;POST { k, name, secs } 上榜。
// k 的格式跟 app.js 的 boardKey() 一致:題型|位數|進借位|題數
// ponytail: 時間是前端回報的,有心人可以亂送;真的被灌爆再加 Turnstile 或伺服器端出題計時
const KEY = /^(add-fill|sub-fill)\|[234]\|(any|yes|no)\|(1|4|6|10)$/;
const top = (db, k) =>
  db.prepare('SELECT id, name, secs FROM board WHERE k = ? ORDER BY secs, at LIMIT 10').bind(k).all().then(r => r.results);

export async function onRequestGet({ request, env }) {
  const k = new URL(request.url).searchParams.get('k') || '';
  if (!KEY.test(k)) return Response.json({ error: 'bad key' }, { status: 400 });
  return Response.json(await top(env.DB, k));
}

export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const k = String(body.k || ''), secs = Number(body.secs);
  const name = String(body.name || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12);
  if (!KEY.test(k) || !name || !Number.isInteger(secs) || secs < 1 || secs > 3600)
    return Response.json({ error: 'bad input' }, { status: 400 });

  const { meta } = await env.DB.prepare('INSERT INTO board (k, name, secs, at) VALUES (?, ?, ?, ?)')
    .bind(k, name, secs, Date.now()).run();
  // 只留前 10 名,擠不進去的(包含剛剛那筆)直接刪掉
  await env.DB.prepare('DELETE FROM board WHERE k = ?1 AND id NOT IN (SELECT id FROM board WHERE k = ?1 ORDER BY secs, at LIMIT 10)')
    .bind(k).run();
  return Response.json({ id: meta.last_row_id, rows: await top(env.DB, k) });
}
