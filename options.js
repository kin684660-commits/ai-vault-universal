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

async function exportBundle(format) {
  const items = await avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }).then(r => r.items || []);
  const snippets = await avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" }).then(r => r.snippets || []);
  if (format === "json") {
    downloadFile("ai-vault-universal-export.json", JSON.stringify({ items, snippets, exportedAt: new Date().toISOString() }, null, 2), "application/json");
    return;
  }
  downloadFile("ai-vault-universal-export.md", avuBuildMarkdownBundle(items, snippets), "text/markdown");
}

async function renderSnippets() {
  const list = document.getElementById("snippetList");
  const snippets = await avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" }).then(r => r.snippets || []);
  list.innerHTML = "";
  if (!snippets.length) return renderEmpty(list, "还没有长期片段。你可以把常用 Prompt、个人信息、固定说明和 Skill 包都存在这里。");

  snippets.forEach(snippet => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${avuEscapeHtml(snippet.title || "未命名片段")}</div>
      <div class="item-meta">${avuEscapeHtml(avuSnippetKindLabel(snippet.kind))} · ${avuEscapeHtml(snippet.folder || "个人资料")} · ${avuEscapeHtml(snippet.trigger || "无触发词")} · ${avuEscapeHtml(avuFormatRelativeTime(snippet.updatedAt || snippet.createdAt))}</div>
      ${(snippet.tags || []).length ? `<div class="item-tags">${snippet.tags.map(tag => `<span class="tag">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="item-text">${avuEscapeHtml(snippet.content || "")}</div>
      <div class="item-actions">
        <button class="btn" data-action="copy" data-id="${snippet.id}">复制</button>
        <button class="btn primary" data-action="delete" data-id="${snippet.id}">删除</button>
      </div>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.onclick = async () => {
      const snippet = snippets.find(s => s.id === btn.dataset.id);
      if (!snippet) return;
      await navigator.clipboard.writeText(snippet.content || "");
      btn.textContent = "已复制";
      setTimeout(() => btn.textContent = "复制", 900);
    };
  });

  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      await avuRuntimeSendMessage({ type: "AVU_DELETE_SNIPPET", id: btn.dataset.id });
      renderSnippets();
    };
  });
}

