<div align="center">

<h1>🗄️ AI Vault Universal</h1>

**本地优先的 AI 工作台浏览器插件**

把你每次和 AI 的对话，变成真正属于你的知识资产。

[![Version](https://img.shields.io/badge/version-1.4.4-1a1a1a?style=flat-square)](https://github.com/kin684660-commits/ai-vault-universal/releases)
[![License](https://img.shields.io/badge/license-MIT-1a1a1a?style=flat-square)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-1a1a1a?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/)
[![Privacy](https://img.shields.io/badge/数据-100%25_本地-7c3aed?style=flat-square)](#隐私)

[安装](#安装) · [功能截图](#功能截图) · [使用场景](#使用场景) · [English](#english)

</div>

---

你每天和 AI 对话，但好内容总是消失：

- 切换标签页就丢了
- 换个模型要重新解释背景
- 长对话找不回某一段
- 好的 Prompt 每次都要重写
- 几十轮聊天没有沉淀

**AI Vault Universal** 就是来解决这些问题的。它是一个浏览器插件，在你的 AI 对话流程里做最小化介入，把有价值的内容留下来，让你下次能直接用。

---

## 功能截图

### 侧边栏 · 随时唤出，不打断心流

> 在 ChatGPT、Claude、Gemini 等任意 AI 页面，快捷键 `Ctrl+Shift+K` 打开。

![侧边栏](screenshots/sidebar.png)

三个核心区域：**摘录**（已保存内容）· **长期片段**（Skill 包/Prompt/个人信息）· **目录**（对话导航）

底部六个快捷入口：上下文胶囊 · 导出中心 · AI 整理 · 导出 PDF · 导出 JSON · 导出 Markdown

---

### Skill Studio · 把好的对话沉淀成可复用模板

> 某次 AI 回答特别好？两种模式把它变成下次直接调用的 Skill 包。

![Skill Studio 规则模式](screenshots/skill-rule.png)

**模式 1：规则生成** — 插件自动提取对话结构，生成 Skill 名称、触发词、分组、标签、一句话用途，你直接编辑保存。

![Skill Studio AI模式](screenshots/skill-ai.png)

**模式 2：借当前 AI** — 插件生成总结提示词，一键插入输入框，发送后把 AI 回复导入草稿。换模型也能用。

---

### 上下文胶囊 · 长对话压缩，省 token，换模型不丢失

> 对话太长？一键压缩成结构化的续聊包。

![上下文胶囊](screenshots/capsule.png)

三种压缩类型：
- **轻压缩** — 适合省 token 继续当前对话
- **续聊包** — 压缩成背景 + 已完成 + 下一步，切换模型无缝接续
- **Skill 候选** — 适合进一步沉淀为 Skill 包

生成的胶囊可以：复制 Markdown · 插入到输入框 · 保存到摘录 · 导出

---

### 长期片段库 · 个人信息/Prompt/Skill 包统一管理

> 把你长期用的背景信息、提示词模板、Skill 包都存在这里。

![长期片段库](screenshots/snippets.png)

分类管理：**Skill 包** · **Prompt** · **个人信息** · 自定义分组

在任意 AI 输入框输入 `/触发词` 即可唤出，回车插入。不用每次重新解释背景。

---

### 导出中心 · Markdown / JSON / PDF

> 你的知识，你来决定怎么存。

![导出中心](screenshots/export.png)

选择导出范围：当前选中 · 当前页面 · 当前对话/主内容 · 最后一条 AI 回复 · 全部知识库

选择格式：**Markdown**（适合 Obsidian/Notion）· **JSON**（完整备份，可重新导入）· **PDF**（本地打印存档）

---

### Popup 主界面 · 当前页面一键操作

![Popup](screenshots/popup.png)

保存选中 · 保存页面 · 保存 AI 回复 · 沉淀 Skill · 上下文胶囊 · 导出 · 打开悬浮入口，全部在这里。

---

### 设置页 · 行为完全可控

![设置页](screenshots/options.png)

可配置：悬浮入口显示/隐藏 · `/片段` 触发开关 · Enter 换行/Ctrl+Enter 发送 · 大段粘贴提醒阈值 · 最大保存条数

---

## 支持平台

ChatGPT · Claude · Gemini · DeepSeek · Kimi · 豆包 · Grok · Perplexity · Poe · Copilot · Mistral · **任意网页**（右键菜单）

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+K` | 打开/关闭侧边栏 |
| `Ctrl+Shift+S` | 保存当前选中文字 |
| `Ctrl+Shift+P` | 保存当前页面摘要 |
| `/` 在输入框内 | 唤出长期片段库 |
| `Ctrl+Enter` | 在 AI 页面发送消息 |

---

## 安装

### 手动安装（当前推荐）

1. 前往 [Releases](https://github.com/kin684660-commits/ai-vault-universal/releases/latest) 下载最新的 `.zip` 文件
2. 解压得到文件夹
3. 打开 Chrome / Edge，地址栏输入 `chrome://extensions`
4. 右上角开启 **「开发者模式」**
5. 点击 **「加载已解压的扩展程序」**，选择解压后的文件夹
6. ✅ 完成

### Chrome Web Store

> 计划提交，通过审核后更新链接。

---

## 使用场景

**场景 1：看到好内容，先存下来**
选中文字 → `Ctrl+Shift+S` 或右键菜单 → 后续再整理标签和分组

**场景 2：把常用背景信息存进去，一次存，处处用**
在长期片段库新增你的个人背景、技术栈、写作风格 → 在任意 AI 输入框输入 `/背景` 即可插入

**场景 3：好聊天沉淀成 Skill 包**
某次对话质量特别高 → 打开 Skill Studio → 规则模式或借 AI 总结 → 保存 → 下次直接调用

**场景 4：对话太长，切换模型**
打开上下文胶囊 → 选「续聊包」→ 插入到新模型的输入框 → 无缝接续

**场景 5：整理知识库**
AI 整理功能生成整理指令 → 发给任意 AI → AI 返回分组建议 JSON → 一键合并到本地库

**场景 6：导出备份**
导出中心 → 选范围 → 导出 PDF / Markdown / JSON → 存入 Obsidian 或本地归档

---

## 隐私

- ✅ 所有数据通过 `chrome.storage.local` 保存在**本地浏览器**
- ✅ 不连接任何服务器，不上传任何内容
- ✅ 不需要注册账号或登录
- ✅ 源代码完全开放，可自行审计
- ✅ 卸载插件即清除全部数据

---

## 项目结构

```
ai-vault-universal/
├── manifest.json       # 插件配置（Manifest V3）
├── background.js       # Service Worker：右键菜单、快捷键、存储
├── common.js           # 公共工具函数
├── content.js          # 注入所有页面：保存按钮、侧边栏、TOC、/ 触发
├── content.css         # 注入样式
├── popup.html/js/css   # 点击图标的主界面
└── options.html/js/css # 设置页
```

---

## 贡献

欢迎 Issue 和 PR。

- **新平台适配**：某个 AI 网站的收藏按钮没出现？提 Issue 附上网址，或直接 PR 补充 DOM 选择器
- **Bug 反馈**：附上浏览器版本 + 控制台报错截图
- **功能建议**：描述你的具体使用场景

---

## English

**AI Vault Universal** is a browser extension that turns your temporary AI conversations into a local, persistent knowledge base.

**Key features:**
- One-click save any AI response or selected text from any webpage
- Long-term snippet library with `/trigger` insertion in any AI input box
- **Skill Studio** — distill great conversations into reusable Skill Packs (2 modes: rule-based or AI-assisted)
- **Context Capsule** — compress long conversations into compact handoffs (lite / resume / skill candidate)
- Floating TOC for navigating long conversations
- Export to Markdown / JSON / PDF (5 export scopes)
- **AI Organize** — let any AI suggest grouping/tags for your saved items
- Works with ChatGPT, Claude, Gemini, DeepSeek, Kimi, Doubao, Grok, Perplexity, Poe, Copilot, Mistral
- **100% local** — no server, no account, no uploads

**Install:** Download the latest release zip → unzip → `chrome://extensions` → Developer mode on → Load unpacked → select the folder.

---

## License

MIT © 2025 [kin684660-commits](https://github.com/kin684660-commits)

---

<div align="center">
  <sub>如果这个插件对你有用，欢迎点个 ⭐ Star</sub>
</div>
