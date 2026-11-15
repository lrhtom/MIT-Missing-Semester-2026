/* ch08 · 协作的往返：贡献、bug 报告、最小复现、评审与提问 —— 可视化演示
 * 依据：Lecture 8 视频 20:52–42:42（贡献、bug 报告、最小复现、PR、fork、AI 生成的 PR）、42:42–53:40（代码评审）、
 *       54:14–58:33（提问）；讲义 beyond-code.md「Collaboration」「Education」。
 * 实测：控制台里的英文输出全部来自 labs/data/lab08.js（练习生成脚本 在本机真跑 issue_check.py、reduce.py、
 *       mre.py、review_check.py、question_check.py、left_join.py 的结果）。
 * 示意：GitHub 上 fork → PR 的具体操作步骤属补充（视频只讲了 PR 的概念）；“每缺一项多一轮追问”“每轮约 3 天”是示意数字；
 *       评审卡片上的中文是讲义英文示例的翻译。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: text, size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, text: text || '', fill: C.bg, stroke: C.line, sw: 1.5, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function P(d, col) { return { type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }; }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }

  /* ---------- 场景 1：一次贡献的完整流程 ---------- */
  var ST = [['Open', 130], ['需要修改', 330], ['已批准', 530], ['已合并', 730]], SY = 470;
  var sceneFlow = {
    name: '贡献流程', desc: '从读 CONTRIBUTING.md 到 PR 被合并。代码在上游仓库、你的副本、你的电脑之间往返。PR 的状态随评审变化。',
    code: { lang: 'sh', title: '用本地的裸仓库模拟一遍（本机真跑）', src: [
      '# 你这边', 'git clone --bare upstream fork.git     # 模拟 GitHub 上点 Fork', 'git clone fork.git work && cd work', 'git switch -c fix-title',
      'git commit -am "Use removesuffix() so titles keep…"', 'git push -u origin fix-title', 'git request-pull main ../fork.git fix-title',
      '# 维护者那边（在 upstream 里）', 'git pull --no-ff --no-edit ../fork.git fix-title', 'git log --oneline --graph'].join('\n') },
    dataTitle: 'PR 状态',
    data: { '状态': '无', '提交数': 0, 'CI': '无', '评审意见': '无' },
    legend: [[C.info, '上游仓库 / 维护者'], [C.teal, '你的副本（fork）'], [C.data, '代码与提交的流动'], [C.ok, '通过 / 合并'], [C.warn, '需要修改']],
    bg: function (d) {
      d.text(430, 24, '上游仓库  ⇄  你的副本  ⇄  你的电脑', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.node(30, 74, 200, 70, '上游仓库', 'upstream · 维护者', { fill: C.infoW, stroke: C.info });
      d.node(330, 74, 200, 70, '你的副本', 'fork（GitHub 上）', { fill: C.tealW, stroke: C.teal });
      d.node(630, 74, 200, 70, '你的电脑', 'git clone 的本地仓库', { fill: C.bg2, stroke: C.line });
      ST.forEach(function (s, i) {
        d.rect(s[1] - 72, SY - 22, 144, 44, { fill: C.bg2, stroke: C.line, rx: 22 });
        d.text(s[1], SY, s[0], { anchor: 'middle', size: 13, weight: 700, color: C.fg2 });
        if (i < ST.length - 1) d.line(s[1] + 74, SY, ST[i + 1][1] - 76, SY, { stroke: C.line, sw: 1.6, arrow: 'fg3' });
      });
      d.path('M330,' + (SY + 24) + ' C330,' + (SY + 60) + ' 130,' + (SY + 60) + ' 130,' + (SY + 24), { stroke: C.line, sw: 1.4, dash: '4 4', arrow: 'fg3' });
      d.text(230, SY + 62, '再 push 一次 → 回到待评审', { anchor: 'middle', size: 11.5, color: C.fg3 });
      d.text(430, SY - 62, 'PR 的状态（示意）', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: {
      pUF: P('M232,96 C270,66 292,66 328,96', C.teal), pFL: P('M532,96 C570,66 592,66 628,96', C.teal),
      pLF: P('M628,124 C592,156 570,156 532,124', C.data), pFU: P('M328,124 C292,156 270,156 232,124', C.data),
      doc1: B(100, 190, 150, 30, 'CONTRIBUTING.md', { mono: true, size: 12, fill: C.bg, stroke: C.info, color: C.info, opacity: 0 }),
      doc2: B(190, 230, 100, 30, 'LICENSE', { mono: true, size: 12, fill: C.bg, stroke: C.info, color: C.info, opacity: 0 }),
      br: B(730, 190, 170, 30, '分支 fix-title', { mono: true, size: 12, fill: C.bg, stroke: C.data, color: C.data, opacity: 0 }),
      k1: B(730, 232, 210, 30, 'b407367 removesuffix()', { mono: true, size: 12, fill: C.dataW, stroke: C.data, opacity: 0 }),
      k2: B(730, 274, 210, 30, '按评审意见再提交（示意）', { size: 12, fill: C.dataW, stroke: C.data, opacity: 0 }),
      pr: B(430, 230, 220, 54, 'PR：为什么需要这个改动', { size: 12.5, fill: C.bg, stroke: C.data, opacity: 0 }),
      ci: B(130, 310, 220, 34, 'CI：格式 √ lint √ 测试 √', { size: 12, fill: C.okW, stroke: C.ok, color: C.ok, opacity: 0 }),
      rv: B(130, 360, 220, 34, '评审：2 条必须改，1 条 nit', { size: 12, fill: C.warnW, stroke: C.warn, color: C.warn, opacity: 0 }),
      tok: { type: 'circle', x: ST[0][1], y: SY - 34, r: 10, fill: C.data, stroke: C.data, sw: 1, opacity: 0, trail: { n: 5, gap: 40 } },
      merged: B(430, 300, 300, 36, '维护者从此要长期维护这段代码', { size: 12.5, fill: C.bg, stroke: C.ok, color: C.ok, opacity: 0 })
    },
    steps: [
      { say: '动手前先读 CONTRIBUTING.md，里面有流程、测试方法和代码约定。再读 LICENSE。合并后，你的代码按项目的许可证发布。见视频 31:36 到 32:46。',
        set: { doc1: merge(show(200), { y: { from: 170, to: 190, delay: 200, dur: 500, ease: 'back' } }), doc2: merge(show(500), { y: { from: 210, to: 230, delay: 500, dur: 500, ease: 'back' } }) },
        fx: [{ type: 'pulse', x: 130, y: 109, at: 100, color: C.info }] },
      { say: 'fork 得到一份你有写权限的副本，再 clone 到本地。GitHub 上 fork 是点个按钮。这里用 git clone --bare 在本机模拟，属补充。', hl: [2, 3],
        log: ['$ git clone --bare upstream fork.git', { s: "Cloning into bare repository 'fork.git'...", at: 500 }, { s: '$ git clone fork.git work', at: 1000 }, { s: "Cloning into 'work'...", at: 1300 }],
        set: { pUF: { dash: { to: 1, dur: 600 } }, pFL: { dash: { to: 1, delay: 900, dur: 600 } } },
        fx: [{ type: 'stream', path: 'pUF', at: 300, n: 5, dur: 1000, color: C.teal }, { type: 'stream', path: 'pFL', at: 1200, n: 5, dur: 1000, color: C.teal }] },
      { say: '新建分支，只做一件事。改动要小而独立，能单独评审。提交信息写清 why。新手最好从错别字和文档改进开始（讲义）。', hl: [4, 5],
        log: ['$ git switch -c fix-title', { s: "Switched to a new branch 'fix-title'", at: 300 }, { s: '$ git commit -am "Use removesuffix() so titles keep…"', at: 700 }],
        data: { '提交数': { v: 1, at: 900 } },
        set: { br: merge(show(100), { x: { from: 780, to: 730, delay: 100, dur: 500, ease: 'out' } }), k1: merge(show(700), { y: { from: 210, to: 232, delay: 700, dur: 500, ease: 'back' } }) },
        fx: [{ type: 'ripple', obj: 'k1', at: 1100, color: C.data }] },
      { say: 'push 到你的副本，再请上游拉取。git 自带的 request-pull，生成的正是一封“带附件的邮件”。里面写着从哪个提交起、去哪拉、有哪些提交。GitHub 的 PR 把它做成了网页（视频 34:29）。', hl: [6, 7],
        log: ['$ git push -u origin fix-title', { s: 'To …/fork.git（路径已省略）', at: 300, cls: 'dim' }, { s: ' * [new branch]      fix-title -> fix-title', at: 400 }, { s: '$ git request-pull main ../fork.git fix-title', at: 800 }, { s: 'are available in the Git repository at:', at: 1100 }, { s: '  ../fork.git fix-title', at: 1200 }, { s: 'Alyssa P. Hacker (1):', at: 1400 }, { s: '      Use removesuffix() so titles keep their last letters', at: 1500 }],
        data: { '状态': { v: 'Open', at: 1500 } },
        set: { pLF: { dash: { to: 1, dur: 600 } }, pFU: { dash: { to: 1, delay: 800, dur: 600 } }, pr: merge(show(1300), { s: { from: 0.8, to: 1, delay: 1300, dur: 500, ease: 'back' } }),
          tok: show(1500) },
        fx: [{ type: 'stream', path: 'pLF', at: 300, n: 3, dur: 900, color: C.data, labels: ['b407367'] }, { type: 'stream', path: 'pFU', at: 1100, n: 3, dur: 900, color: C.data, labels: ['PR'] }] },
      { say: 'CI 先自动检查，第 9 讲会讲。维护者评审后，提出必须改的问题。状态变成“需要修改”。记住，评审针对的是代码，不是你（讲义）。这一步和下一步是示意，本地模拟里没有。', hl: [],
        data: { 'CI': { v: '通过', at: 600 }, '评审意见': { v: '2 必须改 + 1 nit', at: 1200 }, '状态': { v: '需要修改', at: 1400 } },
        set: { ci: merge(show(300), { x: { from: 100, to: 130, delay: 300, dur: 500, ease: 'out' } }), rv: merge(show(1000), { x: { from: 100, to: 130, delay: 1000, dur: 500, ease: 'out' } }),
          tok: { x: { to: ST[1][1], delay: 1300, dur: 700, ease: 'inOut' }, fill: { to: C.warn, delay: 1300, dur: 300 }, stroke: { to: C.warn, delay: 1300, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'rv', at: 1300, color: C.warn }] },
      { say: '在本地按意见修改，再提交，再 push。PR 自动更新，回到待评审。第二轮通过。', hl: [5, 6],
        data: { '提交数': { v: 2, at: 500 }, '评审意见': { v: '已全部处理', at: 1600 }, '状态': { v: '已批准', at: 2300 } },
        set: { k2: merge(show(200), { y: { from: 252, to: 274, delay: 200, dur: 500, ease: 'back' } }), rv: { text: { to: '评审：已全部处理 √', delay: 1600 }, fill: { to: C.okW, delay: 1600, dur: 300 }, stroke: { to: C.ok, delay: 1600, dur: 300 }, color: { to: C.ok, delay: 1600, dur: 300 } },
          tok: { x: { to: ST[2][1], delay: 1900, dur: 900, ease: 'inOut' }, fill: { to: C.ok, delay: 1900, dur: 300 }, stroke: { to: C.ok, delay: 1900, dur: 300 } } },
        fx: [{ type: 'stream', path: 'pLF', at: 500, n: 2, dur: 800, color: C.data, labels: ['a2'] }, { type: 'stream', path: 'pFU', at: 1100, n: 2, dur: 800, color: C.data }] },
      { say: '维护者拉取并合并，--no-ff 会留下一个合并提交。从这一刻起，维护者要长期维护这段代码。你却可以一走了之。所以你得说服他们，这值得（视频 35:01）。', hl: [9, 10],
        log: ['$ git pull --no-ff --no-edit ../fork.git fix-title', { s: "Merge made by the 'ort' strategy.", at: 400 }, { s: '$ git log --oneline --graph', at: 800 }, { s: "*   ee5afc8 Merge branch 'fix-title' of ../fork", at: 1000, cls: 'ok' }, { s: '|\\', at: 1050 }, { s: '| * b407367 Use removesuffix() so titles keep their last letters', at: 1100 }, { s: '|/', at: 1150 }, { s: '* c862d6f Add report', at: 1200 }],
        data: { '状态': { v: '已合并', at: 700 } },
        set: { tok: { x: { to: ST[3][1], dur: 700, ease: 'inOut' } }, merged: merge(show(800), { y: { from: 328, to: 300, delay: 800, dur: 500, ease: 'out' } }), pr: { stroke: { to: C.ok, delay: 600, dur: 300 } } },
        fx: [{ type: 'burst', x: ST[3][1], y: SY - 34, at: 700, color: C.ok }, { type: 'ripple', x: 130, y: 109, at: 900, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：bug 报告的信息完整度 ---------- */
  var SLOT = ['搜过重复 issue', '环境（系统、版本）', '期望行为', '实际行为', '编号的复现步骤', '最小示例（代码块）', '已经尝试过什么'];
  var IY0 = 150, IDY = 44, MX = 690, MTOP = 130, MBOT = 430;
  function issueObjs() {
    var o = {
      title: T(44, 84, 'Report is broken!!!', { size: 16, weight: 800, mono: true }),
      body: T(44, 112, 'The titles are wrong. Please fix ASAP. +1', { size: 12, mono: true, color: C.fg2 }),
      msg: B(MX, MTOP, 200, 34, '', { size: 12.5, fill: C.bg, stroke: C.info, color: C.info, opacity: 0, trail: { n: 4, gap: 40 } }),
      days: T(560, 280, '', { num: 0, pre: '已过去 ', post: ' 天（示意）', size: 14, weight: 750, color: C.warn, anchor: 'middle', opacity: 0 }),
      tip1: B(700, 250, 230, 30, '点赞代替 “+1” 评论', { size: 12, fill: C.bg, stroke: C.teal, color: C.teal, opacity: 0 }),
      tip2: B(700, 290, 230, 30, '几周后再礼貌地跟进', { size: 12, fill: C.bg, stroke: C.teal, color: C.teal, opacity: 0 }),
      tip3: B(700, 330, 230, 30, '安全漏洞：私下报告', { size: 12, fill: C.bg, stroke: C.bad, color: C.bad, opacity: 0 })
    };
    SLOT.forEach(function (s, i) {
      o['s' + i] = T(70, IY0 + i * IDY, s, { size: 13, color: C.fg2 });
      o['m' + i] = T(44, IY0 + i * IDY, '·', { size: 17, weight: 800, color: C.fg3, anchor: 'middle' });
    });
    return o;
  }
  function trip(q, a, at, d0, d1) {
    return { msg: { text: { to: q, delay: at }, opacity: { from: 0, to: 1, delay: at, dur: 200 }, y: { from: MTOP + 40, to: MBOT - 40, delay: at + 100, dur: 800, ease: 'inOut' },
      stroke: { to: C.info, delay: at, dur: 0 }, color: { to: C.info, delay: at, dur: 0 } },
      days: { num: { from: d0, to: d1, delay: at + 100, dur: 1700 } } };
  }
  function tripBack(a, at) {
    return { text: { to: a, delay: at }, y: { to: MTOP + 40, delay: at + 100, dur: 800, ease: 'inOut' }, stroke: { to: C.data, delay: at, dur: 0 }, color: { to: C.data, delay: at, dur: 0 } };
  }
  var sceneIssue = {
    name: 'bug 报告', desc: '维护者的时间远比用户少。bug 报告每缺一项信息，就要靠一轮追问补回来。或者干脆没人理。',
    dataTitle: '这份报告',
    data: { '清单完整度': '0 / 7', '维护者能复现吗': '不能' },
    legend: [[C.bad, '缺失'], [C.ok, '具备'], [C.info, '维护者的追问'], [C.data, '你的回答'], [C.warn, '耗时（示意）']],
    bg: function (d) {
      d.text(430, 24, '一份 issue 里应该有什么（讲义的清单）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(24, 56, 400, 470, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.node(MX - 90, MTOP - 70, 180, 50, '维护者', '人少、时间少', { fill: C.infoW, stroke: C.info, size: 14 });
      d.node(MX - 90, MBOT, 180, 50, '你（提交者）', '', { fill: C.dataW, stroke: C.data, size: 14 });
      d.line(MX, MTOP - 16, MX, MBOT - 4, { stroke: C.line, sw: 1.2, dash: '3 5' });
    },
    objects: issueObjs,
    steps: [
      { say: '一份典型的坏 issue。标题全是感叹号，正文只有“标题错了、快修”。后面再跟一个 +1。清单 7 项一项都没有。',
        set: (function () { var s = {}; SLOT.forEach(function (x, i) { s['m' + i] = { text: { to: '×', delay: 200 + i * 120 }, color: { to: C.bad, delay: 200 + i * 120, dur: 200 } }; s['s' + i] = { color: { to: C.fg3, delay: 200 + i * 120, dur: 200 } }; }); return s; })(),
        fx: [{ type: 'shake', obj: 'title', at: 300 }] },
      { say: '维护者没法复现，只能先问：什么系统？什么版本？等你回复……',
        set: merge(trip('什么系统？哪个版本？', '', 0, 0, 3), { days: merge(show(0), { num: { from: 0, to: 3, delay: 100, dur: 1700 } }) }),
        fx: [{ type: 'float', x: MX, y: MBOT - 60, at: 1000, text: '…', color: C.data }] },
      { say: '你回答了版本。对方再问：你期望看到什么？实际看到的是什么？',
        set: { msg: merge(tripBack('Windows，3.13', 0), {}), days: { num: { from: 3, to: 6, delay: 100, dur: 1500 } } } },
      { say: '又一轮：怎么一步步复现？有没有最小的例子？每缺一项，往往就多一轮追问。',
        set: merge(trip('怎么复现？有最小例子吗？', '', 0, 6, 9)),
        eq: ['缺 7 项 → 至少 7 次追问', { s: '每轮按 3 天算（示意）：≈ 3 周才开始修', at: 600 }] },
      { say: 'issue_check.py 用讲义的清单逐项检查：坏的那份 0/7（本机实测）。很多维护者不会等三周，而是直接关掉。',
        log: ['$ python ex04/issue_check.py ex04/issue_bad.txt ex04/issue_good.txt', { s: '== ex04/issue_bad.txt: 0/7 items present', at: 300 }, { s: '   => at least 7 follow-up question(s) before anyone can debug it', at: 500, cls: 'err' }],
        set: { msg: hide(), days: { color: { to: C.bad, dur: 300 } } }, fx: [{ type: 'shake', obj: 'days', at: 400 }] },
      { say: '好的那份先说明搜过重复。再给环境、编号步骤和一行最小示例。还写了期望与实际、试过什么，7/7。',
        data: { '清单完整度': { v: '7 / 7', at: 1300 }, '维护者能复现吗': { v: '能，一次就够', at: 1500 } },
        log: [{ s: '== ex04/issue_good.txt: 7/7 items present', at: 1300, cls: 'ok' }],
        set: (function () {
          var s = { title: { text: 'Report titles lose letters: “analytics.csv” → “Analyti”', size: { to: 13, dur: 0 } }, body: { text: 'Windows 11, Python 3.13.5 · steps · repro · expected/actual …' }, days: hide() };
          SLOT.forEach(function (x, i) { s['m' + i] = { text: { to: '√', delay: 200 + i * 150 }, color: { to: C.ok, delay: 200 + i * 150, dur: 200 } }; s['s' + i] = { color: { to: C.fg, delay: 200 + i * 150, dur: 200 } }; });
          return s;
        })(),
        fx: [{ type: 'ripple', x: 220, y: 290, at: 1300, color: C.ok }] },
      { say: '维护者第一次读就能复现，直接开始修。最小复现省下的，正是维护者要做的活（视频 25:41）。',
        set: { msg: { text: '复现了，正在修', opacity: { from: 0, to: 1, dur: 200 }, y: { from: MTOP + 40, to: MBOT - 40, delay: 100, dur: 800, ease: 'inOut' }, stroke: { to: C.ok, dur: 0 }, color: { to: C.ok, dur: 0 } } },
        fx: [{ type: 'burst', x: MX, y: MBOT - 40, at: 900, color: C.ok }] },
      { say: '其他礼仪：别发“+1”或“我也是”。它们只会打扰所有订阅者。表态就点个赞。几周后再礼貌跟进。安全漏洞先私下联系维护者，看 SECURITY.md。',
        set: { msg: hide(), tip1: merge(show(200), { x: { from: 760, to: 700, delay: 200, dur: 500, ease: 'out' } }), tip2: merge(show(600), { x: { from: 760, to: 700, delay: 600, dur: 500, ease: 'out' } }), tip3: merge(show(1000), { x: { from: 760, to: 700, delay: 1000, dur: 500, ease: 'out' } }) } }
    ]
  };

  /* ---------- 场景 3：最小可复现示例 ---------- */
  var RL = [
    ['"""Print a one-line summary …"""', 'doc', 1], ['import csv', 'k'], ['import io', 'k'], ['import sys', 'k'], ['', 'blank', 1], ['EXPORTS = {', 'k'],
    ['  "sales.csv": "region,amount…",', 'data', 2], ['  "analytics.csv": "page,views…",', 'k'], ['  "costs.csv": "item,amount…",', 'data', 2], ['}', 'k'],
    ['', 'blank', 1], ['', 'blank', 1], ['def title_for(filename):', 'k'], ['  # Turn "sales.csv" into "Sales"', 'doc', 2], ['  return filename.rstrip(".csv").title()', 'bug'],
    ['', 'blank', 1], ['', 'blank', 1], ['def total(text, column):', 'k'], ['  rows = csv.DictReader(…)', 'k'], ['  return sum(int(row[column]) …)', 'k'],
    ['', 'blank', 1], ['', 'blank', 1], ['def main():', 'k'], ['  for name, text in sorted(…):', 'k'], ['    column = "views" if … else "amount"', 'k'],
    ['    print(f"{title_for(name):<10} …")', 'k'], ['  return 0', 'doc', 2], ['', 'blank', 1], ['', 'blank', 1], ['if __name__ == "__main__":', 'k'], ['  sys.exit(main())', 'k']
  ];
  var RY0 = 66, RDY = 14.6;
  function redObjs() {
    var o = {};
    RL.forEach(function (r, i) {
      var bug = r[1] === 'bug', blank = r[1] === 'blank';
      o['r' + i] = B(190, RY0 + i * RDY, 330, 12.5, r[0], { mono: true, size: 11, weight: 500, rx: 3, sw: bug ? 1.6 : 1,
        fill: bug ? C.badW : blank ? 'none' : r[1] === 'data' ? C.tealW : C.bg2, stroke: bug ? C.bad : blank ? C.line1 : C.line, color: bug ? C.bad : C.fg2, opacity: 0 });
    });
    o.lamp = { type: 'circle', x: 620, y: 140, r: 26, fill: C.bg3, stroke: C.line, sw: 2, text: '?', color: C.fg2, size: 16 };
    o.lampL = T(660, 140, '症状：输出含 analyti，且后面不是 cs', { size: 12, color: C.fg2 });
    o.cnt = T(620, 250, '', { num: 31, pre: '', post: ' 行', size: 30, weight: 800, color: C.data, anchor: 'middle' });
    o.mre = B(640, 420, 380, 44, 'print("analytics.csv".rstrip(".csv"))', { mono: true, size: 12.5, fill: C.badW, stroke: C.bad, opacity: 0 });
    return o;
  }
  var KEEP = []; RL.forEach(function (r, i) { if (!r[2]) KEEP.push(i); });
  function removeSet(pass, at) {
    var s = {}, n = 0;
    RL.forEach(function (r, i) { if (r[2] === pass) { s['r' + i] = { x: { to: 560, delay: at + n * 70, dur: 600, ease: 'in' }, opacity: { to: 0, delay: at + n * 70 + 350, dur: 250 } }; n++; } });
    return s;
  }
  var sceneMre = {
    name: '最小复现', desc: '最小可复现示例从你的真实程序出发。删掉一切和 bug 无关的东西，删到删不动为止。这本来是维护者必须做的活。',
    code: { lang: 'py', title: 'ex05/mre.py（最终的最小复现，本机真跑）', src: '# Minimal reproducible example: "analytics.csv" is shown as "Analyti"\nprint("analytics.csv".rstrip(".csv"))        # expected: analytics\nprint("analytics.csv".removesuffix(".csv"))  # Python 3.9+: removes an exact suffix' },
    dataTitle: '缩减进度',
    data: { '还剩': '31 行', 'bug 还在吗': '无' },
    bg: function (d) {
      d.text(430, 24, 'report.py：每删一块就重跑一次，bug 还在才接受删除', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(620, 290, '程序长度', { anchor: 'middle', size: 12, color: C.fg3 });
    },
    objects: redObjs,
    steps: [
      { say: 'report.py 共 31 行，运行后 analytics.csv 的标题变成了 Analyti。把整个项目丢给维护者？他们多半会忽略你（视频 25:06）。',
        log: ['$ python report.py', { s: 'Analyti      1350', at: 900, cls: 'err' }, { s: 'Cost          345', at: 1000 }, { s: 'Sale          200', at: 1100 }],
        data: { 'bug 还在吗': { v: '是', at: 900 } },
        set: (function () { var s = { lamp: { fill: { to: C.badW, delay: 900, dur: 300 }, stroke: { to: C.bad, delay: 900, dur: 300 }, text: { to: '!', delay: 900 }, color: { to: C.bad, delay: 900, dur: 200 } } };
          RL.forEach(function (r, i) { s['r' + i] = { opacity: { to: 1, delay: i * 25, dur: 200 }, x: { from: 160, to: 190, delay: i * 25, dur: 400, ease: 'out' } }; }); return s; })(),
        fx: [{ type: 'pulse', obj: 'r14', at: 1000, color: C.bad }] },
      { say: 'reduce.py 先试着大块删除，再逐渐缩小块。每删一次都重新运行。文档字符串和 9 个空行删掉后，bug 还在，接受。',
        log: ['$ python reduce.py report.py', { s: 'removed: """Print a one-line summary for each CSV export (demo program with a bug)."""', at: 900 }],
        set: merge(removeSet(1, 200), { cnt: { num: { to: 21, delay: 400, dur: 900 } } }),
        data: { '还剩': { v: '21 行', at: 1200 } },
        fx: [{ type: 'pulse', obj: 'lamp', at: 1300, color: C.bad }] },
      { say: '无关的 sales/costs 数据、注释、return 0 也删得掉：bug 仍然出现。',
        log: [{ s: 'removed: "sales.csv": "region,amount\\nnorth,120\\nsouth,80\\n",', at: 300 }, { s: 'removed: "costs.csv": "item,amount\\nservers,300\\nlicenses,45\\n",', at: 500 }, { s: 'removed: # Turn "sales.csv" into "Sales"', at: 700 }, { s: 'removed: return 0', at: 900 }],
        set: merge(removeSet(2, 200), { cnt: { num: { to: 17, delay: 400, dur: 700 } } }),
        data: { '还剩': { v: '17 行', at: 1000 } }, fx: [{ type: 'pulse', obj: 'lamp', at: 1100, color: C.bad }] },
      { say: '剩 17 行，机械删行到此为止。csv、total() 虽然和 bug 无关，但 main 还要调用它们。单删哪一行，程序都会报错。',
        log: [{ s: '--- reduced.py: 17 lines left ---', at: 900 }],
        set: (function () { var s = {}; KEEP.forEach(function (i, k) { s['r' + i] = { y: { to: RY0 + 40 + k * 22, delay: k * 30, dur: 600, ease: 'inOut' } }; }); return s; })(),
        eq: ['31 行 → 17 行（自动，删了 5 个非空行 + 9 个空行）'] },
      { say: '人工收尾。看懂了 bug 在 title_for 里，就把其余结构全部拿掉。只留触发 bug 的那一个调用。',
        set: (function () { var s = { mre: merge(show(900), { s: { from: 0.7, to: 1, delay: 900, dur: 500, ease: 'back' } }), cnt: { num: { to: 1, delay: 600, dur: 800 } } };
          KEEP.forEach(function (i, k) { s['r' + i] = i === 14 ? { x: { to: 640, dur: 800, ease: 'inOut' }, y: { to: 420, dur: 800, ease: 'inOut' }, opacity: { to: 0, delay: 800, dur: 200 } } : { y: { to: 420, delay: k * 20, dur: 700, ease: 'in' }, x: { to: 640, delay: k * 20, dur: 700, ease: 'in' }, opacity: { to: 0, delay: 400 + k * 20, dur: 300 } }; });
          return s; })(),
        data: { '还剩': { v: '1 行', at: 900 } }, eq: { s: '17 行 → 1 行（人工）', at: 900 } },
      { say: '一行就能复现：期望 analytics，实际 analyti。写最小复现的过程，往往就让你看懂了 bug。rstrip 的参数是“字符集合”，不是后缀。', hl: [2, 3],
        log: ['$ python mre.py', { s: 'analyti', at: 400, cls: 'err' }, { s: 'analytics', at: 600, cls: 'ok' }],
        eq: [{ s: '".csv" 被当成字符集合 {. c s v}', at: 300 }, { s: '从右往左删：v s c . s c → 遇到 i 停下', at: 900 }, { s: 'removesuffix(".csv") 才是“去掉后缀”', at: 1500, cls: 'ok' }],
        fx: [{ type: 'ripple', obj: 'mre', at: 400, color: C.bad }] }
    ]
  };

  /* ---------- 场景 4：评审往返 ---------- */
  var CARDS = [
    ['你写的代码很乱。', '这个函数不好懂。', '针对人', '针对代码'],
    ['这里别用全局变量。', '能把全局变量换成 config dataclass 吗？这样测试能并行跑。', '只说不要', '替代方案 + 原因'],
    ['处理一下 null 的情况。', '如果这里传入 null 会怎样？', '命令', '提问'],
    ['这里考虑用个常量。', '这里考虑用个常量，这样能按环境调整超时。', '缺原因', '有原因']
  ];
  var CX = 600, CY0 = 92, CDY = 62;
  function reviewObjs() {
    var o = {};
    CARDS.forEach(function (c, i) {
      o['c' + i] = B(CX, CY0 + i * CDY, 450, 44, c[0], { size: 12.5, fill: C.badW, stroke: C.bad, opacity: 0, x: CX + 60 });
      o['t' + i] = B(CX + 190, CY0 + i * CDY - 26, 120, 20, c[2], { size: 11, rx: 10, fill: C.bg, stroke: C.bad, color: C.bad, opacity: 0 });
    });
    o.nit = B(CX, CY0 + 4 * CDY, 450, 44, 'nit: 叫 retry_timeout_s 能一眼看出单位', { size: 12.5, fill: C.bg, stroke: C.warn, color: C.fg, opacity: 0, x: CX + 60 });
    o.praise = B(CX, CY0 + 5 * CDY, 450, 44, 'Nice：解析和 I/O 分开了，很好测。', { size: 12.5, fill: C.okW, stroke: C.ok, opacity: 0, x: CX + 60 });
    for (var k = 0; k < 14; k++) o['d' + k] = B(60 + (k % 7) * 36, 380 + Math.floor(k / 7) * 30, 28, 20, '', { rx: 4, fill: C.warnW, stroke: C.warn, opacity: 0, s: 0.5 });
    o.ai = B(185, 470, 280, 40, 'AI 评审：只看到描述 + diff', { size: 12.5, fill: C.infoW, stroke: C.info, color: C.info, opacity: 0 });
    return o;
  }
  function better(i, at) {
    var s = {}, c = CARDS[i];
    s['c' + i] = { text: { to: c[1], delay: at + 250 }, fill: { to: C.okW, delay: at, dur: 400 }, stroke: { to: C.ok, delay: at, dur: 400 }, s: { from: 0.94, to: 1, delay: at, dur: 500, ease: 'back' } };
    s['t' + i] = { text: { to: c[3], delay: at + 250 }, stroke: { to: C.ok, delay: at, dur: 300 }, color: { to: C.ok, delay: at, dur: 300 }, w: { to: 136, delay: at, dur: 300 } };
    return s;
  }
  var sceneReview = {
    name: '评审往返', desc: '评审是关于代码的异步对话。同一个意见换一种写法，作者的感受会完全不同。修改速度也会不同。',
    dataTitle: '这轮评审',
    data: { '阻塞性意见': '无', 'nit': '无', '肯定': '无' },
    bg: function (d) {
      d.text(430, 24, '左：一个 PR 的 diff（示意）  右：评审意见', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(24, 52, 330, 300, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.text(40, 76, 'handler.py', { size: 12, mono: true, color: C.fg3, weight: 700 });
      ['+CONFIG = {"timeout": 30}', '+', '+def handle(x):', '+    return x.value * 2', '+', '+def parse(raw):', '+    ...'].forEach(function (l, i) { d.text(40, 106 + i * 30, l, { size: 13, mono: true, color: C.ok }); });
    },
    objects: reviewObjs,
    steps: [
      { say: '先看四条典型的坏评论，是讲义反例的中文翻译。它们针对人、只说“不要”、下命令、没有原因。',
        log: ['$ python ex06/review_check.py ex06/comments.txt', { s: 'You wrote confusing code.      about-person <- rewrite: what should change, and why?', at: 600 }, { s: "Don't use globals here.        <- rewrite: what should change, and why?", at: 800 }, { s: 'Handle the null case.          <- rewrite: what should change, and why?', at: 1000 }],
        set: (function () { var s = {}; CARDS.forEach(function (c, i) { s['c' + i] = merge(show(i * 200), { x: { to: CX, delay: i * 200, dur: 500, ease: 'out' } }); s['t' + i] = show(400 + i * 200); }); return s; })() },
      { say: '评审的是代码，不是人。“你写的代码很乱”改成“这个函数不好懂”。视频 43:17 说，评审的话很容易像在评判人。',
        set: better(0, 0), fx: [{ type: 'ripple', obj: 'c0', at: 400, color: C.ok }] },
      { say: '给出能动手的替代方案，并解释原因。别只说“别用全局变量”。要说“换成 config dataclass，这样测试能并行”（视频 45:34）。',
        log: [{ s: 'Can you replace these globals with a config dataclass, so  question explains-why has-alternative', at: 500, cls: 'ok' }],
        set: better(1, 0), fx: [{ type: 'ripple', obj: 'c1', at: 400, color: C.ok }] },
      { say: '用提问代替命令：“如果这里传入 null 会怎样？”意思一样，但这是一起想问题。不是指责对方没想到（视频 46:16）。再把“为什么”补上。',
        log: [{ s: 'What happens if X is null here?                            question', at: 400, cls: 'ok' }],
        set: merge(better(2, 0), better(3, 700)), fx: [{ type: 'ripple', obj: 'c2', at: 400, color: C.ok }, { type: 'ripple', obj: 'c3', at: 1100, color: C.ok }] },
      { say: '分清必须改的和可改可不改的。后者用 “nit:” 开头（视频 49:47）。作者就能先处理阻塞项。也别忘了夸做得好的地方（视频 50:18）。',
        data: { '阻塞性意见': '4', 'nit': { v: '1', at: 400 }, '肯定': { v: '1', at: 1000 } },
        set: { nit: merge(show(200), { x: { to: CX, delay: 200, dur: 500, ease: 'out' } }), praise: merge(show(800), { x: { to: CX, delay: 800, dur: 500, ease: 'out' } }) },
        fx: [{ type: 'burst', obj: 'praise', at: 1300, color: C.ok }] },
      { say: '别留太多。改掉前一半之后，后一半往往已经不相关了。同一类问题评一次，再说明全局约定就行。见视频 48:00 到 48:36。',
        set: (function () { var s = {}; for (var k = 0; k < 14; k++) s['d' + k] = { opacity: { to: k % 2 ? 0.25 : 1, delay: k * 60, dur: 250 }, s: { to: 1, delay: k * 60, dur: 400, ease: 'back' }, stroke: { to: k % 2 ? C.line : C.warn, delay: 1200, dur: 300 } }; return s; })(),
        eq: ['讲师的例子：留 100 条评论', { s: '改完前 50 条 → 另外 50 条已经失效', at: 900 }, { s: '作者累了、也分不清哪条最重要', at: 1500 }] },
      { say: 'AI 评审可以做第一轮。但它只看到描述和 diff，是“零上下文”的。它看不到项目方向和兼容性策略。所以代替不了人的评审（视频 51:53）。',
        set: (function () { var s = { ai: merge(show(200), { y: { from: 500, to: 470, delay: 200, dur: 500, ease: 'out' } }) }; for (var k = 0; k < 14; k++) s['d' + k] = hide(0, 300); return s; })(),
        fx: [{ type: 'pulse', x: 189, y: 200, at: 700, color: C.info }] }
    ]
  };

  /* ---------- 场景 5：提问 ---------- */
  var QS = ['How do SQL joins work?', 'Does a LEFT JOIN include rows where the right table has no match?', 'I think a LEFT JOIN keeps every left row … I read the SQLite docs. Is that still true when ON is always false?'];
  var STU = ['1 alyssa', '2 ben', '3 cy'], LAB = ['1 lab01', '1 lab02', '3 lab01'];
  function qObjs() {
    var o = { q: B(430, 96, 800, 50, QS[0], { mono: true, size: 13, fill: C.bg, stroke: C.bad }) };
    STU.forEach(function (s, i) { o['st' + i] = B(130, 300 + i * 34, 130, 28, s, { mono: true, size: 12.5, fill: C.bg2, stroke: C.line, opacity: 0 }); });
    LAB.forEach(function (s, i) { o['lb' + i] = B(320, 300 + i * 34, 130, 28, s, { mono: true, size: 12.5, fill: C.bg2, stroke: C.line, opacity: 0 }); });
    o.res = T(470, 300, '', { mono: true, size: 12.5, opacity: 0 });
    o.res2 = T(470, 336, '', { mono: true, size: 12.5, opacity: 0 });
    o.res3 = T(470, 372, '', { mono: true, size: 12.5, opacity: 0 });
    o.ans = B(430, 470, 600, 44, '', { size: 13.5, fill: C.okW, stroke: C.ok, opacity: 0 });
    return o;
  }
  var sceneAsk = {
    name: '提问', desc: '好问题让回答者一下子找到你的知识缺口。先说你的理解，做点功课，问具体的是非题。答案不完整，就继续追问。',
    dataTitle: '问题检查（question_check.py）',
    data: { '陈述自己的理解': '无', '做过功课': '无', '是非题': '无', '具体': '无' },
    bg: function (d) {
      d.text(430, 24, '同一个疑问，三种问法', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(130, 270, 'students', { anchor: 'middle', size: 12, mono: true, color: C.fg3, weight: 700 });
      d.text(320, 270, 'labs', { anchor: 'middle', size: 12, mono: true, color: C.fg3, weight: 700 });
    },
    objects: qObjs,
    steps: [
      { say: '“How do SQL joins work?”太泛了，回答者只能从头讲起。很可能讲到你不关心的地方（讲义反例）。',
        data: { '陈述自己的理解': '×', '做过功课': '×', '是非题': '×', '具体': '×' },
        log: ['$ python ex07/question_check.py ex07/questions.txt', { s: 'Q1 (22 chars) has: -', at: 500 }, { s: '   missing: states-understanding, did-research, yes/no, specific', at: 700, cls: 'err' }],
        fx: [{ type: 'shake', obj: 'q', at: 600 }] },
      { say: '改成具体的是非题：“LEFT JOIN 会包含右表没有匹配的行吗？”对方可以直接答是或否，并顺带指出你的误解。',
        data: { '是非题': { v: '√', at: 600 }, '具体': { v: '√', at: 800 } },
        log: [{ s: 'Q2 (65 chars) has: yes/no, specific', at: 600 }],
        set: { q: { text: QS[1], stroke: { to: C.warn, dur: 300 } } }, fx: [{ type: 'pulse', obj: 'q', at: 300, color: C.warn }] },
      { say: '再说出你的理解和做过的功课。回答者就知道哪些不用重复，只需确认或纠正（讲义）。',
        data: { '陈述自己的理解': { v: '√', at: 600 }, '做过功课': { v: '√', at: 800 } },
        log: [{ s: 'Q3 (180 chars) has: states-understanding, did-research, yes/no, specific', at: 600, cls: 'ok' }],
        set: { q: { text: QS[2], size: { to: 11.5, dur: 0 }, stroke: { to: C.ok, dur: 300 } } }, fx: [{ type: 'ripple', obj: 'q', at: 300, color: C.ok }] },
      { say: '具体的是非题，往往 10 行实验就能自己回答。建两张表，ben（id=2）在 labs 里没有记录。',
        set: (function () { var s = {}; [0, 1, 2].forEach(function (i) { s['st' + i] = merge(show(i * 150), { y: { from: 280 + i * 34, to: 300 + i * 34, delay: i * 150, dur: 400, ease: 'back' } }); s['lb' + i] = merge(show(450 + i * 150), { y: { from: 280 + i * 34, to: 300 + i * 34, delay: 450 + i * 150, dur: 400, ease: 'back' } }); }); s.st1 = merge(s.st1, { stroke: { to: C.warn, delay: 1100, dur: 300 } }); return s; })(),
        fx: [{ type: 'pulse', obj: 'st1', at: 1200, color: C.warn }] },
      { say: '普通 JOIN 丢掉了 ben。LEFT JOIN 保留他，右边填 NULL。答案：是（本机 SQLite 实测）。',
        log: ['$ python ex07/left_join.py', { s: 'JOIN ON s.id = l.student_id', at: 300 }, { s: "    -> [('alyssa', 'lab01'), ('alyssa', 'lab02'), ('cy', 'lab01')]", at: 400 }, { s: 'LEFT JOIN ON s.id = l.student_id', at: 700 }, { s: "    -> [('alyssa', 'lab01'), ('alyssa', 'lab02'), ('ben', None), ('cy', 'lab01')]", at: 800, cls: 'ok' }],
        set: { res: merge(show(400), { text: 'JOIN：ben 不在结果里' }), res2: merge(show(900), { text: "LEFT JOIN：('ben', None)", color: { to: C.ok, dur: 0 } }),
          ans: merge(show(1200), { text: '是：LEFT JOIN 保留左表所有行，没匹配的右侧为 NULL' }) },
        fx: [{ type: 'ripple', obj: 'st1', at: 900, color: C.ok }] },
      { say: '别接受不完整的答案，顺着是非题接着问。把对右表的过滤写进 WHERE 会怎样？实验说：ben 又消失了。',
        log: [{ s: "LEFT JOIN ON s.id = l.student_id WHERE l.lab = 'lab01'", at: 300 }, { s: "    -> [('alyssa', 'lab01'), ('cy', 'lab01')]", at: 500, cls: 'err' }],
        set: { res3: merge(show(500), { text: '+ WHERE l.lab = …：ben 又没了', color: { to: C.bad, dur: 0 } }), ans: { text: { to: '追问得到新知识：WHERE 会把 NULL 行过滤掉', delay: 700 }, fill: { to: C.warnW, delay: 700, dur: 300 }, stroke: { to: C.warn, delay: 700, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'st1', at: 600 }] },
      { say: '这些建议对问 LLM 同样适用。在论坛上问得好，后来搜到这个帖子的人也受益。见视频 57:58 到 58:33。',
        set: { ans: { text: '对人、对 LLM、对论坛都一样：说清理解 · 问具体 · 追问到懂', fill: { to: C.infoW, dur: 300 }, stroke: { to: C.info, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'ans', at: 300, color: C.info }] }
    ]
  };

  var RUNNOTE = '英文控制台输出来自 lab08 的真跑结果。个别长行省略了中间部分。';
  VZ.register({
    id: 'ch08-pr-flow', title: '一次贡献的往返：fork → 分支 → PR → 评审 → 合并',
    sources: [{ t: '视频 29:27 什么是 PR', u: 'https://youtu.be/2DOEATfXT8k?t=1767' }, { t: '视频 31:36 提 PR 之前', u: 'https://youtu.be/2DOEATfXT8k?t=1896' }, { t: '视频 35:01 维护者的责任', u: 'https://youtu.be/2DOEATfXT8k?t=2101' }, { t: 'GitHub 文档 · fork 与 PR', u: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/about-forks' }],
    note: 'GitHub 上 fork、clone、push、发 PR 的具体操作属补充。视频只讲了 PR 的概念。PR 状态名和评审条数是示意。', scenes: [sceneFlow]
  });
  VZ.register({
    id: 'ch08-issue', title: 'bug 报告缺一项多一轮追问，最小复现把 31 行缩成 1 行',
    sources: [{ t: '视频 22:49 bug 报告', u: 'https://youtu.be/2DOEATfXT8k?t=1369' }, { t: '视频 24:33 最小复现', u: 'https://youtu.be/2DOEATfXT8k?t=1473' }, { t: '视频 26:24 +1 与重复', u: 'https://youtu.be/2DOEATfXT8k?t=1584' }, { t: '讲义 Contributing', u: 'https://missing.csail.mit.edu/2026/beyond-code/#contributing' }],
    note: RUNNOTE + '“每轮按 3 天算”是示意数字。issue 样本围绕练习 5 的真实 bug 写成。', scenes: [sceneIssue, sceneMre]
  });
  VZ.register({
    id: 'ch08-review', title: '评审意见怎么写：同一个意思，两种写法',
    sources: [{ t: '视频 42:42 代码评审', u: 'https://youtu.be/2DOEATfXT8k?t=2562' }, { t: '视频 44:26 可执行的意见', u: 'https://youtu.be/2DOEATfXT8k?t=2666' }, { t: '视频 51:53 AI 评审', u: 'https://youtu.be/2DOEATfXT8k?t=3113' }, { t: '讲义 Reviewing', u: 'https://missing.csail.mit.edu/2026/beyond-code/#reviewing' }],
    note: RUNNOTE + '卡片上的中文是讲义英文示例的翻译。左侧 diff、nit 和肯定这两条评论是示意。', scenes: [sceneReview]
  });
  VZ.register({
    id: 'ch08-ask', title: '把一个泛泛的问题，问成能用实验回答的是非题',
    sources: [{ t: '视频 54:14 提问', u: 'https://youtu.be/2DOEATfXT8k?t=3254' }, { t: '视频 57:58 对 LLM 同样适用', u: 'https://youtu.be/2DOEATfXT8k?t=3478' }, { t: '讲义 Education', u: 'https://missing.csail.mit.edu/2026/beyond-code/#education' }],
    note: RUNNOTE + 'Q1、Q2 是讲义原句，Q3 与 SQLite 表是示意。', scenes: [sceneAsk]
  });
})();
