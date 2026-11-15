/* lab07 · 练习的“跑”可视化
 * 控制台内容全部取自 labs/data/lab07.js 中真跑（Git Bash 5.3 + Python 3.13 + uv 0.11.26）的输出：
 *   ex01-b（pytest 与 mypy --strict）、ex05-a / ex05-b（把 - 列表标记换成 *）。
 * 第 2 幕的文件行取自课程仓库 _2026/code-quality.md 的真实内容（截短显示）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 12.5, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }

  /* ---------- 练习 1：验收——测试与严格类型检查 ---------- */
  var NX = [165, 320, 475, 630, 780], NY = 200;
  var NODES = ['urlopen(url)', 'response', '.read()', '.decode()', 'return'];
  function tyObjs() {
    var o = { pt: box(430, 90, 360, 40, 'pytest -q test_dl.py', C.info, C.infoW, { mono: true, size: 13 }), dots: { type: 'text', x: 430, y: 130, text: '', size: 16, mono: true, weight: 800, color: C.ok, opacity: 0 }, flow: path('M165,' + (NY + 40) + ' L780,' + (NY + 40), C.warn, { sw: 1.6 }) };
    NODES.forEach(function (n, i) {
      o['n' + i] = box(NX[i], NY, i === 0 ? 130 : 110, 40, n, C.line, C.bg2, { mono: true, size: 12.5, opacity: 0 });
      o['t' + i] = box(NX[i], NY + 70, 84, 30, '', C.bad, C.badW, { mono: true, size: 12.5, opacity: 0 });
      o['u' + i] = box(NX[i], NY + 210, 84, 30, '', C.ok, C.okW, { mono: true, size: 12.5, opacity: 0 });
    });
    o.l1 = { type: 'text', x: 14, y: NY + 70, text: 'dl.py', size: 12.5, weight: 800, mono: true, color: C.bad, anchor: 'start', opacity: 0 };
    o.l2 = { type: 'text', x: 14, y: NY + 210, text: 'dl_cli.py', size: 12.5, weight: 800, mono: true, color: C.ok, anchor: 'start', opacity: 0 };
    o.v1 = { type: 'text', x: 430, y: NY + 120, text: '', size: 13, weight: 700, color: C.bad, opacity: 0 };
    o.v2 = { type: 'text', x: 430, y: NY + 260, text: '', size: 13, weight: 700, color: C.ok, opacity: 0 };
    o.ann = box(475, NY + 165, 210, 28, 'data: bytes = response.read()', C.ok, 'none', { mono: true, size: 11.5, opacity: 0, sw: 1.2 });
    return o;
  }
  function types(prefix, list, at, okColor) {
    var s = {};
    list.forEach(function (t, i) {
      var bad = t === 'Any';
      s[prefix + i] = { text: t, opacity: { to: 1, delay: at + i * 250, dur: 200 }, stroke: { to: bad ? C.bad : C.ok, dur: 0 }, fill: { to: bad ? C.badW : C.okW, dur: 0 }, color: { to: C.fg, dur: 0 } };
    });
    return s;
  }
  var sceneTy = {
    name: '测试与类型检查', desc: '练习 1 的验收标准有两条。测试全部通过，mypy --strict 不报错。原版 dl.py 能跑，却过不了严格类型检查。看看类型是在哪一步“丢掉”的。',
    code: { lang: 'sh', title: 'ex01-b（本机实测）', src: 'python -m pytest -q -p no:cacheprovider test_dl.py\nuv venv -q .venv && uv pip install -q mypy\n.venv/Scripts/mypy --strict dl_cli.py\n.venv/Scripts/mypy --strict dl.py' },
    dataTitle: '验收结果',
    data: { 'pytest': '无', 'mypy dl_cli.py': '无', 'mypy dl.py': '无' },
    legend: [[C.ok, '类型确定 / 通过'], [C.bad, 'Any / 报错'], [C.info, '测试'], [C.warn, '类型沿表达式传播']],
    bg: function (d) {
      d.text(430, 24, '测试管“对不对”，类型检查管“类型说没说清楚”', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: tyObjs,
    steps: [
      { say: '先跑验收测试，4 个用例全部通过。前两个查提取全部链接、只要绝对链接。第三个查命令行能读本地 file:// 文件。第四个查 --help 里有新参数。', hl: [1],
        log: ['$ python -m pytest -q -p no:cacheprovider test_dl.py', { s: '....                                                                     [100%]', at: 900 }, { s: '4 passed in 2.53s', at: 1200 }],
        data: { 'pytest': { v: '4 passed', at: 1200 } },
        set: { dots: { text: '● ● ● ●  4 passed', opacity: { to: 1, delay: 900, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'pt', at: 300, color: C.info }, { type: 'ripple', obj: 'pt', at: 1200, color: C.ok }] },
      { say: 'mypy 只装进沙箱里的 venv（不全局安装）。下载安装用了 -q，所以没有输出。', hl: [2],
        set: (function () { var s = {}; NODES.forEach(function (n, i) { s['n' + i] = { opacity: { to: 1, delay: i * 150, dur: 300 } }; }); return s; })() },
      { say: '原版 dl.py：urlopen 在类型存根里返回 Any。于是 response、read()、decode() 的结果，一路都是 Any。函数却声明返回 str。', hl: [4],
        eq: [{ s: 'urlopen(url) : Any（存根如此）', at: 200 }, { s: 'Any.read() : Any', at: 700 }, { s: 'Any.decode(...) : Any', at: 1200 }, { s: '声明返回 str，实际返回 Any', at: 1700, cls: 'bad' }],
        set: merge(types('t', ['Any', 'Any', 'Any', 'Any', 'str?'], 200), { l1: { opacity: { to: 1, dur: 300 } }, flow: { dash: { to: 1, delay: 100, dur: 1300 } } }),
        fx: [{ type: 'stream', path: 'flow', at: 200, n: 4, dur: 1300, color: C.bad, labels: ['Any', 'Any', 'Any', 'Any'] }] },
      { say: '--strict 包含 --warn-return-any。声明返回 str 的函数却返回 Any，会被当成错误。这是本机实测的结果。代码能运行，但类型检查器没法担保它返回的真是 str。', hl: [4],
        log: ['$ .venv/Scripts/mypy --strict dl.py', { s: 'dl.py:5: error: Returning Any from function declared to return "str"  [no-any-return]', at: 700, cls: 'err' }, { s: 'Found 1 error in 1 file (checked 1 source file)', at: 900, cls: 'err' }],
        data: { 'mypy dl.py': { v: '1 error', at: 700 } },
        set: { v1: { text: 'error: Returning Any … [no-any-return]', opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'shake', obj: 't4', at: 700 }] },
      { say: '手写版 dl_cli.py 多了一个注解：data: bytes = response.read()。从这一步起类型是确定的 bytes，decode 得到 str，与声明一致。', hl: [3],
        eq: [{ s: 'data: bytes = response.read()   # Any 可以赋给 bytes', at: 200 }, { s: 'data.decode("utf-8") : str', at: 800 }, { s: '返回 str，与声明一致', at: 1300, cls: 'ok' }],
        set: merge(types('u', ['Any', 'Any', 'bytes', 'str', 'str'], 300), { l2: { opacity: { to: 1, dur: 300 } }, ann: { opacity: { to: 1, delay: 500, dur: 300 } } }),
        fx: [{ type: 'pulse', obj: 'u2', at: 900, color: C.ok }] },
      { say: 'mypy --strict dl_cli.py：没有问题，验收通过。四种做法都要用这同一把尺子来量。也就是手写、自动补全、行内对话和智能体。', hl: [3],
        log: ['$ .venv/Scripts/mypy --strict dl_cli.py', { s: 'Success: no issues found in 1 source file', at: 700, cls: 'ok' }],
        data: { 'mypy dl_cli.py': { v: 'Success', at: 700 } },
        set: { v2: { text: 'Success: no issues found', opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'u4', at: 800, color: C.ok }, { type: 'burst', obj: 'u4', at: 900, color: C.ok }] }
    ]
  };

  /* ---------- 练习 5：- 列表标记换成 * ---------- */
  var ROWS = [
    ['1', '---', 'front'], ['3', 'title: "Code Quality"', 'plain'], ['16', '- [Formatting](#formatting)', 'bullet'],
    ['47', '```bash', 'fence'], ['48', 'semgrep -l python -e "…"', 'code'], ['49', '```', 'fence'],
    ['101', '- `abc` --- matches the literal "abc".', 'bullet'], ['154', '169.254.1.1 - - [09/Jan/2026…', 'plain']
  ];
  var NAIVE = ['***', 'title: "Code Quality"', '* [Formatting](#formatting)', '```bash', 'semgrep *l python *e "…"', '```', '* `abc` *** matches the literal "abc".', '169.254.1.1 * * [09/Jan/2026…'];
  var GOOD = ['---', 'title: "Code Quality"', '* [Formatting](#formatting)', '```bash', 'semgrep -l python -e "…"', '```', '* `abc` --- matches the literal "abc".', '169.254.1.1 - - [09/Jan/2026…'];
  var RX = 150, RY0 = 110, RS = 46;
  function bulObjs() {
    var o = {
      scan: box(RX - 70, RY0, 26, 30, '▶', C.warn, C.warnW, { size: 12, opacity: 0, trail: { n: 3, gap: 40 } }),
      code: { type: 'text', x: 760, y: 90, text: 'code = 0', size: 14, mono: true, weight: 800, color: C.info, opacity: 0 },
      cnt: { type: 'text', x: 760, y: 130, num: 0, pre: '改动行数 ', size: 14, mono: true, weight: 800, color: C.fg, opacity: 0 }
    };
    ROWS.forEach(function (r, i) {
      o['no' + i] = { type: 'text', x: RX - 30, y: RY0 + i * RS, text: r[0], size: 11.5, mono: true, color: C.fg3, anchor: 'end' };
      o['r' + i] = box(RX, RY0 + i * RS - 16, 440, 32, r[1], C.line, C.bg2, { anchor: 'tl', mono: true, size: 12, weight: 600, rx: 5 });
    });
    return o;
  }
  function rowSet(texts, at, judge) {
    var s = {};
    ROWS.forEach(function (r, i) {
      var j = judge(i), col = j === 'bad' ? C.bad : j === 'ok' ? C.ok : C.line, colW = j === 'bad' ? C.badW : j === 'ok' ? C.okW : C.bg2;
      s['r' + i] = { text: { to: texts[i], delay: at + i * 180 }, stroke: { to: col, delay: at + i * 180, dur: 250 }, fill: { to: colW, delay: at + i * 180, dur: 250 } };
    });
    return s;
  }
  var sceneBul = {
    name: '- 换成 *', desc: '练习 5：把 Markdown 的 - 列表标记换成 *。直接把所有 - 换掉会误伤。只在这种地方换：行首是“- ”，而且不在代码块里。',
    code: { lang: 'sh', title: 'ex05/bullets.sh', src: '#!/bin/bash\n# 练习 5：用命令行工具（而不是让智能体逐行改文件）把 Markdown 的 - 列表标记换成 *\n# 用法：bash bullets.sh 文件.md   （结果写到 文件.md.new，原文件不动）\nset -euo pipefail\nin="$1"\n\n# 只替换“行首（可有缩进）的 - 加空格”；``` 代码块里的行原样保留\nawk \'\n  /^[[:space:]]*```/          { code = !code; print; next }\n  !code && /^[[:space:]]*- /  { sub(/- /, "* ") }\n                              { print }\n\' "$in" > "$in.new"' },
    dataTitle: '对 code-quality.md（166 行）',
    data: { 'sed s/-/*/g 改动': '无', 'bullets.sh 改动': '无', '剩余 - 列表项': '无' },
    legend: [[C.bad, '误改'], [C.ok, '正确替换'], [C.warn, '扫描指针'], [C.info, '代码块标志']],
    bg: function (d) {
      d.text(430, 24, 'code-quality.md 里的几行（行号为原文件行号）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: bulObjs,
    steps: [
      { say: '先看文件里几种含 “-” 的行。有 front matter 的 ---，有列表项。代码块里还有命令行参数。行内有破折号 ---，日志里有 - -。',
        fx: [{ type: 'pulse', obj: 'r0', at: 200, color: C.warn }, { type: 'pulse', obj: 'r6', at: 600, color: C.warn }, { type: 'pulse', obj: 'r7', at: 1000, color: C.warn }] },
      { say: '最天真的做法是 sed \'s/-/*/g\'，把每个 - 都换掉。front matter 变成 ***，Jekyll 不认了。日期、命令参数、破折号，全被改坏。全文 68 行被改（本机实测），其中只有 28 行是该改的。',
        log: ["$ sed 's/-/*/g' code-quality.md > naive.md", "$ diff code-quality.md naive.md | grep -c '^>'", { s: '68', at: 1700, cls: 'err' }],
        data: { 'sed s/-/*/g 改动': { v: '68 行', at: 1700 } },
        set: merge(rowSet(NAIVE, 200, function (i) { return ROWS[i][2] === 'bullet' ? 'ok' : (NAIVE[i] !== ROWS[i][1] ? 'bad' : ''); }), { cnt: { opacity: { to: 1, dur: 200 }, num: { to: 68, delay: 200, dur: 1500 } } }),
        fx: [{ type: 'shake', obj: 'r0', at: 400 }, { type: 'shake', obj: 'r4', at: 1100 }, { type: 'shake', obj: 'r7', at: 1500 }] },
      { say: '换成 awk：从上往下逐行扫描。第 1 行 --- 后面没有空格，不是列表项，原样输出。普通行也原样输出。', hl: [10, 11],
        set: merge(rowSet(GOOD.map(function (t, i) { return ROWS[i][1]; }), 0, function () { return ''; }),
          { cnt: { num: { to: 0, dur: 400 } }, code: { opacity: { to: 1, dur: 300 } }, scan: { opacity: { to: 1, delay: 500, dur: 200 }, y: { from: RY0, to: RY0 + RS, delay: 600, dur: 700 } } }) },
      { say: '第 16 行以“- ”开头，且不在代码块里。sub 把第一个“- ”换成“* ”。', hl: [10],
        set: merge(rowSet(GOOD.map(function (t, i) { return i === 2 ? t : ROWS[i][1]; }), 400, function (i) { return i === 2 ? 'ok' : ''; }),
          { scan: { y: { to: RY0 + 2 * RS, dur: 500 } }, cnt: { num: { to: 1, delay: 700, dur: 300 } } }),
        fx: [{ type: 'ripple', obj: 'r2', at: 800, color: C.ok }] },
      { say: '遇到 ``` 围栏，code 翻转成 1。代码块里的 -l、-e 一个都不碰。遇到结束的 ``` 再翻回 0。', hl: [9],
        set: { scan: { y: { to: RY0 + 5 * RS, dur: 1400, ease: 'linear' } }, code: { text: { to: 'code = 1', delay: 200 }, color: { to: C.warn, delay: 200, dur: 200 } }, r3: { stroke: { to: C.info, delay: 200, dur: 200 } }, r4: { stroke: { to: C.info, delay: 600, dur: 200 } }, r5: { stroke: { to: C.info, delay: 1300, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'code', at: 300, color: C.info }, { type: 'float', obj: 'r4', at: 700, text: '跳过', color: C.info }] },
      { say: '第 101 行：只有行首那个 “- ” 被换掉。后面的破折号 --- 原样保留，因为 sub 只替换第一处。第 154 行虽然有 “- -”，但不在行首，也不动。', hl: [10, 11],
        set: merge({ code: { text: 'code = 0', color: { to: C.info, dur: 0 } }, scan: { y: { to: RY0 + 7 * RS, dur: 900 } } },
          rowSet(GOOD.map(function (t, i) { return (i === 2 || i === 6) ? t : ROWS[i][1]; }), 300, function (i) { return (i === 2 || i === 6) ? 'ok' : ''; })),
        fx: [{ type: 'ripple', obj: 'r6', at: 1500, color: C.ok }] },
      { say: '全文结果：恰好改了 28 行，没有剩下任何“- ”列表项。结果和一行 sed -E 命令逐字节相同。因为这份文件的代码块里，恰好没有列表项。', hl: [12],
        log: ['$ bash bullets.sh code-quality.md', "$ diff code-quality.md code-quality.md.new | grep -c '^>'", { s: '28', at: 600, cls: 'ok' }, "$ grep -c '^[[:space:]]*- ' code-quality.md.new", { s: '0', at: 1100 }, { s: '与一行 sed 的结果相同', at: 1500, cls: 'ok' }],
        data: { 'bullets.sh 改动': { v: '28 行', at: 600 }, '剩余 - 列表项': { v: 0, at: 1100 } },
        set: { scan: { opacity: { to: 0, dur: 300 } }, cnt: { num: { to: 28, delay: 300, dur: 600 }, color: { to: C.ok, delay: 300, dur: 300 } } },
        fx: [{ type: 'burst', x: 760, y: 130, at: 900, color: C.ok }] }
    ]
  };

  VZ.register({
    id: 'lab07-check', title: '练习 1 跑起来：验收测试与严格类型检查',
    sources: [{ t: '讲义开场演示', u: 'https://missing.csail.mit.edu/2026/agentic-coding/' }, { t: 'mypy 文档 · --warn-return-any', u: 'https://mypy.readthedocs.io/en/stable/command_line.html' }],
    note: '控制台是 ex01-b 的本机真跑输出。表达式上方的类型标注，是按 mypy 报错推导的示意。',
    scenes: [sceneTy]
  });
  VZ.register({
    id: 'lab07-bullets', title: '练习 5 跑起来：只换列表标记，不误伤其他的 -',
    sources: [{ t: 'CommonMark · 列表标记', u: 'https://spec.commonmark.org/0.31.2/#bullet-list-marker' }, { t: '讲义练习 5', u: 'https://missing.csail.mit.edu/2026/agentic-coding/#exercises' }],
    note: '控制台数字是 ex05-a 和 ex05-b 的本机真跑输出。舞台上只摘了文件中的 8 行。行号是原文件行号，过长的行截短了。',
    scenes: [sceneBul]
  });
})();
