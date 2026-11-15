/* ch04 · 性能分析：time（§10）、基准测试（§11）、采样与火焰图 / 追踪对照（§13）
 * 依据：Lecture 4 视频 55:00–58:33（time 的 real/user/sys、多核、hyperfine）、1:01:21–1:07:12（perf record/report、
 *       火焰图、采样 vs 追踪）；讲义 debugging-profiling.md 的 Timing / CPU Profilers / Benchmarking 与性能练习 1–3。
 * 实测：场景 1 第 4–7 步、场景 3、场景 4 前 5 步的数字来自 练习生成脚本 在本机真跑（labs/lab04 p1-a、p1-b、p2-b、p2-c、p2-d、p3-a）。
 *       场景 1 前 3 步用讲义原文的 time curl 数字；第 6 步的 10 核例子出自视频口述。
 * 示意：场景 2 的样本计数按视频里 perf report 的百分比（cos 43.6%、sin 43.2%）折算成 1000 个样本，火焰图为示意绘制。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }

  /* ---------- 场景 1：real / user / sys ---------- */
  var BX0 = 170, BW = 620;
  function bar(y, col, colW, extra) { return merge({ type: 'box', anchor: 'tl', x: BX0, y: y, w: 0, h: 36, rx: 6, fill: colW, stroke: col, sw: 1.6 }, extra || {}); }
  function px(v, full) { return Math.max(3, BW * v / full); }
  var sceneTime = {
    name: 'real / user / sys', desc: 'time 报三个数。real 是墙上的钟走了多久。user 是 CPU 执行你的代码的时间。sys 是 CPU 在内核里替你干活的时间。三者的差别本身就是线索。',
    code: { lang: "sh", title: "本场景的命令", src: "time curl https://missing.csail.mit.edu &> /dev/null      # 讲义\ntime bash -c 'i=0; while [ $i -lt 200000 ]; do i=$((i+1)); done'\ntime sleep 1\ntime python -c 'sum(range(3 * 10**7))'\npython -c 'import time; t = time.process_time(); …; print(\"cpu seen by python itself:\", …)'" },
    dataTitle: 'time 的三个数',
    data: { 'real': '无', 'user': '无', 'sys': '无', 'CPU 占 real': '无' },
    legend: [[C.neutral, 'real：墙钟时间'], [C.data, 'user：用户态 CPU'], [C.info, 'sys：内核态 CPU'], [C.teal, '网络往返']],
    bg: function (d) {
      d.text(430, 26, '同一段时间，三把不同的尺子', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [['real', 150], ['user', 220], ['sys', 290]].forEach(function (r) { d.text(BX0 - 16, r[1] + 18, r[0], { anchor: 'end', size: 15, mono: true, weight: 800, color: C.fg2 }); });
      d.line(BX0, 136, BX0, 340, { stroke: C.line, sw: 1.4 });
    },
    objects: {
      bR: bar(150, C.neutral, C.bg3), bU: bar(220, C.data, C.dataW), bS: bar(290, C.info, C.infoW),
      bG: bar(220, C.bad, 'none', { dasharray: '6 4', sw: 2, opacity: 0 }),
      vR: { type: 'text', x: BX0 + 8, y: 168, anchor: 'start', text: '', mono: true, size: 13, weight: 800, color: C.fg },
      vU: { type: 'text', x: BX0 + 8, y: 238, anchor: 'start', text: '', mono: true, size: 13, weight: 800, color: C.fg },
      vS: { type: 'text', x: BX0 + 8, y: 308, anchor: 'start', text: '', mono: true, size: 13, weight: 800, color: C.fg },
      net: { type: 'path', d: 'M260,440 C380,380 520,380 640,440', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' },
      netb: { type: 'path', d: 'M640,450 C520,510 380,510 260,450', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' },
      cu: { type: 'box', x: 200, y: 445, w: 110, h: 40, rx: 9, fill: C.dataW, stroke: C.data, sw: 1.6, text: 'curl', mono: true, size: 14, weight: 750, color: C.fg, opacity: 0 },
      sv: { type: 'box', x: 700, y: 445, w: 130, h: 40, rx: 9, fill: C.tealW, stroke: C.teal, sw: 1.6, text: '课程网站', size: 13, weight: 750, color: C.fg, opacity: 0 }
    },
    steps: [
      { hl: [1], say: '讲义的例子：time curl 抓取课程网站。real = 0.272 s，从敲回车到命令结束，墙上的钟走了这么久。',
        log: ['$ time curl https://missing.csail.mit.edu &> /dev/null', { s: 'real\t0m0.272s', at: 900 }], data: { 'real': { v: '0.272 s', at: 900 } },
        set: { bR: { w: { to: px(272, 272), dur: 900, ease: 'linear' } }, vR: { text: { to: '0.272 s', delay: 900 } } } },
      { hl: [1], say: 'user 0.079 s，是 CPU 执行 curl 自己代码的时间。sys 0.028 s，是 CPU 在内核里替它干活的时间。比如收发网络数据。',
        log: [{ s: 'user\t0m0.079s', at: 400 }, { s: 'sys \t0m0.028s', at: 800 }], data: { 'user': { v: '0.079 s', at: 600 }, 'sys': { v: '0.028 s', at: 1000 } },
        set: { bU: { w: { to: px(79, 272), dur: 600, ease: 'out' } }, bS: { w: { to: px(28, 272), delay: 400, dur: 600, ease: 'out' } }, vU: { text: { to: '0.079 s', delay: 600 }, x: { to: BX0 + px(79, 272) + 8, dur: 600 } }, vS: { text: { to: '0.028 s', delay: 1000 }, x: { to: BX0 + px(28, 272) + 8, delay: 400, dur: 600 } } } },
      { hl: [1], say: '剩下的时间去哪了？在等网络。请求飞到服务器再飞回来，这段时间 CPU 是空闲的。它不计入 user，也不计入 sys。',
        eq: ['user + sys = 0.079 + 0.028 = 0.107 s', { s: 'real − (user + sys) = 0.272 − 0.107 = 0.165 s', at: 600 }, { s: '→ 约 60% 的时间在等待（网络往返）', at: 1100 }],
        data: { 'CPU 占 real': { v: '39%', at: 600 } },
        set: { cu: { opacity: { to: 1, dur: 300 } }, sv: { opacity: { to: 1, dur: 300 } }, net: { dash: { to: 1, delay: 300, dur: 600 } }, netb: { dash: { to: 1, delay: 1000, dur: 600 } } },
        fx: [{ type: 'stream', path: 'net', at: 400, n: 2, dur: 800, color: C.teal, labels: ['GET'] }, { type: 'stream', path: 'netb', at: 1100, n: 3, dur: 800, color: C.teal, labels: ['HTML'] }] },
      { hl: [2], say: '本机实测，换成纯计算：bash 里数到 20 万。user + sys 占了 real 的大部分。CPU 一直在忙，没在等。',
        log: ["$ time bash -c 'i=0; while [ $i -lt 200000 ]; do i=$((i+1)); done'", { s: 'real\t0m3.130s', at: 700 }, { s: 'user\t0m2.406s', at: 800 }, { s: 'sys\t0m0.296s', at: 900 }],
        data: { 'real': '3.130 s', 'user': '2.406 s', 'sys': '0.296 s', 'CPU 占 real': '86%' },
        eq: { s: '(2.406 + 0.296) / 3.130 = 86% → CPU 密集', at: 1000 },
        set: { net: { dash: { to: 0, dur: 300 } }, netb: { dash: { to: 0, dur: 300 } }, cu: { opacity: { to: 0, dur: 300 } }, sv: { opacity: { to: 0, dur: 300 } },
          bU: { w: { to: px(2406, 3130), delay: 300, dur: 700 } }, bS: { w: { to: px(296, 3130), delay: 300, dur: 700 } }, vR: { text: '3.130 s' }, vU: { text: '2.406 s', x: { to: BX0 + px(2406, 3130) + 8, delay: 300, dur: 700 } }, vS: { text: '0.296 s', x: { to: BX0 + px(296, 3130) + 8, delay: 300, dur: 700 } } } },
      { hl: [3], say: 'time sleep 1：real 1.25 s，user 和 sys 几乎为 0。睡觉就是等待，不花 CPU（本机实测）。',
        log: ['$ time sleep 1', { s: 'real\t0m1.248s', at: 500 }, { s: 'user\t0m0.015s', at: 600 }, { s: 'sys\t0m0.046s', at: 700 }],
        data: { 'real': '1.248 s', 'user': '0.015 s', 'sys': '0.046 s', 'CPU 占 real': '5%' },
        set: { bU: { w: { to: px(15, 1248), dur: 700 } }, bS: { w: { to: px(46, 1248), dur: 700 } }, vR: { text: '1.248 s' }, vU: { text: '0.015 s', x: { to: BX0 + px(15, 1248) + 8, dur: 700 } }, vS: { text: '0.046 s', x: { to: BX0 + px(46, 1248) + 8, dur: 700 } } } },
      { hl: [1], say: '多核时 user 可以比 real 还大。user 统计的是所有 CPU 时间之和。视频的例子是 10 个核各忙 1 秒（56:10）。这时 real 1 秒，user 10 秒。',
        eq: ['10 核 × 1 s = 10 CPU·秒', { s: 'real = 1 s，user ≈ 10 s → user / real = 10', at: 700 }],
        data: { 'real': '1 s（视频口述）', 'user': '≈ 10 s', 'sys': '无', 'CPU 占 real': '≈ 1000%' },
        set: { bR: { w: { to: px(1, 10), dur: 700 } }, bU: { w: { to: px(10, 10), dur: 900 } }, bS: { w: { to: 3, dur: 400 } }, vR: { text: '1 s', x: { to: BX0 + px(1, 10) + 8, dur: 700 } }, vU: { text: '10 s', x: { to: BX0 + px(10, 10) - 60, dur: 900 } }, vS: { text: '' } } },
      { hl: [4, 5], say: '本机的坑：Git Bash 的 time 统计不到原生 Windows 程序的 CPU 时间。python 自己测得用了 0.47 s CPU，time 却报 user 0.015 s（本机实测）。',
        log: ["$ time python -c 'sum(range(3 * 10**7))'", { s: 'real\t0m0.735s', at: 400 }, { s: 'user\t0m0.015s', at: 500, cls: 'err' }, { s: 'sys\t0m0.031s', at: 600 }, { s: 'cpu seen by python itself: 0.47 s', at: 1300, cls: 'ok' }],
        data: { 'real': '0.735 s', 'user': '0.015 s（错）', 'sys': '0.031 s', 'CPU 占 real': '实际约 64%' },
        set: { bR: { w: { to: px(735, 735), dur: 700 } }, bU: { w: { to: px(15, 735), dur: 700 } }, bS: { w: { to: px(31, 735), dur: 700 } }, vR: { text: '0.735 s', x: { to: BX0 + 8, dur: 0 } }, vU: { text: '0.015 s（time 看到的）', x: { to: BX0 + px(15, 735) + 8, dur: 700 } }, vS: { text: '0.031 s', x: { to: BX0 + px(31, 735) + 8, dur: 700 } },
          bG: { opacity: { to: 1, delay: 1100, dur: 300 }, w: { from: 0, to: px(470, 735), delay: 1100, dur: 700 } } },
        fx: [{ type: 'float', x: BX0 + px(470, 735) / 2, y: 210, at: 1600, text: '实际 0.47 s', color: C.bad }] }
    ]
  };

  /* ---------- 场景 2：采样 → 火焰图 ---------- */
  var SX = 150, FX0 = 60, FW = 760;
  var ROWS = [['main;slow_computation;cos', 436, C.warn], ['main;slow_computation;sin', 432, C.bad], ['main;slow_computation', 132, C.info]];
  function flame(y, w, x, t, col, colW) { return { type: 'box', anchor: 'tl', x: x, y: y, w: 0, h: 28, rx: 3, fill: colW, stroke: col, sw: 1.3, text: t, mono: true, size: 12, weight: 700, color: C.fg, opacity: 0 }; }
  var sceneFlame = {
    name: '采样 → 火焰图', desc: 'perf 是采样型 profiler。它每隔一小段时间暂停程序，记下此刻的调用栈。把成千上万个栈合并计数，再画成火焰图。方块越宽，CPU 在那里待得越久。',
    code: { lang: "sh", title: "讲义 / 视频里的 perf 命令（本机未运行）", src: "gcc -g -O2 slow.c -o slow -lm\nperf record -g ./slow\nperf report\nperf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg" },
    dataTitle: '采样统计（示意：按视频百分比折算为 1000 个样本）',
    data: { '已采样': 0, '当前栈顶': '无' },
    dataFmt: { '已采样': 'int' },
    legend: [[C.info, '调用栈的一层'], [C.warn, 'cos'], [C.bad, 'sin'], [C.data, '采样时钟']],
    bg: function (d) {
      d.text(430, 26, '采样：定时拍下调用栈 → 相同的栈合并计数 → 画成火焰图', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(SX, 80, '正在运行的程序', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
      d.rect(470, 90, 380, 150, { fill: C.bg2, stroke: C.line, rx: 10 });
      d.text(660, 106, '合并后的栈（folded stacks）→ 样本数', { anchor: 'middle', size: 11.5, weight: 700, color: C.fg3 });
      d.text(430, 302, '火焰图：自下而上是由外到内，宽度是样本占比', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
    },
    objects: function () {
      var o = {
        s0: { type: 'box', x: SX, y: 250, w: 190, h: 30, rx: 6, fill: C.bg3, stroke: C.line, sw: 1.4, text: '_start', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 },
        s1: { type: 'box', x: SX, y: 216, w: 190, h: 30, rx: 6, fill: C.infoW, stroke: C.info, sw: 1.4, text: 'main', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 },
        s2: { type: 'box', x: SX, y: 182, w: 190, h: 30, rx: 6, fill: C.infoW, stroke: C.info, sw: 1.4, text: 'slow_computation', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 },
        s3: { type: 'box', x: SX, y: 148, w: 190, h: 30, rx: 6, fill: C.warnW, stroke: C.warn, sw: 1.4, text: 'cos', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 },
        clk: { type: 'circle', x: 330, y: 150, r: 24, fill: C.dataW, stroke: C.data, sw: 2, text: '1 ms', size: 11.5, weight: 800, color: C.data, opacity: 0 },
        snap: { type: 'path', d: 'M246,150 C330,190 400,200 470,176', stroke: C.data, sw: 1.8, dash: 0, arrow: 'data' },
        tok: { type: 'box', x: SX, y: 180, w: 60, h: 22, rx: 5, fill: C.dataW, stroke: C.data, sw: 1.2, text: '栈快照', size: 11, weight: 750, color: C.data, opacity: 0, trail: { n: 4, gap: 36 } },
        f0: flame(500, 0, FX0, '_start', C.neutral, C.bg3),
        f1: flame(468, 0, FX0, 'main', C.info, C.infoW),
        f2: flame(436, 0, FX0, 'slow_computation', C.info, C.infoW),
        f3: flame(404, 0, FX0, 'cos 43.6%', C.warn, C.warnW),
        f4: flame(404, 0, FX0 + FW * 0.436, 'sin 43.2%', C.bad, C.badW)
      };
      ROWS.forEach(function (r, k) {
        o['k' + k] = { type: 'text', x: 486, y: 140 + k * 34, anchor: 'start', text: r[0], mono: true, size: 12.5, weight: 700, color: r[2], opacity: 0 };
        o['n' + k] = { type: 'text', x: 836, y: 140 + k * 34, anchor: 'end', num: 0, fmt: 'int', mono: true, size: 14, weight: 800, color: C.fg, opacity: 0 };
      });
      return o;
    },
    steps: [
      { hl: [2], say: '程序在跑：调用栈随时间变化。slow_computation 的内层循环里，栈顶一会儿是 cos，一会儿是 sin。', data: { '当前栈顶': 'cos / sin 交替' },
        set: { s0: { opacity: { to: 1, dur: 250 } }, s1: { opacity: { to: 1, delay: 150, dur: 250 } }, s2: { opacity: { to: 1, delay: 300, dur: 250 } },
          s3: { opacity: { to: 1, delay: 450, dur: 250 }, text: { to: 'sin', delay: 900 }, fill: { to: C.badW, delay: 900, dur: 150 }, stroke: { to: C.bad, delay: 900, dur: 150 } } },
        fx: [{ type: 'flash', obj: 's3', at: 900, color: C.bad }, { type: 'flash', obj: 's3', at: 1500, color: C.warn }] },
      { hl: [2], say: '采样器每隔约 1 ms 暂停一下程序（视频 1:01:57）。它把此刻整条调用栈拍下来，再让程序继续跑。这次拍到的是 main → slow_computation → sin。', data: { '已采样': 1 },
        set: { clk: { opacity: { to: 1, dur: 300 }, r: { from: 14, to: 24, dur: 400, ease: 'back' } }, tok: { opacity: { to: 1, delay: 500, dur: 150 }, x: { to: 640, delay: 600, dur: 900, ease: 'inOut' }, y: { to: 174, delay: 600, dur: 900, ease: 'inOut' } },
          k1: { opacity: { to: 1, delay: 1400, dur: 250 } }, n1: { opacity: { to: 1, delay: 1400, dur: 250 }, num: { to: 1, delay: 1450, dur: 100 } } },
        fx: [{ type: 'ripple', obj: 'clk', at: 400, color: C.data }, { type: 'pulse', obj: 's3', at: 450, color: C.data }] },
      { hl: [2], say: '一秒钟拍上千次。相同的栈合并成一行计数。这就是 flamegraph.pl 吃进去的 “folded stacks” 格式。', data: { '已采样': { v: 1000, at: 1600 } },
        set: { snap: { dash: { to: 1, dur: 300 } }, tok: { opacity: { to: 0, dur: 200 } }, k0: { opacity: { to: 1, dur: 250 } }, n0: { opacity: { to: 1, dur: 250 }, num: { to: 436, delay: 200, dur: 1600, ease: 'linear' } },
          n1: { num: { to: 432, delay: 200, dur: 1600, ease: 'linear' } }, k2: { opacity: { to: 1, dur: 250 } }, n2: { opacity: { to: 1, dur: 250 }, num: { to: 132, delay: 200, dur: 1600, ease: 'linear' } },
          s3: { text: { to: 'cos', delay: 400 }, fill: { to: C.warnW, delay: 400, dur: 100 }, stroke: { to: C.warn, delay: 400, dur: 100 } } },
        fx: [{ type: 'pulse', obj: 'clk', at: 100, color: C.data }, { type: 'pulse', obj: 'clk', at: 500, color: C.data }, { type: 'pulse', obj: 'clk', at: 900, color: C.data }, { type: 'pulse', obj: 'clk', at: 1300, color: C.data },
          { type: 'stream', path: 'snap', at: 150, n: 9, gap: 0.1, dur: 1500, color: C.data, labels: ['cos', 'sin', 'cos', 'slow', 'sin', 'cos', 'sin', 'cos', '…'] }] },
      { hl: [3], say: 'perf report 把样本数换成百分比。Self 列只算函数自身，Children 列还包括它调用的函数。视频里 cos 占 43.6%，sin 占 43.2%（1:03:08）。',
        eq: ['cos：436 / 1000 = 43.6%', { s: 'sin：432 / 1000 = 43.2%', at: 400 }, { s: 'slow_computation 自身：132 / 1000 = 13.2%', at: 800 }, { s: 'main 的 Children = 100%（所有样本都在它下面）', at: 1200 }],
        log: ['$ perf record -g ./slow', '$ perf report', { s: '（视频：Self 列 cos 43.6%、sin 43.2%。本机无 perf，未实测）', at: 400, cls: 'dim' }] },
      { hl: [4], say: '画火焰图。最底层是入口 _start。往上一层是它调用的 main，再往上是 slow_computation。所有样本都经过它们，所以都是满宽。见视频 1:05:25。',
        log: ['$ perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg'],
        set: { f0: { opacity: { to: 1, dur: 200 }, w: { to: FW, dur: 700, ease: 'out' } }, f1: { opacity: { to: 1, delay: 300, dur: 200 }, w: { to: FW, delay: 300, dur: 700, ease: 'out' } }, f2: { opacity: { to: 1, delay: 600, dur: 200 }, w: { to: FW, delay: 600, dur: 700, ease: 'out' } } } },
      { hl: [4], say: 'slow_computation 之上分出 cos 和 sin，宽度各约一半。剩下 13% 的空白是循环本身。一眼就知道时间花在哪。',
        eq: ['方块宽度 = 总宽 × 占比', { s: 'cos：760 px × 43.6% ≈ 331 px', at: 400 }, { s: 'sin：760 px × 43.2% ≈ 328 px', at: 800 }],
        set: { f3: { opacity: { to: 1, dur: 200 }, w: { to: FW * 0.436, dur: 800, ease: 'out' } }, f4: { opacity: { to: 1, delay: 300, dur: 200 }, w: { to: FW * 0.432, delay: 300, dur: 800, ease: 'out' } } },
        fx: [{ type: 'pulse', obj: 'f3', at: 900, color: C.warn }, { type: 'pulse', obj: 'f4', at: 1200, color: C.bad }] },
      { hl: [4], say: '读图注意：横轴不是时间顺序。同一层的方块按名字排列。颜色只是为了好看。真实程序的火焰图，可以点击放大某一块。这条是补充，见 Brendan Gregg 的火焰图说明。',
        fx: [{ type: 'flash', obj: 'f2', at: 200, color: C.info }] },
      { hl: [2], say: '采样的代价：频率越高越准，但暂停越多，拖慢也越多。它只看到“被拍到的瞬间”。想要精确的调用次数，就用追踪型的 Valgrind callgrind。代价是慢得多（视频 1:06:35）。',
        eq: { s: '采样：开销小，统计近似。追踪：开销大，计数精确', at: 300 } }
    ]
  };

  /* ---------- 场景 3：追踪 vs 采样（本机实测 Python 版） ---------- */
  var TB0 = 230, TBW = 560, TMAX = 1.052;
  function tbar(y, col, colW) { return { type: 'box', anchor: 'tl', x: TB0, y: y, w: 0, h: 30, rx: 6, fill: colW, stroke: col, sw: 1.5 }; }
  var SLOWPY = 'import math\n\n\ndef slow_computation(n):\n    result = 0.0\n    for i in range(n):\n        for j in range(1000):\n            result += math.sin(i * j) * math.cos(i + j)\n    return result\n\n\ndef main():\n    r = 0.0\n    for i in range(10):\n        r += slow_computation(100)\n    print(f"Result: {r:f}")\n\n\nif __name__ == "__main__":\n    main()';
  var sceneTrace = {
    name: '追踪 vs 采样', desc: '同一个 slow.py，也就是 slow.c 的 Python 版，分别用两种 profiler 分析。cProfile 是追踪型，每次调用都记账。自己写的 sampler.py 是采样型，定时看一眼。两种方法的代价和能看到的东西都不同（本机实测）。',
    code: { lang: 'py', title: 'slow.py（练习页 性能 2）', src: SLOWPY },
    dataTitle: '本机实测',
    data: { '记录到的调用': 0, '样本数': 0, '运行时间': '无' },
    dataFmt: { '记录到的调用': 'int', '样本数': 'int' },
    bg: function (d) {
      d.text(430, 26, '追踪型：每次调用都经过钩子    采样型：每 ~1 ms 看一眼', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [['直接运行', 380], ['cProfile', 420], ['sampler.py', 460]].forEach(function (r) { d.text(TB0 - 12, r[1] + 15, r[0], { anchor: 'end', size: 13, mono: true, weight: 700, color: C.fg2 }); });
      d.text(TB0, 362, '运行时间（本机实测）', { size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: {
      prog: { type: 'box', x: 120, y: 190, w: 160, h: 50, rx: 10, fill: C.infoW, stroke: C.info, sw: 1.8, text: 'slow.py 运行中', size: 13, weight: 750, color: C.info },
      hook: { type: 'box', x: 470, y: 120, w: 200, h: 44, rx: 10, fill: C.warnW, stroke: C.warn, sw: 1.6, text: 'cProfile 钩子：每次调用记账', size: 12.5, weight: 750, color: C.fg, opacity: 0 },
      hc: { type: 'text', x: 700, y: 120, anchor: 'start', num: 0, fmt: function (v) { return Math.round(v).toLocaleString('en-US') + ' 次'; }, size: 15, weight: 800, mono: true, color: C.warn, opacity: 0 },
      hp: { type: 'path', d: 'M200,180 C300,150 340,125 368,122', stroke: C.warn, sw: 2, dash: 0, arrow: 'warn' },
      samp: { type: 'box', x: 470, y: 260, w: 200, h: 44, rx: 10, fill: C.dataW, stroke: C.data, sw: 1.6, text: 'sampler：定时看一眼栈', size: 12.5, weight: 750, color: C.fg, opacity: 0 },
      sc: { type: 'text', x: 700, y: 260, anchor: 'start', num: 0, fmt: function (v) { return Math.round(v) + ' 个样本'; }, size: 15, weight: 800, mono: true, color: C.data, opacity: 0 },
      sp: { type: 'path', d: 'M200,200 C300,240 340,258 368,258', stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      t0: tbar(380, C.neutral, C.bg3), t1: tbar(420, C.warn, C.warnW), t2: tbar(460, C.data, C.dataW),
      l0: { type: 'text', x: TB0 + 8, y: 395, anchor: 'start', text: '', mono: true, size: 12.5, weight: 800, color: C.fg },
      l1: { type: 'text', x: TB0 + 8, y: 435, anchor: 'start', text: '', mono: true, size: 12.5, weight: 800, color: C.fg },
      l2: { type: 'text', x: TB0 + 8, y: 475, anchor: 'start', text: '', mono: true, size: 12.5, weight: 800, color: C.fg }
    },
    steps: [
      { say: 'slow.py：10 次 slow_computation(100)，一共 100 万次 sin 加 100 万次 cos。直接运行 0.40 s（本机实测）。', hl: [8],
        log: ['$ time python slow.py', { s: 'Result: -3260.175422', at: 500 }, { s: 'real\t0m0.402s', at: 800 }], data: { '运行时间': '0.402 s' },
        set: { t0: { w: { to: TBW * 0.402 / TMAX, delay: 200, dur: 700, ease: 'linear' } }, l0: { text: { to: '0.402 s', delay: 900 }, x: { to: TB0 + TBW * 0.402 / TMAX + 8, delay: 200, dur: 700 } } } },
      { say: 'cProfile 是追踪型。Python 每调用、返回一次函数，都会触发它的钩子去记账。200 万次 sin、cos 一个不落。',
        data: { '记录到的调用': { v: 2000095, at: 1500 } },
        set: { hook: { opacity: { to: 1, dur: 300 } }, hp: { dash: { to: 1, delay: 200, dur: 500 } }, hc: { opacity: { to: 1, delay: 300, dur: 200 }, num: { to: 2000095, delay: 400, dur: 1400, ease: 'out' } } },
        fx: [{ type: 'stream', path: 'hp', at: 400, n: 12, gap: 0.06, dur: 1400, color: C.warn }] },
      { say: '代价是变慢。同一个程序在 cProfile 下跑了 1.05 s，是直接运行的 2.6 倍。记账本身也要花时间。',
        log: ['$ time python -m cProfile slow.py > /dev/null', { s: 'real\t0m1.052s', at: 600 }], data: { '运行时间': '1.052 s（cProfile）' },
        eq: ['开销倍数 = 1.052 / 0.402 ≈ 2.6', { s: '→ 被测程序被拖慢，测出的绝对时间也偏大', at: 600 }],
        set: { t1: { w: { to: TBW, delay: 200, dur: 900, ease: 'linear' } }, l1: { text: { to: '1.052 s', delay: 1100 } } } },
      { say: '回报是精确的调用次数，以及每个函数的自身耗时 tottime。sin、cos 各 100 万次，合计 0.34 s。循环本身 0.40 s。',
        log: ['$ python -m cProfile -s tottime slow.py | head -12', { s: '2000095 function calls in 0.736 seconds', at: 300 }, { s: '   ncalls  tottime  …  filename:lineno(function)', at: 500 }, { s: '       10    0.399  …  slow.py:4(slow_computation)', at: 700 }, { s: '  1000000    0.170  …  {built-in method math.sin}', at: 900 }, { s: '  1000000    0.165  …  {built-in method math.cos}', at: 1100 }],
        fx: [{ type: 'pulse', obj: 'hook', at: 300, color: C.warn }] },
      { say: 'sampler.py 是我们自己写的 40 行采样器。后台线程每 ~1 ms 看一眼主线程的栈。一共 130 个样本，程序几乎没变慢，用了 0.39 s。',
        log: ['$ time python sampler.py slow.py > /dev/null', { s: 'real\t0m0.389s', at: 700 }], data: { '样本数': { v: 130, at: 1300 }, '运行时间': '0.389 s（采样）' },
        set: { samp: { opacity: { to: 1, dur: 300 } }, sp: { dash: { to: 1, delay: 200, dur: 500 } }, sc: { opacity: { to: 1, delay: 300, dur: 200 }, num: { to: 130, delay: 400, dur: 1000 } },
          t2: { w: { to: TBW * 0.389 / TMAX, delay: 200, dur: 700, ease: 'linear' } }, l2: { text: { to: '0.389 s', delay: 900 }, x: { to: TB0 + TBW * 0.389 / TMAX + 8, delay: 200, dur: 700 } } },
        fx: [{ type: 'stream', path: 'sp', at: 400, n: 5, gap: 0.2, dur: 1400, color: C.data }] },
      { say: '但它只看得到 Python 帧。sin、cos 是 C 写的内置函数，没有自己的栈帧。于是 99.2% 的样本都落在第 8 行。用 perf 看没有调试符号的 C 程序，也会遇到类似问题。见讲义 debug symbols 一节。', hl: [8],
        log: ['$ python sampler.py slow.py', { s: '--- 130 samples, folded stacks (stack count share) ---', at: 300 }, { s: '<module>;main;slow_computation:8 129 99.2%', at: 600 }, { s: '<module>;main;slow_computation:7 1 0.8%', at: 800 }],
        eq: ['129 / 130 = 99.2% → 热点就是第 8 行', { s: 'cProfile 能把它拆成 sin 0.170 s + cos 0.165 s', at: 700 }] }
    ]
  };

  /* ---------- 场景 4：基准测试的均值与标准差（本机实测 bench.py） ---------- */
  var AX0 = 140, AXW = 640, AMAX = 300;
  function ax(ms) { return AX0 + AXW * ms / AMAX; }
  var B = [{ y: 190, mean: 147.8, sd: 43.1, mn: 104.2, mx: 255.1, col: C.warn, colW: C.warnW, name: 'grep -rnI' }, { y: 330, mean: 81.3, sd: 12.2, mn: 67.8, mx: 115.8, col: C.data, colW: C.dataW, name: 'git grep' }];
  function benchObjs() {
    var o = {};
    B.forEach(function (b, k) {
      o['rg' + k] = { type: 'line', x1: ax(b.mn), y1: b.y, x2: ax(b.mx), y2: b.y, stroke: b.col, sw: 2.5, dash: 0 };
      o['sd' + k] = { type: 'box', x: ax(b.mean), y: b.y, w: 0, h: 34, rx: 6, fill: b.colW, stroke: b.col, sw: 1.4, opacity: 0.85 };
      o['mu' + k] = { type: 'box', x: AX0, y: b.y, w: 6, h: 46, rx: 2, fill: b.col, stroke: b.col, sw: 1, opacity: 0, trail: { n: 4, gap: 40 } };
      o['ml' + k] = { type: 'text', x: ax(b.mean), y: b.y - 38, text: b.mean.toFixed(1) + ' ± ' + b.sd.toFixed(1) + ' ms', mono: true, size: 13, weight: 800, color: b.col, opacity: 0 };
      o['mm' + k] = { type: 'text', x: ax(b.mn), y: b.y + 36, text: b.mn + ' … ' + b.mx + ' ms', anchor: 'start', mono: true, size: 11.5, color: C.fg2, opacity: 0 };
      o['rn' + k] = { type: 'text', x: 820, y: b.y, anchor: 'end', num: 0, fmt: function (v) { return '第 ' + Math.round(v) + ' / 20 次'; }, size: 12, weight: 700, color: C.fg3, opacity: 0 };
    });
    return o;
  }
  var sceneBench = {
    name: '基准测试 mean ± σ', desc: '同一条命令每次运行的耗时都不一样。基准测试要多跑几次，看均值和标准差。比较两条命令时，倍数也要带上不确定度。',
    code: { lang: "py", title: "p3/bench.py（练习页性能 3）", src: "import math\nimport shlex\nimport statistics\nimport subprocess\nimport sys\nimport time\n\n\ndef run_once(argv):\n    t0 = time.perf_counter()\n    subprocess.run(argv, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)\n    return time.perf_counter() - t0\n\n\ndef bench(cmd, warmup, runs):\n    argv = shlex.split(cmd)\n    for _ in range(warmup):\n        run_once(argv)\n    return [run_once(argv) for _ in range(runs)]\n\n\ndef ms(x):\n    return f\"{1000 * x:7.1f} ms\"\n\n\nif __name__ == \"__main__\":\n    warmup, runs, cmds = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3:]\n    stats = []\n    for k, cmd in enumerate(cmds, 1):\n        t = bench(cmd, warmup, runs)\n        mean, sd = statistics.mean(t), statistics.stdev(t)\n        stats.append((mean, sd, cmd))\n        print(f\"Benchmark {k}: {cmd}\")\n        print(f\"  Time (mean ± σ):  {ms(mean)} ± {ms(sd)}\")\n        print(f\"  Range (min … max): {ms(min(t))} … {ms(max(t))}    {runs} runs\")\n    fast = min(stats)\n    print(\"Summary\")\n    print(f\"  '{fast[2]}' ran\")\n    for mean, sd, cmd in stats:\n        if cmd == fast[2]:\n            continue\n        ratio = mean / fast[0]\n        err = ratio * math.sqrt((sd / mean) ** 2 + (fast[1] / fast[0]) ** 2)\n        print(f\"    {ratio:.2f} ± {err:.2f} times faster than '{cmd}'\")" },
    dataTitle: 'bench.py 的结果（本机实测，20 次）',
    data: { 'grep 均值': '无', 'git grep 均值': '无', '倍数': '无' },
    legend: [[C.warn, 'grep -rnI'], [C.data, 'git grep'], [C.neutral, '横轴：毫秒']],
    bg: function (d) {
      d.text(430, 26, '每次耗时不同 → 用“均值 ± 标准差”描述，再比较', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(AX0, 420, AX0 + AXW, 420, { stroke: C.line, sw: 1.4 });
      [0, 50, 100, 150, 200, 250, 300].forEach(function (v) { d.line(ax(v), 416, ax(v), 424, { stroke: C.line }); d.text(ax(v), 438, v + '', { anchor: 'middle', size: 11.5, mono: true, color: C.fg3 }); });
      d.text(AX0 + AXW, 456, 'ms', { anchor: 'end', size: 11.5, color: C.fg3 });
      B.forEach(function (b) { d.text(AX0 - 10, b.y, b.name, { anchor: 'end', size: 12.5, mono: true, weight: 750, color: b.col }); });
    },
    objects: benchObjs,
    steps: [
      { hl: [17, 18, 19], say: '用 bench.py 比较 grep -r 和 git grep，做法照搬 hyperfine。各先跑 3 次预热，不计时，让文件进入磁盘缓存。再各跑 20 次计时。',
        log: ["$ python p3/bench.py 3 20 'grep -rnI --exclude-dir=.git debug corpus' 'git -C corpus grep -n debug'"],
        set: { rn0: { opacity: { to: 1, dur: 200 }, num: { to: 20, delay: 200, dur: 1600, ease: 'linear' } }, rn1: { opacity: { to: 1, dur: 200 }, num: { to: 20, delay: 500, dur: 1600, ease: 'linear' } } } },
      { hl: [35], say: 'grep 的 20 次里，最快 104.2 ms，最慢 255.1 ms。同一条命令差了一倍多。只跑一次 time 的结论很不可靠（视频 56:46）。',
        log: [{ s: 'Benchmark 1: grep -rnI --exclude-dir=.git debug corpus', at: 200 }, { s: '  Range (min … max):   104.2 ms …   255.1 ms    20 runs', at: 700 }],
        set: { rg0: { dash: { to: 1, delay: 200, dur: 800 } }, mm0: { opacity: { to: 1, delay: 900, dur: 300 } } } },
      { hl: [31, 34], say: '均值 147.8 ms，标准差 σ = 43.1 ms。均值左右各一个 σ 的范围，就是图里的色块。一次典型的运行，耗时就落在这里。', data: { 'grep 均值': { v: '147.8 ± 43.1 ms', at: 900 } },
        log: { s: '  Time (mean ± σ):    147.8 ms ±    43.1 ms', at: 900 },
        eq: ['均值 = Σ tᵢ / 20', { s: 'σ = √( Σ (tᵢ − 均值)² / (20 − 1) )', at: 400 }, { s: 'grep：147.8 ± 43.1 ms', at: 800 }],
        set: { mu0: { opacity: { to: 1, dur: 200 }, x: { to: ax(147.8), dur: 800, ease: 'out' } }, sd0: { w: { to: AXW * 2 * 43.1 / AMAX, delay: 700, dur: 600, ease: 'out' } }, ml0: { opacity: { to: 1, delay: 900, dur: 300 } } } },
      { hl: [31, 34], say: 'git grep：均值 81.3 ± 12.2 ms，范围 67.8 … 115.8 ms。它只搜 git 跟踪的文件，并且默认多线程。', data: { 'git grep 均值': { v: '81.3 ± 12.2 ms', at: 1000 } },
        log: [{ s: 'Benchmark 2: git -C corpus grep -n debug', at: 200 }, { s: '  Time (mean ± σ):     81.3 ms ±    12.2 ms', at: 800 }, { s: '  Range (min … max):    67.8 ms …   115.8 ms    20 runs', at: 1000 }],
        set: { rg1: { dash: { to: 1, delay: 200, dur: 700 } }, mm1: { opacity: { to: 1, delay: 800, dur: 300 } }, mu1: { opacity: { to: 1, dur: 200 }, x: { to: ax(81.3), dur: 800, ease: 'out' } }, sd1: { w: { to: AXW * 2 * 12.2 / AMAX, delay: 700, dur: 600, ease: 'out' } }, ml1: { opacity: { to: 1, delay: 900, dur: 300 } } } },
      { hl: [42, 43, 44], say: '倍数 = 147.8 / 81.3 = 1.82。两个均值都有误差。按误差传播算，倍数的不确定度是 ±0.60。bench.py 打印的正是这个。', data: { '倍数': { v: '1.82 ± 0.60', at: 1500 } },
        log: [{ s: 'Summary', at: 1300 }, { s: "  'git -C corpus grep -n debug' ran", at: 1400 }, { s: "    1.82 ± 0.60 times faster than 'grep -rnI --exclude-dir=.git debug corpus'", at: 1500 }],
        eq: ['r = 147.8 / 81.3 = 1.82', { s: 'σᵣ = r · √((43.1/147.8)² + (12.2/81.3)²)', at: 400 }, { s: '   = 1.82 · √(0.0850 + 0.0225) = 1.82 · 0.328', at: 800 }, { s: '   ≈ 0.60', at: 1200, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'mu0', at: 300, color: C.warn }, { type: 'pulse', obj: 'mu1', at: 500, color: C.data }] },
      { hl: [43], say: '用同一个公式，验算讲义里 hyperfine 的结果。fd 是 51.4 ± 2.9 ms，find 是 1.126 ± 0.101 s。算出 21.9 ± 2.3 倍，和讲义的 21.89 ± 2.33 一致。',
        log: ['（讲义原文）', "  'fd -e jpg' ran", "   21.89 ± 2.33 times faster than 'find . -iname \"*.jpg\"'"],
        eq: ['r = 1126 / 51.4 = 21.9', { s: '相对误差：2.9/51.4 = 0.056，101/1126 = 0.090', at: 500 }, { s: 'σᵣ = 21.9 × √(0.056² + 0.090²) = 21.9 × 0.106 ≈ 2.32', at: 1000, cls: 'ok' }] },
      { hl: [36], say: '读结果要谨慎。本机两个命令的波动范围有重叠，σ 也很大。这是因为机器上还有别的程序在跑。所以“快 1.82 倍”只是个粗略的说法。视频里 find 反而比 fd 快 40 倍（57:54）。空目录不是 fd 擅长的场景。',
        set: { sd0: { opacity: { to: 0.5, dur: 300 } }, sd1: { opacity: { to: 0.5, dur: 300 } } },
        fx: [{ type: 'flash', obj: 'sd0', at: 300, color: C.warn }] }
    ]
  };

  VZ.register({
    id: 'ch04-time', title: 'time 的三个数：real、user、sys',
    sources: [
      { t: '视频 55:00 time', u: 'https://youtu.be/8VYT9TcUmKs?t=3300' },
      { t: '讲义 Timing', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#timing' }
    ],
    note: '前 3 步是讲义原文的数字。第 4、5、7 步是本机 Git Bash 实测。第 6 步的 10 核例子是视频口述。网络往返的动画是示意。',
    scenes: [sceneTime]
  });

  VZ.register({
    id: 'ch04-bench', title: '基准测试：均值、标准差与倍数的不确定度',
    sources: [
      { t: '视频 57:17 hyperfine', u: 'https://youtu.be/8VYT9TcUmKs?t=3437' },
      { t: '讲义 Benchmarking', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#benchmarking' },
      { t: 'hyperfine', u: 'https://github.com/sharkdp/hyperfine' }
    ],
    note: '前 5 步是本机 bench.py 真跑，见练习页性能 3。第 6 步是讲义原文的 hyperfine 结果。“第 N 次”计数动画是示意。每次运行的单个耗时没画出来。',
    scenes: [sceneBench]
  });

  VZ.register({
    id: 'ch04-profilers', title: 'CPU profiler：采样、火焰图与追踪',
    sources: [
      { t: '视频 1:01:21 perf record', u: 'https://youtu.be/8VYT9TcUmKs?t=3681' },
      { t: '视频 1:04:48 火焰图', u: 'https://youtu.be/8VYT9TcUmKs?t=3888' },
      { t: '视频 1:06:35 采样的局限', u: 'https://youtu.be/8VYT9TcUmKs?t=3995' },
      { t: '讲义 CPU Profilers', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#cpu-profilers' },
      { t: 'Brendan Gregg · Flame Graphs', u: 'https://www.brendangregg.com/flamegraphs.html' }
    ],
    note: '场景 1 的样本数，按视频里 perf report 的百分比折算。一共折成 1000 个样本。百分比是 cos 43.6%、sin 43.2%，火焰图是示意。场景 2 的全部数字是本机实测，见练习页性能 2。',
    scenes: [sceneFlame, sceneTrace]
  });
})();
