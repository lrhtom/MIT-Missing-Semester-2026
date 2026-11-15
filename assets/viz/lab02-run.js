/* lab02 · 练习的“跑”可视化：逐行执行时数据怎么变
 * 控制台内容全部取自 labs/data/lab02.js 中真跑（Git Bash 5.3）的输出：ex05-a/b、ex06-a、ex07-b。
 * 每轮 random.sh 抽到的 n 值、/proc 里其他进程的条目是示意（真跑只记录了最终结果）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 10, fill: colW || C.bg, stroke: col || C.line, sw: 1.8, text: text || '', color: C.fg, mono: true, size: 13.5, weight: 700 }, extra || {});
  }
  function pipe(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.4, dash: 0, arrow: 'data' }, extra || {}); }

  /* ---------- 练习 5：跑到失败为止 ---------- */
  var SRC5 = 'count=0\nwhile true; do\n    count=$((count + 1))\n    if ! bash random.sh > out.log 2> err.log; then\n        break\n    fi\ndone\necho "found error after $count runs"\necho "--- stdout:"\ncat out.log\necho "--- stderr:"\ncat err.log';
  var sceneUntil = {
    name: '跑到失败为止', desc: '每一轮都覆盖写 out.log 和 err.log。random.sh 返回非 0 时，! 把条件变成真，break 跳出。文件里留下的，正好是失败那一轮。',
    code: { lang: 'sh', title: 'run_until_fail.sh（第 3–14 行）', src: SRC5 },
    dataTitle: '循环状态',
    data: { 'count': 0, 'n（示意）': '无', '$?': '无', 'out.log': '无', 'err.log': '无' },
    bg: function (d) {
      d.text(430, 28, '返回码驱动的循环：成功就再来一轮，失败就跳出并打印日志', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.path('M180,330 C180,420 420,420 420,330', { stroke: C.line, sw: 1.6, arrow: 'fg3', dash: '5 4' });
      d.text(300, 430, 'exit 0 → 下一轮', { anchor: 'middle', size: 12, color: C.fg3 });
    },
    objects: {
      cnt: { type: 'text', x: 180, y: 150, num: 0, pre: 'count = ', size: 22, weight: 800, mono: true, color: C.data },
      rnd: box(180, 290, 190, 60, 'bash random.sh', C.info, C.infoW),
      dice: { type: 'circle', x: 420, y: 290, r: 32, fill: C.bg3, stroke: C.line, sw: 2.4, text: 'n', size: 18, weight: 800, color: C.fg2 },
      w1: pipe('M275,276 C470,230 560,170 640,170', C.data),
      w2: pipe('M275,304 C470,350 560,400 640,400', C.bad),
      fo: box(720, 170, 160, 54, 'out.log', C.teal, C.tealW, { size: 13 }),
      fe: box(720, 400, 160, 54, 'err.log', C.teal, C.tealW, { size: 13 }),
      fot: { type: 'text', x: 720, y: 212, text: '', size: 11, mono: true, color: C.fg2 },
      fet: { type: 'text', x: 720, y: 442, text: '', size: 11, mono: true, color: C.fg2 },
      brk: box(420, 500, 200, 40, 'break → 打印日志', C.bad, C.badW, { opacity: 0, size: 13 })
    },
    steps: [
      { say: 'count 从 0 开始，进入 while true 循环。', hl: [1, 2], data: { 'count': 0 },
        fx: [{ type: 'pulse', obj: 'cnt', at: 200, color: C.data }] },
      { say: '第 1 轮：count 加 1，运行 random.sh。它抽到的 n 不是 42，这个数是示意。它只往 stdout 写一句，覆盖写进 out.log。err.log 被清成了空文件。', hl: [3, 4],
        data: { 'count': { v: 1, at: 300 }, 'n（示意）': { v: 17, at: 800 }, '$?': { v: 0, at: 1500 }, 'out.log': { v: 'Everything went according to plan', at: 1400 }, 'err.log': { v: '（空）', at: 1400 } },
        set: { cnt: { num: { to: 1, delay: 200, dur: 400 } }, dice: { text: { to: '17', delay: 800 } }, w1: { dash: { to: 1, delay: 900, dur: 400 } }, fot: { text: { to: 'Everything went according…', delay: 1400 } } },
        fx: [{ type: 'pulse', obj: 'rnd', at: 400, color: C.info }, { type: 'stream', path: 'w1', at: 1000, n: 1, dur: 500, color: C.data }, { type: 'ripple', obj: 'fo', at: 1500, color: C.ok }] },
      { say: '返回码 0 → ! 取反成假 → 不 break，回到循环开头。之后一轮接一轮，每轮都把两个文件覆盖重写。', hl: [4, 7],
        data: { 'count': { v: 129, at: 2400 }, 'n（示意）': '…' },
        set: { cnt: { num: { to: 129, delay: 200, dur: 2200, ease: 'in' } }, dice: { text: { to: '…', delay: 200 } } },
        fx: [{ type: 'stream', path: 'w1', at: 300, n: 5, dur: 900, color: C.data }, { type: 'stream', path: 'w1', at: 1200, n: 5, dur: 900, color: C.data }, { type: 'flash', obj: 'fo', at: 1300, color: C.teal }, { type: 'flash', obj: 'fo', at: 2100, color: C.teal }] },
      { say: '本机这一次，第 130 轮才抽中 42。stdout 写了 “Something went wrong”。stderr 写了 “The error was using magic numbers”，exit 1。', hl: [3, 4],
        data: { 'count': { v: 130, at: 300 }, 'n（示意）': { v: 42, at: 700 }, '$?': { v: 1, at: 1600 }, 'out.log': { v: 'Something went wrong', at: 1400 }, 'err.log': { v: 'The error was using magic numbers', at: 1500 } },
        set: { cnt: { num: { to: 130, dur: 300 } }, dice: { text: { to: '42', delay: 700 }, fill: { to: C.badW, delay: 700, dur: 200 }, stroke: { to: C.bad, delay: 700, dur: 200 }, color: { to: C.bad, delay: 700, dur: 200 } },
          w2: { dash: { to: 1, delay: 900, dur: 400 } }, fot: { text: { to: 'Something went wrong', delay: 1400 } }, fet: { text: { to: 'The error was using magic…', delay: 1500 } }, rnd: { stroke: { to: C.bad, delay: 1600, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'dice', at: 750 }, { type: 'stream', path: 'w1', at: 1000, n: 1, dur: 500, color: C.data }, { type: 'stream', path: 'w2', at: 1100, n: 1, dur: 500, color: C.bad }, { type: 'ripple', obj: 'fe', at: 1600, color: C.bad }] },
      { say: '返回码 1 → ! 取反成真 → break。此时两个文件里，正好是失败那一轮的输出。它们没有被下一轮覆盖。', hl: [5],
        set: { brk: { opacity: { to: 1, dur: 300 }, y: { from: 470, to: 500, dur: 400, ease: 'back' } } },
        fx: [{ type: 'burst', obj: 'brk', at: 300, color: C.bad }] },
      { say: '打印结果（本机实测 ex05-a）。stdout 与 stderr 分开存，一眼看出错误信息来自哪条流。', hl: [8, 9, 10, 11, 12],
        log: [{ s: '$ bash run_until_fail.sh', cls: 'in' }, { s: 'found error after 130 runs', at: 300 }, { s: '--- stdout:', at: 500 }, { s: 'Something went wrong', at: 700 }, { s: '--- stderr:', at: 900 }, { s: 'The error was using magic numbers', at: 1100 }],
        fx: [{ type: 'pulse', obj: 'fo', at: 700, color: C.data }, { type: 'pulse', obj: 'fe', at: 1100, color: C.bad }] },
      { say: '再连跑三次（ex05-b）：26、10、25 轮。差这么多正常吗？算一下期望。',
        log: [{ s: '$ for i in 1 2 3; do bash run_until_fail.sh > r$i.txt; head -n 1 r$i.txt; done', cls: 'in' }, { s: 'found error after 26 runs', at: 400 }, { s: 'found error after 10 runs', at: 700 }, { s: 'found error after 25 runs', at: 1000 }],
        eq: [{ s: '每轮失败概率 p = P(n = 42) ≈ 1/100（RANDOM 取 0–32767，有 328 个值模 100 余 42）', at: 400 }, { s: '所需轮数 ~ 几何分布：E = 1/p ≈ 100', at: 900 }, { s: '标准差 = √(1−p)/p ≈ 99.5，波动和均值一样大', at: 1400 }, { s: '本机 4 次：130、26、10、25（平均 47.75）', at: 1900 }],
        fx: [{ type: 'pulse', obj: 'cnt', at: 400, color: C.data }, { type: 'pulse', obj: 'cnt', at: 1900, color: C.data }] }
    ]
  };

  /* ---------- 练习 6：用 /proc 模拟 pgrep -lf / pkill -f ---------- */
  var PROCS = [['1276', 'python -m http.server …'], ['13960', 'python …'], ['18379', 'bash -c …sleep 10000…'], ['18381', 'sleep 10000'], ['18390', 'bash …']];
  function procObjs() {
    var o = {};
    PROCS.forEach(function (p, i) {
      o['p' + i] = box(250, 140 + i * 62, 300, 40, '/proc/' + p[0] + '  ' + p[1], C.neutral, C.bg, { size: 12, opacity: 0, anchor: undefined });
    });
    o.scan = { type: 'text', x: 80, y: 140, text: '▶', size: 22, weight: 800, color: C.warn, opacity: 0 };
    o.job = box(680, 160, 200, 50, '[1] sleep 10000', C.info, C.infoW);
    o.st = { type: 'text', x: 680, y: 205, text: 'Running', size: 13, weight: 800, color: C.data };
    o.hit = box(680, 330, 200, 40, '', C.ok, C.okW, { opacity: 0, size: 12.5 });
    o.term = box(680, 460, 160, 40, 'SIGTERM', C.warn, C.warnW, { opacity: 0, size: 13, color: C.warn, trail: { n: 5, gap: 40 } });
    o.bytes = { type: 'text', x: 400, y: 500, text: '', size: 13, mono: true, weight: 700, color: C.teal, opacity: 0 };
    return o;
  }
  var scenePg = {
    name: 'pgrep_lf 扫描 /proc', desc: '没有 pgrep 时，就自己遍历 /proc/<PID>/cmdline。读出每个进程的完整命令行，跳过 bash，匹配“sleep 10000”。拿到 PID 再 kill，全程不手打 PID。',
    code: { lang: 'sh', title: 'ex06/pgrep_lf.sh（节选）', src: 'pgrep_lf() {\n    local d found=1 argv\n    for d in /proc/[0-9]*; do\n        mapfile -d \'\' -t argv 2>/dev/null < "$d/cmdline" || continue\n        [[ ${argv[0]} == *bash* ]] && continue\n        if [[ "${argv[*]}" == *"$1"* ]]; then\n            echo "${d#/proc/} ${argv[*]}"\n            found=0\n        fi\n    done\n    return $found\n}\npkill_f() {\n    for pid in $(pgrep_lf "$1" | cut -d\' \' -f1); do kill "$pid"; done\n}' },
    dataTitle: '扫描进度',
    data: { '作业 1': 'Running', '正在读': '无', '匹配到': '无' },
    bg: function (d) { d.text(430, 28, '/proc 里每个数字目录都是一个进程，cmdline 里存着它的完整命令行', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: procObjs,
    steps: [
      { say: '先复现题目的前半段。后台跑 sleep 10000，用 kill -TSTP 代替 Ctrl-Z 让它暂停。再用 bg 让它在后台继续，这是本机实测 ex06-a。',
        log: [{ s: 'pgrep/pkill: 未安装', cls: 'dim' }, { s: '[1]+ 18381 Stopped                    sleep 10000', at: 600 }, { s: '[1]+ sleep 10000 &', at: 1300 }, { s: '[1]+ 18381 Running                    sleep 10000 &', at: 1500 }],
        data: { '作业 1': { v: 'Stopped → Running', at: 1300 } },
        set: { st: { text: { to: 'Stopped', delay: 600 }, color: { to: C.warn, delay: 600, dur: 200 } }, job: { stroke: { to: C.warn, delay: 600, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'job', at: 600, color: C.warn }, { type: 'pulse', obj: 'job', at: 1400, color: C.data }] },
      { say: 'pgrep_lf "sleep 10000" 开始遍历 /proc 下的数字目录。这里只画出几个，进程列表为示意。',
        set: (function () { var s = { st: { text: 'Running', color: { to: C.data, dur: 200 } }, job: { stroke: { to: C.info, dur: 200 } }, scan: { opacity: { to: 1, dur: 200 } } }; PROCS.forEach(function (p, i) { s['p' + i] = { opacity: { to: 1, delay: i * 120, dur: 250 }, x: { from: 200, to: 250, delay: i * 120, dur: 400, ease: 'out' } }; }); return s; })(),
        fx: [{ type: 'pulse', obj: 'p0', at: 700, color: C.neutral }] },
      { say: '逐个读 cmdline。文件里参数之间用 \\0 分隔。mapfile -d \'\' 把它读成数组，不用启动任何子进程。前两个不匹配，跳过。', hl: [3, 4, 6],
        data: { '正在读': { v: '/proc/1276、/proc/13960', at: 300 } },
        set: { scan: { y: { to: 202, delay: 200, dur: 900, ease: 'inOut' } }, bytes: { text: 'python␀-m␀http.server␀…   （␀ 表示字节 \\0）', opacity: { to: 1, dur: 300 } },
          p0: { stroke: { to: C.line, dur: 200 } }, p1: { opacity: { to: 0.4, delay: 900, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'p0', at: 300 }, { type: 'shake', obj: 'p1', at: 1000 }] },
      { say: '下一个是 bash，它的命令行里也写着 “sleep 10000”。它就是运行本题的脚本。第 5 行把 bash 跳过，否则会误伤自己。', hl: [5],
        data: { '正在读': '/proc/18379（bash）' },
        set: { scan: { y: { to: 264, dur: 500, ease: 'inOut' } }, bytes: { text: 'bash␀-c␀…sleep 10000…' }, p2: { stroke: { to: C.warn, delay: 400, dur: 200 }, opacity: { to: 0.4, delay: 1200, dur: 300 } } },
        fx: [{ type: 'float', obj: 'p2', at: 600, text: 'skip bash', color: C.warn }] },
      { say: '/proc/18381 的命令行 “sleep 10000” 包含模式。打印 PID 和命令行，返回码改为 0。这是本机实测。', hl: [6, 7, 8],
        log: [{ s: '$ pgrep_lf "sleep 10000"', cls: 'in' }, { s: '18381 sleep 10000', at: 900 }], data: { '正在读': '/proc/18381', '匹配到': { v: '18381', at: 900 } },
        set: { scan: { y: { to: 326, dur: 500, ease: 'inOut' } }, bytes: { text: 'sleep␀10000␀' }, p3: { stroke: { to: C.ok, delay: 500, dur: 200 }, fill: { to: C.okW, delay: 500, dur: 200 } },
          hit: { text: '18381 sleep 10000', opacity: { to: 1, delay: 800, dur: 300 }, x: { from: 400, to: 680, delay: 800, dur: 700, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'p3', at: 600, color: C.ok }] },
      { say: 'pkill_f 复用 pgrep_lf，用 cut 取出 PID，逐个 kill（默认 SIGTERM）。作业 1 被终止，jobs 报告 Terminated。', hl: [13, 14],
        log: [{ s: '$ pkill_f "sleep 10000"; sleep 0.5; jobs', cls: 'in' }, { s: '[1]+  Terminated                 sleep 10000', at: 1500 }],
        data: { '作业 1': { v: 'Terminated', at: 1500 } },
        set: { scan: { opacity: { to: 0, dur: 200 } }, bytes: { opacity: { to: 0, dur: 200 } },
          term: { opacity: { to: 1, dur: 200 }, x: { from: 680, to: 680, dur: 0 }, y: { from: 380, to: 190, delay: 200, dur: 900, ease: 'in' } },
          job: { stroke: { to: C.bad, delay: 1100, dur: 200 }, opacity: { to: 0.4, delay: 1300, dur: 300 } }, st: { text: { to: 'Terminated', delay: 1200 }, color: { to: C.bad, delay: 1200, dur: 200 } },
          p3: { opacity: { to: 0, delay: 1300, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'job', at: 1150, color: C.bad }] },
      { say: '再扫一遍，已经没有匹配的进程了。pgrep_lf 返回 1，|| 后面的提示被打印出来。',
        log: [{ s: '$ pgrep_lf "sleep 10000" || echo "no process matches"', cls: 'in' }, { s: 'no process matches', at: 1300 }], data: { '匹配到': { v: '（无）', at: 1200 } },
        set: { term: { opacity: { to: 0, dur: 200 } }, hit: { opacity: { to: 0, dur: 300 } }, scan: { opacity: { from: 0, to: 1, dur: 200 }, y: { from: 140, to: 388, dur: 1100, ease: 'linear' } } },
        fx: [{ type: 'shake', obj: 'p4', at: 1100 }] }
    ]
  };

  /* ---------- 练习 7：wait vs pidwait ---------- */
  var sceneWait = {
    name: 'wait 与 pidwait', desc: 'wait 只能等自己的子进程。pidwait 用 kill -0 每秒问一次“它还在吗”。它能等任何进程，代价是最多晚 1 秒发现。',
    code: { lang: 'sh', title: 'ex07-b（实测命令）+ pidwait.sh', src: 'sleep 3 & P=$!\nbash -c "wait $P; …"           # 另一个 shell\nbash -c "source ex07/pidwait.sh; pidwait $P; …"\n\npidwait() {\n    while kill -0 "$1" 2>/dev/null; do\n        sleep 1\n    done\n}' },
    dataTitle: '进程与时钟',
    data: { 'sleep 3': '无', '已过时间': '0 s', 'kill -0': '无' },
    bg: function (d) {
      d.text(430, 28, 'A 是 sleep 的父进程，B 是另一个 shell，不是它的父进程', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.node(60, 112, 220, 56, 'shell A', '执行 sleep 3 &', { fill: C.infoW, stroke: C.info });
      d.node(60, 372, 220, 56, 'shell B（bash -c）', '想等 A 的子进程', { fill: C.bg2, stroke: C.line });
    },
    objects: {
      sl: box(520, 140, 140, 46, 'sleep 3', C.warn, C.warnW, { opacity: 0 }),
      edge: { type: 'path', d: 'M280,140 L450,140', stroke: C.info, sw: 2.2, dash: 0, arrow: 'info' },
      q: box(280, 400, 130, 32, 'wait $P', C.data, C.dataW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } }),
      clock: { type: 'text', x: 700, y: 300, num: 0, fmt: 'fixed1', pre: 't = ', post: ' s', size: 22, weight: 800, mono: true, color: C.warn, opacity: 0 },
      poll: box(280, 330, 120, 32, 'kill -0 $P', C.teal, C.tealW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } })
    },
    steps: [
      { say: 'shell A 后台启动 sleep 3，$! 拿到它的 PID。sleep 是 A 的子进程。', hl: [1], data: { 'sleep 3': '运行中（A 的子进程）' },
        set: { edge: { dash: { to: 1, dur: 500 } }, sl: { opacity: { to: 1, delay: 400, dur: 300 }, s: { from: 0.7, to: 1, delay: 400, dur: 400, ease: 'back' } }, clock: { opacity: { to: 1, delay: 300, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'sl', at: 700, color: C.warn }] },
      { say: 'shell B 里 wait $P。B 不是 sleep 的父进程，内核不会通知它子进程结束了。所以 wait 立刻失败，退出码 127，这是本机实测。', hl: [2],
        log: [{ s: 'bash: line 1: wait: pid 18415 is not a child of this shell', at: 1300, cls: 'err' }, { s: 'another shell: wait exit=127', at: 1500 }],
        set: { q: { opacity: { to: 1, dur: 200 }, x: { from: 280, to: 470, delay: 200, dur: 800, ease: 'inOut' }, y: { from: 400, to: 190, delay: 200, dur: 800, ease: 'inOut' } } },
        fx: [{ type: 'shake', obj: 'q', at: 1050 }, { type: 'flash', obj: 'q', at: 1050, color: C.bad }] },
      { say: '改用 pidwait：kill -0 不发信号，只问“这个 PID 还存在吗”。存在 → 返回 0 → 睡 1 秒再问。', hl: [3, 5, 6, 7],
        log: { s: '[17:21:48] pidwait 18415', at: 300 }, data: { 'kill -0': { v: '0（还在）', at: 1000 }, '已过时间': { v: '1 s', at: 1900 } },
        set: { q: { opacity: { to: 0, dur: 200 } }, poll: { opacity: { to: 1, dur: 200 }, x: { from: 280, to: 450, delay: 200, dur: 700, ease: 'inOut' }, y: { from: 330, to: 170, delay: 200, dur: 700, ease: 'inOut' } },
          clock: { num: { to: 1, delay: 1000, dur: 900, ease: 'linear' } } },
        fx: [{ type: 'ripple', obj: 'sl', at: 950, color: C.ok }] },
      { say: '第 2、3 次询问：仍然在。每次之间 sleep 1，CPU 几乎不占。', hl: [6, 7],
        data: { 'kill -0': '0（还在）', '已过时间': { v: '3 s', at: 2000 } },
        set: { poll: { x: { from: 280, to: 450, dur: 600, ease: 'inOut' }, y: { from: 330, to: 170, dur: 600, ease: 'inOut' } }, clock: { num: { to: 3, dur: 2000, ease: 'linear' } } },
        fx: [{ type: 'ripple', obj: 'sl', at: 600, color: C.ok }, { type: 'stream', path: 'edge', at: 1000, n: 1, dur: 400, color: C.teal }] },
      { say: 'sleep 3 到点退出。但 pidwait 此刻正在 sleep 1，还不知道。', data: { 'sleep 3': { v: '已结束', at: 500 } },
        set: { sl: { opacity: { to: 0.25, delay: 400, dur: 300 }, stroke: { to: C.neutral, delay: 400, dur: 200 } }, clock: { num: { to: 3.4, dur: 500, ease: 'linear' } } },
        fx: [{ type: 'burst', obj: 'sl', at: 400, color: C.warn }] },
      { say: '下一次询问，kill -0 返回非 0。报错 No such process 被 2>/dev/null 吞掉了。循环结束，pidwait 返回。本机实测从开始到结束共 4 秒。', hl: [6, 8],
        log: [{ s: '[17:21:52] 18415 finished', at: 1000 }], data: { 'kill -0': { v: '1（不存在）', at: 700 }, '已过时间': { v: '4 s', at: 900 } },
        eq: [{ s: 'pidwait 开始 17:21:48，结束 17:21:52 → 4 s', at: 1000 }, { s: '= sleep 剩余约 3 s + 最多 1 s 的轮询间隔', at: 1500 }],
        set: { poll: { x: { from: 280, to: 450, dur: 600, ease: 'inOut' }, y: { from: 330, to: 170, dur: 600, ease: 'inOut' }, stroke: { to: C.bad, delay: 600, dur: 200 } }, clock: { num: { to: 4, dur: 600, ease: 'linear' } } },
        fx: [{ type: 'shake', obj: 'poll', at: 700 }, { type: 'pulse', x: 170, y: 400, at: 1000, color: C.ok }] }
    ]
  };

  VZ.register({ id: 'lab02-until', title: '练习 5：跑到失败为止',
    sources: [{ t: '讲义 Exercises · Return Codes', u: 'https://missing.csail.mit.edu/2026/command-line-environment/#exercises' }, { t: '视频 21:16 返回码', u: 'https://youtu.be/ccBGsPedE9Q?t=1276' }],
    note: '控制台为本机真跑，见 ex05-a、ex05-b。每轮 n 的取值是示意，脚本没有记录它。', scenes: [sceneUntil] });
  VZ.register({ id: 'lab02-pgrep', title: '练习 6：没有 pgrep，就自己扫 /proc',
    sources: [{ t: 'man pgrep', u: 'https://www.man7.org/linux/man-pages/man1/pgrep.1.html' }, { t: 'man 5 proc（cmdline）', u: 'https://www.man7.org/linux/man-pages/man5/proc_pid_cmdline.5.html' }],
    note: '控制台为本机真跑，见 ex06-a。/proc 里其他条目的 PID 与命令行是示意。', scenes: [scenePg] });
  VZ.register({ id: 'lab02-pidwait', title: '练习 7：wait 与轮询式的 pidwait',
    sources: [{ t: 'man wait(1p)', u: 'https://www.man7.org/linux/man-pages/man1/wait.1p.html' }, { t: 'man kill（信号 0）', u: 'https://www.man7.org/linux/man-pages/man2/kill.2.html' }],
    note: '控制台为本机真跑，见 ex07-b。时钟动画为示意。', scenes: [sceneWait] });
})();
