/* lab04 · 练习跑起来时发生了什么
 * 控制台内容全部取自 labs/data/lab04.js 中 练习生成脚本 在本机（Git Bash 5.3 + Windows 11）真跑的输出：
 *   p5-a / p5-b（端口与 kill）、p4-a / p4-b（CPU 亲和性）、d4-a / d4-b（MSYS strace）。
 * 示意：worker 分配到哪个 CPU 格子是示意（Windows 调度器的实际分配看不到）；PID 与 CPU 百分比每次运行都会不同。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }

  /* ---------- 场景 1：端口被谁占了（性能 5） ---------- */
  var scenePort = {
    name: '谁占了 4444 端口', desc: '性能练习 5：先起一个监听 4444 端口的 web 服务器。再用 netstat 找到它的 PID，结束它。中间会撞上 Git Bash 的一个坑：bash 自带的 kill 不认 Windows 的 PID。',
    code: { lang: 'sh', title: 'p5-a 的命令（本机实测）', src: "python -m http.server 4444 --bind 127.0.0.1 > server.log 2>&1 &\nsleep 2\nnetstat -ano | grep ':4444 '\nPID=$(bash p5/who_listens.sh 4444)\ntasklist //FI \"PID eq $PID\" //NH\nkill $PID\n/bin/kill -W $PID; echo \"kill exit=$?\"\nsleep 1\nnetstat -ano | grep ':4444 ' || echo 'port 4444 is free now'" },
    dataTitle: '找到的进程',
    data: { '端口 4444': '空闲', 'PID（Windows）': '无', '进程名': '无' },
    bg: function (d) {
      d.text(430, 26, '进程 ⇄ 端口 ⇄ 操作系统的连接表', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(470, 300, 370, 120, { fill: '#0f1318', stroke: '#2b3440', rx: 10 });
      d.text(655, 286, 'netstat -ano 的输出', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
    },
    objects: {
      srv: { type: 'box', x: 160, y: 130, w: 220, h: 50, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: 'python -m http.server', mono: true, size: 13, weight: 750, color: C.info, opacity: 0, s: 0.85 },
      srv2: { type: 'box', x: 160, y: 210, w: 220, h: 50, rx: 11, fill: C.infoW, stroke: C.info, sw: 2, text: '第二个 http.server', size: 13, weight: 750, color: C.info, opacity: 0 },
      port: { type: 'circle', x: 470, y: 160, r: 36, fill: C.bg3, stroke: C.line, sw: 2.4, text: ':4444', size: 14, weight: 800, color: C.fg2 },
      lk: { type: 'path', d: 'M272,130 C350,130 380,150 432,156', stroke: C.info, sw: 2.2, dash: 0, arrow: 'info' },
      lk2: { type: 'path', d: 'M272,210 C350,210 390,190 436,176', stroke: C.info, sw: 2.2, dash: 0, arrow: 'info' },
      np: { type: 'path', d: 'M490,192 C520,240 560,260 600,296', stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      row1: { type: 'text', x: 486, y: 330, anchor: 'start', text: 'TCP  127.0.0.1:4444  LISTENING  21200', mono: true, size: 12.5, weight: 700, color: '#9be09b', opacity: 0 },
      row2: { type: 'text', x: 486, y: 360, anchor: 'start', text: 'TCP  127.0.0.1:4444  LISTENING  53808', mono: true, size: 12.5, weight: 700, color: '#9be09b', opacity: 0 },
      pid: { type: 'box', x: 655, y: 470, w: 150, h: 36, rx: 18, fill: C.warnW, stroke: C.warn, sw: 1.8, text: 'PID 21200', mono: true, size: 14, weight: 800, color: C.warn, opacity: 0, trail: { n: 4, gap: 40 } },
      k1: { type: 'box', x: 160, y: 470, w: 190, h: 40, rx: 10, fill: C.bg3, stroke: C.line, sw: 1.6, text: 'kill（bash 内建）', size: 13, weight: 750, color: C.fg, opacity: 0 },
      k2: { type: 'box', x: 160, y: 470, w: 190, h: 40, rx: 10, fill: C.okW, stroke: C.ok, sw: 1.6, text: '/bin/kill -W', mono: true, size: 13, weight: 750, color: C.ok, opacity: 0 },
      shot: { type: 'path', d: 'M160,448 C150,330 150,250 160,160', stroke: C.bad, sw: 2.2, dash: 0, arrow: 'atk' }
    },
    steps: [
      { say: '在后台启动 Python 自带的最小 web 服务器。让它监听 127.0.0.1 的 4444 端口。', hl: [1, 2], data: { '端口 4444': { v: '被监听', at: 900 } },
        set: { srv: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } }, lk: { dash: { to: 1, delay: 400, dur: 500 } }, port: { fill: { to: C.infoW, delay: 900, dur: 300 }, stroke: { to: C.info, delay: 900, dur: 300 }, color: { to: C.info, delay: 900, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'port', at: 950, color: C.info }] },
      { say: 'netstat -ano 列出所有 TCP 连接和监听。-a 是全部，-n 不解析名字，-o 显示 PID。4444 那一行状态是 LISTENING，PID 是 21200。', hl: [3],
        log: ["$ netstat -ano | grep ':4444 '", { s: '  TCP    127.0.0.1:4444         0.0.0.0:0              LISTENING       21200', at: 700 }],
        set: { np: { dash: { to: 1, dur: 400 } }, row1: { opacity: { to: 1, delay: 600, dur: 300 }, x: { from: 466, to: 486, delay: 600, dur: 400, ease: 'out' } } },
        fx: [{ type: 'stream', path: 'np', at: 200, n: 3, dur: 800, color: C.data, labels: ['TCP', 'LISTEN', 'PID'] }] },
      { say: 'who_listens.sh 用 awk 把这一列 PID 抠出来。tasklist 确认这个 PID 就是 python.exe。', hl: [4, 5],
        data: { 'PID（Windows）': { v: 21200, at: 600 }, '进程名': { v: 'python.exe', at: 1200 } },
        log: [{ s: '$ tasklist //FI "PID eq $PID" //NH', at: 700 }, { s: 'python.exe                   21200 Console                    1     23,416 K', at: 1100 }],
        set: { pid: { opacity: { to: 1, delay: 200, dur: 200 }, x: { from: 800, to: 655, delay: 200, dur: 700, ease: 'out' }, y: { from: 330, to: 470, delay: 200, dur: 700, ease: 'out' } } } },
      { say: '坑来了。bash 内建的 kill 只认 Git Bash 自己的进程号，也就是 MSYS PID。拿 Windows PID 去杀，会报 No such process（本机实测）。', hl: [6],
        log: [{ s: '$ kill $PID', at: 100 }, { s: '/usr/bin/bash: line 7: kill: (21200) - No such process', at: 900, cls: 'err' }],
        set: { k1: { opacity: { to: 1, dur: 300 } }, shot: { dash: { to: 1, delay: 300, dur: 500 } } },
        fx: [{ type: 'shake', obj: 'k1', at: 900 }, { type: 'burst', x: 160, y: 300, at: 800, color: C.bad }] },
      { say: '换用 /bin/kill -W：-W 告诉它“这是 Windows PID”。服务器进程被结束，端口随之释放。', hl: [7],
        log: [{ s: '$ /bin/kill -W $PID; echo "kill exit=$?"', at: 100 }, { s: 'kill exit=0', at: 800, cls: 'ok' }], data: { '端口 4444': { v: '空闲', at: 1200 } },
        set: { shot: { dash: { to: 0, dur: 200 }, stroke: { to: C.ok, dur: 0 } }, k1: { opacity: { to: 0, dur: 200 } }, k2: { opacity: { to: 1, delay: 200, dur: 300 } },
          srv: { opacity: { to: 0.15, delay: 900, dur: 400 }, s: { to: 0.85, delay: 900, dur: 400 } }, lk: { dash: { to: 0, delay: 900, dur: 400 } },
          port: { fill: { to: C.bg3, delay: 1100, dur: 300 }, stroke: { to: C.line, delay: 1100, dur: 300 }, color: { to: C.fg2, delay: 1100, dur: 300 } }, row1: { opacity: { to: 0.2, delay: 1100, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'srv', at: 900, color: C.ok }] },
      { say: '再查一次：4444 没人监听了。在 Linux 上，同样的事是 ss -tlnp | grep 4444 加 kill（未实测）。', hl: [8, 9],
        log: [{ s: 'port 4444 is free now', at: 500, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'port', at: 400, color: C.ok }] },
      { say: '再看一个 Windows 特有的现象（p5-b 实测）。同一端口再起第二个服务器，并不会报 Address already in use。两个进程同时 LISTENING。Python 的 HTTPServer 开了 SO_REUSEADDR。这个选项在 Windows 上的语义，比 Linux 宽松。',
        log: ['$ python -m http.server 4444 --bind 127.0.0.1 > a.log 2>&1 &', '$ python -m http.server 4444 --bind 127.0.0.1 > b.log 2>&1 &', { s: '  TCP    127.0.0.1:4444         0.0.0.0:0              LISTENING       62084', at: 900 }, { s: '  TCP    127.0.0.1:4444         0.0.0.0:0              LISTENING       53808', at: 1000 }],
        set: { srv: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 300 } }, lk: { dash: { to: 1, delay: 200, dur: 400 } }, srv2: { opacity: { to: 1, delay: 300, dur: 300 } }, lk2: { dash: { to: 1, delay: 500, dur: 400 } },
          port: { fill: { to: C.warnW, delay: 800, dur: 300 }, stroke: { to: C.warn, delay: 800, dur: 300 }, color: { to: C.warn, delay: 800, dur: 300 } },
          row1: { text: 'TCP  127.0.0.1:4444  LISTENING  62084', opacity: { to: 1, delay: 800, dur: 300 } }, row2: { opacity: { to: 1, delay: 950, dur: 300 } }, pid: { opacity: { to: 0, dur: 300 } }, k2: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'port', at: 900 }] }
    ]
  };

  /* ---------- 场景 2：CPU 亲和性（性能 4） ---------- */
  var GX0 = 500, GY0 = 130, GS = 84;
  function tile(k) { return [GX0 + (k % 4) * GS, GY0 + Math.floor(k / 4) * GS]; }
  function cpuObjs() {
    var o = {};
    for (var k = 0; k < 16; k++) {
      var t = tile(k);
      o['c' + k] = { type: 'box', x: t[0], y: t[1], w: 68, h: 60, rx: 9, fill: C.bg2, stroke: C.line, sw: 1.5, text: '', opacity: 0 };
      o['cl' + k] = { type: 'text', x: t[0], y: t[1] + 40, text: 'CPU ' + k, mono: true, size: 11, weight: 700, color: C.fg3, opacity: 0 };
    }
    [0, 1, 2].forEach(function (k) {
      o['w' + k] = { type: 'box', x: 120, y: 170 + k * 70, w: 110, h: 40, rx: 9, fill: C.warnW, stroke: C.warn, sw: 1.8, text: 'worker ' + k, mono: true, size: 13, weight: 750, color: C.fg, opacity: 0 };
      o['q' + k] = { type: 'box', x: 120, y: 170 + k * 70, w: 34, h: 22, rx: 11, fill: C.warn, stroke: C.warn, sw: 1, text: 'w' + k, mono: true, size: 12, weight: 800, color: '#fff', opacity: 0, trail: { n: 4, gap: 40 } };
      o['p' + k] = { type: 'text', x: 250, y: 170 + k * 70, anchor: 'start', num: 0, fmt: 'pct', mono: true, size: 14, weight: 800, color: C.warn, opacity: 0 };
    });
    o.mask = { type: 'box', x: 230, y: 440, w: 300, h: 44, rx: 10, fill: C.infoW, stroke: C.info, sw: 1.8, text: '/affinity 5  =  0101₂', mono: true, size: 16, weight: 800, color: C.info, opacity: 0 };
    return o;
  }
  function wTo(k, cpu, at, extra) { var t = tile(cpu); return { x: { to: t[0] + (extra || 0), delay: at || 0, dur: 800, ease: 'inOut' }, y: { to: t[1] - 4, delay: at || 0, dur: 800, ease: 'inOut' }, opacity: { to: 1, delay: at || 0, dur: 200 } }; }
  var sceneCpu = {
    name: 'CPU 亲和性', desc: '性能练习 4：stress -c 3 被 taskset 限制在 CPU 0 和 2 上。为什么它用不满 3 个 CPU？在 Windows 上用 start /affinity 做同样的实验。3 个忙等的 worker，被关进 2 个 CPU 里。',
    code: { lang: 'sh', title: 'p4-a / p4-b 的命令（本机实测）', src: 'nproc\npython p4/burn.py 3\n\ncmd //c "start /affinity 5 /b /wait python p4/burn.py 3"' },
    dataTitle: '每个 worker 拿到的 CPU（本机实测）',
    data: { '允许的 CPU': '全部 16 个', 'worker 0': '无', 'worker 1': '无', 'worker 2': '无', '合计': '无' },
    legend: [[C.warn, '忙等的 worker 进程'], [C.info, '亲和性掩码允许的 CPU'], [C.neutral, '不允许使用的 CPU']],
    bg: function (d) {
      d.text(430, 26, 'CPU 时间 ÷ 墙钟时间 = 这个进程实际拿到了几个核', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(GX0 + 1.5 * GS, 84, '本机 16 个逻辑 CPU', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
    },
    objects: cpuObjs,
    steps: [
      { say: 'nproc 显示本机有 16 个逻辑 CPU。burn.py 启动 3 个进程，每个都死循环 3 秒。最后各自报告拿到的 CPU 时间。', hl: [1],
        log: ['$ nproc', { s: '16', at: 400 }],
        set: (function () { var s = {}; for (var k = 0; k < 16; k++) { s['c' + k] = { opacity: { to: 1, delay: k * 50, dur: 200 } }; s['cl' + k] = { opacity: { to: 1, delay: k * 50, dur: 200 } }; } [0, 1, 2].forEach(function (k) { s['w' + k] = { opacity: { to: 1, delay: 900 + k * 150, dur: 250 } }; }); return s; })() },
      { say: '不加限制时，调度器把 3 个 worker 放到不同的核上。各自接近满载，本机实测 83% 到 86%。机器上还有别的程序在跑，所以不到 100%。', hl: [2],
        data: { 'worker 0': { v: '86%', at: 1200 }, 'worker 1': { v: '83%', at: 1200 }, 'worker 2': { v: '85%', at: 1200 }, '合计': { v: '255%', at: 1300 } },
        log: ['$ python p4/burn.py 3', { s: 'worker 0: wall 3.00s  cpu 2.59s  -> 86% of one CPU', at: 1100 }, { s: 'worker 1: wall 3.00s  cpu 2.50s  -> 83% of one CPU', at: 1200 }, { s: 'worker 2: wall 3.00s  cpu 2.56s  -> 85% of one CPU', at: 1300 }, { s: 'sum of cpu time: 7.66s over ~3s wall = 255%', at: 1400 }],
        set: { q0: wTo(0, 5, 0), q1: wTo(1, 10, 120), q2: wTo(2, 15, 240), p0: { opacity: { to: 1, delay: 900, dur: 200 }, num: { to: 86, delay: 900, dur: 400 } }, p1: { opacity: { to: 1, delay: 900, dur: 200 }, num: { to: 83, delay: 900, dur: 400 } }, p2: { opacity: { to: 1, delay: 900, dur: 200 }, num: { to: 85, delay: 900, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'c5', at: 900, color: C.warn }, { type: 'pulse', obj: 'c10', at: 1000, color: C.warn }, { type: 'pulse', obj: 'c15', at: 1100, color: C.warn }] },
      { say: 'start /affinity 5 设下亲和性掩码。5 写成二进制是 0101，第 0 位和第 2 位是 1。所以只允许 CPU 0 和 CPU 2，等价于 taskset --cpu-list 0,2。子进程会继承这个掩码。', hl: [4],
        data: { '允许的 CPU': { v: 'CPU 0、CPU 2', at: 900 } },
        eq: ['5 = 4 + 1 = 0b0101', { s: '第 0 位 = 1 → CPU 0，第 2 位 = 1 → CPU 2', at: 500 }, { s: '其余位为 0 → 其他 14 个 CPU 一律不许用', at: 1000 }],
        set: (function () { var s = { mask: { opacity: { to: 1, dur: 300 }, y: { from: 460, to: 440, dur: 400, ease: 'back' } } };
          for (var k = 0; k < 16; k++) { s['c' + k] = (k === 0 || k === 2) ? { fill: { to: C.infoW, delay: 700, dur: 300 }, stroke: { to: C.info, delay: 700, dur: 300 } } : { opacity: { to: 0.3, delay: 700, dur: 300 } }; s['cl' + k] = (k === 0 || k === 2) ? { color: { to: C.info, delay: 700, dur: 300 } } : { opacity: { to: 0.3, delay: 700, dur: 300 } }; }
          [0, 1, 2].forEach(function (k) { s['q' + k] = { x: { to: 120, dur: 600 }, y: { to: 170 + k * 70, dur: 600 }, opacity: { to: 0, delay: 500, dur: 200 } }; s['p' + k] = { opacity: { to: 0, dur: 300 }, num: { to: 0, dur: 0, delay: 300 } }; });
          return s; })() },
      { say: '3 个 worker 只能挤在 2 个核上轮流跑。理论上限：2 个核的时间分给 3 个人，每人最多 2/3 个核。',
        eq: ['上限：2 CPU × 3 s = 6 CPU·秒', { s: '平均每个 worker ≤ 6 / 3 = 2 CPU·秒 → ≤ 66.7%', at: 600 }],
        set: { q0: wTo(0, 0, 0, -18), q1: wTo(1, 0, 150, 18), q2: wTo(2, 2, 300, 0) },
        fx: [{ type: 'shake', obj: 'q1', at: 1100 }, { type: 'pulse', obj: 'c0', at: 1000, color: C.warn }] },
      { say: '本机实测：37% + 50% + 33% = 121%。远低于 3 个核，也没到 2 个核。这两个核上还有别的程序在抢。', hl: [4],
        data: { 'worker 0': { v: '37%', at: 900 }, 'worker 1': { v: '50%', at: 900 }, 'worker 2': { v: '33%', at: 900 }, '合计': { v: '121%（≤ 200%）', at: 1100 } },
        log: ['$ cmd //c "start /affinity 5 /b /wait python p4/burn.py 3"', { s: 'worker 0: wall 3.00s  cpu 1.12s  -> 37% of one CPU', at: 800 }, { s: 'worker 1: wall 3.00s  cpu 1.50s  -> 50% of one CPU', at: 900 }, { s: 'worker 2: wall 3.00s  cpu 1.00s  -> 33% of one CPU', at: 1000 }, { s: 'sum of cpu time: 3.62s over ~3s wall = 121%', at: 1100 }],
        set: { q1: { x: { to: tile(2)[0] + 18, delay: 300, dur: 500 } }, q2: { x: { to: tile(2)[0] - 18, delay: 300, dur: 500 } },
          p0: { opacity: { to: 1, delay: 700, dur: 200 }, num: { to: 37, delay: 700, dur: 400 } }, p1: { opacity: { to: 1, delay: 700, dur: 200 }, num: { to: 50, delay: 700, dur: 400 } }, p2: { opacity: { to: 1, delay: 700, dur: 200 }, num: { to: 33, delay: 700, dur: 400 } } } },
      { say: '这就是练习的答案。taskset 把 stress 的 3 个工作进程限制在 2 个 CPU 上。htop 里会看到 CPU 0 和 2 满载，每个 stress 进程约 66%。Linux 这部分未实测。',
        fx: [{ type: 'pulse', obj: 'c0', at: 200, color: C.info }, { type: 'pulse', obj: 'c2', at: 400, color: C.info }] }
    ]
  };

  /* ---------- 场景 3：MSYS strace 看 ls 与 ls -l（调试 4） ---------- */
  var L = ['stat', 'opendir', 'readdir → .', 'readdir → ..', 'readdir → a.txt', 'readdir → b.txt', 'readdir → (读完)', 'closedir', 'stat', 'write 12 字节'];
  var R = ['open …LC_TIME/coreutils.mo = -1', 'open …LC_TIME/coreutils.mo = -1', 'open …LC_TIME/coreutils.mo = -1', 'lstat', 'opendir', 'readdir → .', 'readdir → ..', 'readdir → a.txt', 'lstat', 'readdir → b.txt', 'lstat', 'readdir → (读完)', 'closedir', 'open …LC_MESSAGES/… ×3 = -1', 'stat', 'open /usr/share/zoneinfo/UTC = -1', 'write 102 字节'];
  var LX = 60, RX = 450, Y0 = 92, DY = 25;
  function rowCol(t) { return /^lstat/.test(t) ? C.warn : /^open/.test(t) ? C.teal : /^write/.test(t) ? C.data : C.fg2; }
  function traceObjs() {
    var o = {};
    L.forEach(function (t, k) { o['L' + k] = { type: 'text', x: LX, y: Y0 + k * DY, anchor: 'start', text: t, mono: true, size: 12, weight: 700, color: rowCol(t), opacity: 0 }; });
    R.forEach(function (t, k) { o['R' + k] = { type: 'text', x: RX, y: Y0 + k * DY, anchor: 'start', text: t, mono: true, size: 12, weight: 700, color: rowCol(t), opacity: 0 }; });
    o.hl = { type: 'box', anchor: 'tl', x: RX - 8, y: Y0 + 3 * DY - 11, w: 380, h: 22, rx: 5, fill: C.warnW, stroke: C.warn, sw: 1.2, opacity: 0 };
    return o;
  }
  function rows(prefix, from, to, at, gap) { var s = {}; for (var k = from; k <= to; k++) s[prefix + k] = { opacity: { to: 1, delay: at + (k - from) * gap, dur: 200 }, x: { from: (prefix === 'L' ? LX : RX) + 16, to: prefix === 'L' ? LX : RX, delay: at + (k - from) * gap, dur: 300, ease: 'out' } }; return s; }
  var sceneStrace = {
    name: 'strace：ls 与 ls -l', desc: '调试练习 4 的本机近似。Git Bash 自带的 strace 是 MSYS 版，记录的是 MSYS 运行时里的 POSIX 调用。它不是 Linux 内核的系统调用。但同样能看出，ls -l 比 ls 多做了哪些事。',
    code: { lang: 'sh', title: 'd4-a / d4-b 的命令（本机实测）', src: 'mkdir d && touch d/a.txt d/b.txt\nexport TZ=UTC\nstrace -o plain.trace -m syscall ls d > /dev/null\nawk -f d4/calls.awk plain.trace\nstrace -o long.trace -m syscall ls -l d > /dev/null\nawk -f d4/calls.awk long.trace' },
    dataTitle: 'calls.awk 的统计（本机实测）',
    data: { '原始 trace 行数': '无', 'lstat': '无', 'open': '无', 'write 字节数': '无' },
    legend: [[C.warn, 'lstat：取文件元数据'], [C.teal, 'open：打开文件'], [C.data, 'write：写 stdout'], [C.neutral, '目录读取']],
    bg: function (d) {
      d.text(LX, 64, 'ls d', { size: 14, mono: true, weight: 800, color: C.fg });
      d.text(RX, 64, 'ls -l d', { size: 14, mono: true, weight: 800, color: C.fg });
      d.line(420, 56, 420, 520, { stroke: C.line, sw: 1.2, dash: '4 4' });
    },
    objects: traceObjs,
    steps: [
      { say: '准备一个目录 d，里面只有 a.txt 和 b.txt。再设 TZ=UTC，让结果和时区无关。strace -m syscall 只记 POSIX 层面的调用。calls.awk 再把几百行原始输出，压成一条时间线。', hl: [1, 2] },
      { say: 'ls d 先 stat 一下 d，再 opendir 打开目录。readdir 一项项读出 . .. a.txt b.txt，读完就 closedir。最后 write 12 字节，内容是 “a.txt  b.txt” 加换行。', hl: [3, 4],
        data: { '原始 trace 行数': { v: 91, at: 300 }, 'lstat': 0, 'open': 0, 'write 字节数': { v: 12, at: 2400 } },
        log: ['$ strace -o plain.trace -m syscall ls d > /dev/null', '$ wc -l < plain.trace', { s: '91', at: 300 }, { s: '-- total: lstat=0 stat=2 opendir=1 readdir=5 closedir=1 open=0 write=1', at: 2500 }],
        set: rows('L', 0, 9, 300, 220) },
      { say: 'ls -l d 一开始就去找翻译文件。找的是“时间格式”的翻译。三种 locale 名各试一次，都不存在，返回 -1。', hl: [5, 6],
        log: ['$ strace -o long.trace -m syscall ls -l d > /dev/null', '$ wc -l < long.trace', { s: '224', at: 300 }],
        data: { '原始 trace 行数': { v: 224, at: 300 } },
        set: rows('R', 0, 2, 400, 250) },
      { say: '然后 lstat 目录本身，再像 ls 一样逐项读目录。不同的是，每读出一个要显示的文件，就 lstat 一次。拿到的是大小、权限和修改时间。', data: { 'lstat': { v: 3, at: 2200 } },
        set: merge(rows('R', 3, 12, 200, 200), { hl: { opacity: { to: 1, delay: 200, dur: 200 }, y: { to: Y0 + 8 * DY - 11, delay: 1300, dur: 400 } } }),
        fx: [{ type: 'flash', obj: 'R8', at: 1500, color: C.warn }, { type: 'flash', obj: 'R10', at: 1900, color: C.warn }] },
      { say: '最后再找一遍提示信息的翻译文件，并打开时区文件 zoneinfo/UTC。Git Bash 里没有这个文件，返回 -1，ls 退回内置的 UTC。视频里讲师在 Linux 上，也看到 ls -l 去读时区文件。见视频 28:03。', data: { 'open': { v: 7, at: 1200 }, 'write 字节数': { v: 102, at: 1400 } },
        log: [{ s: '-- total: lstat=3 stat=1 opendir=1 readdir=5 closedir=1 open=7 write=1', at: 1400 }],
        set: merge(rows('R', 13, 16, 200, 260), { hl: { y: { to: Y0 + 15 * DY - 11, delay: 600, dur: 400 }, fill: { to: C.tealW, delay: 600, dur: 300 }, stroke: { to: C.teal, delay: 600, dur: 300 } } }) },
      { say: '对比一下。多了 -l，就多出 3 次 lstat 和 7 次 open。原始 trace 从 91 行涨到 224 行。程序做了什么，直接取决于你给的参数。',
        eq: ['lstat：0 → 3（目录本身 1 次 + 2 个文件各 1 次）', { s: 'open：0 → 7（6 次找翻译文件 + 1 次时区文件）', at: 600 }, { s: 'write：12 → 102 字节（多了权限、大小、时间）', at: 1200 }],
        set: { hl: { opacity: { to: 0, dur: 300 } } } }
    ]
  };

  VZ.register({
    id: 'lab04-strace', title: '本机 strace：ls 与 ls -l 各做了哪些调用',
    sources: [
      { t: '讲义练习 调试 4', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#exercises' },
      { t: 'Cygwin strace', u: 'https://cygwin.com/cygwin-ug-net/strace.html' }
    ],
    note: '每一行调用、每个计数，都来自 d4-a 和 d4-b 的真跑输出。输出经 calls.awk 整理过。高亮条和动画是示意。',
    scenes: [sceneStrace]
  });

  VZ.register({
    id: 'lab04-cpu', title: 'CPU 亲和性：3 个 worker 挤进 2 个 CPU',
    sources: [
      { t: '讲义练习 性能 4', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#exercises' },
      { t: 'Microsoft · start /affinity', u: 'https://learn.microsoft.com/windows-server/administration/windows-commands/start' },
      { t: 'man taskset', u: 'https://www.man7.org/linux/man-pages/man1/taskset.1.html' }
    ],
    note: '百分比来自 p4-a 和 p4-b 的真跑输出，每次运行都会不同。worker 落在哪个 CPU 格子是示意。调度器的实际分配看不到。',
    scenes: [sceneCpu]
  });

  VZ.register({
    id: 'lab04-port', title: '谁占了 4444 端口：netstat + kill -W',
    sources: [
      { t: '讲义练习 性能 5', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#exercises' },
      { t: 'man ss', u: 'https://www.man7.org/linux/man-pages/man8/ss.8.html' }
    ],
    note: '控制台输出来自 p5-a 和 p5-b 的真跑结果，PID 每次运行都不同。进程和端口的连线是示意画法。',
    scenes: [scenePort]
  });
})();
