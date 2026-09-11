/**
 * skills-cn-explain — 「技能与工具」中文解释插件
 *
 * 在 Hermes 桌面端「技能与工具」页面里，为每个技能（Skills）和
 * 工具集（Tools）的产品介绍下方自动注入一块"中文解释"。
 *
 * 原理：详情区结构为 <header><div><h3>名称</h3></div><p>介绍</p></header>，
 * 用 MutationObserver 监听 DOM，按名称匹配内置词典后，把中文解释
 * 块追加到 <header> 内（紧跟介绍之后）。React 不会清除未跟踪的附加
 * 节点；即使被重渲染移除，observer 也会立即补回。
 *
 * 状态栏有一个开关芯片，可随时开/关（状态持久化）。
 */

import { host } from '@hermes/plugin-sdk'
import { useState } from 'react'
import { jsx } from 'react/jsx-runtime'

const ID = 'skills-cn-explain'
const MARK = 'data-cn-explain'

// ────────────────────────────────────────────────────────────────
// 词典：标题（技能名 / 工具集显示名）→ 中文解释
// ────────────────────────────────────────────────────────────────
const CN = {
  // ══════════ 工具集（Tools 标签页，显示名已去 emoji）══════════
  'Web Search & Scraping': '网络搜索与网页抓取——提供 web_search 搜索和 web_extract 提取网页正文的能力，是查资料、读网页的基础工具。',
  'Browser Automation': '浏览器自动化——真实打开网页并点击、输入、滚动、截图，适合需要登录或复杂交互的网页操作。',
  'Terminal & Processes': '终端与进程管理——执行 shell 命令、运行脚本、管理后台进程，是操作系统层面的"双手"。',
  'File Operations': '文件操作——读取、写入、打补丁、搜索本地文件，处理文档和代码的基础能力。',
  'Code Execution': '代码执行——在沙箱里运行 Python 脚本，适合批量数据处理、计算和带逻辑分支的任务。',
  'Vision / Image Analysis': '视觉/图像分析——看图说话：识别截图、照片、图表内容。已配置为你的千问3.8-max 视觉模型。',
  'Video Analysis': '视频分析——理解视频内容（需要支持视频的模型）。',
  'Image Generation': '图像生成——根据文字描述生成图片。',
  'Video Generation': '视频生成——用文字/图片/参考素材生成视频（需单独配置提供商）。',
  'BFL FLUX 3 Video': 'BFL FLUX 3 视频生成——基于 FLUX 3 模型的视频生成工具组。',
  'X (Twitter) Search': 'X（推特）搜索——搜索 X 平台内容（需要 xAI 凭据）。',
  'Text-to-Speech': '文字转语音——把文字合成为语音朗读。',
  'Speech-to-Text': '语音转文字——把语音消息自动转成文字（用于网关语音消息和语音模式）。',
  'Skills': '技能管理——查看、加载、管理技能库，也就是"技能"标签页本身的能力。',
  'Task Planning': '任务规划——todo 清单：把复杂任务拆解成步骤并跟踪进度。',
  'Memory': '持久记忆——跨会话记住你的偏好和重要事实，是我"认识你"的来源。',
  'Context Engine': '上下文引擎——由当前上下文引擎提供的运行时工具。',
  'Session Search': '会话搜索——全文检索历史对话记录，找回之前聊过的内容。',
  'Clarifying Questions': '澄清提问——遇到歧义时主动向你提问确认，避免做错方向。',
  'Task Delegation': '任务委派——把子任务派给独立的子代理并行处理，适合大任务拆解。',
  'Cron Jobs': '定时任务——创建、管理定时/周期性自动任务，比如每日简报、定时提醒。',
  'Home Assistant': '智能家居控制——接入 Home Assistant 控制灯光等设备（需要令牌）。',
  'Spotify': 'Spotify 音乐控制——播放、搜索、管理歌单（需要账号）。',
  'Discord (read/participate)': 'Discord 读取与参与——拉取消息、搜索成员、创建话题。',
  'Discord Server Admin': 'Discord 服务器管理——列频道/角色、置顶、分配角色。',
  'Yuanbao': '腾讯元宝——群信息、成员查询、私聊操作。',
  'Computer Use (macOS/Windows/Linux)': '桌面控制——在后台操控你的电脑：点击、打字、截屏，不会抢占你正在用的鼠标和键盘焦点。',

  // ══════════ 技能（Skills 标签页，标题 = 技能名）══════════
  'awesome-hermes-agent': 'Hermes 精选资源合集——汇集社区优秀技能、插件与用法的索引入口。',
  'brain-ops': '知识库页面读写——读取、充实、撰写"大脑"知识页面并标注来源出处。',
  'cangtai-daily-report': '苍泰高速日报生成器——从"工程部每日完成情况"Excel 自动产出每日情况报告（Word）和施工日志（Excel），自动提取分包单位、产值，并接入温州/泰顺天气。',
  'computer-use': '桌面后台操控——在后台点击、打字、滚动、拖拽你的电脑桌面，不抢占鼠标键盘焦点，不切换虚拟桌面。',
  'construction-brief-writing': '汇报材料写作风格——为你定制的公司简报/汇报/宣传稿规范：正式简洁、单段汇总、150字目标、"先立模式再破解难题"逻辑。触发词：写一段、精简、简报。',
  'dingtalk-aisearch': '钉钉 AI 找人——按姓名、工号、部门、职责、上下级语义搜索人员，跨文档/消息/邮件/听记定位信息。',
  'dingtalk-aitable': '钉钉 AI 表格（多维表）——建表、增删改查记录、筛选排序、公式计算、批量导入导出 CSV/JSON。',
  'dingtalk-calendar': '钉钉日历与会议室——约会议、查日程、订会议室、查闲忙、加参会人、改期取消。',
  'dingtalk-chat': '钉钉群聊与消息——发单聊/群聊消息、建群、管成员、@消息、搜聊天记录、发图片文件、Webhook 通知。',
  'dingtalk-contact': '钉钉通讯录精确查询——拿到用户 ID 后查部门、职位、邮箱，或用完整手机号反查用户。',
  'dingtalk-doc': '钉钉在线文档——查找、创建、读写在线文字文档，管理白板卡片、附件、评论、版本、模板和权限分享。',
  'dingtalk-drive': '钉钉文件管理——上传、下载、复制、移动、同步钉盘与文档空间里的文件和文件夹。',
  'dingtalk-event': '钉钉事件监听——长连接实时监听消息、@提醒、已读撤回、群变化、审批流转等事件。',
  'dingtalk-mail': '钉钉邮箱——收发邮件、搜索、回复、转发、处理附件。',
  'dingtalk-minutes': '钉钉 AI 听记——查询会议听记的摘要、转写全文、关键词、待办和分享。',
  'dingtalk-misc': '钉钉长尾功能合集——OA 审批、考勤、直播、DING 消息、日报周报、招聘、组织大脑等低频产品。',
  'dingtalk-shared': '钉钉共享入口——跨产品编排、URL 预检和产品边界判断的公共底座。',
  'dingtalk-todo': '钉钉待办——创建、指派、完成待办任务，支持紧急、循环和批量待办。',
  'dingtalk-wiki': '钉钉知识库——创建和管理命名的团队知识空间、个人知识库及库内节点。',
  'gstack-upgrade': 'gstack 升级——把 gstack 升级到最新版本。',
  'hermes-desktop-plugins': '桌面插件开发指南——编写给 Hermes 桌面端添加面板、状态栏组件、命令面板指令的插件。',
  'hermes-for-win': 'Windows 一键部署——在 Windows 上安装、部署、管理 Hermes Agent 和 WebUI，含开机自启和后台常驻。',
  'html-ppt': 'HTML 演示文稿工作室——用模板生成专业美观的静态 HTML 幻灯片、演讲稿、小红书图文，支持键盘翻页。',
  'online-docs-access': '在线文档抓取策略——在无法导出时，从需登录的金山/飞书/腾讯/钉钉协作文档中可靠提取内容。',
  'personal-opc-projects': '个人 OPC 项目——创建轻量、有科学依据的个人桌面小项目，与工作上下文严格隔离。',
  'xiaohongshu': '小红书风格改写——把任意内容转换成小红书风格的图文帖子。',
  'yuanbao': '元宝群操作——在元宝群里 @成员、查询群信息和成员列表。',

  'claude-code': 'Claude Code 委派——把开发功能、提 PR 等编码任务交给 Claude Code 命令行智能体完成。',
  'codex': 'Codex 委派——把编码任务交给 OpenAI Codex 命令行智能体完成。',
  'hermes-agent': 'Hermes 使用百科——配置、主题、扩展、编排 Hermes 自身的操作手册，遇到 Hermes 问题先查它。',
  'merge-reconciler': '合并冲突仲裁——以中立第三方身份解决多个智能体之间的代码合并冲突。',
  'opencode': 'OpenCode 委派——把编码和 PR 审查交给 OpenCode 命令行智能体。',

  'chrome-devtools-automation': 'Chrome 调试协议自动化——用 CDP 驱动 Chrome 并保持登录态，跨会话复用、不重复登录。',

  'architecture-diagram': '架构图绘制——生成深色主题的 SVG 架构/云/基础设施图（HTML 输出）。',
  'ascii-art': 'ASCII 艺术——用字符画生成文字艺术和图案。',
  'ascii-video': 'ASCII 视频——把视频/音频转换成彩色字符动画（MP4/GIF）。',
  'baoyu-infographic': '信息图生成——21 种布局 × 21 种风格的信息图与数据可视化。',
  'claude-design': '一次性网页设计——设计落地页、演示稿、原型等 HTML 成品。',
  'comfyui': 'ComfyUI 生成——通过扩散模型工作流生成图片、视频、音频。',
  'design-md': '设计令牌规范——编写、校验、导出 Google DESIGN.md 设计规范文件。',
  'excalidraw': '手绘风格图表——生成架构图、流程图、时序图的手绘风 Excalidraw 文件。',
  'humanizer': '去 AI 味润色——去掉文字的 AI 腔，加上真实的人味和语气。',
  'manim-video': '数学动画视频——用 Manim 制作 3Blue1Brown 风格的数学/算法动画。',
  'p5js': '创意编程画布——用 p5.js 写生成艺术、着色器、交互式和 3D 作品。',
  'popular-web-designs': '54 套真实设计系统——Stripe、Linear、Vercel 等知名设计风格可直接套用。',
  'pretext': '纯文本浏览器演示——不依赖 DOM 的创意文字排版演示。',
  'sketch': '快速 HTML 原型——一次出 2-3 个设计变体快速对比取舍。',
  'songwriting-and-ai-music': '歌曲创作——写词技巧 + Suno AI 音乐生成提示词。',
  'touchdesigner-mcp': 'TouchDesigner 控制——通过 MCP 控制 TouchDesigner 做视觉作品。',

  'jupyter-live-kernel': '实时 Jupyter 内核——在活的 Jupyter 内核里迭代运行 Python，边跑边看结果。',

  'gongwen-format': '公文格式排版——按 GB/T 9704-2012 国标给 Word 公文排版。触发词："帮我排一下格式"。',

  'email-inbox-triage': '邮箱分诊——给收件箱按优先级分类、安全起草回复。',
  'himalaya': '终端邮件客户端——用 Himalaya 命令行收发 IMAP/SMTP 邮件。',

  'codebase-inspection': '代码库体检——统计代码行数、语言分布和占比。',
  'github-auth': 'GitHub 认证配置——配置 HTTPS 令牌、SSH 密钥、gh CLI 登录。',
  'github-code-review': 'PR 代码审查——审查 Pull Request 的 diff 并逐行留评论。',
  'github-issue-to-pr': '议题变 PR——把一个 GitHub issue 一路做到验证过的 Pull Request。',
  'github-issues': 'Issue 管理——创建、分类、打标签、指派 GitHub 议题。',
  'github-pr-workflow': 'PR 全生命周期——建分支、提交、开 PR、跑 CI、合并的完整流程。',
  'github-repo-management': '仓库管理——克隆/创建/Fork 仓库，管理远程仓库和 Release。',

  'hermes-agent-self-evolution': 'Hermes 自我进化——用 DSPy + GEPA 自动优化技能、工具描述和系统提示词。',
  'hermes-backup-automation': 'Hermes 自动备份——每日备份 + 变更跟踪 + 保留策略，定时报告改了什么。',
  'hermes-gateway-setup': '网关平台配置——配置微信/钉钉/Telegram 等消息平台的交互式向导，含 Windows 踩坑处理。',
  'hermes-mcp-config': 'MCP 服务器配置——在 config.yaml 中配置 MCP 服务器，重点是 Chrome 调试端口的 Windows 适配。',

  'gif-search': 'GIF 搜索——从 Tenor 搜索和下载 GIF 表情图。',
  'heartmula': 'AI 作曲——像 Suno 一样，用歌词 + 风格标签生成歌曲。',
  'songsee': '音频可视化——生成音频的频谱图、梅尔谱、MFCC 等特征。',
  'youtube-content': 'YouTube 内容加工——把视频字幕转成摘要、推文串、博客文章。',

  'huggingface-hub': 'HuggingFace 仓库——搜索、下载、上传模型和数据集。',
  'llama-cpp': '本地模型推理——用 llama.cpp 跑本地 GGUF 模型并发现 HF Hub 模型。',
  'segment-anything-model': 'SAM 分割一切——在图上点一下或画个框就能零样本抠图分割。',
  'weights-and-biases': 'W&B 实验跟踪——记录机器学习实验、调参扫描、模型注册和仪表盘。',

  'obsidian': 'Obsidian 笔记——读取、搜索、创建、编辑你的 Obsidian 知识库笔记。',

  'opc-personal-project': 'OPC 产品化方法论——个人项目从选型决策、方案生成、MVP 编码到本地验收的全流程（Windows 原生验证）。',

  'airtable': 'Airtable 表格——通过 REST API 增删改查记录、筛选、批量更新。',
  'box': 'Box 云盘——管理云端文件、分享、搜索和元数据。',
  'chinese-official-report-writing': '正式公文写作——领导汇报、工作报告、总结材料的正式写法规范。触发词：写一段、精简、优化、正式点。',
  'document-to-action-items': '文档提取行动项——从文档中提取有出处的义务、截止时间和任务。',
  'docx': 'Word 文档处理——创建、读取、编辑 .docx 文件，支持模板和审阅。',
  'google-workspace': '谷歌办公套件——Gmail、日历、Drive、Docs、Sheets 一站式操作。',
  'lark-cli': '飞书命令行——安装和使用飞书 CLI 操作文档、日历、表格、消息、任务。',
  'maps': '地图查询——地理编码、兴趣点、路线、时区查询。',
  'meeting-action-items': '会议纪要转行动项——把会议记录变成有出处的决定、负责人和工单。',
  'nano-pdf': 'PDF 编辑——用自然语言指令修改现有 PDF 里的文字。',
  'notion': 'Notion 操作——页面、数据库、Markdown 读写和 Workers。',
  'ocr-and-documents': '文档 OCR 提取——从 PDF/扫描件中提取文字。',
  'office-generation': 'Office 轻量生成——用 Python CLI 生成 Word 和 Excel 文件，无需 MCP。',
  'pdf': 'PDF 全能处理——创建、读取、合并、填表、加密 PDF。',
  'petdex': '桌面宠物——给 Hermes 安装和选择动画宠物吉祥物。',
  'powerpoint': 'PPT 处理——用 python-pptx 创建、读取、编辑 .pptx 幻灯片。',
  'product-price-monitor': '价格监控——盯住商品、机票、房源价格，到达目标就提醒。',
  'session-librarian': '会话整理员——按指令查找、重命名、归档、清理历史会话。',
  'teams-meeting-pipeline': 'Teams 会议管线——Teams 会议摘要、任务回放、Graph 订阅通知。',
  'weekly-review-planning': '每周复盘规划——每周梳理承诺、停滞工作，制定下周计划。',
  'xlsx': 'Excel 表格处理——创建、读取、编辑 .xlsx 工作簿和 CSV。',

  'arxiv': '论文搜索——按关键词、作者、分类或 ID 搜索 arXiv 论文。',
  'blocked-page-recovery': '被墙页面恢复——通过备用方案恢复被拦截/付费墙/WAF 拦截的网页内容。',
  'blogwatcher': '博客监控——监控博客和 RSS/Atom 订阅源的更新。',
  'competitor-news-monitor': '竞品新闻监控——盯住指定公司的重要动态，输出带引用的简报。',
  'construction-frontline-pain-points-research': '一线痛点调研——收集建筑工人、网友、行业调研中施工一线痛点的纯信号研究方法论。',
  'grounded-citations': '有据可查——让回答和文档都带可验证的引用来源。',
  'llm-wiki': 'LLM 维基——构建和查询互相链接的 Markdown 知识库。',
  'polymarket': '预测市场查询——查询 Polymarket 的盘口、价格、订单簿和历史。',

  'construction-daily-log-generation': '施工日志自动化——从原始 Excel 和固定版式模板自动生成标准施工日志，带地理位置天气接入。',
  'construction-log-generator': '施工日志生成器——基于输入表自动填充日志模板（Excel），支持多项目、可扩展天气接入。',
  'construction-regulations': '建筑法规速查——临时用电、高处作业、安全生产许可、特种设备、钢结构焊接等常用法规关键条款速查。',
  'enterprise-ai-infrastructure': '企业 AI 算力接入——钉钉 DEAP、阿里云百炼的 API Key 获取与 Hermes 配置全流程（含千问3.8-max 视觉接入）。',
  'smart-construction-knowledge': '智能建造知识库——你的专业知识汇总：智慧梁场、长海大桥、无人机狗巡检、机械指挥官、路面无人化、桩基自营、盾构、墩柱机器人等。',

  'openhue': '飞利浦 Hue 灯控——控制灯光、场景、房间。',

  'dogfood': '探索性测试——像真实用户一样探索网页应用、找 Bug、出证据报告。',
  'hermes-agent-skill-authoring': '技能编写规范——编写仓库内 SKILL.md 技能文件的格式与结构指南。',
  'inspecting-hermes-desktop-dom': '桌面 DOM 检查——通过 CDP 读取 Hermes 桌面端的实时 DOM/CSS。',
  'node-inspect-debugger': 'Node 调试——用 --inspect + Chrome 调试协议调试 Node.js。',
  'plan': '写计划——把 Markdown 计划写进 .hermes/plans/，只写不执行。',
  'requesting-code-review': '提交前审查——安全扫描、质量门禁、自动修复。',
  'simplify-code': '代码瘦身——4 个智能体并行清理最近的代码改动。',
  'spike': '快速验证实验——写一次性实验代码，先验证想法再动手建。',
  'systematic-debugging': '系统化调试——四阶段根因分析：先理解 Bug 再修复。',
  'test-driven-development': '测试驱动开发——强制"红-绿-重构"，先写测试再写代码。',
  'windows-host-ops': 'Windows 主机操作——在 Windows 上跑 PowerShell 和 MCP 服务器的技巧（编码、转义、后台化四大坑）。'
}

