const popupState = { scope: "page" };

async function getActiveTab() {
  const tabs = await avuTabsQuery({ active: true, currentWindow: true });
  return tabs[0];
}

async function sendToActive(message) {
  const tab = await getActiveTab();
  if (!tab?.id) throw new Error("no active tab");
  return avuSendTabMessage(tab.id, message);
}

function renderEmpty(container, text) {
  container.innerHTML = `<div class="empty">${text}</div>`;
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function createPdfPlaceholderWindow() {
  return avuCreatePdfPlaceholderWindow("PDF 导出");
}

async function exportLibraryPdf() {
  const pdfWindow = createPdfPlaceholderWindow();
  if (!pdfWindow) return;
  const [itemsResp, snippetsResp] = await Promise.all([
    avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }),
    avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" })
  ]);
  const items = itemsResp?.items || [];
  const snippets = snippetsResp?.snippets || [];
  const payload = {
    title: "AI Vault Universal 全部知识库",
    subtitle: new Date().toLocaleString(),
    meta: [`摘录 ${items.length}`, `片段 ${snippets.length}`, "本地导出"],
    sections: [
      {
        title: "摘录（前 20 条）",
        body: items.slice(0, 20).map((item, i) => `${i + 1}. ${item.title || "未命名摘录"}\n${avuTruncate(item.text || "", 300)}`).join("\n\n") || "无"
      },
      {
        title: "长期片段 / Skill（前 20 条）",
        body: snippets.slice(0, 20).map((item, i) => `${i + 1}. ${item.title || "未命名片段"}\n${avuTruncate(item.content || "", 300)}`).join("\n\n") || "无"
      }
    ]
  };
  const html = avuBuildSimplePdfHtml(payload);
  pdfWindow.document.open();
  pdfWindow.document.write(html);
  pdfWindow.document.close();
  pdfWindow.focus();
  setTimeout(() => {
    try { pdfWindow.print(); } catch (_) {}
  }, 250);
}

async function renderPagePanel() {
  const pageMeta = document.getElementById("pageMeta");
  const pageBadge = document.getElementById("pageBadge");
  const listEl = document.getElementById("itemList");
  const tab = await getActiveTab();
  const items = await avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }).then(r => r.items || []);

  if (!tab?.url) {
    pageBadge.textContent = "0";
    pageMeta.textContent = "无法读取当前页面";
    return renderEmpty(listEl, "当前页面不可用");
  }

  const pageKey = avuPageKeyFromUrl(tab.url);
  const filtered = items.filter(item => popupState.scope === "all" || item.source?.pageKey === pageKey);
  pageBadge.textContent = String(filtered.length);
  pageMeta.textContent = `${tab.title || "当前页面"}\n${tab.url}`;

  listEl.innerHTML = "";
  if (!filtered.length) return renderEmpty(listEl, popupState.scope === "all" ? "还没有任何摘录" : "本页还没有保存内容");

  filtered.slice(0, 6).forEach(item => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${avuEscapeHtml(item.title || "未命名摘录")}</div>
      <div class="item-meta">${avuEscapeHtml(item.folder || "未分类")} · ${avuEscapeHtml(item.model || item.type || "网页")} · ${avuEscapeHtml(avuFormatRelativeTime(item.createdAt))}</div>
      ${(item.tags || []).length ? `<div class="item-tags">${item.tags.slice(0,4).map(tag => `<span class="tag">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="item-text">${avuEscapeHtml(avuTruncate(item.text || "", 150))}</div>
      <div class="item-actions">
        <button class="small-btn" data-action="copy" data-id="${item.id}">复制</button>
        <button class="small-btn" data-action="skill" data-id="${item.id}">进 Skill 包</button>
        <button class="small-btn alt" data-action="delete" data-id="${item.id}">删除</button>
      </div>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.onclick = async () => {
      const item = filtered.find(x => x.id === btn.dataset.id);
      if (!item) return;
      await navigator.clipboard.writeText(item.text || "");
      btn.textContent = "已复制";
      setTimeout(() => btn.textContent = "复制", 900);
    };
  });
  listEl.querySelectorAll('[data-action="skill"]').forEach(btn => {
    btn.onclick = async () => {
      const item = filtered.find(x => x.id === btn.dataset.id);
      if (!item) return;
      await avuRuntimeSendMessage({
        type: "AVU_UPSERT_SNIPPET",
        snippet: { title: item.title, folder: "Skill 包", kind: "skill", tags: item.tags || [], content: item.text || "" }
      });
      btn.textContent = "已加入";
      renderSnippetPanel();
    };
  });
  listEl.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      await avuRuntimeSendMessage({ type: "AVU_DELETE_ITEM", id: btn.dataset.id });
      renderPagePanel();
    };
  });
}

