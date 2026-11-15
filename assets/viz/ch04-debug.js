/* ch04 · 调试器：断点与观察点（§3）、rr 倒放（§4）、ASan 影子内存（§8）
 * 依据：Lecture 4 视频 6:02–7:45（gdb/lldb/pdb）、7:45–11:29（rr 与 Heisenbug）、11:29–21:37（rr 演示：
 *       watch + reverse-continue 找到 strcpy 溢出）、23:33（gdb 重跑保留断点、手动二分）、46:31–50:50（sanitizer）；
 *       讲义 debugging-profiling.md 的 Debuggers / Record-Replay / Sanitizers 三节与调试练习 1–3。
 * 实测：场景 1、2 的控制台输出来自 练习生成脚本 在本机真跑（pdb：Python 3.13；gdb 14.1 MinGW），见 labs/lab04 d1-b、d2-b；
 *       场景 4 的 Jello 输出与 -Wuse-after-free 警告为本机实测。场景 3 是视频 rr 演示的复述：视频没有展示结构体完整源码，
 *       字节布局与 id 的数值按视频描述推算（示意）；rr、ASan 报告本机无法运行（未实测）。影子内存编码（00/fa/fd）取自 ASan 文档（补充）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function cell(x, y, t, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: 52, h: 44, rx: 8, fill: colW || C.dataW, stroke: col || C.data, sw: 1.7, text: t, mono: true, size: 18, weight: 750, color: C.fg }, extra || {});
  }
  function frame(y, t, extra) {
    return merge({ type: 'box', x: 140, y: y, w: 196, h: 38, rx: 8, fill: C.infoW, stroke: C.info, sw: 1.6, text: t, mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 }, extra || {});
  }

  /* ---------- 场景 1：断点与单步（调试练习 1，pdb） ---------- */
  var MSORT = 'def merge_sort(arr):\n    if len(arr) <= 1:\n        return arr\n    mid = len(arr) // 2\n    left = merge_sort(arr[:mid])\n    right = merge_sort(arr[mid:])\n    return merge(left, right)\n\n\ndef merge(left, right):\n    result = []\n    i, j = 0, 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            result.append(left[i])\n            i += 1\n        else:\n            result.append(right[i])\n            j += 1\n    result.extend(left[i:])\n    result.extend(right[j:])\n    return result\n\n\nif __name__ == "__main__":\n    print(merge_sort([3, 1, 4, 1, 5, 9, 2, 6]))';
  var AX = [430, 490], RX = [430, 490, 550, 610], YL = 150, YR = 262, YRES = 420;
  var sceneStep = {
    name: '断点与单步', desc: '调试练习 1：归并排序结果不对。用 pdb 的条件断点停在 merge 里。一行一行地走，盯住下标 i、j 和结果列表。看是哪一步取错了元素。',
    code: { lang: 'py', title: 'msort.py（讲义伪代码的 Python 版）', src: MSORT },
    dataTitle: 'pdb 里看到的变量',
    data: { 'left': '无', 'right': '无', 'i': '无', 'j': '无', 'result': '无' },
    bg: function (d) {
      d.text(430, 26, '程序停在断点上：左边是调用栈，右边是当前帧里的变量', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(30, 70, 222, 450, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.text(141, 92, '调用栈（pdb 的 w 命令）', { anchor: 'middle', size: 12, weight: 700, color: C.fg3 });
      d.text(141, 504, '↑ 越往上越新（栈顶 = 当前帧）', { anchor: 'middle', size: 11, color: C.fg3 });
      d.text(330, YL, 'left', { anchor: 'middle', size: 15, mono: true, weight: 700, color: C.fg2 });
      d.text(330, YR, 'right', { anchor: 'middle', size: 15, mono: true, weight: 700, color: C.fg2 });
      d.text(330, YRES, 'result', { anchor: 'middle', size: 15, mono: true, weight: 700, color: C.fg2 });
      [0, 1].forEach(function (k) {
        d.text(AX[k], YL - 34, '[' + k + ']', { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
        d.text(AX[k], YR - 34, '[' + k + ']', { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
      });
      RX.forEach(function (x) { d.rect(x - 26, YRES - 22, 52, 44, { fill: 'none', stroke: C.line, dash: '4 4', rx: 8 }); });
    },
    objects: function () {
      return {
        f0: frame(476, '<module>'), f1: frame(430, 'merge_sort(8 个)'), f2: frame(384, 'merge_sort([3,1,4,1])'),
        f3: frame(338, 'merge([1,3], [1,4])', { fill: C.warnW, stroke: C.warn }),
        l0: cell(AX[0], YL, '1', null, null, { opacity: 0 }), l1: cell(AX[1], YL, '3', null, null, { opacity: 0 }),
        r0: cell(AX[0], YR, '1', C.teal, C.tealW, { opacity: 0 }), r1: cell(AX[1], YR, '4', C.teal, C.tealW, { opacity: 0 }),
        o0: cell(AX[0], YL, '1', C.ok, C.okW, { opacity: 0 }), o1: cell(AX[1], YR, '4', C.bad, C.badW, { opacity: 0 }),
        pi: { type: 'box', x: AX[0], y: YL + 40, w: 30, h: 24, rx: 12, fill: C.data, stroke: C.data, sw: 1, text: 'i', color: '#fff', mono: true, size: 14, weight: 800, opacity: 0, trail: { n: 4, gap: 40 } },
        pj: { type: 'box', x: AX[0], y: YR + 40, w: 30, h: 24, rx: 12, fill: C.teal, stroke: C.teal, sw: 1, text: 'j', color: '#fff', mono: true, size: 14, weight: 800, opacity: 0 },
        cmp: { type: 'box', x: 700, y: 205, w: 210, h: 46, rx: 10, fill: C.bg3, stroke: C.line, sw: 1.6, text: '', mono: true, size: 15, weight: 750, color: C.fg, opacity: 0 },
        bad: { type: 'path', d: 'M' + (AX[1] + 16) + ',' + (YL + 40) + ' C' + (AX[1] + 110) + ',' + (YL + 40) + ' ' + (AX[1] + 110) + ',' + YR + ' ' + (AX[1] + 30) + ',' + YR, stroke: C.bad, sw: 2.4, dash: 0, arrow: 'atk' },
        tag: { type: 'text', x: 640, y: 300, text: '用了 left 的下标 i！', size: 14, weight: 800, color: C.bad, opacity: 0 }
      };
    },
    steps: [
      { say: '用 pdb 启动程序，它停在第 1 行等命令。先设条件断点，只在两边各 2 个元素时停在 merge 里。不加条件的话，要按很多次 c。', hl: [11],
        log: ['$ python -m pdb msort.py < step.pdb', { s: '> msort.py(1)<module>()', at: 300 }, { s: '(Pdb) b merge, len(left) == 2 and len(right) == 2', at: 700 }, { s: 'Breakpoint 1 at msort.py:11', at: 1000 }],
        set: { f0: { opacity: { to: 1, dur: 300 }, y: { from: 456, to: 476, dur: 500, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'f0', at: 400, color: C.info }] },
      { say: 'c 就是 continue。程序跑起来，递归一层层压栈。前两次 1+1 的合并不满足条件，被跳过。最后停在 merge([1, 3], [1, 4]) 的第一行。',
        log: [{ s: '(Pdb) c', at: 100 }, { s: '> msort.py(11)merge()', at: 1500 }, { s: '-> result = []', at: 1600 }],
        set: { f1: { opacity: { to: 1, delay: 200, dur: 250 }, y: { from: 410, to: 430, delay: 200, dur: 450, ease: 'back' } },
          f2: { opacity: { to: 1, delay: 600, dur: 250 }, y: { from: 364, to: 384, delay: 600, dur: 450, ease: 'back' } },
          f3: { opacity: { to: 1, delay: 1000, dur: 250 }, y: { from: 318, to: 338, delay: 1000, dur: 450, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'f3', at: 1450, color: C.warn }] },
      { say: 'p left, right：在当前帧里打印变量。两边各自已经排好序。',
        log: [{ s: '(Pdb) p left, right', at: 100 }, { s: '([1, 3], [1, 4])', at: 500 }],
        data: { 'left': { v: '[1, 3]', at: 700 }, 'right': { v: '[1, 4]', at: 800 } },
        set: { l0: { opacity: { to: 1, dur: 200, delay: 300 }, x: { from: 140, to: AX[0], delay: 300, dur: 700, ease: 'out' }, y: { from: 338, to: YL, delay: 300, dur: 700, ease: 'out' } },
          l1: { opacity: { to: 1, dur: 200, delay: 420 }, x: { from: 140, to: AX[1], delay: 420, dur: 700, ease: 'out' }, y: { from: 338, to: YL, delay: 420, dur: 700, ease: 'out' } },
          r0: { opacity: { to: 1, dur: 200, delay: 540 }, x: { from: 140, to: AX[0], delay: 540, dur: 700, ease: 'out' }, y: { from: 338, to: YR, delay: 540, dur: 700, ease: 'out' } },
          r1: { opacity: { to: 1, dur: 200, delay: 660 }, x: { from: 140, to: AX[1], delay: 660, dur: 700, ease: 'out' }, y: { from: 338, to: YR, delay: 660, dur: 700, ease: 'out' } } } },
      { say: 'n 就是 next，走两次。执行完第 11、12 行，result 是空列表。两个下标 i、j 都从 0 开始。i 管 left，j 管 right。', hl: [11, 12],
        data: { 'i': { v: 0, at: 600 }, 'j': { v: 0, at: 700 }, 'result': { v: '[]', at: 400 } },
        set: { pi: { opacity: { to: 1, delay: 500, dur: 250 }, y: { from: YL + 60, to: YL + 40, delay: 500, dur: 400, ease: 'back' } },
          pj: { opacity: { to: 1, delay: 700, dur: 250 }, y: { from: YR + 60, to: YR + 40, delay: 700, dur: 400, ease: 'back' } } } },
      { say: '第 13 行循环条件成立。第 14 行比较 left[i] 和 right[j]。1 <= 1 成立，走 if 分支。', hl: [13, 14],
        eq: ['left[i] = left[0] = 1', { s: 'right[j] = right[0] = 1', at: 300 }, { s: '1 <= 1 → 真，取左边', at: 700, cls: 'ok' }],
        set: { cmp: { text: '1 <= 1 → 真', opacity: { to: 1, delay: 500, dur: 300 }, stroke: { to: C.ok, delay: 500, dur: 300 }, fill: { to: C.okW, delay: 500, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'l0', at: 200, color: C.data }, { type: 'pulse', obj: 'r0', at: 350, color: C.teal }] },
      { say: '第 15 行把 left[0] 追加进 result。停在第 16 行时打印一下。i、j 仍是 0，因为 i += 1 还没执行。result 是 [1]。', hl: [15],
        log: [{ s: '(Pdb) p i, j, result', at: 900 }, { s: '(0, 0, [1])', at: 1200 }], data: { 'result': { v: '[1]', at: 800 } },
        set: { o0: { opacity: { to: 1, dur: 200 }, x: { from: AX[0], to: RX[0], dur: 800, ease: 'inOut' }, y: { from: YL, to: YRES, dur: 800, ease: 'inOut' } } },
        fx: [{ type: 'ripple', obj: 'o0', at: 820, color: C.ok }] },
      { say: '第 16 行 i += 1：i 移到 left[1] = 3。j 没动。', hl: [16], data: { 'i': { v: 1, at: 500 } },
        set: { pi: { x: { to: AX[1], dur: 600, ease: 'inOut' } }, cmp: { opacity: { to: 0.25, dur: 300 } } } },
      { say: '回到 13、14 行，3 <= 1 不成立，进入 else 分支。pdb 停在第 18 行，这行还没执行。', hl: [18],
        eq: [{ s: 'left[i] = left[1] = 3，right[j] = right[0] = 1', at: 200 }, { s: '3 <= 1 → 假，应该取 right[j] = 1', at: 700, cls: 'bad' }],
        set: { cmp: { text: '3 <= 1 → 假', opacity: { to: 1, dur: 300 }, stroke: { to: C.warn, dur: 300 }, fill: { to: C.warnW, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'l1', at: 200, color: C.data }, { type: 'pulse', obj: 'r0', at: 350, color: C.teal }] },
      { say: '打印 i、j、right[i]、right[j]。结果是 (1, 0, 4, 1)。第 18 行写的是 right[i]。它拿左边的下标，去取右边的元素！',
        log: [{ s: '(Pdb) p i, j, right[i], right[j]', at: 100 }, { s: '(1, 0, 4, 1)', at: 500 }],
        eq: [{ s: 'right[i] = right[1] = 4   ×', at: 600, cls: 'bad' }, { s: 'right[j] = right[0] = 1   √', at: 1000, cls: 'ok' }],
        set: { bad: { dash: { to: 1, delay: 300, dur: 700 } }, tag: { opacity: { to: 1, delay: 900, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'r1', at: 1000 }, { type: 'pulse', obj: 'pj', at: 1300, color: C.ok }] },
      { say: 'n 执行第 18 行，再 p result，得到 [1, 4]。错误的 4 已经进了结果，正确的应是 1。之后只会越错越多。', hl: [18, 19],
        log: [{ s: '(Pdb) p result', at: 1000 }, { s: '[1, 4]', at: 1300, cls: 'err' }], data: { 'result': { v: '[1, 4]', at: 900 }, 'j': { v: 1, at: 1500 } },
        set: { o1: { opacity: { to: 1, dur: 200 }, x: { from: AX[1], to: RX[1], dur: 800, ease: 'inOut' }, y: { from: YR, to: YRES, dur: 800, ease: 'inOut' } },
          pj: { x: { to: AX[1], delay: 1400, dur: 500 } }, bad: { dash: { to: 0, delay: 1200, dur: 400 } } },
        fx: [{ type: 'shake', obj: 'o1', at: 900 }] },
      { say: '修复：第 18 行改成 right[j]。修好的版本输出正确。和 sorted() 对拍 1000 个随机列表，也全部通过（本机实测）。',
        log: [{ s: '$ python msort_fixed.py', at: 200 }, { s: '[1, 1, 2, 3, 4, 5, 6, 9]', at: 600, cls: 'ok' }, { s: '$ python test_msort.py', at: 900 }, { s: '1000 random lists OK', at: 1300, cls: 'ok' }],
        data: { 'result': { v: '[1, 1, 3, 4]（修复后）', at: 900 } },
        set: { tag: { opacity: { to: 0, dur: 300 } }, o1: { text: '1', fill: { to: C.okW, delay: 300, dur: 300 }, stroke: { to: C.ok, delay: 300, dur: 300 } },
          cmp: { text: 'right[i] → right[j]', stroke: { to: C.ok, dur: 300 }, fill: { to: C.okW, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'o1', at: 500, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：观察点（调试练习 2，gdb watch） ---------- */
  var MX = [136, 222, 308, 394, 480, 566, 652, 738], MY = 240;
  var VAL = [1001, 85, 92, 78, 1002, 90, 88, 95];
  var FLD = ['id', 'scores[0]', 'scores[1]', 'scores[2]', 'id', 'scores[0]', 'scores[1]', 'scores[2]'];
  var CORR = '#include <stdio.h>\n\ntypedef struct {\n    int id;\n    int scores[3];\n} Student;\n\nStudent students[2];\n\nvoid init() {\n    students[0].id = 1001;\n    students[0].scores[0] = 85;\n    students[0].scores[1] = 92;\n    students[0].scores[2] = 78;\n\n    students[1].id = 1002;\n    students[1].scores[0] = 90;\n    students[1].scores[1] = 88;\n    students[1].scores[2] = 95;\n}\n\nvoid curve_scores(int student_idx, int curve) {\n    for (int i = 0; i < 4; i++) {\n        students[student_idx].scores[i] += curve;\n    }\n}\n\nint main() {\n    init();\n    printf("=== Initial state ===\\n");\n    printf("Student 0: id=%d\\n", students[0].id);\n    printf("Student 1: id=%d\\n", students[1].id);\n\n    curve_scores(0, 5);\n\n    printf("\\n=== After curving ===\\n");\n    printf("Student 0: id=%d\\n", students[0].id);\n    printf("Student 1: id=%d\\n", students[1].id);\n\n    if (students[1].id != 1002) {\n        printf("\\nERROR: Student 1\'s ID was corrupted! Expected 1002, got %d\\n",\n               students[1].id);\n        return 1;\n    }\n    return 0;\n}';
  function memObjs() {
    var o = {};
    VAL.forEach(function (v, k) {
      o['m' + k] = { type: 'box', x: MX[k], y: MY, w: 80, h: 54, rx: 7, fill: k < 4 ? C.dataW : C.tealW, stroke: k < 4 ? C.data : C.teal, sw: 1.6, num: v, fmt: 'int', mono: true, size: 18, weight: 750, color: C.fg, opacity: 0 };
    });
    o.cur = { type: 'box', x: MX[1], y: 128, w: 150, h: 34, rx: 8, fill: C.warnW, stroke: C.warn, sw: 1.6, text: 'scores[i] += 5', mono: true, size: 13, weight: 750, color: C.warn, opacity: 0, trail: { n: 4, gap: 40 } };
    o.ci = { type: 'text', x: MX[1], y: 100, text: 'i = 0', mono: true, size: 14, weight: 800, color: C.warn, opacity: 0 };
    o.ring = { type: 'box', x: MX[4], y: MY, w: 96, h: 70, rx: 12, fill: 'none', stroke: C.bad, sw: 2.4, dasharray: '6 4', opacity: 0 };
    o.eye = { type: 'box', x: MX[4], y: 372, w: 170, h: 34, rx: 17, fill: C.badW, stroke: C.bad, sw: 1.6, text: 'watch students[1].id', mono: true, size: 12, weight: 750, color: C.bad, opacity: 0 };
    o.a1 = { type: 'box', x: 300, y: 450, w: 210, h: 32, rx: 8, fill: C.bg3, stroke: C.line, sw: 1.4, text: '&students[0].scores[3]', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 };
    o.a2 = { type: 'box', x: 660, y: 450, w: 170, h: 32, rx: 8, fill: C.bg3, stroke: C.line, sw: 1.4, text: '&students[1].id', mono: true, size: 12.5, weight: 700, color: C.fg, opacity: 0 };
    o.p1 = { type: 'path', d: 'M300,434 C330,360 430,330 470,272', stroke: C.warn, sw: 2, dash: 0, arrow: 'warn' };
    o.p2 = { type: 'path', d: 'M660,434 C640,380 520,330 492,272', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' };
    return o;
  }
  function to(k, at) { return { x: { to: MX[k], delay: at || 0, dur: 520, ease: 'inOut' } }; }
  var sceneWatch = {
    name: '观察点：谁改了它', desc: '调试练习 2：只给学生 0 加分，学生 1 的 id 却变了。在 gdb 里对 students[1].id 设观察点（watchpoint）。值一被改写，程序就停下，直接抓到“凶手”。',
    code: { lang: 'c', title: 'corruption.c（讲义练习原文）', src: CORR },
    dataTitle: '变量与内存',
    data: { 'i': '无', 'students[1].id': 1002, '观察点': '未设置' },
    bg: function (d) {
      d.text(430, 26, '内存里两个 Student 紧挨着：每个 16 字节 = id + 3 个分数', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      [[0, 3, 'students[0]', C.data], [4, 7, 'students[1]', C.teal]].forEach(function (g) {
        var a = MX[g[0]] - 40, b = MX[g[1]] + 40;
        d.line(a, 196, b, 196, { stroke: g[3], sw: 2 });
        d.line(a, 196, a, 204, { stroke: g[3], sw: 2 }); d.line(b, 196, b, 204, { stroke: g[3], sw: 2 });
        d.text((a + b) / 2, 182, g[2], { anchor: 'middle', size: 13, mono: true, weight: 750, color: g[3] });
      });
      FLD.forEach(function (f, k) {
        d.text(MX[k], MY + 42, f, { anchor: 'middle', size: 11, mono: true, color: C.fg3 });
        d.text(MX[k], MY + 60, '+' + (k * 4), { anchor: 'middle', size: 11, mono: true, color: C.fg3, weight: 700 });
      });
      d.text(60, MY + 60, '偏移', { anchor: 'middle', size: 11, color: C.fg3 });
    },
    objects: memObjs,
    steps: [
      { say: '全局数组 students[2] 在内存里是连续的 8 个 int。学生 0 占偏移 +0 到 +15，学生 1 从 +16 开始。', hl: [3, 8],
        set: (function () { var s = {}; VAL.forEach(function (v, k) { s['m' + k] = { opacity: { to: 1, delay: k * 110, dur: 250 }, y: { from: MY - 24, to: MY, delay: k * 110, dur: 450, ease: 'back' } }; }); return s; })() },
      { say: 'gdb 读入命令文件：break curve_scores、run。程序停在第 23 行，循环还没开始。', hl: [23],
        log: ['$ gdb -q -batch -x watch.gdb ./corruption', { s: 'Breakpoint 1 at 0x140001735: file corruption.c, line 23.', at: 400 }, { s: 'Thread 1 hit Breakpoint 1, curve_scores (student_idx=0, curve=5) at corruption.c:23', at: 900 }],
        set: { cur: { opacity: { to: 1, delay: 800, dur: 300 } }, ci: { opacity: { to: 1, delay: 900, dur: 300 } } } },
      { say: 'watch students[1].id 设下观察点。CPU 的调试寄存器盯住偏移 +16 的 4 个字节。谁写它，程序就停。', data: { '观察点': { v: '+16（4 字节）', at: 500 } },
        log: { s: 'Hardware watchpoint 2: students[1].id', at: 600 },
        set: { ring: { opacity: { to: 1, dur: 300 }, s: { from: 1.3, to: 1, dur: 500, ease: 'back' } }, eye: { opacity: { to: 1, delay: 300, dur: 300 }, y: { from: 392, to: 372, delay: 300, dur: 400, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'ring', at: 450, color: C.bad }] },
      { say: 'continue。i = 0：scores[0] += 5，85 → 90。写的不是被盯住的地址，观察点不响。', hl: [24], data: { 'i': 0 },
        set: { m1: { num: { to: 90, delay: 300, dur: 500 } } }, fx: [{ type: 'float', obj: 'm1', at: 300, text: '+5', color: C.warn }] },
      { say: 'i = 1：scores[1] 从 92 变成 97。', data: { 'i': 1 },
        set: { cur: to(2, 0), ci: merge(to(2, 0), { text: { to: 'i = 1', delay: 0 } }), m2: { num: { to: 97, delay: 500, dur: 400 } } },
        fx: [{ type: 'float', obj: 'm2', at: 500, text: '+5', color: C.warn }] },
      { say: 'i = 2：scores[2] 从 78 变成 83。到这里都在 students[0] 的范围内，观察点一直没响。', data: { 'i': 2 },
        set: { cur: to(3, 0), ci: merge(to(3, 0), { text: 'i = 2' }), m3: { num: { to: 83, delay: 500, dur: 400 } } },
        fx: [{ type: 'float', obj: 'm3', at: 500, text: '+5', color: C.warn }] },
      { say: 'i = 3 时，条件 3 < 4 依然成立，又写了一次 scores[3]。可 scores 只有 3 个元素。这一格算下来正好是 +16，也就是 students[1].id。', data: { 'i': 3, 'students[1].id': { v: 1007, at: 1300 } },
        eq: ['&scores[i] = 学生起点 + 4 + 4 × i', { s: 'i = 3 → +4 + 12 = +16', at: 500 }, { s: '+16 = &students[1].id  ← 越界了', at: 1000, cls: 'bad' }],
        set: { cur: merge(to(4, 200), { stroke: { to: C.bad, delay: 600, dur: 300 }, color: { to: C.bad, delay: 600, dur: 300 } }), ci: merge(to(4, 200), { text: 'i = 3' }),
          m4: { num: { to: 1007, delay: 1100, dur: 500 }, fill: { to: C.badW, delay: 1100, dur: 300 }, stroke: { to: C.bad, delay: 1100, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'm4', at: 1200, color: C.bad }, { type: 'shake', obj: 'eye', at: 1250 }] },
      { say: '观察点触发。gdb 打印旧值和新值，停在写入之后的第 23 行。bt 给出调用链：curve_scores 由 main 第 34 行调用。', hl: [23],
        log: [{ s: 'Thread 1 hit Hardware watchpoint 2: students[1].id', at: 100 }, { s: 'Old value = 1002', at: 400 }, { s: 'New value = 1007', at: 600 }, { s: '#0  curve_scores (student_idx=0, curve=5) at corruption.c:23', at: 1000 }, { s: '#1  0x00007ff7631617fc in main () at corruption.c:34', at: 1200 }],
        fx: [{ type: 'pulse', obj: 'm4', at: 300, color: C.bad }] },
      { say: 'p i 得 3。再打印两个地址，完全相同，都是 students+16。越界写恰好落在下一个学生的 id 上。',
        log: [{ s: '$1 = 3', at: 200 }, { s: '$2 = (int *) 0x7ff7631690b0 <students+16>', at: 600 }, { s: '$3 = (int *) 0x7ff7631690b0 <students+16>', at: 1100 }],
        set: { a1: { opacity: { to: 1, delay: 400, dur: 300 } }, p1: { dash: { to: 1, delay: 500, dur: 600 } }, a2: { opacity: { to: 1, delay: 900, dur: 300 } }, p2: { dash: { to: 1, delay: 1000, dur: 600 } } },
        fx: [{ type: 'ripple', obj: 'm4', at: 1650, color: C.warn }] },
      { say: '修复：循环上界改成 3（数组长度）。重新编译运行，学生 1 的 id 保持 1002（本机实测）。', hl: [23], data: { 'students[1].id': { v: 1002, at: 900 } },
        log: [{ s: "$ sed 's/i < 4/i < 3/' corruption.c > fixed.c", at: 100 }, { s: '$ gcc -g fixed.c -o fixed && ./fixed', at: 400 }, { s: 'Student 1: id=1002', at: 900, cls: 'ok' }],
        set: { a1: { opacity: { to: 0, dur: 300 } }, a2: { opacity: { to: 0, dur: 300 } }, p1: { dash: { to: 0, dur: 300 } }, p2: { dash: { to: 0, dur: 300 } },
          m4: { num: { to: 1002, delay: 700, dur: 400 }, fill: { to: C.okW, delay: 700, dur: 300 }, stroke: { to: C.ok, delay: 700, dur: 300 } }, cur: to(3, 300), ci: merge(to(3, 300), { text: 'i < 3' }) },
        fx: [{ type: 'ripple', obj: 'm4', at: 900, color: C.ok }] }
    ]
  };

  /* ---------- 场景 3：rr 录制与反向执行（视频 11:29–22:48 的演示） ---------- */
  var TX = { s: 100, init: 220, pr: 340, bal: 460, nm: 590, chk: 730 }, TY = 130;
  var NB = 44, NX0 = 134, NY = 420;
  var LET = ['A', 'l', 'e', 'x', 'a', 'n', 'd', 'r', 'i', 'a', '\\0'];
  function letterObjs() {
    var o = {};
    LET.forEach(function (c, k) {
      o['c' + k] = { type: 'box', x: 300 + k * 24, y: 330, w: 22, h: 26, rx: 4, fill: k >= 8 ? C.badW : C.dataW, stroke: k >= 8 ? C.bad : C.data, sw: 1.2, text: c, mono: true, size: c.length > 1 ? 10 : 14, weight: 750, color: C.fg, opacity: 0 };
    });
    return o;
  }
  var sceneRR = {
    name: 'rr：倒着执行', desc: '视频里的 rr 演示。账户 0 改名为 “Alexandria” 之后，id 莫名其妙变了。rr 先把整次运行录下来。再让你在 gdb 里倒着执行，直接找到改写 id 的那一刻。',
    code: { lang: "sh", title: "视频里的 rr 会话（命令按视频复述，本机未运行）", src: "gcc -g corruption.c -o corruption\nrr record ./corruption\nrr replay\n(rr) break 52\n(rr) continue\n(rr) p accounts[0].id\n(rr) watch accounts[0].id\n(rr) reverse-continue\n(rr) bt" },
    dataTitle: '调试会话',
    data: { '播放方向': '无', 'accounts[0].id': 1, 'Old value': '无', 'New value': '无' },
    bg: function (d) {
      d.text(430, 26, '执行时间线（rr 录下的是整条线，回放时可以前进也可以后退）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(TX.s, TY, 790, TY, { stroke: C.line, sw: 3 });
      [['s', '开始'], ['init', '建账户'], ['pr', '打印'], ['bal', '改余额'], ['nm', 'update_name'], ['chk', '第 52 行 if']].forEach(function (e, k) {
        d.circle(TX[e[0]], TY, 6, { fill: C.bg, stroke: C.fg3, sw: 2 });
        d.text(TX[e[0]], TY + (k % 2 ? -22 : 24), e[1], { anchor: 'middle', size: 11.5, color: C.fg2, weight: 650 });
      });
      d.text(NX0 - 20, NY - 52, 'accounts[0] 的内存（示意布局：char name[8]; int id; double balance;）', { size: 11.5, color: C.fg3, weight: 600 });
      for (var k = 0; k < 12; k++) d.rect(NX0 + k * NB - 20, NY - 20, 40, 40, { fill: k < 8 ? C.bg2 : C.tealW, stroke: k < 8 ? C.line : C.teal, rx: 5 });
      d.rect(NX0 + 12 * NB - 20, NY - 20, 130, 40, { fill: C.bg3, stroke: C.line, rx: 5 });
      d.text(NX0 + 12 * NB + 45, NY, 'balance', { anchor: 'middle', size: 12, mono: true, color: C.fg3 });
      d.text(NX0 + 3.5 * NB, NY + 38, 'name[8]（8 字节）', { anchor: 'middle', size: 11.5, mono: true, color: C.fg3 });
      d.text(NX0 + 9.5 * NB, NY + 38, 'id（4 字节）', { anchor: 'middle', size: 11.5, mono: true, color: C.teal });
    },
    objects: function () {
      var o = letterObjs();
      o.ph = { type: 'box', x: TX.s, y: TY - 46, w: 70, h: 24, rx: 12, fill: C.info, stroke: C.info, sw: 1, text: '执行点', color: '#fff', size: 11.5, weight: 800, trail: { n: 6, gap: 36 } };
      o.recp = { type: 'path', d: 'M' + TX.chk + ',' + (TY + 10) + ' C' + (TX.chk + 30) + ',' + (TY + 60) + ' 770,170 778,206', stroke: C.teal, sw: 1.8, dash: 0, arrow: 'data' };
      o.rec = { type: 'box', x: 780, y: 230, w: 120, h: 44, rx: 10, fill: C.tealW, stroke: C.teal, sw: 1.6, text: 'rr 录像', size: 13, weight: 750, color: C.teal, opacity: 0 };
      o.win = { type: 'box', x: 445, y: TY, w: 690, h: 30, rx: 6, fill: C.warnW, stroke: C.warn, sw: 1.4, opacity: 0 };
      o.pb = { type: 'box', x: TX.s, y: TY + 54, w: 64, h: 24, rx: 12, fill: C.okW, stroke: C.ok, sw: 1.6, text: '断点', size: 11.5, weight: 800, color: C.fg, opacity: 0, trail: { n: 4, gap: 40 } };
      o.bt0 = { type: 'box', x: 160, y: 205, w: 210, h: 30, rx: 7, fill: C.badW, stroke: C.bad, sw: 1.4, text: '#0 __strcpy_avx2（C 库）', mono: true, size: 11.5, weight: 700, color: C.fg, opacity: 0 };
      o.bt1 = { type: 'box', x: 160, y: 241, w: 210, h: 30, rx: 7, fill: C.warnW, stroke: C.warn, sw: 1.4, text: '#1 update_name(…"Alexandria")', mono: true, size: 11, weight: 700, color: C.fg, opacity: 0 };
      o.bt2 = { type: 'box', x: 160, y: 277, w: 210, h: 30, rx: 7, fill: C.infoW, stroke: C.info, sw: 1.4, text: '#2 main', mono: true, size: 11.5, weight: 700, color: C.fg, opacity: 0 };
      o.idv = { type: 'text', x: NX0 + 9.5 * NB, y: NY + 62, text: 'id = 1', mono: true, size: 14, weight: 800, color: C.teal };
      return o;
    },
    steps: [
      { hl: [1, 2], say: 'rr record ./corruption：程序照常从头跑到尾。rr 把所有不确定的东西都记到磁盘上。比如系统调用的结果、线程调度的顺序。', data: { '播放方向': '录制 →' },
        log: ['$ gcc -g corruption.c -o corruption', { s: '$ rr record ./corruption', at: 300 }, { s: '（视频 13:47：程序正常打印，录像存在隐藏目录里）', at: 1500, cls: 'dim' }],
        set: { ph: { x: { to: TX.chk, delay: 200, dur: 1500, ease: 'linear' } }, rec: { opacity: { to: 1, delay: 300, dur: 300 } }, recp: { dash: { to: 1, delay: 400, dur: 500 } } },
        fx: [{ type: 'stream', path: 'recp', at: 600, n: 6, gap: 0.14, dur: 1400, color: C.teal, labels: ['syscall', '信号', '调度', '…'] }, { type: 'pulse', obj: 'rec', at: 1900, color: C.teal }] },
      { hl: [3], say: 'rr replay 打开的就是熟悉的 gdb 界面。录像从头开始重放，执行点回到起点。', data: { '播放方向': '回放 →' },
        log: ['$ rr replay', { s: '（视频 14:51：界面和 gdb 几乎一样）', at: 500, cls: 'dim' }],
        set: { ph: { x: { to: TX.s, delay: 200, dur: 800, ease: 'inOut' } }, recp: { dash: { to: 0, delay: 600, dur: 400 } } },
        fx: [{ type: 'ripple', obj: 'ph', at: 1050, color: C.info }] },
      { hl: [4, 5], say: 'break 52 再 continue：停在发现 id 不对的那个 if 上。到这里和普通 gdb 没有区别。',
        log: [{ s: '(rr) break 52', at: 100 }, { s: '(rr) continue', at: 400 }],
        set: { ph: { x: { to: TX.chk, delay: 500, dur: 1100, ease: 'inOut' } } },
        fx: [{ type: 'ripple', obj: 'ph', at: 1650, color: C.info }] },
      { hl: [6], say: 'p accounts[0].id，发现早就被改坏了。普通 gdb 只能往前走，只好把断点往前挪，从头重跑。这相当于手工二分（视频 17:53、24:08）。',
        log: { s: '(rr) p accounts[0].id', at: 200 }, data: { 'accounts[0].id': { v: '（怪数）', at: 500 } },
        eq: [{ s: '区间 = [开始, 第 52 行]', at: 300 }, { s: '在中点设断点，重跑：id 还正常 → 坏在后半段', at: 1300 }],
        set: { win: { opacity: { to: 0.45, delay: 300, dur: 300 } }, pb: { opacity: { to: 1, delay: 600, dur: 250 }, x: { from: TX.s, to: (TX.s + TX.chk) / 2, delay: 600, dur: 600, ease: 'out' } } },
        fx: [{ type: 'pulse', obj: 'pb', at: 1300, color: C.ok }] },
      { hl: [4, 5], say: '区间缩成后半段，再取中点重跑。已经坏了，说明问题在这一段的前半。每次重跑砍掉一半。能做，但每一轮都要把程序从头跑一遍。',
        eq: [{ s: '新区间 = [中点, 第 52 行]，再取中点：已坏 → 前半段', at: 1000 }, { s: '区间每次减半 → n 个候选位置要 ⌈log₂ n⌉ 次重跑', at: 1600 }],
        set: { win: { x: { to: (TX.chk + (TX.s + TX.chk) / 2) / 2 + 2, dur: 700 }, w: { to: 345, dur: 700 } },
          pb: { x: { to: (TX.chk + (TX.s + TX.chk) / 2) / 2, delay: 600, dur: 500 }, fill: { to: C.badW, delay: 1000, dur: 200 }, stroke: { to: C.bad, delay: 1000, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'pb', at: 1100, color: C.bad }] },
      { hl: [7, 8], say: 'rr 的做法：先 watch accounts[0].id，再 reverse-continue。程序倒着执行，直到这个值发生变化。', data: { '播放方向': '← 倒放' },
        log: [{ s: '(rr) watch accounts[0].id', at: 100 }, { s: '(rr) reverse-continue', at: 500 }],
        set: { win: { opacity: { to: 0, dur: 300 } }, pb: { opacity: { to: 0, dur: 300 } }, ph: { x: { to: TX.nm, delay: 600, dur: 1300, ease: 'inOut' }, fill: { to: C.warn, delay: 500, dur: 200 }, stroke: { to: C.warn, delay: 500, dur: 200 } } },
        fx: [{ type: 'ripple', obj: 'ph', at: 1950, color: C.warn }] },
      { hl: [8], say: '命中硬件观察点。注意倒着走时，新旧是反的。New value 才是更早的那个值 1（视频 19:09）。', data: { 'Old value': '（怪数，更晚）', 'New value': { v: '1（更早）', at: 500 } },
        log: { s: '（视频：Hardware watchpoint … Old value = <怪数>  New value = 1）', at: 300, cls: 'dim' },
        fx: [{ type: 'pulse', obj: 'ph', at: 200, color: C.warn }] },
      { hl: [9], say: 'bt 显示，真正写内存的是 C 库里的 __strcpy_avx2。调用它的是 update_name，参数正是 "Alexandria"（视频 19:51）。',
        log: { s: '(rr) bt', at: 100 },
        set: { bt0: { opacity: { to: 1, delay: 300, dur: 250 }, x: { from: 130, to: 160, delay: 300, dur: 400, ease: 'out' } }, bt1: { opacity: { to: 1, delay: 500, dur: 250 }, x: { from: 130, to: 160, delay: 500, dur: 400, ease: 'out' } }, bt2: { opacity: { to: 1, delay: 700, dur: 250 }, x: { from: 130, to: 160, delay: 700, dur: 400, ease: 'out' } } } },
      { hl: [9], say: '原因是 name 只有 8 字节。“Alexandria” 加结尾的 \\0 共 11 字节。strcpy 不管边界，多出的 3 字节写进了紧挨着的 id。',
        eq: ['strlen("Alexandria") + 1 = 10 + 1 = 11 字节', { s: '11 − 8 = 3 字节越过 name，落进 id', at: 600, cls: 'bad' }],
        set: (function () { var s = { bt0: { opacity: { to: 0.35, dur: 300 } }, bt1: { opacity: { to: 0.35, dur: 300 } }, bt2: { opacity: { to: 0.35, dur: 300 } } };
          LET.forEach(function (c, k) { s['c' + k] = { opacity: { to: 1, delay: k * 90, dur: 150 }, x: { to: NX0 + k * NB, delay: 200 + k * 90, dur: 500, ease: 'out' }, y: { to: NY, delay: 200 + k * 90, dur: 500, ease: 'out' } }; });
          return s; })(),
        fx: [{ type: 'shake', obj: 'c8', at: 1300 }, { type: 'shake', obj: 'c10', at: 1450 }] },
      { hl: [9], say: 'id 的 4 个字节变成 69 61 00 00。前三个是 i、a、\\0。最后一个是原来的高字节 0。x86 是小端序，读出来是 0x6169 = 24937。这是按示意布局推算的。',
        data: { 'accounts[0].id': { v: 24937, at: 1300 } },
        eq: [{ s: "'i' = 0x69, 'a' = 0x61, '\\0' = 0x00", at: 200 }, { s: '小端：低字节在前 → 0x00006169', at: 700 }, { s: '0x6169 = 6×4096 + 1×256 + 6×16 + 9 = 24937', at: 1200 }],
        set: { idv: { text: { to: 'id = 24937', delay: 1300 }, color: { to: C.bad, delay: 1300, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'idv', at: 1300, color: C.bad }] },
      { hl: [2], say: 'rr 的限制：只支持 Linux，还需要硬件性能计数器。很多虚拟机没有这个计数器。确定性调度可能让并发 bug 不再出现。改了代码，旧录像就作废。',
        log: { s: '（本机 Windows 无法运行 rr。替代方案见练习页调试 2 的 gdb 观察点）', at: 300, cls: 'dim' },
        set: { ph: { fill: { to: C.neutral, dur: 400 }, stroke: { to: C.neutral, dur: 400 } }, rec: { opacity: { to: 0.4, dur: 400 } } } }
    ]
  };

  /* ---------- 场景 4：AddressSanitizer 与影子内存（调试练习 3） ---------- */
  var BX = [190, 340, 490, 640], BY = 170, SY = 360;
  var UAF = '#include <stdlib.h>\n#include <string.h>\n#include <stdio.h>\n\nint main() {\n    char *greeting = malloc(32);\n    strcpy(greeting, "Hello, world!");\n    printf("%s\\n", greeting);\n\n    free(greeting);\n\n    greeting[0] = \'J\';\n    printf("%s\\n", greeting);\n\n    return 0;\n}';
  function shObjs() {
    var o = {};
    BX.forEach(function (x, k) {
      o['b' + k] = { type: 'box', x: x, y: BY, w: 146, h: 52, rx: 6, fill: C.dataW, stroke: C.data, sw: 1.6, text: '', opacity: 0 };
      o['s' + k] = { type: 'box', x: x, y: SY, w: 70, h: 42, rx: 7, fill: C.okW, stroke: C.ok, sw: 1.6, text: '00', mono: true, size: 17, weight: 800, color: C.ok, opacity: 0 };
      o['l' + k] = { type: 'line', x1: x, y1: BY + 28, x2: x, y2: SY - 22, stroke: C.line, sw: 1.4, dasharray: '4 4', opacity: 0 };
    });
    o.zl = { type: 'box', x: 72, y: BY, w: 80, h: 52, rx: 6, fill: C.bg3, stroke: C.neutral, sw: 1.4, text: 'redzone', size: 11.5, weight: 700, color: C.fg3, opacity: 0 };
    o.zr = { type: 'box', x: 760, y: BY, w: 80, h: 52, rx: 6, fill: C.bg3, stroke: C.neutral, sw: 1.4, text: 'redzone', size: 11.5, weight: 700, color: C.fg3, opacity: 0 };
    o.szl = { type: 'box', x: 72, y: SY, w: 60, h: 42, rx: 7, fill: C.bg3, stroke: C.neutral, sw: 1.4, text: 'fa', mono: true, size: 17, weight: 800, color: C.fg3, opacity: 0 };
    o.szr = { type: 'box', x: 760, y: SY, w: 60, h: 42, rx: 7, fill: C.bg3, stroke: C.neutral, sw: 1.4, text: 'fa', mono: true, size: 17, weight: 800, color: C.fg3, opacity: 0 };
    o.str = { type: 'text', x: 128, y: BY, anchor: 'start', text: 'H e l l o ,   w o r l d ! \\0', mono: true, size: 15, weight: 750, color: C.fg, opacity: 0 };
    o.ptr = { type: 'box', x: 120, y: 70, w: 120, h: 34, rx: 8, fill: C.infoW, stroke: C.info, sw: 1.6, text: 'greeting', mono: true, size: 14, weight: 750, color: C.info, opacity: 0 };
    o.pa = { type: 'path', d: 'M150,88 C190,100 175,130 170,140', stroke: C.info, sw: 2, dash: 0, arrow: 'info' };
    o.chk = { type: 'box', x: 300, y: 480, w: 330, h: 46, rx: 10, fill: C.warnW, stroke: C.warn, sw: 1.6, text: '插桩检查：shadow(&greeting[0]) == 0 ?', mono: true, size: 12.5, weight: 750, color: C.fg, opacity: 0 };
    o.rep = { type: 'box', x: 680, y: 480, w: 250, h: 46, rx: 10, fill: C.badW, stroke: C.bad, sw: 2, text: 'heap-use-after-free！', mono: true, size: 14, weight: 800, color: C.bad, opacity: 0, s: 0.8 };
    o.flow = { type: 'path', d: 'M190,382 C200,440 230,470 260,474', stroke: C.warn, sw: 2.2, dash: 0, arrow: 'warn' };
    return o;
  }
  var sceneAsan = {
    name: 'ASan 影子内存', desc: '调试练习 3：释放之后再写，也就是 use-after-free。不开检查时，程序“看起来正常”。AddressSanitizer 给每 8 字节内存配 1 字节“影子”。影子记下哪些字节能碰。每次访问前，先查影子。',
    code: { lang: 'c', title: 'uaf.c（讲义练习）', src: UAF },
    dataTitle: '这块堆内存的状态',
    data: { '状态': '无', '影子字节': '无', '程序输出': '无' },
    legend: [[C.data, '堆内存（可访问）'], [C.ok, '影子 00：可访问'], [C.bad, '影子 fd：已释放'], [C.neutral, '影子 fa：redzone'], [C.warn, '编译器插入的检查']],
    bg: function (d) {
      d.text(430, 26, '上：32 字节堆内存（每格 8 字节）    下：ASan 的影子内存（每格 1 字节）', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.text(430, 124, 'malloc(32) 拿到的块', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
      d.text(430, 410, '影子内存：shadow = (addr >> 3) + Offset', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600, mono: true });
    },
    objects: shObjs,
    steps: [
      { say: '先不开 ASan：malloc(32) 拿到 32 字节，strcpy 写入 “Hello, world!” 和结尾的 \\0（14 字节）。', hl: [6, 7], data: { '状态': '已分配' },
        set: (function () { var s = { ptr: { opacity: { to: 1, dur: 300 } }, pa: { dash: { to: 1, delay: 300, dur: 400 } }, str: { opacity: { to: 1, delay: 900, dur: 400 } } };
          BX.forEach(function (x, k) { s['b' + k] = { opacity: { to: 1, delay: 200 + k * 100, dur: 250 }, y: { from: BY - 20, to: BY, delay: 200 + k * 100, dur: 400, ease: 'back' } }; }); return s; })() },
      { say: 'printf 打印 Hello, world!。然后 free(greeting)，内存交还给分配器。但字节还在，指针也还指着它。它成了悬空指针。', hl: [8, 10],
        data: { '状态': { v: '已释放', at: 900 }, '程序输出': 'Hello, world!' }, log: ['$ gcc uaf.c -o uaf && ./uaf', { s: 'Hello, world!', at: 400 }],
        set: (function () { var s = { ptr: { stroke: { to: C.bad, delay: 900, dur: 300 }, color: { to: C.bad, delay: 900, dur: 300 } }, pa: { stroke: { to: C.bad, delay: 900, dur: 300 } }, str: { opacity: { to: 0.55, delay: 900, dur: 300 } } };
          BX.forEach(function (x, k) { s['b' + k] = { fill: { to: C.bg3, delay: 800, dur: 400 }, stroke: { to: C.neutral, delay: 800, dur: 400 } }; }); return s; })() },
      { say: "greeting[0] = 'J'：没有任何检查，这次写入“成功”了。再打印，得到 Jello, world!，退出码 0（本机实测）。", hl: [12, 13],
        data: { '程序输出': { v: 'Jello, world!', at: 900 } }, log: [{ s: 'Jello, world!', at: 900 }, { s: 'exit=0', at: 1100 }],
        set: { str: { text: { to: 'J e l l o ,   w o r l d ! \\0', delay: 500 }, opacity: { to: 1, delay: 500, dur: 200 } } },
        fx: [{ type: 'float', x: 136, y: BY - 10, at: 500, text: 'H → J', color: C.bad }] },
      { say: '这就是内存 bug 可怕的地方。不崩溃也不报错，却可能悄悄改坏了别人的数据。现在加上 -fsanitize=address 重新编译。',
        data: { '状态': '重新编译（ASan）', '程序输出': '无' },
        eq: ['ASan：每 8 字节应用内存 ↔ 1 字节影子内存', { s: 'shadow 地址 = (addr >> 3) + Offset', at: 500 }, { s: '32 字节的块 → 32 / 8 = 4 个影子字节', at: 1000 }],
        set: (function () { var s = { str: { text: 'H e l l o ,   w o r l d ! \\0', opacity: { to: 1, dur: 200 } }, ptr: { stroke: { to: C.info, dur: 300 }, color: { to: C.info, dur: 300 } }, pa: { stroke: { to: C.info, dur: 300 } } };
          BX.forEach(function (x, k) { s['b' + k] = { fill: { to: C.dataW, dur: 300 }, stroke: { to: C.data, dur: 300 } }; s['l' + k] = { opacity: { to: 1, delay: 400 + k * 120, dur: 400 } }; }); return s; })() },
      { say: 'malloc 之后，块本身对应的 4 个影子字节都是 00。00 表示这 8 字节全可访问。ASan 还在块两侧放了 redzone，影子是 fa。碰到 redzone 就是越界。', hl: [6], data: { '影子字节': { v: '00 00 00 00', at: 800 } },
        set: (function () { var s = { zl: { opacity: { to: 1, delay: 600, dur: 300 } }, zr: { opacity: { to: 1, delay: 600, dur: 300 } }, szl: { opacity: { to: 1, delay: 800, dur: 300 } }, szr: { opacity: { to: 1, delay: 800, dur: 300 } } };
          BX.forEach(function (x, k) { s['s' + k] = { opacity: { to: 1, delay: k * 120, dur: 250 }, y: { from: SY + 20, to: SY, delay: k * 120, dur: 400, ease: 'back' } }; }); return s; })() },
      { say: 'free 之后，影子全部改成 fd，表示已释放。这块内存还被放进“隔离区”，暂不复用。悬空指针一碰，就能被认出来。', hl: [10], data: { '状态': '已释放（隔离中）', '影子字节': { v: 'fd fd fd fd', at: 900 } },
        set: (function () { var s = {}; BX.forEach(function (x, k) { s['s' + k] = { text: { to: 'fd', delay: 300 + k * 120 }, fill: { to: C.badW, delay: 300 + k * 120, dur: 300 }, stroke: { to: C.bad, delay: 300 + k * 120, dur: 300 }, color: { to: C.bad, delay: 300 + k * 120, dur: 300 } }; s['b' + k] = { fill: { to: C.bg3, delay: 200, dur: 300 }, stroke: { to: C.neutral, delay: 200, dur: 300 } }; }); return s; })(),
        fx: [{ type: 'burst', obj: 's0', at: 400, color: C.bad }] },
      { say: "执行 greeting[0] = 'J' 之前，先去读影子。这道检查是编译器插进来的。它读到 fd，不是 0，于是立即报错退出。报告给出三段调用栈：写入处、free 处、malloc 处。", hl: [12],
        log: { s: '（Linux 上 ASan 在这里报 heap-use-after-free。本机 MinGW 缺 asan 运行时，未实测）', at: 1500, cls: 'dim' },
        set: { chk: { opacity: { to: 1, dur: 300 } }, flow: { dash: { to: 1, delay: 300, dur: 600 } }, rep: { opacity: { to: 1, delay: 1100, dur: 300 }, s: { to: 1, delay: 1100, dur: 500, ease: 'back' } } },
        fx: [{ type: 'stream', path: 'flow', at: 400, n: 2, dur: 800, color: C.warn, labels: ['fd'] }, { type: 'shake', obj: 'rep', at: 1600 }] },
      { say: '本机能做到的是编译期检查。gcc -Wall 给出 -Wuse-after-free 警告，-fanalyzer 报出 CWE-416（本机实测）。修法是先用，后 free。',
        log: [{ s: '$ gcc -Wall -g uaf.c -o uaf', at: 100 }, { s: "uaf.c:12:17: warning: pointer 'greeting' used after 'free' [-Wuse-after-free]", at: 500, cls: 'err' },
          { s: '$ gcc -fanalyzer -c uaf.c', at: 1000 }, { s: "uaf.c:12:17: warning: use after 'free' of 'greeting' [CWE-416]", at: 1400, cls: 'err' }],
        fx: [{ type: 'pulse', obj: 'chk', at: 400, color: C.warn }] }
    ]
  };

  VZ.register({
    id: 'ch04-debugger', title: '调试器：断点、单步与观察点',
    sources: [
      { t: '视频 6:02 gdb / lldb / pdb', u: 'https://youtu.be/8VYT9TcUmKs?t=362' },
      { t: '视频 23:33 gdb 重跑与 watch', u: 'https://youtu.be/8VYT9TcUmKs?t=1413' },
      { t: '讲义 Debuggers', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#debuggers' },
      { t: 'Python 文档 · pdb', u: 'https://docs.python.org/3/library/pdb.html' }
    ],
    note: '两个场景的控制台输出，都是本机真跑的结果。详见练习页调试 1 和调试 2。pdb 用的是 Python 3.13，gdb 是 14.1 MinGW。内存格子和指针的画法是示意。',
    scenes: [sceneStep, sceneWatch]
  });

  VZ.register({
    id: 'ch04-rr', title: 'rr：把执行录下来，再倒着放',
    sources: [
      { t: '视频 7:45 反向调试', u: 'https://youtu.be/8VYT9TcUmKs?t=465' },
      { t: '视频 18:25 watch + reverse-continue', u: 'https://youtu.be/8VYT9TcUmKs?t=1105' },
      { t: '视频 21:02 strcpy 写过界', u: 'https://youtu.be/8VYT9TcUmKs?t=1262' },
      { t: '讲义 Record-Replay Debugging', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#record-replay-debugging' },
      { t: 'rr 项目主页', u: 'https://rr-project.org/' }
    ],
    note: '这里复述视频里的 rr 演示。视频没有展示结构体的完整源码。字节布局和 id 的数值，是按视频描述推算的示意。rr 只支持 Linux，本机未实测。',
    scenes: [sceneRR]
  });

  VZ.register({
    id: 'ch04-asan', title: 'AddressSanitizer：影子内存怎样抓住 use-after-free',
    sources: [
      { t: '视频 46:31 sanitizer', u: 'https://youtu.be/8VYT9TcUmKs?t=2791' },
      { t: '讲义 Sanitizers', u: 'https://missing.csail.mit.edu/2026/debugging-profiling/#sanitizers' },
      { t: 'ASan 算法说明（影子内存）', u: 'https://github.com/google/sanitizers/wiki/AddressSanitizerAlgorithm' }
    ],
    note: 'Hello 和 Jello 的输出、gcc 的两条警告是本机实测。ASan 报告未实测，本机 MinGW 缺 asan 运行时。影子编码 00、fa、fd 取自 ASan 文档，属于补充。',
    scenes: [sceneAsan]
  });
})();
