// ページ切替
const navHome = document.getElementById('nav-home');
const navCommands = document.getElementById('nav-commands');
const pageHome = document.getElementById('page-home');

navHome.addEventListener('click', ()=>{
  navHome.classList.add('active');
  navCommands.classList.remove('active');
  pageHome.style.display='block';
});
navCommands.addEventListener('click', ()=>{
  navCommands.classList.add('active');
  navHome.classList.remove('active');
  showCommandsPanel();
});

function installGuide(){
  alert('導入ガイド:\n1) 招待リンクで追加\n2) 必要な権限を付与\n3) /認証 を実行');
}

// コマンド情報
const COMMANDS = {
  ping: {
    name: '/ping',
    summary: 'Bot の応答時間を計測',
    usage: '/ping',
    description: '- APIレイテンシと往復時間を測定\n- -1msが出る場合は0に補正',
    example: 'Embed: Ping\nBot API: 42ms / Roundtrip: 48ms'
  },
  auth: {
    name: '/認証',
    summary: 'サーバー認証・参加手続き',
    usage: '/認証 [ユーザー] [コード]',
    description: '- ロール付与で認証\n- 試行回数管理やリセット処理に注意',
    example: '認証完了 → ロール付与'
  },
  profile: {
    name: '/プロフィール',
    summary: 'ユーザープロフィールを表示',
    usage: '/プロフィール [@ユーザー]',
    description: '- ユーザーID, 作成日, 参加日, ロール等をEmbed表示',
    example: 'Embed: ID, 作成日, 参加日, ロール一覧'
  },
  friendcode: {
    name: '/フレンドコード',
    summary: 'フレンドコード登録・表示',
    usage: '/フレンドコード 登録|表示 [コード]',
    description: '- DBやJSONに保存\n- 公開範囲を制御すると安心',
    example: '/フレンドコード 登録 SW-1234-5678-9012'
  }
};

// コマンドクリックでモーダル表示
document.querySelectorAll('.cmd').forEach(el=>{
  el.addEventListener('click', ()=>{
    const key = el.dataset.cmd;
    openModalFor(key);
  });
});

// モーダル制御
let lastFocus;
function openModalFor(key){
  lastFocus = document.activeElement;
  const data = COMMANDS[key];
  const content = document.getElementById('modal-content');
  content.innerHTML = `
    <h2>${data.name}</h2>
    <p class="meta">${data.summary}</p>
    <h3>使い方</h3>
    <pre>${escapeHtml(data.usage)}</pre>
    <h3>説明</h3>
    <p>${nl2br(escapeHtml(data.description))}</p>
    <h3>サンプル</h3>
    <pre>${escapeHtml(data.example)}</pre>
    <div style="margin-top:12px"><button class="btn" onclick="copyExample('${key}')">サンプルをコピー</button></div>
  `;
  document.getElementById('modal').classList.add('show');
  document.getElementById('modal').setAttribute('aria-hidden','false');
  document.querySelector('.modal-close').focus();
}

function closeModal(){
  document.getElementById('modal').classList.remove('show');
  document.getElementById('modal').setAttribute('aria-hidden','true');
  if(lastFocus) lastFocus.focus();
}

// コマンドパネルをホーム下に生成
function showCommands(){
  navCommands.classList.add('active');
  navHome.classList.remove('active');
  showCommandsPanel();
}
function showCommandsPanel(){
  pageHome.scrollIntoView({behavior:'smooth'});
  const panel = document.createElement('div');
  panel.className='card';
  panel.innerHTML = `<h2>スラッシュコマンド一覧</h2><p class="meta">以下をクリックして詳細を確認してください。</p>`;
  const list = document.createElement('div');
  list.className='commands-list';
  Object.keys(COMMANDS).forEach(k=>{
    const d = COMMANDS[k];
    const item = document.createElement('div');
    item.className='cmd';
    item.innerHTML = `<div><strong>${d.name}</strong><div class="meta">${d.summary}</div></div><div>詳細</div>`;
    item.addEventListener('click',()=>openModalFor(k));
    list.appendChild(item);
  });
  panel.appendChild(list);
  const existing = document.getElementById('commands-panel');
  if(existing) existing.replaceWith(panel);
  else {panel.id='commands-panel'; pageHome.appendChild(panel);}
}

// ユーティリティ
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function nl2br(s){return s.replace(/\n/g,'<br>')}
function copyExample(key){
  const ex = COMMANDS[key].example;
  navigator.clipboard?.writeText(ex).then(()=>alert('サンプルをコピーしました'));
}

// モーダル外クリックで閉じる
document.getElementById('modal').addEventListener('click', (e)=>{ if(e.target.id==='modal') closeModal(); });
