/* ==========================================================================
 * dg.js · 静态图示（流程图 / 时序图 / 目录树 / 分层图 / 步骤条）
 *  在正文里这样写：
 *    <figure class="fig"><script>DG('flow',{...})</script><figcaption>说明</figcaption></figure>
 *  脚本用 document.currentScript 找到所在 figure，把 SVG 插在脚本前面。
 *  颜色全部用 CSS 变量，深浅色主题自动跟随。tone 取值：
 *    data 蓝（数据/输入输出） ok 绿（成功/正常） bad 红（错误/stderr） warn 橙（注意）
 *    info 紫（程序/进程/AI） teal 青（工具/文件） neutral 灰
 * ========================================================================== */
(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var TONE = {
    data: ['--data', '--accent-weak'], ok: ['--ok', '--ok-weak'], bad: ['--bad', '--bad-weak'],
    warn: ['--warn', '--warn-weak'], info: ['--info', '--info-weak'], teal: ['--teal', '--teal-weak'],
    neutral: ['--line-2', '--bg-3']
  };
  function tone(t) { var x = TONE[t || 'neutral'] || TONE.neutral; return { s: 'var(' + x[0] + ')', f: 'var(' + x[1] + ')', t: t && t !== 'neutral' ? 'var(' + x[0] + ')' : 'var(--fg-2)' }; }
  function tw(str, fs, mono) {
    var w = 0; str = String(str || '');
    for (var i = 0; i < str.length; i++) { var c = str.charCodeAt(i); w += c > 0x2e80 ? fs : (mono ? fs * 0.61 : (c === 32 ? fs * 0.3 : fs * 0.56)); }
    return w;
  }
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var UID = 0;

  function Svg(w, h) {
    this.w = w; this.h = h; this.parts = []; this.id = 'dg' + (++UID);
  }
  Svg.prototype.add = function (s) { this.parts.push(s); };
  Svg.prototype.rect = function (x, y, w, h, o) {
    o = o || {};
    this.add('<rect x="' + r(x) + '" y="' + r(y) + '" width="' + r(w) + '" height="' + r(h) + '" rx="' + (o.rx == null ? 8 : o.rx) +
      '" style="fill:' + (o.fill || 'none') + ';stroke:' + (o.stroke || 'none') + '" stroke-width="' + (o.sw || 1.4) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + '/>');
  };
  Svg.prototype.text = function (x, y, str, o) {
    o = o || {};
    this.add('<text x="' + r(x) + '" y="' + r(y) + '" text-anchor="' + (o.anchor || 'middle') + '" dominant-baseline="central" font-size="' +
      (o.size || 13) + '"' + (o.weight ? ' font-weight="' + o.weight + '"' : '') + ' class="' + (o.mono ? 'mono' : 'dg-t') +
      '" style="fill:' + (o.color || 'var(--fg)') + '">' + esc(str) + '</text>');
  };
  Svg.prototype.path = function (d, o) {
    o = o || {};
    this.add('<path d="' + d + '" fill="none" style="stroke:' + (o.stroke || 'var(--fg-3)') + '" stroke-width="' + (o.sw || 1.5) + '"' +
      (o.dash ? ' stroke-dasharray="' + o.dash + '"' : '') + (o.arrow !== false ? ' marker-end="url(#' + this.id + '-' + (o.mk || 'fg3') + ')"' : '') + '/>');
  };
  Svg.prototype.html = function () {
    var id = this.id, mk = '';
    ['fg3', 'data', 'ok', 'bad', 'warn', 'info', 'teal'].forEach(function (k) {
      var c = k === 'fg3' ? 'var(--fg-3)' : 'var(--' + k + ')';
      mk += '<marker id="' + id + '-' + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M0,1 L10,5 L0,9 z" style="fill:' + c + '"/></marker>';
    });
    return '<svg xmlns="' + NS + '" viewBox="0 0 ' + r(this.w) + ' ' + r(this.h) + '" role="img"><defs>' + mk + '</defs>' + this.parts.join('') + '</svg>';
  };
  function r(v) { return Math.round(v * 10) / 10; }

  /* 通用节点 */
  function node(S, n, x, y, w, h) {
    var T = tone(n.tone), sh = n.shape || 'box';
    if (sh === 'pill') S.rect(x - w / 2, y - h / 2, w, h, { rx: h / 2, fill: T.f, stroke: T.s, sw: 1.6 });
    else if (sh === 'diamond') {
      S.add('<path d="M' + r(x) + ',' + r(y - h / 2 - 6) + ' L' + r(x + w / 2) + ',' + r(y) + ' L' + r(x) + ',' + r(y + h / 2 + 6) + ' L' + r(x - w / 2) + ',' + r(y) +
        ' Z" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.6"/>');
    } else if (sh === 'cyl') {
      var e = 7;
      S.add('<path d="M' + r(x - w / 2) + ',' + r(y - h / 2 + e) + ' A' + r(w / 2) + ',' + e + ' 0 0 1 ' + r(x + w / 2) + ',' + r(y - h / 2 + e) +
        ' V' + r(y + h / 2 - e) + ' A' + r(w / 2) + ',' + e + ' 0 0 1 ' + r(x - w / 2) + ',' + r(y + h / 2 - e) + ' Z" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.6"/>' +
        '<path d="M' + r(x - w / 2) + ',' + r(y - h / 2 + e) + ' A' + r(w / 2) + ',' + e + ' 0 0 0 ' + r(x + w / 2) + ',' + r(y - h / 2 + e) + '" fill="none" style="stroke:' + T.s + '" stroke-width="1.6"/>');
    } else if (sh === 'doc') {
      var f = 10;
      S.add('<path d="M' + r(x - w / 2) + ',' + r(y - h / 2) + ' H' + r(x + w / 2 - f) + ' L' + r(x + w / 2) + ',' + r(y - h / 2 + f) + ' V' + r(y + h / 2) + ' H' + r(x - w / 2) +
        ' Z" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.6"/>');
    } else if (sh === 'note') S.rect(x - w / 2, y - h / 2, w, h, { rx: 6, fill: 'var(--bg-2)', stroke: T.s, sw: 1.3, dash: '4 3' });
    else S.rect(x - w / 2, y - h / 2, w, h, { rx: 9, fill: T.f, stroke: T.s, sw: 1.6 });
    var lines = String(n.l).split('\n');
    var dy = n.s ? -8 : 0, lh = 16;
    lines.forEach(function (ln, i) {
      S.text(x, y + dy + (i - (lines.length - 1) / 2) * lh, ln, { size: n.size || 13.5, weight: 650, mono: n.mono, color: 'var(--fg)' });
    });
    if (n.s) S.text(x, y + 10 + (lines.length - 1) * lh / 2, n.s, { size: 11, mono: true, color: T.t });
  }
  function nodeW(n, min) { var a = String(n.l).split('\n'); var w = 0; a.forEach(function (x) { w = Math.max(w, tw(x, 13.5, n.mono)); }); if (n.s) w = Math.max(w, tw(n.s, 11, true)); return Math.max(min || 70, w + 28); }

  /* ---------------- 流程图 ----------------
   * cols: [[节点…], [节点…]]  每个内层数组是一列（dir:'TB' 时是一行）
   * edges: [[from, to, 标签, tone, {dash, bend}]] */
  function flow(sp) {
    var TB = sp.dir === 'TB', cols = sp.cols, W = sp.w || 860;
    var nh = sp.nodeH || 50, gap = sp.gap || 22, m = 24;
    var idx = {}, maxN = 0;
    cols.forEach(function (c) { maxN = Math.max(maxN, c.length); });
    var H;
    if (!TB) H = sp.h || (m * 2 + maxN * nh + (maxN - 1) * (gap + 14) + 10);
    else H = sp.h || (m * 2 + cols.length * nh + (cols.length - 1) * (sp.rowGap || 56));
    var S = new Svg(W, H);
    if (sp.lanes) sp.lanes.forEach(function (ln) {
      S.rect(ln.x, ln.y, ln.w, ln.h, { rx: 12, fill: 'var(--bg)', stroke: 'var(--line)', dash: '5 4' });
      if (ln.l) S.text(ln.x + 12, ln.y + 14, ln.l, { anchor: 'start', size: 11.5, weight: 700, color: 'var(--fg-3)' });
    });
    cols.forEach(function (col, ci) {
      var n = col.length;
      col.forEach(function (nd, ri) {
        var x, y, w;
        if (!TB) {
          var cw = (W - 2 * m) / cols.length;
          x = m + cw * (ci + 0.5);
          var tot = n * nh + (n - 1) * (gap + 14);
          y = (H - tot) / 2 + nh / 2 + ri * (nh + gap + 14);
          w = Math.min(nd.w || nodeW(nd), cw - 26);
        } else {
          var rh = (H - 2 * m - cols.length * nh) / Math.max(1, cols.length - 1);
          y = m + nh / 2 + ci * (nh + rh);
          var cw2 = (W - 2 * m) / n;
          x = m + cw2 * (ri + 0.5);
          w = Math.min(nd.w || nodeW(nd), cw2 - 22);
        }
        if (nd.x != null) x = nd.x; if (nd.y != null) y = nd.y;
        idx[nd.id] = { x: x, y: y, w: w, h: nd.h || nh, c: ci, r: ri, nd: nd };
      });
    });
    (sp.edges || []).forEach(function (e) {
      var a = idx[e[0]], b = idx[e[1]], T = tone(e[3]), o = e[4] || {};
      if (!a || !b) return;
      var d, lx, ly;
      if (!TB) {
        if (b.c > a.c || (b.c === a.c && false)) {
          var x1 = a.x + a.w / 2, y1 = a.y, x2 = b.x - b.w / 2 - 2, y2 = b.y, mx = (x1 + x2) / 2;
          d = 'M' + r(x1) + ',' + r(y1) + ' C' + r(mx) + ',' + r(y1) + ' ' + r(mx) + ',' + r(y2) + ' ' + r(x2) + ',' + r(y2);
          lx = mx; ly = (y1 + y2) / 2 - (Math.abs(y2 - y1) < 4 ? 11 : 0);
        } else if (b.c === a.c) {
          var dn = b.r > a.r, ya = a.y + (dn ? a.h / 2 : -a.h / 2), yb = b.y + (dn ? -b.h / 2 - 2 : b.h / 2 + 2);
          d = 'M' + r(a.x) + ',' + r(ya) + ' L' + r(b.x) + ',' + r(yb);
          lx = a.x + 8; ly = (ya + yb) / 2;
        } else {
          var bend = o.bend || 46, yA = a.y + a.h / 2, yB = b.y + b.h / 2 + 2, yy = Math.max(yA, yB) + bend;
          d = 'M' + r(a.x) + ',' + r(yA) + ' C' + r(a.x) + ',' + r(yy) + ' ' + r(b.x) + ',' + r(yy) + ' ' + r(b.x) + ',' + r(yB);
          lx = (a.x + b.x) / 2; ly = yy - 12;
        }
      } else {
        if (b.c > a.c) {
          var X1 = a.x, Y1 = a.y + a.h / 2, X2 = b.x, Y2 = b.y - b.h / 2 - 2, my = (Y1 + Y2) / 2;
          d = 'M' + r(X1) + ',' + r(Y1) + ' C' + r(X1) + ',' + r(my) + ' ' + r(X2) + ',' + r(my) + ' ' + r(X2) + ',' + r(Y2);
          lx = (X1 + X2) / 2 + (Math.abs(X2 - X1) < 4 ? 8 : 0); ly = my;
        } else if (b.c === a.c) {
          var rt = b.r > a.r, xa = a.x + (rt ? a.w / 2 : -a.w / 2), xb = b.x + (rt ? -b.w / 2 - 2 : b.w / 2 + 2);
          d = 'M' + r(xa) + ',' + r(a.y) + ' L' + r(xb) + ',' + r(b.y);
          lx = (xa + xb) / 2; ly = a.y - 11;
        } else {
          var bd = o.bend || 60, xR = Math.max(a.x + a.w / 2, b.x + b.w / 2) + bd;
          d = 'M' + r(a.x + a.w / 2) + ',' + r(a.y) + ' C' + r(xR) + ',' + r(a.y) + ' ' + r(xR) + ',' + r(b.y) + ' ' + r(b.x + b.w / 2 + 2) + ',' + r(b.y);
          lx = xR - 10; ly = (a.y + b.y) / 2;
        }
      }
      S.path(d, { stroke: e[3] ? T.s : 'var(--fg-3)', dash: o.dash, mk: e[3] && e[3] !== 'neutral' ? e[3] : 'fg3', sw: 1.6 });
      if (e[2]) {
        var tw1 = tw(e[2], 11.5, o.mono) + 10;
        var anc = 'middle';
        S.rect(lx - tw1 / 2, ly - 9, tw1, 18, { rx: 5, fill: 'var(--bg-2)' });
        S.text(lx, ly, e[2], { size: 11.5, mono: o.mono, color: e[3] ? T.t : 'var(--fg-2)', weight: 600, anchor: anc });
      }
    });
    Object.keys(idx).forEach(function (k) { var q = idx[k]; node(S, q.nd, q.x, q.y, q.w, q.h); });
    return S;
  }

  /* ---------------- 时序图 ----------------
   * actors: [{l, s, tone}]  msgs: [{f, t, l, tone, dash, mono}] | {note:'…', at:i, span:j} | {sep:'…'} */
  function seq(sp) {
    var A = sp.actors, W = sp.w || 860, m = 20, top = 22, hh = 46, rowH = sp.rowH || 38;
    var rows = sp.msgs.length;
    var H = top + hh + 18 + rows * rowH + 26;
    var S = new Svg(W, H);
    var cw = (W - 2 * m) / A.length, X = A.map(function (_, i) { return m + cw * (i + 0.5); });
    var y0 = top + hh + 14;
    A.forEach(function (a, i) {
      S.add('<line x1="' + r(X[i]) + '" y1="' + (top + hh) + '" x2="' + r(X[i]) + '" y2="' + r(H - 10) + '" style="stroke:var(--line-2)" stroke-width="1.3" stroke-dasharray="4 4"/>');
    });
    sp.msgs.forEach(function (msg, i) {
      var y = y0 + i * rowH + rowH / 2;
      if (msg.sep) {
        S.add('<line x1="' + m + '" y1="' + r(y) + '" x2="' + (W - m) + '" y2="' + r(y) + '" style="stroke:var(--line)" stroke-width="1"/>');
        var w0 = tw(msg.sep, 11.5) + 16;
        S.rect(W / 2 - w0 / 2, y - 10, w0, 20, { rx: 10, fill: 'var(--bg-3)', stroke: 'var(--line)' });
        S.text(W / 2, y, msg.sep, { size: 11.5, color: 'var(--fg-3)', weight: 650 });
        return;
      }
      if (msg.note != null) {
        var a1 = msg.at, a2 = msg.span != null ? msg.span : msg.at, xl = Math.min(X[a1], X[a2]) - 70, xr = Math.max(X[a1], X[a2]) + 70;
        xl = Math.max(m, xl); xr = Math.min(W - m, xr);
        var T0 = tone(msg.tone || 'warn');
        S.rect(xl, y - 13, xr - xl, 26, { rx: 6, fill: T0.f, stroke: T0.s, sw: 1.1 });
        S.text((xl + xr) / 2, y, msg.note, { size: 12, color: 'var(--fg)', mono: msg.mono });
        return;
      }
      var T = tone(msg.tone || 'data'), f = X[msg.f], t = X[msg.t];
      if (msg.f === msg.t) {
        S.path('M' + r(f) + ',' + r(y - 8) + ' h46 v16 h-44', { stroke: T.s, mk: msg.tone || 'data', dash: msg.dash });
        S.text(f + 54, y, msg.l, { anchor: 'start', size: 12, mono: msg.mono, color: T.t, weight: 600 });
      } else {
        var dir = t > f ? 1 : -1;
        S.path('M' + r(f + dir * 3) + ',' + r(y + 6) + ' L' + r(t - dir * 4) + ',' + r(y + 6), { stroke: T.s, mk: msg.tone || 'data', dash: msg.dash, sw: 1.7 });
        S.text((f + t) / 2, y - 6, msg.l, { size: 12, mono: msg.mono, color: T.t, weight: 600 });
      }
    });
    A.forEach(function (a, i) {
      var T = tone(a.tone || 'neutral'), w = Math.min(cw - 14, nodeW(a, 90));
      S.rect(X[i] - w / 2, top, w, hh, { rx: 9, fill: T.f, stroke: T.s, sw: 1.6 });
      S.text(X[i], top + (a.s ? hh / 2 - 7 : hh / 2), a.l, { size: 13.5, weight: 700 });
      if (a.s) S.text(X[i], top + hh / 2 + 10, a.s, { size: 10.5, mono: true, color: T.t });
    });
    return S;
  }

  /* ---------------- 目录树 ----------------
   * root: {l:'/', s:'说明', tone, c:[{…}]}  名字以 / 结尾或有 c 的视为目录 */
  function tree(sp) {
    var rows = [];
    (function walk(n, depth, last, pre) {
      rows.push({ n: n, d: depth, last: last, pre: pre.slice() });
      (n.c || []).forEach(function (ch, i) { walk(ch, depth + 1, i === n.c.length - 1, pre.concat(depth > 0 ? [!last] : [])); });
    })(sp.root, 0, true, []);
    var W = sp.w || 860, rh = 27, m = 18, ind = 24;
    var H = m * 2 + rows.length * rh;
    var S = new Svg(W, H);
    var noteX = sp.noteX || 330;
    rows.forEach(function (row, i) {
      var y = m + i * rh + rh / 2, x = m + 8 + row.d * ind;
      row.pre.forEach(function (cont, k) {
        if (cont) S.add('<line x1="' + r(m + 8 + (k + 1) * ind - ind + 8) + '" y1="' + r(y - rh / 2) + '" x2="' + r(m + 8 + (k + 1) * ind - ind + 8) + '" y2="' + r(y + rh / 2) + '" style="stroke:var(--line-2)" stroke-width="1.2"/>');
      });
      if (row.d > 0) {
        var px = x - ind + 8;
        S.add('<path d="M' + r(px) + ',' + r(y - rh / 2) + ' V' + r(y) + ' H' + r(x - 3) + (row.last ? '' : ' M' + r(px) + ',' + r(y) + ' V' + r(y + rh / 2)) + '" fill="none" style="stroke:var(--line-2)" stroke-width="1.2"/>');
      }
      var dir = !!row.n.c || /\/$/.test(row.n.l), T = tone(row.n.tone || (dir ? 'warn' : 'teal'));
      if (dir) S.add('<path d="M' + r(x) + ',' + r(y - 6) + ' h6 l2,2 h8 v10 h-16 z" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.3"/>');
      else S.add('<path d="M' + r(x + 2) + ',' + r(y - 7) + ' h8 l4,4 v10 h-12 z" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.3"/>');
      S.text(x + 22, y, row.n.l, { anchor: 'start', size: 13, mono: true, weight: row.n.hl ? 750 : 500, color: row.n.hl ? T.s : 'var(--fg)' });
      if (row.n.s) {
        var nx = Math.max(noteX, x + 30 + tw(row.n.l, 13, true));
        S.add('<line x1="' + r(x + 28 + tw(row.n.l, 13, true)) + '" y1="' + r(y) + '" x2="' + r(nx - 8) + '" y2="' + r(y) + '" style="stroke:var(--line)" stroke-width="1" stroke-dasharray="2 3"/>');
        S.text(nx, y, row.n.s, { anchor: 'start', size: 12.2, color: 'var(--fg-2)' });
      }
    });
    return S;
  }

  /* ---------------- 分层图 ----------------
   * items: [{l, s, tone, side}]  从上到下堆叠；arrows:true 时层间画双向箭头 */
  function layers(sp) {
    var W = sp.w || 860, m = 20, h = sp.h || 54, g = sp.arrows ? 30 : 10, sideW = sp.sideW || 0;
    var H = m * 2 + sp.items.length * h + (sp.items.length - 1) * g;
    var S = new Svg(W, H);
    sp.items.forEach(function (it, i) {
      var y = m + i * (h + g), T = tone(it.tone), x0 = m + (it.indent || 0), w = W - 2 * m - sideW - (it.indent || 0) * 2;
      S.rect(x0, y, w, h, { rx: 10, fill: T.f, stroke: T.s, sw: 1.6 });
      S.text(x0 + 18, y + (it.s ? h / 2 - 9 : h / 2), it.l, { anchor: 'start', size: 14.5, weight: 700 });
      if (it.s) S.text(x0 + 18, y + h / 2 + 11, it.s, { anchor: 'start', size: 12, color: T.t });
      if (it.r) S.text(x0 + w - 16, y + h / 2, it.r, { anchor: 'end', size: 12, mono: true, color: 'var(--fg-2)' });
      if (it.side) S.text(W - m - sideW + 12, y + h / 2, it.side, { anchor: 'start', size: 12, color: 'var(--fg-3)' });
      if (sp.arrows && i < sp.items.length - 1) {
        var cx = m + (W - 2 * m - sideW) / 2, ya = y + h + 3, yb = y + h + g - 3;
        S.path('M' + r(cx - 40) + ',' + r(ya) + ' V' + r(yb), { stroke: 'var(--fg-3)', sw: 1.4 });
        S.path('M' + r(cx + 40) + ',' + r(yb) + ' V' + r(ya), { stroke: 'var(--fg-3)', sw: 1.4 });
        if (it.down) S.text(cx - 48, (ya + yb) / 2, it.down, { anchor: 'end', size: 11.5, color: 'var(--fg-3)' });
        if (it.up) S.text(cx + 48, (ya + yb) / 2, it.up, { anchor: 'start', size: 11.5, color: 'var(--fg-3)' });
      }
    });
    return S;
  }

  /* ---------------- 步骤条 ----------------
   * items: [{l, s, tone}]  横向编号步骤，窄屏自动换成两行 */
  function steps(sp) {
    var W = sp.w || 860, m = 26, n = sp.items.length, H = sp.h || 128;
    var S = new Svg(W, H), cw = (W - 2 * m) / n;
    sp.items.forEach(function (it, i) {
      var x = m + cw * (i + 0.5), y = 36, T = tone(it.tone || 'data');
      if (i < n - 1) S.path('M' + r(x + 20) + ',' + y + ' L' + r(x + cw - 22) + ',' + y, { stroke: 'var(--line-2)', sw: 1.6, mk: 'fg3' });
      S.add('<circle cx="' + r(x) + '" cy="' + y + '" r="17" style="fill:' + T.f + ';stroke:' + T.s + '" stroke-width="1.8"/>');
      S.text(x, y, it.n || (i + 1), { size: 13, weight: 800, color: T.s, mono: true });
      var ls = String(it.l).split('\n');
      ls.forEach(function (ln, k) { S.text(x, 70 + k * 17, ln, { size: 13, weight: 650 }); });
      if (it.s) S.text(x, 72 + ls.length * 17, it.s, { size: 11.2, color: 'var(--fg-3)', mono: it.mono });
    });
    return S;
  }

  var KIND = { flow: flow, seq: seq, tree: tree, layers: layers, steps: steps };
  window.DG = function (kind, spec) {
    var me = document.currentScript;
    var S = KIND[kind](spec);
    var wrap = document.createElement('div');
    wrap.className = 'dg dg-' + kind;
    wrap.innerHTML = S.html();
    if (spec.maxW) wrap.querySelector('svg').style.maxWidth = spec.maxW + 'px';
    if (me && me.parentNode) me.parentNode.insertBefore(wrap, me);
    return wrap;
  };
})();
