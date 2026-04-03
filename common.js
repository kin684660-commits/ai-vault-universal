const AVU_STORAGE_KEYS = {
  ITEMS: "avu_items",
  SNIPPETS: "avu_snippets",
  SETTINGS: "avu_settings"
};

const AVU_DEFAULT_SETTINGS = {
  showLauncher: true,
  enableSlashSnippets: true,
  defaultCaptureScope: "page",
  maxItems: 1200,
  launcherHiddenUntil: 0,
  launcherHideHours: 4,
  launcherPosition: null,
  skillStudioDefaultScope: "last_turn",
  skillStudioDefaultMode: "rules",
  enableCustomSendBehavior: true,
  preferCtrlEnterToSend: true,
  longPasteThreshold: 3500
};

const AVU_AI_HOST_RULES = [
  {
    hosts: ["chatgpt.com", "chat.openai.com"],
    model: "ChatGPT",
    assistantSelectors: [
      '[data-message-author-role="assistant"]',
      'article [data-message-author-role="assistant"]',
      '[data-testid^="conversation-turn-"] [data-message-author-role="assistant"]',
      '[data-testid^="conversation-turn-"] .markdown.prose',
      'main article .prose',
      'main .markdown'
    ],
    userSelectors: [
      '[data-message-author-role="user"]',
      'article [data-message-author-role="user"]',
      '[data-testid^="conversation-turn-"] [data-message-author-role="user"]'
    ],
    sendButtonSelectors: [
      'button[data-testid="send-button"]',
      'button[aria-label*="Send"]',
      'form button[class*="bottom"]'
    ]
  },
  {
    hosts: ["claude.ai"],
    model: "Claude",
    assistantSelectors: [
      '[data-testid="assistant-message"]',
      '.font-claude-message',
      'div[data-testid="conversation-turn"] .prose',
      'main .prose'
    ],
    userSelectors: [
      '[data-testid="human-turn-message"]',
      '[data-testid="user-message"]',
      'div[data-testid="conversation-turn"] [data-testid="user-message"]'
    ],
    sendButtonSelectors: [
      'button[aria-label*="Send"]',
      'button[data-testid="send-button"]',
      'form button[type="submit"]'
    ]
  },
  {
    hosts: ["gemini.google.com", "aistudio.google.com"],
    model: "Gemini",
    assistantSelectors: [
      'message-content',
      'model-response',
      '.model-response-text',
      '.markdown',
      '[data-test-id="response-block"]'
    ],
    userSelectors: [
      'user-query',
      '.query-text',
      '.user-query-container'
    ],
    sendButtonSelectors: [
      'button[aria-label*="Send message"]',
      'button[aria-label*="发送"]',
      'button.send-button'
    ]
  },
  {
    hosts: ["grok.com", "x.com"],
    model: "Grok",
    assistantSelectors: [
      '[data-testid="conversation-turn-assistant"]',
      '[data-testid="conversation-turn"] .prose',
      '.prose'
    ],
    userSelectors: [
      '[data-testid="conversation-turn-user"]',
      '[data-testid="conversation-turn"] [data-message-author-role="user"]',
      'textarea'
    ],
    sendButtonSelectors: [
      'button[aria-label*="Send"]',
      'button[data-testid="send-button"]',
      'button[type="submit"]'
    ]
  },
  {
    hosts: ["chat.deepseek.com", "deepseek.com", "www.deepseek.com"],
    model: "DeepSeek",
    assistantSelectors: ['.ds-markdown', '.message-content', '.markdown-body', '.md-block'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["kimi.moonshot.cn"],
    model: "Kimi",
    assistantSelectors: ['.markdown-body', '.segment-content', '.message-content'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["doubao.com", "www.doubao.com", "doubao.cn", "www.doubao.cn"],
    model: "豆包",
    assistantSelectors: ['.markdown-body', '.answer-content', '.message-content', '.semi-typography'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["yuanbao.tencent.com"],
    model: "元宝",
    assistantSelectors: ['.markdown-body', '.agent-chat__message', '.message-content'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="发送"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["perplexity.ai", "www.perplexity.ai"],
    model: "Perplexity",
    assistantSelectors: ['[data-testid="answer"]', '.prose', '.markdown'],
    userSelectors: ['textarea', 'main [contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="Submit"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["poe.com"],
    model: "Poe",
    assistantSelectors: ['.Message_botMessageBubble', '.Markdown_renderedMarkdown', '.prose'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["copilot.microsoft.com"],
    model: "Copilot",
    assistantSelectors: ['cib-message[type="text"]', '.ac-textBlock', '.prose'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="Send"]']
  },
  {
    hosts: ["chat.mistral.ai"],
    model: "Mistral",
    assistantSelectors: ['.prose', '.markdown', '.message-content'],
    userSelectors: ['textarea', '[contenteditable="true"]'],
    sendButtonSelectors: ['button[type="submit"]', 'button[aria-label*="Send"]']
  }
];

function avuUid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function avuNormalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function avuTruncate(text, max = 120) {
  text = String(text || "");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function avuPreview(text, max = 120) {
  const normalized = avuNormalizeText(text);
  const first = normalized.split("\n").map(v => v.trim()).find(Boolean) || normalized;
  return avuTruncate(first, max);
}

function avuParseTags(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map(v => avuNormalizeText(v)).filter(Boolean))];
  }
  return [...new Set(String(input || "")
    .split(/[，,]/)
    .map(v => avuNormalizeText(v))
    .filter(Boolean))];
}

function avuTagsToText(tags) {
  return (Array.isArray(tags) ? tags : []).join(", ");
}

function avuStorageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function avuStorageSet(data) {
  return new Promise((resolve) => chrome.storage.local.set(data, resolve));
}

function avuTabsQuery(queryInfo) {
  return new Promise((resolve) => chrome.tabs.query(queryInfo, resolve));
}

function avuSendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(resp);
    });
  });
}

function avuRuntimeSendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (resp) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(resp);
    });
  });
}

function avuPageKeyFromUrl(url) {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}${u.search}`;
  } catch (error) {
    return url || "unknown";
  }
}

function avuHostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch (error) {
    return (typeof location !== "undefined" && location.host) ? location.host : "";
  }
}

function avuDetectAiRule(urlOrHost) {
  const raw = String(urlOrHost || "");
  let host = raw;
  try { host = new URL(raw).host; } catch (_) {}
  return AVU_AI_HOST_RULES.find(rule => rule.hosts.some(h => host.includes(h))) || null;
}

function avuDetectModel(urlOrHost) {
  return avuDetectAiRule(urlOrHost)?.model || null;
}

function avuIsAiUrl(urlOrHost) {
  return !!avuDetectAiRule(urlOrHost);
}

function avuNormalizeSnippetKind(kind) {
  const value = String(kind || "").toLowerCase();
  if (["skill", "skill-pack", "skill_pack", "workflow"].includes(value)) return "skill";
  if (["prompt", "template"].includes(value)) return "prompt";
  return "profile";
}

function avuSnippetKindLabel(kind) {
  const value = avuNormalizeSnippetKind(kind);
  if (value === "skill") return "Skill 包";
  if (value === "prompt") return "Prompt";
  return "个人信息";
}

async function avuGetItems() {
  const data = await avuStorageGet([AVU_STORAGE_KEYS.ITEMS]);
  return Array.isArray(data[AVU_STORAGE_KEYS.ITEMS]) ? data[AVU_STORAGE_KEYS.ITEMS] : [];
}

async function avuSaveItems(items) {
  await avuStorageSet({ [AVU_STORAGE_KEYS.ITEMS]: items });
  return items;
}

async function avuCreateItem(partial) {
  const url = partial.url || (typeof location !== "undefined" ? location.href : "");
  const text = avuNormalizeText(partial.text || partial.content || "");
  const model = partial.model ?? avuDetectModel(url);
  return {
    id: partial.id || avuUid("item"),
    type: partial.type || "capture",
    text,
    preview: partial.preview || avuPreview(text, 140),
    title: avuNormalizeText(partial.title || avuPreview(text, 80) || partial.pageTitle || "未命名摘录"),
    note: avuNormalizeText(partial.note || ""),
    folder: avuNormalizeText(partial.folder || "未分类"),
    tags: avuParseTags(partial.tags),
    favorite: !!partial.favorite,
    createdAt: partial.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: {
      url,
      host: avuHostFromUrl(url),
      title: partial.pageTitle || (typeof document !== "undefined" ? document.title : "") || "",
      pageKey: avuPageKeyFromUrl(url)
    },
    model,
    extra: partial.extra || {}
  };
}

async function avuAppendItem(itemLike) {
  const items = await avuGetItems();
  const item = await avuCreateItem(itemLike);
  items.unshift(item);
  const settings = await avuGetSettings();
  const trimmed = items.slice(0, settings.maxItems || AVU_DEFAULT_SETTINGS.maxItems);
  await avuSaveItems(trimmed);
  return item;
}

async function avuUpdateItem(itemPatch) {
  const items = await avuGetItems();
  const idx = items.findIndex(item => item.id === itemPatch.id);
  if (idx < 0) return null;
  const prev = items[idx];
  const next = {
    ...prev,
    ...itemPatch,
    title: avuNormalizeText(itemPatch.title ?? prev.title),
    text: avuNormalizeText(itemPatch.text ?? prev.text),
    note: avuNormalizeText(itemPatch.note ?? prev.note),
    folder: avuNormalizeText(itemPatch.folder ?? prev.folder ?? "未分类"),
    tags: avuParseTags(itemPatch.tags ?? prev.tags),
    updatedAt: new Date().toISOString(),
    source: { ...(prev.source || {}), ...(itemPatch.source || {}) },
    extra: { ...(prev.extra || {}), ...(itemPatch.extra || {}) }
  };
  items[idx] = next;
  await avuSaveItems(items);
  return next;
}

async function avuDeleteItem(itemId) {
  const items = await avuGetItems();
  const next = items.filter(item => item.id !== itemId);
  await avuSaveItems(next);
  return next;
}

async function avuGetSnippets() {
  const data = await avuStorageGet([AVU_STORAGE_KEYS.SNIPPETS]);
  return Array.isArray(data[AVU_STORAGE_KEYS.SNIPPETS]) ? data[AVU_STORAGE_KEYS.SNIPPETS] : [];
}

async function avuSaveSnippets(snippets) {
  await avuStorageSet({ [AVU_STORAGE_KEYS.SNIPPETS]: snippets });
  return snippets;
}

async function avuUpsertSnippet(snippet) {
  const snippets = await avuGetSnippets();
  const next = [...snippets];
  const normalizedKind = avuNormalizeSnippetKind(
    snippet.kind ||
    (String(snippet.folder || "").includes("Skill") || String(snippet.folder || "").includes("技能") ? "skill" : "")
  );
  const normalized = {
    id: snippet.id || avuUid("snippet"),
    title: avuNormalizeText(snippet.title || "未命名片段"),
    content: avuNormalizeText(snippet.content || ""),
    trigger: avuNormalizeText(snippet.trigger || ""),
    folder: avuNormalizeText(snippet.folder || (normalizedKind === "skill" ? "Skill 包" : "个人资料")),
    tags: avuParseTags(snippet.tags),
    kind: normalizedKind,
    createdAt: snippet.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    extra: snippet.extra || {}
  };
  const idx = next.findIndex(s => s.id === normalized.id);
  if (idx >= 0) next[idx] = { ...next[idx], ...normalized, extra: { ...(next[idx].extra || {}), ...(normalized.extra || {}) } };
  else next.unshift(normalized);
  await avuSaveSnippets(next);
  return normalized;
}

async function avuDeleteSnippet(snippetId) {
  const snippets = await avuGetSnippets();
  const next = snippets.filter(s => s.id !== snippetId);
  await avuSaveSnippets(next);
  return next;
}

async function avuGetSettings() {
  const data = await avuStorageGet([AVU_STORAGE_KEYS.SETTINGS]);
  return { ...AVU_DEFAULT_SETTINGS, ...(data[AVU_STORAGE_KEYS.SETTINGS] || {}) };
}

async function avuSaveSettings(settings) {
  const merged = { ...(await avuGetSettings()), ...(settings || {}) };
  await avuStorageSet({ [AVU_STORAGE_KEYS.SETTINGS]: merged });
  return merged;
}

function avuFormatRelativeTime(iso) {
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  if (Number.isNaN(t)) return "";
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function avuEscapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function avuIsEditable(el) {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  return el.isContentEditable || tag === "textarea" || (tag === "input" && !["checkbox", "radio", "button", "submit"].includes(el.type));
}

function avuInsertTextAtCursor(text) {
  const active = document.activeElement;
  if (!avuIsEditable(active)) return false;

  if (active.isContentEditable) {
    document.execCommand("insertText", false, text);
    return true;
  }

  const value = active.value || "";
  const start = active.selectionStart ?? value.length;
  const end = active.selectionEnd ?? value.length;
  active.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
  active.selectionStart = active.selectionEnd = start + text.length;
  active.dispatchEvent(new Event("input", { bubbles: true }));
  active.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function avuBadgeClass(model) {
  const name = String(model || "").toLowerCase();
  if (!name) return "web";
  if (name.includes("chatgpt")) return "gpt";
  if (name.includes("claude")) return "claude";
  if (name.includes("gemini")) return "gemini";
  if (name.includes("deepseek")) return "deepseek";
  if (name.includes("grok")) return "grok";
  if (name.includes("kimi")) return "kimi";
  if (name.includes("豆包")) return "doubao";
  if (name.includes("perplexity")) return "perplexity";
  if (name.includes("copilot")) return "copilot";
  if (name.includes("poe")) return "poe";
  return "web";
}


function avuExtractJsonBlock(text) {
  const raw = String(text || "").trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start >= 0 && end > start) return candidate.slice(start, end + 1);
  return candidate;
}

function avuSafeJsonParse(text) {
  try {
    return JSON.parse(avuExtractJsonBlock(text));
  } catch (error) {
    return null;
  }
}

function avuBuildCapsuleMarkdown(capsule) {
  const value = capsule || {};
  const lines = [
    `# ${value.title || "未命名上下文胶囊"}`,
    "",
    `- 类型：${value.capsuleTypeLabel || value.capsuleType || "上下文胶囊"}`,
    `- 模式：${value.buildModeLabel || value.buildMode || "规则生成"}`,
    value.model ? `- 模型：${value.model}` : "",
    value.scopeLabel ? `- 范围：${value.scopeLabel}` : "",
    value.sourceUrl ? `- 来源：${value.sourceUrl}` : "",
    "",
    "## 内容",
    value.body || value.text || ""
  ].filter(Boolean);
  return lines.join("\n");
}

