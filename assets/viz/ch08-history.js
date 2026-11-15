/* ch08 · 提交历史怎么把“为什么”找回来 —— 可视化演示
 * 依据：Lecture 8 视频 8:34–12:34（提交信息、git blame、四个问题）、14:50–16:45（git add -p 拆分提交）、
 *       19:05–20:52（git bisect 与自动化）；讲义 beyond-code.md「One-way communication」。
 * 实测：场景 1–3 的控制台输出来自 labs/data/lab08.js（练习 2 的 make_repo.sh 造的示例仓库，
 *       提交时间与身份固定，所以哈希可复现）；场景 4、5 的输出是笔记作者在本机 Git 2.55 沙箱仓库里真跑的
 *       （git add -p、git bisect run），仓库内容与“网关缓存 16 个包”等背景故事均为示意。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function T(x, y, text, o) { return merge({ type: 'text', x: x, y: y, text: text, size: 13, color: C.fg, anchor: 'start' }, o || {}); }
  function B(x, y, w, h, text, o) { return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, text: text || '', fill: C.bg, stroke: C.line, sw: 1.5, color: C.fg, size: 13, weight: 650 }, o || {}); }
  function show(at, dur) { return { opacity: { to: 1, delay: at || 0, dur: dur || 300 } }; }
  function hide(at, dur) { return { opacity: { to: 0, delay: at || 0, dur: dur || 300 } }; }

  /* ---------- 场景 1：只写 what 的提交 vs 写 why 的提交 ---------- */
  var sceneWhy = {
    name: 'what 与 why', desc: 'diff 已经告诉读者“改了什么”。提交信息该记的，是 diff 里看不到的“为什么”。',
    code: { lang: 'text', title: 'better_msg.txt（练习 2 的改写，示意场景）',
      src: 'Limit in-flight packets to 16 to match the gateway buffer\n\nProblem: the gateway firmware buffers at most 16 packets per session.\nWith 64 packets in flight, packets 17-64 were dropped and only resent\nafter RETRY_TIMEOUT, so large uploads stalled for 30 s at a time.\n\nSolution: lower MAX_IN_FLIGHT from 64 to 16.\n\nImplications: on links whose receiver has a bigger buffer, throughput\nis now capped lower than before. If the firmware buffer grows, raise\nthis constant too (or negotiate the window per session).' },
    dataTitle: '讲义的四个问题：这条信息答了吗？',
    data: { '什么问题迫使改动': '无', '考虑过哪些方案': '无', '取舍与影响': '无', '有什么出人意料': '无' },
    bg: function (d) {
      d.text(430, 26, '同一个 diff，两种提交信息', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(24, 52, 360, 150, { fill: C.bg2, stroke: C.line, rx: 10 });
      d.text(38, 70, 'git show 里的 diff（chunker.py）', { size: 11.5, color: C.fg3, weight: 600 });
      d.text(40, 104, ' RETRY_TIMEOUT = 30  # seconds', { size: 13, mono: true, color: C.fg3 });
      d.text(40, 164, ' ', { size: 13, mono: true });
      d.rect(420, 52, 416, 470, { fill: 'none', stroke: C.line, rx: 12, dash: '5 4' });
      d.text(436, 72, '提交信息', { size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: {
      minus: T(40, 130, '-MAX_IN_FLIGHT = 64', { mono: true, color: C.bad, size: 14, weight: 700 }),
      plus: T(40, 156, '+MAX_IN_FLIGHT = 16', { mono: true, color: C.ok, size: 14, weight: 700 }),
      hash: B(500, 102, 110, 30, '4140218', { mono: true, fill: C.warnW, stroke: C.warn, color: C.warn, opacity: 0 }),
      subj: T(566, 102, 'update', { mono: true, size: 18, weight: 800, opacity: 0 }),
      reader: { type: 'circle', x: 120, y: 380, r: 34, fill: C.infoW, stroke: C.info, sw: 2, text: '读者', color: C.info, size: 14, opacity: 0 },
      bubble: B(250, 320, 210, 46, '64 → 16，为什么？', { fill: C.bg, stroke: C.info, color: C.info, opacity: 0, s: 0.7 }),
      bubble2: B(250, 440, 210, 46, '能不能改回 64？', { fill: C.bg, stroke: C.info, color: C.info, opacity: 0, s: 0.7 }),
      pP: B(628, 190, 380, 64, 'Problem：网关每个会话只缓存 16 个包', { fill: C.badW, stroke: C.bad, opacity: 0, x: 1000 }),
      pS: B(628, 290, 380, 64, 'Solution：MAX_IN_FLIGHT 64 → 16', { fill: C.dataW, stroke: C.data, opacity: 0, x: 1000 }),
      pI: B(628, 390, 380, 64, 'Implications：大缓冲链路的吞吐被压低', { fill: C.warnW, stroke: C.warn, opacity: 0, x: 1000 }),
      scale: T(436, 494, '', { size: 12, color: C.fg3, opacity: 0 })
    },
    steps: [
      { say: 'Ben 的提交只改了一个常量。提交信息只有一个词 update。这是示例仓库，本机真跑。',
        log: ['$ git show HEAD', { s: '    update', at: 500 }, { s: '-MAX_IN_FLIGHT = 64', at: 700, cls: 'err' }, { s: '+MAX_IN_FLIGHT = 16', at: 850 }],
        set: { hash: show(200), subj: merge(show(400), { x: { from: 600, to: 566, delay: 400, dur: 500, ease: 'out' } }) },
        fx: [{ type: 'pulse', obj: 'minus', at: 700, color: C.bad }, { type: 'pulse', obj: 'plus', at: 850, color: C.ok }] },
      { say: '几个月后有人读到这行，也许就是你自己。64 改成 16，为什么？能不能改回去？diff 只回答了“改了什么”。',
        set: { reader: merge(show(), { y: { from: 430, to: 380, dur: 600, ease: 'back' } }),
          bubble: merge(show(500), { s: { to: 1, delay: 500, dur: 500, ease: 'back' } }),
          bubble2: merge(show(1100), { s: { to: 1, delay: 1100, dur: 500, ease: 'back' } }) },
        fx: [{ type: 'float', obj: 'reader', at: 300, text: '?', color: C.info }, { type: 'float', obj: 'reader', at: 900, text: '?', color: C.info }] },
      { say: '讲义给的四个问题，update 一个都没回答。git blame 把人带到这次提交时，线索就断了。',
        data: { '什么问题迫使改动': { v: '×', at: 200 }, '考虑过哪些方案': { v: '×', at: 450 }, '取舍与影响': { v: '×', at: 700 }, '有什么出人意料': { v: '×', at: 950 } },
        set: { subj: { color: { to: C.bad, delay: 300, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'subj', at: 1000, amp: 8 }] },
      { say: 'Problem：先写是什么问题逼你改。网关固件每个会话只缓存 16 个包。多发的包被丢掉，只能等超时重传。', hl: [1, 3, 4, 5],
        data: { '什么问题迫使改动': { v: '√ 网关只缓存 16 个', at: 600 } },
        set: { subj: { text: 'Limit in-flight packets to 16…', size: { to: 14, dur: 300 }, color: { to: C.fg, dur: 300 } },
          bubble2: hide(), pP: merge(show(200), { x: { to: 628, delay: 200, dur: 700, ease: 'out' } }) },
        fx: [{ type: 'ripple', obj: 'pP', at: 900, color: C.bad }] },
      { say: 'Solution：写怎么改的。这里没有别的备选方案。修 off-by-one 这类改动，可以不写备选方案（视频 10:14）。', hl: [7],
        data: { '考虑过哪些方案': { v: '本例无（可省略）', at: 600 } },
        set: { pS: merge(show(200), { x: { to: 628, delay: 200, dur: 700, ease: 'out' } }) },
        fx: [{ type: 'ripple', obj: 'pS', at: 900, color: C.data }] },
      { say: 'Implications：写代价和意外。接收端缓冲更大的链路，吞吐被压低了。固件升级后，要记得调大。写出来，后人就知道这个取舍是有意的。', hl: [9, 10, 11],
        data: { '取舍与影响': { v: '√ 吞吐上限变低', at: 600 }, '有什么出人意料': { v: '√ 固件升级要同步改', at: 900 } },
        set: { bubble: hide(), pI: merge(show(200), { x: { to: 628, delay: 200, dur: 700, ease: 'out' } }) },
        fx: [{ type: 'ripple', obj: 'pI', at: 900, color: C.warn }, { type: 'burst', obj: 'reader', at: 1100, color: C.ok }] },
      { say: '最后一次提交还没推送时，可以用 git commit --amend 改写信息。注意哈希变了：4140218 → ed8824e（它是一个新提交）。',
        log: ['$ git commit -q --amend -F ../ex02/better_msg.txt', { s: '$ git log -1 --format=\'after:  %h %s\'', at: 500 }, { s: 'after:  ed8824e Limit in-flight packets to 16 to match the gateway buffer', at: 800, cls: 'ok' }],
        set: { hash: { text: { to: 'ed8824e', delay: 800 }, fill: { to: C.okW, delay: 800, dur: 300 }, stroke: { to: C.ok, delay: 800, dur: 300 }, color: { to: C.ok, delay: 800, dur: 300 } } },
        fx: [{ type: 'flash', obj: 'hash', at: 800, color: C.ok }] },
      { say: '详略跟着复杂度走。改错别字，一行标题就够。花了几小时才查清的竞态 bug，值得写好几段（讲义）。',
        set: { scale: merge(show(200), { text: '详略 ∝ 改动的复杂度：typo → 只要标题，难查的 bug → 写几段' }), reader: { s: { to: 0.85, dur: 400 } } } }
    ]
  };

  /* ---------- 场景 2：git blame 逐行溯源 ---------- */
  var BL = [
    ['ff121228', '# 1492 (PPPoE MTU) - 20 (IPv4 header) - 8 (UDP header).', 3],
    ['ff121228', '# Ethernet allows 1500, but on PPPoE … got fragmented.', 4],
    ['ff121228', 'CHUNK_SIZE = 1464', 5],
    ['7809933e', 'RETRY_TIMEOUT = 30  # seconds', 6],
    ['4140218c', 'MAX_IN_FLIGHT = 16', 7]
  ];
  var BY0 = 84, BDY = 36;
  function blameObjs() {
    var o = {};
    o.hlRow = B(470, BY0 + 2 * BDY, 700, 34, '', { fill: C.dataW, stroke: C.data, sw: 1.2, opacity: 0 });
    BL.forEach(function (b, i) {
      var col = b[0] === 'ff121228' ? C.ok : C.bad;
      o['g' + i] = B(76, BY0 + i * BDY, 96, 28, b[0], { mono: true, size: 12, fill: b[0] === 'ff121228' ? C.okW : C.badW, stroke: col, color: col, opacity: 0, x: 20 });
      o['l' + i] = T(136, BY0 + i * BDY, b[2] + '  ' + b[1], { mono: true, size: 12, color: C.fg2 });
    });
    o.ptr = T(10, BY0 + 2 * BDY, '▶', { size: 16, color: C.data, opacity: 0 });
    o.chip = B(76, BY0 + 2 * BDY, 96, 28, 'ff121228', { mono: true, size: 12, fill: C.okW, stroke: C.ok, color: C.ok, opacity: 0, trail: { n: 5, gap: 36 } });
    o.card = B(430, 400, 790, 250, '', { fill: C.bg2, stroke: C.line, rx: 12, opacity: 0 });
    o.cTitle = T(48, 300, '', { size: 14, weight: 800, mono: true, opacity: 0 });
    for (var k = 0; k < 6; k++) o['c' + k] = T(48, 332 + k * 25, '', { size: 12, mono: true, color: C.fg2, opacity: 0 });
    return o;
  }
  var MSG = ['Problem: uploads from DSL customers stalled under ~3% packet loss.', 'Their PPPoE links have an MTU of 1492 bytes, so every 1500-byte IP',
    'packet was split into two fragments, and losing either one lost both.', 'Solution: size chunks for the smaller MTU (1492 - 20 - 8 = 1464) and',
    'write the arithmetic next to the constant.', 'Implications: about 0.5% more packets on links that could carry 1500.'];
  function msgSet(lines, at) {
    var s = {};
    for (var k = 0; k < 6; k++) s['c' + k] = { text: { to: lines[k] || '', delay: at }, opacity: { from: 0, to: lines[k] ? 1 : 0, delay: at + k * 90, dur: 250 } };
    return s;
  }
  function pointTo(i) {
    return { ptr: { opacity: { to: 1, dur: 200 }, y: { to: BY0 + i * BDY, dur: 600, ease: 'inOut' } },
      hlRow: { opacity: { to: 1, dur: 200 }, y: { to: BY0 + i * BDY, dur: 600, ease: 'inOut' } } };
  }
  function fly(i, at) {
    var b = BL[i], good = b[0] === 'ff121228';
    return { chip: { text: b[0], fill: { to: good ? C.okW : C.badW, dur: 0 }, stroke: { to: good ? C.ok : C.bad, dur: 0 }, color: { to: good ? C.ok : C.bad, dur: 0 },
      x: { from: 76, to: 640, delay: at, dur: 800, ease: 'inOut' }, y: { from: BY0 + i * BDY, to: 300, delay: at, dur: 800, ease: 'inOut' }, opacity: { from: 1, to: 0, delay: at + 800, dur: 250 } } };
  }
  var sceneBlame = {
    name: 'git blame', desc: '对文件的每一行，git blame 给出最后改它的那次提交。拿着哈希去看提交信息，就知道这行为什么长这样。',
    code: { lang: 'sh', title: '依次输入（示例仓库，本机真跑）', src: 'git blame --date=short -L 3,7 chunker.py\ngit show -s ff12122\ngit show -s 7809933\ngit show -s 4140218' },
    dataTitle: '正在追查',
    data: { '行': '无', '最后修改它的提交': '无', '提交信息有用吗': '无' },
    bg: function (d) {
      d.text(430, 26, 'chunker.py 第 3–7 行：左边是 blame 给出的提交哈希', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(24, 60, 812, 196, { fill: C.bg2, stroke: C.line, rx: 10 });
    },
    objects: blameObjs,
    steps: [
      { say: 'git blame -L 3,7 只看第 3 到 7 行。它给每行标出最后改它的提交。输出里还有作者和日期，这里只画哈希。', hl: [1],
        log: ['$ git blame --date=short -L 3,7 chunker.py', { s: 'ff121228 (Alyssa P. Hacker 2026-01-12 3) # 1492 (PPPoE MTU) - 20 …', at: 400 }, { s: 'ff121228 (Alyssa P. Hacker 2026-01-12 5) CHUNK_SIZE = 1464', at: 600 }, { s: '7809933e (Ben Bitdiddle    2026-01-08 6) RETRY_TIMEOUT = 30  # seconds', at: 800 }, { s: '4140218c (Ben Bitdiddle    2026-01-20 7) MAX_IN_FLIGHT = 16', at: 1000 }],
        set: (function () { var s = {}; BL.forEach(function (b, i) { s['g' + i] = { opacity: { to: 1, delay: 200 + i * 160, dur: 250 }, x: { to: 76, delay: 200 + i * 160, dur: 500, ease: 'out' } }; }); return s; })() },
      { say: '你在读第 5 行：CHUNK_SIZE = 1464。这个数从哪来？为什么不是常见的 1472 或 1500？',
        data: { '行': '5: CHUNK_SIZE = 1464', '最后修改它的提交': 'ff121228' }, set: pointTo(2), fx: [{ type: 'pulse', obj: 'g2', at: 600, color: C.ok }] },
      { say: '拿着哈希看完整的提交信息：git show -s ff12122。', hl: [2],
        log: ['$ git show -s ff12122', { s: '    Use 1464-byte chunks so packets fit PPPoE links', at: 1100 }],
        set: merge(fly(2, 0), { card: show(500), cTitle: { text: 'ff12122  Use 1464-byte chunks so packets fit PPPoE links', opacity: { to: 1, delay: 900, dur: 300 }, color: { to: C.fg, dur: 0 } } }, msgSet(MSG, 1000)),
        fx: [{ type: 'ripple', x: 640, y: 300, at: 800, color: C.ok }] },
      { say: '答案就在信息里。PPPoE 链路的 MTU 是 1492。减去 IPv4 头 20 字节，再减 UDP 头 8 字节。',
        data: { '提交信息有用吗': { v: '√ 写清了 why', at: 400 } },
        eq: ['MTU(PPPoE) = 1492 字节', { s: '1492 − 20（IPv4 头）− 8（UDP 头）= 1464', at: 500 }, { s: '1472 ÷ 1464 ≈ 1.0055 → 包数多约 0.5%', at: 1100, cls: 'ok' }],
        fx: [{ type: 'pulse', obj: 'c3', at: 500, color: C.ok }, { type: 'pulse', obj: 'c5', at: 1100, color: C.warn }] },
      { say: '再看第 6 行 RETRY_TIMEOUT = 30：blame 指向 7809933。', hl: [3],
        data: { '行': '6: RETRY_TIMEOUT = 30', '最后修改它的提交': '7809933e', '提交信息有用吗': '无' },
        log: ['$ git show -s 7809933', { s: '    fix', at: 1200, cls: 'err' }],
        set: merge(pointTo(3), fly(3, 400), { cTitle: { text: { to: '7809933  fix', delay: 1200 }, color: { to: C.bad, delay: 1200, dur: 200 } } }, msgSet([], 1200)) },
      { say: '信息只有一个 fix：修了什么？为什么是 30 秒？线索断了，只能去翻 issue、问人，或者猜。',
        data: { '提交信息有用吗': { v: '× 只写了 fix', at: 300 } },
        set: { card: { stroke: { to: C.bad, dur: 300 } } }, fx: [{ type: 'shake', obj: 'cTitle', at: 300, amp: 8 }] },
      { say: '第 7 行同理，信息只有 update。blame 这类溯源工具有个前提。提交信息得写清“为什么”（视频 9:43）。', hl: [4],
        data: { '行': '7: MAX_IN_FLIGHT = 16', '最后修改它的提交': '4140218c', '提交信息有用吗': { v: '× 只写了 update', at: 1200 } },
        log: ['$ git show -s 4140218', { s: '    update', at: 1200, cls: 'err' }],
        set: merge(pointTo(4), fly(4, 400), { cTitle: { text: { to: '4140218  update', delay: 1200 } } }),
        fx: [{ type: 'shake', obj: 'cTitle', at: 1300, amp: 8 }] }
    ]
  };

  /* ---------- 场景 3：git log -S（pickaxe） ---------- */
  var CM = [['bcf0bd0', 'Add chunker…', 0, 0], ['7809933', 'fix', 0, 0], ['ff12122', 'Use 1464-byte chunks…', 0, 1], ['0e606e9', 'Keep pending… list', 1, 1], ['4140218', 'update', 1, 1]];
  var CX0 = 110, CDX = 160, CY = 230;
  function commitObjs() {
    var o = {};
    CM.forEach(function (c, i) {
      o['k' + i] = { type: 'circle', x: CX0 + i * CDX, y: CY, r: 24, fill: C.bg2, stroke: C.line, sw: 2, text: String(i + 1), color: C.fg2, size: 14 };
      o['h' + i] = T(CX0 + i * CDX, CY + 44, c[0], { anchor: 'middle', mono: true, size: 12, color: C.fg2 });
      o['s' + i] = T(CX0 + i * CDX, CY + 64, c[1], { anchor: 'middle', size: 11.5, color: C.fg3 });
      o['n' + i] = T(CX0 + i * CDX, CY - 46, '', { anchor: 'middle', mono: true, size: 13, weight: 700, color: C.fg2, opacity: 0 });
    });
    o.lens = B(CX0, CY - 90, 112, 30, "-S'1464'", { mono: true, fill: C.warnW, stroke: C.warn, color: C.warn, opacity: 0, trail: { n: 4, gap: 40 } });
    o.res = B(430, 440, 560, 44, '', { mono: true, fill: C.okW, stroke: C.ok, color: C.fg, opacity: 0 });
    return o;
  }
  function scan(i, at, hit) {
    var s = {}, c = CM[i];
    s.lens = { x: { to: CX0 + i * CDX, delay: at, dur: 500, ease: 'inOut' } };
    s['n' + i] = { text: c[2] + ' → ' + c[3], opacity: { to: 1, delay: at + 450, dur: 250 }, color: { to: hit ? C.ok : C.fg3, delay: at + 450, dur: 200 } };
    s['k' + i] = hit ? { fill: { to: C.okW, delay: at + 500, dur: 300 }, stroke: { to: C.ok, delay: at + 500, dur: 300 }, color: { to: C.ok, delay: at + 500, dur: 300 } }
      : { opacity: { to: 0.45, delay: at + 500, dur: 300 } };
    return s;
  }
  var scenePick = {
    name: 'git log -S', desc: 'git log -S\'字符串\' 俗称 pickaxe。它只列出让这个字符串出现次数变了的提交。也就是它被加入或删除的那次。',
    code: { lang: 'sh', title: '依次输入（示例仓库，本机真跑）', src: "git log -S'1464' --format='%h %s'\ngit log -S'RETRY_TIMEOUT = 30' --format='%h %s'" },
    dataTitle: '搜索',
    data: { '要找的字符串': '无', '命中的提交': '无' },
    bg: function (d) {
      d.text(430, 26, '从最早的提交扫到最新：比较每次提交前后，字符串出现了几次', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(CX0 - 40, CY, CX0 + 4 * CDX + 40, CY, { stroke: C.line, sw: 2 });
      d.text(CX0 - 40, CY + 100, '旧', { size: 12, color: C.fg3 });
      d.text(CX0 + 4 * CDX + 30, CY + 100, '新', { size: 12, color: C.fg3 });
      d.text(CX0 - 60, CY - 46, '次数', { size: 11.5, color: C.fg3, anchor: 'end' });
    },
    objects: commitObjs,
    steps: [
      { say: "想知道 1464 是哪次提交引入的？git log -S'1464'。", hl: [1], data: { '要找的字符串': "'1464'" },
        log: "$ git log -S'1464' --format='%h %s'",
        set: { lens: merge(show(), { y: { from: CY - 120, to: CY - 90, dur: 500, ease: 'back' } }) } },
      { say: '第 1 个提交 bcf0bd0：之前 0 次，之后 0 次。没变，跳过。', set: scan(0, 0, false),
        eq: { s: 'bcf0bd0：0 → 0（不变）', at: 500 } },
      { say: '7809933（fix）：只改了超时，1464 仍是 0 次。', set: scan(1, 0, false), eq: { s: '7809933：0 → 0（不变）', at: 500 } },
      { say: 'ff12122：0 次 → 1 次，次数变了，命中！这就是 1464 被加进来的那次提交。', set: scan(2, 0, true),
        eq: { s: 'ff12122：0 → 1（变了，命中）', at: 500, cls: 'ok' }, data: { '命中的提交': { v: 'ff12122', at: 700 } },
        fx: [{ type: 'burst', obj: 'k2', at: 700, color: C.ok }] },
      { say: '后面两次提交里 1464 都还是 1 次，不算。', set: merge(scan(3, 0, false), scan(4, 700, false)),
        eq: [{ s: '0e606e9：1 → 1（不变）', at: 500 }, { s: '4140218：1 → 1（不变）', at: 1200 }] },
      { say: '结果只有一行。配合 git show 就能读到那条写清了 Problem / Solution / Implications 的信息。',
        log: { s: 'ff12122 Use 1464-byte chunks so packets fit PPPoE links', at: 300, cls: 'ok' },
        set: { res: merge(show(300), { text: 'ff12122 Use 1464-byte chunks so packets fit PPPoE links', y: { from: 470, to: 440, delay: 300, dur: 500, ease: 'out' } }), lens: hide(200) },
        fx: [{ type: 'ripple', obj: 'res', at: 700, color: C.ok }] },
      { say: "换一个：RETRY_TIMEOUT = 30 是哪次引入的？命中 7809933，可信息只有 fix。工具找得到提交，找不回“为什么”。", hl: [2],
        data: { '要找的字符串': "'RETRY_TIMEOUT = 30'", '命中的提交': { v: '7809933（fix）', at: 900 } },
        log: ["$ git log -S'RETRY_TIMEOUT = 30' --format='%h %s'", { s: '7809933 fix', at: 900, cls: 'err' }],
        set: (function () {
          var s = { res: { text: { to: '7809933 fix', delay: 900 }, fill: { to: C.badW, delay: 900, dur: 300 }, stroke: { to: C.bad, delay: 900, dur: 300 } } };
          CM.forEach(function (c, i) { s['k' + i] = { opacity: { to: i === 1 ? 1 : 0.45, dur: 300 }, fill: { to: i === 1 ? C.badW : C.bg2, dur: 300 }, stroke: { to: i === 1 ? C.bad : C.line, dur: 300 }, color: { to: i === 1 ? C.bad : C.fg2, dur: 300 } }; s['n' + i] = hide(0, 200); });
          return s;
        })(),
        fx: [{ type: 'shake', obj: 'k1', at: 1000 }] }
    ]
  };

  /* ---------- 场景 4：git add -p 拆分提交 ---------- */
  var sceneAddP = {
    name: 'git add -p', desc: '一次提交只讲一件事。git add -p 把改动切成块（hunk），逐块问你要不要暂存。一份混杂的改动，就能拆成几个独立的提交。',
    code: { lang: 'sh', title: '依次输入（stats.py 示例，本机真跑）', src: "git diff --stat\nprintf 'n\\ny\\n' | git add -p\ngit diff --cached --stat\ngit commit -m 'Add mode()'\ngit add -A\ngit commit -m 'Format mean() with spaces around /'\ngit log --oneline" },
    dataTitle: '三个区域里有什么',
    data: { '工作区': '2 块改动', '暂存区': '空', '新提交': '0' },
    bg: function (d) {
      d.text(430, 26, '工作区 → 暂存区（index）→ 提交历史', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(20, 52, 300, 420, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.text(34, 72, '工作区的改动（git diff）', { size: 12, color: C.fg3, weight: 600 });
      d.rect(360, 170, 170, 160, { fill: 'none', stroke: C.teal, rx: 12, dash: '6 4', sw: 1.6 });
      d.text(445, 156, '暂存区', { anchor: 'middle', size: 12.5, color: C.teal, weight: 700 });
      d.text(700, 72, '提交历史', { anchor: 'middle', size: 12.5, color: C.fg3, weight: 700 });
      d.line(700, 90, 700, 470, { stroke: C.line, sw: 1.4, dash: '3 4' });
    },
    objects: {
      h1: B(170, 150, 270, 110, '块 1：mean() 里 / 两边加空格', { fill: C.warnW, stroke: C.warn, size: 12.5 }),
      h1c: T(48, 182, '-  return sum(xs)/len(xs)', { mono: true, size: 11.5, color: C.bad }),
      h1d: T(48, 202, '+  return sum(xs) / len(xs)', { mono: true, size: 11.5, color: C.ok }),
      h2: B(170, 330, 270, 110, '块 2：新增 mode()', { fill: C.dataW, stroke: C.data, size: 12.5 }),
      h2c: T(48, 362, '+def mode(xs):', { mono: true, size: 11.5, color: C.ok }),
      h2d: T(48, 382, '+    return max(set(xs), key=xs.count)', { mono: true, size: 11.5, color: C.ok }),
      ask: B(170, 500, 290, 34, '', { mono: true, size: 12.5, fill: C.bg, stroke: C.info, color: C.info, opacity: 0 }),
      c0: B(700, 430, 230, 40, 'b9513e2 Add stats helpers', { mono: true, size: 12, fill: C.bg2, stroke: C.line, color: C.fg2 }),
      c1: B(700, 370, 230, 40, '3cd2a59 Add mode()', { mono: true, size: 12, fill: C.dataW, stroke: C.data, opacity: 0 }),
      c2: B(700, 310, 260, 40, 'eceb177 Format mean() …', { mono: true, size: 12, fill: C.warnW, stroke: C.warn, opacity: 0 }),
      blob: B(700, 200, 250, 60, '一个巨大的混合提交 ×', { fill: C.badW, stroke: C.bad, color: C.bad, opacity: 0, s: 0.8 })
    },
    steps: [
      { say: '同一个文件里改了两件不相关的事。块 1 只是格式，在 / 两边加了空格。块 2 是新功能 mode()。', hl: [1],
        log: ['$ git diff --stat', { s: ' stats.py | 6 +++++-', at: 300 }, { s: ' 1 file changed, 5 insertions(+), 1 deletion(-)', at: 450 }],
        fx: [{ type: 'pulse', obj: 'h1', at: 300, color: C.warn }, { type: 'pulse', obj: 'h2', at: 700, color: C.data }] },
      { say: 'git add -p 逐块询问。第 1 块是格式化改动，这次不要它，答 n。', hl: [2],
        log: [{ s: '@@ -1,5 +1,5 @@', at: 200 }, { s: '(1/2) Stage this hunk [y,n,q,a,d,k,K,j,J,g,/,e,p,P,?]? n', at: 700 }],
        set: { ask: merge(show(), { text: '(1/2) Stage this hunk? n', y: { to: 234, dur: 0 } }), h1: { opacity: { to: 0.55, delay: 900, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'h1', at: 900 }] },
      { say: '第 2 块是新功能，答 y。它被放进了暂存区。',
        log: [{ s: '@@ -13,3 +13,7 @@ def median(xs):', at: 200 }, { s: '(2/2) Stage this hunk [y,n,q,a,d,K,J,g,/,e,p,P,?]? y', at: 700 }],
        data: { '工作区': { v: '块 1（未暂存）', at: 900 }, '暂存区': { v: '块 2', at: 1300 } },
        set: { ask: { text: '(2/2) Stage this hunk? y', y: { to: 406, dur: 400 } },
          h2: { x: { to: 445, delay: 800, dur: 700, ease: 'inOut' }, y: { to: 250, delay: 800, dur: 700, ease: 'inOut' }, w: { to: 160, delay: 800, dur: 700 }, h: { to: 90, delay: 800, dur: 700 }, text: { to: '块 2：mode()', delay: 800 } },
          h2c: hide(700, 200), h2d: hide(700, 200) },
        fx: [{ type: 'ripple', x: 445, y: 250, at: 1500, color: C.teal }] },
      { say: 'git diff --cached 看暂存区：只有 4 行新增。这次提交只包含功能。', hl: [3],
        log: ['$ git diff --cached --stat', { s: ' stats.py | 4 ++++', at: 300 }, { s: ' 1 file changed, 4 insertions(+)', at: 450 }],
        set: { ask: hide() }, fx: [{ type: 'pulse', obj: 'h2', at: 300, color: C.teal }] },
      { say: "git commit：暂存区变成一个新提交 3cd2a59 Add mode()。", hl: [4],
        data: { '暂存区': { v: '空', at: 800 }, '新提交': { v: '1', at: 900 } },
        set: { h2: { x: { to: 700, dur: 700, ease: 'inOut' }, y: { to: 370, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 650, dur: 200 } }, c1: show(650, 250) },
        fx: [{ type: 'ripple', obj: 'c1', at: 800, color: C.data }] },
      { say: '剩下的格式化改动，用 git add -A 也放进暂存区。它会成为第 2 个独立提交。', hl: [5],
        data: { '工作区': { v: '干净', at: 700 }, '暂存区': { v: '块 1', at: 700 } },
        set: { h1: { x: { to: 445, dur: 600, ease: 'inOut' }, y: { to: 250, dur: 600, ease: 'inOut' }, w: { to: 160, dur: 600 }, h: { to: 90, dur: 600 }, text: '块 1：格式', opacity: { to: 1, dur: 200 } },
          h1c: hide(0, 200), h1d: hide(0, 200) },
        fx: [{ type: 'ripple', x: 445, y: 250, at: 700, color: C.teal }] },
      { say: '于是有了两个独立的提交。评审者可以分开看。维护者也可以只收其中一个（视频 16:45）。', hl: [6, 7],
        data: { '暂存区': { v: '空', at: 800 }, '新提交': { v: '2', at: 900 } },
        log: ['$ git log --oneline', { s: 'eceb177 Format mean() with spaces around /', at: 1000 }, { s: '3cd2a59 Add mode()', at: 1100 }, { s: 'b9513e2 Add stats helpers', at: 1200 }],
        set: { h1: { x: { to: 700, dur: 700, ease: 'inOut' }, y: { to: 310, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 650, dur: 200 } }, c2: show(650, 250) },
        fx: [{ type: 'ripple', obj: 'c2', at: 800, color: C.warn }] },
      { say: '反例：一周不提交，最后 git add . 一把梭。格式化和语义改动搅成一个巨大的 diff。没人能有效评审（视频 14:50）。',
        set: { blob: merge(show(), { s: { to: 1, dur: 500, ease: 'back' } }) }, fx: [{ type: 'shake', obj: 'blob', at: 600 }] }
    ]
  };

  /* ---------- 场景 5：git bisect ---------- */
  var NB = 16, BX0 = 70, BDX = 48, BYC = 250;
  function bisectObjs() {
    var o = {};
    for (var i = 1; i <= NB; i++) {
      o['b' + i] = { type: 'circle', x: BX0 + (i - 1) * BDX, y: BYC, r: 17, fill: C.bg2, stroke: C.line, sw: 2, text: String(i), color: C.fg2, size: 12.5 };
    }
    o.range = B((px(2) + px(NB)) / 2, BYC, px(NB) - px(2) + 44, 56, '', { fill: 'none', stroke: C.warn, sw: 2, rx: 14 });
    o.ptr = T(BX0, BYC - 52, '▼', { anchor: 'middle', size: 20, color: C.info, opacity: 0, trail: { n: 4, gap: 40 } });
    o.ptrL = T(BX0, BYC - 76, '', { anchor: 'middle', size: 12.5, weight: 700, color: C.info, opacity: 0 });
    o.found = B(430, 430, 520, 50, '', { mono: true, size: 13, fill: C.badW, stroke: C.bad, opacity: 0 });
    return o;
  }
  function px(i) { return BX0 + (i - 1) * BDX; }
  function test(i, good, lo, hi) {
    var col = good ? C.ok : C.bad, colW = good ? C.okW : C.badW, s = {};
    s.ptr = { opacity: { to: 1, dur: 200 }, x: { to: px(i), dur: 600, ease: 'inOut' } };
    s.ptrL = { opacity: { to: 1, dur: 200 }, x: { to: px(i), dur: 600, ease: 'inOut' }, text: { to: '测试 #' + i, delay: 0 } };
    s['b' + i] = { fill: { to: colW, delay: 900, dur: 300 }, stroke: { to: col, delay: 900, dur: 300 }, color: { to: col, delay: 900, dur: 300 } };
    s.range = { x: { to: (px(lo) + px(hi)) / 2, delay: 1300, dur: 600, ease: 'inOut' }, w: { to: px(hi) - px(lo) + 44, delay: 1300, dur: 600, ease: 'inOut' } };
    for (var k = 2; k <= NB; k++) if (k < lo || k > hi) if (k !== i) s['b' + k] = s['b' + k] || { opacity: { to: 0.35, delay: 1300, dur: 400 } };
    return s;
  }
  var sceneBisect = {
    name: 'git bisect', desc: '告诉它哪个版本好、哪个版本坏。git bisect 用二分查找，定位引入 bug 的那次提交。配上测试脚本，可以全自动。',
    code: { lang: 'sh', title: '依次输入（16 个提交的示例仓库，本机真跑）', src: "cat test.sh\n#   python -c 'from calc import add; assert add(2, 2) == 4'\ngit bisect start HEAD <第 1 个提交>\ngit bisect run sh test.sh\ngit bisect reset" },
    dataTitle: '二分状态',
    data: { '已知 good': '#1', '已知 bad': '#16', '待查范围': '#2 – #16（15 个）', '已测试次数': 0 },
    bg: function (d) {
      d.text(430, 26, '在“好”和“坏”之间二分：每测一次，候选减半', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(BX0 - 20, BYC, BX0 + 15 * BDX + 20, BYC, { stroke: C.line, sw: 2 });
      d.text(BX0, BYC + 40, 'good', { anchor: 'middle', size: 11.5, color: C.ok, weight: 700 });
      d.text(px(NB), BYC + 40, 'bad', { anchor: 'middle', size: 11.5, color: C.bad, weight: 700 });
      d.text(BX0 - 20, BYC + 70, '旧 → 新（每个圆圈是一次提交，示意）', { size: 11.5, color: C.fg3 });
    },
    objects: bisectObjs,
    steps: [
      { say: '已知第 1 个提交正常，第 16 个有 bug。bug 是 add(2, 2) 不等于 4。中间有 15 个候选。哪个是“第一个坏提交”？', hl: [1, 2, 3],
        log: ['$ git bisect start HEAD <第 1 个提交>', { s: 'Bisecting: 7 revisions left to test after this (roughly 3 steps)', at: 600 }],
        set: { b1: { fill: { to: C.okW, dur: 300 }, stroke: { to: C.ok, dur: 300 }, color: { to: C.ok, dur: 300 } }, b16: { fill: { to: C.badW, dur: 300 }, stroke: { to: C.bad, dur: 300 }, color: { to: C.bad, dur: 300 } } },
        eq: '候选 = #2…#16 共 15 个' },
      { say: '取中点 #8，运行测试 → 通过（good）。bug 一定在 #9–#16 之间。', hl: [4],
        log: [{ s: '[580a77c…] Release step 8', at: 300 }, { s: "running 'sh' 'test.sh'", at: 600 }, { s: 'Bisecting: 3 revisions left to test after this (roughly 2 steps)', at: 1300 }],
        data: { '已知 good': { v: '#8', at: 900 }, '待查范围': { v: '#9 – #16（8 个）', at: 1300 }, '已测试次数': { v: 1, at: 900 } },
        set: test(8, true, 9, 16), eq: { s: '测 #8 → good：15 → 8 个候选', at: 1000 } },
      { say: '中点 #12 → 测试失败（bad）：范围缩到 #9–#12。',
        log: [{ s: '[b1e9956…] Release step 12', at: 300 }, { s: "running 'sh' 'test.sh'", at: 500 }, { s: 'AssertionError', at: 900, cls: 'err' }, { s: 'Bisecting: 1 revision left to test after this (roughly 1 step)', at: 1300 }],
        data: { '已知 bad': { v: '#12', at: 900 }, '待查范围': { v: '#9 – #12（4 个）', at: 1300 }, '已测试次数': { v: 2, at: 900 } },
        set: test(12, false, 9, 12), eq: { s: '测 #12 → bad：8 → 4 个候选', at: 1000 }, fx: [{ type: 'shake', obj: 'b12', at: 950 }] },
      { say: '中点 #10 → good：只剩 #11、#12。',
        log: [{ s: '[18f924a…] Release step 10', at: 300 }, { s: "running 'sh' 'test.sh'", at: 500 }, { s: 'Bisecting: 0 revisions left to test after this (roughly 0 steps)', at: 1300 }],
        data: { '已知 good': { v: '#10', at: 900 }, '待查范围': { v: '#11 – #12（2 个）', at: 1300 }, '已测试次数': { v: 3, at: 900 } },
        set: test(10, true, 11, 12), eq: { s: '测 #10 → good：4 → 2 个候选', at: 1000 } },
      { say: '测 #11 → bad。#10 好、#11 坏，所以 #11 就是第一个坏提交。',
        log: [{ s: '[e532b6c…] Release step 11', at: 300 }, { s: 'AssertionError', at: 900, cls: 'err' }, { s: "e532b6c1a67c456289b442b4bb8255b98726cd33 is the first 'bad' commit", at: 1300, cls: 'ok' }],
        data: { '已知 bad': { v: '#11', at: 900 }, '待查范围': { v: '#11', at: 1300 }, '已测试次数': { v: 4, at: 900 } },
        set: merge(test(11, false, 11, 11), { b12: { opacity: { to: 0.35, delay: 1300, dur: 400 } } }),
        eq: [{ s: '测 #11 → bad：2 → 1，找到', at: 1000, cls: 'ok' }, { s: '共测 4 次。15 个候选最多需要 ⌈log₂(15+1)⌉ = 4 次', at: 1600 }],
        fx: [{ type: 'burst', obj: 'b11', at: 1300, color: C.bad }] },
      { say: 'git bisect run 把好坏交给脚本判断。退出码 0 算 good，非 0 算 bad。上面 4 轮是全自动跑完的（视频 20:19）。',
        eq: { s: '对比逐个检查：最坏要测 15 次', at: 400 }, fx: [{ type: 'pulse', obj: 'range', at: 300, color: C.warn }] },
      { say: '定位到了 e532b6c。可它的信息只是 “Release step 11”，还同时改了两个文件。提交要小而专注，信息要写清 why。这样 bisect 的结果才能直接用（视频 19:40）。', hl: [5],
        log: [{ s: '    Release step 11', at: 300 }, { s: ' calc.py     | 2 +-', at: 500 }, { s: ' version.txt | 2 +-', at: 600 }],
        set: { found: merge(show(300), { text: 'e532b6c  “Release step 11”：为什么改 calc.py？', y: { from: 460, to: 430, delay: 300, dur: 500, ease: 'out' } }), ptr: hide(), ptrL: hide() },
        fx: [{ type: 'shake', obj: 'found', at: 900 }] }
    ]
  };

  var REPO = '示例仓库由 lab08 练习 2 的 make_repo.sh 生成。身份和时间固定，哈希可复现。控制台输出是本机 Git 2.55 真跑的。仓库背后的故事是示意，比如网关只缓存 16 个包。';
  var LECT = { t: '讲义 beyond-code', u: 'https://missing.csail.mit.edu/2026/beyond-code/' };
  VZ.register({
    id: 'ch08-msg', title: '同一个 diff，两种提交信息',
    sources: [{ t: '视频 8:34 提交信息', u: 'https://youtu.be/2DOEATfXT8k?t=514' }, { t: '视频 9:43 四个问题', u: 'https://youtu.be/2DOEATfXT8k?t=583' }, LECT],
    note: REPO, scenes: [sceneWhy]
  });
  VZ.register({
    id: 'ch08-blame', title: 'git blame 与 git log -S：从一行代码追到它的“为什么”',
    sources: [{ t: '视频 9:09 git blame', u: 'https://youtu.be/2DOEATfXT8k?t=549' }, { t: 'git-blame 文档', u: 'https://git-scm.com/docs/git-blame' }, { t: 'git-log 文档（-S）', u: 'https://git-scm.com/docs/git-log' }],
    note: REPO + ' git log -S 本身不在视频里，属补充。', scenes: [sceneBlame, scenePick]
  });
  VZ.register({
    id: 'ch08-addp', title: 'git add -p：把一份混杂的改动拆成独立提交',
    sources: [{ t: '视频 14:50 拆分提交', u: 'https://youtu.be/2DOEATfXT8k?t=890' }, { t: '视频 16:45 拆成多个 PR', u: 'https://youtu.be/2DOEATfXT8k?t=1005' }, { t: 'git-add 文档（--patch）', u: 'https://git-scm.com/docs/git-add' }],
    note: '控制台输出是在本机 Git 2.55 沙箱仓库里真跑的。stats.py 和两处改动是示意。', scenes: [sceneAddP]
  });
  VZ.register({
    id: 'ch08-bisect', title: 'git bisect：二分查找引入 bug 的提交',
    sources: [{ t: '视频 19:05 git bisect', u: 'https://youtu.be/2DOEATfXT8k?t=1145' }, { t: '视频 20:19 bisect run', u: 'https://youtu.be/2DOEATfXT8k?t=1219' }, { t: 'git-bisect 文档', u: 'https://git-scm.com/docs/git-bisect' }],
    note: '控制台输出是在本机 Git 2.55 沙箱仓库里真跑的。长哈希省略了中段，Traceback 也省略了。16 个 “Release step” 提交是示意。', scenes: [sceneBisect]
  });
})();
