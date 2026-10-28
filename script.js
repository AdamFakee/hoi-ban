/* Hội Kèo — script.js (không dùng thư viện ngoài) */
(() => {
'use strict';

/* ===== CẤU HÌNH =====
   SCRIPT_URL: dán URL Web app của Google Apps Script vào đây (xem README.md).
   Để trống = chế độ thử: form vẫn chạy nhưng không gửi đi đâu. */
const CONFIG = {
  SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwlguAsD3JA9XrwWjhdsMXgo707m2uXgLz685b765cEo6lWTkhVofsvhfadfX3mz36h/exec',
  COOLDOWN_MS: 30000
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(pointer: fine)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- tiêu đề hiện từng từ ---------- */
const title = $('#heroTitle');
if (title) {
  const text = title.textContent.trim();
  title.setAttribute('aria-label', text);
  title.textContent = '';
  text.split(/\s+/).forEach((word, i) => {
    const s = document.createElement('span');
    s.className = 'w';
    s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--i', i);
    s.textContent = word;
    title.appendChild(s);
  });
}

/* ---------- reveal khi cuộn ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.classList.contains('hl')) setTimeout(() => e.target.classList.add('ready'), 1000);
    io.unobserve(e.target);
  });
}, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
$$('.reveal').forEach((el, i) => {
  if (el.classList.contains('hl') || el.classList.contains('tl')) el.style.setProperty('--d', ((i % 3) * 0.1) + 's');
  io.observe(el);
});

/* ---------- header, progress, nav, mood, timeline ---------- */
const hdr = $('#hdr'), bar = $('#progress'), toTop = $('#toTop'), tlEl = $('#timeline');
const navLinks = $$('.nav-link');
const secs = navLinks.map(a => a.dataset.sec);
let ticking = false;
function onScroll() {
  const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? y / max : 0;
  bar.style.width = (p * 100) + '%';
  hdr.classList.toggle('scrolled', y > 10);
  toTop.classList.toggle('show', y > 700);
  
  let cur = 'top';
  secs.forEach(id => {
    const el = id === 'top' ? null : document.getElementById(id);
    if (el && el.getBoundingClientRect().top < innerHeight * 0.45) cur = id;
  });
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.sec === cur));

  if (tlEl) {
    const r = tlEl.getBoundingClientRect();
    const t = clamp((innerHeight * 0.6 - r.top) / r.height, 0, 1);
    tlEl.style.setProperty('--p', t.toFixed(3));
  }
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();
toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }));

