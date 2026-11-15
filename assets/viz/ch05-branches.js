/* ch05 · 暂存区、分支、合并与游离 HEAD（四个演示，分别挂在第 5 讲 §9、§11、§12、§15）
 * 依据：Lecture 5 视频 34:46–36:29（暂存区）、45:00–50:28（分支即指针、switch、提交时分支跟着走）、50:28–52:54（merge、branch -d）、
 *       54:09–55:50（reflog、垃圾回收）、57:45–59:59（checkout 旧提交、detached HEAD、孤儿提交）；讲义 version-control.md。
 * 实测：所有哈希、状态码与命令输出都来自 labs/lab05 的 ex01-d / ex01-e / ex01-f / ex08-a / ex08-b（练习生成脚本 本机真跑，
 *       固定了示例身份 Ada Example 与提交时间，所以哈希可复现）。视频里讲师用的也是 nato.txt（北约音标字母），内容按视频复述，哈希是本机的。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function node(x, y, hash, extra) { return merge({ type: 'box', x: x, y: y, w: 104, h: 40, rx: 20, fill: C.infoW, stroke: C.info, sw: 2, text: hash, mono: true, size: 13.5, weight: 800, color: C.fg, opacity: 0 }, extra || {}); }
  function msg(x, y, t) { return { type: 'text', x: x, y: y, text: t, size: 11.5, weight: 650, color: C.fg3, opacity: 0 }; }
  function ref(x, y, t, extra) { return merge({ type: 'box', x: x, y: y, w: 84, h: 26, rx: 13, fill: C.data, stroke: C.data, sw: 1, text: t, mono: true, size: 12, weight: 800, color: '#fff', opacity: 0, trail: { n: 5, gap: 40 } }, extra || {}); }
  function headBox(x, y) { return { type: 'box', x: x, y: y, w: 70, h: 26, rx: 13, fill: C.bg, stroke: C.warn, sw: 2, text: 'HEAD', mono: true, size: 12, weight: 800, color: C.warn, opacity: 0, trail: { n: 5, gap: 40 } }; }
  function edge(x1, y1, x2, y2, extra) { return merge({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, stroke: C.fg3, sw: 2, dash: 0, arrow: 'fg3' }, extra || {}); }
  function show(id, at) { var s = {}; s[id] = { opacity: { to: 1, delay: at || 0, dur: 300 }, s: { from: 0.7, to: 1, delay: at || 0, dur: 450, ease: 'back' } }; return s; }

  /* ---------- 演示 1：暂存区（三棵树） ---------- */
  var COLX = [150, 430, 710], CY = 250;
  var V = ['… foxtrot · golf', '… golf · hotel', '… hotel · india'];
  function card(x, t, col, colW) { return { type: 'box', x: x, y: CY, w: 200, h: 70, rx: 10, fill: colW, stroke: col, sw: 1.8, text: t, mono: true, size: 13.5, weight: 750, color: C.fg, opacity: 0, trail: { n: 4, gap: 40 } }; }
  var sceneStage = {
    name: '三棵树', desc: 'Git 里同一个文件可能同时有三个版本。工作区里是你正在改的。暂存区（index）里是准备进下次提交的。HEAD 里是上一次提交的。git status 的两列字母，比较的就是它们。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-d）", src: "echo hotel >> nato.txt\ngit add nato.txt\necho india >> nato.txt\ngit diff --stat; git diff --staged --stat\ngit commit -q -m \"add hotel\"\ngit restore nato.txt\ngit status --short" },
    dataTitle: 'git status --short（本机实测）',
    data: { '状态码': '（干净）', '左列': '暂存区 vs HEAD', '右列': '工作区 vs 暂存区' },
    legend: [[C.teal, '工作区里的版本'], [C.warn, '暂存区里的版本'], [C.info, '已提交（HEAD）的版本']],
    bg: function (d) {
      d.text(430, 26, 'nato.txt 的三个“副本”', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [['工作区', '你正在编辑的文件'], ['暂存区（index）', '下一次提交的草稿'], ['HEAD', '最近一次提交']].forEach(function (c, k) {
        d.rect(COLX[k] - 120, 100, 240, 300, { fill: C.bg2, stroke: C.line, rx: 12 });
        d.text(COLX[k], 122, c[0], { anchor: 'middle', size: 14, weight: 800, color: C.fg });
        d.text(COLX[k], 144, c[1], { anchor: 'middle', size: 11.5, color: C.fg3 });
      });
      d.text(290, 420, 'git add →', { anchor: 'middle', size: 12.5, mono: true, weight: 700, color: C.warn });
      d.text(570, 420, 'git commit →', { anchor: 'middle', size: 12.5, mono: true, weight: 700, color: C.info });
      d.text(290, 444, '← git restore', { anchor: 'middle', size: 12.5, mono: true, weight: 700, color: C.teal });
    },
    objects: {
      w0: card(COLX[0], V[0], C.teal, C.tealW), i0: card(COLX[1], V[0], C.warn, C.warnW), h0: card(COLX[2], V[0], C.info, C.infoW),
      i1: card(COLX[0], V[1], C.warn, C.warnW), h1: card(COLX[1], V[1], C.info, C.infoW), w1: card(COLX[1], V[1], C.teal, C.tealW),
      code: { type: 'box', x: 430, y: 500, w: 160, h: 50, rx: 10, fill: '#0f1318', stroke: '#2b3440', sw: 1.4, text: '（空）', mono: true, size: 22, weight: 800, color: '#9be09b' },
      wpath: { type: 'path', d: 'M250,250 L330,250', stroke: C.warn, sw: 2, dash: 0, arrow: 'warn' },
      cpath: { type: 'path', d: 'M530,250 L610,250', stroke: C.info, sw: 2, dash: 0, arrow: 'info' }
    },
    steps: [
      { hl: [7], say: '刚提交完，三个位置里的 nato.txt 一模一样（bravo … golf）。git status 什么都不显示。',
        set: merge(show('w0'), show('i0', 150), show('h0', 300)) },
      { hl: [1, 7], say: '在工作区里追加一行 hotel。工作区和暂存区不一样了，右列出现 M（modified）。意思是改了，但还没 add。',
        data: { '状态码': { v: '" M"', at: 600 } }, log: ['$ echo hotel >> nato.txt', '$ git status --short', { s: ' M nato.txt', at: 600 }],
        set: { w0: { text: V[1] }, code: { text: { to: ' M', delay: 600 } } },
        fx: [{ type: 'flash', obj: 'w0', at: 100, color: C.teal }, { type: 'pulse', obj: 'code', at: 600, color: C.warn }] },
      { hl: [2, 7], say: 'git add 把工作区的这个版本复制进暂存区。现在是左列的 M，暂存区和 HEAD 不同了。这些改动会进入下一次提交。',
        data: { '状态码': { v: '"M "', at: 1000 } }, log: ['$ git add nato.txt', '$ git status --short', { s: 'M  nato.txt', at: 1000 }],
        eq: ['两列字母：左 = 暂存区 vs HEAD，右 = 工作区 vs 暂存区', { s: '"M " = 已暂存、工作区与暂存区一致', at: 800 }],
        set: { wpath: { dash: { to: 1, dur: 300 } }, i1: { opacity: { to: 1, dur: 200 }, x: { to: COLX[1], dur: 800, ease: 'inOut' } }, i0: { opacity: { to: 0, delay: 700, dur: 200 } }, code: { text: { to: 'M ', delay: 1000 } } },
        fx: [{ type: 'stream', path: 'wpath', at: 100, n: 2, dur: 700, color: C.warn, labels: ['hotel'] }, { type: 'ripple', obj: 'i1', at: 850, color: C.warn }] },
      { hl: [3, 4], say: '暂存之后，又在工作区加了一行 india，两列都是 M。git diff 比较工作区和暂存区，只看到 india。git diff --staged 比较暂存区和 HEAD，只看到 hotel。',
        data: { '状态码': { v: '"MM"', at: 600 } },
        log: ['$ echo india >> nato.txt', '$ git status --short', { s: 'MM nato.txt', at: 600 }, { s: '$ git diff --stat; git diff --staged --stat', at: 900 }, { s: ' nato.txt | 1 +', at: 1100 }, { s: ' nato.txt | 1 +', at: 1200 }],
        set: { wpath: { dash: { to: 0, dur: 300 } }, w0: { text: V[2] }, code: { text: { to: 'MM', delay: 600 } } },
        fx: [{ type: 'flash', obj: 'w0', at: 100, color: C.teal }] },
      { hl: [5, 7], say: 'git commit 提交的是暂存区里那一份，只有 hotel。之后状态回到 " M"。india 还躺在工作区里，没有被提交。',
        data: { '状态码': { v: '" M"', at: 1100 } }, log: ['$ git commit -q -m "add hotel"', '$ git status --short', { s: ' M nato.txt', at: 1100 }],
        set: { cpath: { dash: { to: 1, dur: 300 } }, h1: { opacity: { to: 1, dur: 200 }, x: { to: COLX[2], dur: 800, ease: 'inOut' } }, h0: { opacity: { to: 0, delay: 700, dur: 200 } }, code: { text: { to: ' M', delay: 1100 } } },
        fx: [{ type: 'stream', path: 'cpath', at: 100, n: 2, dur: 700, color: C.info, labels: ['hotel'] }, { type: 'ripple', obj: 'h1', at: 850, color: C.info }] },
      { hl: [6], say: 'git restore nato.txt 用暂存区的版本覆盖工作区。还没 add 的 india 就丢掉了。三份重新一致，文件末尾是 golf、hotel。',
        data: { '状态码': { v: '（干净）', at: 1100 } }, log: ['$ git restore nato.txt', '$ git status --short; tail -2 nato.txt', { s: 'golf', at: 1100 }, { s: 'hotel', at: 1200 }],
        set: { cpath: { dash: { to: 0, dur: 300 } }, w1: { opacity: { to: 1, dur: 200 }, x: { to: COLX[0], dur: 800, ease: 'inOut' } }, w0: { opacity: { to: 0, delay: 700, dur: 200 } }, code: { text: { to: '（空）', delay: 1100 } } },
        fx: [{ type: 'ripple', obj: 'w1', at: 850, color: C.teal }] },
      { hl: [2], say: '为什么要多这一层？讲义的例子是这样的。你同时改了两个功能，还加了一堆调试 print。暂存区让你只挑出 bugfix 先提交。也能把两个功能拆成两次干净的提交（视频 35:21）。',
        fx: [{ type: 'pulse', obj: 'i1', at: 300, color: C.warn }] }
    ]
  };

  /* ---------- 演示 2：分支只是指针 ---------- */
  var A = [150, 300], B = [400, 190], M2 = [400, 410];
  var sceneBranch = {
    name: '分支只是指针', desc: '分支不是“一串提交”，只是一个指向某个提交的名字。HEAD 记着你现在在哪个分支上。提交时，HEAD 所在的分支跟着挪到新提交。其他分支原地不动。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-e）", src: "git log --oneline\ngit branch anish\ngit switch anish\necho hotel >> nato.txt && git commit -q -am \"add hotel\"\ngit switch master\nsed -i '1i alpha' nato.txt && git commit -q -am \"add alpha\"\ngit log --all --graph --oneline" },
    dataTitle: '引用（本机实测）',
    data: { 'HEAD': 'master', 'master': '6f7b00b', 'anish': '无' },
    legend: [[C.info, '提交（不可变）'], [C.data, '分支（可移动的名字）'], [C.warn, 'HEAD']],
    bg: function (d) { d.text(430, 26, '提交组成的图不变，只有名字在动', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: {
      nA: node(A[0], A[1], '6f7b00b'), mA: msg(A[0], A[1] + 36, 'initial commit'),
      nB: node(B[0], B[1], 'c560925'), mB: msg(B[0], B[1] + 36, 'add hotel'), eB: edge(B[0] - 52, B[1] + 10, A[0] + 50, A[1] - 10),
      nC: node(M2[0], M2[1], '352b132'), mC: msg(M2[0], M2[1] + 36, 'add alpha'), eC: edge(M2[0] - 52, M2[1] - 10, A[0] + 50, A[1] + 10),
      master: ref(A[0], A[1] - 44, 'master'), anish: ref(A[0], A[1] - 74, 'anish', { fill: C.teal, stroke: C.teal }), head: headBox(A[0] - 96, A[1] - 44),
      wd: { type: 'box', x: 690, y: 300, w: 220, h: 110, rx: 10, fill: C.bg2, stroke: C.teal, sw: 1.6, text: 'bravo … golf', mono: true, size: 13.5, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { hl: [1], say: 'nato.txt 写好 bravo 到 golf，提交一次，得到提交 6f7b00b。master 指向它，HEAD 指向 master。所以 git status 说 “On branch master”。',
        log: ['$ git log --oneline', { s: '6f7b00b initial commit', at: 500 }],
        set: merge(show('nA'), { mA: { opacity: { to: 1, delay: 200, dur: 300 } } }, show('master', 400), show('head', 600), { wd: { opacity: { to: 1, delay: 800, dur: 300 } } }) },
      { hl: [2], say: 'git branch anish 只是新建了一个名字，指向同一个提交。没有复制任何文件，也没有新提交。', data: { 'anish': { v: '6f7b00b', at: 500 } },
        log: ['$ git branch anish'], eq: ['分支 = 名字 → 提交哈希（.git/refs/heads/anish 里就一行哈希）'],
        set: show('anish', 200), fx: [{ type: 'ripple', obj: 'anish', at: 500, color: C.teal }] },
      { hl: [3], say: 'git switch anish 移动的是 HEAD，它现在指向 anish。提交图一点没变。', data: { 'HEAD': { v: 'anish', at: 700 } },
        log: ['$ git switch anish', { s: "Switched to branch 'anish'", at: 700 }],
        set: { head: { y: { to: A[1] - 74, dur: 700, ease: 'inOut' } } }, fx: [{ type: 'pulse', obj: 'head', at: 700, color: C.warn }] },
      { hl: [4], say: '追加 hotel 并提交。新提交 c560925 的 parent 指向 6f7b00b。HEAD 所在的 anish 跟着挪过去，master 留在原地（视频 48:47）。', data: { 'anish': { v: 'c560925', at: 1100 } },
        log: ['$ echo hotel >> nato.txt && git commit -q -am "add hotel"'],
        set: merge(show('nB', 200), { mB: { opacity: { to: 1, delay: 400, dur: 300 } }, eB: { dash: { to: 1, delay: 500, dur: 500 } },
          anish: { x: { to: B[0], delay: 900, dur: 800, ease: 'inOut' }, y: { to: B[1] - 44, delay: 900, dur: 800, ease: 'inOut' } }, head: { x: { to: B[0] - 96, delay: 1000, dur: 800, ease: 'inOut' }, y: { to: B[1] - 44, delay: 1000, dur: 800, ease: 'inOut' } },
          wd: { text: { to: 'bravo … golf · hotel', delay: 200 } } }),
        fx: [{ type: 'stream', path: 'eB', at: 600, n: 1, dur: 600, color: C.info, labels: ['parent'] }] },
      { hl: [5], say: 'git switch master 让 HEAD 回到 master。工作区的文件也换成了 master 那个提交的内容。hotel 不见了（视频 49:20）。', data: { 'HEAD': { v: 'master', at: 800 } },
        log: ['$ git switch master', { s: "Switched to branch 'master'", at: 800 }],
        set: { head: { x: { to: A[0] - 96, dur: 800, ease: 'inOut' }, y: { to: A[1] - 44, dur: 800, ease: 'inOut' } }, wd: { text: { to: 'bravo … golf', delay: 800 } } },
        fx: [{ type: 'flash', obj: 'wd', at: 800, color: C.teal }] },
      { hl: [6, 7], say: '在 master 上，往开头加 alpha 并提交。新提交 352b132 同样以 6f7b00b 为父，master 挪过去。现在历史分叉了，两个提交谁也不是谁的祖先。', data: { 'master': { v: '352b132', at: 1100 } },
        log: ["$ sed -i '1i alpha' nato.txt && git commit -q -am \"add alpha\"", { s: '$ git log --all --graph --oneline', at: 1400 }, { s: '* c560925 add hotel', at: 1600 }, { s: '| * 352b132 add alpha', at: 1700 }, { s: '|/  ', at: 1750 }, { s: '* 6f7b00b initial commit', at: 1800 }],
        set: merge(show('nC', 200), { mC: { opacity: { to: 1, delay: 400, dur: 300 } }, eC: { dash: { to: 1, delay: 500, dur: 500 } },
          master: { x: { to: M2[0], delay: 900, dur: 800, ease: 'inOut' }, y: { to: M2[1] - 44, delay: 900, dur: 800, ease: 'inOut' } }, head: { x: { to: M2[0] - 96, delay: 1000, dur: 800, ease: 'inOut' }, y: { to: M2[1] - 44, delay: 1000, dur: 800, ease: 'inOut' } },
          wd: { text: { to: 'alpha · bravo … golf', delay: 200 } } }),
        fx: [{ type: 'stream', path: 'eC', at: 600, n: 1, dur: 600, color: C.info, labels: ['parent'] }] },
      { hl: [7], say: '要点有两个。不加 --all 时，git log 只显示从当前分支能走到的历史。分支名只负责记住一个位置。祖先关系全由提交里的 parent 指针决定（视频 47:14）。',
        fx: [{ type: 'pulse', obj: 'nA', at: 300, color: C.info }] }
    ]
  };

  /* ---------- 演示 3：合并（两个场景） ---------- */
  var MM = [660, 300];
  var sceneMerge = {
    name: '三方合并', desc: 'git merge anish 先找到两条分支的共同祖先，叫 merge base。再分别看两边相对它改了什么。两边改的是文件的不同位置，就自动合在一起。结果是一个有两个 parent 的合并提交。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-e）", src: "git merge --no-edit anish\ngit log --graph --oneline\ngit cat-file -p HEAD | head -4\ngit branch -d anish" },
    dataTitle: '合并（本机实测）',
    data: { 'merge base': '无', 'master 改了': '无', 'anish 改了': '无', '结果': '无' },
    legend: [[C.info, '提交'], [C.data, '分支'], [C.warn, 'HEAD'], [C.ok, '合并提交']],
    bg: function (d) { d.text(430, 26, '合并 = 新建一个有两个 parent 的提交', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: {
      nA: node(A[0], A[1], '6f7b00b', { opacity: 1 }), mA: msg(A[0], A[1] + 36, 'initial commit'),
      nB: node(B[0], B[1], 'c560925', { opacity: 1 }), mB: msg(B[0], B[1] + 36, 'add hotel'), eB: edge(B[0] - 52, B[1] + 10, A[0] + 50, A[1] - 10, { dash: 1 }),
      nC: node(M2[0], M2[1], '352b132', { opacity: 1 }), mC: msg(M2[0], M2[1] + 36, 'add alpha'), eC: edge(M2[0] - 52, M2[1] - 10, A[0] + 50, A[1] + 10, { dash: 1 }),
      nM: node(MM[0], MM[1], '30baa2b', { fill: C.okW, stroke: C.ok }), mM: msg(MM[0], MM[1] + 36, "Merge branch 'anish'"),
      p1: edge(MM[0] - 52, MM[1] - 10, B[0] + 52, B[1] + 10), p2: edge(MM[0] - 52, MM[1] + 10, M2[0] + 52, M2[1] - 10),
      anish: ref(B[0], B[1] - 44, 'anish', { fill: C.teal, stroke: C.teal, opacity: 1 }), master: ref(M2[0], M2[1] - 44, 'master', { opacity: 1 }), head: merge(headBox(M2[0] - 96, M2[1] - 44), { opacity: 1 }),
      base: { type: 'box', x: A[0], y: A[1], w: 124, h: 56, rx: 24, fill: 'none', stroke: C.warn, sw: 2.4, dasharray: '6 4', opacity: 0 },
      diff: { type: 'box', x: 690, y: 470, w: 300, h: 70, rx: 10, fill: C.bg2, stroke: C.line, sw: 1.4, text: 'alpha + (bravo…golf) + hotel', mono: true, size: 13, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { hl: [1], say: '接着上一个演示：master 在 352b132，anish 在 c560925，HEAD 在 master 上。现在执行 git merge anish。',
        log: ['$ git merge --no-edit anish'], fx: [{ type: 'pulse', obj: 'head', at: 300, color: C.warn }] },
      { hl: [1], say: '第一步，沿着 parent 指针往回找。两条分支的最近共同祖先是 6f7b00b，这叫 merge base。', data: { 'merge base': { v: '6f7b00b', at: 900 } },
        set: { base: { opacity: { to: 1, delay: 700, dur: 300 }, s: { from: 1.4, to: 1, delay: 700, dur: 500, ease: 'back' } } },
        fx: [{ type: 'stream', path: 'eB', at: 100, n: 1, dur: 600, color: C.warn }, { type: 'stream', path: 'eC', at: 100, n: 1, dur: 600, color: C.warn }] },
      { hl: [1], say: '第二步，分别和 merge base 比较。master 在第 1 行前加了 alpha，anish 在末尾加了 hotel。两处改动不重叠。', data: { 'master 改了': { v: '开头 +alpha', at: 300 }, 'anish 改了': { v: '末尾 +hotel', at: 700 } },
        eq: ['base：bravo … golf', { s: 'ours（master）：+alpha 在第 1 行前', at: 300 }, { s: 'theirs（anish）：+hotel 在最后一行后', at: 700 }, { s: '改动区域不重叠 → 两边都保留', at: 1100, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'nC', at: 300, color: C.data }, { type: 'pulse', obj: 'nB', at: 700, color: C.teal }] },
      { hl: [1, 2], say: 'Git 生成合并提交 30baa2b。它的快照里同时有 alpha 和 hotel，它有两个 parent。HEAD 所在的 master 挪到合并提交上（视频 51:10）。', data: { '结果': { v: 'alpha … golf hotel', at: 1300 } },
        log: [{ s: 'Auto-merging nato.txt', at: 300 }, { s: "Merge made by the 'ort' strategy.", at: 500 }, { s: ' nato.txt | 1 +', at: 700 }],
        set: merge(show('nM', 200), { mM: { opacity: { to: 1, delay: 400, dur: 300 } }, p1: { dash: { to: 1, delay: 500, dur: 500 } }, p2: { dash: { to: 1, delay: 650, dur: 500 } },
          master: { x: { to: MM[0], delay: 1000, dur: 800, ease: 'inOut' }, y: { to: MM[1] - 44, delay: 1000, dur: 800, ease: 'inOut' } }, head: { x: { to: MM[0] - 96, delay: 1100, dur: 800, ease: 'inOut' }, y: { to: MM[1] - 44, delay: 1100, dur: 800, ease: 'inOut' } },
          diff: { opacity: { to: 1, delay: 1200, dur: 300 } }, base: { opacity: { to: 0, dur: 300 } } }),
        fx: [{ type: 'burst', obj: 'nM', at: 500, color: C.ok }] },
      { hl: [3], say: 'git cat-file -p HEAD：合并提交里真的有两行 parent（本机实测）。',
        log: [{ s: '$ git cat-file -p HEAD | head -4', at: 100 }, { s: 'tree b6fe6fe890c2f61255f8c330c28aa2dfd93c302e', at: 400 }, { s: 'parent 352b132d8e0501612e1848b6836d29f15d3b341f', at: 600 }, { s: 'parent c560925a653e009456e6427c402986e7ef0b1998', at: 800 }],
        fx: [{ type: 'stream', path: 'p2', at: 500, n: 1, dur: 600, color: C.info, labels: ['parent 1'] }, { type: 'stream', path: 'p1', at: 700, n: 1, dur: 600, color: C.info, labels: ['parent 2'] }] },
      { hl: [4], say: 'anish 的工作都能从 master 走到了。这个名字可以删：git branch -d anish。提交还在，图一点没变。删掉的只是名字（视频 52:19）。', data: { '结果': 'master 包含全部历史' },
        log: ['$ git branch -d anish', { s: 'Deleted branch anish (was c560925).', at: 500 }],
        set: { anish: { opacity: { to: 0, delay: 300, dur: 400 }, s: { to: 0.6, delay: 300, dur: 400 } } },
        fx: [{ type: 'burst', obj: 'anish', at: 300, color: C.teal }] }
    ]
  };

  var RX0 = 130;
  var sceneConflict = {
    name: '合并冲突', desc: '讲义练习 8，两个分支改了同一行。salty 把糖改成盐，sweet 把糖改成两杯。Git 没法替你决定，于是停下来。冲突处用 <<<<<<< 这类标记圈出来，等你解决。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex08-a / b / c）", src: "git branch salty && git branch sweet\ngit switch -q salty && sed -i 's/1 cup sugar/1 cup salt/' recipe.txt && git commit -q -am \"salty\"\ngit switch -q sweet && sed -i 's/1 cup sugar/2 cups sugar/' recipe.txt && git commit -q -am \"sweet\"\ngit switch -q master\ngit merge salty\ngit merge sweet\ncat recipe.txt\ngit commit -q -m \"try to commit\"\ncp ../ex08/recipe_resolved.txt recipe.txt\ngit add recipe.txt\ngit commit -q --no-edit\ngit log --graph --oneline" },
    dataTitle: '合并状态（本机实测）',
    data: { '分支': 'master', '冲突文件': '无', 'MERGE_HEAD': '无' },
    legend: [[C.info, '提交'], [C.warn, 'HEAD 一侧（ours）'], [C.teal, '被合并一侧（theirs）'], [C.bad, '冲突']],
    bg: function (d) {
      d.text(430, 26, '同一行被两边改了 → 冲突', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(480, 80, 360, 300, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.text(660, 100, 'recipe.txt（工作区）', { anchor: 'middle', size: 12.5, mono: true, weight: 700, color: C.fg3 });
    },
    objects: {
      n0: node(RX0, 300, '17dd24a'), m0: msg(RX0, 336, 'base recipe'),
      n1: node(300, 200, '3f5228a'), m1: msg(300, 236, 'salty'), e1: edge(248, 210, RX0 + 50, 290),
      n2: node(300, 420, '25b74f8'), m2: msg(300, 456, 'sweet'), e2: edge(248, 410, RX0 + 50, 310),
      nM: node(300, 520, '7cba7ea', { fill: C.okW, stroke: C.ok }), eM1: edge(300, 500, 300, 442), eM2: { type: 'path', d: 'M250,514 C170,480 170,260 248,212', stroke: C.fg3, sw: 2, dash: 0, arrow: 'fg3' },
      salty: ref(300, 160, 'salty', { fill: C.warn, stroke: C.warn }), sweet: ref(300, 380, 'sweet', { fill: C.teal, stroke: C.teal }), master: ref(RX0, 256, 'master'),
      l0: { type: 'text', x: 500, y: 130, anchor: 'start', text: 'Pancakes', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      l1: { type: 'text', x: 500, y: 158, anchor: 'start', text: '2 cups flour', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      l2: { type: 'text', x: 500, y: 186, anchor: 'start', text: '1 cup sugar', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      m3: { type: 'text', x: 500, y: 214, anchor: 'start', text: '<<<<<<< HEAD', mono: true, size: 14, weight: 800, color: C.warn, opacity: 0 },
      m4: { type: 'text', x: 500, y: 242, anchor: 'start', text: '1 cup salt', mono: true, size: 14, weight: 700, color: C.warn, opacity: 0 },
      m5: { type: 'text', x: 500, y: 270, anchor: 'start', text: '=======', mono: true, size: 14, weight: 800, color: C.fg3, opacity: 0 },
      m6: { type: 'text', x: 500, y: 298, anchor: 'start', text: '2 cups sugar', mono: true, size: 14, weight: 700, color: C.teal, opacity: 0 },
      m7: { type: 'text', x: 500, y: 326, anchor: 'start', text: '>>>>>>> sweet', mono: true, size: 14, weight: 800, color: C.teal, opacity: 0 },
      l8: { type: 'text', x: 500, y: 354, anchor: 'start', text: '2 eggs · 1 cup milk', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      zone: { type: 'box', anchor: 'tl', x: 490, y: 200, w: 340, h: 140, rx: 8, fill: C.badW, stroke: C.bad, sw: 1.4, opacity: 0 }
    },
    steps: [
      { hl: [1, 3], say: 'master 上提交基础菜谱，再建两个分支 salty 和 sweet。两边各自改 “1 cup sugar” 这一行，改法不同。然后各提交一次。',
        log: ['$ git branch salty && git branch sweet', "$ git switch -q salty && sed -i 's/1 cup sugar/1 cup salt/' recipe.txt && git commit -q -am \"salty\"", "$ git switch -q sweet && sed -i 's/1 cup sugar/2 cups sugar/' recipe.txt && git commit -q -am \"sweet\""],
        set: merge(show('n0'), { m0: { opacity: { to: 1, dur: 300 } } }, show('master', 200), show('n1', 600), { m1: { opacity: { to: 1, delay: 600, dur: 300 } }, e1: { dash: { to: 1, delay: 700, dur: 400 } } }, show('salty', 900), show('n2', 1100), { m2: { opacity: { to: 1, delay: 1100, dur: 300 } }, e2: { dash: { to: 1, delay: 1200, dur: 400 } } }, show('sweet', 1400),
          { l0: { opacity: { to: 1, delay: 200, dur: 300 } }, l1: { opacity: { to: 1, delay: 250, dur: 300 } }, l2: { opacity: { to: 1, delay: 300, dur: 300 } }, l8: { opacity: { to: 1, delay: 350, dur: 300 } } }) },
      { hl: [4, 5], say: '回到 master，git merge salty。master 自己没有新提交，salty 就在它正前方。Git 直接把 master 往前挪，这叫 fast-forward，不需要合并提交。',
        log: ['$ git switch -q master', '$ git merge salty', { s: 'Updating 17dd24a..3f5228a', at: 500 }, { s: 'Fast-forward', at: 700 }, { s: ' recipe.txt | 2 +-', at: 800 }],
        set: { master: { x: { to: 210, delay: 400, dur: 800, ease: 'inOut' }, y: { to: 160, delay: 400, dur: 800, ease: 'inOut' } }, salty: { x: { to: 390, delay: 400, dur: 600 } }, l2: { text: { to: '1 cup salt', delay: 1000 } } },
        fx: [{ type: 'stream', path: 'e1', at: 300, n: 1, dur: 700, color: C.data, labels: ['ff'] }] },
      { hl: [6], say: '再 git merge sweet。merge base 是 17dd24a，两边都改了同一行，而且改法不同。Git 放弃自动合并，报 CONFLICT。', data: { '冲突文件': { v: 'recipe.txt（UU）', at: 1200 }, 'MERGE_HEAD': { v: '25b74f8（sweet）', at: 1200 } },
        log: ['$ git merge sweet', { s: 'Auto-merging recipe.txt', at: 400 }, { s: 'CONFLICT (content): Merge conflict in recipe.txt', at: 800, cls: 'err' }, { s: 'Automatic merge failed; fix conflicts and then commit the result.', at: 1000, cls: 'err' }, { s: '$ git status --short', at: 1200 }, { s: 'UU recipe.txt', at: 1400 }],
        eq: ['base："1 cup sugar"', { s: 'ours（HEAD = salty 内容）："1 cup salt"', at: 400 }, { s: 'theirs（sweet）："2 cups sugar"', at: 800 }, { s: '同一行、不同改法 → 冲突', at: 1100, cls: 'bad' }],
        fx: [{ type: 'shake', obj: 'n2', at: 900 }, { type: 'flash', obj: 'l2', at: 1000, color: C.bad }] },
      { hl: [7], say: '打开 recipe.txt 看本机实测的内容。<<<<<<< HEAD 下面是当前分支的版本。>>>>>>> sweet 上面是合并进来的版本。两段中间用 ======= 隔开。',
        set: { l2: { opacity: { to: 0, dur: 300 } }, zone: { opacity: { to: 0.6, delay: 200, dur: 300 } }, m3: { opacity: { to: 1, delay: 300, dur: 250 } }, m4: { opacity: { to: 1, delay: 450, dur: 250 } }, m5: { opacity: { to: 1, delay: 600, dur: 250 } }, m6: { opacity: { to: 1, delay: 750, dur: 250 } }, m7: { opacity: { to: 1, delay: 900, dur: 250 } }, l8: { y: { to: 360, dur: 400 } } },
        log: [{ s: '$ cat recipe.txt', at: 100 }, { s: '<<<<<<< HEAD', at: 400 }, { s: '1 cup salt', at: 500 }, { s: '=======', at: 600 }, { s: '2 cups sugar', at: 700 }, { s: '>>>>>>> sweet', at: 800 }] },
      { hl: [8], say: '这时直接 git commit 会被拒绝。文件里还有没解决的冲突（练习页 ex08-c 实测）。',
        log: [{ s: '$ git commit -q -m "try to commit"', at: 100 }, { s: 'error: Committing is not possible because you have unmerged files.', at: 600, cls: 'err' }],
        fx: [{ type: 'shake', obj: 'zone', at: 600 }] },
      { hl: [9, 11], say: '解决办法是手动编辑成你想要的内容，删掉三种标记。这里保留一杯糖，再加一撮盐。然后 git add 标记已解决，再 git commit。', data: { '冲突文件': { v: '已解决', at: 900 }, 'MERGE_HEAD': { v: '无', at: 1300 } },
        log: ['$ cp ../ex08/recipe_resolved.txt recipe.txt', '$ git add recipe.txt', '$ git commit -q --no-edit'],
        set: { zone: { opacity: { to: 0, dur: 300 } }, m3: { opacity: { to: 0, dur: 300 } }, m5: { opacity: { to: 0, dur: 300 } }, m7: { opacity: { to: 0, dur: 300 } },
          m4: { text: { to: '1 cup sugar', delay: 400 }, color: { to: C.fg, delay: 400, dur: 300 }, y: { to: 214, delay: 400, dur: 500 } }, m6: { text: { to: '1 pinch salt', delay: 400 }, color: { to: C.fg, delay: 400, dur: 300 }, y: { to: 242, delay: 400, dur: 500 } }, l8: { y: { to: 270, delay: 400, dur: 500 } } },
        fx: [{ type: 'ripple', x: 660, y: 228, at: 900, color: C.ok }] },
      { hl: [12], say: '合并提交 7cba7ea 有两个 parent：salty 一侧 3f5228a 和 sweet 一侧 25b74f8。git log --graph 画出了这个菱形（本机实测）。',
        log: [{ s: '$ git log --graph --oneline', at: 100 }, { s: "*   7cba7ea Merge branch 'sweet'", at: 300 }, { s: '|\\  ', at: 400 }, { s: '| * 25b74f8 sweet', at: 500 }, { s: '* | 3f5228a salty', at: 600 }, { s: '|/  ', at: 650 }, { s: '* 17dd24a base recipe', at: 700 }],
        set: merge(show('nM', 200), { eM1: { dash: { to: 1, delay: 400, dur: 400 } }, eM2: { dash: { to: 1, delay: 500, dur: 600 } }, master: { x: { to: 196, delay: 900, dur: 800, ease: 'inOut' }, y: { to: 520, delay: 900, dur: 800, ease: 'inOut' } } }),
        fx: [{ type: 'burst', obj: 'nM', at: 500, color: C.ok }] }
    ]
  };

  /* ---------- 演示 4：游离 HEAD 与 reflog ---------- */
  var D0 = [180, 220], D1 = [420, 220], DO = [420, 400];
  var sceneDetached = {
    name: '游离 HEAD 与 reflog', desc: 'git checkout 一个提交而不是分支时，HEAD 直接指向提交。这叫 detached HEAD。这时提交的新东西，没有分支跟着。切走后，它就成了没名字的孤儿。reflog 记着引用的历史，能把它找回来。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-f）", src: "git log --oneline\ngit checkout -q HEAD~1\ngit status | head -1\necho zulu >> nato.txt && git commit -q -am \"orphan\"\ngit switch master\ngit reflog -4\ngit branch rescue HEAD@{1}\ngit log --oneline -1 rescue" },
    dataTitle: 'HEAD 的状态（本机实测）',
    data: { 'HEAD': 'master', '孤儿提交': '无' },
    legend: [[C.info, '提交'], [C.data, '分支'], [C.warn, 'HEAD'], [C.neutral, '不可达（等待垃圾回收）']],
    bg: function (d) { d.text(430, 26, 'HEAD 可以指向分支，也可以直接指向提交', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: {
      nA: node(D0[0], D0[1], '6f7b00b', { opacity: 1 }), mA: msg(D0[0], D0[1] + 36, 'initial commit'),
      nB: node(D1[0], D1[1], 'c560925', { opacity: 1 }), mB: msg(D1[0], D1[1] + 36, 'add hotel'), eB: edge(D1[0] - 52, D1[1], D0[0] + 52, D0[1], { dash: 1 }),
      nO: node(DO[0], DO[1], 'd6fefb2'), mO: msg(DO[0], DO[1] + 36, 'orphan'), eO: edge(DO[0] - 52, DO[1] - 14, D0[0] + 40, D0[1] + 22),
      master: ref(D1[0], D1[1] - 44, 'master', { opacity: 1 }), head: merge(headBox(D1[0] - 96, D1[1] - 44), { opacity: 1 }),
      rescue: ref(DO[0] + 110, DO[1], 'rescue', { fill: C.ok, stroke: C.ok }),
      rl: { type: 'box', x: 690, y: 420, w: 260, h: 60, rx: 10, fill: '#0f1318', stroke: '#2b3440', sw: 1.4, text: '', mono: true, size: 15, weight: 800, color: '#9be09b', opacity: 0 }
    },
    steps: [
      { hl: [1], say: '两个提交，master 在 c560925，HEAD 指向 master。', log: ['$ git log --oneline', { s: 'c560925 add hotel', at: 300 }, { s: '6f7b00b initial commit', at: 400 }],
        fx: [{ type: 'pulse', obj: 'head', at: 300, color: C.warn }] },
      { hl: [2, 3], say: 'git checkout HEAD~1 之后，HEAD 不再指向分支。它直接指向提交 6f7b00b。git status 第一行变成 “HEAD detached at 6f7b00b”（视频 58:54）。', data: { 'HEAD': { v: '6f7b00b（detached）', at: 800 } },
        log: ['$ git checkout -q HEAD~1', '$ git status | head -1', { s: 'HEAD detached at 6f7b00b', at: 900 }],
        set: { head: { x: { to: D0[0], dur: 900, ease: 'inOut' }, y: { to: D0[1] - 44, dur: 900, ease: 'inOut' }, fill: { to: C.warnW, delay: 800, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'head', at: 900, color: C.warn }] },
      { hl: [4], say: '在这里提交。新提交 d6fefb2 的 parent 是 6f7b00b，HEAD 跟着它走。但没有任何分支指向它。',
        log: ['$ echo zulu >> nato.txt && git commit -q -am "orphan"'],
        set: merge(show('nO', 200), { mO: { opacity: { to: 1, delay: 300, dur: 300 } }, eO: { dash: { to: 1, delay: 400, dur: 500 } }, head: { x: { to: DO[0], delay: 900, dur: 800, ease: 'inOut' }, y: { to: DO[1] - 44, delay: 900, dur: 800, ease: 'inOut' } } }),
        fx: [{ type: 'stream', path: 'eO', at: 500, n: 1, dur: 600, color: C.info, labels: ['parent'] }] },
      { hl: [5], say: 'git switch master 时，Git 发出警告。说你留下了 1 个提交，没连到任何分支上。它还提示可以用 git branch 起个名字（本机实测）。', data: { 'HEAD': { v: 'master', at: 900 }, '孤儿提交': { v: 'd6fefb2（不可达）', at: 1200 } },
        log: ['$ git switch master', { s: 'Warning: you are leaving 1 commit behind, not connected to', at: 500, cls: 'err' }, { s: 'any of your branches:', at: 550, cls: 'err' }, { s: '  d6fefb2 orphan', at: 700 }, { s: "Switched to branch 'master'", at: 1000 }],
        set: { head: { x: { to: D1[0] - 96, delay: 300, dur: 900, ease: 'inOut' }, y: { to: D1[1] - 44, delay: 300, dur: 900, ease: 'inOut' }, fill: { to: C.bg, delay: 300, dur: 300 } },
          nO: { fill: { to: C.bg3, delay: 1100, dur: 400 }, stroke: { to: C.neutral, delay: 1100, dur: 400 }, opacity: { to: 0.6, delay: 1100, dur: 400 } }, eO: { stroke: { to: C.neutral, delay: 1100, dur: 400 } } },
        fx: [{ type: 'shake', obj: 'nO', at: 1200 }] },
      { hl: [6], say: '孤儿提交还在对象库里，只是从任何引用都走不到了。Git 以后做垃圾回收，会删掉这类对象（视频 54:40）。在那之前，reflog 记着 HEAD 去过哪里。',
        log: [{ s: '$ git reflog -4', at: 100 }, { s: 'c560925 HEAD@{0}: checkout: moving from d6fefb2… to master', at: 400 }, { s: 'd6fefb2 HEAD@{1}: commit: orphan', at: 600 }, { s: '6f7b00b HEAD@{2}: checkout: moving from master to HEAD~1', at: 800 }, { s: 'c560925 HEAD@{3}: commit: add hotel', at: 1000 }],
        set: { rl: { opacity: { to: 1, dur: 300 }, text: 'HEAD@{1} = d6fefb2' } },
        fx: [{ type: 'pulse', obj: 'rl', at: 600, color: C.warn }] },
      { hl: [7, 8], say: 'git branch rescue HEAD@{1} 给它起个名字。孤儿重新“可达”，不会再被回收。视频 1:08:58 的问答还提到一招。也可以直接用提交哈希建分支。', data: { '孤儿提交': { v: '已由 rescue 指向', at: 900 } },
        log: ['$ git branch rescue HEAD@{1}', '$ git log --oneline -1 rescue', { s: 'd6fefb2 orphan', at: 900 }],
        set: { rescue: { opacity: { to: 1, delay: 200, dur: 300 }, x: { from: 690, to: DO[0] + 110, delay: 200, dur: 800, ease: 'inOut' }, y: { from: 420, to: DO[1], delay: 200, dur: 800, ease: 'inOut' } },
          nO: { fill: { to: C.infoW, delay: 900, dur: 300 }, stroke: { to: C.info, delay: 900, dur: 300 }, opacity: { to: 1, delay: 900, dur: 300 } }, eO: { stroke: { to: C.fg3, delay: 900, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'nO', at: 1000, color: C.ok }] }
    ]
  };

  VZ.register({
    id: 'ch05-staging', title: '暂存区：同一个文件的三个版本',
    sources: [
      { t: '视频 34:46 暂存区', u: 'https://youtu.be/9K8lB61dl3Y?t=2086' },
      { t: '讲义 Staging area', u: 'https://missing.csail.mit.edu/2026/version-control/#staging-area' },
      { t: 'git status · Short Format', u: 'https://git-scm.com/docs/git-status#_short_format' }
    ],
    note: '状态码和 diff 统计是本机真跑的（练习页 ex01-d）。三列卡片里的文件内容，只显示了末尾两行。',
    scenes: [sceneStage]
  });
  VZ.register({
    id: 'ch05-branch', title: '分支只是指针：提交时谁会动',
    sources: [
      { t: '视频 45:31 分支跟着提交走', u: 'https://youtu.be/9K8lB61dl3Y?t=2731' },
      { t: '视频 48:03 git branch / switch', u: 'https://youtu.be/9K8lB61dl3Y?t=2883' },
      { t: '讲义 References', u: 'https://missing.csail.mit.edu/2026/version-control/#references' }
    ],
    note: '哈希和输出是本机真跑的（练习页 ex01-e）。示例身份和时间是固定的。右侧“工作区”框只示意 nato.txt 的大致内容。',
    scenes: [sceneBranch]
  });
  VZ.register({
    id: 'ch05-merge', title: '合并：自动三方合并与冲突',
    sources: [
      { t: '视频 50:28 git merge', u: 'https://youtu.be/9K8lB61dl3Y?t=3028' },
      { t: '视频 29:23 合并启发式与冲突', u: 'https://youtu.be/9K8lB61dl3Y?t=1763' },
      { t: '讲义练习 8', u: 'https://missing.csail.mit.edu/2026/version-control/#exercises' },
      { t: 'Pro Git · Basic Merge Conflicts', u: 'https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging' }
    ],
    note: '两个场景的哈希、冲突标记和报错，都来自本机真跑。出处是练习页 ex01-e 和 ex08-a/b/c。“三方比较”的推导，是对 Git 行为的简化说明。',
    scenes: [sceneMerge, sceneConflict]
  });
  VZ.register({
    id: 'ch05-detached', title: '游离 HEAD、孤儿提交与 reflog',
    sources: [
      { t: '视频 58:19 checkout 旧提交', u: 'https://youtu.be/9K8lB61dl3Y?t=3499' },
      { t: '视频 54:09 reflog 与垃圾回收', u: 'https://youtu.be/9K8lB61dl3Y?t=3249' },
      { t: 'git reflog 文档', u: 'https://git-scm.com/docs/git-reflog' }
    ],
    note: '哈希、警告和 reflog 输出是本机真跑的（练习页 ex01-f）。reflog 第一行里的长哈希做了省略。',
    scenes: [sceneDetached]
  });
})();
