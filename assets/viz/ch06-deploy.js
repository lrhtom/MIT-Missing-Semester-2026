/* ch06 · 虚拟机、容器与服务编排 —— 可视化演示
 * 依据：Lecture 6 视频 33:02–37:33（VM vs 容器、docker run）、38:15–43:33（Dockerfile、分层、优化）、
 *       45:29–54:30（服务、compose、配置、systemd）；讲义 shipping-code.md 的 VMs & Containers、Configuration、Services & Orchestration。
 * 实测：本机 Docker 无法使用，镜像构建与 compose 未实测——分层缓存的 CACHED 标记、镜像体积（视频 42:43 口述）为示意；
 *       “服务编排”一幕的计数与 503、配置优先级输出来自练习 4 在本机用迷你 Redis 替身真跑（labs/data/lab06.js · ex04-a / ex04-b / ex04-c）。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 8, fill: colW || C.bg, stroke: col || C.line, sw: 1.6, text: text, color: C.fg, size: 12.5, weight: 700 }, extra || {});
  }
  function path(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.2, dash: 0, arrow: 'data' }, extra || {}); }

  /* ---------- 场景 1：虚拟机 vs 容器 ---------- */
  var LX = 220, RX = 640, LH = 40, BASE = 500;
  function lyr(x, lvl, w, text, col, colW, extra) { return box(x, BASE - lvl * (LH + 6), w, LH, text, col, colW, merge({ opacity: 0, y: BASE - lvl * (LH + 6) + 60 }, extra || {})); }
  function vmObjs() {
    var o = {
      vhw: lyr(LX, 0, 340, '硬件', C.neutral, C.bg3), vos: lyr(LX, 1, 340, '宿主操作系统', C.data, C.dataW), vhv: lyr(LX, 2, 340, 'Hypervisor（虚拟化层）', C.warn, C.warnW),
      g1: lyr(LX - 87, 3, 160, '客户机 OS + 内核', C.bad, C.badW), g2: lyr(LX + 87, 3, 160, '客户机 OS + 内核', C.bad, C.badW),
      l1: lyr(LX - 87, 4, 160, '库 / 依赖', C.teal, C.tealW), l2: lyr(LX + 87, 4, 160, '库 / 依赖', C.teal, C.tealW),
      a1: lyr(LX - 87, 5, 160, 'App A', C.info, C.infoW), a2: lyr(LX + 87, 5, 160, 'App B', C.info, C.infoW),
      chw: lyr(RX, 0, 340, '硬件', C.neutral, C.bg3), cos: lyr(RX, 1, 340, '宿主操作系统（一个共享的 Linux 内核）', C.data, C.dataW), crt: lyr(RX, 2, 340, '容器运行时 containerd', C.warn, C.warnW),
      cl1: lyr(RX - 113, 3, 104, '库', C.teal, C.tealW), cl2: lyr(RX, 3, 104, '库', C.teal, C.tealW), cl3: lyr(RX + 113, 3, 104, '库', C.teal, C.tealW),
      ca1: lyr(RX - 113, 4, 104, 'App A', C.info, C.infoW), ca2: lyr(RX, 4, 104, 'App B', C.info, C.infoW), ca3: lyr(RX + 113, 4, 104, 'App C', C.info, C.infoW),
      k1: { type: 'line', x1: RX - 113, y1: BASE - 3 * (LH + 6) + 20, x2: RX - 113, y2: BASE - (LH + 6) - 20, stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      k2: { type: 'line', x1: RX, y1: BASE - 3 * (LH + 6) + 20, x2: RX, y2: BASE - (LH + 6) - 20, stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      k3: { type: 'line', x1: RX + 113, y1: BASE - 3 * (LH + 6) + 20, x2: RX + 113, y2: BASE - (LH + 6) - 20, stroke: C.data, sw: 2, dash: 0, arrow: 'data' },
      ps: box(RX, 140, 300, 66, 'ps aux：只有你自己启动的进程', C.ok, C.okW, { size: 12.5, opacity: 0 }),
      wrap: box(RX, 318, 380, 330, '', C.warn, 'none', { rx: 14, sw: 2, dasharray: '7 5', opacity: 0 }),
      wrapT: { type: 'text', x: RX, y: 140, text: 'macOS / Windows：先跑一个 Linux 虚拟机', size: 12.5, weight: 700, color: C.warn, opacity: 0 }
    };
    return o;
  }
  function up(ids, at, gap) { var s = {}; ids.forEach(function (id, i) { var lvl = vmLvl[id]; s[id] = { opacity: { to: 1, delay: at + i * gap, dur: 250 }, y: { to: BASE - lvl * (LH + 6), delay: at + i * gap, dur: 600, ease: 'out' } }; }); return s; }
  var vmLvl = { vhw: 0, vos: 1, vhv: 2, g1: 3, g2: 3, l1: 4, l2: 4, a1: 5, a2: 5, chw: 0, cos: 1, crt: 2, cl1: 3, cl2: 3, cl3: 3, ca1: 4, ca2: 4, ca3: 4 };
  var sceneVm = {
    name: '虚拟机 vs 容器', desc: '要把“整台电脑”一起交付，有两种做法。虚拟机给每个应用一整套操作系统。容器只隔离应用这一层，共享宿主的内核。所以容器更轻、启动更快，但隔离也更弱。',
    code: { lang: 'sh', title: '视频里的演示（本机 Docker 不可用，未实测）', src: 'docker run -it python:3.12 python\ndocker run -it python:3.12 bash\nps aux\ncat /etc/os-release\ndocker images' },
    dataTitle: '对比',
    data: { '内核个数': 0, '每个应用额外带的': '无' },
    legend: [[C.bad, '客户机操作系统（虚拟机独有的开销）'], [C.warn, '虚拟化 / 容器运行时'], [C.data, '宿主操作系统与内核'], [C.teal, '库与依赖'], [C.info, '应用'], [C.ok, '容器内视角']],
    bg: function (d) {
      d.text(430, 24, '“交付整台电脑”的两种方式', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(LX, 60, '虚拟机（VM）', { anchor: 'middle', size: 14, weight: 800, color: C.fg });
      d.text(RX, 60, '容器（Container）', { anchor: 'middle', size: 14, weight: 800, color: C.fg });
      d.line(430, 50, 430, 540, { stroke: C.line, sw: 1, dash: '3 5' });
    },
    objects: vmObjs,
    steps: [
      { say: '虚拟机在宿主系统上加一层 Hypervisor，电脑里再模拟出电脑。每台虚拟机都装着完整的操作系统（视频 33:02）。交付一个虚拟机镜像，就带上了全部依赖。',
        data: { '内核个数': { v: 3, at: 1800 }, '每个应用额外带的': { v: '一整个操作系统', at: 1800 } },
        set: up(['vhw', 'vos', 'vhv', 'g1', 'g2', 'l1', 'l2', 'a1', 'a2'], 0, 180) },
      { say: '代价是开销。只为跑一个应用，却要运行一整套操作系统。就是红色那层。它占内存，启动也慢（视频 33:39）。',
        fx: [{ type: 'pulse', obj: 'g1', at: 200, color: C.bad }, { type: 'pulse', obj: 'g2', at: 500, color: C.bad }, { type: 'float', obj: 'g1', at: 800, text: '启动整个 OS', color: C.bad }, { type: 'float', obj: 'g2', at: 1100, text: '再一个 OS', color: C.bad }] },
      { say: '容器的出发点是这样的。应用通常只关心用户态的依赖，不改操作系统本身。于是复用宿主的内核（视频 34:24）。只把“库加应用”这一层隔离起来。',
        data: { '内核个数': { v: 1, at: 1800 }, '每个应用额外带的': { v: '只有库和应用', at: 1800 } },
        set: up(['chw', 'cos', 'crt', 'cl1', 'cl2', 'cl3', 'ca1', 'ca2', 'ca3'], 0, 160) },
      { say: '三个容器的系统调用，都直接交给同一个宿主内核。没有客户机 OS 这层，所以轻量、启动快。Docker 底层的运行时是 containerd，Kubernetes 也在用。',
        set: { k1: { dash: { to: 1, dur: 600 } }, k2: { dash: { to: 1, delay: 200, dur: 600 } }, k3: { dash: { to: 1, delay: 400, dur: 600 } } },
        fx: [{ type: 'stream', path: 'k1', at: 500, n: 3, dur: 900, color: C.data, labels: ['syscall'] }, { type: 'stream', path: 'k2', at: 700, n: 3, dur: 900, color: C.data }, { type: 'stream', path: 'k3', at: 900, n: 3, dur: 900, color: C.data }, { type: 'pulse', obj: 'cos', at: 1700, color: C.data }] },
      { say: '容器里敲 ps aux，只看到你自己启动的进程。操作系统的那堆后台进程都没有（视频 36:59）。cat /etc/os-release 会显示，镜像底下是 Debian（视频 37:33）。',
        set: { ps: { opacity: { to: 1, dur: 300 }, y: { from: 170, to: 140, dur: 500, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'ca1', at: 300, color: C.ok }] },
      { say: '但容器依赖 Linux 内核。在 macOS 和 Windows 上，Docker 其实先跑一个轻量的 Linux 虚拟机。容器在它里面运行（视频 34:24，讲义）。本机 Docker Desktop 的后端起不来。所以本页的容器命令都未实测。',
        set: { wrap: { opacity: { to: 1, dur: 400 } }, wrapT: { opacity: { to: 1, delay: 300, dur: 300 } }, ps: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'wrap', at: 500, color: C.warn }] },
      { say: '讲义提醒了两个局限。一是容器共享内核，隔离比虚拟机弱。多租户时，这是安全隐患。二是镜像分平台，linux/amd64 的镜像在 linux/arm64 上要模拟运行，很慢。',
        data: { '每个应用额外带的': '只有库和应用（隔离较弱）' },
        set: { cos: { stroke: { to: C.bad, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'cos', at: 300 }, { type: 'flash', obj: 'cos', at: 300, color: C.bad }] }
    ]
  };

  /* ---------- 场景 2：Dockerfile 与分层缓存 ---------- */
  var SRC = 'FROM python:3.12\nRUN apt-get update\nRUN apt-get install -y gcc\nRUN apt-get install -y libpq-dev\nRUN pip install numpy\nRUN pip install pandas\nCOPY . /app\nWORKDIR /app\nRUN pip install .\n\n# 下面是讲义改进版\nFROM python:3.12-slim\nCOPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv\nRUN apt-get update && \\\n    apt-get install -y --no-install-recommends gcc libpq-dev && \\\n    rm -rf /var/lib/apt/lists/*\nWORKDIR /app\nENV PATH="/app/.venv/bin:$PATH"\nCOPY pyproject.toml uv.lock ./\nRUN uv sync --locked --no-dev --no-install-project\nCOPY . .\nRUN uv sync --locked --no-dev';
  var LAY = ['FROM python:3.12', 'RUN apt-get update', 'RUN apt-get install gcc', 'RUN apt-get install libpq-dev', 'RUN pip install numpy', 'RUN pip install pandas', 'COPY . /app', 'WORKDIR /app', 'RUN pip install .'];
  var DX = 300, DB = 520, DH = 36;
  function layerObjs() {
    var o = {
      ctx: box(80, 300, 110, 70, '构建上下文', C.teal, C.tealW, { size: 12.5 }),
      edit: { type: 'text', x: 80, y: 350, text: '', size: 12, weight: 700, color: C.warn, opacity: 0 },
      size: { type: 'text', x: 700, y: 120, num: 0, fmt: 'fixed1', pre: '镜像约 ', post: ' GB', size: 22, weight: 800, mono: true, color: C.fg, opacity: 0 },
      ext: box(700, 300, 220, 40, 'ghcr.io/astral-sh/uv 镜像', C.info, C.infoW, { size: 12, opacity: 0 }),
      cp: path('M590,300 C520,300 480,380 420,' + (DB - 1 * (DH + 4)), C.info, { opacity: 0 }),
      c1: box(640, 470, 120, 34, '容器 1（可写层）', C.ok, C.okW, { size: 11.5, opacity: 0 }),
      c2: box(780, 470, 120, 34, '容器 2（可写层）', C.ok, C.okW, { size: 11.5, opacity: 0 }),
      r1: path('M' + (DX + 150) + ',' + (DB - 4 * (DH + 4)) + ' C540,300 600,400 630,452', C.ok, { sw: 1.8 }),
      r2: path('M' + (DX + 150) + ',' + (DB - 4 * (DH + 4)) + ' C600,280 740,380 770,452', C.ok, { sw: 1.8 })
    };
    LAY.forEach(function (t, i) {
      o['L' + i] = box(DX, DB - i * (DH + 4), 280, DH, t, i === 0 ? C.data : C.line, i === 0 ? C.dataW : C.bg2, { mono: true, size: 12, opacity: 0, y: DB - i * (DH + 4) - 40 });
      o['T' + i] = { type: 'text', x: DX + 168, y: DB - i * (DH + 4), anchor: 'start', text: '', size: 11.5, weight: 800, mono: true, color: C.ok, opacity: 0 };
    });
    return o;
  }
  function stack(ids, at, gap) { var s = {}; ids.forEach(function (i, k) { s['L' + i] = { opacity: { to: 1, delay: at + k * gap, dur: 200 }, y: { to: DB - i * (DH + 4), delay: at + k * gap, dur: 500, ease: 'bounce' } }; }); return s; }
  var sceneLayers = {
    name: 'Dockerfile 分层', desc: '每条 FROM、RUN、COPY 指令，都在镜像上叠一层改动。Docker 会缓存这些层。只改了某一行，就只重建这一层和它上面的层。',
    code: { lang: 'docker', title: '讲义的两个 Dockerfile（未实测：本机 Docker 不可用）', src: SRC },
    dataTitle: '镜像',
    data: { '层数': 0, '本次重建的层': '无' },
    legend: [[C.data, '基础镜像层'], [C.neutral, '指令产生的层'], [C.ok, '缓存命中 / 运行中的容器'], [C.bad, '需要重建'], [C.info, '外部镜像'], [C.teal, '构建上下文']],
    bg: function (d) {
      d.text(430, 24, '每条指令一层，层自下而上叠成镜像', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(DX, DB + 34, '镜像（只读的层）', { anchor: 'middle', size: 12, color: C.fg3, weight: 600 });
    },
    objects: layerObjs,
    steps: [
      { say: 'FROM python:3.12 以官方 Python 镜像为起点（视频 38:49）。这个镜像本身，就是别人构建好的一叠层。', hl: [1],
        data: { '层数': { v: 1, at: 400 } }, set: stack([0], 0, 0), fx: [{ type: 'ripple', obj: 'L0', at: 500, color: C.data }] },
      { say: '每条 RUN 在上一层的基础上执行命令。文件系统的变化，存成新的一层。这里依次是更新软件源、装 gcc、装 libpq-dev、装 numpy、装 pandas。', hl: [2, 3, 4, 5, 6],
        data: { '层数': { v: 6, at: 1600 } }, set: stack([1, 2, 3, 4, 5], 0, 320) },
      { say: 'COPY 把构建上下文，也就是你的源码，复制进镜像。WORKDIR 设定工作目录。最后 pip install . 安装你的包。一共 9 层。', hl: [7, 8, 9],
        data: { '层数': { v: 9, at: 1200 } },
        set: merge(stack([6, 7, 8], 300, 320), { ctx: { x: { to: 92, dur: 300 } } }),
        fx: [{ type: 'pulse', obj: 'ctx', at: 100, color: C.teal }] },
      { say: '改一行源码再构建。前 6 层的输入没变，直接用缓存，标着 CACHED。COPY 那层的输入变了，它和它上面的层全部重建。这一步是示意。视频 39:38 提到，层会被复用和去重。', hl: [7],
        data: { '本次重建的层': { v: '第 7–9 层', at: 1400 } },
        set: (function () {
          var s = { edit: { text: '改了 greeting.py', opacity: { to: 1, dur: 300 } } };
          for (var i = 0; i < 9; i++) {
            if (i < 6) s['T' + i] = { text: 'CACHED', color: { to: C.ok, dur: 0 }, opacity: { to: 1, delay: 300 + i * 120, dur: 200 } };
            else { s['T' + i] = { text: '重建', color: { to: C.bad, dur: 0 }, opacity: { to: 1, delay: 1300, dur: 200 } }; s['L' + i] = { stroke: { to: C.bad, delay: 1200, dur: 300 }, fill: { to: C.badW, delay: 1200, dur: 300 } }; }
          }
          return s;
        })(),
        fx: [{ type: 'shake', obj: 'L6', at: 1300 }, { type: 'shake', obj: 'L7', at: 1400 }, { type: 'shake', obj: 'L8', at: 1500 }] },
      { say: '镜像（image）是只读的模板。容器（container）是它的运行实例。同一个镜像可以跑多个容器。每个容器只在顶上加一层自己的可写层。',
        set: (function () {
          var s = { edit: { opacity: { to: 0, dur: 300 } }, c1: { opacity: { to: 1, delay: 500, dur: 300 } }, c2: { opacity: { to: 1, delay: 700, dur: 300 } }, r1: { dash: { to: 1, delay: 100, dur: 500 } }, r2: { dash: { to: 1, delay: 300, dur: 500 } } };
          for (var i = 0; i < 9; i++) { s['T' + i] = { opacity: { to: 0, dur: 300 } }; if (i >= 6) s['L' + i] = { stroke: { to: C.line, dur: 300 }, fill: { to: C.bg2, dur: 300 } }; }
          return s;
        })(),
        fx: [{ type: 'ripple', obj: 'c1', at: 900, color: C.ok }, { type: 'ripple', obj: 'c2', at: 1100, color: C.ok }] },
      { say: '讲义点名了几个问题。完整版基础镜像太大，RUN 太多产生多余的层。没锁版本，也没清包管理器缓存。视频里这一版镜像接近 2 GB。', hl: [1, 2, 3, 4, 5, 6],
        data: { '层数': 9, '本次重建的层': '无' },
        set: { c1: { opacity: { to: 0, dur: 300 } }, c2: { opacity: { to: 0, dur: 300 } }, r1: { dash: { to: 0, dur: 300 } }, r2: { dash: { to: 0, dur: 300 } }, size: { opacity: { to: 1, dur: 300 }, num: { to: 2.0, delay: 200, dur: 900 }, color: { to: C.bad, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'size', at: 1100, color: C.bad }] },
      { say: '改进版换了 slim 基础镜像。apt 的三步合进一个 RUN，还删掉了缓存。依赖照锁文件装，用 uv sync --locked。先只复制 pyproject 和 uv.lock 装依赖，再复制源码。这样改源码时，依赖层还能命中缓存。视频里体积降到约半个 G。', hl: [12, 14, 15, 16, 19, 20, 21, 22],
        data: { '层数': { v: 8, at: 1200 } },
        set: (function () {
          var NEW = ['FROM python:3.12-slim', 'COPY --from=…uv /uv', 'RUN apt…&& rm -rf lists', 'WORKDIR / ENV', 'COPY pyproject uv.lock', 'RUN uv sync --no-install-project', 'COPY . .', 'RUN uv sync --locked'];
          var s = { size: { num: { to: 0.5, delay: 1000, dur: 1000 }, color: { to: C.ok, delay: 1000, dur: 300 } } };
          for (var i = 0; i < 9; i++) {
            if (i < NEW.length) s['L' + i] = { text: { to: NEW[i], delay: 200 + i * 100 }, w: { to: 250, delay: 200 + i * 100, dur: 300 }, stroke: { to: i === 0 ? C.data : C.line, dur: 300 } };
            else s['L' + i] = { opacity: { to: 0, delay: 200, dur: 300 }, y: { to: DB - i * (DH + 4) - 30, delay: 200, dur: 400 } };
          }
          return s;
        })(),
        fx: [{ type: 'float', obj: 'size', at: 1500, text: '−75%', color: C.ok }] },
      { say: 'builder 模式：用 COPY --from 从另一个镜像里只拷出 uv。拷的是 ghcr.io/astral-sh/uv:latest 里那一个二进制。编译它要的整套工具链，不会带进来。', hl: [13],
        set: { ext: { opacity: { to: 1, dur: 300 } }, cp: { opacity: { to: 1, dur: 0 }, dash: { to: 1, delay: 300, dur: 700 } } },
        fx: [{ type: 'stream', path: 'cp', at: 500, n: 1, dur: 900, color: C.info, labels: ['/uv'] }, { type: 'pulse', obj: 'L1', at: 1400, color: C.info }] }
    ]
  };


  /* ---------- 场景 3：Compose——两个服务怎么一起跑 ---------- */
  function svcObjs() {
    return {
      br: box(110, 250, 130, 50, '浏览器 / curl', C.neutral, C.bg3),
      web: box(400, 250, 170, 64, 'web · app.py', C.info, C.infoW, { size: 13.5 }),
      cache: box(700, 250, 170, 64, 'cache · redis', C.teal, C.tealW, { size: 13.5, opacity: 0.3 }),
      q1: path('M176,240 L314,240', C.data),
      q2: path('M486,240 L614,240', C.data),
      q3: path('M614,262 L486,262', C.ok),
      q4: path('M314,262 L176,262', C.ok),
      cnt: { type: 'text', x: 700, y: 312, num: 0, pre: 'visits = ', size: 15, mono: true, weight: 800, color: C.teal, opacity: 0 },
      resp: { type: 'text', x: 110, y: 300, text: '', size: 13, mono: true, weight: 700, color: C.fg, opacity: 0 },
      ord1: box(700, 140, 150, 30, '① cache 先启动', C.warn, C.warnW, { size: 12, opacity: 0 }),
      ord2: box(400, 140, 150, 30, '② web 后启动', C.warn, C.warnW, { size: 12, opacity: 0 }),
      dns: box(560, 330, 230, 28, 'cache → 172.18.0.2（示意）', C.data, C.dataW, { mono: true, size: 11.5, opacity: 0 }),
      vol: box(640, 470, 190, 40, '卷 redis_data:/data', C.teal, C.tealW, { mono: true, size: 12, opacity: 0 }),
      vl: path('M640,284 L640,448', C.teal, { sw: 1.8 }),
      rs: { type: 'text', x: 400, y: 362, text: '', size: 12.5, weight: 700, color: C.warn, opacity: 0 }
    };
  }
  var sceneCompose = {
    name: 'Compose', desc: '应用要依赖数据库、缓存这类服务。那就把它们放进各自的容器。Compose 用一个 YAML 文件来声明。写清有哪些服务、谁依赖谁、怎么连起来。',
    code: { lang: 'yaml', title: 'docker-compose.yml（练习 4 · 与讲义同构）', src: 'services:\n  web:\n    build: .\n    ports:\n      - "8080:8080"\n    environment:\n      - REDIS_URL=redis://cache:6379\n    depends_on:\n      - cache\n    restart: on-failure\n\n  cache:\n    image: redis:7-alpine\n    volumes:\n      - redis_data:/data\n\nvolumes:\n  redis_data:' },
    dataTitle: '服务状态',
    data: { 'cache': '未启动', 'web': '未启动', 'HTTP 状态': '无' },
    bg: function (d) {
      d.text(430, 24, '两个容器、一个网络：web 通过服务名 cache 找到缓存', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(40, 540, '前三步为练习 4 本机实测：没有 Docker，用 30 行的 Redis 替身 fake_redis.py 代替 redis 镜像', { size: 11.5, color: C.fg3 });
    },
    objects: svcObjs,
    steps: [
      { say: '没有编排时，谁先启动全凭运气。本机实测：先起 web，缓存还没起，访问得到 503。Windows 上连不上本机端口要等约 2 秒，所以报 TimeoutError。', hl: [2, 7],
        log: ['$ PORT=28080 REDIS_URL=redis://127.0.0.1:26379 python app.py &', { s: 'web: listening on 127.0.0.1:28080, cache = redis://127.0.0.1:26379', at: 400 }, { s: "$ curl -s -w 'HTTP %{http_code}\\n' 127.0.0.1:28080", at: 900 }, { s: 'cache unavailable: TimeoutError', at: 2400, cls: 'err' }, { s: 'HTTP 503', at: 2500, cls: 'err' }],
        data: { 'web': '运行中', 'HTTP 状态': { v: 503, at: 2500 } },
        set: { q1: { dash: { to: 1, delay: 900, dur: 400 } }, q2: { dash: { to: 1, delay: 1400, dur: 400 }, stroke: { to: C.bad, delay: 2300, dur: 200 } }, resp: { text: '503', color: { to: C.bad, dur: 0 }, opacity: { to: 1, delay: 2500, dur: 200 } } },
        fx: [{ type: 'stream', path: 'q1', at: 900, n: 1, dur: 500, color: C.data, labels: ['GET /'] }, { type: 'stream', path: 'q2', at: 1400, n: 1, dur: 800, color: C.bad, labels: ['INCR'] }, { type: 'shake', obj: 'cache', at: 2300 }] },
      { say: '缓存起来之后，每次访问，web 都向 cache 发一条 INCR。拿到新的计数，再返回给你：1、2、3。这和视频里 etcd 计数器的例子是同一个结构。', hl: [12, 13],
        log: ['$ PORT=26379 python fake_redis.py &', { s: 'cache: fake redis on 127.0.0.1:26379', at: 300 }, { s: 'This page has been visited 1 times.', at: 1300 }, { s: 'This page has been visited 2 times.', at: 2000 }, { s: 'This page has been visited 3 times.', at: 2700 }],
        data: { 'cache': '运行中', 'HTTP 状态': { v: 200, at: 1300 } },
        set: { cache: { opacity: { to: 1, dur: 300 } }, q2: { stroke: { to: C.data, dur: 200 } }, q3: { dash: { to: 1, delay: 700, dur: 300 } }, q4: { dash: { to: 1, delay: 900, dur: 300 } },
          cnt: { opacity: { to: 1, delay: 700, dur: 200 }, num: { to: 3, delay: 1100, dur: 1700, ease: 'linear' } }, resp: { text: { to: '200 ×3', delay: 1300 }, color: { to: C.ok, delay: 1300, dur: 0 } } },
        fx: [{ type: 'stream', path: 'q2', at: 600, n: 3, dur: 2000, color: C.data, labels: ['INCR', 'INCR', 'INCR'] }, { type: 'stream', path: 'q4', at: 900, n: 3, dur: 2000, color: C.ok, labels: ['1', '2', '3'] }] },
      { say: '缓存一停，web 没有崩溃，而是返回 503。等缓存回来，就恢复了。服务之间要容忍彼此暂时不可用。本机实测是 kill 掉替身后再访问。',
        log: ['$ kill $CACHE', "$ curl -s -w 'HTTP %{http_code}\\n' 127.0.0.1:28080", { s: 'cache unavailable: TimeoutError', at: 2200, cls: 'err' }, { s: 'HTTP 503', at: 2300, cls: 'err' }],
        data: { 'cache': { v: '已停止', at: 300 }, 'HTTP 状态': { v: 503, at: 2300 } },
        set: { cache: { opacity: { to: 0.3, delay: 200, dur: 400 } }, cnt: { opacity: { to: 0.3, delay: 200, dur: 400 } }, q2: { stroke: { to: C.bad, delay: 1800, dur: 200 } }, resp: { text: { to: '503', delay: 2300 }, color: { to: C.bad, delay: 2300, dur: 0 } } },
        fx: [{ type: 'burst', obj: 'cache', at: 300, color: C.bad }, { type: 'stream', path: 'q1', at: 700, n: 1, dur: 500, color: C.data, labels: ['GET /'] }, { type: 'stream', path: 'q2', at: 1200, n: 1, dur: 700, color: C.bad, labels: ['INCR'] }] },
      { say: 'Compose 把这些写成声明。depends_on 让 cache 先于 web 启动。web 用服务名 cache 当主机名。Docker 内置的 DNS，会把它解析成缓存容器的地址。本机用 PyYAML 解析过这份 compose 文件。', hl: [7, 8, 9],
        log: ['$ python -c "…yaml.safe_load(open(\'docker-compose.yml\'))…"', { s: "web | depends_on: ['cache'] | environment: ['REDIS_URL=redis://cache:6379']", at: 700 }, { s: 'cache | depends_on: [] | environment: []', at: 900 }, { s: '# docker compose up：未实测（本机 Docker 不可用）', at: 1300, cls: 'dim' }],
        data: { 'cache': { v: '运行中', at: 600 }, 'web': { v: '运行中', at: 1300 }, 'HTTP 状态': '无' },
        set: { cache: { opacity: { to: 1, delay: 300, dur: 300 } }, cnt: { opacity: { to: 1, delay: 300, dur: 300 } }, q2: { stroke: { to: C.data, dur: 200 } }, resp: { opacity: { to: 0, dur: 300 } },
          ord1: { opacity: { to: 1, delay: 300, dur: 300 }, y: { from: 120, to: 140, delay: 300, dur: 400, ease: 'back' } }, ord2: { opacity: { to: 1, delay: 1100, dur: 300 }, y: { from: 120, to: 140, delay: 1100, dur: 400, ease: 'back' } },
          dns: { opacity: { to: 1, delay: 1700, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'cache', at: 600, color: C.teal }, { type: 'pulse', obj: 'web', at: 1300, color: C.info }] },
      { say: '再加两条运维细节。restart: on-failure 让 web 异常退出后自动重启。具名卷 redis_data 挂到 /data，删掉重建 cache 容器，计数也还在。这一步是示意。', hl: [10, 14, 15, 17, 18],
        data: { 'web': '异常退出 → 自动重启' },
        set: { ord1: { opacity: { to: 0, dur: 300 } }, ord2: { opacity: { to: 0, dur: 300 } }, dns: { opacity: { to: 0, dur: 300 } },
          rs: { text: '↻ restart: on-failure', opacity: { to: 1, delay: 500, dur: 300 } },
          vol: { opacity: { to: 1, delay: 1400, dur: 300 } }, vl: { dash: { to: 1, delay: 1500, dur: 500 } } },
        fx: [{ type: 'shake', obj: 'web', at: 300 }, { type: 'flash', obj: 'web', at: 1000, color: C.ok }, { type: 'stream', path: 'vl', at: 1700, n: 2, dur: 800, color: C.teal, labels: ['visits=3'] }] }
    ]
  };

  /* ---------- 场景 4：配置注入与优先级 ---------- */
  var CFG = [['默认值（代码里）', 'port 8080', C.neutral, C.bg2], ['配置文件 app.json', 'port 9000', C.teal, C.tealW], ['环境变量 PORT', 'port 9100', C.data, C.dataW], ['命令行 --port', 'port 9200', C.warn, C.warnW]];
  var CY0 = 430, CS = 58;
  function cfgObjs() {
    var o = {
      app: box(640, 260, 220, 84, 'app.py（同一份代码）', C.info, C.infoW, { size: 14 }),
      port: { type: 'text', x: 640, y: 330, num: 0, pre: 'port = ', size: 18, mono: true, weight: 800, color: C.info, opacity: 0 },
      host: { type: 'text', x: 640, y: 358, text: 'host = 127.0.0.1', size: 13, mono: true, weight: 700, color: C.fg2, opacity: 0 },
      e1: box(150, 110, 150, 34, '开发：笔记本', C.ok, C.okW, { size: 12, opacity: 0 }),
      e2: box(330, 110, 150, 34, '容器 / 生产', C.ok, C.okW, { size: 12, opacity: 0 }),
      key: box(240, 200, 170, 30, 'API_KEY=sk-…', C.bad, C.badW, { mono: true, size: 12, opacity: 0 }),
      git: box(130, 300, 120, 40, 'git 仓库', C.neutral, C.bg3, { size: 12.5, opacity: 0 }),
      img: box(360, 300, 120, 40, '镜像层', C.neutral, C.bg3, { size: 12.5, opacity: 0 }),
      x1: { type: 'text', x: 130, y: 300, text: '×', size: 30, weight: 800, color: C.bad, opacity: 0 },
      x2: { type: 'text', x: 360, y: 300, text: '×', size: 30, weight: 800, color: C.bad, opacity: 0 },
      ei: path('M300,200 C420,200 480,240 528,252', C.ok)
    };
    CFG.forEach(function (c, i) {
      o['c' + i] = box(260, CY0 - i * CS, 300, 44, c[0] + '   →   ' + c[1], c[2], c[3], { size: 12.5, opacity: 0, x: 120 });
      o['a' + i] = path('M410,' + (CY0 - i * CS) + ' C470,' + (CY0 - i * CS) + ' 500,280 528,272', c[2] === C.neutral ? C.fg3 : c[2], { sw: 1.8 });
    });
    return o;
  }
  function layer(i, at) {
    var s = {};
    s['c' + i] = { opacity: { to: 1, delay: at, dur: 250 }, x: { to: 260, delay: at, dur: 600, ease: 'out' } };
    s['a' + i] = { dash: { to: 1, delay: at + 600, dur: 500 } };
    for (var j = 0; j < i; j++) s['c' + j] = { opacity: { to: 0.45, delay: at + 600, dur: 300 } };
    return s;
  }
  var sceneConfig = {
    name: '配置注入', desc: '配置不写死在代码里，在运行时注入。同一份代码，换一份配置就能部署到另一台机器。练习 4 的 app.py 逐层覆盖。顺序是默认值、配置文件、环境变量、命令行。',
    code: { lang: 'py', title: 'app.py 的 load_config（练习 4）', src: 'def load_config(argv=None):\n    cfg = dict(DEFAULTS)\n    path = os.environ.get("APP_CONFIG", "app.json")\n    if os.path.exists(path):\n        with open(path) as f:\n            cfg.update(json.load(f))\n    for key in ("HOST", "PORT", "REDIS_URL"):\n        if key in os.environ:\n            cfg[key.lower()] = os.environ[key]\n    ap = argparse.ArgumentParser()\n    ap.add_argument("--port", type=int)\n    args = ap.parse_args(argv)\n    if args.port is not None:\n        cfg["port"] = args.port\n    return cfg' },
    dataTitle: '最终配置',
    data: { '生效的来源': '无', 'port': '无' },
    legend: [[C.neutral, '默认值'], [C.teal, '配置文件'], [C.data, '环境变量'], [C.warn, '命令行参数'], [C.ok, '部署环境'], [C.bad, '密钥：不能出现的位置']],
    bg: function (d) {
      d.text(430, 24, '配置逐层覆盖：越靠上的来源优先级越高', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
    },
    objects: cfgObjs,
    steps: [
      { say: '什么都不给时，用代码里的默认值。port 是 8080，只监听本机 127.0.0.1。这是本机实测。', hl: [2],
        log: ['$ python app.py --print-config', { s: '{"host": "127.0.0.1", "port": 8080, "redis_url": "redis://localhost:6379"}', at: 1100 }],
        data: { '生效的来源': { v: '默认值', at: 1100 }, 'port': { v: 8080, at: 1100 } },
        set: merge(layer(0, 0), { port: { opacity: { to: 1, delay: 1100, dur: 200 }, num: { from: 8080, to: 8080, dur: 0 } }, host: { opacity: { to: 1, delay: 1200, dur: 200 } } }),
        fx: [{ type: 'stream', path: 'a0', at: 700, n: 1, dur: 500, color: C.fg3, labels: ['8080'] }, { type: 'pulse', obj: 'app', at: 1100, color: C.info }] },
      { say: '当前目录有 app.json 时，读进来覆盖默认值。port 变成 9000，本机实测。', hl: [3, 4, 5, 6],
        log: ['$ echo \'{"port": 9000}\' > app.json && python app.py --print-config', { s: '{"host": "127.0.0.1", "port": 9000, "redis_url": "redis://localhost:6379"}', at: 1200 }],
        data: { '生效的来源': { v: '配置文件', at: 1200 }, 'port': { v: 9000, at: 1200 } },
        set: merge(layer(1, 0), { port: { num: { to: 9000, delay: 900, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'a1', at: 700, n: 1, dur: 500, color: C.teal, labels: ['9000'] }] },
      { say: '环境变量再覆盖配置文件：PORT=9100。这是讲义 Configuration 一节的主要做法。compose 的 environment: 就是在设它。', hl: [7, 8, 9],
        log: ['$ PORT=9100 python app.py --print-config', { s: '{"host": "127.0.0.1", "port": 9100, "redis_url": "redis://localhost:6379"}', at: 1200 }],
        data: { '生效的来源': { v: '环境变量', at: 1200 }, 'port': { v: 9100, at: 1200 } },
        set: merge(layer(2, 0), { port: { num: { to: 9100, delay: 900, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'a2', at: 700, n: 1, dur: 500, color: C.data, labels: ['9100'] }] },
      { say: '命令行参数优先级最高，--port 9200 压过一切。这个优先级顺序是常见惯例，属于补充。', hl: [10, 11, 12, 13, 14],
        log: ['$ PORT=9100 python app.py --port 9200 --print-config', { s: '{"host": "127.0.0.1", "port": 9200, "redis_url": "redis://localhost:6379"}', at: 1200 }],
        data: { '生效的来源': { v: '命令行', at: 1200 }, 'port': { v: 9200, at: 1200 } },
        set: merge(layer(3, 0), { port: { num: { to: 9200, delay: 900, dur: 500 } } }),
        fx: [{ type: 'stream', path: 'a3', at: 700, n: 1, dur: 500, color: C.warn, labels: ['9200'] }, { type: 'ripple', obj: 'app', at: 1300, color: C.warn }] },
      { say: '讲师的心智模型：同一个应用，只改配置，不改源码。这样就能部署到两台机器上。笔记本上监听 127.0.0.1。容器里用 ENV HOST=0.0.0.0，改成监听所有网卡。见练习 4 的 Dockerfile。', hl: [7, 8, 9],
        data: { '生效的来源': '部署环境的环境变量' },
        set: (function () {
          var s = { e1: { opacity: { to: 1, dur: 300 } }, e2: { opacity: { to: 1, delay: 300, dur: 300 } }, ei: { dash: { to: 1, delay: 700, dur: 500 } }, host: { text: { to: 'host = 0.0.0.0', delay: 1300 }, color: { to: C.ok, delay: 1300, dur: 300 } } };
          CFG.forEach(function (c, i) { s['c' + i] = { opacity: { to: 0.2, dur: 300 } }; s['a' + i] = { dash: { to: 0, dur: 300 } }; });
          return s;
        })(),
        fx: [{ type: 'stream', path: 'ei', at: 800, n: 2, dur: 700, color: C.ok, labels: ['HOST=0.0.0.0', 'PORT=8080'] }, { type: 'pulse', obj: 'e2', at: 400, color: C.ok }] },
      { say: '配置里的密钥（API key）要格外小心。只在运行时由环境注入。绝不写进代码，不提交进 git，也别打进镜像层。最后这条是第 15 节说的常见错误。',
        set: { e1: { opacity: { to: 0.3, dur: 300 } }, e2: { opacity: { to: 0.3, dur: 300 } }, ei: { dash: { to: 0, dur: 300 } },
          key: { opacity: { to: 1, delay: 200, dur: 300 } }, git: { opacity: { to: 1, delay: 500, dur: 300 } }, img: { opacity: { to: 1, delay: 600, dur: 300 } },
          x1: { opacity: { to: 1, delay: 1300, dur: 200 } }, x2: { opacity: { to: 1, delay: 1500, dur: 200 } },
          c0: { opacity: { to: 0, dur: 300 } }, c1: { opacity: { to: 0, dur: 300 } }, c2: { opacity: { to: 0, dur: 300 } }, c3: { opacity: { to: 0, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'git', at: 1300 }, { type: 'shake', obj: 'img', at: 1500 }, { type: 'pulse', obj: 'key', at: 300, color: C.bad }] }
    ]
  };

  /* ---------- 场景 5：systemd ---------- */
  function sysObjs() {
    return {
      boot: box(110, 120, 140, 44, '开机', C.neutral, C.bg3, { size: 14 }),
      sd: box(110, 250, 160, 56, 'systemd（PID 1）', C.warn, C.warnW, { size: 13, opacity: 0 }),
      dk: box(400, 170, 190, 44, 'docker.service', C.warn, C.warnW, { mono: true, opacity: 0.3 }),
      my: box(400, 330, 190, 44, 'myapp.service', C.info, C.infoW, { mono: true, opacity: 0.3 }),
      p1: path('M110,142 L110,222', C.warn),
      p2: path('M190,240 C260,220 280,180 305,174', C.warn),
      p3: path('M400,192 L400,308', C.info),
      p4: path('M495,330 C560,330 590,260 640,240', C.info),
      p5: path('M495,340 C560,350 590,410 640,420', C.info),
      cache: box(720, 230, 150, 44, 'cache 容器', C.teal, C.tealW, { opacity: 0.25 }),
      web: box(720, 420, 150, 44, 'web 容器', C.info, C.infoW, { opacity: 0.25 }),
      cnt: { type: 'text', x: 720, y: 480, num: 3, pre: 'visits = ', size: 14, mono: true, weight: 800, color: C.teal, opacity: 0 },
      st: { type: 'text', x: 400, y: 380, text: '', size: 12.5, weight: 700, color: C.ok, opacity: 0 }
    };
  }
  var sceneSystemd = {
    name: 'systemd', desc: '服务要开机自启，还要能统一启停。Linux 上这件事归 systemd 管。写一个声明式的单元文件，告诉它三件事。先等 docker 起来再启动我。启动时执行 compose up -d，停止时执行 compose down。',
    code: { lang: 'yaml', title: '/etc/systemd/system/myapp.service（讲义原文）', src: '[Unit]\nDescription=My Application\nRequires=docker.service\nAfter=docker.service\n\n[Service]\nType=oneshot\nRemainAfterExit=yes\nWorkingDirectory=/opt/myapp\nExecStart=/usr/bin/docker compose up -d\nExecStop=/usr/bin/docker compose down\n\n[Install]\nWantedBy=multi-user.target' },
    dataTitle: '单元状态（示意）',
    data: { 'docker.service': '未启动', 'myapp.service': '未启动' },
    bg: function (d) {
      d.text(430, 24, '开机 → systemd → docker.service → myapp.service → 容器', { anchor: 'middle', size: 14, weight: 700, color: C.fg2 });
      d.text(40, 540, '本机没有 Linux，以下为讲义单元文件与视频 52:14–54:30 的演示过程（未实测）', { size: 11.5, color: C.fg3 });
    },
    objects: sysObjs,
    steps: [
      { say: '机器启动，systemd 作为第一个进程起来。它读取 /etc/systemd/system 下的单元文件。WantedBy=multi-user.target 的意思是：系统进入多用户模式时，要启动我。', hl: [13, 14],
        set: { p1: { dash: { to: 1, dur: 500 } }, sd: { opacity: { to: 1, delay: 400, dur: 300 } } },
        fx: [{ type: 'stream', path: 'p1', at: 100, n: 1, dur: 500, color: C.warn }, { type: 'ripple', obj: 'sd', at: 700, color: C.warn }] },
      { say: 'Requires=docker.service 和 After=docker.service 说的是：myapp 依赖 Docker。必须等 Docker 服务起来之后，再启动它。', hl: [3, 4],
        data: { 'docker.service': { v: 'active', at: 900 } },
        set: { p2: { dash: { to: 1, dur: 500 } }, dk: { opacity: { to: 1, delay: 500, dur: 300 }, stroke: { to: C.ok, delay: 900, dur: 300 } } },
        fx: [{ type: 'stream', path: 'p2', at: 100, n: 1, dur: 500, color: C.warn, labels: ['start'] }, { type: 'pulse', obj: 'dk', at: 900, color: C.ok }] },
      { say: '接着启动 myapp：进入 /opt/myapp，执行 docker compose up -d。-d 让容器在后台运行，命令本身马上返回。所以要写 Type=oneshot 和 RemainAfterExit=yes。命令跑完后，服务仍算“已启动”。', hl: [6, 7, 8, 9, 10],
        data: { 'myapp.service': { v: 'active', at: 1000 } },
        set: { p3: { dash: { to: 1, dur: 500 } }, my: { opacity: { to: 1, delay: 500, dur: 300 }, stroke: { to: C.ok, delay: 1000, dur: 300 } },
          p4: { dash: { to: 1, delay: 1100, dur: 500 } }, p5: { dash: { to: 1, delay: 1300, dur: 500 } }, cache: { opacity: { to: 1, delay: 1500, dur: 300 } }, web: { opacity: { to: 1, delay: 1800, dur: 300 } } },
        fx: [{ type: 'stream', path: 'p4', at: 1100, n: 1, dur: 600, color: C.info, labels: ['compose up -d'] }, { type: 'stream', path: 'p5', at: 1300, n: 1, dur: 600, color: C.info }] },
      { say: 'systemctl start myapp 看起来什么也没打印。systemctl status myapp 才能看到，compose up 已经执行过（视频 53:44）。现在由操作系统管理这组服务。',
        log: ['$ systemctl start myapp', '$ systemctl status myapp   # 视频演示，未实测'],
        set: { st: { text: 'status：已执行 compose up', opacity: { to: 1, delay: 600, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'my', at: 500, color: C.ok }] },
      { say: '机器重启，所有容器都没了。但开机时，systemd 按同样的链条自动把它们拉起来。视频里重启后再访问，页面显示已被访问 4 次。计数接着往上走。',
        data: { 'myapp.service': { v: 'active（开机自启）', at: 1600 } },
        set: { cache: { opacity: { to: 0.25, dur: 300 } }, web: { opacity: { to: 0.25, dur: 300 } }, st: { opacity: { to: 0, dur: 300 } },
          cnt: { opacity: { to: 1, delay: 1700, dur: 300 }, num: { to: 4, delay: 1900, dur: 500 } } },
        fx: [{ type: 'flash', obj: 'boot', at: 400, color: C.warn }, { type: 'stream', path: 'p4', at: 1100, n: 1, dur: 500, color: C.info }, { type: 'stream', path: 'p5', at: 1200, n: 1, dur: 500, color: C.info }, { type: 'float', obj: 'cnt', at: 2300, text: '+1', color: C.ok }] },
      { say: 'systemctl stop myapp 执行 ExecStop，也就是 docker compose down。两个容器被停止并移除。单元文件的语法很专门。讲师建议直接问 LLM，学这些选项。', hl: [11],
        log: ['$ systemctl stop myapp   # → docker compose down'],
        data: { 'myapp.service': { v: 'inactive', at: 1000 } },
        set: { cache: { opacity: { to: 0.25, delay: 600, dur: 400 } }, web: { opacity: { to: 0.25, delay: 800, dur: 400 } }, my: { stroke: { to: C.line, delay: 1000, dur: 300 } }, p4: { dash: { to: 0, delay: 300, dur: 500 } }, p5: { dash: { to: 0, delay: 300, dur: 500 } } },
        fx: [{ type: 'burst', obj: 'cache', at: 700, color: C.bad }, { type: 'burst', obj: 'web', at: 900, color: C.bad }] }
    ]
  };

  var NOTES = 'https://missing.csail.mit.edu/2026/shipping-code/';
  VZ.register({
    id: 'ch06-container', title: '虚拟机 vs 容器：交付“整台电脑”的两种方式',
    sources: [
      { t: '视频 33:02 虚拟机', u: 'https://youtu.be/KBMiB-8P4Ns?t=1982' },
      { t: '视频 34:24 容器', u: 'https://youtu.be/KBMiB-8P4Ns?t=2064' },
      { t: '视频 36:17 docker run', u: 'https://youtu.be/KBMiB-8P4Ns?t=2177' },
      { t: '讲义 VMs & Containers', u: NOTES + '#vms--containers' }
    ],
    note: '本机 Docker 无法使用，本演示不含命令输出。分层结构是按讲义和视频的描述画的。',
    scenes: [sceneVm]
  });
  VZ.register({
    id: 'ch06-layers', title: 'Dockerfile 与镜像分层：每条指令一层，层可以缓存',
    sources: [
      { t: '视频 38:15 Dockerfile', u: 'https://youtu.be/KBMiB-8P4Ns?t=2295' },
      { t: '视频 41:25 优化 Dockerfile', u: 'https://youtu.be/KBMiB-8P4Ns?t=2485' },
      { t: '讲义 VMs & Containers', u: NOTES + '#vms--containers' },
      { t: 'Docker 文档 · 构建缓存', u: 'https://docs.docker.com/build/cache/' }
    ],
    note: '未实测，本机 Docker 不可用。CACHED 和重建标记，是按 Docker 的缓存规则画的示意。镜像体积是视频 42:43 的口述。一版接近 2 GB，一版约半个 GB。',
    scenes: [sceneLayers]
  });
  VZ.register({
    id: 'ch06-compose', title: 'Docker Compose：多个服务怎么一起启动、互相找到',
    sources: [
      { t: '视频 46:57 访问计数例子', u: 'https://youtu.be/KBMiB-8P4Ns?t=2817' },
      { t: '视频 48:54 Docker Compose', u: 'https://youtu.be/KBMiB-8P4Ns?t=2934' },
      { t: '讲义 Services & Orchestration', u: NOTES + '#services--orchestration' }
    ],
    note: '前四步的输出，是练习 4 的本机实测，见 ex04-b 和 ex04-c。那里用 Redis 替身代替 redis 镜像。容器 IP、自动重启和卷持久化是示意。docker compose up 未实测。',
    scenes: [sceneCompose]
  });
  VZ.register({
    id: 'ch06-config', title: '配置注入：同一份代码，不同的环境',
    sources: [
      { t: '视频 50:00 配置', u: 'https://youtu.be/KBMiB-8P4Ns?t=3000' },
      { t: '讲义 Configuration', u: NOTES + '#configuration' }
    ],
    note: '前四步是练习 4 的本机实测，见 ex04-a。这个优先级顺序是常见惯例，属于补充。最后两步是示意。',
    scenes: [sceneConfig]
  });
  VZ.register({
    id: 'ch06-systemd', title: 'systemd：开机自启与统一启停',
    sources: [
      { t: '视频 52:14 systemd', u: 'https://youtu.be/KBMiB-8P4Ns?t=3134' },
      { t: '视频 53:44 systemctl', u: 'https://youtu.be/KBMiB-8P4Ns?t=3224' },
      { t: '讲义 Services & Orchestration', u: NOTES + '#services--orchestration' }
    ],
    note: '本机没有 Linux 和 Docker。这里全是示意，照讲义的单元文件和视频演示画的。“访问 4 次”取自视频。',
    scenes: [sceneSystemd]
  });
})();