async function renderItems() {
  const keyword = (document.getElementById("searchInput").value || "").trim().toLowerCase();
  const list = document.getElementById("itemList");
  const items = await avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }).then(r => r.items || []);
  const filtered = items.filter(item => {
    if (!keyword) return true;
    const haystack = [item.text, item.title, item.model, item.source?.host, item.source?.title, item.folder, ...(item.tags || []), item.note].join(" ").toLowerCase();
    return haystack.includes(keyword);
  });

  list.innerHTML = "";
  if (!filtered.length) return renderEmpty(list, "没有匹配结果。");

  filtered.forEach(item => {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div class="item-title">${avuEscapeHtml(item.title || "未命名摘录")}</div>
      <div class="item-meta">${avuEscapeHtml(item.folder || "未分类")} · ${avuEscapeHtml(item.model || item.type || "网页")} · ${avuEscapeHtml(item.source?.host || "")} · ${avuEscapeHtml(avuFormatRelativeTime(item.createdAt))}</div>
      ${(item.tags || []).length ? `<div class="item-tags">${item.tags.map(tag => `<span class="tag">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
      ${item.note ? `<div class="item-meta">备注：${avuEscapeHtml(item.note)}</div>` : ""}
      <div class="item-text">${avuEscapeHtml(item.text || "")}</div>
      <div class="item-actions">
        <button class="btn" data-action="copy" data-id="${item.id}">复制</button>
        <button class="btn" data-action="skill" data-id="${item.id}">进 Skill 包</button>
        <button class="btn primary" data-action="delete" data-id="${item.id}">删除</button>
      </div>
    `;
    list.appendChild(el);
  });

  list.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.onclick = async () => {
      const item = filtered.find(i => i.id === btn.dataset.id);
      if (!item) return;
      await navigator.clipboard.writeText(item.text || "");
      btn.textContent = "已复制";
      setTimeout(() => btn.textContent = "复制", 900);
    };
  });

  list.querySelectorAll('[data-action="skill"]').forEach(btn => {
    btn.onclick = async () => {
      const item = filtered.find(i => i.id === btn.dataset.id);
      if (!item) return;
      await avuRuntimeSendMessage({
        type: "AVU_UPSERT_SNIPPET",
        snippet: { title: item.title, folder: "Skill 包", kind: "skill", tags: item.tags || [], content: item.text || "" }
      });
      btn.textContent = "已加入";
      renderSnippets();
    };
  });

  list.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = async () => {
      await avuRuntimeSendMessage({ type: "AVU_DELETE_ITEM", id: btn.dataset.id });
      renderItems();
    };
  });
}

async function bindSettings() {
  const settings = await avuRuntimeSendMessage({ type: "AVU_GET_SETTINGS" }).then(r => r.settings || AVU_DEFAULT_SETTINGS);
  document.getElementById("showLauncher").checked = !!settings.showLauncher;
  document.getElementById("enableSlashSnippets").checked = !!settings.enableSlashSnippets;
  document.getElementById("enableCustomSendBehavior").checked = !!settings.enableCustomSendBehavior;
  document.getElementById("longPasteThreshold").value = settings.longPasteThreshold || AVU_DEFAULT_SETTINGS.longPasteThreshold;
  document.getElementById("maxItems").value = settings.maxItems || AVU_DEFAULT_SETTINGS.maxItems;

  document.getElementById("saveSettings").onclick = async () => {
    const next = {
      showLauncher: document.getElementById("showLauncher").checked,
      enableSlashSnippets: document.getElementById("enableSlashSnippets").checked,
      enableCustomSendBehavior: document.getElementById("enableCustomSendBehavior").checked,
      longPasteThreshold: Math.max(500, Math.min(20000, Number(document.getElementById("longPasteThreshold").value || 3500))),
      maxItems: Math.max(100, Math.min(5000, Number(document.getElementById("maxItems").value || 1200)))
    };
    await avuRuntimeSendMessage({ type: "AVU_SAVE_SETTINGS", settings: next });
    const btn = document.getElementById("saveSettings");
    btn.textContent = "已保存";
    setTimeout(() => btn.textContent = "保存设置", 900);
  };

  document.getElementById("restoreLauncher").onclick = () => avuRuntimeSendMessage({ type: "AVU_RESTORE_LAUNCHER" });
  document.getElementById("hideLauncher4h").onclick = () => avuRuntimeSendMessage({ type: "AVU_HIDE_LAUNCHER_FOR_HOURS", hours: 4 });
}

async function bindActions() {
  document.getElementById("addSnippet").onclick = async () => {
    const title = document.getElementById("snippetTitle").value.trim();
    const kind = document.getElementById("snippetKind").value;
    const triggerRaw = document.getElementById("snippetTrigger").value.trim();
    const folder = document.getElementById("snippetFolder").value.trim();
    const tags = document.getElementById("snippetTags").value.trim();
    const content = document.getElementById("snippetContent").value.trim();
    if (!content) return;
    const trigger = triggerRaw ? (triggerRaw.startsWith("/") ? triggerRaw : `/${triggerRaw}`) : "";
    await avuRuntimeSendMessage({
      type: "AVU_UPSERT_SNIPPET",
      snippet: {
        title: title || "未命名片段",
        trigger,
        folder: folder || (kind === "skill" ? "Skill 包" : "个人资料"),
        tags,
        content,
        kind
      }
    });
    document.getElementById("snippetTitle").value = "";
    document.getElementById("snippetTrigger").value = "";
    document.getElementById("snippetFolder").value = "";
    document.getElementById("snippetTags").value = "";
    document.getElementById("snippetContent").value = "";
    renderSnippets();
  };

  document.getElementById("searchInput").addEventListener("input", renderItems);
  document.getElementById("exportJson").onclick = () => exportBundle("json");
  document.getElementById("exportMd").onclick = () => exportBundle("md");
}

(async function main() {
  await bindActions();
  await bindSettings();
  await renderSnippets();
  await renderItems();
})();
