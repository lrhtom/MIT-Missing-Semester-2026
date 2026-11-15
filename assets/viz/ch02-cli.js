/* ch02 · 命令行程序的输入：参数、glob、流、环境变量 —— 可视化演示
 * 依据：Lecture 2 视频 2:39–9:50（参数、flag、glob）、10:32–16:05（流与并发管道、stderr）、
 *       16:05–21:08（变量、export、bash -c）；讲义 command-line-environment.md（进程替换、TZ）。
 * 实测：控制台里的输出都是在本机 Git Bash 5.3 中真跑得到的（args.py 只打印 sys.argv；
 *       numbers.txt 内容 1 12 3 3 x 7；PID 取自一次实测，每次运行都不同）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 9, fill: colW || C.bg, stroke: col || C.line, sw: 1.7, text: text || '', color: C.fg, mono: true, size: 14, weight: 700 }, extra || {});
  }
  function pipe(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.4, dash: 0, arrow: 'data' }, extra || {}); }
  function term(x, y, w, h) { return { type: 'box', x: x, y: y, w: w || 170, h: h || 70, rx: 10, fill: '#0f1318', stroke: '#2b3440', sw: 1.4, text: '终端', color: '#9be09b', size: 13, weight: 700 }; }

  /* ---------- 场景 1：参数与 glob ---------- */
  var FILES = ['args.py', 'main.py', 'notes.md', 'run.sh', 'utils.py'];
  var FX = 150, FY0 = 170, FDY = 52;
  var AX = 660, AY0 = 170, ADY = 56;
  function fileObjs() {
    var o = {};
    FILES.forEach(function (f, i) {
      o['f' + i] = box(FX, FY0 + i * FDY, 130, 36, f, C.teal, C.tealW, { size: 14 });
      o['m' + i] = { type: 'text', x: FX + 88, y: FY0 + i * FDY, text: '', size: 18, weight: 800, color: C.ok, opacity: 0 };
      o['c' + i] = box(FX, FY0 + i * FDY, 120, 32, f, C.data, C.dataW, { opacity: 0, size: 13.5 });
    });
    for (var j = 0; j < 4; j++) o['a' + j] = box(AX, AY0 + j * ADY, 190, 38, '', C.line, C.bg, { opacity: 0, size: 14 });
    o.line = { type: 'text', x: 60, y: 76, anchor: 'start', mono: true, size: 20, text: '$ python args.py *.py', color: C.fg };
    o.glob = box(330, 76, 76, 32, '*.py', C.warn, C.warnW, { size: 15, color: C.warn, trail: { n: 5, gap: 40 } });
    o.b0 = box(430, 400, 120, 34, 'folder/a.py', C.data, C.dataW, { opacity: 0, size: 13 });
    o.b1 = box(430, 400, 120, 34, 'folder/b.py', C.data, C.dataW, { opacity: 0, size: 13 });
    o.b2 = box(430, 400, 120, 34, 'folder/c.py', C.data, C.dataW, { opacity: 0, size: 13 });
    o.brace = box(430, 400, 220, 38, 'folder/{a,b,c}.py', C.warn, C.warnW, { opacity: 0, size: 15, color: C.warn });
    o.flag = box(430, 470, 120, 36, '-myfile', C.bad, C.badW, { opacity: 0, size: 15, color: C.bad });
    o.dd = box(320, 470, 54, 36, '--', C.ok, C.okW, { opacity: 0, size: 16, color: C.ok });
    return o;
  }
  function scan(on) { /* 让 glob 逐个经过文件，on=匹配下标 */
    var s = { glob: { x: { to: FX + 150, dur: 500, ease: 'inOut' }, y: { to: FY0, dur: 500, ease: 'inOut' } } };
    FILES.forEach(function (f, i) {
      var at = 520 + i * 330, hit = on.indexOf(i) >= 0;
      s['f' + i] = { stroke: { to: hit ? C.ok : C.line, delay: at, dur: 200 }, fill: { to: hit ? C.okW : C.bg, delay: at, dur: 200 } };
      s['m' + i] = { text: hit ? '√' : '×', color: hit ? C.ok : C.bad, opacity: { to: 1, delay: at, dur: 150 } };
    });
    s.glob.y = { to: FY0 + 4 * FDY, delay: 500, dur: 1500, ease: 'linear' };
    return s;
  }
  function resetFiles() {
    var s = {};
    FILES.forEach(function (f, i) { s['f' + i] = { stroke: { to: C.teal, dur: 300 }, fill: { to: C.tealW, dur: 300 } }; s['m' + i] = { opacity: { to: 0, dur: 250 } }; });
    return s;
  }
  function slots(vals, at, cols) {
    var s = {};
    for (var j = 0; j < 4; j++) {
      var v = vals[j];
      s['a' + j] = v == null ? { opacity: { to: 0, dur: 250 } } :
        { text: v, opacity: { to: 1, delay: (at || 0) + j * 120, dur: 250 }, stroke: { to: (cols && cols[j]) || C.data, dur: 200 }, fill: { to: j === 0 ? C.infoW : C.dataW, dur: 200 } };
    }
    return s;
  }
  var sceneGlob = {
    name: '参数与 glob', desc: 'glob 由 shell 在运行程序之前展开。程序收到的 argv 里已经是具体文件名，根本看不到 *。',
    code: { lang: 'sh', title: '依次输入（目录里有 5 个文件）', src: 'python args.py *.py\npython args.py "*.py"\necho folder/{a,b,c}.py\necho *{.py,.sh}\ntouch -- -myfile\nrm -myfile\nrm -- -myfile' },
    dataTitle: 'argv 与匹配',
    data: { '模式': '无', '匹配到': '无', 'argv 项数': '无' },
    bg: function (d) {
      d.text(430, 30, '你敲的行  →  shell 展开 glob / 花括号  →  程序收到的 argv', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(70, FY0 - 40, 200, 5 * FDY + 26, { fill: 'none', stroke: C.line, dash: '5 4', rx: 12 });
      d.text(170, FY0 - 52, '当前目录（磁盘上的文件）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(AX, AY0 - 46, 'sys.argv（程序看到的）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      for (var j = 0; j < 4; j++) {
        d.rect(AX - 100, AY0 + j * ADY - 23, 200, 46, { fill: 'none', stroke: C.line, dash: '4 4', rx: 10 });
        d.text(AX - 112, AY0 + j * ADY, '[' + j + ']', { anchor: 'end', size: 12, mono: true, color: C.fg3 });
      }
    },
    objects: fileObjs,
    steps: [
      { say: 'shell 读进一行：python args.py *.py。其中 *.py 没加引号，是一个 glob 模式。args.py 只做一件事：打印它收到的参数。', hl: [1],
        log: '$ python args.py *.py', data: { '模式': '*.py' },
        set: { line: { opacity: { from: 0.2, to: 1, dur: 500 } } }, fx: [{ type: 'pulse', obj: 'glob', at: 400, color: C.warn }] },
      { say: 'shell 拿着 *.py 去当前目录，逐个比对文件名。干这活的是 shell，不是 python。* 匹配任意长度的任意字符，命中 3 个。',
        data: { '匹配到': { v: 'args.py main.py utils.py', at: 2100 } },
        set: scan([0, 1, 4]), fx: [{ type: 'ripple', obj: 'f0', at: 520, color: C.ok }, { type: 'ripple', obj: 'f1', at: 850, color: C.ok }, { type: 'ripple', obj: 'f4', at: 1840, color: C.ok }] },
      { say: '匹配到的文件名按字母序替换掉 *.py，再启动程序。python 看到的 argv 是脚本名加 3 个文件名。它完全不知道你写过 *。',
        log: { s: "['args.py', 'args.py', 'main.py', 'utils.py']", at: 1500 }, data: { 'argv 项数': { v: 4, at: 1300 } },
        set: merge(slots(['args.py', null, null, null], 0, [C.info]),
          { glob: { opacity: { to: 0, dur: 300 } },
            c0: { opacity: { to: 1, dur: 200 }, x: { to: AX, delay: 100, dur: 800, ease: 'inOut' }, y: { to: AY0 + ADY, delay: 100, dur: 800, ease: 'inOut' } },
            c1: { opacity: { to: 1, delay: 150, dur: 200 }, x: { to: AX, delay: 250, dur: 800, ease: 'inOut' }, y: { to: AY0 + 2 * ADY, delay: 250, dur: 800, ease: 'inOut' } },
            c4: { opacity: { to: 1, delay: 300, dur: 200 }, x: { to: AX, delay: 400, dur: 800, ease: 'inOut' }, y: { to: AY0 + 3 * ADY, delay: 400, dur: 800, ease: 'inOut' } } }),
        fx: [{ type: 'ripple', obj: 'a3', at: 1250, color: C.data }] },
      { say: '加上引号 "*.py"，shell 就不展开了。argv 里就是字面量 *.py 这 4 个字符。换成 rm "*.py"，它会去找一个真叫 *.py 的文件。', hl: [2],
        log: ['$ python args.py "*.py"', { s: "['args.py', '*.py']", at: 1300 }], data: { '模式': '"*.py"（被引号保护）', '匹配到': '不展开', 'argv 项数': { v: 2, at: 1200 } },
        set: merge(resetFiles(), slots(['args.py', null, null, null]), { line: { text: '$ python args.py "*.py"' },
          c0: { opacity: { to: 0, dur: 250 } }, c1: { opacity: { to: 0, dur: 250 } }, c4: { opacity: { to: 0, dur: 250 } },
          glob: { text: '"*.py"', w: { to: 90, dur: 0 }, x: { from: 340, to: AX, dur: 900, delay: 300, ease: 'inOut' }, y: { from: 76, to: AY0 + ADY, dur: 900, delay: 300, ease: 'inOut' }, opacity: { from: 0, to: 1, dur: 250 }, stroke: { to: C.neutral, dur: 0 }, color: { to: C.fg2, dur: 0 } } }),
        fx: [{ type: 'pulse', obj: 'a0', at: 1200, color: C.info }] },
      { say: '花括号 {a,b,c} 是另一种展开。逗号隔开的几项，各生成一个词。它不看磁盘，folder/ 根本不存在也照样展开。', hl: [3],
        log: ['$ echo folder/{a,b,c}.py', { s: 'folder/a.py folder/b.py folder/c.py', at: 1700 }], data: { '模式': '{a,b,c}', '匹配到': '（不查文件）', 'argv 项数': { v: 4, at: 1500 } },
        set: merge(slots([null, null, null, null]), { line: { text: '$ echo folder/{a,b,c}.py' }, glob: { opacity: { to: 0, dur: 250 } },
          brace: { opacity: { to: 1, dur: 300 }, s: { from: 0.8, to: 1, dur: 400, ease: 'back' } },
          b0: { opacity: { to: 1, delay: 700, dur: 150 }, x: { to: AX, delay: 750, dur: 750, ease: 'inOut' }, y: { to: AY0 + ADY, delay: 750, dur: 750, ease: 'inOut' } },
          b1: { opacity: { to: 1, delay: 700, dur: 150 }, x: { to: AX, delay: 850, dur: 750, ease: 'inOut' }, y: { to: AY0 + 2 * ADY, delay: 850, dur: 750, ease: 'inOut' } },
          b2: { opacity: { to: 1, delay: 700, dur: 150 }, x: { to: AX, delay: 950, dur: 750, ease: 'inOut' }, y: { to: AY0 + 3 * ADY, delay: 950, dur: 750, ease: 'inOut' } },
          a0: { text: 'echo', opacity: { to: 1, dur: 250 }, stroke: { to: C.info, dur: 0 }, fill: { to: C.infoW, dur: 0 } } }),
        fx: [{ type: 'burst', obj: 'brace', at: 700, color: C.warn }, { type: 'shake', obj: 'brace', at: 600 }] },
      { say: '两者可以组合。*{.py,.sh} 先被拆成 *.py 和 *.sh 两个 glob。再各自去匹配文件，结果多了 run.sh。', hl: [4],
        log: ['$ echo *{.py,.sh}', { s: 'args.py main.py utils.py run.sh', at: 2300 }], data: { '模式': '*.py  *.sh', '匹配到': { v: '3 个 .py + 1 个 .sh', at: 2200 }, 'argv 项数': '5' },
        set: merge(scan([0, 1, 3, 4]), { line: { text: '$ echo *{.py,.sh}' }, brace: { opacity: { to: 0, dur: 250 } },
          b0: { opacity: { to: 0, dur: 250 } }, b1: { opacity: { to: 0, dur: 250 } }, b2: { opacity: { to: 0, dur: 250 } }, a0: { opacity: { to: 0, dur: 250 } },
          glob: { text: '*.py *.sh', w: { to: 110, dur: 0 }, opacity: { to: 1, dur: 250 }, stroke: { to: C.warn, dur: 0 }, color: { to: C.warn, dur: 0 } } }),
        fx: [{ type: 'ripple', obj: 'f3', at: 1510, color: C.ok }] },
      { say: '参数本身只是字符串。以 - 开头的，才被程序当作 flag。先建一个叫 -myfile 的文件。rm -myfile 会把它当成选项 -m -y …，于是报错。', hl: [5, 6],
        log: ['$ touch -- -myfile', '$ rm -myfile', { s: 'rm: unknown option -- m', at: 900, cls: 'err' }, { s: "Try 'rm ./-myfile' to remove the file '-myfile'.", at: 1100, cls: 'err' }, { s: '（exit=1）', at: 1300, cls: 'dim' }],
        data: { '模式': '无', '匹配到': '无', 'argv 项数': 2 },
        set: merge(resetFiles(), { line: { text: '$ rm -myfile' }, glob: { opacity: { to: 0, dur: 250 } },
          flag: { opacity: { to: 1, dur: 300 }, y: { from: 440, to: 470, dur: 500, ease: 'back' } } }),
        fx: [{ type: 'shake', obj: 'flag', at: 800 }, { type: 'flash', obj: 'flag', at: 800, color: C.bad }] },
      { say: '特殊参数 -- 告诉程序：“到此为止，后面不再有 flag”。rm -- -myfile 就把 -myfile 当普通文件名删掉了。也可以写成 ./-myfile。', hl: [7],
        log: ['$ rm -- -myfile', { s: '（exit=0，文件已删除）', at: 900, cls: 'dim' }],
        set: { line: { text: '$ rm -- -myfile' }, dd: { opacity: { to: 1, dur: 300 }, s: { from: 0.6, to: 1, dur: 500, ease: 'back' } },
          flag: { stroke: { to: C.teal, delay: 500, dur: 300 }, fill: { to: C.tealW, delay: 500, dur: 300 }, color: { to: C.teal, delay: 500, dur: 300 }, x: { to: 470, delay: 500, dur: 500, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'flag', at: 900, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：并发的管道 ---------- */
  var PY = 210, PXS = [140, 360, 540, 715];
  var scenePipe = {
    name: '并发的管道', desc: '管道里的程序是同时启动的。数据一产生，就被下一个程序消费。管道只传 stdout，stderr 绕过它直达终端。',
    code: { lang: 'sh', title: 'numbers.txt：1 12 3 3 x 7（每行一个）', src: "(sleep 2 && cat numbers.txt) | grep -P '^\\d$' | sort | uniq &\nps | grep -E '(sleep|cat|grep|sort|uniq)'\nwait\nls /nonexistent | grep \"pattern\"\nls /nonexistent 2>/dev/null" },
    dataTitle: '进程状态',
    data: { '时钟': '0.0 s', 'cat': '未启动', '终端看到': '无' },
    legend: [[C.data, 'stdout（进管道）'], [C.bad, 'stderr（不进管道）'], [C.info, '进程'], [C.ok, '退出码 0'], [C.neutral, '被过滤掉的数据']],
    bg: function (d) {
      d.text(430, 30, 'shell 一次性启动整条流水线，用管道把 stdout → stdin 接起来', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(PXS[0], PY - 72, '子 shell ( … )', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(715, 494, '终端（stdout 与 stderr 默认都接在这里）', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: {
      sub: box(PXS[0], PY, 200, 108, '', C.info, C.infoW, { opacity: 0, s: 0.8 }),
      sl: box(PXS[0], PY - 22, 150, 34, 'sleep 2', C.warn, C.warnW, { opacity: 0, size: 14 }),
      ct: box(PXS[0], PY + 26, 150, 34, 'cat numbers.txt', C.neutral, C.bg, { opacity: 0, size: 13, dasharray: '5 4' }),
      p1: box(PXS[1], PY, 130, 50, "grep -P", C.info, C.infoW, { opacity: 0, s: 0.8 }),
      p2: box(PXS[2], PY, 100, 50, 'sort', C.info, C.infoW, { opacity: 0, s: 0.8 }),
      p3: box(PXS[3], PY, 100, 50, 'uniq', C.info, C.infoW, { opacity: 0, s: 0.8 }),
      q1: pipe('M240,' + PY + ' L295,' + PY),
      q2: pipe('M425,' + PY + ' L490,' + PY),
      q3: pipe('M590,' + PY + ' L665,' + PY),
      q4: pipe('M715,' + (PY + 25) + ' C715,330 715,350 715,395'),
      t: merge(term(715, 440, 190, 76), { text: '' }),
      out: { type: 'text', x: 715, y: 440, text: '', size: 14, mono: true, weight: 700, color: '#9be09b', opacity: 0 },
      clock: { type: 'text', x: 140, y: 340, num: 0, fmt: 'fixed1', pre: 't = ', post: ' s', size: 20, weight: 800, mono: true, color: C.warn, opacity: 0 },
      d1: box(PXS[1], PY, 40, 28, '12', C.neutral, C.bg3, { opacity: 0, size: 13 }),
      d2: box(PXS[1], PY, 40, 28, 'x', C.neutral, C.bg3, { opacity: 0, size: 13 }),
      e: { type: 'path', d: 'M140,' + (PY + 56) + ' C150,400 430,470 620,450', stroke: C.bad, sw: 2.2, dash: 0, arrow: 'atk' },
      e2: { type: 'path', d: 'M140,' + (PY + 56) + ' C140,380 260,440 320,450', stroke: C.bad, sw: 2.2, dash: 0, arrow: 'atk' },
      nul: { type: 'circle', x: 350, y: 455, r: 30, fill: '#000', stroke: C.neutral, sw: 2, text: '/dev/null', color: '#bbb', size: 10.5, opacity: 0 }
    },
    steps: [
      { say: 'shell 解析整行，一次性启动 4 个部分，接好 3 根管道。这几乎发生在同一时刻。行末的 & 把整条流水线放到后台。', hl: [1],
        log: "$ (sleep 2 && cat numbers.txt) | grep -P '^\\d$' | sort | uniq &",
        set: { sub: { opacity: { to: 1, dur: 250 }, s: { to: 1, dur: 450, ease: 'back' } }, sl: { opacity: { to: 1, delay: 250, dur: 200 } }, ct: { opacity: { to: 0.45, delay: 250, dur: 200 } },
          p1: { opacity: { to: 1, delay: 80, dur: 250 }, s: { to: 1, delay: 80, dur: 450, ease: 'back' } },
          p2: { opacity: { to: 1, delay: 160, dur: 250 }, s: { to: 1, delay: 160, dur: 450, ease: 'back' } },
          p3: { opacity: { to: 1, delay: 240, dur: 250 }, s: { to: 1, delay: 240, dur: 450, ease: 'back' } },
          q1: { dash: { to: 1, delay: 400, dur: 400 } }, q2: { dash: { to: 1, delay: 500, dur: 400 } }, q3: { dash: { to: 1, delay: 600, dur: 400 } }, q4: { dash: { to: 1, delay: 700, dur: 400 } },
          clock: { opacity: { to: 1, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'p1', at: 450, color: C.info }, { type: 'pulse', obj: 'p2', at: 530, color: C.info }, { type: 'pulse', obj: 'p3', at: 610, color: C.info }] },
      { say: '0.5 秒时看一眼 ps。sleep、grep、sort、uniq 都已经在运行，唯独没有 cat。它被 && 排在了 sleep 之后，这是本机实测。', hl: [2],
        data: { '时钟': '0.5 s' }, set: { clock: { num: { to: 0.5, dur: 500 } } },
        log: ["$ ps | grep -E '(sleep|cat|grep|sort|uniq)'", { s: '     5508    5503    5503      29360  ?   …  /usr/bin/sort', at: 500 }, { s: '     5506    5503    5503      40816  ?   …  /usr/bin/grep', at: 600 }, { s: '     5509    5503    5503      37052  ?   …  /usr/bin/uniq', at: 700 }, { s: '     5507    5505    5503      22728  ?   …  /usr/bin/sleep', at: 800 }],
        fx: [{ type: 'pulse', obj: 'sl', at: 300, color: C.warn }, { type: 'shake', obj: 'ct', at: 900 }] },
      { say: '2 秒到：sleep 以退出码 0 结束，&& 成立，cat 这时才启动。grep、sort、uniq 一直在等 stdin 上的数据。', hl: [3],
        data: { '时钟': { v: '2.0 s', at: 1200 }, 'cat': { v: '运行中', at: 1400 } }, log: { s: '$ wait', cls: 'in' },
        set: { clock: { num: { to: 2, dur: 1200, ease: 'linear' } }, sl: { opacity: { to: 0.3, delay: 1200, dur: 300 }, stroke: { to: C.ok, delay: 1200, dur: 200 }, text: { to: 'sleep 2 → 0', delay: 1200 } },
          ct: { opacity: { to: 1, delay: 1400, dur: 300 }, stroke: { to: C.info, delay: 1400, dur: 300 }, fill: { to: C.infoW, delay: 1400, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'sl', at: 1250, color: C.ok }, { type: 'float', obj: 'sl', at: 1250, text: 'exit 0 → &&', color: C.ok }] },
      { say: 'cat 一行行吐出数据，立刻流进 grep。grep -P \'^\\d$\' 只留“整行是一个数字”的行。12 和 x 被丢掉。',
        set: { d1: { opacity: { from: 0, to: 1, delay: 700, dur: 150 }, y: { from: PY, to: PY + 120, delay: 800, dur: 700, ease: 'in' } },
          d2: { opacity: { from: 0, to: 1, delay: 1000, dur: 150 }, y: { from: PY, to: PY + 130, delay: 1100, dur: 700, ease: 'in' }, x: { to: PXS[1] + 40, delay: 1100, dur: 700 } } },
        fx: [{ type: 'stream', path: 'q1', at: 100, n: 6, dur: 1300, color: C.data, labels: ['1', '12', '3', '3', 'x', '7'] }, { type: 'stream', path: 'q2', at: 900, n: 4, dur: 1100, color: C.data, labels: ['1', '3', '3', '7'] }] },
      { say: 'sort 要读到输入结束，才知道顺序。所以它收齐了才输出。uniq 合并相邻的重复行，最终 1 3 7 到达终端。',
        data: { '终端看到': { v: '1 3 7', at: 1700 }, 'cat': '已结束' },
        log: [{ s: '1', at: 1500 }, { s: '3', at: 1600 }, { s: '7', at: 1700 }],
        set: { d1: { opacity: { to: 0, dur: 300 } }, d2: { opacity: { to: 0, dur: 300 } }, ct: { opacity: { to: 0.3, delay: 200, dur: 300 } },
          out: { text: '1 3 7', opacity: { to: 1, delay: 1700, dur: 300 } } },
        fx: [{ type: 'stream', path: 'q3', at: 200, n: 4, dur: 900, color: C.data, labels: ['1', '3', '3', '7'] }, { type: 'stream', path: 'q4', at: 900, n: 3, dur: 800, color: C.data, labels: ['1', '3', '7'] }, { type: 'ripple', obj: 't', at: 1700, color: C.ok }] },
      { say: '换一条：ls /nonexistent | grep "pattern"。ls 的报错写在 stderr 上，也就是 2 号。管道只接 stdout，所以报错绕过 grep，直接打到终端。', hl: [4],
        log: ['$ ls /nonexistent | grep "pattern"', { s: "ls: cannot access '/nonexistent': No such file or directory", at: 1300, cls: 'err' }],
        data: { '时钟': '无', 'cat': '无', '终端看到': { v: '（报错）', at: 1300 } },
        set: { clock: { opacity: { to: 0, dur: 300 } }, sl: { opacity: { to: 0, dur: 250 } }, ct: { opacity: { to: 0, dur: 250 } }, sub: { text: 'ls /nonexistent', w: { to: 190, dur: 400 }, h: { to: 54, dur: 400 } },
          p1: { text: 'grep "pattern"', w: { to: 150, dur: 300 } }, p2: { opacity: { to: 0.25, dur: 300 } }, p3: { opacity: { to: 0.25, dur: 300 } },
          q2: { dash: { to: 0, dur: 300 } }, q3: { dash: { to: 0, dur: 300 } }, q4: { dash: { to: 0, dur: 300 } },
          out: { text: 'ls: cannot access …', color: { to: C.bad, dur: 0 }, size: { to: 12, dur: 0 }, opacity: { from: 0, to: 1, delay: 1300, dur: 300 } },
          e: { dash: { to: 1, delay: 300, dur: 700 } } },
        fx: [{ type: 'stream', path: 'e', at: 700, n: 2, dur: 900, color: C.bad, labels: ['stderr'] }, { type: 'shake', obj: 't', at: 1500 }] },
      { say: '2>/dev/null 把 2 号接到 /dev/null。写进去的东西直接消失，终端干干净净。退出码仍然是 2。', hl: [5],
        log: ['$ ls /nonexistent 2>/dev/null', { s: '（无输出）', at: 1300, cls: 'dim' }],
        data: { '终端看到': { v: '（无）', at: 1200 } },
        set: { p1: { opacity: { to: 0.25, dur: 300 } }, q1: { dash: { to: 0, dur: 300 } }, e: { dash: { to: 0, dur: 300 } }, out: { opacity: { to: 0, dur: 300 } },
          nul: { opacity: { to: 1, delay: 200, dur: 300 }, s: { from: 0.4, to: 1, delay: 200, dur: 500, ease: 'back' } }, e2: { dash: { to: 1, delay: 400, dur: 600 } } },
        fx: [{ type: 'stream', path: 'e2', at: 800, n: 2, dur: 800, color: C.bad, labels: ['stderr'] }, { type: 'burst', obj: 'nul', at: 1500, color: C.neutral }] }
    ]
  };

  /* ---------- 场景 3：环境变量继承 ---------- */
  var PCX = 210, CCX = 650, LY = 175, EY = 340;
  function chip(x, y, t, col, colW, extra) { return box(x, y, 150, 34, t, col, colW, merge({ size: 13.5 }, extra || {})); }
  function forkIn(at) {
    return { child: { opacity: { to: 1, delay: at, dur: 300 }, s: { from: 0.85, to: 1, delay: at, dur: 450, ease: 'back' } },
      ctitle: { opacity: { to: 1, delay: at + 150, dur: 300 } }, fork: { dash: { from: 0, to: 1, delay: Math.max(0, at - 300), dur: 500 } } };
  }
  function copyEnv(list, at, dbgText) { /* 把父进程环境区的芯片复制到子进程 */
    var s = {};
    list.forEach(function (k, i) {
      s['c' + k] = { text: k === 'dbg' && dbgText ? dbgText : undefined, opacity: { from: 0, to: 1, delay: at + i * 150, dur: 200 }, x: { from: PCX, to: CCX, delay: at + i * 150, dur: 800, ease: 'inOut' }, y: { from: EY + ({ home: -40, path: 0, dbg: 40 })[k], to: EY + ({ home: -40, path: 0, dbg: 40 })[k], dur: 0 } };
    });
    return s;
  }
  function childOut(at) {
    return { child: { opacity: { to: 0, delay: at, dur: 400 } }, ctitle: { opacity: { to: 0, delay: at, dur: 300 } }, fork: { dash: { to: 0, delay: at, dur: 400 } },
      chome: { opacity: { to: 0, delay: at, dur: 300 } }, cpath: { opacity: { to: 0, delay: at, dur: 300 } }, cdbg: { opacity: { to: 0, delay: at, dur: 300 } }, said: { opacity: { to: 0, delay: at, dur: 300 } } };
  }
  var sceneEnv = {
    name: '环境变量继承', desc: '子进程启动时，拿到的是父进程环境变量的一份拷贝。没 export 的本地变量不会被拷贝。子进程改了自己的拷贝，也影响不到父进程。',
    code: { lang: 'sh', title: '依次输入', src: "DEBUG=1\nbash -c 'echo \"child sees DEBUG=[$DEBUG]\"'\nDEBUG=2 bash -c 'echo \"prefix: …[$DEBUG]\"'\nexport DEBUG\nbash -c 'echo \"after export: …[$DEBUG]\"'\nDEBUG=3; bash -c '…'\nbash -c 'DEBUG=99; export DEBUG; echo child: $DEBUG'\necho \"parent: $DEBUG\"\nunset DEBUG" },
    dataTitle: '父 shell 里的 DEBUG',
    data: { '本地变量': '无', '已 export': '否', '子进程看到': '无' },
    bg: function (d) {
      d.text(430, 30, '父进程的变量分两类：只在本 shell 的 / 会被拷贝给子进程的', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(PCX - 150, 80, 300, 400, { fill: C.bg2, stroke: C.info, sw: 1.8, rx: 14 });
      d.text(PCX, 100, '父进程：你的交互 shell', { anchor: 'middle', size: 13, weight: 750, color: C.info });
      d.rect(PCX - 130, LY - 40, 260, 90, { fill: 'none', stroke: C.line, dash: '5 4', rx: 10 });
      d.text(PCX - 120, LY - 52, 'shell 本地变量（不传给子进程）', { size: 11.5, color: C.fg3, weight: 600 });
      d.rect(PCX - 130, EY - 70, 260, 160, { fill: C.tealW, stroke: C.teal, rx: 10, sw: 1.4 });
      d.text(PCX - 120, EY - 82, '环境变量（export 过的）', { size: 11.5, color: C.teal, weight: 700 });
    },
    objects: {
      home: chip(PCX, EY - 40, 'HOME=/home/…', C.teal, C.bg),
      path: chip(PCX, EY, 'PATH=/usr/bin:…', C.teal, C.bg),
      dbg: chip(PCX, LY, 'DEBUG=1', C.warn, C.warnW, { opacity: 0 }),
      child: box(CCX, 280, 300, 360, '', C.warn, C.bg2, { opacity: 0, s: 0.85 }),
      ctitle: { type: 'text', x: CCX, y: 118, text: '子进程：bash -c …', size: 13, weight: 750, color: C.warn, opacity: 0 },
      fork: { type: 'path', d: 'M360,200 C450,130 520,130 500,160', stroke: C.warn, sw: 2.2, dash: 0, arrow: 'warn' },
      chome: chip(PCX, EY - 40, 'HOME=/home/…', C.teal, C.bg, { opacity: 0 }),
      cpath: chip(PCX, EY, 'PATH=/usr/bin:…', C.teal, C.bg, { opacity: 0 }),
      cdbg: chip(PCX, EY + 40, 'DEBUG=1', C.teal, C.tealW, { opacity: 0 }),
      tmp: chip(430, 520, 'DEBUG=2', C.warn, C.warnW, { opacity: 0 }),
      said: { type: 'text', x: CCX, y: 420, text: '', size: 14, mono: true, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { say: 'DEBUG=1：在当前 shell 里建了一个变量。它只是 shell 的本地变量，放在上面那个区域。', hl: [1],
        log: '$ DEBUG=1', data: { '本地变量': { v: 'DEBUG=1', at: 400 } },
        set: { dbg: { opacity: { to: 1, dur: 300 }, y: { from: LY - 30, to: LY, dur: 500, ease: 'back' } } }, fx: [{ type: 'pulse', obj: 'dbg', at: 500, color: C.warn }] },
      { say: 'bash -c 启动子进程。子进程诞生时，只拷贝环境变量区，比如 HOME 和 PATH。DEBUG 不在其中，所以它打印空值。', hl: [2],
        log: ["$ bash -c 'echo \"child sees DEBUG=[$DEBUG]\"'", { s: 'child sees DEBUG=[]', at: 1700 }], data: { '子进程看到': { v: '（空）', at: 1700 } },
        set: merge(forkIn(300), copyEnv(['home', 'path'], 700), { said: { text: 'DEBUG=[]', opacity: { to: 1, delay: 1700, dur: 300 } } }),
        fx: [{ type: 'shake', obj: 'dbg', at: 900 }] },
      { say: '前缀写法 DEBUG=2 bash -c …。这个赋值只放进“这一次”子进程的环境。父进程里的 DEBUG 还是 1。', hl: [3],
        log: ["$ DEBUG=2 bash -c 'echo \"prefix: child sees DEBUG=[$DEBUG]\"'", { s: 'prefix: child sees DEBUG=[2]', at: 2200 }], data: { '子进程看到': { v: '2（只此一次）', at: 2200 } },
        set: merge(childOut(0), forkIn(700), copyEnv(['home', 'path'], 1000), {
          tmp: { opacity: { from: 0, to: 1, delay: 500, dur: 200 }, x: { from: 430, to: CCX, delay: 900, dur: 900, ease: 'inOut' }, y: { from: 520, to: EY + 40, delay: 900, dur: 900, ease: 'inOut' } },
          said: { text: 'DEBUG=[2]', opacity: { from: 0, to: 1, delay: 2200, dur: 300 } } }),
        fx: [{ type: 'ripple', obj: 'tmp', at: 1850, color: C.warn }] },
      { say: 'export DEBUG：把 DEBUG 标记为“导出”。它从本地区滑进了环境区。以后启动的每个子进程，都会拷贝它。', hl: [4],
        log: '$ export DEBUG', data: { '本地变量': { v: '（移入环境区）', at: 700 }, '已 export': { v: '是', at: 700 }, '子进程看到': '无' },
        set: merge(childOut(0), { tmp: { opacity: { to: 0, dur: 300 } },
          dbg: { y: { to: EY + 40, delay: 300, dur: 800, ease: 'inOut' }, stroke: { to: C.teal, delay: 900, dur: 300 }, fill: { to: C.tealW, delay: 900, dur: 300 } } }),
        fx: [{ type: 'ripple', obj: 'dbg', at: 1150, color: C.teal }] },
      { say: '再运行 bash -c。这次三项环境变量都被拷贝过去，子进程看到 DEBUG=1。', hl: [5],
        log: ["$ bash -c 'echo \"after export: child sees DEBUG=[$DEBUG]\"'", { s: 'after export: child sees DEBUG=[1]', at: 1900 }], data: { '子进程看到': { v: '1', at: 1900 } },
        set: merge(forkIn(300), copyEnv(['home', 'path', 'dbg'], 700, 'DEBUG=1'), { said: { text: 'DEBUG=[1]', opacity: { from: 0, to: 1, delay: 1900, dur: 300 } } }) },
      { say: 'export 之后再改成 DEBUG=3，它仍然是导出状态。新启动的子进程，拷贝到的就是 3。这是学生的提问，本机实测过。', hl: [6],
        log: ['$ DEBUG=3; bash -c …', { s: 'modified after export: child sees DEBUG=[3]', at: 2100 }], data: { '本地变量': '无', '子进程看到': { v: '3', at: 2100 } },
        set: merge(childOut(0), { dbg: { text: { to: 'DEBUG=3', delay: 500 } } }, forkIn(900), copyEnv(['home', 'path', 'dbg'], 1100, 'DEBUG=3'), { said: { text: 'DEBUG=[3]', opacity: { from: 0, to: 1, delay: 2100, dur: 300 } } }),
        fx: [{ type: 'pulse', obj: 'dbg', at: 500, color: C.warn }] },
      { say: '子进程改自己的拷贝，DEBUG=99 再 export。这只影响它自己和它的子进程。它一退出，父进程里仍是 3。', hl: [7, 8],
        log: ["$ bash -c 'DEBUG=99; export DEBUG; echo child: $DEBUG'", { s: 'child: 99', at: 1000 }, { s: '$ echo "parent: $DEBUG"', at: 2000 }, { s: 'parent: 3', at: 2200 }],
        set: merge(childOut(1500), {
          cdbg: { text: { to: 'DEBUG=99', delay: 500 }, stroke: { to: C.warn, delay: 500, dur: 200 }, opacity: { to: 0, delay: 1500, dur: 300 } },
          said: { text: { to: 'child: 99', delay: 900 }, opacity: { to: 0, delay: 1500, dur: 300 } } }),
        fx: [{ type: 'pulse', obj: 'cdbg', at: 500, color: C.warn }, { type: 'burst', x: CCX, y: 280, at: 1600, color: C.warn }, { type: 'pulse', obj: 'dbg', at: 2200, color: C.ok }] },
      { say: 'unset DEBUG：从当前 shell 删除这个变量。之后的子进程，也就看不到它了。', hl: [9],
        log: ['$ unset DEBUG', { s: "$ bash -c '…'  →  after unset: child sees DEBUG=[]", at: 900, cls: 'dim' }], data: { '已 export': '无', '子进程看到': { v: '（空）', at: 900 } },
        set: { dbg: { opacity: { to: 0, delay: 200, dur: 300 }, s: { to: 0.5, delay: 200, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'dbg', at: 250, color: C.bad }] }
    ]
  };

  /* ---------- 场景 4：命令替换与进程替换 ---------- */
  var sceneSubst = {
    name: '$( ) 与 <( )', desc: '$(cmd) 把命令的输出变成一段字符串。<(cmd) 把输出变成一个“文件名”。只认文件参数的程序，就能用它。',
    code: { lang: 'sh', title: '依次输入（src 里有 a b，docs 里有 a c）', src: 'files=$(ls)\necho "$files" | grep README\necho $files\necho <(true)\ndiff <(ls src) <(ls docs)' },
    dataTitle: '替换结果',
    data: { '$files': '无', '<(…) 变成': '无' },
    bg: function (d) {
      d.text(430, 30, '命令替换：输出 → 字符串　｜　进程替换：输出 → 临时文件名', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: {
      line: { type: 'text', x: 60, y: 80, anchor: 'start', mono: true, size: 19, text: '$ files=$(ls)', color: C.fg },
      ls: box(150, 190, 110, 46, 'ls', C.info, C.infoW, { opacity: 0 }),
      lsq: pipe('M205,190 C290,190 330,190 395,190'),
      v: box(560, 210, 300, 120, '', C.warn, C.warnW, { opacity: 0, rx: 12 }),
      vt: { type: 'text', x: 430, y: 166, anchor: 'start', mono: true, size: 14, text: 'files =', color: C.warn, weight: 800, opacity: 0 },
      l1: { type: 'text', x: 440, y: 192, anchor: 'start', mono: true, size: 14, text: 'README.md⏎ a.py⏎', color: C.fg, opacity: 0 },
      l2: { type: 'text', x: 440, y: 216, anchor: 'start', mono: true, size: 14, text: 'b.py⏎ numbers.txt', color: C.fg, opacity: 0 },
      flat: { type: 'text', x: 430, y: 300, text: 'README.md a.py b.py numbers.txt', mono: true, size: 14, weight: 700, color: C.fg2, opacity: 0 },
      s1: box(150, 400, 120, 44, 'ls src', C.info, C.infoW, { opacity: 0 }),
      s2: box(150, 490, 120, 44, 'ls docs', C.info, C.infoW, { opacity: 0 }),
      f1: box(400, 400, 130, 40, '/dev/fd/63', C.teal, C.tealW, { opacity: 0, size: 13 }),
      f2: box(400, 490, 130, 40, '/dev/fd/62', C.teal, C.tealW, { opacity: 0, size: 13 }),
      w1: pipe('M210,400 L335,400', C.data), w2: pipe('M210,490 L335,490', C.data),
      r1: pipe('M465,400 C560,400 580,440 640,440', C.teal), r2: pipe('M465,490 C560,490 580,460 640,458', C.teal),
      df: box(720, 448, 150, 54, 'diff', C.info, C.infoW, { opacity: 0 })
    },
    steps: [
      { say: 'files=$(ls)：shell 先运行 $( ) 里的 ls。它写到 stdout 的全部文字，包括换行，都被收集起来。', hl: [1], log: '$ files=$(ls)',
        set: { ls: { opacity: { to: 1, dur: 300 }, s: { from: 0.8, to: 1, dur: 400, ease: 'back' } }, lsq: { dash: { to: 1, delay: 300, dur: 500 } } },
        fx: [{ type: 'stream', path: 'lsq', at: 700, n: 4, dur: 1200, color: C.data, labels: ['README.md', 'a.py', 'b.py', 'numbers.txt'] }] },
      { say: '收集到的文字原样存进变量 files，换行还在。所以 echo "$files" | grep README 仍然能逐行过滤。', hl: [2],
        data: { '$files': { v: '4 行（含换行）', at: 500 } }, log: ['$ echo "$files" | grep README', { s: 'README.md', at: 1300 }],
        set: { v: { opacity: { to: 1, dur: 300 } }, vt: { opacity: { to: 1, delay: 200, dur: 300 } }, l1: { opacity: { to: 1, delay: 400, dur: 300 } }, l2: { opacity: { to: 1, delay: 600, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'v', at: 500, color: C.warn }] },
      { say: '但 echo $files 没加引号。shell 按空白把变量内容切开，换行也算空白。结果是 4 个参数。echo 再用空格拼起来，换行就没了。', hl: [3],
        log: ['$ echo $files', { s: 'README.md a.py b.py numbers.txt', at: 1200 }],
        set: { flat: { opacity: { to: 1, delay: 500, dur: 300 }, y: { from: 250, to: 300, delay: 500, dur: 600, ease: 'out' } } },
        fx: [{ type: 'shake', obj: 'v', at: 400 }] },
      { say: '进程替换 <(cmd)：shell 先运行 cmd。输出接到一个临时“文件”上。再把整个 <( ) 换成这个文件的名字。本机实测它叫 /dev/fd/63。', hl: [4],
        log: ['$ echo <(true)', { s: '/dev/fd/63', at: 900 }], data: { '<(…) 变成': { v: '/dev/fd/63', at: 900 } },
        set: { line: { text: '$ echo <(true)' }, ls: { opacity: { to: 0.2, dur: 300 } }, lsq: { dash: { to: 0, dur: 300 } }, v: { opacity: { to: 0.2, dur: 300 } }, vt: { opacity: { to: 0.2, dur: 300 } }, l1: { opacity: { to: 0.2, dur: 300 } }, l2: { opacity: { to: 0.2, dur: 300 } }, flat: { opacity: { to: 0, dur: 300 } },
          f1: { opacity: { to: 1, delay: 500, dur: 300 }, s: { from: 0.7, to: 1, delay: 500, dur: 400, ease: 'back' } } } },
      { say: 'diff <(ls src) <(ls docs)：两个 ls 同时运行。输出分别流进两个临时文件。', hl: [5],
        log: '$ diff <(ls src) <(ls docs)',
        set: { line: { text: '$ diff <(ls src) <(ls docs)' }, s1: { opacity: { to: 1, dur: 300 } }, s2: { opacity: { to: 1, delay: 100, dur: 300 } }, f2: { opacity: { to: 1, delay: 200, dur: 300 } },
          w1: { dash: { to: 1, delay: 300, dur: 400 } }, w2: { dash: { to: 1, delay: 400, dur: 400 } } },
        fx: [{ type: 'stream', path: 'w1', at: 700, n: 2, dur: 900, color: C.data, labels: ['a', 'b'] }, { type: 'stream', path: 'w2', at: 800, n: 2, dur: 900, color: C.data, labels: ['a', 'c'] }] },
      { say: '命令行被改写成 diff /dev/fd/63 /dev/fd/62。diff 只认文件名参数，它像读普通文件一样把两边读进来。',
        data: { '<(…) 变成': '/dev/fd/63、/dev/fd/62' },
        set: { line: { text: '$ diff /dev/fd/63 /dev/fd/62' }, df: { opacity: { to: 1, delay: 300, dur: 300 }, s: { from: 0.8, to: 1, delay: 300, dur: 400, ease: 'back' } },
          r1: { dash: { to: 1, delay: 500, dur: 500 } }, r2: { dash: { to: 1, delay: 600, dur: 500 } } },
        fx: [{ type: 'pulse', obj: 'f1', at: 100, color: C.teal }, { type: 'pulse', obj: 'f2', at: 200, color: C.teal }, { type: 'stream', path: 'r1', at: 1000, n: 2, dur: 800, color: C.teal }, { type: 'stream', path: 'r2', at: 1100, n: 2, dur: 800, color: C.teal }] },
      { say: '输出（本机实测）：第 2 行不同，左边是 b，右边是 c。退出码 1 表示“有差异”。',
        log: [{ s: '2c2', at: 300 }, { s: '< b', at: 400 }, { s: '---', at: 500 }, { s: '> c', at: 600 }, { s: '（diff exit=1）', at: 800, cls: 'dim' }],
        fx: [{ type: 'ripple', obj: 'df', at: 300, color: C.ok }] }
    ]
  };

  var NOTE = '控制台输出均为本机 Git Bash 实测，PID 每次运行都不同。方框布局为示意。';
  var LEC = { t: '讲义 command-line-environment', u: 'https://missing.csail.mit.edu/2026/command-line-environment/' };
  VZ.register({ id: 'ch02-glob', title: 'glob 与参数：程序收到的 argv 是 shell 展开之后的样子',
    sources: [{ t: '视频 2:39 参数与 flag', u: 'https://youtu.be/ccBGsPedE9Q?t=159' }, { t: '视频 8:07 glob 展开', u: 'https://youtu.be/ccBGsPedE9Q?t=487' }, { t: 'Bash 手册 · Filename Expansion', u: 'https://www.gnu.org/software/bash/manual/html_node/Filename-Expansion.html' }, LEC],
    note: NOTE + ' args.py 只有一行 print(sys.argv)。', scenes: [sceneGlob] });
  VZ.register({ id: 'ch02-pipe', title: '管道里的程序同时运行，stderr 不进管道',
    sources: [{ t: '视频 11:06 管道并发', u: 'https://youtu.be/ccBGsPedE9Q?t=666' }, { t: '视频 12:51 sleep && cat 实验', u: 'https://youtu.be/ccBGsPedE9Q?t=771' }, { t: '视频 15:22 stderr', u: 'https://youtu.be/ccBGsPedE9Q?t=922' }, LEC],
    note: NOTE + ' ps 行省略了中间几列。', scenes: [scenePipe] });
  VZ.register({ id: 'ch02-subst', title: '$( ) 与 <( )：把输出变成字符串或文件名',
    sources: [{ t: '视频 16:42 命令替换', u: 'https://youtu.be/ccBGsPedE9Q?t=1002' }, { t: 'Bash 手册 · Process Substitution', u: 'https://www.gnu.org/software/bash/manual/html_node/Process-Substitution.html' }, LEC],
    note: NOTE, scenes: [sceneSubst] });
  VZ.register({ id: 'ch02-env', title: '环境变量继承：子进程拿到的是一份拷贝',
    sources: [{ t: '视频 17:57 DEBUG 与 export', u: 'https://youtu.be/ccBGsPedE9Q?t=1077' }, { t: '视频 20:09 export 的作用', u: 'https://youtu.be/ccBGsPedE9Q?t=1209' }, { t: '视频 23:25 学生提问', u: 'https://youtu.be/ccBGsPedE9Q?t=1405' }, LEC],
    note: NOTE + ' HOME / PATH 的值为示意。', scenes: [sceneEnv] });
})();