/* ---------- menu mobile ---------- */
const burger = $('#burger'), nav = $('#nav');
function setMenu(open) {
  burger.classList.toggle('open', open);
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
  burger.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

/* ---------- nút hút nhẹ về con trỏ ---------- */
if (finePointer && !reduce) {
  $$('.magnetic').forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.28;
      el.style.transform = `translate(${x}px,${y}px)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- thẻ nghiêng theo chuột ---------- */
if (finePointer && !reduce) {
  $$('.tilt').forEach(el => {
    el.addEventListener('pointermove', e => {
      if (!el.classList.contains('ready')) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(800px) rotateY(${(x - .5) * 10}deg) rotateX(${(.5 - y) * 10}deg) translateY(-4px)`;
      el.style.setProperty('--mx', (x * 100) + '%');
      el.style.setProperty('--my', (y * 100) + '%');
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ---------- chồng thẻ kiểu Tinder (vuốt vô hạn) ---------- */
(function deck() {
  const root = $('#deck');
  if (!root) return;
  const cards = $$('.card', root);
  const n = cards.length;
  const status = $('#deckStatus'), undoBtn = $('#btnUndo');
  // order[0] = thẻ trên cùng. Vuốt xong thẻ bay ra, rồi xuống cuối chồng -> vuốt mãi không hết.
  let order = cards.map((_, i) => i);
  const history = [];          // các lần vuốt gần nhất: { idx, dir, timer }
  let likes = 0;
  let drag = null;
  const away = () => Math.max(innerWidth, 600) * 1.05;
  const outPose = d => `translate3d(${d * away()}px,50px,0) rotate(${d * 26}deg)`;

  function layout() {
    order.forEach((idx, rank) => {
      const c = cards[idx];
      const k = Math.min(rank, 3);
      const tilt = rank === 0 ? 0 : (idx % 2 ? 1.6 : -1.6) * k;
      c.style.transform = `translate3d(0,${k * 14}px,0) scale(${1 - k * .05}) rotate(${tilt}deg)`;
      c.style.opacity = rank > 3 ? 0 : 1;
      c.style.pointerEvents = rank === 0 ? 'auto' : 'none';
      c.style.zIndex = n - rank;
      c.classList.toggle('is-top', rank === 0);
      if (!(drag && drag.c === c)) {
        $('.stamp.like', c).style.opacity = 0;
        $('.stamp.nope', c).style.opacity = 0;
      }
    });
    status.textContent = `♥ ${likes}`;
    undoBtn.disabled = history.length === 0;
  }

  function commit(dir) {
    if (order.length < 2) return;          // luôn chừa lại ít nhất 1 thẻ trong chồng
    const idx = order.shift();
    const c = cards[idx];
    if (dir > 0) likes++;
    $(dir > 0 ? '.stamp.like' : '.stamp.nope', c).style.opacity = 1;
    c.style.pointerEvents = 'none';
    c.style.transform = outPose(dir);
    c.style.opacity = 0;
    const rec = { idx, dir, timer: 0 };
    // bay xong thì chuyển lặng lẽ xuống cuối chồng
    rec.timer = setTimeout(() => {
      rec.timer = 0;
      c.style.transition = 'none';
      order.push(idx);
      layout();
      void c.offsetWidth;
      c.style.transition = '';
    }, 520);
    history.push(rec);
    if (history.length > 40) history.shift();
    layout();
  }

  function undo() {
    const rec = history.pop();
    if (!rec) return;
    const c = cards[rec.idx];
    if (rec.timer) { clearTimeout(rec.timer); rec.timer = 0; }
    else order.splice(order.indexOf(rec.idx), 1);
    if (rec.dir > 0) likes--;
    // đưa thẻ về vị trí bay ra rồi cho trượt lại lên đầu chồng
    c.style.transition = 'none';
    c.style.transform = outPose(rec.dir);
    c.style.opacity = 0;
    void c.offsetWidth;
    c.style.transition = '';
    order.unshift(rec.idx);
    layout();
  }

  cards.forEach((c, i) => {
    c.addEventListener('pointerdown', e => {
      if (i !== order[0] || e.button > 0) return;
      drag = { c, x: e.clientX, y: e.clientY, t: performance.now(), dx: 0, moved: false };
      c.classList.add('dragging');
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', e => {
      if (!drag || drag.c !== c) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      drag.moved = true; drag.dx = dx;
      c.style.transform = `translate3d(${dx}px,${dy * .35}px,0) rotate(${dx * .055}deg)`;
      $('.stamp.like', c).style.opacity = clamp(dx / 110, 0, 1);
      $('.stamp.nope', c).style.opacity = clamp(-dx / 110, 0, 1);
    });
    const end = () => {
      if (!drag || drag.c !== c) return;
      const dt = Math.max(performance.now() - drag.t, 1);
      const dx = drag.dx, v = dx / dt;
      c.classList.remove('dragging');
      drag = null;
      if (Math.abs(dx) > 110 || (Math.abs(v) > .6 && Math.abs(dx) > 40)) commit(dx > 0 ? 1 : -1);
      else layout();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  });

  $('#btnLike').addEventListener('click', () => commit(1));
  $('#btnNope').addEventListener('click', () => commit(-1));
  undoBtn.addEventListener('click', undo);
  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); commit(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); commit(-1); }
    else if (e.key === 'Backspace') { e.preventDefault(); undo(); }
  });
  addEventListener('resize', layout);
  layout();
})();

/* ---------- pháo giấy ---------- */
function confetti() {
  if (reduce) return;
  const cv = $('#confetti'), ctx = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
  const cols = ['#ffd23f', '#ff5d9e', '#4cc3ff', '#7ef0b4', '#161616'];
  const parts = Array.from({ length: 110 }, () => ({
    x: cv.width / 2 + (Math.random() - .5) * cv.width * .3,
    y: cv.height * .62,
    vx: (Math.random() - .5) * 16 * dpr,
    vy: (-Math.random() * 15 - 6) * dpr,
    w: (Math.random() * 8 + 6) * dpr, h: (Math.random() * 5 + 4) * dpr,
    r: Math.random() * 6.28, vr: (Math.random() - .5) * .4,
    c: cols[(Math.random() * cols.length) | 0], life: 0
  }));
  let raf;
  (function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = 0;
    for (const p of parts) {
      p.vy += .42 * dpr; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life++;
      if (p.y < cv.height + 40) alive++;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = clamp(1 - p.life / 220, 0, 1);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (alive > 0) raf = requestAnimationFrame(loop);
    else ctx.clearRect(0, 0, cv.width, cv.height);
  })();
}

