# MD Editor NAS 部署指南

## 当前版本特性

| 功能 | 说明 |
|------|------|
| Markdown 实时预览 | 分屏 / 预览模式切换 |
| Apple Style 代码块 | 语法高亮、行号、折叠/展开、`fold` 关键字默认折叠、**文件名显示**（`title="filename"`）、**彩色语言徽章** |
| Mermaid 图表 | flowchart、sequenceDiagram、gantt 等实时渲染 |
| YAML Front Matter | 自动解析文件头元数据，以表格形式展示 |
| 行内元素 | ==高亮==、^上标^、~下标~、`代码` 醒目颜色 |
| 图片处理 | 粘贴截图、PicGo 上传、右键上传到 PicGo |
| 文件夹浏览 | 侧边栏浏览 .md 文件，右键菜单（复制文件名/路径/打开） |
| 导出 | .md / .html / .docx（Word）/ .pdf |
| 主题 | 亮色 / 暗色主题 |

---

## 方式一：从 GitHub 拉取源码 + Docker 部署（推荐）

这是最简单的部署方式，直接从 GitHub 克隆并用 Docker Compose 运行。

### 前提条件

- NAS 已安装 Docker 和 Git
- 可通过 SSH 连接 NAS
- NAS 能访问互联网（用于 clone 和 npm install）

### 步骤

```bash
# 1. SSH 登录 NAS
ssh admin@192.168.1.100

# 2. 克隆仓库
git clone https://github.com/mazaiguo/mdeditor.git /volume1/docker/mdeditor
cd /volume1/docker/mdeditor

# 3. 构建并启动
docker compose up -d --build
```

访问 `http://NAS的IP:3000` 即可使用。

### 手动更新

```bash
cd /volume1/docker/mdeditor
git pull
docker compose up -d --build
```

### 自动更新（推荐）

创建自动更新脚本，当 GitHub 有新提交时自动拉取代码并重建容器：

```bash
# 创建脚本目录
mkdir -p /volume1/scripts

# 创建自动更新脚本
cat > /volume1/scripts/update-mdeditor.sh << 'SCRIPT_EOF'
#!/bin/bash
LOG_FILE="/volume1/scripts/update-mdeditor.log"
PROJECT_DIR="/volume1/docker/mdeditor"
BRANCH="main"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"; }

log "========== START =========="
cd "$PROJECT_DIR" || { log "ERROR: Cannot cd to $PROJECT_DIR"; exit 1; }

git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "No updates. Skip."
    log "========== END (NO CHANGE) =========="
    exit 0
fi

log "New commits: $LOCAL -> $REMOTE"
git pull origin "$BRANCH" >> "$LOG_FILE" 2>&1 || { log "ERROR: git pull failed"; exit 1; }

log "Rebuilding..."
docker compose down >> "$LOG_FILE" 2>&1
docker compose up -d --build >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "SUCCESS"
    docker image prune -f >> "$LOG_FILE" 2>&1
else
    log "ERROR: rebuild failed"
    exit 1
fi
log "========== END (UPDATED) =========="
SCRIPT_EOF

chmod +x /volume1/scripts/update-mdeditor.sh
```

配置定时执行（每天凌晨 3 点）：

```bash
# 方式 A: crontab
crontab -e
# 添加:
0 3 * * * /volume1/scripts/update-mdeditor.sh

# 方式 B: 飞牛 NAS
# 系统管理 → 计划任务 → 新建
# 脚本: /volume1/scripts/update-mdeditor.sh
# 频率: 每天 03:00

# 方式 C: Synology NAS
# 控制面板 → 任务计划 → 新建 → 计划的任务 → 用户自定义脚本
# 脚本: /volume1/scripts/update-mdeditor.sh
```

---

## 方式二：使用预构建镜像（GitHub Container Registry）

如果 NAS 内存较小（< 2GB），推荐使用预构建的 Docker 镜像，**无需在 NAS 上编译代码**。

> 每次推送到 GitHub 后，GitHub Actions 会自动构建镜像并推送到 `ghcr.io`。

### 修改 docker-compose.yml 使用预构建镜像

将 `docker-compose.yml` 中的 `build: .` 替换为 `image`:

```yaml
services:
  md-editor:
    image: ghcr.io/mazaiguo/mdeditor:latest
    container_name: md-editor
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data/images:/app/dist/images
    environment:
      - PORT=3000
```

然后执行：

```bash
docker compose pull
docker compose up -d
```

### 手动更新

```bash
docker compose pull
docker compose up -d
```

