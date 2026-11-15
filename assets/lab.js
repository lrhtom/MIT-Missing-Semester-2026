/* ==========================================================================
 * lab.js · 练习可视化笔记的渲染器
 *  数据来自 labs/data/labNN.js（window.LAB，生成笔记时由练习生成脚本真跑得到）：
 *    <div data-file="ex08/check.sh"></div>   源码 + 注释层（注释不可选中、可整体隐藏）
 *    <div data-run="ex08-a"></div>           真跑的命令与输出、退出码、运行环境
 *    <div data-env="gitbash|docker"></div>   环境检查表
 *  复制按钮的内容取自 LAB 里的源码字符串（逐字节等于源文件），不从页面 DOM 拼。
 * ========================================================================== */
(function () {
  'use strict';
  var L = window.LAB || { files: {}, runs: {}, env: {} };
  var store = (window.MS && MS.store) || { get: function () { return null; }, set: function () { } };
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  var WHERE = { gitbash: ['Git Bash 5.3 · Windows 本机', 'gb'], docker: ['Ubuntu 24.04 · Docker 容器', 'dk'], linux: ['Linux（本机没有此环境）', 'dk'] };

  /* 按扩展名选语言：shell 用专门的 hl()，其他语言用通用的 hlGen() */
  var LANG = {
    py: { c: '#', k: 'def return if elif else for while in import from as class with try except finally raise None True False and or not lambda pass yield assert global nonlocal async await break continue del is' },
    c: { c: '//', k: 'int char void return if else for while do struct typedef const static unsigned signed long short double float size_t sizeof include define break continue switch case default NULL malloc free' },
    js: { c: '//', k: 'var let const function return if else for while new this class await async try catch throw typeof of in true false null undefined import export from' },
    go: { c: '//', k: 'func return if else for range var const type struct package import nil true false defer go chan map interface' },
    rs: { c: '//', k: 'fn let mut return if else for while loop match impl struct enum use pub mod crate self Self true false' },
    awk: { c: '#', k: 'BEGIN END print printf if else for while in next exit function return' },
    gdb: { c: '#', k: 'break watch run continue next step print backtrace bt info frame finish quit set display' },
    yaml: { c: '#', k: 'true false null on' },
    toml: { c: '#', k: 'true false' },
    docker: { c: '#', k: 'FROM RUN COPY ADD WORKDIR CMD ENTRYPOINT ENV EXPOSE ARG USER VOLUME LABEL' },
    make: { c: '#', k: '.PHONY all clean test' },
    text: { c: null, k: '' }
  };
  function langOf(name) {
    var b = name.split('/').pop().toLowerCase(), ext = b.indexOf('.') >= 0 ? b.split('.').pop() : '';
    if (b === 'dockerfile' || /^dockerfile/.test(b)) return 'docker';
    if (b === 'makefile' || b === 'justfile') return 'make';
    if (/^(sh|bash|zsh|bashrc|zshrc|profile|envrc)$/.test(ext) || b === '.bashrc' || b === '.zshrc' || !ext) return 'sh';
    return { py: 'py', c: 'c', h: 'c', cc: 'c', cpp: 'c', js: 'js', mjs: 'js', ts: 'js', go: 'go', rs: 'rs', awk: 'awk', gdb: 'gdb',
      yml: 'yaml', yaml: 'yaml', toml: 'toml', cfg: 'toml', ini: 'toml', json: 'text', txt: 'text', md: 'text', csv: 'text', log: 'text', patch: 'text', diff: 'text' }[ext] || 'text';
  }
  function hlGen(line, L) {
    var kw = {}; L.k.split(' ').forEach(function (w) { if (w) kw[w] = 1; });
    var out = '', i = 0, n = line.length;
    while (i < n) {
      var ch = line[i], rest = line.slice(i);
      if (L.c && rest.indexOf(L.c) === 0 && (L.c !== '#' || i === 0 || /\s/.test(line[i - 1]))) { out += '<i class="c">' + esc(rest) + '</i>'; break; }
      if (L.c === '//' && rest.indexOf('/*') === 0) { out += '<i class="c">' + esc(rest) + '</i>'; break; }
      if (ch === '"' || ch === "'" || ch === '`') {
        var j = i + 1; while (j < n && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
        out += '<i class="s">' + esc(line.slice(i, j + 1)) + '</i>'; i = j + 1; continue;
      }
      var m = /^[A-Za-z_.][\w]*/.exec(rest);
      if (m && !/[\w]/.test(line[i - 1] || '')) {
        out += kw[m[0]] ? '<b class="k">' + esc(m[0]) + '</b>' : esc(m[0]); i += m[0].length; continue;
      }
      if (/^\d/.test(rest) && !/[\w]/.test(line[i - 1] || '')) { var d = /^\d[\w.]*/.exec(rest)[0]; out += '<i class="v">' + esc(d) + '</i>'; i += d.length; continue; }
      out += esc(ch); i++;
    }
    return out;
  }

  /* 轻量 shell 高亮 */
  function hl(line) {
    var out = '', i = 0, n = line.length;
    while (i < n) {
      var ch = line[i], rest = line.slice(i);
      if (ch === '#' && (i === 0 || /\s/.test(line[i - 1])) && !/^#!/.test(rest)) { out += '<i class="c">' + esc(rest) + '</i>'; break; }
      if (/^#!/.test(rest) && i === 0) { out += '<i class="sb">' + esc(rest) + '</i>'; break; }
      if (ch === '"' || ch === "'") {
        var j = i + 1; while (j < n && line[j] !== ch) { if (line[j] === '\\' && ch === '"') j++; j++; }
        out += '<i class="s">' + esc(line.slice(i, j + 1)) + '</i>'; i = j + 1; continue;
      }
      var m = /^\$(\{[^}]*\}|[A-Za-z_]\w*|[0-9?@#!$*-]|\(\(?)/.exec(rest);
      if (m) { out += '<i class="v">' + esc(m[0]) + '</i>'; i += m[0].length; continue; }
      m = /^[A-Za-z_][\w.-]*/.exec(rest);
      if (m) {
        var w = m[0];
        if (/^(if|then|else|elif|fi|for|while|until|do|done|in|case|esac|function|return|local|set|echo|printf|exit|shift|read|test)$/.test(w)) out += '<b class="k">' + w + '</b>';
        else out += esc(w);
        i += w.length; continue;
      }
      out += esc(ch); i++;
    }
    return out;
  }

  function codeBlock(el) {
    var name = el.getAttribute('data-file'), f = L.files[name];
    if (!f) { el.innerHTML = '<div class="lab-miss">缺少源文件数据：' + esc(name) + '（labs/data 里的练习数据文件缺失）</div>'; return; }
    var lines = f.src.split('\n'); if (lines[lines.length - 1] === '') lines.pop();
    var annAt = {}; (f.ann || []).forEach(function (a) { (annAt[a[1]] = annAt[a[1]] || []).push(a); });
    var title = el.getAttribute('data-title') || name;
    var newSet = {}; (el.getAttribute('data-new') || '').split(',').forEach(function (r) {
      var m = /^(\d+)(?:-(\d+))?$/.exec(r.trim()); if (!m) return; for (var k = +m[1]; k <= +(m[2] || m[1]); k++) newSet[k] = 1;
    });
    var html = '<div class="lab-ch"><span class="fn">' + esc(title) + '</span><span class="meta">' + lines.length + ' 行 · ' + f.bytes + ' 字节</span>' +
      '<span class="sp"></span><button class="lab-btn tog" type="button">注释</button><button class="lab-btn cp" type="button">复制</button></div><div class="lab-lines">';
    var lg = el.getAttribute('data-lang') || langOf(name), paint = lg === 'sh' ? hl : function (s) { return hlGen(s, LANG[lg] || LANG.text); };
    lines.forEach(function (ln, i) {
      var no = i + 1;
      html += '<div class="ll' + (newSet[no] ? ' new' : '') + '"><span class="no">' + no + '</span><span class="tx">' + (paint(ln) || ' ') + '</span></div>';
      (annAt[no] || []).forEach(function (a) {
        html += '<div class="ann" aria-hidden="false"><span class="ar">' + (a[0] === a[1] ? 'L' + a[0] : 'L' + a[0] + '–' + a[1]) + '</span><span class="at">' + a[2] + '</span></div>';
      });
    });
    html += '</div>';
    el.className = 'lab-code';
    el.innerHTML = html;
    el.querySelector('.cp').onclick = function () { copy(f.src, this); };
    el.querySelector('.tog').onclick = function () { setAnn(!document.body.classList.contains('ann-off') ? false : true); };
  }

  function runBlock(el) {
    var id = el.getAttribute('data-run'), r = L.runs[id];
    if (!r) { el.innerHTML = '<div class="lab-miss">缺少运行结果：' + esc(id) + '（labs/data 里的练习数据文件缺失）</div>'; return; }
    var w = WHERE[r.where] || [r.where, ''];
    if (r.skip) {
      el.className = 'lab-run skip';
      el.innerHTML = '<div class="lab-rh"><span class="wb ' + w[1] + '">' + esc(w[0]) + '</span><span class="sp"></span><span class="ec na">未实测</span>' +
        '<button class="lab-btn cp" type="button">复制命令</button></div><pre>' +
        r.cmd.split('\n').map(function (c, i) { return '<span class="pp">' + (i ? '&gt; ' : '$ ') + '</span>' + esc(c); }).join('\n') +
        '\n<span class="none"># 未实测：' + esc(r.skip) + '</span></pre>';
      el.querySelector('.cp').onclick = function () { copy(r.cmd, this); };
      return;
    }
    var cmdLines = r.cmd.split('\n');
    var html = '<div class="lab-rh"><span class="wb ' + w[1] + '">' + esc(w[0]) + '</span><span class="sp"></span>' +
      '<span class="ec ' + (r.code === 0 ? 'ok' : 'bad') + '">退出码 ' + r.code + '</span><button class="lab-btn cp" type="button">复制命令</button></div><pre>';
    if (r.setup) html += '<span class="setup"># 准备：' + esc(r.setup.replace(/\n/g, '; ')) + '</span>\n';
    cmdLines.forEach(function (c, i) { html += '<span class="pp">' + (i ? '&gt; ' : '$ ') + '</span>' + esc(c) + '\n'; });
    html += (r.out ? '<span class="o">' + esc(r.out) + '</span>' : '<span class="none">（无输出）</span>') + '</pre>';
    el.className = 'lab-run';
    el.innerHTML = html;
    el.querySelector('.cp').onclick = function () { copy(r.cmd, this); };
  }

  function envBlock(el) {
    var where = el.getAttribute('data-env'), rows = L.env[where];
    if (!rows) { el.innerHTML = '<div class="lab-miss">该环境未实测：' + esc(where) + '</div>'; return; }
    var w = WHERE[where] || [where, ''];
    el.className = 'tbl-wrap';
    el.innerHTML = '<table class="tbl lab-env"><tr><th colspan="3"><span class="wb ' + w[1] + '">' + esc(w[0]) + '</span> 实测于 ' + esc(L.generated) + '</th></tr>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(r.label) + '</td><td><code>' + esc(r.cmd) + '</code></td><td class="eo">' + esc(r.out || '（无输出）') + (r.code ? ' <span class="ec bad">退出码 ' + r.code + '</span>' : '') + '</td></tr>';
      }).join('') + '</table>';
  }

  function copy(txt, btn) {
    (window.MS && MS.copyText ? MS.copyText : function (t, cb) { cb(false); })(txt, function (ok) {
      btn.textContent = ok ? '已复制' : '复制失败'; btn.classList.toggle('ok', ok);
      setTimeout(function () { btn.textContent = btn.classList.contains('cp') && btn.parentNode.className === 'lab-rh' ? '复制命令' : '复制'; btn.classList.remove('ok'); }, 1300);
    });
  }
  function setAnn(on) {
    document.body.classList.toggle('ann-off', !on);
    store.set('ann', on ? '1' : '0');
    $$('.lab-btn.tog').forEach(function (b) { b.textContent = on ? '隐藏注释' : '显示注释'; });
  }

  /* 每道题的“完成”勾选，存本机；顶部显示进度并可跳到第一道未完成的题 */
  function initDone() {
    var KEY = 'labdone:' + (L.id || 'x'), st = {};
    try { st = JSON.parse(store.get(KEY) || '{}') || {}; } catch (e) { }
    var boxes = $$('input[data-ex]'), bar = document.getElementById('labProg');
    function sync() {
      var n = 0; boxes.forEach(function (b) { b.checked = !!st[b.getAttribute('data-ex')]; if (b.checked) n++; b.closest('h2').classList.toggle('done', b.checked); });
      if (bar) {
        bar.querySelector('.t').textContent = '已完成 ' + n + ' / ' + boxes.length + ' 题';
        bar.querySelector('.f').style.width = (boxes.length ? 100 * n / boxes.length : 0) + '%';
      }
    }
    boxes.forEach(function (b) {
      b.onchange = function () { st[b.getAttribute('data-ex')] = b.checked; if (!b.checked) delete st[b.getAttribute('data-ex')]; store.set(KEY, JSON.stringify(st)); sync(); };
      b.onclick = function (e) { e.stopPropagation(); };
    });
    var go = document.getElementById('labGo');
    if (go) go.onclick = function () {
      for (var i = 0; i < boxes.length; i++) if (!boxes[i].checked) { boxes[i].closest('h2').scrollIntoView({ block: 'start' }); return; }
      if (window.MS && MS.toast) MS.toast('全部完成了');
    };
    sync();
  }

  function boot() {
    $$('[data-file]').forEach(codeBlock);
    $$('[data-run]').forEach(runBlock);
    $$('[data-env]').forEach(envBlock);
    setAnn(store.get('ann') !== '0');
    initDone();
    var g = document.getElementById('labGen'); if (g) g.textContent = L.generated || '…';
  }
  window.LABJS = { boot: boot };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
