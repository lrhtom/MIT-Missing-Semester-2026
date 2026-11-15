/* ch06 · 依赖与环境 —— 可视化演示
 * 依据：Lecture 6 视频 2:06–5:05（pip install 与依赖树）、6:18–9:46（依赖冲突、虚拟环境）、
 *       21:29–24:36（版本范围与语义化版本）；讲义 shipping-code.md 的 Dependencies & Environments、Releases & Versioning。
 * 实测：第 1 幕控制台为讲义原文（Linux）；第 2–4 幕的输出来自 labs/data/lab06.js（本机 Git Bash + Python 3.13 + uv 0.11 真跑，
 *       路径已替换成 <沙箱>/<Python> 占位符）。数轴上版本点的间距是示意，不按比例。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 9, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 13, weight: 700 }, extra || {});
  }

  /* ---------- 场景 1：pip install 背后的四步 ---------- */
  var CX = [205, 355, 505, 655], CY = 262;
  var DEPS = [
    ['charset-normalizer', '<4,>=2', '3.4.0'],
    ['idna', '<4,>=2.5', '3.10'],
    ['urllib3', '<3,>=1.21.1', '2.2.3'],
    ['certifi', '>=2017.4.17', '2024.8.30']
  ];
  var SLOT = [150, 290, 430, 570, 710], SY = 492;
  var ORDER = [2, 1, 0, 3]; /* 讲义输出的安装顺序：urllib3, idna, charset-normalizer, certifi, 最后 requests */
  function sceneInstallObjs() {
    var o = {
      qry: box(430, 56, 130, 30, 'requests ?', C.data, C.dataW, { rx: 15, mono: true, opacity: 0, trail: { n: 5, gap: 36 } }),
      whl: box(105, 102, 270, 28, 'requests-2.32.3-py3-none-any.whl', C.teal, C.tealW, { mono: true, size: 11.5, opacity: 0 }),
      rq: box(430, 128, 120, 40, 'requests', C.info, C.infoW, { mono: true, size: 15, opacity: 0, s: 0.7 }),
      dl: { type: 'path', d: 'M182,110 C300,120 340,190 430,200', stroke: C.teal, sw: 2, dash: 0, arrow: 'data' },
      imp: box(430, 395, 170, 30, 'import requests', C.data, C.dataW, { mono: true, rx: 15, opacity: 0, trail: { n: 4, gap: 40 } })
    };
    DEPS.forEach(function (d, i) {
      o['e' + i] = { type: 'line', x1: 430, y1: 148, x2: CX[i], y2: CY - 18, stroke: C.line, sw: 1.6, dash: 0 };
      o['c' + i] = box(430, 128, 140, 36, d[0], C.info, C.infoW, { mono: true, size: 12.5, opacity: 0, s: 0.6 });
      o['k' + i] = { type: 'text', x: CX[i], y: CY + 32, text: d[1], size: 12, mono: true, color: C.fg2, opacity: 0 };
      o['v' + i] = box(CX[i], CY + 70, 100, 26, d[2], C.ok, C.okW, { mono: true, size: 12.5, opacity: 0, s: 0.6 });
    });
    return o;
  }
  var sceneInstall = {
    name: 'pip install', desc: 'pip install requests 看着只是一条命令。其实它做了四件事。查索引，选构件，递归解析依赖，最后下载安装。',
    code: { lang: 'py', title: 'fetch.py（讲义原文）', src: 'import requests\n\nresponse = requests.get("https://missing.csail.mit.edu")' },
    dataTitle: '安装器的进度',
    data: { '阶段': '无', '已知的包': 0, '已安装': 0 },
    bg: function (d) {
      d.text(430, 24, 'pip install requests：查找 → 选构件 → 解析依赖 → 下载安装', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.node(30, 70, 150, 64, 'PyPI', 'pypi.org · Python 包索引', { fill: C.tealW, stroke: C.teal });
      d.rect(60, 432, 740, 100, { fill: C.bg2, stroke: C.line, rx: 12 });
      d.text(76, 450, 'site-packages：全局 Python 的包目录（讲义里是 /usr/local/lib/python3.11/dist-packages）', { size: 11.5, color: C.fg3, weight: 600 });
      SLOT.forEach(function (x) { d.rect(x - 69, SY - 19, 138, 38, { stroke: C.line, dash: '4 4', rx: 8 }); });
    },
    objects: sceneInstallObjs,
    steps: [
      { say: '运行 fetch.py 报 ModuleNotFoundError。requests 不在 Python 的标准库里。于是 pip install requests。第一步，去 PyPI 查找这个名字。', hl: [1],
        log: ['$ python fetch.py', { s: "ModuleNotFoundError: No module named 'requests'", at: 300, cls: 'err' }, { s: '$ pip install requests', at: 900 }, { s: 'Collecting requests', at: 1900 }],
        data: { '阶段': { v: '① 查找', at: 900 } },
        set: { qry: { opacity: { to: 1, delay: 900, dur: 250 }, x: { to: 190, delay: 1000, dur: 800, ease: 'inOut' }, y: { to: 96, delay: 1000, dur: 800, ease: 'inOut' } } },
        fx: [{ type: 'pulse', x: 105, y: 102, at: 1800, color: C.teal }] },
      { say: '第二步，挑出适合本机的构件（artifact）。requests 是纯 Python 包。wheel 文件名里的 py3-none-any，表示任何 Python 3、任何平台都能用。',
        log: { s: 'Downloading requests-2.32.3-py3-none-any.whl (64 kB)', at: 900 },
        data: { '阶段': '② 选构件', '已知的包': { v: 1, at: 1300 } },
        set: { qry: { opacity: { to: 0, dur: 250 } },
          whl: { opacity: { to: 1, delay: 200, dur: 250 }, x: { to: 430, delay: 300, dur: 800, ease: 'inOut' }, y: { to: 128, delay: 300, dur: 800, ease: 'inOut' } },
          rq: { opacity: { to: 1, delay: 1100, dur: 300 }, s: { to: 1, delay: 1100, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'rq', at: 1200, color: C.info }] },
      { say: '第三步，解析依赖。wheel 的元数据里写着，requests 还需要 4 个包。每个包允许的版本范围也写在里面。它们从 requests 节点“分裂”出来。',
        log: [{ s: 'Collecting charset-normalizer<4,>=2', at: 400 }, { s: 'Collecting idna<4,>=2.5', at: 700 }, { s: 'Collecting urllib3<3,>=1.21.1', at: 1000 }, { s: 'Collecting certifi>=2017.4.17', at: 1300 }],
        data: { '阶段': '③ 解析依赖', '已知的包': { v: 5, at: 1300 } },
        set: (function () {
          var s = { whl: { opacity: { to: 0, dur: 300 } } };
          DEPS.forEach(function (d, i) {
            var at = 300 + i * 300;
            s['e' + i] = { dash: { to: 1, delay: at, dur: 500 } };
            s['c' + i] = { opacity: { to: 1, delay: at, dur: 200 }, x: { to: CX[i], delay: at, dur: 700, ease: 'back' }, y: { to: CY, delay: at, dur: 700, ease: 'out' }, s: { to: 1, delay: at, dur: 600 } };
            s['k' + i] = { opacity: { to: 1, delay: at + 600, dur: 300 } };
          });
          return s;
        })() },
      { say: '对每个依赖，在允许的范围里选一个版本。通常选满足条件的最新版。依赖还会有自己的依赖。安装器要把整棵树递归走完。这棵树到这一层就到底了。',
        eq: [{ s: 'charset-normalizer 3.4.0：≥2 √  <4 √', at: 200 }, { s: 'idna 3.10：≥2.5 √  <4 √', at: 600 }, { s: 'urllib3 2.2.3：≥1.21.1 √  <3 √', at: 1000 }, { s: 'certifi 2024.8.30：≥2017.4.17 √', at: 1400 }],
        set: (function () { var s = {}; DEPS.forEach(function (d, i) { s['v' + i] = { opacity: { to: 1, delay: 200 + i * 400, dur: 200 }, s: { to: 1, delay: 200 + i * 400, dur: 450, ease: 'back' } }; }); return s; })(),
        fx: [{ type: 'burst', obj: 'v3', at: 1700, color: C.ok }] },
      { say: '第四步，下载这 5 个 wheel。注意 charset-normalizer 的 wheel 带着 cp311、manylinux 这类平台标签。含编译代码的包，要按平台挑文件。',
        log: [{ s: 'Downloading charset_normalizer-3.4.0-cp311-cp311-manylinux_x86_64.whl (142 kB)', at: 300 }, { s: 'Downloading idna-3.10-py3-none-any.whl (70 kB)', at: 600 }, { s: 'Downloading urllib3-2.2.3-py3-none-any.whl (126 kB)', at: 900 }, { s: 'Downloading certifi-2024.8.30-py3-none-any.whl (167 kB)', at: 1200 }],
        data: { '阶段': '④ 下载' },
        set: { dl: { dash: { to: 1, dur: 500 } } },
        fx: [{ type: 'stream', path: 'dl', at: 300, n: 5, dur: 1500, color: C.teal, labels: ['.whl', '.whl', '.whl', '.whl', '.whl'] }] },
      { say: '解包并复制进 site-packages。被依赖的先装，requests 最后装：urllib3 → idna → charset-normalizer → certifi → requests。',
        log: { s: 'Installing collected packages: urllib3, idna, charset-normalizer, certifi, requests', at: 200 },
        data: { '阶段': '④ 安装', '已安装': { v: 5, at: 2200 } },
        set: (function () {
          var s = { dl: { dash: { to: 0, dur: 400 } } };
          ORDER.forEach(function (i, k) {
            var at = 300 + k * 380;
            s['c' + i] = { x: { to: SLOT[k], delay: at, dur: 750, ease: 'inOut' }, y: { to: SY, delay: at, dur: 750, ease: 'inOut' }, w: { to: 136, delay: at, dur: 400 }, stroke: { to: C.ok, delay: at + 700, dur: 200 }, fill: { to: C.okW, delay: at + 700, dur: 200 } };
            s['e' + i] = { opacity: { to: 0, delay: at, dur: 300 } };
            s['k' + i] = { opacity: { to: 0, delay: at, dur: 300 } };
            s['v' + i] = { opacity: { to: 0, delay: at, dur: 300 } };
          });
          s.rq = { x: { to: SLOT[4], delay: 1900, dur: 750, ease: 'inOut' }, y: { to: SY, delay: 1900, dur: 750, ease: 'inOut' }, w: { to: 136, delay: 1900, dur: 400 }, stroke: { to: C.ok, delay: 2600, dur: 200 }, fill: { to: C.okW, delay: 2600, dur: 200 } };
          return s;
        })(),
        fx: [{ type: 'ripple', x: SLOT[4], y: SY, at: 2650, color: C.ok }] },
      { say: '装好了。现在 import requests 能在 site-packages 里找到它。但它装进的是全局 Python。不同项目要不同版本时怎么办？见下一节。', hl: [1],
        log: [{ s: 'Successfully installed certifi-2024.8.30 charset-normalizer-3.4.0 idna-3.10 requests-2.32.3 urllib3-2.2.3', at: 100 },
          { s: "$ python -c 'import requests; print(requests.__path__)'", at: 600 }, { s: "['/usr/local/lib/python3.11/dist-packages/requests']", at: 1500 }],
        data: { '阶段': '完成' },
        set: { imp: { opacity: { to: 1, delay: 600, dur: 250 }, x: { to: SLOT[4], delay: 700, dur: 800, ease: 'inOut' }, y: { to: SY - 46, delay: 700, dur: 800, ease: 'in' } } },
        fx: [{ type: 'pulse', x: SLOT[4], y: SY, at: 1500, color: C.ok }, { type: 'burst', x: SLOT[4], y: SY, at: 1550, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：版本约束求解与依赖地狱 ---------- */
  var VX = [130, 230, 340, 450, 590, 730], VL = ['1.16.0', '1.16.5', '1.18.5', '1.19.0', '1.24.4', '2.0.0'], NY = 128;
  function bar(x1, x2, y, text, col, colW) { return box((x1 + x2) / 2, y, x2 - x1, 24, text, col, colW, { rx: 6, size: 11.5, mono: true, opacity: 0, s: 0.9 }); }
  function sceneSolveObjs() {
    var o = {
      band: box(340, NY, 230, 44, '', C.ok, C.okW, { rx: 8, opacity: 0, sw: 1.2 }),
      tf: bar(120, 450, 182, 'tensorflow 2.3.0 要 numpy>=1.16.0,<1.19.0', C.info, C.infoW),
      pd: bar(220, 810, 216, 'pandas 1.2.0 要 numpy>=1.16.5', C.data, C.dataW),
      th: bar(440, 810, 250, '另一个包要 numpy>=1.19', C.warn, C.warnW),
      liba: box(150, 360, 150, 36, 'liba 1.0.0', C.info, C.infoW, { mono: true, opacity: 0 }),
      libb: box(150, 470, 150, 36, 'libb 1.0.0', C.info, C.infoW, { mono: true, opacity: 0 }),
      la: { type: 'line', x1: 226, y1: 360, x2: 520, y2: 360, stroke: C.ok, sw: 2, dash: 0 },
      lb: { type: 'line', x1: 226, y1: 470, x2: 520, y2: 470, stroke: C.ok, sw: 2, dash: 0 },
      ta: { type: 'text', x: 372, y: 346, text: 'shared>=1.0,<2.0', size: 11.5, mono: true, color: C.fg2, opacity: 0 },
      tb: { type: 'text', x: 372, y: 456, text: 'shared>=2.0', size: 11.5, mono: true, color: C.fg2, opacity: 0 },
      envA: box(660, 415, 270, 160, '', C.teal, 'none', { rx: 14, sw: 1.8, opacity: 0, dasharray: '6 4' }),
      envAl: { type: 'text', x: 660, y: 350, text: '一个环境（.venv）', size: 12.5, weight: 700, color: C.teal, opacity: 0 },
      sh: box(600, 415, 130, 34, 'shared 1.5.0', C.ok, C.okW, { mono: true, opacity: 0 }),
      envB: box(660, 470, 270, 70, '', C.teal, 'none', { rx: 12, sw: 1.8, opacity: 0, dasharray: '6 4' }),
      shB: box(600, 470, 130, 34, 'shared 2.1.0', C.ok, C.okW, { mono: true, opacity: 0 }),
      xx: { type: 'text', x: 372, y: 415, text: '× 无解', size: 18, weight: 800, color: C.bad, opacity: 0 }
    };
    VL.forEach(function (v, i) { o['d' + i] = { type: 'circle', x: VX[i], y: NY, r: 9, fill: C.bg, stroke: C.fg3, sw: 1.8 }; });
    return o;
  }
  function dots(onSet, at) {
    var s = {};
    VL.forEach(function (v, i) {
      var on = onSet.indexOf(i) >= 0;
      s['d' + i] = { fill: { to: on ? C.ok : C.bg3, delay: at || 0, dur: 300 }, stroke: { to: on ? C.ok : C.line, delay: at || 0, dur: 300 }, r: { to: on ? 11 : 7, delay: at || 0, dur: 300 } };
    });
    return s;
  }
  var sceneSolve = {
    name: '约束求解', desc: '安装器要找一组版本，同时满足所有包写下的范围。几个范围取交集。交集为空，就是“依赖地狱”。',
    code: { lang: 'py', title: 'semver_check.py 的最后几行（练习 2 实测）', src: 'both = SpecifierSet(">=1.16.0,<1.19.0") & SpecifierSet(">=1.16.5")\n[v for v in NUMPY if Version(v) in both]\nmore = both & SpecifierSet(">=1.19")\n[v for v in NUMPY if Version(v) in more]  # -> []' },
    dataTitle: 'numpy 可选版本',
    data: { '约束个数': 0, '满足的版本': '全部 6 个' },
    legend: [[C.ok, '满足全部约束'], [C.bad, '冲突 / 无解'], [C.info, '库及其要求'], [C.teal, '虚拟环境'], [C.neutral, '被排除的版本']],
    bg: function (d) {
      d.text(430, 24, '讲义例子：三个包对 numpy 的要求取交集', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.line(90, NY, 800, NY, { stroke: C.line, sw: 2 });
      VL.forEach(function (v, i) { d.text(VX[i], NY - 26, v, { anchor: 'middle', size: 12, mono: true, color: C.fg2 }); });
      d.text(800, NY + 22, '（间距示意）', { anchor: 'end', size: 10.5, color: C.fg3 });
      d.line(40, 300, 820, 300, { stroke: C.line, sw: 1, dash: '3 5' });
      d.text(40, 318, '用 4 个手工 wheel 在本机复现（练习 1 · ex01-e / ex01-f）', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: sceneSolveObjs,
    steps: [
      { say: 'numpy 有很多版本，这里挑 6 个代表。没有任何约束时，每个都能选。',
        set: dots([0, 1, 2, 3, 4, 5], 200), fx: [{ type: 'pulse', x: 450, y: NY, at: 300, color: C.ok }] },
      { say: 'tensorflow 2.3.0 要求 numpy>=1.16.0,<1.19.0。注意右端是“小于”，1.19.0 本身不行。', hl: [1],
        eq: 'tensorflow：1.16.0 ≤ v < 1.19.0', data: { '约束个数': 1, '满足的版本': { v: '1.16.0 1.16.5 1.18.5', at: 900 } },
        set: merge(dots([0, 1, 2], 800), { tf: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } } }) },
      { say: 'pandas 1.2.0 要求 numpy>=1.16.5。两个范围的交集是 [1.16.5, 1.19.0)，只剩 2 个版本。这是本机用 packaging 库实测的。', hl: [2],
        eq: [{ s: 'pandas：v ≥ 1.16.5', at: 100 }, { s: '交集：max(1.16.0,1.16.5) ≤ v < 1.19.0', at: 700 }, { s: '→ {1.16.5, 1.18.5}', at: 1300, cls: 'ok' }],
        log: [{ s: '$ python semver_check.py   # 最后两行', at: 200 }, { s: "tensorflow ∩ pandas: <1.19.0,>=1.16.0,>=1.16.5 -> ['1.16.5', '1.18.5']", at: 1300 }],
        data: { '约束个数': 2, '满足的版本': { v: '1.16.5 1.18.5', at: 1300 } },
        set: merge(dots([1, 2], 1100), { pd: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } }, band: { opacity: { to: 1, delay: 900, dur: 400 } } }) },
      { say: '再加一个包，要求 numpy>=1.19。下界 1.19 碰到了上界 1.19.0，而上界本身不含。交集为空，没有任何版本能同时满足。', hl: [3, 4],
        eq: [{ s: '下界 = max(1.16.5, 1.19) = 1.19', at: 300 }, { s: '上界 = 1.19.0（不含）', at: 800 }, { s: '1.19 ≤ v < 1.19.0 → 空集：依赖地狱', at: 1300, cls: 'bad' }],
        log: { s: '再加 numpy>=1.19: 无解（依赖地狱）', at: 1400, cls: 'err' }, data: { '约束个数': 3, '满足的版本': { v: '（无）', at: 1400 } },
        set: merge(dots([], 1200), { th: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' } },
          band: { x: { to: 450, delay: 1000, dur: 500 }, w: { to: 6, delay: 1000, dur: 500 }, stroke: { to: C.bad, delay: 1000, dur: 300 }, fill: { to: C.badW, delay: 1000, dur: 300 } } }),
        fx: [{ type: 'shake', obj: 'band', at: 1500 }, { type: 'flash', obj: 'th', at: 1400, color: C.bad }] },
      { say: '本机复现：手工造两个包。liba 要 shared<2.0，libb 要 shared>=2.0。让 uv 同时安装，解析器给出了“无解”的推理过程。',
        log: ['$ uv pip install --no-index --find-links wheels liba libb', { s: '  × No solution found when resolving dependencies:', at: 900, cls: 'err' },
          { s: '  ╰─▶ ...liba==1.0.0 depends on shared>=1.0,<2.0 ...', at: 1100, cls: 'err' }, { s: '      ...libb==1.0.0 depends on shared>=2.0 ...', at: 1300, cls: 'err' }, { s: '      ...your requirements are unsatisfiable.', at: 1500, cls: 'err' }],
        set: { liba: { opacity: { to: 1, dur: 300 } }, libb: { opacity: { to: 1, delay: 150, dur: 300 } }, la: { dash: { to: 1, delay: 300, dur: 500 } }, lb: { dash: { to: 1, delay: 450, dur: 500 } },
          ta: { opacity: { to: 1, delay: 600, dur: 300 } }, tb: { opacity: { to: 1, delay: 700, dur: 300 } }, xx: { opacity: { to: 1, delay: 1300, dur: 300 } } } ,
        fx: [{ type: 'stream', path: 'la', at: 700, n: 2, dur: 900, color: C.info, labels: ['<2.0'] }, { type: 'stream', path: 'lb', at: 800, n: 2, dur: 900, color: C.info, labels: ['>=2.0'] }, { type: 'shake', obj: 'xx', at: 1500 }] },
      { say: '要是分两次装呢？先装 liba，shared 选 1.5.0。再装 libb，安装器把 shared 换成了 2.1.0。liba 的要求被悄悄破坏，uv pip check 才查出来。',
        log: ['$ uv pip install … liba', { s: ' + liba==1.0.0', at: 300 }, { s: ' + shared==1.5.0', at: 400 }, { s: '$ uv pip install … libb', at: 900 }, { s: ' - shared==1.5.0', at: 1300 }, { s: ' + shared==2.1.0', at: 1400 },
          { s: '$ uv pip check', at: 1900 }, { s: 'The package `liba` requires `shared>=1.0,<2.0`, but `2.1.0` is installed', at: 2300, cls: 'err' }],
        set: { xx: { opacity: { to: 0, dur: 300 } }, envA: { opacity: { to: 1, dur: 400 } }, envAl: { opacity: { to: 1, dur: 400 } },
          sh: { opacity: { to: 1, delay: 300, dur: 300 }, x: { from: 520, to: 600, delay: 300, dur: 500, ease: 'out' } },
          la: { x2: { to: 535, delay: 300, dur: 400 }, y2: { to: 415, delay: 300, dur: 400 } },
          lb: { x2: { to: 535, delay: 1200, dur: 400 }, y2: { to: 425, delay: 1200, dur: 400 } },
          tb: { y: { to: 452, delay: 900, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'sh', at: 1350 }, { type: 'flash', obj: 'liba', at: 2300, color: C.bad }] },
      { say: '解法：每个项目一个环境。env-a 里 liba 配 shared 1.5.0，env-b 里 libb 配 shared 2.1.0，互不干扰（本机实测）。下一幕看环境是怎么“生效”的。',
        log: [{ s: "$ env-a/Scripts/python -c 'import liba, shared; …'", at: 200 }, { s: 'env-a: shared 1.5.0', at: 1200, cls: 'ok' }, { s: "$ env-b/Scripts/python -c 'import libb, shared; …'", at: 1500 }, { s: 'env-b: shared 2.1.0', at: 2100, cls: 'ok' }],
        set: { envAl: { text: 'env-a', y: { to: 330, dur: 400 } }, envA: { y: { to: 375, dur: 600 }, h: { to: 70, dur: 600 } },
          sh: { text: 'shared 1.5.0', y: { to: 375, dur: 600 } }, la: { y1: { to: 360, dur: 0 }, x2: { to: 535, dur: 500 }, y2: { to: 370, dur: 600 }, stroke: { to: C.ok, dur: 300 } },
          envB: { opacity: { to: 1, delay: 500, dur: 400 } }, shB: { opacity: { to: 1, delay: 700, dur: 300 } },
          lb: { x2: { to: 535, dur: 500 }, y2: { to: 470, dur: 500 }, stroke: { to: C.ok, dur: 300 } }, tb: { y: { to: 456, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'sh', at: 1200, color: C.ok }, { type: 'ripple', obj: 'shB', at: 2100, color: C.ok }] }
    ]
  };

  /* ---------- 场景 3：语义化版本 ---------- */
  var SX = [330, 430, 530], RX0 = 110, RX1 = 790, RY = 470;
  var RC = [150, 280, 430, 560, 700];
  function sceneSemverObjs() {
    var o = {
      M: { type: 'box', x: SX[0], y: 108, w: 84, h: 64, rx: 12, fill: C.badW, stroke: C.bad, sw: 2, num: 1, size: 32, weight: 800, mono: true, color: C.fg, opacity: 0, s: 0.7 },
      m: { type: 'box', x: SX[1], y: 108, w: 84, h: 64, rx: 12, fill: C.dataW, stroke: C.data, sw: 2, num: 2, size: 32, weight: 800, mono: true, color: C.fg, opacity: 0, s: 0.7 },
      p: { type: 'box', x: SX[2], y: 108, w: 84, h: 64, rx: 12, fill: C.okW, stroke: C.ok, sw: 2, num: 3, size: 32, weight: 800, mono: true, color: C.fg, opacity: 0, s: 0.7 },
      sa: { type: 'text', x: 300, y: 250, anchor: 'start', text: '"1.10.0"', size: 22, mono: true, cw: 13.4, color: C.fg, opacity: 0 },
      sb: { type: 'text', x: 300, y: 292, anchor: 'start', text: '"1.9.0"', size: 22, mono: true, cw: 13.4, color: C.fg, opacity: 0 },
      cur: box(300 + 13.4 * 1.5, 271, 16, 76, '', C.warn, C.warnW, { rx: 4, opacity: 0, sw: 1.4 }),
      verd: { type: 'text', x: 620, y: 271, text: '', size: 15, weight: 750, color: C.bad, opacity: 0 },
      rng: box((RC[1] + RC[3]) / 2, RY, RC[3] - RC[1], 30, '', C.ok, C.okW, { rx: 6, opacity: 0, sw: 1.4 }),
      rlab: { type: 'text', x: 430, y: RY - 36, text: '', size: 15, weight: 750, mono: true, color: C.fg, opacity: 0 }
    };
    RC.forEach(function (x, i) {
      o['r' + i] = { type: 'circle', x: x, y: RY, r: 8, fill: C.bg, stroke: C.fg3, sw: 1.8, opacity: 0 };
      o['rt' + i] = { type: 'text', x: x, y: RY + 30, text: '', size: 12.5, mono: true, color: C.fg2, opacity: 0 };
    });
    return o;
  }
  function cand(labels, okIdx, at) {
    var s = {};
    RC.forEach(function (x, i) {
      var on = okIdx.indexOf(i) >= 0, lab = labels[i];
      s['r' + i] = { opacity: { to: lab ? 1 : 0, delay: at, dur: 200 }, fill: { to: on ? C.ok : C.badW, delay: at + 200 + i * 120, dur: 250 }, stroke: { to: on ? C.ok : C.bad, delay: at + 200 + i * 120, dur: 250 } };
      s['rt' + i] = { text: (lab || '') + (lab ? (on ? ' √' : ' ×') : ''), opacity: { to: lab ? 1 : 0, delay: at + 200 + i * 120, dur: 250 }, color: { to: on ? C.ok : C.bad, delay: at, dur: 0 } };
    });
    return s;
  }
  var sceneSemver = {
    name: '语义化版本', desc: 'MAJOR.MINOR.PATCH 三段整数。升哪一段，就承诺了多大的兼容性。版本号要按整数逐段比较。范围写法 ^ 和 ~= 都在这个规则上划区间。',
    code: { lang: 'py', title: 'semver_check.py（节选，练习 2）', src: 'def parse(v):\n    return tuple(int(x) for x in v.split("."))\n\ndef caret(base):\n    major, minor, patch = parse(base)\n    if major > 0:   upper = (major + 1, 0, 0)\n    elif minor > 0: upper = (0, minor + 1, 0)\n    else:           upper = (0, 0, patch + 1)\n    return parse(base), upper' },
    dataTitle: '当前版本',
    data: { '版本': '1.2.3', '含义': '无' },
    bg: function (d) {
      d.text(430, 24, '语义化版本 SemVer：升级哪一段 = 承诺什么', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(380, 116, '.', { anchor: 'middle', size: 34, weight: 800, color: C.fg3 });
      d.text(480, 116, '.', { anchor: 'middle', size: 34, weight: 800, color: C.fg3 });
      [['MAJOR', '不兼容的改动'], ['MINOR', '新增功能·兼容'], ['PATCH', '只修 bug']].forEach(function (x, i) {
        d.text(SX[i], 156, x[0], { anchor: 'middle', size: 12, mono: true, weight: 700, color: C.fg2 });
        d.text(SX[i], 174, x[1], { anchor: 'middle', size: 11.5, color: C.fg3 });
      });
      d.line(RX0, RY, RX1, RY, { stroke: C.line, sw: 2 });
      d.line(40, 205, 820, 205, { stroke: C.line, sw: 1, dash: '3 5' });
      d.line(40, 365, 820, 365, { stroke: C.line, sw: 1, dash: '3 5' });
    },
    objects: sceneSemverObjs,
    steps: [
      { say: '版本号 1.2.3 由三段整数组成：MAJOR.MINOR.PATCH。', data: { '版本': '1.2.3' },
        set: { M: { opacity: { to: 1, dur: 250 }, s: { to: 1, dur: 500, ease: 'back' } }, m: { opacity: { to: 1, delay: 150, dur: 250 }, s: { to: 1, delay: 150, dur: 500, ease: 'back' } }, p: { opacity: { to: 1, delay: 300, dur: 250 }, s: { to: 1, delay: 300, dur: 500, ease: 'back' } } } },
      { say: '只修 bug：PATCH +1 → 1.2.4。用户放心升级，行为与之前完全一致。', data: { '版本': { v: '1.2.4', at: 500 }, '含义': '修 bug，完全兼容' },
        set: { p: { num: { to: 4, dur: 600 } } }, fx: [{ type: 'float', obj: 'p', at: 300, text: '+1', color: C.ok }, { type: 'pulse', obj: 'p', at: 650, color: C.ok }] },
      { say: '加了新功能，旧用法照常能用。MINOR +1，PATCH 归零，得到 1.3.0。视频里 ripgrep 从 15.0.0 升到 15.1.0，就是因为加了新功能。', data: { '版本': { v: '1.3.0', at: 700 }, '含义': '新功能，向后兼容' },
        set: { m: { num: { to: 3, dur: 600 } }, p: { num: { to: 0, delay: 200, dur: 600 } } }, fx: [{ type: 'float', obj: 'm', at: 300, text: '+1', color: C.data }, { type: 'pulse', obj: 'm', at: 650, color: C.data }] },
      { say: '有破坏性变更，以前能跑的代码可能跑不了。MAJOR +1，后两段归零，得到 2.0.0。所以很多依赖写“<2.0”，把主版本卡住。', data: { '版本': { v: '2.0.0', at: 700 }, '含义': '可能不兼容！' },
        set: { M: { num: { to: 2, dur: 600 } }, m: { num: { to: 0, delay: 200, dur: 600 } } }, fx: [{ type: 'float', obj: 'M', at: 300, text: '+1', color: C.bad }, { type: 'shake', obj: 'M', at: 700 }] },
      { say: '比较版本的陷阱：当成字符串逐字符比。第 3 个字符 "1" < "9"，于是得出 1.10.0 < 1.9.0。这是错的，本机实测过。', hl: [1, 2],
        eq: [{ s: '"1.10.0" vs "1.9.0"（字符串）', at: 100 }, { s: '第 1 字符 1 = 1，第 2 字符 . = .', at: 700 }, { s: "第 3 字符 '1'(49) < '9'(57) → 已分胜负", at: 1300 }, { s: '结论 1.10.0 < 1.9.0 ×', at: 1800, cls: 'bad' }],
        log: [{ s: '$ python semver_check.py', at: 100 }, { s: '字符串比较 "1.10.0" > "1.9.0" ? False', at: 1900, cls: 'err' }],
        set: { sa: { opacity: { to: 1, dur: 300 } }, sb: { opacity: { to: 1, delay: 100, dur: 300 } }, cur: { opacity: { to: 1, delay: 400, dur: 200 }, x: { to: 300 + 13.4 * 3.5, delay: 700, dur: 800, ease: 'inOut' } },
          verd: { text: '1.10.0 < 1.9.0 ？×', opacity: { to: 1, delay: 1800, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'cur', at: 1500 }] },
      { say: '正确做法：拆成整数元组逐段比较。(1, 10, 0) 对 (1, 9, 0)，第一段相等。第二段 10 > 9，所以 1.10.0 更新。', hl: [1, 2],
        eq: [{ s: '(1, 10, 0) vs (1, 9, 0)（整数元组）', at: 100 }, { s: '1 = 1，10 > 9 → 已分胜负', at: 700 }, { s: '结论 1.10.0 > 1.9.0 √', at: 1300, cls: 'ok' }],
        log: { s: '元组比较   (1, 10, 0) > (1, 9, 0) ? True', at: 1300, cls: 'ok' },
        set: { sa: { text: '(1, 10, 0)' }, sb: { text: '(1, 9, 0)' }, cur: { x: { from: 300 + 13.4 * 4.5, to: 300 + 13.4 * 4.5, dur: 0 }, w: { to: 30, dur: 300 }, stroke: { to: C.ok, dur: 300 }, fill: { to: C.okW, dur: 300 } },
          verd: { text: '1.10.0 > 1.9.0 √', color: { to: C.ok, dur: 0 } } },
        fx: [{ type: 'pulse', obj: 'cur', at: 800, color: C.ok }] },
      { say: '范围 ^1.2.3 是 npm 和 cargo 的写法。最左边的非零段是 MAJOR=1。所以允许升到下一个主版本之前，也就是 [1.2.3, 2.0.0)。', hl: [4, 5, 6, 9],
        eq: [{ s: '^1.2.3：最左非零段 = MAJOR(1)', at: 100 }, { s: '上界 = (1+1).0.0 = 2.0.0', at: 600 }, { s: '→ 1.2.3 ≤ v < 2.0.0', at: 1100, cls: 'ok' }],
        log: [{ s: '^1.2.3  =>  >=1.2.3, <2.0.0', at: 1100 }, { s: "^1.2.3  手写: ['1.2.4', '1.9.0']  packaging: ['1.2.4', '1.9.0']  一致: True", at: 2400 }],
        set: merge({ sa: { opacity: { to: 0.25, dur: 400 } }, sb: { opacity: { to: 0.25, dur: 400 } }, cur: { opacity: { to: 0, dur: 300 } }, verd: { opacity: { to: 0.25, dur: 300 } },
          rlab: { text: '^1.2.3  →  [1.2.3, 2.0.0)', opacity: { to: 1, delay: 1100, dur: 300 } },
          rng: { x: { to: (RC[1] + RC[3]) / 2 - 40, dur: 0 }, w: { to: RC[3] - RC[1] + 60, dur: 0 }, opacity: { to: 1, delay: 1100, dur: 400 } } },
          cand(['1.2.2', '1.2.4', '1.9.0', '2.0.0', ''], [1, 2], 1300)) },
      { say: '0.x 是特例。SemVer 规定，1.0 之前随时可能不兼容。所以 ^0.2.3 只到 0.3.0 之前。讲义说 0.1.3 升到 0.2.0 可能有破坏性变更，就是这个意思。', hl: [7],
        eq: [{ s: '^0.2.3：MAJOR=0，最左非零段 = MINOR(2)', at: 100 }, { s: '上界 = 0.(2+1).0 = 0.3.0', at: 600 }, { s: '→ 0.2.3 ≤ v < 0.3.0', at: 1100, cls: 'ok' }],
        log: [{ s: '^0.2.3  =>  >=0.2.3, <0.3.0', at: 1100 }, { s: "^0.2.3  手写: ['0.2.9']  packaging: ['0.2.9']  一致: True", at: 2200 }],
        set: merge({ rlab: { text: '^0.2.3  →  [0.2.3, 0.3.0)' }, rng: { x: { to: (RC[1] + RC[2]) / 2 - 10, delay: 300, dur: 600 }, w: { to: RC[2] - RC[1] + 40, delay: 300, dur: 600 } } },
          cand(['0.2.2', '0.2.9', '0.3.0', '1.0.0', ''], [1], 900)) },
      { say: 'Python 的兼容发布运算符是 ~=。~=2.1.0 的意思是 >=2.1.0 且 ==2.1.*。也就是 [2.1.0, 2.2.0)，大致对应别的生态里的 ^。讲义 pyproject 例子里的 pandas~=2.1.0 就是它。',
        eq: [{ s: '~=2.1.0 ≡ >=2.1.0, ==2.1.*', at: 100 }, { s: '→ 2.1.0 ≤ v < 2.2.0', at: 700, cls: 'ok' }],
        log: { s: "~=2.1.0 接受: ['2.1.0', '2.1.7']", at: 1800 },
        set: merge({ rlab: { text: '~=2.1.0  →  [2.1.0, 2.2.0)' }, rng: { x: { to: (RC[1] + RC[2]) / 2 - 10, dur: 0 }, w: { to: RC[2] - RC[1] + 40, dur: 0 } } },
          cand(['2.0.9', '2.1.0', '2.1.7', '2.2.0', ''], [1, 2], 600)) }
    ]
  };

  /* ---------- 场景 4：虚拟环境如何“接管” python ---------- */
  var PXc = 230, PY0 = 190, PS = 58;
  function sceneVenvObjs() {
    return {
      prompt: { type: 'text', x: 60, y: 70, anchor: 'start', text: '$', size: 18, mono: true, weight: 700, color: C.fg },
      pv: box(PXc, PY0 - PS, 250, 40, '<沙箱>/venv/Scripts', C.teal, C.tealW, { mono: true, size: 12.5, opacity: 0, x: PXc - 300 }),
      p0: box(PXc, PY0, 250, 40, '<Python>', C.data, C.dataW, { mono: true, size: 13 }),
      p1: box(PXc, PY0 + PS, 250, 40, '/usr/bin', C.data, C.dataW, { mono: true, size: 13 }),
      p2: box(PXc, PY0 + 2 * PS, 250, 40, '/bin', C.data, C.dataW, { mono: true, size: 13 }),
      ptr: box(PXc - 175, PY0, 76, 30, 'python', C.warn, C.warnW, { mono: true, rx: 15, size: 12.5, opacity: 0, trail: { n: 4, gap: 40 } }),
      venv: box(630, 205, 300, 190, '', C.teal, 'none', { rx: 12, sw: 1.8, dasharray: '6 4', opacity: 0, s: 0.85 }),
      vt: { type: 'text', x: 500, y: 128, anchor: 'start', text: 'venv/', size: 15, mono: true, weight: 800, color: C.teal, opacity: 0 },
      vs: { type: 'text', x: 512, y: 162, anchor: 'start', text: 'Scripts/  python  pip  activate', size: 12.5, mono: true, color: C.fg, opacity: 0 },
      vl: { type: 'text', x: 512, y: 196, anchor: 'start', text: 'Lib/site-packages/   （空）', size: 12.5, mono: true, color: C.fg, opacity: 0 },
      vc: { type: 'text', x: 512, y: 230, anchor: 'start', text: 'pyvenv.cfg  Include/', size: 12.5, mono: true, color: C.fg2, opacity: 0 },
      sp: box(630, 440, 330, 40, '<Python>\\Lib\\site-packages', C.info, C.infoW, { mono: true, size: 12.5 }),
      imp: box(630, 330, 150, 30, 'import requests', C.warn, C.warnW, { mono: true, size: 12, rx: 15, opacity: 0 }),
      act: { type: 'path', d: 'M505,162 C440,150 420,132 362,132', stroke: C.teal, sw: 1.8, dash: 0, arrow: 'data' },
      child: box(PXc, 470, 300, 60, '子进程：bash venv/Scripts/activate', C.warn, C.warnW, { size: 12.5, opacity: 0, s: 0.85 })
    };
  }
  function shiftPath(down, at) {
    var off = down ? PS : 0;
    return { p0: { y: { to: PY0 + off, delay: at || 0, dur: 600, ease: 'inOut' } }, p1: { y: { to: PY0 + PS + off, delay: (at || 0) + 60, dur: 600, ease: 'inOut' } }, p2: { y: { to: PY0 + 2 * PS + off, delay: (at || 0) + 120, dur: 600, ease: 'inOut' } } };
  }
  var sceneVenv = {
    name: '虚拟环境', desc: '虚拟环境没有魔法，它就是一个目录。激活脚本把它的 Scripts 插到 PATH 最前面，Linux 上是 bin。shell 找 python 时，就先找到它。',
    code: { lang: 'sh', title: '练习 1 的命令（本机 Git Bash 实测）', src: 'which python\npython -m venv venv\nsource venv/Scripts/activate\nwhich python\npython -c \'import sys; print(sys.prefix)\'\ndeactivate\nbash venv/Scripts/activate   # 易错' },
    dataTitle: '环境变量',
    data: { 'VIRTUAL_ENV': '（未设置）', 'PATH 第一项': '<Python>' },
    bg: function (d) {
      d.text(430, 24, '激活 = 修改当前 shell 的 PATH（以及 VIRTUAL_ENV、PS1）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(PXc, 108, '$PATH（从上往下找）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(630, 410, 'sys.path 里的 site-packages（import 从这里找包）', { anchor: 'middle', size: 11.5, color: C.fg3, weight: 600 });
    },
    objects: sceneVenvObjs,
    steps: [
      { say: '激活之前，PATH 里第一个有 python 的目录是全局 Python。本机把这个安装目录替换成了 <Python>。which python 沿 PATH 找，命中的就是它。', hl: [1],
        log: ['$ which python', { s: '<Python>/python', at: 1100 }],
        set: { ptr: { opacity: { to: 1, dur: 250 }, x: { to: PXc - 175, dur: 0 }, y: { from: PY0 - 40, to: PY0, delay: 200, dur: 600, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'p0', at: 900, color: C.ok }] },
      { say: 'python -m venv venv 只是新建了一个目录。里面有一份解释器、pip 和激活脚本，还有一个空的 site-packages。此时什么都还没变。', hl: [2],
        log: ['$ python -m venv venv', { s: '$ ls venv', at: 600 }, { s: 'Include  Lib  Scripts  pyvenv.cfg', at: 900 }],
        set: { ptr: { opacity: { to: 0, dur: 300 } }, venv: { opacity: { to: 1, dur: 400 }, s: { to: 1, dur: 500, ease: 'back' } },
          vt: { opacity: { to: 1, delay: 300, dur: 300 } }, vs: { opacity: { to: 1, delay: 500, dur: 300 } }, vl: { opacity: { to: 1, delay: 700, dur: 300 } }, vc: { opacity: { to: 1, delay: 900, dur: 300 } } } },
      { say: 'source venv/Scripts/activate 把 venv/Scripts 插到 PATH 最前面。原来的三项依次下移。它还设置了 VIRTUAL_ENV 和提示符前缀 (venv)。', hl: [3],
        log: ['$ bash envdiff.sh   # 激活前后 printenv 的差别', { s: '< PATH=<Python>:/usr/bin:/bin', at: 900 }, { s: '> PATH=<沙箱>/ex01/venv/Scripts:<Python>:/usr/bin:/bin', at: 1100 }, { s: '> PS1=(venv) ', at: 1300 }, { s: '> VIRTUAL_ENV=<沙箱>/ex01/venv', at: 1500 }, { s: '> VIRTUAL_ENV_PROMPT=venv', at: 1700 }],
        data: { 'VIRTUAL_ENV': { v: '<沙箱>/ex01/venv', at: 1500 }, 'PATH 第一项': { v: '<沙箱>/venv/Scripts', at: 1000 } },
        set: merge(shiftPath(true, 0), { act: { dash: { to: 1, dur: 400 } }, pv: { opacity: { to: 1, delay: 300, dur: 300 }, x: { to: PXc, delay: 300, dur: 800, ease: 'out' } }, prompt: { text: { to: '(venv) $', delay: 1300 }, color: { to: C.teal, delay: 1300, dur: 300 } } }),
        fx: [{ type: 'stream', path: 'act', at: 200, n: 2, dur: 800, color: C.teal, labels: ['venv/Scripts'] }, { type: 'ripple', obj: 'pv', at: 1100, color: C.teal }] },
      { say: 'which python 还是从上往下找。这次第一项就命中了 venv 里的 python。shell“偏爱”虚拟环境，原因就是它排在 PATH 最前面。', hl: [4],
        log: ['$ which python', { s: '<沙箱>/ex01/venv/Scripts/python', at: 1000, cls: 'ok' }],
        set: { ptr: { opacity: { to: 1, dur: 250 }, y: { from: PY0 - 2 * PS + 10, to: PY0 - PS, delay: 200, dur: 600, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'pv', at: 850, color: C.ok }] },
      { say: '用这个 python 运行时，sys.prefix 指向 venv。import 只在 venv 自己的 site-packages 里找。之前装在全局的 requests，在这里找不到（视频 8:27）。得在 venv 里重新装。', hl: [5],
        log: ["$ python -c 'import sys; print(sys.prefix)'", { s: '<沙箱>\\ex01\\venv', at: 700 }, { s: "['<沙箱>\\\\ex01\\\\venv\\\\Lib\\\\site-packages']", at: 900 }],
        set: { ptr: { opacity: { to: 0, dur: 300 } }, sp: { text: { to: '<沙箱>\\venv\\Lib\\site-packages', delay: 700 }, stroke: { to: C.teal, delay: 600, dur: 300 }, fill: { to: C.tealW, delay: 600, dur: 300 } },
          imp: { opacity: { to: 1, delay: 1100, dur: 250 }, y: { to: 418, delay: 1200, dur: 600, ease: 'in' }, stroke: { to: C.bad, delay: 1800, dur: 200 }, fill: { to: C.badW, delay: 1800, dur: 200 } } },
        fx: [{ type: 'flash', obj: 'sp', at: 700, color: C.teal }, { type: 'shake', obj: 'imp', at: 1850 }] },
      { say: 'deactivate 把 PATH 恢复原样。它不是程序，是激活时定义的 shell 函数。所以 which 找不到它，type 才看得到。这就是练习 1 问的那件事。', hl: [6],
        log: ['$ which deactivate', { s: 'which: no deactivate in (<沙箱>/ex01/venv/Scripts:<Python>:/usr/bin:/bin)', at: 400, cls: 'err' }, { s: '$ type deactivate | head -14', at: 900 }, { s: 'deactivate is a function', at: 1100 }, { s: '…（函数体略）', at: 1200, cls: 'dim' }, { s: '$ deactivate; which python', at: 1500 }, { s: '<Python>/python', at: 2300 }],
        data: { 'VIRTUAL_ENV': { v: '（已取消）', at: 1600 }, 'PATH 第一项': { v: '<Python>', at: 1800 } },
        set: merge(shiftPath(false, 1700), { act: { dash: { to: 0, delay: 1400, dur: 300 } }, imp: { opacity: { to: 0, dur: 300 } }, pv: { x: { to: PXc - 300, delay: 1500, dur: 700, ease: 'in' }, opacity: { to: 0, delay: 1900, dur: 300 } },
          prompt: { text: { to: '$', delay: 1600 }, color: { to: C.fg, delay: 1600, dur: 300 } }, sp: { text: { to: '<Python>\\Lib\\site-packages', delay: 1800 }, stroke: { to: C.info, delay: 1800, dur: 300 }, fill: { to: C.infoW, delay: 1800, dur: 300 } } }) },
      { say: '易错：bash venv/Scripts/activate 是在子进程里执行脚本。子进程的 PATH 被改了，随后它退出。当前 shell 毫无变化。道理和第 1 讲 cd 必须内建一样。必须用 source。', hl: [7],
        log: ['$ bash venv/Scripts/activate; which python', { s: 'bash 运行之后：<Python>/python', at: 1700, cls: 'err' }, { s: '$ source venv/Scripts/activate; which python', at: 2100 }, { s: 'source 之后：  <沙箱>/ex01/venv/Scripts/python', at: 2500, cls: 'ok' }],
        set: { child: { opacity: { to: 1, dur: 300 }, s: { to: 1, dur: 500, ease: 'back' }, text: { to: '子进程退出，改动随之消失', delay: 1300 } } },
        fx: [{ type: 'burst', obj: 'child', at: 1300, color: C.warn }, { type: 'pulse', obj: 'p0', at: 1700, color: C.data }] }
    ]
  };

  var NOTES = 'https://missing.csail.mit.edu/2026/shipping-code/';
  VZ.register({
    id: 'ch06-install', title: 'pip install 背后的四步：查找、选构件、解析依赖、安装',
    sources: [
      { t: '视频 2:06 pip install', u: 'https://youtu.be/KBMiB-8P4Ns?t=126' },
      { t: '视频 3:47 递归安装依赖', u: 'https://youtu.be/KBMiB-8P4Ns?t=227' },
      { t: '讲义 Dependencies & Environments', u: NOTES + '#dependencies--environments' }
    ],
    note: '控制台内容全部是讲义原文，是 Linux 上的 pip 输出。选版本时的范围校验，是照讲义输出里的约束手推的。',
    scenes: [sceneInstall]
  });
  VZ.register({
    id: 'ch06-venv', title: '依赖冲突与虚拟环境：为什么要隔离，隔离怎么生效',
    sources: [
      { t: '视频 6:18 依赖冲突', u: 'https://youtu.be/KBMiB-8P4Ns?t=378' },
      { t: '视频 7:52 虚拟环境', u: 'https://youtu.be/KBMiB-8P4Ns?t=472' },
      { t: '视频 10:19 venv 只是一个目录', u: 'https://youtu.be/KBMiB-8P4Ns?t=619' },
      { t: '讲义 Dependencies & Environments', u: NOTES + '#dependencies--environments' }
    ],
    note: '输出取自练习 1、2 的真跑结果。环境是本机 Git Bash 加 uv 0.11.26。Windows 上 venv 的脚本目录叫 Scripts，路径已换成占位符。numpy 数轴上版本点的间距是示意。',
    scenes: [sceneSolve, sceneVenv]
  });
  VZ.register({
    id: 'ch06-semver', title: '语义化版本：升级承诺、整数比较与 ^ / ~= 范围',
    sources: [
      { t: '视频 23:29 语义化版本', u: 'https://youtu.be/KBMiB-8P4Ns?t=1409' },
      { t: '讲义 Releases & Versioning', u: NOTES + '#releases--versioning' },
      { t: 'semver.org', u: 'https://semver.org/' },
      { t: 'PEP 440 版本说明符', u: 'https://peps.python.org/pep-0440/' }
    ],
    note: '控制台是练习 2 的 semver_check.py 本机实测输出。手写实现和 packaging 库做了交叉验证。候选版本是挑来演示边界的示例。',
    scenes: [sceneSemver]
  });
})();