async function renderSnippetPanel() {
  const listEl = document.getElementById("snippetList");
  const badgeEl = document.getElementById("snippetBadge");
  const snippets = await avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" }).then(r => r.snippets || []);
  badgeEl.textContent = String(snippets.length);
  listEl.innerHTML = "";

  if (!snippets.length) return renderEmpty(listEl, "还没有长期片段。可把高频总结沉淀为 Skill 包。");

  snippets.slice(0, 5).forEach(snippet => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${avuEscapeHtml(snippet.title || "未命名片段")}</div>
      <div class="item-meta">${avuEscapeHtml(avuSnippetKindLabel(snippet.kind))} · ${avuEscapeHtml(snippet.folder || "个人资料")} · ${avuEscapeHtml(snippet.trigger || "无触发词")}</div>
      ${(snippet.tags || []).length ? `<div class="item-tags">${snippet.tags.slice(0,4).map(tag => `<span class="tag">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="item-text">${avuEscapeHtml(avuTruncate(snippet.content || "", 140))}</div>
      <div class="item-actions">
        <button class="small-btn" data-action="insert" data-id="${snippet.id}">插入</button>
        <button class="small-btn alt" data-action="copy" data-id="${snippet.id}">复制</button>
      </div>
    `;
    listEl.appendChild(el);
  });

  listEl.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.onclick = async () => {
      const snippet = snippets.find(x => x.id === btn.dataset.id);
      if (!snippet) return;
      await navigator.clipboard.writeText(snippet.content || "");
      btn.textContent = "已复制";
      setTimeout(() => btn.textContent = "复制", 900);
    };
  });
  listEl.querySelectorAll('[data-action="insert"]').forEach(btn => {
    btn.onclick = async () => {
      const snippet = snippets.find(x => x.id === btn.dataset.id);
      if (!snippet) return;
      try { await sendToActive({ type: "AVU_INSERT_SNIPPET", text: snippet.content || "" }); } catch (error) { console.warn(error); }
    };
  });
}

async function exportBundle(format) {
  const items = await avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }).then(r => r.items || []);
  const snippets = await avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" }).then(r => r.snippets || []);
  if (format === "json") {
    downloadFile("ai-vault-universal-export.json", JSON.stringify({ items, snippets, exportedAt: new Date().toISOString() }, null, 2), "application/json");
    return;
  }
  downloadFile("ai-vault-universal-export.md", avuBuildMarkdownBundle(items, snippets), "text/markdown");
}

async function hideLauncherForHours(hours = 4) {
  await avuRuntimeSendMessage({ type: "AVU_HIDE_LAUNCHER_FOR_HOURS", hours });
  try { await sendToActive({ type: "AVU_HIDE_LAUNCHER_LOCAL" }); } catch (_) {}
}

async function showLauncherNow() {
  await avuRuntimeSendMessage({ type: "AVU_RESTORE_LAUNCHER" });
  try { await sendToActive({ type: "AVU_SHOW_LAUNCHER_LOCAL" }); } catch (_) {}
}

async function bindEvents() {
  document.getElementById("toggleSidebar").onclick = async () => { try { await sendToActive({ type: "AVU_TOGGLE_SIDEBAR" }); } catch (e) { console.warn(e); } };
  document.getElementById("openOutline").onclick = async () => { try { await sendToActive({ type: "AVU_OPEN_OUTLINE" }); } catch (e) { console.warn(e); } };
  document.getElementById("openSkillStudio").onclick = async () => { try { await sendToActive({ type: "AVU_OPEN_SKILL_STUDIO" }); } catch (e) { console.warn(e); } };
  document.getElementById("openContextStudio").onclick = async () => { try { await sendToActive({ type: "AVU_OPEN_CONTEXT_STUDIO" }); } catch (e) { console.warn(e); } };
  document.getElementById("openExportCenter").onclick = async () => { try { await sendToActive({ type: "AVU_OPEN_EXPORT_CENTER" }); } catch (e) { console.warn(e); } };
  document.getElementById("openOrganizeStudio").onclick = async () => { try { await sendToActive({ type: "AVU_OPEN_ORGANIZE_STUDIO" }); } catch (e) { console.warn(e); } };
  document.getElementById("saveSelection").onclick = async () => { try { await sendToActive({ type: "AVU_SAVE_SELECTION" }); await renderPagePanel(); } catch (e) { console.warn(e); } };
  document.getElementById("savePage").onclick = async () => { try { await sendToActive({ type: "AVU_SAVE_PAGE" }); await renderPagePanel(); } catch (e) { console.warn(e); } };
  document.getElementById("saveAi").onclick = async () => { try { await sendToActive({ type: "AVU_SAVE_AI_LAST" }); await renderPagePanel(); } catch (e) { console.warn(e); } };
  document.getElementById("openOptions").onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById("exportJson").onclick = () => exportBundle("json");
  document.getElementById("exportMd").onclick = () => exportBundle("md");
  document.getElementById("exportPdf").onclick = async () => { try { await exportLibraryPdf(); } catch (e) { console.warn(e); } };
  document.getElementById("restoreLauncher").onclick = async () => { await showLauncherNow(); };
  document.getElementById("hideLauncher").onclick = async () => { await hideLauncherForHours(4); };

  document.querySelectorAll(".chip").forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      popupState.scope = chip.dataset.scope;
      renderPagePanel();
    };
  });
}

(async function main() {
  await bindEvents();
  await renderPagePanel();
  await renderSnippetPanel();
})();
