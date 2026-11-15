/* lab01 · 练习的“跑”可视化：逐行执行时数据怎么变
 * 控制台内容全部取自 labs/data/lab01.js 中真跑（Git Bash 5.3）的输出：ex07-a、ex14-a/b、ex17-a/c、ex12-a/c。
 * “fork / 子进程拷贝工作目录”的说法属补充（非视频内容），对应练习 7 的提示“子进程能/不能影响父进程什么”。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function badge(x, y, t, col, colW) { return { type: 'box', x: x, y: y, w: 120, h: 34, rx: 17, fill: colW || C.tealW, stroke: col || C.teal, sw: 1.8, text: t, mono: true, size: 14, weight: 750, color: C.fg }; }

  /* ---------- 场景 1：为什么 cd 必须是内建（练习 7） ---------- */
  var PX = 210, CX = 640, Y = 230;
  var sceneCd = {
    name: 'cd 为何内建', desc: '每个进程都有自己的当前目录。子进程改的是自己那份，影响不到父进程。所以 cd 只能由 shell 自己执行。',
    code: { lang: 'sh', title: '练习 7 实测命令（ex07-a）', src: 'cd /tmp; pwd\nbash -c \'cd /; echo "child: $(pwd)"\'\necho "parent: $(pwd)"\n(cd /; echo "subshell: $(pwd)")\necho "parent: $(pwd)"\ntype cd\nwhich cd 2>/dev/null; echo "which exit=$?"' },
    dataTitle: '各进程的工作目录',
    data: { '父 shell': '<沙箱>', '子进程': '无' },
    bg: function (d) {
      d.text(430, 28, '每个进程各有一份 cwd；子进程拿到的是拷贝', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(PX - 130, Y - 70, 260, 170, { fill: C.infoW, stroke: C.info, sw: 1.8, rx: 14 });
      d.text(PX, Y - 48, '父进程：你的交互 shell', { anchor: 'middle', size: 13, weight: 750, color: C.info });
      d.text(PX, Y + 6, 'cwd =', { anchor: 'middle', size: 12, color: C.fg3 });
    },
    objects: {
      pc: badge(PX, Y + 38, '<沙箱>'),
      child: { type: 'box', x: CX, y: Y + 15, w: 260, h: 170, rx: 14, fill: C.warnW, stroke: C.warn, sw: 1.8, text: '', opacity: 0, s: 0.85 },
      ctitle: { type: 'text', x: CX, y: Y - 48, text: '子进程：bash -c …', size: 13, weight: 750, color: C.warn, opacity: 0 },
      cc: badge(PX, Y + 38, '/tmp', C.warn, C.warnW),
      fork: { type: 'path', d: 'M' + (PX + 132) + ',' + (Y - 10) + ' C' + (PX + 230) + ',' + (Y - 70) + ' ' + (CX - 230) + ',' + (Y - 70) + ' ' + (CX - 132) + ',' + (Y - 10), stroke: C.warn, sw: 2.2, dash: 0, arrow: 'warn' },
      ghost: { type: 'box', x: CX, y: Y + 210, w: 230, h: 46, rx: 10, fill: C.badW, stroke: C.bad, sw: 1.6, text: '假如有 /usr/bin/cd 程序', size: 13, weight: 700, color: C.bad, opacity: 0 },
      x: { type: 'text', x: CX + 135, y: Y + 210, text: '×', size: 28, weight: 800, color: C.bad, opacity: 0 }
    },
    steps: [
      { say: 'cd /tmp 是 shell 内建命令，由 shell 进程自己执行。它直接改的是 shell 自己的当前目录。', hl: [1],
        data: { '父 shell': { v: '/tmp', at: 500 } }, log: ['$ cd /tmp; pwd', { s: '/tmp', at: 700 }],
        set: { pc: { text: { to: '/tmp', delay: 500 } } }, fx: [{ type: 'pulse', obj: 'pc', at: 500, color: C.teal }] },
      { say: 'bash -c \'…\'：shell 先创建一个子进程来运行 bash。子进程诞生时拷贝了父进程的工作目录 /tmp。', hl: [2],
        data: { '子进程': { v: '/tmp（拷贝）', at: 1300 } },
        set: { fork: { dash: { to: 1, dur: 700 } }, child: { opacity: { to: 1, delay: 500, dur: 300 }, s: { to: 1, delay: 500, dur: 500, ease: 'back' } },
          ctitle: { opacity: { to: 1, delay: 700, dur: 300 } },
          cc: { opacity: { from: 0, to: 1, delay: 600, dur: 200 }, x: { to: CX, delay: 700, dur: 800, ease: 'inOut' } } },
        fx: [{ type: 'ripple', obj: 'cc', at: 1500, color: C.warn }] },
      { say: '子进程里执行 cd /，改的只是它自己那一份。所以它打印 child: /。', data: { '子进程': { v: '/', at: 400 } },
        log: { s: 'child: /', at: 700 }, set: { cc: { text: { to: '/', delay: 400 } } }, fx: [{ type: 'pulse', obj: 'cc', at: 400, color: C.warn }] },
      { say: '子进程结束，它的那份 cwd 随之消失。父进程的 /tmp 从头到尾没被碰过：parent: /tmp。', hl: [3],
        data: { '子进程': { v: '（已退出）', at: 500 } }, log: { s: 'parent: /tmp', at: 1000 },
        set: { child: { opacity: { to: 0, delay: 200, dur: 500 } }, ctitle: { opacity: { to: 0, delay: 200, dur: 400 } }, cc: { opacity: { to: 0, delay: 200, dur: 400 }, s: { to: 0.6, delay: 200, dur: 400 } }, fork: { dash: { to: 0, dur: 500 } } },
        fx: [{ type: 'burst', x: CX, y: Y + 38, at: 300, color: C.warn }, { type: 'pulse', obj: 'pc', at: 900, color: C.ok }] },
      { say: '( … ) 是子 shell，也是另一个进程。里面 cd / 不影响外面。', hl: [4, 5],
        data: { '子进程': { v: '/（子 shell）', at: 1200 } }, log: [{ s: 'subshell: /', at: 1400 }, { s: 'parent: /tmp', at: 2000 }],
        set: { ctitle: { text: '子 shell：( … )', opacity: { from: 0, to: 1, delay: 400, dur: 300 } }, child: { opacity: { from: 0, to: 1, dur: 300 }, s: { from: 0.85, to: 1, dur: 400, ease: 'back' } },
          cc: { text: '/tmp', s: { to: 1, dur: 0 }, x: { from: PX, to: CX, delay: 200, dur: 700 }, opacity: { from: 0, to: 1, delay: 200, dur: 200 } },
          fork: { dash: { from: 0, to: 1, dur: 600 } } },
        fx: [{ type: 'float', obj: 'cc', at: 1200, text: '→ /', color: C.warn }] },
      { say: '假如 cd 是 /usr/bin/cd 这样的外部程序。它在子进程里改完目录就退出，对你的 shell 毫无作用。所以 cd 必须内建。which 也找不到它，退出码是 1。', hl: [6, 7],
        log: [{ s: 'cd is a shell builtin', at: 500 }, { s: 'which exit=1', at: 900 }],
        set: { child: { opacity: { to: 0, dur: 400 } }, ctitle: { opacity: { to: 0, dur: 300 } }, cc: { opacity: { to: 0, dur: 300 } }, fork: { dash: { to: 0, dur: 400 } },
          ghost: { opacity: { to: 1, delay: 300, dur: 300 }, y: { from: Y + 240, to: Y + 210, delay: 300, dur: 500, ease: 'back' } }, x: { opacity: { to: 1, delay: 900, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'ghost', at: 950 }] }
    ]
  };

  /* ---------- 场景 2：find | xargs 与 -print0（练习 14） ---------- */
  var NM = ['proj/a.sh', 'proj/sub/c.sh', 'proj/sub/my script.sh'];
  var NX = [150, 360, 620], SX = [250, 482, 772], RY = 110;
  function nameObjs() {
    var o = {};
    NM.forEach(function (n, i) {
      o['n' + i] = { type: 'box', x: NX[i], y: RY, w: i === 2 ? 210 : 150, h: 36, rx: 7, fill: C.dataW, stroke: C.data, sw: 1.6, text: n, mono: true, size: 13.5, weight: 700, color: C.fg, opacity: 0 };
      o['s' + i] = { type: 'box', x: SX[i], y: RY, w: 38, h: 30, rx: 6, fill: C.warnW, stroke: C.warn, sw: 1.4, text: '\\n', mono: true, size: 13, weight: 800, color: C.warn, opacity: 0 };
    });
    o.n2b = { type: 'box', x: 690, y: RY, w: 110, h: 36, rx: 7, fill: C.badW, stroke: C.bad, sw: 1.6, text: 'script.sh', mono: true, size: 13.5, weight: 700, color: C.bad, opacity: 0 };
    o.wc = { type: 'box', x: 430, y: 420, w: 240, h: 54, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: 'wc -l 收到的参数', size: 14, weight: 750, color: C.info, opacity: 0 };
    return o;
  }
  var AY = 300, AX = [150, 330, 510, 690];
  var sceneX = {
    name: 'xargs 与 -print0', desc: 'xargs 把 stdin 里的内容切成参数，再去运行命令。默认按空白和换行切，文件名里有空格就会切坏。-print0 和 -0 改用 \\0 分隔，文件名原样保留。',
    code: { lang: 'sh', title: '练习 14（ex14-a / ex14-b）', src: "find proj -name '*.sh' | xargs wc -l\nfind proj -name '*.sh' -print0 | xargs -0 wc -l" },
    dataTitle: 'xargs 切出来的参数',
    data: { '分隔符': '无', '参数个数': '无' },
    bg: function (d) {
      d.text(430, 28, 'find 的 stdout（字节流）→ xargs 切分 → wc 的 argv', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(40, RY, 'stdout', { size: 12, mono: true, color: C.fg3 });
      d.line(430, 150, 430, 250, { stroke: C.line, sw: 1.4, arrow: 'fg3' });
      d.text(445, 200, 'xargs 切分', { size: 12, color: C.fg3, weight: 600 });
      AX.forEach(function (x, i) { d.rect(x - 82, AY - 22, 164, 44, { fill: 'none', stroke: C.line, dash: '4 4', rx: 9 }); d.text(x, AY - 34, 'argv[' + (i + 1) + ']', { anchor: 'middle', size: 11, mono: true, color: C.fg3 }); });
      d.line(430, 330, 430, 388, { stroke: C.line, sw: 1.4, arrow: 'fg3' });
    },
    objects: nameObjs,
    steps: [
      { say: 'find 每找到一个文件，就输出它的路径。路径后面跟一个换行符 \\n。第三个文件名里有空格。', hl: [1], log: "$ find proj -name '*.sh' | xargs wc -l",
        data: { '分隔符': '\\n（换行）' },
        set: (function () { var s = {}; NM.forEach(function (n, i) { s['n' + i] = { opacity: { to: 1, delay: i * 300, dur: 250 }, x: { from: NX[i] - 30, to: NX[i], delay: i * 300, dur: 400, ease: 'out' } }; s['s' + i] = { opacity: { to: 1, delay: i * 300 + 200, dur: 250 } }; }); return s; })() },
      { say: 'xargs 默认把空格、制表符和换行都当分隔符。proj/sub/my script.sh 被从中间切成了两个词。', data: { '参数个数': { v: 4, at: 900 } },
        set: { n2: { text: 'proj/sub/my', w: { to: 130, dur: 300 }, x: { to: 560, dur: 300 }, stroke: { to: C.bad, dur: 300 }, fill: { to: C.badW, dur: 300 } },
          n2b: { opacity: { to: 1, delay: 250, dur: 200 }, x: { from: 600, to: 700, delay: 250, dur: 500, ease: 'back' } } },
        fx: [{ type: 'shake', obj: 'n2', at: 300 }, { type: 'burst', x: 630, y: RY, at: 300, color: C.bad }] },
      { say: '于是 wc 拿到 4 个参数。其中 proj/sub/my 和 script.sh 都不存在，所以报错。xargs 也因此以退出码 123 结束，这是本机实测。',
        log: [{ s: ' 2 proj/a.sh', at: 1300 }, { s: ' 3 proj/sub/c.sh', at: 1400 }, { s: 'wc: proj/sub/my: No such file or directory', at: 1500, cls: 'err' }, { s: 'wc: script.sh: No such file or directory', at: 1600, cls: 'err' }, { s: ' 5 total', at: 1700 }],
        set: { wc: { opacity: { to: 1, dur: 300 } },
          n0: { x: { to: AX[0], dur: 700, ease: 'inOut' }, y: { to: AY, dur: 700, ease: 'inOut' } },
          n1: { x: { to: AX[1], dur: 700, delay: 100, ease: 'inOut' }, y: { to: AY, dur: 700, delay: 100, ease: 'inOut' } },
          n2: { x: { to: AX[2], dur: 700, delay: 200, ease: 'inOut' }, y: { to: AY, dur: 700, delay: 200, ease: 'inOut' } },
          n2b: { x: { to: AX[3], dur: 700, delay: 300, ease: 'inOut' }, y: { to: AY, dur: 700, delay: 300, ease: 'inOut' } },
          s0: { opacity: { to: 0, dur: 300 } }, s1: { opacity: { to: 0, dur: 300 } }, s2: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'n2', at: 1500 }, { type: 'shake', obj: 'n2b', at: 1600 }] },
      { say: '修正办法是 find 加 -print0。每个路径后面改跟一个空字节 \\0。文件名里永远不会出现 \\0。', hl: [2], log: "$ find proj -name '*.sh' -print0 | xargs -0 wc -l",
        data: { '分隔符': '\\0（空字节）', '参数个数': '无' },
        set: merge((function () { var s = {}; NM.forEach(function (n, i) { s['n' + i] = { text: n, x: { to: NX[i], dur: 700, delay: i * 80, ease: 'inOut' }, y: { to: RY, dur: 700, delay: i * 80, ease: 'inOut' }, w: { to: i === 2 ? 210 : 150, dur: 400 }, fill: { to: C.dataW, dur: 300 }, stroke: { to: C.data, dur: 300 } }; s['s' + i] = { text: '\\0', fill: { to: C.tealW, dur: 300 }, stroke: { to: C.teal, dur: 300 }, color: { to: C.teal, dur: 300 }, opacity: { to: 1, delay: 600 + i * 120, dur: 250 } }; }); return s; })(),
          { n2b: { opacity: { to: 0, dur: 300 } }, wc: { opacity: { to: 0.4, dur: 300 } } }),
        fx: [{ type: 'pulse', obj: 's2', at: 1000, color: C.teal }] },
      { say: 'xargs -0 只在 \\0 处切分。于是正好 3 个参数，“proj/sub/my script.sh” 完整无缺。', data: { '参数个数': { v: 3, at: 900 } },
        set: { wc: { opacity: { to: 1, dur: 300 } }, s0: { opacity: { to: 0, dur: 300 } }, s1: { opacity: { to: 0, dur: 300 } }, s2: { opacity: { to: 0, dur: 300 } },
          n0: { x: { to: AX[0] + 20, dur: 700, ease: 'inOut' }, y: { to: AY, dur: 700, ease: 'inOut' } },
          n1: { x: { to: AX[1] + 60, dur: 700, delay: 100, ease: 'inOut' }, y: { to: AY, dur: 700, delay: 100, ease: 'inOut' } },
          n2: { x: { to: AX[3] - 40, dur: 700, delay: 200, ease: 'inOut' }, y: { to: AY, dur: 700, delay: 200, ease: 'inOut' }, stroke: { to: C.ok, delay: 900, dur: 300 }, fill: { to: C.defW, delay: 900, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'n2', at: 1000, color: C.ok }] },
      { say: 'wc 正确统计了 3 个文件（本机实测）。处理“任意文件名”时，-print0 + -0 是标准搭配。',
        log: [{ s: ' 2 proj/a.sh', at: 300 }, { s: ' 3 proj/sub/c.sh', at: 400 }, { s: ' 1 proj/sub/my script.sh', at: 500 }, { s: ' 6 total', at: 600, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'wc', at: 300, color: C.ok }] }
    ]
  };

  /* ---------- 场景 3：awk 逐行过滤 + 手推字符串比较（练习 17） ---------- */
  var ROWS = [['a', '50', 'x'], ['b', '150', 'y'], ['c', '200', 'z']];
  var FX = [330, 410, 490], FY = 250;
  function awkObjs() {
    var o = {};
    ROWS.forEach(function (r, i) {
      o['r' + i] = { type: 'box', x: 110, y: 130 + i * 56, w: 120, h: 38, rx: 8, fill: C.bg2, stroke: C.line, sw: 1.5, text: r.join(' '), mono: true, size: 15, weight: 700, color: C.fg };
      o['o' + i] = { type: 'box', x: 740, y: 200 + i * 56, w: 130, h: 38, rx: 8, fill: C.defW, stroke: C.ok, sw: 1.5, text: '', mono: true, size: 15, weight: 700, color: C.fg, opacity: 0 };
    });
    ['f1', 'f2', 'f3'].forEach(function (f, i) {
      o[f] = { type: 'box', x: FX[i], y: FY, w: 64, h: 40, rx: 8, fill: C.dataW, stroke: C.data, sw: 1.6, text: '', mono: true, size: 16, weight: 800, color: C.fg, opacity: 0 };
    });
    o.cond = { type: 'box', x: 410, y: 345, w: 170, h: 44, rx: 10, fill: C.bg3, stroke: C.line, sw: 1.8, text: '$2 > 100 ?', mono: true, size: 15, weight: 750, color: C.fg };
    return o;
  }
  function feed(i) {
    var r = ROWS[i], s = {};
    s['r' + i] = { x: { to: 410, dur: 600, ease: 'inOut' }, y: { to: 170, dur: 600, ease: 'inOut' }, opacity: { to: 0, delay: 650, dur: 200 } };
    ['f1', 'f2', 'f3'].forEach(function (f, k) {
      s[f] = { text: { to: r[k], delay: 600 }, opacity: { from: 0, to: 1, delay: 600 + k * 90, dur: 200 }, x: { from: 410, to: FX[k], delay: 600 + k * 90, dur: 400, ease: 'back' }, y: { to: FY, dur: 0 }, fill: { to: C.dataW, dur: 0 }, stroke: { to: C.data, dur: 0 } };
    });
    return s;
  }
  var sceneAwk = {
    name: 'awk 逐行过滤', desc: "awk '$2 > 100 {print $3, $2, $1}'：每读一行就切成 $1 $2 $3，先判断模式，成立才执行花括号里的动作。",
    code: { lang: 'sh', title: '练习 17（ex17-a / ex17-c）', src: "printf 'a 50 x\\nb 150 y\\nc 200 z\\n' \\\n  | awk '$2 > 100 {print $3, $2, $1}'\n\n# 陷阱：和字符串 \"100\" 比较\nawk '$2 > \"100\"'" },
    dataTitle: '当前这一行',
    data: { '$1': '无', '$2': '无', '$3': '无', '模式结果': '无' },
    legend: [[C.data, '字段 $1 $2 $3'], [C.ok, '模式成立 / 输出行'], [C.bad, '模式不成立，丢弃'], [C.warn, '比较过程']],
    bg: function (d) {
      d.text(430, 28, '输入行 → 切字段 → 判断模式 → 执行动作', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(250, 140, 320, 260, { fill: 'none', stroke: C.info, dash: '6 4', rx: 14, sw: 1.6 });
      d.text(262, 156, 'awk 对每一行执行：', { size: 12, color: C.info, weight: 700 });
      ['$1', '$2', '$3'].forEach(function (f, i) { d.text(FX[i], FY - 32, f, { anchor: 'middle', size: 12, mono: true, color: C.fg3, weight: 700 }); });
      d.text(110, 92, '输入（stdin）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(740, 160, '输出：$3 $2 $1', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
    },
    objects: awkObjs,
    steps: [
      { say: '读入第 1 行 “a 50 x”，按空白切成 3 个字段。', hl: [1, 2], data: { '$1': { v: 'a', at: 700 }, '$2': { v: '50', at: 800 }, '$3': { v: 'x', at: 900 } },
        set: feed(0), log: "$ printf 'a 50 x\\nb 150 y\\nc 200 z\\n' | awk '$2 > 100 {print $3, $2, $1}'" },
      { say: '模式 $2 > 100：$2 是 50，像数字，按数值比较 → 假。整行丢弃，动作不执行。',
        eq: ['$2 = "50"（来自输入，看起来像数字 → 按数值比）', { s: '50 > 100 ？ → 假', at: 500, cls: 'bad' }], data: { '模式结果': { v: '假', at: 500 } },
        set: { cond: { stroke: { to: C.bad, delay: 400, dur: 250 }, fill: { to: C.badW, delay: 400, dur: 250 } },
          f1: { opacity: { to: 0, delay: 900, dur: 300 }, y: { to: FY + 40, delay: 900, dur: 400, ease: 'in' } }, f2: { opacity: { to: 0, delay: 950, dur: 300 }, y: { to: FY + 40, delay: 950, dur: 400, ease: 'in' } }, f3: { opacity: { to: 0, delay: 1000, dur: 300 }, y: { to: FY + 40, delay: 1000, dur: 400, ease: 'in' } } },
        fx: [{ type: 'shake', obj: 'cond', at: 450 }] },
      { say: '第 2 行 “b 150 y”：150 > 100 → 真。', data: { '$1': { v: 'b', at: 700 }, '$2': { v: '150', at: 800 }, '$3': { v: 'y', at: 900 }, '模式结果': { v: '真', at: 1500 } },
        eq: { s: '150 > 100 ？ → 真', at: 1400, cls: 'ok' },
        set: merge(feed(1), { cond: { stroke: { to: C.ok, delay: 1400, dur: 250 }, fill: { to: C.defW, delay: 1400, dur: 250 } } }), fx: [{ type: 'pulse', obj: 'cond', at: 1450, color: C.ok }] },
      { say: '执行 print $3, $2, $1。第 1 列和第 3 列换了位置，逗号在输出里变成空格。', log: { s: 'y 150 b', at: 1100 },
        set: { f1: { x: { to: FX[2], dur: 700, ease: 'inOut' }, y: { to: FY - 18, dur: 350, ease: 'out' } }, f3: { x: { to: FX[0], dur: 700, ease: 'inOut' }, y: { to: FY + 18, dur: 350, ease: 'out' } },
          o0: { text: 'y 150 b', opacity: { to: 1, delay: 900, dur: 300 }, x: { from: 560, to: 740, delay: 900, dur: 500, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'o0', at: 1400, color: C.ok }] },
      { say: '第 3 行 “c 200 z”：200 > 100 → 真，同样交换输出。三行处理完，awk 结束。', data: { '$1': { v: 'c', at: 700 }, '$2': { v: '200', at: 800 }, '$3': { v: 'z', at: 900 }, '模式结果': { v: '真', at: 1300 } },
        eq: { s: '200 > 100 ？ → 真', at: 1200, cls: 'ok' }, log: { s: 'z 200 c', at: 2100 },
        set: merge(feed(2), { o1: { text: 'z 200 c', opacity: { to: 1, delay: 1900, dur: 300 }, x: { from: 560, to: 740, delay: 1900, dur: 500, ease: 'out' } } }),
        fx: [{ type: 'ripple', obj: 'o1', at: 2400, color: C.ok }] },
      { say: '陷阱来了。写成 $2 > "100"，就成了和字符串常量比。这时按字典序逐个字符比较。手推 "99" 和 "100"：',
        hl: [5], data: { '模式结果': '无' },
        eq: [{ s: '—— $2 > "100" 改为字符串比较 ——', at: 100 }, { s: '"99" vs "100"：第 1 个字符 9 vs 1', at: 500 }, { s: "'9'(57) > '1'(49) → 已分胜负", at: 1100 }, { s: '"99" > "100" → 真（尽管 99 < 100）', at: 1700, cls: 'bad' }],
        set: { cond: { text: '$2 > "100" ?', fill: { to: C.warnW, dur: 300 }, stroke: { to: C.warn, dur: 300 } }, f1: { opacity: { to: 0, dur: 300 } }, f2: { opacity: { to: 0, dur: 300 } }, f3: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'cond', at: 1700 }] },
      { say: '同理，"50" > "100" 也为真，因为 5 大于 1。"1000" > "100" 也为真。前 3 个字符一样，长的那个更大。实测 4 行全部输出。',
        eq: [{ s: '"50" vs "100"：5 > 1 → 真', at: 300 }, { s: '"1000" vs "100"：前缀相同，长者大 → 真', at: 800 }],
        log: [{ s: "$ printf 'a 50 x\\nb 150 y\\nc 99 z\\nd 1000 w\\n' | awk '$2 > \"100\"'", at: 1100 }, { s: 'a 50 x', at: 1400 }, { s: 'b 150 y', at: 1500 }, { s: 'c 99 z', at: 1600, cls: 'err' }, { s: 'd 1000 w', at: 1700 }],
        fx: [{ type: 'pulse', obj: 'cond', at: 1400, color: C.bad }] }
    ]
  };

  /* ---------- 场景 4："$@" 怎么展开（练习 12） ---------- */
  var sceneArgs = {
    name: '"$@" 展开', desc: '"$@" 展开成所有参数，每个参数各占一个词。参数怎么切，在你敲命令时就定了。引号会把两个词粘成一个参数。',
    code: { lang: 'sh', title: 'flaky.sh 第 19 行 + 两种调用（ex12-a / ex12-c）', src: 'while "$@" > "$LOGFILE" 2>&1; do\n\nbash flaky.sh bash fake_test.sh\nbash flaky.sh "bash fake_test.sh"' },
    dataTitle: '脚本收到的参数',
    data: { '$#': '无', '$1': '无', '$2': '无' },
    bg: function (d) {
      d.text(430, 28, '调用时的 argv  →  脚本里的 "$@"  →  while 真正运行的命令', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(60, 250, 740, 60, { fill: C.bg2, stroke: C.line, rx: 10 });
      d.text(80, 280, 'while', { size: 17, mono: true, color: C.fg, weight: 700 });
      d.text(500, 280, '> "$LOGFILE" 2>&1; do', { size: 15, mono: true, color: C.fg3 });
    },
    objects: {
      a1: { type: 'box', x: 230, y: 130, w: 90, h: 40, rx: 8, fill: C.dataW, stroke: C.data, sw: 1.6, text: 'bash', mono: true, size: 15, weight: 750, color: C.fg, opacity: 0 },
      a2: { type: 'box', x: 400, y: 130, w: 150, h: 40, rx: 8, fill: C.dataW, stroke: C.data, sw: 1.6, text: 'fake_test.sh', mono: true, size: 15, weight: 750, color: C.fg, opacity: 0 },
      at: { type: 'box', x: 300, y: 280, w: 220, h: 40, rx: 8, fill: C.bg3, stroke: C.line, sw: 1.8, text: 'cargo test my_test', mono: true, size: 16, weight: 800, color: C.fg2 },
      res: { type: 'box', x: 430, y: 420, w: 360, h: 50, rx: 10, fill: C.defW, stroke: C.ok, sw: 1.8, text: '', size: 14, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { say: '讲义原脚本第 19 行，把测试命令写死成 cargo test my_test。练习要求换成 "$@"。它代表调用脚本时给的全部参数。', hl: [1],
        set: { at: { text: { to: '"$@"', delay: 900 }, w: { to: 110, delay: 700, dur: 500, ease: 'inOut' }, fill: { to: C.warnW, delay: 700, dur: 400 }, stroke: { to: C.warn, delay: 700, dur: 400 }, color: { to: C.warn, delay: 700, dur: 400 } } },
        fx: [{ type: 'float', obj: 'at', at: 900, text: '改成 "$@"', color: C.warn }, { type: 'pulse', obj: 'at', at: 1300, color: C.warn }] },
      { say: 'bash flaky.sh bash fake_test.sh：flaky.sh 之后的两个词成为脚本的参数 $1、$2。', hl: [3], data: { '$#': { v: 2, at: 700 }, '$1': { v: 'bash', at: 500 }, '$2': { v: 'fake_test.sh', at: 700 } },
        log: '$ bash flaky.sh bash fake_test.sh',
        set: { a1: { opacity: { to: 1, dur: 300 }, y: { from: 100, to: 130, dur: 500, ease: 'back' } }, a2: { opacity: { to: 1, delay: 200, dur: 300 }, y: { from: 100, to: 130, delay: 200, dur: 500, ease: 'back' } } } },
      { say: '运行到第 19 行，"$@" 原样展开成这两个词。while 运行的命令就是 bash fake_test.sh。', hl: [1],
        set: { at: { opacity: { to: 0, delay: 500, dur: 300 } },
          a1: { x: { to: 190, dur: 800, ease: 'inOut' }, y: { to: 280, dur: 800, ease: 'inOut' } }, a2: { x: { to: 340, dur: 800, delay: 100, ease: 'inOut' }, y: { to: 280, dur: 800, delay: 100, ease: 'inOut' } } },
        fx: [{ type: 'burst', x: 300, y: 280, at: 500, color: C.warn }] },
      { say: '假测试前 3 次通过，第 4 次失败，这是本机实测输出。循环结束并报告。',
        log: [{ s: 'Logging to test_runs_1793290430.log', at: 200 }, { s: 'Run 1 passed', at: 500 }, { s: 'Run 2 passed', at: 800 }, { s: 'Run 3 passed', at: 1100 }, { s: 'Test failed on run 4', at: 1400, cls: 'err' }, { s: 'assertion failed: expected 42, got 41', at: 1700 }],
        set: { res: { text: '运行的命令：bash fake_test.sh（找到了）', opacity: { to: 1, dur: 300 } } }, fx: [{ type: 'ripple', obj: 'res', at: 300, color: C.ok }] },
      { say: '换成 bash flaky.sh "bash fake_test.sh"。引号把两个词粘成了一个参数，$# 只有 1。', hl: [4], data: { '$#': { v: 1, at: 600 }, '$1': { v: 'bash fake_test.sh', at: 600 }, '$2': '无' },
        log: { s: '$ bash flaky.sh "bash fake_test.sh"', cls: 'in' },
        set: { res: { opacity: { to: 0, dur: 300 } }, at: { opacity: { to: 1, dur: 300 } }, a2: { opacity: { to: 0, dur: 300 } },
          a1: { text: '"bash fake_test.sh"', w: { to: 230, dur: 300 }, x: { from: 300, to: 300, dur: 0 }, y: { from: 100, to: 130, dur: 600, ease: 'back' }, fill: { to: C.warnW, dur: 300 }, stroke: { to: C.warn, dur: 300 } } } },
      { say: '"$@" 仍然原样展开，但这次只有一个词。shell 去找一个叫 “bash fake_test.sh” 的程序，当然找不到。',
        log: [{ s: 'Test failed on run 1', at: 1300, cls: 'err' }, { s: 'flaky.sh: line 19: bash fake_test.sh: command not found', at: 1600, cls: 'err' }],
        set: { at: { opacity: { to: 0, delay: 500, dur: 300 } }, a1: { x: { to: 260, dur: 800, ease: 'inOut' }, y: { to: 280, dur: 800, ease: 'inOut' }, stroke: { to: C.bad, delay: 900, dur: 300 }, fill: { to: C.badW, delay: 900, dur: 300 } },
          res: { text: '运行的命令名：“bash fake_test.sh”（找不到）', fill: { to: C.badW, dur: 0 }, stroke: { to: C.bad, dur: 0 }, opacity: { to: 1, delay: 1200, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'a1', at: 1000 }] }
    ]
  };

  var EX = { t: '讲义练习', u: 'https://missing.csail.mit.edu/2026/course-shell/#exercises' };
  var NOTE = '控制台输出全部来自 练习生成脚本 在本机 Git Bash 5.3 中真跑的结果；进程框等画法是示意。';
  /* 每道题一个演示，分别挂在 lab01.html 对应练习下面 */
  VZ.register({ id: 'lab01-cd', title: '练习 7：子进程改不了父进程的工作目录', sources: [EX], note: NOTE, scenes: [sceneCd] });
  VZ.register({ id: 'lab01-args', title: '练习 12："$@" 展开成几个词', note: NOTE, scenes: [sceneArgs],
    sources: [EX, { t: 'Bash 手册 · Special Parameters', u: 'https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html' }] });
  VZ.register({ id: 'lab01-xargs', title: '练习 14：xargs 怎么切参数，-print0 / -0 为什么能救空格', note: NOTE, scenes: [sceneX],
    sources: [EX, { t: 'man xargs', u: 'https://man7.org/linux/man-pages/man1/xargs.1.html' }] });
  VZ.register({ id: 'lab01-awk', title: '练习 17：awk 逐行判断模式，手推字符串比较', note: NOTE, scenes: [sceneAwk],
    sources: [EX, { t: 'GNU awk · Comparison Operators', u: 'https://www.gnu.org/software/gawk/manual/html_node/Comparison-Operators.html' }] });
})();