// ────────────────────────────────────────────────────────────────
// 注入逻辑
// ────────────────────────────────────────────────────────────────
let enabled = true
let observer = null
let ctxRef = null

function injectAll() {
  if (!enabled) return

  document.querySelectorAll('header').forEach(header => {
    const h3 = header.querySelector('h3')
    const p = header.querySelector('p')
    if (!h3 || !p) return

    const title = (h3.textContent || '').trim()
    const cn = CN[title]
    const existing = header.querySelector(`[${MARK}]`)

    if (!cn) {
      // 标题不在词典里：清掉残留块（可能是切换到别的条目留下的）
      if (existing) existing.remove()
      return
    }

    if (existing) {
      // 切换条目时 React 只更新标题/介绍文字，注入块会残留——
      // 标题变了就同步换内容，而不是跳过
      if (existing.getAttribute('data-cn-title') !== title) {
        existing.setAttribute('data-cn-title', title)
        const body = existing.querySelector('[data-cn-body]')
        if (body) body.textContent = cn
      }
      return
    }

    const box = document.createElement('div')
    box.setAttribute(MARK, '')
    box.setAttribute('data-cn-title', title)
    box.style.cssText = [
      'margin-top:8px',
      'padding:8px 10px',
      'border-left:2px solid var(--ui-accent)',
      'background:var(--ui-bg-quinary)',
      'border-radius:6px',
      'font-size:0.75rem',
      'line-height:1.6',
      'color:var(--ui-text-secondary)'
    ].join(';')

    const label = document.createElement('div')
    label.style.cssText = 'font-weight:600;color:var(--ui-accent);font-size:0.68rem;margin-bottom:3px'
    label.textContent = '中文解释'

    const body = document.createElement('div')
    body.setAttribute('data-cn-body', '')
    body.textContent = cn

    box.appendChild(label)
    box.appendChild(body)
    header.appendChild(box)
  })
}

