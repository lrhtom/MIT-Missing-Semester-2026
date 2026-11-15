/* ch06 · 构件、锁文件与发布 —— 可视化演示
 * 依据：Lecture 6 视频 17:45–21:29（预编译二进制、wheel）、27:24–29:58（锁文件与哈希）、54:30–1:02:18（发布）；
 *       讲义 shipping-code.md 的 Artifacts & Packaging、Reproducibility、Publishing。
 * 实测：uv build / unzip / uv lock / sha256sum / uv sync --locked / uv publish --dry-run 的输出取自 labs/data/lab06.js
 *       （本机 Git Bash + uv 0.11.26 真跑）。“下载后校验哈希”“篡改被拒”两步是按 uv 文档的行为画的示意，未构造真实篡改。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 9, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 13, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }

  /* ---------- 场景 1：wheel 长什么样 ---------- */
  var ENT = [['greeting.py', 155], ['…dist-info/METADATA', 118], ['…dist-info/WHEEL', 91], ['…dist-info/entry_points.txt', 39], ['…dist-info/top_level.txt', 9], ['…dist-info/RECORD', 463]];
  var SEG = [['greeting', '名字'], ['0.1.0', '版本'], ['py3', 'Python 标签'], ['none', 'ABI 标签'], ['any', '平台标签']];
  var SEGX = [150, 300, 430, 545, 660], SEGY = 492;
  var SEG2 = ['numpy', '2.2.1', 'cp312', 'cp312', 'macosx_14_0_arm64'];
  function wheelObjs() {
    var o = {
      py: box(120, 120, 150, 32, 'greeting.py', C.teal, C.tealW, { mono: true, size: 12.5 }),
      pt: box(120, 166, 150, 32, 'pyproject.toml', C.teal, C.tealW, { mono: true, size: 12.5 }),
      be: box(400, 143, 210, 56, 'setuptools.build_meta', C.info, C.infoW, { mono: true, size: 12.5, opacity: 0.35 }),
      q1: path('M196,143 L294,143', C.teal),
      q2: path('M506,130 C580,110 600,100 640,100', C.data),
      q3: path('M506,156 C580,176 600,186 640,186', C.data),
      sd: box(735, 100, 190, 30, 'greeting-0.1.0.tar.gz', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      wh: box(735, 186, 222, 30, 'greeting-0.1.0-py3-none-any.whl', C.ok, C.okW, { mono: true, size: 10.5, opacity: 0 }),
      tot: { type: 'text', x: 735, y: 400, num: 0, pre: '合计 ', post: ' 字节 · 6 个文件', size: 13, weight: 700, mono: true, color: C.fg, opacity: 0 }
    };
    ENT.forEach(function (e, i) {
      o['f' + i] = box(735, 186, 210, 24, e[0] + '  ' + e[1], i === 0 ? C.teal : C.line, i === 0 ? C.tealW : C.bg2, { mono: true, size: 11, weight: 600, opacity: 0, rx: 5 });
    });
    SEG.forEach(function (s, i) {
      o['s' + i] = box(430, SEGY, i === 4 ? 96 : 90, 30, s[0], C.warn, C.warnW, { mono: true, size: 13, opacity: 0 });
      o['sl' + i] = { type: 'text', x: SEGX[i], y: SEGY + 30, text: s[1], size: 11.5, color: C.fg3, opacity: 0 };
    });
    return o;
  }
  var sceneWheel = {
    name: 'wheel 构件', desc: 'uv build 按 pyproject.toml，把源码变成两个构件：源码包 sdist 和 wheel。wheel 就是一个按约定排好文件的 zip。文件名写明了它能装在哪里。',
    code: { lang: 'yaml', title: 'pyproject.toml（讲义原文）', src: '[project]\nname = "greeting"\nversion = "0.1.0"\ndescription = "A simple greeting library"\ndependencies = ["typer>=0.9"]\n\n[project.scripts]\ngreet = "greeting:cli"\n\n[build-system]\nrequires = ["setuptools>=61.0"]\nbuild-backend = "setuptools.build_meta"' },
    dataTitle: '构件',
    data: { 'dist/ 里的文件': 0, '当前文件名': '无' },
    bg: function (d) {
      d.text(430, 24, '源码 → 构建后端 → 构件（artifact）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(120, 86, 'greeting/（源码）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.text(735, 62, 'dist/（构件）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.line(40, 440, 820, 440, { stroke: C.line, sw: 1, dash: '3 5' });
      d.text(40, 458, 'wheel 文件名 = 名字-版本-Python标签-ABI标签-平台标签.whl', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: wheelObjs,
    steps: [
      { say: 'uv build 先读 [build-system]。它在一个隔离的临时环境里，装好构建时依赖 setuptools。再调用它的构建接口，也就是 PEP 517。', hl: [10, 11, 12],
        log: ['$ uv build', { s: 'Building source distribution...', at: 1300 }],
        set: { q1: { dash: { to: 1, dur: 500 } }, be: { opacity: { to: 1, delay: 400, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'pt', at: 100, color: C.teal }, { type: 'stream', path: 'q1', at: 300, n: 3, dur: 900, color: C.teal, labels: ['.toml', '.py'] }, { type: 'pulse', obj: 'be', at: 1200, color: C.info }] },
      { say: '先打出源码包 sdist，也就是 .tar.gz。它留给需要从源码构建的系统。再从 sdist 构建出 wheel，这是本机实测。',
        log: [{ s: 'Building wheel from source distribution...', at: 300 }, { s: 'Successfully built dist\\greeting-0.1.0.tar.gz', at: 1000 }, { s: 'Successfully built dist\\greeting-0.1.0-py3-none-any.whl', at: 1700 }],
        data: { 'dist/ 里的文件': { v: 2, at: 1700 }, '当前文件名': 'greeting-0.1.0-py3-none-any.whl' },
        set: { q2: { dash: { to: 1, delay: 200, dur: 500 } }, q3: { dash: { to: 1, delay: 900, dur: 500 } },
          sd: { opacity: { to: 1, delay: 700, dur: 250 }, x: { from: 620, to: 735, delay: 700, dur: 500, ease: 'out' } },
          wh: { opacity: { to: 1, delay: 1400, dur: 250 }, x: { from: 620, to: 735, delay: 1400, dur: 500, ease: 'out' } } },
        fx: [{ type: 'stream', path: 'q2', at: 200, n: 2, dur: 700, color: C.data }, { type: 'stream', path: 'q3', at: 900, n: 2, dur: 700, color: C.ok }, { type: 'ripple', obj: 'wh', at: 1800, color: C.ok }] },
      { say: 'wheel 没什么神秘的，就是 zip。unzip -l 列出 6 个文件，这是本机实测。代码 greeting.py 只有 155 字节。其余都是给安装器看的元数据。',
        log: ['$ unzip -l dist/greeting-0.1.0-py3-none-any.whl', { s: '      155  greeting.py', at: 500 }, { s: '      118  greeting-0.1.0.dist-info/METADATA', at: 700 }, { s: '       91  greeting-0.1.0.dist-info/WHEEL', at: 900 }, { s: '       39  greeting-0.1.0.dist-info/entry_points.txt', at: 1100 }, { s: '        9  greeting-0.1.0.dist-info/top_level.txt', at: 1300 }, { s: '      463  greeting-0.1.0.dist-info/RECORD', at: 1500 }, { s: '      875                     6 files', at: 1800 }],
        set: (function () {
          var s = { tot: { opacity: { to: 1, delay: 400, dur: 300 }, num: { to: 875, delay: 500, dur: 1400, ease: 'linear' } } };
          ENT.forEach(function (e, i) { s['f' + i] = { opacity: { to: 1, delay: 400 + i * 200, dur: 200 }, y: { to: 228 + i * 28, delay: 400 + i * 200, dur: 500, ease: 'back' } }; });
          return s;
        })() },
      { say: 'METADATA 记着名字、版本和 Requires-Dist，也就是依赖范围。安装器靠它递归解析依赖。entry_points.txt 记下了“装好后生成 greet 命令”。', hl: [5, 8],
        log: ['$ unzip -p dist/…whl greeting-0.1.0.dist-info/METADATA', { s: 'Metadata-Version: 2.4', at: 400 }, { s: 'Name: greeting', at: 550 }, { s: 'Version: 0.1.0', at: 700 }, { s: 'Summary: A simple greeting library', at: 850 }, { s: 'Requires-Dist: typer>=0.9', at: 1000 }],
        set: { f1: { stroke: { to: C.data, dur: 300 }, fill: { to: C.dataW, dur: 300 } }, f3: { stroke: { to: C.data, delay: 1200, dur: 300 }, fill: { to: C.dataW, delay: 1200, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'f1', at: 300, color: C.data }, { type: 'pulse', obj: 'f3', at: 1300, color: C.data }] },
      { say: '文件名本身就声明了适用范围。py3-none-any 有三层意思。任何 Python 3 都行，不依赖特定 ABI，任何系统和 CPU 都行。纯 Python 包，一个 wheel 走天下。',
        eq: [{ s: 'greeting-0.1.0-py3-none-any.whl 按 “-” 切开：', at: 100 }, { s: 'py3  → 任何 Python 3', at: 900 }, { s: 'none → 不依赖 C 扩展 ABI', at: 1200 }, { s: 'any  → 任何平台', at: 1500, cls: 'ok' }],
        set: (function () {
          var s = {};
          SEG.forEach(function (x, i) {
            s['s' + i] = { opacity: { to: 1, delay: 200, dur: 200 }, x: { to: SEGX[i], delay: 300 + i * 80, dur: 650, ease: 'back' } };
            s['sl' + i] = { opacity: { to: 1, delay: 800 + i * 80, dur: 300 } };
          });
          return s;
        })() },
      { say: '含编译代码的包就不一样了。讲义里 numpy 的 wheel 标签是 cp312-cp312-macosx_14_0_arm64：只能装在 macOS 14+、Apple Silicon 上的 CPython 3.12。别的平台会换一个 wheel，或从源码编译。',
        eq: [{ s: 'numpy-2.2.1-cp312-cp312-macosx_14_0_arm64.whl：', at: 100 }, { s: 'cp312 → 只给 CPython 3.12', at: 700 }, { s: 'cp312 → 用 CPython 3.12 的 C ABI', at: 1000 }, { s: 'macosx_14_0_arm64 → macOS 14+，ARM64', at: 1300, cls: 'warn' }],
        log: ["$ uv pip install numpy --verbose --no-cache 2>&1 | grep -F '.whl'   # 讲义原文", { s: 'DEBUG Selecting: numpy==2.2.1 [compatible] (numpy-2.2.1-cp312-cp312-macosx_14_0_arm64.whl)', at: 900 }],
        data: { '当前文件名': 'numpy-2.2.1-cp312-cp312-macosx_14_0_arm64.whl' },
        set: (function () {
          var s = {};
          SEG2.forEach(function (t, i) { s['s' + i] = { text: { to: t, delay: 200 + i * 120 }, w: { to: i === 4 ? 180 : 90, delay: 200, dur: 400 }, x: { to: i === 4 ? 700 : SEGX[i], delay: 200, dur: 400 }, stroke: { to: i >= 2 ? C.bad : C.warn, delay: 600, dur: 300 }, fill: { to: i >= 2 ? C.badW : C.warnW, delay: 600, dur: 300 } }; });
          s.sl4 = { x: { to: 700, delay: 200, dur: 400 } };
          return s;
        })(),
        fx: [{ type: 'shake', obj: 's4', at: 1400 }] },
      { say: '把 wheel 这一个文件交给别人，让他 uv pip install。依赖会按 METADATA 自动补齐，还会生成 greet 命令。',
        log: ['$ uv pip install ./greeting-0.1.0-py3-none-any.whl', '$ greet Alice', { s: 'Hello, Alice!', at: 900, cls: 'ok' }],
        data: { '当前文件名': 'greeting-0.1.0-py3-none-any.whl' },
        set: (function () {
          var s = {};
          SEG.forEach(function (x, i) { s['s' + i] = { text: x[0], w: { to: i === 4 ? 96 : 90, dur: 300 }, x: { to: SEGX[i], dur: 300 }, stroke: { to: C.ok, dur: 300 }, fill: { to: C.okW, dur: 300 } }; });
          s.sl4 = { x: { to: SEGX[4], dur: 300 } };
          return s;
        })(),
        fx: [{ type: 'ripple', obj: 'wh', at: 600, color: C.ok }, { type: 'burst', obj: 'wh', at: 900, color: C.ok }] }
    ]
  };

  /* ---------- 场景 2：锁文件、哈希与可复现构建 ---------- */
  var PK = [['annotated-doc', '0.0.5'], ['colorama', '0.4.6'], ['greeting', '0.1.0'], ['markdown-it-py', '4.2.0'], ['mdurl', '0.1.2'], ['pygments', '2.21.0'], ['rich', '15.0.0'], ['shellingham', '1.5.4'], ['typer', '0.27.3']];
  var LX = 650, LY0 = 92, LS = 27;
  function lockObjs() {
    var o = {
      spec: box(130, 110, 170, 34, 'typer>=0.9', C.data, C.dataW, { mono: true, size: 14 }),
      res: box(330, 110, 120, 44, 'uv lock', C.info, C.infoW, { mono: true, size: 14 }),
      qa: path('M216,110 L268,110', C.data),
      qb: path('M392,110 C450,110 480,100 528,100', C.info),
      file: box(LX, 380, 170, 36, 'annotated_doc…whl', C.teal, C.tealW, { mono: true, size: 11.5, opacity: 0 }),
      hsh: box(LX, 380, 250, 30, '', C.warn, C.warnW, { mono: true, size: 11.5, opacity: 0 }),
      chk: { type: 'text', x: LX + 160, y: 380, text: '', size: 22, weight: 800, color: C.ok, opacity: 0 },
      w1: box(170, 482, 290, 30, '', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      w2: box(170, 522, 290, 30, '', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      w3: box(530, 482, 290, 30, '', C.ok, C.okW, { mono: true, size: 11.5, opacity: 0 }),
      w4: box(530, 522, 290, 30, '', C.ok, C.okW, { mono: true, size: 11.5, opacity: 0 })
    };
    PK.forEach(function (p, i) { o['k' + i] = box(LX, LY0 + i * LS, 250, 22, p[0] + ' == ' + p[1], i === 8 ? C.info : C.line, i === 8 ? C.infoW : C.bg2, { mono: true, size: 11.5, weight: 600, opacity: 0, rx: 4 }); });
    return o;
  }
  var sceneLock = {
    name: '锁文件与哈希', desc: 'pyproject.toml 写范围。uv.lock 把整棵依赖树的每个包都钉死。确切版本、下载地址和 sha256 哈希，全都记下。别人照着锁文件装，拿到的字节和你测试时一模一样。',
    code: { lang: 'yaml', title: 'uv.lock 里 typer 的条目（本机实测，长 URL 截断）', src: '[[package]]\nname = "typer"\nversion = "0.27.3"\nsource = { registry = "https://pypi.org/simple" }\ndependencies = [\n    { name = "annotated-doc" },\n    { name = "colorama", marker = "sys_platform == \'win32\'" },\n    { name = "rich" },\n    { name = "shellingham" },\n]\nsdist = { url = "https://files.pythonhosted.org/…", hash = "sha256:…" }\nwheels = [\n    { url = "https://files.pythonhosted.org/…", hash = "sha256:…" },\n]' },
    dataTitle: '锁定状态',
    data: { '锁定的包': 0, 'typer 版本': '范围 >=0.9' },
    bg: function (d) {
      d.text(430, 24, '范围（pyproject）→ 解析 → 精确版本 + 哈希（uv.lock）', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(LX, 66, 'uv.lock（99 行）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
      d.line(40, 432, 820, 432, { stroke: C.line, sw: 1, dash: '3 5' });
      d.text(40, 448, '构件本身能逐字节复现吗？（练习 2 · ex02-e，本机实测）', { size: 12, color: C.fg3, weight: 600 });
    },
    objects: lockObjs,
    steps: [
      { say: 'pyproject.toml 里只写了范围 typer>=0.9。uv lock 把它连同所有传递依赖，解析成 9 个确切版本。结果写进 uv.lock，这是本机实测。', hl: [1, 2, 3],
        log: ['$ uv lock', { s: 'Resolved 9 packages in 426ms', at: 1200 }, { s: '$ wc -l uv.lock', at: 2600 }, { s: '99 uv.lock', at: 2800 }],
        data: { '锁定的包': { v: 9, at: 2600 } },
        set: (function () { var s = { qa: { dash: { to: 1, dur: 400 } }, qb: { dash: { to: 1, delay: 500, dur: 400 } } }; PK.forEach(function (p, i) { s['k' + i] = { opacity: { to: 1, delay: 900 + i * 180, dur: 200 }, x: { from: LX - 80, to: LX, delay: 900 + i * 180, dur: 400, ease: 'out' } }; }); return s; })(),
        fx: [{ type: 'stream', path: 'qa', at: 100, n: 1, dur: 500, color: C.data, labels: ['>=0.9'] }, { type: 'pulse', obj: 'res', at: 600, color: C.info }, { type: 'stream', path: 'qb', at: 700, n: 5, dur: 900, color: C.info }] },
      { say: '范围 >=0.9 被锁成了当天的最新版 0.27.3。视频录制时，锁到的是 0.21.1。每个条目还记下下载地址和 sha256 哈希。锁文件是写给机器看的。', hl: [2, 3, 11, 12, 13],
        eq: [{ s: 'typer：>=0.9 → 0.27.3（今天的最新版）', at: 300 }, { s: '视频里同一行写的是 0.21.1', at: 900 }, { s: '→ 不锁定，不同时间安装结果不同', at: 1500, cls: 'warn' }],
        data: { 'typer 版本': { v: '0.27.3（已锁定）', at: 300 } },
        set: { k8: { w: { to: 270, dur: 300 } } }, fx: [{ type: 'pulse', obj: 'k8', at: 200, color: C.info }, { type: 'pulse', obj: 'spec', at: 1000, color: C.warn }] },
      { say: '别人运行 uv sync 时，按锁文件下载。拿到文件先算 sha256，再和锁文件里记的值比对。一致才安装。这一步是示意，哈希取自本机 uv.lock 里 annotated-doc 的 wheel。',
        eq: [{ s: '锁文件：sha256:117bac03…fed4b101', at: 900 }, { s: '下载后计算：sha256:117bac03…fed4b101', at: 1500 }, { s: '相等 → 安装', at: 2000, cls: 'ok' }],
        set: { file: { opacity: { to: 1, dur: 250 }, y: { from: 300, to: 380, dur: 600, ease: 'out' } }, hsh: { text: 'sha256:117bac03…fed4b101', opacity: { to: 1, delay: 900, dur: 300 }, x: { from: LX, to: LX - 230, delay: 900, dur: 500 } },
          chk: { text: '√', color: { to: C.ok, dur: 0 }, opacity: { to: 1, delay: 2000, dur: 200 } } },
        fx: [{ type: 'pulse', obj: 'k0', at: 800, color: C.warn }, { type: 'burst', obj: 'chk', at: 2000, color: C.ok }] },
      { say: '要是下载到的文件被替换或损坏，sha256 就完全不同。哪怕只差一个字节也一样。安装会被拒绝，这一步是示意。这正是讲义说的“用校验和验证完整性”。',
        eq: [{ s: '下载后计算：sha256:5c1e93…（示意）', at: 600 }, { s: '≠ 锁文件记录 → 拒绝安装', at: 1200, cls: 'bad' }],
        set: { file: { stroke: { to: C.bad, delay: 200, dur: 300 }, fill: { to: C.badW, delay: 200, dur: 300 } }, chk: { text: { to: '×', delay: 1200 }, color: { to: C.bad, delay: 1200, dur: 0 } } },
        fx: [{ type: 'shake', obj: 'file', at: 1200 }] },
      { say: '再问一步：构件本身能逐字节复现吗？同一份源码，只改文件修改时间，构建两次。wheel 的 sha256 完全不同，因为 zip 里记着文件时间。',
        eq: [{ s: 'w1：2ace89ce…（源码时间 01-01）', at: 700 }, { s: 'w2：4866bd92…（源码时间 02-01）', at: 1300 }, { s: '内容相同，哈希不同 ×', at: 1800, cls: 'bad' }],
        log: [{ s: "$ touch -d '2026-01-01 12:00' greeting.py && uv build -q --wheel -o ../w1", at: 100 }, { s: "$ touch -d '2026-02-01 12:00' greeting.py && uv build -q --wheel -o ../w2", at: 300 }, { s: '2ace89ce6f47ce64…  ../w1/greeting-0.1.0-py3-none-any.whl', at: 800 }, { s: '4866bd92707c7ac6…  ../w2/greeting-0.1.0-py3-none-any.whl', at: 1300 }],
        set: { file: { opacity: { to: 0, dur: 300 } }, hsh: { opacity: { to: 0, dur: 300 } }, chk: { opacity: { to: 0, dur: 300 } },
          w1: { text: 'w1  sha256 2ace89ce…', opacity: { to: 1, delay: 600, dur: 300 } }, w2: { text: 'w2  sha256 4866bd92…', opacity: { to: 1, delay: 1200, dur: 300 }, stroke: { to: C.bad, delay: 1700, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'w2', at: 1800 }] },
      { say: '设置 SOURCE_DATE_EPOCH，把打包时间固定下来，再构建两次。修改时间不同，输出目录不同，哈希却一字不差。两次都是 f247708a…。这就是“可复现构建”的最小例子。',
        eq: [{ s: 'export SOURCE_DATE_EPOCH=1767225600', at: 100 }, { s: 'w3：f247708a…', at: 800 }, { s: 'w4：f247708a…', at: 1300 }, { s: '逐字节相同 √', at: 1700, cls: 'ok' }],
        log: [{ s: '$ export SOURCE_DATE_EPOCH=1767225600', at: 100 }, { s: 'f247708af9632194…  ../w3/greeting-0.1.0-py3-none-any.whl', at: 800 }, { s: 'f247708af9632194…  ../w4/greeting-0.1.0-py3-none-any.whl', at: 1300, cls: 'ok' }],
        set: { w3: { text: 'w3  sha256 f247708a…', opacity: { to: 1, delay: 700, dur: 300 } }, w4: { text: 'w4  sha256 f247708a…', opacity: { to: 1, delay: 1200, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'w4', at: 1700, color: C.ok }] },
      { say: '锁文件要和 pyproject 同步。把约束改成 typer>=0.9,<0.20，却不重新 lock。uv sync --locked 会拒绝执行，不会悄悄装上别的版本。这是本机实测。',
        log: ["$ sed -i 's/\"typer>=0.9\"/\"typer>=0.9,<0.20\"/' pyproject.toml", '$ uv sync --locked', { s: 'The lockfile at `uv.lock` needs to be updated, but `--locked` was provided. To update the lockfile, run `uv lock`.', at: 1200, cls: 'err' }],
        data: { 'typer 版本': { v: '范围已改，锁文件过期', at: 600 } },
        set: { spec: { text: { to: 'typer>=0.9,<0.20', delay: 300 }, w: { to: 190, delay: 300, dur: 300 }, stroke: { to: C.warn, delay: 300, dur: 300 } }, k8: { stroke: { to: C.bad, delay: 1100, dur: 300 }, fill: { to: C.badW, delay: 1100, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'k8', at: 1200 }] }
    ]
  };

  /* ---------- 场景 3：发布 ---------- */
  function pubObjs() {
    return {
      dev: box(110, 150, 170, 60, '你的电脑：dist/', C.teal, C.tealW, { size: 13 }),
      reg1: box(430, 100, 200, 44, 'TestPyPI / PyPI', C.info, C.infoW, { opacity: 0.35 }),
      reg2: box(430, 200, 200, 44, 'GitHub Releases', C.info, C.infoW, { opacity: 0.35 }),
      reg3: box(430, 300, 200, 44, 'Docker Hub / ghcr.io', C.info, C.infoW, { opacity: 0.35 }),
      reg4: box(430, 400, 200, 44, '源码仓库（Go 模块）', C.info, C.infoW, { opacity: 0.35 }),
      user: box(760, 250, 140, 60, '用户', C.data, C.dataW, { size: 14 }),
      u1: path('M196,140 C280,120 300,100 328,100', C.teal),
      u2: path('M196,160 C280,190 300,200 328,200', C.teal),
      u3: path('M196,175 C260,260 290,300 328,300', C.teal),
      d1: path('M532,100 C620,110 640,200 690,236', C.data),
      d2: path('M532,200 C620,210 640,230 690,246', C.data),
      d3: path('M532,300 C620,290 640,270 690,258', C.data),
      d4: path('M532,400 C620,380 650,300 690,270', C.data),
      lock: { type: 'text', x: 430, y: 66, text: '', size: 12, color: C.warn, weight: 700, opacity: 0 },
      sum: box(430, 492, 520, 34, '', C.ok, C.okW, { mono: true, size: 11.5, opacity: 0 })
    };
  }
  var scenePublish = {
    name: '发布', desc: '发布就是把构件放到别人能找到、能验证的地方。可以是包索引、GitHub Releases、容器镜像仓库。Go 则直接用源码仓库。',
    code: { lang: 'sh', title: '各种发布与安装方式（讲义 / 视频）', src: 'uv build\nuv publish --publish-url https://test.pypi.org/legacy/\nuv pip install --index-url https://test.pypi.org/simple/ greeting\npip install git+https://github.com/psf/requests.git@v2.32.3\ndocker tag greet 你的用户名/greet\ndocker push 你的用户名/greet\ngo get github.com/gorilla/mux' },
    dataTitle: '发布状态',
    data: { '构件': 'wheel + sdist', '目的地': '无' },
    bg: function (d) {
      d.text(430, 24, '构件从你的电脑出发，经由“仓库”到达用户', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: pubObjs,
    steps: [
      { hl: [1], say: '最朴素的发布：把文件放到一个能下载的地方。Ubuntu 的软件包仓库就是这样（视频 55:08）。它本质上是一个装满 .deb 文件的 HTTP 目录。',
        set: { reg2: { opacity: { to: 1, dur: 300 } }, u2: { dash: { to: 1, delay: 200, dur: 500 } }, d2: { dash: { to: 1, delay: 900, dur: 500 } } },
        data: { '目的地': '下载站 / GitHub Releases' },
        fx: [{ type: 'stream', path: 'u2', at: 200, n: 2, dur: 700, color: C.teal, labels: ['.whl'] }, { type: 'stream', path: 'd2', at: 900, n: 2, dur: 700, color: C.data }] },
      { hl: [4], say: 'GitHub 是事实上的发布平台。Releases 给打了标签的版本挂上预编译好的文件，比如 ripgrep。pip 也能直接从 GitHub 装。git+https://… 会克隆源码，现场构建 wheel。',
        log: ['$ pip install git+https://github.com/psf/requests.git', '$ pip install git+https://github.com/psf/requests.git@v2.32.3', '# 讲义原文', ],
        fx: [{ type: 'pulse', obj: 'reg2', at: 300, color: C.info }, { type: 'stream', path: 'd2', at: 600, n: 3, dur: 900, color: C.data, labels: ['src'] }] },
      { hl: [2], say: '包索引：uv publish 把 wheel 和 sdist 上传到 PyPI。练习时用 TestPyPI，免得污染正式索引。本机只跑了 --dry-run（真上传需要账号和 token）。',
        log: ['$ uv publish --dry-run --trusted-publishing never --publish-url https://test.pypi.org/legacy/ dist/*', { s: 'Checking 2 files against https://test.pypi.org/legacy/', at: 600 }, { s: 'Checking greeting-0.1.0-py3-none-any.whl (1.5KiB)', at: 900 }, { s: 'Uploading greeting-0.1.0-py3-none-any.whl (1.5KiB)', at: 1100 }, { s: 'Checking greeting-0.1.0.tar.gz (1.0KiB)', at: 1300 }, { s: 'Uploading greeting-0.1.0.tar.gz (1.0KiB)', at: 1500 }, { s: '# --dry-run：不会真的上传', at: 1800, cls: 'dim' }],
        data: { '目的地': 'TestPyPI（dry-run）' },
        set: { reg1: { opacity: { to: 1, dur: 300 } }, u1: { dash: { to: 1, delay: 200, dur: 500 } } },
        fx: [{ type: 'stream', path: 'u1', at: 600, n: 2, dur: 900, color: C.teal, labels: ['.whl', '.tar.gz'] }, { type: 'ripple', obj: 'reg1', at: 1600, color: C.info }] },
      { hl: [3], say: '用户安装时，索引给出文件和它的校验和。安装器下载后核对。这是“信任”问题的第一道防线。有的生态还支持签名，证明包确实出自你手（讲义）。',
        log: ['$ uv pip install --index-url https://test.pypi.org/simple/ greeting   # 讲义原文'],
        set: { d1: { dash: { to: 1, dur: 500 } }, sum: { text: 'sha256  c1eb3513…  greeting-0.1.0-py3-none-any.whl（本机 sha256sum）', opacity: { to: 1, delay: 900, dur: 300 } } },
        fx: [{ type: 'stream', path: 'd1', at: 300, n: 2, dur: 900, color: C.data, labels: ['.whl', 'sha256'] }, { type: 'ripple', obj: 'user', at: 1300, color: C.ok }] },
      { hl: [5, 6], say: '容器镜像同理。先 docker tag 成“你的用户名/镜像名”，再 docker push 到镜像仓库。别人认证后 docker pull，就拿到了整个文件系统。视频 59:23 和 1:01:47 讲了这一段。本机 Docker 不可用，未实测。',
        log: ['$ docker tag greet 你的用户名/greet', '$ docker push 你的用户名/greet', '# 未实测：本机 Docker Desktop 无法启动', ],
        data: { '目的地': 'Docker Hub / ghcr.io' },
        set: { reg3: { opacity: { to: 1, dur: 300 } }, u3: { dash: { to: 1, delay: 200, dur: 500 } }, d3: { dash: { to: 1, delay: 900, dur: 500 } }, lock: { text: '推送需要登录：只能推到你有权限的命名空间', opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'stream', path: 'u3', at: 200, n: 4, dur: 900, color: C.teal, labels: ['layer', 'layer', 'layer', 'layer'] }, { type: 'stream', path: 'd3', at: 1000, n: 4, dur: 900, color: C.data, labels: ['layer'] }] },
      { hl: [7], say: 'Go 走的是去中心化路线，没有中央索引（讲义）。模块路径 github.com/gorilla/mux 本身就写明了代码在哪。go get 直接去那里取。',
        data: { '目的地': '源码仓库' },
        set: { reg4: { opacity: { to: 1, dur: 300 } }, d4: { dash: { to: 1, delay: 300, dur: 600 } }, lock: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'stream', path: 'd4', at: 400, n: 2, dur: 900, color: C.data, labels: ['github.com/gorilla/mux'] }] }
    ]
  };

  var NOTES = 'https://missing.csail.mit.edu/2026/shipping-code/';
  VZ.register({
    id: 'ch06-wheel', title: 'wheel：构件里装了什么，文件名说明了什么',
    sources: [
      { t: '视频 17:45 源码与预编译', u: 'https://youtu.be/KBMiB-8P4Ns?t=1065' },
      { t: '视频 20:00 uv build 与 wheel', u: 'https://youtu.be/KBMiB-8P4Ns?t=1200' },
      { t: '讲义 Artifacts & Packaging', u: NOTES + '#artifacts--packaging' },
      { t: 'Python 打包规范 · wheel 文件名', u: 'https://packaging.python.org/en/latest/specifications/binary-distribution-format/' }
    ],
    note: 'uv build 和 unzip 的输出，是练习 2 的本机实测。numpy 的平台标签，以及装好 wheel 后运行 greet，是讲义原文。',
    scenes: [sceneWheel]
  });
  VZ.register({
    id: 'ch06-lock', title: '锁文件与哈希：从“范围”到可复现的字节',
    sources: [
      { t: '视频 27:24 Cargo 锁文件与校验和', u: 'https://youtu.be/KBMiB-8P4Ns?t=1644' },
      { t: '视频 28:02 uv lock / uv sync', u: 'https://youtu.be/KBMiB-8P4Ns?t=1682' },
      { t: '讲义 Reproducibility', u: NOTES + '#reproducibility' },
      { t: 'reproducible-builds.org · SOURCE_DATE_EPOCH', u: 'https://reproducible-builds.org/docs/source-date-epoch/' }
    ],
    note: 'uv lock、sha256sum 和 uv sync --locked 的输出，是练习 2 的本机实测。下载后校验成功、被篡改而失败，这两步是示意。它们按 uv 的行为来画。笔记没有构造真实的篡改文件。',
    scenes: [sceneLock]
  });
  VZ.register({
    id: 'ch06-publish', title: '发布：构件经由仓库到达用户',
    sources: [
      { t: '视频 54:30 发布', u: 'https://youtu.be/KBMiB-8P4Ns?t=3270' },
      { t: '视频 57:29 uv publish / TestPyPI', u: 'https://youtu.be/KBMiB-8P4Ns?t=3449' },
      { t: '视频 59:23 推送 Docker 镜像', u: 'https://youtu.be/KBMiB-8P4Ns?t=3563' },
      { t: '讲义 Publishing', u: NOTES + '#publishing' }
    ],
    note: 'uv publish --dry-run 和 sha256sum 是练习 5 的本机实测，没有真上传。pip install git+…、TestPyPI 安装和 docker push 来自讲义和视频，未实测。',
    scenes: [scenePublish]
  });
})();
