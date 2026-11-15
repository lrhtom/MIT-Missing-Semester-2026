/* ch01 · 管道、重定向与 bash 控制流 —— 数据怎么流动
 * 依据：Lecture 1 视频 34:32–35:06（uniq 只去相邻重复）、53:27–58:43（SSH 日志流水线）、
 *       58:43–1:00:29（| > >> <）、1:01:02–1:06:16（if / while / for / test）、1:08:44–1:09:53（flaky test 脚本）；讲义 course-shell.md。
 * 实测：所有控制台输出均在本机 Git Bash 5.3 中真跑得到；ssh.log 是 12 行示意日志（IP 用文档保留段），
 *       流水线每一级的输出都是对它真跑的结果。脚本场景里测试第 4 轮失败、PID、时间戳为示意。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function proc(x, y, text, w, extra) {
    return merge({ type: 'box', x: x, y: y, w: w || 128, h: 46, rx: 11, fill: C.infoW, stroke: C.info, sw: 1.9, text: text, color: C.fg, mono: true, size: 14, weight: 700 }, extra || {});
  }
  function term(x, y, w, h) { return { type: 'box', x: x, y: y, w: w || 150, h: h || 54, rx: 10, fill: '#0f1318', stroke: '#2b3440', sw: 1.4, text: '终端', color: '#9be09b', size: 13, weight: 700 }; }
  function pipe(d, col, op) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.4, dash: 0, arrow: 'data' }, op || {}); }

  /* ---------- 场景 1：管道 | 的基本形状 ---------- */
  var scenePipe = {
    name: '管道 |', desc: '管道把左边的 stdout 直接接到右边的 stdin。中间不写磁盘。',
    code: { lang: 'sh', title: 'd2 的内容：4 4 4 3 4（每行一个）', src: 'uniq d2\nsort d2 | uniq -c' },
    dataTitle: '每一段的数据',
    data: { 'd2 文件': '4 4 4 3 4', 'sort 输出': '无', '终端看到': '无' },
    bg: function (d) {
      d.text(430, 30, '程序 A 的 stdout  ──|──▶  程序 B 的 stdin', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(36, 222, 104, 56, { fill: C.tealW, stroke: C.teal, sw: 1.6, rx: 10 });
      d.text(88, 241, 'd2', { anchor: 'middle', size: 15, weight: 750, mono: true, color: C.teal });
      d.text(88, 262, '4 4 4 3 4', { anchor: 'middle', size: 11.5, mono: true, color: C.fg2 });
    },
    objects: {
      f1: pipe('M140,250 L232,250', C.teal),
      p1: proc(300, 250, 'uniq', 130),
      direct: pipe('M365,250 C520,250 560,150 690,150', C.data),
      p12: pipe('M365,250 L472,250', C.data),
      p2: proc(540, 250, 'uniq -c', 130, { opacity: 0, s: 0.85 }),
      p2t: pipe('M605,250 C650,250 650,150 690,150', C.data),
      t: term(760, 150),
      lblOut: { type: 'text', x: 386, y: 230, text: 'stdout', size: 11, mono: true, color: C.data, opacity: 0 },
      lblIn: { type: 'text', x: 454, y: 230, text: 'stdin', size: 11, mono: true, color: C.data, opacity: 0 },
      bar: { type: 'text', x: 420, y: 274, text: '|', size: 26, weight: 800, mono: true, color: C.data, opacity: 0 },
      res: { type: 'text', x: 760, y: 214, text: '', size: 14, mono: true, weight: 700, color: C.fg, opacity: 0 }
    },
    steps: [
      { say: '先单独运行 uniq d2。uniq 读文件，把结果写到 stdout。stdout 默认连着终端。', hl: [1], log: '$ uniq d2',
        set: { f1: { dash: { to: 1, dur: 600 } } },
        fx: [{ type: 'stream', path: 'f1', at: 500, n: 5, dur: 1300, color: C.teal, labels: ['4', '4', '4', '3', '4'] }, { type: 'pulse', obj: 'p1', at: 1700, color: C.info }] },
      { say: 'uniq 只合并相邻的重复行。前三个 4 合成一个。最后那个 4 前面隔着 3，所以保留。本机实测输出 4 3 4。',
        log: [{ s: '4', at: 900 }, { s: '3', at: 1050 }, { s: '4', at: 1200 }], data: { '终端看到': { v: '4 3 4', at: 1200 } },
        set: { direct: { dash: { to: 1, dur: 700 } }, res: { text: '4 3 4', opacity: { to: 1, delay: 1200, dur: 300 } } },
        fx: [{ type: 'stream', path: 'direct', at: 400, n: 3, dur: 1100, color: C.data, labels: ['4', '3', '4'] }, { type: 'ripple', obj: 't', at: 1350, color: C.data }] },
      { say: '想数每个值出现几次？先 sort 让相同的行挨在一起。第一个程序换成 sort，右边接上 uniq -c。', hl: [2], log: '$ sort d2 | uniq -c',
        data: { '终端看到': '无' },
        set: { direct: { dash: { to: 0, dur: 500 } }, res: { opacity: { to: 0, dur: 300 } }, p1: { text: 'sort' },
          p2: { opacity: { to: 1, delay: 300, dur: 300 }, s: { to: 1, delay: 300, dur: 500, ease: 'back' } } },
        fx: [{ type: 'stream', path: 'f1', at: 700, n: 5, dur: 1300, color: C.teal, labels: ['4', '4', '4', '3', '4'] }] },
      { say: 'sort 输出 3 4 4 4 4。它不写终端，而是通过管道 | 流进 uniq -c 的 stdin。',
        data: { 'sort 输出': { v: '3 4 4 4 4', at: 900 } },
        set: { p12: { dash: { to: 1, dur: 500 } }, bar: { opacity: { to: 1, dur: 300 } } },
        fx: [{ type: 'stream', path: 'p12', at: 400, n: 5, dur: 1200, color: C.data, labels: ['3', '4', '4', '4', '4'] }] },
      { say: 'uniq -c 在每组重复行前面写上次数。这里是 1 个 3，4 个 4。',
        log: [{ s: '      1 3', at: 900 }, { s: '      4 4', at: 1100 }], data: { '终端看到': { v: '1 3 / 4 4', at: 1100 } },
        set: { p2t: { dash: { to: 1, dur: 600 } }, res: { text: '1 3 · 4 4', opacity: { to: 1, delay: 1100, dur: 300 } } },
        fx: [{ type: 'stream', path: 'p2t', at: 400, n: 2, dur: 1000, color: C.data, labels: ['1 3', '4 4'] }, { type: 'ripple', obj: 't', at: 1200, color: C.ok }] },
      { say: '这就是 | 的全部：左边的 stdout 接到右边的 stdin。大多数程序没拿到文件参数，就去读 stdin。所以它们能像积木一样拼。',
        set: { lblOut: { opacity: { to: 1, dur: 300 } }, lblIn: { opacity: { to: 1, delay: 200, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'p1', at: 200, color: C.data }, { type: 'pulse', obj: 'p2', at: 500, color: C.data }, { type: 'stream', path: 'p12', at: 300, n: 4, dur: 1100, color: C.data }] }
    ]
  };

  /* ---------- 场景 2：SSH 日志流水线（讲义里的大命令，逐级拆开） ---------- */
  var R1 = 132, R2 = 330;
  var ST = [
    ['src', 70, R1, 'ssh.log', C.teal], ['grep', 222, R1, 'grep'], ['sed', 374, R1, 'sed -E'], ['sort', 526, R1, 'sort'], ['uniq', 690, R1, 'uniq -c'],
    ['sortn', 690, R2, 'sort -nk1,1'], ['tail', 526, R2, 'tail -n3'], ['awk', 374, R2, 'awk $2'], ['paste', 222, R2, 'paste -sd,'], ['term', 70, R2, '终端']
  ];
  var OUT = {
    src: '12 行日志', grep: '10 行', sed: 'admin root ubuntu …', sort: 'admin admin oracle …', uniq: '2 admin · 1 oracle …',
    sortn: '1 oracle … 4 root', tail: '2 admin · 2 ubuntu · 4 root', awk: 'admin ubuntu root', paste: 'admin,ubuntu,root', term: ''
  };
  function sshObjs() {
    var o = {};
    ST.forEach(function (s, i) {
      var isT = s[0] === 'term', isS = s[0] === 'src';
      o[s[0]] = isT ? merge(term(s[1], s[2], 120, 46), { text: '终端' }) :
        merge(proc(s[1], s[2], s[3], 124, isS ? { fill: C.tealW, stroke: C.teal } : {}), { opacity: isS ? 1 : 0.35 });
      o['o_' + s[0]] = { type: 'text', x: s[1], y: s[2] + (s[2] === R1 ? 42 : 42), text: OUT[s[0]], size: 11.5, mono: true, color: C.fg2, opacity: 0 };
      if (i < ST.length - 1) {
        var a = s, b = ST[i + 1], d;
        if (a[2] === b[2]) d = 'M' + (a[1] + (b[1] > a[1] ? 62 : -62)) + ',' + a[2] + ' L' + (b[1] + (b[1] > a[1] ? -64 : 64)) + ',' + b[2];
        else d = 'M' + a[1] + ',' + (a[2] + 24) + ' C' + (a[1] + 110) + ',' + (a[2] + 90) + ' ' + (b[1] + 110) + ',' + (b[2] - 90) + ' ' + b[1] + ',' + (b[2] - 25);
        o['q' + i] = pipe(d, C.data, { sw: 2.2 });
      }
    });
    o.drop1 = { type: 'box', x: 222, y: R1, w: 112, h: 22, rx: 5, fill: C.badW, stroke: C.bad, sw: 1.2, text: 'Accepted… jon', size: 10.5, mono: true, color: C.bad, opacity: 0 };
    o.drop2 = { type: 'box', x: 222, y: R1, w: 112, h: 22, rx: 5, fill: C.badW, stroke: C.bad, sw: 1.2, text: 'Connection closed', size: 10.5, mono: true, color: C.bad, opacity: 0 };
    o.final = { type: 'text', x: 70, y: R2 + 44, text: '', size: 13, mono: true, weight: 800, color: C.ok, opacity: 0 };
    return o;
  }
  function on(id, at) { var s = {}; s[id] = { opacity: { to: 1, delay: at || 0, dur: 300 }, stroke: { to: C.info, delay: at || 0, dur: 300 } }; return s; }
  function out(id, at) { var s = {}; s['o_' + id] = { opacity: { to: 1, delay: at || 0, dur: 400 }, y: { from: (id === 'sortn' || id === 'tail' || id === 'awk' || id === 'paste') ? R2 + 30 : R1 + 30, to: ((id === 'sortn' || id === 'tail' || id === 'awk' || id === 'paste') ? R2 : R1) + 42, delay: at || 0, dur: 400, ease: 'out' } }; return s; }
  var SED_OUT = ['admin', 'root', 'ubuntu', 'root', 'test', 'root', 'admin', 'ubuntu', 'oracle', 'root'];
  var SORTED = ['admin', 'admin', 'oracle', 'root', 'root', 'root', 'root', 'test', 'ubuntu', 'ubuntu'];
  var UNIQ = ['2 admin', '1 oracle', '4 root', '1 test', '2 ubuntu'];
  var SORTN = ['1 oracle', '1 test', '2 admin', '2 ubuntu', '4 root'];
  var sceneSsh = {
    name: 'SSH 日志流水线', desc: '这是讲义里那条一行命令。它从 SSH 日志里找出被试最多的用户名。拆开看，每一级只做一件小事。',
    code: { lang: 'sh', title: '本机实测版。讲师原版的第一段是 ssh myserver \'journalctl … | grep …\'',
      src: "cat ssh.log \\\n  | grep \"Disconnected from\" \\\n  | sed -E 's/.*Disconnected from .* user (.*) [^ ]+ port.*/\\1/' \\\n  | sort \\\n  | uniq -c \\\n  | sort -nk1,1 \\\n  | tail -n3 \\\n  | awk '{print $2}' \\\n  | paste -sd," },
    dataTitle: '当前这一级',
    data: { '阶段': '无', '输入行数': '无', '输出行数': '无' },
    bg: function (d) {
      d.text(430, 26, '数据从左上流到左下：每一级的 stdout 就是下一级的 stdin', { anchor: 'middle', size: 13.5, weight: 700, color: C.fg2 });
      d.rect(16, 452, 828, 92, { fill: C.bg2, stroke: C.line, rx: 10 });
      d.text(30, 470, 'ssh.log 一行长这样（示意数据）：', { size: 11.5, color: C.fg3, weight: 600 });
      d.text(30, 494, 'Jan 11 03:12:45 srv sshd[811]: Disconnected from invalid user admin 203.0.113.5 port 52211 [preauth]', { size: 11.2, mono: true, color: C.fg2 });
      d.text(30, 520, 'sed 的正则 ……user (.*) [^ ]+ port.*  →  \\1 = 括号捕获到的用户名 admin', { size: 11.5, mono: true, color: C.warn });
    },
    objects: sshObjs,
    steps: [
      { say: '源头是 12 行 sshd 日志，内容是示意。讲师原版先 ssh 登录服务器。再在那边用 journalctl 取上次开机期间的日志。', hl: [1],
        log: [{ s: '# cat ssh.log → 12 行', cls: 'dim' }], data: { '阶段': 'cat ssh.log', '输入行数': '无', '输出行数': 12 },
        set: out('src', 200), fx: [{ type: 'pulse', obj: 'src', at: 200, color: C.teal }] },
      { say: 'grep "Disconnected from"：只留下包含这串字的行。2 行（成功登录、连接关闭）被丢掉。', hl: [2],
        log: [{ s: '# grep → 10 行', cls: 'dim', at: 1400 }], data: { '阶段': 'grep', '输入行数': 12, '输出行数': { v: 10, at: 1400 } },
        set: merge(on('grep'), out('grep', 1400), { q0: { dash: { to: 1, dur: 500 } },
          drop1: { opacity: { from: 0, to: 1, delay: 900, dur: 200 }, y: { from: R1, to: R1 + 120, delay: 1000, dur: 900, ease: 'in' }, x: { from: 222, to: 190, delay: 1000, dur: 900 } },
          drop2: { opacity: { from: 0, to: 1, delay: 1100, dur: 200 }, y: { from: R1, to: R1 + 150, delay: 1200, dur: 900, ease: 'in' }, x: { from: 222, to: 260, delay: 1200, dur: 900 } } }),
        fx: [{ type: 'stream', path: 'q0', at: 300, n: 8, dur: 1100, color: C.teal }] },
      { say: 'sed -E 把整行换成括号里抓到的那段，也就是 \\1。每行只剩下被试的用户名。', hl: [3],
        log: [{ s: '# sed → ' + SED_OUT.join(' '), cls: 'dim', at: 1300 }], data: { '阶段': 'sed -E', '输入行数': 10, '输出行数': { v: 10, at: 1300 } },
        set: merge(on('sed'), out('sed', 1300), { q1: { dash: { to: 1, dur: 500 } }, drop1: { opacity: { to: 0, dur: 300 } }, drop2: { opacity: { to: 0, dur: 300 } } }),
        fx: [{ type: 'stream', path: 'q1', at: 300, n: 6, dur: 1200, color: C.data, labels: ['line', 'line', 'line', 'line', 'line', '…'] }] },
      { say: 'sort 按字典序排序，同名的排到一起。这是给下一步 uniq 做准备。', hl: [4],
        log: [{ s: '# sort → ' + SORTED.join(' '), cls: 'dim', at: 1300 }], data: { '阶段': 'sort', '输入行数': 10, '输出行数': { v: 10, at: 1300 } },
        set: merge(on('sort'), out('sort', 1300), { q2: { dash: { to: 1, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'q2', at: 300, n: 6, dur: 1200, color: C.data, labels: SED_OUT.slice(0, 6) }] },
      { say: 'uniq -c 把相邻的重复行合成一行，前面写上出现次数。', hl: [5],
        log: [{ s: '# uniq -c → ' + UNIQ.join(' | '), cls: 'dim', at: 1300 }], data: { '阶段': 'uniq -c', '输入行数': 10, '输出行数': { v: 5, at: 1300 } },
        set: merge(on('uniq'), out('uniq', 1300), { q3: { dash: { to: 1, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'q3', at: 300, n: 6, dur: 1200, color: C.data, labels: SORTED.slice(0, 6) }] },
      { say: 'sort -nk1,1 只看第 1 列，按数值排。次数最多的排到最后。', hl: [6],
        log: [{ s: '# sort -nk1,1 → ' + SORTN.join(' | '), cls: 'dim', at: 1400 }], data: { '阶段': 'sort -nk1,1', '输入行数': 5, '输出行数': { v: 5, at: 1400 } },
        set: merge(on('sortn'), out('sortn', 1400), { q4: { dash: { to: 1, dur: 600 } } }),
        fx: [{ type: 'stream', path: 'q4', at: 300, n: 5, dur: 1300, color: C.data, labels: UNIQ }] },
      { say: 'tail -n3 只要最后 3 行，也就是次数最多的 3 个。讲义原版是 tail -n10，取前 10 名。样例只有 5 个用户，改成 3 才看得出效果。', hl: [7],
        log: [{ s: '# tail -n3 → 2 admin | 2 ubuntu | 4 root', cls: 'dim', at: 1400 }], data: { '阶段': 'tail -n3', '输入行数': 5, '输出行数': { v: 3, at: 1400 } },
        set: merge(on('tail'), out('tail', 1400), { q5: { dash: { to: 1, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'q5', at: 300, n: 5, dur: 1300, color: C.data, labels: SORTN }] },
      { say: "awk '{print $2}'：按空白切列，只打印第 2 列——去掉次数，只留用户名。", hl: [8],
        log: [{ s: '# awk → admin ubuntu root', cls: 'dim', at: 1300 }], data: { '阶段': 'awk', '输入行数': 3, '输出行数': { v: 3, at: 1300 } },
        set: merge(on('awk'), out('awk', 1300), { q6: { dash: { to: 1, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'q6', at: 300, n: 3, dur: 1100, color: C.data, labels: ['2 admin', '2 ubuntu', '4 root'] }] },
      { say: 'paste -sd, 里，-s 把所有行串成一行。-d, 表示用逗号隔开。', hl: [9],
        log: [{ s: '# paste -sd, → admin,ubuntu,root', cls: 'dim', at: 1300 }], data: { '阶段': 'paste -sd,', '输入行数': 3, '输出行数': { v: 1, at: 1300 } },
        set: merge(on('paste'), out('paste', 1300), { q7: { dash: { to: 1, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'q7', at: 300, n: 3, dur: 1100, color: C.data, labels: ['admin', 'ubuntu', 'root'] }] },
      { say: '终端上出现最终结果。被试最多的 3 个用户名，用逗号隔开。整条命令一次跑完。',
        log: [{ s: 'admin,ubuntu,root', at: 1000, cls: 'ok' }], data: { '阶段': '终端', '输出行数': 1 },
        set: { q8: { dash: { to: 1, dur: 500 } }, final: { text: 'admin,ubuntu,root', opacity: { to: 1, delay: 1000, dur: 400 } } },
        fx: [{ type: 'stream', path: 'q8', at: 300, n: 1, dur: 900, color: C.ok, labels: ['admin,ubuntu,root'] }, { type: 'ripple', obj: 'term', at: 1150, color: C.ok }, { type: 'burst', obj: 'term', at: 1200, color: C.ok }] },
      { say: '换回讲义的 tail -n10，样例里 5 个用户全部保留。讲师服务器上的真实结果是讲义里那一串。全是扫描器在乱试的用户名。',
        log: [{ s: '$ …同上，但 tail -n10', cls: 'in' }, { s: 'oracle,test,admin,ubuntu,root', at: 500 }, { s: '# 讲义中服务器的输出：', cls: 'dim', at: 900 }, { s: 'postgres,mysql,oracle,dell,ubuntu,inspur,test,admin,user,root', at: 1200 }],
        set: { final: { text: 'oracle,test,admin,ubuntu,root', size: { to: 12, dur: 0 } }, o_tail: { text: '（-n10）5 行全留' } } }
    ]
  };

  /* ---------- 场景 3：重定向 > >> < 2> ---------- */
  var PX = 340, PY = 270;
  var sceneRedir = {
    name: '重定向', desc: '每个程序有三条标准流：0 stdin、1 stdout、2 stderr。重定向就是把这些“插头”改插到文件上。',
    code: { lang: 'sh', title: '依次输入', src: 'ls /nonexistent /tmp\nls /nonexistent /tmp > out.txt\nls /nonexistent /tmp > out.txt 2> err.txt\nls /nonexistent /tmp > all.txt 2>&1\ndate > date.txt; date >> date.txt\nsort < data' },
    dataTitle: '文件内容',
    data: { 'out.txt': '无', 'err.txt': '无', '$?': '无' },
    legend: [[C.data, 'stdout（1 号）'], [C.bad, 'stderr（2 号）'], [C.teal, '文件 / stdin 来源'], [C.info, '进程']],
    bg: function (d) {
      d.text(430, 28, '0 stdin · 1 stdout · 2 stderr —— 默认都接在终端上', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(PX - 118, PY - 28, '0', { anchor: 'middle', size: 12, mono: true, weight: 800, color: C.teal });
      d.text(PX + 118, PY - 48, '1', { anchor: 'middle', size: 12, mono: true, weight: 800, color: C.data });
      d.text(PX + 118, PY + 48, '2', { anchor: 'middle', size: 12, mono: true, weight: 800, color: C.bad });
    },
    objects: {
      p: proc(PX, PY, 'ls /nonexistent /tmp', 220, { h: 70, size: 13.5 }),
      s0: { type: 'circle', x: PX - 118, y: PY, r: 9, fill: C.tealW, stroke: C.teal, sw: 2 },
      s1: { type: 'circle', x: PX + 118, y: PY - 22, r: 9, fill: C.dataW, stroke: C.data, sw: 2 },
      s2: { type: 'circle', x: PX + 118, y: PY + 22, r: 9, fill: C.badW, stroke: C.bad, sw: 2 },
      t: term(760, 120, 160, 60),
      fOut: { type: 'box', x: 760, y: 280, w: 140, h: 50, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.6, text: 'out.txt', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      fErr: { type: 'box', x: 760, y: 410, w: 140, h: 50, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.6, text: 'err.txt', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      fIn: { type: 'box', x: 90, y: PY, w: 110, h: 50, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.6, text: 'data', mono: true, size: 14, weight: 700, color: C.fg, opacity: 0 },
      kb: { type: 'box', x: 90, y: 120, w: 110, h: 44, rx: 8, fill: C.bg, stroke: C.line, sw: 1.4, text: '⌨ 键盘', size: 13, weight: 700, color: C.fg2 },
      w0: pipe('M90,142 C90,210 150,270 ' + (PX - 128) + ',' + PY, C.teal, { dash: 1, sw: 1.8 }),
      w1t: pipe('M' + (PX + 127) + ',' + (PY - 22) + ' C560,' + (PY - 22) + ' 560,120 678,120', C.data, { dash: 1 }),
      w2t: pipe('M' + (PX + 127) + ',' + (PY + 22) + ' C590,' + (PY + 22) + ' 590,138 678,134', C.bad, { dash: 1 }),
      w1f: pipe('M' + (PX + 127) + ',' + (PY - 22) + ' C580,' + (PY - 22) + ' 600,280 688,280', C.data),
      w2f: pipe('M' + (PX + 127) + ',' + (PY + 22) + ' C580,' + (PY + 22) + ' 600,410 688,410', C.bad),
      w21: pipe('M' + (PX + 127) + ',' + (PY + 22) + ' C580,' + (PY + 22) + ' 610,292 688,290', C.bad),
      wIn: pipe('M145,' + PY + ' L' + (PX - 128) + ',' + PY, C.teal),
      cnt: { type: 'text', x: 760, y: 322, text: '', size: 12, mono: true, color: C.fg2, opacity: 0 }
    },
    steps: [
      { say: '默认接线是这样的：键盘接 0 号。1 号和 2 号都接到终端，所以正常输出和报错混在一起。', hl: [1],
        log: ['$ ls /nonexistent /tmp', { s: "ls: cannot access '/nonexistent': No such file or directory", at: 700, cls: 'err' }, { s: '/tmp:', at: 1100 }, { s: '…（/tmp 中的文件）', at: 1300, cls: 'dim' }],
        data: { '$?': { v: 2, at: 1300 } },
        fx: [{ type: 'stream', path: 'w2t', at: 200, n: 2, dur: 1000, color: C.bad, labels: ['ls: cannot access…'] }, { type: 'stream', path: 'w1t', at: 500, n: 3, dur: 1000, color: C.data, labels: ['/tmp:', '…'] }] },
      { say: '> out.txt：把 1 号改接到文件（覆盖写）。正常输出进了文件，终端上只剩错误信息。', hl: [2],
        log: ['$ ls /nonexistent /tmp > out.txt', { s: "ls: cannot access '/nonexistent': No such file or directory", at: 1300, cls: 'err' }],
        data: { 'out.txt': { v: '/tmp: …', at: 1500 } },
        set: { w1t: { dash: { to: 0, dur: 500 } }, fOut: { opacity: { to: 1, dur: 300 } }, w1f: { dash: { to: 1, delay: 400, dur: 600 } } },
        fx: [{ type: 'stream', path: 'w1f', at: 900, n: 3, dur: 1000, color: C.data, labels: ['/tmp:', '…'] }, { type: 'stream', path: 'w2t', at: 900, n: 1, dur: 900, color: C.bad }, { type: 'ripple', obj: 'fOut', at: 1800, color: C.data }] },
      { say: '再加 2> err.txt，2 号也改接到另一个文件。终端上什么都没了。本机实测 ls 的退出码是 2，表示出错。', hl: [3],
        log: ['$ ls /nonexistent /tmp > out.txt 2> err.txt', { s: '（终端无输出）', at: 1300, cls: 'dim' }],
        data: { 'err.txt': { v: "ls: cannot access '/nonexistent'…", at: 1500 }, '$?': { v: 2, at: 1500 } },
        set: { w2t: { dash: { to: 0, dur: 500 } }, fErr: { opacity: { to: 1, dur: 300 } }, w2f: { dash: { to: 1, delay: 400, dur: 600 } } },
        fx: [{ type: 'stream', path: 'w2f', at: 900, n: 2, dur: 1000, color: C.bad, labels: ['ls: cannot…'] }, { type: 'stream', path: 'w1f', at: 900, n: 3, dur: 1000, color: C.data }, { type: 'ripple', obj: 'fErr', at: 1800, color: C.bad }] },
      { say: '> all.txt 2>&1 先把 1 号接到 all.txt。再让 2 号照抄 1 号此刻的去向，两路就进了同一个文件。bash 也能简写成 &> all.txt。', hl: [4],
        log: ['$ ls /nonexistent /tmp > all.txt 2>&1', { s: '$ head -2 all.txt', at: 1600 }, { s: "ls: cannot access '/nonexistent': No such file or directory", at: 1800 }, { s: '/tmp:', at: 1900 }],
        data: { 'out.txt': '（改名为 all.txt，含两路输出）', 'err.txt': '无' },
        set: { fOut: { text: 'all.txt' }, w2f: { dash: { to: 0, dur: 500 } }, fErr: { opacity: { to: 0.25, dur: 400 } }, w21: { dash: { to: 1, delay: 400, dur: 700 } } },
        fx: [{ type: 'stream', path: 'w21', at: 1000, n: 2, dur: 1000, color: C.bad }, { type: 'stream', path: 'w1f', at: 1000, n: 3, dur: 1000, color: C.data }, { type: 'pulse', obj: 'fOut', at: 1900, color: C.warn }] },
      { say: '> 每次都清空重写，>> 是追加。date 先 > 再 >>，文件里就有 2 行。本机用 wc -l 实测过。', hl: [5],
        log: ['$ date > date.txt; date >> date.txt', { s: '$ wc -l date.txt', at: 1200 }, { s: '2 date.txt', at: 1500 }],
        set: { p: { text: 'date' }, w21: { dash: { to: 0, dur: 400 } }, fOut: { text: 'date.txt' }, cnt: { text: '1 行 → 2 行', opacity: { to: 1, delay: 1200, dur: 300 } } },
        fx: [{ type: 'stream', path: 'w1f', at: 300, n: 1, dur: 700, color: C.data, labels: ['>'] }, { type: 'stream', path: 'w1f', at: 1100, n: 1, dur: 700, color: C.warn, labels: ['>>'] }, { type: 'float', obj: 'fOut', at: 1700, text: '+1 行', color: C.warn }] },
      { say: '< data：反过来，把 0 号 stdin 从键盘改接到文件。sort 读到的就是文件内容（字典序：3 31 4）。', hl: [6],
        log: ['$ sort < data', { s: '3', at: 1500 }, { s: '31', at: 1600 }, { s: '4', at: 1700 }],
        set: { p: { text: 'sort' }, cnt: { opacity: { to: 0, dur: 300 } }, fOut: { opacity: { to: 0.25, dur: 300 } }, w1f: { dash: { to: 0, dur: 400 } },
          w0: { dash: { to: 0, dur: 400 } }, kb: { opacity: { to: 0.3, dur: 400 } }, fIn: { opacity: { to: 1, delay: 300, dur: 300 } }, wIn: { dash: { to: 1, delay: 500, dur: 500 } }, w1t: { dash: { to: 1, delay: 900, dur: 500 } } },
        fx: [{ type: 'stream', path: 'wIn', at: 800, n: 3, dur: 900, color: C.teal, labels: ['3', '31', '4'] }, { type: 'stream', path: 'w1t', at: 1300, n: 3, dur: 900, color: C.data, labels: ['3', '31', '4'] }] }
    ]
  };

  /* ---------- 场景 4：if / for / test 都看退出码 ---------- */
  var sceneFlow = {
    name: '退出码与控制流', desc: 'bash 的 if 和 while 不判断真假值。它们运行一条命令，看它的退出码。0 表示成功，走 then。非 0 表示失败。',
    code: { lang: 'sh', title: 'bash 控制流', src: 'if grep 2026 date.txt; then\n  echo "It\'s 2026!"\nfi\nfor i in $(seq 1 3); do\n  echo "i=$i"\ndone\nif [ "hello" = "world" ]; then\n  echo equal\nelse\n  echo "not equal"\nfi' },
    dataTitle: '变量与退出码',
    data: { '$?': '无', 'i': '无' },
    bg: function (d) {
      d.text(430, 28, '条件 = 一条命令；判断 = 它的退出码', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.rect(600, 170, 210, 50, { fill: C.defW, stroke: C.ok, rx: 10, sw: 1.4 });
      d.text(705, 195, 'then 分支（退出码 0）', { anchor: 'middle', size: 13, weight: 700, color: C.ok });
      d.rect(600, 300, 210, 50, { fill: C.badW, stroke: C.bad, rx: 10, sw: 1.4 });
      d.text(705, 325, 'else / 跳过（非 0）', { anchor: 'middle', size: 13, weight: 700, color: C.bad });
      d.text(430, 470, '循环变量', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: {
      prog: proc(190, 260, 'grep 2026 date.txt', 250),
      lamp: { type: 'circle', x: 420, y: 260, r: 34, fill: C.bg3, stroke: C.line, sw: 2.4, text: '?', color: C.fg2, size: 24, weight: 800 },
      tok: { type: 'circle', x: 420, y: 260, r: 9, fill: C.warn, stroke: C.warn, sw: 1, opacity: 0, trail: { n: 5, gap: 36 } },
      cs: { type: 'box', x: 430, y: 112, w: 150, h: 40, rx: 9, fill: C.warnW, stroke: C.warn, sw: 1.8, text: '$(seq 1 3)', mono: true, size: 15, weight: 750, color: C.warn, opacity: 0 },
      n1: { type: 'box', x: 430, y: 112, w: 46, h: 40, rx: 9, fill: C.dataW, stroke: C.data, sw: 1.8, text: '1', mono: true, size: 17, weight: 800, color: C.data, opacity: 0 },
      n2: { type: 'box', x: 430, y: 112, w: 46, h: 40, rx: 9, fill: C.dataW, stroke: C.data, sw: 1.8, text: '2', mono: true, size: 17, weight: 800, color: C.data, opacity: 0 },
      n3: { type: 'box', x: 430, y: 112, w: 46, h: 40, rx: 9, fill: C.dataW, stroke: C.data, sw: 1.8, text: '3', mono: true, size: 17, weight: 800, color: C.data, opacity: 0 },
      ivar: { type: 'box', x: 430, y: 430, w: 130, h: 46, rx: 10, fill: C.bg2, stroke: C.line, sw: 1.8, text: 'i = —', mono: true, size: 16, weight: 750, color: C.fg }
    },
    steps: [
      { say: 'if 后面不是表达式，是一条命令。shell 先运行 grep 2026 date.txt，它会把匹配的行打印出来。', hl: [1],
        log: ['$ if grep 2026 date.txt; then echo "It\'s 2026!"; fi', { s: 'Thu Oct 29 15:36:18 GMTST 2026', at: 900 }],
        fx: [{ type: 'pulse', obj: 'prog', at: 300, color: C.info }] },
      { say: 'grep 找到匹配 → 退出码 0。0 表示成功，于是执行 then 里的命令。', hl: [2], data: { '$?': { v: 0, at: 500 } },
        log: [{ s: "It's 2026!", at: 1400 }],
        set: { lamp: { text: '0', fill: { to: C.defW, delay: 400, dur: 300 }, stroke: { to: C.ok, delay: 400, dur: 300 }, color: { to: C.ok, delay: 400, dur: 300 } },
          tok: { opacity: { to: 1, delay: 600, dur: 200 }, x: { to: 600, delay: 700, dur: 700, ease: 'inOut' }, y: { to: 195, delay: 700, dur: 700, ease: 'inOut' } } },
        fx: [{ type: 'ripple', obj: 'lamp', at: 450, color: C.ok }, { type: 'pulse', x: 705, y: 195, at: 1400, color: C.ok }] },
      { say: '退出码的含义写在每个程序的 man 页里。grep 有匹配返回 0，没匹配返回 1，出错返回 2。本机逐个实测过。', data: { '$?': { v: 2, at: 1800 } },
        log: ['$ grep -q 3 data; echo $?', { s: '0', at: 300 }, { s: '$ grep -q zzz data; echo $?', at: 600 }, { s: '1', at: 900 }, { s: '$ grep -q x nofile; echo $?', at: 1200 }, { s: 'grep: nofile: No such file or directory', at: 1500, cls: 'err' }, { s: '2', at: 1800 }],
        set: { tok: { opacity: { to: 0, dur: 200 }, x: { to: 420, dur: 0, delay: 250 }, y: { to: 260, dur: 0, delay: 250 } },
          lamp: { text: { to: '2', delay: 1800 }, fill: { to: C.badW, delay: 900, dur: 200 }, stroke: { to: C.bad, delay: 900, dur: 200 }, color: { to: C.bad, delay: 900, dur: 200 } } },
        fx: [{ type: 'float', obj: 'lamp', at: 300, text: '0', color: C.ok }, { type: 'float', obj: 'lamp', at: 900, text: '1', color: C.bad }, { type: 'shake', obj: 'lamp', at: 950 }, { type: 'shake', obj: 'lamp', at: 1850 }] },
      { say: 'for i in $(seq 1 3) 会先执行 $( ) 里的命令。这叫命令替换。', hl: [4],
        set: { prog: { text: 'seq 1 3' }, lamp: { text: '?', fill: { to: C.bg3, dur: 200 }, stroke: { to: C.line, dur: 200 }, color: { to: C.fg2, dur: 200 } },
          cs: { opacity: { to: 1, dur: 300 }, y: { from: 90, to: 112, dur: 500, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'cs', at: 500, color: C.warn }] },
      { say: 'seq 输出 1 2 3。整个 $(seq 1 3) 被换成这段输出。再按空白切成 3 个词，for 就有了 3 个元素。',
        set: { cs: { opacity: { to: 0, delay: 300, dur: 300 }, s: { to: 0.6, delay: 300, dur: 300 } },
          n1: { opacity: { to: 1, delay: 300, dur: 200 }, x: { to: 350, delay: 400, dur: 700, ease: 'back' } },
          n2: { opacity: { to: 1, delay: 300, dur: 200 } },
          n3: { opacity: { to: 1, delay: 300, dur: 200 }, x: { to: 510, delay: 400, dur: 700, ease: 'back' } } },
        fx: [{ type: 'burst', x: 430, y: 112, at: 350, color: C.warn }] },
      { say: '第 1 轮：i 取第一个词 1，执行循环体 echo。', hl: [5], data: { 'i': { v: 1, at: 700 } }, log: { s: 'i=1', at: 900 },
        set: { n1: { x: { to: 430, dur: 700, ease: 'inOut' }, y: { to: 430, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 650, dur: 150 } }, ivar: { text: { to: 'i = 1', delay: 700 } } },
        fx: [{ type: 'pulse', obj: 'ivar', at: 700, color: C.data }] },
      { say: '第 2、3 轮：i = 2、i = 3。词用完，循环结束。', data: { 'i': { v: 3, at: 1700 } }, log: [{ s: 'i=2', at: 900 }, { s: 'i=3', at: 1900 }],
        set: { n2: { x: { to: 430, dur: 700, ease: 'inOut' }, y: { to: 430, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 650, dur: 150 } },
          n3: { x: { to: 430, delay: 1000, dur: 700, ease: 'inOut' }, y: { to: 430, delay: 1000, dur: 700, ease: 'inOut' }, opacity: { to: 0, delay: 1650, dur: 150 } },
          ivar: { text: { to: 'i = 2', delay: 700 } } },
        fx: [{ type: 'pulse', obj: 'ivar', at: 700, color: C.data }, { type: 'float', obj: 'ivar', at: 1700, text: 'i = 3', color: C.data }] },
      { say: '比较字符串？用 test 程序，它也叫 [。条件成立退出 0，否则 1。"hello" = "world" 不成立 → 退出 1 → 走 else。', hl: [7, 10],
        data: { '$?': { v: 1, at: 600 } }, log: ['$ if [ "hello" = "world" ]; then echo equal; else echo "not equal"; fi', { s: 'not equal', at: 1500 }],
        set: { ivar: { text: 'i = 3', opacity: { to: 0.4, dur: 300 } }, prog: { text: '[ "hello" = "world" ]' },
          lamp: { text: '1', fill: { to: C.badW, delay: 400, dur: 300 }, stroke: { to: C.bad, delay: 400, dur: 300 }, color: { to: C.bad, delay: 400, dur: 300 } },
          tok: { opacity: { to: 1, delay: 600, dur: 200 }, x: { to: 600, delay: 700, dur: 700, ease: 'inOut' }, y: { to: 325, delay: 700, dur: 700, ease: 'inOut' } } },
        fx: [{ type: 'shake', obj: 'lamp', at: 500 }, { type: 'pulse', x: 705, y: 325, at: 1400, color: C.bad }] },
      { say: '[ 和 test 在讲师机器上是同一个程序，which 能找到。bash 里它们也是内建命令。if、fi、for 才是 bash 的语法关键字。',
        log: ['$ type [ [[ if', { s: '[ is a shell builtin', at: 300 }, { s: '[[ is a shell keyword', at: 500 }, { s: 'if is a shell keyword', at: 700 }],
        set: { tok: { opacity: { to: 0, dur: 300 } } }, fx: [{ type: 'pulse', obj: 'prog', at: 200, color: C.info }] }
    ]
  };

  /* ---------- 场景 5：讲义里的 flaky test 脚本 ---------- */
  var SRC = '#!/bin/bash\nset -euo pipefail\n\n# Start CPU stress in background\nstress --cpu 8 &\nSTRESS_PID=$!\n\n# Setup log file\nLOGFILE="test_runs_$(date +%s).log"\necho "Logging to $LOGFILE"\n\n# Run tests until one fails\nRUN=1\nwhile cargo test my_test > "$LOGFILE" 2>&1; do\n    echo "Run $RUN passed"\n    ((RUN++))\ndone\n\n# Cleanup and report\nkill $STRESS_PID\necho "Test failed on run $RUN"\necho "Last 20 lines of output:"\ntail -n 20 "$LOGFILE"\necho "Full log: $LOGFILE"';
  var LOG = 'test_runs_1768239420.log';
  function runOnce(n, ok, at) {
    var s = { tst: { stroke: { to: C.info, delay: at, dur: 150 } },
      lampT: { text: { to: ok ? '0' : '101', delay: at + 900 }, fill: { to: ok ? C.defW : C.badW, delay: at + 900, dur: 200 }, stroke: { to: ok ? C.ok : C.bad, delay: at + 900, dur: 200 }, color: { to: ok ? C.ok : C.bad, delay: at + 900, dur: 200 } } };
    return s;
  }
  var sceneScript = {
    name: '脚本：跑到失败为止', desc: '讲义里的脚本先在后台压满 CPU。再循环跑测试，直到某一次失败。日志只留失败那一轮。它专门用来抓偶发失败的 flaky 测试。',
    code: { lang: 'sh', title: 'flaky.sh（讲义原文）', src: SRC },
    dataTitle: '脚本变量（数值为示意）',
    data: { 'STRESS_PID': '无', 'LOGFILE': '无', 'RUN': '无', '$?': '无' },
    bg: function (d) {
      d.text(430, 28, 'while 条件命令成功就继续；一旦失败，跳出循环做清理', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.path('M230,300 C230,390 470,390 470,300', { stroke: C.line, sw: 1.6, arrow: 'fg3', dash: '5 4' });
      d.text(350, 400, '成功 → 再来一轮', { anchor: 'middle', size: 11.5, color: C.fg3 });
    },
    objects: {
      stress: proc(700, 110, 'stress --cpu 8 &', 210, { opacity: 0, s: 0.8, fill: C.warnW, stroke: C.warn }),
      tst: proc(230, 270, 'cargo test my_test', 210),
      lampT: { type: 'circle', x: 410, y: 270, r: 28, fill: C.bg3, stroke: C.line, sw: 2.2, text: '?', size: 17, weight: 800, color: C.fg2 },
      w: pipe('M335,282 C460,300 520,350 600,350', C.data),
      lf: { type: 'box', x: 690, y: 350, w: 200, h: 56, rx: 8, fill: C.tealW, stroke: C.teal, sw: 1.6, text: LOG, mono: true, size: 11.5, weight: 700, color: C.fg, opacity: 0 },
      run: { type: 'text', x: 230, y: 190, num: 1, pre: 'RUN = ', size: 20, weight: 800, mono: true, color: C.data, opacity: 0 },
      dead: { type: 'text', x: 700, y: 110, text: '× 已 kill', size: 18, weight: 800, color: C.bad, opacity: 0 }
    },
    steps: [
      { say: '第 1 行是 shebang，用 /bin/bash 解释这个文件。第 2 行让 bash 变严格。-e 是命令失败就退出。-u 是用到未定义变量就报错。-o pipefail 是管道里任一段失败，整条就算失败。', hl: [1, 2] },
      { say: 'stress --cpu 8 & 末尾的 &，让它在后台运行。shell 不等它结束，继续往下走。$! 是刚放到后台的那个进程的 PID。', hl: [5, 6],
        data: { 'STRESS_PID': { v: '4242', at: 800 } },
        set: { stress: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 600, ease: 'back' } } },
        fx: [{ type: 'pulse', obj: 'stress', at: 700, color: C.warn }, { type: 'pulse', obj: 'stress', at: 1600, color: C.warn }] },
      { say: '$(date +%s) 会被换成当前的 Unix 时间戳。所以 LOGFILE 每次运行都是新文件名。', hl: [9, 10],
        data: { 'LOGFILE': { v: LOG, at: 700 } }, log: { s: 'Logging to ' + LOG, at: 900 },
        set: { lf: { opacity: { to: 1, delay: 500, dur: 300 } } }, fx: [{ type: 'ripple', obj: 'lf', at: 700, color: C.teal }] },
      { say: '第 1 轮运行测试。> "$LOGFILE" 2>&1 把全部输出覆盖写进日志。测试通过，退出码是 0，于是进入循环体。', hl: [13, 14, 15, 16],
        data: { 'RUN': { v: 1, at: 100 }, '$?': { v: 0, at: 900 } }, log: { s: 'Run 1 passed', at: 1300 },
        set: merge(runOnce(1, true, 0), { run: { opacity: { to: 1, dur: 300 } }, w: { dash: { to: 1, delay: 200, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'w', at: 300, n: 4, dur: 900, color: C.data }, { type: 'ripple', obj: 'lampT', at: 950, color: C.ok }] },
      { say: '((RUN++)) 是算术展开，RUN 加 1。然后回到 while 再跑一次测试。第 2、3 轮也都通过了。', hl: [16, 14],
        data: { 'RUN': { v: 3, at: 2000 } }, log: [{ s: 'Run 2 passed', at: 900 }, { s: 'Run 3 passed', at: 1900 }],
        set: { run: { num: { to: 3, dur: 1600 } }, lampT: { text: { to: '…', delay: 100 } } },
        fx: [{ type: 'stream', path: 'w', at: 200, n: 3, dur: 800, color: C.data }, { type: 'ripple', obj: 'lampT', at: 900, color: C.ok }, { type: 'stream', path: 'w', at: 1200, n: 3, dur: 800, color: C.data }, { type: 'ripple', obj: 'lampT', at: 1900, color: C.ok }] },
      { say: '第 4 轮测试失败了，这是示意。退出码非 0，while 条件不成立，跳出循环。这时日志里正好是失败那一轮的输出。', hl: [14, 17],
        data: { 'RUN': 4, '$?': { v: '101（示意）', at: 1000 } },
        set: merge(runOnce(4, false, 0), { run: { num: { to: 4, dur: 300 } } }),
        fx: [{ type: 'stream', path: 'w', at: 200, n: 4, dur: 800, color: C.bad }, { type: 'shake', obj: 'lampT', at: 1000 }, { type: 'pulse', obj: 'lf', at: 1100, color: C.bad }] },
      { say: '最后收尾并报告。先 kill 掉后台的 stress。再打印失败的轮次、日志最后 20 行和日志文件名。', hl: [20, 21, 22, 23, 24],
        log: [{ s: 'Test failed on run 4', at: 600 }, { s: 'Last 20 lines of output:', at: 800 }, { s: '…（日志末尾）', at: 1000, cls: 'dim' }, { s: 'Full log: ' + LOG, at: 1200 }],
        set: { stress: { opacity: { to: 0.3, dur: 400 }, stroke: { to: C.bad, dur: 300 } }, dead: { opacity: { to: 1, delay: 200, dur: 300 } } },
        fx: [{ type: 'burst', obj: 'stress', at: 200, color: C.bad }] },
      { say: '附上严格模式三个开关的效果，是本机实测。有个坑：RUN 要是从 0 开始，((RUN++)) 的值就是 0。退出码成了 1，set -e 会让脚本悄悄退出。',
        log: [{ s: "$ bash -c 'set -u; echo \"$NOPE\"'", cls: 'in' }, { s: 'bash: line 1: NOPE: unbound variable', at: 300, cls: 'err' },
          { s: "$ bash -c 'false | true; echo $?'      # 无 pipefail", at: 700, cls: 'in' }, { s: '0', at: 900 },
          { s: "$ bash -c 'set -o pipefail; false | true; echo $?'", at: 1200, cls: 'in' }, { s: '1', at: 1400 },
          { s: "$ bash -c 'set -e; RUN=0; ((RUN++)); echo after'; echo $?", at: 1700, cls: 'in' }, { s: '1', at: 1900, cls: 'err' }] }
    ]
  };

  var DOC = { t: '讲义 course-shell', u: 'https://missing.csail.mit.edu/2026/course-shell/' };
  /* 每个知识点一个演示，分别挂在 ch01.html 对应小节下面；管道与重定向同属 §13，合为一个两场景演示 */
  VZ.register({
    id: 'ch01-ssh', title: '讲义的 SSH 日志流水线：逐级看数据怎么变',
    sources: [{ t: '视频 53:27 SSH 日志流水线', u: 'https://youtu.be/MSgoeuMqUmU?t=3207' }, DOC],
    note: 'ssh.log 是 12 行示意日志。每一级的输出，都是拿它在本机 Git Bash 真跑的结果。',
    scenes: [sceneSsh]
  });
  VZ.register({
    id: 'ch01-pipe', title: '管道与重定向：stdout / stderr / stdin 接到哪里',
    sources: [{ t: '视频 34:32 uniq', u: 'https://youtu.be/MSgoeuMqUmU?t=2072' }, { t: '视频 58:43 管道与重定向', u: 'https://youtu.be/MSgoeuMqUmU?t=3523' },
      { t: 'Bash 手册 · Redirections', u: 'https://www.gnu.org/software/bash/manual/html_node/Redirections.html' }, DOC],
    note: '控制台输出为本机 Git Bash 实测。',
    scenes: [scenePipe, sceneRedir]
  });
  VZ.register({
    id: 'ch01-flow', title: 'if / for / test：条件看的是退出码',
    sources: [{ t: '视频 1:01:02 if/while/for', u: 'https://youtu.be/MSgoeuMqUmU?t=3662' }, { t: '视频 1:05:40 test 与 [', u: 'https://youtu.be/MSgoeuMqUmU?t=3940' }, DOC],
    note: '控制台输出为本机 Git Bash 实测（date 的时间是运行时刻）。',
    scenes: [sceneFlow]
  });
  VZ.register({
    id: 'ch01-script', title: '讲义的 flaky 测试脚本：跑到失败为止',
    sources: [{ t: '视频 1:08:44 脚本', u: 'https://youtu.be/MSgoeuMqUmU?t=4124' }, DOC],
    note: '失败轮次、PID、时间戳和测试退出码 101 都是示意。最后一步严格模式的输出是本机实测。',
    scenes: [sceneScript]
  });
})();
