/* ch04 · 看清程序在做什么：日志级别、strace 时序、bpftrace 聚合（三个演示，分别挂在第 4 讲 §2、§5、§6）
 * 依据：Lecture 4 视频 1:15–5:24（日志、级别、按模块调级别、-v）、24:55–34:50（strace、-e、-f、-p）、
 *       34:50–43:45（eBPF / bpftrace、cpid、biolatency）；讲义 debugging-profiling.md。
 * 实测：ch04-logging 的日志输出是本机 Python 3.13 真跑 logdemo.py 的结果（脚本见第 4 讲 §2）。
 * 示意：ch04-strace、ch04-bpftrace 需要 Linux（本机未运行）。图中的系统调用名、计数只是按视频讲解画的示意，
 *       控制台里只放讲义原文命令与视频描述（灰字），不伪造任何输出。本机能跑的 MSYS strace 实测见练习页“调试 4”。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }

  /* ---------- 场景 1：日志级别过滤（本机实测） ---------- */
  var LOGPY = 'import json\nimport logging\nimport sys\n\nlogging.basicConfig(stream=sys.stdout, level=logging.INFO,\n                    format="%(levelname)-7s %(name)s: %(message)s")\ndb, web = logging.getLogger("app.db"), logging.getLogger("app.web")\n\n\ndef handle_request():\n    web.debug("parsing headers")\n    web.info("GET /index.html")\n    db.debug("SELECT * FROM users WHERE id = 42")\n    db.warning("slow query took 1200 ms")\n    web.error("template not found: index.html")\n\n\nprint("== root level = INFO")\nhandle_request()\nlogging.getLogger().setLevel(logging.WARNING)\nprint("== root level = WARNING")\nhandle_request()\nlogging.getLogger().setLevel(logging.INFO)\ndb.setLevel(logging.DEBUG)\nprint("== root INFO, but app.db = DEBUG")\nhandle_request()';
  var REC = [['DEBUG', 'web', C.neutral, C.bg3], ['INFO', 'web', C.data, C.dataW], ['DEBUG', 'db', C.neutral, C.bg3], ['WARNING', 'db', C.warn, C.warnW], ['ERROR', 'web', C.bad, C.badW]];
  var RY = [150, 210, 270, 330, 390], GX = 470, LV = { DEBUG: 400, INFO: 330, WARNING: 260, ERROR: 190 };
  function recObjs() {
    var o = {};
    ['r', 'q', 'u'].forEach(function (pre) {
      REC.forEach(function (r, k) {
        o[pre + k] = { type: 'box', x: 120, y: 270, w: 150, h: 34, rx: 8, fill: r[3], stroke: r[2], sw: 1.7, text: r[0] + ' · app.' + r[1], mono: true, size: 12, weight: 750, color: C.fg, opacity: 0, trail: { n: 3, gap: 40 } };
      });
    });
    o.gate = { type: 'box', x: GX + 40, y: LV.INFO, w: 40, h: 8, rx: 4, fill: C.info, stroke: C.info, sw: 1, opacity: 0 };
    o.glab = { type: 'text', x: GX + 70, y: LV.INFO, anchor: 'start', text: '阈值 INFO', size: 12.5, weight: 800, color: C.info, opacity: 0 };
    o.dbtag = { type: 'box', x: GX, y: 470, w: 150, h: 30, rx: 8, fill: C.warnW, stroke: C.warn, sw: 1.4, text: 'app.db → DEBUG', mono: true, size: 12, weight: 750, color: C.warn, opacity: 0 };
    o.json = { type: 'box', x: 430, y: 520, w: 780, h: 36, rx: 8, fill: C.bg2, stroke: C.teal, sw: 1.6, text: '{"level": "WARNING", "logger": "app.db", "msg": "slow query", "ms": 1200, "table": "users"}', mono: true, size: 12, weight: 700, color: C.fg, opacity: 0 };
    return o;
  }
  var TERM = [140, 186, 232, 278], DROP = 470;
  /* 一轮过滤：pass[k] = 终端行号（-1 表示丢弃）。pre = 这一轮用的记录对象前缀；fresh = 记录从程序框里新产生 */
  function round(pre, pass, fresh, old) {
    var s = {};
    REC.forEach(function (r, k) {
      var go = (fresh ? 400 : 500) + k * 220, o = {};
      if (fresh) o.opacity = { to: 1, delay: go - 150, dur: 200 };
      if (pass[k] >= 0) { o.x = { to: 730, delay: go, dur: 900, ease: 'inOut' }; o.y = { to: TERM[pass[k]], delay: go, dur: 900, ease: 'inOut' }; }
      else { o.x = { to: 300 + 24 * (k % 2 ? 1 : -1), delay: go, dur: 800 }; o.y = { to: DROP + 20, delay: go, dur: 800, ease: 'in' }; o.opacity = fresh ? { to: 0.3, delay: go - 150, dur: 900 } : { to: 0.3, delay: go + 400, dur: 300 }; }
      s[pre + k] = o;
      if (old) s[old + k] = { opacity: { to: 0, dur: 300 } };
    });
    return s;
  }
  var sceneLog = {
    name: '日志级别过滤', desc: '日志就是更讲究的 print。每条记录都带级别，从低到高是 DEBUG、INFO、WARNING、ERROR。框架按阈值决定输出哪些。还能给某个模块单独调低阈值，只深挖你关心的部分。',
    code: { lang: 'py', title: 'logdemo.py（笔记作者编写，本机实测）', src: LOGPY },
    dataTitle: '日志配置',
    data: { 'root 阈值': '无', 'app.db 阈值': '继承 root', '输出条数': '无' },
    legend: [[C.neutral, 'DEBUG'], [C.data, 'INFO'], [C.warn, 'WARNING'], [C.bad, 'ERROR'], [C.info, '阈值'], [C.teal, '结构化记录']],
    bg: function (d) {
      d.text(430, 26, '每条日志带一个级别。低于阈值的直接丢弃', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(GX - 50, 160, 116, 260, { fill: C.bg2, stroke: C.line, rx: 10 });
      ['ERROR', 'WARNING', 'INFO', 'DEBUG'].forEach(function (l) { d.text(GX - 40, LV[l], l, { size: 11, mono: true, weight: 700, color: C.fg3 }); });
      d.text(GX, 144, '过滤器', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
      d.rect(640, 110, 190, 190, { fill: '#0f1318', stroke: '#2b3440', rx: 10 });
      d.text(735, 96, '终端', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
      d.text(300, DROP + 52, '丢弃', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
      d.node(45, 248, 150, 44, 'handle_request()', '', { fill: C.infoW, stroke: C.info, size: 13 });
    },
    objects: recObjs,
    steps: [
      { say: '程序执行一次 handle_request()，产生 5 条日志记录。每条都带级别和来源模块，模块是 app.web 或 app.db。', hl: [10, 15],
        set: (function () { var s = {}; REC.forEach(function (r, k) { s['r' + k] = { opacity: { to: 1, delay: k * 150, dur: 200 }, x: { to: 300, delay: k * 150, dur: 650, ease: 'out' }, y: { to: RY[k], delay: k * 150, dur: 650, ease: 'out' } }; }); return s; })() },
      { say: 'basicConfig(level=INFO) 把阈值设成 INFO。两条 DEBUG 掉进“丢弃”，其余 3 条到达终端。本机实测的输出见控制台。', hl: [5, 6, 19],
        data: { 'root 阈值': 'INFO', '输出条数': { v: 3, at: 1600 } },
        log: [{ s: '== root level = INFO', at: 300 }, { s: 'INFO    app.web: GET /index.html', at: 1300 }, { s: 'WARNING app.db: slow query took 1200 ms', at: 1700 }, { s: 'ERROR   app.web: template not found: index.html', at: 1900 }],
        set: merge({ gate: { opacity: { to: 1, dur: 300 } }, glab: { opacity: { to: 1, dur: 300 } } }, round('r', [-1, 0, -1, 1, 2], false)),
        fx: [{ type: 'pulse', obj: 'gate', at: 300, color: C.info }] },
      { say: '生产环境常把阈值调到 WARNING，免得刷屏。这次 INFO 也被挡下，只剩 2 条。', hl: [20, 22],
        data: { 'root 阈值': 'WARNING', '输出条数': { v: 2, at: 1600 } },
        log: [{ s: '== root level = WARNING', at: 300 }, { s: 'WARNING app.db: slow query took 1200 ms', at: 1700 }, { s: 'ERROR   app.web: template not found: index.html', at: 1900 }],
        set: merge({ gate: { y: { to: LV.WARNING, dur: 500 } }, glab: { y: { to: LV.WARNING, dur: 500 }, text: '阈值 WARNING' } }, round('q', [-1, -1, -1, 0, 1], true, 'r')) },
      { say: '调试时只想深挖数据库：root 回到 INFO，单独把 app.db 调成 DEBUG。SQL 那条 DEBUG 出现了，web 的 DEBUG 仍被挡住（视频 3:41）。', hl: [23, 24, 26],
        data: { 'root 阈值': 'INFO', 'app.db 阈值': 'DEBUG', '输出条数': { v: 4, at: 1600 } },
        log: [{ s: '== root INFO, but app.db = DEBUG', at: 300 }, { s: 'INFO    app.web: GET /index.html', at: 1300 }, { s: 'DEBUG   app.db: SELECT * FROM users WHERE id = 42', at: 1500 }, { s: 'WARNING app.db: slow query took 1200 ms', at: 1700 }, { s: 'ERROR   app.web: template not found: index.html', at: 1900 }],
        set: merge({ gate: { y: { to: LV.INFO, dur: 500 } }, glab: { y: { to: LV.INFO, dur: 500 }, text: '阈值 INFO' }, dbtag: { opacity: { to: 1, dur: 300 } } }, round('u', [-1, 0, 1, 2, 3], true, 'q')),
        fx: [{ type: 'pulse', obj: 'dbtag', at: 300, color: C.warn }] },
      { say: '结构化日志把同一事件写成 JSON。耗时 ms、表名这些字段，程序能直接取出来统计、画图。这正是讲义说的“为以后的分析而记录”。',
        log: [{ s: '== structured (JSON) logging', at: 200 }, { s: '{"ts": 1793293095, "level": "WARNING", "logger": "app.db", "msg": "slow query", "ms": 1200, "table": "users"}', at: 700 }],
        set: { json: { opacity: { to: 1, delay: 500, dur: 300 }, y: { from: 540, to: 520, delay: 500, dur: 400, ease: 'back' } }, dbtag: { opacity: { to: 0.3, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'json', at: 900, color: C.teal }] },
      { say: '经验法则见视频 4:17。为找 bug 临时加的 print，修好后别删。改成合适级别的日志，留在代码里。下次再出问题，信息已经在日志里了。',
        fx: [{ type: 'pulse', obj: 'u2', at: 200, color: C.warn }, { type: 'pulse', obj: 'u3', at: 500, color: C.warn }] }
    ]
  };

  /* ---------- 场景 2：strace 的时序（Linux，示意） ---------- */
  var PX = 190, KX = 680;
  var CALLS = [
    ['execve("/usr/bin/ls", ["ls", "-l"], …)', 'f', 118],
    ['openat(…, "/lib/…/libc.so.6", …)', 'f', 160],
    ['openat(AT_FDCWD, ".", …O_DIRECTORY)', 'f', 214],
    ['getdents64(3, …)', 'd', 256],
    ['statx(…, "a.txt", …) · listxattr', 'f', 310],
    ['statx(…, "b.txt", …) · listxattr', 'f', 352],
    ['openat(…, "/etc/localtime", …)', 'f', 406],
    ['write(1, "-rw-r--r-- 1 …", …)', 'd', 460],
    ['exit_group(0)', 'p', 502]
  ];
  function callObjs() {
    var o = {};
    CALLS.forEach(function (c, k) {
      o['a' + k] = { type: 'line', x1: PX, y1: c[2], x2: KX - 6, y2: c[2], stroke: c[1] === 'f' ? C.teal : c[1] === 'd' ? C.data : C.info, sw: 2, dash: 0, arrow: 'data' };
      o['t' + k] = { type: 'text', x: (PX + KX) / 2, y: c[2] - 11, text: c[0], mono: true, size: 11.5, weight: 650, color: C.fg, opacity: 0 };
    });
    o.child = { type: 'box', x: 368, y: 64, w: 120, h: 30, rx: 8, fill: C.infoW, stroke: C.info, sw: 1.6, text: '子进程（真 ls）', size: 12, weight: 750, color: C.info, opacity: 0 };
    o.fk = { type: 'path', d: 'M277,64 L306,64', stroke: C.info, sw: 2, dash: 0, arrow: 'info' };
    o.pp = { type: 'box', x: PX, y: 540, w: 230, h: 30, rx: 8, fill: C.bg3, stroke: C.line, sw: 1.4, text: 'strace -p PID：没有输出 = 在纯计算', size: 12, weight: 700, color: C.fg2, opacity: 0 };
    return o;
  }
  function call(k, at) { var s = {}; s['a' + k] = { dash: { to: 1, delay: at, dur: 600, ease: 'out' } }; s['t' + k] = { opacity: { to: 1, delay: at + 150, dur: 300 } }; return s; }
  function fxc(k, at) { return { type: 'stream', path: 'a' + k, at: at, n: 1, dur: 700, color: CALLS[k][1] === 'f' ? C.teal : C.data }; }
  var sceneStrace = {
    name: 'strace 时序', desc: 'strace 记录一个进程向内核发出的每一次系统调用。比如打开文件、读目录、写终端。下图按视频讲解画出 ls -l 的大致过程。这是示意，不是本机输出。',
    code: { lang: "sh", title: "讲义原文命令（本机未运行）", src: "strace ./my_program\nstrace -e trace=file ./my_program\nstrace -f ./my_program\nstrace -p <PID>\nstrace -T ./my_program" },
    dataTitle: 'strace 选项',
    data: { '命令': '无', '过滤': '全部（默认）', '跟随子进程': '否' },
    legend: [[C.teal, '%file：带文件名参数的调用'], [C.data, '读写文件描述符'], [C.info, '进程相关'], [C.neutral, '被 -e 过滤掉']],
    bg: function (d) {
      d.text(430, 26, '时间从上往下流：每支箭头 = 一次系统调用（示意）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.node(PX - 85, 46, 170, 36, 'ls -l 进程（用户态）', '', { fill: C.dataW, stroke: C.data, size: 13 });
      d.node(KX - 75, 46, 150, 36, 'Linux 内核', '', { fill: C.warnW, stroke: C.warn, size: 13 });
      d.line(PX, 84, PX, 520, { stroke: C.data, sw: 1.4, dash: '5 5' });
      d.line(KX, 84, KX, 520, { stroke: C.warn, sw: 1.4, dash: '5 5' });
    },
    objects: callObjs,
    steps: [
      { hl: [1], say: 'strace ls -l：每一行输出都是一次系统调用。最开始的 execve 让内核把 ls 这个文件装进新进程。', data: { '命令': 'strace ls -l' },
        log: ['$ strace ./my_program', { s: '（视频 26:09：每行 = 系统调用名 + 参数 + 返回值）', at: 600, cls: 'dim' }],
        set: call(0, 200), fx: [fxc(0, 300)] },
      { hl: [1], say: '接着一大段是在启动进程本身。它打开并加载 libc 这类动态库。讲师说这一段通常不是你关心的（视频 27:22）。',
        set: call(1, 200), fx: [fxc(1, 300)] },
      { hl: [1], say: 'openat(".", O_DIRECTORY) 打开当前目录。getdents64 把目录项一批读出来（视频 31:52）。',
        set: merge(call(2, 200), call(3, 900)), fx: [fxc(2, 300), fxc(3, 1000)] },
      { hl: [1], say: '因为加了 -l，ls 要拿到每个文件的详细信息。它对每个文件都做一次 statx 和 listxattr。不加 -l 就没有这些调用（视频 33:10）。',
        eq: ['statx 次数 = 目录里的文件数', { s: 'ls -l 比 ls 多做的事 → 多出来的系统调用', at: 600 }],
        set: merge(call(4, 200), call(5, 800)), fx: [fxc(4, 300), fxc(5, 900)] },
      { hl: [1], say: '-l 还要显示修改时间，得换算成本地时区。于是又去打开时区文件（视频 28:03）。',
        set: call(6, 200), fx: [fxc(6, 300)] },
      { hl: [1], say: 'write(1, …) 把排好的结果写到终端，exit_group 结束进程。注意，程序内部的函数调用不会出现在 strace 里。它只看程序和内核之间的边界。',
        set: merge(call(7, 200), call(8, 900)), fx: [fxc(7, 300), fxc(8, 1000)] },
      { hl: [2], say: '-e trace=%file 只保留带文件名参数的调用。其余的都被过滤掉。视频 28:40 用了它，34:18 查了 man 页的 filtering 一节。', data: { '命令': 'strace -e trace=%file ls -l', '过滤': '%file' },
        log: ['$ strace -e trace=file ./my_program'],
        set: { a3: { stroke: { to: C.neutral, dur: 400 } }, t3: { opacity: { to: 0.25, dur: 400 } }, a7: { stroke: { to: C.neutral, dur: 400 } }, t7: { opacity: { to: 0.25, dur: 400 } }, a8: { stroke: { to: C.neutral, dur: 400 } }, t8: { opacity: { to: 0.25, dur: 400 } } } },
      { hl: [3], say: '-f 跟随子进程。讲师机器上的 ls 其实是 Nix 的包装程序。真正干活的 ls，是它启动的子进程。不加 -f 就看不到这些调用（视频 30:28）。', data: { '跟随子进程': '是（-f）' },
        log: ['$ strace -f ./my_program'],
        set: { child: { opacity: { to: 1, delay: 300, dur: 300 } }, fk: { dash: { to: 1, dur: 500 } } },
        fx: [{ type: 'ripple', obj: 'child', at: 600, color: C.info }] },
      { hl: [4, 5], say: 'strace -p PID 可以附着到一个已经在跑的进程。如果它什么都不打印，说明进程卡在纯 CPU 计算里。它根本没找内核（视频 34:18）。',
        log: ['$ strace -p <PID>', '$ strace -T ./my_program    # 显示每次调用耗时'],
        set: { pp: { opacity: { to: 1, dur: 300 }, y: { from: 556, to: 540, dur: 400, ease: 'back' } } } }
    ]
  };

  /* ---------- 场景 3：bpftrace 在内核里聚合（Linux，示意） ---------- */
  var PROC = [['bash', 150], ['ls', 230], ['tmux', 310], ['sshd', 390]];
  var MAPK = ['sys_enter_read', 'sys_enter_write', 'sys_enter_openat', 'sys_enter_futex'];
  function bpfObjs() {
    var o = {};
    PROC.forEach(function (p, k) {
      o['p' + k] = { type: 'box', x: 100, y: p[1], w: 110, h: 40, rx: 9, fill: C.dataW, stroke: C.data, sw: 1.6, text: p[0], mono: true, size: 14, weight: 750, color: C.fg, opacity: 0 };
      o['w' + k] = { type: 'path', d: 'M156,' + p[1] + ' C250,' + p[1] + ' 270,270 344,270', stroke: C.data, sw: 1.8, dash: 0 };
    });
    o.k = { type: 'box', x: 400, y: 270, w: 110, h: 300, rx: 12, fill: C.warnW, stroke: C.warn, sw: 1.8, text: '内核', size: 15, weight: 800, color: C.warn, opacity: 0 };
    o.prog = { type: 'box', x: 400, y: 84, w: 520, h: 36, rx: 9, fill: C.infoW, stroke: C.info, sw: 1.6, text: "tracepoint:syscalls:sys_enter_* { @[probe] = count(); }", mono: true, size: 12.5, weight: 750, color: C.info, opacity: 0 };
    o.pk = { type: 'path', d: 'M400,104 L400,116', stroke: C.info, sw: 2, dash: 0, arrow: 'info' };
    o.mp = { type: 'path', d: 'M456,270 C540,270 560,270 600,270', stroke: C.info, sw: 2, dash: 0, arrow: 'info' };
    MAPK.forEach(function (m, k) {
      o['mk' + k] = { type: 'text', x: 620, y: 200 + k * 46, anchor: 'start', text: '@[' + m + ']', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 };
      o['mv' + k] = { type: 'text', x: 840, y: 200 + k * 46, anchor: 'end', num: 0, fmt: 'int', mono: true, size: 14, weight: 800, color: C.info, opacity: 0 };
    });
    o.h1 = { type: 'box', x: 690, y: 470, w: 10, h: 26, rx: 3, fill: C.teal, stroke: C.teal, sw: 1, opacity: 0, anchor: 'tl' };
    o.h2 = { type: 'box', x: 690, y: 500, w: 10, h: 26, rx: 3, fill: C.teal, stroke: C.teal, sw: 1, opacity: 0, anchor: 'tl' };
    return o;
  }
  function cnt(vals, at, dur) { var s = {}; vals.forEach(function (v, k) { s['mv' + k] = { num: { to: v, delay: at, dur: dur } }; }); return s; }
  function streams(ks, at) { return ks.map(function (k, i) { return { type: 'stream', path: 'w' + k, at: at + i * 120, n: 4, dur: 1000, color: C.data }; }); }
  var sceneBpf = {
    name: 'bpftrace 聚合', desc: 'strace 只能一条条打印。eBPF 让你把一段小程序装进内核，就地计数、统计延迟。bpftrace 是它的高层语法。下图的计数是示意。',
    code: { lang: "sh", title: "讲义原文命令（第 4 行是视频提到的 bcc 工具。本机未运行）", src: "sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'\nsudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /comm == \"bash\"/ { @[probe] = count(); }'\nsudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /pid == cpid/ { @[probe] = count(); }' -c 'ls -la'\nsudo biolatency" },
    dataTitle: 'bpftrace 程序',
    data: { '探针': '无', '过滤': '无（整个系统）', '输出时机': '无' },
    legend: [[C.data, '进程发出的系统调用'], [C.warn, '内核'], [C.info, '装进内核的 eBPF 程序 / map'], [C.teal, '直方图']],
    bg: function (d) {
      d.text(430, 26, '在内核里计数：数据不必一条条拷贝到用户态再统计', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(604, 160, 246, 190, { fill: C.bg2, stroke: C.info, rx: 10, dash: '5 4' });
      d.text(727, 176, 'map（Ctrl-C 时打印）', { anchor: 'middle', size: 11.5, weight: 700, color: C.info });
      d.text(610, 438, 'biolatency：磁盘请求耗时分布（视频 42:34）', { size: 11.5, weight: 700, color: C.fg3 });
      d.text(612, 483, '[2, 4) μs', { size: 11.5, mono: true, color: C.fg2 });
      d.text(612, 513, '[4, 8) μs', { size: 11.5, mono: true, color: C.fg2 });
    },
    objects: bpfObjs,
    steps: [
      { hl: [1], say: '想知道 read 调用的耗时分布，strace 做不到。eBPF 能把小程序装进 Linux 内核（视频 35:34）。它用内核的权限观察内部状态。',
        set: (function () { var s = { k: { opacity: { to: 1, dur: 300 } } }; PROC.forEach(function (p, k) { s['p' + k] = { opacity: { to: 1, delay: 200 + k * 120, dur: 250 } }; s['w' + k] = { dash: { to: 1, delay: 400 + k * 120, dur: 500 } }; }); return s; })() },
      { hl: [1], say: 'bpftrace -e 后面是一段像 awk 的小程序。每碰到一个 sys_enter_* 探针，就给 map 里这个探针名的计数加 1。', data: { '探针': 'sys_enter_*' },
        log: ["$ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* { @[probe] = count(); }'", { s: '（视频 38:30：运行后没有任何输出）', at: 800, cls: 'dim' }],
        set: merge({ prog: { opacity: { to: 1, dur: 300 } }, pk: { dash: { to: 1, delay: 300, dur: 300 } }, mp: { dash: { to: 1, delay: 500, dur: 400 } } },
          (function () { var s = {}; MAPK.forEach(function (m, k) { s['mk' + k] = { opacity: { to: 1, delay: 600 + k * 100, dur: 250 } }; s['mv' + k] = { opacity: { to: 1, delay: 600 + k * 100, dur: 250 } }; }); return s; })()) },
      { hl: [1], say: '默认追踪的是整个系统（视频 39:03）。所有进程的系统调用都会被计入。计数在内核里累加，不产生逐条输出。',
        set: cnt([412, 198, 37, 260], 300, 1500), fx: streams([0, 1, 2, 3], 200) },
      { hl: [1], say: '继续累加……直到按 Ctrl-C，bpftrace 才把整个 map 打印出来。（图中数字为示意）', data: { '输出时机': 'Ctrl-C 时' },
        set: cnt([905, 431, 88, 577], 200, 1500), fx: streams([0, 1, 2, 3], 100).concat([{ type: 'pulse', x: 727, y: 255, at: 1700, color: C.info }]) },
      { hl: [2], say: '/comm == "bash"/ 是过滤条件。只统计名叫 bash 的进程，其他进程的调用不再计数。', data: { '过滤': '/comm == "bash"/' },
        log: ["$ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /comm == \"bash\"/ { @[probe] = count(); }'"],
        set: merge({ p1: { opacity: { to: 0.3, dur: 300 } }, p2: { opacity: { to: 0.3, dur: 300 } }, p3: { opacity: { to: 0.3, dur: 300 } }, w1: { opacity: { to: 0.2, dur: 300 } }, w2: { opacity: { to: 0.2, dur: 300 } }, w3: { opacity: { to: 0.2, dur: 300 } } }, cnt([0, 0, 0, 0], 0, 300), cnt([46, 21, 3, 0], 600, 1200)),
        fx: streams([0], 500) },
      { hl: [3], say: '-c "ls -la" 让 bpftrace 自己启动这条命令。它的 PID 放进 cpid。再过滤 /pid == cpid/，就只追踪这一条命令。命令结束时自动打印结果（视频 41:29）。', data: { '过滤': '/pid == cpid/' },
        log: ["$ sudo bpftrace -e 'tracepoint:syscalls:sys_enter_* /pid == cpid/ { @[probe] = count(); }' -c 'ls -la'"],
        set: merge({ p0: { opacity: { to: 0.3, dur: 300 } }, w0: { opacity: { to: 0.2, dur: 300 } }, p1: { opacity: { to: 1, dur: 300 }, stroke: { to: C.ok, dur: 300 } }, w1: { opacity: { to: 1, dur: 300 } } }, cnt([0, 0, 0, 0], 0, 300), cnt([9, 5, 14, 0], 600, 1000)),
        fx: streams([1], 500) },
      { hl: [4], say: '很多现成工具就是这样写的。biolatency 统计磁盘请求的耗时分布，opensnoop 打印谁打开了哪个文件。视频里 2 次落在 4–8 μs，1 次落在 2–4 μs。',
        set: { h1: { opacity: { to: 1, dur: 200 }, w: { to: 40, delay: 200, dur: 600, ease: 'out' } }, h2: { opacity: { to: 1, dur: 200 }, w: { to: 80, delay: 400, dur: 700, ease: 'out' } } },
        log: { s: '（视频 42:34：biolatency 的直方图）', at: 300, cls: 'dim' } }
    ]
  };

  VZ.register({
    id: 'ch04-logging', title: '日志级别：哪些记录会被输出',
    sources: [
      { t: '视频 1:15 从 print 到日志', u: 'https://youtu.be/8VYT9TcUmKs?t=75' },
      { t: '视频 2:30 日志级别', u: 'https://youtu.be/8VYT9TcUmKs?t=150' },
      { t: '讲义 Printf Debugging and Logging', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#printf-debugging-and-logging' },
      { t: 'Python 文档 · logging', u: 'https://docs.python.org/3/library/logging.html' }
    ],
    note: '控制台输出是本机 Python 3.13 真跑 logdemo.py 的结果。记录飞行和过滤器的画法是示意。',
    scenes: [sceneLog]
  });

  VZ.register({
    id: 'ch04-strace', title: 'strace：程序与内核之间的每一次请求',
    sources: [
      { t: '视频 25:36 strace ls -l', u: 'https://youtu.be/8VYT9TcUmKs?t=1536' },
      { t: '视频 30:28 -f 跟随子进程', u: 'https://youtu.be/8VYT9TcUmKs?t=1828' },
      { t: '讲义 System Call Tracing', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#system-call-tracing' },
      { t: 'man strace', u: 'https://www.man7.org/linux/man-pages/man1/strace.1.html' }
    ],
    note: '这是按视频讲解画的示意图。本机没有 Linux，strace 未实测。图中的调用名和参数只是示意。控制台只放讲义原文命令。本机能跑的 MSYS strace 见练习页调试 4。',
    scenes: [sceneStrace]
  });

  VZ.register({
    id: 'ch04-bpftrace', title: 'bpftrace：在内核里计数',
    sources: [
      { t: '视频 35:34 eBPF', u: 'https://youtu.be/8VYT9TcUmKs?t=2134' },
      { t: '视频 41:29 -c 与 cpid', u: 'https://youtu.be/8VYT9TcUmKs?t=2489' },
      { t: '讲义 bpftrace and eBPF', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#bpftrace-and-ebpf' },
      { t: 'bpftrace', u: 'https://github.com/iovisor/bpftrace' }
    ],
    note: '这是示意。本机没有 Linux，bpftrace 未实测。map 里的计数是示意数字。biolatency 直方图取自视频口述。2 次落在 4–8 μs，1 次落在 2–4 μs。',
    scenes: [sceneBpf]
  });
})();