### 自动更新

**方案 A：使用 Watchtower（推荐，最简单）**

在 `docker-compose.yml` 中添加 Watchtower 服务，自动监测镜像仓库更新：

```yaml
services:
  md-editor:
    image: ghcr.io/mazaiguo/mdeditor:latest
    container_name: md-editor
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data/images:/app/dist/images
    environment:
      - PORT=3000

  watchtower:
    image: containrrr/watchtower:latest
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - TZ=Asia/Shanghai
      - WATCHTOWER_CLEANUP=true
      - WATCHTOWER_POLL_INTERVAL=3600
    command: md-editor
```

Watchtower 每小时检查一次 `ghcr.io/mazaiguo/mdeditor:latest` 是否有新镜像，如有则自动拉取并重建容器。

> 如果 ghcr.io 是私有仓库，需先在 NAS 上执行 `docker login ghcr.io -u 用户名 -p PAT令牌`，并将 `/root/.docker/config.json` 挂载到 Watchtower 中。

**方案 B：脚本定时拉取**

```bash
cat > /volume1/scripts/update-mdeditor-image.sh << 'SCRIPT_EOF'
#!/bin/bash
LOG="/volume1/scripts/update-mdeditor.log"
COMPOSE_DIR="/volume1/docker/mdeditor"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pulling latest image..." >> "$LOG"
cd "$COMPOSE_DIR" || exit 1
docker compose pull >> "$LOG" 2>&1
docker compose up -d >> "$LOG" 2>&1
docker image prune -f >> "$LOG" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Done." >> "$LOG"
SCRIPT_EOF

chmod +x /volume1/scripts/update-mdeditor-image.sh
```

配置定时执行（参考方式一的 crontab / NAS 计划任务配置）。

---

## 方式三：本机构建后上传到 NAS

适用于 NAS 内存不足或无法访问互联网的情况。

### 在本机（Windows）构建

```powershell
cd "E:\Gitee\md-requirements_specification\md编辑器"
npm install
npm run build

# 或构建 Docker 镜像
docker build -t md-editor .
docker save md-editor | gzip > md-editor.tar.gz
```

### 上传到 NAS

```bash
# 方法 A：上传源码（dist + server.mjs）
scp -r dist server.mjs admin@192.168.1.100:/volume1/docker/mdeditor/

# 方法 B：上传 Docker 镜像
scp md-editor.tar.gz admin@192.168.1.100:/volume1/docker/
ssh admin@192.168.1.100 "docker load < /volume1/docker/md-editor.tar.gz"
```

### 在 NAS 上运行（直接源码方式）

```bash
# 需要 NAS 已安装 Node.js 18+
cd /volume1/docker/mdeditor
node server.mjs
```

---

## Synology NAS 特别说明

### 通过 Container Manager（DSM 7.2+）部署

#### 方法 A：使用 Git 和 Terminal

1. 安装 **Git Server** 套件（可选）
2. 打开 **Terminal & SNMP** → 启用 SSH
3. SSH 连接后执行方式一的命令

#### 方法 B：通过 Container Manager 界面

1. 在本机克隆并修改 `docker-compose.yml` 使用 `image` 方式（见方式二）
2. 将 `docker-compose.yml` 和 `data/` 目录上传到 NAS 共享文件夹
3. 打开 **Container Manager** → **项目** → **新增**
4. 选择包含 `docker-compose.yml` 的文件夹
5. 点击 **应用**，等待镜像下载和启动

### 配置反向代理（可选，用于域名访问）

在 **控制面板 → 应用程序门户 → 反向代理** 中添加规则：

| 来源 | 目标 |
|------|------|
| `http://md.你的域名.com:80` | `http://localhost:3000` |

---

## QNAP NAS 特别说明

1. 打开 **Container Station** → **应用程序** → **创建**
2. 粘贴以下 `docker-compose.yml` 内容（预构建镜像方式）：

```yaml
services:
  md-editor:
    image: ghcr.io/mazaiguo/mdeditor:latest
    container_name: md-editor
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /share/Container/mdeditor/images:/app/dist/images
    environment:
      - PORT=3000
```

3. 点击 **创建**，等待启动完成

---

## PicGo 配置（NAS 部署场景）

**场景：NAS 上运行 MD Editor，本地电脑安装了 PicGo**

```
本地电脑（浏览器 + PicGo @127.0.0.1:36677）
         ↕ 访问 Web 界面
NAS（MD Editor @192.168.1.100:3000）
```

