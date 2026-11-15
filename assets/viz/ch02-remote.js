/* ch02 · 远程机器：SSH 密钥、远端执行、端口转发、tmux、dotfiles —— 可视化演示
 * 依据：Lecture 2 视频 32:09–36:34（SSH 登录、密钥、ssh-copy-id、远端执行、scp）、37:15–40:29（tmux、SIGHUP、口令）、
 *       43:28–52:40（PATH、bashrc、dotfiles 与符号链接）；讲义 command-line-environment.md 与其练习（LocalForward）。
 * 实测：本机没有 SSH 服务器和 tmux。ssh-keygen / ssh -G / Python 转发替身 / dotfiles 安装脚本的输出取自练习 2（labs/data/lab02.js）
 *       在本机 Git Bash 的真跑结果；凡是需要远端服务器的步骤，控制台只显示命令，输出标“示意”。
 */
(function () {
  var C = VZ.C;
  function merge() { var r = {}; [].slice.call(arguments).forEach(function (o) { for (var k in o) r[k] = o[k]; }); return r; }
  function box(x, y, w, h, text, col, colW, extra) {
    return merge({ type: 'box', x: x, y: y, w: w, h: h, rx: 10, fill: colW || C.bg, stroke: col || C.line, sw: 1.8, text: text || '', color: C.fg, mono: true, size: 13.5, weight: 700 }, extra || {});
  }
  function pipe(d, col, extra) { return merge({ type: 'path', d: d, stroke: col || C.data, sw: 2.4, dash: 0, arrow: 'data' }, extra || {}); }
  function machines(d, lt, rt) { /* 左：笔记本；右：服务器；中间：SSH 连接 */
    d.rect(30, 70, 300, 440, { fill: C.bg2, stroke: C.line, sw: 1.6, rx: 16 });
    d.text(180, 92, lt || '你的笔记本（本地）', { anchor: 'middle', size: 13, weight: 800, color: C.fg2 });
    d.rect(530, 70, 300, 440, { fill: C.bg2, stroke: C.line, sw: 1.6, rx: 16 });
    d.text(680, 92, rt || 'server（远端）', { anchor: 'middle', size: 13, weight: 800, color: C.fg2 });
  }
  var LEC = { t: '讲义 command-line-environment', u: 'https://missing.csail.mit.edu/2026/command-line-environment/' };

  /* ---------- 密钥认证 ---------- */
  var sceneKeys = {
    name: '密钥认证', desc: 'ssh-keygen 生成一对密钥。私钥留在本机，用口令加密。公钥追加到服务器的 authorized_keys。登录时服务器出一道题，只有持有私钥的人答得出。',
    code: { lang: 'sh', title: '依次输入（讲义）', src: 'ssh-keygen -a 100 -t ed25519 -f ~/.ssh/id_ed25519\nssh-keygen -y -f ~/.ssh/id_ed25519\nssh-copy-id -i ~/.ssh/id_ed25519 alice@remote\n# 等价于：\ncat ~/.ssh/id_ed25519.pub | ssh alice@remote \'cat >> ~/.ssh/authorized_keys\'\nssh alice@remote' },
    dataTitle: '密钥状态',
    data: { '私钥': '无', '公钥': '无', 'authorized_keys': '0 行', '认证方式': '无' },
    legend: [[C.bad, '私钥（等同密码，不离开本机）'], [C.teal, '公钥（可以公开）'], [C.warn, '挑战 / 口令'], [C.ok, '验证通过']],
    bg: function (d) {
      machines(d, '你的笔记本', 'remote（alice 的账户）');
      d.rect(60, 300, 240, 170, { fill: 'none', stroke: C.line, dash: '5 4', rx: 10 }); d.text(70, 288, '~/.ssh/', { size: 12, mono: true, color: C.fg3, weight: 700 });
      d.rect(560, 300, 240, 170, { fill: 'none', stroke: C.line, dash: '5 4', rx: 10 }); d.text(570, 288, '~/.ssh/authorized_keys', { size: 12, mono: true, color: C.fg3, weight: 700 });
    },
    objects: {
      kg: box(180, 160, 200, 46, 'ssh-keygen', C.info, C.infoW, { opacity: 0 }),
      priv: box(180, 345, 200, 40, 'id_ed25519（私钥）', C.bad, C.badW, { opacity: 0, size: 12.5 }),
      lock: { type: 'text', x: 290, y: 345, text: '加密', size: 13, opacity: 0 },
      pub: box(180, 410, 200, 40, 'id_ed25519.pub（公钥）', C.teal, C.tealW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } }),
      ak: box(680, 360, 210, 40, 'ssh-ed25519 AAAA… student@laptop', C.teal, C.tealW, { opacity: 0, size: 11 }),
      link: pipe('M330,240 L530,240', C.neutral, { sw: 2, dasharray: '7 5', dash: 1 }),
      chal: box(680, 180, 150, 40, '挑战：随机数', C.warn, C.warnW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } }),
      sigb: box(180, 230, 150, 40, '签名', C.bad, C.badW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } }),
      sh: box(680, 180, 170, 46, 'alice@remote:~$', C.ok, C.okW, { opacity: 0 })
    },
    steps: [
      { say: 'ssh-keygen 在本机生成一对 ed25519 密钥：私钥 id_ed25519 和公钥 id_ed25519.pub。-a 100 让口令更难暴力破解。', hl: [1],
        log: ["$ ssh-keygen -a 100 -t ed25519 -f id_ed25519 -N '…' -C 'student@laptop'", { s: 'Generating public/private ed25519 key pair.', at: 500 }, { s: 'The key fingerprint is:', at: 900 }, { s: 'SHA256:lTtfyUGQxkeHkVReB/qAonSlvohLiK1nQl41RHeLLcE student@laptop', at: 1100 }],
        data: { '私钥': { v: 'id_ed25519', at: 900 }, '公钥': { v: 'id_ed25519.pub', at: 1100 } },
        set: { kg: { opacity: { to: 1, dur: 300 }, s: { from: 0.8, to: 1, dur: 400, ease: 'back' } },
          priv: { opacity: { to: 1, delay: 600, dur: 250 }, y: { from: 170, to: 345, delay: 600, dur: 700, ease: 'out' } },
          pub: { opacity: { to: 1, delay: 800, dur: 250 }, y: { from: 170, to: 410, delay: 800, dur: 700, ease: 'out' } } },
        fx: [{ type: 'ripple', obj: 'priv', at: 1300, color: C.bad }, { type: 'ripple', obj: 'pub', at: 1500, color: C.teal }] },
      { say: '学生问要不要设口令，讲师说一定要。有口令时，私钥文件是加密的。别人偷走文件也用不了。口令输错，连本机都解不开，这是本机实测。', hl: [2],
        log: ["$ ssh-keygen -y -f id_ed25519 -P 'wrong guess'", { s: 'Load key "id_ed25519": incorrect passphrase supplied to decrypt private key', at: 900, cls: 'err' }, { s: '（exit=255）', at: 1100, cls: 'dim' }],
        data: { '私钥': '已用口令加密' },
        set: { kg: { opacity: { to: 0.3, dur: 300 } }, lock: { opacity: { to: 1, delay: 300, dur: 200 }, s: { from: 2, to: 1, delay: 300, dur: 500, ease: 'back' } } },
        fx: [{ type: 'shake', obj: 'priv', at: 950 }] },
      { say: 'ssh-copy-id 把公钥追加到服务器的 ~/.ssh/authorized_keys。讲师强调，这个“魔法命令”只是拷过去一行字符串。私钥原地不动。', hl: [3, 4, 5],
        log: ['$ ssh-copy-id -i ~/.ssh/id_ed25519 alice@remote', { s: '# 本机无服务器，练习 20 用本地目录模拟追加：', at: 1500, cls: 'dim' }, { s: '1 fake-vm/.ssh/authorized_keys', at: 1700 }, { s: 'ssh-ed25519 student@laptop', at: 1800 }],
        data: { 'authorized_keys': { v: '1 行', at: 1500 }, '认证方式': '还要输一次密码（拷贝时）' },
        set: { pub: { x: { to: 680, delay: 200, dur: 1100, ease: 'inOut' }, y: { to: 360, delay: 200, dur: 1100, ease: 'inOut' }, opacity: { to: 0, delay: 1300, dur: 200 } },
          ak: { opacity: { to: 1, delay: 1300, dur: 300 } } },
        fx: [{ type: 'ripple', obj: 'ak', at: 1350, color: C.teal }, { type: 'pulse', obj: 'priv', at: 600, color: C.bad }] },
      { say: '再 ssh alice@remote。服务器在 authorized_keys 里找到你的公钥，发来一道“挑战”。补充一句：通常是对一段随机会话数据签名。', hl: [6],
        log: ['$ ssh alice@remote'], data: { '认证方式': '公钥认证' },
        set: { chal: { opacity: { to: 1, dur: 250 }, x: { from: 680, to: 180, delay: 300, dur: 1100, ease: 'inOut' }, y: { from: 180, to: 230, delay: 300, dur: 1100, ease: 'inOut' } } },
        fx: [{ type: 'pulse', obj: 'ak', at: 100, color: C.teal }] },
      { say: '本机先用口令解密私钥，再用它对挑战签名。只把签名发回去，私钥本身从不离开你的电脑。',
        set: { chal: { opacity: { to: 0, dur: 250 } }, sigb: { opacity: { to: 1, delay: 300, dur: 250 }, x: { from: 180, to: 680, delay: 600, dur: 1100, ease: 'inOut' }, y: { from: 300, to: 360, delay: 600, dur: 1100, ease: 'inOut' } } },
        fx: [{ type: 'pulse', obj: 'priv', at: 200, color: C.bad }, { type: 'pulse', obj: 'lock', at: 200, color: C.warn }] },
      { say: '服务器用公钥验证签名。对得上，说明对方持有私钥，不用输密码就登录了。远端提示符为示意。',
        log: [{ s: 'alice@remote:~$   （示意）', at: 1200, cls: 'dim' }], data: { '认证方式': { v: '公钥认证 √ 无需密码', at: 1000 } },
        set: { sigb: { opacity: { to: 0, delay: 200, dur: 250 } }, ak: { stroke: { to: C.ok, delay: 400, dur: 300 }, fill: { to: C.okW, delay: 400, dur: 300 } },
          link: { stroke: { to: C.ok, delay: 700, dur: 300 } }, sh: { opacity: { to: 1, delay: 900, dur: 300 }, s: { from: 0.8, to: 1, delay: 900, dur: 400, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'ak', at: 500, color: C.ok }, { type: 'burst', obj: 'sh', at: 1100, color: C.ok }] },
      { say: '反过来想。私钥文件一旦被复制走，又没有口令，别人就能冒充你。所有放了这把公钥的服务器，他都能登录。所以私钥等同于密码，永远不要分享。',
        set: { priv: { stroke: { to: C.bad, dur: 200 } } },
        fx: [{ type: 'shake', obj: 'priv', at: 200 }, { type: 'flash', obj: 'priv', at: 200, color: C.bad }] }
    ]
  };

  /* ---------- 远端执行：引号决定管道在哪边 ---------- */
  var sceneExec = {
    name: '远端执行', desc: 'ssh 像普通命令一样有 stdin 和 stdout。没加引号时，本地 shell 先切开管道，wc 在本地。加了引号，整段交给远端 shell，ls 和 wc 都在服务器上。',
    code: { lang: 'sh', title: '讲义原文', src: '# here ls runs in the remote, and wc runs locally\nssh alice@server ls | wc -l\n\n# here both ls and wc run in the server\nssh alice@server \'ls | wc -l\'\n\nscp ignore.py alice@server:demo/' },
    dataTitle: '谁在哪台机器上运行',
    data: { 'ls': '无', 'wc -l': '无', '经网络传回': '无' },
    bg: function (d) { machines(d); d.text(430, 225, 'SSH 加密连接', { anchor: 'middle', size: 12, color: C.fg3, weight: 700 }); },
    objects: {
      line: { type: 'text', x: 430, y: 40, text: '$ ssh alice@server ls | wc -l', size: 17, mono: true, weight: 700, color: C.fg },
      ssh: box(150, 250, 120, 44, 'ssh', C.info, C.infoW, { opacity: 0 }),
      wcL: box(150, 400, 120, 44, 'wc -l', C.info, C.infoW, { opacity: 0 }),
      pL: pipe('M150,272 L150,378'),
      tun: { type: 'path', d: 'M210,250 C330,250 520,250 620,250', stroke: C.ok, sw: 7, dash: 0, opacity: 0.45 },
      back: pipe('M620,262 C520,262 330,262 210,262', C.data, { sw: 2.2 }),
      sshd: box(680, 250, 120, 44, 'sshd', C.neutral, C.bg, { opacity: 0 }),
      lsR: box(680, 160, 120, 44, 'ls', C.info, C.infoW, { opacity: 0 }),
      wcR: box(680, 400, 120, 44, 'wc -l', C.info, C.infoW, { opacity: 0 }),
      pR: pipe('M680,182 L680,378', C.data, { dash: 0 }),
      cmdpk: box(250, 230, 120, 30, '"ls"', C.warn, C.warnW, { opacity: 0, size: 12.5, trail: { n: 5, gap: 40 } }),
      res: { type: 'text', x: 150, y: 470, text: '', size: 14, mono: true, weight: 800, color: C.ok, opacity: 0 },
      file: box(150, 160, 120, 40, 'ignore.py', C.teal, C.tealW, { opacity: 0, trail: { n: 5, gap: 40 } })
    },
    steps: [
      { say: '本地 shell 先解析整行。没有引号保护的 | 把它切成两条命令。一条是 ssh alice@server ls，一条是 wc -l。两个都在本机启动。', hl: [2],
        log: '$ ssh alice@server ls | wc -l', data: { 'wc -l': '本机' },
        set: { ssh: { opacity: { to: 1, dur: 300 }, s: { from: 0.8, to: 1, dur: 400, ease: 'back' } }, wcL: { opacity: { to: 1, delay: 150, dur: 300 }, s: { from: 0.8, to: 1, delay: 150, dur: 400, ease: 'back' } }, pL: { dash: { to: 1, delay: 400, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'line', at: 100, color: C.warn }] },
      { say: 'ssh 建立加密连接，把剩下的参数 "ls" 发过去。这就是要在远端执行的命令。sshd 在服务器上启动 shell，运行 ls。',
        data: { 'ls': { v: '服务器', at: 1400 } },
        set: { tun: { dash: { to: 1, dur: 600 } }, sshd: { opacity: { to: 1, delay: 400, dur: 300 } },
          cmdpk: { opacity: { to: 1, delay: 500, dur: 200 }, x: { from: 250, to: 620, delay: 600, dur: 800, ease: 'inOut' }, y: { from: 238, to: 238, dur: 0 } },
          lsR: { opacity: { to: 1, delay: 1400, dur: 300 }, s: { from: 0.7, to: 1, delay: 1400, dur: 400, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'sshd', at: 1400, color: C.info }] },
      { say: 'ls 的每一行输出都经网络传回，成为本地 ssh 的 stdout。再流进本地的 wc -l 计数，行数为示意。',
        log: [{ s: '（远端 ls 的输出逐行传回本机，wc 在本机计数，结果为示意）', at: 1600, cls: 'dim' }], data: { '经网络传回': { v: 'ls 的全部输出', at: 900 } },
        set: { cmdpk: { opacity: { to: 0, dur: 200 } }, back: { dash: { to: 1, delay: 200, dur: 500 } }, res: { text: '42', opacity: { to: 1, delay: 2000, dur: 300 } } },
        fx: [{ type: 'stream', path: 'back', at: 500, n: 6, dur: 1300, color: C.data, labels: ['a.txt', 'b.txt', 'demo', '…'] }, { type: 'stream', path: 'pL', at: 1400, n: 4, dur: 700, color: C.data }, { type: 'pulse', obj: 'wcL', at: 1900, color: C.ok }] },
      { say: '加上引号：\'ls | wc -l\' 整个成为 ssh 的一个参数。本地 shell 不会去切它。', hl: [5],
        log: "$ ssh alice@server 'ls | wc -l'", data: { 'ls': '无', 'wc -l': '无', '经网络传回': '无' },
        set: { line: { text: "$ ssh alice@server 'ls | wc -l'" }, wcL: { opacity: { to: 0.15, dur: 300 } }, pL: { dash: { to: 0, dur: 300 } }, back: { dash: { to: 0, dur: 300 } }, res: { opacity: { to: 0, dur: 200 } }, lsR: { opacity: { to: 0.3, dur: 300 } },
          cmdpk: { text: "'ls | wc -l'", w: { to: 130, dur: 0 }, opacity: { from: 0, to: 1, delay: 400, dur: 200 }, x: { from: 250, to: 620, delay: 500, dur: 900, ease: 'inOut' } } },
        fx: [{ type: 'pulse', obj: 'line', at: 100, color: C.warn }] },
      { say: '远端的 shell 解析这串字符。ls 和 wc -l 都在服务器上跑，中间的管道也在服务器上。', data: { 'ls': '服务器', 'wc -l': { v: '服务器', at: 900 } },
        set: { cmdpk: { opacity: { to: 0, dur: 200 } }, lsR: { opacity: { to: 1, dur: 300 } }, wcR: { opacity: { to: 1, delay: 600, dur: 300 }, s: { from: 0.7, to: 1, delay: 600, dur: 400, ease: 'back' } }, pR: { dash: { to: 1, delay: 300, dur: 500 } } },
        fx: [{ type: 'stream', path: 'pR', at: 800, n: 6, dur: 1100, color: C.data, labels: ['a.txt', 'b.txt', 'demo', '…'] }] },
      { say: '只有最终那个数字经网络传回本机。数据量大时，在远端先处理好再传回来要省得多。', data: { '经网络传回': { v: '一个数字', at: 900 } },
        log: [{ s: '（只传回 wc 的结果，数值为示意）', at: 1500, cls: 'dim' }],
        set: { back: { dash: { to: 1, dur: 500 } }, res: { text: '42', opacity: { from: 0, to: 1, delay: 1400, dur: 300 } } },
        fx: [{ type: 'stream', path: 'back', at: 400, n: 1, dur: 1000, color: C.ok, labels: ['42'] }] },
      { say: 'scp 走的是同一种 SSH 连接。讲师把 ignore.py 拷到服务器的 demo/ 目录。已经配好的密钥，直接可用。', hl: [7],
        log: ['$ scp ignore.py alice@server:demo/'],
        set: { back: { dash: { to: 0, dur: 300 } }, res: { opacity: { to: 0, dur: 200 } }, wcR: { opacity: { to: 0.2, dur: 300 } }, lsR: { opacity: { to: 0.2, dur: 300 } }, pR: { dash: { to: 0, dur: 300 } },
          line: { text: '$ scp ignore.py alice@server:demo/' },
          file: { opacity: { to: 1, dur: 250 }, x: { from: 150, to: 680, delay: 300, dur: 1300, ease: 'inOut' }, y: { from: 160, to: 160, dur: 0 } } },
        fx: [{ type: 'ripple', obj: 'file', at: 1650, color: C.teal }] }
    ]
  };

  /* ---------- 端口转发 LocalForward ---------- */
  var sceneFwd = {
    name: '端口转发', desc: 'LocalForward 9999 localhost:8888。本机 9999 端口收到的连接，经 SSH 连接送到 VM 上。再由 sshd 替你连 VM 自己的 localhost:8888。',
    code: { lang: 'text', title: '~/.ssh/config（练习 19）', src: 'Host vm\n    User username_goes_here\n    HostName ip_goes_here\n    IdentityFile ~/.ssh/id_ed25519\n    LocalForward 9999 localhost:8888' },
    dataTitle: '一次请求的路径',
    data: { '本机监听': '无', 'VM 上的服务': '无', '响应': '无' },
    bg: function (d) { machines(d, '本机', 'vm'); d.text(430, 225, 'SSH 加密连接', { anchor: 'middle', size: 12, color: C.fg3, weight: 700 }); },
    objects: {
      cur: box(150, 150, 150, 44, 'curl / 浏览器', C.data, C.dataW, { opacity: 0 }),
      p9: { type: 'circle', x: 150, y: 260, r: 26, fill: C.warnW, stroke: C.warn, sw: 2, text: ':9999', size: 12, color: C.warn, opacity: 0 },
      ssh: box(250, 360, 120, 44, 'ssh', C.info, C.infoW, { opacity: 0 }),
      tun: { type: 'path', d: 'M310,360 C400,330 470,330 560,360', stroke: C.ok, sw: 7, dash: 0, opacity: 0.45 },
      sshd: box(620, 360, 120, 44, 'sshd', C.neutral, C.bg, { opacity: 0 }),
      p8: { type: 'circle', x: 710, y: 260, r: 26, fill: C.tealW, stroke: C.teal, sw: 2, text: ':8888', size: 12, color: C.teal, opacity: 0 },
      web: box(710, 150, 190, 44, 'python -m http.server 8888', C.teal, C.tealW, { opacity: 0, size: 11.5 }),
      a1: pipe('M150,174 L150,232'), a2: pipe('M150,288 C150,330 180,360 188,360'),
      a3: pipe('M310,372 C400,345 470,345 560,372', C.data, { opacity: 1 }),
      a4: pipe('M680,360 C700,330 710,310 710,288'), a5: pipe('M710,232 L710,174'),
      r1: pipe('M690,172 C660,240 640,300 600,340', C.ok), r2: pipe('M560,384 C470,360 400,360 310,384', C.ok), r3: pipe('M190,384 C120,330 120,260 130,174', C.ok)
    },
    steps: [
      { say: 'ssh vm 读到配置里的 LocalForward。用 ssh -G 不用真连接，就能看到解析结果。这是本机实测。', hl: [5],
        log: ['$ ssh -F ~/.ssh/config -G vm < /dev/null | grep -E \'^(user|hostname|port|identityfile|localforward) \'', { s: 'user username_goes_here', at: 600 }, { s: 'hostname ip_goes_here', at: 700 }, { s: 'port 22', at: 800 }, { s: 'localforward 9999 [localhost]:8888', at: 900 }, { s: 'identityfile ~/.ssh/id_ed25519', at: 1000 }],
        set: { ssh: { opacity: { to: 1, dur: 300 } }, tun: { dash: { to: 1, delay: 300, dur: 600 } }, sshd: { opacity: { to: 1, delay: 700, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'ssh', at: 200, color: C.info }] },
      { say: '连接建立后，本机的 ssh 进程开始监听 127.0.0.1:9999。', data: { '本机监听': { v: '127.0.0.1:9999（ssh 进程）', at: 500 } },
        set: { p9: { opacity: { to: 1, dur: 300 }, r: { from: 10, to: 26, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'p9', at: 400, color: C.warn }] },
      { say: '在 VM 里运行 python -m http.server 8888。它只在 VM 上监听 8888，本机直接访问不到。原因可能是防火墙，或者只绑在 localhost。',
        log: [{ s: '# 在 VM 里（未实测，本机无 VM）', cls: 'dim' }, '$ python -m http.server 8888'], data: { 'VM 上的服务': 'localhost:8888' },
        set: { web: { opacity: { to: 1, dur: 300 } }, p8: { opacity: { to: 1, delay: 300, dur: 300 }, r: { from: 10, to: 26, delay: 300, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'p8', at: 700, color: C.teal }] },
      { say: '本机访问 http://localhost:9999。请求先到 ssh，被塞进加密连接，到达 VM 上的 sshd。sshd 再替你去连 VM 自己的 localhost:8888。',
        log: ['$ curl http://localhost:9999/'],
        set: { cur: { opacity: { to: 1, dur: 250 } }, a1: { dash: { to: 1, delay: 200, dur: 300 } }, a2: { dash: { to: 1, delay: 500, dur: 300 } }, a3: { dash: { to: 1, delay: 800, dur: 400 } }, a4: { dash: { to: 1, delay: 1200, dur: 300 } }, a5: { dash: { to: 1, delay: 1500, dur: 300 } } },
        fx: [{ type: 'stream', path: 'a1', at: 200, n: 1, dur: 400, color: C.data, labels: ['GET /'] }, { type: 'stream', path: 'a3', at: 800, n: 2, dur: 600, color: C.data, labels: ['加密'] }, { type: 'stream', path: 'a5', at: 1500, n: 1, dur: 400, color: C.data, labels: ['GET /'] }, { type: 'pulse', obj: 'web', at: 1900, color: C.teal }] },
      { say: '响应沿原路返回。本机没有 VM，练习 21 用 Python 写了个转发替身。它在本机真跑了同一条路径，端口改成 19999 → 18888。',
        log: [{ s: '# 本机替身实测（练习 21）：', at: 300, cls: 'dim' }, { s: '<h1>hello from the VM</h1>', at: 1500 }, { s: '200 via localhost:19999', at: 1700 }], data: { '响应': { v: '200 OK', at: 1500 } },
        set: { r1: { dash: { to: 1, dur: 400 } }, r2: { dash: { to: 1, delay: 400, dur: 400 } }, r3: { dash: { to: 1, delay: 800, dur: 400 } } },
        fx: [{ type: 'stream', path: 'r1', at: 0, n: 1, dur: 400, color: C.ok, labels: ['200'] }, { type: 'stream', path: 'r2', at: 400, n: 2, dur: 600, color: C.ok }, { type: 'stream', path: 'r3', at: 900, n: 1, dur: 500, color: C.ok, labels: ['<h1>…'] }, { type: 'ripple', obj: 'cur', at: 1400, color: C.ok }] },
      { say: '只想要转发、不想要远端 shell，就加 -N 和 -f。-N 不执行远端命令，-f 认证后转入后台。完整命令是 ssh -N -f -L 9999:localhost:8888 vm，见练习 24。',
        log: ['$ ssh -N -f -L 9999:localhost:8888 vm', { s: '（未实测：需要 VM）', at: 400, cls: 'dim' }],
        fx: [{ type: 'pulse', obj: 'ssh', at: 200, color: C.info }, { type: 'pulse', obj: 'p9', at: 500, color: C.warn }] }
    ]
  };

  /* ---------- tmux：会话 / 窗口 / 窗格 与 detach ---------- */
  var TX = 640, TY = 300;
  var sceneTmux = {
    name: 'tmux 分离与接回', desc: 'tmux 在服务器上常驻一个“服务器进程”，管理所有会话。你断开 SSH 时，shell 会收到 SIGHUP，但 tmux 拦住了它。重新连上，tmux attach 就接回原样的会话。',
    code: { lang: 'sh', title: '在服务器上依次输入 / 按键（讲义）', src: 'tmux new -s work\n./long_job          # 在窗格里跑程序\n<C-b> "             # 上下分割窗格\n<C-b> c             # 新建窗口\n<C-b> d             # 分离（detach）\n# …断开 SSH，过一会儿再连上…\ntmux a -t work      # 接回（attach）' },
    dataTitle: 'tmux 状态（示意）',
    data: { '会话': '无', '窗口': '无', '窗格': '无', '你的连接': '无' },
    bg: function (d) { machines(d, '你的笔记本', 'server'); },
    objects: {
      term: box(180, 200, 220, 110, '', C.neutral, '#0f1318', { rx: 10 }),
      tt: { type: 'text', x: 180, y: 200, text: '$ ssh alice@server', size: 12.5, mono: true, color: '#9be09b', weight: 600 },
      con: { type: 'path', d: 'M290,200 C380,200 440,170 500,170', stroke: C.ok, sw: 6, dash: 0, opacity: 0.45 },
      srv: box(TX, 140, 220, 40, 'tmux server 进程', C.info, C.infoW, { opacity: 0, size: 13 }),
      sess: box(TX, TY, 270, 220, '', C.data, C.bg, { opacity: 0, rx: 12 }),
      stl: { type: 'text', x: TX - 120, y: TY - 95, anchor: 'start', text: '会话 work', size: 12.5, weight: 800, color: C.data, opacity: 0 },
      w0: box(TX - 60, TY - 70, 70, 24, '窗口 0', C.teal, C.tealW, { opacity: 0, size: 11.5 }),
      w1: box(TX + 20, TY - 70, 70, 24, '窗口 1', C.teal, C.tealW, { opacity: 0, size: 11.5 }),
      pa: box(TX, TY + 15, 240, 130, './long_job  ▮▮▮', C.ok, C.okW, { opacity: 0, size: 12 }),
      pb: box(TX, TY + 55, 240, 60, 'vim ignore.py', C.ok, C.okW, { opacity: 0, size: 12 }),
      hup: box(380, 420, 110, 36, 'SIGHUP', C.bad, C.badW, { opacity: 0, size: 13, color: C.bad, trail: { n: 5, gap: 40 } }),
      shield: { type: 'circle', x: TX, y: 140, r: 40, fill: 'none', stroke: C.ok, sw: 2.5, opacity: 0 }
    },
    steps: [
      { say: 'SSH 到服务器后，运行 tmux new -s work。tmux 在服务器上启动一个常驻的 server 进程。它建立了一个名为 work 的会话。', hl: [1],
        log: ['$ ssh alice@server', '$ tmux new -s work', { s: '（tmux 未实测：本机没有 tmux）', at: 600, cls: 'dim' }], data: { '会话': 'work', '窗口': '0', '窗格': '1 个', '你的连接': '已连接' },
        set: { con: { dash: { to: 1, dur: 500 } }, srv: { opacity: { to: 1, delay: 400, dur: 300 } }, sess: { opacity: { to: 1, delay: 700, dur: 300 }, s: { from: 0.85, to: 1, delay: 700, dur: 450, ease: 'back' } },
          stl: { opacity: { to: 1, delay: 900, dur: 300 } }, w0: { opacity: { to: 1, delay: 1000, dur: 300 } }, tt: { text: { to: 'tmux: [work] 0:bash', delay: 900 } } },
        fx: [{ type: 'ripple', obj: 'srv', at: 600, color: C.info }] },
      { say: '在窗格里跑一个长时间的程序。没有 tmux 时，这个终端就被它占住，什么别的都干不了。', hl: [2],
        log: '$ ./long_job', set: { pa: { opacity: { to: 1, dur: 300 }, s: { from: 0.9, to: 1, dur: 400 } } },
        fx: [{ type: 'pulse', obj: 'pa', at: 400, color: C.ok }] },
      { say: '<C-b> "：先按 Ctrl+b，松开，再按 "。当前窗格上下一分为二。新窗格里可以编辑文件，程序照跑。', hl: [3],
        data: { '窗格': '2 个' },
        set: { pa: { h: { to: 60, dur: 600, ease: 'inOut' }, y: { to: TY - 15, dur: 600, ease: 'inOut' } }, pb: { opacity: { to: 1, delay: 400, dur: 300 }, y: { from: TY + 90, to: TY + 55, delay: 400, dur: 500, ease: 'out' } } },
        fx: [{ type: 'pulse', obj: 'pb', at: 900, color: C.ok }] },
      { say: '<C-b> c：新建一个窗口，像浏览器的标签页。<C-b> 0 和 <C-b> 1 在它们之间切换。', hl: [4],
        data: { '窗口': '0、1' }, set: { w1: { opacity: { to: 1, dur: 300 }, x: { from: TX + 60, to: TX + 20, dur: 500, ease: 'back' } } },
        fx: [{ type: 'ripple', obj: 'w1', at: 400, color: C.teal }] },
      { say: '<C-b> d：分离。你的终端回到普通 shell。会话、窗口、窗格和正在跑的程序，都还在服务器上。', hl: [5],
        data: { '你的连接': '已分离（会话仍在）' },
        set: { tt: { text: '[detached] $', color: { to: C.fg2, dur: 300 } }, sess: { stroke: { to: C.info, dur: 300 } } },
        fx: [{ type: 'pulse', obj: 'sess', at: 300, color: C.data }] },
      { say: '断开 SSH 时，服务器上这次登录的 shell 收到挂断信号 SIGHUP。普通子进程会跟着死。tmux 拦下了这个信号，不往下传。', hl: [6],
        data: { '你的连接': { v: '已断开', at: 600 } },
        set: { con: { dash: { to: 0, dur: 500 } }, tt: { text: { to: '（连接已关闭）', delay: 400 } },
          hup: { opacity: { to: 1, delay: 500, dur: 200 }, s: { from: 1, to: 0.01, delay: 1500, dur: 300 }, x: { from: 380, to: TX - 60, delay: 600, dur: 800, ease: 'in' }, y: { from: 420, to: 160, delay: 600, dur: 800, ease: 'in' } },
          shield: { opacity: { to: 1, delay: 1300, dur: 200 }, r: { from: 20, to: 40, delay: 1300, dur: 400, ease: 'back' } } },
        fx: [{ type: 'shake', obj: 'hup', at: 1450 }, { type: 'ripple', obj: 'shield', at: 1450, color: C.ok }] },
      { say: '过一会儿重新 ssh 上去，敲 tmux a -t work 接回会话。两个窗口、两个窗格、跑了很久的程序，都原样还在。', hl: [7],
        log: ['$ ssh alice@server', '$ tmux a -t work'], data: { '你的连接': { v: '已接回', at: 900 } },
        set: { hup: { opacity: { to: 0, dur: 300 } }, shield: { opacity: { to: 0, delay: 300, dur: 300 } }, con: { dash: { to: 1, delay: 300, dur: 500 } },
          tt: { text: { to: 'tmux: [work] 0:bash* 1:bash', delay: 900 }, color: { to: '#9be09b', delay: 900, dur: 200 } }, pa: { text: './long_job  ▮▮▮▮▮▮▮' } },
        fx: [{ type: 'ripple', obj: 'term', at: 900, color: C.ok }, { type: 'pulse', obj: 'pa', at: 1100, color: C.ok }] }
    ]
  };

  /* ---------- dotfiles：符号链接与安装 ---------- */
  var HX = 200, RX = 640;
  var FILES = [['bashrc', '.bashrc', 'bash/bashrc'], ['aliases', '.bash_aliases', 'bash/aliases'], ['gitconfig', '.gitconfig', 'git/gitconfig'], ['tmux', '.tmux.conf', 'tmux/tmux.conf']];
  function dotObjs() {
    var o = {};
    FILES.forEach(function (f, i) {
      var y = 170 + i * 70;
      o['h' + i] = box(HX, y, 190, 38, '~/' + f[1], C.teal, C.bg, { opacity: 0, size: 13 });
      o['r' + i] = box(RX, y, 190, 38, f[2], C.ok, C.okW, { size: 13 });
      o['l' + i] = { type: 'path', d: 'M' + (HX + 96) + ',' + y + ' L' + (RX - 98) + ',' + y, stroke: C.teal, sw: 2, dash: 0, arrow: 'data' };
    });
    o.old = box(HX, 120, 170, 32, '~/.bashrc（旧文件）', C.neutral, C.bg3, { size: 12, opacity: 0 });
    o.bash = box(HX, 470, 170, 44, 'bash -i', C.info, C.infoW, { opacity: 0 });
    o.rd = { type: 'path', d: 'M' + (HX - 70) + ',450 C40,430 40,200 ' + (HX - 96) + ',172', stroke: C.info, sw: 2.2, dash: 0, arrow: 'info' };
    return o;
  }
  var sceneDot = {
    name: 'dotfiles 软链接', desc: '配置文件的真身放在 git 仓库 ~/.dotfiles 里。家目录里只放指向它们的符号链接。程序照常读 ~/.bashrc，实际读到的是仓库里的文件。',
    code: { lang: 'sh', title: '练习 14 · install.sh 的核心（完整版见练习页）', src: 'link() {\n    local src="$DOTFILES/$1" dst="$HOME/$2"\n    if [[ -e "$dst" && ! -L "$dst" ]]; then\n        mv "$dst" "$dst.backup"\n    fi\n    ln -sfn "$src" "$dst"\n}\nlink bash/bashrc    .bashrc\nlink bash/aliases   .bash_aliases\nlink git/gitconfig  .gitconfig\nlink tmux/tmux.conf .tmux.conf' },
    dataTitle: '家目录（练习 14/15 的沙箱）',
    data: { '~/.bashrc': '普通文件（旧）', '链接数': 0, 'dc': '无' },
    bg: function (d) {
      d.rect(HX - 120, 80, 240, 340, { fill: 'none', stroke: C.teal, dash: '5 4', rx: 12 }); d.text(HX, 96, '~（家目录）', { anchor: 'middle', size: 12.5, weight: 800, color: C.teal });
      d.rect(RX - 120, 120, 240, 300, { fill: C.okW, stroke: C.ok, rx: 12, sw: 1.4, opacity: 0.6 }); d.text(RX, 106, '~/.dotfiles（git 仓库）', { anchor: 'middle', size: 12.5, weight: 800, color: C.ok });
    },
    objects: dotObjs,
    steps: [
      { say: '仓库里放着各工具配置文件的“真身”，用 git 管理。家目录里原本有一个旧的 ~/.bashrc。',
        log: ['$ git log --stat --format=%s | cat', { s: 'Initial dotfiles', at: 400 }, { s: ' 6 files changed, 74 insertions(+)', at: 700 }],
        set: { old: { opacity: { to: 1, dur: 300 } } }, fx: [{ type: 'pulse', obj: 'r0', at: 300, color: C.ok }] },
      { say: 'install.sh 第一件事：发现 ~/.bashrc 是个真文件，不是链接。先改名备份，绝不直接覆盖。', hl: [3, 4, 5],
        log: ['$ bash dotfiles/install.sh', { s: 'backup: ~/.bashrc -> ~/.bashrc.backup', at: 700 }], data: { '~/.bashrc': { v: '已备份为 .bashrc.backup', at: 700 } },
        set: { old: { text: '~/.bashrc.backup', y: { to: 420, delay: 200, dur: 700, ease: 'inOut' }, x: { to: HX, dur: 0 }, opacity: { to: 0.5, delay: 800, dur: 300 } } },
        fx: [{ type: 'float', obj: 'old', at: 900, text: 'backup', color: C.neutral }] },
      { say: '然后为每个文件 ln -sfn 建符号链接。家目录里的名字，指向仓库里的真文件。这是本机实测输出。', hl: [6, 8, 9, 10, 11],
        log: [{ s: 'linked: ~/.bashrc -> bash/bashrc', at: 300 }, { s: 'linked: ~/.bash_aliases -> bash/aliases', at: 600 }, { s: 'linked: ~/.gitconfig -> git/gitconfig', at: 900 }, { s: 'linked: ~/.tmux.conf -> tmux/tmux.conf', at: 1200 }],
        data: { '~/.bashrc': { v: '符号链接', at: 300 }, '链接数': { v: 4, at: 1200 } },
        set: (function () { var s = {}; FILES.forEach(function (f, i) { s['h' + i] = { opacity: { to: 1, delay: 300 * i, dur: 250 } }; s['l' + i] = { dash: { to: 1, delay: 300 * i + 100, dur: 400 } }; }); return s; })(),
        fx: [{ type: 'ripple', obj: 'h0', at: 300, color: C.teal }, { type: 'ripple', obj: 'h3', at: 1200, color: C.teal }] },
      { say: '新开交互式 bash，它照常打开 ~/.bashrc。链接把它引到仓库里的 bash/bashrc，逐行执行。别名文件也经链接加载，dc 生效了。',
        log: ["$ bash -i -c 'type dc; …'   # 练习 15 的检查命令", { s: "dc is aliased to `cd'", at: 2400 }], data: { 'dc': { v: '别名 → cd', at: 2400 } },
        set: { bash: { opacity: { to: 1, dur: 300 } }, rd: { dash: { to: 1, delay: 300, dur: 800 } } },
        fx: [{ type: 'stream', path: 'rd', at: 700, n: 1, dur: 700, color: C.info, labels: ['open ~/.bashrc'] }, { type: 'stream', path: 'l0', at: 1300, n: 3, dur: 800, color: C.info, labels: ['PS1=…', 'export PATH', 'source …'] }, { type: 'pulse', obj: 'r0', at: 1900, color: C.ok }, { type: 'stream', path: 'l1', at: 1900, n: 2, dur: 600, color: C.info, labels: ['alias dc=cd'] }] },
      { say: '好处马上就体现了。直接改仓库里的 aliases，追加一个别名。家目录那边不用动，新 shell 立刻能用。这是练习 14 的实测。',
        log: ["$ echo \"alias hi='echo hello from the repo'\" >> dotfiles/bash/aliases", "$ bash -i -c 'hi'", { s: 'hello from the repo', at: 1300 }],
        set: { r1: { text: 'bash/aliases (+1 行)' } },
        fx: [{ type: 'flash', obj: 'r1', at: 300, color: C.ok }, { type: 'stream', path: 'l1', at: 600, n: 2, dur: 600, color: C.teal }] },
      { say: '换一台新机器，这里用一个全新的空 HOME 代替。git clone 加运行 install.sh，一分钟回到熟悉的环境。这是练习 15 的实测。',
        log: ['$ export HOME="$PWD/fresh-home"; ls -A ~ | wc -l', { s: '0', at: 300 }, '$ git clone -q dotfiles ~/.dotfiles && bash ~/.dotfiles/install.sh', { s: 'linked: ~/.bashrc -> bash/bashrc  …（共 4 行）', at: 1200 }, { s: "dc is aliased to `cd'", at: 1700 }],
        data: { '~/.bashrc': '符号链接（新机器）', '链接数': 4 },
        set: (function () { var s = { old: { opacity: { to: 0, dur: 300 } }, bash: { opacity: { to: 0.3, dur: 300 } }, rd: { dash: { to: 0, dur: 300 } } }; FILES.forEach(function (f, i) { s['h' + i] = { opacity: { from: 0, to: 1, delay: 800 + 120 * i, dur: 200 } }; s['l' + i] = { dash: { from: 0, to: 1, delay: 850 + 120 * i, dur: 300 } }; }); return s; })(),
        fx: [{ type: 'burst', x: HX, y: 260, at: 700, color: C.teal }] },
      { say: 'Windows 上有个坑。Git Bash 默认的 ln -s 其实是复制。改仓库不会影响家目录那份。install.sh 设置 MSYS=winsymlinks:nativestrict，强制建真链接。这是练习 14 的实测。',
        log: ['$ ln -s "$PWD/dotfiles/bash/bashrc" t/bashrc-plain', { s: 'NOT a symlink: plain ln -s copied the file', at: 600, cls: 'err' }, '$ MSYS=winsymlinks:nativestrict ln -s … t/bashrc-native', { s: 'symlink (MSYS=winsymlinks:nativestrict)', at: 1300 }],
        set: { l0: { stroke: { to: C.bad, dur: 300 } } },
        fx: [{ type: 'shake', obj: 'h0', at: 600 }, { type: 'pulse', obj: 'h0', at: 1300, color: C.ok }] }
    ]
  };

  VZ.register({ id: 'ch02-keys', title: 'SSH 密钥认证：私钥不出门，公钥放上服务器',
    sources: [{ t: '视频 32:47 SSH 密钥', u: 'https://youtu.be/ccBGsPedE9Q?t=1967' }, { t: '视频 34:43 ssh-copy-id', u: 'https://youtu.be/ccBGsPedE9Q?t=2083' }, { t: '视频 40:29 口令', u: 'https://youtu.be/ccBGsPedE9Q?t=2429' }, LEC],
    note: 'ssh-keygen 的输出为本机实测，见练习 18。authorized_keys 用本地目录模拟，见练习 20。挑战和签名的过程，是补充说明的原理示意。', scenes: [sceneKeys] });
  VZ.register({ id: 'ch02-ssh', title: 'SSH 不只是登录：远端执行与端口转发',
    sources: [{ t: '视频 35:19 远端执行', u: 'https://youtu.be/ccBGsPedE9Q?t=2119' }, { t: '视频 36:34 scp', u: 'https://youtu.be/ccBGsPedE9Q?t=2194' }, { t: 'man ssh（-L -N -f）', u: 'https://man.openbsd.org/ssh' }, LEC],
    note: '本机没有 SSH 服务器，远端输出与行数为示意。ssh -G 与“转发替身”的输出为本机实测。见练习 19、21。', scenes: [sceneExec, sceneFwd] });
  VZ.register({ id: 'ch02-tmux', title: 'tmux：会话不随 SSH 连接一起死',
    sources: [{ t: '视频 37:15 tmux', u: 'https://youtu.be/ccBGsPedE9Q?t=2235' }, { t: '视频 39:06 detach 与 SIGHUP', u: 'https://youtu.be/ccBGsPedE9Q?t=2346' }, { t: 'man tmux', u: 'https://www.man7.org/linux/man-pages/man1/tmux.1.html' }, LEC],
    note: '本机没有 tmux，整幕为原理示意。按键与层级取自讲义，SIGHUP 的说法取自视频 39:46。./long_job 是假想的程序。', scenes: [sceneTmux] });
  VZ.register({ id: 'ch02-dotfiles', title: 'dotfiles：家目录里只放链接',
    sources: [{ t: '视频 50:24 符号链接', u: 'https://youtu.be/ccBGsPedE9Q?t=3024' }, { t: '视频 51:33 dotfiles 仓库', u: 'https://youtu.be/ccBGsPedE9Q?t=3093' }, { t: 'dotfiles.github.io', u: 'https://dotfiles.github.io/' }, LEC],
    note: '控制台输出是本机 Git Bash 的真跑结果。取自练习 12、14、15，用的是沙箱 HOME。方框布局为示意。', scenes: [sceneDot] });
})();
