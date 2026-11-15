/* lab05 · 练习跑起来时，提交图怎么变
 * 控制台内容全部取自 labs/data/lab05.js 中 练习生成脚本 在本机（Git 2.55 + Git Bash 5.3）真跑的输出：
 *   ex03-a / ex03-b（从全部历史里删除 secret.txt）、ex04-a（git stash 在课程网站仓库的克隆上）。
 * 说明：ex04-a 没有固定提交时间（否则 stash 提交会因时间早于仓库最新提交而排不到 git log 顶部），所以 stash 的两个哈希每次运行都不同。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function node(x, y, hash, extra) { return merge({ type: 'box', x: x, y: y, w: 100, h: 36, rx: 18, fill: C.infoW, stroke: C.info, sw: 2, text: hash, mono: true, size: 13, weight: 800, color: C.fg, opacity: 0 }, extra || {}); }
  function ref(x, y, t, extra) { return merge({ type: 'box', x: x, y: y, w: 120, h: 24, rx: 12, fill: C.data, stroke: C.data, sw: 1, text: t, mono: true, size: 11.5, weight: 800, color: '#fff', opacity: 0, trail: { n: 4, gap: 40 } }, extra || {}); }
  function edge(x1, y1, x2, y2, extra) { return merge({ type: 'line', x1: x1, y1: y1, x2: x2, y2: y2, stroke: C.fg3, sw: 2, dash: 0, arrow: 'fg3' }, extra || {}); }
  function show(id, at) { var s = {}; s[id] = { opacity: { to: 1, delay: at || 0, dur: 300 }, s: { from: 0.7, to: 1, delay: at || 0, dur: 450, ease: 'back' } }; return s; }

  /* ---------- 练习 3：从全部历史里删除一个文件 ---------- */
  var X = [110, 290, 470, 650], YO = 170, YN = 330;
  var MSG = ['app', 'config', 'more app', 'remove secret'];
  function scrubObjs() {
    var o = {}, OLD = ['984ec36', '7a00164', '3a81b67', 'e594e47'], NEW = [null, 'bc3c8bf', '67efda1', 'b721e90'];
    for (var k = 0; k < 4; k++) {
      o['o' + k] = node(X[k], YO, OLD[k]);
      o['m' + k] = { type: 'text', x: X[k], y: YO - 30, text: MSG[k], size: 11.5, weight: 650, color: C.fg3, opacity: 0 };
      if (k) o['e' + k] = edge(X[k] - 50, YO, X[k - 1] + 50, YO);
      if (NEW[k]) {
        o['n' + k] = node(X[k], YN, NEW[k], { fill: C.okW, stroke: C.ok });
        o['f' + k] = edge(X[k] - 50, YN - (k === 1 ? 14 : 0), X[k - 1] + (k === 1 ? 40 : 50), k === 1 ? YO + 18 : YN);
      }
    }
    o.blob = { type: 'box', x: 380, y: 470, w: 230, h: 40, rx: 8, fill: C.badW, stroke: C.bad, sw: 1.8, text: 'blob f237fac（API_KEY=…）', mono: true, size: 12.5, weight: 800, color: C.bad, opacity: 0 };
    o.b1 = edge(330, 452, X[1] + 10, YO + 20, { stroke: C.bad }); o.b2 = edge(420, 452, X[2] - 10, YO + 20, { stroke: C.bad });
    o.master = ref(X[3] + 120, YO, 'master');
    o.orig = ref(X[3] + 120, YO - 34, 'refs/original/…', { fill: C.neutral, stroke: C.neutral, w: 140 });
    return o;
  }
  var sceneScrub = {
    name: '从历史里删掉 secret.txt', desc: '练习 3，一个带 API key 的文件被提交过，后来又删掉了。但它仍然躺在历史里，git show 一下就能看到。要真正抹掉，得改写它出现之后的所有提交。还要清掉一切指着旧提交的引用。',
    code: { lang: 'sh', title: 'ex03/scrub.sh（练习页练习 3）', src: '#!/bin/bash\n# 用法：bash scrub.sh <文件名>   —— 把这个文件从所有分支的全部历史里删掉\nset -e\nfile="$1"\nexport FILTER_BRANCH_SQUELCH_WARNING=1\ngit filter-branch --index-filter "git rm -q --cached --ignore-unmatch \'$file\'" -- --all\ngit for-each-ref --format=\'%(refname)\' refs/original/ | xargs -r -n1 git update-ref -d\ngit reflog expire --expire=now --all\ngit gc -q --prune=now' },
    dataTitle: '秘密还在不在（本机实测）',
    data: { 'master': 'e594e47', '含 secret 的提交': '无', 'secret 的 blob': '在' },
    legend: [[C.info, '原来的提交'], [C.ok, '改写后的新提交'], [C.bad, '秘密文件的 blob'], [C.neutral, '备份引用']],
    bg: function (d) { d.text(430, 26, '上：原历史    下：改写后的历史', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: scrubObjs,
    steps: [
      { say: '4 个提交：config 加了 secret.txt，最后一个提交又把它删了。看起来“已经删掉了”……', data: { '含 secret 的提交': { v: '7a00164、3a81b67', at: 1200 } },
        set: (function () { var s = {}; for (var k = 0; k < 4; k++) { Object.assign(s, show('o' + k, k * 250)); s['m' + k] = { opacity: { to: 1, delay: k * 250, dur: 300 } }; if (k) s['e' + k] = { dash: { to: 1, delay: k * 250 + 100, dur: 300 } }; } Object.assign(s, show('master', 1100)); return s; })() },
      { say: '……可是历史里还在。git log -- secret.txt 列出了加它和删它的两个提交。git show HEAD~2:secret.txt 直接打印出 key（本机实测）。',
        log: ['$ git log --all --oneline -- secret.txt', { s: 'e594e47 remove secret', at: 300 }, { s: '7a00164 config', at: 400 }, { s: '$ git show HEAD~2:secret.txt', at: 800 }, { s: 'API_KEY=sk-test-1234', at: 1100, cls: 'err' }],
        set: merge(show('blob', 600), { b1: { dash: { to: 1, delay: 800, dur: 400 } }, b2: { dash: { to: 1, delay: 900, dur: 400 } } }),
        fx: [{ type: 'shake', obj: 'blob', at: 1200 }] },
      { say: 'filter-branch 对每个提交，都在它的暂存区里执行 git rm --cached secret.txt。然后再重新提交。第一个提交 app 本来就没有这个文件。所以它的树不变，哈希也不变。', hl: [6],
        eq: ['984ec36：没有 secret → 树相同 → 父相同 → 哈希不变', { s: '7a00164：树里去掉 secret → 新树 → 新提交 bc3c8bf', at: 700 }],
        log: ['$ bash ../ex03/scrub.sh secret.txt'],
        set: merge(show('n1', 600), { f1: { dash: { to: 1, delay: 800, dur: 400 } } }),
        fx: [{ type: 'pulse', obj: 'o0', at: 200, color: C.ok }] },
      { say: '后面的提交里记着父提交的哈希，父变了它也得变。67efda1、b721e90 依次生成，master 挪到新的末端。', hl: [6], data: { 'master': { v: 'b721e90', at: 1400 } },
        log: [{ s: "Ref 'refs/heads/master' was rewritten", at: 1300 }],
        set: merge(show('n2', 200), { f2: { dash: { to: 1, delay: 400, dur: 400 } } }, show('n3', 700), { f3: { dash: { to: 1, delay: 900, dur: 400 } }, master: { y: { to: YN, delay: 1200, dur: 700, ease: 'inOut' } } }, show('orig', 1300)),
        fx: [{ type: 'stream', path: 'f3', at: 1000, n: 1, dur: 500, color: C.ok }] },
      { say: '但 filter-branch 把旧分支备份在 refs/original/ 下，reflog 也记着旧提交。只要还有引用指着旧历史，秘密就还在。所以脚本接着删掉备份引用，让 reflog 过期，再做垃圾回收。', hl: [7, 8, 9],
        set: { orig: { opacity: { to: 0, delay: 600, dur: 400 } }, o1: { opacity: { to: 0.15, delay: 1000, dur: 500 } }, o2: { opacity: { to: 0.15, delay: 1000, dur: 500 } }, o3: { opacity: { to: 0.15, delay: 1000, dur: 500 } },
          e2: { opacity: { to: 0.15, delay: 1000, dur: 500 } }, e3: { opacity: { to: 0.15, delay: 1000, dur: 500 } }, b1: { opacity: { to: 0, delay: 1000, dur: 400 } }, b2: { opacity: { to: 0, delay: 1000, dur: 400 } }, blob: { opacity: { to: 0.15, delay: 1300, dur: 500 } } },
        fx: [{ type: 'burst', obj: 'orig', at: 600, color: C.neutral }, { type: 'burst', obj: 'blob', at: 1300, color: C.bad }] },
      { say: '验证一下。新历史里已经没有提交含 secret.txt。那个 blob 也从对象库里消失了。git cat-file 找不到它（本机实测）。', data: { '含 secret 的提交': { v: 0, at: 700 }, 'secret 的 blob': { v: '已删除', at: 1300 } },
        log: ['$ git log --oneline', { s: 'b721e90 remove secret', at: 200 }, { s: '67efda1 more app', at: 250 }, { s: 'bc3c8bf config', at: 300 }, { s: '984ec36 app', at: 350 }, { s: '$ git log --all --oneline -- secret.txt | wc -l', at: 600 }, { s: '0', at: 700 }, { s: '$ git cat-file -t "$blob"', at: 1000 }, { s: 'fatal: git cat-file: could not get object info', at: 1200, cls: 'err' }, { s: 'secret blob is gone', at: 1300, cls: 'ok' }] },
      { say: '现实提醒一句。如果这段历史已经推出去，别人的克隆里还有旧提交。改写只管得了你自己的仓库。正确的第一步，永远是让泄露的 key 失效。然后换一个新的（视频 27:05）。',
        fx: [{ type: 'pulse', obj: 'n3', at: 300, color: C.ok }] }
    ]
  };

  /* ---------- 练习 4：git stash ---------- */
  var SM = [200, 330], SI = [430, 200], SW = [660, 330];
  var sceneStash = {
    name: 'git stash 做了什么', desc: '练习 4，在课程网站仓库里改了 README.md。git stash 把改动收起来，工作区回到干净状态。它其实建了两个提交，一个存暂存区，一个存工作区。refs/stash 指着它们。',
    code: { lang: "sh", title: "ex04-a 的命令（本机实测）", src: "echo \"local experiment\" >> README.md\ngit status --short\ngit stash\ngit log --all --graph --oneline | head -6\ngit stash list\ngit stash pop" },
    dataTitle: '工作区与 stash（本机实测）',
    data: { 'git status': '无', 'refs/stash': '无' },
    legend: [[C.info, '仓库里已有的提交'], [C.warn, 'stash 建的提交'], [C.teal, '工作区里的修改']],
    bg: function (d) { d.text(430, 26, 'stash = 两个临时提交 + 一个引用 refs/stash', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 }); },
    objects: {
      nM: node(SM[0], SM[1], '1d695c9', { opacity: 1 }), master: ref(SM[0], SM[1] + 44, 'master', { opacity: 1, w: 90 }),
      mod: { type: 'box', x: 200, y: 470, w: 250, h: 40, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.8, text: 'README.md（已修改）', mono: true, size: 13, weight: 750, color: C.fg, opacity: 0, trail: { n: 4, gap: 40 } },
      nI: node(SI[0], SI[1], 'c7c6627', { fill: C.warnW, stroke: C.warn }), nW: node(SW[0], SW[1], 'b54d8e1', { fill: C.warnW, stroke: C.warn }),
      tI: { type: 'text', x: SI[0], y: SI[1] - 30, text: 'index on master', size: 11.5, weight: 650, color: C.fg3, opacity: 0 },
      tW: { type: 'text', x: SW[0], y: SW[1] + 32, text: 'WIP on master', size: 11.5, weight: 650, color: C.fg3, opacity: 0 },
      eI: edge(SI[0] - 50, SI[1] + 10, SM[0] + 40, SM[1] - 18), eW1: edge(SW[0] - 50, SW[1], SM[0] + 50, SM[1]), eW2: edge(SW[0] - 40, SW[1] - 18, SI[0] + 40, SI[1] + 18),
      stash: ref(SW[0], SW[1] - 44, 'refs/stash', { fill: C.warn, stroke: C.warn, w: 100 })
    },
    steps: [
      { hl: [1, 2], say: '在克隆下来的课程网站仓库里，给 README.md 追加一行。git status 显示 “ M”：工作区有未提交的修改。', data: { 'git status': ' M README.md' },
        log: ['$ echo "local experiment" >> README.md', '$ git status --short', { s: ' M README.md', at: 600 }],
        set: { mod: { opacity: { to: 1, dur: 300 }, y: { from: 500, to: 470, dur: 500, ease: 'back' } } } },
      { hl: [3], say: 'git stash 之后，改动被收起来，工作区立刻干净了。提示里有 “WIP on master: 1d695c9 …”。说明它是基于当前提交保存的（本机实测）。', data: { 'git status': { v: '（干净）', at: 1300 }, 'refs/stash': { v: 'b54d8e1', at: 1300 } },
        log: ['$ git stash', { s: 'Saved working directory and index state WIP on master: 1d695c9 Fix overflow and horizontal scroll on mobile', at: 900 }],
        set: merge({ mod: { x: { to: SW[0], delay: 200, dur: 900, ease: 'inOut' }, y: { to: SW[1], delay: 200, dur: 900, ease: 'inOut' }, opacity: { to: 0, delay: 1000, dur: 200 } } }, show('nW', 1000), { tW: { opacity: { to: 1, delay: 1100, dur: 300 } } }, show('stash', 1200)) },
      { hl: [4], say: 'git log --all --graph 揭开了真相，stash 建了两个提交。c7c6627 保存暂存区（index on master）。b54d8e1 保存工作区。它有两个 parent，原提交和那个 index 提交。',
        log: ['$ git log --all --graph --oneline | head -6', { s: '*   b54d8e1 WIP on master: 1d695c9 Fix overflow …', at: 400 }, { s: '|\\  ', at: 450 }, { s: '| * c7c6627 index on master: 1d695c9 Fix overflow …', at: 500 }, { s: '|/  ', at: 550 }, { s: '* 1d695c9 Fix overflow and horizontal scroll on mobile', at: 600 }],
        set: merge(show('nI', 300), { tI: { opacity: { to: 1, delay: 400, dur: 300 } }, eI: { dash: { to: 1, delay: 500, dur: 400 } }, eW1: { dash: { to: 1, delay: 700, dur: 400 } }, eW2: { dash: { to: 1, delay: 850, dur: 400 } } }),
        fx: [{ type: 'stream', path: 'eW1', at: 800, n: 1, dur: 500, color: C.warn, labels: ['parent 1'] }, { type: 'stream', path: 'eW2', at: 950, n: 1, dur: 500, color: C.warn, labels: ['parent 2'] }] },
      { hl: [5], say: 'git stash list 列出所有收起来的改动，stash@{0} 是最近一次。可以连续 stash 多次，形成一个栈。',
        log: ['$ git stash list', { s: 'stash@{0}: WIP on master: 1d695c9 Fix overflow and horizontal scroll on mobile', at: 400 }],
        fx: [{ type: 'pulse', obj: 'stash', at: 300, color: C.warn }] },
      { hl: [6], say: 'git stash pop 把 b54d8e1 记下的改动放回工作区。然后删掉这条 stash，输出 Dropped refs/stash@{0}。README.md 又是 “ M” 了。', data: { 'git status': { v: ' M README.md', at: 1200 }, 'refs/stash': { v: '无', at: 1000 } },
        log: ['$ git stash pop', { s: 'Dropped refs/stash@{0} (b54d8e1f3b6877a14e908525332e07db9d930c01)', at: 900 }, { s: '$ git status --short', at: 1100 }, { s: ' M README.md', at: 1300 }],
        set: { mod: { opacity: { to: 1, delay: 200, dur: 200 }, x: { to: 200, delay: 200, dur: 900, ease: 'inOut' }, y: { to: 470, delay: 200, dur: 900, ease: 'inOut' } },
          stash: { opacity: { to: 0, delay: 900, dur: 300 } }, nW: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, nI: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, eW1: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, eW2: { opacity: { to: 0.3, delay: 1000, dur: 400 } }, eI: { opacity: { to: 0.3, delay: 1000, dur: 400 } } },
        fx: [{ type: 'ripple', obj: 'mod', at: 1150, color: C.teal }] },
      { hl: [6], say: '什么时候用？写到一半，要临时切去别的分支修个紧急 bug。或者 pull 之前，先把本地改动挪开。回来再 pop。stash 的提交被 drop 之后不再可达，迟早会被回收。',
        fx: [{ type: 'pulse', obj: 'nM', at: 300, color: C.info }] }
    ]
  };

  VZ.register({
    id: 'lab05-scrub', title: '改写历史：把 secret.txt 从每个提交里删掉',
    sources: [
      { t: '讲义练习 3', u: 'https://missing.csail.mit.edu/2026/version-control/#exercises' },
      { t: 'GitHub Docs · Removing sensitive data', u: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository' },
      { t: 'git filter-branch 文档', u: 'https://git-scm.com/docs/git-filter-branch' }
    ],
    note: '哈希和输出是本机真跑的（ex03-a 和 ex03-b）。新旧提交的上下排布和 blob 的连线是示意。',
    scenes: [sceneScrub]
  });
  VZ.register({
    id: 'lab05-stash', title: 'git stash：两个临时提交加一个引用',
    sources: [
      { t: '讲义练习 4', u: 'https://missing.csail.mit.edu/2026/version-control/#exercises' },
      { t: 'git stash 文档', u: 'https://git-scm.com/docs/git-stash' }
    ],
    note: '输出是在课程网站仓库的克隆上真跑的（ex04-a）。stash 两个提交的哈希每次运行都不同。',
    scenes: [sceneStash]
  });
})();
