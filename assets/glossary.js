/* ==========================================================================
 * glossary.js · 术语小卡片
 *  鼠标移到缩写 / 专有名词上（手机上点一下）弹出小卡片：全称 + 一句话解释。
 *  数据格式：['词条|别名', '全称', '解释', 选项]
 *    选项 'c' = 只在“整段行内代码正好等于它”时才匹配（用于 ls、cat 这类也是普通英文的词）。
 *  解释是笔记作者补充的背景知识（非视频内容）。想加词条，在下面列表里加一行即可。
 *  所有术语都有一条很淡的细下划线；每节第一次出现的可以用 Tab 键走到（键盘操作）。
 * ========================================================================== */
(function () {
  'use strict';
  var G = [
    /* ---- shell 与操作系统 ---- */
    ['shell|Shell', 'shell · 外壳', '读你输入的命令并启动程序的解释器。它是你和操作系统之间的文本接口。'],
    ['bash|Bash', 'Bourne Again SHell', '最普及的 Unix shell，由 GNU 项目编写，是早期 Bourne shell 的增强版。'],
    ['zsh|Zsh', 'Z Shell', '与 bash 基本兼容、交互体验更好的 shell，是如今 macOS 的默认 shell。'],
    ['fish', 'Friendly Interactive SHell', '主打开箱即用的交互式 shell，语法与 bash 不兼容。'],
    ['Unix', 'Unix 操作系统', '1970 年代诞生于贝尔实验室的操作系统。Linux 和 macOS 的命令行都继承自它。'],
    ['Linux', 'Linux', '开源的类 Unix 操作系统内核，也泛指基于它的各种发行版。'],
    ['Ubuntu', 'Ubuntu', '最流行的 Linux 发行版之一，基于 Debian。'],
    ['Debian', 'Debian', '历史悠久的社区 Linux 发行版，用 apt 管理软件包。'],
    ['Fedora', 'Fedora', '红帽赞助的社区 Linux 发行版，用 dnf 管理软件包。'],
    ['POSIX', 'Portable Operating System Interface', '规定类 Unix 系统行为的标准，管 shell、命令和系统接口。写脚本时靠它保证可移植。'],
    ['GNU', "GNU's Not Unix（递归缩写）", '自由软件项目，bash、gcc、coreutils 等大量基础工具都出自这里。'],
    ['BSD', 'Berkeley Software Distribution', '源自加州大学伯克利分校的 Unix 分支。macOS 的很多命令行工具来自 BSD，参数和 GNU 版略有不同。'],
    ['WSL', 'Windows Subsystem for Linux', '在 Windows 上运行真正 Linux 环境的官方功能。讲义推荐 Windows 用户用它。'],
    ['MSYS|MSYS2', 'Minimal SYStem 2', '在 Windows 上提供 Unix 风格工具的环境，Git Bash 就基于它。'],
    ['Git Bash', 'Git for Windows 的 bash', 'Git 官方 Windows 版自带的 bash 环境，基于 MSYS2，不是真正的 Linux。'],
    ['Cygwin', 'Cygwin', '在 Windows 上提供 POSIX 兼容层的环境，MSYS2 由它派生。'],
    ['MinGW|MinGW-w64|MINGW|MINGW64', 'Minimalist GNU for Windows', '用 GNU 工具链编译原生 Windows 程序的开发环境。'],
    ['PowerShell', 'PowerShell', '微软的命令行 shell，管道里传递的是对象而不是文本。'],
    ['CLI', 'Command-Line Interface · 命令行界面', '用输入文字命令的方式和程序交互。'],
    ['GUI', 'Graphical User Interface · 图形界面', '用窗口、按钮、鼠标和程序交互。'],
    ['TUI', 'Terminal User Interface · 终端界面', '在终端里用字符画出来的界面，比如 htop、vim。'],
    ['tty|TTY', 'teletypewriter · 电传打字机', 'Unix 里终端设备的统称。名字来自早年连接主机用的电传打字机。'],
    ['PID', 'Process ID · 进程号', '操作系统分配给每个运行中进程的唯一编号。'],
    ['PGID', 'Process Group ID · 进程组号', '一组相关进程共用的编号。一条管道里的程序，通常同属一组。'],
    ['stdin', 'standard input · 标准输入', '0 号文件描述符。程序默认从这里读输入，通常是键盘或上游管道。'],
    ['stdout', 'standard output · 标准输出', '1 号文件描述符。程序的正常输出写到这里，通常是终端或下游管道。'],
    ['stderr', 'standard error · 标准错误', '2 号文件描述符，错误信息写到这里。管道默认不传递它。'],
    ['argv', 'argument vector · 参数向量', '程序收到的参数列表，argv[0] 通常是程序名。'],
    ['PATH|$PATH', 'PATH 环境变量', '一串用冒号隔开的目录。shell 按顺序在里面找要运行的程序。'],
    ['HOME|$HOME', 'HOME 环境变量', '当前用户家目录的路径，~ 就是它的简写。'],
    ['SHELL|$SHELL', 'SHELL 环境变量', '记录用户的登录 shell，不一定是当前正在运行的 shell。'],
    ['PS1|$PS1', 'Prompt String 1 · 主提示符', 'bash 用这个变量定义提示符的样子，比如 user@host:~$。'],
    ['TZ', 'time zone · 时区', '指定程序使用哪个时区的环境变量。'],
    ['CRLF', 'Carriage Return + Line Feed', 'Windows 文本文件的换行符 \\r\\n。Unix 只用 LF，也就是 \\n。两者混用常让脚本报错。'],
    ['LF', 'Line Feed · 换行符', 'Unix 和 macOS 文本文件的换行符 \\n。'],
    ['CR', 'Carriage Return · 回车符', '\\r，让光标回到行首。它是 Windows 换行符的前半部分。'],
    ['NTFS', 'New Technology File System', 'Windows 的默认文件系统，不记录 Unix 的执行权限位。'],
    ['FAT32', 'File Allocation Table 32', '老式文件系统，常见于 U 盘。单个文件不能超过 4 GB，也没有日志功能。'],
    ['UTC', 'Coordinated Universal Time · 协调世界时', '全球统一的时间基准，各时区都以它为参照。'],
    ['glob', 'glob · 通配符模式', '用 *、?、{} 描述一批文件名，由 shell 在运行程序前展开。'],
    ['shebang', 'hash-bang · #!', '脚本第一行的 #!/路径，告诉系统用哪个解释器运行这个文件。'],
    ['dotfiles|dotfile|Dotfiles', '点文件', '文件名以 . 开头的配置文件（如 .bashrc），ls 默认不显示。'],
    ['bashrc|.bashrc', 'bash run commands', 'bash 交互式启动时自动执行的配置文件。别名和 PATH 常写在这里。'],
    ['sudo', 'superuser do', '以 root（管理员）身份运行一条命令。'],
    ['symlink', 'symbolic link · 符号链接', '指向另一个路径的特殊文件，类似 Windows 的快捷方式。'],

    /* ---- 常用命令（普通英文词只在行内代码里匹配） ---- */
    ['ls', 'list', '列出目录内容。', 'c'], ['cd', 'change directory', '切换当前工作目录，是 shell 内建命令。', 'c'],
    ['pwd', 'print working directory', '打印当前工作目录。', 'c'], ['rm', 'remove', '删除文件，没有回收站，删了就没了。', 'c'],
    ['mkdir', 'make directory', '新建目录。', 'c'], ['chmod', 'change mode', '修改文件权限，如 chmod +x 加上执行权限。'],
    ['cat', 'concatenate · 连接', '把文件内容连起来输出到 stdout。', 'c'], ['man', 'manual · 手册', '查看命令的手册页。', 'c'],
    ['wc', 'word count', '统计行数、词数、字节数。', 'c'], ['uniq', 'unique', '合并相邻的重复行，通常先 sort。'],
    ['tee', 'tee · T 形管接头', '把输入同时写到文件和 stdout，名字来自水管的 T 形接头。', 'c'], ['ps', 'process status', '列出进程。', 'c'],
    ['bg', 'background', '让挂起的作业在后台继续运行。', 'c'], ['fg', 'foreground', '把后台作业调回前台。', 'c'],
    ['ln', 'link', '创建链接，-s 表示符号链接。', 'c'], ['cmp', 'compare', '逐字节比较两个文件。', 'c'],
    ['printf', 'print formatted', '按格式输出文本，比 echo 更可控。', 'c'], ['nohup', 'no hang up', '让进程忽略 SIGHUP，终端关闭后继续运行。'],
    ['xargs', 'extended arguments', '把 stdin 的内容转成另一条命令的参数。'], ['sed', 'stream editor · 流编辑器', '按规则逐行修改文本，最常用于查找替换。'],
    ['awk', 'Aho, Weinberger, Kernighan', '一门文本处理语言，擅长按列提取数据。名字取自三位作者的姓氏。'],
    ['grep', 'global regular expression print', '在文本里搜索匹配模式的行。名字来自 ed 编辑器的 g/re/p 命令。'],
    ['curl', 'client URL', '在命令行里发 HTTP 等网络请求。'], ['jq', 'jq · 命令行 JSON 处理器', '用小表达式筛选、改写 JSON 数据。'],
    ['tldr', 'too long; didn\'t read', '社区维护的命令简明示例，比 man 更直接。'], ['pgrep', 'process grep', '按名字查找进程，输出 PID。'],
    ['pkill', 'process kill', '按名字给进程发信号。'], ['lsof', 'list open files', '列出进程打开的文件和端口。'],
    ['netstat', 'network statistics', '查看网络连接和监听端口。'], ['ss', 'socket statistics', 'Linux 上替代 netstat 的工具。', 'c'],
    ['taskset', 'taskset', '限制进程只能在指定的 CPU 核上运行。'], ['htop', 'htop', '交互式进程查看器，top 的增强版。'],
    ['ssh|SSH', 'Secure Shell · 安全外壳协议', '加密的远程登录协议，也能远程执行命令、转发端口。'],
    ['sshd', 'SSH daemon', '运行在服务器上、等待 SSH 连接的后台服务。'], ['scp', 'secure copy', '通过 SSH 复制文件。'],
    ['rsync', 'remote sync', '增量同步文件和目录，只传变化的部分。'], ['OpenSSH', 'OpenSSH', '最常用的 SSH 开源实现。'],
    ['tmux', 'terminal multiplexer · 终端复用器', '在一个终端里开多个窗口和窗格。断开连接后，程序照样运行。'],
    ['mosh', 'mobile shell', '能在网络切换、断线后自动恢复的远程 shell。'],
    ['fzf', 'fuzzy finder', '命令行模糊查找工具。'], ['ripgrep|rg', 'ripgrep', '用 Rust 写的快速 grep 替代品，默认递归搜索。'],
    ['fd', 'fd', '更好用的 find 替代品。', 'c'], ['ag', 'The Silver Searcher', '快速代码搜索工具，ag 是银的化学符号。'],
    ['bat', 'bat', '带语法高亮的 cat 替代品。', 'c'], ['eza', 'eza', '更友好的 ls 替代品。'], ['zoxide', 'zoxide', '记住常去目录的 cd 替代品。'],
    ['stress', 'stress', '给 CPU、内存加压的测试工具。', 'c'], ['Alacritty', 'Alacritty', '用 GPU 加速的跨平台终端模拟器。'], ['Ghostty', 'Ghostty', '较新的跨平台终端模拟器。'],

    /* ---- 信号 ---- */
    ['SIGINT|INT', 'signal interrupt · 中断信号（2）', '按 Ctrl-C 时发送，默认终止程序，可被捕获。'],
    ['SIGQUIT|QUIT', 'signal quit · 退出信号（3）', '按 Ctrl-\\ 时发送，默认终止程序并可生成 core 文件。'],
    ['SIGKILL|KILL', 'signal kill · 强杀信号（9）', '立即杀死进程，不能被捕获或忽略。'],
    ['SIGTERM|TERM', 'signal terminate · 终止信号（15）', 'kill 默认发送的信号，请程序体面退出。'],
    ['SIGHUP|HUP', 'signal hang up · 挂断信号（1）', '终端关闭时发给其中的进程，默认终止它们。'],
    ['SIGTSTP|TSTP', 'terminal stop · 终端停止信号', '按 Ctrl-Z 时发送，挂起前台进程，可被捕获。'],
    ['SIGSTOP|STOP', 'signal stop · 暂停信号', '无条件挂起进程，不能被捕获或忽略。'],
    ['SIGCONT|CONT', 'signal continue · 继续信号', '让挂起的进程继续运行，bg、fg 用的就是它。'],

    /* ---- Git 与协作 ---- */
    ['Git|git', 'Git 版本控制系统', 'Linus Torvalds 2005 年为管理 Linux 内核开发的分布式版本控制系统。'],
    ['GitHub', 'GitHub', '最大的代码托管平台，提供 PR、Issues、Actions 等协作功能。'], ['GitLab', 'GitLab', '可自建的代码托管与 CI 平台。'],
    ['Bitbucket', 'Bitbucket', 'Atlassian 的代码托管平台。'],
    ['VCS', 'Version Control System · 版本控制系统', '记录文件历史、支持回溯和协作的工具。'],
    ['SHA-1', 'Secure Hash Algorithm 1', '一种哈希算法，输出 160 位，也就是 40 个十六进制字符。Git 用它给对象命名。'],
    ['SHA-256|sha256', 'Secure Hash Algorithm 256', '输出 256 位的哈希算法，常用于校验文件完整性。'],
    ['DAG', 'Directed Acyclic Graph · 有向无环图', '边有方向、不存在环的图，Git 的提交历史就是这种结构。'],
    ['blob', 'binary large object', 'Git 里存文件内容的对象，只有字节，不含文件名。'],
    ['HEAD', 'HEAD 引用', 'Git 里表示“当前所在位置”的特殊引用。它通常指向当前分支。'],
    ['PR', 'Pull Request · 拉取请求', '请求项目把你的一组提交合并进去。代码评审也在这里进行。'],
    ['fork', 'fork · 分叉', '在 GitHub 上，指把别人的仓库复制到自己账号下。在操作系统里，指创建子进程。'],
    ['rebase', 'rebase · 变基', '把一串提交搬到新的基础提交上。它会生成新的提交，让历史变直。'],
    ['reflog', 'reference log · 引用日志', 'Git 记录引用移动的历史，误操作后常靠它找回提交。'],
    ['stash', 'stash · 暂存', '把未提交的修改临时收起来，之后再取回。'],
    ['bisect', 'bisect · 二分', 'git bisect 用二分查找定位引入 bug 的提交。'],
    ['worktree', 'working tree · 工作树', 'git worktree 让一个仓库同时检出多个分支到不同目录。'],
    ['LFS', 'Large File Storage', 'Git 的大文件扩展。仓库里只存指针，文件本体放在单独的存储上。'],
    ['LGTM', 'Looks Good To Me', '代码评审用语：我看没问题。'], ['nit', 'nitpick · 吹毛求疵', '评审用语：不影响合并的小意见。'],
    ['hunk', 'hunk · 改动块', 'diff 里连续的一块改动，git add -p 按它逐块暂存。'],
    ['README|README.md', 'README · 自述文件', '项目的入口说明，告诉别人这是什么、怎么用。'],
    ['CONTRIBUTING|CONTRIBUTING.md', '贡献指南', '说明如何向项目贡献代码的文档。'],
    ['RFC', 'Request for Comments · 征求意见稿', '提出设计方案供大家讨论的文档。互联网标准也以 RFC 的形式发布。'],
    ['Stack Overflow', 'Stack Overflow', '程序员问答网站。'], ['Discord', 'Discord', '语音和文字社区平台，课程答疑在 OSSU 的 Discord 上。'],
    ['OSSU', 'Open Source Society University', '用免费公开课自学计算机科学的社区课程体系。'],
    ['IAP', 'Independent Activities Period', 'MIT 每年 1 月的独立活动期，本课就在这段时间开设。'],
    ['UROP', 'Undergraduate Research Opportunities Program', 'MIT 的本科生科研项目。'],

    /* ---- 编辑器与 IDE ---- */
    ['Vim|vim', 'Vi IMproved', '模态文本编辑器，Vi 的增强版。'], ['Vi|vi', 'visual', 'Vim 的前身，诞生于 1976 年的模态编辑器。'],
    ['Emacs|emacs', 'Editor MACroS', '高度可扩展的老牌文本编辑器。'],
    ['VS Code', 'Visual Studio Code', '微软的免费代码编辑器，靠扩展支持各种语言。'],
    ['IDE', 'Integrated Development Environment · 集成开发环境', '把编辑、构建、调试、测试集成在一起的开发工具。'],
    ['LSP', 'Language Server Protocol · 语言服务器协议', '编辑器和语言服务器之间的通用协议。补全、跳转这些功能，每种语言只需实现一次。'],
    ['gopls', 'Go please', 'Go 语言官方的语言服务器。'], ['Pylance', 'Pylance', '微软为 VS Code 提供的 Python 语言服务扩展。'],
    ['VimGolf', 'VimGolf', '比谁用最少按键完成文本编辑的挑战网站。'], ['VSCodeVim', 'VSCodeVim', '在 VS Code 里提供 Vim 操作的扩展。'],
    ['Copilot', 'GitHub Copilot', 'GitHub 的 AI 编程助手，提供代码补全和对话。'], ['Cursor', 'Cursor', '内置 AI 的代码编辑器，基于 VS Code。'],
    ['EditorConfig', 'EditorConfig', '在不同编辑器间统一缩进、换行等设置的配置文件。'],
    ['Markdown', 'Markdown', '用简单符号标记格式的纯文本写作语言。'], ['Jupyter', 'Jupyter', '可以交互运行代码的笔记本环境。'],
    ['Normal 模式', 'Normal mode · 普通模式', 'Vim 的默认模式，按键用于移动和编辑，不输入文字。'],
    ['Insert 模式', 'Insert mode · 插入模式', 'Vim 里输入文字的模式，按 Esc 退回 Normal。'],
    ['Visual 模式', 'Visual mode · 可视模式', 'Vim 里选择文本的模式。'],

    /* ---- 调试与性能 ---- */
    ['gdb', 'GNU Debugger', 'C/C++ 等语言最常用的命令行调试器。'], ['lldb', 'LLDB', 'LLVM 项目的调试器，macOS 上的默认调试器。'],
    ['pdb', 'Python Debugger', 'Python 标准库自带的调试器。'], ['rr', 'record and replay', '录制程序执行后可反复回放、甚至倒着执行的调试器。'],
    ['LLVM', 'LLVM', '模块化的编译器基础设施项目，clang、lldb 都出自这里。'],
    ['strace', 'system call trace', '追踪程序发起的系统调用（Linux）。'], ['dtruss', 'dtruss', 'macOS 上类似 strace 的工具。'],
    ['bpftrace', 'bpftrace', '用脚本在内核事件上做统计的 eBPF 追踪工具。'], ['eBPF', 'extended Berkeley Packet Filter', '让小程序在 Linux 内核里安全运行的技术。常用于追踪和监控。'],
    ['tcpdump', 'tcpdump', '在命令行抓取网络包。'], ['Wireshark', 'Wireshark', '图形化的网络抓包分析工具。'],
    ['perf', 'perf', 'Linux 自带的性能分析工具，基于硬件计数器和采样。'],
    ['Valgrind', 'Valgrind', '一套工具，靠模拟 CPU 来运行程序。用来查内存错误、分析性能。'],
    ['callgrind', 'callgrind', 'Valgrind 的调用分析工具，统计每个函数执行的指令数。'], ['Massif', 'Massif', 'Valgrind 的堆内存分析工具。'],
    ['cProfile', 'cProfile', 'Python 标准库的追踪型性能分析器。'], ['hyperfine', 'hyperfine', '多次运行命令并统计结果的命令行基准测试工具。'],
    ['py-spy', 'py-spy', 'Python 的采样型性能分析器，不用改代码。'],
    ['ASan|AddressSanitizer', 'AddressSanitizer · 地址消毒器', '编译时插桩，运行时检测越界、释放后使用等内存错误。'],
    ['MSan|MemorySanitizer', 'MemorySanitizer', '检测读取未初始化内存的工具。'], ['TSan|ThreadSanitizer', 'ThreadSanitizer', '检测多线程数据竞争的工具。'],
    ['UBSan|UndefinedBehaviorSanitizer', 'UndefinedBehaviorSanitizer', '检测 C/C++ 未定义行为的工具。'],
    ['Heisenbug', 'Heisenbug · 海森 bug', '一观察就消失或变样的 bug。名字戏仿了海森堡不确定性原理。'],
    ['use-after-free', 'use-after-free · 释放后使用', '内存释放后继续访问，是常见且危险的内存错误。'],
    ['DWARF', 'DWARF 调试信息格式', '编译器写进程序里的调试信息格式。调试器靠它把地址对应回源码。'],
    ['GIL', 'Global Interpreter Lock · 全局解释器锁', 'CPython 同一时刻只让一个线程执行字节码的锁。'],
    ['CPython', 'CPython', 'Python 的官方实现，用 C 语言编写。'],
    ['CPU', 'Central Processing Unit · 中央处理器', '执行程序指令的核心部件。'], ['GPU', 'Graphics Processing Unit · 图形处理器', '擅长并行计算，大模型训练和推理主要靠它。'],
    ['ARM|ARM64', 'Advanced RISC Machines', '低功耗处理器架构，手机和 Apple Silicon 都用它。'], ['x86', 'x86 架构', 'Intel 和 AMD 桌面、服务器 CPU 的指令集架构。'],
    ['IPC', 'Inter-Process Communication · 进程间通信', '进程之间交换数据的机制，如管道、信号、套接字。'],
    ['KDF', 'Key Derivation Function · 密钥派生函数', '把口令转换成密钥的函数。它故意做得很慢，用来抵抗暴力破解。'],

    /* ---- 网络与数据格式 ---- */
    ['HTTP', 'HyperText Transfer Protocol', '网页和 Web API 使用的应用层协议。'], ['HTTPS', 'HTTP Secure', '在 TLS 加密之上运行的 HTTP。'],
    ['DNS', 'Domain Name System · 域名系统', '把域名翻译成 IP 地址的系统。'], ['TCP', 'Transmission Control Protocol', '可靠、有序的传输层协议。'],
    ['UDP', 'User Datagram Protocol', '无连接、不保证送达的传输层协议。'], ['IP', 'Internet Protocol', '互联网层的协议。IP 地址用来标识网络上的主机。'],
    ['URL', 'Uniform Resource Locator', '网络资源的地址。'], ['API', 'Application Programming Interface · 应用程序接口', '程序之间互相调用的约定。'],
    ['REST', 'REpresentational State Transfer', '以资源和 HTTP 方法为中心的 Web API 设计风格。'],
    ['RESP', 'REdis Serialization Protocol', 'Redis 客户端和服务器通信用的文本协议。'],
    ['JSON', 'JavaScript Object Notation', '轻量的文本数据交换格式。'], ['YAML', "YAML Ain't Markup Language（递归缩写）", '常用于配置文件的数据格式，靠缩进表示层级。'],
    ['TOML', "Tom's Obvious Minimal Language", '简洁的配置文件格式，pyproject.toml 用的就是它。'],
    ['CSV', 'Comma-Separated Values', '用逗号分隔字段的纯文本表格格式。'], ['XML', 'eXtensible Markup Language', '用标签表示结构的标记语言。'],
    ['HTML', 'HyperText Markup Language', '网页的结构语言。'], ['SVG', 'Scalable Vector Graphics', '基于 XML 的矢量图格式。'],
    ['SQL', 'Structured Query Language', '操作关系型数据库的语言。'],

    /* ---- 编程语言 ---- */
    ['Python', 'Python', '解释型通用编程语言，本课大部分示例用它。'], ['Rust', 'Rust', '强调内存安全和性能的系统编程语言。'],
    ['Go', 'Go 语言', 'Google 开发的编译型语言，自带并发和完整工具链。'], ['Ruby', 'Ruby', '动态脚本语言，课程网站用的 Jekyll 就是 Ruby 写的。'],
    ['JavaScript', 'JavaScript', '浏览器里运行的编程语言，也能通过 Node.js 在服务器上运行。'], ['Node.js', 'Node.js', '在服务器上运行 JavaScript 的运行时。'],
    ['REPL', 'Read-Eval-Print Loop · 交互式解释器', '读入一行代码、执行、打印结果，再循环。'],

    /* ---- 打包与部署 ---- */
    ['PyPI', 'Python Package Index', 'Python 官方的第三方包仓库，pip 默认从这里下载。'], ['TestPyPI', 'Test Python Package Index', 'PyPI 的测试站，用来练习发布。'],
    ['pip', 'pip installs packages（递归缩写）', 'Python 的标准包安装工具。'], ['uv', 'uv', '用 Rust 写的快速 Python 包和项目管理器。'],
    ['venv', 'virtual environment · 虚拟环境', 'Python 自带的工具，给每个项目建一套独立的依赖目录。'],
    ['wheel', 'wheel（.whl）', 'Python 的预构建分发格式，本质是一个 zip。安装时不用再编译。'],
    ['sdist', 'source distribution · 源码分发包', 'Python 的源码发布格式，安装时需要构建。'],
    ['setuptools', 'setuptools', 'Python 传统的打包构建工具。'], ['Hatch', 'Hatch', 'Python 项目管理器，集成构建、测试、格式化等命令。'],
    ['pyproject.toml', 'pyproject.toml', 'Python 项目的标准配置文件，声明元数据、依赖和构建方式。'],
    ['PEP', 'Python Enhancement Proposal', 'Python 的改进提案，语言和打包规范都以 PEP 发布。'],
    ['SemVer', 'Semantic Versioning · 语义化版本', 'MAJOR.MINOR.PATCH 版本号规范。破坏兼容就升主版本，新增功能升次版本。修 bug 只升修订号。'],
    ['CalVer', 'Calendar Versioning · 日历版本', '用发布日期做版本号，如 2026.01。'],
    ['npm', 'Node Package Manager', 'Node.js 的包管理器。'], ['Cargo|cargo', 'Cargo', 'Rust 的构建工具和包管理器。'], ['RubyGems', 'RubyGems', 'Ruby 的包仓库和包管理系统。'], ['Bundler', 'Bundler', 'Ruby 项目的依赖管理工具。'],
    ['Homebrew', 'Homebrew', 'macOS 上最流行的包管理器。'], ['apt', 'Advanced Package Tool', 'Debian、Ubuntu 的包管理器。'], ['dnf', 'Dandified YUM', 'Fedora 的包管理器。', 'c'], ['pacman', 'package manager', 'Arch Linux 的包管理器。', 'c'],
    ['Docker|docker', 'Docker', '最流行的容器工具，用来构建、分发和运行容器。'], ['Dockerfile', 'Dockerfile', '描述如何一步步构建容器镜像的文本文件。'],
    ['Docker Compose|docker-compose', 'Docker Compose', '用一个 YAML 文件定义并启动多个容器。'], ['Kubernetes', 'Kubernetes（k8s）', '在机器集群上自动部署和管理容器的编排系统。'],
    ['containerd', 'containerd', 'Docker 和 Kubernetes 底层使用的容器运行时。'],
    ['VM', 'Virtual Machine · 虚拟机', '用软件模拟一台完整的计算机，运行独立的操作系统。'],
    ['Nix|NixOS', 'Nix', '纯函数式包管理器，让环境可以精确复现。'], ['Bazel', 'Bazel', 'Google 开源的构建系统，强调可复现和增量构建。'],
    ['systemd', 'system daemon', 'Linux 主流的初始化和服务管理系统。开机启动、失败重启都归它管。'],
    ['Redis|redis', 'REmote DIctionary Server', '内存键值数据库，常用作缓存。'], ['Postgres', 'PostgreSQL', '开源关系型数据库。'], ['MySQL', 'MySQL', '开源关系型数据库。'], ['SQLite', 'SQLite', '嵌入式数据库，整个库就是一个文件。'],
    ['Nginx', 'Nginx', '高性能 Web 服务器和反向代理。'], ['Memcached', 'Memcached', '内存缓存服务。'], ['etcd', 'etcd', '分布式键值存储，Kubernetes 用它保存集群状态。'],
    ['Jekyll', 'Jekyll', 'Ruby 写的静态网站生成器，课程网站用它构建。'], ['Flask', 'Flask', 'Python 的轻量 Web 框架。'],
    ['ghcr.io', 'GitHub Container Registry', 'GitHub 的容器镜像仓库。'], ['CUDA', 'Compute Unified Device Architecture', 'NVIDIA 的 GPU 计算平台。'], ['AWS', 'Amazon Web Services', '亚马逊的云服务平台。'], ['EC2', 'Elastic Compute Cloud', 'AWS 的云服务器服务。'],
    ['GitHub Actions', 'GitHub Actions', 'GitHub 内置的 CI/CD 平台，代码推送时自动运行工作流。'], ['GitHub Pages', 'GitHub Pages', 'GitHub 提供的免费静态网站托管。'],

    /* ---- 代码质量 ---- */
    ['CI', 'Continuous Integration · 持续集成', '每次推送或提 PR 时，自动在服务器上运行构建和测试。'], ['CD', 'Continuous Deployment · 持续部署', '测试通过后自动发布到生产环境。'],
    ['TDD', 'Test-Driven Development · 测试驱动开发', '先写失败的测试，再写代码让它通过。'],
    ['lint|linter|Linter', 'linter · 静态检查器', '不运行代码就找出潜在问题的工具。名字来自 C 语言的同名工具 lint。'],
    ['Ruff|ruff', 'Ruff', '用 Rust 写的 Python linter 和格式化器，速度极快。'], ['Black', 'Black', '不留配置余地的 Python 代码格式化器。'], ['Prettier', 'Prettier', '前端领域常用的代码格式化器。'],
    ['mypy|Mypy', 'mypy', 'Python 的静态类型检查器。'], ['pytest', 'pytest', 'Python 最流行的测试框架。'], ['semgrep', 'semantic grep', '按语法结构搜索代码的工具，可以写项目专属规则。'],
    ['shellcheck', 'ShellCheck', 'shell 脚本的静态检查工具。'], ['pre-commit', 'pre-commit', '在 git commit 之前自动运行检查的钩子框架。'],
    ['Codecov', 'Codecov', '在线展示代码覆盖率的服务。'], ['Dependabot', 'Dependabot', 'GitHub 自动发 PR 升级依赖的机器人。'],
    ['Hypothesis', 'Hypothesis', 'Python 的性质测试库。'], ['QuickCheck', 'QuickCheck', 'Haskell 的性质测试库，性质测试思想的起源。'],
    ['F401', 'Ruff 规则 F401', '导入了但没有使用。'], ['F403', 'Ruff 规则 F403', '使用了 from module import *。'], ['I001', 'Ruff 规则 I001', 'import 语句没有排序。'],
    ['S602', 'Ruff 规则 S602', '调用 subprocess 时用了 shell=True，有命令注入风险。'], ['RET505', 'Ruff 规则 RET505', 'return 之后多余的 else。'], ['EM101', 'Ruff 规则 EM101', '异常信息直接用了字符串字面量。'],
    ['SC2086', 'ShellCheck 规则 SC2086', '变量没加双引号，可能被分词或 glob 展开。'], ['E0502', 'Rust 错误 E0502', '已有不可变借用时，又做了可变借用。'],
    ['PCRE', 'Perl Compatible Regular Expressions', '兼容 Perl 语法的正则库，grep -P 用的就是它。'], ['PEG', 'Parsing Expression Grammar · 解析表达式文法', '比正则更强的文法形式，能描述嵌套结构。'],
    ['FizzBuzz', 'FizzBuzz', '经典入门编程题。3 的倍数打印 fizz，5 的倍数打印 buzz，两者都是就打印 fizzbuzz。'],

    /* ---- AI ---- */
    ['LLM', 'Large Language Model · 大语言模型', '根据前文预测下一个 token 的大型神经网络。ChatGPT 和 Claude 都基于它。'],
    ['MCP', 'Model Context Protocol · 模型上下文协议', '把 AI 智能体连接到外部工具和数据的开放协议。'],
    ['token', 'token · 词元 / 令牌', '在大模型里，它是处理文本的基本单位。一个 token 通常是几个字符。在发布平台里，它指访问令牌。'],
    ['harness', 'agent harness · 智能体外壳', '包在模型外面的程序。它负责调用模型和执行工具，再把结果放回上下文。'],
    ['AGENTS.md', 'AGENTS.md', '写给编码智能体的 README，启动时自动读入上下文。'], ['CLAUDE.md', 'CLAUDE.md', 'Claude Code 使用的项目说明文件，作用同 AGENTS.md。'],
    ['llms.txt', 'llms.txt', '给大模型阅读的网站说明文件，内容比网页更干净。'], ['ChatGPT', 'ChatGPT', 'OpenAI 的聊天式 AI 产品。'],
    ['Claude Code', 'Claude Code', 'Anthropic 的命令行编码智能体。'], ['Claude', 'Claude', 'Anthropic 开发的大语言模型。'], ['Codex', 'Codex', 'OpenAI 的编码智能体。'], ['opencode', 'opencode', '开源的命令行编码智能体。'],
    ['OpenAI', 'OpenAI', '开发 GPT 系列模型的公司。'], ['Anthropic', 'Anthropic', '开发 Claude 系列模型的公司。'], ['NVIDIA', 'NVIDIA · 英伟达', '主流 GPU 厂商。'],
    ['PRD', 'Product Requirements Document · 产品需求文档', '描述要做什么、为什么做的文档。'],

    /* ---- 其他缩写 ---- */
    ['AI', 'Artificial Intelligence · 人工智能', '让计算机完成需要智能的任务。本课主要指基于大语言模型的工具。'],
    ['macOS', 'macOS', '苹果电脑的操作系统，底层是 BSD 系的 Unix。'], ['C++', 'C++', '在 C 语言基础上扩展的系统编程语言。'],
    ['MIT', 'Massachusetts Institute of Technology · 麻省理工学院', '本课程开设的学校。'], ['ID', 'identifier · 标识符', '用来唯一标识某个对象的编号或名字。'],
    ['AR', 'Augmented Reality · 增强现实', '把虚拟内容叠加到真实世界。'], ['VR', 'Virtual Reality · 虚拟现实', '用头显进入完全虚拟的场景。'],
    ['TODO', 'to do · 待办', '代码注释里的待办标记，提醒以后回来处理。'], ['FIXME', 'fix me', '代码注释里的标记，表示这里有问题要修。', 'c'],
    ['Ctrl-C', 'Control + C', '让终端给前台进程发 SIGINT，通常用来中止程序。'], ['Ctrl-Z', 'Control + Z', '让终端给前台进程发 SIGTSTP，把它挂起。'], ['Ctrl-R', 'Control + R', '在 bash 里反向搜索命令历史。'],
    ['RUN', 'Dockerfile 指令 RUN', '构建镜像时执行一条命令，并把结果存成新的一层。'], ['COPY', 'Dockerfile 指令 COPY', '把构建上下文里的文件复制进镜像。'],
    ['NULL', 'NULL · 空指针', 'C 语言里不指向任何对象的指针。'], ['JOIN', 'SQL JOIN · 连接', '按条件把多张表的行拼起来查询。'],
    ['CNAME', 'Canonical Name record', 'DNS 的别名记录，把一个域名指向另一个域名。GitHub Pages 用同名文件来配置自定义域名。'],
    ['DEBUG', '日志级别 DEBUG', '最详细的调试信息，生产环境通常关闭。'], ['INFO', '日志级别 INFO', '程序正常运行时的一般信息。'], ['WARNING|WARN', '日志级别 WARNING', '有异常迹象，但程序还能继续运行。'],
    ['ERROR', '日志级别 ERROR', '发生错误，某个操作失败了。'], ['CRITICAL', '日志级别 CRITICAL', '严重错误，程序可能无法继续运行。'], ['TRACE', '日志级别 TRACE', '比 DEBUG 更细的跟踪信息。'],
    ['NF', 'Number of Fields', 'awk 内置变量：当前行的字段数。'], ['URI', 'Uniform Resource Identifier', '统一资源标识符，URL 是它的一种。'], ['UTF-8', 'Unicode Transformation Format 8-bit', '最常用的文本编码，用 1–4 个字节表示一个字符。'],
    ['MTU', 'Maximum Transmission Unit · 最大传输单元', '一次网络传输能携带的最大数据量。'], ['O2|-O2', 'gcc 优化级别 -O2', '让编译器开启常用优化，调试信息和源码的对应会变差。'],
    ['MAJOR', '主版本号', '语义化版本第一段，有不兼容改动时增加。'], ['MINOR', '次版本号', '语义化版本第二段，新增兼容功能时增加。'], ['PATCH', '修订号', '语义化版本第三段，只修 bug 时增加。'],
    ['textDocument', 'LSP 方法前缀', 'LSP 里与文档相关的消息都以 textDocument/ 开头。'], ['didOpen|textDocument/didOpen', 'textDocument/didOpen', 'LSP 通知：编辑器打开了一个文件。'], ['didChange|textDocument/didChange', 'textDocument/didChange', 'LSP 通知：文件内容改变了。'], ['publishDiagnostics|textDocument/publishDiagnostics', 'textDocument/publishDiagnostics', 'LSP 通知：语言服务器把错误和警告推给编辑器。'],
    ['Gemfile', 'Gemfile', 'Ruby 项目声明依赖的文件。'], ['Gemfile.lock', 'Gemfile.lock', 'Bundler 生成的 Ruby 锁文件。'], ['LocalForward', 'SSH 配置项 LocalForward', '在 ~/.ssh/config 里声明本地端口转发。'],
    ['CuPy', 'CuPy', '在 NVIDIA GPU 上运行、接口类似 NumPy 的 Python 库。'], ['PyYAML', 'PyYAML', 'Python 读写 YAML 的库。'], ['CC BY-NC-SA', 'Creative Commons 署名-非商业性使用-相同方式共享', '本课程讲义使用的开放许可证。'],
    ['SOURCE_DATE_EPOCH', 'SOURCE_DATE_EPOCH 环境变量', '构建工具用它固定时间戳。这是实现可复现构建的常用约定。'],

    ['LaTeX', 'LaTeX', '基于 TeX 的排版系统，学术论文常用。'], ['TeX', 'TeX', 'Knuth 设计的排版系统。'], ['MacTeX', 'MacTeX', 'macOS 上的 TeX 发行版。'],
    ['OpenSSL', 'OpenSSL', '最常用的开源加密和 TLS 库。'], ['GPL', 'GNU General Public License', '要求衍生作品也开源的自由软件许可证。'],
    ['TL;DR', "too long; didn't read", '太长不看：放在开头的一句话摘要。'], ['ASAP', 'as soon as possible', '尽快。'],
    ['SID', 'Security Identifier', 'Windows 用来标识用户和组的编号。'], ['OLDPWD', 'OLDPWD 环境变量', '上一个工作目录，cd - 用的就是它。'],
    ['HostName', 'SSH 配置项 HostName', '在 ~/.ssh/config 里写真实的主机名或 IP。'], ['IdentityFile', 'SSH 配置项 IdentityFile', '指定用哪个私钥登录。'],
    ['PasswordAuthentication', 'sshd 配置项', '控制服务器是否允许密码登录，设为 no 后只能用密钥。'],
    ['Ctrl-A', 'Control + A', '在 bash 命令行里跳到行首。'], ['Ctrl-E', 'Control + E', '在 bash 命令行里跳到行尾。'], ['ZZ', 'ZZ', 'Vim 的 Normal 模式命令：保存并退出。'],
    ['Content-Length', 'Content-Length 头', '声明消息体有多少字节。HTTP 和 LSP 都用它。'], ['FROM', 'Dockerfile 指令 FROM', '指定构建镜像的基础镜像。'],
    ['NameError', 'Python NameError', '用到了没有定义的名字时抛出的异常。'], ['ValueError', 'Python ValueError', '参数类型对但取值不合适时抛出的异常。'],
    ['HashMap', 'HashMap', 'Rust 标准库的哈希表。'], ['BTreeSet', 'BTreeSet', 'Rust 标准库的有序集合。'], ['SECURITY.md', 'SECURITY.md', '说明如何报告项目安全漏洞的文档。'],

    /* ---- 中文术语 ---- */
    ['环境变量', 'environment variable', '进程携带的“名字=值”配置，子进程启动时拷贝一份。'], ['管道', 'pipe', '把一个程序的 stdout 接到下一个程序的 stdin。'],
    ['重定向', 'redirection', '把程序的输入输出从终端改接到文件。'], ['标准输入', 'standard input · stdin', '0 号文件描述符，程序默认读取输入的地方。'], ['标准输出', 'standard output · stdout', '1 号文件描述符，程序正常输出的地方。'], ['标准错误', 'standard error · stderr', '2 号文件描述符，程序输出错误信息的地方。'],
    ['文件描述符', 'file descriptor', '进程用来指代已打开文件的小整数。0、1、2 就是三条标准流。'], ['退出码|返回码', 'exit code / return code', '程序结束时返回的数字：0 表示成功，非 0 表示失败。'],
    ['作业控制', 'job control', 'shell 管理前台、后台、挂起进程的功能。'], ['守护进程', 'daemon', '在后台长期运行、不连接终端的服务进程。'], ['孤儿进程', 'orphan process', '父进程已退出的进程，会被 PID 1 收养。'],
    ['命令替换', 'command substitution', '$(cmd) 运行命令，用它的输出替换这段文字。'], ['进程替换', 'process substitution', '<(cmd) 把命令输出变成一个可读的“文件路径”。'], ['算术展开', 'arithmetic expansion', '$((…)) 计算整数表达式。'], ['花括号展开', 'brace expansion', '{a,b} 直接生成多个词，不管文件是否存在。'],
    ['位置参数', 'positional parameter', '脚本里的 $1、$2……对应调用时的第几个参数。'], ['内建命令', 'builtin', '由 shell 自己执行的命令（如 cd），不是磁盘上的程序。'], ['工作目录', 'working directory', '进程当前所在的目录，相对路径从这里算起。'], ['绝对路径', 'absolute path', '从根 / 开始的完整路径。'], ['相对路径', 'relative path', '从当前工作目录开始的路径。'],
    ['转义', 'escaping', '用 \\ 让下一个字符失去特殊含义。'], ['端口转发', 'port forwarding', '通过 SSH 隧道把一台机器的端口映射到另一台。'], ['公钥', 'public key', '密钥对里可以公开的一半，放到服务器上用来验证你。'], ['私钥', 'private key', '密钥对里必须保密的一半，留在自己电脑上。'],
    ['终端复用器', 'terminal multiplexer', '在一个终端里管理多个会话、窗口和窗格的工具，如 tmux。'], ['终端模拟器', 'terminal emulator', '提供文本界面的图形程序，shell 运行在它里面。'], ['模态编辑', 'modal editing', '同一个按键在不同模式下含义不同。这是 Vim 的核心思想。'], ['语言服务器', 'language server', '为编辑器提供补全、跳转、诊断的独立进程。'],
    ['系统调用', 'system call', '程序请求内核代办事情的接口，如读文件、开网络连接。'], ['断点', 'breakpoint', '让程序运行到某一行时暂停的标记。'], ['观察点', 'watchpoint', '当某个变量被改写时让程序暂停。'], ['调用栈', 'call stack', '当前正在执行的函数调用链。'], ['火焰图', 'flame graph', '用宽度表示耗时占比的调用栈可视化图。'], ['基准测试', 'benchmark', '重复测量代码运行性能的测试。'],
    ['缓冲区溢出', 'buffer overflow', '写入超出缓冲区边界，覆盖相邻内存。'], ['内存泄漏', 'memory leak', '申请的内存用完没有释放，占用越来越多。'], ['释放后使用', 'use-after-free', '内存释放后继续访问，是危险的内存错误。'], ['影子内存', 'shadow memory', 'ASan 用来记录每段内存是否可访问的额外内存。'], ['结构化日志', 'structured logging', '用 JSON 等固定字段写日志，便于机器解析。'], ['采样型', 'sampling profiler', '定期记录调用栈来估算耗时，开销小但不精确。'], ['追踪型', 'tracing profiler', '记录每一次函数调用，精确但开销大。'],
    ['内容寻址', 'content-addressing', '用内容的哈希作为存储的键：内容相同，地址就相同。'], ['有向无环图', 'Directed Acyclic Graph · DAG', '边有方向、不存在环的图。'], ['暂存区', 'staging area / index', '工作区和提交之间的中间层，决定下一次提交包含什么。'], ['合并冲突', 'merge conflict', '两边改了同一处，Git 无法自动决定，要人工解决。'], ['三方合并', 'three-way merge', '用两个分支加共同祖先三份内容来合并。'], ['快进', 'fast-forward', '分支指针直接前移，不产生合并提交。'], ['游离 HEAD', 'detached HEAD', 'HEAD 直接指向提交而不是分支，此时的新提交容易丢失。'], ['垃圾回收', 'garbage collection', '清理不再被引用的对象。'], ['二分查找', 'binary search', '每次排除一半候选的查找方法。'],
    ['依赖地狱', 'dependency hell', '依赖之间版本要求互相冲突，装不到一起的局面。'], ['传递依赖', 'transitive dependency', '你依赖的库所依赖的库。'], ['虚拟环境', 'virtual environment', '项目独立的依赖目录，避免不同项目互相干扰。'], ['语义化版本', 'Semantic Versioning · SemVer', 'MAJOR.MINOR.PATCH 版本号规范。'], ['锁文件', 'lock file', '记录所有依赖的确切版本和哈希。别人照着装，装到的完全一样。'], ['可复现构建', 'reproducible build', '同样的输入总能构建出逐字节相同的产物。'], ['构件', 'artifact', '从源码构建出来、可以安装或部署的产物。'], ['校验和', 'checksum', '根据内容算出的短值，用来检查文件是否被改动。'], ['注册表', 'registry', '存放和分发包的服务，如 PyPI。'], ['服务编排|编排', 'orchestration', '自动管理多个服务的启动、连接和重启。'],
    ['上下文窗口', 'context window', '模型一次能处理的最大 token 数，超出就要压缩或丢弃。'], ['编码智能体', 'coding agent', '能读写文件、运行命令、循环工作的 AI 编程工具。'], ['子智能体', 'subagent', '主智能体派出去处理子任务的智能体。它有自己独立的上下文。'], ['氛围编程', 'vibe coding', '只用自然语言和 AI 对话写程序，自己不写一行代码。'], ['提示词', 'prompt', '发给模型的输入文字。'],
    ['静态分析', 'static analysis', '不运行程序，只分析代码本身来发现问题。'], ['覆盖率', 'code coverage', '测试运行时执行到的代码比例。'], ['单元测试', 'unit test', '测试单个函数或模块的自动化测试。'], ['集成测试', 'integration test', '测试多个模块配合工作的自动化测试。'], ['回归测试', 'regression test', '确保修好的 bug 不再出现的测试。'], ['性质测试', 'property-based testing', '不写具体用例，只声明性质。工具随机生成输入，去验证性质成立。'], ['持续集成', 'Continuous Integration · CI', '每次改动都自动构建和测试。'], ['持续部署', 'Continuous Deployment · CD', '测试通过后自动发布上线。'], ['钩子', 'hook', '在特定事件前后自动运行的脚本。'],
    ['正则表达式', 'regular expression · regex', '描述字符串模式的小语言。'], ['捕获组', 'capture group', '正则里用括号记下匹配到的子串，之后可以引用。'], ['反向引用', 'backreference', '用 \\1 这样的写法引用捕获组匹配到的内容。'], ['贪婪匹配', 'greedy matching', '量词尽可能多地匹配，不行再一点点退回。'], ['回溯', 'backtracking / traceback', '在正则里，指匹配失败时退回去试别的走法。在 Python 报错里，指 traceback，也就是出错时的调用栈记录。'], ['字符类', 'character class', '[abc] 这样的写法，匹配其中任意一个字符。'], ['前瞻', 'lookahead', '检查后面的内容是否匹配，但不消耗字符。'], ['泵引理', 'pumping lemma', '用来证明某个语言不是正则语言的数学工具。']
  ];

  /* ---------------- 索引与匹配 ---------------- */
  var MAP = {}, plain = [];
  G.forEach(function (e) {
    e[0].split('|').forEach(function (k) {
      if (!(k in MAP)) MAP[k] = e;
      if (e[3] !== 'c') plain.push(k);
    });
  });
  plain.sort(function (a, b) { return b.length - a.length; });
  var RE = new RegExp(plain.map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g');
  var IGN = 'a,pre,kbd,script,style,svg,button,label,input,textarea,.code,.ts,.rt,.rt-legend,.gl,.lab-run,.lab-env,.ll,.ch-head,.pager,.ex-done,.vz-h,.vz-svg,.vz-side,.vz-src,.vz-player,.vz-legend,.vz-big,[contenteditable="true"],.stats,.res-card,.chips,#resTable,.card .foot';
  var ALNUM = /[A-Za-z0-9_]/;

  function okEdge(text, i, key) {
    if (!/^[\x00-\x7f]/.test(key)) return true;            /* 中文词条不看边界 */
    var a = text[i - 1] || '', b = text[i + key.length] || '', c = text[i + key.length + 1] || '';
    var upper = !/[a-z]/.test(key);
    if (ALNUM.test(a) || a === '-' || a === '_' || a === '.' || a === '$' || a === '~' || a === '@') return false;
    if (a === '/' && !upper) return false;
    if (ALNUM.test(b) || b === '-' || b === '_' || (b === '/' && !upper)) return false;
    if (b === '.' && ALNUM.test(c)) return false;
    return true;
  }
  function wrap(node, seen) {
    var text = node.nodeValue, m, last = 0, frag = null;
    RE.lastIndex = 0;
    while ((m = RE.exec(text))) {
      var k = m[0];
      if (!okEdge(text, m.index, k)) { RE.lastIndex = m.index + 1; continue; }
      frag = frag || document.createDocumentFragment();
      frag.appendChild(document.createTextNode(text.slice(last, m.index)));
      var s = document.createElement('span'), first = mark(seen, k);
      s.className = 'gl' + (first ? ' gl1' : '');
      s.setAttribute('data-gl', k);
      if (first) s.tabIndex = 0;
      s.textContent = k;
      frag.appendChild(s);
      last = m.index + k.length;
    }
    if (!frag) return;
    frag.appendChild(document.createTextNode(text.slice(last)));
    /* 父元素是弹性/网格布局时，拆开的文字会变成多个布局项，要先整体包一层 */
    var p = node.parentNode;
    if (/flex|grid/.test(getComputedStyle(p).display)) { var box = document.createElement('span'); box.className = 'h2t'; box.appendChild(frag); p.replaceChild(box, node); }
    else p.replaceChild(frag, node);
  }
  function mark(seen, k) { var id = MAP[k][1]; if (seen[id]) return false; seen[id] = 1; return true; }

  /* 按 h2 分节标记（gl1 = 本节第一次出现，可用 Tab 聚焦） */
  function annotateDoc(doc) {
    /* 自测题标题、提示框标题是弹性布局，里面常夹着行内代码：把全部内容包成一项 */
    [].forEach.call(doc.querySelectorAll('summary,.callout>.ct'), function (h) {
      var s = document.createElement('span'); s.className = 'h2t';
      while (h.firstChild) s.appendChild(h.firstChild);
      h.appendChild(s);
    });
    var w = document.createTreeWalker(doc, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (n.tagName === 'H2' || n.tagName === 'CODE') return NodeFilter.FILTER_ACCEPT;
          return n.matches(IGN) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
        }
        return n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var list = [], n;
    while ((n = w.nextNode())) list.push(n);
    var seen = {};
    list.forEach(function (x) {
      if (x.nodeType === 1 && x.tagName === 'H2') { seen = {}; return; }
      if (x.nodeType === 1) {
        var k = x.textContent.trim();
        if (MAP[k] && !x.closest('a') && !x.closest(IGN)) {
          x.classList.add('gl'); x.setAttribute('data-gl', k);
          if (mark(seen, k)) { x.classList.add('gl1'); x.tabIndex = 0; }
        }
        return;
      }
      var p = x.parentNode;
      if (p.closest('code')) return;
      wrap(x, p.closest('h1,h2,h3,h4') ? {} : seen);
      if (p.closest('h1,h2,h3,h4')) [].forEach.call(p.querySelectorAll('.gl1'), function (g) { g.classList.remove('gl1'); g.removeAttribute('tabindex'); });
    });
  }

  /* ---------------- 小卡片 ---------------- */
  var card = null, showT = 0, hideT = 0, cur = null, lastX = 0, lastY = 0, shownAt = 0;
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function ensure() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'gl-card'; card.setAttribute('role', 'tooltip');
    document.body.appendChild(card);
    card.addEventListener('mouseenter', function () { clearTimeout(hideT); });
    card.addEventListener('mouseleave', function () { hide(); });
    return card;
  }
  function show(el) {
    if (document.body.classList.contains('editing')) return;
    var e = MAP[el.getAttribute('data-gl')]; if (!e) return;
    var c = ensure(), W = window.innerWidth, H = window.innerHeight;
    c.innerHTML = '<div class="gc-t">' + esc(el.getAttribute('data-gl')) + '</div><div class="gc-f">' + esc(e[1]) + '</div><div class="gc-d">' + esc(e[2]) + '</div>';
    c.classList.add('show');
    var rs = el.getClientRects(), r = rs[0];
    for (var i = 0; i < rs.length; i++) if (lastX >= rs[i].left && lastX <= rs[i].right && lastY >= rs[i].top - 2 && lastY <= rs[i].bottom + 2) { r = rs[i]; break; }
    var cw = c.offsetWidth, ch = c.offsetHeight;
    var x = Math.max(10, Math.min(r.left, W - cw - 10));
    var y = r.bottom + 8;
    if (y + ch > H - 8) y = Math.max(8, r.top - ch - 8);
    c.style.left = x + 'px'; c.style.top = y + 'px';
    if (cur !== el) shownAt = Date.now();
    cur = el;
  }
  function hide() { clearTimeout(showT); if (card) card.classList.remove('show'); cur = null; }
  function bind() {
    document.addEventListener('mouseover', function (ev) {
      var el = ev.target.closest && ev.target.closest('.gl'); if (!el) return;
      lastX = ev.clientX; lastY = ev.clientY;
      clearTimeout(hideT); clearTimeout(showT);
      showT = setTimeout(function () { show(el); }, cur ? 0 : 140);
    });
    document.addEventListener('mouseout', function (ev) {
      if (!(ev.target.closest && ev.target.closest('.gl'))) return;
      clearTimeout(showT); hideT = setTimeout(hide, 160);
    });
    document.addEventListener('focusin', function (ev) { if (ev.target.classList && ev.target.classList.contains('gl')) { var r = ev.target.getBoundingClientRect(); lastX = r.left; lastY = r.top; show(ev.target); } });
    document.addEventListener('focusout', function (ev) { if (ev.target.classList && ev.target.classList.contains('gl')) hideT = setTimeout(hide, 160); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hide(); });
    addEventListener('scroll', function () { if (cur) hide(); }, { passive: true });
    /* 触屏没有悬停：点词显示，点别处关闭 */
    document.addEventListener('click', function (ev) {
      var el = ev.target.closest && ev.target.closest('.gl');
      if (el) { lastX = ev.clientX; lastY = ev.clientY; if (cur === el && window.matchMedia('(hover: none)').matches && Date.now() - shownAt > 400) hide(); else show(el); }
      else if (!(card && card.contains(ev.target))) hide();
    });
  }

  /* 去掉术语标记（编辑保存时用，避免把标记存进你的修改） */
  function clean(block) {
    var c = block.cloneNode(true);
    [].forEach.call(c.querySelectorAll('span.gl'), function (s) { s.parentNode.replaceChild(document.createTextNode(s.textContent), s); });
    [].forEach.call(c.querySelectorAll('.gl'), function (s) { s.classList.remove('gl', 'gl1'); s.removeAttribute('data-gl'); s.removeAttribute('tabindex'); if (!s.getAttribute('class')) s.removeAttribute('class'); });
    [].forEach.call(c.querySelectorAll('span.h2t'), function (s) { while (s.firstChild) s.parentNode.insertBefore(s.firstChild, s); s.remove(); });
    c.normalize();
    return c.innerHTML;
  }

  window.MSGL = {
    terms: G, map: MAP, clean: clean,
    annotate: function (el) { var w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), l = [], n; while ((n = w.nextNode())) l.push(n); var seen = {}; l.forEach(function (x) { if (!x.parentNode.closest('.gl')) wrap(x, seen); }); }
  };
  function boot() {
    var doc = document.querySelector('.doc');
    if (doc) annotateDoc(doc);
    bind();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
