/* lab08 · 练习里的脚本跑起来时发生了什么
 * 控制台内容全部取自 labs/data/lab08.js 中真跑（Git Bash 5.3 + Python 3.13.5 + Git 2.55）的输出：
 *   ex02-weak / ex02-amend（示例仓库）、ex05-reduce（缩减器）、ex04-a（issue 清单）。
 * 场景 2 中“每个块大小试了几次、哪几次成功”是笔记作者给 reduce.py 临时加打印后在本机统计的（共 50 次运行）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: text, size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, text: text || '', fill: C.bg, stroke: C.line, sw: 1.5, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }

  /* ---------- 场景 1：找出弱提交信息并改写（练习 2） ---------- */
  var LOG = [['4140218', 'update', 1], ['0e606e9', 'Keep pending packets in a list, not a set', 0], ['ff12122', 'Use 1464-byte chunks so packets fit PPPoE links', 0], ['7809933', 'fix', 1], ['bcf0bd0', 'Add chunker that splits payloads into packets', 0]];
  var LY0 = 96, LDY = 46;
  function logObjs() {
    var o = {};
    LOG.forEach(function (c, i) {
      o['r' + i] = B(300, LY0 + i * LDY, 540, 36, '', { fill: C.bg2, stroke: C.line, opacity: 0 });
      o['h' + i] = T(44, LY0 + i * LDY, c[0], { mono: true, size: 13, weight: 700, color: C.warn, opacity: 0 });
      o['s' + i] = T(120, LY0 + i * LDY, c[1], { mono: true, size: 13, opacity: 0 });
      o['n' + i] = T(600, LY0 + i * LDY, '', { mono: true, size: 12, color: C.fg3, anchor: 'end', opacity: 0 });
    });
    o.awk = B(720, 120, 200, 40, "awk 'NF <= 2'", { mono: true, size: 13, fill: C.infoW, stroke: C.info, color: C.info, opacity: 0 });
    o.diff = B(300, 400, 540, 64, '-MAX_IN_FLIGHT = 64   +MAX_IN_FLIGHT = 16', { mono: true, size: 13, fill: C.bg, stroke: C.data, opacity: 0 });
    o.newh = B(720, 400, 200, 40, 'ed8824e', { mono: true, size: 14, fill: C.okW, stroke: C.ok, color: C.ok, opacity: 0 });
    return o;
  }
  var sceneLog = {
    name: '找弱信息并改写', desc: '练习 2：用 awk 从 git log 里筛出只有一两个词的提交信息。看它的 diff，再用 --amend 改写最后一次提交的信息。',
    code: { lang: 'sh', title: '练习 2（ex02-weak / ex02-amend）', src: "git log --format='%h %s' | awk 'NF <= 2'\ngit show HEAD\ngit config user.name 'Ben Bitdiddle'\ngit config user.email ben@example.com\ngit commit -q --amend -F ../ex02/better_msg.txt\ngit log --oneline" },
    dataTitle: '当前这一步',
    data: { 'awk 的 NF': '无', '最新提交': '4140218 update' },
    bg: function (d) {
      d.text(430, 26, 'git log 每行“哈希 + 标题” → awk 数字段 → 只留字段数 ≤ 2 的', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(30, 64, '%h %s', { size: 11.5, mono: true, color: C.fg3 });
    },
    objects: logObjs,
    steps: [
      { say: "git log --format='%h %s' 让每个提交占一行。先是短哈希，再是标题。", hl: [1],
        set: (function () { var s = {}; LOG.forEach(function (c, i) { s['r' + i] = show(i * 120); s['h' + i] = show(i * 120 + 80); s['s' + i] = merge(show(i * 120 + 120), { x: { from: 150, to: 120, delay: i * 120 + 120, dur: 400, ease: 'out' } }); }); return s; })() },
      { say: 'awk 默认按空白切字段，NF 是这一行的字段数。哈希占 1 个，所以 NF ≤ 2 = 标题只有一个词。', data: { 'awk 的 NF': { v: '逐行计算', at: 300 } },
        set: (function () { var s = { awk: merge(show(), { x: { from: 760, to: 720, dur: 500, ease: 'out' } }) }; LOG.forEach(function (c, i) { var nf = 1 + c[1].split(' ').length; s['n' + i] = { text: 'NF=' + nf, opacity: { to: 1, delay: 300 + i * 200, dur: 250 }, color: { to: nf <= 2 ? C.bad : C.fg3, delay: 300 + i * 200, dur: 200 } }; }); return s; })(),
        eq: ['"4140218 update" → NF = 2 √', { s: '"ff12122 Use 1464-byte chunks …" → NF = 9 ×', at: 500 }] },
      { say: '只剩两行：update 和 fix（本机实测）。这就是练习要找的弱提交。它们只说了 what，甚至连 what 都没说。',
        log: ["$ git log --format='%h %s' | awk 'NF <= 2'", { s: '4140218 update', at: 500, cls: 'err' }, { s: '7809933 fix', at: 700, cls: 'err' }],
        set: (function () { var s = {}; LOG.forEach(function (c, i) { s['r' + i] = c[2] ? { fill: { to: C.badW, delay: 300, dur: 300 }, stroke: { to: C.bad, delay: 300, dur: 300 } } : { opacity: { to: 0.35, delay: 300, dur: 300 } }; if (!c[2]) { s['h' + i] = { opacity: { to: 0.35, delay: 300, dur: 300 } }; s['s' + i] = { opacity: { to: 0.35, delay: 300, dur: 300 } }; s['n' + i] = { opacity: { to: 0.35, delay: 300, dur: 300 } }; } }); return s; })(),
        fx: [{ type: 'shake', obj: 'r0', at: 600 }, { type: 'shake', obj: 'r3', at: 800 }] },
      { say: 'git show HEAD 看 update 的 diff：64 → 16。要写出“为什么”，得自己去重建上下文。这正是练习想让你体会的。', hl: [2],
        log: ['$ git show HEAD', { s: '-MAX_IN_FLIGHT = 64', at: 500, cls: 'err' }, { s: '+MAX_IN_FLIGHT = 16', at: 600, cls: 'ok' }],
        set: { diff: merge(show(300), { y: { from: 430, to: 400, delay: 300, dur: 500, ease: 'out' } }), awk: hide() } },
      { say: 'git 隔离了你的配置，就没有身份了。先给这个仓库设一个示例身份，只写进 demo/.git/config。', hl: [3, 4],
        fx: [{ type: 'pulse', obj: 'r0', at: 300, color: C.info }] },
      { say: '--amend 用 better_msg.txt 的内容，替换最后一次提交的信息。得到新提交 ed8824e，旧的 4140218 不在分支上了。', hl: [5, 6],
        log: ['$ git commit -q --amend -F ../ex02/better_msg.txt', { s: 'after:  ed8824e Limit in-flight packets to 16 to match the gateway buffer', at: 700, cls: 'ok' }],
        data: { '最新提交': { v: 'ed8824e Limit in-flight packets…', at: 700 } },
        set: { h0: { text: { to: 'ed8824e', delay: 700 }, color: { to: C.ok, delay: 700, dur: 300 } }, s0: { text: { to: 'Limit in-flight packets to 16 to match…', delay: 700 } },
          r0: { fill: { to: C.okW, delay: 700, dur: 300 }, stroke: { to: C.ok, delay: 700, dur: 300 } }, n0: hide(),
          newh: merge(show(700), { s: { from: 0.8, to: 1, delay: 700, dur: 500, ease: 'back' } }) },
        fx: [{ type: 'flash', obj: 'r0', at: 700, color: C.ok }] },
      { say: '7809933 fix 不在末尾，--amend 改不到它。改更早的提交要用交互式 rebase，属补充。已经推送、别人在用的历史，不该改写。',
        fx: [{ type: 'shake', obj: 'r3', at: 300 }] }
    ]
  };

  /* ---------- 场景 2：reduce.py 的删除循环（练习 5） ---------- */
  var NL = 31, BX = 150, BY0 = 70, BDY = 14.6;
  var REMOVED = [1, 5, 7, 9, 11, 12, 14, 16, 17, 21, 22, 27, 28, 29]; /* 被删掉的原文件行号（5 个非空行 + 9 个空行） */
  function redObjs() {
    var o = {};
    for (var i = 1; i <= NL; i++) o['l' + i] = B(BX, BY0 + (i - 1) * BDY, 200, 11, '', { rx: 2, sw: 1, fill: i === 15 ? C.badW : C.bg2, stroke: i === 15 ? C.bad : C.line });
    o.win = B(BX, BY0 + 7 * BDY, 228, 15 * BDY + 6, '', { fill: 'none', stroke: C.warn, sw: 2.2, rx: 6, opacity: 0 });
    o.run = B(560, 150, 230, 46, 'python -c 候选程序', { mono: true, size: 12.5, fill: C.infoW, stroke: C.info, color: C.info });
    o.verdict = B(560, 230, 230, 40, '', { size: 13, fill: C.bg, stroke: C.line, opacity: 0 });
    o.cnt = T(560, 330, '', { num: 0, pre: '已运行 ', post: ' 次', size: 18, weight: 800, color: C.data, anchor: 'middle' });
    o.left = T(560, 370, '', { num: 31, pre: '剩 ', post: ' 行', size: 16, weight: 750, color: C.fg2, anchor: 'middle' });
    return o;
  }
  function winAt(start, size, at, dur) {
    return { win: { opacity: { to: 1, dur: 200 }, y: { to: BY0 + (start - 1) * BDY + (size - 1) * BDY / 2, delay: at || 0, dur: dur || 500, ease: 'inOut' }, h: { to: size * BDY + 6, delay: at || 0, dur: dur || 500 } } };
  }
  function verdict(ok, text, at) {
    return { verdict: { text: { to: text, delay: at }, opacity: { to: 1, delay: at, dur: 200 }, fill: { to: ok ? C.okW : C.badW, delay: at, dur: 200 }, stroke: { to: ok ? C.ok : C.bad, delay: at, dur: 200 }, color: { to: ok ? C.ok : C.bad, delay: at, dur: 200 } } };
  }
  var sceneReduce = {
    name: 'reduce.py 怎么删', desc: '练习 5 的缩减器先试删大块。删不动就把块减半，最后逐行试。每次都真的运行一遍候选程序，症状还在才接受删除。',
    code: { lang: 'py', title: 'ex05/reduce.py（第 21–35 行）', src: 'lines = open(sys.argv[1], encoding="utf-8").read().splitlines()\nassert still_buggy(lines), "the original program must show the bug"\nsize = len(lines) // 2\nwhile size >= 1:  # try deleting chunks of `size` lines, then smaller chunks\n    i = 0\n    while i < len(lines):\n        trial = lines[:i] + lines[i + size:]\n        if still_buggy(trial):\n            gone = [s.strip() for s in lines[i:i + size] if s.strip()]\n            if gone:  # blank lines are removed silently\n                print("removed:", " / ".join(gone))\n            lines = trial\n        else:\n            i += size\n    size //= 2' },
    dataTitle: '循环变量',
    data: { 'size': '无', 'i': '无', 'len(lines)': 31 },
    bg: function (d) {
      d.text(430, 26, '左：report.py 的 31 行（红色是 bug 所在行）  右：每次尝试都运行一遍', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(560, 110, 'still_buggy(trial)？', { anchor: 'middle', size: 12.5, mono: true, color: C.fg3 });
    },
    objects: redObjs,
    steps: [
      { say: '先用 assert 确认原程序能复现。然后 size = 31 // 2 = 15。', hl: [1, 2, 3],
        data: { 'size': { v: 15, at: 400 } }, eq: '31 // 2 = 15', set: { cnt: { num: { to: 1, dur: 400 } } } },
      { say: 'size = 15：试删第 1 到 15 行。删掉后程序要么报错，要么没症状。拒绝，i 前进 15。', hl: [7, 8, 13, 14],
        data: { 'i': { v: 0, at: 200 } },
        set: merge(winAt(1, 15, 0, 500), verdict(false, '× 拒绝（程序坏了）', 800), { cnt: { num: { to: 2, delay: 600, dur: 300 } } }),
        fx: [{ type: 'shake', obj: 'win', at: 900 }] },
      { say: 'i = 15、30 两块也都删不得。15 行一块太粗，每块里总有必须保留的行。',
        data: { 'i': { v: 30, at: 300 } },
        set: merge(winAt(16, 15, 0, 500), verdict(false, '× 拒绝', 600), { cnt: { num: { to: 4, delay: 400, dur: 800 } } }),
        eq: { s: 'size 15：3 次尝试，全部拒绝', at: 700, cls: 'bad' } },
      { say: 'size 减半为 7，再减半为 3。分别试了 5 次和 11 次，仍然全部失败。', hl: [15],
        data: { 'size': { v: 3, at: 1200 }, 'i': '无' },
        set: merge(winAt(1, 7, 0, 400), { cnt: { num: { to: 20, delay: 400, dur: 1500 } } }, verdict(false, '× 全部拒绝', 900)),
        eq: [{ s: 'size 7：5 次尝试，全部拒绝', at: 500, cls: 'bad' }, { s: 'size 3：11 次尝试，全部拒绝', at: 1200, cls: 'bad' }] },
      { say: 'size = 1：逐行试。第 1 行是文档字符串，删掉后 bug 还在，接受！注意接受时 i 不前进，因为下一行顶上来了。', hl: [8, 9, 10, 11, 12],
        data: { 'size': { v: 1, at: 200 }, 'i': { v: 0, at: 200 }, 'len(lines)': { v: 30, at: 900 } },
        log: ['$ python reduce.py report.py', { s: 'removed: """Print a one-line summary for each CSV export (demo program with a bug)."""', at: 900 }],
        set: merge(winAt(1, 1, 0, 500), verdict(true, '√ 症状还在，接受', 700), { l1: { x: { to: 420, delay: 900, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 1200, dur: 300 } }, cnt: { num: { to: 21, delay: 600, dur: 300 } }, left: { num: { to: 30, delay: 900, dur: 300 } } }),
        fx: [{ type: 'ripple', obj: 'verdict', at: 800, color: C.ok }] },
      { say: '继续逐行删。空行、sales/costs 两行数据、注释、return 0 被一一删掉。其余每一行，删了都会让程序报错或症状消失。',
        data: { 'len(lines)': { v: 17, at: 1200 }, 'i': '…' }, dur: 2000,
        log: [{ s: 'removed: "sales.csv": "region,amount\\nnorth,120\\nsouth,80\\n",', at: 500 }, { s: 'removed: "costs.csv": "item,amount\\nservers,300\\nlicenses,45\\n",', at: 800 }, { s: 'removed: # Turn "sales.csv" into "Sales"', at: 1100 }, { s: 'removed: return 0', at: 1400 }],
        set: (function () {
          var s = merge(verdict(true, '√ 接受 13 次', 1500), { cnt: { num: { to: 50, dur: 1800 } }, left: { num: { to: 17, dur: 1800 } }, win: { y: { to: BY0 + 30 * BDY, dur: 1800, ease: 'linear' } } });
          REMOVED.slice(1).forEach(function (n, k) { s['l' + n] = { x: { to: 420, delay: 150 + k * 120, dur: 500, ease: 'in' }, opacity: { to: 0, delay: 400 + k * 120, dur: 250 } }; });
          return s;
        })(),
        eq: { s: 'size 1：31 次尝试，接受 14 次（5 个非空行 + 9 个空行）', at: 1600, cls: 'ok' } },
      { say: '总共运行了 50 次候选程序，31 行缩到 17 行。剩下的靠人工看懂 bug 后收尾，见练习 5。',
        log: [{ s: '--- reduced.py: 17 lines left ---', at: 300, cls: 'ok' }],
        set: (function () {
          var s = { win: hide(), verdict: hide() }, k = 0;
          for (var i = 1; i <= NL; i++) if (REMOVED.indexOf(i) < 0) { s['l' + i] = { y: { to: BY0 + 40 + k * 20, delay: k * 30, dur: 600, ease: 'inOut' } }; k++; }
          return s;
        })(),
        eq: { s: '3 + 5 + 11 + 31 = 50 次运行', at: 400 } }
    ]
  };

  /* ---------- 场景 3：issue_check.py 逐项匹配（练习 4） ---------- */
  var CK = [['environment', '\\b(os|windows|…|\\d+\\.\\d+)\\b'], ['expected', '\\bexpected\\b'], ['actual', '\\b(actual|instead|got)\\b'], ['steps', '^\\s*1[.)]\\s'], ['tried', '\\b(tried|workaround|…)\\b'], ['example', '^```'], ['searched', '\\b(searched|duplicate|…)']];
  var KY0 = 120, KDY = 50;
  function ckObjs() {
    var o = {};
    CK.forEach(function (c, i) {
      o['k' + i] = B(170, KY0 + i * KDY, 280, 36, c[0] + '  ' + c[1], { mono: true, size: 11.5, fill: C.bg2, stroke: C.line, color: C.fg2 });
      o['a' + i] = T(370, KY0 + i * KDY, '', { size: 18, weight: 800, anchor: 'middle', opacity: 0 });
      o['b' + i] = T(450, KY0 + i * KDY, '', { size: 18, weight: 800, anchor: 'middle', opacity: 0 });
    });
    o.doc = B(690, 300, 260, 300, '', { fill: C.bg2, stroke: C.line, rx: 12 });
    o.docT = T(690, 170, 'issue_bad.txt', { mono: true, size: 13, weight: 700, anchor: 'middle' });
    o.docB = T(690, 300, 'Report is broken!!!', { mono: true, size: 12, anchor: 'middle', color: C.fg2 });
    o.scan = B(690, 200, 240, 14, '', { fill: C.warnW, stroke: 'none', rx: 3, opacity: 0 });
    return o;
  }
  function mark(col, i, ok, at) {
    var s = {}; s[col + i] = { text: { to: ok ? '√' : '×', delay: at }, color: { to: ok ? C.ok : C.bad, delay: at, dur: 0 }, opacity: { to: 1, delay: at, dur: 200 } };
    return s;
  }
  var sceneIssue = {
    name: 'issue_check 逐项', desc: '练习 4 的检查脚本里，清单的每一项是一条正则。对整个 issue 文本搜一遍，找不到就记为缺失。',
    code: { lang: 'py', title: 'ex04/issue_check.py（第 19–25 行）', src: 'for path in sys.argv[1:]:\n    text = open(path, encoding="utf-8").read()\n    missing = [name for name, pat in CHECKS if not re.search(pat, text, re.I | re.M)]\n    print(f"== {path}: {len(CHECKS) - len(missing)}/{len(CHECKS)} items present")\n    for name in missing:\n        print(f"   missing: {name}")\n    print(f"   => at least {len(missing)} follow-up question(s) before anyone can debug it")' },
    dataTitle: '统计',
    data: { 'path': '无', 'len(missing)': '无' },
    bg: function (d) {
      d.text(430, 26, '7 条正则 × 2 份 issue', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(370, 82, 'bad', { anchor: 'middle', size: 12, weight: 700, color: C.bad });
      d.text(450, 82, 'good', { anchor: 'middle', size: 12, weight: 700, color: C.ok });
    },
    objects: ckObjs,
    steps: [
      { say: '读入 issue_bad.txt 的全文。re.I 忽略大小写，re.M 让 ^ 匹配每一行的行首。编号步骤和代码围栏都在行首。', hl: [1, 2],
        data: { 'path': 'ex04/issue_bad.txt' },
        set: { scan: merge(show(), { y: { from: 200, to: 400, dur: 1400, ease: 'linear' } }) } },
      { say: '7 条正则逐一 re.search，一条都没找到。没有版本号、没有 expected，也没有编号步骤和代码块……', hl: [3],
        set: (function () { var s = {}; CK.forEach(function (c, i) { s = merge(s, mark('a', i, false, 200 + i * 170)); }); s.scan = hide(); return s; })(),
        data: { 'len(missing)': { v: 7, at: 1400 } } },
      { say: '于是打印 0/7 和全部 7 个缺失项：维护者至少要追问 7 次。', hl: [4, 5, 6, 7],
        log: ['$ python ex04/issue_check.py ex04/issue_bad.txt ex04/issue_good.txt', { s: '== ex04/issue_bad.txt: 0/7 items present', at: 300 }, { s: '   missing: environment (OS, versions)', at: 450 }, { s: '   missing: expected behaviour', at: 550 }, { s: '   … (共 7 行 missing)', at: 650, cls: 'dim' }, { s: '   => at least 7 follow-up question(s) before anyone can debug it', at: 800, cls: 'err' }] },
      { say: '第二份 issue_good.txt 里，Windows 11 / 3.13.5 命中 environment。“Expected:”和“Actual:”也各自命中……', hl: [1, 2, 3],
        data: { 'path': 'ex04/issue_good.txt', 'len(missing)': '无' },
        set: merge({ docT: { text: 'issue_good.txt' }, docB: { text: 'Report titles lose letters…' }, doc: { stroke: { to: C.ok, dur: 300 } } }, mark('b', 0, true, 400), mark('b', 1, true, 600), mark('b', 2, true, 800)) },
      { say: '“1. Run…”命中编号步骤，```python 命中代码块。“What I tried”和“I searched”也都在，7/7。',
        data: { 'len(missing)': { v: 0, at: 900 } },
        set: merge(mark('b', 3, true, 200), mark('b', 4, true, 400), mark('b', 5, true, 600), mark('b', 6, true, 800)),
        log: [{ s: '== ex04/issue_good.txt: 7/7 items present', at: 900, cls: 'ok' }, { s: '   => at least 0 follow-up question(s) before anyone can debug it', at: 1000 }],
        fx: [{ type: 'burst', obj: 'b6', at: 900, color: C.ok }] },
      { say: '注意这只是粗略的启发式。写了 “Expected:”，不代表写清楚了期望。它帮你查有没有漏项，质量还得靠人读。',
        fx: [{ type: 'pulse', obj: 'k1', at: 300, color: C.warn }] }
    ]
  };

  var RUN = '控制台输出全部是练习生成脚本在本机真跑的结果。长行有省略。方块、窗口等画法是示意。';
  VZ.register({
    id: 'lab08-log', title: '练习 2：筛出弱提交信息，再用 --amend 改写',
    sources: [{ t: '讲义练习 2', u: 'https://missing.csail.mit.edu/2026/beyond-code/#exercises' }, { t: 'git-log 文档（--format）', u: 'https://git-scm.com/docs/git-log' }, { t: 'git-commit 文档（--amend）', u: 'https://git-scm.com/docs/git-commit' }],
    note: RUN, scenes: [sceneLog]
  });
  VZ.register({
    id: 'lab08-issue', title: '练习 4：issue_check.py 逐项匹配清单',
    sources: [{ t: '讲义练习 4', u: 'https://missing.csail.mit.edu/2026/beyond-code/#exercises' }, { t: 'Python re 文档', u: 'https://docs.python.org/3/library/re.html' }],
    note: RUN, scenes: [sceneIssue]
  });
  VZ.register({
    id: 'lab08-reduce', title: '练习 5：reduce.py 的删除循环',
    sources: [{ t: '讲义练习 5', u: 'https://missing.csail.mit.edu/2026/beyond-code/#exercises' }, { t: '视频 24:33 最小复现', u: 'https://youtu.be/2DOEATfXT8k?t=1473' }],
    note: RUN + ' 每个块大小试了几次、哪几次成功，是笔记作者统计的。做法是给 reduce.py 临时加打印，在本机跑一遍，共 50 次运行。', scenes: [sceneReduce]
  });
})();
