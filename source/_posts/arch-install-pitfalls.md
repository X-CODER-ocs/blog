---
title: '在华为笔记本上手动装 Arch Linux 踩坑记'
date: 2026-09-04 18:00:00
tags:
  - Arch Linux
  - 手动安装
  - 笔记本
  - 运维和搞机
categories:
  - 教程
description: 'arch!好玩(真的吗?)!'
---

在第一篇之后，我做了一个决定：在我那台华为笔记本上装 Arch Linux，而且要**原版、全手动、不靠 archinstall**。

结果……archinstall 自己先崩了三次 awa。这篇就记一下这一路踩的坑，省得以后（或者看到的人）再栽。

## 为什么不用 archinstall

archinstall 是官方那个引导式安装器，理论上敲个 `archinstall` 就能点菜单装完。但它在我的华为本上极其不稳定：

- 在「网络连接」那一步直接崩；
- 有一次 CPU 被打满，程序自己炸了；
- 还有一次卡在「pacman 正在工作」死等。

查了下，基本是它那个 Python TUI 在资源/网络波动时容易挂。既然崩都在「写盘之前」，硬盘啥都没动，**安全**，但确实浪费时间。

所以结论：archinstall 在我这不可信，直接走纯手动。手动就是一条条命令顺序跑，没有会崩的菜单，反而更稳。

## 坑 0：Secure Boot（华为 BIOS 里的中文菜单）

华为笔记本用的是 InsydeH2O 定制 BIOS，界面全中文还挺好看。原版 Arch + systemd-boot **默认不支持 Secure Boot**，开着它装完一重启就黑屏报 `Invalid signature`。

关掉它（中文界面对照）：

| 中文显示 | 干啥的 |
| --- | --- |
| 安全 | 通常 Secure Boot 就在这页 |
| 安全启动 / 安全引导 | 要关的就是它 |
| 设置管理员密码 | 解锁灰色项用 |

步骤：进 BIOS（开机狂按 F2）→「安全」→「安全启动」→ 改成「关闭」→ F10 保存。

如果「安全启动」是灰的点不动，得先「设置管理员密码」解锁，再回来关。

> 顺手把「启动」里的**快速启动**也关了，不然偶尔会跳过 U 盘引导。

## 坑 1：archinstall 的网络菜单会崩 → 自己先连 WiFi

archinstall 一启动就问「网络连接找到了，要连吗」，你一点「是」它就崩。正确姿势是**进 archinstall 之前，自己用 iwctl 把网连好(也有可能是我的电脑有点奇怪,好像是CPU满了)**：

```bash
iwctl device list                 # 看网卡名，比如 wlan0
iwctl station wlan0 connect "WiFi名"
ping -c3 archlinux.org            # 通了才算数
```

连上之后再跑 `archinstall`，它检测到已经有网，就不会再弹那个会崩的菜单。

## 坑 2：`station: command not found`

新手最容易懵的一点：`station` **不是独立命令**，它只在 `iwctl` 里面才认。你在普通提示符下直接敲 `station`，bash 当然说找不到。

要么先 `iwctl` 进交互模式再敲 `station ...`，要么直接把 iwctl 当参数跑：

```bash
iwctl station wlan0 scan
iwctl station wlan0 get-networks
iwctl station wlan0 connect "你的WiFi名"
```

## 坑 ? 3：heredoc 里输大写 EOF 也不退出（原因不明...应该吧?）

我想把国内镜像写进 `/etc/pacman.d/mirrorlist`，用了：

```bash
cat > /etc/pacman.d/mirrorlist <<'EOF'
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.ustc.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.aliyun.com/archlinux/$repo/os/$arch
EOF
```

敲完第一行回车后，shell 进入了 `>` 等待输入的状态。我确认自己就在这个 heredoc 里、结束符也没打错——**单独一行输大写 `EOF` 回车**，按理说一定退出。但它就是不退出，打啥都只是回到 `>` 输入界面。

> 这事儿挺邪门：正常 bash heredoc 里大写 `EOF` 单独一行必然结束，我这一步却失效了，具体原因至今没搞明白（可能是当时终端/tty 状态有啥异常）。**如果你也遇到「在 heredoc 里、EOF 打对了也不走」，别硬刚，直接 `Ctrl+C` 取消最省事。**

解法：

