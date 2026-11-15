/* ==========================================================================
 * Missing Semester 2026 笔记 · 可视化引擎 vz.js
 *  （在 CS161 笔记引擎基础上扩展：数据流粒子 stream、手推面板 eq、可配置图例 legend、
 *    data-vz 占位挂载、shell/git/yaml 等语法高亮）
 *
 *  - 所有动画由一个「虚拟时钟」驱动：可暂停、可调速（0.5× / 1× / 2×）。
 *    不使用 CSS transition / animation，每帧用 requestAnimationFrame 计算属性值。
 *  - 每一步的终态在编译期累计算好（step._state），所以跳到第 i 步时
 *    画面能瞬间摆好，接着播放也不会穿帮。
 *  - 舞台常驻：一个场景里的对象只创建一次，步骤只改变它们的属性。
 *  - prefers-reduced-motion：所有补间时长归零、关闭特效与拖影，仍可逐步查看。
 *
 *  用法（每章一个 assets/viz/chNN-*.js）：
 *    VZ.register({
 *      id:'ch03-smash', chapter:3, anchor:/Stack smashing/, place:'end',
 *      title:'...', sources:[{t:'Video 5 · 0:44', u:'https://youtu.be/..?t=44'}],
 *      scenes:[{
 *        name:'场景名', desc:'一句话',
 *        code:{lang:'c', src:'...'}, dataTitle:'寄存器', data:{EIP:'0x08048000'},
 *        bg(d){ d.rect(...); d.text(...); },
 *        objects:{ pkt:{type:'box', x:100, y:80, w:60, h:26, fill:VZ.C.data, text:'SYN', opacity:0} },
 *        steps:[{ say:'一句话', set:{pkt:{x:{to:400,dur:700,delay:100,ease:'out'}, opacity:1}},
 *                 fx:[{type:'ripple', obj:'pkt', at:800}], log:'$ ./a.out', data:{EIP:'0x...'}, hl:[3,4] }]
 *      }]
 *    });
 *
 *  扩展：
 *    fx:{type:'stream', path:'pipeObj', n:6, dur:1400, color:C.data, at:0, label:'a'}
 *        —— 一串粒子沿 path 对象流动（数据流），粒子可带字母标签；
 *    eq:'x = 1 + 2' 或 [{s:'…', at:300}] —— 右侧「手推过程」面板逐行出现，最新一行高亮；
 *    legend:[[C.data,'stdout'],[C.bad,'stderr']] —— 覆盖默认图例。
 *
 *  坐标约定：objects 里的 box/circle/text 的 x,y 是【中心点】（box 加 anchor:'tl' 才是左上角）；
 *    bg(d) 里的 d.rect / d.node 的 x,y 是【左上角】，d.text / d.circle 的 x,y 是锚点 / 圆心。
 * ========================================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var DEFS = [];
  var UID = 0;

  /* 语义色：攻击=红，防御/正常=绿，数据=蓝，中性=灰，警示=橙，信息=紫 */
  var C = {
    atk: 'var(--atk)', def: 'var(--def)', data: 'var(--data)', neutral: 'var(--neutral)',
    warn: 'var(--warn)', info: 'var(--info)', ok: 'var(--ok)', bad: 'var(--bad)',
    fg: 'var(--fg)', fg2: 'var(--fg-2)', fg3: 'var(--fg-3)',
    bg: 'var(--bg-2)', bg2: 'var(--bg)', bg3: 'var(--bg-3)', line: 'var(--line-2)', line1: 'var(--line)',
    accent: 'var(--accent)', teal: 'var(--teal)',
    atkW: 'var(--bad-weak)', defW: 'var(--ok-weak)', dataW: 'var(--accent-weak)',
    warnW: 'var(--warn-weak)', infoW: 'var(--info-weak)', okW: 'var(--ok-weak)', badW: 'var(--bad-weak)',
    tealW: 'var(--teal-weak)'
  };

  /* ---------------- 小工具 ---------------- */
  function h(tag, attrs, parent, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  function s(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function clone(o) { var r = {}; for (var k in o) { r[k] = {}; for (var p in o[k]) r[k][p] = o[k][p]; } return r; }

  /* ---------------- 缓动 ---------------- */
  var EASE = {
    linear: function (p) { return p; },
    in: function (p) { return p * p * p; },
    out: function (p) { return 1 - Math.pow(1 - p, 3); },
    inOut: function (p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; },
    back: function (p) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
    bounce: function (p) {
      var n = 7.5625, d = 2.75;
      if (p < 1 / d) return n * p * p;
      if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
      if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
      return n * (p -= 2.625 / d) * p + 0.984375;
    }
  };

  /* ---------------- 颜色（解析 CSS 变量 → RGB，主题切换时失效重算） ---------------- */
  var colorCache = {};
  function parseColor(str) {
    str = (str || '').trim();
    var m;
    if ((m = /^#([0-9a-f]{3})$/i.exec(str))) {
      return [parseInt(m[1][0] + m[1][0], 16), parseInt(m[1][1] + m[1][1], 16), parseInt(m[1][2] + m[1][2], 16), 1];
    }
    if ((m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(str))) {
      return [parseInt(m[1].substr(0, 2), 16), parseInt(m[1].substr(2, 2), 16), parseInt(m[1].substr(4, 2), 16),
        m[2] ? parseInt(m[2], 16) / 255 : 1];
    }
    if ((m = /^rgba?\(([^)]+)\)$/i.exec(str))) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat);
      return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
    }
    if (str === 'none' || str === 'transparent') return [0, 0, 0, 0];
    return null;
  }
  function rgb(c) {
    if (c in colorCache) return colorCache[c];
    var str = c, m = /^var\((--[\w-]+)\)$/.exec(c);
    if (m) str = getComputedStyle(document.documentElement).getPropertyValue(m[1]);
    return (colorCache[c] = parseColor(str));
  }
  function mixColor(a, b, p) {
    var A = rgb(a), B = rgb(b);
    if (!A || !B) return p < 0.5 ? a : b;
    var r = Math.round(A[0] + (B[0] - A[0]) * p), g = Math.round(A[1] + (B[1] - A[1]) * p),
      bl = Math.round(A[2] + (B[2] - A[2]) * p), al = A[3] + (B[3] - A[3]) * p;
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + r2(al) + ')';
  }
  try {
    new MutationObserver(function () { colorCache = {}; VZ._all.forEach(function (v) { v.dirtyAll(); v.render(); }); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (e) { /* 老浏览器 */ }

  /* ---------------- 数字格式 ---------------- */
  var FMT = {
    int: function (v) { return String(Math.round(v)); },
    hex: function (v) { return '0x' + (Math.round(v) >>> 0).toString(16); },
    hex8: function (v) { return '0x' + (Math.round(v) >>> 0).toString(16).padStart(8, '0'); },
    hex2: function (v) { return (Math.round(v) & 255).toString(16).padStart(2, '0'); },
    fixed1: function (v) { return v.toFixed(1); },
    fixed2: function (v) { return v.toFixed(2); },
    pct: function (v) { return Math.round(v) + '%'; }
  };
  function fmtNum(f, v) { return typeof f === 'function' ? f(v) : (FMT[f] || FMT.int)(v); }

  /* ---------------- 代码高亮（够用即可的轻量分词） ---------------- */
  var KW = {
    c: 'auto break case char const continue default do double else enum extern float for goto if int long register return short signed sizeof static struct switch typedef union unsigned void volatile while size_t uint8_t uint16_t uint32_t int8_t int32_t NULL bool true false',
    js: 'var let const function return if else for while new this class await async try catch throw typeof of in true false null undefined',
    sql: 'SELECT FROM WHERE AND OR INSERT INTO VALUES UPDATE SET DELETE DROP TABLE UNION ALL LIKE ORDER BY LIMIT NOT NULL CREATE select from where and or insert into values update set delete drop table union like',
    py: 'def return if elif else for while in import from as class with try except raise None True False and or not lambda pass yield',
    go: 'func return if else for range var const type struct package import nil true false err',
    asm: 'push pop mov movl call ret leave add sub lea jmp cmp je jne nop xor int pushl popl addl subl',
    sh: 'echo export if then else elif fi for while until do done in case esac function return local set test read cd exit sudo shift trap wait kill source alias unset',
    git: 'git add commit checkout switch branch merge rebase reset log status diff push pull fetch clone init stash tag cat-file hash-object',
    yaml: 'on jobs runs-on steps uses with run name services image ports build volumes environment depends_on true false',
    docker: 'FROM RUN COPY ADD WORKDIR CMD ENTRYPOINT ENV EXPOSE ARG USER',
    http: 'GET POST HTTP Host Cookie Set-Cookie Origin Referer Content-Type Location',
    text: ''
  };
  var KWSET = {};
  Object.keys(KW).forEach(function (k) { KWSET[k] = {}; KW[k].split(' ').forEach(function (w) { if (w) KWSET[k][w] = 1; }); });
  function hilite(lang, line) {
    if (lang === 'html') {
      return esc(line)
        .replace(/(&lt;\/?)([a-zA-Z][\w-]*)/g, '$1<b class="k">$2</b>')
        .replace(/([\w-]+)=(&quot;|")/g, '<i class="a">$1</i>=$2')
        .replace(/("[^"]*")/g, '<i class="s">$1</i>');
    }
    var cmt = lang === 'py' || lang === 'sh' || lang === 'yaml' || lang === 'docker' || lang === 'git' ? '#' : lang === 'sql' ? '--' : lang === 'asm' ? ';' : '//';
    var set = KWSET[lang] || {};
    var out = '', i = 0, n = line.length;
    while (i < n) {
      var ch = line[i], rest = line.slice(i);
      if ((rest.indexOf(cmt) === 0 && (cmt !== '#' || i === 0 || /\s/.test(line[i - 1]))) ||
        (lang !== 'asm' && lang !== 'sh' && rest.indexOf('/*') === 0)) { out += '<i class="c">' + esc(rest) + '</i>'; break; }
      if (lang === 'sh' && ch === '$') {
        var mv = /^\$(\{[^}]*\}|[A-Za-z_]\w*|[0-9?@#!$*-]|\(\(?)/.exec(rest);
        if (mv) { out += '<i class="r">' + esc(mv[0]) + '</i>'; i += mv[0].length; continue; }
      }
      if (ch === '"' || ch === "'") {
        var j = i + 1;
        while (j < n && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
        out += '<i class="s">' + esc(line.slice(i, j + 1)) + '</i>'; i = j + 1; continue;
      }
      var m = /^(0x[0-9a-fA-F]+|\d+(\.\d+)?)/.exec(rest);
      if (m && !/[\w]/.test(line[i - 1] || '')) { out += '<i class="n">' + m[0] + '</i>'; i += m[0].length; continue; }
      m = /^%?[A-Za-z_][\w]*/.exec(rest);
      if (m) {
        var w = m[0];
        if (set[w]) out += '<b class="k">' + w + '</b>';
        else if (w[0] === '%') out += '<i class="r">' + w + '</i>';
        else if (line[i + w.length] === '(') out += '<i class="f">' + w + '</i>';
        else out += esc(w);
        i += w.length; continue;
      }
      out += esc(ch); i++;
    }
    return out;
  }

  /* ---------------- 对象默认属性 ---------------- */
  var NUMP = { x: 1, y: 1, s: 1, rot: 1, opacity: 1, w: 1, h: 1, r: 1, dash: 1, t: 1, num: 1, x1: 1, y1: 1, x2: 1, y2: 1, sw: 1, size: 1 };
  var COLP = { fill: 1, stroke: 1, color: 1 };
  function defaults(sp) {
    var d = { x: sp.x || 0, y: sp.y || 0, s: sp.s == null ? 1 : sp.s, rot: sp.rot || 0, opacity: sp.opacity == null ? 1 : sp.opacity };
    var t = sp.type || 'box';
    if (t === 'box') {
      d.w = sp.w || 80; d.h = sp.h || 30; d.fill = sp.fill || C.bg; d.stroke = sp.stroke || C.line;
      d.sw = sp.sw == null ? 1.5 : sp.sw; d.text = sp.text == null ? '' : sp.text; d.color = sp.color || C.fg;
      if (sp.num != null) d.num = sp.num;
    } else if (t === 'circle') {
      d.r = sp.r || 14; d.fill = sp.fill || C.bg; d.stroke = sp.stroke || C.line; d.sw = sp.sw == null ? 1.5 : sp.sw;
      d.text = sp.text == null ? '' : sp.text; d.color = sp.color || C.fg;
    } else if (t === 'text') {
      d.text = sp.text == null ? '' : sp.text; d.color = sp.color || C.fg; d.size = sp.size || 14;
      if (sp.num != null) d.num = sp.num;
    } else if (t === 'path') {
      d.dash = sp.dash == null ? 1 : sp.dash; d.stroke = sp.stroke || C.line; d.sw = sp.sw || 2;
    } else if (t === 'line') {
      d.x1 = sp.x1 || 0; d.y1 = sp.y1 || 0; d.x2 = sp.x2 || 0; d.y2 = sp.y2 || 0;
      d.stroke = sp.stroke || C.line; d.sw = sp.sw || 2; d.dash = sp.dash == null ? 1 : sp.dash;
    }
    if (sp.along) d.t = sp.t == null ? 0 : sp.t;
    return d;
  }

  /* ---------------- 编译场景：累计每一步的终态 ---------------- */
  var FXDUR = { ripple: 700, pulse: 650, burst: 700, shake: 450, float: 950, flash: 550, stream: 1400 };
  function compile(sc) {
    if (sc._ok) return;
    var objs = typeof sc.objects === 'function' ? sc.objects() : (sc.objects || {});
    sc._objs = objs;
    var cur = {};
    Object.keys(objs).forEach(function (id) { cur[id] = defaults(objs[id]); });
    sc._init = clone(cur);
    var data = {}; var dk = [];
    Object.keys(sc.data || {}).forEach(function (k) { data[k] = sc.data[k]; dk.push(k); });
    sc._data0 = Object.assign({}, data);
    var hlPrev = null, cum = 0;
    sc.steps.forEach(function (st, i) {
      var tracks = [], end = 0;
      Object.keys(st.set || {}).forEach(function (id) {
        if (!cur[id]) throw new Error('[vz] 场景「' + sc.name + '」第 ' + (i + 1) + ' 步引用了不存在的对象 ' + id);
        var props = st.set[id];
        Object.keys(props).forEach(function (p) {
          var v = props[p];
          var spec = (v !== null && typeof v === 'object' && !Array.isArray(v)) ? v : { to: v };
          var from = spec.from !== undefined ? spec.from : cur[id][p];
          var to = spec.to !== undefined ? spec.to : from;
          var dur = spec.dur != null ? spec.dur : (st.tdur != null ? st.tdur : 650);
          var delay = spec.delay || 0;
          if (p === 'text') dur = 0;
          if (RM) { dur = 0; delay = 0; }
          tracks.push({ id: id, p: p, from: from, to: to, dur: dur, delay: delay,
            ease: EASE[spec.ease || st.ease || 'inOut'] || EASE.inOut,
            kind: NUMP[p] ? 'n' : COLP[p] ? 'c' : 's' });
          cur[id][p] = to;
          end = Math.max(end, delay + dur);
        });
      });
      var fxEnd = 0;
      (st.fx || []).forEach(function (f) { fxEnd = Math.max(fxEnd, (f.at || 0) + (f.dur || FXDUR[f.type] || 600)); });
      // 数据面板
      var dch = [];
      Object.keys(st.data || {}).forEach(function (k) {
        var v = st.data[k], at = 0;
        if (v !== null && typeof v === 'object') { at = v.at || 0; v = v.v; }
        if (RM) at = 0;
        dch.push({ k: k, from: data[k], to: v, at: at });
        if (dk.indexOf(k) < 0) dk.push(k);
        data[k] = v;
        end = Math.max(end, at);
      });
      // 控制台
      var logs = [];
      var L = st.log == null ? [] : Array.isArray(st.log) ? st.log : [st.log];
      L.forEach(function (l) {
        if (typeof l === 'string') l = { s: l };
        var at = RM ? 0 : (l.at || 0);
        logs.push({ s: l.s, cls: l.cls || (/^\$ /.test(l.s) ? 'in' : 'out'), at: at });
        end = Math.max(end, at);
      });
      // 手推过程
      var eqs = [];
      var E = st.eq == null ? [] : Array.isArray(st.eq) ? st.eq : [st.eq];
      E.forEach(function (q) {
        if (typeof q === 'string') q = { s: q };
        var at = RM ? 0 : (q.at || 0);
        eqs.push({ s: q.s, cls: q.cls || '', at: at });
        end = Math.max(end, at);
      });
      st._tracks = tracks;
      st._dch = dch;
      st._data = Object.assign({}, data);
      st._logs = logs;
      st._eqs = eqs;
      st._hl = st.hl != null ? st.hl : hlPrev;
      st._hlPrev = hlPrev;
      hlPrev = st._hl;
      st._anim = Math.max(end, st.dur || 0);
      st._stop = Math.max(st._anim, RM ? 0 : fxEnd);
      st._len = st._stop + (st.hold != null ? st.hold : 2200);
      st._state = clone(cur);
      st._cum = cum;
      cum += st._len;
    });
    sc._total = cum;
    sc._dkeys = dk;
    sc._ok = true;
  }

  /* ---------------- 播放器 ---------------- */
  var ICON = {
    play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>',
    replay: '<svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7z"/></svg>'
  };

  function swatch(c, t) { return '<span><i style="background:' + c + '"></i>' + t + '</span>'; }
  var LG_DEF = [[C.data, '数据 / stdout / 输入输出'], [C.bad, '错误 / stderr / 失败'], [C.ok, '成功 / 退出码 0 / 正常'],
    [C.info, '进程 / 程序 / AI'], [C.warn, '注意 / 信号 / 变化'], [C.teal, '文件 / 磁盘 / 工具'], [C.neutral, '中性 / 背景']];
  function legendHtml(lg) {
    return '<div class="vz-lg-h">颜色含义</div><div class="vz-lg-g">' +
      (lg || LG_DEF).map(function (x) { return swatch(x[0], x[1]); }).join('') +
      '</div><div class="vz-lg-h">快捷键（聚焦演示后）</div>' +
      '<div class="vz-lg-k"><kbd>空格</kbd> 播放/暂停　<kbd>→</kbd> 单步　<kbd>←</kbd> 回退　点进度条圆点可跳到任意步</div>';
  }

  function Viz(host, def) {
    this.def = def; this.uid = ++UID;
    this.speed = 1; this.playing = false; this.idle = true; this.ended = false;
    this.vt = 0; this.k = 0; this.t = 0; this.prevT = -1; this.stopAt = null; this.jumped = false;
    this.fx = []; this.raf = 0; this.last = 0; this.visible = true;
    this.build(host);
    this.load(0);
    VZ._all.push(this);
  }

  Viz.prototype.build = function (host) {
    var self = this, def = this.def;
    var root = this.root = h('figure', { class: 'vz', tabindex: '0', contenteditable: 'false',
      'aria-label': '可视化演示：' + def.title }, null);
    host.parentNode.replaceChild(root, host);
    var head = h('header', { class: 'vz-h' }, root);
    h('div', { class: 'vz-ttl' }, head, '<span class="vz-badge">可视化</span>' + esc(def.title));
    this.tabs = h('nav', { class: 'vz-tabs', role: 'tablist' }, head);
    def.scenes.forEach(function (sc, i) {
      var b = h('button', { class: 'vz-tab', role: 'tab', type: 'button' }, self.tabs,
        '<span>' + (i + 1) + '</span>' + esc(sc.name));
      b.onclick = function () { self.load(i); self.play(); };
    });
    this.helpBtn = h('button', { class: 'vz-help', type: 'button', title: '图例与快捷键', 'aria-label': '图例与快捷键' }, head, 'ⓘ 图例');
    var main = this.mainEl = h('div', { class: 'vz-main' }, root);
    var sb = h('div', { class: 'vz-stagebox' }, main);
    this.legend = h('div', { class: 'vz-legend' }, sb);
    this.legend.innerHTML = legendHtml(def.legend);
    this.helpBtn.onclick = function () { self.legend.classList.toggle('show'); };
    this.legend.onclick = function () { self.legend.classList.remove('show'); };
    this.svg = s('svg', { class: 'vz-svg', viewBox: '0 0 860 560', role: 'img' }, sb);
    this.big = h('button', { class: 'vz-big', type: 'button', 'aria-label': '播放' }, sb, ICON.play);
    this.big.onclick = function () { self.play(); };
    this.say = h('div', { class: 'vz-say', 'aria-live': 'polite' }, sb);
    var side = this.side = h('aside', { class: 'vz-side' }, main);
    this.codeBox = h('section', { class: 'vz-code' }, side);
    this.codeHead = h('div', { class: 'vz-ph' }, this.codeBox);
    this.codeView = h('div', { class: 'vz-cv' }, this.codeBox);
    this.hlBar = h('div', { class: 'vz-hl' }, this.codeView);
    this.codePre = h('div', { class: 'vz-pre' }, this.codeView);
    this.dataBox = h('section', { class: 'vz-data' }, side);
    this.dataHead = h('div', { class: 'vz-ph' }, this.dataBox);
    this.dataTbl = h('table', null, this.dataBox);
    this.eqBox = h('section', { class: 'vz-eq' }, side);
    h('div', { class: 'vz-ph' }, this.eqBox, '手推过程');
    this.eqView = h('div', { class: 'vz-ev' }, this.eqBox);
    this.conBox = h('section', { class: 'vz-con' }, side);
    h('div', { class: 'vz-ph' }, this.conBox, '控制台');
    this.conView = h('div', { class: 'vz-cl' }, this.conBox);

    var pl = h('div', { class: 'vz-player' }, root);
    this.bBack = h('button', { class: 'vz-b', type: 'button', title: '上一步（←）', 'aria-label': '上一步' }, pl, ICON.back);
    this.bPlay = h('button', { class: 'vz-b vz-pp', type: 'button', title: '播放 / 暂停（空格）', 'aria-label': '播放' }, pl, ICON.play);
    this.bNext = h('button', { class: 'vz-b', type: 'button', title: '单步（→）', 'aria-label': '单步' }, pl, ICON.next);
    this.track = h('div', { class: 'vz-track' }, pl);
    this.fill = h('div', { class: 'vz-fill' }, this.track);
    this.dots = h('div', { class: 'vz-dots' }, this.track);
    this.cnt = h('span', { class: 'vz-cnt' }, pl);
    var sp = h('div', { class: 'vz-speed', role: 'group', 'aria-label': '速度' }, pl);
    this.spBtns = [0.5, 1, 2].map(function (v) {
      var b = h('button', { type: 'button', class: v === 1 ? 'on' : '' }, sp, v + '×');
      b.onclick = function () { self.setSpeed(v); };
      return b;
    });
    this.bBack.onclick = function () { self.back(); };
    this.bNext.onclick = function () { self.next(); };
    this.bPlay.onclick = function () { self.toggle(); };

    if (def.sources && def.sources.length) {
      var cap = h('figcaption', { class: 'vz-src' }, root, '<b>出处</b>');
      def.sources.forEach(function (x) {
        var a = h('a', { href: x.u, target: '_blank', rel: 'noopener' }, cap); a.textContent = x.t;
      });
      if (def.note) h('div', { class: 'vz-note' }, cap).textContent = def.note;
    }

    root.addEventListener('keydown', function (e) {
      if (e.target !== root && e.target.tagName !== 'BUTTON') return;
      if (e.key === ' ' || e.key === 'k') { e.preventDefault(); self.toggle(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); self.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); self.back(); }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          self.visible = en.isIntersecting;
          if (!self.visible && self.playing) self.pause();
        });
      }, { threshold: 0.05 }).observe(root);
    }
    if (RM) root.classList.add('vz-rm');
  };

  /* ---- 场景装载：建 SVG 图层、静态背景、对象、代码、数据 ---- */
  Viz.prototype.load = function (i) {
    var self = this, sc = this.def.scenes[i];
    try { compile(sc); } catch (e) { console.error(e); this.say.textContent = String(e.message); return; }
    this.si = i; this.sc = sc;
    [].forEach.call(this.tabs.children, function (b, j) {
      b.classList.toggle('on', j === i); b.setAttribute('aria-selected', j === i);
    });
    if (this.def.scenes.length < 2) this.tabs.style.display = 'none';
    var svg = this.svg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (sc.viewBox) svg.setAttribute('viewBox', sc.viewBox);
    var defs = s('defs', null, svg);
    var pre = 'vz' + this.uid + '-';
    this.pre = pre;
    ['atk', 'def', 'data', 'neutral', 'warn', 'info', 'fg', 'fg3'].forEach(function (k) {
      var m = s('marker', { id: pre + 'a-' + k, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7,
        orient: 'auto-start-reverse', markerUnits: 'strokeWidth' }, defs);
      var col = k === 'fg3' ? 'var(--fg-3)' : k === 'fg' ? 'var(--fg)' : 'var(--' + k + ')';
      s('path', { d: 'M0,1 L10,5 L0,9 z', style: 'fill:' + col }, m);
    });
    this.Lbg = s('g', { class: 'vz-bg' }, svg);
    this.Ltrail = s('g', { class: 'vz-trail' }, svg);
    this.Lobj = s('g', { class: 'vz-obj' }, svg);
    this.Lfx = s('g', { class: 'vz-fx' }, svg);
    if (sc.bg) sc.bg(this.drawer(this.Lbg));
    // 对象
    this.O = {};
    var objs = sc._objs;
    Object.keys(objs).forEach(function (id) { self.mkObj(id, objs[id]); });
    // 代码
    if (sc.code) {
      this.codeBox.style.display = '';
      this.codeHead.innerHTML = '代码 <em>' + esc(sc.code.title || sc.code.lang || '') + '</em>';
      var lines = sc.code.src.replace(/\n$/, '').split('\n');
      this.codePre.innerHTML = lines.map(function (l, n) {
        return '<div class="vz-ln"><span class="vz-no">' + (n + 1) + '</span><span class="vz-tx">' +
          (hilite(sc.code.lang || 'text', l) || ' ') + '</span></div>';
      }).join('');
      this.lineEls = this.codePre.children;
    } else { this.codeBox.style.display = 'none'; this.lineEls = null; }
    // 数据
    if (sc._dkeys.length) {
      this.dataBox.style.display = '';
      this.dataHead.innerHTML = esc(sc.dataTitle || '数据');
      this.dataTbl.innerHTML = '';
      this.dRows = {};
      sc._dkeys.forEach(function (k) {
        var tr = h('tr', null, self.dataTbl);
        h('th', null, tr).textContent = k;
        self.dRows[k] = { td: h('td', null, tr), last: null, chg: false };
      });
    } else { this.dataBox.style.display = 'none'; this.dRows = null; }
    // 控制台
    var hasLog = sc.steps.some(function (st) { return st._logs.length; });
    this.conBox.style.display = hasLog ? '' : 'none';
    this.conView.innerHTML = ''; this.conSig = '';
    var hasEq = sc.steps.some(function (st) { return st._eqs.length; });
    this.eqBox.style.display = hasEq ? '' : 'none';
    this.eqView.innerHTML = ''; this.eqSig = '';
    var hasSide = !!(sc.code || sc._dkeys.length || hasLog || hasEq);
    this.mainEl.classList.toggle('noside', !hasSide);
    // 圆点
    this.dots.innerHTML = '';
    sc.steps.forEach(function (st, j) {
      var d = h('button', { class: 'vz-dot', type: 'button', title: '第 ' + (j + 1) + ' 步：' + (st.say || ''),
        'aria-label': '跳到第 ' + (j + 1) + ' 步' }, self.dots);
      d.style.left = (100 * (st._cum + st._len) / sc._total) + '%';
      d.onclick = function (e) { e.stopPropagation(); self.seek(j); };
    });
    this.track.onclick = function (e) {
      var r = self.track.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * sc._total;
      for (var j = 0; j < sc.steps.length; j++) if (x < sc.steps[j]._cum + sc.steps[j]._len) { self.seek(j); return; }
    };
    this.reset();
  };

  Viz.prototype.reset = function () {
    this.playing = false; this.idle = true; this.ended = false;
    this.k = 0; this.t = 0; this.prevT = -1; this.stopAt = null; this.jumped = false;
    this.clearFx();
    this.render();
    this.syncUI();
  };

  /* 静态背景绘制 API */
  Viz.prototype.drawer = function (layer) {
    var pre = this.pre;
    function st(o) {
      var css = '';
      if (o.fill !== undefined) css += 'fill:' + o.fill + ';';
      if (o.stroke !== undefined) css += 'stroke:' + o.stroke + ';';
      if (o.color !== undefined) css += 'fill:' + o.color + ';';
      if (o.opacity != null) css += 'opacity:' + o.opacity + ';';
      return css;
    }
    var D = {
      g: function (attrs) { return s('g', attrs || {}, layer); },
      rect: function (x, y, w, hh, o) {
        o = o || {};
        return s('rect', { x: x, y: y, width: w, height: hh, rx: o.rx == null ? 6 : o.rx,
          'stroke-width': o.sw == null ? 1 : o.sw, 'stroke-dasharray': o.dash,
          style: st({ fill: o.fill == null ? 'none' : o.fill, stroke: o.stroke == null ? 'none' : o.stroke, opacity: o.opacity }) },
        o.parent || layer);
      },
      text: function (x, y, str, o) {
        o = o || {};
        var e = s('text', { x: x, y: y, 'text-anchor': o.anchor || 'start', 'dominant-baseline': o.base || 'central',
          'font-size': o.size || 13, 'font-weight': o.weight, class: o.mono ? 'mono' : null,
          style: st({ color: o.color || C.fg2, opacity: o.opacity }) }, o.parent || layer);
        e.textContent = str;
        return e;
      },
      line: function (x1, y1, x2, y2, o) {
        o = o || {};
        return s('line', { x1: x1, y1: y1, x2: x2, y2: y2, 'stroke-width': o.sw || 1.5, 'stroke-dasharray': o.dash,
          'marker-end': o.arrow ? 'url(#' + pre + 'a-' + o.arrow + ')' : null,
          style: st({ stroke: o.stroke || C.line, opacity: o.opacity }) }, o.parent || layer);
      },
      path: function (d, o) {
        o = o || {};
        return s('path', { d: d, 'stroke-width': o.sw || 1.5, 'stroke-dasharray': o.dash,
          'marker-end': o.arrow ? 'url(#' + pre + 'a-' + o.arrow + ')' : null,
          style: st({ fill: o.fill || 'none', stroke: o.stroke || C.line, opacity: o.opacity }) }, o.parent || layer);
      },
      circle: function (x, y, r, o) {
        o = o || {};
        return s('circle', { cx: x, cy: y, r: r, 'stroke-width': o.sw || 1.5,
          style: st({ fill: o.fill || 'none', stroke: o.stroke || 'none', opacity: o.opacity }) }, o.parent || layer);
      },
      /* 节点：圆角框 + 标题 + 副标题，常用于主机/服务器 */
      node: function (x, y, w, hh, title, sub, o) {
        o = o || {};
        D.rect(x, y, w, hh, { fill: o.fill || C.bg, stroke: o.stroke || C.line, sw: 1.5, rx: o.rx == null ? 10 : o.rx });
        D.text(x + w / 2, y + (sub ? hh / 2 - 9 : hh / 2), title, { anchor: 'middle', size: o.size || 15, weight: 650, color: o.color || C.fg });
        if (sub) D.text(x + w / 2, y + hh / 2 + 11, sub, { anchor: 'middle', size: 11.5, color: C.fg3, mono: o.mono });
      },
      raw: function (markup) { var g = s('g', null, layer); g.innerHTML = markup; return g; }
    };
    return D;
  };

  Viz.prototype.mkObj = function (id, sp) {
    var t = sp.type || 'box';
    var parent = sp.parent ? this.O[sp.parent].g : this.Lobj;
    var g = s('g', { class: 'vo vo-' + t + (sp.cls ? ' ' + sp.cls : ''), id: this.pre + 'o-' + id }, parent);
    var o = { id: id, sp: sp, g: g, c: {}, shx: 0, shy: 0, px: 0, py: 0, t: t };
    if (t === 'box') {
      o.shape = s('rect', { rx: sp.rx == null ? 6 : sp.rx, 'stroke-dasharray': sp.dasharray }, g);
      o.txt = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': sp.size || 13,
        'font-weight': sp.weight || 600, class: sp.mono ? 'mono' : null }, g);
    } else if (t === 'circle') {
      o.shape = s('circle', { 'stroke-dasharray': sp.dasharray }, g);
      o.txt = s('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': sp.size || 12,
        'font-weight': sp.weight || 650, class: sp.mono ? 'mono' : null }, g);
    } else if (t === 'text') {
      o.txt = s('text', { 'text-anchor': sp.anchor || 'middle', 'dominant-baseline': 'central',
        'font-weight': sp.weight || null, class: sp.mono ? 'mono' : null,
        lengthAdjust: sp.cw ? 'spacingAndGlyphs' : null }, g);
    } else if (t === 'path') {
      o.shape = s('path', { d: sp.d, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      if (sp.dasharray) o.shape.setAttribute('stroke-dasharray', sp.dasharray);
    } else if (t === 'line') {
      o.shape = s('line', { 'stroke-linecap': 'round', 'stroke-dasharray': sp.dasharray }, g);
    } else if (t === 'svg') {
      g.innerHTML = sp.html || '';
    }
    if (o.shape && sp.arrow) o.marker = 'url(#' + this.pre + 'a-' + sp.arrow + ')';
    if (sp.trail && !RM) {
      o.trail = { n: sp.trail.n || 5, gap: sp.trail.gap || 45, samples: [], ghosts: [] };
      for (var i = 0; i < o.trail.n; i++) {
        var u = s('use', { href: '#' + this.pre + 'o-' + id }, this.Ltrail);
        u.style.display = 'none';
        o.trail.ghosts.push(u);
      }
    }
    this.O[id] = o;
  };

  /* ---- 计算 (k, t) 时刻每个对象的属性值并写入 DOM ---- */
  Viz.prototype.valsAt = function (k, t) {
    var sc = this.sc;
    if (this.idle) return sc._init;
    var base = k === 0 ? sc._init : sc.steps[k - 1]._state;
    var tr = sc.steps[k]._tracks, ov = null;
    for (var i = 0; i < tr.length; i++) {
      var q = tr[i], p, v;
      if (q.dur <= 0) p = t >= q.delay ? 1 : 0;
      else p = clamp((t - q.delay) / q.dur, 0, 1);
      if (p <= 0) v = q.from;
      else if (p >= 1) v = q.to;
      else {
        var e = q.ease(p);
        if (q.kind === 'n') v = q.from + (q.to - q.from) * e;
        else if (q.kind === 'c') v = mixColor(q.from, q.to, e);
        else v = q.to;
      }
      if (!ov) ov = {};
      (ov[q.id] || (ov[q.id] = {}))[q.p] = v;
    }
    if (!ov) return base;
    var out = {};
    for (var id in base) {
      if (ov[id]) { var m = {}, b = base[id], o = ov[id]; for (var key in b) m[key] = key in o ? o[key] : b[key]; out[id] = m; }
      else out[id] = base[id];
    }
    return out;
  };

  Viz.prototype.dirtyAll = function () { for (var id in this.O) this.O[id].c = {}; };

  function setA(o, el, name, v) { if (o.c[name] !== v) { el.setAttribute(name, v); o.c[name] = v; } }
  function setS(o, el, name, v) { var key = 's:' + name; if (o.c[key] !== v) { el.style[name] = v; o.c[key] = v; } }

  Viz.prototype.applyObj = function (o, v) {
    var sp = o.sp, x = v.x, y = v.y;
    if (sp.along && v.t != null) {
      var P = this.O[sp.along];
      if (P && P.shape) {
        if (!P.len) P.len = P.shape.getTotalLength();
        var pt = P.shape.getPointAtLength(clamp(v.t, 0, 1) * P.len);
        x = pt.x + P.px; y = pt.y + P.py;
      }
    }
    o.px = x; o.py = y;
    var tf = 'translate(' + r2(x + o.shx) + ',' + r2(y + o.shy) + ')';
    if (v.rot) tf += ' rotate(' + r2(v.rot) + ')';
    if (v.s !== 1) tf += ' scale(' + r2(v.s) + ')';
    setA(o, o.g, 'transform', tf);
    setS(o, o.g, 'opacity', String(r2(clamp(v.opacity, 0, 1))));
    o.vis = v.opacity > 0.01;
    if (o.t === 'box') {
      var tl = sp.anchor === 'tl';
      setA(o, o.shape, 'x', r2(tl ? 0 : -v.w / 2)); setA(o, o.shape, 'y', r2(tl ? 0 : -v.h / 2));
      setA(o, o.shape, 'width', r2(Math.max(0, v.w))); setA(o, o.shape, 'height', r2(Math.max(0, v.h)));
      setA(o, o.shape, 'stroke-width', v.sw);
      setS(o, o.shape, 'fill', v.fill); setS(o, o.shape, 'stroke', v.stroke);
      setA(o, o.txt, 'x', tl ? r2(v.w / 2) : 0); setA(o, o.txt, 'y', tl ? r2(v.h / 2) : 0);
      setS(o, o.txt, 'fill', v.color);
      var str = v.num != null ? (sp.pre || '') + fmtNum(sp.fmt, v.num) + (sp.post || '') : v.text;
      if (o.c.tx !== str) { o.txt.textContent = str; o.c.tx = str; }
      o.bw = v.w; o.bh = v.h; o.tl = tl;
    } else if (o.t === 'circle') {
      setA(o, o.shape, 'r', r2(Math.max(0, v.r))); setA(o, o.shape, 'stroke-width', v.sw);
      setS(o, o.shape, 'fill', v.fill); setS(o, o.shape, 'stroke', v.stroke);
      setS(o, o.txt, 'fill', v.color);
      if (o.c.tx !== v.text) { o.txt.textContent = v.text; o.c.tx = v.text; }
      o.bw = o.bh = v.r * 2;
    } else if (o.t === 'text') {
      setS(o, o.txt, 'fill', v.color); setA(o, o.txt, 'font-size', r2(v.size));
      var st2 = v.num != null ? (sp.pre || '') + fmtNum(sp.fmt, v.num) + (sp.post || '') : v.text;
      if (o.c.tx !== st2) {
        o.txt.textContent = st2; o.c.tx = st2;
        /* cw：等宽字符的固定步进（SVG 单位），让高亮框与字符严格对齐，不受回退字体影响 */
        if (sp.cw) { if (st2.length) o.txt.setAttribute('textLength', r2(st2.length * sp.cw)); else o.txt.removeAttribute('textLength'); }
      }
    } else if (o.t === 'path' || o.t === 'line') {
      if (o.t === 'line') {
        setA(o, o.shape, 'x1', r2(v.x1)); setA(o, o.shape, 'y1', r2(v.y1));
        setA(o, o.shape, 'x2', r2(v.x2)); setA(o, o.shape, 'y2', r2(v.y2));
      }
      setS(o, o.shape, 'stroke', v.stroke); setA(o, o.shape, 'stroke-width', v.sw);
      if (!sp.dasharray) {
        var len = o.t === 'path' ? (o.len || (o.len = o.shape.getTotalLength())) :
          Math.hypot(v.x2 - v.x1, v.y2 - v.y1);
        if (v.dash >= 0.999) { setA(o, o.shape, 'stroke-dasharray', 'none'); setA(o, o.shape, 'stroke-dashoffset', 0); }
        else { setA(o, o.shape, 'stroke-dasharray', r2(len) + ' ' + r2(len + 1)); setA(o, o.shape, 'stroke-dashoffset', r2(len * (1 - v.dash))); }
      }
      if (o.marker) setA(o, o.shape, 'marker-end', v.dash >= 0.97 ? o.marker : 'none');
    }
  };

  Viz.prototype.render = function () {
    var sc = this.sc; if (!sc) return;
    var k = this.k, t = this.t;
    var V = this.valsAt(k, t);
    for (var id in this.O) this.applyObj(this.O[id], V[id]);
    this.renderTrails();
    this.renderSide(k, t);
    // 说明文字
    var say = this.idle ? (sc.desc || '点击 ▶ 开始演示') : (sc.steps[k].say || '');
    if (this.sayStr !== say) { this.say.textContent = say; this.sayStr = say; if (window.MSGL) MSGL.annotate(this.say); }
    var op = this.idle || RM || this.jumped ? 1 : clamp(t / 260, 0, 1);
    this.say.style.opacity = r2(0.25 + 0.75 * op);
    // 进度
    var prog = this.idle ? 0 : (sc.steps[k]._cum + Math.min(t, sc.steps[k]._len)) / sc._total;
    if (this.ended) prog = 1;
    this.fill.style.width = (prog * 100).toFixed(2) + '%';
    var c = this.idle ? '0 / ' + sc.steps.length : (k + 1) + ' / ' + sc.steps.length;
    if (this.cntStr !== c) { this.cnt.textContent = c; this.cntStr = c; }
    var dots = this.dots.children;
    for (var j = 0; j < dots.length; j++) {
      var on = !this.idle && (j < k || (j === k && t >= sc.steps[k]._anim));
      if (dots[j]._on !== on) { dots[j].classList.toggle('on', on); dots[j]._on = on; }
      var cur = !this.idle && j === k;
      if (dots[j]._cur !== cur) { dots[j].classList.toggle('cur', cur); dots[j]._cur = cur; }
    }
  };

  /* 代码高亮条、数据面板、控制台 —— 同样由 (k,t) 决定 */
  Viz.prototype.renderSide = function (k, t) {
    var sc = this.sc, st = this.idle ? null : sc.steps[k];
    // 代码
    if (this.lineEls && this.lineEls.length) {
      var LE = this.lineEls;
      var tgt = st ? st._hl : null, prv = st ? st._hlPrev : null;
      var box = function (hl) {
        if (!hl || !hl.length) return null;
        var a = Math.min.apply(null, hl), b = Math.max.apply(null, hl);
        a = clamp(a, 1, LE.length); b = clamp(b, 1, LE.length);
        var ea = LE[a - 1], eb = LE[b - 1];
        return [ea.offsetTop, eb.offsetTop + eb.offsetHeight - ea.offsetTop];
      };
      var B = box(tgt), A = box(prv);
      var p = (this.jumped || RM || !A) ? 1 : EASE.inOut(clamp(t / 320, 0, 1));
      if (B) {
        var top = A ? A[0] + (B[0] - A[0]) * p : B[0], hh = A ? A[1] + (B[1] - A[1]) * p : B[1];
        this.hlBar.style.display = 'block';
        this.hlBar.style.transform = 'translateY(' + r2(top) + 'px)';
        this.hlBar.style.height = r2(hh) + 'px';
        this.hlBar.style.opacity = A ? 1 : r2(p);
        var cv = this.codeView, want = clamp(top - cv.clientHeight * 0.3, 0, cv.scrollHeight - cv.clientHeight);
        if (Math.abs(cv.scrollTop - want) > 1) cv.scrollTop = want;
      } else this.hlBar.style.display = 'none';
      var set = {};
      if (tgt && p >= 0.5) tgt.forEach(function (n) { set[n] = 1; });
      for (var i = 0; i < LE.length; i++) {
        var on = !!set[i + 1];
        if (LE[i]._on !== on) { LE[i].classList.toggle('on', on); LE[i]._on = on; }
      }
    }
    // 数据
    if (this.dRows) {
      var base = this.idle ? sc._data0 : (k === 0 ? sc._data0 : sc.steps[k - 1]._data);
      var shown = {}, chg = {};
      for (var key in this.dRows) shown[key] = base[key];
      var jmp = this.jumped;
      if (st) st._dch.forEach(function (d) {
        if (t >= d.at) {
          var dt = t - d.at;
          if (typeof d.to === 'number' && typeof d.from === 'number' && dt < 500 && !RM && !jmp) {
            shown[d.k] = d.from + (d.to - d.from) * EASE.out(dt / 500);
          } else shown[d.k] = d.to;
          if (dt < 1100 && d.from !== d.to) chg[d.k] = 1;
        }
      });
      var fm = sc.dataFmt || {};
      for (var key2 in this.dRows) {
        var R = this.dRows[key2], v = shown[key2];
        var str = v == null ? '无' : typeof v === 'number' ? fmtNum(fm[key2] || 'int', v) : String(v);
        if (R.last !== str) { R.td.textContent = str; R.last = str; }
        var c = !!chg[key2] && !this.jumped;
        if (R.chg !== c) { R.td.parentNode.classList.toggle('chg', c); R.chg = c; }
      }
    }
    // 控制台
    if (this.conBox.style.display !== 'none') {
      var lines = [];
      if (!this.idle) {
        for (var j = 0; j < k; j++) sc.steps[j]._logs.forEach(function (l) { lines.push([l, l.s.length]); });
        var jm = this.jumped;
        st._logs.forEach(function (l) {
          if (t >= l.at) lines.push([l, jm || RM ? l.s.length : Math.min(l.s.length, Math.floor((t - l.at) / 16) + 1)]);
        });
      }
      var sig = lines.map(function (x) { return x[1]; }).join(',') + '|' + lines.length + '|' + k;
      if (sig !== this.conSig) {
        this.conSig = sig;
        this.conView.innerHTML = lines.map(function (x) {
          var l = x[0], str = l.s.slice(0, x[1]);
          return '<div class="vz-l ' + l.cls + '">' + esc(str) + (x[1] < l.s.length ? '<span class="vz-caret"></span>' : '') + '</div>';
        }).join('') || '<div class="vz-l dim">（运行后在此显示输出）</div>';
        this.conView.scrollTop = this.conView.scrollHeight;
      }
    }
    // 手推过程：逐行出现，最新一行高亮
    if (this.eqBox.style.display !== 'none') {
      var eqs = [];
      if (!this.idle) {
        for (var q = 0; q < k; q++) sc.steps[q]._eqs.forEach(function (l) { eqs.push([l, 1]); });
        var jm2 = this.jumped;
        st._eqs.forEach(function (l) { if (t >= l.at) eqs.push([l, jm2 || RM ? 1 : clamp((t - l.at) / 380, 0, 1)]); });
      }
      var sig2 = eqs.map(function (x) { return x[1] >= 1 ? 1 : r2(x[1]); }).join(',') + '|' + k;
      if (sig2 !== this.eqSig) {
        this.eqSig = sig2;
        var last = eqs.length - 1;
        this.eqView.innerHTML = eqs.map(function (x, i) {
          var l = x[0];
          return '<div class="vz-q ' + l.cls + (i === last ? ' cur' : '') + '" style="opacity:' + r2(0.15 + 0.85 * x[1]) +
            ';transform:translateX(' + r2((1 - x[1]) * 14) + 'px)">' + esc(l.s) + '</div>';
        }).join('') || '<div class="vz-q dim">（播放后逐行推导）</div>';
        this.eqView.scrollTop = this.eqView.scrollHeight;
      }
    }
  };

  /* ---- 拖影：用 <use> 复制对象当前外观，放到过去的位置 ---- */
  Viz.prototype.renderTrails = function () {
    for (var id in this.O) {
      var o = this.O[id], T = o.trail;
      if (!T) continue;
      if (this.playing && o.vis) {
        var lastS = T.samples[T.samples.length - 1];
        if (!lastS || lastS.vt !== this.vt) T.samples.push({ x: o.px, y: o.py, vt: this.vt });
        var life = T.gap * (T.n + 1);
        while (T.samples.length && this.vt - T.samples[0].vt > life) T.samples.shift();
      }
      for (var i = 0; i < T.n; i++) {
        var ghost = T.ghosts[i], age = (i + 1) * T.gap, smp = null;
        for (var j = T.samples.length - 1; j >= 0; j--) if (this.vt - T.samples[j].vt >= age) { smp = T.samples[j]; break; }
        if (!smp || !o.vis || Math.hypot(smp.x - o.px, smp.y - o.py) < 3) { if (ghost._d !== 'none') { ghost.style.display = 'none'; ghost._d = 'none'; } continue; }
        if (ghost._d !== '') { ghost.style.display = ''; ghost._d = ''; }
        ghost.setAttribute('transform', 'translate(' + r2(smp.x - o.px) + ',' + r2(smp.y - o.py) + ')');
        ghost.style.opacity = r2(0.32 * (1 - i / T.n));
      }
    }
  };
  Viz.prototype.clearTrails = function () {
    for (var id in this.O) { var T = this.O[id].trail; if (T) T.samples = []; }
  };

  /* ---- 一次性特效（涟漪/脉冲/迸射/抖动/飘字/闪光），同样走虚拟时钟 ---- */
  Viz.prototype.spawnFx = function (f) {
    if (RM) return;
    var o = f.obj ? this.O[f.obj] : null;
    var ox = o ? o.px : 0, oy = o ? o.py : 0;
    if (o && (o.t === 'line' || o.t === 'path') && o.shape) {
      /* 线、路径对象没有“中心点”坐标：用当前几何的中点 */
      try { var bb = o.shape.getBBox(); ox = o.px + bb.x + bb.width / 2; oy = o.py + bb.y + bb.height / 2; } catch (e) { }
    }
    var x = (f.x != null ? f.x : ox) + (f.dx || 0);
    var y = (f.y != null ? f.y : oy) + (f.dy || 0);
    if (o && o.tl && f.x == null) { x += o.bw / 2; y += o.bh / 2; }
    var col = f.color || C.accent, dur = f.dur || FXDUR[f.type] || 600;
    var fx = { type: f.type, t0: this.vt, dur: dur, els: [], o: o, x: x, y: y, f: f };
    var L = this.Lfx;
    if (f.type === 'ripple') {
      fx.els.push(s('circle', { cx: x, cy: y, r: 4, fill: 'none', 'stroke-width': 2.5, style: 'stroke:' + col }, L));
      fx.els.push(s('circle', { cx: x, cy: y, r: 4, fill: 'none', 'stroke-width': 1.5, style: 'stroke:' + col }, L));
    } else if (f.type === 'pulse' || f.type === 'flash') {
      var w = (o ? o.bw : 40) || 40, hh = (o ? o.bh : 40) || 40;
      var e = s('rect', { x: x - w / 2, y: y - hh / 2, width: w, height: hh, rx: 8, 'stroke-width': 2.5,
        style: f.type === 'flash' ? 'fill:' + col + ';stroke:none' : 'fill:none;stroke:' + col }, L);
      fx.w = w; fx.h = hh; fx.els.push(e);
    } else if (f.type === 'burst') {
      var n = f.n || 9;
      for (var i = 0; i < n; i++) {
        var c = s('circle', { cx: x, cy: y, r: 3, style: 'fill:' + col }, L);
        c._a = (Math.PI * 2 * i) / n + (i % 2) * 0.3; fx.els.push(c);
      }
    } else if (f.type === 'float') {
      var tx = s('text', { x: x, y: y, 'text-anchor': 'middle', 'font-size': f.size || 15, 'font-weight': 700,
        style: 'fill:' + col }, L);
      tx.textContent = f.text || ''; fx.els.push(tx);
    } else if (f.type === 'shake') {
      fx.amp = f.amp || 6;
    } else if (f.type === 'stream') {
      /* 数据流：n 个粒子沿 path 对象依次流过，带淡入淡出与可选字母标签 */
      var P = this.O[f.path];
      if (!P || !P.shape) return;
      if (!P.len) P.len = P.shape.getTotalLength();
      fx.P = P; fx.n = f.n || 6; fx.gap = f.gap || 0.11;
      for (var q = 0; q < fx.n; q++) {
        var gg = s('g', null, L);
        s('circle', { r: f.r || 5, style: 'fill:' + col + ';stroke:var(--bg-2)', 'stroke-width': 1.5 }, gg);
        var lab = Array.isArray(f.labels) ? f.labels[q % f.labels.length] : f.label;
        if (lab) {
          var tt = s('text', { y: -10, 'text-anchor': 'middle', 'font-size': f.size || 10.5, 'font-weight': 700,
            class: 'mono', style: 'fill:' + col }, gg);
          tt.textContent = lab;
        }
        gg.style.opacity = 0;
        fx.els.push(gg);
      }
    }
    this.fx.push(fx);
  };
  Viz.prototype.updateFx = function () {
    var keep = [];
    for (var i = 0; i < this.fx.length; i++) {
      var F = this.fx[i], p = clamp((this.vt - F.t0) / F.dur, 0, 1), e = EASE.out(p);
      if (F.type === 'ripple') {
        var R = F.f.r || 46;
        F.els[0].setAttribute('r', r2(4 + R * e)); F.els[0].style.opacity = r2(0.9 * (1 - p));
        var p2 = clamp(p * 1.35 - 0.2, 0, 1);
        F.els[1].setAttribute('r', r2(4 + R * 0.65 * EASE.out(p2))); F.els[1].style.opacity = r2(0.7 * (1 - p2));
      } else if (F.type === 'pulse') {
        var g = 14 * e;
        F.els[0].setAttribute('x', r2(F.x - F.w / 2 - g)); F.els[0].setAttribute('y', r2(F.y - F.h / 2 - g));
        F.els[0].setAttribute('width', r2(F.w + 2 * g)); F.els[0].setAttribute('height', r2(F.h + 2 * g));
        F.els[0].style.opacity = r2(1 - p);
      } else if (F.type === 'flash') {
        if (F.o) { F.els[0].setAttribute('x', r2(F.o.px - F.w / 2)); F.els[0].setAttribute('y', r2(F.o.py - F.h / 2)); }
        F.els[0].style.opacity = r2(0.55 * (1 - p));
      } else if (F.type === 'burst') {
        var D = (F.f.r || 34) * e;
        F.els.forEach(function (c) {
          c.setAttribute('cx', r2(F.x + Math.cos(c._a) * D)); c.setAttribute('cy', r2(F.y + Math.sin(c._a) * D));
          c.setAttribute('r', r2(3 * (1 - p) + 0.5)); c.style.opacity = r2(1 - p);
        });
      } else if (F.type === 'float') {
        F.els[0].setAttribute('y', r2(F.y - 30 * e)); F.els[0].style.opacity = r2(p < 0.7 ? 1 : (1 - p) / 0.3);
      } else if (F.type === 'shake' && F.o) {
        F.o.shx = p >= 1 ? 0 : F.amp * Math.sin(p * Math.PI * 7) * (1 - p);
      } else if (F.type === 'stream') {
        var span = 1 + F.gap * (F.n - 1);
        F.els.forEach(function (gg, q) {
          var u = clamp(p * span - q * F.gap, 0, 1), ue = EASE.inOut(u);
          var pt = F.P.shape.getPointAtLength(ue * F.P.len);
          gg.setAttribute('transform', 'translate(' + r2(pt.x + F.P.px) + ',' + r2(pt.y + F.P.py) + ')');
          gg.style.opacity = u <= 0 || u >= 1 ? 0 : r2(Math.min(1, u * 6, (1 - u) * 6));
        });
      }
      if (p >= 1) {
        F.els.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
        if (F.type === 'shake' && F.o) F.o.shx = 0;
      } else keep.push(F);
    }
    this.fx = keep;
  };
  Viz.prototype.clearFx = function () {
    this.fx.forEach(function (F) {
      F.els.forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      if (F.o) F.o.shx = 0;
    });
    this.fx = [];
    this.clearTrails();
  };

  /* ---- 虚拟时钟主循环 ---- */
  Viz.prototype.kick = function () {
    if (this.raf) return;
    var self = this;
    this.last = performance.now();
    this.raf = requestAnimationFrame(function loop(now) {
      self.raf = 0;
      var dt = Math.min(100, now - self.last); self.last = now;
      if (self.playing) self.advance(dt * self.speed);
      self.updateFx();
      self.render();
      if (self.playing || self.fx.length) { self.last = now; self.raf = requestAnimationFrame(loop); }
      else self.syncUI();
    });
  };

  Viz.prototype.fireEvents = function (from, to) {
    var st = this.sc.steps[this.k], self = this;
    (st.fx || []).forEach(function (f) {
      var at = f.at || 0;
      if ((from < at && at <= to) || (at === 0 && from < 0)) self.spawnFx(f);
    });
  };

  Viz.prototype.advance = function (adv) {
    var sc = this.sc;
    this.vt += adv;
    var from = this.prevT, to = this.t + adv;
    this.fireEvents(from, to);
    this.t = to; this.prevT = to;
    if (this.stopAt != null && this.t >= this.stopAt) {
      this.t = this.stopAt; this.prevT = this.t; this.stopAt = null; this.playing = false; return;
    }
    while (this.t >= sc.steps[this.k]._len) {
      if (this.k < sc.steps.length - 1) {
        this.t -= sc.steps[this.k]._len;
        this.k++; this.jumped = false; this.prevT = -1;
        this.fireEvents(-1, this.t); this.prevT = this.t;
      } else {
        this.t = sc.steps[this.k]._stop; this.prevT = this.t;
        this.playing = false; this.ended = true; break;
      }
    }
    if (this.k === sc.steps.length - 1 && this.t >= sc.steps[this.k]._stop && !this.ended) {
      this.playing = false; this.ended = true; this.t = sc.steps[this.k]._stop;
    }
  };

  Viz.prototype.play = function () {
    if (this.ended) { this.reset(); }
    if (this.idle) { this.idle = false; this.k = 0; this.t = 0; this.prevT = -1; this.jumped = false; }
    this.stopAt = null;
    this.playing = true;
    this.syncUI(); this.kick();
  };
  Viz.prototype.pause = function () { this.playing = false; this.syncUI(); this.render(); };
  Viz.prototype.toggle = function () { if (this.playing) this.pause(); else this.play(); };

  /* 单步：把当前这一步播完（含特效）就停；若已播完则进入下一步 */
  Viz.prototype.next = function () {
    var sc = this.sc;
    if (this.ended) { this.reset(); }
    if (this.idle) { this.idle = false; this.k = 0; this.t = 0; this.prevT = -1; this.jumped = false; }
    else if (this.t >= sc.steps[this.k]._stop) {
      if (this.k >= sc.steps.length - 1) { this.ended = true; this.syncUI(); this.render(); return; }
      this.k++; this.t = 0; this.prevT = -1; this.jumped = false;
    }
    this.stopAt = sc.steps[this.k]._stop;
    this.playing = true; this.syncUI(); this.kick();
  };

  /* 回退：瞬间摆到上一步的终态（暂停） */
  Viz.prototype.back = function () {
    this.playing = false; this.ended = false; this.clearFx();
    if (this.idle) { this.render(); return; }
    if (this.k === 0) { this.reset(); return; }
    this.k--; this.t = this.sc.steps[this.k]._stop; this.prevT = this.t; this.jumped = true;
    this.render(); this.syncUI();
  };

  /* 跳到第 j 步：暂停时摆到该步终态；播放中则从该步开头接着播 */
  Viz.prototype.seek = function (j) {
    var wasPlaying = this.playing;
    this.clearFx(); this.idle = false; this.ended = false; this.k = j; this.stopAt = null;
    if (wasPlaying) { this.t = 0; this.prevT = -1; this.jumped = false; this.kick(); }
    else { this.t = this.sc.steps[j]._stop; this.prevT = this.t; this.jumped = true; this.render(); }
    this.syncUI();
  };

  Viz.prototype.setSpeed = function (v) {
    this.speed = v;
    this.spBtns.forEach(function (b) { b.classList.toggle('on', b.textContent === v + '×'); });
  };

  Viz.prototype.syncUI = function () {
    this.bPlay.innerHTML = this.playing ? ICON.pause : this.ended ? ICON.replay : ICON.play;
    this.bPlay.setAttribute('aria-label', this.playing ? '暂停' : '播放');
    this.big.style.display = this.idle && !this.playing ? '' : 'none';
    this.root.classList.toggle('playing', this.playing);
  };

  /* ---------------- 注册 / 挂载 ---------------- */
  function findAnchor(doc, re) {
    var hs = doc.querySelectorAll('h2, h3');
    for (var i = 0; i < hs.length; i++) if (re.test(hs[i].textContent)) return hs[i];
    return null;
  }
  function mountAll() {
    var doc = document.querySelector('.doc');
    DEFS.forEach(function (def) {
      if (def._mounted) return;
      var ph = document.querySelector('[data-vz="' + def.id + '"]');
      if (!ph && doc) {
        var hd = def.anchor ? findAnchor(doc, def.anchor) : null;
        ph = h('div', { 'data-vz': def.id });
        if (!hd) { doc.appendChild(ph); }
        else if (def.place === 'start') { hd.parentNode.insertBefore(ph, hd.nextSibling); }
        else {
          var lv = +hd.tagName[1], n = hd.nextElementSibling, last = hd;
          while (n && !(/^H[1-6]$/.test(n.tagName) && +n.tagName[1] <= lv)) { last = n; n = n.nextElementSibling; }
          last.parentNode.insertBefore(ph, last.nextSibling);
        }
        if (hd) ph._heading = hd;
      }
      if (!ph) return;
      var hd2 = ph._heading;
      try { new Viz(ph, def); def._mounted = true; } catch (e) { console.error('[vz] 挂载失败', def.id, e); }
      document.dispatchEvent(new CustomEvent('vz:mounted', { detail: { id: def.id, title: def.title, heading: hd2 ? hd2.id : null } }));
    });
  }

  var VZ = window.VZ = {
    C: C, EASE: EASE, FMT: FMT, RM: RM, _all: [],
    register: function (def) { DEFS.push(def); if (document.readyState !== 'loading') mountAll(); },
    mountAll: mountAll,
    /* 供 node 统计场景表用：编译并返回每个场景的步数 / 时长 / 动的对象 */
    stats: function () {
      return DEFS.map(function (d) {
        return { id: d.id, title: d.title, scenes: d.scenes.map(function (sc) {
          compile(sc);
          var moving = {};
          sc.steps.forEach(function (st) { st._tracks.forEach(function (q) { if (q.from !== q.to) moving[q.id] = 1; }); });
          return { name: sc.name, steps: sc.steps.length, ms: sc._total, moving: Object.keys(moving) };
        }) };
      });
    },
    _defs: DEFS
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
})();
