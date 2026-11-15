/* ch02 · 程序的“输出”与“打断”：返回码、信号、trap、作业控制 —— 可视化演示
 * 依据：Lecture 2 视频 21:16–25:40（返回码、&& ||、grep -q）、26:11–31:36（信号、SIGINT 处理器、SIGQUIT、
 *       trap 清理、Ctrl-Z / kill -CONT）、39:46（SIGHUP）；讲义 command-line-environment.md（示例会话、nohup、SIGKILL）。
 * 实测：标“本机”的输出都在 Git Bash 5.3 中真跑得到（作业控制用 set -m + kill -TSTP 代替 Ctrl-Z；
 *       PID 每次不同）。python sigint.py 的输出取自讲义原文（本机 Windows 原生 python 收不到 MSYS 信号，见正文）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 10, fill: colW || C.bg, stroke: col || C.line, sw: 1.8, text: text || '', color: C.fg, mono: true, size: 14, weight: 700 }, extra || {});
  }
  function lampTo(code, at) {
    var ok = code === 0;
    return { lamp: { text: { to: String(code), delay: at }, fill: { to: ok ? C.okW : C.badW, delay: at, dur: 250 }, stroke: { to: ok ? C.ok : C.bad, delay: at, dur: 250 }, color: { to: ok ? C.ok : C.bad, delay: at, dur: 250 } } };
  }

  /* ---------- 场景 1：返回码、&& ||、128+N ---------- */
  var GX = 600;
  var sceneRc = {
    name: '返回码与短路', desc: '每个程序结束时交出一个返回码。0 是成功，非 0 是出错。&& 和 || 只看这个数字，决定要不要运行下一条。被信号杀死的进程，返回码是 128 加信号编号。',
    code: { lang: 'sh', title: '依次输入（file.txt 里有一行 hello pattern）', src: 'ls > /dev/null; echo $?\nls /nonexistent 2>/dev/null; echo $?\ngrep -q "pattern" file.txt && echo "Pattern found"\ngrep -q "nope" file.txt || echo "Pattern not found"\nsleep 5 & kill -INT $!; wait $!; echo $?\nsleep 5 & kill -KILL $!; wait $!; echo $?\nsleep 5 & kill $!; wait $!; echo $?' },
    dataTitle: '最近一条命令',
    data: { '命令': '无', '$?': '无', '下一条': '无' },
    bg: function (d) {
      d.text(430, 30, '返回码是程序的“第三种输出”：控制流只看它，不看 stdout', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(370, 150, '$?', { anchor: 'middle', size: 13, mono: true, weight: 800, color: C.fg3 });
      d.rect(GX - 20, 120, 250, 70, { fill: 'none', stroke: C.line, dash: '5 4', rx: 12 });
      d.text(GX + 105, 108, '短路运算符', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
    },
    objects: {
      prog: box(170, 210, 250, 56, 'ls', C.info, C.infoW),
      lamp: { type: 'circle', x: 370, y: 210, r: 34, fill: C.bg3, stroke: C.line, sw: 2.4, text: '?', color: C.fg2, size: 22, weight: 800 },
      wire: { type: 'path', d: 'M404,210 C480,210 520,155 580,155', stroke: C.line, sw: 2.2, dash: 0, arrow: 'fg3' },
      gate: box(GX + 50, 155, 80, 44, '&&', C.neutral, C.bg, { size: 20, opacity: 0 }),
      next: box(GX + 160, 155, 120, 44, 'echo …', C.neutral, C.bg, { size: 13, opacity: 0 }),
      tok: { type: 'circle', x: 370, y: 210, r: 9, fill: C.warn, stroke: C.warn, sw: 1, opacity: 0, trail: { n: 5, gap: 36 } },
      out: { type: 'text', x: GX + 105, y: 225, text: '', size: 14, mono: true, weight: 700, color: C.ok, opacity: 0 },
      sig: box(170, 360, 150, 46, 'SIGTERM', C.warn, C.warnW, { opacity: 0, size: 15 }),
      bolt: { type: 'path', d: 'M245,360 C300,340 330,300 360,250', stroke: C.warn, sw: 2.4, dash: 0, arrow: 'warn' },
      calc: box(560, 400, 340, 70, '', C.warn, C.warnW, { opacity: 0, rx: 12, size: 20 })
    },
    steps: [
      { say: 'ls 正常列出目录，结束时返回 0。$? 里存着上一条命令的返回码。', hl: [1],
        log: ['$ ls > /dev/null; echo $?', { s: '0', at: 900 }], data: { '命令': 'ls', '$?': { v: 0, at: 800 } },
        set: lampTo(0, 700), fx: [{ type: 'pulse', obj: 'prog', at: 200, color: C.info }, { type: 'ripple', obj: 'lamp', at: 750, color: C.ok }] },
      { say: 'ls 一个不存在的目录，出错，返回 2。具体数字由程序决定，写在它的 man 页里。约定只保证 0 是成功。', hl: [2],
        log: ['$ ls /nonexistent 2>/dev/null; echo $?', { s: '2', at: 900 }], data: { '命令': 'ls /nonexistent', '$?': { v: 2, at: 800 } },
        set: merge({ prog: { text: 'ls /nonexistent' } }, lampTo(2, 700)), fx: [{ type: 'shake', obj: 'lamp', at: 800 }] },
      { say: 'grep -q 只匹配不输出，找到就返回 0。&& 看到 0，放行右边的 echo。', hl: [3],
        log: ['$ grep -q "pattern" file.txt && echo "Pattern found"', { s: 'Pattern found', at: 1700 }], data: { '命令': 'grep -q "pattern"', '$?': { v: 0, at: 600 }, '下一条': { v: '运行 echo', at: 1300 } },
        set: merge({ prog: { text: 'grep -q "pattern"' }, wire: { dash: { to: 1, delay: 500, dur: 500 } },
          gate: { opacity: { to: 1, dur: 300 }, text: '&&', stroke: { to: C.ok, delay: 1000, dur: 200 }, fill: { to: C.okW, delay: 1000, dur: 200 } },
          next: { opacity: { to: 1, dur: 300 }, stroke: { to: C.ok, delay: 1300, dur: 200 }, fill: { to: C.okW, delay: 1300, dur: 200 } },
          tok: { opacity: { to: 1, delay: 600, dur: 150 }, x: { from: 370, to: GX + 160, delay: 700, dur: 900, ease: 'inOut' }, y: { from: 210, to: 155, delay: 700, dur: 900, ease: 'inOut' } },
          out: { text: 'Pattern found', color: { to: C.ok, dur: 0 }, opacity: { to: 1, delay: 1700, dur: 300 } } }, lampTo(0, 500)),
        fx: [{ type: 'ripple', obj: 'next', at: 1600, color: C.ok }] },
      { say: '换成找不到的 "nope"，grep 返回 1。|| 恰好相反，只在左边失败时才运行右边。于是打印 Pattern not found。', hl: [4],
        log: ['$ grep -q "nope" file.txt || echo "Pattern not found"', { s: 'Pattern not found', at: 1700 }], data: { '命令': 'grep -q "nope"', '$?': { v: 1, at: 600 }, '下一条': { v: '运行 echo', at: 1300 } },
        set: merge({ prog: { text: 'grep -q "nope"' }, out: { opacity: { to: 0, dur: 200 } },
          gate: { text: '||', stroke: { to: C.ok, delay: 1000, dur: 200 }, fill: { to: C.okW, delay: 1000, dur: 200 } },
          tok: { x: { from: 370, to: GX + 160, delay: 700, dur: 900, ease: 'inOut' }, y: { from: 210, to: 155, delay: 700, dur: 900, ease: 'inOut' } } }, lampTo(1, 500)),
        fx: [{ type: 'float', obj: 'out', at: 1700, text: 'Pattern not found', color: C.ok }] },
      { say: '另一种结束方式，是被信号杀死。后台 sleep 5 收到 SIGINT，就是 Ctrl-C 发的那个。wait 拿到的返回码是 130。', hl: [5],
        log: ['$ sleep 5 & kill -INT $!; wait $!; echo $?', { s: '130', at: 1500 }], data: { '命令': 'sleep 5（被 SIGINT 打断）', '$?': { v: 130, at: 1400 }, '下一条': '无' },
        eq: [{ s: '被信号终止时：返回码 = 128 + 信号编号', at: 1500 }, { s: 'SIGINT = 2  →  128 + 2 = 130', at: 1900 }],
        set: merge({ prog: { text: 'sleep 5' }, gate: { opacity: { to: 0.2, dur: 300 } }, next: { opacity: { to: 0.2, dur: 300 } }, wire: { dash: { to: 0, dur: 300 } }, tok: { opacity: { to: 0, dur: 200 } },
          sig: { text: 'SIGINT', opacity: { to: 1, dur: 300 } }, bolt: { dash: { to: 1, delay: 300, dur: 500 } },
          calc: { text: '128 + 2 = 130', opacity: { to: 1, delay: 1500, dur: 300 } } }, lampTo(130, 1300)),
        fx: [{ type: 'shake', obj: 'prog', at: 850 }, { type: 'ripple', obj: 'calc', at: 1600, color: C.warn }] },
      { say: 'SIGKILL（编号 9）：128 + 9 = 137。bash 还会顺手报告 “Killed”。', hl: [6],
        log: ['$ sleep 5 & kill -KILL $!; wait $!; echo $?', { s: '/usr/bin/bash: line 1: 11928 Killed                     sleep 5', at: 900, cls: 'err' }, { s: '137', at: 1400 }],
        data: { '命令': 'sleep 5（被 SIGKILL 杀死）', '$?': { v: 137, at: 1300 } },
        eq: [{ s: 'SIGKILL = 9  →  128 + 9 = 137', at: 1300 }],
        set: merge({ sig: { text: 'SIGKILL', stroke: { to: C.bad, dur: 200 }, fill: { to: C.badW, dur: 200 }, color: { to: C.bad, dur: 200 } }, bolt: { dash: { from: 0, to: 1, dur: 500 }, stroke: { to: C.bad, dur: 200 } },
          calc: { text: { to: '128 + 9 = 137', delay: 1300 } } }, lampTo(137, 1200)),
        fx: [{ type: 'burst', obj: 'prog', at: 600, color: C.bad }] },
      { say: 'kill 不写信号时默认发 SIGTERM（15）：128 + 15 = 143。反过来，kill -l 143 能把返回码翻译回信号名 TERM。', hl: [7],
        log: ['$ sleep 5 & kill $!; wait $!; echo $?', { s: '143', at: 1300 }, { s: '$ kill -l 143', at: 1700 }, { s: 'TERM', at: 1900 }],
        data: { '命令': 'sleep 5（被 SIGTERM 终止）', '$?': { v: 143, at: 1200 } },
        eq: [{ s: 'SIGTERM = 15  →  128 + 15 = 143', at: 1200 }, { s: '143 − 128 = 15  →  kill -l 143 = TERM', at: 1800 }],
        set: merge({ sig: { text: 'SIGTERM', stroke: { to: C.warn, dur: 200 }, fill: { to: C.warnW, dur: 200 }, color: { to: C.warn, dur: 200 } }, bolt: { dash: { from: 0, to: 1, dur: 500 }, stroke: { to: C.warn, dur: 200 } },
          calc: { text: { to: '128 + 15 = 143', delay: 1200 } } }, lampTo(143, 1100)),
        fx: [{ type: 'pulse', obj: 'calc', at: 1250, color: C.warn }] }
    ]
  };

  /* ---------- 场景 2：Ctrl-C 与信号处理器 ---------- */
  var PX = 560, PY = 250;
  var sceneInt = {
    name: 'Ctrl-C 与处理器', desc: '按 Ctrl-C，shell 给前台进程发 SIGINT。没有处理器时，进程按默认动作退出。注册了处理器，进程就可以“收到但不退出”。SIGKILL 则无法被处理。',
    code: { lang: 'py', title: 'sigint.py（讲义原文）', src: '#!/usr/bin/env python\nimport signal, time\n\ndef handler(signum, time):\n    print("\\nI got a SIGINT, but I am not stopping")\n\nsignal.signal(signal.SIGINT, handler)\ni = 0\nwhile True:\n    time.sleep(.1)\n    print("\\r{}".format(i), end="")\n    i += 1' },
    dataTitle: '进程',
    data: { '程序': '无', '处理器': '无', '状态': '无' },
    legend: [[C.warn, '信号'], [C.info, '进程'], [C.ok, '处理器 / 正常'], [C.bad, '终止']],
    bg: function (d) {
      d.text(430, 30, '键盘 → 终端/shell → 信号 → 进程（处理器或默认动作）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.node(35, 190, 170, 60, '终端 + shell', '识别特殊按键组合', { fill: C.bg2, stroke: C.line });
    },
    objects: {
      key: box(205, 420, 120, 50, 'Ctrl-C', C.neutral, C.bg3, { size: 17 }),
      proc: box(PX, PY, 260, 150, '', C.info, C.infoW, { rx: 14 }),
      ptitle: { type: 'text', x: PX, y: PY - 52, text: 'sleep 100', size: 16, mono: true, weight: 800, color: C.info },
      cnt: { type: 'text', x: PX - 60, y: PY + 10, num: 0, pre: 'i = ', size: 20, mono: true, weight: 800, color: C.fg, opacity: 0 },
      hnd: box(PX + 70, PY + 40, 100, 40, 'handler', C.ok, C.okW, { opacity: 0, size: 13 }),
      wire: { type: 'path', d: 'M205,250 C320,250 360,250 430,250', stroke: C.warn, sw: 2.2, dash: 0, arrow: 'warn' },
      kw: { type: 'path', d: 'M205,395 C205,330 160,300 140,255', stroke: C.line, sw: 1.8, dash: 0, arrow: 'fg3' },
      pkt: box(205, 250, 92, 30, 'SIGINT', C.warn, C.warnW, { opacity: 0, size: 12.5, color: C.warn, trail: { n: 5, gap: 40 } }),
      msg: { type: 'text', x: PX, y: PY + 110, text: '', size: 12.5, mono: true, weight: 700, color: C.ok, opacity: 0 },
      dead: { type: 'text', x: PX, y: PY, text: '×', size: 60, weight: 800, color: C.bad, opacity: 0 }
    },
    steps: [
      { say: '前台运行 sleep 100。按下 Ctrl-C（终端里显示为 ^C）：shell 识别出这个组合键。', log: ['$ sleep 100'],
        data: { '程序': 'sleep 100', '处理器': '无', '状态': '运行中' },
        set: { kw: { dash: { to: 1, delay: 300, dur: 500 } }, key: { y: { from: 420, to: 428, delay: 200, dur: 150 }, fill: { to: C.warnW, delay: 200, dur: 150 }, stroke: { to: C.warn, delay: 200, dur: 150 } } },
        fx: [{ type: 'ripple', obj: 'key', at: 250, color: C.warn }] },
      { say: 'shell 把 SIGINT 发给前台进程。sleep 没有注册处理器，执行默认动作：终止。提示符回来了。',
        log: [{ s: '^C', at: 300 }, { s: '$', at: 1500, cls: 'dim' }], data: { '状态': { v: '已终止', at: 1200 } },
        set: { key: { y: { to: 420, dur: 150 }, fill: { to: C.bg3, dur: 150 }, stroke: { to: C.neutral, dur: 150 } }, wire: { dash: { to: 1, dur: 400 } },
          pkt: { opacity: { to: 1, dur: 150 }, x: { from: 205, to: PX - 130, delay: 200, dur: 800, ease: 'in' } },
          proc: { opacity: { to: 0.35, delay: 1100, dur: 300 }, stroke: { to: C.bad, delay: 1000, dur: 200 } }, dead: { opacity: { to: 1, delay: 1050, dur: 200 }, s: { from: 1.6, to: 1, delay: 1050, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'proc', at: 1000, color: C.bad }] },
      { say: '换成讲义的 sigint.py：signal.signal 为 SIGINT 注册了 handler。程序每 0.1 秒数一个数。', hl: [7, 8, 9, 10, 11, 12],
        log: ['$ python sigint.py'], data: { '程序': 'python sigint.py', '处理器': 'SIGINT → handler', '状态': '运行中' },
        set: { dead: { opacity: { to: 0, dur: 200 } }, proc: { opacity: { to: 1, dur: 300 }, stroke: { to: C.info, dur: 300 } }, ptitle: { text: 'python sigint.py' },
          pkt: { opacity: { to: 0, dur: 0 }, x: { to: 205, dur: 0 } }, hnd: { opacity: { to: 1, delay: 400, dur: 300 }, s: { from: 0.6, to: 1, delay: 400, dur: 400, ease: 'back' } },
          cnt: { opacity: { to: 1, delay: 300, dur: 300 }, num: { from: 0, to: 24, delay: 300, dur: 1800, ease: 'linear' } } },
        fx: [{ type: 'pulse', obj: 'hnd', at: 800, color: C.ok }] },
      { say: '数到 24 时按 Ctrl-C。SIGINT 被 handler 接住，打印一句话就回去继续数。进程没停，这是讲义原文的输出。', hl: [4, 5],
        log: [{ s: '24^C', at: 200 }, { s: 'I got a SIGINT, but I am not stopping', at: 1200 }], data: { '状态': '运行中（SIGINT 已处理）' },
        set: { key: { fill: { to: C.warnW, dur: 120 }, stroke: { to: C.warn, dur: 120 } },
          pkt: { opacity: { from: 0, to: 1, delay: 150, dur: 150 }, x: { from: 205, to: PX + 70, delay: 200, dur: 900, ease: 'inOut' }, y: { from: 250, to: PY + 40, delay: 200, dur: 900, ease: 'inOut' } },
          msg: { text: 'I got a SIGINT, but I am not stopping', opacity: { to: 1, delay: 1200, dur: 300 } },
          cnt: { num: { to: 26, delay: 1400, dur: 600, ease: 'linear' } } },
        fx: [{ type: 'ripple', obj: 'hnd', at: 1100, color: C.ok }] },
      { say: '再按一次，同样被处理（26^C）。想让它停，得用更“凶”的 SIGQUIT：Ctrl-\\。它没有处理器 → 退出。',
        log: [{ s: '26^C', at: 100 }, { s: 'I got a SIGINT, but I am not stopping', at: 700 }, { s: '30^\\[1]    39913 quit       python sigint.py', at: 2000 }],
        data: { '状态': { v: '已退出（SIGQUIT）', at: 2000 } },
        set: { key: { text: { to: 'Ctrl-\\', delay: 1100 }, fill: { to: C.bg3, dur: 120 } },
          pkt: { text: { to: 'SIGQUIT', delay: 1100 }, x: { from: 205, to: PX - 130, delay: 1200, dur: 700, ease: 'in' }, y: { from: 250, to: 250, dur: 0 }, stroke: { to: C.bad, delay: 1100, dur: 100 } },
          cnt: { num: { to: 30, dur: 1000, ease: 'linear' } }, msg: { opacity: { to: 0, delay: 1000, dur: 200 } },
          proc: { opacity: { to: 0.35, delay: 1950, dur: 300 }, stroke: { to: C.bad, delay: 1900, dur: 200 } }, dead: { opacity: { to: 1, delay: 1950, dur: 200 }, s: { from: 1.6, to: 1, delay: 1950, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'hnd', at: 600, color: C.ok }, { type: 'burst', obj: 'proc', at: 1900, color: C.bad }] },
      { say: '本机实测发现，Windows 原生 python 收不到 Git Bash 模拟的信号。于是用 bash 的 trap 写了同样的程序。两次 SIGINT 都被处理，最后用 SIGTERM 结束。因为 bash 总是忽略 SIGQUIT。',
        log: [{ s: '# 本机 Git Bash：bash sigint.sh（trap … INT）', cls: 'dim' }, { s: '$ kill -INT $p; …; kill -INT $p; …; kill -TERM $p; wait $p; echo "exit=$?"', at: 300 }, { s: 'exit=143', at: 1000 }, { s: "$ tr '\\r' '\\n' < sig.out | grep -c 'not stopping'", at: 1300 }, { s: '2', at: 1600 }],
        data: { '程序': 'bash sigint.sh', '处理器': "trap '…' INT", '状态': '被 SIGTERM 终止（143）' },
        set: { ptitle: { text: 'bash sigint.sh' }, hnd: { text: 'trap … INT' } },
        fx: [{ type: 'pulse', obj: 'proc', at: 300, color: C.info }] },
      { say: 'SIGKILL 是特例，它不能被捕获。处理器根本没机会运行，进程被立即终止。',
        log: [{ s: '$ kill -KILL <PID>', cls: 'in' }],
        data: { '处理器': '对 KILL 无效', '状态': { v: '立即终止', at: 1000 } },
        set: { key: { opacity: { to: 0.3, dur: 300 } }, kw: { dash: { to: 0, dur: 300 } }, dead: { opacity: { to: 0, dur: 0 } }, proc: { opacity: { to: 1, dur: 0 }, stroke: { to: C.info, dur: 0 } },
          pkt: { text: 'SIGKILL', x: { from: 205, to: PX - 40, dur: 800, ease: 'in' }, y: { to: 250, dur: 0 }, opacity: { from: 0, to: 1, dur: 150 } },
          hnd: { opacity: { to: 0.25, delay: 700, dur: 200 }, x: { to: PX + 90, delay: 700, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'hnd', at: 700 }, { type: 'burst', obj: 'proc', at: 850, color: C.bad }, { type: 'flash', obj: 'proc', at: 850, color: C.bad }] }
    ]
  };

  /* ---------- 场景 3：trap 清理 —— TERM vs KILL ---------- */
  var SX = 300, SY = 230;
  var sceneTrap = {
    name: 'trap 清理', desc: 'trap 让脚本在退出或收到信号时，先跑一段清理代码。SIGTERM 能触发它，SIGKILL 不能。KILL 之后临时文件留下，子进程变成孤儿。',
    code: { lang: 'sh', title: 'trapdemo.sh（本笔记示例，结构同讲义）', src: '#!/usr/bin/env bash\ncleanup() {\n    echo "Cleaning up temporary files..."\n    rm -f mytemp.*\n}\ntrap cleanup EXIT\ntrap \'echo "got SIGTERM"; exit 143\' TERM\ntouch mytemp.1 mytemp.2\necho "created: $(echo mytemp.*)"\nsleep 30 &\nwait $!' },
    dataTitle: '脚本状态',
    data: { '临时文件': '无', 'trap': '无', '退出码': '无' },
    bg: function (d) {
      d.text(430, 30, '同一个脚本，两种打断方式', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(560, 150, 260, 170, { fill: 'none', stroke: C.teal, dash: '5 4', rx: 12 });
      d.text(690, 138, '当前目录', { anchor: 'middle', size: 12, color: C.teal, weight: 700 });
      d.node(590, 444, 200, 52, 'PID 1（init）', '孤儿进程会被它收养', { fill: C.bg2, stroke: C.line, mono: false });
    },
    objects: {
      sc: box(SX, SY, 230, 150, '', C.info, C.infoW, { rx: 14 }),
      st: { type: 'text', x: SX, y: SY - 52, text: 'bash trapdemo.sh', size: 15, mono: true, weight: 800, color: C.info },
      reg: box(SX, SY - 10, 190, 34, 'trap: EXIT · TERM', C.ok, C.okW, { opacity: 0, size: 12.5 }),
      sl: box(SX, SY + 40, 120, 32, 'sleep 30', C.warn, C.warnW, { opacity: 0, size: 13 }),
      t1: box(650, 210, 110, 36, 'mytemp.1', C.teal, C.tealW, { opacity: 0, size: 13 }),
      t2: box(730, 260, 110, 36, 'mytemp.2', C.teal, C.tealW, { opacity: 0, size: 13 }),
      kill: box(90, 420, 140, 44, 'kill -TERM', C.warn, C.warnW, { opacity: 0, size: 14 }),
      zap: { type: 'path', d: 'M150,398 C170,350 200,320 230,300', stroke: C.warn, sw: 2.4, dash: 0, arrow: 'warn' },
      cu: box(SX, SY + 120, 230, 36, 'cleanup()', C.ok, C.okW, { opacity: 0, size: 13 })
    },
    steps: [
      { say: '脚本启动，先用 trap 登记两件事。退出时（EXIT）跑 cleanup。收到 TERM 时，打印一句并 exit 143。', hl: [2, 3, 4, 5, 6, 7],
        log: '$ bash trapdemo.sh & P=$!', data: { 'trap': 'EXIT→cleanup，TERM→exit 143' },
        set: { reg: { opacity: { to: 1, delay: 300, dur: 300 }, s: { from: 0.6, to: 1, delay: 300, dur: 450, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'sc', at: 100, color: C.info }] },
      { say: '创建两个临时文件，再启动后台子进程 sleep 30。然后用 wait 等它。', hl: [8, 9, 10, 11],
        log: { s: 'created: mytemp.1 mytemp.2', at: 900 }, data: { '临时文件': { v: 'mytemp.1 mytemp.2', at: 900 } },
        set: { t1: { opacity: { to: 1, delay: 300, dur: 250 }, x: { from: SX + 100, to: 650, delay: 300, dur: 700, ease: 'out' } },
          t2: { opacity: { to: 1, delay: 450, dur: 250 }, x: { from: SX + 100, to: 730, delay: 450, dur: 700, ease: 'out' } },
          sl: { opacity: { to: 1, delay: 1100, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 't1', at: 1000, color: C.teal }, { type: 'ripple', obj: 't2', at: 1150, color: C.teal }] },
      { say: '1 秒后 kill -TERM。bash 先执行 TERM 的 trap，打印 got SIGTERM 并 exit 143。退出又触发 EXIT 的 trap，cleanup 删掉了临时文件。这是本机实测。', hl: [7, 2, 3, 4],
        log: [{ s: '$ kill -TERM $P; wait $P', at: 100 }, { s: 'got SIGTERM', at: 900 }, { s: 'Cleaning up temporary files...', at: 1400 }, { s: "exit=143 left: ls: cannot access 'mytemp.*': No such file or directory", at: 2200 }],
        data: { '临时文件': { v: '（已删除）', at: 1800 }, '退出码': { v: 143, at: 2100 } },
        set: { kill: { opacity: { to: 1, dur: 250 } }, zap: { dash: { to: 1, delay: 200, dur: 500 } },
          cu: { opacity: { to: 1, delay: 1200, dur: 250 } },
          t1: { opacity: { to: 0, delay: 1700, dur: 300 }, y: { to: 180, delay: 1700, dur: 300 } }, t2: { opacity: { to: 0, delay: 1800, dur: 300 }, y: { to: 230, delay: 1800, dur: 300 } },
          sc: { opacity: { to: 0.4, delay: 2100, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'reg', at: 750, color: C.ok }, { type: 'pulse', obj: 'cu', at: 1300, color: C.ok }, { type: 'burst', obj: 't1', at: 1700, color: C.teal }, { type: 'burst', obj: 't2', at: 1800, color: C.teal }] },
      { say: '不过注意，cleanup 只删了文件，没管子进程。脚本退出后，它的 sleep 30 还活着。父进程变成了 1，它成了孤儿。本机用 /proc/PID/ppid 确认过。',
        data: { '退出码': 143 },
        set: { sl: { x: { to: 690, delay: 200, dur: 1100, ease: 'inOut' }, y: { to: 420, delay: 200, dur: 1100, ease: 'inOut' } } },
        fx: [{ type: 'float', obj: 'sl', at: 1300, text: 'ppid=1', color: C.warn }] },
      { say: '重新运行一次，这次换成 kill -KILL。', log: ['$ bash trapdemo.sh & P=$!', { s: 'created: mytemp.1 mytemp.2', at: 700 }],
        data: { '临时文件': { v: 'mytemp.1 mytemp.2', at: 700 }, '退出码': '无' },
        set: { sc: { opacity: { to: 1, dur: 300 } }, cu: { opacity: { to: 0, dur: 200 } }, kill: { text: 'kill -KILL', stroke: { to: C.bad, dur: 200 }, fill: { to: C.badW, dur: 200 }, color: { to: C.bad, dur: 200 } }, zap: { dash: { to: 0, dur: 300 }, stroke: { to: C.bad, dur: 0 } },
          sl: { opacity: { to: 0.35, dur: 300 } },
          t1: { opacity: { to: 1, delay: 400, dur: 250 }, y: { to: 210, delay: 400, dur: 400 } }, t2: { opacity: { to: 1, delay: 500, dur: 250 }, y: { to: 260, delay: 500, dur: 400 } } } },
      { say: 'SIGKILL 不能被捕获，两个 trap 都没机会运行。bash 报告 Killed，返回码 137。临时文件原封不动地留了下来。',
        log: [{ s: '$ kill -KILL $P; wait $P', at: 100 }, { s: 'bash: line 1:  9782 Killed                     bash trapdemo.sh', at: 900, cls: 'err' }, { s: 'exit=137 left: mytemp.1 mytemp.2', at: 1500 }],
        data: { '退出码': { v: 137, at: 1400 } },
        set: { zap: { dash: { to: 1, dur: 400 } }, reg: { opacity: { to: 0.25, delay: 600, dur: 300 } }, sc: { stroke: { to: C.bad, delay: 600, dur: 200 }, opacity: { to: 0.4, delay: 800, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'sc', at: 600, color: C.bad }, { type: 'shake', obj: 't1', at: 1500 }, { type: 'shake', obj: 't2', at: 1550 }] },
      { say: '这就是讲义说的 SIGKILL 副作用，留下半成品和孤儿子进程。所以先用 TERM 给程序收拾的机会，KILL 留作最后手段。cleanup 里也可以顺手 kill $(jobs -p)，这条是补充。',
        fx: [{ type: 'pulse', obj: 'sl', at: 200, color: C.warn }, { type: 'pulse', obj: 't1', at: 500, color: C.teal }, { type: 'pulse', obj: 't2', at: 600, color: C.teal }] }
    ]
  };

  /* ---------- 场景 4：作业控制状态机 ---------- */
  var N = { fg: [170, 170], bg: [520, 170], st: [345, 380], dead: [740, 400] };
  function at(n, d, dur) { return { x: { to: N[n][0], delay: d || 0, dur: dur || 800, ease: 'inOut' }, y: { to: N[n][1] + 0, delay: d || 0, dur: dur || 800, ease: 'inOut' } }; }
  var sceneJobs = {
    name: '作业控制', desc: '一个作业有四种状态：前台、后台、暂停、结束。它在状态之间移动，推动它的全是信号。Ctrl-Z 发 TSTP，bg 和 fg 发 CONT，断线发 HUP，kill 默认发 TERM。',
    code: { lang: 'sh', title: '讲义示例会话（本机用 set -m + kill -TSTP 复现）', src: 'sleep 1000        # 然后按 Ctrl-Z\nbg %1\nnohup sleep 2000 &\njobs\nkill -SIGHUP %1\nkill -SIGHUP %2   # nohup protects from SIGHUP\njobs\nkill %2' },
    dataTitle: 'jobs',
    data: { '[1] sleep 1000': '无', '[2] nohup sleep 2000': '无' },
    legend: [[C.info, '前台运行'], [C.data, '后台运行'], [C.warn, '暂停 / 信号'], [C.bad, '结束'], [C.ok, 'nohup 护盾']],
    bg: function (d) {
      d.text(430, 30, '作业的 4 种状态，箭头上写的是“谁发了什么信号”', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      var S = [['fg', '前台运行', C.info, C.infoW], ['bg', '后台运行', C.data, C.dataW], ['st', '已暂停 Stopped', C.warn, C.warnW], ['dead', '已结束', C.bad, C.badW]];
      S.forEach(function (s) { d.rect(N[s[0]][0] - 95, N[s[0]][1] - 52, 190, 104, { fill: s[3], stroke: s[2], sw: 1.8, rx: 16, opacity: 0.85 }); d.text(N[s[0]][0], N[s[0]][1] - 36, s[1], { anchor: 'middle', size: 13, weight: 800, color: s[2] }); });
      d.path('M260,170 L420,170', { stroke: C.line, sw: 1.5, arrow: 'fg3', dash: '5 4' }); d.text(340, 158, '& 或 bg', { anchor: 'middle', size: 11.5, mono: true, color: C.fg3 });
      d.path('M200,225 C220,300 250,360 250,370', { stroke: C.line, sw: 1.5, arrow: 'fg3', dash: '5 4' }); d.text(178, 300, 'Ctrl-Z · TSTP', { anchor: 'end', size: 11.5, mono: true, color: C.fg3 });
      d.path('M440,370 C470,330 490,260 500,225', { stroke: C.line, sw: 1.5, arrow: 'fg3', dash: '5 4' }); d.text(500, 300, 'bg · CONT', { anchor: 'start', size: 11.5, mono: true, color: C.fg3 });
      d.path('M615,200 C690,240 720,300 735,345', { stroke: C.line, sw: 1.5, arrow: 'fg3', dash: '5 4' }); d.text(730, 270, 'HUP / TERM / KILL', { anchor: 'start', size: 11.5, mono: true, color: C.fg3 });
      d.path('M420,150 C350,110 290,110 255,145', { stroke: C.line, sw: 1.2, arrow: 'fg3', dash: '2 4' }); d.text(340, 104, 'fg · CONT', { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
    },
    objects: {
      j1: box(N.fg[0], N.fg[1] + 10, 150, 36, '[1] sleep 1000', C.info, C.bg, { size: 13, trail: { n: 6, gap: 36 } }),
      j2: box(N.bg[0], N.bg[1] + 38, 170, 34, '[2] nohup sleep', C.data, C.bg, { size: 13, opacity: 0, trail: { n: 6, gap: 36 } }),
      shield: { type: 'circle', x: N.bg[0], y: N.bg[1] + 38, r: 40, fill: 'none', stroke: C.ok, sw: 2.5, opacity: 0 },
      sig: box(90, 500, 110, 34, 'SIGTSTP', C.warn, C.warnW, { size: 13, color: C.warn, opacity: 0, trail: { n: 4, gap: 40 } })
    },
    steps: [
      { say: '前台运行 sleep 1000，它占着终端。你得等它结束，才能再敲命令。', hl: [1], log: ['$ sleep 1000'], data: { '[1] sleep 1000': '前台运行' },
        fx: [{ type: 'pulse', obj: 'j1', at: 300, color: C.info }] },
      { say: '按 Ctrl-Z：shell 发 SIGTSTP，进程被暂停，作业进入 Stopped。（本机用 kill -TSTP %1 代替按键。）',
        log: [{ s: '$ kill -TSTP %1   # 本机代替 Ctrl-Z', at: 200 }, { s: '$ jobs -l', at: 1300 }, { s: '[1]+  9670 Stopped                    sleep 1000', at: 1500 }], data: { '[1] sleep 1000': { v: 'Stopped', at: 1400 } },
        set: { sig: { opacity: { from: 0, to: 1, dur: 200 }, x: { from: 90, to: N.fg[0], dur: 600, ease: 'out' }, y: { from: 500, to: N.fg[1] + 10, dur: 600, ease: 'in' } },
          j1: merge(at('st', 700, 800), { stroke: { to: C.warn, delay: 700, dur: 300 } }) },
        fx: [{ type: 'ripple', obj: 'j1', at: 1500, color: C.warn }] },
      { say: 'bg %1：发 SIGCONT 让它继续，但放在后台。提示符立刻回来，你可以接着干别的。', hl: [2],
        log: ['$ bg %1', { s: '[1]+ sleep 1000 &', at: 600 }], data: { '[1] sleep 1000': { v: 'Running（后台）', at: 1300 } },
        set: { sig: { text: 'SIGCONT', x: { from: N.st[0] - 140, to: N.st[0] - 40, dur: 500 }, y: { from: N.st[1] + 70, to: N.st[1] + 20, dur: 500 }, opacity: { from: 0, to: 1, dur: 150 } },
          j1: merge(at('bg', 500, 900), { stroke: { to: C.data, delay: 500, dur: 300 } }) },
        fx: [{ type: 'ripple', obj: 'j1', at: 1400, color: C.data }] },
      { say: 'nohup sleep 2000 &：直接在后台启动第二个作业。nohup 是个包装器，让程序忽略 SIGHUP。相当于给它套上护盾。', hl: [3, 4],
        log: ['$ nohup sleep 2000 > /dev/null 2>&1 &', { s: '$ jobs', at: 800 }, { s: '[1]-  Running                    sleep 1000 &', at: 1000 }, { s: '[2]+  Running                    nohup sleep 2000 > /dev/null 2>&1 &', at: 1100 }],
        data: { '[2] nohup sleep 2000': { v: 'Running（后台）', at: 600 } },
        set: { sig: { opacity: { to: 0, dur: 200 } }, j2: { opacity: { to: 1, dur: 300 }, s: { from: 0.7, to: 1, dur: 500, ease: 'back' } }, shield: { opacity: { to: 1, delay: 500, dur: 300 }, r: { from: 20, to: 40, delay: 500, dur: 500, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'shield', at: 900, color: C.ok }] },
      { say: 'kill -SIGHUP %1：%1 指 1 号作业。sleep 1000 没有护盾，HUP 的默认动作是终止。作业 1 结束了，显示 Hangup。', hl: [5],
        log: ['$ kill -HUP %1', { s: '（作业 1 已终止，bash 会在下一条命令时报告）', at: 1500, cls: 'dim' }], data: { '[1] sleep 1000': { v: 'Hangup（已结束）', at: 1400 } },
        set: { sig: { text: 'SIGHUP', opacity: { from: 0, to: 1, dur: 150 }, s: { from: 1, to: 0.01, delay: 650, dur: 250 }, x: { from: 860, to: N.bg[0] + 10, dur: 600, ease: 'in' }, y: { from: 100, to: N.bg[1] - 5, dur: 600, ease: 'in' } },
          j1: merge(at('dead', 700, 900), { stroke: { to: C.bad, delay: 700, dur: 300 }, opacity: { to: 0.6, delay: 1500, dur: 300 } }) },
        fx: [{ type: 'burst', obj: 'j1', at: 1600, color: C.bad }] },
      { say: 'kill -SIGHUP %2：信号撞上 nohup 的护盾，被忽略了。作业 2 仍在运行，本机实测 jobs 仍显示 Running。', hl: [6, 7],
        log: ['$ kill -HUP %2; jobs', { s: '/usr/bin/bash: line 7:  9670 Hangup                     sleep 1000', at: 1000 }, { s: '[2]+  Running                    nohup sleep 2000 > /dev/null 2>&1 &', at: 1200 }],
        data: { '[2] nohup sleep 2000': 'Running（挡住了 HUP）' },
        set: { sig: { s: { from: 1, to: 1, dur: 0 }, x: { from: 860, to: N.bg[0] + 60, dur: 700, ease: 'in' }, y: { from: 120, to: N.bg[1] + 10, dur: 700, ease: 'in' }, opacity: { from: 1, to: 0, delay: 700, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'shield', at: 700, color: C.ok }, { type: 'shake', obj: 'sig', at: 700 }] },
      { say: 'kill %2：不写信号名时，默认发 SIGTERM。nohup 不管这个，作业 2 也结束了，显示 Terminated。', hl: [8],
        log: ['$ kill %2; jobs', { s: '[2]+  Terminated                 nohup sleep 2000 > /dev/null 2>&1', at: 1500 }], data: { '[2] nohup sleep 2000': { v: 'Terminated', at: 1400 } },
        set: { sig: { text: 'SIGTERM', opacity: { from: 0, to: 1, dur: 150 }, s: { from: 1, to: 0.01, delay: 650, dur: 250 }, x: { from: 860, to: N.bg[0] + 20, dur: 600, ease: 'in' }, y: { from: 120, to: N.bg[1] + 30, dur: 600, ease: 'in' } },
          shield: { opacity: { to: 0, delay: 500, dur: 300 } }, j2: merge(at('dead', 700, 900), { stroke: { to: C.bad, delay: 700, dur: 300 } }) },
        fx: [{ type: 'burst', obj: 'j2', at: 1600, color: C.bad }] },
      { say: '关掉终端或断开 SSH 时，后台作业会收到 SIGHUP。没套护盾的，就跟着死了。后面讲的 tmux，正是靠拦住这个信号让程序活下来。',
        set: { sig: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'pulse', x: N.dead[0], y: N.dead[1], at: 300, color: C.bad }] }
    ]
  };

  var LEC = { t: '讲义 command-line-environment', u: 'https://missing.csail.mit.edu/2026/command-line-environment/' };
  VZ.register({ id: 'ch02-rc', title: '返回码：控制流只看这个数字',
    sources: [{ t: '视频 21:16 返回码', u: 'https://youtu.be/ccBGsPedE9Q?t=1276' }, { t: '视频 25:06 && 与 ||', u: 'https://youtu.be/ccBGsPedE9Q?t=1506' }, { t: 'Bash 手册 · Exit Status', u: 'https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html' }, LEC],
    note: '控制台输出为本机 Git Bash 实测，PID 每次不同。“被信号终止，返回 128 加信号编号”出自 bash 手册 Exit Status。这条是补充，非视频内容。', scenes: [sceneRc] });
  VZ.register({ id: 'ch02-sigint', title: 'Ctrl-C 背后：SIGINT 与信号处理器',
    sources: [{ t: '视频 26:11 信号', u: 'https://youtu.be/ccBGsPedE9Q?t=1571' }, { t: '视频 27:21 SIGINT 处理器与 SIGQUIT', u: 'https://youtu.be/ccBGsPedE9Q?t=1641' }, { t: 'man 7 signal', u: 'https://www.man7.org/linux/man-pages/man7/signal.7.html' }, LEC],
    note: 'python sigint.py 的输出为讲义原文。第 6 步是本机 Git Bash 实测，用的是 trap 改写版。舞台上的计数器为示意。', scenes: [sceneInt] });
  VZ.register({ id: 'ch02-trap', title: 'trap 清理：TERM 能触发，KILL 不能',
    sources: [{ t: '视频 27:59 trap 清理', u: 'https://youtu.be/ccBGsPedE9Q?t=1679' }, { t: '视频 31:36 学生提问：被打断时会清理吗', u: 'https://youtu.be/ccBGsPedE9Q?t=1896' }, { t: 'Bash 手册 · trap', u: 'https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html#index-trap' }, LEC],
    note: 'trapdemo.sh 为本笔记示例，结构同讲义。输出为本机 Git Bash 实测。“孤儿被 PID 1 收养”经 /proc/PID/ppid 确认。', scenes: [sceneTrap] });
  VZ.register({ id: 'ch02-jobs', title: '作业控制：信号推动作业在 4 种状态之间移动',
    sources: [{ t: '视频 28:42 Ctrl-Z', u: 'https://youtu.be/ccBGsPedE9Q?t=1722' }, { t: '视频 29:49 kill 发 SIGCONT', u: 'https://youtu.be/ccBGsPedE9Q?t=1789' }, { t: '视频 39:46 SIGHUP', u: 'https://youtu.be/ccBGsPedE9Q?t=2386' }, LEC],
    note: '会话命令取自讲义。控制台为本机 Git Bash 实测。用 set -m 开作业控制，kill -TSTP 代替 Ctrl-Z。状态图为示意。', scenes: [sceneJobs] });
})();
