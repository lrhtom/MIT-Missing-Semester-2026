/* ch07 · 并行智能体与上下文管理 —— 可视化演示
 * 依据：Lecture 7 视频 43:07–45:27（并行智能体与 git worktree）、45:58–49:34（上下文窗口、清空、回退、压缩）、
 *       52:50–55:28（AGENTS.md 与 skills）、55:28–57:50（子智能体）；讲义 agentic-coding.md 的 Advanced agents。
 * 实测：worktree 一幕的输出来自 lab07 ex01-a（compare.sh）；压缩一幕来自 extra-c（mini_harness.py --limit 600）；
 *       AGENTS.md / 技能 / 子智能体的字节数来自 ex04-a（ctx_cost.py）。上下文块的长短、网页 HTML 大小、子智能体的工作过程为示意。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 12.5, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }
  var NOTES = 'https://missing.csail.mit.edu/2026/agentic-coding/';

  /* ---------- 场景 1：并行智能体与 git worktree ---------- */
  var WT = ['hand', 'autocomplete', 'inline', 'agent'], WX = [130, 320, 510, 700], WY = 330;
  function wtObjs() {
    var o = {
      repo: box(430, 110, 220, 50, 'task/（main）', C.teal, C.tealW, { mono: true, size: 13 }),
      a1: box(370, 190, 90, 30, '智能体 A', C.info, C.infoW, { size: 11.5, opacity: 0 }),
      a2: box(490, 190, 90, 30, '智能体 B', C.info, C.infoW, { size: 11.5, opacity: 0 }),
      clash: { type: 'text', x: 430, y: 236, text: '同时改同一份文件 → 互相覆盖', size: 12.5, weight: 700, color: C.bad, opacity: 0 },
      main: box(430, 480, 300, 36, 'main ← 之后再逐个合并', C.ok, C.okW, { size: 12, opacity: 0 })
    };
    WT.forEach(function (w, i) {
      o['w' + i] = box(430, 110, 160, 46, 'wt-' + w + '/', C.teal, C.tealW, { mono: true, size: 12, opacity: 0, s: 0.6 });
      o['br' + i] = { type: 'text', x: WX[i], y: WY + 36, text: '[' + w + ']', size: 12, mono: true, weight: 700, color: C.data, opacity: 0 };
      o['g' + i] = box(WX[i] - 70, WY + 62, 4, 14, '', C.info, C.info, { anchor: 'tl', rx: 3, opacity: 0, sw: 0 });
      o['st' + i] = { type: 'text', x: WX[i], y: WY + 100, text: '', size: 11.5, mono: true, weight: 700, color: C.fg2, opacity: 0 };
      o['l' + i] = path('M430,135 C430,220 ' + WX[i] + ',230 ' + WX[i] + ',' + (WY - 26), C.teal, { sw: 1.8 });
      o['m' + i] = path('M' + WX[i] + ',' + (WY + 112) + ' C' + WX[i] + ',460 430,440 430,460', C.ok, { sw: 1.6, arrow: 'data' });
    });
    return o;
  }
  var sceneWt = {
    name: 'worktree 并行', desc: '智能体一干就是几分钟，甚至几十分钟。与其盯着，不如开多个并行。为了不互相踩脚，用 git worktree 隔开。每个智能体有独立的工作目录和分支。',
    code: { lang: 'sh', title: 'ex01/compare.sh（练习 1，本机实测）', src: 'git init -q -b main task && cd task\ncp ../dl.py ../test_dl.py .\ngit add . && git commit -q -m "base: …"\nfor mode in hand autocomplete inline agent; do\n    git worktree add -q -b "$mode" "../wt-$mode"\ndone\ngit worktree list\ncp ../dl_cli.py ../wt-hand/\ngit -C ../wt-hand add dl_cli.py\ngit -C ../wt-hand commit -q -m "hand: …"\nfor mode in hand autocomplete inline agent; do\n    git diff --shortstat main "$mode"\ndone' },
    dataTitle: '工作区',
    data: { '工作区数': 1, '已提交的分支': 0 },
    bg: function (d) {
      d.text(430, 24, '一个仓库，多份独立检出：各自的目录、各自的分支', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: wtObjs,
    steps: [
      { say: '在同一个目录里启动两个智能体。它们会同时改同一批文件，互相冲突（视频 44:10）。', hl: [1],
        set: { a1: { opacity: { to: 1, dur: 300 }, x: { from: 330, to: 370, dur: 500 } }, a2: { opacity: { to: 1, delay: 150, dur: 300 }, x: { from: 530, to: 490, delay: 150, dur: 500 } }, clash: { opacity: { to: 1, delay: 900, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'repo', at: 900 }, { type: 'flash', obj: 'repo', at: 900, color: C.bad }] },
      { say: 'git worktree add 为每个任务建一份完整的独立检出。同时新建一个同名分支。这里给练习 1 的四种做法各建一个，输出是本机实测。', hl: [4, 5, 6, 7],
        log: ['$ bash compare.sh', { s: '<沙箱>/ex01/task            015fb06 [main]', at: 1500 }, { s: '<沙箱>/ex01/wt-agent        015fb06 [agent]', at: 1600 }, { s: '<沙箱>/ex01/wt-autocomplete 015fb06 [autocomplete]', at: 1700 }, { s: '<沙箱>/ex01/wt-hand         015fb06 [hand]', at: 1800 }, { s: '<沙箱>/ex01/wt-inline       015fb06 [inline]', at: 1900 }],
        data: { '工作区数': { v: 5, at: 1500 } },
        set: (function () {
          var s = { a1: { opacity: { to: 0, dur: 300 } }, a2: { opacity: { to: 0, dur: 300 } }, clash: { opacity: { to: 0, dur: 300 } } };
          WT.forEach(function (w, i) {
            var at = 300 + i * 250;
            s['l' + i] = { dash: { to: 1, delay: at, dur: 500 } };
            s['w' + i] = { opacity: { to: 1, delay: at, dur: 200 }, x: { to: WX[i], delay: at, dur: 700, ease: 'back' }, y: { to: WY, delay: at, dur: 700, ease: 'out' }, s: { to: 1, delay: at, dur: 600 } };
            s['br' + i] = { opacity: { to: 1, delay: at + 600, dur: 300 } };
          });
          return s;
        })() },
      { say: '每个工作区各跑一个智能体，互不干扰。进度条是示意。讲师上课时就同时开着两个 Claude。一个改网站风格，一个修 bug。',
        set: (function () {
          var s = {}, len = [140, 80, 110, 60];
          WT.forEach(function (w, i) { s['g' + i] = { opacity: { to: 1, dur: 200 }, w: { to: len[i], delay: 100 + i * 100, dur: 1800, ease: 'linear' } }; });
          return s;
        })(),
        fx: [{ type: 'pulse', obj: 'w0', at: 300, color: C.info }, { type: 'pulse', obj: 'w1', at: 500, color: C.info }, { type: 'pulse', obj: 'w2', at: 700, color: C.info }, { type: 'pulse', obj: 'w3', at: 900, color: C.info }] },
      { say: '示范：把“手写”版本放进 wt-hand 并提交到 hand 分支。提交只影响这个分支，其他工作区毫无感觉。', hl: [8, 9, 10],
        data: { '已提交的分支': { v: 1, at: 900 } },
        set: { g0: { w: { to: 140, dur: 0 }, fill: { to: C.ok, dur: 300 }, stroke: { to: C.ok, dur: 300 } }, st0: { text: '已提交', color: { to: C.ok, dur: 0 }, opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'w0', at: 700, color: C.ok }, { type: 'float', obj: 'w0', at: 800, text: '+34 行', color: C.ok }] },
      { say: '逐个分支和 main 比较改动量。hand 加了 34 行，其余三个还没提交。练习 1 就靠这张表对比四种做法。', hl: [11, 12, 13],
        log: [{ s: 'hand          1 file changed, 34 insertions(+)', at: 400 }, { s: 'autocomplete (no commits yet)', at: 700 }, { s: 'inline       (no commits yet)', at: 900 }, { s: 'agent        (no commits yet)', at: 1100 }],
        set: { st1: { text: '(无提交)', opacity: { to: 1, delay: 700, dur: 200 } }, st2: { text: '(无提交)', opacity: { to: 1, delay: 900, dur: 200 } }, st3: { text: '(无提交)', opacity: { to: 1, delay: 1100, dur: 200 } }, st0: { text: '+34 行' } } },
      { say: '各分支完成后再分别合并回 main（第 5 讲的分支与合并）。讲师：并行智能体和 git worktree 是一对好搭档。',
        set: (function () { var s = { main: { opacity: { to: 1, delay: 600, dur: 300 } } }; WT.forEach(function (w, i) { s['m' + i] = { dash: { to: 1, delay: i * 150, dur: 600 } }; }); return s; })(),
        fx: [{ type: 'stream', path: 'm0', at: 400, n: 1, dur: 700, color: C.ok, labels: ['merge'] }, { type: 'ripple', obj: 'main', at: 1200, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：上下文窗口：塞满、清空、回退 ---------- */
  /* 上下文画成一根竖直的纸带：从下往上堆，块的高度表示大小（示意） */
  var BLK = [['系统提示 + 工具说明', 34, C.neutral, C.bg3], ['AGENTS.md（515 B）', 30, C.teal, C.tealW], ['用户：实现功能 X', 24, C.data, C.dataW], ['读 dl.py（444 B）', 28, C.teal, C.tealW], ['跑测试的输出', 34, C.teal, C.tealW], ['网页原始 HTML（样式、脚本……）', 118, C.warn, C.warnW], ['用户：改走另一个方案', 24, C.data, C.dataW], ['它的 3 次尝试', 56, C.info, C.infoW]];
  var CX0 = 250, CW0 = 360, CBOT = 490, CMAX = 380, CY = CBOT;
  var BY = [], acc = 0;
  BLK.forEach(function (b) { BY.push(CBOT - acc - b[1]); acc += b[1] + 2; });
  function ctxObjs() {
    var o = {
      frame: box(CX0 - 6, CBOT - CMAX, CW0 + 12, CMAX + 6, '', C.line, 'none', { anchor: 'tl', rx: 8, sw: 2, dasharray: '6 4' }),
      lim: { type: 'text', x: CX0 + CW0 + 6, y: CBOT - CMAX - 14, text: '上下文窗口上限', anchor: 'end', size: 12, weight: 700, color: C.fg3 },
      used: { type: 'text', x: CX0 - 6, y: CBOT - CMAX - 14, num: 0, fmt: 'pct', pre: '已用 ', anchor: 'start', size: 13, weight: 800, mono: true, color: C.data },
      qual: { type: 'text', x: 430, y: 525, text: '', size: 13, weight: 700, color: C.bad, opacity: 0 },
      cmd: box(735, 180, 200, 40, '', C.warn, C.warnW, { size: 13, opacity: 0 })
    };
    BLK.forEach(function (b, i) {
      o['k' + i] = box(CX0 + 260, BY[i], CW0, b[1], b[0], b[2], b[3], { anchor: 'tl', rx: 6, size: 11.5, weight: 600, opacity: 0 });
    });
    return o;
  }
  function inBlk(ids, at) { var s = {}; ids.forEach(function (i, k) { s['k' + i] = { opacity: { to: 1, delay: at + k * 250, dur: 200 }, x: { to: CX0, delay: at + k * 250, dur: 600, ease: 'out' } }; }); return s; }
  function pct(ids) { var w = 0; ids.forEach(function (i) { w += BLK[i][1] + 2; }); return Math.round(100 * w / CMAX); }
  var sceneCtx = {
    name: '塞满、清空、回退', desc: '每轮对话、每次工具调用，输入输出都追加进上下文。窗口有上限，东西越多，模型表现越差。所以要主动管理。无关的新任务就清空，走错了路就回退。',
    code: { lang: 'text', title: '讲义 Context management 列出的手段', src: '清空上下文：开始新对话（不相关的问题）\n回退对话：从历史末尾弹出几步，当它没发生过\n压缩：用 LLM 把前缀总结成摘要（见下一节）\nllms.txt：比 HTML 信息密度高的文档\nAGENTS.md：每次启动都预先放进上下文\n技能 / 子智能体：按需加载、隔离上下文' },
    dataTitle: '上下文（示意）',
    data: { '消息块': 0, '状态': '无' },
    legend: [[C.neutral, '系统提示'], [C.teal, '文件 / 工具输出'], [C.data, '用户消息'], [C.warn, '体积大、信息密度低'], [C.info, '模型的尝试'], [C.bad, '溢出 / 效果变差']],
    bg: function (d) {
      d.text(430, 24, '上下文 = 一条只增不减的长纸带（除非你去管理它）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: ctxObjs,
    steps: [
      { say: '会话开始时，harness 预先放入系统提示和工具说明。还有 AGENTS.md 的全文，练习 4 实测是 515 字节。然后是你的第一条消息。', hl: [5],
        data: { '消息块': { v: 3, at: 800 }, '状态': '正常' },
        set: merge(inBlk([0, 1, 2], 0), { used: { num: { to: pct([0, 1, 2]), delay: 300, dur: 800 } } }) },
      { say: '智能体读文件、跑测试。每次工具调用的结果，都整段追加进去。', hl: [1],
        data: { '消息块': { v: 5, at: 600 } },
        set: merge(inBlk([3, 4], 0), { used: { num: { to: pct([0, 1, 2, 3, 4]), delay: 300, dur: 600 } } }) },
      { say: '它又抓了一个网页的原始 HTML。样式、统计脚本这些对任务没用的东西，占了一大块。这就是讲义推荐 llms.txt 的原因。即使没超上限，内容一多，模型也容易“被污染”。表现就会变差。', hl: [4],
        data: { '消息块': { v: 6, at: 600 }, '状态': { v: '上下文被污染', at: 900 } },
        set: merge(inBlk([5], 0), { used: { num: { to: pct([0, 1, 2, 3, 4, 5]), delay: 300, dur: 700 }, color: { to: C.warn, delay: 600, dur: 300 } }, qual: { text: '内容越多，模型越容易分心（视频 46:35）', opacity: { to: 1, delay: 900, dur: 300 } } }),
        fx: [{ type: 'shake', obj: 'k5', at: 700 }] },
      { say: '你改了主意，让它换个方案。它又尝试了几次。被放弃的那些步骤仍留在上下文里，没用还添乱。',
        data: { '消息块': { v: 8, at: 800 }, '状态': '接近上限' },
        set: merge(inBlk([6, 7], 0), { used: { num: { to: pct([0, 1, 2, 3, 4, 5, 6, 7]), delay: 300, dur: 700 }, color: { to: C.bad, delay: 700, dur: 300 } } }),
        fx: [{ type: 'flash', obj: 'frame', at: 900, color: C.bad }] },
      { say: '回退（rewind）：从历史末尾弹出最近几步（视频 47:46）。就当它们没发生过。这比再追加一句“别这么做了”更省上下文。', hl: [2],
        log: '# 多数智能体都有回退对话的命令（各家名字不同）',
        data: { '消息块': { v: 5, at: 900 }, '状态': '已回退' },
        set: { k7: { x: { to: CX0 + 330, dur: 600, ease: 'in' }, y: { to: BY[7] - 40, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 300, dur: 300 } }, k6: { x: { to: CX0 + 330, delay: 200, dur: 600, ease: 'in' }, y: { to: BY[6] - 40, delay: 200, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 500, dur: 300 } }, k5: { x: { to: CX0 + 330, delay: 400, dur: 600, ease: 'in' }, y: { to: BY[5] - 40, delay: 400, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 700, dur: 300 } },
          used: { num: { to: pct([0, 1, 2, 3, 4]), delay: 600, dur: 600 }, color: { to: C.data, delay: 600, dur: 300 } }, qual: { opacity: { to: 0, dur: 300 } }, cmd: { text: '回退 3 步', opacity: { to: 1, dur: 300 } } },
        fx: [{ type: 'burst', x: 700, y: 170, at: 700, color: C.info }] },
      { say: '要做一件不相关的事，就清空上下文，开新对话。这是最基本、也最该常用的控制。重新开始时，只有系统提示和 AGENTS.md 会被再次放进来。', hl: [1, 5],
        log: '# 例如 Claude Code 的 /clear（补充），也可以直接退出重开',
        data: { '消息块': { v: 2, at: 900 }, '状态': '新对话' },
        set: { cmd: { text: '清空：开始新对话' }, k2: { x: { to: -200, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 300, dur: 300 } }, k3: { x: { to: -200, delay: 100, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 400, dur: 300 } }, k4: { x: { to: -200, delay: 200, dur: 600, ease: 'in' }, opacity: { to: 0, delay: 500, dur: 300 } },
          used: { num: { to: pct([0, 1]), delay: 700, dur: 500 } } },
        fx: [{ type: 'ripple', obj: 'k1', at: 900, color: C.teal }] }
    ]
  };

  /* ---------- 场景 3：压缩（mini_harness 真跑） ---------- */
  var SZ = [[25, '用户请求'], [492, '推理#1 + 读 dl.py'], [82, '推理#2 + 编译'], [77, '推理#3 + grep']];
  var PX0 = 60, PSC = 1.05, PY = 290, LIMX = PX0 + 600 * PSC;
  function cmpObjs() {
    var o = {
      lim: { type: 'line', x1: LIMX, y1: PY - 70, x2: LIMX, y2: PY + 60, stroke: C.bad, sw: 2, dash: 1 },
      limT: { type: 'text', x: LIMX, y: PY - 84, text: '上限 600 字节（--limit）', size: 12, weight: 700, color: C.bad },
      tot: { type: 'text', x: PX0, y: PY - 50, num: 0, pre: '上下文 ', post: ' 字节', anchor: 'start', size: 14, mono: true, weight: 800, color: C.data },
      sum: box(PX0, PY - 20, 112 * PSC, 40, '摘要', C.ok, C.okW, { anchor: 'tl', size: 11, opacity: 0, rx: 6 }),
      llm: box(430, 450, 200, 50, 'LLM 写摘要', C.info, C.infoW, { opacity: 0 }),
      cp: path('M300,330 C330,420 350,450 330,450', C.info, { opacity: 0 })
    };
    var x = PX0;
    SZ.forEach(function (b, i) {
      var w = Math.max(14, b[0] * PSC);
      o['s' + i] = box(x, PY - 20, w, 40, i === 0 ? '' : b[1], i === 0 ? C.data : C.teal, i === 0 ? C.dataW : C.tealW, { anchor: 'tl', size: 10.5, weight: 600, opacity: 0, rx: 6, y: PY + 60 });
      x += w;
    });
    return o;
  }
  function addSeg(i, total, logs) {
    var s = {}; s['s' + i] = { opacity: { to: 1, dur: 200 }, y: { to: PY - 20, dur: 500, ease: 'out' } }; s.tot = { num: { to: total, delay: 300, dur: 500 } };
    return s;
  }
  var sceneCmp = {
    name: '压缩', desc: '对话快装不下时，harness 用 LLM 把历史前缀总结成摘要。摘要替换掉原来的消息，对话就能一直延续。下面用 mini_harness.py 真跑一遍，“上下文窗口”设成 600 字节。',
    code: { lang: 'py', title: 'mini_harness.py：压缩逻辑（练习页补充实验）', src: 'def compact(ctx):\n    summary = f"[摘要] 前面 {len(ctx)} 条消息：…"\n    return [ctx[0], {"role": "user", "content": summary}]\n\n# 主循环里，每次工具调用之后：\nif size(ctx) > limit:\n    ctx = compact(ctx)' },
    dataTitle: '上下文（本机实测）',
    data: { '消息条数': 1, '字节': 25 },
    bg: function (d) {
      d.text(430, 24, '超过上限 → 把前缀换成摘要 → 继续对话', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(PX0, PY + 26, LIMX + 120, PY + 26, { stroke: C.line, sw: 1 });
    },
    objects: cmpObjs,
    steps: [
      { say: '上下文从用户的一句请求开始：1 条消息，25 字节。真实系统按 token 计，这里用字节示意。',
        log: ['$ python ../extra/mini_harness.py --approve --limit 600 "检查 dl.py 能否编译"', { s: '[推理 #1] 输入 1 条 / 25 字节 → {"tool": "read_file", …}', at: 600 }],
        set: merge(addSeg(0, 25), {}) },
      { say: '读 dl.py：模型的请求和 444 字节的文件内容，都追加进去。上下文涨到 517 字节。',
        log: [{ s: '[harness] 执行 read_file → 结果 444 字节：from urllib.request import urlopen', at: 300 }, { s: '[推理 #2] 输入 3 条 / 517 字节 → {"tool": "run", …py_compile…}', at: 900 }],
        data: { '消息条数': { v: 3, at: 500 }, '字节': { v: 517, at: 500 } }, set: addSeg(1, 517) },
      { say: '编译检查：请求加结果 “(exit 0)”，一共 599 字节。离 600 只差 1 字节。',
        log: [{ s: '[harness] 执行 run → 结果 8 字节：(exit 0)', at: 300 }, { s: '[推理 #3] 输入 5 条 / 599 字节 → {"tool": "run", …grep…}', at: 900 }],
        data: { '消息条数': { v: 5, at: 500 }, '字节': { v: 599, at: 500 } }, set: addSeg(2, 599) },
      { say: 'grep 的结果进来后到了 676 字节，超过上限。',
        log: { s: '[harness] 执行 run → 结果 10 字节：2', at: 300 },
        data: { '消息条数': { v: 7, at: 500 }, '字节': { v: 676, at: 500 } },
        set: merge(addSeg(3, 676), { tot: { num: { to: 676, delay: 300, dur: 500 }, color: { to: C.bad, delay: 600, dur: 300 } } }),
        fx: [{ type: 'flash', obj: 's3', at: 700, color: C.bad }, { type: 'shake', obj: 's3', at: 800 }] },
      { say: '压缩：保留最初的请求，其余前缀交给 LLM 总结。总结出的摘要替换掉这些前缀。本骨架里的摘要，是写死的一句话。结果从 7 条 676 字节，变成 2 条 112 字节。',
        log: { s: '[harness] 上下文 676 字节 > 上限 600：压缩成 2 条 / 112 字节', at: 1500 },
        data: { '消息条数': { v: 2, at: 1500 }, '字节': { v: 112, at: 1500 } },
        set: { llm: { opacity: { to: 1, dur: 300 } }, cp: { opacity: { to: 1, dur: 0 }, dash: { to: 1, delay: 200, dur: 500 } },
          s1: { x: { to: PX0 + 30, delay: 500, dur: 700, ease: 'in' }, w: { to: 20, delay: 500, dur: 700 }, opacity: { to: 0, delay: 1000, dur: 300 } }, s2: { x: { to: PX0 + 30, delay: 600, dur: 700, ease: 'in' }, w: { to: 20, delay: 600, dur: 700 }, opacity: { to: 0, delay: 1100, dur: 300 } }, s3: { x: { to: PX0 + 30, delay: 700, dur: 700, ease: 'in' }, w: { to: 20, delay: 700, dur: 700 }, opacity: { to: 0, delay: 1200, dur: 300 } },
          sum: { x: { to: PX0 + 26, dur: 0 }, opacity: { to: 1, delay: 1300, dur: 300 } }, tot: { num: { to: 112, delay: 1400, dur: 500 }, color: { to: C.ok, delay: 1400, dur: 300 } } },
        fx: [{ type: 'stream', path: 'cp', at: 300, n: 3, dur: 800, color: C.info }, { type: 'ripple', obj: 'sum', at: 1500, color: C.ok }] },
      { say: '下一次推理只带着 112 字节的上下文，照样得出结论。讲师的建议是这样的。同一件事还没做完，摘要通常够用，继续干。换成不相关的事，就清空（视频 57:50）。',
        log: [{ s: '[推理 #4] 输入 2 条 / 112 字节 → {"text": "dl.py 能通过编译，里面定义了 2 个函数。"}', at: 400 }, { s: '[harness] 模型输出了文本而不是工具调用：本轮结束，控制权交还用户', at: 900 }],
        set: { llm: { opacity: { to: 0.3, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'sum', at: 400, color: C.ok }] }
    ]
  };

  /* ---------- 场景 4：AGENTS.md vs 技能 vs 子智能体 ---------- */
  var KX = 60, KY = 330, KS = 0.55;
  function skObjs() {
    return {
      frame: box(KX, KY - 30, 740, 60, '', C.line, 'none', { anchor: 'tl', rx: 8, sw: 1.8, dasharray: '6 4' }),
      used: { type: 'text', x: KX, y: KY - 48, num: 0, pre: '启动时预先占用 ', post: ' 字节', anchor: 'start', size: 13.5, mono: true, weight: 800, color: C.data },
      ag: box(KX, KY - 24, 515 * KS, 48, 'AGENTS.md 全文 515 B', C.teal, C.tealW, { anchor: 'tl', size: 11, opacity: 0, y: KY - 150, rx: 6 }),
      d1: box(KX + 515 * KS + 2, KY - 24, 158 * KS, 48, 'run-tests 描述', C.info, C.infoW, { anchor: 'tl', size: 10, opacity: 0, y: KY - 150, rx: 6 }),
      d2: box(KX + (515 + 158) * KS + 4, KY - 24, 215 * KS, 48, 'code-checker 描述', C.info, C.infoW, { anchor: 'tl', size: 10, opacity: 0, y: KY - 150, rx: 6 }),
      b1: box(560, 120, 322 * KS, 40, 'run-tests 正文 322 B', C.warn, C.warnW, { anchor: 'tl', size: 10.5, rx: 6, opacity: 0.35 }),
      b2: box(560, 175, 442 * KS, 40, 'code-checker 正文 442 B', C.warn, C.warnW, { anchor: 'tl', size: 10.5, rx: 6, opacity: 0.35 }),
      user: box(150, 460, 220, 40, '用户：跑一下测试', C.data, C.dataW, { opacity: 0 }),
      ghost: box(KX + (515 + 158 + 215) * KS + 6, KY + 44, 764 * KS * 0.42, 40, '+764 B？', C.bad, C.badW, { anchor: 'tl', size: 10.5, rx: 6, opacity: 0, dasharray: '4 3' })
    };
  }
  var sceneSkill = {
    name: 'AGENTS.md 与技能', desc: 'AGENTS.md 每次启动都整个放进上下文。技能和子智能体只预先放一行描述。正文等真正用到时，才读进来。多了一层间接，省下了上下文。',
    code: { lang: 'yaml', title: '.claude/skills/run-tests/SKILL.md 的头部（练习 4）', src: '---\nname: run-tests\ndescription: 运行本项目的测试与类型检查，并把失败整理成简短报告。在修改 Python 代码之后、或用户要求“跑一下测试”时使用。\n---\n\n# 运行测试\n1. 在项目根目录执行 python -m pytest -q。\n2. 再执行 mypy --strict dl_cli.py。\n…' },
    dataTitle: '上下文（ctx_cost.py 实测）',
    data: { '预先加载': '0 字节', '按需加载': '0 字节' },
    bg: function (d) {
      d.text(430, 24, '全量预加载 vs 只放描述、按需打开', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(560, 100, '磁盘上的技能 / 子智能体正文（还没加载）', { anchor: 'start', size: 12, color: C.fg3, weight: 600 });
    },
    objects: skObjs,
    steps: [
      { say: '智能体启动时，上下文一片空白。它对你的仓库一无所知（视频 53:26）。AGENTS.md 的全文先放进去，一共 515 字节。这是本机 ctx_cost.py 实测的。',
        log: ['$ python ctx_cost.py', { s: 'AGENTS.md          启动时加载全文   515 字节', at: 900 }],
        data: { '预先加载': { v: '515 字节', at: 900 } },
        set: { ag: { opacity: { to: 1, dur: 250 }, y: { to: KY - 24, dur: 700, ease: 'out' } }, used: { num: { to: 515, delay: 400, dur: 600 } } } },
      { say: '技能和子智能体，只把头部的描述放进去。run-tests 是 158 字节，code-checker 是 215 字节。智能体靠描述判断，什么时候该打开哪一个。', hl: [1, 2, 3, 4],
        log: [{ s: 'code-checker       启动时只加载描述   215 字节，用到时才加载正文   442 字节', at: 600 }, { s: 'run-tests          启动时只加载描述   158 字节，用到时才加载正文   322 字节', at: 900 }],
        data: { '预先加载': { v: '888 字节', at: 900 } },
        set: { d1: { opacity: { to: 1, dur: 250 }, y: { to: KY - 24, dur: 600, ease: 'out' } }, d2: { opacity: { to: 1, delay: 200, dur: 250 }, y: { to: KY - 24, delay: 200, dur: 600, ease: 'out' } }, used: { num: { to: 888, delay: 500, dur: 600 } } } },
      { say: '用户说“跑一下测试”。智能体发现 run-tests 的描述对得上。于是像调用工具一样，把它的正文读进上下文。然后照着做。', hl: [6, 7, 8],
        data: { '按需加载': { v: '322 字节', at: 1300 } },
        set: { user: { opacity: { to: 1, dur: 300 } }, b1: { opacity: { to: 1, delay: 600, dur: 200 }, x: { to: KX + 888 * KS + 8, delay: 700, dur: 800, ease: 'inOut' }, y: { to: KY - 20, delay: 700, dur: 800, ease: 'inOut' } } },
        fx: [{ type: 'pulse', obj: 'd1', at: 500, color: C.info }, { type: 'ripple', obj: 'b1', at: 1500, color: C.warn }] },
      { say: '对比一下。把两份正文都直接写进 AGENTS.md，每次启动都要多占 764 字节。不管这次用不用得到。AGENTS.md 越写越长，就是讲义说的“上下文膨胀”。',
        log: { s: '如果把这些正文全写进 AGENTS.md，每次启动要多占 764 字节的上下文', at: 600 },
        set: { ghost: { opacity: { to: 1, delay: 300, dur: 300 }, w: { from: 10, to: 764 * KS * 0.42, delay: 300, dur: 700 } } },
        fx: [{ type: 'shake', obj: 'ghost', at: 1100 }] },
      { say: '怎么选？每次都需要的规矩，写进 AGENTS.md。比如怎么跑测试、代码风格。偶尔才用的长流程，做成技能。要独立上下文干一整件事的，交给子智能体。下一节细讲。Claude Code 读 CLAUDE.md，可以用 @AGENTS.md 引用同一份内容。',
        log: ['$ cat CLAUDE.md', { s: '@AGENTS.md', at: 400 }],
        set: { ghost: { opacity: { to: 0.3, dur: 300 } }, user: { opacity: { to: 0.4, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'ag', at: 300, color: C.teal }] }
    ]
  };

  /* ---------- 场景 5：子智能体 ---------- */
  function subObjs() {
    return {
      par: box(200, 200, 260, 220, '', C.info, 'none', { rx: 14, sw: 2, dasharray: '7 5' }),
      parT: { type: 'text', x: 200, y: 106, text: '主智能体的上下文', size: 12.5, weight: 700, color: C.info },
      pc: box(200, 300, 200, 26, '', C.info, C.infoW, { anchor: 'tl', x: 90, y: 290, w: 120, size: 10.5, rx: 5 }),
      pcT: { type: 'text', x: 90, y: 270, num: 40, pre: '已用 ', post: '%', anchor: 'start', size: 12, mono: true, weight: 800, color: C.info },
      sub: box(620, 200, 240, 200, '', C.teal, 'none', { rx: 14, sw: 2, dasharray: '7 5', opacity: 0, s: 0.7 }),
      subT: { type: 'text', x: 620, y: 116, text: '子智能体：全新的上下文', size: 12.5, weight: 700, color: C.teal, opacity: 0 },
      sc: box(520, 290, 10, 26, '', C.teal, C.tealW, { anchor: 'tl', size: 10.5, rx: 5, opacity: 0 }),
      html: box(620, 250, 180, 30, '网页 HTML（很大）', C.warn, C.warnW, { size: 11, opacity: 0 }),
      go: path('M330,200 C420,160 480,160 500,176', C.info),
      back: path('M500,240 C440,260 400,280 320,300', C.ok),
      res: box(620, 330, 160, 30, '摘要（几行）', C.ok, C.okW, { size: 11.5, opacity: 0 }),
      r1: box(560, 470, 160, 36, '子智能体：代码评审', C.teal, C.tealW, { size: 11.5, opacity: 0 }),
      r2: box(760, 470, 160, 36, '子智能体：类型检查', C.teal, C.tealW, { size: 11.5, opacity: 0, x: 790 }),
      p1: path('M330,320 C400,420 440,470 476,470', C.info, { sw: 1.8 }),
      p2: path('M330,330 C420,520 620,510 676,484', C.info, { sw: 1.8 })
    };
  }
  var sceneSub = {
    name: '子智能体', desc: '主智能体可以把一件子任务交给子智能体。子智能体用全新的上下文干活，干完只把结果交回来。主智能体的上下文不被细节撑满。子智能体也只拿到它需要的信息。',
    code: { lang: 'yaml', title: '.claude/agents/code-checker.md（练习 4）', src: '---\nname: code-checker\ndescription: Python 代码检查智能体。对自上次 git 提交以来改动过的 Python 文件运行 mypy 和 ruff……（只检查，不修改）\ntools: Bash, Read, Grep, Glob\n---\n你是一个只读的 Python 代码检查员。\n…\n4. 绝不修改任何文件；没有问题时只回复“检查通过”。' },
    dataTitle: '上下文占用（示意）',
    data: { '主智能体': '40%', '子智能体': '无' },
    bg: function (d) {
      d.text(430, 24, '委派出去，只收回结论', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: subObjs,
    steps: [
      { say: '主智能体正在做一个功能，需要查某个网页里的资料。如果自己去抓，整页 HTML 会塞进它的上下文。',
        fx: [{ type: 'pulse', obj: 'par', at: 300, color: C.info }] },
      { say: '有的编码智能体，把“抓网页”做成了子智能体。主智能体只给它一句任务（视频 56:00）。任务是“抓这个网页，总结某某方面”。', hl: [1, 2, 3, 4],
        data: { '子智能体': { v: '0%（全新）', at: 900 } },
        set: { go: { dash: { to: 1, dur: 500 } }, sub: { opacity: { to: 1, delay: 400, dur: 300 }, s: { to: 1, delay: 400, dur: 500, ease: 'back' } }, subT: { opacity: { to: 1, delay: 600, dur: 300 } } },
        fx: [{ type: 'stream', path: 'go', at: 100, n: 1, dur: 600, color: C.info, labels: ['子任务'] }] },
      { say: '子智能体在自己的上下文里，抓取并阅读整页 HTML。这些噪声只占它自己的窗口。',
        data: { '子智能体': { v: '85%', at: 900 } },
        set: { html: { opacity: { to: 1, dur: 300 }, y: { from: 200, to: 250, dur: 500, ease: 'out' } }, sc: { opacity: { to: 1, dur: 200 }, w: { to: 200, delay: 200, dur: 900 } } },
        fx: [{ type: 'pulse', obj: 'html', at: 600, color: C.warn }] },
      { say: '它只把筛选后的几行摘要交回来，随即结束。主智能体的上下文只涨了一点点。它也看不到子智能体的中间过程。', hl: [6, 8],
        data: { '主智能体': { v: '43%', at: 1200 }, '子智能体': { v: '（已结束）', at: 1400 } },
        set: { res: { opacity: { to: 1, dur: 300 } }, back: { dash: { to: 1, delay: 400, dur: 500 } }, pc: { w: { to: 130, delay: 1100, dur: 400 } }, pcT: { num: { to: 43, delay: 1100, dur: 400 } },
          sub: { opacity: { to: 0.25, delay: 1300, dur: 400 } }, html: { opacity: { to: 0, delay: 1300, dur: 300 } }, sc: { opacity: { to: 0, delay: 1300, dur: 300 } }, subT: { opacity: { to: 0.3, delay: 1300, dur: 300 } } },
        fx: [{ type: 'stream', path: 'back', at: 500, n: 1, dur: 700, color: C.ok, labels: ['摘要'] }, { type: 'ripple', obj: 'pc', at: 1200, color: C.ok }] },
      { say: '子智能体还能并行。功能写完后，同时派出两个子智能体。一个做代码评审，一个做类型检查。讲师说 Claude Code 就能这样做。都完成后，主智能体再继续。',
        data: { '子智能体': '2 个并行' },
        set: { res: { opacity: { to: 0, dur: 300 } }, p1: { dash: { to: 1, dur: 500 } }, p2: { dash: { to: 1, delay: 150, dur: 500 } }, r1: { opacity: { to: 1, delay: 500, dur: 300 } }, r2: { opacity: { to: 1, delay: 650, dur: 300 }, x: { to: 760, delay: 650, dur: 400 } } },
        fx: [{ type: 'stream', path: 'p1', at: 100, n: 2, dur: 700, color: C.info }, { type: 'stream', path: 'p2', at: 250, n: 2, dur: 700, color: C.info }, { type: 'pulse', obj: 'r1', at: 900, color: C.teal }, { type: 'pulse', obj: 'r2', at: 1050, color: C.teal }] }
    ]
  };

  /* 这几幕的说明文字较长，每步多留一点阅读时间 */
  [sceneSkill, sceneSub, sceneCtx, sceneCmp].forEach(function (sc) { sc.steps.forEach(function (st) { st.hold = 3000; }); });

  VZ.register({
    id: 'ch07-worktree', title: '并行智能体：用 git worktree 各干各的',
    sources: [
      { t: '视频 43:07 并行智能体', u: 'https://youtu.be/sTdz6PZoAnw?t=2587' },
      { t: '视频 44:42 git worktree', u: 'https://youtu.be/sTdz6PZoAnw?t=2682' },
      { t: '讲义 Advanced agents', u: NOTES + '#advanced-agents' },
      { t: 'git-worktree 文档', u: 'https://git-scm.com/docs/git-worktree' }
    ],
    note: '控制台是练习 1 compare.sh 的本机实测输出（ex01-a）。各工作区里智能体的进度条是示意。',
    scenes: [sceneWt]
  });
  VZ.register({
    id: 'ch07-context', title: '上下文窗口：塞满、回退与清空',
    sources: [
      { t: '视频 45:58 上下文窗口', u: 'https://youtu.be/sTdz6PZoAnw?t=2758' },
      { t: '视频 47:46 回退对话', u: 'https://youtu.be/sTdz6PZoAnw?t=2866' },
      { t: '讲义 Context management', u: NOTES + '#advanced-agents' }
    ],
    note: '各块的长短和“已用百分比”是示意。AGENTS.md 515 B、dl.py 444 B 这两个数字，来自练习页的本机实测。',
    scenes: [sceneCtx]
  });
  VZ.register({
    id: 'ch07-compact', title: '压缩：用摘要替换历史前缀',
    sources: [
      { t: '视频 48:31 压缩', u: 'https://youtu.be/sTdz6PZoAnw?t=2911' },
      { t: '视频 57:50 压缩还是新开对话', u: 'https://youtu.be/sTdz6PZoAnw?t=3470' },
      { t: '讲义 Context management', u: NOTES + '#advanced-agents' }
    ],
    note: '控制台和字节数，来自本机真跑的 extra-c。命令是 mini_harness.py --limit 600。真实 harness 会调用 LLM 写摘要。这个骨架里，摘要是固定的一句话。',
    scenes: [sceneCmp]
  });
  VZ.register({
    id: 'ch07-skills', title: 'AGENTS.md 与技能：全量预加载 vs 按需打开',
    sources: [
      { t: '视频 52:50 AGENTS.md', u: 'https://youtu.be/sTdz6PZoAnw?t=3170' },
      { t: '视频 54:09 skills', u: 'https://youtu.be/sTdz6PZoAnw?t=3249' },
      { t: 'agents.md', u: 'https://agents.md/' },
      { t: 'Claude Code 文档 · skills', u: 'https://code.claude.com/docs/en/skills' }
    ],
    note: '字节数是练习 4 ctx_cost.py 的本机实测输出（ex04-a）。按 UTF-8 字节计，不是 token。“按需加载”的过程按讲义描述示意。没有调用真实智能体。',
    scenes: [sceneSkill]
  });
  VZ.register({
    id: 'ch07-subagent', title: '子智能体：委派出去，只收回结论',
    sources: [
      { t: '视频 55:28 子智能体', u: 'https://youtu.be/sTdz6PZoAnw?t=3328' },
      { t: '讲义 Subagents', u: NOTES + '#advanced-agents' },
      { t: 'Claude Code 文档 · subagents', u: 'https://code.claude.com/docs/en/sub-agents' }
    ],
    note: '全部是按讲义和视频描述画的示意。上下文百分比不是测量值。右侧的子智能体定义来自练习 4。它没在真实智能体里运行过。',
    scenes: [sceneSub]
  });
})();
