---
title: 我做了个开源跨平台 Minecraft 启动器：SulfurLauncher（硫磺方块启动器）
date: 2026-09-12 20:00:00
tags:
  - Minecraft
  - 启动器
  - .NET
  - Avalonia
  - C#
  - 开源项目
categories:
  - 开源项目
license: CC BY 4.0（作者保留权利，允许署名转发与分发）
description: 'SulfurLauncher（硫磺方块启动器）—— 一个开源、跨平台、同时支持 Java 版和基岩版的 Minecraft 启动器与实例管理器，用 .NET + Avalonia 12 + C# 写成。'
---

呐，我又整了个活 qwq。

这次不是博客换皮，是另一个完全独立的东西：**一个 Minecraft 启动器**。名字叫 **SulfurLauncher**，中文名 **硫磺方块启动器**（硫 = Sulfur，方块 = 大家都懂 awa）。它现在跑在 GitHub Pages 上，官网在这 ——

👉 [https://x-coder-ocs.github.io/SulfurBlockLauncher/](https://x-coder-ocs.github.io/SulfurBlockLauncher/)

![SulfurLauncher](images/sulfur-launcher-header.png)

简单说一句人话版本：**它是一个开源、跨平台、同时支持 Java 版和基岩版的 Minecraft 启动器 + 实例管理器**。从装游戏、登账号，到找模组、整理存档，一条龙。

## 它是怎么来的

故事不长，但有点意思。

最开始这个项目并不是从零写的 —— 它**基于 [portal](https://portal.tiouo.cc/)（tiouoo 的那一套）做了二次开发**，在这个基础上重新做了品牌、修了若干跨平台兼容性，并接上了自己的官网与反馈模板。所以你能在代码里看到很多熟悉的设计痕迹（致敬了 LauncherX、PCL-CE、HMCL、BakaXL、Polymerium 等一众优秀启动器）。

但"借来的壳"总归要长出自己的骨头。于是我把它**重命名（rebrand）成了"硫磺方块启动器 / SulfurLauncher"**，把协议 scheme 从 `portal://` 改成了 **`sl://`**，顺手把飞掉的若干平台细节（Mac 的 JIT 修复、基岩版注入、rpm 架构矩阵等）逐一补齐。现在它已经是**独立产品定位、独立架构、独立实现**在持续开发了。

> 一句话：**站在巨人的肩膀上，但不再只是巨人的影子** awa。

## 它能干啥

功能这块我直接上表，比啰嗦清楚 ——

| 区块 | 能做的事 |
| --- | --- |
| **游戏管理** | 查看 / 搜索 / 排序 / 收藏 / 启动；列表里显示最近游玩记录与累计时长；一键安装原版 + 常用 Java 版加载器直接开玩 |
| **账户登录** | 离线账户、微软账户、第三方账户，三种都支持 |
| **资源安装** | 直接刷 Modrinth 和 CurseForge；模组 / 整合包 / 资源包 / 光影 / 数据包 / 地图 一键装，文件自动归位到对应目录 |
| **文件整理** | 集中看日志、存档、截图、设置、资源；管 Java 版的模组 / 材质 / 光影 / 存档 / 截图 / 配置 |
| **投影材料（开发中）** | 打开 `.litematic` / `.nbt`，预览结构、算材料清单、导出列表 |
| **基岩版支持** | Windows x64 支持 GDK / UWP 本体下载安装启动 + DLL 模组 + 鼠标锁；Linux x64 支持 GDK 本体 + Proton 启动（首次自动下 GDK-Proton）；管版本 / 世界 / 行为包 / 资源包 / 皮肤包，能导内容包 |
| **命令行 / 协议** | 命令行参数或浏览器 `sl://` 链接都能调起安装与启动（下面细说） |
| **皮肤库（新）** | 按内容哈希去重导入 / 应用 / 删除 / 预览皮肤，参考 BlockHelm-Launcher 的设计 |

Java 版 + 基岩版双修，这在开源启动器里其实不算特别多见。基岩版在 Linux 上能 Proton 跑起来这点，我自己挺满意 qwq。

## 技术栈：还是 .NET 那一套

熟悉我博客的人应该不意外 —— **我又双叒在用 .NET 了 awa**。

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 语言 | **C#** | 强类型，写起来顺手 |
| UI 框架 | **Avalonia 12** | 真正的跨平台 XAML UI，Win / macOS / Linux 同一套代码 |
| 主界面工程 | `src/SulfurLauncher`（Avalonia 12） | 窗口基类在 TioUi 库（`module/Tio.Avalonia.Standard/`） |
| 桌面壳 | `src/SulfurLauncher.Desktop` | `dotnet build ...SulfurLauncher.Desktop.csproj -c Debug` 起手 |
| 本地化 | `SulfurLauncher.Localization` | 所有可见文案走资源（zh-CN / en-US），禁止在 XAML / C# 里写死 |
| 图标 | iconfont 字体图标 | 一律用字体，禁止 `StreamGeometry` 那套，标识符 = font_class |
| 协议 | **GPL-3.0-or-later** | 开源，自由分发与修改 |

选 Avalonia 而不是 Electron / 套壳网页，核心诉求就一个：**原生体验 + 一份代码多端跑**。XAML + C# 的强类型 UI，配合热重载，改个按钮比在散落的 HTML/JS 里翻要舒服太多（主观评价，仅供参考 awa）。

几个我顺手记下的工程纪律（也给想贡献的人提个醒）——

- **所有界面文案必须本地化**，新增文本得同时补 `zh-CN` 和 `en-US` 两份资源，用 `Translate` / `CurrentValue()` 取。
- **图标一律 iconfont 字体**，别自己搞 `Glyphs` / `GetGlyph` 映射表。
- **异步任务取消要竞态安全**：调用 `ReportProgress` / `SetDescription` / `Complete` 前，必须重新检查 `!task.IsTerminal && !task.IsCancellationRequested`；网络 / 下载 / 解压这类长操作必须把 `CancellationToken` 一路透传下去，收到取消就尽快停，别吞信号、别开新步骤。

## 彩蛋功能：`sl://` 协议 + 命令行

这个是我个人觉得最"能用"的一点 —— **不用打开界面，一行命令 / 一个链接就能装游戏、开服**。

装原版 1.21.8：

```powershell
SulfurLauncher.Desktop.exe install vanilla 1.21.8
```

装原版 + 最新 Fabric：

```powershell
SulfurLauncher.Desktop.exe install loader 1.21.8 --loader fabric
```

装整合包（支持 Modrinth 直链 / 本地文件 / 按名字搜 / 按项目 ID）：

```powershell
# 从直链
SulfurLauncher.Desktop.exe install modpack "https://cdn.modrinth.com/data/1KVo5zza/versions/cZY3Bvs9/Fabulously.Optimized-v14.0.0-beta.2.mrpack"

# 按名字搜（自动在 Modrinth / CurseForge 找）
SulfurLauncher.Desktop.exe install modpack "Fabulously Optimized"
```

直接启动并连服务器：

```powershell
SulfurLauncher.Desktop.exe launch "1.20.1-forge" --server "play.example.com" --port 25565
```

而 `sl://` 协议和上面命令行**参数一一对应**，解析后走的是同一套逻辑。比如这条链接，在设置了协议关联的浏览器 / 网页里点一下就能调起启动器：

```
sl://install/vanilla?version=1.21.8
sl://install/loader?version=1.21.8&loader=fabric
sl://install/modpack?source=Fabulously%20Optimized
sl://launch?id=1.20.1-forge&server=play.example.com&port=25565
```

> 小细节：macOS 版不用手动注册协议（应用包里已经声明了）；Linux 通过包管理器或 AppImage 桌面集成安装也会自动注册。Windows 在「设置 → 其他设置 → SulfurLauncher 协议」里勾一下就行。

这意味着什么呢？**官网、社区帖子、甚至是你自己的脚本，都能一键把玩家带进某版本 / 某整合包 / 某服务器**。对分发整合包的人来说，这个比"请先下载启动器、再手动搜 XXX"友好太多 awa。

## 全平台都能用，下载在这儿

> 所有下载都来自 [Releases](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases)；正式版永远指向最新发布，commit / nightly 指向对应构建通道。

| 平台 | 正式版 | commit 版 | nightly 版 |
| --- | --- | --- | --- |
| **Windows 10 / 11 x64** | [安装程序](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.win.x64.installer.zip) / [便携版](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.win.x64.portable.zip) | [安装程序](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.win.x64.installer.zip) / [便携版](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.win.x64.portable.zip) | [安装程序](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.win.x64.installer.zip) / [便携版](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.win.x64.portable.zip) |
| **macOS Apple Silicon** | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.osx.mac.arm64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.osx.mac.arm64.app.zip) | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.osx.mac.arm64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.osx.mac.arm64.app.zip) | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.osx.mac.arm64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.osx.mac.arm64.app.zip) |
| **macOS Intel** | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.osx.mac.x64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.osx.mac.x64.app.zip) | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.osx.mac.x64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.osx.mac.x64.app.zip) | [磁盘映像](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.osx.mac.x64.dmg) / [应用包](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.osx.mac.x64.app.zip) |
| **Linux x64** | [AppImage](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.linux.x64.AppImage) / [deb](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.linux.x64.deb) / [rpm](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/latest/download/SulfurLauncher.linux.x64.rpm) | [AppImage](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.linux.x64.AppImage) / [deb](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.linux.x64.deb) / [rpm](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-commit/SulfurLauncher.linux.x64.rpm) | [AppImage](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.linux.x64.AppImage) / [deb](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.linux.x64.deb) / [rpm](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases/download/publish-nightly/SulfurLauncher.linux.x64.rpm) |

