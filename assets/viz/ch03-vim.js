/* ch03 · Vim：模态与“编辑语言” —— 可视化演示
 * 依据：Lecture 3 视频 8:05–12:09（模式）、13:28–21:32（移动/选择/编辑/计数/修饰符）、24:13–28:24（修 FizzBuzz）；
 *       讲义 development-environment.md（Text editing and Vim 一节）。
 * 实测：每一步之后的光标行列、缓冲区内容、无名寄存器，全部来自本机 Vim 9.2 的回放：
 *       vim -u NONE -i NONE -N -Es -S trace.vim，脚本用 :normal 执行按键并记录 line('.')、col('.')、getline()、getreg('"')。
 *       舞台上的“键入动画”只是把真实的前后两个状态连起来，中间帧为示意。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text || '', color: C.fg, mono: true, size: 14, weight: 700 }, extra || {});
  }

  /* ------------------------------------------------------------------
   * 编辑器舞台生成器：一组等宽文本行 + 块状光标 + 按键提示 + 模式栏。
   * 步骤写法：{ say, k:'按下的键', hl, cur:[行,列], text:{行号:新内容}, del:{l,c1,c2,t}, ins:{l,c1,c2},
   *            mode:'INSERT'|'NORMAL'|'VISUAL'|…, reg:'寄存器', span:true（画出移动覆盖的范围）, log, set, fx, cmd:'底部命令行' }
   * ------------------------------------------------------------------ */
  /* SVG 默认会合并连续空格（引擎没有给 text 设 white-space:pre），缩进会丢；换成不换行空格 U+00A0 保住列对齐 */
  function nb(t) { return typeof t === 'string' ? t.replace(/ /g, '\u00a0') : t; }
  function editorScene(cfg) {
    var FS = cfg.fs || 20, CW = cfg.cw || 12.2, LH = cfg.lh || 40, X0 = cfg.x0 || 110, Y0 = cfg.y0 || 130;
    var N = cfg.rows || cfg.lines.length;
    function lx(c) { return X0 + (c - 0.5) * CW; }
    function ly(l) { return Y0 + (l - 1) * LH; }
    var objs = {};
    for (var i = 1; i <= N; i++) objs['L' + i] = { type: 'text', x: X0, y: ly(i), anchor: 'start', mono: true, size: FS, cw: CW, text: nb(cfg.lines[i - 1] || ''), color: C.fg, opacity: cfg.lines[i - 1] == null ? 0 : 1 };
    objs.span = { type: 'box', x: lx(1), y: ly(1), w: CW, h: FS + 12, rx: 4, fill: C.dataW, stroke: C.data, sw: 1.2, opacity: 0 };
    objs.ins = { type: 'box', x: lx(1), y: ly(1), w: CW, h: FS + 12, rx: 4, fill: C.okW, stroke: C.ok, sw: 1.4, opacity: 0 };
    objs.gh = { type: 'box', x: lx(1), y: ly(1), w: CW, h: FS + 10, rx: 4, fill: C.badW, stroke: C.bad, sw: 1.4, text: '', mono: true, size: FS - 2, color: C.bad, opacity: 0 };
    objs.cur = { type: 'box', x: lx(cfg.start[1]), y: ly(cfg.start[0]), w: CW + 1, h: FS + 8, rx: 2, fill: 'rgba(230,140,40,0.35)', stroke: C.warn, sw: 1.6, trail: { n: 5, gap: 34 } };
    objs.keys = box(cfg.kx || 740, cfg.ky || 60, 150, 44, '', C.warn, C.warnW, { size: 17, color: C.warn, opacity: 0 });
    objs.mode = { type: 'text', x: X0 - 20, y: cfg.my || 520, anchor: 'start', mono: true, size: 15, weight: 800, text: '-- NORMAL --', color: C.fg3 };
    objs.cmd = { type: 'text', x: cfg.cx || 600, y: cfg.my || 520, anchor: 'start', mono: true, size: 16, weight: 700, text: '', color: C.info, opacity: 0 };
    Object.keys(cfg.objects || {}).forEach(function (k) { objs[k] = cfg.objects[k]; });

    var cl = cfg.start[0], cc = cfg.start[1], modeNow = 'NORMAL';
    var steps = cfg.steps.map(function (s) {
      var set = {}, fx = [], d = s.d || 300;
      if (s.k != null) { set.keys = { text: s.k, opacity: { to: 1, dur: 200 } }; fx.push({ type: 'pulse', obj: 'keys', at: 50, color: C.warn }); }
      /* 移动覆盖的范围（名词） */
      if (s.span && s.cur && s.cur[0] === cl) {
        var a = Math.min(cc, s.cur[1]), b = Math.max(cc, s.cur[1]);
        set.span = { x: { to: (lx(a) + lx(b)) / 2, dur: 0 }, y: { to: ly(cl), dur: 0 }, w: { to: (b - a + 1) * CW + 4, dur: 0 }, opacity: { from: 0, to: 0.55, delay: d - 100, dur: 300 } };
      } else set.span = { opacity: { to: 0, dur: 200 } };
      /* 删除：被删的片段变成红色幽灵飞走 */
      if (s.del) {
        var D = s.del, cx = (lx(D.c1) + lx(D.c2)) / 2;
        set.gh = { text: nb(D.t), x: { from: cx, to: cx + (D.dx || 0), dur: 900, delay: d }, y: { from: ly(D.l), to: ly(D.l) - 46, dur: 900, delay: d, ease: 'out' }, w: { to: (D.c2 - D.c1 + 1) * CW + 6, dur: 0 }, opacity: { from: 0.95, to: 0, delay: d + 300, dur: 700 } };
        fx.push({ type: 'burst', x: cx, y: ly(D.l), at: d + 50, color: C.bad });
      }
      /* 插入：新内容用绿框标出 */
      if (s.ins) {
        var I = s.ins;
        set.ins = { x: { to: (lx(I.c1) + lx(I.c2)) / 2, dur: 0 }, y: { to: ly(I.l), dur: 0 }, w: { to: (I.c2 - I.c1 + 1) * CW + 4, dur: 0 }, opacity: { from: 0, to: 0.6, delay: d + 200, dur: 400 } };
        fx.push({ type: 'ripple', x: (lx(I.c1) + lx(I.c2)) / 2, y: ly(I.l), at: d + 400, color: C.ok });
      } else set.ins = { opacity: { to: 0, dur: 250 } };
      /* 文本行变化 */
      Object.keys(s.text || {}).forEach(function (ln) {
        var v = s.text[ln];
        if (typeof v !== 'string' && v.text && typeof v.text.to === 'string') v.text.to = nb(v.text.to);
        set['L' + ln] = typeof v === 'string' ? { text: { to: nb(v), delay: d + 150 }, opacity: { to: 1, dur: 200 } } : v;
      });
      /* 光标 */
      if (s.cur) {
        set.cur = { x: { to: lx(s.cur[1]), delay: s.cd != null ? s.cd : d, dur: s.cdur || 650, ease: 'inOut' }, y: { to: ly(s.cur[0]), delay: s.cd != null ? s.cd : d, dur: s.cdur || 650, ease: 'inOut' } };
        cl = s.cur[0]; cc = s.cur[1];
      }
      if (s.mode && s.mode !== modeNow) {
        set.mode = { text: { to: '-- ' + s.mode + ' --', delay: d }, color: { to: s.mode === 'NORMAL' ? C.fg3 : s.mode === 'INSERT' ? C.ok : s.mode === 'VISUAL' ? C.data : C.info, delay: d, dur: 200 } };
        set.cur = merge(set.cur || {}, { w: { to: s.mode === 'INSERT' ? 3 : CW + 1, delay: d, dur: 250 } });
        modeNow = s.mode;
      }
      if (s.cmd != null) set.cmd = { text: s.cmd, opacity: { to: s.cmd ? 1 : 0, dur: 200 } };
      Object.keys(s.set || {}).forEach(function (k) { set[k] = merge(set[k] || {}, s.set[k]); });
      var data = { '模式': modeNow, '光标': s.cur ? { v: 'L' + s.cur[0] + ' C' + s.cur[1], at: d + 400 } : undefined };
      if (s.k != null) data['按键'] = s.k;
      if (s.reg != null) data['寄存器 ""'] = { v: s.reg, at: d + 300 };
      Object.keys(data).forEach(function (k) { if (data[k] === undefined) delete data[k]; });
      return { say: s.say, hl: s.hl, set: set, fx: fx.concat(s.fx || []), data: data, log: s.log, eq: s.eq };
    });
    return {
      name: cfg.name, desc: cfg.desc, code: cfg.code, dataTitle: '编辑器状态（本机 Vim 回放）',
      data: { '模式': 'NORMAL', '光标': 'L' + cfg.start[0] + ' C' + cfg.start[1], '按键': '无', '寄存器 ""': '无' },
      legend: [[C.warn, '光标 / 按键'], [C.data, '移动覆盖的范围（名词）'], [C.bad, '被删除的文字'], [C.ok, '新插入的文字'], [C.info, '命令行 / 模式']],
      bg: function (dr) {
        dr.rect(X0 - 60, Y0 - LH / 2 - 14, cfg.ew || 760, N * LH + 28, { fill: C.bg2, stroke: C.line, rx: 10 });
        for (var j = 1; j <= N; j++) dr.text(X0 - 18, ly(j), String(j), { anchor: 'end', size: 13, mono: true, color: C.fg3 });
        if (cfg.bg) cfg.bg(dr);
      },
      objects: objs, steps: steps
    };
  }

  /* ---------- 演示 1：模式状态机 ---------- */
  var M = { N: [250, 300], I: [100, 150], R: [100, 450], V: [400, 150], C: [400, 450] };
  function tokTo(k, d) { return { x: { to: M[k][0], delay: d || 0, dur: 700, ease: 'inOut' }, y: { to: M[k][1] + 12, delay: d || 0, dur: 700, ease: 'inOut' } }; }
  var TX = 520, TY = 300, TCW = 14;
  function tcx(c) { return TX + (c - 0.5) * TCW; }
  var sceneModes = {
    name: '模式状态机', desc: 'Normal 是大本营。i、R、v、: 进入其他模式，Esc 回来。同一个 x，在不同模式下干的事完全不同。右侧文本来自本机 Vim 回放。',
    code: { lang: 'text', title: '依次按下（文本：the quick fox）', src: 'w            Normal：移到下一个词\nx            Normal：删除光标下的字符\nu            撤销\nix<Esc>      Insert：x 就是字母 x\nu\nvex          Visual：选中到词尾，x 删除选区\nu\nRslow<Esc>   Replace：逐字覆盖\nu\n:s/quick/brown/<CR>   Command-line' },
    dataTitle: '模式与文本（本机 Vim 回放）',
    data: { '模式': 'NORMAL', '文本': 'the quick fox', '寄存器 ""': '无' },
    legend: [[C.neutral, 'Normal'], [C.ok, 'Insert'], [C.data, 'Visual'], [C.warn, 'Replace'], [C.info, 'Command-line'], [C.bad, '被删除']],
    bg: function (d) {
      d.text(250, 30, '模式之间怎么切换', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(TX + 140, 30, '同一个 x 的三种结果', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      var S = [['N', 'Normal', C.neutral, C.bg3], ['I', 'Insert', C.ok, C.okW], ['R', 'Replace', C.warn, C.warnW], ['V', 'Visual', C.data, C.dataW], ['C', 'Command-line', C.info, C.infoW]];
      S.forEach(function (s) { d.rect(M[s[0]][0] - 62, M[s[0]][1] - 28, 124, 56, { fill: s[3], stroke: s[2], sw: 1.8, rx: 14 }); d.text(M[s[0]][0], M[s[0]][1] - 12, s[1], { anchor: 'middle', size: 13, weight: 800, color: s[2] }); });
      [['I', 'i', -1], ['R', 'R', -1], ['V', 'v V ^V', 1], ['C', ':', 1]].forEach(function (e) {
        var a = M.N, b = M[e[0]];
        d.line(a[0] + (b[0] - a[0]) * 0.32, a[1] + (b[1] - a[1]) * 0.32, a[0] + (b[0] - a[0]) * 0.72, a[1] + (b[1] - a[1]) * 0.72, { stroke: C.line, sw: 1.4, arrow: 'fg3' });
        d.text(a[0] + (b[0] - a[0]) * 0.52 + e[2] * 18, a[1] + (b[1] - a[1]) * 0.52 - 8, e[1], { anchor: 'middle', size: 13, mono: true, weight: 700, color: C.fg2 });
      });
      d.text(250, 525, '任何模式按 Esc 回到 Normal', { anchor: 'middle', size: 12.5, color: C.fg3 });
      d.rect(TX - 20, TY - 40, 320, 80, { fill: C.bg2, stroke: C.line, rx: 10 });
    },
    objects: {
      tok: { type: 'circle', x: M.N[0], y: M.N[1] + 12, r: 9, fill: C.warn, stroke: C.warn, sw: 1, trail: { n: 5, gap: 36 } },
      line: { type: 'text', x: TX, y: TY, anchor: 'start', mono: true, size: 23, cw: TCW, text: 'the quick fox', color: C.fg },
      cur: { type: 'box', x: tcx(1), y: TY, w: TCW + 1, h: 30, rx: 2, fill: 'rgba(230,140,40,0.35)', stroke: C.warn, sw: 1.6 },
      sel: { type: 'box', x: tcx(7), y: TY, w: 5 * TCW + 4, h: 32, rx: 4, fill: C.dataW, stroke: C.data, sw: 1.4, opacity: 0 },
      gh: { type: 'box', x: tcx(5), y: TY, w: TCW + 4, h: 30, rx: 4, fill: C.badW, stroke: C.bad, sw: 1.4, text: 'q', mono: true, size: 20, color: C.bad, opacity: 0 },
      modeT: { type: 'text', x: TX, y: TY + 70, anchor: 'start', mono: true, size: 15, weight: 800, text: '-- NORMAL --', color: C.fg3 },
      cmd: { type: 'text', x: TX, y: TY + 100, anchor: 'start', mono: true, size: 16, weight: 700, text: '', color: C.info, opacity: 0 },
      key: box(TX + 140, TY - 90, 150, 40, '', C.warn, C.warnW, { size: 16, color: C.warn, opacity: 0 })
    },
    steps: [
      { say: '启动后在 Normal 模式。按 w：光标移到下一个词 quick 的开头（C5）。Normal 模式下按键是“命令”，不是文字。',
        data: { '模式': 'NORMAL' }, set: { key: { text: 'w', opacity: { to: 1, dur: 200 } }, cur: { x: { to: tcx(5), delay: 300, dur: 600, ease: 'inOut' } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'pulse', obj: 'tok', at: 300, color: C.neutral }] },
      { say: '在 Normal 模式按 x：删除光标下的一个字符 q。被删的字符进入无名寄存器（可以用 p 粘回来）。', hl: [2],
        data: { '文本': { v: 'the uick fox', at: 500 }, '寄存器 ""': { v: 'q', at: 500 } },
        set: { key: { text: 'x' }, gh: { text: 'q', x: { from: tcx(5), to: tcx(5), dur: 0 }, y: { from: TY, to: TY - 50, delay: 300, dur: 800, ease: 'out' }, opacity: { from: 1, to: 0, delay: 600, dur: 600 } }, line: { text: { to: 'the uick fox', delay: 350 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'burst', x: tcx(5), y: TY, at: 350, color: C.bad }] },
      { say: 'u 撤销，回到原文。接着按 i 进入 Insert 模式。状态机的令牌从 Normal 移到 Insert。左下角显示 -- INSERT --。', hl: [3, 4],
        data: { '模式': { v: 'INSERT', at: 900 }, '文本': 'the quick fox' },
        set: { key: { text: 'u  i' }, line: { text: { to: 'the quick fox', delay: 200 } }, tok: tokTo('I', 500), cur: { w: { to: 3, delay: 900, dur: 250 }, x: { to: tcx(5) - TCW / 2, delay: 900, dur: 250 } },
          modeT: { text: { to: '-- INSERT --', delay: 900 }, color: { to: C.ok, delay: 900, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'ripple', x: M.I[0], y: M.I[1], at: 1200, color: C.ok }] },
      { say: '在 Insert 模式下按 x，它就是一个普通字母。x 被插到光标前，变成 the xquick fox。按 Esc 回到 Normal。', hl: [4],
        data: { '文本': { v: 'the xquick fox', at: 400 }, '模式': { v: 'NORMAL', at: 1300 } },
        set: { key: { text: 'x  <Esc>' }, line: { text: { to: 'the xquick fox', delay: 400 } }, tok: tokTo('N', 1200), cur: { w: { to: TCW + 1, delay: 1300, dur: 250 }, x: { to: tcx(5), delay: 1300, dur: 250 } },
          modeT: { text: { to: '-- NORMAL --', delay: 1300 }, color: { to: C.fg3, delay: 1300, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'ripple', x: tcx(5), y: TY, at: 450, color: C.ok }] },
      { say: 'u 撤销。v 进入 Visual 模式，e 把选区扩到词尾。在 Visual 模式下，移动键是用来“画”选区的。', hl: [5, 6],
        data: { '文本': 'the quick fox', '模式': { v: 'VISUAL', at: 600 } },
        set: { key: { text: 'u  v  e' }, line: { text: { to: 'the quick fox', delay: 150 } }, tok: tokTo('V', 400),
          modeT: { text: { to: '-- VISUAL --', delay: 600 }, color: { to: C.data, delay: 600, dur: 200 } },
          sel: { x: { from: tcx(5), to: tcx(7), delay: 800, dur: 600, ease: 'out' }, w: { from: TCW + 4, to: 5 * TCW + 4, delay: 800, dur: 600, ease: 'out' }, opacity: { to: 0.7, delay: 700, dur: 200 } },
          cur: { x: { to: tcx(9), delay: 800, dur: 600, ease: 'out' } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: '在 Visual 模式按 x：删除整个选区 quick，并自动回到 Normal。同一个键，第三种含义（本机实测寄存器里是 quick）。', hl: [6],
        data: { '文本': { v: 'the  fox', at: 400 }, '寄存器 ""': { v: 'quick', at: 400 }, '模式': { v: 'NORMAL', at: 700 } },
        set: { key: { text: 'x' }, sel: { opacity: { to: 0, delay: 300, dur: 200 } }, gh: { text: 'quick', w: { to: 5 * TCW + 6, dur: 0 }, x: { from: tcx(7), to: tcx(7), dur: 0 }, y: { from: TY, to: TY - 50, delay: 300, dur: 800, ease: 'out' }, opacity: { from: 1, to: 0, delay: 600, dur: 600 } },
          line: { text: { to: 'the\u00a0\u00a0fox', delay: 350 } }, tok: tokTo('N', 600), modeT: { text: { to: '-- NORMAL --', delay: 700 }, color: { to: C.fg3, delay: 700, dur: 200 } }, cur: { x: { to: tcx(5), delay: 400, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'burst', x: tcx(7), y: TY, at: 350, color: C.bad }] },
      { say: 'u 撤销。R 进入 Replace 模式，输入的字符逐个盖掉原有字符。slow 盖掉了 quic，剩下的 k 还在。', hl: [7, 8],
        data: { '文本': { v: 'the slowk fox', at: 1000 }, '模式': { v: 'REPLACE', at: 500 } },
        set: { key: { text: 'u  R slow' }, line: { text: { to: 'the slowk fox', delay: 1000 } }, tok: merge(tokTo('R', 300), {}),
          modeT: { text: { to: '-- REPLACE --', delay: 500 }, color: { to: C.warn, delay: 500, dur: 200 } },
          cur: { x: { from: tcx(5), to: tcx(8), delay: 600, dur: 800, ease: 'linear' } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'ripple', x: tcx(6.5), y: TY, at: 1000, color: C.warn }] },
      { say: 'Esc 回到 Normal，u 撤销替换，文本恢复成 the quick fox。', hl: [9],
        data: { '文本': { v: 'the quick fox', at: 600 }, '模式': { v: 'NORMAL', at: 300 } },
        set: { key: { text: '<Esc>  u' }, tok: tokTo('N', 200), line: { text: { to: 'the quick fox', delay: 600 } },
          modeT: { text: { to: '-- NORMAL --', delay: 300 }, color: { to: C.fg3, delay: 300, dur: 200 } }, cur: { x: { to: tcx(5), delay: 600, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'ripple', x: tcx(7), y: TY, at: 650, color: C.ok }] },
      { say: '按 : 进入 Command-line 模式。在底部输入 s/quick/brown/ 再回车。替换命令执行完，回到 Normal。', hl: [10],
        data: { '文本': { v: 'the brown fox', at: 1800 }, '模式': { v: 'NORMAL', at: 1900 } },
        set: { key: { text: ':' }, tok: { x: { to: M.C[0], delay: 300, dur: 900, ease: 'inOut' }, y: { to: M.C[1] + 12, delay: 300, dur: 900, ease: 'inOut' } },
          line: { text: { to: 'the brown fox', delay: 1800 } }, modeT: { text: { to: '-- NORMAL --', delay: 1900 } },
          cmd: { text: ':s/quick/brown/', opacity: { to: 1, delay: 800, dur: 300 } }, cur: { x: { to: tcx(1), delay: 1800, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'ripple', x: M.C[0], y: M.C[1], at: 1200, color: C.info }, { type: 'flash', obj: 'line', at: 1800, color: C.info }] }
    ]
  };

  /* ---------- 演示 2：移动 = 名词 ---------- */
  var sceneMotion = editorScene({
    name: '移动 = 名词', desc: '每个移动命令都指代一段文字，就是从光标到落点。所以叫“名词”。光标的每个落点，都来自本机 Vim 的真实记录。',
    lines: ['    for i in range(limit):', '        if i % 3 == 0:', '            print("fizz", end="")'], fs: 22, cw: 13.4, lh: 60, x0: 150, y0: 170, start: [1, 1], my: 470, ew: 640, kx: 690, ky: 70,
    code: { lang: 'text', title: '依次按下', src: 'w\nw\nb\ne\n0\n^\n$\nF(\n%\nj\nG\ngg\n/fizz<CR>' },
    steps: [
      { say: 'w（word）：跳到下一个词的开头，for 的 f（C5）。蓝框是这次移动覆盖的文字。d、c 这些动词，就作用在它上面。', k: 'w', hl: [1], cur: [1, 5], span: true },
      { say: '再按 w：i（C9）。', k: 'w', hl: [2], cur: [1, 9], span: true },
      { say: 'b（back）：回到词首，回到 for（C5）。', k: 'b', hl: [3], cur: [1, 5], span: true },
      { say: 'e（end）：跳到词尾，for 的 r（C7）。', k: 'e', hl: [4], cur: [1, 7], span: true },
      { say: '0：行首，第 1 列（缩进的空格也算）。', k: '0', hl: [5], cur: [1, 1], span: true },
      { say: '^：第一个非空字符。跳过缩进，落在 for 上（C5）。', k: '^', hl: [6], cur: [1, 5], span: true },
      { say: '$：行尾（冒号，C26）。', k: '$', hl: [7], cur: [1, 26], span: true },
      { say: 'F(：向左找字符 “(”，f 是向右找。t 和 T 则停在它前面一格。', k: 'F(', hl: [8], cur: [1, 19], span: true },
      { say: '%：跳到配对的括号，从 ( 跳到 )（C25）。读代码时检查括号配对，非常好用。', k: '%', hl: [9], cur: [1, 25], span: true },
      { say: 'j：下移一行，尽量保持列号。第 2 行只有 22 个字符，光标停在行尾（L2 C22）。', k: 'j', hl: [10], cur: [2, 22] },
      { say: 'G：跳到文件最后一行。落在第一个非空字符上（L3 C13）。', k: 'G', hl: [11], cur: [3, 13] },
      { say: 'gg：回到文件第一行（同样落在第一个非空字符，C5）。', k: 'gg', hl: [12], cur: [1, 5] },
      { say: '/fizz 回车：用正则往后搜索。光标跳到第一个匹配（L3 C20）。之后用 n 和 N 在匹配之间跳。', k: '/fizz⏎', hl: [13], cur: [3, 20], cmd: '/fizz', mode: 'NORMAL',
        set: { span: { x: { to: 150 + 21 * 13.4, dur: 0 }, y: { to: 290, dur: 0 }, w: { to: 4 * 13.4 + 4, dur: 0 }, opacity: { from: 0, to: 0.55, delay: 600, dur: 300 } } } }
    ]
  });

  /* ---------- 演示 3：编辑 = 动词 ---------- */
  var sceneVerbs = editorScene({
    name: '动词 + 名词', desc: 'd 删、c 改，还有 x、o、u，这些是“动词”。它们和移动“名词”组合使用。每一步后的文本、光标和寄存器，都来自本机 Vim 回放。',
    lines: ['def greet(name):', '    message = "hello " + name', '    print(message)', null], rows: 4, fs: 20, cw: 12.2, lh: 52, x0: 120, y0: 150, start: [1, 1], my: 470, ew: 600, kx: 720, ky: 70,
    code: { lang: 'text', title: '依次按下', src: 'j^\ncw greeting <Esc>\nw dw\nu\n$ x\nu\nF+ d$\nu\no return greeting <Esc>\nu  <C-r>\ngg~\nJ' },
    steps: [
      { say: 'j^：下移一行，再到第一个非空字符。也就是 message 的 m（L2 C5）。', k: 'j^', hl: [1], cur: [2, 5] },
      { say: 'cw（change word）：删掉 message 并进入 Insert 模式……', k: 'cw', hl: [2], cur: [2, 5], mode: 'INSERT', reg: 'message',
        del: { l: 2, c1: 5, c2: 11, t: 'message' }, text: { 2: '     = "hello " + name' } },
      { say: '……输入 greeting，按 Esc 回到 Normal。cw 等于 “d + 移动” 再按 i。', k: 'greeting⎋', hl: [2], cur: [2, 12], mode: 'NORMAL',
        text: { 2: '    greeting = "hello " + name' }, ins: { l: 2, c1: 5, c2: 12 }, cd: 600 },
      { say: 'w 到 “=”，dw 删除一个词。“一个词”包括后面的空白，所以删掉的是 “= ”。寄存器里实测就是它。', k: 'w  dw', hl: [3], cur: [2, 14], reg: '= ',
        del: { l: 2, c1: 14, c2: 15, t: '= ' }, text: { 2: '    greeting "hello " + name' }, d: 800 },
      { say: 'u：撤销，“= ” 回来了。', k: 'u', hl: [4], cur: [2, 14], text: { 2: '    greeting = "hello " + name' }, ins: { l: 2, c1: 14, c2: 15 } },
      { say: '$ 到行尾，x 删除光标下的字符 e（x ≡ dl）。', k: '$  x', hl: [5], cur: [2, 29], reg: 'e', del: { l: 2, c1: 30, c2: 30, t: 'e' }, text: { 2: '    greeting = "hello " + nam' }, d: 900 },
      { say: 'u 撤销。', k: 'u', hl: [6], cur: [2, 30], text: { 2: '    greeting = "hello " + name' }, ins: { l: 2, c1: 30, c2: 30 } },
      { say: 'F+ 向左找到 +，d$ 删到行尾：“+ name” 进了寄存器。', k: 'F+  d$', hl: [7], cur: [2, 24], reg: '+ name', del: { l: 2, c1: 25, c2: 30, t: '+ name' }, text: { 2: '    greeting = "hello " ' }, d: 900 },
      { say: 'u 撤销。接下来试试 o（open）。', k: 'u', hl: [8], cur: [2, 25], text: { 2: '    greeting = "hello " + name' }, ins: { l: 2, c1: 25, c2: 30 } },
      { say: 'o：在下方开一个新行并进入 Insert，输入 return greeting，Esc。原来的第 3 行被挤到第 4 行（这里的 Vim 没开自动缩进）。', k: 'o…⎋', hl: [9], cur: [3, 15], mode: 'NORMAL',
        text: { 3: 'return greeting', 4: { text: { to: '    print(message)', delay: 0 }, opacity: { to: 1, dur: 200 }, y: { from: 254, to: 306, delay: 200, dur: 600, ease: 'out' } } }, ins: { l: 3, c1: 1, c2: 15 }, d: 600 },
      { say: 'u：撤销整次插入。新行消失，第 4 行回到第 3 行。撤销以一次完整的修改为单位。光标回到修改前的位置 L2 C25。', k: 'u', hl: [10], cur: [2, 25],
        text: { 3: '    print(message)', 4: { opacity: { to: 0, dur: 300 }, y: { to: 254, dur: 500 } } } },
      { say: '<C-r>（Ctrl+r）：重做，那一行又回来了。', k: '<C-r>', hl: [10], cur: [2, 25],
        text: { 3: 'return greeting', 4: { opacity: { to: 1, delay: 300, dur: 300 }, y: { to: 306, delay: 200, dur: 500 } } }, ins: { l: 3, c1: 1, c2: 15 } },
      { say: 'gg~：回到第 1 行。~ 翻转光标下字符的大小写，d 变成 D。光标前进一格。', k: 'gg~', hl: [11], cur: [1, 2], text: { 1: 'Def greet(name):' }, ins: { l: 1, c1: 1, c2: 1 } },
      { say: 'J：把下一行接到本行末尾。中间补一个空格，去掉下一行的缩进。下面的行依次上移。', k: 'J', hl: [12], cur: [1, 17],
        text: { 1: 'Def greet(name): greeting = "hello " + name', 2: { opacity: { to: 0, dur: 400 }, y: { to: 150, dur: 500 } }, 3: { y: { to: 202, delay: 300, dur: 500 } }, 4: { y: { to: 254, delay: 400, dur: 500 } } },
        ins: { l: 1, c1: 17, c2: 44 } }
    ]
  });

  /* ---------- 演示 4：计数与修饰符 ---------- */
  var sceneCount = editorScene({
    name: '计数', desc: '在名词或动词前加数字，动作就重复多次：3w、7dw、5j。数字超出范围时 Vim 尽力而为（10j 只走到最后一行）。',
    lines: ['alpha beta gamma delta epsilon zeta eta theta iota kappa', 'line 2', 'line 3', 'line 4', 'line 5', 'line 6', 'line 7'], fs: 17, cw: 10.4, lh: 46, x0: 110, y0: 110, start: [1, 1], my: 470, ew: 680, kx: 740, ky: 410, cx: 440,
    code: { lang: 'text', title: '依次按下', src: '3w\n7dw\nu\n5j\n10j\ngg' },
    steps: [
      { say: '3w：w 做 3 次。跳过 alpha、beta、gamma，停在 delta（C18）。', k: '3w', hl: [1], cur: [1, 18], span: true, cdur: 1100,
        fx: [{ type: 'float', x: 110 + 6.5 * 10.4, y: 90, at: 300, text: '1', color: C.warn }, { type: 'float', x: 110 + 11.5 * 10.4, y: 90, at: 600, text: '2', color: C.warn }, { type: 'float', x: 110 + 17.5 * 10.4, y: 90, at: 900, text: '3', color: C.warn }] },
      { say: '7dw：删除 7 个词。从 delta 到行尾正好 7 个，全部进了寄存器。', k: '7dw', hl: [2], cur: [1, 17], reg: 'delta … kappa（7 个词）',
        del: { l: 1, c1: 18, c2: 56, t: 'delta epsilon zeta eta theta iota kappa' }, text: { 1: 'alpha beta gamma ' }, d: 500 },
      { say: 'u：一次撤销，7 个词全部恢复。因为 7dw 是一条命令。', k: 'u', hl: [3], cur: [1, 18], text: { 1: 'alpha beta gamma delta epsilon zeta eta theta iota kappa' }, ins: { l: 1, c1: 18, c2: 56 } },
      { say: '5j：下移 5 行，到第 6 行。', k: '5j', hl: [4], cur: [6, 6], cdur: 1000 },
      { say: '10j：下面只剩 1 行，Vim 走到最后一行就停（L7）。', k: '10j', hl: [5], cur: [7, 6], fx: [{ type: 'shake', obj: 'cur', at: 900 }] },
      { say: 'gg：回到第一行。讲师补充：几乎任何命令都能带计数，比如 5u 撤销 5 次。', k: 'gg', hl: [6], cur: [1, 1], cdur: 1000 }
    ]
  });
  var sceneMod = editorScene({
    name: '修饰符 i / a', desc: 'i = inner（里面），a = around（连同外壳）。ci( 改括号里的内容，da\' 连引号一起删。',
    lines: ["print(compute(a, b), items[idx + 1], 'done')"], fs: 20, cw: 12.6, lh: 60, x0: 110, y0: 230, start: [1, 1], my: 420, ew: 640, kx: 700, ky: 100, cx: 420,
    code: { lang: 'text', title: '依次按下', src: "fa\nci( x <Esc>\nfd\nci[ 0 <Esc>\nf'\nda'\n0\nci( <Esc>\nu" },
    steps: [
      { say: 'fa：在本行向右找字符 a。光标停在 compute( 里面的 a（C15）。', k: 'fa', hl: [1], cur: [1, 15], span: true },
      { say: 'ci( 读作 change · inside · ( )。删掉光标所在那对括号里的 “a, b”，进入 Insert。', k: 'ci(', hl: [2], cur: [1, 15], mode: 'INSERT', reg: 'a, b',
        del: { l: 1, c1: 15, c2: 18, t: 'a, b' }, text: { 1: "print(compute(), items[idx + 1], 'done')" } },
      { say: '输入 x，Esc。改一个函数参数，就这么几个键（讲师：“非常快”）。', k: 'x⎋', hl: [2], cur: [1, 15], mode: 'NORMAL', text: { 1: "print(compute(x), items[idx + 1], 'done')" }, ins: { l: 1, c1: 15, c2: 15 } },
      { say: 'fd 找到 idx 的 d。ci[ 改方括号里的内容。', k: 'fd  ci[', hl: [3, 4], cur: [1, 25], mode: 'INSERT', reg: 'idx + 1', del: { l: 1, c1: 25, c2: 31, t: 'idx + 1' }, text: { 1: "print(compute(x), items[], 'done')" }, d: 700, cd: 0 },
      { say: '输入 0，Esc：items[0]。', k: '0⎋', hl: [4], cur: [1, 25], mode: 'NORMAL', text: { 1: "print(compute(x), items[0], 'done')" }, ins: { l: 1, c1: 25, c2: 25 } },
      { say: "f' 跳到单引号。da' 读作 delete · around · ' '。它连引号一起删，还带走了前面的一个空格。寄存器里是 \" 'done'\"。", k: "f'  da'", hl: [5, 6], cur: [1, 28], reg: " 'done'",
        del: { l: 1, c1: 28, c2: 34, t: " 'done'" }, text: { 1: 'print(compute(x), items[0],)' }, d: 800, cd: 0 },
      { say: '0 回到行首。光标不在任何括号里，这时按 ci(。本机 Vim 9.2 往后找到最近的一对括号。print( ) 里的全部内容都被删掉了。', k: '0  ci(⎋', hl: [7, 8], cur: [1, 6], mode: 'NORMAL', reg: 'compute(x), items[0],',
        del: { l: 1, c1: 7, c2: 27, t: 'compute(x), items[0],' }, text: { 1: 'print()' }, d: 900, cd: 0 },
      { say: 'u：撤销，回到上一步的样子。', k: 'u', hl: [9], cur: [1, 7], text: { 1: 'print(compute(x), items[0],)' }, ins: { l: 1, c1: 7, c2: 27 } }
    ]
  });

  /* ---------- 演示 5：修好 FizzBuzz ---------- */
  var FZ = ['def fizz_buzz(limit):', '    for i in range(limit):', '        if i % 3 == 0:', '            print("fizz", end="")', '        if i % 5 == 0:', '            print("fizz", end="")', '        if i % 3 and i % 5:', '            print(i, end="")', '        print()', '', 'def main():', '    fizz_buzz(20)', null];
  var sceneFizz = editorScene({
    name: '修好 FizzBuzz', desc: '讲义的按键序列逐键回放。光标和文本的每个状态，都来自本机 Vim 9.2 的记录。注意节奏：大部分时间在 Normal 模式移动。改的时候进 Insert，改完立刻 Esc。',
    lines: FZ, rows: 13, fs: 15, cw: 9.2, lh: 30, x0: 90, y0: 72, start: [1, 1], my: 500, ew: 520, kx: 740, ky: 90, cx: 420,
    code: { lang: 'text', title: 'lecture.keys（讲义的修复步骤）', src: 'G\no if __name__ == "__main__": main() <Esc>\n/range<CR>\nww\ni 1, <Esc>\ne\na + 1 <Esc>\n:6<CR>\nci" buzz <Esc>\n:w' },
    bg: function (d) { d.text(690, 160, 'bug ①：main 没被调用', { anchor: 'middle', size: 12, color: C.fg3 }); d.text(690, 182, 'bug ②：range 从 0 开始', { anchor: 'middle', size: 12, color: C.fg3 }); d.text(690, 204, 'bug ③：5 的倍数打印 fizz', { anchor: 'middle', size: 12, color: C.fg3 }); },
    steps: [
      { say: 'bug ①：main 从没被调用。G 跳到最后一行（L12，落在第一个非空字符 C5）。', k: 'G', hl: [1], cur: [12, 5], cdur: 900 },
      { say: 'o 开新行并进入 Insert。输入 if __name__ == "__main__": main()，再按 Esc。讲师的 Vim 自动缩进了，他按了退格。回放用的 Vim 没有自动缩进。', k: 'o … ⎋', hl: [2], cur: [13, 33], mode: 'NORMAL',
        text: { 13: 'if __name__ == "__main__": main()' }, ins: { l: 13, c1: 1, c2: 33 }, d: 500 },
      { say: 'bug ②：从 0 开始。/range 回车：搜索，光标跳到第 2 行的 range（C14）。', k: '/range⏎', hl: [3], cur: [2, 14], cmd: '/range', cdur: 900 },
      { say: 'ww：前进两个词（“(” 本身算一个词），到 limit（C20）。也可以写 2w，但小计数时人们常直接连按。', k: 'ww', hl: [4], cur: [2, 20], span: true, cmd: '' },
      { say: 'i 输入 “1, ” 再按 Esc，插在 limit 前面。讲义写的是 1,，这里多敲了一个空格。', k: 'i 1, ⎋', hl: [5], cur: [2, 22], mode: 'NORMAL', text: { 2: '    for i in range(1, limit):' }, ins: { l: 2, c1: 20, c2: 22 } },
      { say: 'e：跳到下一个词的词尾，也就是 limit 的 t（C27）。', k: 'e', hl: [6], cur: [2, 27], span: true },
      { say: 'a（append）：在光标后追加 “ + 1”，再按 Esc。和 l 再 i 效果一样，但省一个键。讲师说这“省了 50%”。', k: 'a + 1⎋', hl: [7], cur: [2, 31], mode: 'NORMAL', text: { 2: '    for i in range(1, limit + 1):' }, ins: { l: 2, c1: 28, c2: 31 } },
      { say: 'bug ③：:6 回车跳到第 6 行（落在第一个非空字符 C13）。', k: ':6⏎', hl: [8], cur: [6, 13], cmd: ':6', cdur: 900 },
      { say: 'ci"：光标不在引号里，Vim 往后找到第一对引号。删掉 fizz，进入 Insert……', k: 'ci"', hl: [9], cur: [6, 20], mode: 'INSERT', cmd: '', reg: 'fizz',
        del: { l: 6, c1: 20, c2: 23, t: 'fizz' }, text: { 6: '            print("", end="")' } },
      { say: '……输入 buzz，Esc（L6 C23）。三个 bug 修完，:w 保存。运行结果是本机实测。', k: 'buzz⎋  :w', hl: [9, 10], cur: [6, 23], mode: 'NORMAL', cmd: ':w',
        text: { 6: '            print("buzz", end="")' }, ins: { l: 6, c1: 20, c2: 23 },
        log: [{ s: '$ python fizz.py | tr \'\\n\' \' \'', at: 900 }, { s: '1 2 fizz 4 buzz fizz 7 8 fizz buzz 11 fizz 13 14 fizzbuzz 16 17 fizz 19 buzz', at: 1400 }],
        eq: [{ s: '讲义这套按键共 70 键（含保存退出 ZZ）', at: 900 }, { s: '练习 2 的“高尔夫”解：64 键', at: 1400 }] }
    ]
  });

  var LEC = { t: '讲义 development-environment', u: 'https://missing.csail.mit.edu/2026/development-environment/' };
  var NOTE = '光标行列、文本和寄存器，都是本机 Vim 9.2 的真实记录。用 vim -Es 回放，没加载任何配置。中间的移动和淡入淡出是示意。';
  VZ.register({ id: 'ch03-modes', title: '模态编辑：同一个 x，三种含义',
    sources: [{ t: '视频 8:05 模态编辑', u: 'https://youtu.be/QnM1nVzrkx8?t=485' }, { t: '视频 9:15 Replace 与 Visual', u: 'https://youtu.be/QnM1nVzrkx8?t=555' }, { t: 'Vim 文档 · vim-modes', u: 'https://vimhelp.org/intro.txt.html#vim-modes' }, LEC],
    note: NOTE, scenes: [sceneModes] });
  VZ.register({ id: 'ch03-motion', title: '移动命令是“名词”：光标怎么走',
    sources: [{ t: '视频 14:34 基本移动', u: 'https://youtu.be/QnM1nVzrkx8?t=874' }, { t: '视频 16:17 gg/G/%/f/t', u: 'https://youtu.be/QnM1nVzrkx8?t=977' }, { t: 'Vim 文档 · motion.txt', u: 'https://vimhelp.org/motion.txt.html' }, LEC],
    note: NOTE, scenes: [sceneMotion] });
  VZ.register({ id: 'ch03-verbs', title: '编辑命令是“动词”：d、c、x、o、u 作用在名词上',
    sources: [{ t: '视频 18:05 编辑命令', u: 'https://youtu.be/QnM1nVzrkx8?t=1085' }, { t: '视频 18:46 d + 移动', u: 'https://youtu.be/QnM1nVzrkx8?t=1126' }, { t: 'Vim 文档 · change.txt', u: 'https://vimhelp.org/change.txt.html' }, LEC],
    note: NOTE, scenes: [sceneVerbs] });
  VZ.register({ id: 'ch03-counts', title: '计数与修饰符：让动作重复、让名词变成“里面 / 整个”',
    sources: [{ t: '视频 19:18 计数', u: 'https://youtu.be/QnM1nVzrkx8?t=1158' }, { t: '视频 19:51 修饰符 ci(', u: 'https://youtu.be/QnM1nVzrkx8?t=1191' }, { t: 'Vim 文档 · text-objects', u: 'https://vimhelp.org/motion.txt.html#text-objects' }, LEC],
    note: NOTE, scenes: [sceneCount, sceneMod] });
  VZ.register({ id: 'ch03-fizz', title: '综合演练：逐键修好 FizzBuzz',
    sources: [{ t: '视频 24:13 FizzBuzz', u: 'https://youtu.be/QnM1nVzrkx8?t=1453' }, { t: '视频 25:37 搜索与 ww', u: 'https://youtu.be/QnM1nVzrkx8?t=1537' }, { t: '视频 27:51 ci"', u: 'https://youtu.be/QnM1nVzrkx8?t=1671' }, LEC],
    note: NOTE + ' 运行输出和按键数，是练习 2 的本机实测。', scenes: [sceneFizz] });
})();
