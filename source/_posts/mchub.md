---
title: 我把启动器升级成了 MChub：从 SulfurLauncher 进化而来
date: 2026-09-27 13:00:00
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
description: 'MChub —— SulfurLauncher 的升级形态，一个开源、跨平台、同时支持 Java 版和基岩版的 Minecraft 启动器与实例管理器，现在是 GameHub 的 MC 启动器组件。基于 .NET 10 + Avalonia + FluentAvalonia。'
---

呐，启动器又进化了 qwq。

之前那篇《SulfurLauncher（硫磺方块启动器）》里写的那个东西，现在已经**升级成了 MChub**。名字换了、组织换了、协议换了、许可证也换了——但干的还是同一件事：**一个开源、跨平台、同时支持 Java 版和基岩版的 Minecraft 启动器 + 实例管理器**。

仓库描述现在写得挺克制：「一个 GameHub 的 MC 启动器组件」——也就是它现在是更大的 **GameHub** 项目里专门负责 Minecraft 的那块。官网在这 ——

👉 [https://codehub-develop.github.io/MChub/](https://codehub-develop.github.io/MChub/)

![MChub](images/mchub-header.png)

> 注：上面这张 header 图我偷懒没单独放，线上若 404 就当它不存在awa（下面有真下载链接，不耽误事）。

## 它是怎么来的

简单交代一下来龙去脉，免得跟旧文对不上 ——

| 维度 | SulfurLauncher（旧） | MChub（新） |
| --- | --- | --- |
| 组织 / 仓库 | `X-CODER-ocs/SulfurBlockLauncher` | `CodeHub-develop/MChub` |
| 官网 | `x-coder-ocs.github.io/SulfurBlockLauncher` | `codehub-develop.github.io/MChub` |
| 调起协议 | `sl://` | **`mchub://`** |
| 许可证 | GPL-3.0-or-later | **AGPL-3.0** |
| 定位 | 独立产品 | GameHub 的 MC 启动器组件 |

底层还是那一套 `.NET` 跨平台能力，功能基本是 SulfurLauncher 的能力平移 + 在 GameHub 体系里重新定位。所以你之前在 SulfurLauncher 里用惯的「装 → 登 → 找 → 整 → 开」，MChub 全都在。

> 一句话：**还是同一个我，换个更顺的壳继续跑 awa**。

## 它能干啥

功能这块直接上表，跟旧文一致，省得啰嗦 ——

| 区块 | 能做的事 |
| --- | --- |
| **游戏管理** | 查看 / 搜索 / 排序 / 收藏 / 启动；列表显示最近游玩记录与累计时长；一键安装原版 + 常用 Java 版加载器直接开玩 |
| **账户登录** | 离线账户、微软账户、第三方账户，三种都支持 |
| **资源安装** | 直接刷 Modrinth 和 CurseForge；模组 / 整合包 / 资源包 / 光影 / 数据包 / 地图 一键装，文件自动归位到对应目录 |
| **文件整理** | 集中看日志、存档、截图、设置、资源；管 Java 版的模组 / 材质 / 光影 / 存档 / 截图 / 配置 |
| **投影材料（开发中）** | 打开 `.litematic` / `.nbt`，预览结构、算材料清单、导出列表 |
| **基岩版支持** | Windows x64 支持 GDK / UWP 本体下载安装启动 + DLL 模组 + 鼠标锁；Linux x64 支持 GDK 本体 + Proton 启动（首次自动下 GDK-Proton）；管版本 / 世界 / 行为包 / 资源包 / 皮肤包，能导内容包 |
| **命令行 / 协议** | 命令行参数或浏览器 `mchub://` 链接都能调起安装与启动（下面细说） |

Java 版 + 基岩版双修，开源启动器里不算特别多见；基岩版在 Linux 上能 Proton 跑起来这点，我自己也挺满意 qwq。

## 技术栈：还是 .NET 那一套

熟悉我博客的人应该不意外 —— **我又双叒在用 .NET 了 awa**。

| 层 | 选型 | 备注 |
| --- | --- | --- |
| 语言 | **C#** | 强类型，写起来顺手 |
| UI 框架 | **Avalonia** + **FluentAvalonia** | 真正的跨平台 XAML UI，Win / macOS / Linux 同一套代码 |
| 运行时 | **.NET 10** | 桌面壳 `MChub.Desktop` 起手 |
| 官网 | `MChub.Web`（site-src） | 一个独立的前端站点工程，跟桌面端分开仓库维护 |
| 协议 | **AGPL-3.0** | 比旧版的 GPL 更「强制开源」—— 你改了挂在服务上跑也得开源 |

选 Avalonia 而不是 Electron / 套壳网页，核心诉求就一个：**原生体验 + 一份代码多端跑**。XAML + C# 的强类型 UI，改个按钮比在散落的 HTML/JS 里翻要舒服太多（主观评价，仅供参考 awa）。

## 彩蛋功能：`mchub://` 协议 + 命令行

这个是最"能用"的一点 —— **不用打开界面，一行命令 / 一个链接就能装游戏、开服**。（注意协议从 `sl://` 改成 `mchub://` 了，旧链接在 MChub 里调不起来。）

装原版 1.21.8：

```powershell
MChub.Desktop.exe install vanilla 1.21.8
```

装原版 + 最新 Fabric：

```powershell
MChub.Desktop.exe install loader 1.21.8 --loader fabric
```

装整合包（支持 Modrinth 直链 / 本地文件 / 按名字搜 / 按项目 ID）：

```powershell
# 从直链
MChub.Desktop.exe install modpack "https://cdn.modrinth.com/data/1KVo5zza/versions/cZY3Bvs9/Fabulously.Optimized-v14.0.0-beta.2.mrpack"

# 按名字搜（自动在 Modrinth / CurseForge 找）
MChub.Desktop.exe install modpack "Fabulously Optimized"
```

直接启动并连服务器：

```powershell
MChub.Desktop.exe launch "1.20.1-forge" --server "play.example.com" --port 25565
```

而 `mchub://` 协议和上面命令行**参数一一对应**，解析后走的是同一套逻辑。比如这条链接，在设置了协议关联的浏览器 / 网页里点一下就能调起启动器：

```
mchub://install/vanilla?version=1.21.8
mchub://install/loader?version=1.21.8&loader=fabric
mchub://install/modpack?source=Fabulously%20Optimized
mchub://launch?id=1.20.1-forge&server=play.example.com&port=25565
```

> 小细节：macOS 版不用手动注册协议（应用包里已经声明了）；Linux 通过包管理器或 AppImage 桌面集成安装也会自动注册。Windows 在「设置 → 其他设置 → MChub 协议」里勾一下就行。具体路径格式以仓库 [`docs/command-line.md`](https://github.com/CodeHub-develop/MChub/blob/main/docs/command-line.md) 为准。

这意味着官网、社区帖子、甚至你自己的脚本，都能一键把玩家带进某版本 / 某整合包 / 某服务器。对分发整合包的人来说，比"请先下载启动器、再手动搜 XXX"友好太多 awa。

## 全平台都能用，下载在这儿

> 所有下载都来自 [Releases](https://github.com/CodeHub-develop/MChub/releases)；正式版永远指向最新发布，commit / nightly 指向对应构建通道。

| 平台 | 正式版 | commit 版 | nightly 版 |
| --- | --- | --- | --- |
| **Windows 10 / 11 x64** | [安装程序](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.win.x64.installer.zip) / [便携版](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.win.x64.portable.zip) | [安装程序](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.win.x64.installer.zip) / [便携版](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.win.x64.portable.zip) | [安装程序](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.win.x64.installer.zip) / [便携版](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.win.x64.portable.zip) |
| **macOS Apple Silicon** | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.osx.mac.arm64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.osx.mac.arm64.app.zip) | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.osx.mac.arm64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.osx.mac.arm64.app.zip) | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.osx.mac.arm64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.osx.mac.arm64.app.zip) |
| **macOS Intel** | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.osx.mac.x64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.osx.mac.x64.app.zip) | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.osx.mac.x64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.osx.mac.x64.app.zip) | [磁盘映像](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.osx.mac.x64.dmg) / [应用包](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.osx.mac.x64.app.zip) |
| **Linux x64** | [AppImage](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.linux.x64.AppImage) / [deb](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.linux.x64.deb) / [rpm](https://github.com/CodeHub-develop/MChub/releases/latest/download/MChub.linux.x64.rpm) | [AppImage](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.linux.x64.AppImage) / [deb](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.linux.x64.deb) / [rpm](https://github.com/CodeHub-develop/MChub/releases/download/publish-commit/MChub.linux.x64.rpm) | [AppImage](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.linux.x64.AppImage) / [deb](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.linux.x64.deb) / [rpm](https://github.com/CodeHub-develop/MChub/releases/download/publish-nightly/MChub.linux.x64.rpm) |

macOS 第一次打开前，记得先把 `MChub.app` 拖进"应用程序"文件夹，然后跑一下去掉 quarantine：

```bash
sudo xattr -rd com.apple.quarantine /Applications/MChub.app
```

所有版本都从 [Releases](https://github.com/CodeHub-develop/MChub/releases) 下，正式版 / commit 版 / nightly 三档都有，想追新还是求稳自己挑。

## 开源与致谢

MChub 以 **AGPL-3.0** 协议开源，代码全在 [CodeHub-develop/MChub](https://github.com/CodeHub-develop/MChub)。

> 小提醒：仓库 README 顶部的许可证徽章还停留在旧的 `GPL-3.0-or-later`（从 SulfurLauncher 时期带过来的），但仓库里实际的 `LICENSE` 文件已经是 **AGPL-3.0**——以文件为准。AGPL 比 GPL 更"强"，你拿去改了挂在服务上跑，也得把改动开源出来。

诚实交代一下"站在谁肩膀上"——

- 部分库做了**二次修改**：
  - **MinecraftLaunch**：`Blessing-Studio/MinecraftLaunch` → `tiouoo/MinecraftLaunch`
  - **LiteSkinViewer**：`Ktn429/LiteSkinViewer` → `tiouoo/LiteSkinViewer`
- 设计与功能上受这些项目启发：BedrockBoot、LauncherX、Axolotl、PCL-CE、Polymerium、HMCL、BakaXL、Bedrock on Linux、portal，以及皮肤库参考的 BlockHelm-Launcher。

做开源最爽的不是"我写了多少"，是**踩在这么一大堆优秀项目上，把它们揉成自己想要的样子**。感谢所有维护者和贡献者，把 Minecraft 启动器生态喂得这么肥 awa。

## 写在最后

做这个启动器，初心很简单：**少一点配置，多一点游戏**。

从 SulfurLauncher 到 MChub，名字和组织变了，但"把装 → 登 → 找 → 整 → 开都接住，剩下的时间留给方块"这件事没变。现在它作为 GameHub 的 MC 启动器组件继续活着，欢迎来玩、来提 issue、来提 PR：

👉 <https://codehub-develop.github.io/MChub/>  
👉 [GitHub 仓库](https://github.com/CodeHub-develop/MChub)

（广？！广？！）

```

（看到这里就说明你在认真读 qwq，谢谢你）
