/* ch03 · 代码智能与 AI：语言服务器协议、AI 补全、行内对话 —— 可视化演示
 * 依据：Lecture 3 视频 29:32–33:46（LSP、M×N→M+N、补全/跳转/引用/import）、35:25–42:25（AI 补全与注释引导）、
 *       42:25–45:25（行内对话）；讲义 development-environment.md。
 * 实测：LSP 会话的控制台输出取自练习 3（labs/data/lab03.js，本机 gopls v0.21.0 真跑）；
 *       AI 补全 / 行内对话里模型给出的代码逐字取自讲义原文（本机没有接入 Copilot，未实测“补全”这一动作本身）；
 *       补全出的正则在本机用 python 真跑验证过（见正文）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 9, fill: colW || C.bg, stroke: col || C.line, sw: 1.7, text: text || '', color: C.fg, mono: true, size: 13.5, weight: 700 }, extra || {});
  }
  function pipe(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }
  function nb(t) { return typeof t === 'string' ? t.replace(/ /g, ' ') : t; }
  var LEC = { t: '讲义 development-environment', u: 'https://missing.csail.mit.edu/2026/development-environment/' };

  /* ---------- LSP 场景 1：M×N → M+N ---------- */
  var ED = [['VS Code', 120], ['Vim', 220], ['Emacs', 320], ['新编辑器', 420]];
  var LG = [['gopls · Go', 120], ['Pylance · Python', 220], ['clangd · C++', 320], ['新语言服务器', 420]];
  function mnObjs() {
    var o = {};
    ED.forEach(function (e, i) { o['e' + i] = box(130, e[1], 150, 44, e[0], C.info, C.infoW, { size: 13, opacity: i < 3 ? 1 : 0 }); });
    LG.forEach(function (g, j) { o['g' + j] = box(730, g[1], 190, 44, g[0], C.teal, C.tealW, { size: 13, opacity: j < 3 ? 1 : 0 }); });
    for (var i = 0; i < 4; i++) for (var j = 0; j < 4; j++) o['x' + i + j] = { type: 'path', d: 'M205,' + ED[i][1] + ' C420,' + ED[i][1] + ' 440,' + LG[j][1] + ' 635,' + LG[j][1], stroke: C.bad, sw: 1.4, dash: 0, opacity: 0.8 };
    o.hub = box(430, 270, 120, 56, 'LSP', C.warn, C.warnW, { size: 18, opacity: 0, s: 0.6 });
    for (var k = 0; k < 4; k++) {
      o['he' + k] = pipe('M205,' + ED[k][1] + ' C300,' + ED[k][1] + ' 320,270 370,270', C.info, { sw: 2 });
      o['hg' + k] = pipe('M490,270 C540,270 560,' + LG[k][1] + ' 635,' + LG[k][1], C.teal, { sw: 2 });
    }
    o.cnt = { type: 'text', x: 430, y: 500, num: 0, pre: '需要写的集成：', post: ' 份', size: 20, weight: 800, color: C.bad, opacity: 0 };
    return o;
  }
  function pairs(m, n, at, on) { var s = {}; for (var i = 0; i < m; i++) for (var j = 0; j < n; j++) s['x' + i + j] = { dash: { to: on ? 1 : 0, delay: (at || 0) + (on ? (i * n + j) * 70 : 0), dur: 400 } }; return s; }
  var sceneMN = {
    name: 'M×N → M+N', desc: '没有统一协议时，每个编辑器要给每种语言各写一套。有了 LSP，两边各实现一次协议，就能互通。',
    dataTitle: '集成数量',
    data: { '编辑器 M': 3, '语言 N': 3, '无协议 M×N': '无', '有 LSP M+N': '无' },
    bg: function (d) { d.text(130, 60, '编辑器（客户端）', { anchor: 'middle', size: 13, weight: 800, color: C.info }); d.text(730, 60, '语言服务器', { anchor: 'middle', size: 13, weight: 800, color: C.teal }); },
    objects: mnObjs,
    steps: [
      { say: '3 个编辑器、3 种语言。没有统一协议时，每一对都要单独写一套支持。补全、跳转、查错，样样都得写。',
        data: { '无协议 M×N': { v: 9, at: 900 } }, eq: [{ s: '无协议：M × N = 3 × 3 = 9 份集成', at: 900 }],
        set: merge(pairs(3, 3, 0, true), { cnt: { opacity: { to: 1, dur: 300 }, num: { to: 9, dur: 900 } } }),
        fx: [{ type: 'pulse', obj: 'cnt', at: 900, color: C.bad }] },
      { say: 'LSP 在中间定了一套协议。编辑器只实现客户端一侧。语言服务器只实现服务端一侧。',
        data: { '有 LSP M+N': { v: 6, at: 1400 } }, eq: [{ s: '有 LSP：M + N = 3 + 3 = 6 份', at: 1400 }],
        set: merge(pairs(3, 3, 0, false), { hub: { opacity: { to: 1, delay: 400, dur: 300 }, s: { to: 1, delay: 400, dur: 500, ease: 'back' } },
          he0: { dash: { to: 1, delay: 700, dur: 400 } }, he1: { dash: { to: 1, delay: 800, dur: 400 } }, he2: { dash: { to: 1, delay: 900, dur: 400 } },
          hg0: { dash: { to: 1, delay: 1000, dur: 400 } }, hg1: { dash: { to: 1, delay: 1100, dur: 400 } }, hg2: { dash: { to: 1, delay: 1200, dur: 400 } },
          cnt: { num: { to: 6, delay: 700, dur: 700 }, color: { to: C.ok, delay: 700, dur: 300 } } }),
        fx: [{ type: 'ripple', obj: 'hub', at: 700, color: C.warn }] },
      { say: '再来一个新编辑器。没有协议，要再写 3 份。有 LSP 只多 1 份，它一接上，所有语言都能用。',
        data: { '编辑器 M': 4, '无协议 M×N': 12, '有 LSP M+N': { v: 7, at: 800 } }, eq: [{ s: 'M = 4：4 × 3 = 12，而 4 + 3 = 7', at: 800 }],
        set: { e3: { opacity: { to: 1, dur: 300 }, x: { from: 60, to: 130, dur: 500, ease: 'out' } }, he3: { dash: { to: 1, delay: 500, dur: 500 } }, cnt: { num: { to: 7, delay: 500, dur: 500 } } },
        fx: [{ type: 'stream', path: 'he3', at: 1000, n: 2, dur: 700, color: C.info }] },
      { say: '再来一种新语言。同样只多写 1 个语言服务器。现有的 4 个编辑器，立刻都支持它。',
        data: { '语言 N': 4, '无协议 M×N': 16, '有 LSP M+N': { v: 8, at: 800 } }, eq: [{ s: 'M = N = 4：16 份对 8 份。规模越大，差距越大', at: 800 }],
        set: { g3: { opacity: { to: 1, dur: 300 }, x: { from: 800, to: 730, dur: 500, ease: 'out' } }, hg3: { dash: { to: 1, delay: 500, dur: 500 } }, cnt: { num: { to: 8, delay: 500, dur: 500 } } },
        fx: [{ type: 'stream', path: 'hg3', at: 1000, n: 2, dur: 700, color: C.teal }] },
      { say: '协议的内容是 JSON-RPC 消息。比如 VS Code 问“这个位置能补全什么”。消息经协议交给 gopls，gopls 把候选列表发回来。下一幕看本机真实的一次会话。',
        log: [{ s: '--> textDocument/completion  #2', at: 300 }, { s: '<-- 补全: Area, H, W', at: 1500 }],
        fx: [{ type: 'stream', path: 'he0', at: 200, n: 1, dur: 600, color: C.info, labels: ['completion'] }, { type: 'stream', path: 'hg0', at: 800, n: 1, dur: 600, color: C.info, labels: ['completion'] }, { type: 'pulse', obj: 'g0', at: 1400, color: C.teal }] },
      { say: '讲义的例子：VS Code 的 Python 扩展靠 Pylance，Go 扩展靠官方的 gopls。装上扩展和语言服务器，就有了补全、文档和跳转。还有查引用、import 帮助和边写边查错。',
        fx: [{ type: 'pulse', obj: 'e0', at: 200, color: C.info }, { type: 'pulse', obj: 'g1', at: 500, color: C.teal }, { type: 'pulse', obj: 'g0', at: 800, color: C.teal }] }
    ]
  };

  /* ---------- LSP 场景 2：一次真实的 gopls 会话 ---------- */
  var CX = 150, SX = 700;
  function msg(id, text, col) { return box(CX, 120, 230, 32, text, col || C.info, C.bg, { size: 12, opacity: 0, trail: { n: 4, gap: 36 } }); }
  function fly(id, dir, y, at, extra) {
    var s = {};
    s[id] = merge({ opacity: { from: 0, to: 1, delay: at, dur: 150 }, x: { from: dir > 0 ? CX + 60 : SX - 60, to: dir > 0 ? SX - 60 : CX + 60, delay: at, dur: 800, ease: 'inOut' }, y: { from: y, to: y, dur: 0 } }, extra || {});
    return s;
  }
  var SHAPES = 'package main\n\nimport "fmt"\n\n// Rect is a rectangle with a width and a height.\ntype Rect struct {\n\tW, H float64\n}\n\n// Area returns the area of the rectangle.\nfunc (r Rect) Area() float64 {\n\treturn r.W * r.H\n}\n\nfunc main() {\n\tr := Rect{W: 3, H: 4}\n\tfmt.Println(r.Area())\n\tfmt.Println(r.Perimeter())\n}';
  var sceneGopls = {
    name: 'gopls 会话（本机实测）', desc: '练习 3 的 100 行 Python 客户端扮演“编辑器”。它和 gopls 通过 stdin/stdout 交换 JSON-RPC 消息。每条消息和结果，都来自本机真跑。',
    code: { lang: 'go', title: 'shapes/main.go（第 18 行故意写错）', src: SHAPES },
    dataTitle: '最近一次请求',
    data: { '方法': '无', '位置': '无', '结果': '无' },
    legend: [[C.info, '客户端 → 服务器（请求 / 通知）'], [C.teal, '服务器 → 客户端（响应）'], [C.bad, '诊断（服务器主动推送）']],
    bg: function (d) {
      d.node(CX - 110, 42, 220, 56, '客户端（编辑器）', 'lsp_client.py', { fill: C.infoW, stroke: C.info });
      d.node(SX - 110, 42, 220, 56, '语言服务器', 'gopls v0.21.0', { fill: C.tealW, stroke: C.teal });
      d.line(CX, 100, CX, 540, { stroke: C.info, sw: 1.2, dash: '4 5' });
      d.line(SX, 100, SX, 540, { stroke: C.teal, sw: 1.2, dash: '4 5' });
    },
    objects: {
      m1: msg('m1', 'initialize #1'), r1: msg('r1', '能力：补全 悬停 定义 引用 代码操作', C.teal),
      m2: msg('m2', 'didOpen（整份文件）'), dg: msg('dg', 'L18 r.Perimeter undefined', C.bad),
      m3: msg('m3', 'completion L17:16'), r3: msg('r3', 'Area, H, W', C.teal),
      m4: msg('m4', 'hover L17:17'), r4: msg('r4', 'func (r Rect) Area() float64', C.teal),
      m5: msg('m5', 'definition L16:7'), r5: msg('r5', 'main.go L6:6', C.teal),
      m6: msg('m6', 'definition L17:6'), r6: msg('r6', 'fmt/print.go L306:6', C.teal),
      m7: msg('m7', 'references L11:15'), r7: msg('r7', 'L11:15, L17:16', C.teal)
    },
    steps: [
      { say: '握手：客户端发 initialize，服务器回复自己支持哪些功能。消息走的是 gopls 进程的 stdin / stdout（第 2 讲的流）。', hl: [1],
        log: ['--> initialize  #1', { s: '<-- 服务器能力: completionProvider, hoverProvider, definitionProvider, referencesProvider, codeActionProvider', at: 1600 }],
        data: { '方法': 'initialize', '结果': { v: '5 项能力', at: 1600 } },
        set: merge(fly('m1', 1, 140, 0), fly('r1', -1, 180, 900)), fx: [{ type: 'ripple', x: SX, y: 140, at: 800, color: C.teal }] },
      { say: 'didOpen 把整份文件发给服务器。这是“通知”，没有 id，也没有回复。服务器分析后，主动推送诊断。第 18 行的方法不存在，不用编译就知道。', hl: [18],
        log: ['--> initialized', '--> textDocument/didOpen', { s: '<-- publishDiagnostics: 1 条', at: 1500 }, { s: '      L18:16 r.Perimeter undefined (type Rect has no field or method Perimeter)', at: 1700 }],
        data: { '方法': 'didOpen → publishDiagnostics', '位置': 'L18:16', '结果': { v: '1 条错误', at: 1500 } },
        set: merge(fly('m2', 1, 225, 0), fly('dg', -1, 265, 900, { stroke: { to: C.bad, dur: 0 } })),
        fx: [{ type: 'shake', obj: 'dg', at: 1700 }] },
      { say: '补全：光标在第 17 行 r. 后面。服务器推断 r 是 Rect，返回它的字段和方法。这就是你在 IDE 里敲“.”时弹出的列表。', hl: [17],
        log: ['--> textDocument/completion  #2', { s: '<-- 补全: Area, H, W', at: 1500 }], data: { '方法': 'completion', '位置': 'L17:16', '结果': { v: 'Area, H, W', at: 1500 } },
        set: merge(fly('m3', 1, 310, 0), fly('r3', -1, 350, 900)), fx: [{ type: 'ripple', x: CX, y: 350, at: 1700, color: C.teal }] },
      { say: '悬停：鼠标停在 Area 上，返回签名和文档注释。注释就是第 10 行那句英文。讲义管这叫“行内文档”。', hl: [10, 11, 17],
        log: ['--> textDocument/hover  #3', { s: '<-- 悬停: func (r Rect) Area() float64 Area returns the area of the rectangle. […]', at: 1500 }], data: { '方法': 'hover', '位置': 'L17:17', '结果': { v: '签名 + 文档', at: 1500 } },
        set: merge({ m1: { opacity: { to: 0.25, dur: 300 } }, r1: { opacity: { to: 0.25, dur: 300 } }, m2: { opacity: { to: 0.25, dur: 300 } } }, fly('m4', 1, 395, 0), fly('r4', -1, 435, 900)) },
      { say: '跳转到定义：在 Rect{…} 的 Rect 上请求，得到第 6 行。没有语言服务器，你只能全局搜索、到处翻。', hl: [6, 16],
        log: ['--> textDocument/definition  #4', { s: '<-- 定义: shapes/main.go L6:6', at: 1500 }], data: { '方法': 'definition', '位置': 'L16:7', '结果': { v: 'main.go L6:6', at: 1500 } },
        set: merge({ m3: { opacity: { to: 0.25, dur: 300 } }, r3: { opacity: { to: 0.25, dur: 300 } }, dg: { opacity: { to: 0.25, dur: 300 } } }, fly('m5', 1, 480, 0), fly('r5', -1, 520, 900)) },
      { say: '库函数也能跳。在 Println 上请求定义，落到 Go 标准库的 fmt/print.go 第 306 行。练习 3 要确认的，正是这种依赖库的跳转。', hl: [17],
        log: ['--> textDocument/definition  #5', { s: '<-- 库函数定义: fmt/print.go L306:6', at: 1500 }], data: { '方法': 'definition', '位置': 'L17:6', '结果': { v: 'fmt/print.go L306:6', at: 1500 } },
        set: merge({ m4: { opacity: { to: 0, dur: 300 } }, r4: { opacity: { to: 0, dur: 300 } } }, fly('m6', 1, 395, 0), fly('r6', -1, 435, 900)),
        fx: [{ type: 'ripple', x: CX, y: 435, at: 1700, color: C.teal }] },
      { say: '查找引用：定义的反方向。Area 出现在第 11 行（声明）和第 17 行（调用）。', hl: [11, 17],
        log: ['--> textDocument/references  #6', { s: '<-- 引用: shapes/main.go L11:15, shapes/main.go L17:16', at: 1500 }], data: { '方法': 'references', '位置': 'L11:15', '结果': { v: '2 处', at: 1500 } },
        set: merge({ m5: { opacity: { to: 0, dur: 300 } }, r5: { opacity: { to: 0, dur: 300 } } }, fly('m7', 1, 480, 0), fly('r7', -1, 520, 900)) },
      { say: '收尾：shutdown 请求加 exit 通知，gopls 正常退出。IDE 每天在背后替你做的，就是这些事。import 帮助见练习 3 的实测输出。',
        log: ['--> shutdown  #8', '--> exit', { s: 'gopls 退出码 0', at: 900 }], data: { '方法': 'shutdown / exit', '位置': '无', '结果': { v: '退出码 0', at: 900 } },
        set: { m6: { opacity: { to: 0.25, dur: 300 } }, r6: { opacity: { to: 0.25, dur: 300 } }, m7: { opacity: { to: 0.25, dur: 300 } }, r7: { opacity: { to: 0.25, dur: 300 } } },
        fx: [{ type: 'pulse', x: SX, y: 70, at: 600, color: C.teal }] }
    ]
  };

  /* ---------- AI 补全 ---------- */
  var AX0 = 60, ACW = 9.6, ALY0 = 90, ALH = 30;
  function aly(l) { return ALY0 + (l - 1) * ALH; }
  function codeLine(l, t, col, op) { return { type: 'text', x: AX0, y: aly(l), anchor: 'start', mono: true, size: 16, cw: ACW, text: nb(t), color: col || C.fg, opacity: op == null ? 1 : op }; }
  var sceneComplete = {
    name: 'AI 补全', desc: '补全把光标前的内容当作上下文，交给模型。模型在光标处续写，显示成灰色，按 Tab 接受。注释能改变上下文，从而改变补全。但它只能写在光标之后。',
    code: { lang: 'py', title: '讲义示例（模型输出逐字取自讲义）', src: "import requests\n\ndef download_contents(url: str) -> str:\n    response = requests.get(url)\n    return response.text\n\ndef extract(content: str) -> list[str]:\n    # extract all Markdown links from the content\n    import re\n    pattern = r'\\[.*?\\]\\((.*?)\\)'\n    return re.findall(pattern, content)" },
    dataTitle: '补全',
    data: { '上下文': '无', '建议': '无', '状态': '无' },
    legend: [[C.fg3, '灰色：模型建议（未接受）'], [C.info, '模型'], [C.data, '上下文'], [C.bad, '问题']],
    bg: function (d) { d.rect(30, 60, 560, 380, { fill: C.bg2, stroke: C.line, rx: 10 }); d.text(40, 50, 'scrape.py', { size: 12, mono: true, color: C.fg3, weight: 700 }); },
    objects: {
      a1: codeLine(1, 'import requests'), a2: codeLine(3, 'def download_contents(url: str) -> str:', C.fg, 0),
      g1: codeLine(4, '    response = requests.get(url)', C.fg3, 0), g2: codeLine(5, '    return response.text', C.fg3, 0),
      b1: codeLine(7, 'def extract(content: str) -> list[str]:', C.fg, 0),
      bad1: codeLine(8, '    lines = content.splitlines()', C.fg3, 0), bad2: codeLine(9, '    return [line for line in lines if line.strip()]', C.fg3, 0),
      cm: codeLine(8, '    # extract all Markdown links from the content', C.ok, 0),
      h1: codeLine(9, '    import re', C.fg3, 0), h2: codeLine(10, "    pattern = r'\\[.*?\\]\\((.*?)\\)'", C.fg3, 0), h3: codeLine(11, '    return re.findall(pattern, content)', C.fg3, 0),
      cur: { type: 'box', x: AX0 + 40 * ACW, y: aly(3), w: 2.5, h: 22, rx: 1, fill: C.warn, stroke: C.warn, sw: 1, opacity: 0 },
      model: box(740, 250, 150, 60, 'LLM', C.info, C.infoW, { size: 18 }),
      ctx: pipe('M590,200 C650,200 660,240 665,248', C.data), back: pipe('M740,282 C740,360 650,330 592,330', C.info),
      warn: box(380, 360, 270, 36, 'import 写进了函数中间', C.bad, C.badW, { size: 12.5, opacity: 0 }),
      upArr: { type: 'path', d: 'M200,368 C120,300 110,140 150,96', stroke: C.bad, sw: 2, dash: 0, arrow: 'atk', dasharray: '5 4' }
    },
    steps: [
      { say: '你写了 import 和函数签名，光标停在下一行。签名是 download_contents(url: str) -> str:。', hl: [1, 3],
        data: { '上下文': 'import + 函数签名', '状态': '输入中' },
        set: { a2: { opacity: { to: 1, dur: 400 } }, cur: { opacity: { to: 1, delay: 400, dur: 200 }, x: { to: AX0 + 4 * ACW, delay: 400, dur: 300 }, y: { to: aly(4), delay: 400, dur: 300 } } } },
      { say: '编辑器把光标前的内容作为上下文，发给模型。模型在光标处续写出灰色的函数体，这是讲义原文。讲师还能在几个候选之间切换。', hl: [4, 5],
        data: { '建议': { v: '2 行函数体', at: 1500 }, '状态': '建议中（灰色）' },
        set: { ctx: { dash: { to: 1, dur: 400 } }, back: { dash: { to: 1, delay: 900, dur: 400 } }, g1: { opacity: { to: 1, delay: 1400, dur: 300 } }, g2: { opacity: { to: 1, delay: 1550, dur: 300 } } },
        fx: [{ type: 'stream', path: 'ctx', at: 200, n: 3, dur: 700, color: C.data, labels: ['import requests', 'def download…'] }, { type: 'pulse', obj: 'model', at: 900, color: C.info }, { type: 'stream', path: 'back', at: 1000, n: 2, dur: 600, color: C.info }] },
      { say: '按 Tab 接受，灰色变成正式代码。整个函数体，你只敲了一个签名。但模型只是概率模型，接受前一定要看一眼对不对。',
        data: { '状态': '已接受' }, set: { g1: { color: { to: C.fg, dur: 300 } }, g2: { color: { to: C.fg, delay: 100, dur: 300 } }, ctx: { dash: { to: 0, dur: 300 } }, back: { dash: { to: 0, dur: 300 } } },
        fx: [{ type: 'flash', x: 250, y: aly(4.5), at: 100, color: C.ok }] },
      { say: '再写一个名字含糊的函数 extract(content) -> list[str]。模型只能猜最常见的写法，把内容按行切开。这对“提取链接”毫无用处。', hl: [7],
        data: { '上下文': '+ extract 签名', '建议': { v: '按行切分（没用）', at: 1300 }, '状态': '建议中' },
        set: { b1: { opacity: { to: 1, dur: 400 } }, cur: { y: { to: aly(8), delay: 300, dur: 300 } }, ctx: { dash: { to: 1, delay: 400, dur: 400 } }, back: { dash: { to: 1, delay: 900, dur: 400 } },
          bad1: { opacity: { to: 1, delay: 1300, dur: 300 } }, bad2: { opacity: { to: 1, delay: 1450, dur: 300 } } },
        fx: [{ type: 'stream', path: 'ctx', at: 500, n: 2, dur: 600, color: C.data }, { type: 'stream', path: 'back', at: 1000, n: 2, dur: 600, color: C.info }, { type: 'shake', obj: 'bad1', at: 1900 }] },
      { say: '不接受，改写一行注释：# extract all Markdown links from the content。注释也是上下文。这就是“用注释引导补全”。', hl: [8],
        data: { '上下文': '+ 注释：提取 Markdown 链接', '建议': '无' },
        set: { bad1: { opacity: { to: 0, dur: 300 } }, bad2: { opacity: { to: 0, dur: 300 } }, cm: { opacity: { to: 1, delay: 300, dur: 400 } }, cur: { y: { to: aly(9), delay: 600, dur: 300 } }, back: { dash: { to: 0, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'cm', at: 700, color: C.ok }] },
      { say: '这次补全对了，下面是讲义原文。先导入 re，再写一个匹配 [文字](链接) 的正则。最后用 findall 取出括号里的链接。讲师演示时，它是分几段补出来的，按了几次 Tab。', hl: [9, 10, 11],
        data: { '建议': { v: 're.findall(…)', at: 1500 }, '状态': '已接受' },
        set: { ctx: { dash: { to: 1, dur: 300 } }, back: { dash: { to: 1, delay: 600, dur: 400 } }, h1: { opacity: { to: 1, delay: 1100, dur: 300 }, color: { to: C.fg, delay: 2000, dur: 300 } }, h2: { opacity: { to: 1, delay: 1300, dur: 300 }, color: { to: C.fg, delay: 2100, dur: 300 } }, h3: { opacity: { to: 1, delay: 1500, dur: 300 }, color: { to: C.fg, delay: 2200, dur: 300 } } },
        fx: [{ type: 'stream', path: 'ctx', at: 100, n: 3, dur: 600, color: C.data, labels: ['# extract…'] }, { type: 'stream', path: 'back', at: 700, n: 3, dur: 600, color: C.info }] },
      { say: '缺点：import re 被写进了函数中间。按惯例，它属于文件顶部。补全只能在光标之后续写，回不到上面去。改别处的代码，要用行内对话或智能体。', hl: [9],
        data: { '状态': '局限：只能续写光标之后' },
        set: { ctx: { dash: { to: 0, dur: 300 } }, back: { dash: { to: 0, dur: 300 } }, warn: { opacity: { to: 1, dur: 300 } }, upArr: { dash: { to: 1, delay: 300, dur: 800 } }, h1: { color: { to: C.bad, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'h1', at: 300 }] },
      { say: '更好的写法：函数起个清楚的名字 extract_links，再写个 docstring。模型同样能一次补全，docstring 以后对人也有用。只为引导 AI 写的临时注释，事后删掉。本机用 python 验证了这个正则，见正文。',
        log: [{ s: "$ python -c \"import re; print(re.findall(r'\\[.*?\\]\\((.*?)\\)', 'See [VS Code](https://code.visualstudio.com/) and [Vim](https://www.vim.org/).'))\"", at: 300 }, { s: "['https://code.visualstudio.com/', 'https://www.vim.org/']", at: 900 }],
        set: { warn: { opacity: { to: 0, dur: 300 } }, upArr: { dash: { to: 0, dur: 300 } }, b1: { text: nb('def extract_links(content: str) -> list[str]:'), color: { to: C.ok, dur: 300 } } },
        fx: [{ type: 'flash', obj: 'b1', at: 200, color: C.ok }] }
    ]
  };

  /* ---------- 行内对话 ---------- */
  var IX0 = 60, ICW = 9.6;
  function il(l) { return 110 + (l - 1) * 32; }
  function iLine(l, t, col, op) { return { type: 'text', x: IX0, y: il(l), anchor: 'start', mono: true, size: 16, cw: ICW, text: nb(t), color: col || C.fg, opacity: op == null ? 1 : op }; }
  var sceneInline = {
    name: '行内对话', desc: '选中一段代码，用自然语言下指令。模型给出修改建议，编辑器用 diff 显示，红删绿增。你审阅后，决定保留还是丢弃。它能改已有代码，但通常只改选区。',
    code: { lang: 'py', title: '讲义：模型的提议', src: "from urllib.request import urlopen\n\ndef download_contents(url: str) -> str:\n    with urlopen(url) as response:\n        return response.read().decode('utf-8')" },
    dataTitle: '行内对话',
    data: { '选区': '无', '指令': '无', '状态': '无' },
    legend: [[C.data, '选区'], [C.bad, '删除的行'], [C.ok, '新增的行'], [C.info, '模型']],
    bg: function (d) { d.rect(30, 70, 560, 330, { fill: C.bg2, stroke: C.line, rx: 10 }); },
    objects: {
      o1: iLine(1, 'import requests'), o2: iLine(3, 'def download_contents(url: str) -> str:'), o3: iLine(4, '    response = requests.get(url)'), o4: iLine(5, '    return response.text'),
      sel: { type: 'box', x: 300, y: il(1), w: 520, h: 30, rx: 4, fill: C.dataW, stroke: C.data, sw: 1.2, opacity: 0 },
      prompt: box(310, 440, 470, 40, '', C.warn, C.warnW, { size: 13.5, opacity: 0 }),
      model: box(760, 250, 140, 56, 'LLM', C.info, C.infoW, { size: 18 }),
      tx: pipe('M590,200 C650,200 680,230 690,240', C.data), rx: pipe('M760,280 C760,360 660,360 592,330', C.info),
      n1: iLine(2, 'from urllib.request import urlopen', C.ok, 0), n2: iLine(6, '    with urlopen(url) as response:', C.ok, 0), n3: iLine(7, "        return response.read().decode('utf-8')", C.ok, 0),
      strike1: { type: 'line', x1: IX0, y1: il(1), x2: IX0 + 15 * ICW, y2: il(1), stroke: C.bad, sw: 2, dash: 0 },
      strike3: { type: 'line', x1: IX0, y1: il(4), x2: IX0 + 32 * ICW, y2: il(4), stroke: C.bad, sw: 2, dash: 0 },
      strike4: { type: 'line', x1: IX0, y1: il(5), x2: IX0 + 24 * ICW, y2: il(5), stroke: C.bad, sw: 2, dash: 0 }
    },
    steps: [
      { say: '接着补全那一幕。现在不想依赖第三方库 requests。讲师在 VS Code 里开着 Vim 键位。他用 V 进入行选择，j 往下扩展，选中这几行。',
        data: { '选区': { v: '第 1–5 行', at: 900 } },
        set: { sel: { opacity: { to: 0.6, dur: 200 }, y: { from: il(1), to: il(3), delay: 300, dur: 600 }, h: { from: 30, to: 160, delay: 300, dur: 600 } } },
        fx: [{ type: 'pulse', obj: 'sel', at: 900, color: C.data }] },
      { say: 'Ctrl+I（Mac 上 Cmd+I）唤起行内对话，输入指令：use built-in libraries instead。',
        data: { '指令': { v: 'use built-in libraries instead', at: 700 }, '状态': '等待模型' },
        set: { prompt: { text: '> use built-in libraries instead', opacity: { to: 1, dur: 300 }, y: { from: 470, to: 440, dur: 400, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'prompt', at: 400, color: C.warn }] },
      { say: '选中的代码和指令一起发给模型。',
        set: { tx: { dash: { to: 1, dur: 400 } } },
        fx: [{ type: 'stream', path: 'tx', at: 200, n: 4, dur: 800, color: C.data, labels: ['选区', '指令'] }, { type: 'pulse', obj: 'model', at: 1000, color: C.info }] },
      { say: '模型提出修改，编辑器用 diff 显示。红色划掉的是要删的 requests 写法。绿色是新增的标准库 urllib 写法，这是讲义原文。',
        data: { '状态': '待审阅（diff）' },
        set: { rx: { dash: { to: 1, dur: 400 } }, strike1: { dash: { to: 1, delay: 500, dur: 400 } }, strike3: { dash: { to: 1, delay: 650, dur: 400 } }, strike4: { dash: { to: 1, delay: 800, dur: 400 } },
          o1: { color: { to: C.bad, delay: 500, dur: 300 } }, o3: { color: { to: C.bad, delay: 650, dur: 300 } }, o4: { color: { to: C.bad, delay: 800, dur: 300 } },
          n1: { opacity: { to: 1, delay: 1100, dur: 300 } }, n2: { opacity: { to: 1, delay: 1250, dur: 300 } }, n3: { opacity: { to: 1, delay: 1400, dur: 300 } } },
        fx: [{ type: 'stream', path: 'rx', at: 200, n: 3, dur: 700, color: C.info }] },
      { say: '和补全不同，它修改了已经存在的代码。删掉了 import requests，还改写了函数体。讲师审阅后觉得都合理，选择保留。',
        data: { '状态': '已保留' },
        set: { prompt: { opacity: { to: 0, dur: 300 } }, tx: { dash: { to: 0, dur: 300 } }, rx: { dash: { to: 0, dur: 300 } }, sel: { opacity: { to: 0, dur: 300 } },
          o1: { opacity: { to: 0, dur: 400 } }, o3: { opacity: { to: 0, dur: 400 } }, o4: { opacity: { to: 0, dur: 400 } }, strike1: { opacity: { to: 0, dur: 300 } }, strike3: { opacity: { to: 0, dur: 300 } }, strike4: { opacity: { to: 0, dur: 300 } },
          n1: { y: { to: il(1), delay: 400, dur: 600 }, color: { to: C.fg, delay: 400, dur: 300 } }, o2: { y: { to: il(3), delay: 400, dur: 600 } },
          n2: { y: { to: il(4), delay: 400, dur: 600 }, color: { to: C.fg, delay: 400, dur: 300 } }, n3: { y: { to: il(5), delay: 400, dur: 600 }, color: { to: C.fg, delay: 400, dur: 300 } } },
        fx: [{ type: 'flash', x: 300, y: il(3), at: 1000, color: C.ok }] },
      { say: '学生问：改动要用到选区之外的上下文呢？讲师现场让它“把 import 移到外面”。这个实现只改选区里的内容，没做成有用的事。别的编辑器可能不同，这个领域变化很快。',
        data: { '选区': '光标处', '指令': 'move this import outside', '状态': '只能改选区内（这个实现）' },
        set: { prompt: { text: '> move this import outside', opacity: { to: 1, dur: 300 } }, sel: { y: { to: il(4), dur: 0 }, h: { to: 30, dur: 0 }, opacity: { to: 0.5, delay: 200, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'prompt', at: 1200 }] }
    ]
  };

  VZ.register({ id: 'ch03-lsp', title: '语言服务器协议：M×N 变 M+N，以及一次真实的会话',
    sources: [{ t: '视频 29:32 语言服务器', u: 'https://youtu.be/QnM1nVzrkx8?t=1772' }, { t: '视频 30:42 补全 / 跳转 / 引用', u: 'https://youtu.be/QnM1nVzrkx8?t=1842' }, { t: 'LSP 规范', u: 'https://microsoft.github.io/language-server-protocol/' }, { t: 'gopls', u: 'https://go.dev/gopls/' }, LEC],
    note: '第 1 幕的集成数量是示意计算。第 2 幕的消息和结果，都是练习 3 的本机真跑输出。gopls 版本是 v0.21.0。', scenes: [sceneMN, sceneGopls] });
  VZ.register({ id: 'ch03-complete', title: 'AI 补全：上下文进去，续写出来，注释能引导它',
    sources: [{ t: '视频 35:25 AI 补全', u: 'https://youtu.be/QnM1nVzrkx8?t=2125' }, { t: '视频 38:52 用注释引导', u: 'https://youtu.be/QnM1nVzrkx8?t=2332' }, { t: '视频 40:35 只能补光标之后', u: 'https://youtu.be/QnM1nVzrkx8?t=2435' }, LEC],
    note: '模型的输出逐字取自讲义原文。上下文和模型之间的数据流是示意。最后一步的正则，在本机 python 里实测过。', scenes: [sceneComplete] });
  VZ.register({ id: 'ch03-inline', title: '行内对话：选中、下指令、审阅 diff',
    sources: [{ t: '视频 42:25 行内对话', u: 'https://youtu.be/QnM1nVzrkx8?t=2545' }, { t: '视频 43:38 diff 审阅', u: 'https://youtu.be/QnM1nVzrkx8?t=2618' }, { t: '视频 44:45 只改选区', u: 'https://youtu.be/QnM1nVzrkx8?t=2685' }, LEC],
    note: '模型的提议逐字取自讲义原文。选区、提示框和数据流是示意。本机没有接入 AI 编程工具。', scenes: [sceneInline] });
})();
