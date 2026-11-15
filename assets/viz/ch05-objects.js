/* ch05 · Git 对象与内容寻址（挂在第 5 讲 §6）
 * 依据：Lecture 5 视频 15:28–23:35（object、SHA-1、对象库、指针即哈希）、43:15–45:00（git cat-file -t / -p）；
 *       讲义 version-control.md 的 Objects and content-addressing 一节（讲义里的 4448adbf… / 698281bc… / c68d233a… 三个哈希）。
 * 实测：全部哈希、cat-file 输出、对象个数都来自 labs/lab05 的 ex01-a / ex01-b / ex01-c（练习生成脚本 本机真跑，Git 2.55）；
 *       讲义给出的三个哈希与本机算出的完全相同。第二个提交的哈希 0c401d8 由笔记作者用相同的固定身份与时间在本机复现得到。
 *       “不带换行的同一句话”的哈希 10e1b4d8… 也是本机 git hash-object 实测。
 * 补充：SHA-1 的内部运算没法手推，eq 面板只推“喂给 SHA-1 的是哪些字节”以及哈希如何拆成路径。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }

  /* ---------- 场景 1：一个 blob 的诞生 ---------- */
  var H = '4448adbf7ecd394f42ae135bbeed9676e894af85';
  var sceneBlob = {
    name: 'blob 与 SHA-1', desc: '文件在 Git 里叫 blob。Git 给内容加一个小头，再对整串字节算 SHA-1。得到的 40 位十六进制，就是它的名字。内容决定名字，这叫内容寻址。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-a）", src: "echo \"git is wonderful\" > baz.txt\n# 要哈希的字节 = 头 \"blob 17\\0\" + 内容\ngit hash-object baz.txt\nprintf 'blob 17\\0git is wonderful\\n' | sha1sum\ngit hash-object -w baz.txt > /dev/null\nfind .git/objects -type f\ngit cat-file -t 4448adbf\ngit cat-file -p 4448adbf\nprintf 'git is wonderful' | git hash-object --stdin" },
    dataTitle: '这个对象',
    data: { '类型': '无', '长度': '无', 'ID（SHA-1）': '无', '存放路径': '无' },
    bg: function (d) {
      d.text(430, 26, '内容 → 加头 → SHA-1 → 40 位十六进制的“名字”', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(560, 330, 270, 170, { fill: C.bg2, stroke: C.teal, rx: 12, sw: 1.6 });
      d.text(695, 350, '.git/objects/（对象库）', { anchor: 'middle', size: 12, mono: true, weight: 700, color: C.teal });
    },
    objects: {
      file: { type: 'box', x: 150, y: 110, w: 230, h: 46, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.6, text: 'baz.txt', mono: true, size: 15, weight: 750, color: C.fg, opacity: 0 },
      body: { type: 'box', x: 470, y: 110, w: 250, h: 40, rx: 6, fill: C.dataW, stroke: C.data, sw: 1.4, text: 'git is wonderful\\n', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      head: { type: 'box', x: 300, y: 110, w: 96, h: 40, rx: 6, fill: C.warnW, stroke: C.warn, sw: 1.6, text: 'blob 17\\0', mono: true, size: 14, weight: 800, color: C.warn, opacity: 0 },
      sha: { type: 'box', x: 430, y: 230, w: 170, h: 54, rx: 12, fill: C.infoW, stroke: C.info, sw: 2, text: 'SHA-1', size: 17, weight: 800, color: C.info, opacity: 0 },
      feed: { type: 'path', d: 'M400,132 C420,170 430,180 430,200', stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      hash: { type: 'text', x: 430, y: 300, text: H, mono: true, size: 15, weight: 800, color: C.fg, opacity: 0 },
      dir: { type: 'box', x: 618, y: 400, w: 50, h: 34, rx: 6, fill: C.tealW, stroke: C.teal, sw: 1.4, text: '44/', mono: true, size: 14, weight: 800, color: C.teal, opacity: 0, trail: { n: 4, gap: 40 } },
      fn: { type: 'box', x: 740, y: 400, w: 150, h: 34, rx: 6, fill: C.bg, stroke: C.line, sw: 1.4, text: '48adbf7ecd…', mono: true, size: 13, weight: 700, color: C.fg, opacity: 0, trail: { n: 4, gap: 40 } },
      alt: { type: 'text', x: 430, y: 470, text: '', mono: true, size: 13, weight: 700, color: C.bad, opacity: 0 },
      altl: { type: 'text', x: 430, y: 446, text: '少一个换行（16 字节）：', size: 12, weight: 700, color: C.fg3, opacity: 0 }
    },
    steps: [
      { hl: [1], say: '先有一个文件 baz.txt，内容是 “git is wonderful” 加一个换行符。对 Git 来说，它只是一串字节。', data: { '类型': 'blob（文件）' },
        log: ['$ echo "git is wonderful" > baz.txt'],
        set: { file: { opacity: { to: 1, dur: 300 }, y: { from: 90, to: 110, dur: 500, ease: 'back' } }, body: { opacity: { to: 1, delay: 600, dur: 300 }, x: { from: 180, to: 470, delay: 600, dur: 700, ease: 'out' } } },
        eq: ['"git is wonderful" = 16 个字符', { s: '+ 换行符 \\n 1 字节 = 17 字节', at: 600 }] },
      { hl: [2], say: 'Git 在内容前面加一个头。头里依次是 blob、空格、长度 17 和一个 \\0 字节。', data: { '长度': { v: '17 字节', at: 600 } },
        set: { file: { opacity: { to: 0.35, dur: 300 } }, head: { opacity: { to: 1, dur: 250 }, x: { from: 120, to: 300, dur: 700, ease: 'out' } } },
        eq: { s: '要哈希的字节 = "blob 17" + \\0 + 内容（共 8 + 17 = 25 字节）', at: 500 },
        fx: [{ type: 'pulse', obj: 'head', at: 700, color: C.warn }] },
      { hl: [3], say: '整串字节送进 SHA-1，输出 160 位，写成 40 个十六进制字符。这就是这个对象的 ID。', data: { 'ID（SHA-1）': { v: '4448adbf…', at: 1300 } },
        log: [{ s: '$ git hash-object baz.txt', at: 200 }, { s: H, at: 1300 }],
        eq: [{ s: '160 位 ÷ 每个十六进制字符 4 位 = 40 个字符', at: 1300 }],
        set: { sha: { opacity: { to: 1, dur: 300 } }, feed: { dash: { to: 1, delay: 200, dur: 500 } }, hash: { opacity: { to: 1, delay: 1200, dur: 300 }, y: { from: 280, to: 300, delay: 1200, dur: 400, ease: 'back' } } },
        fx: [{ type: 'stream', path: 'feed', at: 300, n: 6, gap: 0.12, dur: 900, color: C.data, labels: ['b', 'l', 'o', 'b', ' ', '…'] }, { type: 'pulse', obj: 'sha', at: 1000, color: C.info }] },
      { hl: [4], say: '不用 Git，自己用 sha1sum 对“blob 17\\0 + 内容”算一遍。结果一字不差，这是本机实测。ID 只取决于内容本身。',
        log: [{ s: "$ printf 'blob 17\\0git is wonderful\\n' | sha1sum", at: 200 }, { s: H + ' *-', at: 800 }],
        fx: [{ type: 'flash', obj: 'sha', at: 300, color: C.ok }, { type: 'ripple', x: 430, y: 300, at: 900, color: C.ok }] },
      { hl: [5, 6], say: 'git hash-object -w 把它写进对象库。前 2 个十六进制字符当子目录名，剩下 38 个当文件名。', data: { '存放路径': { v: '.git/objects/44/48adbf…', at: 1300 } },
        log: [{ s: '$ git hash-object -w baz.txt > /dev/null', at: 100 }, { s: '$ find .git/objects -type f', at: 300 }, { s: '.git/objects/44/48adbf7ecd394f42ae135bbeed9676e894af85', at: 1300 }],
        eq: [{ s: '44 | 48adbf7ecd…e894af85', at: 400 }, { s: '目录 = 前 2 位，文件名 = 后 38 位', at: 900 }],
        set: { dir: { opacity: { to: 1, delay: 300, dur: 200 }, x: { from: 285, to: 618, delay: 300, dur: 900, ease: 'inOut' }, y: { from: 300, to: 400, delay: 300, dur: 900, ease: 'inOut' } },
          fn: { opacity: { to: 1, delay: 450, dur: 200 }, x: { from: 460, to: 740, delay: 450, dur: 900, ease: 'inOut' }, y: { from: 300, to: 400, delay: 450, dur: 900, ease: 'inOut' } } },
        fx: [{ type: 'ripple', x: 695, y: 400, at: 1400, color: C.teal }] },
      { hl: [7, 8], say: '取的时候按 ID 取：git cat-file -t 看类型，-p 打印内容。ID 只要写出足够唯一的前缀就行。',
        log: [{ s: '$ git cat-file -t 4448adbf', at: 200 }, { s: 'blob', at: 500 }, { s: '$ git cat-file -p 4448adbf', at: 800 }, { s: 'git is wonderful', at: 1100 }],
        fx: [{ type: 'pulse', obj: 'fn', at: 300, color: C.teal }, { type: 'pulse', obj: 'body', at: 1100, color: C.data }] },
      { hl: [3], say: '讲义里 baz.txt 的哈希也是 4448adbf…。同样的内容，在谁的电脑上都是同一个 ID。所以按 ID 交换对象很安全。',
        set: { file: { opacity: { to: 1, dur: 300 } } },
        fx: [{ type: 'burst', x: 430, y: 300, at: 300, color: C.ok }] },
      { hl: [9], say: '反过来，内容差一个字节，ID 就面目全非。去掉结尾的换行，哈希变成 10e1b4d8…（本机实测）。',
        log: [{ s: "$ printf 'git is wonderful' | git hash-object --stdin", at: 200 }, { s: '10e1b4d8cd5bc5e0d3f65d1634b8d8b3fd5b50f4', at: 900 }],
        set: { altl: { opacity: { to: 1, delay: 300, dur: 300 } }, alt: { text: '10e1b4d8cd5bc5e0d3f65d1634b8d8b3fd5b50f4', opacity: { to: 1, delay: 800, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'alt', at: 1000 }] }
    ]
  };

  /* ---------- 场景 2：tree、commit 与共享 ---------- */
  function obj(x, y, t, col, colW, extra) { return merge({ type: 'box', x: x, y: y, w: 168, h: 42, rx: 8, fill: colW, stroke: col, sw: 1.7, text: t, mono: true, size: 13, weight: 750, color: C.fg, opacity: 0 }, extra || {}); }
  function lbl(x, y, t) { return { type: 'text', x: x, y: y, text: t, mono: true, size: 11.5, weight: 650, color: C.fg3, opacity: 0 }; }
  function ln(x1, y1, x2, y2, col) { return { type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, stroke: col || C.fg3, sw: 1.8, dash: 0, arrow: 'fg3' }; }
  var sceneTree = {
    name: 'tree、commit 与共享', desc: '目录是 tree，提交是 commit，它们也都是对象。对象之间不互相“包含”，只记着对方的哈希。指针就是哈希。改一个文件，变化沿着指针一路往上传。没变的对象直接共享。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-b / ex01-c）", src: "mkdir foo && echo \"hello world\" > foo/bar.txt\necho \"git is wonderful\" > baz.txt\ngit add . && git commit -q -m \"initial commit\"\ngit cat-file -p HEAD\ngit cat-file -p HEAD^{tree}\ngit cat-file -s HEAD^{tree}; git cat-file -s HEAD:foo\ncat .git/HEAD .git/refs/heads/master\necho \"hello world!\" > foo/bar.txt\ngit commit -q -am \"exclaim\"\ngit cat-file -p HEAD^{tree}\nfind .git/objects -type f | wc -l\ngit cat-file -p HEAD | head -2" },
    dataTitle: '对象库',
    data: { '对象个数': 0, 'HEAD': '无', 'master': '无' },
    legend: [[C.info, 'commit'], [C.warn, 'tree（目录）'], [C.teal, 'blob（文件）'], [C.data, '引用（分支 / HEAD）']],
    bg: function (d) { d.text(430, 22, '左：第一次提交的对象    右：改了 foo/bar.txt 之后新增的对象', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: {
      c1: obj(200, 120, 'commit a925497', C.info, C.infoW), t1: obj(200, 225, 'tree 698281b', C.warn, C.warnW),
      baz: obj(110, 340, 'blob 4448adb', C.teal, C.tealW), f1: obj(300, 340, 'tree c68d233', C.warn, C.warnW), b1: obj(300, 450, 'blob 3b18e51', C.teal, C.tealW),
      lbaz: lbl(110, 372, 'baz.txt'), lf1: lbl(300, 372, 'foo/'), lb1: lbl(300, 482, 'bar.txt：hello world'),
      e1: ln(200, 142, 200, 202), e2: ln(176, 247, 128, 318), e3: ln(224, 247, 282, 318), e4: ln(300, 362, 300, 428),
      c2: obj(620, 120, 'commit 0c401d8', C.info, C.infoW), t2: obj(620, 225, 'tree 12330f8', C.warn, C.warnW),
      f2: obj(700, 340, 'tree 7113fad', C.warn, C.warnW), b2: obj(700, 450, 'blob a042389', C.teal, C.tealW),
      lf2: lbl(700, 372, 'foo/'), lb2: lbl(700, 482, 'bar.txt：hello world!'),
      g1: ln(620, 142, 620, 202), g2: ln(644, 247, 690, 318), g3: ln(700, 362, 700, 428), g4: ln(580, 247, 196, 336, C.ok), gp: ln(535, 120, 287, 120, C.info),
      master: { type: 'box', x: 200, y: 64, w: 90, h: 28, rx: 14, fill: C.data, stroke: C.data, sw: 1, text: 'master', mono: true, size: 12.5, weight: 800, color: '#fff', opacity: 0, trail: { n: 5, gap: 40 } },
      head: { type: 'box', x: 90, y: 64, w: 76, h: 28, rx: 14, fill: C.bg3, stroke: C.data, sw: 1.4, text: 'HEAD', mono: true, size: 12.5, weight: 800, color: C.data, opacity: 0, trail: { n: 5, gap: 40 } }
    },
    steps: [
      { hl: [1, 3], say: '在空仓库里放 baz.txt 和 foo/bar.txt，然后 add 再 commit。对象库里多了 5 个对象（本机实测）。2 个 blob、2 个 tree，外加 1 个 commit。', data: { '对象个数': { v: 5, at: 1600 } },
        log: ['$ git add . && git commit -q -m "initial commit"', { s: '$ find .git/objects -type f | wc -l', at: 1400 }, { s: '5', at: 1700 }],
        set: { baz: { opacity: { to: 1, dur: 250 } }, lbaz: { opacity: { to: 1, dur: 250 } }, b1: { opacity: { to: 1, delay: 150, dur: 250 } }, lb1: { opacity: { to: 1, delay: 150, dur: 250 } },
          f1: { opacity: { to: 1, delay: 450, dur: 250 } }, lf1: { opacity: { to: 1, delay: 450, dur: 250 } }, e4: { dash: { to: 1, delay: 550, dur: 300 } },
          t1: { opacity: { to: 1, delay: 800, dur: 250 } }, e2: { dash: { to: 1, delay: 900, dur: 300 } }, e3: { dash: { to: 1, delay: 900, dur: 300 } },
          c1: { opacity: { to: 1, delay: 1150, dur: 250 } }, e1: { dash: { to: 1, delay: 1250, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'c1', at: 1450, color: C.info }] },
      { hl: [4], say: 'git cat-file -p HEAD 打开提交。里面记着根 tree 的哈希、作者、提交者和说明。第一个提交没有 parent。',
        log: [{ s: '$ git cat-file -p HEAD', at: 100 }, { s: 'tree 698281bc680d1995c5f4caaf3359721a5a58d48d', at: 400 }, { s: 'author Ada Example <ada@example.com> 1768557600 +0000', at: 600 }, { s: 'committer Ada Example <ada@example.com> 1768557600 +0000', at: 700 }, { s: 'initial commit', at: 900 }],
        fx: [{ type: 'pulse', obj: 'c1', at: 200, color: C.info }, { type: 'stream', path: 'e1', at: 400, n: 1, dur: 600, color: C.info, labels: ['698281b'] }] },
      { hl: [5], say: '根 tree 每一行是权限、类型、哈希和名字。它把 baz.txt、foo 这些名字映射到哈希。讲义里这棵树的哈希 698281bc…，和本机完全相同。',
        log: [{ s: '$ git cat-file -p HEAD^{tree}', at: 100 }, { s: '100644 blob 4448adbf7ecd394f42ae135bbeed9676e894af85\tbaz.txt', at: 500 }, { s: '040000 tree c68d233a33c5c06e0340e4c224f0afca87c8ce87\tfoo', at: 700 }],
        fx: [{ type: 'stream', path: 'e2', at: 300, n: 1, dur: 600, color: C.warn, labels: ['4448adb'] }, { type: 'stream', path: 'e3', at: 500, n: 1, dur: 600, color: C.warn, labels: ['c68d233'] }] },
      { hl: [6], say: '对象的大小也能手推。tree 每一项是“模式 空格 名字 \\0”。后面再跟 20 字节的二进制哈希。',
        log: [{ s: '$ git cat-file -s HEAD^{tree}; git cat-file -s HEAD:foo', at: 100 }, { s: '65', at: 1500 }, { s: '35', at: 1600 }],
        eq: ['"100644 baz.txt\\0" = 6+1+7+1 = 15 字节，+20 = 35', { s: '"40000 foo\\0" = 5+1+3+1 = 10 字节，+20 = 30（模式在对象里写成 40000）', at: 500 }, { s: '根 tree = 35 + 30 = 65 √', at: 1000, cls: 'ok' }, { s: 'foo tree = "100644 bar.txt\\0"(15) + 20 = 35 √', at: 1400, cls: 'ok' }] },
      { hl: [7], say: '引用只是小文本文件。.git/HEAD 里写着 “ref: refs/heads/master”。master 文件里是那个提交的完整哈希。', data: { 'HEAD': { v: 'ref: refs/heads/master', at: 800 }, 'master': { v: 'a925497…', at: 900 } },
        log: [{ s: '$ cat .git/HEAD .git/refs/heads/master', at: 100 }, { s: 'ref: refs/heads/master', at: 500 }, { s: 'a9254971ec6ef8d6423964549097af7233cda0ac', at: 700 }],
        set: { master: { opacity: { to: 1, delay: 300, dur: 250 }, y: { from: 44, to: 64, delay: 300, dur: 400, ease: 'back' } }, head: { opacity: { to: 1, delay: 500, dur: 250 }, y: { from: 44, to: 64, delay: 500, dur: 400, ease: 'back' } } } },
      { hl: [8], say: '现在只改 foo/bar.txt：在 hello world 后面加一个感叹号，然后 commit -am。新内容 → 新 blob a042389。',
        log: ['$ echo "hello world!" > foo/bar.txt', '$ git commit -q -am "exclaim"'],
        set: { b2: { opacity: { to: 1, dur: 250 }, x: { from: 300, to: 700, dur: 900, ease: 'inOut' } }, lb2: { opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'b2', at: 950, color: C.teal }] },
      { hl: [9, 10], say: 'bar.txt 的哈希变了，记着它的 foo 树就得变，成了 7113fad。根 tree 跟着变成 12330f8，于是有了新 commit。变化沿着指针一路往上传。',
        log: [{ s: '$ git cat-file -p HEAD^{tree}', at: 1300 }, { s: '040000 tree 7113fad109900eab313dca244643d84e123d4301\tfoo', at: 1600 }],
        set: { f2: { opacity: { to: 1, delay: 200, dur: 250 } }, lf2: { opacity: { to: 1, delay: 200, dur: 250 } }, g3: { dash: { to: 1, delay: 300, dur: 300 } },
          t2: { opacity: { to: 1, delay: 700, dur: 250 } }, g2: { dash: { to: 1, delay: 800, dur: 300 } }, c2: { opacity: { to: 1, delay: 1200, dur: 250 } }, g1: { dash: { to: 1, delay: 1300, dur: 300 } } },
        fx: [{ type: 'stream', path: 'g3', at: 200, n: 1, dur: 500, color: C.teal }, { type: 'stream', path: 'g2', at: 700, n: 1, dur: 500, color: C.warn }, { type: 'stream', path: 'g1', at: 1200, n: 1, dur: 500, color: C.info }] },
      { hl: [11], say: 'baz.txt 没变，新的根 tree 直接指向原来的 blob 4448adb。只共享，不复制。所以对象数是 5 + 4 = 9，不是 10（本机实测）。', data: { '对象个数': { v: 9, at: 1200 } },
        log: [{ s: '100644 blob 4448adbf7ecd394f42ae135bbeed9676e894af85\tbaz.txt', at: 300 }, { s: '$ find .git/objects -type f | wc -l', at: 900 }, { s: '9', at: 1200 }],
        eq: ['新增：bar blob + foo tree + 根 tree + commit = 4', { s: '5 + 4 = 9（baz 的 blob 被两次提交共享）', at: 700, cls: 'ok' }],
        set: { g4: { dash: { to: 1, delay: 200, dur: 700 } } },
        fx: [{ type: 'pulse', obj: 'baz', at: 900, color: C.ok }] },
      { hl: [12], say: '新 commit 的 parent 指向旧 commit，历史就这样串起来。master 挪到新提交，HEAD 仍然指着 master。旧对象一个都没改。', data: { 'master': { v: '0c401d8…', at: 1100 } },
        log: [{ s: '$ git cat-file -p HEAD | head -2', at: 100 }, { s: 'tree 12330f8cfe317d61bbf9690538896975910e22f2', at: 400 }, { s: 'parent a9254971ec6ef8d6423964549097af7233cda0ac', at: 600 }],
        set: { gp: { dash: { to: 1, delay: 200, dur: 600 } }, master: { x: { to: 620, delay: 800, dur: 900, ease: 'inOut' } }, head: { x: { to: 510, delay: 950, dur: 900, ease: 'inOut' } } },
        fx: [{ type: 'ripple', obj: 'master', at: 1750, color: C.data }] }
    ]
  };

  VZ.register({
    id: 'ch05-objects', title: 'Git 对象：内容决定名字，指针就是哈希',
    sources: [
      { t: '视频 15:28 object 与 SHA-1', u: 'https://youtu.be/9K8lB61dl3Y?t=928' },
      { t: '视频 43:15 git cat-file', u: 'https://youtu.be/9K8lB61dl3Y?t=2595' },
      { t: '讲义 Objects and content-addressing', u: 'https://missing.csail.mit.edu/2026/version-control/#objects-and-content-addressing' },
      { t: 'Pro Git · Git Objects', u: 'https://git-scm.com/book/en/v2/Git-Internals-Git-Objects' }
    ],
    note: '哈希、对象个数和 cat-file 输出，都是本机 Git 2.55 真跑的。出处是练习页练习 1。对象框和箭头的布局是示意。',
    scenes: [sceneBlob, sceneTree]
  });
})();
