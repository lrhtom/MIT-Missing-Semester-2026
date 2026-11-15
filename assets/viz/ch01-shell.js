/* ch01 · Shell 怎么执行一行命令 —— 可视化演示
 * 依据：Lecture 1 视频 15:29–19:58（参数拆分/引号/转义）、28:08–31:39（$PATH / which）、
 *       21:51–26:24（cd、相对路径、. 与 ..）、1:10:32–1:13:28（shebang、chmod +x、./）；讲义 course-shell.md。
 * 实测：echo/sort/type/which 等输出是在本机 Git Bash 5.3 里真跑的；PATH 列表、which echo → /bin/echo 取自讲义；
 *       权限场景中 Linux 的 ls -l / Permission denied 取自视频，文件大小日期省略（示意）。
 */
(function () {
  var C = VZ.C;

  /* ---------- 场景 1：拆参数 ---------- */
  var X0 = 92, CW = 13.4, LY = 98;
  function tx(st, len) { return X0 + CW * (st + len / 2); }
  function tw(len) { return CW * len + 10; }
  function tok(st, len, col, colW) {
    return { type: 'box', x: tx(st, len), y: LY, w: tw(len), h: 34, rx: 7, fill: colW || C.dataW, stroke: col || C.data, sw: 1.6, opacity: 0 };
  }
  function argBox(st, len, text, col, colW) {
    return { type: 'box', x: tx(st, len), y: LY, w: 176, h: 44, rx: 9, fill: colW || C.dataW, stroke: col || C.data, sw: 1.7,
      text: text, color: C.fg, mono: true, size: 15, weight: 700, opacity: 0 };
  }
  var SLOT = [215, 430, 645], SY = 262;

  var sceneArgv = {
    name: '拆参数', desc: 'shell 先把你敲的一行按空白切成词，也就是 argv。第一个词是程序名，其余是参数。引号和反斜杠能让空格不被切开。',
    code: { lang: 'sh', title: '依次输入的 4 条命令', src: 'echo hello    world\necho "hello    world"\necho My\\ Photos\necho \'hello' },
    dataTitle: 'argv（参数数组）',
    data: { '词数': '无', 'argv[0]': '无', 'argv[1]': '无', 'argv[2]': '无' },
    bg: function (d) {
      d.text(430, 30, '一行文本  →  按空白切词  →  argv  →  交给程序', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(60, 70, 740, 56, { fill: C.bg2, stroke: C.line, rx: 10 });
      SLOT.forEach(function (x, i) {
        d.rect(x - 96, SY - 32, 192, 64, { fill: 'none', stroke: C.line, dash: '5 4', rx: 12 });
        d.text(x, SY - 46, 'argv[' + i + ']', { anchor: 'middle', size: 12.5, mono: true, color: C.fg3, weight: 600 });
        d.line(x, SY + 34, 430, 352, { stroke: C.line, sw: 1.3, arrow: 'fg3' });
      });
      d.line(430, 406, 430, 452, { stroke: C.line, sw: 1.4, arrow: 'fg3' });
      d.text(445, 430, 'stdout', { size: 11, mono: true, color: C.fg3 });
    },
    objects: function () {
      return {
        tk0: tok(2, 4, C.info, C.infoW), tk1: tok(7, 5), tk2: tok(16, 5),
        line: { type: 'text', x: X0, y: LY, anchor: 'start', mono: true, size: 21, cw: CW, text: '$ echo hello    world', color: C.fg },
        cont: { type: 'text', x: X0, y: LY + 44, anchor: 'start', mono: true, size: 21, cw: CW, text: '> ▌', color: C.warn, opacity: 0 },
        scan: { type: 'text', x: X0, y: LY + 30, text: '▲', size: 15, color: C.warn, opacity: 0 },
        a0: argBox(2, 4, 'echo', C.info, C.infoW), a1: argBox(7, 5, 'hello'), a2: argBox(16, 5, 'world'),
        prog: { type: 'box', x: 430, y: 380, w: 230, h: 52, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: 'echo 程序运行', color: C.info, size: 15, weight: 750, opacity: 0, s: 0.85 },
        out: { type: 'box', x: 430, y: 488, w: 470, h: 50, rx: 10, fill: '#0f1318', stroke: '#2b3440', sw: 1.4, text: '', color: '#9be09b', mono: true, size: 18, weight: 600, opacity: 0, trail: { n: 4, gap: 40 } }
      };
    },
    steps: [
      { say: 'shell 读进你敲的一整行文本。注意 hello 和 world 之间有 4 个空格。', log: '$ echo hello    world', hl: [1],
        set: { line: { opacity: { from: 0.2, to: 1, dur: 500 } } }, fx: [{ type: 'pulse', obj: 'line', at: 300, color: C.data }] },
      { say: '从左往右扫描，遇到空白就切一刀。连着好几个空白，也只算一刀。', data: { '词数': { v: 3, at: 1300 } },
        set: { scan: { opacity: { to: 1, dur: 200 }, x: { from: X0, to: X0 + CW * 21, dur: 1500, ease: 'linear' } },
          tk0: { opacity: { to: 1, delay: 420, dur: 300 } }, tk1: { opacity: { to: 1, delay: 760, dur: 300 } }, tk2: { opacity: { to: 1, delay: 1400, dur: 300 } } } },
      { say: '切出来的词依次放进 argv。argv[0] 是程序名 echo，后面的都是参数。',
        data: { 'argv[0]': { v: 'echo', at: 500 }, 'argv[1]': { v: 'hello', at: 650 }, 'argv[2]': { v: 'world', at: 800 } },
        set: { scan: { opacity: 0, dur: 300 },
          a0: { opacity: { to: 1, dur: 250 }, x: { to: SLOT[0], dur: 760, ease: 'out' }, y: { to: SY, dur: 760, ease: 'out' } },
          a1: { opacity: { to: 1, dur: 250, delay: 160 }, x: { to: SLOT[1], dur: 760, delay: 160, ease: 'out' }, y: { to: SY, dur: 760, delay: 160, ease: 'out' } },
          a2: { opacity: { to: 1, dur: 250, delay: 320 }, x: { to: SLOT[2], dur: 760, delay: 320, ease: 'out' }, y: { to: SY, dur: 760, delay: 320, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'a0', at: 760, color: C.info }, { type: 'ripple', obj: 'a2', at: 1080 }] },
      { say: '第一个词决定运行哪个程序。shell 去哪找它，第 7 节的演示会讲。其余的词原样交给这个程序。',
        set: { prog: { opacity: { to: 1, dur: 400 }, s: { to: 1, dur: 600, ease: 'back' } },
          a1: { x: { to: 430, delay: 450, dur: 650, ease: 'in' }, y: { to: 380, delay: 450, dur: 650, ease: 'in' }, s: { to: 0.4, delay: 450, dur: 650 }, opacity: { to: 0, delay: 950, dur: 200 } },
          a2: { x: { to: 430, delay: 620, dur: 650, ease: 'in' }, y: { to: 380, delay: 620, dur: 650, ease: 'in' }, s: { to: 0.4, delay: 620, dur: 650 }, opacity: { to: 0, delay: 1120, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'prog', at: 1250, color: C.info }] },
      { say: 'echo 用 1 个空格把参数拼起来输出。原来的 4 个空格没了。它们只是分隔符，不是数据。',
        log: { s: 'hello world', at: 700 },
        set: { out: { opacity: { to: 1, dur: 300 }, text: 'hello world', y: { from: 380, to: 488, dur: 700, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'out', at: 720, color: C.ok }] },
      { say: '换成用双引号把整段包起来。引号里的空格不切，扫完只有 2 个词。', log: '$ echo "hello    world"', hl: [2],
        data: { '词数': { v: 2, at: 1300 }, 'argv[1]': '无', 'argv[2]': '无' },
        set: { line: { text: '$ echo "hello    world"' }, out: { opacity: { to: 0, dur: 300 } },
          a0: { opacity: { to: 0, dur: 200 } }, tk2: { opacity: { to: 0, dur: 200 } },
          tk0: { opacity: { from: 0, to: 1, delay: 420, dur: 300 } },
          tk1: { x: { to: tx(7, 16), dur: 0 }, w: { to: tw(16), dur: 0 }, opacity: { from: 0, to: 1, delay: 900, dur: 300 } },
          scan: { opacity: { to: 1, dur: 200 }, x: { from: X0, to: X0 + CW * 23, dur: 1500, ease: 'linear' } } } },
      { say: 'argv 只有 2 项。4 个空格原样留在 argv[1] 里，所以输出带着空格。',
        data: { 'argv[0]': { v: 'echo', at: 400 }, 'argv[1]': { v: 'hello    world', at: 650 } },
        log: { s: 'hello    world', at: 1500 },
        set: { scan: { opacity: 0, dur: 300 },
          a0: { x: { from: tx(2, 4), to: SLOT[0], dur: 700, ease: 'out' }, y: { from: LY, to: SY, dur: 700, ease: 'out' }, opacity: { from: 0, to: 1, dur: 250 }, s: { to: 1, dur: 0 } },
          a1: { text: 'hello    world', w: { to: 186, dur: 0 }, x: { from: tx(7, 16), to: SLOT[1], dur: 700, delay: 150, ease: 'out' }, y: { from: LY, to: SY, dur: 700, delay: 150, ease: 'out' }, opacity: { from: 0, to: 1, dur: 250, delay: 150 }, s: { to: 1, dur: 0 } },
          out: { text: 'hello    world', opacity: { to: 1, delay: 1100, dur: 300 }, y: { from: 380, to: 488, delay: 1000, dur: 600, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'out', at: 1600, color: C.ok }] },
      { say: '反斜杠 \\ 转义下一个字符。“\\ ” 的意思是：这是普通空格，别切。效果和加引号一样。', log: '$ echo My\\ Photos', hl: [3],
        data: { 'argv[1]': '无', '词数': { v: 2, at: 1200 } },
        set: { line: { text: '$ echo My\\ Photos' }, out: { opacity: { to: 0, dur: 250 } },
          a0: { opacity: { to: 0, dur: 200 } }, a1: { opacity: { to: 0, dur: 200 } },
          tk0: { opacity: { from: 0, to: 1, delay: 420, dur: 300 } },
          tk1: { x: { to: tx(7, 10), dur: 0 }, w: { to: tw(10), dur: 0 }, opacity: { from: 0, to: 1, delay: 1050, dur: 300 } },
          scan: { opacity: { to: 1, dur: 200 }, x: { from: X0, to: X0 + CW * 17, dur: 1300, ease: 'linear' } } } },
      { say: 'argv[1] 是带空格的 “My Photos”。路径里有空格时最常用这两招：引号或 \\ 转义。',
        data: { 'argv[0]': { v: 'echo', at: 300 }, 'argv[1]': { v: 'My Photos', at: 550 } }, log: { s: 'My Photos', at: 1400 },
        set: { scan: { opacity: 0, dur: 300 },
          a0: { x: { from: tx(2, 4), to: SLOT[0], dur: 700, ease: 'out' }, y: { from: LY, to: SY, dur: 700, ease: 'out' }, opacity: { from: 0, to: 1, dur: 250 } },
          a1: { text: 'My Photos', w: { to: 176, dur: 0 }, x: { from: tx(7, 10), to: SLOT[1], dur: 700, delay: 150, ease: 'out' }, y: { from: LY, to: SY, dur: 700, delay: 150, ease: 'out' }, opacity: { from: 0, to: 1, dur: 250, delay: 150 } },
          out: { text: 'My Photos', opacity: { to: 1, delay: 1000, dur: 300 }, y: { from: 380, to: 488, delay: 900, dur: 600, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'out', at: 1500, color: C.ok }] },
      { say: '引号没闭合，shell 认为这行还没完。它显示续行提示符 “>” 等你补完。按 Ctrl+C 可以放弃。', log: ["$ echo 'hello", { s: '> ', at: 1500 }], hl: [4],
        data: { '词数': '未完成', 'argv[0]': '无', 'argv[1]': '无' },
        set: { line: { text: "$ echo 'hello" }, out: { opacity: { to: 0, dur: 250 } }, prog: { opacity: { to: 0.25, dur: 400 } },
          a0: { opacity: { to: 0, dur: 200 } }, a1: { opacity: { to: 0, dur: 200 } },
          tk0: { opacity: { from: 0, to: 1, delay: 420, dur: 300 } },
          tk1: { x: { to: tx(7, 6), dur: 0 }, w: { to: tw(6), dur: 0 }, fill: { to: C.warnW, dur: 0 }, stroke: { to: C.warn, dur: 0 }, opacity: { from: 0, to: 1, delay: 900, dur: 300 } },
          scan: { opacity: { to: 1, dur: 200 }, x: { from: X0, to: X0 + CW * 13, dur: 1100, ease: 'linear' } },
          cont: { opacity: { to: 1, delay: 1400, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'tk1', at: 1250 }] }
    ]
  };

  /* ---------- 场景 2：$PATH 查找 ---------- */
  var DIRS = ['/usr/local/sbin', '/usr/local/bin', '/usr/sbin', '/usr/bin', '/sbin', '/bin'];
  var PSTR = DIRS.join(':'), PX = 150, PCW = 9.2, DX = 470, DY0 = 150, DSTEP = 56;
  function segStart(i) { var s = 0; for (var k = 0; k < i; k++) s += DIRS[k].length + 1; return s; }
  function dirObjs() {
    var o = {};
    DIRS.forEach(function (d, i) {
      var st = segStart(i), cx = PX + PCW * (st + d.length / 2);
      o['d' + i] = { type: 'box', x: cx, y: 92, w: PCW * d.length + 6, h: 26, rx: 6, fill: C.tealW, stroke: C.teal, sw: 1.4,
        text: d, color: C.fg, mono: true, size: 13, weight: 600, opacity: 0 };
      o['m' + i] = { type: 'text', x: DX + 132, y: DY0 + i * DSTEP, text: '×', size: 20, weight: 800, color: C.bad, opacity: 0 };
    });
    return o;
  }
  function look(i, at) { /* 搜索芯片移到第 i 个目录旁，并在 at+350 打标记 */
    return { y: { to: DY0 + i * DSTEP, delay: at, dur: 420, ease: 'inOut' } };
  }
  var scenePath = {
    name: '$PATH 查找', desc: '命令名里没有 “/” 时，shell 按 $PATH 挨个目录找。用第一个找到的同名文件。',
    code: { lang: 'sh', title: '依次输入', src: 'echo $PATH\nwhich echo\n/bin/echo $PATH\nlecture.sh\n./lecture.sh\ntype cd' },
    dataTitle: '查找状态',
    data: { '要找的名字': '无', '正在查看': '无', '结果': '无' },
    bg: function (d) {
      d.text(430, 30, 'shell 怎么知道 “echo” 是哪个文件？', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(DX, DY0 - 40, '$PATH 中的目录（从上到下依次查找）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.line(DX, DY0 - 24, DX, DY0 + 5 * DSTEP + 28, { stroke: C.line, sw: 1, dash: '3 4' });
      d.node(660, 480, 190, 52, 'shell 进程', '解析命令 / 找程序 / 启动', { fill: C.bg2, stroke: C.line });
    },
    objects: function () {
      var o = {
        pstr: { type: 'text', x: PX, y: 92, anchor: 'start', mono: true, size: 15, cw: PCW, text: PSTR, color: C.fg, opacity: 0 }
      };
      var d = dirObjs(); for (var k in d) o[k] = d[k];
      o.cmd = { type: 'box', x: 120, y: 300, w: 112, h: 40, rx: 20, fill: C.dataW, stroke: C.data, sw: 1.8, text: 'echo', color: C.data, mono: true, size: 15, weight: 750, opacity: 0, trail: { n: 5, gap: 38 } };
      o.proc = { type: 'box', x: 760, y: 300, w: 170, h: 52, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: '/bin/echo', color: C.info, mono: true, size: 15, weight: 750, opacity: 0, s: 0.8 };
      return o;
    },
    steps: [
      { say: 'echo $PATH 打印 PATH 这个环境变量。它的值是一串目录，用冒号 “:” 隔开。', hl: [1],
        log: ['$ echo $PATH', { s: PSTR, at: 400 }],
        set: { pstr: { opacity: { to: 1, dur: 500 } } }, fx: [{ type: 'pulse', obj: 'pstr', at: 500, color: C.teal }] },
      { say: '按冒号拆开，就是 shell 找程序时依次查看的目录。顺序很要紧。',
        set: (function () {
          var s = { pstr: { opacity: { to: 0.18, dur: 500 } } };
          DIRS.forEach(function (d, i) {
            s['d' + i] = { opacity: { to: 1, dur: 200, delay: i * 90 }, x: { to: DX, dur: 800, delay: 150 + i * 110, ease: 'inOut' },
              y: { to: DY0 + i * DSTEP, dur: 800, delay: 150 + i * 110, ease: 'inOut' }, w: { to: 220, dur: 800, delay: 150 + i * 110 }, h: { to: 40, dur: 800, delay: 150 + i * 110 } };
          });
          return s;
        })() },
      { say: '输入 echo，名字里没有 “/”。于是从第一个目录 /usr/local/sbin 开始找，没有。',
        data: { '要找的名字': 'echo', '正在查看': { v: '/usr/local/sbin', at: 700 } },
        set: { cmd: { opacity: { to: 1, dur: 300 }, x: { from: 120, to: DX - 168, dur: 650, delay: 200, ease: 'out' }, y: { from: 300, to: DY0, dur: 650, delay: 200 } },
          m0: { opacity: { to: 1, delay: 950, dur: 200 } }, d0: { stroke: { to: C.bad, delay: 900, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'd0', at: 950 }] },
      { say: '下一个目录 /usr/local/bin：也没有。',
        data: { '正在查看': { v: '/usr/local/bin', at: 200 } },
        set: { cmd: { y: { to: DY0 + DSTEP, dur: 380, ease: 'inOut' } },
          m1: { opacity: { to: 1, delay: 420, dur: 200 } }, d1: { stroke: { to: C.bad, delay: 400, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'd1', at: 430 }] },
      { say: '/usr/sbin 没有，/usr/bin 也没有。讲义里这台机器的 echo 放在 /bin。',
        data: { '正在查看': { v: '/usr/bin', at: 700 } },
        set: { cmd: { y: { to: DY0 + 3 * DSTEP, dur: 900, ease: 'inOut' } },
          m2: { opacity: { to: 1, delay: 380, dur: 200 } }, d2: { stroke: { to: C.bad, delay: 360, dur: 200 } },
          m3: { opacity: { to: 1, delay: 920, dur: 200 } }, d3: { stroke: { to: C.bad, delay: 900, dur: 200 } } } },
      { say: '/sbin 没有，/bin 里有。找到 /bin/echo 就立刻停下，后面的目录不再看。',
        data: { '正在查看': { v: '/bin', at: 900 }, '结果': { v: '/bin/echo', at: 1100 } },
        set: { cmd: { y: { to: DY0 + 5 * DSTEP, dur: 900, ease: 'inOut' } },
          m4: { opacity: { to: 1, delay: 380, dur: 200 } }, d4: { stroke: { to: C.bad, delay: 360, dur: 200 } },
          m5: { text: '√', color: C.ok, opacity: { to: 1, delay: 950, dur: 200 } }, d5: { stroke: { to: C.ok, delay: 900, dur: 200 }, fill: { to: C.defW, delay: 900, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'd5', at: 1000, color: C.ok }, { type: 'burst', obj: 'm5', at: 1050, color: C.ok }] },
      { say: 'which echo 做的是同样的查找。它打印第一个命中的完整路径。', hl: [2],
        log: ['$ which echo', { s: '/bin/echo', at: 300 }], fx: [{ type: 'pulse', obj: 'd5', at: 300, color: C.ok }] },
      { say: 'shell 启动这个程序。也可以直接写完整路径 /bin/echo。名字带 “/” 就不查 PATH，按路径直接执行。', hl: [3],
        log: ['$ /bin/echo $PATH', { s: PSTR, at: 1300 }],
        set: { proc: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 600, ease: 'back' } },
          cmd: { text: '/bin/echo', x: { to: 760, dur: 900, delay: 200, ease: 'inOut' }, y: { to: 300, dur: 900, delay: 200, ease: 'inOut' }, opacity: { to: 0, delay: 1050, dur: 200 } } },
        fx: [{ type: 'ripple', obj: 'proc', at: 1150, color: C.info }] },
      { say: '输入 lecture.sh，没有 “/”，只在 PATH 里找。当前目录不在 PATH 中，全部落空。', hl: [4],
        log: ['$ lecture.sh', { s: 'bash: lecture.sh: command not found', at: 1700, cls: 'err' }],
        data: { '要找的名字': 'lecture.sh', '正在查看': { v: '（全部 6 个目录）', at: 300 }, '结果': { v: 'command not found', at: 1700 } },
        set: (function () {
          var s = { proc: { opacity: { to: 0.3, dur: 300 } },
            cmd: { text: 'lecture.sh', w: { to: 130, dur: 0 }, fill: { to: C.warnW, dur: 0 }, stroke: { to: C.warn, dur: 0 }, color: { to: C.warn, dur: 0 },
              x: { from: 120, to: DX - 175, dur: 0 }, y: { from: DY0, to: DY0 + 5 * DSTEP, dur: 1300, ease: 'linear' }, opacity: { from: 0, to: 1, dur: 200 } } };
          DIRS.forEach(function (d, i) {
            s['m' + i] = { text: '×', color: C.bad, opacity: { from: 0, to: 1, delay: 120 + i * 230, dur: 150 } };
            s['d' + i] = { stroke: { to: C.bad, dur: 150, delay: 100 + i * 230 }, fill: { to: C.tealW, dur: 0 } };
          });
          return s;
        })(),
        fx: [{ type: 'shake', obj: 'cmd', at: 1500 }] },
      { say: '写成 ./lecture.sh 就带了 “/”。shell 按路径执行当前目录下的这个文件。它故意不查当前目录，不然一个叫 ls 的文件就能冒充 ls。', hl: [5],
        log: ['$ ./lecture.sh', { s: '（脚本开始运行……）', at: 1200, cls: 'dim' }],
        data: { '要找的名字': './lecture.sh', '正在查看': '不查 PATH', '结果': { v: '直接执行 ./lecture.sh', at: 1000 } },
        set: { cmd: { text: './lecture.sh', w: { to: 140, dur: 0 }, fill: { to: C.defW, dur: 0 }, stroke: { to: C.ok, dur: 0 }, color: { to: C.ok, dur: 0 },
            x: { from: 120, to: 760, dur: 1000, ease: 'inOut' }, y: { from: 300, to: 300, dur: 1000 }, opacity: { from: 1, to: 0, delay: 950, dur: 200 } },
          proc: { text: './lecture.sh', opacity: { to: 1, dur: 300 }, s: { from: 0.85, to: 1, delay: 900, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'proc', at: 1000, color: C.ok }] },
      { say: 'cd 和 if 不是磁盘上的程序。它们是 shell 的内建命令和关键字，根本不查 PATH。本机用 type 实测过。', hl: [6],
        log: ['$ type cd', { s: 'cd is a shell builtin', at: 300 }, { s: '$ type if', at: 600 }, { s: 'if is a shell keyword', at: 900 }],
        data: { '要找的名字': 'cd', '正在查看': '不查 PATH', '结果': { v: 'shell builtin', at: 300 } },
        set: { proc: { opacity: { to: 0.25, dur: 300 } },
          cmd: { text: 'cd', w: { to: 80, dur: 0 }, fill: { to: C.infoW, dur: 0 }, stroke: { to: C.info, dur: 0 }, color: { to: C.info, dur: 0 },
            x: { from: 120, to: 660, dur: 900, ease: 'inOut' }, y: { from: 300, to: 480, dur: 900, ease: 'inOut' }, opacity: { from: 1, to: 0, delay: 950, dur: 250 } } },
        fx: [{ type: 'pulse', x: 660, y: 480, at: 950, color: C.info }] }
    ]
  };

  /* ---------- 场景 3：cd 与相对路径 ---------- */
  var N = { root: [430, 116], bin: [215, 236], home: [430, 236], usr: [645, 236], john: [430, 356], ubin: [645, 356] };
  var COMPS = ['bin', '..', 'bin', '.', '.', '..', 'bin', '..'];
  function pinAt(n, delay, dur) { return { x: { to: N[n][0] - 76, delay: delay || 0, dur: dur || 700, ease: 'inOut' }, y: { to: N[n][1], delay: delay || 0, dur: dur || 700, ease: 'inOut' } }; }
  function compObjs() {
    var o = {};
    COMPS.forEach(function (c, i) {
      o['c' + i] = { type: 'box', x: 160 + i * 78, y: 468, w: 58, h: 34, rx: 8, fill: C.bg, stroke: C.line, sw: 1.4, text: c, color: C.fg2, mono: true, size: 15, weight: 700, opacity: 0 };
    });
    return o;
  }
  function hi(i, at) { var s = {}; s['c' + i] = { fill: { to: C.warnW, delay: at || 0, dur: 250 }, stroke: { to: C.warn, delay: at || 0, dur: 250 }, color: { to: C.warn, delay: at || 0, dur: 250 }, y: { to: 458, delay: at || 0, dur: 300, ease: 'back' } }; return s; }
  function done(i) { var s = {}; s['c' + i] = { fill: { to: C.defW, dur: 250 }, stroke: { to: C.ok, dur: 250 }, color: { to: C.ok, dur: 250 }, y: { to: 468, dur: 300 } }; return s; }
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  var sceneCd = {
    name: 'cd 与路径', desc: '绝对路径从根 / 出发，相对路径从当前目录出发。两者都按 “/” 一段段走。“.” 是当前目录，“..” 是上一层。“~” 是家目录。',
    code: { lang: 'sh', title: '依次输入', src: 'cd /\ncd bin/../bin/././../bin/..\npwd\ncd ~\ncd ~/..' },
    dataTitle: '当前工作目录',
    data: { 'PWD': '/home/john', '正在处理的段': '无' },
    bg: function (d) {
      d.text(430, 30, '“当前工作目录”像一枚图钉，cd 让它沿目录树移动', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [['root', 'bin'], ['root', 'home'], ['root', 'usr'], ['home', 'john'], ['usr', 'ubin']].forEach(function (e) {
        d.line(N[e[0]][0], N[e[0]][1] + 20, N[e[1]][0], N[e[1]][1] - 20, { stroke: C.line, sw: 1.6 });
      });
      var L = { root: '/', bin: 'bin', home: 'home', usr: 'usr', john: 'john', ubin: 'bin' };
      Object.keys(N).forEach(function (k) {
        d.rect(N[k][0] - 52, N[k][1] - 20, 104, 40, { fill: k === 'john' ? C.warnW : C.bg2, stroke: k === 'john' ? C.warn : C.line, rx: 9, sw: 1.4 });
        d.text(N[k][0], N[k][1], L[k], { anchor: 'middle', size: 15, weight: 700, mono: true, color: C.fg });
      });
      d.text(N.john[0] + 62, N.john[1], '~ 家目录', { size: 11.5, color: C.warn, weight: 650 });
      d.text(N.ubin[0], N.ubin[1] + 34, '/usr/bin', { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
      d.text(160 - 40, 430, '相对路径按 “/” 切成的 8 段：', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: function () {
      var o = compObjs();
      o.pin = { type: 'box', x: N.john[0] - 76, y: N.john[1], w: 54, h: 28, rx: 14, fill: C.data, stroke: C.data, sw: 1, text: 'cwd', color: '#fff', size: 12.5, weight: 800, trail: { n: 6, gap: 36 } };
      return o;
    },
    steps: [
      { say: 'cd / 以 “/” 开头，是绝对路径。直接跳到文件系统的根。', hl: [1], log: ['$ cd /'], data: { 'PWD': { v: '/', at: 700 } },
        set: { pin: pinAt('root', 0, 900) }, fx: [{ type: 'ripple', obj: 'pin', at: 900 }] },
      { say: '再输入一个相对路径，它不以 / 开头。从当前目录 / 出发，按 “/” 切成 8 段，一段段走。', hl: [2], log: ['$ cd bin/../bin/././../bin/..'],
        set: (function () { var s = {}; COMPS.forEach(function (c, i) { s['c' + i] = { opacity: { to: 1, delay: i * 90, dur: 300 }, y: { from: 490, to: 468, delay: i * 90, dur: 400, ease: 'back' } }; }); return s; })() },
      { say: '第 1 段 bin：进入当前目录下名叫 bin 的子目录 → /bin。', data: { '正在处理的段': 'bin', 'PWD': { v: '/bin', at: 750 } },
        set: merge(hi(0), { pin: pinAt('bin', 250) }), fx: [{ type: 'ripple', obj: 'pin', at: 950, color: C.data }] },
      { say: '第 2 段 ..：回到父目录 → /。', data: { '正在处理的段': '..', 'PWD': { v: '/', at: 750 } },
        set: merge(done(0), hi(1, 100), { pin: pinAt('root', 250) }), fx: [{ type: 'ripple', obj: 'pin', at: 950, color: C.data }] },
      { say: '第 3 段 bin：又进入 /bin。', data: { '正在处理的段': 'bin', 'PWD': { v: '/bin', at: 750 } },
        set: merge(done(1), hi(2, 100), { pin: pinAt('bin', 250) }) },
      { say: '第 4、5 段都是 “.”。“.” 就是当前目录本身，原地不动。', data: { '正在处理的段': '. 和 .', 'PWD': '/bin' },
        set: merge(done(2), hi(3, 100), hi(4, 700)), fx: [{ type: 'pulse', obj: 'pin', at: 300, color: C.warn }, { type: 'pulse', obj: 'pin', at: 900, color: C.warn }] },
      { say: '第 6 段 ..：回到 /。', data: { '正在处理的段': '..', 'PWD': { v: '/', at: 750 } },
        set: merge(done(3), done(4), hi(5, 100), { pin: pinAt('root', 250) }) },
      { say: '第 7 段 bin：进入 /bin。', data: { '正在处理的段': 'bin', 'PWD': { v: '/bin', at: 750 } },
        set: merge(done(5), hi(6, 100), { pin: pinAt('bin', 250) }) },
      { say: '第 8 段 ..：回到 /。绕了一大圈，最终停在根目录（讲义原题）。', data: { '正在处理的段': '..', 'PWD': { v: '/', at: 750 } },
        log: [{ s: '$ pwd', at: 900 }, { s: '/', at: 1200 }], hl: [3],
        set: merge(done(6), hi(7, 100), { pin: pinAt('root', 250) }), fx: [{ type: 'ripple', obj: 'pin', at: 950, color: C.ok }] },
      { say: 'cd ~ ：~ 是家目录的简写（讲师的是 /home/john），一步回家。', hl: [4], log: ['$ cd ~'], data: { '正在处理的段': '~', 'PWD': { v: '/home/john', at: 900 } },
        set: merge(done(7), { pin: pinAt('john', 100, 1000) }), fx: [{ type: 'ripple', obj: 'pin', at: 1100, color: C.warn }] },
      { say: 'cd ~/.. ：先把 ~ 展开成 /home/john，再走 “..” → /home。', hl: [5], log: ['$ cd ~/..'], data: { '正在处理的段': '~ 然后 ..', 'PWD': { v: '/home', at: 800 } },
        set: { pin: pinAt('home', 100, 800) }, fx: [{ type: 'ripple', obj: 'pin', at: 950 }] }
    ]
  };

  /* ---------- 场景 4：shebang 与执行权限 ---------- */
  var PERM0 = '-rw-r--r--'.split(''), TX = 450, TS = 36;
  function tileObjs() {
    var o = {};
    PERM0.forEach(function (c, i) {
      o['p' + i] = { type: 'box', x: TX + i * TS, y: 112, w: 30, h: 38, rx: 6, fill: i === 0 ? C.bg3 : C.bg, stroke: C.line, sw: 1.4,
        text: c, color: C.fg, mono: true, size: 19, weight: 750, opacity: 0 };
    });
    return o;
  }
  var scenePerm = {
    name: 'shebang 与 chmod', desc: '执行 ./lecture.sh 时，内核先查执行权限 x。再读第一行的 “#!”，交给那里写的解释器去跑。',
    code: { lang: 'sh', title: 'lecture.sh（示例脚本，示意）', src: '#!/bin/sh\necho hi from script' },
    dataTitle: '文件与进程',
    data: { '权限': '-rw-r--r--', '$?': '无' },
    bg: function (d) {
      d.text(430, 30, '运行一个脚本文件要过两关：执行权限 → #! 解释器', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(46, 196, 260, 120, { fill: C.bg2, stroke: C.teal, sw: 1.6, rx: 10 });
      d.text(60, 214, 'lecture.sh', { size: 12, mono: true, color: C.teal, weight: 700 });
      d.text(66, 252, '#!/bin/sh', { size: 16, mono: true, color: C.fg });
      d.text(66, 286, 'echo hi from script', { size: 16, mono: true, color: C.fg2 });
      var g = [['类型', 0, 0], ['属主 u', 1, 3], ['属组 g', 4, 6], ['其他 o', 7, 9]];
      g.forEach(function (x) {
        var a = TX + x[1] * TS - 15, b = TX + x[2] * TS + 15;
        d.line(a + 2, 142, b - 2, 142, { stroke: C.line, sw: 1.4 });
        d.text((a + b) / 2, 158, x[0], { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
      });
      d.text(TX - 30, 112, 'ls -l', { anchor: 'end', size: 12, mono: true, color: C.fg3 });
    },
    objects: function () {
      var o = tileObjs();
      o.shl = { type: 'box', x: 160, y: 252, w: 236, h: 28, rx: 6, fill: C.warnW, stroke: C.warn, sw: 1.3, opacity: 0 };
      o.kern = { type: 'box', x: 640, y: 250, w: 220, h: 50, rx: 11, fill: C.bg2, stroke: C.line, sw: 1.6, text: '内核：检查 x 权限', color: C.fg, size: 14.5, weight: 700, opacity: 0 };
      o.flow = { type: 'path', d: 'M306,256 C420,256 470,420 560,420', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' };
      o.sh = { type: 'box', x: 650, y: 420, w: 190, h: 52, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: '/bin/sh 进程', color: C.info, size: 15, weight: 750, opacity: 0, s: 0.8 };
      o.bad = { type: 'text', x: 640, y: 312, text: 'Permission denied', size: 16, weight: 800, color: C.bad, opacity: 0, mono: true };
      return o;
    },
    steps: [
      { say: 'ls -l 的前 10 个字符里，第 1 个是文件类型。- 是普通文件，d 是目录。后面 9 个分成三组 rwx，依次给属主、属组和其他人。',
        log: ['$ ls -l lecture.sh', { s: '-rw-r--r-- 1 … lecture.sh', at: 700 }],
        set: (function () { var s = {}; PERM0.forEach(function (c, i) { s['p' + i] = { opacity: { to: 1, delay: i * 70, dur: 250 }, y: { from: 92, to: 112, delay: i * 70, dur: 450, ease: 'back' } }; }); return s; })() },
      { say: '执行 ./lecture.sh：内核要求有 x（可执行）权限。属主这组是 rw-，第 4 位是 “-”，被拒绝。（Linux 下的行为，视频 1:11:05）',
        log: ['$ ./lecture.sh', { s: 'bash: ./lecture.sh: Permission denied', at: 1100, cls: 'err' }],
        data: { '$?': { v: 126, at: 1100 } },
        set: { kern: { opacity: { to: 1, dur: 300 } }, p3: { fill: { to: C.badW, delay: 600, dur: 250 }, stroke: { to: C.bad, delay: 600, dur: 250 } },
          bad: { opacity: { to: 1, delay: 1000, dur: 250 }, y: { from: 300, to: 312, delay: 1000, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'p3', at: 700 }, { type: 'shake', obj: 'kern', at: 1000 }] },
      { say: 'chmod +x lecture.sh：给三组都加上 x。再看 ls -l，变成了 -rwxr-xr-x。',
        log: ['$ chmod +x lecture.sh', { s: '$ ls -l lecture.sh', at: 900 }, { s: '-rwxr-xr-x 1 … lecture.sh', at: 1300 }],
        data: { '权限': { v: '-rwxr-xr-x', at: 1300 } },
        set: { bad: { opacity: { to: 0, dur: 300 } }, kern: { opacity: { to: 0.4, dur: 300 } },
          p3: { text: 'x', fill: { to: C.defW, delay: 300, dur: 300 }, stroke: { to: C.ok, delay: 300, dur: 300 }, color: { to: C.ok, delay: 300, dur: 300 }, y: { from: 98, to: 112, delay: 300, dur: 500, ease: 'bounce' } },
          p6: { text: 'x', fill: { to: C.defW, delay: 520, dur: 300 }, stroke: { to: C.ok, delay: 520, dur: 300 }, color: { to: C.ok, delay: 520, dur: 300 }, y: { from: 98, to: 112, delay: 520, dur: 500, ease: 'bounce' } },
          p9: { text: 'x', fill: { to: C.defW, delay: 740, dur: 300 }, stroke: { to: C.ok, delay: 740, dur: 300 }, color: { to: C.ok, delay: 740, dur: 300 }, y: { from: 98, to: 112, delay: 740, dur: 500, ease: 'bounce' } } },
        fx: [{ type: 'float', obj: 'p3', at: 300, text: '+x', color: C.ok }, { type: 'float', obj: 'p6', at: 520, text: '+x', color: C.ok }, { type: 'float', obj: 'p9', at: 740, text: '+x', color: C.ok }] },
      { say: '再次 ./lecture.sh，权限通过了。内核读第一行的 “#!/bin/sh”，也就是 shebang。然后启动 /bin/sh，把这个文件交给它执行。',
        log: ['$ ./lecture.sh', { s: 'hi from script', at: 1900 }], data: { '$?': { v: 0, at: 1900 } }, hl: [1],
        set: { kern: { opacity: { to: 1, dur: 300 }, stroke: { to: C.ok, dur: 300 }, text: '内核：x 权限通过，读 #! 行' },
          shl: { opacity: { to: 1, delay: 500, dur: 300 } },
          flow: { dash: { to: 1, delay: 900, dur: 800, ease: 'inOut' } },
          sh: { opacity: { to: 1, delay: 1500, dur: 300 }, s: { to: 1, delay: 1500, dur: 500, ease: 'back' } } },
        fx: [{ type: 'stream', path: 'flow', at: 1000, n: 4, dur: 1100, color: C.teal, labels: ['#!', 'echo', 'hi', '…'] }, { type: 'ripple', obj: 'sh', at: 1800, color: C.info }] },
      { say: '所以 ./lecture.sh 等价于 /bin/sh lecture.sh。把第一行换成 #!/usr/bin/python，就能直接运行 Python 脚本。', hl: [2],
        log: ['$ /bin/sh lecture.sh', { s: 'hi from script', at: 500 }],
        set: { shl: { opacity: { to: 0, dur: 300 } }, sh: { text: '/bin/sh lecture.sh' } }, fx: [{ type: 'pulse', obj: 'sh', at: 200, color: C.info }] },
      { say: '本机实测有个例外。Git Bash 跑在 NTFS 上，不记录 x 位。以 #! 开头的文件，ls -l 直接显示 rwx。chmod +x 也没有效果。想看 Linux 的行为，请用 WSL 或 Linux 虚拟机。',
        log: ['# Git Bash 5.3 实测：', '-rwxr-xr-x 1 lrhto 197610 30 Oct 29 15:29 lecture.sh'],
        set: { kern: { opacity: { to: 0.3, dur: 300 } }, sh: { opacity: { to: 0.3, dur: 300 } },
          p3: { stroke: { to: C.warn, dur: 300 } }, p6: { stroke: { to: C.warn, dur: 300 } }, p9: { stroke: { to: C.warn, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'p6', at: 200, color: C.warn }] }
    ]
  };

  var DOC = { t: '讲义 course-shell', u: 'https://missing.csail.mit.edu/2026/course-shell/' };
  /* 每个知识点一个演示，分别挂在 ch01.html 对应小节下面 */
  VZ.register({
    id: 'ch01-argv', title: '一行命令怎么被拆成参数（argv）',
    sources: [{ t: '视频 15:29 参数拆分', u: 'https://youtu.be/MSgoeuMqUmU?t=929' }, { t: '视频 18:35 引号与转义', u: 'https://youtu.be/MSgoeuMqUmU?t=1115' }, DOC],
    note: '控制台输出为本机 Git Bash 实测。',
    scenes: [sceneArgv]
  });
  VZ.register({
    id: 'ch01-cd', title: 'cd 沿目录树移动“当前工作目录”',
    sources: [{ t: '视频 21:51 cd 与路径', u: 'https://youtu.be/MSgoeuMqUmU?t=1311' }, { t: '视频 24:05 . 与 ..', u: 'https://youtu.be/MSgoeuMqUmU?t=1445' }, DOC],
    note: '目录树是示意。路径命令取自讲义原文。',
    scenes: [sceneCd]
  });
  VZ.register({
    id: 'ch01-path', title: 'shell 按 $PATH 一个目录一个目录地找程序',
    sources: [{ t: '视频 28:08 $PATH 与 which', u: 'https://youtu.be/MSgoeuMqUmU?t=1688' }, { t: '视频 1:13:28 为什么要写 ./', u: 'https://youtu.be/MSgoeuMqUmU?t=4408' }, DOC],
    note: 'PATH 列表和 which echo 的结果取自讲义。type 的输出是本机 Git Bash 实测。',
    scenes: [scenePath]
  });
  VZ.register({
    id: 'ch01-perm', title: '运行脚本的两道关：执行权限 → #! 解释器',
    sources: [{ t: '视频 1:10:32 shebang', u: 'https://youtu.be/MSgoeuMqUmU?t=4232' }, { t: '视频 1:12:17 chmod +x', u: 'https://youtu.be/MSgoeuMqUmU?t=4337' }, DOC],
    note: 'Linux 的 Permission denied 取自视频。lecture.sh 的内容是示意，ls -l 里省掉的大小和日期也是。Git Bash 的行为是本机实测。',
    scenes: [scenePerm]
  });
})();
