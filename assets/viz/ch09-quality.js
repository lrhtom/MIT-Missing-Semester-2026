/* ch09 · 代码质量工具链 —— 可视化演示（每个知识点一个演示）
 * 依据：Lecture 9 视频 1:08–7:06（格式化器）、7:06–16:29（linter、noqa、规则文档）、16:29–19:54（semgrep）、
 *       20:30–26:17（测试）、26:51–31:38（覆盖率）、31:38–39:58（性质测试）、39:58–41:45（pre-commit）、41:45–48:37（CI/CD）；
 *       讲义 code-quality.md。
 * 实测：控制台输出来自 labs/data/lab09.js（练习生成脚本 在本机沙箱里真跑 ruff 0.17.3、pre-commit 4.7.0、semgrep 1.182.1、
 *       pytest 9.1.1、coverage 7.14.3 的结果），以及笔记作者在本机 scratch 目录里真跑的 AST 比较与性质测试草稿。
 * 示意：Minilib 是按视频描述重建的示例库；GitHub Actions 的运行画面是示意（本机只跑了 ci_local.sh）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  /* SVG 会吞掉行首空格：缩进换成不换行空格（NBSP）保留下来 */
  function nb(s) { return String(s).replace(/^ +/, function (m) { return Array(m.length + 1).join('\u00a0'); }); }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: nb(text), size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 7, text: text || '', fill: C.bg, stroke: C.line, sw: 1.4, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function P(d, col) { return { type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }; }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }
  var LECT = 'https://missing.csail.mit.edu/2026/code-quality/';
  function yt(t, label) { return { t: '视频 ' + label, u: 'https://youtu.be/XBiLUNx84CQ?t=' + t }; }

  /* ===================== 1. 格式化器 ===================== */
  var FX0 = 40, FCW = 9.2, FY0 = 110, FLH = 46;
  var FL = [
    [['"""A few small utility functions …"""', 0, 0]],
    [['import subprocess', 0, 0]],
    [['    return ', 0, 0], ["'fizz'", 11, 0]],
    [['    return (" "', 0, 0], ['*', 15, 1], ['i + s)[-i:]', 16, 2]],
    [['    return a', 0, 0], ['/', 12, 1], ['b', 13, 2]],
    [['def hypot(a,', 0, 0], ['b):', 12, 1]],
    [['    return sqrt(a', 0, 0], ['*', 17, 1], ['a + b', 18, 2], ['*', 23, 3], ['b)', 24, 4]]
  ];
  function fmtObjs() {
    var o = {};
    FL.forEach(function (ln, i) {
      o['u' + i] = B(FX0 + 150, FY0 + i * FLH, 320, 34, '', { fill: C.warnW, stroke: 'none', opacity: 0 });
      ln.forEach(function (p, j) {
        var lead = p[0].length - p[0].replace(/^ +/, '').length;  /* cw 文本不能带首尾空格：去掉并把起点右移 */
        o['k' + i + '_' + j] = merge(T(FX0 + (p[1] + lead) * FCW, FY0 + i * FLH, '', { mono: true, size: 15, cw: FCW, color: i === 0 ? C.fg3 : C.fg }), { text: p[0].trim() });
        p.lead = lead;
        if (p[2] > (j ? ln[j - 1][2] : 0)) o['g' + i + '_' + j] = B(FX0 + (p[1] + p[2] - 0.5) * FCW, FY0 + i * FLH, FCW + 2, 28, '', { fill: C.warn, stroke: 'none', rx: 3, opacity: 0 });
      });
    });
    o.blank = B(FX0 + 150, FY0 + FLH, 320, 26, '＋ 空行', { fill: C.warnW, stroke: C.warn, color: C.warn, size: 12, opacity: 0 });
    ['Module', '├ Expr（文档字符串）', '├ Import subprocess, os', '├ FunctionDef fizzbuzz', '├ FunctionDef left_pad', '│   └ Return BinOp(*, +)', '└ …（共 9 个顶层节点）'].forEach(function (t, k) {
      o['a' + k] = T(560, 130 + k * 32, t, { mono: true, size: 12.5, color: C.info });
    });
    o.astBox = B(680, 226, 290, 260, '', { fill: 'none', stroke: C.info, sw: 1.6, rx: 12 });
    return o;
  }
  function shiftLine(i, at) {
    var s = {};
    FL[i].forEach(function (p, j) {
      if (p[2]) s['k' + i + '_' + j] = { x: { to: FX0 + (p[1] + (p.lead || 0) + p[2]) * FCW, delay: at, dur: 600, ease: 'out' } };
      if (s['k' + i + '_' + j] && ('g' + i + '_' + j) in fmtCache) s['g' + i + '_' + j] = { opacity: { to: 0.55, delay: at + 400, dur: 250 } };
    });
    return s;
  }
  var fmtCache = fmtObjs();
  var sceneFmt = {
    name: '格式化器', desc: '格式化器只改表面写法，比如引号、空格和空行。程序的意思，也就是语法树，一点不变。',
    code: { lang: 'sh', title: '依次输入（Minilib 示例，本机真跑 ruff 0.17.3）', src: 'ruff format --check --diff src\nruff format src\nruff format --check src\npython -c "import ast; …"   # 比较前后语法树' },
    dataTitle: '格式化',
    data: { '要改的行': '无', '语法树变了吗': '无' },
    bg: function (d) {
      d.text(430, 24, '左：utils.py 里要改的几行  右：Python 解析出的语法树（AST）', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(560, 100, '语法树（示意）', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: fmtCache,
    steps: [
      { say: '--check --diff 只检查，不改文件。它列出想改的地方，退出码非 0。CI 和 pre-commit 就拿它做检查（视频 3:35）。', hl: [1],
        data: { '要改的行': { v: 6, at: 900 } },
        log: ['$ ruff format --check --diff src', { s: "-        return 'fizz'", at: 400, cls: 'err' }, { s: '+        return "fizz"', at: 500 }, { s: '-def hypot(a,b):', at: 700, cls: 'err' }, { s: '+def hypot(a, b):', at: 800 }, { s: '1 file would be reformatted, 1 file already formatted', at: 1100 }],
        set: (function () { var s = {}; for (var i = 1; i < FL.length; i++) s['u' + i] = { opacity: { to: i === 1 ? 0 : 0.6, delay: 150 * i, dur: 250 } }; return s; })() },
      { say: '统一引号。Python 里单双引号等价，ruff 默认统一成双引号。省得大家争论哪个好看。',
        set: { k2_1: { text: { to: '"fizz"', delay: 300 } } }, fx: [{ type: 'flash', x: FX0 + 14 * FCW, y: FY0 + 2 * FLH, at: 300, color: C.warn }, { type: 'float', x: FX0 + 14 * FCW, y: FY0 + 2 * FLH - 10, at: 300, text: "' → \"", color: C.warn }] },
      { say: '二元运算符两边各留一个空格。" "*i 变成 " " * i，a/b 变成 a / b。后面的字符整体右移。',
        set: merge(shiftLine(3, 0), shiftLine(4, 400)) },
      { say: '逗号后面加空格。a*a + b*b 也统一成 a * a + b * b。',
        set: merge(shiftLine(5, 0), shiftLine(6, 300)) },
      { say: '文档字符串后面补一个空行：下面所有行一起往下挪。',
        set: (function () {
          var s = { blank: merge(show(500), { y: { from: FY0 + FLH, to: FY0 + FLH, dur: 0 } }) };
          for (var i = 1; i < FL.length; i++) {
            s['u' + i] = { y: { to: FY0 + (i + 1) * FLH, dur: 600, ease: 'inOut' } };
            FL[i].forEach(function (p, j) { s['k' + i + '_' + j] = { y: { to: FY0 + (i + 1) * FLH, dur: 600, ease: 'inOut' } }; if (('g' + i + '_' + j) in fmtCache) s['g' + i + '_' + j] = { y: { to: FY0 + (i + 1) * FLH, dur: 600, ease: 'inOut' } }; });
          }
          return s;
        })() },
      { say: '改了这么多，语法树完全一样。格式化不改变程序的意思，所以能放心地自动运行。本机用 ast 模块比较了前后，实测相同。', hl: [4],
        data: { '语法树变了吗': { v: '没有', at: 700 } },
        eq: ['before = ast.dump(ast.parse(原文件))', { s: 'after  = ast.dump(ast.parse(格式化后))', at: 400 }, { s: 'before == after → True', at: 800, cls: 'ok' }],
        log: ['$ python -c "import ast; …"', { s: 'same AST: True', at: 800, cls: 'ok' }],
        set: (function () { var s = {}; for (var i = 1; i < FL.length; i++) s['u' + i] = { opacity: { to: 0, dur: 300 } }; s.blank = hide(); return s; })(),
        fx: [{ type: 'pulse', obj: 'astBox', at: 800, color: C.ok }] },
      { say: '去掉 --check 才真正写回文件。再检查一遍，就通过了。ruff、Black、gofmt 故意几乎不给配置项。这样能省掉“自行车棚”式的争论（视频 2:59）。', hl: [2, 3],
        log: ['$ ruff format src', { s: '1 file reformatted, 1 file left unchanged', at: 300 }, { s: '$ ruff format --check src', at: 700 }, { s: '2 files already formatted', at: 1000, cls: 'ok' }],
        data: { '要改的行': { v: 0, at: 1000 } }, fx: [{ type: 'ripple', x: 200, y: 300, at: 900, color: C.ok }] }
    ]
  };
  VZ.register({ id: 'ch09-format', title: '格式化器：只动表面，不动语法树', scenes: [sceneFmt],
    sources: [yt(111, '1:51 格式不一致'), yt(215, '3:35 --check 与修复'), yt(316, '5:16 EditorConfig'), { t: '讲义 Formatting', u: LECT + '#formatting' }, { t: 'Ruff formatter 文档', u: 'https://docs.astral.sh/ruff/formatter/' }],
    note: 'diff 和 ruff 的输出是 lab09 本机真跑的节选。AST 比较是笔记作者在本机用 Python ast 模块真跑的。右侧语法树是简化示意。' });

  /* ===================== 2. Linter ===================== */
  var LR = [['L2', 'import subprocess'], ['L3', 'import os'], ['L4', 'from math import sqrt'], ['L10', '    elif i % 5 == 0:'], ['L24', '        raise ValueError("divide by zero")'], ['L33', '    return subprocess.check_output(f"cat {f}", shell=True)'], ['init', 'from minilib.utils import *']];
  var LY0 = 92, LDY = 56, LX = 92;
  var BADGE = [['I001', 1, true, C.warn], ['F401', 1, true, C.warn], ['RET505', 3, true, C.warn], ['EM101', 4, false, C.bad], ['S602', 5, false, C.bad], ['F403', 6, false, C.bad]];
  function lintObjs() {
    var o = {};
    LR.forEach(function (r, i) {
      o['n' + i] = T(LX - 12, LY0 + i * LDY, r[0], { mono: true, size: 12, color: C.fg3, anchor: 'end' });
      o['r' + i] = T(LX, LY0 + i * LDY, r[1], { mono: true, size: 13 });
    });
    BADGE.forEach(function (b, j) {
      o['b' + j] = B(j === 0 ? 690 : 780, LY0 + b[1] * LDY, j === 0 ? 76 : 90, 26, b[0] + (b[2] ? ' [*]' : ''), { mono: true, size: 12, fill: b[2] ? C.warnW : C.badW, stroke: b[3], color: b[3], opacity: 0, s: 0.6 });
    });
    o.cnt = T(430, 500, '', { num: 0, pre: '剩余问题：', post: ' 个', size: 16, weight: 800, color: C.bad, anchor: 'middle', opacity: 0 });
    return o;
  }
  function gone(j, at) { var s = {}; s['b' + j] = { opacity: { to: 0, delay: at, dur: 300 }, s: { to: 1.3, delay: at, dur: 300 } }; return s; }
  var sceneLint = {
    name: 'linter', desc: 'linter 做静态分析。它不运行代码，却能看出反模式和潜在 bug。有的问题能安全地自动修，有的只能人来改。还有的可以有意忽略。',
    code: { lang: 'sh', title: '依次输入（Minilib 示例，本机真跑）', src: 'ruff check --output-format=concise src\nruff check --fix --output-format=concise src\nruff rule EM101\n# 手工修 EM101 和 S602，给有意保留的 import * 加 noqa\nruff check src' },
    dataTitle: 'ruff check',
    data: { '可自动修复': '无', '需要人工': '无' },
    bg: function (d) { d.text(430, 24, 'utils.py / __init__.py 里被报出的行（右侧是规则编号，[*] = 可自动修复）', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: lintObjs,
    steps: [
      { say: 'ruff check 报了 6 个问题，每条都带规则编号。比如 F401 是导入了没用，S602 是 shell=True 有安全风险。', hl: [1],
        data: { '可自动修复': { v: '3 个', at: 1300 }, '需要人工': { v: '3 个', at: 1300 } },
        log: ['$ ruff check --output-format=concise src', { s: 'src\\minilib\\__init__.py:1:1: F403 `from minilib.utils import *` used; …', at: 300 }, { s: 'src\\minilib\\utils.py:3:8: F401 [*] `os` imported but unused', at: 500 }, { s: 'src\\minilib\\utils.py:10:5: RET505 [*] Unnecessary `elif` after `return` statement', at: 700 }, { s: 'Found 6 errors.', at: 1100 }, { s: '[*] 3 fixable with `--fix` (1 unsafe fix available with `--fix --unsafe-fixes`).', at: 1300 }],
        set: (function () { var s = { cnt: merge(show(200), { num: { to: 6, delay: 200, dur: 1200 } }) }; BADGE.forEach(function (b, j) { s['b' + j] = { opacity: { to: 1, delay: 200 + j * 180, dur: 200 }, s: { to: 1, delay: 200 + j * 180, dur: 450, ease: 'back' } }; }); return s; })() },
      { say: '带 [*] 的 3 个是“安全修复”。排序 import，删掉没用的 import，把多余的 elif 改成 if。改完程序行为不变（视频 10:36）。',
        eq: ['I001：import 按字母排序', { s: 'F401：删除没用到的 os', at: 400 }, { s: 'RET505：return 之后的 elif 改成 if', at: 800 }],
        fx: [{ type: 'pulse', obj: 'b0', at: 200, color: C.warn }, { type: 'pulse', obj: 'b1', at: 500, color: C.warn }, { type: 'pulse', obj: 'b2', at: 800, color: C.warn }] },
      { say: 'ruff check --fix 之后，import os 那一行消失了，elif 变成了 if。剩下 3 个需要人来处理。', hl: [2],
        log: ['$ ruff check --fix --output-format=concise src', { s: 'Found 8 errors (5 fixed, 3 remaining).', at: 1100 }, { s: '1 unsafe fix available with `--fix --unsafe-fixes`.', at: 1200 }],
        set: merge(gone(0, 600), gone(1, 300), gone(2, 900), { r1: { x: { to: LX - 60, dur: 500, ease: 'in' }, opacity: { to: 0, delay: 200, dur: 300 } }, n1: hide(0, 300), r3: { text: { to: nb('    if i % 5 == 0:'), delay: 900 } }, cnt: { num: { to: 3, delay: 600, dur: 700 } } },
          (function () { var s = {}; for (var i = 2; i < LR.length; i++) { s['n' + i] = { y: { to: LY0 + (i - 1) * LDY, delay: 500, dur: 600, ease: 'inOut' } }; } [3, 4, 5].forEach(function (j) { s['b' + j] = { y: { to: LY0 + (BADGE[j][1] - 1) * LDY, delay: 500, dur: 600, ease: 'inOut' } }; }); return s; })(),
          (function () { var s = {}; for (var i = 2; i < LR.length; i++) s['r' + i] = { y: { to: LY0 + (i - 1) * LDY, delay: 500, dur: 600, ease: 'inOut' } }; s.r3.text = { to: nb('    if i % 5 == 0:'), delay: 900 }; return s; })()),
        fx: [{ type: 'burst', x: 160, y: LY0 + LDY, at: 400, color: C.warn }, { type: 'flash', obj: 'r3', at: 900, color: C.ok }] },
      { say: '不懂某条规则？ruff rule EM101 直接给出文档。查什么，为什么不好，怎么改（视频 12:59）。', hl: [3],
        log: ['$ ruff rule EM101', { s: '# raw-string-in-exception (EM101)', at: 300 }, { s: '## Why is this bad?', at: 500 }, { s: 'Python includes the `raise` in the default traceback …', at: 700 }, { s: 'By using a string literal, the error message will be duplicated …', at: 900 }],
        eq: ['回溯里会显示 raise 那一行：raise ValueError("divide by zero")', { s: '下面又打印一遍：ValueError: divide by zero', at: 600 }, { s: '→ 同一句话出现两次。先赋给 msg 变量，就只出现一次', at: 1200 }],
        fx: [{ type: 'pulse', obj: 'b3', at: 300, color: C.bad }] },
      { say: '按文档手工修 EM101：先 msg = "divide by zero"，再 raise ValueError(msg)。',
        set: merge(gone(3, 500), { r4: { text: { to: nb('        msg = "…"; raise ValueError(msg)'), delay: 400 } }, cnt: { num: { to: 2, delay: 500, dur: 400 } } }),
        fx: [{ type: 'flash', obj: 'r4', at: 400, color: C.ok }] },
      { say: 'S602：shell=True 让 shell 解析整条命令。文件名里藏个 ; 就能执行任意命令（视频 14:42）。最好的修法是不调 shell。直接用 Path(f).read_bytes() 读文件。',
        eq: [{ s: 'f = "notes.txt; rm -rf ~"（示意）', at: 200, cls: 'bad' }, { s: 'shell 会执行：cat notes.txt  然后  rm -rf ~', at: 700, cls: 'bad' }],
        set: merge(gone(4, 1200), { r5: { text: { to: nb('    return Path(f).read_bytes()'), delay: 1100 } }, cnt: { num: { to: 1, delay: 1200, dur: 400 } } }),
        fx: [{ type: 'shake', obj: 'r5', at: 600 }, { type: 'flash', obj: 'r5', at: 1100, color: C.ok }] },
      { say: 'F403：这里有意保留 import *，好让包顶层直接导出函数。所以在这一行加 # noqa: F403，关掉这条规则。静态分析不完美，按行豁免很正常（视频 11:46）。', hl: [4, 5],
        log: ['$ ruff check src', { s: 'All checks passed!', at: 800, cls: 'ok' }],
        set: merge(gone(5, 500), { r6: { text: { to: 'from minilib.utils import *  # noqa: F403', delay: 400 } }, cnt: { num: { to: 0, delay: 500, dur: 400 }, color: { to: C.ok, delay: 800, dur: 300 } } }),
        fx: [{ type: 'burst', obj: 'cnt', at: 900, color: C.ok }] }
    ]
  };
  VZ.register({ id: 'ch09-lint', title: 'linter：报告、自动修复、看文档、人工修、按行豁免', scenes: [sceneLint],
    sources: [yt(426, '7:06 linter'), yt(566, '9:26 7 个错误'), yt(706, '11:46 noqa'), yt(779, '12:59 规则文档'), { t: '讲义 Linting', u: LECT + '#linting' }, { t: 'Ruff 规则列表', u: 'https://docs.astral.sh/ruff/rules/' }],
    note: '控制台输出是 lab09 本机真跑的节选。“文件名里藏 ; 执行任意命令”的 f 值是示意。它没有真跑。' });

  /* ===================== 3. semgrep ===================== */
  var SG = [['doc', '"""Calls to subprocess.Popen(..., shell=True) …', 0], ['1', 'subprocess.Popen(cmd, shell=True)', 1], ['2', 'subprocess.Popen(cmd, stdout=…, shell=True)', 1],
    ['3', 'subprocess.Popen(⏎ cmd, ⏎ shell=True, ⏎ )', 1], ['4', 'subprocess.Popen(cmd, shell = True)', 1], ['5', 'P(cmd, shell=True)   # P 就是 Popen', 1],
    ['6', 'subprocess.Popen(cmd, **kw)   # kw 里有 shell', 1], ['7', 'subprocess.Popen(cmd, shell=False)', 0], ['8', '# subprocess.Popen(cmd, shell=True)', 0], ['9', 'print("subprocess.Popen(cmd, shell=True)")', 0]];
  var HIT = { g1: [0, 1, 2, 8, 9], g2: [0, 1, 2, 4, 9], sg: [1, 2, 3, 4, 5] };
  var SGY0 = 96, SGDY = 42, COLX = { g1: 615, g2: 700, sg: 790 };
  function sgObjs() {
    var o = {};
    SG.forEach(function (r, i) {
      o['n' + i] = T(36, SGY0 + i * SGDY, r[0], { mono: true, size: 12, color: C.fg3, anchor: 'end' });
      o['r' + i] = T(46, SGY0 + i * SGDY, r[1], { mono: true, size: 12.5, color: r[2] ? C.fg : C.fg2 });
      ['g1', 'g2', 'sg'].forEach(function (c) { o[c + i] = T(COLX[c], SGY0 + i * SGDY, '', { size: 13, weight: 800, anchor: 'middle', opacity: 0 }); });
    });
    o.scan = B(300, SGY0, 560, 34, '', { fill: C.dataW, stroke: 'none', opacity: 0, rx: 4 });
    o.tree = B(300, SGY0 + 3 * SGDY, 520, 36, 'Call(func=subprocess.Popen, keywords=[shell=True])', { mono: true, size: 12, fill: C.infoW, stroke: C.info, color: C.info, opacity: 0 });
    return o;
  }
  function marks(c, at) {
    var s = {};
    SG.forEach(function (r, i) {
      var hit = HIT[c].indexOf(i) >= 0, txt = hit ? (r[2] ? '√' : '误报') : (r[2] ? '漏' : '·'), col = hit ? (r[2] ? C.ok : C.bad) : (r[2] ? C.warn : C.fg3);
      s[c + i] = { text: txt, color: { to: col, dur: 0 }, opacity: { to: 1, delay: at + i * 120, dur: 200 } };
    });
    return s;
  }
  var sceneSg = {
    name: 'grep vs semgrep', desc: '想禁止 subprocess 的 shell=True，用正则按字符找很脆弱。semgrep 先把代码解析成语法树，再按树的结构匹配。',
    code: { lang: 'sh', title: '依次输入（练习 4 的样本 shell_calls.py，本机真跑）', src: "grep -nE 'subprocess\\.Popen\\(.*shell=True' shell_calls.py\ngrep -nE '^[^#]*Popen\\(.*shell *= *True' shell_calls.py\nsemgrep -l python -e 'subprocess.Popen(..., shell=True, ...)' shell_calls.py" },
    dataTitle: '统计（危险调用共 6 个：1–6）',
    data: { 'grep v1': '无', 'grep v2': '无', 'semgrep': '无' },
    legend: [[C.ok, '找到了真正的危险调用'], [C.bad, '误报'], [C.warn, '漏报'], [C.info, '语法树节点']],
    bg: function (d) {
      d.text(430, 24, 'shell_calls.py 的 10 处“看起来像”的代码', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      [['g1', 'grep v1'], ['g2', 'grep v2'], ['sg', 'semgrep']].forEach(function (c) { d.text(COLX[c[0]], 64, c[1], { anchor: 'middle', size: 12, weight: 700, color: C.fg2 }); });
    },
    objects: sgObjs,
    steps: [
      { say: '样本里 1 到 6 是真正的 shell=True 调用，写法各不相同。7 到 9 和文档字符串只是“长得像”。',
        fx: [{ type: 'pulse', obj: 'r3', at: 300, color: C.warn }, { type: 'pulse', obj: 'r5', at: 600, color: C.warn }, { type: 'pulse', obj: 'r9', at: 900, color: C.bad }] },
      { say: '讲师的第一版正则命中 5 行（视频 17:05）。其中只有 1、2 是真的。注释、字符串、文档字符串全是误报。多行、空格、别名全漏了。', hl: [1],
        log: ["$ grep -nE 'subprocess\\.Popen\\(.*shell=True' shell_calls.py", { s: '1:"""Calls to subprocess.Popen(..., shell=True), …', at: 700 }, { s: '11:subprocess.Popen(cmd, shell=True)  # 1 plain', at: 800 }, { s: '12:subprocess.Popen(cmd, stdout=subprocess.PIPE, shell=True)  # 2 …', at: 900 }, { s: '21:# subprocess.Popen(cmd, shell=True)  # 8 only a comment', at: 1000 }, { s: '22:print("subprocess.Popen(cmd, shell=True)")  # 9 only a string', at: 1100 }],
        data: { 'grep v1': { v: '对 2 · 误报 3 · 漏 4', at: 1500 } },
        set: merge({ scan: { opacity: { to: 1, dur: 200 }, y: { from: SGY0, to: SGY0 + 9 * SGDY, dur: 1300, ease: 'linear' } } }, marks('g1', 100)) },
      { say: '改进版允许 = 两边有空格，还排除了 # 开头的行。4 号找到了，8 号的误报也没了。可多行调用和别名照样漏，字符串照样误报。', hl: [2],
        log: ["$ grep -nE '^[^#]*Popen\\(.*shell *= *True' shell_calls.py", { s: '1:"""Calls to …', at: 600 }, { s: '11:…  12:…  17:subprocess.Popen(cmd, shell = True)', at: 800 }, { s: '22:print("subprocess.Popen(cmd, shell=True)")', at: 1000 }],
        data: { 'grep v2': { v: '对 3 · 误报 2 · 漏 3', at: 1500 } },
        set: merge({ scan: { y: { from: SGY0, to: SGY0 + 9 * SGDY, dur: 1300, ease: 'linear' } } }, marks('g2', 100)),
        eq: ['grep 一次只看一行字符：', { s: '看不出跨行的调用、看不出 P 就是 Popen、分不清代码和字符串', at: 600 }] },
      { say: 'semgrep 先把 Python 解析成语法树。3 号拆成四行的调用，在树上就是一个 Call 节点。注释和字符串根本不是调用（视频 18:44）。',
        set: { scan: hide(), tree: merge(show(300), { s: { from: 0.8, to: 1, delay: 300, dur: 500, ease: 'back' } }), r3: { opacity: { to: 0.3, delay: 300, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'tree', at: 600, color: C.info }] },
      { say: '模式里的 ... 表示“任意参数”。semgrep 找到了 1 到 5。连 from subprocess import Popen as P 这种别名，它也认得出来。', hl: [3],
        log: ["$ semgrep -l python -e 'subprocess.Popen(..., shell=True, ...)' shell_calls.py", { s: '│ 5 Code Findings │', at: 600, cls: 'ok' }, { s: '11┆ subprocess.Popen(cmd, shell=True)  # 1 plain', at: 800 }, { s: '13┆ subprocess.Popen(   …   16┆ )  # 3 split across lines', at: 1000 }, { s: '18┆ P(cmd, shell=True)  # 5 imported under another name', at: 1200 }],
        data: { 'semgrep': { v: '对 5 · 误报 0 · 漏 1', at: 1500 } },
        set: merge({ tree: hide(1200), r3: { opacity: { to: 1, delay: 1200, dur: 300 } } }, marks('sg', 100)) },
      { say: '6 号把 shell=True 藏进字典，再用 **kw 传入。语法树上看不到 shell 关键字，semgrep 也漏了。没有完美的静态分析。它是 linter 的补充，不是替代。',
        eq: ['grep v1：对 2 / 误报 3 / 漏 4', { s: 'grep v2：对 3 / 误报 2 / 漏 3', at: 400 }, { s: 'semgrep：对 5 / 误报 0 / 漏 1', at: 800, cls: 'ok' }],
        fx: [{ type: 'shake', obj: 'sg6', at: 300 }] },
      { say: '实际用途是写项目特有的规则。比如“禁止用 pickle”“禁止 exec”。通用 linter 不会有这些。用 semgrep 几行就能写一条（视频 16:29）。',
        fx: [{ type: 'pulse', obj: 'sg1', at: 200, color: C.ok }, { type: 'pulse', obj: 'sg5', at: 500, color: C.ok }] }
    ]
  };
  VZ.register({ id: 'ch09-semgrep', title: 'grep vs semgrep：按字符找 vs 按语法树找', scenes: [sceneSg],
    sources: [yt(989, '16:29 semgrep'), yt(1057, '17:37 正则很脆弱'), yt(1124, '18:44 换行就失效'), { t: '讲义 Linting', u: LECT + '#linting' }, { t: 'semgrep', u: 'https://github.com/semgrep/semgrep' }],
    note: 'grep 和 semgrep 的输出是 lab09 练习 4 本机真跑的节选。语法树节点的写法是示意。' });

  /* ===================== 4. 测试 ===================== */
  var FB = ['def fizzbuzz(i):', '    if i % 3 == 0:', '        return "fizz"', '    elif i % 5 == 0:', '        return "buzz"', '    elif i % 15 == 0:', '        return "fizzbuzz"', '    else:', '        return str(i)'];
  var TBX = 470, TBY0 = 120, TBDY = 34;
  function testObjs() {
    var o = {
      imp: T(40, 110, 'from minilib import fizzbuzz', { mono: true, size: 12.5, color: C.ok, opacity: 0 }),
      t1a: T(40, 150, 'def test_fizzbuzz_3():', { mono: true, size: 12.5 }),
      t1b: T(40, 176, '    assert fizzbuzz(3) == "fizz"', { mono: true, size: 12.5 }),
      t2a: T(40, 230, 'def test_fizzbuzz_30():', { mono: true, size: 12.5, opacity: 0 }),
      t2b: T(40, 256, '    assert fizzbuzz(30) == "fizzbuzz"', { mono: true, size: 12.5, opacity: 0 }),
      c1: B(200, 163, 340, 70, '', { fill: 'none', stroke: C.line, sw: 2, rx: 10 }),
      c2: B(200, 243, 340, 70, '', { fill: 'none', stroke: C.line, sw: 2, rx: 10, opacity: 0 }),
      res: B(200, 360, 340, 50, '', { size: 14, fill: C.bg, stroke: C.line, opacity: 0 }),
      ptr: T(TBX - 18, TBY0 + TBDY, '▶', { size: 15, color: C.data, opacity: 0, trail: { n: 4, gap: 40 } })
    };
    FB.forEach(function (l, i) { o['f' + i] = T(TBX, TBY0 + i * TBDY, l, { mono: true, size: 13 }); });
    return o;
  }
  function verdict(ok, text, at) { return { res: { text: { to: text, delay: at }, opacity: { to: 1, delay: at, dur: 200 }, fill: { to: ok ? C.okW : C.badW, delay: at, dur: 250 }, stroke: { to: ok ? C.ok : C.bad, delay: at, dur: 250 }, color: { to: ok ? C.ok : C.bad, delay: at, dur: 250 } } }; }
  var ORDER = [0, 5, 6, 1, 2, 3, 4, 7, 8];
  var sceneTest = {
    name: '单元测试', desc: '测试就是另写一段代码，去运行你的代码。结果不符合预期，它就报错。pytest 会自动找出 test_ 开头的函数，逐个运行。',
    code: { lang: 'py', title: 'tests/test_fizzbuzz.py', src: 'from minilib import fizzbuzz\n\n\ndef test_fizzbuzz_3():\n    assert fizzbuzz(3) == "fizz"\n\n\ndef test_fizzbuzz_30():\n    assert fizzbuzz(30) == "fizzbuzz"' },
    dataTitle: 'pytest',
    data: { '通过': 0, '失败': 0 },
    bg: function (d) {
      d.text(430, 24, '左：测试  右：被测函数 fizzbuzz（视频里的版本，分支顺序有 bug）', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.rect(TBX - 26, TBY0 - 24, 380, 9 * TBDY + 14, { fill: C.bg2, stroke: C.line, rx: 10 });
    },
    objects: testObjs,
    steps: [
      { say: '第一个测试：fizzbuzz(3) 应该是 "fizz"。一跑却报 NameError。测试本身就有 bug，忘了 import。讲师在视频 25:09 现场踩过。', hl: [4, 5],
        data: { '失败': { v: 1, at: 900 } },
        log: ['$ python -m pytest -q', { s: 'E   NameError: name \'fizzbuzz\' is not defined', at: 900, cls: 'err' }, { s: '1 failed in 0.95s', at: 1100 }],
        set: merge(verdict(false, 'NameError（测试自己写错了）', 900), { c1: { stroke: { to: C.bad, delay: 900, dur: 300 } } }),
        fx: [{ type: 'shake', obj: 'c1', at: 1000 }] },
      { say: '补上 from minilib import fizzbuzz，再跑：1 passed。', hl: [1],
        data: { '通过': { v: 1, at: 800 }, '失败': { v: 0, at: 800 } },
        log: ['$ python -m pytest -q tests/test_fizzbuzz.py::test_fizzbuzz_3', { s: '1 passed in 0.32s', at: 800, cls: 'ok' }],
        set: merge({ imp: merge(show(200), { x: { from: 0, to: 40, delay: 200, dur: 500, ease: 'out' } }), c1: { stroke: { to: C.ok, delay: 800, dur: 300 } } }, verdict(true, '1 passed', 800)),
        fx: [{ type: 'ripple', obj: 'c1', at: 900, color: C.ok }] },
      { say: '再加一个：30 既是 3 也是 5 的倍数，应得 "fizzbuzz"。失败：实际返回 "fizz"（视频 25:42，本机实测）。', hl: [8, 9],
        data: { '通过': { v: 1, at: 900 }, '失败': { v: 1, at: 900 } },
        log: ['$ python -m pytest -q', { s: ".F", at: 600 }, { s: "E       AssertionError: assert 'fizz' == 'fizzbuzz'", at: 900, cls: 'err' }, { s: '1 failed, 1 passed in 0.96s', at: 1100 }],
        set: merge({ t2a: show(200), t2b: show(300), c2: merge(show(200), { stroke: { to: C.bad, delay: 900, dur: 300 } }) }, verdict(false, "assert 'fizz' == 'fizzbuzz'", 900)),
        fx: [{ type: 'shake', obj: 'c2', at: 1000 }] },
      { say: '跟着 fizzbuzz(30) 走一遍。第一个分支 30 % 3 == 0 已经成立，直接返回 "fizz"。% 15 的分支永远轮不到。',
        set: { ptr: { opacity: { to: 1, dur: 200 }, y: { from: TBY0 + TBDY, to: TBY0 + 2 * TBDY, delay: 700, dur: 400 } }, f1: { color: { to: C.data, delay: 200, dur: 200 } }, f2: { color: { to: C.bad, delay: 900, dur: 200 } }, f5: { opacity: { to: 0.35, delay: 1300, dur: 300 } }, f6: { opacity: { to: 0.35, delay: 1300, dur: 300 } } },
        eq: ['30 % 3 = 0 → 条件成立', { s: '→ return "fizz"，函数结束', at: 900, cls: 'bad' }, { s: '% 15 的分支在 % 3 之后，永远执行不到', at: 1300 }] },
      { say: '修复：把 % 15 的判断挪到最前面。',
        set: (function () { var s = { ptr: hide(), f1: { text: nb('    elif i % 3 == 0:'), color: { to: C.fg, dur: 300 } }, f2: { color: { to: C.fg, dur: 300 } }, f5: { text: nb('    if i % 15 == 0:'), opacity: { to: 1, dur: 300 } }, f6: { opacity: { to: 1, dur: 300 } } };
          ORDER.forEach(function (fi, pos) { s['f' + fi] = merge(s['f' + fi] || {}, { y: { to: TBY0 + pos * TBDY, delay: 200, dur: 800, ease: 'inOut' } }); });
          return s; })(),
        fx: [{ type: 'flash', obj: 'f5', at: 900, color: C.ok }] },
      { say: '重跑，2 passed（本机实测）。从此 test_fizzbuzz_30 就是一个回归测试，英文叫 regression test。这个 bug 再回来，会立刻被抓住。',
        data: { '通过': { v: 2, at: 800 }, '失败': { v: 0, at: 800 } },
        log: ['$ git apply ../ex02/fizzbuzz_fix.diff && python -m pytest -q', { s: '..', at: 500 }, { s: '2 passed in 0.59s', at: 800, cls: 'ok' }],
        set: merge({ c2: { stroke: { to: C.ok, delay: 800, dur: 300 } } }, verdict(true, '2 passed', 800)),
        fx: [{ type: 'burst', obj: 'res', at: 900, color: C.ok }] },
      { say: '按粒度分，单元测试测单个函数，集成测试测模块之间。功能测试测端到端场景。测试驱动开发 TDD 先写测试，再写实现。这段在视频 21:09 到 22:12。',
        eq: ['单元测试：fizzbuzz、left_pad 各自对不对', { s: '集成测试：模块 / 服务之间的配合', at: 400 }, { s: '功能测试：用户场景从头到尾跑通', at: 800 }] }
    ]
  };
  VZ.register({ id: 'ch09-test', title: '单元测试：写测试、跑红、找原因、修到绿', scenes: [sceneTest],
    sources: [yt(1269, '21:09 测试的粒度'), yt(1444, '24:04 pytest 的约定'), yt(1509, '25:09 测试里的 bug'), yt(1542, '25:42 fizzbuzz(30)'), { t: '讲义 Testing', u: LECT + '#testing' }],
    note: '控制台输出是 lab09 本机真跑的，pytest 版本 9.1.1。“1 passed” 那一步也是实测。笔记作者在同一沙箱里单独跑了这个测试。' });

  /* ===================== 5. 覆盖率 ===================== */
  var CV = [[2, 'import subprocess'], [3, 'import os'], [4, 'from math import sqrt'], [7, 'def fizzbuzz(i):'], [8, 'if i % 3 == 0:'], [9, "return 'fizz'"], [10, 'elif i % 5 == 0:'], [11, 'return "buzz"'], [12, 'elif i % 15 == 0:'], [13, 'return "fizzbuzz"'], [15, 'return str(i)'],
    [18, 'def left_pad(s, i):'], [19, 'return (" "*i + s)[-i:]'], [22, 'def divide(a, b):'], [23, 'if b == 0:'], [24, 'raise ValueError(…)'], [25, 'return a/b'], [28, 'def hypot(a,b):'], [29, 'return sqrt(a*a + b*b)'], [32, 'def cat(f):'], [33, 'return subprocess.check_output(…)']];
  var RUN1 = [2, 3, 4, 7, 8, 9, 18, 22, 28, 32];
  var CVY0 = 70, CVDY = 22.2;
  function covObjs() {
    var o = {};
    CV.forEach(function (c, i) {
      o['b' + i] = B(215, CVY0 + i * CVDY, 330, 19, '', { fill: C.bg2, stroke: C.line, sw: 1, rx: 4 });
      o['t' + i] = T(56, CVY0 + i * CVDY, 'L' + c[0] + '  ' + c[1], { mono: true, size: 11.5, color: C.fg2 });
    });
    o.pct = T(640, 150, '', { num: 0, post: '%', size: 54, weight: 800, color: C.data, anchor: 'middle' });
    o.pctL = T(640, 205, 'TOTAL 覆盖率', { size: 13, color: C.fg3, anchor: 'middle' });
    o.bug = B(640, 470, 330, 40, "left_pad('00', 1) == '0'  ← bug 还在", { mono: true, size: 13, fill: C.badW, stroke: C.bad, color: C.bad, opacity: 0 });
    return o;
  }
  function paintRows(lines, col, colW, at, step) {
    var s = {};
    CV.forEach(function (c, i) { if (lines.indexOf(c[0]) >= 0) s['b' + i] = { fill: { to: colW, delay: at + (step || 0) * i, dur: 250 }, stroke: { to: col, delay: at + (step || 0) * i, dur: 250 } }; });
    return s;
  }
  var sceneCov = {
    name: '覆盖率', desc: '覆盖率统计“测试运行时执行到了哪些语句”。它能指出没测到的代码，但覆盖到了不等于测对了。',
    code: { lang: 'sh', title: '依次输入（Minilib 示例，本机真跑 coverage 7.14.3）', src: 'python -m coverage run -m pytest\npython -m coverage report -m\n# 修 fizzbuzz、加 tests/test_more.py 后再来一次\npython -m coverage html\n# 再换成只运行、不断言的 test_useless.py' },
    dataTitle: 'coverage report',
    data: { 'Stmts': 22, 'Miss': '无' },
    bg: function (d) { d.text(430, 24, 'utils.py 的 21 条语句（加上 __init__.py 的 1 条，共 22 条）', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: covObjs,
    steps: [
      { say: 'coverage run 在跑测试的同时记录每条语句有没有执行。import 时执行的 def、import 语句也算“执行到了”。', hl: [1],
        set: paintRows(RUN1, C.ok, C.okW, 200, 60), fx: [{ type: 'ripple', x: 215, y: CVY0, at: 200, color: C.ok }] },
      { say: '没执行到的 11 条标红。除了 fizzbuzz 的 3 和 30 两个用例，别的函数体一行都没跑。', hl: [2],
        data: { 'Miss': { v: 11, at: 700 } },
        log: ['$ python -m coverage report -m', { s: 'src\\minilib\\utils.py         21     11    48%   10-15, 19, 23-25, 29, 33', at: 600 }, { s: 'TOTAL                        22     11    50%', at: 800 }],
        set: merge(paintRows([10, 11, 12, 13, 15, 19, 23, 24, 25, 29, 33], C.bad, C.badW, 200, 40), { pct: { num: { to: 50, delay: 600, dur: 900 } } }),
        eq: ['Cover = (Stmts − Miss) / Stmts', { s: '= (22 − 11) / 22 = 11 / 22 = 50%', at: 700, cls: 'ok' }] },
      { say: '注意 L12 和 L13。明明有 fizzbuzz(30) 的测试，这两行还是红的。它们是永远执行不到的死代码，正是上一节那个 bug。没覆盖的行值得多看一眼。',
        fx: [{ type: 'pulse', obj: 'b8', at: 300, color: C.bad }, { type: 'pulse', obj: 'b9', at: 500, color: C.bad }] },
      { say: '视频里的数字是 18 条语句漏了 9 条，覆盖率 50%。补一个 fizzbuzz(95) == "buzz" 的测试。多覆盖 2 条，升到 61%。这段在视频 27:23 到 28:28。',
        eq: ['视频：(18 − 9) / 18 = 50%', { s: '加 fizzbuzz(95) 后：(18 − 7) / 18 = 11 / 18 ≈ 61.1% → 61%', at: 600 }] },
      { say: '本机修好 fizzbuzz，再加上 test_more.py。它测了 buzz、普通数字、除法、除零、hypot 和 left_pad 补齐。只剩 cat 的 L33 没测，覆盖率 95%。', hl: [3, 4],
        data: { 'Miss': { v: 1, at: 800 } },
        log: ['$ python -m coverage report -m', { s: 'src\\minilib\\utils.py         21      1    95%   33', at: 600 }, { s: 'TOTAL                        22      1    95%', at: 800 }, { s: '$ python -m coverage html', at: 1000 }, { s: 'Wrote HTML report to htmlcov\\index.html', at: 1200 }],
        set: merge(paintRows([10, 11, 12, 13, 15, 19, 23, 24, 25, 29], C.ok, C.okW, 200, 30), { pct: { num: { to: 95, delay: 600, dur: 900 } } }),
        eq: { s: '(22 − 1) / 22 = 95.45% → 95%', at: 800, cls: 'ok' } },
      { say: '再换一个“什么都不检查”的测试。每个函数调一遍，一个 assert 都没有。覆盖率 100%，可 left_pad 的截断 bug 依然在（本机实测）。', hl: [5],
        data: { 'Miss': { v: 0, at: 800 } },
        log: ['$ python -m coverage report', { s: 'TOTAL                        22      0   100%', at: 700 }, { s: ">>> left_pad('00', 1)", at: 1000 }, { s: "'0'", at: 1200, cls: 'err' }],
        set: merge(paintRows([33], C.ok, C.okW, 200), { pct: { num: { to: 100, delay: 500, dur: 600 } }, bug: merge(show(1100), { y: { from: 500, to: 470, delay: 1100, dur: 400, ease: 'out' } }) }),
        fx: [{ type: 'flash', obj: 'b12', at: 1200, color: C.bad }] },
      { say: '覆盖率是个不错的参考指标，也能拿来评估开源项目。但别只盯着它。讲师见过 AI 生成的测试，覆盖率 100%，却几乎毫无用处。这两处在视频 29:08 和 31:05。',
        set: { pct: { color: { to: C.warn, dur: 400 } } }, fx: [{ type: 'pulse', obj: 'bug', at: 300, color: C.bad }] }
    ]
  };
  VZ.register({ id: 'ch09-coverage', title: '覆盖率：手推百分比，也看清它的局限', scenes: [sceneCov],
    sources: [yt(1611, '26:51 代码覆盖率'), yt(1643, '27:23 50%'), yt(1708, '28:28 61%'), yt(1865, '31:05 无用的 100%'), { t: '讲义 Code coverage', u: LECT + '#code-coverage' }, { t: 'coverage.py 文档', u: 'https://coverage.readthedocs.io/' }],
    note: '控制台输出是 lab09 练习 2 本机真跑的。“18 条语句、50% 到 61%”是讲师那份 Minilib 的数字。本机重建的 Minilib 是 22 条语句。' });

  /* ===================== 6. 性质测试 ===================== */
  var SHR = ["('ab0a0baab0abbbba', 5)", "('0abbbba', 5)", "('abbbba', 4)", "('bbba', 2)", "('bba', 1)", "('0a', 1)", "('00', 1)"];
  var sceneProp = {
    name: '性质测试', desc: '不写“这个输入得到这个输出”。改写“对所有输入都该成立的性质”。让库随机生成大量输入去找反例，再把反例缩到最小。',
    code: { lang: 'py', title: '本机实测的标准库草稿（hypothesis 的核心思路，补充）', src: 'def left_pad(s, i):          # Minilib 里的版本\n    return (" " * i + s)[-i:]\n\nprops = {\n    "len(left_pad(s, i)) >= i": lambda s, i: len(left_pad(s, i)) >= i,\n    "s in left_pad(s, i)":      lambda s, i: s in left_pad(s, i),\n}\n# 随机生成 500 组 (s, i)，找到反例后不断尝试更短的 s、更小的 i' },
    dataTitle: '性质',
    data: { '当前性质': '无', '已试输入': 0, '反例': '无' },
    bg: function (d) {
      d.text(430, 24, '随机生成 (s, i) → 检查性质 → 找到反例 → 缩小', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.node(30, 200, 170, 70, '随机生成', 's: 0–20 个字符  i: 0–50', { fill: C.tealW, stroke: C.teal, size: 14 });
    },
    objects: {
      pipe: P('M200,235 C260,235 280,235 330,235', C.teal),
      prop: B(500, 235, 330, 70, '∀ s, i：len(left_pad(s, i)) ≥ i', { mono: true, size: 13, fill: C.infoW, stroke: C.info, color: C.info }),
      cnt: T(500, 300, '', { num: 0, pre: '已通过 ', post: ' 组', size: 15, weight: 750, color: C.ok, anchor: 'middle' }),
      ce: B(500, 360, 300, 40, '', { mono: true, size: 14, fill: C.badW, stroke: C.bad, color: C.bad, opacity: 0, trail: { n: 4, gap: 40 } }),
      lad: T(60, 440, '', { mono: true, size: 12, color: C.fg2, opacity: 0 }),
      fin: B(430, 500, 520, 40, '', { mono: true, size: 13.5, fill: C.bg, stroke: C.bad, opacity: 0 })
    },
    steps: [
      { say: '示例测试只检查你想到的几个输入。性质测试写一条“对所有 s 和 i 都该成立”的性质。比如补齐后的长度至少是 i（视频 34:36）。', hl: [5],
        data: { '当前性质': 'len(left_pad(s, i)) ≥ i' }, set: { pipe: { dash: { to: 1, dur: 600 } } }, fx: [{ type: 'pulse', obj: 'prop', at: 600, color: C.info }] },
      { say: '库随机生成大量输入去试。这条性质在 500 组随机输入上都成立（本机实测）。',
        data: { '已试输入': { v: 500, at: 1500 } },
        log: ['$ python prop.py', { s: 'len(left_pad(s, i)) >= i   -> holds for 500 random inputs', at: 1500, cls: 'ok' }],
        set: { cnt: { num: { to: 500, delay: 200, dur: 1400 } } },
        fx: [{ type: 'stream', path: 'pipe', at: 100, n: 8, dur: 1400, color: C.teal, labels: ["('ab',7)", "('',3)", "('0a0',1)"] }, { type: 'ripple', obj: 'prop', at: 1500, color: C.ok }] },
      { say: '第二条性质：原字符串应该包含在结果里。很快找到反例：s = "ab0a0baab0abbbba"，i = 5。s 有 16 个字符，结果被截断了。', hl: [6],
        data: { '当前性质': 's in left_pad(s, i)', '反例': { v: SHR[0], at: 1100 } },
        set: { prop: { text: '∀ s, i：s in left_pad(s, i)', stroke: { to: C.bad, delay: 1000, dur: 300 } }, cnt: { num: { from: 0, to: 0, dur: 0 }, opacity: { to: 0.3, dur: 300 } },
          ce: merge(show(1000), { text: SHR[0], y: { from: 300, to: 360, delay: 1000, dur: 500, ease: 'out' } }) },
        fx: [{ type: 'stream', path: 'pipe', at: 100, n: 4, dur: 900, color: C.teal }, { type: 'shake', obj: 'prop', at: 1100 }] },
      { say: '原始反例太长，不好调试。库会不断尝试更短的 s、更小的 i。只要性质仍然失败，就接受这个更小的反例。这叫“缩小”，英文是 shrinking。',
        log: [{ s: "  shrink -> ('0abbbba', 5)", at: 400 }, { s: "  shrink -> ('abbbba', 4)", at: 800 }, { s: "  shrink -> ('bbba', 2)", at: 1200 }, { s: "  shrink -> ('bba', 1)", at: 1600 }],
        set: { ce: { text: { to: SHR[4], delay: 1600 } }, lad: merge(show(200), { text: SHR.slice(0, 5).join('  →  ') }) },
        eq: [{ s: SHR[1], at: 400 }, { s: SHR[2], at: 800 }, { s: SHR[3], at: 1200 }, { s: SHR[4], at: 1600 }],
        fx: [{ type: 'pulse', obj: 'ce', at: 400, color: C.warn }, { type: 'pulse', obj: 'ce', at: 800, color: C.warn }, { type: 'pulse', obj: 'ce', at: 1200, color: C.warn }, { type: 'pulse', obj: 'ce', at: 1600, color: C.warn }] },
      { say: '最后停在 ("00", 1)。它和视频里 hypothesis 给出的反例一模一样（视频 39:26）。拿着这个最小反例，bug 一眼就能看出来。',
        data: { '反例': { v: "('00', 1)", at: 600 } },
        log: [{ s: "s in left_pad(s, i)        -> fails: ('ab0a0baab0abbbba', 5), shrunk to ('00', 1)", at: 600, cls: 'err' }],
        set: { ce: { text: { to: SHR[6], delay: 600 } }, fin: merge(show(900), { text: 'left_pad("00", 1) = (" " + "00")[-1:] = "0"' }) },
        eq: [{ s: '(" " * 1 + "00") = " 00"', at: 900 }, { s: '取最后 1 个字符 → "0"，"00" in "0" → False', at: 1300, cls: 'bad' }],
        fx: [{ type: 'burst', obj: 'ce', at: 700, color: C.bad }] },
      { say: '注意，这是随机搜索，不是数学证明。性质只是部分规格。讲师故意写错的实现，照样满足第一条（视频 37:23）。还要记得写 assert。讲师现场忘了，测试永远“通过”（视频 38:19）。',
        eq: ['性质测试 ≠ 证明（只是大量随机试验）', { s: '性质 = 部分规格：能过不代表实现对', at: 500 }, { s: '忘写 assert → 表达式算完就扔，什么都没检查', at: 1000, cls: 'bad' }] }
    ]
  };
  VZ.register({ id: 'ch09-property', title: '性质测试：随机找反例，再把反例缩到最小', scenes: [sceneProp],
    sources: [yt(1934, '32:14 性质测试'), yt(2076, '34:36 写性质'), yt(2299, '38:19 忘了 assert'), yt(2366, '39:26 反例 ("00", 1)'), { t: 'Hypothesis 文档', u: 'https://hypothesis.readthedocs.io/' }],
    note: '本机没有安装 hypothesis。练习不要求，按规范也不额外安装。右侧代码是笔记作者写的 30 行标准库草稿。控制台是它的真跑输出。它只模仿“随机生成加缩小”的思路，不是 hypothesis 本身。' });

  /* ===================== 7. pre-commit 钩子 ===================== */
  var HX = { wt: 100, ix: 270, hk: 470, cm: 720 }, HY = 250;
  var sceneHook = {
    name: 'pre-commit', desc: 'pre-commit 钩子在 git 真正创建提交之前运行检查。任何一项失败，也就是退出码非 0，git 就拒绝这次提交。',
    code: { lang: 'sh', title: '依次输入（Minilib 示例，本机真跑 pre-commit 4.7.0）', src: "pre-commit install\nprintf '\\n\\ndef double(x):\\n    return x*2\\n' >> src/minilib/utils.py\ngit add -A\ngit commit -m 'Add double()'\nruff format src\ngit add -A\ngit commit -q -m 'Add double()' && git log --oneline\n# 应急跳过钩子：git commit --no-verify" },
    dataTitle: '这次 git commit',
    data: { 'ruff format --check': '无', 'ruff check': '无', '提交': '无' },
    bg: function (d) {
      d.text(430, 24, '工作区 → 暂存区 → 【pre-commit 钩子】 → 提交', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.node(HX.wt - 70, HY - 40, 140, 80, '工作区', '你改的文件', { fill: C.bg2, stroke: C.line });
      d.node(HX.ix - 70, HY - 40, 140, 80, '暂存区', 'git add', { fill: C.bg2, stroke: C.teal });
      d.rect(HX.hk - 100, HY - 95, 200, 190, { fill: C.infoW, stroke: C.info, rx: 14, sw: 1.6 });
      d.text(HX.hk, HY - 76, '.git/hooks/pre-commit', { anchor: 'middle', size: 12, mono: true, color: C.info, weight: 700 });
      d.node(HX.cm - 70, HY - 40, 140, 80, '提交历史', 'git log', { fill: C.bg2, stroke: C.line });
      d.line(HX.wt + 72, HY, HX.ix - 74, HY, { arrow: 'fg3', stroke: C.line });
      d.line(HX.ix + 72, HY, HX.hk - 104, HY, { arrow: 'fg3', stroke: C.line });
      d.line(HX.hk + 102, HY, HX.cm - 74, HY, { arrow: 'fg3', stroke: C.line });
    },
    objects: {
      inst: B(HX.hk, 120, 190, 28, 'pre-commit install', { mono: true, size: 12, fill: C.bg, stroke: C.info, color: C.info, opacity: 0 }),
      h1: B(HX.hk, HY - 30, 176, 36, 'ruff format --check', { mono: true, size: 12, fill: C.bg, stroke: C.line }),
      h2: B(HX.hk, HY + 30, 176, 36, 'ruff check', { mono: true, size: 12, fill: C.bg, stroke: C.line }),
      chip: B(HX.wt, HY + 80, 120, 30, 'return x*2', { mono: true, size: 12.5, fill: C.warnW, stroke: C.warn, opacity: 0, trail: { n: 5, gap: 40 } }),
      k1: B(HX.cm, HY + 70, 130, 28, '0277a3d Import…', { mono: true, size: 11.5, fill: C.bg2, stroke: C.line }),
      k2: B(HX.cm, HY + 104, 130, 28, '4d26b19 Add double()', { mono: true, size: 11.5, fill: C.okW, stroke: C.ok, opacity: 0 }),
      skip: { type: 'path', d: 'M' + HX.ix + ',' + (HY - 44) + ' C' + HX.ix + ',' + (HY - 170) + ' ' + HX.cm + ',' + (HY - 170) + ' ' + HX.cm + ',' + (HY - 44), stroke: C.bad, sw: 2, dash: 0, arrow: 'atk' },
      skipL: T(HX.hk, HY - 182, 'git commit --no-verify：绕过钩子', { size: 12.5, weight: 700, color: C.bad, anchor: 'middle', opacity: 0 })
    },
    steps: [
      { say: 'pre-commit install 在每个克隆里只需运行一次。它把 .git/hooks/pre-commit 写好。之后每次 git commit，都会先调用它（视频 40:32）。', hl: [1],
        log: ['$ pre-commit install', { s: 'pre-commit installed at .git\\hooks\\pre-commit', at: 600 }],
        set: { inst: merge(show(200), { y: { from: 90, to: 120, delay: 200, dur: 500, ease: 'back' } }) }, fx: [{ type: 'pulse', x: HX.hk, y: HY, at: 700, color: C.info }] },
      { say: '新加一个函数 double()，里面的 x*2 没按格式写。git add 把它放进暂存区。', hl: [2, 3],
        set: { inst: hide(400), chip: merge(show(), { x: { from: HX.wt, to: HX.ix, delay: 500, dur: 700, ease: 'inOut' }, y: { from: HY + 80, to: HY + 62, delay: 500, dur: 700, ease: 'inOut' } }) } },
      { say: 'git commit：在打开编辑器、创建提交之前，先跑钩子。ruff format --check 失败，ruff check 通过。', hl: [4],
        data: { 'ruff format --check': { v: 'Failed', at: 900 }, 'ruff check': { v: 'Passed', at: 1300 } },
        log: ["$ git commit -m 'Add double()'", { s: 'ruff format --check......................................................Failed', at: 900, cls: 'err' }, { s: '37 +     return x * 2', at: 1100 }, { s: 'ruff check...............................................................Passed', at: 1300 }],
        set: { chip: { x: { to: HX.hk, dur: 600, ease: 'inOut' }, y: { to: HY, dur: 600, ease: 'inOut' } }, h1: { fill: { to: C.badW, delay: 900, dur: 250 }, stroke: { to: C.bad, delay: 900, dur: 250 } }, h2: { fill: { to: C.okW, delay: 1300, dur: 250 }, stroke: { to: C.ok, delay: 1300, dur: 250 } } },
        fx: [{ type: 'shake', obj: 'h1', at: 950 }] },
      { say: '有一个钩子退出码非 0，git 就不创建提交。本机实测 commit exit=1。改动还留在暂存区，等你修。',
        data: { '提交': { v: '被拒绝（exit=1）', at: 400 } },
        log: [{ s: 'commit exit=1', at: 400, cls: 'err' }],
        set: { chip: { x: { to: HX.ix, dur: 700, ease: 'back' }, y: { to: HY + 62, dur: 700, ease: 'back' }, fill: { to: C.badW, dur: 300 }, stroke: { to: C.bad, dur: 300 } } },
        fx: [{ type: 'burst', x: HX.hk + 100, y: HY, at: 200, color: C.bad }] },
      { say: 'ruff format 把 x*2 改成 x * 2，再 git add。', hl: [5, 6],
        log: ['$ ruff format src', { s: '1 file reformatted, 1 file left unchanged', at: 500 }],
        set: { chip: { text: { to: 'return x * 2', delay: 500 }, fill: { to: C.okW, delay: 500, dur: 300 }, stroke: { to: C.ok, delay: 500, dur: 300 } }, h1: { fill: { to: C.bg, dur: 300 }, stroke: { to: C.line, dur: 300 } }, h2: { fill: { to: C.bg, dur: 300 }, stroke: { to: C.line, dur: 300 } } },
        fx: [{ type: 'flash', obj: 'chip', at: 500, color: C.ok }] },
      { say: '再提交，两个钩子都通过，提交 4d26b19 创建成功。团队里每个人的每次提交，都过同样的检查。没人会忘了跑格式化（视频 41:05）。', hl: [7],
        data: { 'ruff format --check': { v: 'Passed', at: 700 }, 'ruff check': { v: 'Passed', at: 900 }, '提交': { v: '4d26b19', at: 1700 } },
        log: [{ s: 'ruff format --check......................................................Passed', at: 700, cls: 'ok' }, { s: 'ruff check...............................................................Passed', at: 900, cls: 'ok' }, { s: '4d26b19 Add double()', at: 1700 }, { s: '0277a3d Import minilib', at: 1800 }],
        set: { chip: { x: { to: HX.cm, delay: 1100, dur: 700, ease: 'inOut' }, y: { to: HY + 104, delay: 1100, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 1750, dur: 200 } },
          h1: { fill: { to: C.okW, delay: 700, dur: 250 }, stroke: { to: C.ok, delay: 700, dur: 250 } }, h2: { fill: { to: C.okW, delay: 900, dur: 250 }, stroke: { to: C.ok, delay: 900, dur: 250 } }, k2: show(1700) },
        fx: [{ type: 'ripple', obj: 'k2', at: 1800, color: C.ok }] },
      { say: '钩子可以用 --no-verify 跳过（视频 41:45）。本机实测，带着两个 lint 错误也提交成功了。本地钩子挡不住所有人。还得靠 CI 在服务器上再查一遍。', hl: [8],
        log: ["$ git commit -q -am 'WIP' --no-verify && git log --oneline", { s: '77c80a4 WIP', at: 900, cls: 'err' }, { s: '$ ruff check --output-format=concise src', at: 1200 }, { s: 'Found 2 errors.', at: 1500, cls: 'err' }],
        set: { skip: { dash: { to: 1, dur: 900 } }, skipL: show(500) },
        fx: [{ type: 'stream', path: 'skip', at: 400, n: 2, dur: 900, color: C.bad, labels: ['WIP'] }] }
    ]
  };
  VZ.register({ id: 'ch09-hook', title: 'pre-commit 钩子：提交之前的最后一道检查', scenes: [sceneHook],
    sources: [yt(2398, '39:58 pre-commit 钩子'), yt(2465, '41:05 被拒绝的提交'), yt(2505, '41:45 跳过钩子'), { t: '讲义 Pre-commit hooks', u: LECT + '#pre-commit-hooks' }, { t: 'pre-commit 文档', u: 'https://pre-commit.com/' }, { t: 'Git Hooks（Pro Git）', u: 'https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks' }],
    note: '控制台输出是 lab09 练习 1 本机真跑的节选。示例身份 Alyssa P. Hacker 和 Minilib 内容是示意。' });

  /* ===================== 8. CI ===================== */
  var MX = [['ubuntu', '3.10'], ['ubuntu', '3.13'], ['windows', '3.10'], ['windows', '3.13'], ['macos', '3.10'], ['macos', '3.13']];
  var JX = 470;
  function ciObjs() {
    var o = {
      push: B(80, 110, 110, 32, 'push', { mono: true, size: 13, fill: C.dataW, stroke: C.data, color: C.data }),
      pr: B(80, 170, 110, 32, 'pull_request', { mono: true, size: 12, fill: C.bg, stroke: C.line, color: C.fg2 }),
      cron: B(80, 230, 110, 32, 'schedule', { mono: true, size: 12.5, fill: C.bg, stroke: C.line, color: C.fg2 }),
      wf: B(250, 200, 110, 70, 'ci.yml', { mono: true, size: 14, fill: C.infoW, stroke: C.info, color: C.info }),
      pIn: P('M136,110 C180,110 180,190 194,195', C.data),
      pF: P('M306,190 C360,150 380,110 ' + (JX - 92) + ',110', C.data), pL: P('M306,200 C360,200 380,200 ' + (JX - 92) + ',200', C.data), pT: P('M306,212 C360,260 380,330 ' + (JX - 92) + ',330', C.data),
      jF: B(JX, 110, 180, 54, 'format', { size: 14, fill: C.bg2, stroke: C.line }),
      jL: B(JX, 200, 180, 54, 'lint', { size: 14, fill: C.bg2, stroke: C.line }),
      jT: B(JX, 345, 180, 150, '', { fill: C.bg2, stroke: C.line }),
      jTl: T(JX, 285, 'test（矩阵）', { size: 14, weight: 650, anchor: 'middle' }),
      badge: B(735, 110, 170, 32, 'CI | —', { mono: true, size: 13, fill: C.bg, stroke: C.line, color: C.fg2 }),
      prc: B(735, 230, 170, 100, '', { size: 12, fill: C.bg, stroke: C.line, opacity: 0 }),
      prT: T(735, 200, 'PR 页面上的检查', { size: 12, anchor: 'middle', color: C.fg3, opacity: 0 }),
      dep: B(735, 420, 170, 44, '部署 GitHub Pages', { size: 12.5, fill: C.bg, stroke: C.teal, color: C.teal, opacity: 0 })
    };
    ['F', 'L'].forEach(function (j, r) { for (var k = 0; k < 4; k++) o['d' + j + k] = { type: 'circle', x: JX - 54 + k * 36, y: (r ? 200 : 110) + 18, r: 6, fill: C.bg3, stroke: C.line, sw: 1.2 }; });
    MX.forEach(function (m, i) { o['m' + i] = B(JX - 44 + (i % 2) * 88, 315 + Math.floor(i / 2) * 36, 82, 28, m[0] + ' ' + m[1], { mono: true, size: 11, fill: C.bg, stroke: C.line, opacity: 0, s: 0.6 }); });
    return o;
  }
  function stepsRun(j, at, ok) {
    var s = {};
    for (var k = 0; k < 4; k++) s['d' + j + k] = { fill: { to: (k < 3 || ok) ? C.ok : C.bad, delay: at + k * 220, dur: 150 }, stroke: { to: (k < 3 || ok) ? C.ok : C.bad, delay: at + k * 220, dur: 150 } };
    s['j' + j] = { stroke: { to: ok ? C.ok : C.bad, delay: at + 900, dur: 250 }, fill: { to: ok ? C.okW : C.badW, delay: at + 900, dur: 250 } };
    return s;
  }
  function matrixRun(at, ok) { var s = {}; MX.forEach(function (m, i) { s['m' + i] = { fill: { to: ok ? C.okW : C.badW, delay: at + i * 150, dur: 200 }, stroke: { to: ok ? C.ok : C.bad, delay: at + i * 150, dur: 200 } }; }); return s; }
  var sceneCi = {
    name: 'CI 流水线', desc: '持续集成在远程机器上跑格式检查、lint 和测试。每次 push、每个 PR 都会触发，也能定时跑。结果显示在仓库和 PR 页面上。',
    code: { lang: 'yaml', title: '.github/workflows/ci.yml（练习 3）', src: 'name: CI\non:\n  push:\n  pull_request:\n  schedule:\n    - cron: "0 9 * * 1"\njobs:\n  format:   # checkout → setup-python → pip install ruff → ruff format --check .\n  lint:     # checkout → setup-python → pip install ruff → ruff check .\n  test:\n    strategy:\n      matrix:\n        os: [ubuntu-latest, windows-latest, macos-latest]\n        python-version: ["3.10", "3.13"]\n    runs-on: ${{ matrix.os }}' },
    dataTitle: '这次运行',
    data: { '触发': '无', '作业数': '无', '状态': '无' },
    legend: [[C.data, '触发事件 / 数据流'], [C.info, '工作流'], [C.ok, '通过'], [C.bad, '失败'], [C.teal, '部署']],
    bg: function (d) { d.text(430, 24, '触发事件 → 工作流 → 并行的作业 → 每个作业里的步骤', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: ciObjs,
    steps: [
      { say: 'git push 触发工作流。也可以由 pull request 或定时任务触发（视频 44:49）。', hl: [2, 3, 4, 5, 6],
        data: { '触发': 'push' },
        set: { pIn: { dash: { to: 1, dur: 600 } } }, fx: [{ type: 'stream', path: 'pIn', at: 300, n: 3, dur: 900, color: C.data, labels: ['push'] }, { type: 'ripple', obj: 'wf', at: 1200, color: C.info }] },
      { say: '工作流里的作业并行启动。每个作业在一台全新的虚拟机上从头开始。检出代码，装 Python，装工具，运行命令（视频 45:55）。', hl: [7, 8, 9],
        data: { '作业数': '3 类' },
        set: { pF: { dash: { to: 1, dur: 600 } }, pL: { dash: { to: 1, delay: 100, dur: 600 } }, pT: { dash: { to: 1, delay: 200, dur: 600 } } },
        fx: [{ type: 'stream', path: 'pF', at: 300, n: 2, dur: 800, color: C.data }, { type: 'stream', path: 'pL', at: 400, n: 2, dur: 800, color: C.data }, { type: 'stream', path: 'pT', at: 500, n: 2, dur: 800, color: C.data }] },
      { say: 'format 和 lint 作业逐步执行，四个步骤都成功，作业变绿。CI 只“检查”不“修改”。格式不对，就让作业失败（讲义）。本机用 ci_local.sh 跑的是同样的命令。', hl: [8, 9],
        log: ['$ bash ../ex03/ci_local.sh', { s: '[PASS] format', at: 1000, cls: 'ok' }, { s: '[PASS] lint', at: 1500, cls: 'ok' }],
        set: merge(stepsRun('F', 100, true), stepsRun('L', 600, true)) },
      { say: 'test 作业有矩阵。3 种系统乘 2 个 Python 版本，展开成 6 个并行作业。这种又长又多的活，最适合交给 CI（视频 42:56）。', hl: [10, 11, 12, 13, 14, 15],
        data: { '作业数': { v: '2 + 6 = 8 个', at: 900 } },
        eq: ['矩阵 = os × python-version', { s: '= 3 × 2 = 6 个 test 作业', at: 600 }, { s: '加上 format、lint：共 8 个作业，并行跑', at: 1000 }],
        set: (function () { var s = {}; MX.forEach(function (m, i) { s['m' + i] = { opacity: { to: 1, delay: 200 + i * 120, dur: 200 }, s: { to: 1, delay: 200 + i * 120, dur: 400, ease: 'back' } }; }); return s; })() },
      { say: '6 个测试作业都通过，工作流变绿。README 上的状态徽章显示 passing（讲义）。',
        data: { '状态': { v: '全部通过', at: 1200 } },
        log: [{ s: '[PASS] test', at: 900, cls: 'ok' }, { s: 'exit=0', at: 1100 }],
        set: merge(matrixRun(100, true), { jT: { stroke: { to: C.ok, delay: 1000, dur: 250 } }, badge: { text: { to: 'CI | passing', delay: 1200 }, fill: { to: C.okW, delay: 1200, dur: 300 }, stroke: { to: C.ok, delay: 1200, dur: 300 }, color: { to: C.ok, delay: 1200, dur: 300 } } }),
        fx: [{ type: 'burst', obj: 'badge', at: 1300, color: C.ok }] },
      { say: '练习 3 故意加一行没用的 import os，再 push。lint 作业失败，整个工作流变红。如果是 PR，结果直接挂在 PR 页面上（视频 46:57）。',
        data: { '触发': 'pull_request', '状态': { v: 'lint 失败', at: 1300 } },
        log: ["$ sed -i '3a import os' src/minilib/utils.py", { s: '$ bash ../ex03/ci_local.sh', at: 300 }, { s: '[PASS] format', at: 600 }, { s: '[FAIL] lint', at: 900, cls: 'err' }, { s: '       src\\minilib\\utils.py:4:8: F401 [*] `os` imported but unused', at: 1000 }, { s: '[PASS] test', at: 1200 }, { s: 'exit=1', at: 1300, cls: 'err' }],
        set: merge(stepsRun('L', 300, false), { pr: { fill: { to: C.dataW, dur: 300 }, stroke: { to: C.data, dur: 300 }, color: { to: C.data, dur: 300 } },
          badge: { text: { to: 'CI | failing', delay: 1300 }, fill: { to: C.badW, delay: 1300, dur: 300 }, stroke: { to: C.bad, delay: 1300, dur: 300 }, color: { to: C.bad, delay: 1300, dur: 300 } },
          prc: merge(show(1300), { text: '√ format   × lint   √ test×6' }), prT: show(1300) }),
        fx: [{ type: 'stream', path: 'pIn', at: 100, n: 2, dur: 700, color: C.data, labels: ['PR'] }, { type: 'shake', obj: 'jL', at: 1300 }] },
      { say: '定时触发能抓住“依赖悄悄发布了破坏性更新”。持续部署 CD 更进一步，检查通过后自动发布。比如 Missing Semester 网站，每次 push 后自动构建。构建好就部署到 GitHub Pages（视频 48:04）。',
        set: merge(stepsRun('L', 100, true), { cron: { stroke: { to: C.warn, dur: 300 }, color: { to: C.warn, dur: 300 } }, dep: merge(show(1100), { y: { from: 450, to: 420, delay: 1100, dur: 500, ease: 'out' } }),
          badge: { text: { to: 'CI | passing', delay: 900 }, fill: { to: C.okW, delay: 900, dur: 300 }, stroke: { to: C.ok, delay: 900, dur: 300 }, color: { to: C.ok, delay: 900, dur: 300 } }, prc: { text: { to: '√ format   √ lint   √ test×6', delay: 900 } } }),
        fx: [{ type: 'pulse', obj: 'cron', at: 200, color: C.warn }, { type: 'ripple', obj: 'dep', at: 1400, color: C.teal }] }
    ]
  };
  VZ.register({ id: 'ch09-ci', title: 'CI：触发 → 作业 → 步骤，以及矩阵', scenes: [sceneCi],
    sources: [yt(2542, '42:22 触发方式'), yt(2576, '42:56 测试矩阵'), yt(2689, '44:49 工作流文件'), yt(2817, '46:57 PR 上的结果'), yt(2853, '47:33 持续部署'), { t: '讲义 Continuous integration', u: LECT + '#continuous-integration' }, { t: 'GitHub Actions 文档', u: 'https://docs.github.com/en/actions' }],
    note: '控制台是 lab09 练习 3 用 ci_local.sh 在本机真跑的结果。GitHub Actions 上的作业、徽章和 PR 检查画面是示意。本页没有推送到 GitHub。' });
})();
