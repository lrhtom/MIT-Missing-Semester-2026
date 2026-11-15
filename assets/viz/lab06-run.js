/* lab06 · 练习的“跑”可视化：逐行执行时数据怎么变
 * 控制台内容全部取自 labs/data/lab06.js 中真跑（Git Bash 5.3 + Python 3.13 + uv 0.11.26）的输出：
 *   ex01-a / ex01-b（激活前后的环境变量）、ex02-e（构建可复现性）、ex04-b（web + 缓存替身）。
 * 环境变量快照里只画了与 diff 有关的几行（准备步骤把环境精简到了 HOME/SYSTEMROOT/TEMP/TMP/PATH）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 12.5, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }

  /* ---------- 练习 1：envdiff.sh 逐行 ---------- */
  var BX = 210, AX = 650, RY0 = 230, RS = 40;
  var ROWS = [['HOME', '<沙箱>', '<沙箱>'], ['PATH', '<Python>:/usr/bin:/bin', '<沙箱>/ex01/venv/Scripts:<Python>:…'], ['PS1', '（无）', '(venv) '], ['SYSTEMROOT', 'C:\\Windows', 'C:\\Windows'], ['VIRTUAL_ENV', '（无）', '<沙箱>/ex01/venv'], ['VIRTUAL_ENV_PROMPT', '（无）', 'venv']];
  var CHG = [1, 2, 4, 5];
  function envObjs() {
    var o = {
      venv: box(430, 120, 150, 40, 'venv/', C.teal, C.tealW, { mono: true, size: 14, opacity: 0, s: 0.7 }),
      sh: box(430, 60, 180, 34, '当前 shell', C.info, C.infoW, { size: 13 }),
      act: path('M430,140 C430,170 430,180 430,196', C.teal),
      bt: { type: 'text', x: BX, y: 196, text: 'before.txt', size: 13, mono: true, weight: 800, color: C.fg2, opacity: 0 },
      at: { type: 'text', x: AX, y: 196, text: 'after.txt', size: 13, mono: true, weight: 800, color: C.fg2, opacity: 0 }
    };
    ROWS.forEach(function (r, i) {
      o['b' + i] = box(BX, RY0 + i * RS, 340, 32, r[0] + '=' + r[1], C.line, C.bg2, { mono: true, size: 11, weight: 600, opacity: 0, rx: 5 });
      o['a' + i] = box(AX, RY0 + i * RS, 340, 32, r[0] + '=' + r[2], C.line, C.bg2, { mono: true, size: 11, weight: 600, opacity: 0, rx: 5 });
    });
    return o;
  }
  function snap(prefix, at) { var s = {}; ROWS.forEach(function (r, i) { s[prefix + i] = { opacity: { to: 1, delay: at + i * 110, dur: 200 }, y: { from: RY0 + i * RS - 14, to: RY0 + i * RS, delay: at + i * 110, dur: 350, ease: 'out' } }; }); return s; }
  var sceneEnv = {
    name: 'envdiff.sh', desc: '逐行运行练习 1 的 envdiff.sh。激活前后各拍一张环境变量“快照”。再用 diff 找出激活脚本到底改了什么。',
    code: { lang: 'sh', title: 'ex01/envdiff.sh', src: '#!/bin/bash\n# 练习 1：对比激活虚拟环境前后的环境变量\nset -euo pipefail\n\npython -m venv venv\nprintenv | sort > before.txt\n\n# Windows 上 venv 把脚本放在 Scripts/，Linux/macOS 放在 bin/\nif [ -f venv/Scripts/activate ]; then\n    source venv/Scripts/activate\nelse\n    source venv/bin/activate\nfi\nprintenv | sort > after.txt\n\ndiff before.txt after.txt || true' },
    dataTitle: '当前 shell',
    data: { 'which python': '<Python>/python', '提示符': '$', '不同的变量': 0 },
    bg: function (d) {
      d.text(430, 24, '激活前后各拍一张快照，diff 只留下变化的行', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(430, 210, 430, 470, { stroke: C.line, sw: 1, dash: '3 5' });
    },
    objects: envObjs,
    steps: [
      { say: 'python -m venv venv：新建一个虚拟环境目录。只是建目录，当前 shell 的任何变量都还没变。', hl: [5],
        log: '$ bash envdiff.sh',
        set: { venv: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } } }, fx: [{ type: 'ripple', obj: 'venv', at: 500, color: C.teal }] },
      { say: '激活前，printenv | sort > before.txt 把全部环境变量按名字排好存档。本机实测时，环境被精简成了几项。真实机器上会长得多。', hl: [6],
        set: merge(snap('b', 200), { bt: { opacity: { to: 1, dur: 300 } } }) },
      { say: 'source venv/Scripts/activate：在当前 shell 里执行激活脚本。它先定义 deactivate 函数，再改 PATH、设 VIRTUAL_ENV、给提示符加前缀。', hl: [9, 10],
        data: { 'which python': { v: '<沙箱>/ex01/venv/Scripts/python', at: 1200 }, '提示符': { v: '(venv) $', at: 1200 } },
        set: { act: { dash: { to: 1, dur: 500 } }, sh: { text: { to: '(venv) 当前 shell', delay: 1000 }, stroke: { to: C.teal, delay: 900, dur: 300 }, fill: { to: C.tealW, delay: 900, dur: 300 } } },
        fx: [{ type: 'stream', path: 'act', at: 300, n: 3, dur: 900, color: C.teal, labels: ['PATH', 'VIRTUAL_ENV', 'PS1'] }, { type: 'pulse', obj: 'sh', at: 1100, color: C.teal }] },
      { say: 'printenv | sort > after.txt：激活后再拍一张。', hl: [14],
        set: merge(snap('a', 200), { at: { opacity: { to: 1, dur: 300 } } }) },
      { say: 'diff before.txt after.txt 的结果：PATH 被改了一行。PS1、VIRTUAL_ENV、VIRTUAL_ENV_PROMPT 三个是新增的。HOME、SYSTEMROOT 没变。这是本机实测输出。', hl: [16],
        log: [{ s: '5c5', at: 200 }, { s: '< PATH=<Python>:/usr/bin:/bin', at: 300 }, { s: '---', at: 400 }, { s: '> PATH=<沙箱>/ex01/venv/Scripts:<Python>:/usr/bin:/bin', at: 500 }, { s: '6a7', at: 700 }, { s: '> PS1=(venv) ', at: 800 }, { s: '12a14,15', at: 1000 }, { s: '> VIRTUAL_ENV=<沙箱>/ex01/venv', at: 1100 }, { s: '> VIRTUAL_ENV_PROMPT=venv', at: 1200 }],
        data: { '不同的变量': { v: 4, at: 1200 } },
        set: (function () {
          var s = {};
          CHG.forEach(function (i, k) { var at = 200 + k * 300; s['a' + i] = { stroke: { to: C.ok, delay: at, dur: 250 }, fill: { to: C.okW, delay: at, dur: 250 } }; s['b' + i] = { stroke: { to: C.bad, delay: at, dur: 250 }, fill: { to: C.badW, delay: at, dur: 250 } }; });
          [0, 3].forEach(function (i) { s['a' + i] = { opacity: { to: 0.4, delay: 1300, dur: 300 } }; s['b' + i] = { opacity: { to: 0.4, delay: 1300, dur: 300 } }; });
          return s;
        })(),
        fx: [{ type: 'pulse', obj: 'a1', at: 300, color: C.ok }, { type: 'pulse', obj: 'a4', at: 900, color: C.ok }] },
      { say: '练习的另一问：which deactivate 为什么找不到？deactivate 不是磁盘上的程序。它是激活脚本定义的 shell 函数，只有 type 能看到。ex01-b 实测过。',
        log: ['$ which deactivate; echo "which 的退出码：$?"', { s: 'which: no deactivate in (<沙箱>/ex01/venv/Scripts:<Python>:/usr/bin:/bin)', at: 500, cls: 'err' }, { s: 'which 的退出码：1', at: 700 }, { s: '$ type deactivate | head -14', at: 1100 }, { s: 'deactivate is a function', at: 1400 }, { s: 'deactivate () ', at: 1500 }, { s: '{ ', at: 1600 }, { s: '…（后略）', at: 1700, cls: 'dim' }],
        fx: [{ type: 'shake', obj: 'sh', at: 600 }] },
      { say: 'deactivate 做的事，就是把激活脚本的改动倒回去。PATH 恢复成存在 _OLD_VIRTUAL_PATH 里的旧值。再 unset VIRTUAL_ENV，恢复 PS1，最后删除自己。',
        log: ['$ deactivate', '$ which python; echo "VIRTUAL_ENV=${VIRTUAL_ENV:-（已取消）}"', { s: '<Python>/python', at: 900 }, { s: 'VIRTUAL_ENV=（已取消）', at: 1000 }],
        data: { 'which python': { v: '<Python>/python', at: 900 }, '提示符': { v: '$', at: 600 } },
        set: { sh: { text: { to: '当前 shell', delay: 600 }, stroke: { to: C.info, delay: 500, dur: 300 }, fill: { to: C.infoW, delay: 500, dur: 300 } }, act: { dash: { to: 0, delay: 200, dur: 500 } } },
        fx: [{ type: 'flash', obj: 'sh', at: 600, color: C.info }] }
    ]
  };

  /* ---------- 练习 2：构建两次，哈希一样吗 ---------- */
  var HX = [180, 400, 620];
  function buildObjs() {
    return {
      src: box(120, 140, 170, 60, 'greeting.py', C.teal, C.tealW, { mono: true, size: 13 }),
      mt: { type: 'text', x: 120, y: 190, text: 'mtime 01-01 12:00', size: 12, mono: true, weight: 700, color: C.warn },
      bld: box(400, 140, 170, 50, 'uv build --wheel', C.info, C.infoW, { mono: true, size: 12.5 }),
      q1: path('M206,140 L314,140', C.teal),
      q2: path('M486,140 C560,140 600,190 640,230', C.info),
      zip: box(680, 270, 230, 64, '', C.ok, C.okW, { mono: true, size: 11.5 }),
      zt: { type: 'text', x: 680, y: 262, text: 'greeting.py  @ —', size: 11.5, mono: true, weight: 700, color: C.fg, opacity: 0 },
      zt2: { type: 'text', x: 680, y: 284, text: 'METADATA     @ —', size: 11.5, mono: true, weight: 700, color: C.fg, opacity: 0 },
      h1: box(250, 420, 360, 30, '', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      h2: box(250, 462, 360, 30, '', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      h3: box(650, 420, 300, 30, '', C.ok, C.okW, { mono: true, size: 11.5, opacity: 0 }),
      h4: box(650, 462, 300, 30, '', C.ok, C.okW, { mono: true, size: 11.5, opacity: 0 }),
      env: box(400, 80, 290, 30, 'SOURCE_DATE_EPOCH=1767225600', C.warn, C.warnW, { mono: true, size: 12, opacity: 0 })
    };
  }
  var sceneBuild = {
    name: '构建可复现吗', desc: '练习 2 的补充实验 ex02-e。同一份源码只改文件修改时间，wheel 的 sha256 就变了。固定 SOURCE_DATE_EPOCH 后，两次构建逐字节相同。',
    code: { lang: 'sh', title: 'ex02-e（本机实测）', src: "touch -d '2026-01-01 12:00' greeting.py && uv build -q --wheel -o ../w1\ntouch -d '2026-02-01 12:00' greeting.py && uv build -q --wheel -o ../w2\nsha256sum ../w1/*.whl ../w2/*.whl\nexport SOURCE_DATE_EPOCH=1767225600\ntouch -d '2026-03-01 12:00' greeting.py && uv build -q --wheel -o ../w3\ntouch -d '2026-04-01 12:00' greeting.py && uv build -q --wheel -o ../w4\nsha256sum ../w3/*.whl ../w4/*.whl" },
    dataTitle: '构建结果',
    data: { '源码内容': '不变', 'SOURCE_DATE_EPOCH': '（未设置）', '哈希是否相同': '无' },
    bg: function (d) {
      d.text(430, 24, '“同样的输入 → 同样的字节”就是可复现构建', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(680, 230, 'wheel（zip）里记录的文件时间', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
      d.line(40, 385, 820, 385, { stroke: C.line, sw: 1, dash: '3 5' });
      d.text(250, 398, '不设 SOURCE_DATE_EPOCH', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(650, 398, '设了 SOURCE_DATE_EPOCH', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
    },
    objects: buildObjs,
    steps: [
      { say: '把 greeting.py 的修改时间设成 1 月 1 日，再构建 wheel。zip 里的 greeting.py 记下了这个时间。dist-info 里的元数据文件，记的是构建时刻。', hl: [1],
        set: { q1: { dash: { to: 1, dur: 400 } }, q2: { dash: { to: 1, delay: 700, dur: 400 } }, zt: { text: 'greeting.py  @ 2026-01-01 12:00', opacity: { to: 1, delay: 1100, dur: 300 } }, zt2: { text: 'METADATA     @ 构建时刻', opacity: { to: 1, delay: 1200, dur: 300 } } },
        fx: [{ type: 'stream', path: 'q1', at: 100, n: 2, dur: 600, color: C.teal }, { type: 'pulse', obj: 'bld', at: 600, color: C.info }, { type: 'stream', path: 'q2', at: 700, n: 2, dur: 600, color: C.ok, labels: ['w1'] }] },
      { say: '内容一个字节都没改。只把修改时间改成 2 月 1 日，再构建一次。', hl: [2],
        set: { mt: { text: { to: 'mtime 02-01 12:00', delay: 200 } }, zt: { text: { to: 'greeting.py  @ 2026-02-01 12:00', delay: 1100 } } },
        fx: [{ type: 'float', obj: 'src', at: 200, text: 'touch', color: C.warn }, { type: 'stream', path: 'q1', at: 400, n: 2, dur: 600, color: C.teal }, { type: 'stream', path: 'q2', at: 900, n: 2, dur: 600, color: C.ok, labels: ['w2'] }] },
      { say: 'sha256sum 显示，两个 wheel 的哈希完全不同。zip 把文件时间也算进了字节里。', hl: [3],
        eq: [{ s: 'w1 = 2ace89ce…', at: 300 }, { s: 'w2 = 4866bd92…', at: 700 }, { s: '第 1 个十六进制位就不同：2 ≠ 6 → 不相同', at: 1200, cls: 'bad' }],
        log: ['$ sha256sum ../w1/*.whl ../w2/*.whl', { s: '2ace89ce6f47ce642f1a278b274d36f6b0de10b10993b063d6d32d67824ead58 *../w1/…whl', at: 400 }, { s: '4866bd92707c7ac63ce8bb84a560291052c92201543594ea6dceb7ff9031868c *../w2/…whl', at: 700 }],
        data: { '哈希是否相同': { v: '不同', at: 1200 } },
        set: { h1: { text: 'w1  2ace89ce6f47ce64…', opacity: { to: 1, delay: 300, dur: 300 } }, h2: { text: 'w2  4866bd92707c7ac6…', opacity: { to: 1, delay: 700, dur: 300 }, stroke: { to: C.bad, delay: 1200, dur: 300 }, fill: { to: C.badW, delay: 1200, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'h2', at: 1250 }] },
      { say: 'export SOURCE_DATE_EPOCH=1767225600，也就是 2026-01-01 00:00 UTC。这是可复现构建的通用约定。打包工具看到它，就用这个时间代替真实时间。', hl: [4],
        data: { 'SOURCE_DATE_EPOCH': { v: '1767225600', at: 300 } },
        set: { env: { opacity: { to: 1, dur: 300 }, y: { from: 60, to: 80, dur: 400, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'env', at: 400, color: C.warn }, { type: 'pulse', obj: 'bld', at: 700, color: C.warn }] },
      { say: '再换两个修改时间，各构建一次。分别是 3 月 1 日和 4 月 1 日。zip 里所有文件的时间，都被换成了 2026-01-01 00:00。', hl: [5, 6],
        set: { mt: { text: { to: 'mtime 03-01 → 04-01', delay: 200 } }, zt: { text: { to: 'greeting.py  @ 2026-01-01 00:00', delay: 1100 } }, zt2: { text: { to: 'METADATA     @ 2026-01-01 00:00', delay: 1200 } } },
        fx: [{ type: 'stream', path: 'q1', at: 300, n: 2, dur: 600, color: C.teal }, { type: 'stream', path: 'q2', at: 800, n: 4, dur: 900, color: C.ok, labels: ['w3', 'w4'] }, { type: 'flash', obj: 'zip', at: 1100, color: C.ok }] },
      { say: '修改时间不同，输出目录也不同，哈希却一字不差。两次都是 f247708a…。输入相同，输出就相同。', hl: [7],
        eq: [{ s: 'w3 = f247708af9632194…', at: 300 }, { s: 'w4 = f247708af9632194…', at: 700 }, { s: '64 个十六进制位全部相同 → 逐字节一致', at: 1200, cls: 'ok' }],
        log: ['$ sha256sum ../w3/*.whl ../w4/*.whl', { s: 'f247708af96321949617d438b3ee206042234c3c42e1da614e8b32e66250da85 *../w3/…whl', at: 400 }, { s: 'f247708af96321949617d438b3ee206042234c3c42e1da614e8b32e66250da85 *../w4/…whl', at: 700, cls: 'ok' }],
        data: { '哈希是否相同': { v: '相同', at: 1200 } },
        set: { h3: { text: 'w3  f247708af9632194…', opacity: { to: 1, delay: 300, dur: 300 } }, h4: { text: 'w4  f247708af9632194…', opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'h4', at: 1200, color: C.ok }, { type: 'burst', obj: 'h4', at: 1300, color: C.ok }] }
    ]
  };

  /* ---------- 练习 4：web + 缓存替身逐行跑 ---------- */
  function svcObjs() {
    return {
      web: box(330, 200, 190, 60, 'python app.py（web）', C.info, C.infoW, { size: 12.5, opacity: 0, s: 0.8 }),
      cache: box(680, 200, 210, 60, 'python fake_redis.py', C.teal, C.tealW, { size: 12.5, opacity: 0, s: 0.8 }),
      cli: box(110, 200, 120, 50, 'curl', C.neutral, C.bg3, { mono: true }),
      g1: path('M170,190 L234,190', C.data), g2: path('M426,190 L574,190', C.data), g3: path('M574,212 L426,212', C.ok), g4: path('M234,212 L170,212', C.ok),
      port1: { type: 'text', x: 330, y: 248, text: ':28080', size: 12, mono: true, color: C.fg3, opacity: 0 },
      port2: { type: 'text', x: 680, y: 248, text: ':26379', size: 12, mono: true, color: C.fg3, opacity: 0 },
      wait: { type: 'text', x: 330, y: 300, text: '', size: 12, mono: true, weight: 700, color: C.warn, opacity: 0 },
      cnt: { type: 'text', x: 680, y: 300, num: 0, pre: 'visits = ', size: 15, mono: true, weight: 800, color: C.teal, opacity: 0 },
      r1: box(110, 380, 170, 30, '', C.bad, C.badW, { mono: true, size: 12, opacity: 0 }),
      r2: box(330, 380, 170, 30, '', C.ok, C.okW, { mono: true, size: 12, opacity: 0 }),
      r3: box(530, 380, 170, 30, '', C.ok, C.okW, { mono: true, size: 12, opacity: 0 }),
      r4: box(730, 380, 170, 30, '', C.ok, C.okW, { mono: true, size: 12, opacity: 0 }),
      r5: box(330, 440, 300, 30, '', C.bad, C.badW, { mono: true, size: 12, opacity: 0 })
    };
  }
  var SRC4 = "PORT=28080 REDIS_URL=redis://127.0.0.1:26379 python app.py & WEB=$!\nuntil curl -s -o /dev/null 127.0.0.1:28080; do sleep 0.2; done\ncurl -s -w 'HTTP %{http_code}\\n' 127.0.0.1:28080\nPORT=26379 python fake_redis.py & CACHE=$!\nuntil (exec 3<>/dev/tcp/127.0.0.1/26379) 2>/dev/null; do sleep 0.2; done\nfor i in 1 2 3; do curl -s 127.0.0.1:28080; done\nkill $CACHE; wait $CACHE 2>/dev/null\ncurl -s -w 'HTTP %{http_code}\\n' 127.0.0.1:28080\nkill $WEB";
  var sceneSvc = {
    name: 'web + 缓存', desc: '逐行运行练习 4 的 ex04-b。故意先启动 web，后启动缓存。看看依赖服务没就绪时会发生什么。',
    code: { lang: 'sh', title: 'ex04-b（本机实测）', src: SRC4 },
    dataTitle: '进程',
    data: { 'WEB（PID 变量）': '无', 'CACHE（PID 变量）': '无', '最近一次响应': '无' },
    bg: function (d) {
      d.text(430, 24, '两个后台进程 + 一个 curl：先 web、后缓存', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(40, 350, '每次 curl 的响应：', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: svcObjs,
    steps: [
      { say: '第 1 行：用环境变量注入端口和缓存地址。& 把 web 放到后台。$! 是它的进程号，存进 WEB。', hl: [1],
        log: { s: 'web: listening on 127.0.0.1:28080, cache = redis://127.0.0.1:26379', at: 900 },
        data: { 'WEB（PID 变量）': { v: '$!（后台进程号）', at: 600 } },
        set: { web: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } }, port1: { opacity: { to: 1, delay: 500, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'web', at: 600, color: C.info }] },
      { say: '第 2 行：until 循环反复 curl，直到 web 能接受连接。这是脚本里“等服务就绪”的常见写法。', hl: [2],
        set: { wait: { text: 'until curl … ; do sleep 0.2; done', opacity: { to: 1, dur: 300 } }, g1: { dash: { to: 1, delay: 300, dur: 400 } } },
        fx: [{ type: 'stream', path: 'g1', at: 300, n: 3, dur: 1400, color: C.data, labels: ['?', '?', 'ok'] }] },
      { say: '第 3 行：真正访问一次。web 去连 26379 端口，可缓存还没启动。连接在本机等了约 2 秒，然后超时。web 返回 503，没有崩溃。', hl: [3],
        log: [{ s: 'cache unavailable: TimeoutError', at: 2200, cls: 'err' }, { s: 'HTTP 503', at: 2300, cls: 'err' }],
        data: { '最近一次响应': { v: 'HTTP 503', at: 2300 } },
        set: { wait: { opacity: { to: 0, dur: 300 } }, g2: { dash: { to: 1, delay: 400, dur: 400 }, stroke: { to: C.bad, delay: 2000, dur: 200 } }, g4: { dash: { to: 1, delay: 2100, dur: 300 } }, r1: { text: '503 TimeoutError', opacity: { to: 1, delay: 2300, dur: 300 } } },
        fx: [{ type: 'stream', path: 'g2', at: 400, n: 1, dur: 1600, color: C.bad, labels: ['INCR …'] }, { type: 'shake', obj: 'web', at: 2100 }] },
      { say: '第 4、5 行：启动缓存替身。再用 bash 的 /dev/tcp 反复尝试连 26379，直到它开始监听。', hl: [4, 5],
        log: { s: 'cache: fake redis on 127.0.0.1:26379', at: 700 },
        data: { 'CACHE（PID 变量）': { v: '$!（后台进程号）', at: 600 } },
        set: { cache: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } }, port2: { opacity: { to: 1, delay: 500, dur: 300 } }, g2: { stroke: { to: C.data, dur: 200 } }, cnt: { opacity: { to: 1, delay: 900, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'cache', at: 700, color: C.teal }] },
      { say: '第 6 行：连访问 3 次。每次 web 向缓存发 INCR visits。缓存回 :1、:2、:3，web 再把计数写进网页。', hl: [6],
        log: [{ s: 'This page has been visited 1 times.', at: 900 }, { s: 'This page has been visited 2 times.', at: 1700 }, { s: 'This page has been visited 3 times.', at: 2500 }],
        data: { '最近一次响应': { v: 'HTTP 200（visited 3 times）', at: 2500 } },
        set: { g3: { dash: { to: 1, delay: 500, dur: 300 } }, cnt: { num: { to: 3, delay: 700, dur: 1800, ease: 'linear' } },
          r2: { text: 'visited 1 times', opacity: { to: 1, delay: 900, dur: 200 } }, r3: { text: 'visited 2 times', opacity: { to: 1, delay: 1700, dur: 200 } }, r4: { text: 'visited 3 times', opacity: { to: 1, delay: 2500, dur: 200 } } },
        fx: [{ type: 'stream', path: 'g2', at: 200, n: 3, dur: 2200, color: C.data, labels: ['INCR', 'INCR', 'INCR'] }, { type: 'stream', path: 'g3', at: 500, n: 3, dur: 2200, color: C.ok, labels: [':1', ':2', ':3'] }] },
      { say: '第 7、8 行：kill 掉缓存，再访问一次，又回到 503。web 一直活着，缓存恢复后就能继续服务。', hl: [7, 8],
        log: [{ s: 'cache unavailable: TimeoutError', at: 2200, cls: 'err' }, { s: 'HTTP 503', at: 2300, cls: 'err' }],
        data: { 'CACHE（PID 变量）': { v: '（已结束）', at: 300 }, '最近一次响应': { v: 'HTTP 503', at: 2300 } },
        set: { cache: { opacity: { to: 0.3, delay: 200, dur: 400 } }, cnt: { opacity: { to: 0.3, delay: 200, dur: 400 } }, g2: { stroke: { to: C.bad, delay: 2000, dur: 200 } }, r5: { text: '503 TimeoutError（缓存已停）', opacity: { to: 1, delay: 2300, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'cache', at: 300, color: C.bad }, { type: 'stream', path: 'g2', at: 600, n: 1, dur: 1400, color: C.bad, labels: ['INCR …'] }] },
      { say: '第 9 行：kill $WEB 收尾。后台进程不清理，会一直占着端口。生成本页的脚本也会等不到输出结束。runs.json 里还有一条 teardown 兜底。', hl: [9],
        data: { 'WEB（PID 变量）': { v: '（已结束）', at: 400 } },
        set: { web: { opacity: { to: 0.3, delay: 200, dur: 400 } }, port1: { opacity: { to: 0.3, delay: 200, dur: 400 } } },
        fx: [{ type: 'burst', obj: 'web', at: 300, color: C.info }] }
    ]
  };

  VZ.register({
    id: 'lab06-envdiff', title: '练习 1 跑起来：激活脚本改了哪些环境变量',
    sources: [{ t: '讲义练习 1', u: 'https://missing.csail.mit.edu/2026/shipping-code/#exercises' }, { t: 'Python 文档 · venv', u: 'https://docs.python.org/3/library/venv.html' }],
    note: '控制台是 ex01-a 和 ex01-b 的本机真跑输出。快照里只列出和 diff 有关的几个变量。其余的被准备步骤精简掉了。',
    scenes: [sceneEnv]
  });
  VZ.register({
    id: 'lab06-repro', title: '练习 2 跑起来：同一份源码，构建出的 wheel 一样吗',
    sources: [{ t: '讲义 Reproducibility', u: 'https://missing.csail.mit.edu/2026/shipping-code/#reproducibility' }, { t: 'reproducible-builds.org · SOURCE_DATE_EPOCH', u: 'https://reproducible-builds.org/docs/source-date-epoch/' }],
    note: '控制台和哈希是 ex02-e 的本机真跑输出。“METADATA @ 构建时刻”依据的是 ex02-d 里 unzip -l 显示的时间。',
    scenes: [sceneBuild]
  });
  VZ.register({
    id: 'lab06-service', title: '练习 4 跑起来：依赖的服务没就绪会怎样',
    sources: [{ t: '讲义 Services & Orchestration', u: 'https://missing.csail.mit.edu/2026/shipping-code/#services--orchestration' }, { t: 'Redis 协议 RESP', u: 'https://redis.io/docs/latest/develop/reference/protocol-spec/' }],
    note: '控制台是 ex04-b 的本机真跑输出。缓存是 30 行的 Redis 替身 fake_redis.py。部署时，由 compose 里的 redis 镜像代替。',
    scenes: [sceneSvc]
  });
})();
