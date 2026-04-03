<div align="center">

<h1>🗄️ AI Vault Universal</h1>

<p><strong>本地优先的 AI 工作台浏览器插件</strong></p>

<p>把你每次和 AI 的对话，变成真正属于你的知识资产。</p>

<p>
  <img src="https://img.shields.io/badge/版本-v1.4.4-6d28d9?style=for-the-badge" />
  <img src="https://img.shields.io/badge/数据-100%25本地-059669?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-0ea5e9?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Manifest-V3-f59e0b?style=for-the-badge" />
</p>

<p>
  <a href="#-安装到浏览器">🚀 安装</a> ·
  <a href="#-核心功能">✨ 功能</a> ·
  <a href="#-使用场景">💡 场景</a> ·
  <a href="#english">English</a>
</p>

<br/>

<img src="sidebar.png" width="380" alt="AI Vault 侧边栏" />

<br/><br/>

<p><i>在 ChatGPT、Claude、Gemini 等任意 AI 页面，一个侧边栏管理你所有的 AI 内容</i></p>

</div>

---

你每天和 AI 对话，但好内容总是消失：切换标签页就丢了，换个模型要重新解释背景，长对话找不回某一段，好的 Prompt 每次都要重写。

**AI Vault Universal** 解决这些问题。它在你的 AI 对话流程里做最小化介入，把有价值的内容留下来，让你下次能直接用。

---

## ✨ 核心功能

### 一键保存

在任意网页或 AI 页面，选中文字 → `Ctrl+Shift+S` 或右键菜单，立即保存。支持保存整段 AI 回复、当前页面、选中文字。自动记录来源平台和时间。

### 长期片段库 · `/触发词` 插入

<div align="center">
<img src="snippets.png" width="360" alt="长期片段库" />
</div>

把你的个人背景、常用 Prompt、Skill 包存进来。在任意 AI 输入框输入 `/` 即可唤出，回车插入。一次存储，11 个平台处处可用。

### Skill Studio · 好对话变成可复用模板

<div align="center">
<img src="skill-rule.png" width="560" alt="Skill Studio" />
</div>

某次 AI 回答特别好？两种模式把它沉淀成 Skill 包：

- **规则生成** — 自动提取对话结构，生成名称、触发词、标签、用途描述，直接编辑保存
- **借当前 AI** — 生成总结提示词插入输入框，把 AI 回复导入为草稿，换模型也能用

### 上下文胶囊 · 长对话压缩续聊

对话太长？一键压缩成结构化续聊包，省 token，切换模型也不丢失上下文。支持三种模式：轻压缩 / 续聊包 / Skill 候选。

### 导出中心

支持导出到 **Markdown**（适合 Obsidian / Notion）· **JSON**（完整备份）· **PDF**（本地存档）。可选范围：当前选中 / 当前页面 / 当前对话 / 最后一条 AI 回复 / 全部知识库。

### 长对话目录导航

在 AI 页面自动提取对话节点，右侧悬浮目录，点击一步跳转到任意位置。

---

## 支持平台

`ChatGPT` `Claude` `Gemini` `DeepSeek` `Kimi` `豆包` `Grok` `Perplexity` `Poe` `Copilot` `Mistral` 以及**任意网页**（右键菜单）

---

## 🚀 安装到浏览器

> 支持 Chrome / Edge，约 2 分钟，不需要任何账号。

**① 下载**：点击右侧 [Releases](https://github.com/kin684660-commits/ai-vault-universal/releases/latest) → 下载最新 `.zip` → 解压到任意文件夹

**② 打开扩展页**：Chrome 地址栏输入 `chrome://extensions` 回车（Edge 输入 `edge://extensions`）

**③ 开启开发者模式**：页面右上角找到「开发者模式」开关，打开（变蓝）

**④ 加载插件**：点击「加载已解压的扩展程序」→ 选择刚才解压的文件夹 → 确定

**⑤ 完成** ✅：工具栏出现 AI Vault 图标，打开任意 AI 页面即可使用

> 建议点击图标旁边的 📌 把插件固定到工具栏，方便随时打开。

---

## 💡 使用场景

| 场景 | 做法 |
|------|------|
| 看到好内容先存下来 | 选中文字 → `Ctrl+Shift+S` 或右键保存 |
| 提问时自动填入个人背景 | 在长期片段库存好背景信息，输入框里输入 `/` 触发 |
| 好聊天沉淀成 Skill 包 | 打开 Skill Studio → 规则模式一键生成 → 保存 |
| 切换模型时上下文不丢 | 上下文胶囊 → 选「续聊包」→ 插入到新模型输入框 |
| 整理知识库 | AI 整理 → 生成分组建议 → 一键合并 |
| 导出备份 | 导出中心 → 选格式 → PDF / Markdown / JSON |

---

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+K` | 打开 / 关闭侧边栏 |
| `Ctrl+Shift+S` | 保存当前选中文字 |
| `Ctrl+Shift+P` | 保存当前页面摘要 |
| `/` 在输入框内 | 唤出长期片段库 |
| `Ctrl+Enter` | 在 AI 页面发送消息（Enter 换行） |

---

## 隐私

- ✅ 所有数据通过 `chrome.storage.local` 存在**本地浏览器**，不经过任何服务器
- ✅ 不需要账号，不需要登录
- ✅ 源代码完全开放，可自行审计
- ✅ 卸载即清除全部数据

---

## English

**AI Vault Universal** is a browser extension that turns your AI conversations into a local, reusable knowledge base.

**Key features:**
- One-click save: selected text, AI responses, or full pages from any website
- Snippet library with `/trigger` insertion across 11 AI platforms
- **Skill Studio** — distill great conversations into reusable Skill Packs
- **Context Capsule** — compress long chats into compact handoffs for switching models
- Floating TOC for navigating long conversations
- Export to Markdown / JSON / PDF
- **100% local** — no server, no account, no uploads

**Install:** [Releases](https://github.com/kin684660-commits/ai-vault-universal/releases/latest) → download zip → unzip → `chrome://extensions` → Developer mode → Load unpacked → select folder.

---

## License

MIT © 2025 [kin684660-commits](https://github.com/kin684660-commits)

<div align="center"><br/>
<sub>如果对你有用，欢迎点个 ⭐ Star 支持一下</sub>
</div>
