/* ch09 · 正则表达式 —— 逐字符看匹配、回溯与捕获（可视化演示）
 * 依据：Lecture 9 视频 56:04–1:00:36（字面量、字符类、否定、范围、\d \w \b、分组、. 与转义、^ $）、
 *       1:00:36–1:03:58（捕获组、Vim 替换 \1\1、Python re.match group）；讲义 code-quality.md「Regular expressions」。
 * 实测：控制台里的输出都是笔记作者在本机真跑的（GNU grep 3.0、GNU sed 4.9、Vim 9.2、Python 3.13.5 的 re 模块）。
 * 示意：引擎“逐字符比较、回溯”的画法是对回溯式正则引擎的简化描述（补充，非视频内容）；字符方块、光标是示意。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: text, size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 6, text: text || '', fill: C.bg, stroke: C.line, sw: 1.4, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }
  /* 一行字符方块：id 前缀 p，第 k 个字符的中心 x = x0 + (k + .5) * cw */
  function chars(o, p, str, x0, y, cw, extra) {
    for (var k = 0; k < str.length; k++) o[p + k] = B(x0 + (k + 0.5) * cw, y, cw - 3, 32, str[k] === ' ' ? '␣' : str[k], merge({ mono: true, size: 15, fill: C.bg2, color: str[k] === ' ' ? C.fg3 : C.fg }, extra || {}));
    return o;
  }
  function cx(x0, cw, k) { return x0 + (k + 0.5) * cw; }
  function paint(p, from, to, col, colW, at) {
    var s = {};
    for (var k = from; k < to; k++) s[p + k] = { fill: { to: colW, delay: (at || 0) + (k - from) * 60, dur: 200 }, stroke: { to: col, delay: (at || 0) + (k - from) * 60, dur: 200 } };
    return s;
  }

  /* ================= ch09-regex-class：字符类 / 否定 / \b ================= */
  var HS = ['hello a', 'hello b', 'hello d', 'hello ab', 'hello f'];
  var HX0 = 150, HCW = 38, HY0 = 150, HDY = 66;
  var sceneClass = {
    name: '字符类与否定', desc: '[abc] 匹配方括号里的任意一个字符。[^abc] 匹配“除了 a、b、c 之外”的任意一个字符。看 hello [^abc] 对 5 个字符串分别怎么判。',
    code: { lang: 'sh', title: '本机实测（GNU grep 3.0）', src: "printf 'hello a\\nhello b\\nhello d\\nhello ab\\nhello f\\n' > h.txt\ngrep -nE 'hello [^abc]' h.txt" },
    dataTitle: '当前比较',
    data: { '字符串': '无', '第 7 个字符': '无', '∈ {a,b,c}?': '无', '结果': '无' },
    legend: [[C.data, '正在比较的位置'], [C.ok, '匹配成功'], [C.bad, '匹配失败'], [C.info, '模式中的一项']],
    bg: function (d) {
      d.text(430, 24, '模式  hello [^abc]：前 6 项是字面量，第 7 项是一个“否定字符类”', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(HX0 - 20, 80, '模式', { anchor: 'end', size: 12, color: C.fg3 });
      HS.forEach(function (s, i) { d.text(HX0 - 20, HY0 + i * HDY, 'L' + (i + 1), { anchor: 'end', size: 12, mono: true, color: C.fg3 }); });
    },
    objects: function () {
      var o = {};
      'hello '.split('').forEach(function (c, k) { o['p' + k] = B(cx(HX0, HCW, k), 80, HCW - 3, 32, c === ' ' ? '␣' : c, { mono: true, size: 15, fill: C.infoW, stroke: C.info, color: C.info }); });
      o.p6 = B(cx(HX0, HCW, 6) + 30, 80, 96, 32, '[^abc]', { mono: true, size: 15, fill: C.infoW, stroke: C.info, color: C.info });
      HS.forEach(function (s, i) { chars(o, 's' + i + '_', s, HX0, HY0 + i * HDY, HCW, { opacity: 0.45 }); o['r' + i] = T(HX0 + 9 * HCW + 20, HY0 + i * HDY, '', { size: 18, weight: 800, opacity: 0 }); });
      o.cur = B(cx(HX0, HCW, 0), HY0, HCW + 2, 40, '', { fill: 'none', stroke: C.data, sw: 2.6, rx: 8, opacity: 0, trail: { n: 4, gap: 40 } });
      o.pcur = B(cx(HX0, HCW, 0), 80, HCW + 2, 40, '', { fill: 'none', stroke: C.data, sw: 2.6, rx: 8, opacity: 0 });
      return o;
    },
    steps: (function () {
      var st = [{ say: '模式是 hello [^abc]。先逐个匹配 6 个字面字符：h e l l o 和空格。第 7 项 [^abc]，匹配不是 a、b、c 的任意一个字符。这段在视频 56:59。', hl: [2],
        set: (function () { var s = {}; for (var k = 0; k < 7; k++) s['p' + k] = { y: { from: 60, to: 80, delay: k * 80, dur: 400, ease: 'back' } }; return s; })(),
        fx: [{ type: 'pulse', obj: 'p6', at: 700, color: C.info }] }];
      var ok = [false, false, true, false, true];
      HS.forEach(function (s, i) {
        var y = HY0 + i * HDY, set = {}, ch = s[6];
        for (var k = 0; k < s.length; k++) set['s' + i + '_' + k] = { opacity: { to: 1, dur: 200 } };
        set.cur = { opacity: { to: 1, dur: 150 }, y: { to: y, dur: 300 }, x: { from: cx(HX0, HCW, 0), to: cx(HX0, HCW, 6), delay: 300, dur: 900, ease: 'linear' } };
        set.pcur = { opacity: { to: 1, dur: 150 }, x: { from: cx(HX0, HCW, 0), to: cx(HX0, HCW, 6) + 30, delay: 300, dur: 900, ease: 'linear' }, w: { from: HCW + 2, to: 100, delay: 1100, dur: 200 } };
        set = merge(set, paint('s' + i + '_', 0, 6, C.ok, C.okW, 300));
        set['s' + i + '_6'] = { fill: { to: ok[i] ? C.okW : C.badW, delay: 1300, dur: 250 }, stroke: { to: ok[i] ? C.ok : C.bad, delay: 1300, dur: 250 } };
        set['r' + i] = { text: ok[i] ? '√ 匹配' : '×', color: { to: ok[i] ? C.ok : C.bad, dur: 0 }, opacity: { to: 1, delay: 1500, dur: 250 } };
        var say = ok[i] ? '“' + s + '”：前 6 个字符逐一相同。第 7 个是 ' + ch + '，不在 {a,b,c} 里。所以 [^abc] 匹配，整行命中。'
          : (i === 3 ? '“hello ab”：第 7 个字符 a 在 {a,b,c} 里，失败。引擎再从后面的位置重试，可再也找不到 “hello ”。所以整行不匹配，视频里学生问的就是这个。'
            : '“' + s + '”：前 6 个字符都对上了。但第 7 个字符 ' + ch + ' 在 {a,b,c} 里，[^abc] 不匹配。这一行没有命中。');
        st.push({ say: say, data: { '字符串': s, '第 7 个字符': ch, '∈ {a,b,c}?': { v: ok[i] ? '否' : '是', at: 1200 }, '结果': { v: ok[i] ? '匹配' : '不匹配', at: 1500 } },
          eq: { s: s + '：' + ch + (ok[i] ? ' ∉ ' : ' ∈ ') + '{a,b,c} → ' + (ok[i] ? '匹配' : '失败'), at: 1300, cls: ok[i] ? 'ok' : 'bad' },
          set: set, fx: ok[i] ? [{ type: 'ripple', obj: 's' + i + '_6', at: 1400, color: C.ok }] : [{ type: 'shake', obj: 's' + i + '_6', at: 1400 }] });
      });
      st.push({ say: 'grep 只输出命中的行：第 3、5 行（本机实测）。方括号里还可以写范围，例如 [a-f]（视频 57:43）。', hl: [2],
        log: ["$ grep -nE 'hello [^abc]' h.txt", { s: '3:hello d', at: 400, cls: 'ok' }, { s: '5:hello f', at: 600, cls: 'ok' }],
        set: { cur: hide(), pcur: hide() }, fx: [{ type: 'pulse', obj: 'r2', at: 400, color: C.ok }, { type: 'pulse', obj: 'r4', at: 600, color: C.ok }] });
      return st;
    })()
  };

  var D1 = 'def foo():', D2 = 'blah define', BX0 = 120, BCW = 40;
  function wordChar(c) { return /\w/.test(c); }
  function bounds(str) { var b = []; for (var k = 0; k <= str.length; k++) { var L = k > 0 && wordChar(str[k - 1]), R = k < str.length && wordChar(str[k]); if (L !== R) b.push(k); } return b; }
  var B1 = bounds(D1), B2 = bounds(D2);
  var sceneB = {
    name: '\\b 单词边界', desc: '\\b 不匹配任何字符，只匹配一个“位置”。它左右两边，恰好一边是单词字符 \\w，另一边不是。用它能把 def 和 define 区分开。',
    code: { lang: 'sh', title: '本机实测', src: "printf 'def foo():\\n    s = \"hello, blah blah define\"\\n' > d.py\ngrep -nE 'def' d.py\ngrep -nE '\\bdef\\b' d.py" },
    dataTitle: '位置判断',
    data: { '模式': '无', '命中': '无' },
    bg: function (d) {
      d.text(430, 24, '\\b 是两个字符之间的“缝”：左右一边是 \\w、一边不是', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(BX0 - 16, 160, '行 1', { anchor: 'end', size: 12, color: C.fg3 });
      d.text(BX0 - 16, 330, '行 2', { anchor: 'end', size: 12, color: C.fg3 });
      d.text(BX0, 400, '（行 2 是字符串 "hello, blah blah define" 的一部分）', { size: 11.5, color: C.fg3 });
    },
    objects: function () {
      var o = {};
      chars(o, 'a', D1, BX0, 160, BCW); chars(o, 'b', D2, BX0, 330, BCW);
      B1.forEach(function (k, j) { o['ba' + j] = { type: 'line', x1: BX0 + k * BCW, y1: 132, x2: BX0 + k * BCW, y2: 188, stroke: C.warn, sw: 3, opacity: 0 }; });
      B2.forEach(function (k, j) { o['bb' + j] = { type: 'line', x1: BX0 + k * BCW, y1: 302, x2: BX0 + k * BCW, y2: 358, stroke: C.warn, sw: 3, opacity: 0 }; });
      o.m1 = B(BX0 + 1.5 * BCW, 160, 3 * BCW + 6, 44, '', { fill: 'none', stroke: C.ok, sw: 2.6, rx: 8, opacity: 0 });
      o.m2 = B(BX0 + 6.5 * BCW, 330, 3 * BCW + 6, 44, '', { fill: 'none', stroke: C.ok, sw: 2.6, rx: 8, opacity: 0 });
      o.lbl = T(BX0, 230, '', { size: 13, weight: 700, color: C.bad, opacity: 0 });
      o.lbl2 = T(BX0, 450, '', { size: 13, weight: 700, color: C.ok, opacity: 0 });
      return o;
    },
    steps: [
      { say: '想找 Python 里所有的函数定义：搜 def。可字符串里的 define 也含 def（视频 58:55）。', hl: [1, 2], data: { '模式': 'def' },
        log: ["$ grep -nE 'def' d.py", { s: '1:def foo():', at: 500 }, { s: '2:    s = "hello, blah blah define"', at: 700, cls: 'err' }],
        set: merge({ m1: show(300), m2: merge(show(500), { stroke: { to: C.bad, dur: 0 } }), lbl: merge(show(800), { text: '只写 def：两处都命中，第 2 处是误报' }) }),
        fx: [{ type: 'shake', obj: 'm2', at: 800 }] },
      { say: '\\b 匹配的是“缝”。逐个检查每条缝：左边是不是 \\w？右边是不是 \\w？两者不同就是边界。行 1 的边界画成橙线。',
        set: (function () { var s = { m1: hide(), m2: hide(), lbl: hide() }; B1.forEach(function (k, j) { s['ba' + j] = { opacity: { to: 1, delay: 200 + j * 200, dur: 200 }, y1: { from: 160, to: 132, delay: 200 + j * 200, dur: 300 }, y2: { from: 160, to: 188, delay: 200 + j * 200, dur: 300 } }; }); return s; })(),
        eq: ['\\b 成立 ⇔ (左侧是 \\w) ≠ (右侧是 \\w)', { s: '行 1 的缝 0：左=行首(否) 右=d(是) → 边界', at: 600 }, { s: '缝 3：左=f(是) 右=空格(否) → 边界', at: 1000 }] },
      { say: '行 2 同理。注意 define 的 f 和 i 之间：左右都是 \\w，不是边界。',
        set: (function () { var s = {}; B2.forEach(function (k, j) { s['bb' + j] = { opacity: { to: 1, delay: 200 + j * 200, dur: 200 }, y1: { from: 330, to: 302, delay: 200 + j * 200, dur: 300 }, y2: { from: 330, to: 358, delay: 200 + j * 200, dur: 300 } }; }); return s; })(),
        eq: { s: 'define 里 f|i：左=f(是) 右=i(是) → 不是边界', at: 900, cls: 'bad' }, fx: [{ type: 'pulse', obj: 'b8', at: 900, color: C.bad }] },
      { say: '\\bdef\\b 要求 def 前后都是边界。行 1 满足。行 2 的 def 后面紧跟 i，不满足。', hl: [3], data: { '模式': '\\bdef\\b' },
        set: { m1: merge(show(300), { stroke: { to: C.ok, dur: 0 } }), m2: merge(show(300), { stroke: { to: C.bad, dur: 0 } }), lbl: merge(show(700), { text: '行 1：前后都是边界 √', color: { to: C.ok, dur: 0 } }), lbl2: merge(show(1000), { text: '行 2：def 后面没有边界 ×', color: { to: C.bad, dur: 0 } }) },
        fx: [{ type: 'ripple', obj: 'm1', at: 400, color: C.ok }, { type: 'shake', obj: 'm2', at: 900 }] },
      { say: 'grep 结果只剩第 1 行（本机实测）。\\d、\\w、\\b 都是常用的简写。它们都是反斜杠加一个字母（视频 58:21）。', hl: [3],
        data: { '命中': { v: '只有行 1', at: 500 } },
        log: ["$ grep -nE '\\bdef\\b' d.py", { s: '1:def foo():', at: 500, cls: 'ok' }],
        set: { m2: hide(200) }, fx: [{ type: 'burst', obj: 'm1', at: 600, color: C.ok }] },
      { say: '同样只匹配“位置”的，还有行首 ^ 和行尾 $。^world$ 只匹配整行恰好是 world 的行。hello world hi 就不行（视频 1:00:05）。',
        set: { m1: hide(), lbl: hide(), lbl2: hide() },
        eq: ['\\b、^、$ 都是“零宽”的：只判断位置，不消耗字符', { s: '^ = 行首之前的位置，$ = 行尾之后的位置', at: 700 }, { s: '^world$：world 必须从行首开始、到行尾结束', at: 1400 }],
        fx: [{ type: 'ripple', x: BX0, y: 160, at: 300, color: C.warn }, { type: 'ripple', x: BX0 + D1.length * BCW, y: 160, at: 700, color: C.warn }] }
    ]
  };

  VZ.register({
    id: 'ch09-regex-class', title: '字符类、否定与 \\b：一个字符一个字符地比',
    sources: [{ t: '视频 56:04 字面量与字符类', u: 'https://youtu.be/XBiLUNx84CQ?t=3364' }, { t: '视频 58:21 \\d \\w \\b', u: 'https://youtu.be/XBiLUNx84CQ?t=3501' }, { t: '讲义 Regex syntax', u: 'https://missing.csail.mit.edu/2026/code-quality/#regex-syntax' }, { t: 'Python re 文档', u: 'https://docs.python.org/3/library/re.html#regular-expression-syntax' }],
    note: 'grep 输出是本机 GNU grep 3.0 实测的。逐字符比较的画法是示意。', scenes: [sceneClass, sceneB]
  });

  /* ================= ch09-regex-quant：量词与回溯 ================= */
  var DS = '2026-01-99', QX0 = 150, QCW = 50;
  var TOK = [['\\d{4}', 0, 4], ['-', 4, 5], ['\\d{2}', 5, 7], ['-', 7, 8], ['\\d{2}', 8, 10]];
  var sceneDate = {
    name: '\\d{4}-\\d{2}-\\d{2}', desc: '量词 {N} 表示“前一项恰好重复 N 次”。这个模式只检查“形状”。4 位数字、2 位数字、2 位数字，中间用连字符隔开。它并不知道 99 号不存在（讲义）。',
    code: { lang: 'py', title: '本机实测（Python 3.13 re）', src: 'import re\nre.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", "2026-01-14")  # True\nre.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", "2026-01-99")  # True\nre.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", "26-1-14")     # False' },
    dataTitle: '匹配进度',
    data: { '当前模式项': '无', '已消耗字符': 0 },
    bg: function (d) { d.text(430, 24, '模式的每一项依次“吃掉”字符串里的字符', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 }); },
    objects: function () {
      var o = {};
      TOK.forEach(function (t, j) { o['t' + j] = B((cx(QX0, QCW, t[1]) + cx(QX0, QCW, t[2] - 1)) / 2, 110, (t[2] - t[1]) * QCW - 6, 36, t[0], { mono: true, size: 15, fill: C.infoW, stroke: C.info, color: C.info }); });
      chars(o, 'c', DS, QX0, 230, QCW);
      chars(o, 'e', '26-1-14', QX0, 400, QCW, { opacity: 0 });
      o.arrow = T(QX0, 175, '▼', { size: 18, color: C.data, anchor: 'middle', opacity: 0, trail: { n: 4, gap: 40 } });
      o.cnt = T(QX0 + 10 * QCW + 30, 230, '', { num: 0, pre: '已匹配 ', post: ' 个', size: 14, weight: 700, color: C.data, opacity: 0 });
      o.verdict = B(430, 300, 360, 40, '', { size: 14, fill: C.okW, stroke: C.ok, opacity: 0 });
      o.v2 = B(430, 470, 360, 40, '', { size: 14, fill: C.badW, stroke: C.bad, opacity: 0 });
      return o;
    },
    steps: (function () {
      var st = [], consumed = 0;
      var says = ['\\d 匹配一个数字，{4} 要求恰好 4 个：2、0、2、6 依次被吃掉。', '字面量 - 匹配连字符本身。', '\\d{2}：两个数字 0、1。', '又一个 -。', '\\d{2}：9、9 也是两个数字，匹配成功！可 1 月没有 99 号。'];
      TOK.forEach(function (t, j) {
        var s = merge(paint('c', t[1], t[2], C.ok, C.okW, 300), {
          arrow: { opacity: { to: 1, dur: 200 }, x: { from: cx(QX0, QCW, t[1]), to: cx(QX0, QCW, t[2] - 1), delay: 200, dur: Math.max(400, (t[2] - t[1]) * 220), ease: 'linear' } },
          cnt: { opacity: { to: 1, dur: 200 }, num: { to: t[2], delay: 200, dur: Math.max(400, (t[2] - t[1]) * 220) } } });
        s['t' + j] = { fill: { to: C.okW, delay: 200, dur: 250 }, stroke: { to: C.ok, delay: 200, dur: 250 }, color: { to: C.ok, delay: 200, dur: 250 }, y: { from: 100, to: 110, delay: 200, dur: 400, ease: 'back' } };
        st.push({ say: says[j], hl: [3], data: { '当前模式项': t[0], '已消耗字符': { v: t[2], at: 100 } }, set: s, hold: 2700, eq: { s: t[0] + ' 吃掉 "' + DS.slice(t[1], t[2]) + '"', at: 500 } });
      });
      st[4].set.verdict = merge(show(1300), { text: 'fullmatch → True（2026-01-99 也“像日期”）' });
      st[4].fx = [{ type: 'ripple', obj: 'verdict', at: 1400, color: C.ok }];
      st[4].log = ['>>> re.fullmatch(r"\\d{4}-\\d{2}-\\d{2}", s) for s in ["2026-01-14", "2026-01-99", "26-1-14"]', { s: '[True, True, False]', at: 1300 }];
      st.push({ say: '再试 26-1-14。\\d{4} 吃完 2、6 后遇到 -，它不是数字。凑不够 4 个，失败。要真正校验日期，得用日期解析库（补充）。', hl: [4],
        set: merge((function () { var s = {}; for (var k = 0; k < 7; k++) s['e' + k] = { opacity: { to: 1, delay: k * 60, dur: 200 } }; return s; })(), paint('e', 0, 2, C.ok, C.okW, 600), { e2: { fill: { to: C.badW, delay: 1100, dur: 250 }, stroke: { to: C.bad, delay: 1100, dur: 250 } }, v2: merge(show(1400), { text: '“26-” 在第 3 个字符处失败 → False' }), arrow: { y: { to: 345, dur: 400 }, x: { to: cx(QX0, QCW, 2), delay: 400, dur: 600 } } }),
        eq: { s: '\\d{4}：2、6 之后是 "-" → 只凑到 2 个，失败', at: 1100, cls: 'bad' }, fx: [{ type: 'shake', obj: 'e2', at: 1200 }] });
      return st;
    })()
  };

  var EM = 'nonsense@@@email', EX0 = 40, ECW = 48, EY = 250;
  var sceneBack = {
    name: '.+@.+ 与回溯', desc: '.+ 是贪婪的。它先尽可能多地吃。后面匹配不上，再一个字符一个字符地“吐回来”。这叫回溯。用讲义的例子 .+@.+ 和 nonsense@@@email 看清这个过程。',
    code: { lang: 'py', title: '本机实测（加上捕获组观察两段 .+ 各吃了什么）', src: 'import re\nm = re.match(r"(.+)@(.+)", "nonsense@@@email")\nm.groups()   # (\'nonsense@@\', \'email\')\nm.span(1), m.span(2)   # (0, 10) (11, 16)' },
    dataTitle: '引擎状态',
    data: { '第 1 个 .+ 占到': '无', '回溯次数': 0, '结果': '无' },
    bg: function (d) {
      d.text(430, 24, '模式 (.+)@(.+)：第 1 段 .+ → 一个 @ → 第 2 段 .+', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      for (var k = 0; k <= EM.length; k += 4) d.text(EX0 + k * ECW, EY + 34, String(k), { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
    },
    objects: function () {
      var o = {};
      chars(o, 'c', EM, EX0, EY, ECW);
      o.g1 = B(EX0, EY - 46, 0, 26, '', { anchor: 'tl', fill: C.dataW, stroke: C.data, sw: 1.6, rx: 6, size: 12, color: C.data, mono: true });
      o.at = B(EX0, EY - 46, ECW - 4, 26, '@', { anchor: 'tl', fill: C.warnW, stroke: C.warn, sw: 1.6, rx: 6, size: 13, color: C.warn, mono: true, opacity: 0 });
      o.g2 = B(EX0, EY - 46, 0, 26, '', { anchor: 'tl', fill: C.infoW, stroke: C.info, sw: 1.6, rx: 6, size: 12, color: C.info, mono: true, opacity: 0 });
      o.ptr = T(EX0, EY + 60, '▲', { size: 18, anchor: 'middle', color: C.bad, opacity: 0, trail: { n: 5, gap: 36 } });
      o.res = B(430, 420, 560, 44, '', { mono: true, size: 14, fill: C.okW, stroke: C.ok, opacity: 0 });
      return o;
    },
    steps: [
      { say: '第 1 段 .+ 是贪婪的。. 匹配任意字符，+ 表示一个或多个。于是它一口气吃到了字符串末尾，一共 16 个字符。', hl: [2],
        data: { '第 1 个 .+ 占到': { v: '0–16（全部）', at: 1100 } },
        set: { g1: { w: { from: 0, to: 16 * ECW, dur: 1100, ease: 'linear' }, text: { to: '(.+)', delay: 300 } } },
        eq: '.+ 先吃满：位置 0 → 16' },
      { say: '接下来模式要求一个 @。可已经到了末尾，没有字符了，失败。引擎开始回溯，让 .+ 吐出最后一个字符 l。',
        data: { '第 1 个 .+ 占到': '0–15', '回溯次数': 1 },
        set: { g1: { w: { to: 15 * ECW, delay: 300, dur: 400 } }, ptr: { opacity: { to: 1, dur: 200 }, x: { from: EX0 + 16 * ECW, to: cx(EX0, ECW, 15), delay: 300, dur: 400 } }, c15: { fill: { to: C.badW, delay: 700, dur: 200 } } },
        eq: { s: '位置 15 是 l，不是 @ → 继续回溯', at: 700, cls: 'bad' }, fx: [{ type: 'shake', obj: 'c15', at: 800 }] },
      { say: 'l、i、a、m、e 依次吐出、依次比较，都不是 @……', data: { '第 1 个 .+ 占到': { v: '0–10', at: 1600 }, '回溯次数': { v: 6, at: 900 } },
        set: merge({ g1: { w: { to: 10 * ECW, dur: 1600, ease: 'linear' } }, ptr: { x: { to: cx(EX0, ECW, 10), dur: 1600, ease: 'linear' } } }, paint('c', 11, 15, C.bad, C.badW, 0)),
        eq: { s: '位置 14 m、13 i … 11 e：都不是 @', at: 800 } },
      { say: '位置 10 正好是 @（三个 @ 里的最后一个）→ 匹配上！第 1 段 .+ 停在 0–10，得到 nonsense@@。',
        data: { '回溯次数': 6 },
        set: { c10: { fill: { to: C.warnW, dur: 300 }, stroke: { to: C.warn, dur: 300 } }, at: { opacity: { to: 1, delay: 300, dur: 200 }, x: { from: EX0 + 10 * ECW - 30, to: EX0 + 10 * ECW + 2, delay: 300, dur: 400, ease: 'back' } }, ptr: { color: { to: C.ok, dur: 200 } } },
        eq: { s: '位置 10 = "@" √ → 第 1 组 = [0, 10) = "nonsense@@"', at: 500, cls: 'ok' }, fx: [{ type: 'ripple', obj: 'c10', at: 500, color: C.warn }] },
      { say: '第 2 段 .+ 从位置 11 开始，同样贪婪地吃到末尾：email。整个模式匹配成功。', hl: [3, 4],
        data: { '结果': { v: "('nonsense@@', 'email')", at: 1100 } },
        set: merge({ g2: { opacity: { to: 1, dur: 200 }, x: { from: EX0 + 11 * ECW, to: EX0 + 11 * ECW, dur: 0 }, w: { from: 0, to: 5 * ECW - 4, delay: 200, dur: 700, ease: 'linear' }, text: { to: '(.+)', delay: 400 } }, ptr: hide() }, paint('c', 11, 16, C.info, C.infoW, 200)),
        log: ['>>> m = re.match(r"(.+)@(.+)", "nonsense@@@email")', { s: '>>> m.groups(), m.span(1), m.span(2)', at: 600 }, { s: "(('nonsense@@', 'email'), (0, 10), (11, 16))", at: 1000 }],
        eq: { s: '第 2 组 = [11, 16) = "email"', at: 1000 } },
      { say: '所以讲义说 .+@.+ “只做最基本的校验”。nonsense@@@email 也算“邮箱”。真正无误判的邮箱正则存在，但长到不实用（讲义）。',
        set: { res: merge(show(300), { text: 're.fullmatch(r".+@.+", "nonsense@@@email") → True' }) },
        log: [{ s: '>>> [bool(re.fullmatch(r".+@.+", s)) for s in ["alyssa@mit.edu", "nonsense@@@email", "@mit.edu"]]', at: 200 }, { s: '[True, True, False]', at: 600 }],
        fx: [{ type: 'pulse', obj: 'res', at: 500, color: C.warn }] },
      { say: '换成非贪婪的 .+?，它尽量少吃。第 1 段在第一个 @ 前就停下。结果变成 (\'nonsense\', \'@@email\')。贪婪与否决定“吃到哪里”，练习 6 会用到。',
        log: [{ s: '>>> re.match(r"(.+?)@(.+)", "nonsense@@@email").groups()', at: 200 }, { s: "('nonsense', '@@email')", at: 600 }],
        set: { g1: { w: { to: 8 * ECW, dur: 700, ease: 'inOut' } }, at: { x: { to: EX0 + 8 * ECW + 2, dur: 700, ease: 'inOut' } }, g2: { x: { to: EX0 + 9 * ECW, dur: 700, ease: 'inOut' }, w: { to: 7 * ECW - 4, dur: 700, ease: 'inOut' } }, res: hide() },
        eq: { s: '.+? 从 1 个字符开始逐个加，遇到第一个可行的 @（位置 8）就停', at: 700 } }
    ]
  };

  VZ.register({
    id: 'ch09-regex-quant', title: '量词：{N}、+、贪婪与回溯',
    sources: [{ t: '视频 1:01:42 \\+ 一个或多个', u: 'https://youtu.be/XBiLUNx84CQ?t=3702' }, { t: '视频 1:03:21 \\d{4}', u: 'https://youtu.be/XBiLUNx84CQ?t=3801' }, { t: '讲义 Regular expressions', u: 'https://missing.csail.mit.edu/2026/code-quality/#regular-expressions' }, { t: 'Python re 文档（贪婪与非贪婪）', u: 'https://docs.python.org/3/library/re.html#regular-expression-syntax' }],
    note: '控制台输出是本机 Python 3.13 re 实测的。“逐字符吐回”的画法，是对回溯过程的简化示意。真实引擎有优化，但结果相同。', scenes: [sceneDate, sceneBack]
  });

  /* ================= ch09-regex-group：捕获组与替换 ================= */
  var GS = '2026-01-14', GX0 = 170, GCW = 52;
  var sceneGroup = {
    name: '捕获组 group(1)', desc: '圆括号 (…) 既用来分组，也会“捕获”。它记下这一段匹配到的起止位置，事后可以取出来。讲义的例子是从 YYYY-MM-DD 里只取月份。',
    code: { lang: 'py', title: '讲义原例 + 本机实测', src: 'import re\nm = re.match(r"\\d{4}-(\\d{2})-\\d{2}", "2026-01-14")\nm.group(0)   # \'2026-01-14\'  整个匹配\nm.group(1)   # \'01\'          第 1 个括号\nm.span(1)    # (5, 7)\nre.match(r"(\\d{4})-(\\d{2})-(\\d{2})", "2026-01-23").groups()' },
    dataTitle: 'Match 对象',
    data: { 'group(0)': '无', 'group(1)': '无', 'span(1)': '无' },
    bg: function (d) {
      d.text(430, 24, '模式  \\d{4}-(\\d{2})-\\d{2}：括号把 \\d{2} 圈起来', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      for (var k = 0; k <= GS.length; k++) d.text(GX0 + k * GCW, 286, String(k), { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
    },
    objects: function () {
      var o = {};
      chars(o, 'c', GS, GX0, 250, GCW);
      o.open = T(GX0 + 5 * GCW, 180, '(', { size: 34, weight: 700, mono: true, color: C.warn, anchor: 'middle', opacity: 0 });
      o.close = T(GX0 + 7 * GCW, 180, ')', { size: 34, weight: 700, mono: true, color: C.warn, anchor: 'middle', opacity: 0 });
      o.whole = B(GX0 + 5 * GCW, 250, 10 * GCW + 8, 46, '', { fill: 'none', stroke: C.ok, sw: 2.4, rx: 10, opacity: 0 });
      o.cap = B(GX0 + 6 * GCW, 250, 2 * GCW + 4, 42, '', { fill: 'none', stroke: C.warn, sw: 3, rx: 8, opacity: 0 });
      o.out = B(GX0 + 6 * GCW, 400, 140, 46, "'01'", { mono: true, size: 18, fill: C.warnW, stroke: C.warn, color: C.warn, opacity: 0, trail: { n: 5, gap: 40 } });
      o.three = T(430, 480, '', { size: 13, mono: true, anchor: 'middle', opacity: 0 });
      return o;
    },
    steps: [
      { say: '先照常匹配：\\d{4} 吃 2026，- 吃连字符。', hl: [2],
        set: merge(paint('c', 0, 5, C.ok, C.okW, 200)), eq: '\\d{4}- 吃掉位置 0–4' },
      { say: '进入括号：引擎在位置 5 记下“第 1 组开始”。', set: { open: merge(show(), { y: { from: 150, to: 180, dur: 500, ease: 'back' } }) },
        eq: { s: '组 1 开始 = 5', at: 300 }, fx: [{ type: 'pulse', obj: 'c5', at: 400, color: C.warn }] },
      { say: '括号里的 \\d{2} 吃掉 0、1。离开括号时，记下“第 1 组结束”= 7。',
        set: merge(paint('c', 5, 7, C.warn, C.warnW, 200), { close: merge(show(600), { y: { from: 150, to: 180, delay: 600, dur: 500, ease: 'back' } }), cap: show(900) }),
        eq: { s: '组 1 结束 = 7 → span(1) = (5, 7)', at: 800 }, data: { 'span(1)': { v: '(5, 7)', at: 900 } } },
      { say: '剩下的 -\\d{2} 吃掉 -14，整个模式匹配成功。group(0) 就是整段匹配。', hl: [3],
        set: merge(paint('c', 7, 10, C.ok, C.okW, 200), { whole: show(800) }), data: { 'group(0)': { v: "'2026-01-14'", at: 900 } },
        fx: [{ type: 'ripple', obj: 'whole', at: 900, color: C.ok }] },
      { say: 'group(1) 按记下的位置，把子串 \'01\' 取出来。这是讲义原例，本机实测过。', hl: [4, 5],
        data: { 'group(1)': { v: "'01'", at: 800 } },
        log: ['>>> re.match(r"\\d{4}-(\\d{2})-\\d{2}", "2026-01-14").group(1)', { s: "'01'", at: 800, cls: 'ok' }],
        set: { out: merge(show(200), { y: { from: 250, to: 400, delay: 200, dur: 700, ease: 'out' } }) },
        eq: { s: 'GS[5:7] = "01"', at: 700 }, fx: [{ type: 'burst', obj: 'out', at: 900, color: C.warn }] },
      { say: '可以有多个括号，从左到右编号 1、2、3。groups() 一次取出全部。讲师说，同样的办法能从 Web 日志里抽出 IP 地址。这段在视频 1:03:58。', hl: [6],
        log: ['>>> re.match(r"(\\d{4})-(\\d{2})-(\\d{2})", "2026-01-23").groups()', { s: "('2026', '01', '23')", at: 700 }],
        set: { three: merge(show(700), { text: "(\\d{4})-(\\d{2})-(\\d{2}) → ('2026', '01', '23')" }) } }
    ]
  };

  var SUB = ['x = 15', 'y = 0', 'z = x + 7'], SUBO = ['x = 1515', 'y = 00', 'z = x + 77'], NUMS = [[4, 6], [4, 5], [8, 9]];
  var SX0 = 130, SCW = 40, SY0 = 160, SDY = 100;
  var sceneSub = {
    name: '替换里的 \\1', desc: '查找替换时，替换文本里能引用第 1 个捕获组。Vim 和 sed 写 \\1，VS Code 写 $1。讲师在 Vim 里，把每个数字替换成“数字重复两遍”。',
    code: { lang: 'sh', title: '本机实测（Vim 9.2 与 GNU sed 4.9）', src: "vim -u NONE -Es -c '%s/\\(\\d\\+\\)/\\1\\1/g' -c 'wq' n.txt\ncat n.txt\nsed -E 's/([0-9]+)/\\1\\1/g' n_orig.txt" },
    dataTitle: '这一行',
    data: { '捕获到的 \\1': '无', '替换成': '无' },
    bg: function (d) {
      d.text(430, 24, ':%s/\\(\\d\\+\\)/\\1\\1/g：找到一串数字，换成它自己重复两遍', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
    },
    objects: function () {
      var o = {};
      SUB.forEach(function (s, i) {
        chars(o, 'l' + i + '_', s, SX0, SY0 + i * SDY, SCW);
        var n = NUMS[i], txt = s.slice(n[0], n[1]);
        o['cap' + i] = B(SX0 + (n[0] + n[1]) / 2 * SCW, SY0 + i * SDY, (n[1] - n[0]) * SCW + 4, 42, '', { fill: 'none', stroke: C.warn, sw: 2.6, rx: 8, opacity: 0 });
        o['dup' + i] = B(SX0 + (n[0] + n[1]) / 2 * SCW, SY0 + i * SDY - 52, (n[1] - n[0]) * SCW - 2, 30, txt, { mono: true, size: 15, fill: C.warnW, stroke: C.warn, color: C.warn, opacity: 0, trail: { n: 4, gap: 40 } });
        o['o' + i] = T(560, SY0 + i * SDY, '→ ' + SUBO[i], { mono: true, size: 16, weight: 700, color: C.ok, opacity: 0 });
      });
      return o;
    },
    steps: (function () {
      var st = [{ say: '\\(\\d\\+\\) 在 Vim 里捕获一串数字。Vim 的正则风格，要求括号和 + 前加反斜杠。这段在视频 1:02:15。先找出每行的数字串。', hl: [1],
        set: (function () { var s = {}; SUB.forEach(function (x, i) { s['cap' + i] = show(300 + i * 250); }); return s; })(),
        fx: [{ type: 'pulse', obj: 'cap0', at: 400, color: C.warn }] }];
      SUB.forEach(function (s, i) {
        var n = NUMS[i], len = n[1] - n[0], set = {};
        set['dup' + i] = { opacity: { to: 1, dur: 200 }, y: { to: SY0 + i * SDY - 52, dur: 0 }, x: { from: SX0 + (n[0] + n[1]) / 2 * SCW, to: SX0 + (n[1] + len / 2) * SCW, delay: 300, dur: 700, ease: 'inOut' } };
        set['cap' + i] = { w: { to: 2 * len * SCW + 4, delay: 900, dur: 400 }, x: { to: SX0 + (n[0] + len) * SCW, delay: 900, dur: 400 } };
        for (var k = n[1]; k < s.length; k++) set['l' + i + '_' + k] = { x: { to: SX0 + (k + len + 0.5) * SCW, delay: 300, dur: 600, ease: 'inOut' } };
        set['o' + i] = show(1300);
        st.push({ say: '第 ' + (i + 1) + ' 行：\\1 = "' + s.slice(n[0], n[1]) + '"，替换成 \\1\\1 = "' + s.slice(n[0], n[1]) + s.slice(n[0], n[1]) + '"。' + (i === 2 ? '/g 让一行里的每个匹配都被替换。这一行的 x 不是数字，不受影响。' : ''),
          data: { '捕获到的 \\1': '"' + s.slice(n[0], n[1]) + '"', '替换成': { v: '"' + s.slice(n[0], n[1]) + s.slice(n[0], n[1]) + '"', at: 900 } },
          set: set, fx: [{ type: 'ripple', obj: 'cap' + i, at: 1200, color: C.warn }] });
      });
      st.push({ say: '真跑 Vim 得到 1515、00、77（本机实测）。sed -E 和 Python 用不带反斜杠的 ( ) 和 +，结果相同。不同工具的正则“方言”，只是表面语法不同。这段在视频 53:44。', hl: [2, 3],
        log: ["$ vim -u NONE -Es -c '%s/\\(\\d\\+\\)/\\1\\1/g' -c 'wq' n.txt; cat n.txt", { s: 'x = 1515', at: 300 }, { s: 'y = 00', at: 400 }, { s: 'z = x + 77', at: 500 }, { s: "$ sed -E 's/([0-9]+)/\\1\\1/g' n_orig.txt", at: 900 }, { s: 'x = 1515', at: 1100 }, { s: 'y = 00', at: 1150 }, { s: 'z = x + 77', at: 1200 }],
        fx: [{ type: 'pulse', obj: 'o0', at: 300, color: C.ok }, { type: 'pulse', obj: 'o1', at: 400, color: C.ok }, { type: 'pulse', obj: 'o2', at: 500, color: C.ok }] });
      st.push({ say: '在 Python 程序里做同样的替换，用 re.sub。替换串里的 \\1 同样指第 1 个捕获组。换成 <\\1>，就能给每个数字套上尖括号。这一步本机实测过。',
        log: [">>> re.sub(r'(\\d+)', r'\\1\\1', 'x = 15\\ny = 0\\nz = x + 7')", { s: "'x = 1515\\ny = 00\\nz = x + 77'", at: 500 }, { s: ">>> re.sub(r'(\\d+)', r'<\\1>', 'x = 15, y = 0')", at: 1000 }, { s: "'x = <15>, y = <0>'", at: 1400 }],
        eq: ['re.sub(模式, 替换串, 文本)', { s: '替换串里：\\1 = 第 1 组匹配到的原文', at: 600 }, { s: 'r"…" 原始字符串，免得 \\1 被 Python 当成转义', at: 1200 }],
        fx: [{ type: 'pulse', obj: 'cap0', at: 500, color: C.warn }, { type: 'pulse', obj: 'cap1', at: 700, color: C.warn }] });
      return st;
    })()
  };

  VZ.register({
    id: 'ch09-regex-group', title: '捕获组：取出子串，或在替换里引用它',
    sources: [{ t: '视频 1:00:36 捕获组', u: 'https://youtu.be/XBiLUNx84CQ?t=3636' }, { t: '视频 1:02:15 Vim 里的 \\1\\1', u: 'https://youtu.be/XBiLUNx84CQ?t=3735' }, { t: '视频 1:03:21 Python re.match', u: 'https://youtu.be/XBiLUNx84CQ?t=3801' }, { t: '讲义 Capture groups', u: 'https://missing.csail.mit.edu/2026/code-quality/#capture-groups-and-references' }],
    note: '控制台输出是本机 Python 3.13、Vim 9.2 和 GNU sed 4.9 实测的。n.txt 的三行内容是示意。视频里讲师替换的是 utils.py 里的数字。', scenes: [sceneGroup, sceneSub]
  });
})();
