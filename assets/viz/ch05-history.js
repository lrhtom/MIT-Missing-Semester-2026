/* ch05 · 远程协作、rebase 改写历史、bisect 二分找 bug（三个演示，分别挂在第 5 讲 §16、§17、§19）
 * 依据：Lecture 5 视频 59:25–1:06:23（remote、push -u、clone、fetch 与 pull、推送整段历史）、26:30–28:52（改写历史 / rebase、revert）、
 *       2:52（版本控制系统能自动二分查找引入 bug 的提交）；讲义 version-control.md 的 Remotes 与 Advanced Git（git rebase、git bisect）。
 * 实测：全部哈希与输出来自 labs/lab05 的 ex01-h（本地裸仓库扮演 GitHub）、ex01-g（rebase）、ex01-i（bisect run），
 *       由 练习生成脚本 本机真跑（固定示例身份与时间，哈希可复现）。视频里讲师用的是 GitHub 上的仓库，这里用本地裸仓库代替（原理相同）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function node(x, y, hash, extra) { return merge({ type: 'box', x: x, y: y, w: 100, h: 36, rx: 18, fill: C.infoW, stroke: C.info, sw: 2, text: hash, mono: true, size: 13, weight: 800, color: C.fg, opacity: 0 }, extra || {}); }
  function ref(x, y, t, extra) { return merge({ type: 'box', x: x, y: y, w: 104, h: 24, rx: 12, fill: C.data, stroke: C.data, sw: 1, text: t, mono: true, size: 11.5, weight: 800, color: '#fff', opacity: 0, trail: { n: 4, gap: 40 } }, extra || {}); }
  function show(id, at) { var s = {}; s[id] = { opacity: { to: 1, delay: at || 0, dur: 300 }, s: { from: 0.7, to: 1, delay: at || 0, dur: 450, ease: 'back' } }; return s; }
  function edge(x1, y1, x2, y2, extra) { return merge({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, stroke: C.fg3, sw: 2, dash: 0, arrow: 'fg3' }, extra || {}); }

  /* ---------- 演示 1：push / fetch / pull ---------- */
  var RX = { a: 150, o: 430, b: 710 }, Y1 = 380, Y2 = 270;
  var sceneRemote = {
    name: 'push、fetch、pull', desc: 'Git 是分布式的，每个人都有完整的仓库副本。remote 只是“另一个仓库”。push 把你的提交和分支位置送过去。fetch 把对方的新提交取回来，但不动你的分支。pull 等于 fetch 加 merge。这里用一个本地裸仓库扮演 GitHub。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-h）", src: "git init -q --bare origin.git\ngit clone -q origin.git alice\ncd alice && echo a > f.txt && git add f.txt && git commit -q -m \"alice: first\"\ngit push -q -u origin master\ncd .. && git clone -q origin.git bob && cd bob\necho b >> f.txt && git commit -q -am \"bob: second\" && git push -q\ncd ../alice && git status -sb | head -1\ngit fetch -q && git status -sb | head -1\ngit pull -q --ff-only && git log --oneline" },
    dataTitle: '各个引用（本机实测）',
    data: { 'alice: master': '无', 'alice: origin/master': '无', 'origin: master': '无', 'bob: master': '无' },
    legend: [[C.info, '提交'], [C.data, '本地分支'], [C.teal, '远程跟踪分支 origin/…'], [C.warn, '裸仓库里的分支']],
    bg: function (d) {
      d.text(430, 26, '三个仓库各有一份历史，箭头上流动的是对象和引用', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [['a', 'alice（你）'], ['o', 'origin.git（裸仓库，扮演 GitHub）'], ['b', 'bob（同事）']].forEach(function (r) {
        d.rect(RX[r[0]] - 118, 80, 236, 400, { fill: C.bg2, stroke: r[0] === 'o' ? C.warn : C.line, rx: 12, sw: 1.4, dash: r[0] === 'o' ? '6 4' : null });
        d.text(RX[r[0]], 100, r[1], { anchor: 'middle', size: 12.5, weight: 800, color: C.fg });
      });
    },
    objects: {
      a1: node(RX.a - 30, Y1, '4d59c41'), a2: node(RX.a - 30, Y2, 'fdf7920'), ae: edge(RX.a - 30, Y2 + 18, RX.a - 30, Y1 - 20),
      o1: node(RX.o - 30, Y1, '4d59c41'), o2: node(RX.o - 30, Y2, 'fdf7920'), oe: edge(RX.o - 30, Y2 + 18, RX.o - 30, Y1 - 20),
      b1: node(RX.b - 30, Y1, '4d59c41'), b2: node(RX.b - 30, Y2, 'fdf7920'), be: edge(RX.b - 30, Y2 + 18, RX.b - 30, Y1 - 20),
      am: ref(RX.a + 60, Y1 - 10, 'master'), ao: ref(RX.a + 60, Y1 + 18, 'origin/master', { fill: C.teal, stroke: C.teal }),
      om: ref(RX.o + 60, Y1, 'master', { fill: C.warn, stroke: C.warn }),
      bm: ref(RX.b + 60, Y1 - 10, 'master'), bo: ref(RX.b + 60, Y1 + 18, 'origin/master', { fill: C.teal, stroke: C.teal }),
      pa: { type: 'path', d: 'M200,190 C270,140 330,140 380,190', stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      po: { type: 'path', d: 'M480,190 C550,140 610,140 660,190', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' },
      pb: { type: 'path', d: 'M660,225 C610,195 550,195 480,225', stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      pf: { type: 'path', d: 'M380,225 C330,195 270,195 200,225', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' },
      ft: { type: 'box', x: RX.a, y: 440, w: 200, h: 34, rx: 8, fill: C.bg, stroke: C.line, sw: 1.4, text: 'f.txt: a', mono: true, size: 13, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { hl: [1], say: 'git init --bare origin.git 建一个裸仓库。它没有工作区，只存对象和引用。GitHub 上的仓库本质上就是这样。视频 1:01:10 也说过。新建的空仓库，就像别人做了一次 git init。',
        log: ['$ git init -q --bare origin.git'], fx: [{ type: 'pulse', x: RX.o, y: 280, at: 300, color: C.warn }] },
      { hl: [2, 3], say: 'alice 克隆这个空仓库，Git 提醒她好像克隆了个空仓库。她写文件、提交，本地有了 4d59c41。', data: { 'alice: master': { v: '4d59c41', at: 900 } },
        log: ['$ git clone -q origin.git alice', { s: 'warning: You appear to have cloned an empty repository.', at: 400, cls: 'err' }, { s: '$ echo a > f.txt && git add f.txt && git commit -q -m "alice: first"', at: 700 }],
        set: merge(show('a1', 800), show('am', 1000), { ft: { opacity: { to: 1, delay: 800, dur: 300 } } }) },
      { hl: [4], say: 'git push -u origin master 把 master 能走到的所有对象送到 origin。再让 origin 的 master 指向同一个提交。-u 记住对应关系。以后直接 git push 就行（视频 1:02:16）。', data: { 'origin: master': { v: '4d59c41', at: 1100 }, 'alice: origin/master': { v: '4d59c41', at: 1300 } },
        log: ['$ git push -q -u origin master'],
        set: merge({ pa: { dash: { to: 1, dur: 400 } } }, show('o1', 900), show('om', 1100), show('ao', 1300)),
        fx: [{ type: 'stream', path: 'pa', at: 200, n: 3, dur: 900, color: C.data, labels: ['commit', 'tree', 'blob'] }] },
      { hl: [5], say: 'bob 克隆 origin：拿到完整的历史和分支，他的 master、origin/master 都在 4d59c41。', data: { 'bob: master': { v: '4d59c41', at: 1000 } },
        log: ['$ git clone -q origin.git bob'],
        set: merge({ pa: { dash: { to: 0, dur: 300 } }, po: { dash: { to: 1, delay: 100, dur: 400 } } }, show('b1', 900), show('bm', 1000), show('bo', 1100)),
        fx: [{ type: 'stream', path: 'po', at: 300, n: 3, dur: 900, color: C.teal, labels: ['commit', 'tree', 'blob'] }] },
      { hl: [6], say: 'bob 追加一行、提交 fdf7920，再 git push：origin 的 master 前进到 fdf7920。', data: { 'bob: master': { v: 'fdf7920', at: 800 }, 'origin: master': { v: 'fdf7920', at: 1600 } },
        log: ['$ echo b >> f.txt && git commit -q -am "bob: second" && git push -q'],
        set: merge({ po: { dash: { to: 0, dur: 300 } } }, show('b2', 300), { be: { dash: { to: 1, delay: 400, dur: 300 } }, bm: { y: { to: Y2 - 10, delay: 600, dur: 600, ease: 'inOut' } }, pb: { dash: { to: 1, delay: 800, dur: 400 } } },
          show('o2', 1400), { oe: { dash: { to: 1, delay: 1500, dur: 300 } }, om: { y: { to: Y2, delay: 1500, dur: 600, ease: 'inOut' } }, bo: { y: { to: Y2 + 18, delay: 1600, dur: 600, ease: 'inOut' } } }),
        fx: [{ type: 'stream', path: 'pb', at: 900, n: 3, dur: 800, color: C.data, labels: ['commit', 'tree', 'blob'] }] },
      { hl: [7], say: '回到 alice，git status -sb 仍说和 origin/master 一致。她的 origin/master 只是上次联系时 origin 的样子。Git 不会自己去网上看。',
        log: ['$ git status -sb | head -1', { s: '## master...origin/master', at: 500 }], set: { pb: { dash: { to: 0, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'ao', at: 500, color: C.teal }] },
      { hl: [8], say: 'git fetch 取回 alice 没有的对象，把 origin/master 更新到 fdf7920。她自己的 master 不动。现在状态是 “behind 1”（视频 1:04:00）。', data: { 'alice: origin/master': { v: 'fdf7920', at: 1300 } },
        log: ['$ git fetch -q && git status -sb | head -1', { s: '## master...origin/master [behind 1]', at: 1400 }],
        set: merge({ pf: { dash: { to: 1, dur: 400 } } }, show('a2', 900), { ae: { dash: { to: 1, delay: 1000, dur: 300 } }, ao: { y: { to: Y2 + 18, delay: 1100, dur: 600, ease: 'inOut' } } }),
        fx: [{ type: 'stream', path: 'pf', at: 200, n: 3, dur: 800, color: C.teal, labels: ['commit', 'tree', 'blob'] }] },
      { hl: [9], say: 'git pull 等于 fetch 加合并，这里加了 --ff-only。master 正好落后，直接快进到 fdf7920。工作区的 f.txt 变成 a、b 两行。', data: { 'alice: master': { v: 'fdf7920', at: 800 } },
        log: ['$ git pull -q --ff-only && git log --oneline', { s: 'fdf7920 bob: second', at: 900 }, { s: '4d59c41 alice: first', at: 1000 }, { s: '$ cat f.txt', at: 1200 }, { s: 'a', at: 1300 }, { s: 'b', at: 1350 }],
        set: { pf: { dash: { to: 0, dur: 300 } }, am: { y: { to: Y2 - 10, delay: 300, dur: 700, ease: 'inOut' } }, ft: { text: { to: 'f.txt: a, b', delay: 1200 } } },
        fx: [{ type: 'ripple', obj: 'am', at: 1000, color: C.data }, { type: 'flash', obj: 'ft', at: 1200, color: C.teal }] },
      { hl: [4], say: '要点是，推送和拉取的单位是对象加引用。而且总会带上通往那个提交的整段历史。见视频 1:05:46。每个人看到的是同一张提交图的不同部分，靠交换补齐。',
        fx: [{ type: 'pulse', obj: 'o2', at: 300, color: C.warn }, { type: 'pulse', obj: 'a2', at: 500, color: C.info }, { type: 'pulse', obj: 'b2', at: 700, color: C.info }] }
    ]
  };

  /* ---------- 演示 2：rebase 改写历史 ---------- */
  var P0 = [140, 300], PC = [330, 190], PD = [520, 190], PM = [330, 410], PC2 = [520, 410], PD2 = [710, 410];
  var sceneRebase = {
    name: 'rebase：把提交搬到新基础上', desc: 'merge 会留下一个菱形，rebase 换了一种做法。它把 feature 上每个提交的改动，依次重放一遍。重放的位置是 master 最新的提交后面。得到的是一串新提交。旧提交并没有被修改，只是不再有名字指着它们。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-g）", src: "git log --all --graph --oneline\ngit switch -q feature\ngit rebase master\ngit log --all --graph --oneline" },
    dataTitle: '分支位置（本机实测）',
    data: { 'master': '805d17e', 'feature': '1fc7223', '正在重放': '无' },
    legend: [[C.info, '提交'], [C.data, '分支'], [C.ok, '重放生成的新提交'], [C.neutral, '旧提交（不再可达）']],
    bg: function (d) { d.text(430, 26, 'rebase = 逐个重放改动 → 新的父提交 → 新的哈希', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: {
      n0: node(P0[0], P0[1], '6f7b00b', { opacity: 1 }),
      nC: node(PC[0], PC[1], '19113a7', { opacity: 1 }), nD: node(PD[0], PD[1], '1fc7223', { opacity: 1 }), nM: node(PM[0], PM[1], '805d17e', { opacity: 1 }),
      eC: edge(PC[0] - 50, PC[1] + 10, P0[0] + 50, P0[1] - 10, { dash: 1 }), eD: edge(PD[0] - 50, PD[1], PC[0] + 50, PC[1], { dash: 1 }), eM: edge(PM[0] - 50, PM[1] - 10, P0[0] + 50, P0[1] + 10, { dash: 1 }),
      tC: { type: 'text', x: PC[0], y: PC[1] - 30, text: 'feature: hotel', size: 11.5, color: C.fg3, weight: 650 },
      tD: { type: 'text', x: PD[0], y: PD[1] - 30, text: 'feature: india', size: 11.5, color: C.fg3, weight: 650 },
      tM: { type: 'text', x: PM[0], y: PM[1] + 32, text: 'master: alpha', size: 11.5, color: C.fg3, weight: 650 },
      nC2: node(PC2[0], PC2[1], '8736fc2', { fill: C.okW, stroke: C.ok }), nD2: node(PD2[0], PD2[1], '88a446a', { fill: C.okW, stroke: C.ok }),
      eC2: edge(PC2[0] - 50, PC2[1], PM[0] + 50, PM[1]), eD2: edge(PD2[0] - 50, PD2[1], PC2[0] + 50, PC2[1]),
      gC: { type: 'box', x: PC[0], y: PC[1], w: 100, h: 36, rx: 18, fill: 'none', stroke: C.ok, sw: 2, dasharray: '5 4', opacity: 0, trail: { n: 4, gap: 40 } },
      gD: { type: 'box', x: PD[0], y: PD[1], w: 100, h: 36, rx: 18, fill: 'none', stroke: C.ok, sw: 2, dasharray: '5 4', opacity: 0, trail: { n: 4, gap: 40 } },
      feature: ref(PD[0], PD[1] - 56, 'feature', { fill: C.teal, stroke: C.teal, opacity: 1 }), master: ref(PM[0], PM[1] + 56, 'master', { opacity: 1 })
    },
    steps: [
      { hl: [1], say: '起点是 feature 从 6f7b00b 分出，有 hotel 和 india 两个提交。master 后来又多了一个 alpha。历史已经分叉（本机实测）。',
        log: ['$ git log --all --graph --oneline', { s: '* 1fc7223 feature: india', at: 300 }, { s: '* 19113a7 feature: hotel', at: 400 }, { s: '| * 805d17e master: alpha', at: 500 }, { s: '|/  ', at: 550 }, { s: '* 6f7b00b initial commit', at: 600 }],
        fx: [{ type: 'pulse', obj: 'nD', at: 300, color: C.teal }, { type: 'pulse', obj: 'nM', at: 500, color: C.data }] },
      { hl: [2, 3], say: 'git switch feature，然后 git rebase master。Git 先找出 feature 独有的提交 19113a7 和 1fc7223。再把它们的改动依次接到 805d17e 后面。',
        log: ['$ git switch -q feature', '$ git rebase master'], data: { '正在重放': '19113a7、1fc7223' },
        eq: ['待重放 = feature 有、master 没有的提交', { s: '= 19113a7（+hotel）、1fc7223（+india）', at: 600 }],
        fx: [{ type: 'flash', obj: 'nC', at: 300, color: C.ok }, { type: 'flash', obj: 'nD', at: 500, color: C.ok }] },
      { hl: [3], say: '重放第 1 个。把 19113a7 的改动（+hotel）用到 805d17e 上。生成的新提交是 8736fc2。改动一样，但父提交不同。所以内容不同，哈希也不同。', data: { '正在重放': { v: '1/2：19113a7 → 8736fc2', at: 900 } },
        log: [{ s: 'Rebasing (1/2)', at: 400 }],
        eq: [{ s: 'commit 内容里含 parent 的哈希', at: 300 }, { s: 'parent 从 6f7b00b 变成 805d17e → 新哈希 8736fc2', at: 900 }],
        set: merge({ gC: { opacity: { from: 1, to: 0, delay: 1150, dur: 200 }, x: { to: PC2[0], delay: 200, dur: 900, ease: 'inOut' }, y: { to: PC2[1], delay: 200, dur: 900, ease: 'inOut' } } }, show('nC2', 1000), { eC2: { dash: { to: 1, delay: 1100, dur: 400 } } }) },
      { hl: [3], say: '重放第 2 个。1fc7223 的改动（+india）接到刚生成的 8736fc2 后面，得到 88a446a。', data: { '正在重放': { v: '2/2：1fc7223 → 88a446a', at: 900 } },
        log: [{ s: 'Rebasing (2/2)', at: 400 }],
        set: merge({ gD: { opacity: { from: 1, to: 0, delay: 1150, dur: 200 }, x: { to: PD2[0], delay: 200, dur: 900, ease: 'inOut' }, y: { to: PD2[1], delay: 200, dur: 900, ease: 'inOut' } } }, show('nD2', 1000), { eD2: { dash: { to: 1, delay: 1100, dur: 400 } } }) },
      { hl: [3], say: '最后把 feature 这个名字挪到 88a446a。旧的 19113a7、1fc7223 原封不动地留在对象库里。只是不再有分支指着它们。reflog 还记得它们，过段时间会被回收。', data: { 'feature': { v: '88a446a', at: 900 }, '正在重放': '完成' },
        log: [{ s: 'Successfully rebased and updated refs/heads/feature.', at: 900 }],
        set: { feature: { x: { to: PD2[0], delay: 200, dur: 900, ease: 'inOut' }, y: { to: PD2[1] - 50, delay: 200, dur: 900, ease: 'inOut' } },
          nC: { fill: { to: C.bg3, delay: 1000, dur: 400 }, stroke: { to: C.neutral, delay: 1000, dur: 400 }, opacity: { to: 0.5, delay: 1000, dur: 400 } }, nD: { fill: { to: C.bg3, delay: 1000, dur: 400 }, stroke: { to: C.neutral, delay: 1000, dur: 400 }, opacity: { to: 0.5, delay: 1000, dur: 400 } },
          eC: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, eD: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, tC: { opacity: { to: 0.4, delay: 1000, dur: 400 } }, tD: { opacity: { to: 0.4, delay: 1000, dur: 400 } } },
        fx: [{ type: 'ripple', obj: 'feature', at: 1100, color: C.teal }] },
      { hl: [4], say: '结果是一条直线的历史。看起来就像在最新的 master 上开发的。之后 master 合并 feature，只要快进就行（本机实测）。',
        log: ['$ git log --all --graph --oneline', { s: '* 88a446a feature: india', at: 300 }, { s: '* 8736fc2 feature: hotel', at: 400 }, { s: '* 805d17e master: alpha', at: 500 }, { s: '* 6f7b00b initial commit', at: 600 }],
        fx: [{ type: 'stream', path: 'eD2', at: 200, n: 1, dur: 500, color: C.ok }, { type: 'stream', path: 'eC2', at: 500, n: 1, dur: 500, color: C.ok }] },
      { hl: [3], say: '代价是 rebase 改写了历史，提交的哈希全变了。已经分享给别人的提交，不要这样改写。视频 27:39 说过，只在还没分享时用 rebase 这类命令。已经推送的错误，用 git revert 新增一个反向提交。',
        eq: ['已分享的历史：用 git revert（追加新提交，不改旧的）', { s: '只在本地的历史：可以 rebase / rebase -i / commit --amend', at: 700 }] }
    ]
  };

  /* ---------- 演示 3：git bisect 二分 ---------- */
  var BX0 = 60, BS = 49, BY = 280;
  function bx(v) { return BX0 + (v - 1) * BS; }
  function bisObjs() {
    var o = {};
    for (var v = 1; v <= 16; v++) {
      o['v' + v] = { type: 'box', x: bx(v), y: BY, w: 40, h: 40, rx: 8, fill: C.bg2, stroke: C.line, sw: 1.6, text: 'v' + v, mono: true, size: 12, weight: 800, color: C.fg2, opacity: 0 };
    }
    o.win = { type: 'box', anchor: 'tl', x: bx(2) - 24, y: BY - 34, w: bx(16) - bx(2) + 48, h: 68, rx: 12, fill: C.warnW, stroke: C.warn, sw: 1.6, opacity: 0 };
    o.cur = { type: 'box', x: bx(16), y: BY - 64, w: 92, h: 26, rx: 13, fill: C.info, stroke: C.info, sw: 1, text: '当前检出', size: 11.5, weight: 800, color: '#fff', opacity: 0, trail: { n: 5, gap: 40 } };
    o.res = { type: 'box', x: 430, y: 430, w: 420, h: 46, rx: 10, fill: C.badW, stroke: C.bad, sw: 1.8, text: '78824ca（v11）is the first bad commit', mono: true, size: 13.5, weight: 800, color: C.bad, opacity: 0, s: 0.85 };
    return o;
  }
  function mark(v, good, at) { var s = {}; s['v' + v] = { fill: { to: good ? C.okW : C.badW, delay: at || 0, dur: 300 }, stroke: { to: good ? C.ok : C.bad, delay: at || 0, dur: 300 }, color: { to: good ? C.ok : C.bad, delay: at || 0, dur: 300 } }; return s; }
  function win(lo, hi, at) { return { win: { x: { to: bx(lo) - 24, delay: at || 0, dur: 600, ease: 'inOut' }, w: { to: bx(hi) - bx(lo) + 48, delay: at || 0, dur: 600, ease: 'inOut' } } }; }
  function cur(v, at) { return { cur: { x: { to: bx(v), delay: at || 0, dur: 700, ease: 'inOut' } } }; }
  var sceneBisect = {
    name: 'git bisect 二分', desc: '一年前还好好的，现在坏了，是哪次提交弄坏的？给 Git 一个判断好坏的测试脚本。它就在历史上二分查找。每测一次，嫌疑区间缩小一半（视频 2:52）。',
    code: { lang: "sh", title: "本场景的命令（练习页 ex01-i）", src: "bash ex01/make_history.sh\ncd calc && cp ../ex01/test_add.sh .\ngit bisect start HEAD HEAD~15\ngit bisect run bash test_add.sh\ngit bisect reset\n\n# test_add.sh 的内容：\nsource ./calc.sh\n[ \"$(add 2 3)\" = \"5\" ]" },
    dataTitle: 'bisect 状态（本机实测）',
    data: { 'good': '无', 'bad': '无', '嫌疑提交数': '无', '已测试': 0 },
    legend: [[C.ok, 'good：测试通过'], [C.bad, 'bad：测试失败'], [C.warn, '嫌疑区间'], [C.info, '当前检出的版本']],
    bg: function (d) { d.text(430, 26, '16 个提交里找“第一个坏的”', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); d.text(430, 344, '旧 ←──── 提交历史 ────→ 新', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 }); },
    objects: bisObjs,
    steps: [
      { hl: [1], say: 'make_history.sh 造了 16 个提交。其中 v11 悄悄把 add 改成了多加 1，提交说明里看不出来。现在 v16 的测试失败。',
        log: ['$ bash ex01/make_history.sh', { s: '16', at: 1300 }],
        set: (function () { var s = {}; for (var v = 1; v <= 16; v++) s['v' + v] = { opacity: { to: 1, delay: v * 70, dur: 200 }, y: { from: BY - 20, to: BY, delay: v * 70, dur: 350, ease: 'back' } }; return s; })() },
      { hl: [3], say: 'git bisect start HEAD HEAD~15：告诉它 v16 是坏的、v1 是好的。第一个坏提交一定在 v2…v16 这 15 个里。', data: { 'good': 'v1', 'bad': 'v16', '嫌疑提交数': 15 },
        log: ['$ git bisect start HEAD HEAD~15'],
        eq: ['嫌疑区间 (v1, v16]：15 个提交', { s: '每次测试砍掉一半 → 约 ⌈log₂ 15⌉ = 4 次', at: 700 }],
        set: merge(mark(1, true, 200), mark(16, false, 400), { win: { opacity: { to: 0.55, delay: 600, dur: 300 } } }) },
      { hl: [4, 9], say: 'git bisect run bash test_add.sh 先检出中间的 v8 跑测试。测试通过，说明坏提交在 v8 之后。', data: { 'good': 'v8', '嫌疑提交数': { v: 8, at: 1300 }, '已测试': 1 },
        log: ['$ git bisect run bash test_add.sh', { s: 'Bisecting: 7 revisions left to test after this (roughly 3 steps)', at: 300 }, { s: '[6b417f4f…] v8: feature 8', at: 500 }, { s: "running 'bash' 'test_add.sh'", at: 800 }],
        eq: { s: '测 v8 → 退出码 0 → good → 区间 (v8, v16]', at: 1100 },
        set: merge({ cur: { opacity: { to: 1, dur: 200 }, x: { to: bx(8), delay: 100, dur: 700, ease: 'inOut' } } }, mark(8, true, 900), win(9, 16, 1200)),
        fx: [{ type: 'pulse', obj: 'v8', at: 900, color: C.ok }] },
      { hl: [4, 9], say: '再取中间 v12：失败，坏提交在 v9…v12 之间。', data: { 'bad': 'v12', '嫌疑提交数': { v: 4, at: 1200 }, '已测试': 2 },
        log: [{ s: 'Bisecting: 3 revisions left to test after this (roughly 2 steps)', at: 200 }, { s: '[1cb824e5…] v12: feature 12', at: 400 }, { s: "running 'bash' 'test_add.sh'", at: 600 }],
        eq: { s: '测 v12 → 退出码 1 → bad → 区间 (v8, v12]', at: 900 },
        set: merge(cur(12, 100), mark(12, false, 800), win(9, 12, 1100)), fx: [{ type: 'shake', obj: 'v12', at: 800 }] },
      { hl: [4, 9], say: '取 v10：通过，区间缩到 v11…v12。', data: { 'good': 'v10', '嫌疑提交数': { v: 2, at: 1200 }, '已测试': 3 },
        log: [{ s: 'Bisecting: 1 revision left to test after this (roughly 1 step)', at: 200 }, { s: '[a594768f…] v10: feature 10', at: 400 }, { s: "running 'bash' 'test_add.sh'", at: 600 }],
        eq: { s: '测 v10 → good → 区间 (v10, v12]', at: 900 },
        set: merge(cur(10, 100), mark(10, true, 800), win(11, 12, 1100)) },
      { hl: [4], say: '取 v11，失败。区间里只剩它，v11 就是第一个坏提交。4 次测试就够了，逐个试最多要 15 次。', data: { 'bad': 'v11', '嫌疑提交数': { v: 1, at: 1100 }, '已测试': 4 },
        log: [{ s: 'Bisecting: 0 revisions left to test after this (roughly 0 steps)', at: 200 }, { s: '[78824cac…] v11: feature 11', at: 400 }, { s: "running 'bash' 'test_add.sh'", at: 600 }, { s: "78824cac241795729e846fa53e1abbb36f5eef32 is the first 'bad' commit", at: 1300, cls: 'err' }],
        eq: [{ s: '测 v11 → bad → 区间 (v10, v11] 只剩 1 个', at: 900 }, { s: '15 → 8 → 4 → 2 → 1：每步减半，共 4 次', at: 1300, cls: 'ok' }],
        set: merge(cur(11, 100), mark(11, false, 800), win(11, 11, 1000), { res: { opacity: { to: 1, delay: 1300, dur: 300 }, s: { to: 1, delay: 1300, dur: 500, ease: 'back' } } }),
        fx: [{ type: 'burst', obj: 'v11', at: 900, color: C.bad }] },
      { hl: [5], say: 'bisect 顺便显示了这个提交改了什么（calc.sh 一行被改）。git bisect reset 回到原来的分支。真实项目里，测试脚本就是“能复现 bug 的那个测试”。',
        log: [{ s: ' calc.sh | 3 ++-', at: 200 }, { s: '$ git bisect reset', at: 600 }, { s: "Previous HEAD position was 78824ca v11: feature 11", at: 900 }, { s: "Switched to branch 'master'", at: 1000 }],
        set: merge(cur(16, 600), { win: { opacity: { to: 0, delay: 600, dur: 300 } } }) }
    ]
  };

  VZ.register({
    id: 'ch05-remote', title: '远程仓库：push、fetch、pull 交换的是什么',
    sources: [
      { t: '视频 59:25 remotes', u: 'https://youtu.be/9K8lB61dl3Y?t=3565' },
      { t: '视频 1:04:00 fetch 与 pull', u: 'https://youtu.be/9K8lB61dl3Y?t=3840' },
      { t: '讲义 Remotes', u: 'https://missing.csail.mit.edu/2026/version-control/#remotes' },
      { t: 'Pro Git · Working with Remotes', u: 'https://git-scm.com/book/en/v2/Git-Basics-Working-with-Remotes' }
    ],
    note: '哈希和输出是本机真跑的（练习页 ex01-h）。那里用本地裸仓库代替 GitHub。数据包上的 commit/tree/blob 标签是示意。',
    scenes: [sceneRemote]
  });
  VZ.register({
    id: 'ch05-rebase', title: 'rebase：重放改动，得到新提交',
    sources: [
      { t: '视频 27:39 改写历史与 rebase', u: 'https://youtu.be/9K8lB61dl3Y?t=1659' },
      { t: '视频 28:15 git revert', u: 'https://youtu.be/9K8lB61dl3Y?t=1695' },
      { t: 'Pro Git · Rebasing', u: 'https://git-scm.com/book/en/v2/Git-Branching-Rebasing' }
    ],
    note: '哈希和输出是本机真跑的（练习页 ex01-g）。“幽灵框”飞过去表示改动被重放，是示意画法。',
    scenes: [sceneRebase]
  });
  VZ.register({
    id: 'ch05-bisect', title: 'git bisect：在历史里二分查找引入 bug 的提交',
    sources: [
      { t: '视频 2:52 自动二分查找', u: 'https://youtu.be/9K8lB61dl3Y?t=172' },
      { t: '讲义 Advanced Git', u: 'https://missing.csail.mit.edu/2026/version-control/#advanced-git' },
      { t: 'git bisect 文档', u: 'https://git-scm.com/docs/git-bisect' }
    ],
    note: '每一步检出的版本、提示语和结果，都是本机真跑的。出处是练习页 ex01-i，长哈希做了省略。',
    scenes: [sceneBisect]
  });
})();