- 直接 `Ctrl+C` 取消整个 heredoc，回到干净提示符；
- 然后一次性整段粘贴上面的命令，最后用大写 `EOF` 单独一行收尾（我后来重跑一次就正常了，可能只是那次终端抽风）。

> 提醒：`<<'EOF'` 里的 `$repo` `$arch` 是 pacman 的占位符，**原样保留，别手改成别的字**。

## 坑 4：国内镜像（在中国装 Arch 的命脉）

默认的世界镜像列表 `pacman -Sy` 其实能通（只拉几个数据库文件，慢一点你感觉不到）。但接下来 `pacstrap` 要下载 **1GB+ 的包**，用世界源速度可能只有几十 KB/s，还容易超时断掉。

所以装系统这步，换中国源是刚需。直接覆盖写：

```bash
cat > /etc/pacman.d/mirrorlist <<'EOF'
Server = https://mirrors.tuna.tsinghua.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.ustc.edu.cn/archlinux/$repo/os/$arch
Server = https://mirrors.aliyun.com/archlinux/$repo/os/$arch
EOF
pacman -Sy
```

⚠️ **live 镜像每次重启都是全新的**：之前连的 WiFi、设的国内源全没了，得重来一遍。所以重启后第一件事就是重连网 + 重写镜像。

## 坑 5：NVMe 分区名带 `p`

华为本的内置盘是 NVMe，设备名是 `/dev/nvme0n1`。注意分区名带个 **`p`**：

- 分区1（EFI）：`/dev/nvme0n1p1`
- 分区2（根）：`/dev/nvme0n1p2`

不像 SATA 那样是 `sda1`/`sda2`。后面格式化和挂载时别写错。

分区（fdisk 里）：

```
g            ← 新建 GPT（清空整盘）
n            ← 分区1：默认号 → 默认起点 → +1G（EFI 大小）
t            ← 改类型：1 → ef00（EFI System）
n            ← 分区2：默认 → 默认 → 回车占满剩余（根）
w            ← 保存退出
```

EFI 那步问大小，填 **`+1G`**（加号不能省，表示按大小分）。

## 坑 6：重启 live 镜像后挂载丢了

你重启过 live 镜像，挂载会丢。pacstrap 之前必须确认挂上了：

```bash
fdisk -l /dev/nvme0n1        # 看分区是否还在（之前 w 存过就会在）
mkfs.fat -F32 /dev/nvme0n1p1
mkfs.ext4 /dev/nvme0n1p2
mount /dev/nvme0n1p2 /mnt
mkdir -p /mnt/boot && mount /dev/nvme0n1p1 /mnt/boot
mount | grep /mnt            # 应显示 /mnt 和 /mnt/boot 两行
```

确认挂载没问题，再跑 pacstrap：

```bash
pacstrap /mnt base linux linux-firmware linux-headers base-devel vim networkmanager
pacstrap /mnt intel-ucode    # 华为多是 Intel CPU；AMD 换 amd-ucode
genfstab -U /mnt >> /mnt/etc/fstab
```

## 顺便：别把 unstable / live 镜像 直接使用/安装后 作为生产环境使用

这次装机是从 KDE Neon 转过来的——Neon 的**开发版 ISO** 安装器（Calamares）在某个构建上有脚本 bug，直接 Runtime error 崩了,我懒得弄就换镜像了。提醒:普通用户装系统用 stable，别下开发版。而且我**不怎么用 live 桌面镜像**，Arch 那个最小 ISO 启动后是个纯命令行 shell，正好合适。

## 小结

| 坑 | 一句话 |
| --- | --- |
| Secure Boot 没关 | 装完黑屏报 Invalid signature |
| archinstall 网络菜单 | 自己先 iwctl 连网，别点它的「连接」 |
| `station` 找不到 | 它在 iwctl 里面，或 `iwctl station ...` |
| heredoc 退不出 | 在 heredoc 里输大写 `EOF` 也不走（原因不明），直接 `Ctrl+C` 退最稳 |
| 世界镜像 | 能通但 pacstrap 慢，换中国源 |
| live 重启 | 网络 + 镜像全清空，重来 |
| NVMe 命名 | 分区是 `nvme0n1p1`/`p2`，带 p |
| 重启丢挂载 | pacstrap 前重挂 /mnt 和 /mnt/boot |

装系统这事儿，手动虽然步骤多，但每一步看得见、可控，比那个动不动就炸的菜单省心多了 awa。