Arch 用户直接：

```bash
yay -S portal-mc-bin                  # 正式版
yay -S portal-mc-commit-bin           # commit 版本
yay -S portal-mc-nightly-bin          # nightly 版本
```

macOS 第一次打开前，记得先把 `SulfurLauncher.app` 拖进"应用程序"文件夹，然后跑一下去掉 quarantine：

```bash
sudo xattr -rd com.apple.quarantine /Applications/SulfurLauncher.app
```

所有版本都从 [Releases](https://github.com/X-CODER-ocs/SulfurBlockLauncher/releases) 下，正式版 / commit 版 / nightly 三档都有，想追新还是求稳自己挑。

## 开源与致谢

SulfurLauncher 是 **GPL-3.0-or-later** 协议开源的，代码全在 [X-CODER-ocs/SulfurBlockLauncher](https://github.com/X-CODER-ocs/SulfurBlockLauncher)。

诚实交代一下"站在谁肩膀上"——

- 部分库做了**二次修改**：
  - **MinecraftLaunch**：`Blessing-Studio/MinecraftLaunch` 
  - **LiteSkinViewer**：`Ktn429/LiteSkinViewer` 
  - **Portal** : `tiouoo\Portal`
- 设计与功能上受这些项目启发：BedrockBoot、LauncherX、Axolotl、PCL-CE、Polymerium、HMCL、BakaXL、Bedrock on Linux、portal，以及皮肤库参考的 BlockHelm-Launcher。

做开源最爽的不是"我写了多少"，是**踩在这么一大堆优秀项目上，把它们揉成自己想要的样子**。感谢所有维护者和贡献者，把 Minecraft 启动器生态喂得这么肥 awa。

## 写在最后

做这个启动器，初心很简单：**少一点配置，多一点游戏**。

不想让玩家为了装个 Fabric、找个整合包、进个服，在七八个窗口之间反复横跳。一个启动器把"装 → 登 → 找 → 整 → 开"都接住，剩下的时间留给方块本身，就够了。

官网已经上线，欢迎来玩、来提 issue、来提 PR：

👉 <https://x-coder-ocs.github.io/SulfurBlockLauncher/>  
👉 [GitHub 仓库](https://github.com/X-CODER-ocs/SulfurBlockLauncher)

（广？！广？！）

```
(看到这里就说明你在认真读 qwq，谢谢你)
```