**工作原理**：图片上传请求由**浏览器**（本地电脑）直接发送到 PicGo，**不经过 NAS 服务器**。

因此在 MD Editor 的 PicGo 设置中填写 `http://127.0.0.1:36677` 即可正常使用。

**注意**：PicGo 需要允许跨域（CORS），PicGo 默认已启用。

**从手机/平板等其他设备访问时**：需将 PicGo 地址改为运行 PicGo 的电脑 IP：

```
http://192.168.1.50:36677    ← 安装了 PicGo 的电脑 IP
```

---

## 功能说明与限制

| 功能 | NAS 部署状态 | 说明 |
|------|-------------|------|
| Markdown 编辑与预览 | ✅ 完全支持 | 核心功能正常 |
| 代码高亮 & 折叠 | ✅ 完全支持 | Apple Style，`fold` 关键字默认折叠，文件名显示，彩色语言徽章 |
| Mermaid 图表渲染 | ✅ 完全支持 | 纯前端 SVG 渲染 |
| YAML Front Matter | ✅ 完全支持 | 自动解析元数据表格 |
| ==高亮== / ^上标^ / ~下标~ | ✅ 完全支持 | markdown-it 插件 |
| 导出 .docx / .html / .pdf | ✅ 完全支持 | 纯前端生成，直接下载 |
| 图片粘贴保存 | ✅ 支持 | 图片保存到 NAS 的 `data/images/` 目录 |
| PicGo 上传 | ✅ 支持 | 浏览器直接请求本机 PicGo，无需经过 NAS |
| 本地文件路径图片预览 | ⚠️ 受限 | 仅当从 NAS 本机访问时可预览 C:/... 路径 |
| 文件夹浏览 | ✅ 支持 | 通过浏览器的 File System API 访问本机文件 |

---

## 端口与数据卷

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 服务端口 | `3000` | 可在 `docker-compose.yml` 中修改 |
| 图片存储 | `./data/images/` | 持久化到 NAS 主机 |

修改端口示例（改为 8080）：

```yaml
ports:
  - "8080:3000"
```

---

## 常见问题

**Q: 构建失败，提示内存不足**

由于集成了 Mermaid 等库，构建时内存需求较高（建议 2GB+）。推荐使用**方式二（预构建镜像）**，或在本机构建后上传。

如需在 NAS 上构建，可在 `Dockerfile` 中限制 Node 内存：

```dockerfile
RUN node --max-old-space-size=1024 node_modules/.bin/vite build
```

**Q: docker-compose.yml 需要修改吗？**

不需要。它只控制端口映射和数据持久化，与代码内容无关。

**Q: 新增了功能/依赖，需要做什么？**

依赖由 Docker 构建自动处理：
- `git pull` 获取最新代码（含更新的 `package.json`）
- `docker compose up -d --build` 重新构建（自动 `npm install`）

**Q: 访问时页面空白**

检查容器状态和日志：

```bash
docker compose ps
docker compose logs md-editor
```

**Q: 图片保存后无法显示**

确认数据卷挂载正确：

```bash
docker compose exec md-editor ls /app/dist/images/
```

---

## 将本地项目推送到 GitHub

如果需要将本地 `md编辑器` 项目发布到 `https://github.com/mazaiguo/mdeditor`：

### 步骤

```bash
# 1. 在 GitHub 创建仓库（空仓库，不初始化 README）
# 访问 https://github.com/new，创建 mazaiguo/mdeditor

# 2. 在本地 md编辑器 目录初始化独立 git 仓库
cd "E:\Gitee\md-requirements_specification\md编辑器"
git init
git add .
git commit -m "Initial commit: MD Editor with Mermaid, YAML front matter, Word export"

# 3. 推送到 GitHub
git remote add origin https://github.com/mazaiguo/mdeditor.git
git branch -M main
git push -u origin main
```

推送后，GitHub Actions 将自动构建 Docker 镜像并推送到 `ghcr.io/mazaiguo/mdeditor:latest`。

### 后续更新流程

```
本地修改代码
    ↓
git add . && git commit -m "更新说明"
git push origin main
    ↓
GitHub Actions 自动构建镜像推送到 ghcr.io
    ↓
NAS 自动同步（选择以下任一方式）
```

| 方式 | 操作 | 延迟 |
|------|------|------|
| **Watchtower** | 自动检测镜像更新并重建 | 最多 1 小时（可配置） |
| **定时脚本** | crontab / NAS 计划任务 | 取决于定时频率 |
| **手动** | `docker compose pull && docker compose up -d` | 即时 |