/* ---------- form nguyện vọng ---------- */
(function form() {
  const f = $('#wishForm');
  if (!f) return;
  const card = f.closest('.form-card');
  const msg = $('#formMsg'), btn = $('#submitBtn'), ok = $('#success');

  const pad = x => String(x).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const label = s => { const [y, m, d] = s.split('-').map(Number); return `${DOW[new Date(y, m - 1, d).getDay()]} ${pad(d)}/${pad(m)}`; };
  const labelFull = s => `${label(s)}/${s.slice(0, 4)}`;
  const today = new Date();
  const todayISO = iso(today);

  const setErr = (name, text) => {
    const e = $(`.err[data-for="${name}"]`, f);
    if (!e) return;
    e.textContent = text || '';
    e.classList.toggle('show', !!text);
    const fld = e.closest('.fld');
    if (fld) fld.classList.toggle('bad', !!text);
  };
  const say = (text, isErr) => { msg.textContent = text; msg.classList.toggle('error', !!isErr); };

  /* ----- lịch riêng: chọn nhiều ngày ----- */
  const MAX_PICK = 31, MAX_AHEAD = 12;
  const cal = { y: today.getFullYear(), m: today.getMonth(), sel: new Set() };
  const grid = $('#calGrid'), calTitle = $('#calTitle'), prev = $('#calPrev'), next = $('#calNext');
  const pickedEl = $('#picked'), hidden = $('#datesInput');

  function renderCal(dir) {
    calTitle.textContent = `Tháng ${cal.m + 1}, ${cal.y}`;
    const lead = (new Date(cal.y, cal.m, 1).getDay() + 6) % 7;        // thứ 2 đứng đầu tuần
    const days = new Date(cal.y, cal.m + 1, 0).getDate();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < lead; i++) { const s = document.createElement('span'); s.className = 'cal-pad'; frag.appendChild(s); }
    for (let d = 1; d <= days; d++) {
      const key = `${cal.y}-${pad(cal.m + 1)}-${pad(d)}`;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cal-day'; b.textContent = d; b.dataset.d = key;
      b.setAttribute('aria-label', labelFull(key));
      if (key < todayISO) b.disabled = true;
      if (key === todayISO) b.classList.add('today');
      const on = cal.sel.has(key);
      if (on) b.classList.add('on');
      b.setAttribute('aria-pressed', on);
      frag.appendChild(b);
    }
    grid.replaceChildren(frag);
    grid.classList.remove('slide-l', 'slide-r');
    if (dir && !reduce) { void grid.offsetWidth; grid.classList.add(dir > 0 ? 'slide-l' : 'slide-r'); }
    prev.disabled = cal.y === today.getFullYear() && cal.m === today.getMonth();
    next.disabled = new Date(cal.y, cal.m, 1) >= new Date(today.getFullYear(), today.getMonth() + MAX_AHEAD, 1);
  }

  function renderPicked() {
    const list = Array.from(cal.sel).sort();
    hidden.value = list.join(',');
    pickedEl.replaceChildren();
    if (!list.length) {
      const e = document.createElement('span');
      e.className = 'pk-empty'; e.textContent = 'Chưa chọn ngày nào — bấm vào lịch để chọn, chọn được nhiều ngày.';
      pickedEl.appendChild(e);
      return;
    }
    list.forEach(key => {
      const c = document.createElement('span'); c.className = 'pk'; c.textContent = label(key);
      const x = document.createElement('button');
      x.type = 'button'; x.dataset.d = key; x.textContent = '×'; x.setAttribute('aria-label', 'Bỏ ' + labelFull(key));
      c.appendChild(x); pickedEl.appendChild(c);
    });
  }

  grid.addEventListener('click', e => {
    const b = e.target.closest('.cal-day');
    if (!b || b.disabled) return;
    const key = b.dataset.d;
    if (cal.sel.has(key)) cal.sel.delete(key);
    else {
      if (cal.sel.size >= MAX_PICK) { say(`Chọn tối đa ${MAX_PICK} ngày thôi nhé.`, true); return; }
      cal.sel.add(key);
    }
    const on = cal.sel.has(key);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
    renderPicked(); setErr('dates', ''); say('');
  });
  pickedEl.addEventListener('click', e => {
    const x = e.target.closest('button[data-d]');
    if (!x) return;
    cal.sel.delete(x.dataset.d);
    renderCal(0); renderPicked();
  });
  prev.addEventListener('click', () => { cal.m--; if (cal.m < 0) { cal.m = 11; cal.y--; } renderCal(-1); });
  next.addEventListener('click', () => { cal.m++; if (cal.m > 11) { cal.m = 0; cal.y++; } renderCal(1); });
  f.addEventListener('reset', () => setTimeout(() => { cal.sel.clear(); renderCal(0); renderPicked(); }));
  renderCal(0); renderPicked();

  /* ----- lời chào riêng theo từng người (sửa chữ ở đây) ----- */
  const GREET = {
    'Thuỳ Trang': { em: '👩‍🏫', text: 'Chào cô giáo Trang!' },
    'Thương Yến': { em: '💖', text: 'Ra là Yến xinh gái!' },
    'Mạnh Đức': { em: '👀', text: 'Bạn còn nhớ Thanh Huyền chứ?' },
    'Admin cute': { em: '😎', text: 'Đương nhiên là trai đẹp rồi!' }
  };
  const greet = $('#greet'), greetEm = $('#greetEm'), greetTxt = $('#greetTxt');
  let typer = 0;
  function showGreet(name) {
    clearInterval(typer);
    const g = GREET[name];
    if (!g) { greet.hidden = true; return; }
    greetEm.textContent = g.em;
    greet.hidden = false;
    greet.classList.remove('pop'); void greet.offsetWidth; greet.classList.add('pop');
    if (reduce) { greetTxt.textContent = g.text; return; }
    let i = 0; greetTxt.textContent = '';
    typer = setInterval(() => {
      greetTxt.textContent = g.text.slice(0, ++i);
      if (i >= g.text.length) clearInterval(typer);
    }, 28);
  }
  f.addEventListener('change', e => { if (e.target.name === 'name') showGreet(e.target.value); });
  f.addEventListener('reset', () => { clearInterval(typer); greet.hidden = true; });

  /* ----- đọc + kiểm tra ----- */
  function read() {
    const d = new FormData(f);
    return {
      name: (d.get('name') || '').trim(),
      wishes: d.getAll('wish'),
      wishText: (d.get('wishText') || '').trim(),
      dates: hidden.value ? hidden.value.split(',') : [],
      slot: d.get('slot') || '',
      roastText: (d.get('roastText') || '').trim(),
      note: (d.get('note') || '').trim(),
      website: d.get('website') || ''
    };
  }
  function validate(v) {
    let good = true;
    const need = (cond, name, text) => { setErr(name, cond ? '' : text); if (!cond) good = false; };
    need(v.name.length >= 2, 'name', 'Chọn xem bạn là ai nhé.');
    need(v.wishes.length > 0 || v.wishText.length > 0, 'wish', 'Chọn ít nhất một kèo hoặc ghi nguyện vọng riêng.');
    need(v.dates.length > 0, 'dates', 'Chọn ít nhất một ngày trên lịch.');
    need(!!v.slot, 'slot', 'Chọn một khung giờ.');
    return good;
  }

  f.addEventListener('input', e => { if (e.target.name) setErr(e.target.name, ''); });
  f.addEventListener('change', e => { if (e.target.name) setErr(e.target.name, ''); });

  f.addEventListener('submit', async e => {
    e.preventDefault();
    const v = read();
    if (v.website) return; // bot dính honeypot: im lặng bỏ qua
    if (!validate(v)) {
      say('Còn thiếu vài ô, xem lại giúp tụi mình nhé.', true);
      const first = $('.fld.bad', f);
      if (first) first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      return;
    }
    let last = 0;
    try { last = +localStorage.getItem('nqxg:last') || 0; } catch (_) {}
    const wait = CONFIG.COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) { say(`Bạn vừa gửi xong, đợi ${Math.ceil(wait / 1000)} giây rồi gửi lại nhé.`, true); return; }

    say(''); btn.classList.add('loading'); btn.disabled = true;
    try {
      if (CONFIG.SCRIPT_URL) {
        const body = new URLSearchParams({
          name: v.name, wishes: v.wishes.join(', '), wishText: v.wishText,
          dates: v.dates.map(labelFull).join(', '), slot: v.slot,
          roast: v.roastText, note: v.note, website: ''
        });
        // no-cors: Apps Script không trả header CORS; trả lời là "opaque", chỉ biết là gửi được hay không
        await fetch(CONFIG.SCRIPT_URL, { method: 'POST', mode: 'no-cors', body });
      } else {
        console.warn('[Người Quen Xì Gòn] Chưa có SCRIPT_URL trong script.js — chế độ thử, dữ liệu KHÔNG được gửi đi.', v);
        await new Promise(r => setTimeout(r, 700));
      }
      try { localStorage.setItem('nqxg:last', String(Date.now())); } catch (_) {}
      card.classList.add('done');
      ok.hidden = false;
      if (!CONFIG.SCRIPT_URL) $('p', ok).textContent = '(Chế độ thử: chưa nối Google Sheet nên dữ liệu chưa được lưu.)';
      ok.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      confetti();
    } catch (err) {
      console.error(err);
      say('Gửi chưa được, bạn kiểm tra mạng rồi thử lại nhé.', true);
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  $('#again').addEventListener('click', () => {
    f.reset(); ok.hidden = true; card.classList.remove('done'); say('');
    $('p', ok).textContent = 'Tụi mình sẽ tổng hợp cả hội rồi nhắn lại để chốt kèo.';
  });
})();
})();
