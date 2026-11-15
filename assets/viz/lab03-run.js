/* lab03 · 练习的“跑”可视化
 * 控制台内容取自 labs/data/lab03.js 中本机 Git Bash 真跑的输出（ex02-a、ex02-b、ex04-a）；
 * 光标落点来自本机 Vim 9.2 用 trace.vim 逐组回放 golf.keys / wrong.keys 的记录（方法见第 3 讲 §8 的补充说明）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 9, fill: colW || C.bg, stroke: col || C.line, sw: 1.7, text: text || '', color: C.fg, mono: true, size: 13.5, weight: 700 }, extra || {});
  }
  function nb(t) { return typeof t === 'string' ? t.replace(/ /g, ' ') : t; }

  /* ---------- 练习 2：VimGolf 回放 ---------- */
  var FZ = ['def fizz_buzz(limit):', '    for i in range(limit):', '        if i % 3 == 0:', '            print("fizz", end="")', '        if i % 5 == 0:', '            print("fizz", end="")', '        if i % 3 and i % 5:', '            print(i, end="")', '        print()', '', 'def main():', '    fizz_buzz(20)', ''];
  var X0 = 70, CW = 9.2, Y0 = 70, LH = 30;
  function lx(c) { return X0 + (c - 0.5) * CW; }
  function ly(l) { return Y0 + (l - 1) * LH; }
  function golfObjs() {
    var o = {};
    FZ.forEach(function (t, i) { o['L' + (i + 1)] = { type: 'text', x: X0, y: ly(i + 1), anchor: 'start', mono: true, size: 15, cw: CW, text: nb(t), color: C.fg }; });
    o.cur = { type: 'box', x: lx(1), y: ly(1), w: CW + 1, h: 22, rx: 2, fill: 'rgba(230,140,40,0.35)', stroke: C.warn, sw: 1.5, trail: { n: 5, gap: 34 } };
    o.ins = { type: 'box', x: lx(1), y: ly(1), w: CW, h: 24, rx: 3, fill: C.okW, stroke: C.ok, sw: 1.3, opacity: 0 };
    o.gh = { type: 'box', x: lx(1), y: ly(1), w: CW, h: 22, rx: 3, fill: C.badW, stroke: C.bad, sw: 1.3, text: '', mono: true, size: 13, color: C.bad, opacity: 0 };
    o.key = box(720, 90, 170, 44, '', C.warn, C.warnW, { size: 16, color: C.warn, opacity: 0 });
    o.cnt = { type: 'text', x: 720, y: 160, num: 0, pre: '已按 ', post: ' 键', size: 20, weight: 800, mono: true, color: C.data };
    o.res = box(720, 470, 190, 44, '', C.ok, C.okW, { size: 15, opacity: 0 });
    return o;
  }
  function mv(l, c, d) { return { cur: { x: { to: lx(c), delay: d || 0, dur: 600, ease: 'inOut' }, y: { to: ly(l), delay: d || 0, dur: 600, ease: 'inOut' } } }; }
  function hiIns(l, c1, c2, d) { return { ins: { x: { to: (lx(c1) + lx(c2)) / 2, dur: 0 }, y: { to: ly(l), dur: 0 }, w: { to: (c2 - c1 + 1) * CW + 4, dur: 0 }, opacity: { from: 0, to: 0.6, delay: d || 400, dur: 300 } } }; }
  function hideIns() { return { ins: { opacity: { to: 0, dur: 200 } } }; }
  function k(t, n) { return { key: { text: t, opacity: { to: 1, dur: 150 } }, cnt: { num: { to: n, dur: 500 } } }; }
  var sceneGolf = {
    name: '64 键的解', desc: 'golf.vim 先把按键文件切成 token，<Esc> 和 <CR> 各算 1 键。再整串交给 :normal 回放。每组按键后的光标位置，来自本机 Vim 的记录。',
    code: { lang: 'text', title: 'golf.keys（一行，这里按组拆开）', src: 'j\nf(\na1, <Esc>\nf)\ni + 1<Esc>\n6G\nci"buzz<Esc>\nGoif __name__ == "__main__": main()<Esc>\nZZ' },
    dataTitle: '回放状态',
    data: { '光标': 'L1 C1', '本组键数': '无', '累计': 0 },
    bg: function (d) { d.rect(30, 45, 600, 400, { fill: C.bg2, stroke: C.line, rx: 10 }); for (var i = 1; i <= 13; i++) d.text(X0 - 14, ly(i), String(i), { anchor: 'end', size: 11.5, mono: true, color: C.fg3 }); d.text(720, 60, '当前这组按键', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 }); },
    objects: golfObjs,
    steps: [
      { say: 'j：下移到第 2 行（1 键）。从上往下改，省掉讲义里先 G 到底、再搜索回来的路。', hl: [1], data: { '光标': 'L2 C1', '本组键数': 1, '累计': 1 },
        set: merge(k('j', 1), mv(2, 1)), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'f(：在本行向右找 “(”（2 键），落在 C19。', hl: [2], data: { '光标': 'L2 C19', '本组键数': 2, '累计': 3 },
        set: merge(k('f(', 3), mv(2, 19)), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'a1, ⎋：在 “(” 后面追加 “1, ”，再按 Esc。共 5 键，光标停在 C22。', hl: [3], data: { '光标': 'L2 C22', '本组键数': 5, '累计': 8 },
        set: merge(k('a1, ⎋', 8), mv(2, 22, 300), hiIns(2, 20, 22), { L2: { text: { to: nb('    for i in range(1, limit):'), delay: 300 } } }), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'f)：跳到右括号（2 键，C28）。', hl: [4], data: { '光标': 'L2 C28', '本组键数': 2, '累计': 10 },
        set: merge(k('f)', 10), mv(2, 28), hideIns()), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'i + 1⎋：在 “)” 前插入 “ + 1”，共 6 键。这里用 f) 加 i，代替讲义的 e 加 a。按键数一样，但不依赖“下一个词”在哪。', hl: [5], data: { '光标': 'L2 C31', '本组键数': 6, '累计': 16 },
        set: merge(k('i + 1⎋', 16), mv(2, 31, 300), hiIns(2, 28, 31), { L2: { text: { to: nb('    for i in range(1, limit + 1):'), delay: 300 } } }), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: '6G：跳到第 6 行，2 键，比 :6⏎ 少 1 键。它同样落在第一个非空字符 C13。这一点很关键，下一步要靠它。', hl: [6], data: { '光标': 'L6 C13', '本组键数': 2, '累计': 18 },
        set: merge(k('6G', 18), mv(6, 13), hideIns()), fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'ci"buzz⎋：光标在引号之前。Vim 往后找到第一对引号 "fizz"，改成 buzz。共 8 键，停在 C23。', hl: [7], data: { '光标': 'L6 C23', '本组键数': 8, '累计': 26 },
        set: merge(k('ci"buzz⎋', 26), mv(6, 23, 400), hiIns(6, 20, 23, 500), { L6: { text: { to: nb('            print("buzz", end="")'), delay: 400 } }, gh: { text: 'fizz', x: { from: (lx(20) + lx(23)) / 2, to: (lx(20) + lx(23)) / 2, dur: 0 }, y: { from: ly(6), to: ly(6) - 36, delay: 200, dur: 700 }, w: { to: 4 * CW + 6, dur: 0 }, opacity: { from: 1, to: 0, delay: 400, dur: 500 } } }),
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }, { type: 'burst', x: (lx(20) + lx(23)) / 2, y: ly(6), at: 250, color: C.bad }] },
      { say: '最后才 G 到底、o 开新行，输入入口调用再按 Esc。这组 36 键，大头是 33 个字符省不掉。再用 ZZ 保存退出，2 键。', hl: [8, 9], data: { '光标': 'L13 C33', '本组键数': '36 + 2', '累计': 64 },
        set: merge(k('Go…⎋ ZZ', 64), mv(13, 33, 400), hiIns(13, 1, 33, 600), { L13: { text: { to: nb('if __name__ == "__main__": main()'), delay: 500 } } }),
        eq: [{ s: 'j 1 + f( 2 + a1,␣⎋ 5 + f) 2 + i␣+␣1⎋ 6', at: 300 }, { s: '+ 6G 2 + ci"buzz⎋ 8 + Go…⎋ 36 + ZZ 2', at: 700 }, { s: '= 64 键', at: 1100 }],
        fx: [{ type: 'pulse', obj: 'key', at: 50, color: C.warn }] },
      { say: 'check.sh 把结果和 end.py 逐字节比较：一致。讲义那套 70 键也通过。修好的程序真跑输出正确（本机实测 ex02-a）。', hl: [9],
        log: [{ s: '$ bash check.sh lecture.keys', cls: 'in' }, { s: 'PASS  70 keystrokes  (lecture.keys)', at: 300 }, { s: '$ bash check.sh golf.keys', at: 500, cls: 'in' }, { s: 'PASS  64 keystrokes  (golf.keys)', at: 800 }, { s: '1 2 fizz 4 buzz fizz 7 8 fizz buzz 11 fizz 13 14 fizzbuzz 16 17 fizz 19 buzz', at: 1200 }],
        eq: [{ s: '导航：讲义 G + /range⏎ + ww + e = 11 键。本解 j + f( + f) + G = 6 键，省 5', at: 900 }, { s: '跳行：:6⏎ 3 键 → 6G 2 键，省 1。合计 70 − 64 = 6', at: 1300 }],
        set: merge(hideIns(), { res: { text: 'PASS · 64 键', opacity: { to: 1, delay: 800, dur: 300 } } }), fx: [{ type: 'ripple', obj: 'res', at: 900, color: C.ok }] },
      { say: '易错点（ex02-b）：把 6G 换成 4j 也是 2 键。但 j 会保持列号，光标落在第 6 行的 C31。那里在 end= 后面那对空引号里。ci" 改的就是它，变成 end="buzz"，FAIL。', hl: [6, 7],
        log: [{ s: '$ bash check.sh wrong.keys', cls: 'in' }, { s: '-            print("buzz", end="")', at: 900, cls: 'err' }, { s: '+            print("fizz", end="buzz")', at: 1000 }, { s: 'FAIL  (wrong.keys)', at: 1300, cls: 'err' }],
        data: { '光标': 'L6 C31（4j 保持列号）' },
        set: merge(mv(6, 31, 300), { L6: { text: { to: nb('            print("fizz", end="buzz")'), delay: 900 } }, key: { text: '4j  ci"buzz⎋' }, res: { text: 'FAIL', stroke: { to: C.bad, delay: 1300, dur: 200 }, fill: { to: C.badW, delay: 1300, dur: 200 }, color: { to: C.bad, delay: 1300, dur: 200 } } }, hiIns(6, 32, 35, 1000)),
        fx: [{ type: 'shake', obj: 'res', at: 1400 }] }
    ]
  };

  /* ---------- 练习 4：Vim 怎么加载一个插件 ---------- */
  var scenePack = {
    name: '加载一个插件', desc: '插件就是一些脚本。它们放在约定的目录里，启动时会被执行。vimrc 把目录加进 packpath。Vim 在“加载插件”阶段，扫描 pack/*/start/*/plugin/。然后执行里面的 .vim 文件。',
    code: { lang: 'text', title: 'ex04-a（本机实测命令）', src: "vim -u NONE  -c 'Hello' …\nvim -u ex04/vimrc -c 'Hello MIT' -c 'redir! > loaded.txt | silent scriptnames | redir END' -c 'wq' notes.txt\ncat notes.txt\ngrep -o 'ex04/vimfiles/.*' loaded.txt" },
    dataTitle: 'Vim 启动过程',
    data: { 'vimrc': '无', 'packpath': '无', ':Hello': '无', 'notes.txt': 'notes' },
    bg: function (d) {
      d.text(430, 28, 'vim 启动：读 vimrc → 加载插件 → 执行 -c 命令', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(470, 80, 360, 260, { fill: 'none', stroke: C.teal, dash: '5 4', rx: 12 });
      d.text(480, 96, 'ex04/vimfiles（packpath 中的一个目录）', { size: 12, color: C.teal, weight: 700 });
      d.text(500, 140, 'pack/', { size: 14, mono: true, color: C.fg2 });
      d.text(530, 180, 'demo/start/', { size: 14, mono: true, color: C.fg2 });
      d.text(560, 220, 'hello/plugin/', { size: 14, mono: true, color: C.fg2 });
    },
    objects: {
      vim: box(160, 120, 200, 50, 'vim 进程', C.info, C.infoW),
      rc: box(160, 230, 200, 44, 'vimrc', C.neutral, C.bg, { size: 14, opacity: 0.4 }),
      pp: box(160, 320, 240, 40, 'packpath', C.teal, C.tealW, { size: 12, opacity: 0 }),
      plug: box(660, 270, 200, 40, 'hello.vim', C.ok, C.okW, { size: 14 }),
      cmd: box(160, 420, 200, 44, ':Hello', C.warn, C.warnW, { size: 15, opacity: 0 }),
      scan: { type: 'path', d: 'M280,320 C380,320 420,150 495,140 L530,180 L560,220 L640,262', stroke: C.teal, sw: 2.2, dash: 0, arrow: 'data' },
      file: box(660, 450, 200, 70, '', C.teal, C.bg, { size: 13 }),
      ft1: { type: 'text', x: 600, y: 440, anchor: 'start', mono: true, size: 14, text: 'notes', color: C.fg },
      ft2: { type: 'text', x: 600, y: 464, anchor: 'start', mono: true, size: 14, text: 'Hello, MIT!', color: C.ok, opacity: 0 },
      bad: { type: 'text', x: 160, y: 470, text: 'E492: 不是编辑器命令', size: 13, weight: 800, color: C.bad, opacity: 0 }
    },
    steps: [
      { say: '先不加载任何配置，用 -u NONE 运行 :Hello。Vim 根本不认识这个命令，返回码 1。-Es 静默模式不打印错误信息。E492 是这类错误的编号，这是补充。', hl: [1],
        log: ["$ vim -u NONE -i NONE -Es -c 'Hello' -c 'qa!' notes.txt; echo \"without plugin: exit=$?\"", { s: 'without plugin: exit=1', at: 1000 }], data: { ':Hello': { v: '未定义', at: 800 } },
        set: { cmd: { opacity: { to: 1, dur: 300 }, y: { from: 380, to: 420, dur: 500, ease: 'out' } }, bad: { opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'cmd', at: 700 }] },
      { say: '换成 -u ex04/vimrc：Vim 启动时先执行这个 vimrc。', hl: [2],
        data: { 'vimrc': { v: 'ex04/vimrc', at: 500 }, ':Hello': '无' },
        set: { cmd: { opacity: { to: 0, dur: 200 } }, bad: { opacity: { to: 0, dur: 200 } }, rc: { opacity: { to: 1, dur: 300 }, stroke: { to: C.info, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'rc', at: 300, color: C.info }] },
      { say: 'vimrc 第 3 行把 ex04/vimfiles 加到 packpath 最前面。意思是告诉 Vim，也去这里找包。', data: { 'packpath': { v: '<沙箱>/ex04/vimfiles,…', at: 500 } },
        set: { pp: { opacity: { to: 1, delay: 200, dur: 300 }, y: { from: 280, to: 320, delay: 200, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'pp', at: 600, color: C.teal }] },
      { say: '读完 vimrc，进入“加载插件”阶段。Vim 沿 packpath 找到 pack/demo/start/hello/plugin/hello.vim，并执行它。于是 :Hello 命令有了定义。', data: { ':Hello': { v: '已定义（hello.vim）', at: 1500 } },
        set: { scan: { dash: { to: 1, dur: 1000 } } },
        fx: [{ type: 'stream', path: 'scan', at: 300, n: 3, dur: 1000, color: C.teal, labels: ['pack/*/start/*'] }, { type: 'pulse', obj: 'plug', at: 1300, color: C.ok }] },
      { say: '然后才执行命令行上的 -c。:Hello MIT 在文件末尾追加一行。redir 把 :scriptnames 的结果存进文件，也就是加载过的脚本列表。最后 wq 保存退出，这些是本机实测。', hl: [2, 3, 4],
        log: [{ s: 'with plugin: exit=0', at: 400 }, { s: '$ cat notes.txt', at: 600, cls: 'in' }, { s: 'notes', at: 800 }, { s: 'Hello, MIT!', at: 900 }, { s: "$ grep -o 'ex04/vimfiles/.*' loaded.txt", at: 1100, cls: 'in' }, { s: 'ex04/vimfiles/pack/demo/start/hello/plugin/hello.vim', at: 1300 }],
        data: { 'notes.txt': { v: 'notes / Hello, MIT!', at: 900 } },
        set: { cmd: { text: ':Hello MIT', opacity: { to: 1, dur: 300 }, stroke: { to: C.ok, dur: 300 }, fill: { to: C.okW, dur: 300 } }, ft2: { opacity: { to: 1, delay: 800, dur: 300 }, x: { from: 640, to: 600, delay: 800, dur: 400, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'file', at: 900, color: C.ok }] },
      { say: '装插件，就是把这样一个目录放进 ~/.vim/pack/*/start/。通常是 git clone 进去。VS Code 的扩展同理，装在扩展目录里。由扩展主机进程加载，这一条是补充。',
        fx: [{ type: 'pulse', obj: 'plug', at: 200, color: C.ok }, { type: 'pulse', obj: 'pp', at: 500, color: C.teal }] }
    ]
  };

  VZ.register({ id: 'lab03-golf', title: '练习 2：VimGolf，逐组回放 64 键的解',
    sources: [{ t: 'VimGolf', u: 'https://www.vimgolf.com/' }, { t: '视频 24:13 FizzBuzz 演示', u: 'https://youtu.be/QnM1nVzrkx8?t=1453' }],
    note: '控制台是本机真跑，来自 ex02-a 和 ex02-b。光标落点来自本机 Vim 逐组回放的记录。文字变化的动画是示意。', scenes: [sceneGolf] });
  VZ.register({ id: 'lab03-pack', title: '练习 4：Vim 怎么加载一个插件',
    sources: [{ t: 'Vim 文档 · packages', u: 'https://vimhelp.org/repeat.txt.html#packages' }, { t: 'Vim 文档 · 启动顺序', u: 'https://vimhelp.org/starting.txt.html#initialization' }],
    note: '控制台是本机真跑，来自 ex04-a。目录扫描路径的动画是示意。packpath 里的 <沙箱>，指本次运行的临时目录。', scenes: [scenePack] });
})();