function avuBuildSimplePdfHtml(payload) {
  const title = avuEscapeHtml(payload?.title || "AI Vault 导出");
  const subtitle = avuEscapeHtml(payload?.subtitle || "");
  const meta = Array.isArray(payload?.meta) ? payload.meta : [];
  const sections = Array.isArray(payload?.sections) ? payload.sections : [];
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #171717; margin: 0; background: #fff; }
.page { max-width: 860px; margin: 0 auto; padding: 36px 28px 56px; }
h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
.sub { color: #6b7280; font-size: 13px; margin-bottom: 18px; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
.badge { border: 1px solid #e5e7eb; border-radius: 999px; padding: 4px 10px; font-size: 12px; color: #374151; }
.card { border: 1px solid #ece7df; border-radius: 16px; padding: 16px 18px; margin-bottom: 14px; }
h2 { margin: 0 0 10px; font-size: 18px; }
pre, .body { white-space: pre-wrap; line-height: 1.65; font-size: 14px; color: #222; margin: 0; }
.small { color: #6b7280; font-size: 12px; }
@media print { .page { padding: 20px 16px 32px; } .card { break-inside: avoid; } }
</style>
</head>
<body>
<div class="page">
<h1>${title}</h1>
${subtitle ? `<div class="sub">${subtitle}</div>` : ""}
${meta.length ? `<div class="meta">${meta.map(item => `<span class="badge">${avuEscapeHtml(item)}</span>`).join("")}</div>` : ""}
${sections.map(section => `<section class="card"><h2>${avuEscapeHtml(section.title || "内容")}</h2><div class="body">${avuEscapeHtml(section.body || "")}</div></section>`).join("")}
</div>
</body>
</html>`;
}

function avuCreatePdfPlaceholderWindow(title = "PDF 导出") {
  const win = window.open('', '_blank');
  if (!win) return null;
  try {
    win.document.open();
    win.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${avuEscapeHtml(title)}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f8f5ef;color:#2c2a26;margin:0;padding:32px}.card{max-width:660px;margin:0 auto;background:#fff;border:1px solid #e8e2d8;border-radius:20px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.06)}h1{font-size:22px;margin:0 0 8px}p{color:#6b7280;line-height:1.7;margin:0}</style></head><body><div class="card"><h1>${avuEscapeHtml(title)}</h1><p>正在生成打印页。稍等一下，生成完成后会自动打开打印窗口。你可以在系统打印面板里选择“另存为 PDF”。</p></div></body></html>`);
    win.document.close();
  } catch (_) {}
  return win;
}

function avuCollectFolders(items) {
  return [...new Set((items || []).map(item => avuNormalizeText(item.folder || "未分类")).filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
}

function avuBuildMarkdownBundle(items, snippets) {
  const lines = [
    "# AI Vault Universal 导出",
    "",
    `导出时间：${new Date().toLocaleString()}`,
    "",
    "## 摘录",
    ""
  ];

  (items || []).forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title || "未命名摘录"}`);
    lines.push(`- 类型：${item.type || "capture"}`);
    lines.push(`- 分组：${item.folder || "未分类"}`);
    lines.push(`- 标签：${(item.tags || []).join(", ") || "无"}`);
    lines.push(`- 来源：${item.source?.title || ""} ${item.source?.url || ""}`.trim());
    lines.push(`- 模型：${item.model || "网页"}`);
    lines.push(`- 时间：${item.createdAt || ""}`);
    if (item.note) lines.push(`- 备注：${item.note}`);
    lines.push("");
    lines.push(item.text || "");
    lines.push("");
  });

  lines.push("## 长期片段 / Skill 包", "");
  (snippets || []).forEach((snippet, index) => {
    lines.push(`### ${index + 1}. ${snippet.title || "未命名片段"}`);
    lines.push(`- 类型：${avuSnippetKindLabel(snippet.kind)}`);
    lines.push(`- 触发词：${snippet.trigger || "无"}`);
    lines.push(`- 分组：${snippet.folder || "个人资料"}`);
    lines.push(`- 标签：${(snippet.tags || []).join(", ") || "无"}`);
    lines.push("");
    lines.push(snippet.content || "");
    lines.push("");
  });

  return lines.join("\n");
}
