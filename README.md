<div align="center">

# MD Editor

**一个开箱即用、所见即所得的 Markdown 编辑器**

基于 Vue 3 + CodeMirror 6 构建，灵感来自 Typora，支持实时预览、Apple 风格代码块、Mermaid 图表、PicGo 图床上传与多格式导出。

[![CI](https://github.com/mazaiguo/mdeditor/actions/workflows/docker-build.yml/badge.svg)](https://github.com/mazaiguo/mdeditor/actions/workflows/docker-build.yml)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fmazaiguo%2Fmdeditor-blue)](https://github.com/mazaiguo/mdeditor/pkgs/container/mdeditor)
[![License](https://img.shields.io/badge/license-MIT-green)](#许可证)

</div>

---

## 目录

- [特性](#特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [本地开发](#本地开发)
- [部署](#部署)
- [配置项](#配置项)
- [项目结构](#项目结构)
- [快捷键](#快捷键)
- [图片处理](#图片处理)
- [导出](#导出)
- [安全](#安全)
- [许可证](#许可证)

## 特性

### 编辑体验

- **三种视图模式**：编辑 / 分屏 / 预览，分屏宽度可拖拽调节
- **亮色 / 暗色主题**：一键切换，自动记忆
- **工具栏快速排版**：标题（H1–H4）、加粗、斜体、下划线、删除线、高亮、上下标、代码、引用、列表、任务列表、表格、分割线、链接
- **CodeMirror 6 编辑器**：多语言语法高亮、One Dark 主题、自动换行可调
- **状态栏**：实时显示行数、字数（智能统计中英文）、修改状态、字号与换行开关

### 渲染能力

- **Apple 风格代码块**：仿 macOS 红绿灯标题栏、行号、复制按钮、折叠/展开、语言彩色标签与文件名标签
- **语法高亮**：基于 highlight.js，支持上百种语言
- **Mermaid 图表**：流程图、时序图等，按需懒加载（仅在出现图表时加载约 2MB 的依赖）并带渲染缓存
- **智能标题编号**：自动为标题添加序号；若检测到文档已含手动编号则自动关闭，避免重复
- **YAML Front Matter**：解析并以表格形式渲染文档元信息
- **任务列表 / 表格 / 脚注**：完整支持 GFM 扩展语法
- **大纲（TOC）面板**：自动生成目录，滚动时高亮当前所在标题

### 文件与图片

- **文件系统访问**：基于 File System Access API 打开文件 / 文件夹，支持真实 `Ctrl+S` 原地保存（不支持的浏览器降级为下载）
- **文件树浏览**：打开文件夹后侧边栏递归展示 `.md` / `.markdown` / `.txt` 文件
- **本地图片预览**：直接引用磁盘绝对路径的图片也能在预览中显示（通过本地服务代理）
- **PicGo 图床**：一键上传图片到 PicGo（默认 `http://127.0.0.1:36677`），并自动把本地路径替换为图床 URL
- **粘贴 / 插入图片**：多级回退策略 PicGo → 本地服务 → Base64，保证预览始终可用

### 导出

- **Markdown（.md）**：导出源文件
- **HTML**：包含完整样式的独立页面
- **PDF**：调用浏览器打印，支持分页与彩色打印
- **Word（.docx）**：已修复中文乱码与表格边框丢失问题

## 技术栈

| 领域 | 技术 |
| --- | --- |
| 框架 | Vue 3（Composition API）+ TypeScript |
| 构建 | Vite 8 |
| 编辑器 | CodeMirror 6 |
| Markdown | markdown-it + anchor / task-lists / mark / sub / sup / footnote |
| 高亮 | highlight.js |
| 图表 | Mermaid 11 |
| 安全 | DOMPurify（XSS 防护） |
| 工具 | VueUse、js-yaml、html-docx-js-typescript |
| 测试 | Vitest |
| 代码规范 | ESLint + Prettier |

## 快速开始

### 方式一：Docker（推荐，自带图片持久化）

```bash
docker run -d \
  --name md-editor \
  -p 5080:5080 \
  -e IMAGE_ROOT=/app/dist/images \
  -v md-editor-images:/app/dist/images \
  --restart unless-stopped \
  ghcr.io/mazaiguo/mdeditor:latest
```

浏览器打开 `http://localhost:5080` 即可使用。

> 启用 `IMAGE_ROOT` 后，图片读取 / 上传接口将被限制在该目录内，避免任意路径访问（详见 [安全](#安全)）。

### 方式二：Docker Compose

```bash
cp .env.example .env   # 按需填写 GHCR 凭据（私有镜像/拉取限速时需要）
docker compose up -d
```

## 本地开发

> 需要 Node.js 18+（CI 与 Docker 镜像使用 Node 22）。

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（含本地图片 API 中间件）
npm run build    # 类型检查 + 生产构建，产物输出到 dist/
npm run preview  # 本地预览构建产物
```

开发模式下，Vite 内置中间件提供 `/api/local-image` 与 `/api/save-image` 两个接口，用于本地图片预览与上传。

## 部署

生产环境通过 `server.mjs`（无第三方依赖的 Node HTTP 服务器）托管 `dist/` 静态资源并处理图片接口：

```bash
npm run build
PORT=5080 node server.mjs
```

- **Docker 多阶段构建**：见 `Dockerfile`，构建阶段产出 `dist/`，运行阶段仅包含 `dist/` 与 `server.mjs`
- **CI/CD**：推送到 `main` / `master` 或打 `v*` 标签时，GitHub Actions 自动执行 `lint → build → test → docker build/push`，同时构建 `linux/amd64` 与 `linux/arm64` 镜像并发布到 GHCR
- **NAS 部署**：参考仓库内 `deploy-to-nas.md` 与 `deploy.sh`
- **Windows 本地预览构建产物**：运行 `open-dist.bat`（避免 `file://` 协议导致 ES 模块加载失败）

## 配置项

通过环境变量配置，开发服务器与 `server.mjs` 均生效：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `5080` | 服务监听端口 |
| `IMAGE_ROOT` | 未设置 | 限制 `/api/local-image` 与 `/api/save-image` 只能访问该目录；未设置时不做限制（便于本地单用户使用） |

`docker-compose.yml` 中已将 `IMAGE_ROOT` 指向持久化卷 `/app/dist/images`。

## 项目结构

```
mdeditor/
├── src/
│   ├── components/       # UI 组件（工具栏、编辑器、预览、侧边栏、状态栏、导出/图床弹窗等）
│   ├── composables/      # 组合式逻辑（编辑器状态、文件管理、文件树、Mermaid、图片上传等）
│   ├── utils/            # 工具函数（Markdown 渲染、导出、图片、PicGo、转义等）
│   │   └── __tests__/    # Vitest 单元测试
│   ├── styles/           # 样式（按模块拆分：编辑器、预览、工具栏、布局等）
│   ├── assets/           # 静态资源
│   ├── App.vue           # 根组件，组合各模块
│   └── main.ts           # 入口
├── server.mjs            # 生产 HTTP 服务器（托管 dist + 图片 API）
├── server-shared.mjs     # 服务器共享常量（MIME、白名单、大小限制）
├── vite.config.ts        # Vite 配置 + 开发态图片 API 中间件
├── Dockerfile            # 多阶段容器构建
├── docker-compose.yml    # 编排（含数据卷与健康检查）
└── .github/workflows/    # CI（构建、测试、推送镜像）
```

## 快捷键

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl/Cmd + O` | 打开文件 |
| `Ctrl/Cmd + Shift + O` | 打开文件夹 |
| `Ctrl/Cmd + N` | 新建文档 |
| `Ctrl/Cmd + S` | 保存文件 |
| `Ctrl/Cmd + B` | 加粗 |
| `Ctrl/Cmd + I` | 斜体 |
| `Ctrl/Cmd + K` | 插入链接 |
| `Ctrl/Cmd + \`` | 行内代码 |

## 图片处理

图片处理按以下优先级回退，确保在任何环境下预览都能正常显示：

1. **PicGo 图床**：若本机运行 PicGo（默认端口 36677），优先上传并把 Markdown 中的本地路径替换为图床 URL
2. **本地服务**：通过 `/api/save-image` 保存到服务器 `images/` 目录（受 `IMAGE_ROOT` 限制与扩展名白名单约束）
3. **Base64 内联**：以上都不可用时，转为 data URL 内联到文档中

直接引用磁盘绝对路径（如 `![img](C:\path\to\file.png)` 或 `![img](/home/user/file.png)`）的图片，会经 `/api/local-image` 代理读取后正常显示。

## 导出

在工具栏点击导出按钮，可自定义文件名并选择格式：

- **Markdown**：纯净 `.md` 源文件
- **HTML**：内联全部样式的单文件页面，可直接分享
- **PDF**：打开打印窗口，由浏览器完成「另存为 PDF」（已处理分页、避免标题与代码块被截断、保留彩色）
- **Word**：生成 `.docx`，已专门处理中文乱码（将非 ASCII 字符转为 HTML 数字实体）与表格边框丢失（内联边框样式 + 旧版 `border` 属性）问题

## 安全

- **XSS 防护**：`markdown-it` 以 `html: true` 运行，渲染结果统一经 DOMPurify 清洗；启用 `SANITIZE_NAMED_PROPS` 防 DOM clobbering，并使锚点 id 与清洗后结果保持一致
- **路径穿越防护**：`/api/local-image` 在设置 `IMAGE_ROOT` 时校验路径必须位于该目录内
- **上传约束**：`/api/save-image` 校验扩展名白名单（png/jpg/jpeg/gif/webp/bmp/svg）与 20MB 大小上限
- **Mermaid 沙箱**：图表以 `securityLevel: 'strict'` 渲染，禁止执行任意脚本

## 许可证

本项目暂未声明开源许可证，默认版权归原作者所有。如需使用，请先联系作者或自行添加合适的 LICENSE。