function startObserver() {
  if (observer) observer.disconnect()

  observer = new MutationObserver(() => {
    if (observer._pending) return
    observer._pending = true
    requestAnimationFrame(() => {
      if (observer) observer._pending = false
      injectAll()
    })
  })
  observer.observe(document.body, { childList: true, subtree: true })
  injectAll()
}

// ────────────────────────────────────────────────────────────────
// 状态栏开关芯片
// ────────────────────────────────────────────────────────────────
function ToggleChip() {
  const [on, setOn] = useState(enabled)

  return jsx('button', {
    type: 'button',
    title: on ? '点击关闭技能/工具中文解释' : '点击开启技能/工具中文解释',
    className:
      'inline-flex h-full items-center gap-1 px-1.5 text-[0.6875rem] transition-colors ' +
      'text-(--ui-text-tertiary) hover:bg-(--chrome-action-hover) hover:text-foreground',
    onClick: () => {
      enabled = !enabled
      setOn(enabled)

      if (ctxRef) ctxRef.storage.set('enabled', enabled)

      if (enabled) {
        injectAll()
        host.notify({ kind: 'info', message: '技能与工具中文解释：已开启' })
      } else {
        document.querySelectorAll(`[${MARK}]`).forEach(n => n.remove())
        host.notify({ kind: 'info', message: '技能与工具中文解释：已关闭' })
      }
    },
    children: on ? '中文解释·开' : '中文解释·关'
  })
}

// ────────────────────────────────────────────────────────────────
// 插件入口
// ────────────────────────────────────────────────────────────────
export default {
  id: ID,
  name: '技能与工具中文解释',
  register(ctx) {
    ctxRef = ctx

    // 热重载保护：断开上一个实例的 observer
    if (globalThis.__skillsCnExplainObserver) {
      try {
        globalThis.__skillsCnExplainObserver.disconnect()
      } catch {
        /* noop */
      }
    }

    // 读取持久化开关，然后启动
    Promise.resolve(ctx.storage.get('enabled'))
      .then(v => {
        enabled = v !== false && v !== 'false'
      })
      .catch(() => {
        enabled = true
      })
      .finally(() => {
        startObserver()
        globalThis.__skillsCnExplainObserver = observer
      })

    // 状态栏开关
    ctx.register({
      id: 'toggle-chip',
      area: 'statusBar.right',
      order: 140,
      render: () => jsx(ToggleChip, {})
    })
  }
}
