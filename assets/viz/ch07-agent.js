/* ch07 · 语言模型、agent harness 与隐私 —— 可视化演示
 * 依据：Lecture 7 视频 12:33–17:18（LLM 是条件概率分布、多轮对话靠拼接历史）、17:18–26:26（harness 的工具调用循环、回看开场演示）、
 *       26:44–27:55（隐私）；讲义 agentic-coding.md 的 How AI models and agents work / Privacy。
 * 实测：工具循环一幕的控制台来自 labs/data/lab07.js 中 mini_harness.py 的真跑输出（模型是脚本化的假模型，工具是真的）；
 *       下一个 token 的概率分布是示意数字，不来自任何真实模型。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 13, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }
  var NOTES = 'https://missing.csail.mit.edu/2026/agentic-coding/';

  /* ---------- 场景 1：一次推理 = 从分布里抽样 ---------- */
  var CAND = [['2', 0.86], ['two', 0.07], ['3', 0.04], ['11', 0.03]];
  var BX0 = 520, BY0 = 150, BS = 52;
  function llmObjs() {
    var o = {
      x: box(150, 110, 230, 40, 'User: what is 1+1?', C.data, C.dataW, { mono: true, size: 12.5 }),
      model: box(350, 250, 150, 70, 'π_θ( · | x )', C.info, C.infoW, { size: 17, mono: true }),
      q1: path('M150,132 C150,200 220,250 274,250', C.data),
      out: box(150, 380, 230, 40, 'Assistant:', C.ok, C.okW, { mono: true, size: 12.5 }),
      pick: box(BX0 - 40, BY0, 60, 34, '', C.warn, 'none', { sw: 2.4, opacity: 0, rx: 6 }),
      tok: box(BX0 - 40, BY0, 56, 30, '2', C.ok, C.okW, { mono: true, size: 14, opacity: 0, trail: { n: 4, gap: 40 } }),
      win: box(430, 500, 700, 26, '', C.warn, C.warnW, { size: 11.5, opacity: 0 }),
      winF: box(90, 500, 20, 26, '', C.warn, C.warn, { opacity: 0, anchor: 'tl', y: 487, x: 80 })
    };
    CAND.forEach(function (c, i) {
      o['c' + i] = { type: 'text', x: BX0 - 40, y: BY0 + i * BS, text: c[0], size: 14, mono: true, weight: 700, color: C.fg, opacity: 0 };
      o['b' + i] = box(BX0, BY0 + i * BS - 13, 4, 26, '', C.info, C.infoW, { anchor: 'tl', rx: 4, opacity: 0, sw: 1.2 });
      o['p' + i] = { type: 'text', x: BX0 + 10, y: BY0 + i * BS, num: 0, fmt: 'pct', size: 12.5, mono: true, color: C.fg2, anchor: 'start', opacity: 0 };
    });
    return o;
  }
  var sceneLlm = {
    name: '抽样一次', desc: '语言模型可以看成一个条件概率分布。给定提示 x，它给出各种续写 y 的概率。推理（inference）就是从这个分布里抽样。',
    code: { lang: 'text', title: '讲义中的数学写法（被注释掉的那一段）', src: 'LLM 建模：π_θ( y | x )\n  x = 提示（prompt）\n  y = 续写（completion）\n推理 = 抽样：ŷ ~ π_θ( · | x )\n上下文窗口：|x| + |y| ≤ 上限' },
    dataTitle: '这一次推理',
    data: { '输入 x': '无', '抽到的 ŷ': '无' },
    legend: [[C.data, '输入 / 提示 x'], [C.info, '模型与概率'], [C.ok, '抽样得到的输出 ŷ'], [C.warn, '抽样指针 / 上下文窗口']],
    bg: function (d) {
      d.text(430, 24, '模型不“回答问题”，它只是给出下一段文字的概率，然后被抽样', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(BX0 + 80, BY0 - 40, '下一个 token 的概率（示意数字）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
    },
    objects: llmObjs,
    steps: [
      { say: '提示 x：一串文字（实际是 token 序列）。讲师在黑板上的例子是“1 + 1 等于几？”', hl: [2],
        data: { '输入 x': 'User: what is 1+1?' }, fx: [{ type: 'pulse', obj: 'x', at: 200, color: C.data }] },
      { say: '把 x 交给参数为 θ 的模型 π_θ。训练的全部功夫，就是让这个分布“有用”。', hl: [1],
        set: { q1: { dash: { to: 1, dur: 600 } } },
        fx: [{ type: 'stream', path: 'q1', at: 100, n: 4, dur: 900, color: C.data, labels: ['what', 'is', '1+1', '?'] }, { type: 'pulse', obj: 'model', at: 1000, color: C.info }] },
      { say: '模型算出下一个 token 的概率分布。大部分概率压在 2 上。其他写法也有一点点概率（数字为示意）。',
        set: (function () {
          var s = {};
          CAND.forEach(function (c, i) {
            var at = 200 + i * 200;
            s['c' + i] = { opacity: { to: 1, delay: at, dur: 200 } };
            s['b' + i] = { opacity: { to: 1, delay: at, dur: 200 }, w: { to: 280 * c[1] + 4, delay: at, dur: 700, ease: 'out' } };
            s['p' + i] = { opacity: { to: 1, delay: at, dur: 200 }, num: { to: c[1] * 100, delay: at, dur: 700 }, x: { to: BX0 + 280 * c[1] + 14, delay: at, dur: 700, ease: 'out' } };
          });
          return s;
        })() },
      { say: '推理就是抽样：按这些概率随机挑一个。多数时候抽到 2，偶尔会抽到别的。所以同一个问题问两次，答案可能不同。', hl: [4],
        eq: [{ s: 'ŷ ~ π_θ( · | x )', at: 100 }, { s: 'P(2) = 0.86，P(two) = 0.07，…（示意）', at: 600 }, { s: '这次抽到：2', at: 1500, cls: 'ok' }],
        data: { '抽到的 ŷ': { v: '2', at: 1500 } },
        set: { pick: { opacity: { to: 1, dur: 200 }, y: { from: BY0 + 3 * BS, to: BY0, dur: 1300, ease: 'bounce' } } },
        fx: [{ type: 'ripple', obj: 'pick', at: 1400, color: C.warn }] },
      { say: '抽到的 token 接到输出后面。真实模型会把“提示 + 已生成的部分”再送回去。就这样一个 token 一个 token 地往下生成，直到停止。',
        set: { tok: { opacity: { to: 1, dur: 200 }, x: { to: 290, dur: 900, ease: 'inOut' }, y: { to: 380, dur: 900, ease: 'inOut' } }, out: { text: { to: 'Assistant: 2', delay: 900 } } },
        fx: [{ type: 'pulse', obj: 'out', at: 950, color: C.ok }] },
      { say: '另一个限制是上下文窗口。输入和输出的总长度有上限。讲师举的量级是“比如 10 万个 token”。超过就放不下。接近上限时，效果也会变差（视频 46:35）。', hl: [5],
        set: { tok: { opacity: { to: 0, dur: 300 } }, win: { text: '上下文窗口：x 与 y 的总长度有上限', opacity: { to: 1, dur: 300 } }, winF: { opacity: { to: 0.5, dur: 300 }, w: { from: 20, to: 120, delay: 300, dur: 900 } } },
        fx: [{ type: 'pulse', obj: 'win', at: 400, color: C.warn }] }
    ]
  };

  /* ---------- 场景 2：多轮对话 = 每次把全部历史再发一遍 ---------- */
  var MSG = [['User: what is 1+1?', C.data, C.dataW], ['Assistant: 2', C.ok, C.okW], ['User: what if you replaced the ones with twos?', C.data, C.dataW], ['Assistant: 4', C.ok, C.okW]];
  function chatObjs() {
    var o = {
      model: box(700, 250, 150, 70, 'LLM', C.info, C.infoW, { size: 18 }),
      xb: box(250, 250, 420, 230, '', C.data, 'none', { rx: 12, sw: 1.8, dasharray: '6 4', opacity: 0 }),
      xl: { type: 'text', x: 250, y: 120, text: '本次推理的输入 x', size: 12.5, weight: 700, color: C.data, opacity: 0 },
      q: path('M462,250 L622,250', C.data),
      r: path('M700,288 C700,420 500,470 300,470', C.ok, { opacity: 0 }),
      cnt: { type: 'text', x: 700, y: 330, num: 0, pre: '推理次数 ', size: 14, mono: true, weight: 800, color: C.info }
    };
    MSG.forEach(function (m, i) { o['m' + i] = box(250, 160 + i * 52, 380, 38, m[0], m[1], m[2], { mono: true, size: 11.5, opacity: 0, x: 120 }); });
    return o;
  }
  var sceneChat = {
    name: '多轮对话', desc: '模型本身没有记忆。聊天应用支持追问，办法是给每条消息加上角色标记。每次都把整段历史当成新的输入 x，再推理一次。',
    code: { lang: 'text', title: '第二次推理时真正送进模型的 x（示意）', src: '<user> what is 1+1?\n<assistant> 2\n<user> what if you replaced the ones with twos?\n<assistant>' },
    dataTitle: '对话状态',
    data: { '历史消息数': 0, '本次输入的消息数': 0 },
    bg: function (d) {
      d.text(430, 24, '“记得上文”= 每次都把上文重新发一遍', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: chatObjs,
    steps: [
      { say: '第一问：给用户消息加上 “User” 这样的轮次标记。它就是输入 x。这种标记叫 turn marker。', hl: [1],
        data: { '历史消息数': 1, '本次输入的消息数': 1 },
        set: { xb: { opacity: { to: 1, dur: 300 } }, xl: { opacity: { to: 1, dur: 300 } }, m0: { opacity: { to: 1, delay: 200, dur: 250 }, x: { to: 250, delay: 200, dur: 600, ease: 'out' } } } },
      { say: '推理一次，得到第一个回答 ŷ：“2”。', hl: [2],
        data: { '历史消息数': { v: 2, at: 1300 } },
        set: { q: { dash: { to: 1, dur: 400 } }, cnt: { num: { to: 1, delay: 500, dur: 300 } }, m1: { opacity: { to: 1, delay: 1100, dur: 250 }, x: { from: 700, to: 250, delay: 1100, dur: 700, ease: 'out' } } },
        fx: [{ type: 'stream', path: 'q', at: 100, n: 1, dur: 500, color: C.data, labels: ['x'] }, { type: 'pulse', obj: 'model', at: 600, color: C.info }] },
      { say: '追问“把 1 都换成 2 呢？”。单看这句话没有意义，它依赖上文。讲师故意出了这种“依赖型”问题。', hl: [3],
        data: { '历史消息数': 3 },
        set: { m2: { opacity: { to: 1, dur: 250 }, x: { to: 250, dur: 600, ease: 'out' } } },
        fx: [{ type: 'float', obj: 'm2', at: 700, text: '“ones”指什么？', color: C.warn }] },
      { say: '所以应用把整段历史拼成新的 x，再推理一次。三条消息都带着轮次标记。模型“记得”上文，只是因为上文又被发了一遍。', hl: [1, 2, 3, 4],
        data: { '本次输入的消息数': { v: 3, at: 300 } },
        set: { cnt: { num: { to: 2, delay: 900, dur: 300 } } },
        fx: [{ type: 'flash', obj: 'xb', at: 200, color: C.data }, { type: 'stream', path: 'q', at: 400, n: 3, dur: 900, color: C.data, labels: ['User', 'Asst', 'User'] }, { type: 'pulse', obj: 'model', at: 1200, color: C.info }] },
      { say: '新的回答接到历史末尾。下一次追问时，四条消息都会进 x。对话越长，每次推理的输入越长，直到碰到上下文窗口。第 14 节的上下文管理，处理的就是这个问题。',
        data: { '历史消息数': { v: 4, at: 900 } },
        set: { r: { opacity: { to: 1, dur: 0 }, dash: { to: 1, dur: 600 } }, m3: { opacity: { to: 1, delay: 700, dur: 250 }, x: { from: 700, to: 250, delay: 700, dur: 700, ease: 'out' } } },
        fx: [{ type: 'stream', path: 'r', at: 100, n: 1, dur: 700, color: C.ok, labels: ['4'] }] }
    ]
  };

  /* ---------- 场景 3：harness 的工具调用循环（mini_harness 真跑） ---------- */
  var SEQ = [
    ['read_file dl.py', 444, '读文件（自动批准）'],
    ['run python -m py_compile', 8, '运行命令（需批准）'],
    ['run grep -c "^def "', 10, '运行命令（需批准）']
  ];
  function loopObjs() {
    return {
      user: box(90, 90, 120, 44, '用户', C.neutral, C.bg3),
      har: box(330, 270, 170, 70, 'harness（本地）', C.warn, C.warnW, { size: 13.5 }),
      llm: box(650, 120, 170, 64, 'LLM（推理）', C.info, C.infoW, { size: 13.5 }),
      tool: box(650, 430, 190, 60, '工具：文件 / 命令', C.teal, C.tealW, { size: 13 }),
      u2h: path('M150,112 C230,140 280,200 300,236', C.neutral),
      h2l: path('M415,250 C500,200 540,150 566,134', C.data),
      l2h: path('M566,150 C520,190 470,240 415,272', C.info),
      h2t: path('M415,290 C480,360 520,420 556,430', C.warn),
      t2h: path('M556,446 C480,440 420,360 390,306', C.teal),
      h2u: path('M300,300 C200,300 120,200 100,114', C.ok),
      ctx: box(330, 470, 170, 26, '', C.data, C.dataW, { anchor: 'tl', x: 40, y: 500, w: 10, size: 11 }),
      ctxT: { type: 'text', x: 40, y: 486, num: 25, pre: '上下文 ', post: ' 字节', anchor: 'start', size: 12.5, mono: true, weight: 800, color: C.data },
      inf: { type: 'text', x: 650, y: 200, num: 0, pre: '推理 #', size: 13, mono: true, weight: 800, color: C.info },
      gate: box(470, 380, 64, 28, '批准?', C.warn, C.warnW, { size: 11.5, opacity: 0 })
    };
  }
  function cw(bytes) { return 10 + bytes * 0.42; }
  var sceneLoop = {
    name: '工具调用循环', desc: '智能体就是模型加 harness。harness 把用户请求交给模型。模型若输出“调用工具”，harness 就真的去执行。结果追加进上下文，再推理一次。直到模型输出给用户的文字。',
    code: { lang: 'py', title: 'mini_harness.py 的主循环（简化，练习页补充实验）', src: 'ctx = [{"role": "user", "content": prompt}]\nfor turn in range(len(SCRIPT)):\n    out = fake_llm(ctx, turn)          # 真实 harness：调用 LLM\n    ctx.append(assistant(out))\n    if "text" in out:\n        break                          # 控制权交还用户\n    if out["tool"] in AUTO_APPROVE or approve:\n        result = run_tool(out["tool"], out["args"])\n    else:\n        result = "（用户拒绝了这次工具调用）"\n    ctx.append(tool(result))' },
    dataTitle: '循环状态（本机实测）',
    data: { '推理次数': 0, '工具调用': 0, '上下文': '25 字节' },
    legend: [[C.data, '发给模型的上下文'], [C.info, '模型输出'], [C.warn, 'harness 与权限'], [C.teal, '工具与结果'], [C.ok, '回给用户']],
    bg: function (d) {
      d.text(430, 24, '一个用户请求 → 多次推理 + 多次工具调用', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: loopObjs,
    steps: [
      { say: '用户提出请求“检查 dl.py 能否编译”。harness 把它作为上下文的第一条消息（25 字节）。', hl: [1],
        log: '$ python ../extra/mini_harness.py --approve "检查 dl.py 能否编译"',
        set: { u2h: { dash: { to: 1, dur: 600 } } },
        fx: [{ type: 'stream', path: 'u2h', at: 100, n: 1, dur: 700, color: C.neutral, labels: ['请求'] }, { type: 'pulse', obj: 'har', at: 800, color: C.warn }] },
      { say: '推理 #1：整个上下文发给模型。模型没有直接回答。它输出了一个结构化的请求：“调用 read_file(dl.py)”。', hl: [2, 3, 4],
        log: { s: '[推理 #1] 输入 1 条 / 25 字节 → {"tool": "read_file", "args": {"path": "dl.py"}}', at: 1200 },
        data: { '推理次数': { v: 1, at: 900 } },
        set: { h2l: { dash: { to: 1, dur: 400 } }, l2h: { dash: { to: 1, delay: 900, dur: 400 } }, inf: { num: { to: 1, delay: 700, dur: 200 } } },
        fx: [{ type: 'stream', path: 'h2l', at: 100, n: 1, dur: 600, color: C.data, labels: ['ctx 25B'] }, { type: 'pulse', obj: 'llm', at: 700, color: C.info }, { type: 'stream', path: 'l2h', at: 900, n: 1, dur: 600, color: C.info, labels: ['read_file'] }] },
      { say: '读文件被配置成自动批准。harness 真的读了 dl.py，把 444 字节的内容追加进上下文。上下文涨到 517 字节。', hl: [7, 8, 11],
        log: { s: '[harness] 执行 read_file → 结果 444 字节：from urllib.request import urlopen', at: 1300 },
        data: { '工具调用': { v: 1, at: 900 }, '上下文': { v: '517 字节', at: 1400 } },
        set: { h2t: { dash: { to: 1, dur: 400 } }, t2h: { dash: { to: 1, delay: 800, dur: 400 } }, ctx: { w: { to: cw(517), delay: 1300, dur: 600 } }, ctxT: { num: { to: 517, delay: 1300, dur: 600 } } },
        fx: [{ type: 'stream', path: 'h2t', at: 100, n: 1, dur: 600, color: C.warn, labels: ['read'] }, { type: 'pulse', obj: 'tool', at: 700, color: C.teal }, { type: 'stream', path: 't2h', at: 800, n: 3, dur: 700, color: C.teal, labels: ['444B'] }] },
      { say: '推理 #2：带着文件内容再推理一次。模型请求运行 python -m py_compile。运行命令需要用户批准。这是讲师的配置（视频 4:35）。改文件不问，跑命令必须确认。', hl: [3, 7],
        log: { s: '[推理 #2] 输入 3 条 / 517 字节 → {"tool": "run", "args": {"argv": ["python", "-m", "py_compile", "dl.py"]}}', at: 1000 },
        data: { '推理次数': { v: 2, at: 800 } },
        set: { inf: { num: { to: 2, delay: 600, dur: 200 } }, gate: { opacity: { to: 1, delay: 1100, dur: 300 } } },
        fx: [{ type: 'stream', path: 'h2l', at: 100, n: 1, dur: 600, color: C.data, labels: ['ctx 517B'] }, { type: 'stream', path: 'l2h', at: 800, n: 1, dur: 600, color: C.info, labels: ['run'] }, { type: 'pulse', obj: 'gate', at: 1300, color: C.warn }] },
      { say: '用户批准（--approve）。命令真的执行了，退出码 0，编译通过。结果 8 字节进入上下文。推理 #3 又请求数一数有几个函数，结果是 “2”。', hl: [8, 11],
        log: [{ s: '[harness] 执行 run → 结果 8 字节：(exit 0)', at: 900 }, { s: '[推理 #3] 输入 5 条 / 599 字节 → {"tool": "run", "args": {"argv": ["grep", "-c", "^def ", "dl.py"]}}', at: 1700 }, { s: '[harness] 执行 run → 结果 10 字节：2', at: 2500 }],
        data: { '工具调用': { v: 3, at: 2500 }, '推理次数': { v: 3, at: 1700 }, '上下文': { v: '676 字节', at: 2600 } },
        set: { gate: { text: '√ 批准', stroke: { to: C.ok, dur: 300 }, fill: { to: C.okW, dur: 300 } }, inf: { num: { to: 3, delay: 1600, dur: 200 } }, ctx: { w: { to: cw(676), delay: 2500, dur: 500 } }, ctxT: { num: { to: 676, delay: 2500, dur: 500 } } },
        fx: [{ type: 'stream', path: 'h2t', at: 200, n: 1, dur: 500, color: C.warn, labels: ['run'] }, { type: 'stream', path: 't2h', at: 600, n: 1, dur: 500, color: C.teal, labels: ['exit 0'] }, { type: 'stream', path: 'h2l', at: 1200, n: 1, dur: 400, color: C.data }, { type: 'stream', path: 'l2h', at: 1600, n: 1, dur: 400, color: C.info, labels: ['grep'] }, { type: 'stream', path: 'h2t', at: 1900, n: 1, dur: 400, color: C.warn }, { type: 'stream', path: 't2h', at: 2200, n: 1, dur: 400, color: C.teal, labels: ['2'] }] },
      { say: '推理 #4：这次模型输出的是给用户的文字。它不再调用工具，循环结束，控制权回到用户。一个请求，背后是 4 次推理、3 次工具调用。', hl: [5, 6],
        log: [{ s: '[推理 #4] 输入 7 条 / 676 字节 → {"text": "dl.py 能通过编译，里面定义了 2 个函数。"}', at: 900 }, { s: '[harness] 模型输出了文本而不是工具调用：本轮结束，控制权交还用户', at: 1500 }],
        data: { '推理次数': { v: 4, at: 800 } },
        set: { inf: { num: { to: 4, delay: 600, dur: 200 } }, h2u: { dash: { to: 1, delay: 1200, dur: 600 } }, gate: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'stream', path: 'h2l', at: 100, n: 1, dur: 500, color: C.data, labels: ['ctx 676B'] }, { type: 'stream', path: 'h2u', at: 1300, n: 1, dur: 700, color: C.ok, labels: ['回答'] }, { type: 'ripple', obj: 'user', at: 2000, color: C.ok }] },
      { say: '用户拒绝运行命令时（去掉 --approve），harness 就不执行。它只把“被拒绝”告诉模型（extra-b 实测）。这正是讲师建议的安全做法。会改动电脑状态的工具调用，要逐个审批。', hl: [9, 10],
        log: ['$ python ../extra/mini_harness.py "检查 dl.py 能否编译"', { s: '[harness] 执行 run → 结果 39 字节：（用户拒绝了这次工具调用）', at: 900, cls: 'err' }],
        set: { gate: { opacity: { to: 1, dur: 300 }, text: '× 拒绝', stroke: { to: C.bad, dur: 300 }, fill: { to: C.badW, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'gate', at: 500 }] }
    ]
  };

  /* ---------- 场景 4：隐私——哪些数据离开你的电脑 ---------- */
  function privObjs() {
    return {
      pc: box(200, 280, 300, 330, '', C.neutral, 'none', { rx: 16, sw: 2, dasharray: '7 5' }),
      cloud: box(660, 280, 260, 330, '', C.info, 'none', { rx: 40, sw: 2, dasharray: '7 5' }),
      repo: box(140, 200, 150, 40, '你的仓库', C.teal, C.tealW),
      har: box(250, 330, 150, 50, 'harness', C.warn, C.warnW),
      llm: box(660, 330, 160, 56, 'LLM 推理', C.info, C.infoW),
      har2: box(660, 220, 170, 44, 'harness（云端部分）', C.warn, C.warnW, { size: 12, opacity: 0 }),
      up: path('M325,320 C440,300 520,320 580,326', C.bad),
      down: path('M580,342 C520,360 440,360 325,346', C.ok),
      rd: path('M160,220 C170,270 200,300 230,306', C.teal),
      store: box(660, 405, 200, 40, '可能被保存 / 用于训练', C.bad, C.badW, { size: 12, opacity: 0 }),
      local: box(200, 470, 230, 40, '本地开源模型（能力较弱）', C.ok, C.okW, { size: 12, opacity: 0 })
    };
  }
  var scenePriv = {
    name: '隐私', desc: '大多数编码智能体默认会把大量数据发到云端。harness 可能在本地，但每次推理都要把上下文发给服务商。上下文里有你的提示、它读过的文件和命令输出。',
    code: { lang: 'sh', title: '一次推理就是一个 HTTP 请求（第 6 讲讲义原文，未执行）', src: 'curl https://api.anthropic.com/v1/messages \\\n    -H "x-api-key: $ANTHROPIC_API_KEY" \\\n    -H "content-type: application/json" \\\n    -H "anthropic-version: 2023-06-01" \\\n    -d \'{"model": "claude-sonnet-4-20250514", "max_tokens": 256,\n         "messages": [{"role": "user", "content": "..."}]}\'' },
    dataTitle: '离开本机的内容（示意）',
    data: { '每次推理上传': '无', '谁能看到': '无' },
    legend: [[C.bad, '离开本机的数据'], [C.ok, '返回的结果 / 本地方案'], [C.warn, 'harness'], [C.info, '云端推理'], [C.teal, '你的文件']],
    bg: function (d) {
      d.text(200, 100, '你的电脑', { anchor: 'middle', size: 13, weight: 700, color: C.fg2 });
      d.text(660, 100, '服务商的云', { anchor: 'middle', size: 13, weight: 700, color: C.info });
      d.text(430, 24, '推理在云端：上下文里有什么，就上传了什么', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: privObjs,
    steps: [
      { say: '能力强的大模型，需要很强的硬件来推理。所以基本都跑在云端（视频 26:44）。', hl: [1],
        fx: [{ type: 'pulse', obj: 'llm', at: 200, color: C.info }] },
      { say: 'harness 在本地读你的文件：被读到的内容就进了上下文。', hl: [6],
        set: { rd: { dash: { to: 1, dur: 500 } } },
        fx: [{ type: 'stream', path: 'rd', at: 200, n: 3, dur: 800, color: C.teal, labels: ['dl.py', 'README', '…'] }] },
      { say: '每次推理，整个上下文都随请求发给服务商。里面有你的提示、读过的文件、命令输出和 AGENTS.md。讲义说，服务商很可能还拿到你整个仓库的一份副本。', hl: [5, 6],
        data: { '每次推理上传': { v: '提示 + 文件内容 + 工具输出', at: 600 } },
        set: { up: { dash: { to: 1, dur: 500 } }, down: { dash: { to: 1, delay: 1200, dur: 500 } } },
        fx: [{ type: 'stream', path: 'up', at: 300, n: 4, dur: 1000, color: C.bad, labels: ['prompt', 'dl.py', 'stdout', 'AGENTS.md'] }, { type: 'stream', path: 'down', at: 1300, n: 1, dur: 700, color: C.ok, labels: ['回复'] }] },
      { say: '有的工具连 harness 的一部分也在云端运行（问答 27:29）。除非另有协议，数据可能被保存，甚至用于训练。在意隐私，就去读条款，或者选一套合适的配置。',
        data: { '谁能看到': { v: '服务商（视条款而定）', at: 900 } },
        set: { har2: { opacity: { to: 1, dur: 300 } }, store: { opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'store', at: 900, color: C.bad }] },
      { say: '另一条路：开源的 harness 加开源模型，都在本地运行。这样数据不出机器。代价是多数人的硬件跑不动最前沿的开源模型。本地小模型，对难任务效果差（讲义、视频 7:26）。',
        data: { '每次推理上传': { v: '（本地运行时）无', at: 700 } },
        set: { local: { opacity: { to: 1, dur: 300 }, y: { from: 500, to: 470, dur: 500, ease: 'back' } }, up: { opacity: { to: 0.3, delay: 500, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'local', at: 500, color: C.ok }] }
    ]
  };

  /* 这几幕的说明文字较长，每步多留一点阅读时间 */
  [sceneChat, scenePriv].forEach(function (sc) { sc.steps.forEach(function (st) { st.hold = 3200; }); });

  VZ.register({
    id: 'ch07-llm', title: '语言模型：从分布里抽样，多轮对话靠拼接历史',
    sources: [
      { t: '视频 12:33 LLM 是条件概率分布', u: 'https://youtu.be/sTdz6PZoAnw?t=753' },
      { t: '视频 14:53 多轮对话', u: 'https://youtu.be/sTdz6PZoAnw?t=893' },
      { t: '讲义 How AI models and agents work', u: NOTES + '#how-ai-models-and-agents-work' }
    ],
    note: '概率数字和轮次标记的具体写法，都是示意。“1+1”和“把 1 换成 2”的例子，来自视频板书。',
    scenes: [sceneLlm, sceneChat]
  });
  VZ.register({
    id: 'ch07-loop', title: 'agent harness：推理、工具、再推理的循环',
    sources: [
      { t: '视频 17:18 工具调用', u: 'https://youtu.be/sTdz6PZoAnw?t=1038' },
      { t: '视频 19:44 harness 做什么', u: 'https://youtu.be/sTdz6PZoAnw?t=1184' },
      { t: '视频 23:52 回看开场演示', u: 'https://youtu.be/sTdz6PZoAnw?t=1432' },
      { t: '讲义 How AI models and agents work', u: NOTES + '#how-ai-models-and-agents-work' },
      { t: 'The Emperor Has No Clothes（200 行实现）', u: 'https://www.mihaileric.com/The-Emperor-Has-No-Clothes/' }
    ],
    note: '控制台和字节数，来自 mini_harness.py 的本机真跑输出。这是练习页的补充实验，见 extra-a 和 extra-b。其中的“模型”是写死的假模型，工具执行是真实的。',
    scenes: [sceneLoop]
  });
  VZ.register({
    id: 'ch07-privacy', title: '隐私：哪些数据离开了你的电脑',
    sources: [
      { t: '视频 26:44 隐私', u: 'https://youtu.be/sTdz6PZoAnw?t=1604' },
      { t: '视频 27:29 harness 在哪里运行', u: 'https://youtu.be/sTdz6PZoAnw?t=1649' },
      { t: '讲义 Privacy', u: NOTES + '#privacy' }
    ],
    note: '数据流向按讲义和视频的描述绘制，是示意。没有抓取真实的网络请求。右侧 curl 命令是第 6 讲讲义原文，未执行。',
    scenes: [scenePriv]
  });
})();
