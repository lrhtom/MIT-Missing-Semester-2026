/* lab09 · 练习里的脚本跑起来时发生了什么（每个演示挂在对应练习下）
 * 控制台内容全部取自 labs/data/lab09.js 中真跑（Git Bash 5.3、Python 3.13.5、ruff 0.17.3、GNU sed 4.9）的输出：
 *   ex03-pass / ex03-break（ci_local.sh）、ex05-count / ex05-naive / ex05-right（项目符号替换）、ex06-regex / ex06-json（提取名字）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: text, size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 7, text: text || '', fill: C.bg, stroke: C.line, sw: 1.4, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }
  var RUN = '控制台输出都是练习生成脚本在本机真跑的结果。长行有省略。方块与光标是示意。';

  /* ---------- 练习 3：ci_local.sh ---------- */
  var JOBS = ['format', 'lint', 'test'];
  var sceneCi = {
    name: 'ci_local.sh', desc: '练习 3 的本地 CI 依次运行三个“作业”。每个作业的输出先收集起来。成功打 PASS，失败打 FAIL 并显示最后几行。最后以“有没有失败”作为退出码。',
    code: { lang: 'sh', title: 'ex03/ci_local.sh', src: '#!/bin/bash\n# Run the same checks as .github/workflows/ci.yml, locally, one "job" after another.\n# Like CI it only *checks* (no --fix), and it fails if any job fails.\nset -uo pipefail\nfailed=0\n\njob() {  # job <name> <command...>\n  local name=$1; shift\n  if out=$("$@" 2>&1); then\n    echo "[PASS] $name"\n  else\n    echo "[FAIL] $name"\n    echo "$out" | tail -n 5 | sed \'s/^/       /\'\n    failed=1\n  fi\n}\n\njob format ruff format --check .\njob lint   ruff check --output-format=concise .\njob test   python -m pytest -q\nexit $failed' },
    dataTitle: '变量',
    data: { 'name': '无', '"$@"': '无', 'failed': '无' },
    bg: function (d) {
      d.text(430, 24, '每次 job 调用：shift 掉名字 → 运行剩下的命令 → 看退出码', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      JOBS.forEach(function (j, i) { d.text(120, 120 + i * 110, 'job ' + j, { anchor: 'middle', size: 13, mono: true, weight: 700, color: C.fg2 }); });
    },
    objects: function () {
      var o = { fail: B(720, 440, 160, 50, 'failed = 0', { mono: true, size: 15, fill: C.bg2, stroke: C.line }), cmd: B(430, 120, 300, 40, '', { mono: true, size: 12.5, fill: C.infoW, stroke: C.info, color: C.info, opacity: 0, trail: { n: 4, gap: 40 } }) };
      JOBS.forEach(function (j, i) { o['r' + j] = B(720, 120 + i * 110, 160, 44, '', { mono: true, size: 14, fill: C.bg, stroke: C.line, opacity: 0 }); });
      o.tail = T(260, 400, '', { mono: true, size: 11.5, color: C.bad, opacity: 0 });
      o.tail2 = T(260, 422, '', { mono: true, size: 11.5, color: C.bad, opacity: 0 });
      return o;
    },
    steps: [
      { say: '一个作业失败后，还要继续跑别的作业。这和 CI 里各作业互不影响一样。failed 记录是否有失败。脚本没开 set -e，是为了表明意图。真正起作用的是第 9 行的 if，见最后一步。', hl: [4, 5],
        data: { 'failed': 0 }, fx: [{ type: 'pulse', obj: 'fail', at: 300, color: C.info }] },
      { say: 'job format ruff format --check .：local name=format。shift 之后，"$@" 就是 ruff format --check . 这条命令。输出被 $( … 2>&1) 收集起来。', hl: [7, 8, 9, 18],
        data: { 'name': 'format', '"$@"': 'ruff format --check .' },
        set: { cmd: merge(show(), { text: 'ruff format --check .', x: { from: 200, to: 430, dur: 600, ease: 'out' }, y: { to: 120, dur: 0 } }) } },
      { say: '退出码 0 → 打印 [PASS] format（本机实测，基线代码）。', hl: [10],
        log: ['$ bash ../ex03/ci_local.sh', { s: '[PASS] format', at: 500, cls: 'ok' }],
        set: { cmd: { x: { to: 720, dur: 600, ease: 'inOut' }, opacity: { to: 0, delay: 550, dur: 150 } }, rformat: merge(show(500), { text: '[PASS]', fill: { to: C.okW, delay: 500, dur: 200 }, stroke: { to: C.ok, delay: 500, dur: 200 }, color: { to: C.ok, delay: 500, dur: 200 } }) },
        fx: [{ type: 'ripple', obj: 'rformat', at: 600, color: C.ok }] },
      { say: 'lint、test 两个作业同理，都通过。最后 exit $failed，也就是 exit 0。', hl: [19, 20, 21],
        data: { 'name': 'test', '"$@"': 'python -m pytest -q' },
        log: [{ s: '[PASS] lint', at: 500, cls: 'ok' }, { s: '[PASS] test', at: 1100, cls: 'ok' }, { s: 'exit=0', at: 1300 }],
        set: { rlint: merge(show(500), { text: '[PASS]', fill: { to: C.okW, delay: 500, dur: 200 }, stroke: { to: C.ok, delay: 500, dur: 200 }, color: { to: C.ok, delay: 500, dur: 200 } }), rtest: merge(show(1100), { text: '[PASS]', fill: { to: C.okW, delay: 1100, dur: 200 }, stroke: { to: C.ok, delay: 1100, dur: 200 }, color: { to: C.ok, delay: 1100, dur: 200 } }) } },
      { say: '故意破坏：在第 3 行后插入 import os，再跑一遍。format 仍然通过，lint 的退出码是 1 → 进入 else 分支。', hl: [11, 12, 13, 14, 19],
        data: { 'name': 'lint', '"$@"': 'ruff check --output-format=concise .', 'failed': { v: 1, at: 1100 } },
        log: ["$ sed -i '3a import os' src/minilib/utils.py", { s: '$ bash ../ex03/ci_local.sh', at: 300 }, { s: '[PASS] format', at: 500, cls: 'ok' }, { s: '[FAIL] lint', at: 900, cls: 'err' }, { s: '       src\\minilib\\utils.py:3:1: I001 [*] Import block is un-sorted or un-formatted', at: 1000 }, { s: '       src\\minilib\\utils.py:4:8: F401 [*] `os` imported but unused', at: 1100 }],
        set: { rlint: { text: { to: '[FAIL]', delay: 900 }, fill: { to: C.badW, delay: 900, dur: 200 }, stroke: { to: C.bad, delay: 900, dur: 200 }, color: { to: C.bad, delay: 900, dur: 200 } },
          tail: merge(show(1000), { text: 'utils.py:3:1: I001 … un-sorted' }), tail2: merge(show(1100), { text: 'utils.py:4:8: F401 `os` imported but unused' }),
          fail: { text: { to: 'failed = 1', delay: 1100 }, fill: { to: C.badW, delay: 1100, dur: 200 }, stroke: { to: C.bad, delay: 1100, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'rlint', at: 950 }, { type: 'pulse', obj: 'fail', at: 1200, color: C.bad }] },
      { say: '脚本继续跑 test，测试仍然通过。最后 exit $failed 等于 exit 1。CI 服务正是看这个退出码，把整次运行标红。', hl: [20, 21],
        log: [{ s: '[PASS] test', at: 500, cls: 'ok' }, { s: 'exit=1', at: 800, cls: 'err' }],
        fx: [{ type: 'pulse', obj: 'rtest', at: 500, color: C.ok }] },
      { say: '为什么 lint 失败了，脚本还能继续？因为命令放在 if 的条件里。条件中的失败，不会触发 set -e。实测给它开上 -e，结果一样。而逐行直接运行命令的 naive.sh，在 lint 失败处就退出了。测试根本没跑。', hl: [9],
        log: ['$ bash ci_e.sh > /dev/null', { s: 'ci_local.sh with -e: exit=1, all 3 jobs ran', at: 600 }, { s: '$ bash naive.sh', at: 1000 }, { s: 'naive.sh: exit=1', at: 1400, cls: 'err' }],
        eq: ['if 命令; then …：命令失败 = 走 else，不算“脚本出错”', { s: 'set -e 只对“不在条件里”的失败命令生效', at: 600 }, { s: 'naive.sh：ruff 失败 → -e 立即退出 → 测试没跑', at: 1200, cls: 'bad' }],
        fx: [{ type: 'pulse', x: 430, y: 120, at: 300, color: C.info }] }
    ]
  };
  VZ.register({ id: 'lab09-ci', title: '练习 3：本地 CI 脚本怎么判红绿', scenes: [sceneCi],
    sources: [{ t: '讲义练习 3', u: 'https://missing.csail.mit.edu/2026/code-quality/#exercises' }, { t: 'Bash 手册 · The Set Builtin', u: 'https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html' }],
    note: RUN });

  /* ---------- 练习 5：只换行首的 - ---------- */
  var BL = [['1', '---'], ['7', 'date: 2026-01-23'], ['16', '- [Formatting](#formatting)'], ['19', '- [Pre-commit hooks](#pre-commit-hooks)'], ['101', '- `abc` --- matches the literal "abc".']];
  var BY0 = 110, BDY = 62, BCW = 10.2, BX0 = 90;
  function bulletsObjs() {
    var o = {};
    BL.forEach(function (b, i) {
      o['n' + i] = T(BX0 - 14, BY0 + i * BDY, 'L' + b[0], { mono: true, size: 12, color: C.fg3, anchor: 'end' });
      o['t' + i] = T(BX0, BY0 + i * BDY, b[1], { mono: true, size: 16, cw: BCW });
      for (var k = 0; k < b[1].length; k++) if (b[1][k] === '-') o['d' + i + '_' + k] = B(BX0 + (k + 0.5) * BCW, BY0 + i * BDY, BCW + 2, 28, '', { fill: C.badW, stroke: C.bad, sw: 1.2, rx: 3, opacity: 0 });
    });
    o.cnt = T(640, 450, '', { size: 14, weight: 750, color: C.bad, anchor: 'middle', opacity: 0 });
    return o;
  }
  function dashes(pred, col, colW, at) {
    var s = {}, n = 0;
    BL.forEach(function (b, i) { for (var k = 0; k < b[1].length; k++) if (b[1][k] === '-' && pred(i, k, b[1])) { s['d' + i + '_' + k] = { opacity: { to: 0.9, delay: at + n * 60, dur: 200 }, fill: { to: colW, dur: 0 }, stroke: { to: col, dur: 0 } }; n++; } });
    return s;
  }
  var sceneBul = {
    name: '项目符号替换', desc: '练习 5：把 Markdown 列表开头的 - 换成 *。难点在于，文件里还有很多不是项目符号的 -。比如 YAML 分隔线、日期和破折号 ---。还有 pre-commit 这样的连字符。',
    code: { lang: 'sh', title: '练习 5（ex05-count / ex05-naive / ex05-right）', src: "grep -c -- '-' code-quality.md\ngrep -cE '^ *- ' code-quality.md\nsed 's/-/*/g' code-quality.md > naive.md\nsed -E 's/^( *)- /\\1* /' code-quality.md > fixed.md\ndiff code-quality.md fixed.md | grep -c '^>'" },
    dataTitle: '统计（本机实测）',
    data: { '含 - 的行': '无', '项目符号行': '无', '被改动的行': '无' },
    bg: function (d) { d.text(430, 24, 'code-quality.md 中的 5 行（原样），红框 = 被替换的 -', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: bulletsObjs,
    steps: [
      { say: '整份讲义有 68 行含 -。真正的项目符号只有 28 行，这是本机 grep 统计的。', hl: [1, 2],
        data: { '含 - 的行': { v: 68, at: 400 }, '项目符号行': { v: 28, at: 800 } },
        log: ["$ grep -c -- '-' code-quality.md", { s: '68', at: 400 }, { s: "$ grep -cE '^ *- ' code-quality.md", at: 600 }, { s: '28', at: 800 }] },
      { say: '天真的 s/-/*/g 会把每个 - 都换掉。YAML 头的 ---、日期 2026-01-23、正文里的破折号全遭殃。一共 68 行被改。', hl: [3],
        data: { '被改动的行': { v: '68 行', at: 1200 } },
        log: ["$ sed 's/-/*/g' code-quality.md > naive.md", { s: '$ diff code-quality.md naive.md | grep -c \'^>\'', at: 300 }, { s: '68', at: 600, cls: 'err' }, { s: '> ***', at: 800 }, { s: '> date: 2026*01*23', at: 1000 }],
        set: merge(dashes(function () { return true; }, C.bad, C.badW, 200), { cnt: merge(show(1200), { text: '改动 68 行：误伤 40 行' }) }),
        fx: [{ type: 'shake', obj: 't1', at: 900 }] },
      { say: '正确的模式是 ^( *)- 。从行首开始，可选的若干空格，一个 -，再一个空格。--- 后面不是空格，日期里的 - 不在行首，都不匹配。', hl: [4],
        set: merge(dashes(function () { return true; }, C.bad, C.badW, 0), { cnt: hide() }),
        eq: ['^      行首', { s: '( *)   捕获缩进（可能为空）→ \\1', at: 400 }, { s: '-␣     一个连字符 + 一个空格', at: 800 }, { s: '--- 的第 2 个字符是 -，不是空格 → 不匹配', at: 1200, cls: 'ok' }] },
      { say: '只有 3 行开头的 - 被换成 *。L101 行首的 - 被换掉，同一行里的 --- 破折号原样保留。', hl: [4],
        set: (function () {
          var s = {};
          BL.forEach(function (b, i) { for (var k = 0; k < b[1].length; k++) if (b[1][k] === '-') { var ok = k === 0 && b[1][1] === ' '; s['d' + i + '_' + k] = { opacity: { to: ok ? 1 : 0, dur: 300 }, fill: { to: ok ? C.okW : C.badW, dur: 300 }, stroke: { to: ok ? C.ok : C.bad, dur: 300 } }; } });
          [2, 3, 4].forEach(function (i, j) { s['t' + i] = { text: { to: '*' + BL[i][1].slice(1), delay: 500 + j * 200 } }; });
          return s;
        })(),
        fx: [{ type: 'ripple', obj: 'd4_0', at: 900, color: C.ok }] },
      { say: '统计下来，正好 28 行被改，和项目符号行数一致。Vim 版替换得到逐字节相同的结果，ex05-vim 实测过。', hl: [5],
        data: { '被改动的行': { v: '28 行', at: 600 } },
        log: ["$ sed -E 's/^( *)- /\\1* /' code-quality.md > fixed.md", { s: "$ diff code-quality.md fixed.md | grep -c '^>'", at: 300 }, { s: '28', at: 600, cls: 'ok' }, { s: 'vim result == sed result', at: 900, cls: 'ok' }],
        set: { cnt: merge(show(600), { text: '改动 28 行 = 项目符号行数 √', color: { to: C.ok, dur: 0 } }) },
        fx: [{ type: 'burst', obj: 'cnt', at: 700, color: C.ok }] },
      { say: '同一个替换，在不同工具里写法不同。sed -E 和 VS Code 用 ( )，Vim 要写 \\( \\)。引用捕获组时，sed 和 Vim 写 \\1，VS Code 写 $1。',
        eq: ["sed -E ：s/^( *)- /\\1* /", { s: 'Vim    ：:%s/^\\(\\s*\\)- /\\1* /', at: 500 }, { s: 'VS Code：查找 ^(\\s*)-␣  替换为 $1*␣（打开 .* 正则开关）', at: 1000 }],
        fx: [{ type: 'pulse', obj: 't2', at: 300, color: C.ok }, { type: 'pulse', obj: 't3', at: 600, color: C.ok }, { type: 'pulse', obj: 't4', at: 900, color: C.ok }] }
    ]
  };
  VZ.register({ id: 'lab09-bullets', title: '练习 5：只替换行首的项目符号', scenes: [sceneBul],
    sources: [{ t: '讲义练习 5', u: 'https://missing.csail.mit.edu/2026/code-quality/#exercises' }, { t: 'CommonMark：列表标记', u: 'https://spec.commonmark.org/0.31.2/#bullet-list-marker' }],
    note: RUN + ' 画面里只挑了 5 行原文，统计数字来自整份文件。' });

  /* ---------- 练习 6：贪婪、非贪婪与转义 ---------- */
  var L1 = '{"name": "Alyssa P. Hacker", "college": "MIT"}', L2 = '{"name": "Ben \\"Bitdiddle\\" B.", "college": "MIT"}';
  var GX0 = 40, GCW = 16.4, GY1 = 150, GY2 = 330;
  function gx(k) { return GX0 + k * GCW; }
  var sceneGreedy = {
    name: '贪婪 vs 非贪婪', desc: '练习 6：用 "name": "(…)" 从 JSON 里取名字。括号里写什么，决定了捕获组停在哪个引号上。可选 .*、.*?、[^"]* 和支持转义的写法。',
    code: { lang: 'py', title: 'ex06/extract.py 的四个模式', src: "r'\"name\": \"(.*)\"'                   # greedy\nr'\"name\": \"(.*?)\"'                  # lazy\nr'\"name\": \"([^\"]*)\"'                # no quote\nr'\"name\": \"((?:[^\"\\\\]|\\\\.)*)\"'      # escapes" },
    dataTitle: '捕获组 1',
    data: { '模式': '无', '结果': '无' },
    bg: function (d) {
      d.text(430, 24, '高亮 = 捕获组 1 当前覆盖的范围', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(GX0, GY1 - 44, 'people.jsonl 第 1 行', { size: 12, color: C.fg3 });
      d.text(GX0, GY2 - 44, '第 2 行：名字里有转义的引号 \\"', { size: 12, color: C.fg3 });
    },
    objects: {
      cap1: B(gx(10), GY1 - 16, 0, 32, '', { anchor: 'tl', fill: C.dataW, stroke: C.data, sw: 1.6, rx: 5, opacity: 0 }),
      cap2: B(gx(10), GY2 - 16, 0, 32, '', { anchor: 'tl', fill: C.dataW, stroke: C.data, sw: 1.6, rx: 5, opacity: 0 }),
      s1: T(GX0, GY1, L1, { mono: true, size: 16, cw: GCW }),
      s2: T(GX0, GY2, L2, { mono: true, size: 16, cw: GCW }),
      ptr: T(gx(10), GY1 + 34, '▲', { size: 16, color: C.bad, anchor: 'middle', opacity: 0, trail: { n: 5, gap: 36 } }),
      r1: T(GX0, GY1 + 70, '', { mono: true, size: 13, opacity: 0 }),
      r2: T(GX0, GY2 + 70, '', { mono: true, size: 13, opacity: 0 })
    },
    steps: [
      { say: '贪婪的 (.*) 里，. 匹配任意字符。它先一口气吃到行尾，再往回退。直到后面的 " 能匹配，退到的是这一行最后一个引号。', hl: [1],
        data: { '模式': '(.*) 贪婪', '结果': { v: 'Alyssa P. Hacker", "college": "MIT', at: 1700 } },
        log: ['$ python ex06/extract.py ex06/people.jsonl', { s: '  greedy   (.*)      -> Alyssa P. Hacker", "college": "MIT', at: 1700, cls: 'err' }],
        set: { cap1: { opacity: { to: 1, dur: 200 }, w: { from: 0, to: 34 * GCW, dur: 1300, ease: 'back' } }, ptr: { opacity: { to: 1, delay: 900, dur: 200 }, x: { from: gx(46), to: gx(44.5), delay: 900, dur: 400 } } },
        eq: ['.* 先吃到行尾（位置 46）', { s: '回退 1 个：位置 45 是 }，不是 "', at: 1000 }, { s: '再退 1 个：位置 44 是 " → 停，组 = [10, 44)', at: 1500, cls: 'bad' }],
        fx: [{ type: 'shake', obj: 'cap1', at: 1600 }] },
      { say: '非贪婪的 (.*?) 从 0 个字符开始，每次只多吃一个。每吃一个，都检查后面能否匹配 "。遇到第一个引号就停。', hl: [2],
        data: { '模式': '(.*?) 非贪婪', '结果': { v: 'Alyssa P. Hacker', at: 1400 } },
        log: [{ s: '  lazy     (.*?)     -> Alyssa P. Hacker', at: 1400, cls: 'ok' }],
        set: { ptr: hide(), cap1: { w: { from: 0, to: 16 * GCW, dur: 1300, ease: 'linear' }, fill: { to: C.okW, delay: 1300, dur: 200 }, stroke: { to: C.ok, delay: 1300, dur: 200 } }, r1: merge(show(1400), { text: '→ Alyssa P. Hacker' }) },
        eq: { s: '位置 26 是 " → 停，组 = [10, 26)', at: 1300, cls: 'ok' } },
      { say: '([^"]*) 换了个思路。组里根本不允许出现引号，自然停在第一个引号前。而且不需要回溯，三种写法里它最直白。', hl: [3],
        data: { '模式': '([^"]*) 非引号', '结果': 'Alyssa P. Hacker' },
        log: [{ s: '  no quote ([^"]*)   -> Alyssa P. Hacker', at: 400, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'cap1', at: 300, color: C.ok }] },
      { say: '第 2 行：名字里有 JSON 转义的引号 \\"。非贪婪和非引号写法，都停在 Ben \\ 后的引号上。名字被截断了，这正是练习 6.1 的陷阱。', hl: [2, 3],
        data: { '模式': '(.*?) / ([^"]*)', '结果': { v: 'Ben \\', at: 900 } },
        log: [{ s: '  lazy     (.*?)     -> Ben \\', at: 900, cls: 'err' }, { s: '  no quote ([^"]*)   -> Ben \\', at: 1000, cls: 'err' }],
        set: { cap2: { opacity: { to: 1, dur: 200 }, w: { from: 0, to: 5 * GCW, dur: 700, ease: 'linear' }, fill: { to: C.badW, delay: 800, dur: 200 }, stroke: { to: C.bad, delay: 800, dur: 200 } }, r2: merge(show(900), { text: '→ Ben \\        （被截断）', color: { to: C.bad, dur: 0 } }) },
        fx: [{ type: 'shake', obj: 'cap2', at: 900 }] },
      { say: '再看支持转义的写法。它每一步只做两件事之一。要么吃一个普通字符。要么把反斜杠和它后面的字符成对吃掉。普通字符指既不是引号、也不是反斜杠的字符。所以 \\" 被成对吞下，不会被当成结束引号。', hl: [4],
        data: { '模式': '((?:[^"\\\\]|\\\\.)*)', '结果': { v: 'Ben \\"Bitdiddle\\" B.', at: 1500 } },
        log: [{ s: '  escapes            -> Ben \\"Bitdiddle\\" B.', at: 1500, cls: 'ok' }],
        set: { cap2: { w: { from: 0, to: 20 * GCW, dur: 1400, ease: 'linear' }, fill: { to: C.okW, delay: 1400, dur: 200 }, stroke: { to: C.ok, delay: 1400, dur: 200 } }, r2: { text: { to: '→ Ben \\"Bitdiddle\\" B.   （转义还在）', delay: 1500 }, color: { to: C.ok, delay: 1500, dur: 200 } } },
        eq: [{ s: '位置 14–15：\\" 作为一对被吃掉', at: 600 }, { s: '位置 25–26：\\" 同样', at: 1100 }, { s: '位置 30 的 " 前面没有反斜杠 → 停，组 = [10, 30)', at: 1400, cls: 'ok' }] },
      { say: '可正则拿到的仍是带反斜杠的原文。真正的 JSON 解析器会处理转义、空白和键的顺序。name.py 一行就输出 Ben "Bitdiddle" B.，这是练习 6.2 的本机实测。',
        data: { '模式': 'json.load', '结果': { v: 'Ben "Bitdiddle" B.', at: 800 } },
        log: ['$ tail -1 ex06/people.jsonl | python ex06/name.py', { s: 'Ben "Bitdiddle" B.', at: 800, cls: 'ok' }],
        set: { r2: { text: { to: '→ Ben "Bitdiddle" B.   （json.load 解析后）', delay: 800 } } },
        fx: [{ type: 'ripple', obj: 'r2', at: 900, color: C.ok }] }
    ]
  };
  VZ.register({ id: 'lab09-greedy', title: '练习 6：捕获组停在哪个引号上', scenes: [sceneGreedy],
    sources: [{ t: '讲义练习 6', u: 'https://missing.csail.mit.edu/2026/code-quality/#exercises' }, { t: 'Python re 文档（*? 非贪婪）', u: 'https://docs.python.org/3/library/re.html#regular-expression-syntax' }, { t: 'json 模块文档', u: 'https://docs.python.org/3/library/json.html' }],
    note: RUN + ' “逐字符回退”的画法是对回溯过程的简化示意。' });
})();
