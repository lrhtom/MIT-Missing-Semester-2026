/* ==========================================================================
 * Missing Semester 2026 中文笔记 · 页面运行时 app.js
 *  页面文件只写正文（<main><article class="doc">…）。顶栏、侧栏、页尾导航
 *  都由这里根据 COURSE（course.js）和正文里的 <h2 data-t="mm:ss"> 自动生成。
 *  - 侧栏「本讲内容」= 本讲各小节（每节带视频时间戳 ▶）+ 滚动联动高亮
 *  - 编辑：正文块可直接改字，按块存 localStorage（键含原文哈希，原文更新后旧修改自动失效）
 *  - 学习进度、深浅色、全站搜索（search-index.js 按需加载）、代码复制、页内视频
 * ========================================================================== */
(function () {
  'use strict';
  var P = window.PAGE || {}, CO = window.COURSE || { chapters: [] };
  var NS = 'ms26:';
  var store = {
    get: function (k) { try { return localStorage.getItem(NS + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(NS + k, v); } catch (e) { /* file:// 或隐私模式 */ } },
    del: function (k) { try { localStorage.removeItem(NS + k); } catch (e) { } }
  };
  var root = document.documentElement;
  applyTheme(store.get('theme') || 'light');

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function secs(ts) { var p = String(ts).split(':').map(Number), s = 0; p.forEach(function (x) { s = s * 60 + x; }); return s; }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function toast(msg, ms) {
    var t = $('.toast') || document.body.appendChild(el('div', 'toast'));
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('show'); }, ms || 1800);
  }
  function applyTheme(th) {
    root.setAttribute('data-theme', th);
    var b = document.getElementById('themeBtn'); if (b) b.textContent = th === 'dark' ? '浅' : '深';
  }
  var base = P.base || '';
  function chOf(key) { for (var i = 0; i < CO.chapters.length; i++) if (CO.chapters[i].key === key) return CO.chapters[i]; return null; }
  var CH = chOf(P.ch || P.key);

  /* 每节的难度 / 重要程度（数据在 course.js 的 COURSE.ratings，是笔记作者的判断） */
  var RATE = (CO.ratings || {})[P.key] || {};
  var DIFF_W = ['', '入门', '简单', '中等', '较难', '硬核'], IMP_W = ['', '可跳过', '选学', '了解', '重要', '必会'];
  var DIFF_T = ['', '看一遍就懂', '动手一次就会', '要理解一个机制', '多个概念叠加、容易踩坑', '需要底层知识或长期练习'];
  var IMP_T = ['', '背景信息', '有兴趣或需要时再看', '用到时能想起来', '常用，尽量掌握', '天天用，或后面多讲都依赖'];
  var RT_LEGEND = '难度 ★：1 入门 · 2 简单 · 3 中等 · 4 较难 · 5 硬核　重要 ●：5 必会 · 4 重要 · 3 了解 · 2 选学 · 1 可跳过（笔记作者的判断，非官方）';
  function glyphs(ch, n) { return '<span class="g"><span class="on">' + new Array(n + 1).join(ch) + '</span><span class="off">' + new Array(6 - n).join(ch) + '</span></span>'; }
  function rateChips(r) {
    return '<span class="rt diff" title="难度 ' + r[0] + '/5：' + DIFF_T[r[0]] + '">难度 ' + glyphs('★', r[0]) + DIFF_W[r[0]] + '</span>' +
      '<span class="rt imp i' + r[1] + '" title="重要程度 ' + r[1] + '/5：' + IMP_T[r[1]] + '">重要 ' + glyphs('●', r[1]) + IMP_W[r[1]] + '</span>';
  }
  function initRatings() {
    $$('.doc h2[id], .doc h3[id].side').forEach(function (h) {
      var r = RATE[h.id]; if (!r) return;
      var nx = h.nextElementSibling;
      if (nx && nx.classList.contains('ex-meta')) { nx.insertAdjacentHTML('afterbegin', rateChips(r)); return; }
      var row = el('div', 'sec-rate', rateChips(r));
      row.setAttribute('data-noedit', '');
      h.parentNode.insertBefore(row, nx);
    });
    var lg = $('.lab-legend');
    if (lg) lg.insertAdjacentHTML('afterend', '<div class="rt-legend">' + RT_LEGEND + '</div>');
  }

  /* ---------- 顶栏 ---------- */
  function buildTop() {
    var isCh = P.type === 'ch' || P.type === 'lab';
    var top = el('header', 'topbar');
    top.innerHTML =
      '<button class="btn icon menu-toggle" aria-label="目录">≡</button>' +
      '<a class="brand" href="' + base + 'index.html"><span class="logo">ms</span><span class="bt">Missing Semester</span> <small>2026 · 中文笔记</small></a>' +
      '<span class="spacer"></span>' +
      '<input id="search" type="search" placeholder="搜索笔记  /" autocomplete="off" aria-label="搜索">' +
      (isCh ? '<button class="btn done hide-m" id="doneBtn" title="把本页标记为已学（存本机浏览器）">○ 已学</button>' : '') +
      (P.type !== 'index' ? '<button class="btn" id="editBtn" title="直接修改本页文字（自动保存在本机浏览器）">编辑</button>' +
        '<div class="more"><button class="btn icon" id="moreBtn" aria-label="更多">⋯</button><div class="more-pop" id="morePop">' +
        '<button data-act="export">导出本页修改（JSON）</button><button data-act="import">导入修改…</button>' +
        '<hr><button data-act="reset">撤销本页全部修改</button></div></div>' : '') +
      '<button class="btn icon" id="themeBtn" aria-label="切换深浅色">' + (root.getAttribute('data-theme') === 'dark' ? '浅' : '深') + '</button>';
    document.body.insertBefore(top, document.body.firstChild);
    document.body.insertBefore(el('div', 'read-bar'), top);
    $('#themeBtn').onclick = function () {
      var th = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(th); store.set('theme', th);
    };
    $('.menu-toggle').onclick = function () { document.body.classList.toggle('sb-open'); };
    var mb = $('#moreBtn');
    if (mb) {
      mb.onclick = function (e) { e.stopPropagation(); $('#morePop').classList.toggle('show'); };
      document.addEventListener('click', function () { $('#morePop').classList.remove('show'); });
      $$('#morePop button').forEach(function (b) { b.onclick = function () { EDIT[b.getAttribute('data-act')](); }; });
    }
  }

  /* ---------- 侧栏 ---------- */
  function buildSide(main) {
    var shell = el('div', 'shell');
    main.parentNode.insertBefore(shell, main);
    var sb = el('aside', 'sidebar');
    shell.appendChild(sb); shell.appendChild(main);
    var html = '';
    if (P.type === 'ch' || P.type === 'lab') {
      var hs = $$('.doc h2[id], .doc h3[id].side');
      var vid = CH && CH.vid;
      html += '<div class="sb-h">' + (P.type === 'lab' ? '本页练习' : '本讲内容') + (CH ? '<em>' + (P.type === 'lab' ? hs.length + ' 节' : CH.dur) + '</em>' : '') + '</div><div class="seclist">';
      var n = 0;
      hs.forEach(function (h) {
        var sub = h.tagName === 'H3';
        if (!sub) n++;
        var t = h.getAttribute('data-t');
        var label = h.getAttribute('data-nav');
        if (!label) { var cl = h.cloneNode(true); $$('.ts,.hn,.tag', cl).forEach(function (x) { x.remove(); }); label = cl.textContent.trim(); }
        var vz = h.hasAttribute('data-vzmark') || (function () {
          for (var x = h.nextElementSibling; x && !/^H2$/.test(x.tagName); x = x.nextElementSibling) if (x.hasAttribute('data-vz')) return true;
          return false;
        })();
        html += '<div class="sec' + (sub ? ' sub' : '') + '" data-for="' + h.id + '"><a class="sec-main" href="#' + h.id + '">' +
          (sub ? '' : '<span class="n">' + n + '</span>') + '<span class="t">' + esc(label) + (vz && !sub ? '<span class="vzm">演示</span>' : '') +
          (t ? '<span class="d">' + t + '</span>' : '') +
          (RATE[h.id] ? '<span class="rr">★' + RATE[h.id][0] + ' · <span class="w' + RATE[h.id][1] + '">' + IMP_W[RATE[h.id][1]] + '</span></span>' : '') + '</span></a>' +
          (t && vid ? '<a class="sec-yt" href="https://youtu.be/' + vid + '?t=' + secs(t) + '" target="_blank" rel="noopener" title="在 YouTube 从 ' + t + ' 开始看">▶</a>' : '') + '</div>';
      });
      html += '</div>';
    }
    var prog = getProg();
    html += '<div class="sb-h">全部讲次</div><nav class="chlist">';
    html += '<a href="' + base + 'index.html" class="' + (P.type === 'index' ? 'cur' : '') + '"><span class="cn">⌂</span>主页 · 资源总览</a>';
    CO.chapters.forEach(function (c) {
      var cur = (P.type === 'ch' && P.key === c.key);
      html += '<a href="' + base + c.key + '.html" class="' + (cur ? 'cur' : '') + '"><span class="cn">' + String(c.n).padStart(2, '0') + '</span>' + esc(c.title) +
        (prog[c.key] ? '<span class="ck">已学</span>' : '') + '</a>';
    });
    html += '</nav><div class="sb-h" style="margin-top:18px">练习可视化笔记</div><nav class="chlist">';
    CO.chapters.forEach(function (c) {
      var cur = (P.type === 'lab' && P.key === 'lab' + c.key.slice(2));
      html += '<a href="' + base + 'labs/lab' + c.key.slice(2) + '.html" class="' + (cur ? 'cur' : '') + '"><span class="cn">' + String(c.n).padStart(2, '0') + '</span>' + esc(c.title) +
        (prog['lab' + c.key.slice(2)] ? '<span class="ck">已学</span>' : '<span class="lb">练习</span>') + '</a>';
    });
    html += '</nav>';
    sb.innerHTML = html;
    sb.addEventListener('click', function (e) { if (e.target.closest('a.sec-main')) document.body.classList.remove('sb-open'); });
  }

  /* ---------- 章节页头（标题、视频、讲义链接） ---------- */
  function buildHead(doc) {
    if (P.type !== 'ch' || !CH) return;
    var hd = el('header', 'ch-head');
    var lab = 'labs/lab' + CH.key.slice(2) + '.html';
    hd.innerHTML = '<div class="ch-kicker">LECTURE ' + String(CH.n).padStart(2, '0') + ' · ' + CH.date + '</div>' +
      '<h1>' + esc(CH.title) + '</h1><p class="en">' + esc(CH.en) + '</p>' +
      '<div class="ch-meta"><span>视频 <b>' + CH.dur + '</b></span><span>字幕 <b>官方人工英文字幕</b></span>' +
      (P.vzCount ? '<span>可视化 <b>' + P.vzCount + ' 个</b></span>' : '') +
      (function () {
        var ks = Object.keys(RATE), m = ks.filter(function (k) { return RATE[k][1] === 5; }).length;
        return ks.length ? '<span>必会 <b>' + m + ' 节</b> / 共 ' + ks.length + ' 节</span>' : '';
      })() + '</div>' +
      '<div class="ch-links"><button class="btn pri" id="playHere"><span class="yt-ico"></span>页内播放</button>' +
      '<a class="btn" href="https://youtu.be/' + CH.vid + '" target="_blank" rel="noopener">YouTube 打开</a>' +
      '<a class="btn" href="' + CO.site + '2026/' + CH.slug + '/" target="_blank" rel="noopener">官方讲义（英）</a>' +
      '<a class="btn" href="https://missing-semester-cn.github.io/2026/' + CH.slug + '/" target="_blank" rel="noopener">社区中文译文</a>' +
      '<a class="btn" href="' + lab + '">本讲练习可视化笔记</a></div>' +
      '<div class="video-box" id="videoBox"></div><div class="rt-legend">' + RT_LEGEND + '</div>';
    doc.insertBefore(hd, doc.firstChild);
    $('#playHere').onclick = function () { playAt(0, true); };
  }
  function playAt(s, toggle) {
    var box = $('#videoBox'); if (!box || !CH) return false;
    if (toggle && box.classList.contains('show')) { box.classList.remove('show'); box.innerHTML = ''; return true; }
    box.classList.add('show');
    box.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + CH.vid + '?start=' + s + (s ? '&autoplay=1' : '') +
      '" title="YouTube" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>';
    box.scrollIntoView({ block: 'center' });
    return true;
  }

  /* 正文里的时间戳：<span class="ts">12:34</span> → 可点链接；若页内视频已打开，则在页内跳转 */
  function initTimestamps() {
    $$('.doc .ts').forEach(function (t) {
      var ts = t.textContent.trim(), vid = t.getAttribute('data-v') || (CH && CH.vid);
      if (!vid) return;
      var a = document.createElement('a');
      a.className = 'ts'; a.textContent = ts; a.href = 'https://youtu.be/' + vid + '?t=' + secs(ts);
      a.target = '_blank'; a.rel = 'noopener'; a.title = '视频 ' + ts + ' 处';
      a.onclick = function (e) {
        var box = $('#videoBox');
        if (box && box.classList.contains('show') && vid === CH.vid) { e.preventDefault(); playAt(secs(ts)); }
      };
      t.parentNode.replaceChild(a, t);
    });
  }

  /* ---------- 页尾上一讲 / 下一讲 ---------- */
  function buildPager(doc) {
    if (P.type !== 'ch' && P.type !== 'lab') return;
    var i = -1; CO.chapters.forEach(function (c, j) { if (c.key === (CH && CH.key)) i = j; });
    if (i < 0) return;
    var pre = P.type === 'lab' ? 'lab' : 'ch', dir = P.type === 'lab' ? '' : '';
    function href(c) { return dir + pre + c.key.slice(2) + '.html'; }
    var pv = CO.chapters[i - 1], nx = CO.chapters[i + 1];
    var pg = el('nav', 'pager');
    pg.innerHTML = (pv ? '<a href="' + href(pv) + '">← 上一讲<b>' + esc(pv.title) + '</b></a>' : '<span></span>') +
      (nx ? '<a class="nx" href="' + href(nx) + '">下一讲 →<b>' + esc(nx.title) + '</b></a>' : '<span></span>');
    doc.appendChild(pg);
  }

  /* ---------- 滚动联动 ---------- */
  function initSpy() {
    var secs = $$('.sidebar .sec'), bar = $('.read-bar');
    var hs = secs.map(function (s) { return document.getElementById(s.getAttribute('data-for')); });
    var ticking = false;
    function upd() {
      ticking = false;
      var y = window.scrollY + 120, cur = -1;
      for (var i = 0; i < hs.length; i++) if (hs[i] && hs[i].offsetTop <= y) cur = i;
      secs.forEach(function (s, i) { s.classList.toggle('cur', i === cur); });
      var h = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.width = (h > 0 ? 100 * scrollY / h : 0) + '%';
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------- 代码块：复制按钮 ----------
   * 复制内容：data-copy 属性优先；终端块（.term）只复制带提示符的命令行；
   * 其他只复制 <pre> 的纯文本（.p 提示符、.no-copy 注释层都会排除）。 */
  function initCopy() {
    $$('.doc .code').forEach(function (box) {
      if (box.querySelector('.copy')) return;
      var b = el('button', 'copy', '复制'); b.type = 'button';
      box.appendChild(b);
      b.onclick = function () {
        var pre = box.querySelector('pre'), txt;
        if (box.hasAttribute('data-copy')) txt = box.getAttribute('data-copy');
        else if (box.classList.contains('term')) {
          txt = $$('.cmd', pre).map(function (c) { return c.textContent; }).join('\n');
          if (!txt) txt = pre.textContent;
        } else {
          var c = pre.cloneNode(true);
          $$('.p,.no-copy', c).forEach(function (x) { x.remove(); });
          txt = c.textContent;
        }
        copyText(txt, function (ok) { b.textContent = ok ? '已复制' : '复制失败'; b.classList.toggle('ok', ok); setTimeout(function () { b.textContent = '复制'; b.classList.remove('ok'); }, 1400); });
      };
    });
  }
  function copyText(txt, cb) {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(function () { cb(true); }, function () { fallback(); });
    else fallback();
    function fallback() {
      var ta = el('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) { }
      ta.remove(); cb(ok);
    }
  }
  window.MS = window.MS || {}; window.MS.copyText = copyText; window.MS.store = store; window.MS.toast = toast;

  /* ---------- 编辑（按块存本机） ---------- */
  var EKEY = 'edit:' + (P.key || 'x');
  var BLOCKS = 'p,li,h2,h3,h4,td,th,summary,figcaption,.ans>div,.callout>.ct,.mini h4';
  var EDIT = {
    blocks: function () {
      return $$('.doc ' + BLOCKS.split(',').join(',.doc ')).filter(function (b) {
        return !b.closest('.vz,.code,.fig svg,.ch-head,.pager,[data-noedit],[data-file],[data-run],[data-env],.lab-code,.lab-run') && !b.querySelector(BLOCKS);
      });
    },
    init: function () {
      var saved = EDIT.load(), cnt = 0;
      EDIT.blocks().forEach(function (b, i) {
        var id = i + '-' + hash(b.innerHTML);
        b.setAttribute('data-bid', id);
        if (saved[id] != null) { b.innerHTML = saved[id]; b.classList.add('edited'); cnt++; }
      });
      var btn = $('#editBtn'); if (!btn) return;
      btn.onclick = function () { EDIT.toggle(); };
      document.body.appendChild(el('div', 'edit-hint', '编辑模式：直接点文字修改，自动保存到本机浏览器 · 按 Esc 或再点「编辑」退出'));
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && document.body.classList.contains('editing')) EDIT.toggle(); });
      var tm = 0;
      document.addEventListener('input', function (e) {
        var b = e.target.closest && e.target.closest('[data-bid]'); if (!b) return;
        clearTimeout(tm); tm = setTimeout(function () {
          var s = EDIT.load(); s[b.getAttribute('data-bid')] = cleanBlock(b); EDIT.save(s); b.classList.add('edited');
        }, 400);
      });
      if (cnt) setTimeout(function () { toast('已载入你对本页的 ' + cnt + ' 处修改'); }, 400);
    },
    toggle: function () {
      var on = !document.body.classList.contains('editing');
      document.body.classList.toggle('editing', on);
      $('#editBtn').classList.toggle('on', on);
      $('#editBtn').textContent = on ? '完成编辑' : '编辑';
      $$('[data-bid]').forEach(function (b) { if (on) b.setAttribute('contenteditable', 'true'); else b.removeAttribute('contenteditable'); });
      if (!on) toast('修改已保存在本机浏览器');
    },
    load: function () { try { return JSON.parse(store.get(EKEY) || '{}') || {}; } catch (e) { return {}; } },
    save: function (o) { store.set(EKEY, JSON.stringify(o)); },
    export: function () {
      var data = JSON.stringify({ page: P.key, edits: EDIT.load() }, null, 1);
      var a = el('a'); a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = 'ms26-' + P.key + '-edits.json'; document.body.appendChild(a); a.click(); a.remove();
    },
    import: function () {
      var inp = el('input'); inp.type = 'file'; inp.accept = '.json,application/json';
      inp.onchange = function () {
        var f = inp.files[0]; if (!f) return;
        f.text().then(function (t) {
          try { var o = JSON.parse(t); EDIT.save(o.edits || o); location.reload(); } catch (e) { toast('文件格式不对'); }
        });
      };
      inp.click();
    },
    reset: function () {
      if (!confirm('撤销本页所有修改？此操作不可恢复。')) return;
      store.del(EKEY); location.reload();
    }
  };

  /* 保存修改时去掉运行时加上去的术语标记，只存你写的文字 */
  function cleanBlock(b) { return window.MSGL ? MSGL.clean(b) : b.innerHTML; }

  /* ---------- 学习进度 ---------- */
  function getProg() { try { return JSON.parse(store.get('done') || '{}') || {}; } catch (e) { return {}; } }
  function initDone() {
    var b = $('#doneBtn'); if (!b) return;
    function sync() { var on = !!getProg()[P.key]; b.classList.toggle('on', on); b.textContent = on ? '已学' : '标为已学'; }
    b.onclick = function () { var p = getProg(); p[P.key] = !p[P.key]; if (!p[P.key]) delete p[P.key]; store.set('done', JSON.stringify(p)); sync(); };
    sync();
  }
  window.MS.getProg = getProg;

  /* ---------- 搜索 ---------- */
  function initSearch() {
    var inp = $('#search'), box = el('div', 'sr'), loaded = false, sel = 0;
    document.body.appendChild(box);
    function load(cb) {
      if (window.SEARCH) return cb();
      if (loaded) return; loaded = true;
      var s = document.createElement('script'); s.src = base + 'assets/search-index.js'; s.onload = cb;
      s.onerror = function () { box.innerHTML = '<div class="none">搜索索引未生成</div>'; box.classList.add('show'); };
      document.head.appendChild(s);
    }
    function run() {
      var q = inp.value.trim().toLowerCase();
      if (!q) { box.classList.remove('show'); return; }
      load(function () {
        var words = q.split(/\s+/), out = [];
        (window.SEARCH || []).forEach(function (d) {
          var hay = (d.t + ' ' + d.x).toLowerCase(), score = 0;
          for (var i = 0; i < words.length; i++) { var k = hay.indexOf(words[i]); if (k < 0) return; score += (d.t.toLowerCase().indexOf(words[i]) >= 0 ? 10 : 1); }
          out.push([score, d]);
        });
        out.sort(function (a, b) { return b[0] - a[0]; });
        sel = 0;
        box.innerHTML = out.slice(0, 30).map(function (r, i) {
          var d = r[1], k = d.x.toLowerCase().indexOf(words[0]), sn = d.x.slice(Math.max(0, k - 30), k + 70);
          sn = esc(sn).replace(new RegExp(words[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), function (m) { return '<mark>' + m + '</mark>'; });
          return '<a href="' + base + d.u + '"' + (i === 0 ? ' class="on"' : '') + '><b>' + esc(d.c + ' · ' + d.t) + '</b>' + sn + '</a>';
        }).join('') || '<div class="none">没有找到</div>';
        box.classList.add('show');
      });
    }
    inp.addEventListener('input', run);
    inp.addEventListener('keydown', function (e) {
      var as = $$('a', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); if (!as.length) return;
        sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + as.length) % as.length;
        as.forEach(function (a, i) { a.classList.toggle('on', i === sel); }); as[sel].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter' && as[sel]) location.href = as[sel].href;
      else if (e.key === 'Escape') { inp.value = ''; box.classList.remove('show'); inp.blur(); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== inp) box.classList.remove('show'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); inp.focus(); }
    });
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var main = $('main'), doc = $('.doc');
    buildTop();
    if (main && P.type !== 'index') buildSide(main);
    if (doc) { if (P.type === 'ch') doc.classList.add('num'); buildHead(doc); buildPager(doc); }
    initTimestamps(); initCopy(); EDIT.init(); initDone(); initSearch(); initRatings();
    /* 术语卡片按需加载：要在 EDIT.init 之后，这样不影响“按原文哈希”保存的修改 */
    var gs = document.createElement('script'); gs.src = base + 'assets/glossary.js'; document.head.appendChild(gs);
    if (P.type !== 'index') initSpy();
    if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(function () { t.scrollIntoView(); }, 60); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
