(() => {
  if (window.__avuLoaded) return;
  window.__avuLoaded = true;

  const state = {
    sidebarOpen: false,
    currentTab: "captures",
    search: "",
    captureScope: "page",
    folderFilter: "all",
    snippetFolderFilter: "all",
    snippetKindFilter: "all",
    showSnippetForm: false,
    slashItems: [],
    slashActive: 0,
    slashInput: null,
    detailItem: null,
    lastEditableEl: null,
    launcherPosition: null,
    isDraggingLauncher: false,
    skillStudio: {
      open: false,
      mode: "rules",
      scope: "last_turn",
      context: null,
      draft: null,
      pendingPrompt: "",
      importedSummary: ""
    },
    workbench: {
      open: false,
      view: "context",
      context: {
        mode: "rules",
        scope: "last_turn",
        capsuleType: "handoff",
        source: null,
        draft: null,
        pendingPrompt: "",
        importedSummary: "",
        prefillText: ""
      },
      organize: {
        target: "items",
        prompt: "",
        jsonText: "",
        importedSummary: ""
      },
      exportCenter: {
        sourceType: "conversation"
      }
    },
    customSendSettings: null,
    customSendEnabled: false
  };

  let launcherEl, sidebarEl, toastEl, detailEl, skillStudioEl, workbenchEl, slashPopupEl, mutationObserver;

  async function init() {
    const settings = await avuRuntimeSendMessage({ type: "AVU_GET_SETTINGS" }).then(r => r.settings).catch(() => AVU_DEFAULT_SETTINGS);
    state.launcherPosition = settings.launcherPosition || null;
    const canShowLauncher = settings.showLauncher && (!settings.launcherHiddenUntil || settings.launcherHiddenUntil < Date.now());
    if (canShowLauncher) buildLauncher();
    buildToast();
    buildSidebar();
    buildDetail();
    buildSkillStudio();
    buildWorkbench();
    state.skillStudio.mode = settings.skillStudioDefaultMode || "rules";
    state.skillStudio.scope = settings.skillStudioDefaultScope || "last_turn";
    state.customSendSettings = settings;
    if (settings.enableSlashSnippets) enableSlashSnippets();
    if (settings.enableCustomSendBehavior && avuIsAiUrl(location.href)) enableCustomSendBehavior();
    document.addEventListener("focusin", (event) => {
      if (avuIsEditable(event.target)) state.lastEditableEl = event.target;
    }, true);
    window.addEventListener("resize", () => applyLauncherPosition(state.launcherPosition));
    setupObserver();
  }

  function buildToast() {
    if (toastEl) return;
    toastEl = document.createElement("div");
    toastEl.id = "avu-toast";
    document.documentElement.appendChild(toastEl);
  }

  function showToast(message) {
    buildToast();
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toastEl.classList.remove("show"), 1800);
  }

  function clampLauncherPos(position) {
    const width = 56;
    const height = 220;
    const left = Math.max(10, Math.min((position?.left ?? (window.innerWidth - width - 16)), window.innerWidth - width - 10));
    const top = Math.max(10, Math.min((position?.top ?? Math.max(16, window.innerHeight * 0.42 - 80)), window.innerHeight - height - 10));
    return { left, top };
  }

  function applyLauncherPosition(position) {
    if (!launcherEl) return;
    const next = clampLauncherPos(position || state.launcherPosition);
    state.launcherPosition = next;
    launcherEl.style.left = `${next.left}px`;
    launcherEl.style.top = `${next.top}px`;
  }

  function buildLauncher() {
    if (launcherEl) return;
    launcherEl = document.createElement("div");
    launcherEl.id = "avu-launcher";
    launcherEl.innerHTML = `
      <div class="avu-launch-grab" title="拖动位置"></div>
      <button class="avu-launch-btn primary" data-action="toggle" title="打开侧边栏">库</button>
      <button class="avu-launch-btn mini" data-action="open-outline" title="打开导航">导</button>
      <button class="avu-launch-btn mini" data-action="save-selection" title="保存选中">摘</button>
      <button class="avu-launch-btn mini" data-action="save-ai" title="保存最后一条 AI 回复">AI</button>
    `;
    launcherEl.addEventListener("click", async (event) => {
      if (state.isDraggingLauncher) return;
      const action = event.target?.dataset?.action;
      if (!action) return;
      if (action === "toggle") return toggleSidebar();
      if (action === "open-outline") return openOutlineTab();
      if (action === "save-selection") return handleSaveSelection();
      if (action === "save-page") return handleSavePage();
      if (action === "save-ai") return handleSaveLastAi();
    });
    initLauncherDrag();
    document.documentElement.appendChild(launcherEl);
    applyLauncherPosition(state.launcherPosition);
  }

  function initLauncherDrag() {
    const grab = launcherEl.querySelector(".avu-launch-grab");
    if (!grab) return;
    grab.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const rect = launcherEl.getBoundingClientRect();
      const startOffsetX = event.clientX - rect.left;
      const startOffsetY = event.clientY - rect.top;
      let moved = false;
      state.isDraggingLauncher = false;

      const onMove = (moveEvent) => {
        moved = true;
        state.isDraggingLauncher = true;
        const next = clampLauncherPos({
          left: moveEvent.clientX - startOffsetX,
          top: moveEvent.clientY - startOffsetY
        });
        applyLauncherPosition(next);
      };

      const onUp = async () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        if (moved) {
          await avuRuntimeSendMessage({
            type: "AVU_SAVE_SETTINGS",
            settings: { launcherPosition: state.launcherPosition }
          }).catch(() => {});
          setTimeout(() => { state.isDraggingLauncher = false; }, 60);
        } else {
          state.isDraggingLauncher = false;
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    });
  }

  function removeLauncher() {
    launcherEl?.remove();
    launcherEl = null;
  }

  function buildSidebar() {
    if (sidebarEl) return;
    sidebarEl = document.createElement("aside");
    sidebarEl.id = "avu-sidebar";
    sidebarEl.innerHTML = `
      <div class="avu-header">
        <div>
          <div class="avu-brand">AI <span>Vault</span></div>
          <div class="avu-sub">摘录沉淀、Skill 包、个人信息、本地导出</div>
        </div>
        <div class="avu-header-actions">
          <button class="avu-hbtn" data-action="open-outline">导航</button>
          <button class="avu-hbtn" data-action="open-context">胶囊</button>
          <button class="avu-hbtn" data-action="open-export">导出</button>
          <button class="avu-hbtn" data-action="open-organize">整理</button>
          <button class="avu-hbtn" data-action="open-skill">沉淀 Skill</button>
          <button class="avu-hbtn strong" data-action="close">关闭</button>
        </div>
      </div>
      <div class="avu-tabs">
        <button class="avu-tab active" data-tab="captures">摘录</button>
        <button class="avu-tab" data-tab="snippets">长期片段</button>
        <button class="avu-tab" data-tab="outline">目录</button>
      </div>
      <div class="avu-search-wrap"></div>
      <div class="avu-body"></div>
      <div class="avu-footer">
        <button class="avu-footer-btn" data-action="open-context">上下文胶囊</button>
        <button class="avu-footer-btn" data-action="open-export">导出中心</button>
        <button class="avu-footer-btn" data-action="open-organize">AI 整理</button>
        <button class="avu-footer-btn" data-action="export-pdf">导出 PDF</button>
        <button class="avu-footer-btn" data-action="export-json">导出 JSON</button>
        <button class="avu-footer-btn" data-action="export-md">导出 Markdown</button>
      </div>
    `;

    sidebarEl.querySelectorAll(".avu-tab").forEach(tab => {
      tab.onclick = () => {
        state.currentTab = tab.dataset.tab;
        state.search = "";
        sidebarEl.querySelectorAll(".avu-tab").forEach(btn => btn.classList.toggle("active", btn === tab));
        renderSidebar();
      };
    });

    sidebarEl.querySelectorAll("[data-action]").forEach(btn => {
      const action = btn.dataset.action;
      btn.onclick = async () => {
        if (action === "close") return closeSidebar();
        if (action === "open-outline") return openOutlineTab();
        if (action === "save-selection") return handleSaveSelection();
        if (action === "save-page") return handleSavePage();
        if (action === "open-skill") return openSkillStudio();
        if (action === "open-context") return openWorkbench("context");
        if (action === "open-export") return openWorkbench("export");
        if (action === "open-organize") return openWorkbench("organize");
        if (action === "export-pdf") return exportBundle("pdf");
        if (action === "export-json") return exportBundle("json");
        if (action === "export-md") return exportBundle("md");
      };
    });

    document.documentElement.appendChild(sidebarEl);
  }

  function buildDetail() {
    if (detailEl) return;
    detailEl = document.createElement("div");
    detailEl.id = "avu-detail";
    detailEl.hidden = true;
    detailEl.innerHTML = `
      <div class="avu-detail-backdrop" data-close="1"></div>
      <div class="avu-detail-panel">
        <div class="avu-detail-head">
          <div>
            <div class="avu-detail-kicker">详情页</div>
            <div class="avu-detail-title">摘录详情</div>
          </div>
          <button class="avu-detail-close" data-close="1">×</button>
        </div>
        <div class="avu-detail-body"></div>
      </div>
    `;
    detailEl.addEventListener("click", (event) => {
      if (event.target?.dataset?.close) closeDetail();
    });
    document.documentElement.appendChild(detailEl);
  }

  function openDetail(item) {
    state.detailItem = item;
    detailEl.hidden = false;
    renderDetail();
  }

  function closeDetail() {
    state.detailItem = null;
    detailEl.hidden = true;
  }

  function renderDetail() {
    if (!state.detailItem) return;
    const body = detailEl.querySelector(".avu-detail-body");
    const item = state.detailItem;
    const recommendFolder = avuIsAiUrl(item.source?.url || "") ? "Skill 包" : (item.folder || "常用资料");
    body.innerHTML = `
      <div class="avu-detail-meta-row">
        <span class="avu-model-pill ${avuBadgeClass(item.model)}">${avuEscapeHtml(item.model || item.type || "网页")}</span>
        <span class="avu-soft-pill">${avuEscapeHtml(item.folder || "未分类")}</span>
        ${(item.tags || []).map(tag => `<span class="avu-soft-pill">#${avuEscapeHtml(tag)}</span>`).join("")}
      </div>
      <label class="avu-label">标题</label>
      <input class="avu-field" id="avu-detail-title" value="${avuEscapeHtml(item.title || "")}" />
      <div class="avu-detail-grid">
        <div>
          <label class="avu-label">分组 / 文件夹</label>
          <input class="avu-field" id="avu-detail-folder" value="${avuEscapeHtml(item.folder || "未分类")}" placeholder="例如：论文 / 灵感 / Prompt" />
        </div>
        <div>
          <label class="avu-label">标签</label>
          <input class="avu-field" id="avu-detail-tags" value="${avuEscapeHtml(avuTagsToText(item.tags || []))}" placeholder="多个标签用逗号分隔" />
        </div>
      </div>
      <label class="avu-label">备注</label>
      <textarea class="avu-field avu-textarea-sm" id="avu-detail-note" placeholder="为这条摘录补一段上下文">${avuEscapeHtml(item.note || "")}</textarea>
      <label class="avu-label">正文</label>
      <textarea class="avu-field avu-textarea-lg" id="avu-detail-text">${avuEscapeHtml(item.text || "")}</textarea>

      <div class="avu-source-card">
        <div class="avu-source-title">来源</div>
        <div class="avu-source-line">${avuEscapeHtml(item.source?.title || "")}</div>
        <div class="avu-source-line avu-url">${avuEscapeHtml(item.source?.url || "")}</div>
      </div>

      <div class="avu-source-card">
        <div class="avu-source-title">沉淀为长期片段 / Skill 包</div>
        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">类型</label>
            <select class="avu-field" id="avu-snippet-kind">
              <option value="skill" ${recommendFolder.includes("Skill") ? "selected" : ""}>Skill 包</option>
              <option value="prompt">Prompt</option>
              <option value="profile">个人信息</option>
            </select>
          </div>
          <div>
            <label class="avu-label">触发词（可选）</label>
            <input class="avu-field" id="avu-snippet-trigger" placeholder="/summary" />
          </div>
        </div>
        <label class="avu-label">沉淀到哪个分组</label>
        <input class="avu-field" id="avu-snippet-folder" value="${avuEscapeHtml(recommendFolder)}" placeholder="例如：Skill 包 / 写作助手 / 论文助手" />
        <label class="avu-label">沉淀后标题</label>
        <input class="avu-field" id="avu-snippet-title" value="${avuEscapeHtml(item.title || "")}" />
        <div class="avu-form-actions">
          <button class="avu-btn" id="avu-save-as-snippet">保存到长期库</button>
        </div>
      </div>

      <div class="avu-form-actions sticky">
        <button class="avu-btn" id="avu-detail-copy">复制正文</button>
        <button class="avu-btn" id="avu-detail-export">导出 Markdown</button>
        <button class="avu-btn danger" id="avu-detail-delete">删除</button>
        <button class="avu-btn strong" id="avu-detail-save">保存修改</button>
      </div>
    `;

    body.querySelector("#avu-detail-copy").onclick = async () => {
      await navigator.clipboard.writeText(item.text || "");
      showToast("已复制正文");
    };
    body.querySelector("#avu-detail-export").onclick = async () => {
      downloadFile(`${sanitizeFilename(item.title || "摘录")}.md`, buildSingleItemMarkdown(item), "text/markdown");
      showToast("已导出 Markdown");
    };
    body.querySelector("#avu-detail-delete").onclick = async () => {
      await avuRuntimeSendMessage({ type: "AVU_DELETE_ITEM", id: item.id });
      showToast("已删除摘录");
      closeDetail();
      renderSidebar();
    };
    body.querySelector("#avu-detail-save").onclick = async () => {
      const updated = {
        id: item.id,
        title: body.querySelector("#avu-detail-title").value,
        folder: body.querySelector("#avu-detail-folder").value,
        tags: body.querySelector("#avu-detail-tags").value,
        note: body.querySelector("#avu-detail-note").value,
        text: body.querySelector("#avu-detail-text").value
      };
      const resp = await avuRuntimeSendMessage({ type: "AVU_UPDATE_ITEM", item: updated });
      state.detailItem = resp.item;
      showToast("已保存修改");
      renderDetail();
      renderSidebar();
    };
    body.querySelector("#avu-save-as-snippet").onclick = async () => {
      const snippet = {
        title: body.querySelector("#avu-snippet-title").value || item.title || "未命名片段",
        trigger: body.querySelector("#avu-snippet-trigger").value,
        folder: body.querySelector("#avu-snippet-folder").value || "Skill 包",
        kind: body.querySelector("#avu-snippet-kind").value,
        tags: item.tags || [],
        content: body.querySelector("#avu-detail-text").value || item.text || ""
      };
      await avuRuntimeSendMessage({ type: "AVU_UPSERT_SNIPPET", snippet });
      showToast("已沉淀到长期片段库");
      if (state.sidebarOpen && state.currentTab === "snippets") renderSidebar();
    };
  }

  function syncSidebarTabs() {
    if (!sidebarEl) return;
    sidebarEl.querySelectorAll(".avu-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === state.currentTab);
    });
  }

  async function toggleSidebar(force) {
    state.sidebarOpen = typeof force === "boolean" ? force : !state.sidebarOpen;
    sidebarEl.classList.toggle("show", state.sidebarOpen);
    if (state.sidebarOpen) {
      syncSidebarTabs();
      await renderSidebar();
    }
  }

  async function openOutlineTab() {
    state.currentTab = "outline";
    state.search = "";
    syncSidebarTabs();
    await toggleSidebar(true);
  }

  function closeSidebar() {
    state.sidebarOpen = false;
    sidebarEl.classList.remove("show");
  }

  async function renderSidebar() {
    const body = sidebarEl.querySelector(".avu-body");
    const searchWrap = sidebarEl.querySelector(".avu-search-wrap");

    if (state.currentTab === "captures") {
      const items = await fetchItems();
      const folders = avuCollectFolders(items);
      searchWrap.innerHTML = `
        <input id="avu-search" placeholder="搜索摘录 / 标签 / 分组" value="${avuEscapeHtml(state.search)}" />
        <div class="avu-chip-row">
          <button class="avu-chip ${state.captureScope === "page" ? "active" : ""}" data-scope="page">本页</button>
          <button class="avu-chip ${state.captureScope === "all" ? "active" : ""}" data-scope="all">全部</button>
          <select id="avu-folder-filter" class="avu-select">
            <option value="all">全部分组</option>
            ${folders.map(folder => `<option value="${avuEscapeHtml(folder)}" ${state.folderFilter === folder ? "selected" : ""}>${avuEscapeHtml(folder)}</option>`).join("")}
          </select>
        </div>
      `;
      bindCaptureFilters(searchWrap);

      const filtered = items.filter(item => {
        const scopeOk = state.captureScope === "all" || item.source?.pageKey === avuPageKeyFromUrl(location.href);
        const folderOk = state.folderFilter === "all" || (item.folder || "未分类") === state.folderFilter;
        const haystack = [item.title, item.text, item.note, item.folder, ...(item.tags || []), item.model, item.source?.host].join(" ").toLowerCase();
        const searchOk = !state.search || haystack.includes(state.search.toLowerCase());
        return scopeOk && folderOk && searchOk;
      });

      if (!filtered.length) {
        body.innerHTML = `<div class="avu-empty">还没有匹配的摘录。<br>你可以先保存一段选中内容或当前页面。</div>`;
        return;
      }

      body.innerHTML = filtered.map(item => renderCaptureCard(item)).join("");
      body.querySelectorAll("[data-open-item]").forEach(btn => {
        btn.onclick = () => {
          const item = filtered.find(x => x.id === btn.dataset.openItem);
          if (item) openDetail(item);
        };
      });
      body.querySelectorAll("[data-copy-item]").forEach(btn => {
        btn.onclick = async () => {
          const item = filtered.find(x => x.id === btn.dataset.copyItem);
          if (!item) return;
          await navigator.clipboard.writeText(item.text || "");
          showToast("已复制摘录");
        };
      });
      body.querySelectorAll("[data-delete-item]").forEach(btn => {
        btn.onclick = async () => {
          await avuRuntimeSendMessage({ type: "AVU_DELETE_ITEM", id: btn.dataset.deleteItem });
          showToast("已删除摘录");
          renderSidebar();
        };
      });
      body.querySelectorAll("[data-item-to-skill]").forEach(btn => {
        btn.onclick = async () => {
          const item = filtered.find(x => x.id === btn.dataset.itemToSkill);
          if (!item) return;
          await avuRuntimeSendMessage({
            type: "AVU_UPSERT_SNIPPET",
            snippet: {
              title: item.title,
              folder: "Skill 包",
              kind: "skill",
              tags: item.tags || [],
              content: item.text || ""
            }
          });
          showToast("已加入 Skill 包");
        };
      });
      return;
    }

    if (state.currentTab === "snippets") {
      const snippets = await fetchSnippets();
      const folders = avuCollectFolders(snippets.map(item => ({ folder: item.folder })));
      searchWrap.innerHTML = `
        <input id="avu-search" placeholder="搜索片段 / 触发词 / 标签 / 分组" value="${avuEscapeHtml(state.search)}" />
        <div class="avu-chip-row">
          <button class="avu-chip ${state.showSnippetForm ? "active" : ""}" id="avu-toggle-snippet-form">${state.showSnippetForm ? "收起新建" : "新建片段"}</button>
          <button class="avu-chip ${state.snippetKindFilter === "all" ? "active" : ""}" data-kind="all">全部</button>
          <button class="avu-chip ${state.snippetKindFilter === "skill" ? "active" : ""}" data-kind="skill">Skill 包</button>
          <button class="avu-chip ${state.snippetKindFilter === "prompt" ? "active" : ""}" data-kind="prompt">Prompt</button>
          <button class="avu-chip ${state.snippetKindFilter === "profile" ? "active" : ""}" data-kind="profile">个人信息</button>
          <select id="avu-snippet-folder-filter" class="avu-select">
            <option value="all">全部分组</option>
            ${folders.map(folder => `<option value="${avuEscapeHtml(folder)}" ${state.snippetFolderFilter === folder ? "selected" : ""}>${avuEscapeHtml(folder)}</option>`).join("")}
          </select>
        </div>
        <div class="avu-inline-tip">建议把“可循环复用的总结 / 流程 / 提示词”沉淀为 Skill 包，平时反复调用的个人背景放到个人信息组。</div>
      `;
      bindSnippetFilters(searchWrap);

      let html = "";
      if (state.showSnippetForm) html += snippetFormHtml();

      const filtered = snippets.filter(snippet => {
        const folderOk = state.snippetFolderFilter === "all" || (snippet.folder || "个人资料") === state.snippetFolderFilter;
        const kindOk = state.snippetKindFilter === "all" || avuNormalizeSnippetKind(snippet.kind) === state.snippetKindFilter;
        const haystack = [snippet.title, snippet.trigger, snippet.content, snippet.folder, ...(snippet.tags || []), avuSnippetKindLabel(snippet.kind)].join(" ").toLowerCase();
        const searchOk = !state.search || haystack.includes(state.search.toLowerCase());
        return folderOk && kindOk && searchOk;
      });

      html += filtered.length ? filtered.map(renderSnippetCard).join("") : `<div class="avu-empty">还没有长期片段。<br>保存后可以在输入框中用 /触发词 调用，或在这里直接插入。</div>`;
      body.innerHTML = html;

      bindSnippetForm(body);
      body.querySelectorAll("[data-insert-snippet]").forEach(btn => {
        btn.onclick = () => {
          const snippet = filtered.find(s => s.id === btn.dataset.insertSnippet);
          if (!snippet) return;
          const ok = insertIntoPreferredField(snippet.content || "");
          showToast(ok ? "已插入当前输入框" : "请先点到输入框，再点击插入");
        };
      });
      body.querySelectorAll("[data-copy-snippet]").forEach(btn => {
        btn.onclick = async () => {
          const snippet = filtered.find(s => s.id === btn.dataset.copySnippet);
          if (!snippet) return;
          await navigator.clipboard.writeText(snippet.content || "");
          showToast("已复制片段");
        };
      });
      body.querySelectorAll("[data-delete-snippet]").forEach(btn => {
        btn.onclick = async () => {
          await avuRuntimeSendMessage({ type: "AVU_DELETE_SNIPPET", id: btn.dataset.deleteSnippet });
          showToast("已删除片段");
          renderSidebar();
        };
      });
      return;
    }

    searchWrap.innerHTML = `<input id="avu-search" placeholder="筛选目录内容" value="${avuEscapeHtml(state.search)}" />`;
    const outlineInput = searchWrap.querySelector("#avu-search");
    outlineInput.oninput = () => {
      state.search = outlineInput.value || "";
      renderSidebar();
    };

    const outline = getOutlineEntries();
    const filtered = outline.filter(item => !state.search || item.text.toLowerCase().includes(state.search.toLowerCase()));
    if (!filtered.length) {
      body.innerHTML = `<div class="avu-empty">当前页面暂时没有可用目录。<br>普通网页会读取标题结构，AI 页面会读取对话节点。</div>`;
      return;
    }

    body.innerHTML = filtered.map((item, index) => `
      <div class="avu-outline-item" data-index="${index}">
        <div class="avu-outline-key">${avuEscapeHtml(item.key)}</div>
        <div class="avu-outline-text">${avuEscapeHtml(item.text)}</div>
      </div>
    `).join("");
    body.querySelectorAll(".avu-outline-item").forEach(el => {
      el.onclick = () => {
        const entry = filtered[Number(el.dataset.index)];
        entry?.el?.scrollIntoView({ behavior: "smooth", block: "center" });
        if (entry?.el) {
          entry.el.style.outline = "2px solid rgba(124,58,237,0.55)";
          setTimeout(() => { entry.el.style.outline = ""; }, 1200);
        }
      };
    });
  }

  function bindCaptureFilters(searchWrap) {
    const input = searchWrap.querySelector("#avu-search");
    input.oninput = () => {
      state.search = input.value || "";
      renderSidebar();
    };
    searchWrap.querySelectorAll(".avu-chip[data-scope]").forEach(chip => {
      chip.onclick = () => {
        state.captureScope = chip.dataset.scope;
        renderSidebar();
      };
    });
    const select = searchWrap.querySelector("#avu-folder-filter");
    if (select) {
      select.onchange = () => {
        state.folderFilter = select.value;
        renderSidebar();
      };
    }
  }

  function bindSnippetFilters(searchWrap) {
    const input = searchWrap.querySelector("#avu-search");
    input.oninput = () => {
      state.search = input.value || "";
      renderSidebar();
    };
    const toggle = searchWrap.querySelector("#avu-toggle-snippet-form");
    if (toggle) toggle.onclick = () => {
      state.showSnippetForm = !state.showSnippetForm;
      renderSidebar();
    };
    searchWrap.querySelectorAll(".avu-chip[data-kind]").forEach(chip => {
      chip.onclick = () => {
        state.snippetKindFilter = chip.dataset.kind;
        renderSidebar();
      };
    });
    const select = searchWrap.querySelector("#avu-snippet-folder-filter");
    if (select) {
      select.onchange = () => {
        state.snippetFolderFilter = select.value;
        renderSidebar();
      };
    }
  }

  function bindSnippetForm(body) {
    const saveBtn = body.querySelector("#avu-save-snippet");
    if (!saveBtn) return;
    saveBtn.onclick = async () => {
      const title = body.querySelector("#avu-snippet-title").value.trim();
      const triggerRaw = body.querySelector("#avu-snippet-trigger").value.trim();
      const folder = body.querySelector("#avu-snippet-folder").value.trim();
      const tags = body.querySelector("#avu-snippet-tags").value.trim();
      const content = body.querySelector("#avu-snippet-content").value.trim();
      const kind = body.querySelector("#avu-snippet-kind-select").value;
      if (!content) return showToast("先填写片段内容");
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
      state.showSnippetForm = false;
      showToast("已保存长期片段");
      renderSidebar();
    };
  }

  function snippetFormHtml() {
    return `
      <div class="avu-form">
        <label class="avu-label">片段标题</label>
        <input class="avu-field" id="avu-snippet-title" placeholder="例如：自我介绍 / 写作 SOP / 研究总结" />
        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">类型</label>
            <select class="avu-field" id="avu-snippet-kind-select">
              <option value="skill">Skill 包</option>
              <option value="prompt">Prompt</option>
              <option value="profile">个人信息</option>
            </select>
          </div>
          <div>
            <label class="avu-label">触发词（可选）</label>
            <input class="avu-field" id="avu-snippet-trigger" placeholder="例如：/intro" />
          </div>
        </div>
        <label class="avu-label">分组 / 文件夹</label>
        <input class="avu-field" id="avu-snippet-folder" placeholder="例如：Skill 包 / 论文助手 / Prompt 模板" />
        <label class="avu-label">标签</label>
        <input class="avu-field" id="avu-snippet-tags" placeholder="例如：长期、个人信息、写作" />
        <label class="avu-label">片段内容</label>
        <textarea class="avu-field avu-textarea-sm" id="avu-snippet-content" placeholder="这里填写你想长期保留并随时调用的个人信息、Prompt、固定背景说明"></textarea>
        <div class="avu-form-actions">
          <button class="avu-btn strong" id="avu-save-snippet">保存片段</button>
        </div>
      </div>
    `;
  }

  async function fetchItems() {
    return avuRuntimeSendMessage({ type: "AVU_GET_ITEMS" }).then(r => r.items || []).catch(() => []);
  }

  async function fetchSnippets() {
    return avuRuntimeSendMessage({ type: "AVU_GET_SNIPPETS" }).then(r => r.snippets || []).catch(() => []);
  }

  async function handleSaveSelection() {
    const text = avuNormalizeText(window.getSelection()?.toString() || "");
    if (!text) {
      showToast("先选中一段文字再保存");
      return;
    }
    await avuRuntimeSendMessage({
      type: "AVU_SAVE_ITEM",
      item: {
        type: "selection",
        text,
        title: avuPreview(text, 80),
        folder: avuIsAiUrl(location.href) ? "AI 对话" : "网页摘录",
        tags: avuIsAiUrl(location.href) ? ["ai", "选中"] : ["网页", "选中"],
        pageTitle: document.title,
        url: location.href
      }
    });
    showToast("已保存选中文本");
    if (state.sidebarOpen) renderSidebar();
  }

  async function handleSavePage() {
    const title = avuNormalizeText(document.title || "当前页面");
    const text = avuNormalizeText((document.body?.innerText || "").slice(0, 6000));
    if (!text) {
      showToast("当前页面没有可保存文本");
      return;
    }
    await avuRuntimeSendMessage({
      type: "AVU_SAVE_ITEM",
      item: {
        type: "page",
        text,
        title,
        folder: avuIsAiUrl(location.href) ? "AI 对话" : "网页摘录",
        tags: avuIsAiUrl(location.href) ? ["ai", "页面快照"] : ["网页", "页面快照"],
        pageTitle: document.title,
        url: location.href,
        extra: { mode: "snapshot", chars: text.length }
      }
    });
    showToast("已保存当前页面摘要");
    if (state.sidebarOpen) renderSidebar();
  }

  function collectNodesBySelectors(selectors, minLen = 30) {
    const seen = new Set();
    const nodes = [];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (!node || seen.has(node)) return;
        const text = avuNormalizeText(node.innerText || node.textContent || "");
        if (text.length < minLen) return;
        seen.add(node);
        nodes.push(node);
      });
    });
    return nodes;
  }

  function collectAssistantNodes() {
    const rule = avuDetectAiRule(location.href);
    const selectors = [
      ...(rule?.assistantSelectors || []),
      '[data-message-author-role="assistant"]',
      '[data-testid="assistant-message"]',
      '.assistant-message',
      '.message.assistant',
      'article[data-testid*="conversation-turn"] .prose',
      'main .markdown',
      '.markdown-body',
      '.prose'
    ];
    const nodes = collectNodesBySelectors(selectors, 40);
    return nodes.filter(node => {
      const text = avuNormalizeText(node.innerText || "");
      const low = text.toLowerCase();
      return text.length > 40 && !low.includes("copy") && !low.includes("edit") && !low.includes("regenerate");
    });
  }

  async function handleSaveLastAi() {
    const nodes = collectAssistantNodes();
    const last = [...nodes].reverse().find(node => avuNormalizeText(node.innerText || "").length > 50);
    if (!last) {
      showToast("当前页面未识别到 AI 回复");
      return;
    }
    const text = avuNormalizeText(last.innerText || "");
    await avuRuntimeSendMessage({
      type: "AVU_SAVE_ITEM",
      item: {
        type: "ai-response",
        text,
        title: avuPreview(text, 80),
        folder: "AI 对话",
        tags: ["ai", String(avuDetectModel(location.href) || "assistant").toLowerCase()],
        pageTitle: document.title,
        url: location.href,
        model: avuDetectModel(location.href) || "AI"
      }
    });
    showToast("已保存最后一条 AI 回复");
    if (state.sidebarOpen) renderSidebar();
  }

  function getOutlineEntries() {
    const aiEntries = getAiConversationOutline();
    if (aiEntries.length) return aiEntries;

    const headingNodes = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
      .filter(node => avuNormalizeText(node.innerText || "").length > 0)
      .slice(0, 80);
    if (headingNodes.length) {
      return headingNodes.map(node => ({
        key: node.tagName.toLowerCase(),
        text: avuNormalizeText(node.innerText || ""),
        el: node
      }));
    }

    const articleLike = Array.from(document.querySelectorAll("article, main, section"))
      .find(node => avuNormalizeText(node.innerText || "").length > 200);
    if (!articleLike) return [];
    return Array.from(articleLike.querySelectorAll("p"))
      .map(node => ({ key: "P", text: avuPreview(node.innerText || "", 60), el: node }))
      .filter(item => item.text.length > 10)
      .slice(0, 30);
  }

  function getAiConversationOutline() {
    const rule = avuDetectAiRule(location.href);
    const userNodes = collectNodesBySelectors([
      ...(rule?.userSelectors || []),
      '[data-message-author-role="user"]',
      '[data-testid="human-turn-message"]',
      '.user-message',
      '.message.user',
      '.user-query'
    ], 8).map(node => ({ type: "Q", text: avuPreview(node.innerText || "", 80), el: node }));

    const assistantNodes = collectAssistantNodes().map(node => ({ type: "A", text: avuPreview(node.innerText || "", 80), el: node }));

    const ordered = [...userNodes, ...assistantNodes]
      .filter(entry => entry.el && document.body.contains(entry.el))
      .sort((a, b) => {
        const pos = a.el.compareDocumentPosition(b.el);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      })
      .slice(0, 120);

    let q = 0, a = 0;
    return ordered.map(entry => {
      const num = entry.type === "Q" ? ++q : ++a;
      return { key: `${entry.type}${num}`, text: entry.text, el: entry.el };
    });
  }


  function buildSkillStudio() {
    if (skillStudioEl) return;
    skillStudioEl = document.createElement("div");
    skillStudioEl.id = "avu-skill-studio";
    skillStudioEl.hidden = true;
    skillStudioEl.innerHTML = `
      <div class="avu-skill-backdrop" data-close="1"></div>
      <div class="avu-skill-panel">
        <div class="avu-skill-head">
          <div>
            <div class="avu-detail-kicker">Skill Studio</div>
            <div class="avu-detail-title">把当前聊天沉淀成 Skill 包</div>
          </div>
          <button class="avu-detail-close" data-close="1">×</button>
        </div>
        <div class="avu-skill-body"></div>
      </div>
    `;
    skillStudioEl.addEventListener("click", (event) => {
      if (event.target?.dataset?.close) closeSkillStudio();
    });
    document.documentElement.appendChild(skillStudioEl);
  }

  async function openSkillStudio(forceMode) {
    buildSkillStudio();
    if (forceMode) state.skillStudio.mode = forceMode;
    const settings = await avuRuntimeSendMessage({ type: "AVU_GET_SETTINGS" }).then(r => r.settings || AVU_DEFAULT_SETTINGS).catch(() => AVU_DEFAULT_SETTINGS);
    state.skillStudio.mode = forceMode || state.skillStudio.mode || settings.skillStudioDefaultMode || "rules";
    state.skillStudio.scope = state.skillStudio.scope || settings.skillStudioDefaultScope || "last_turn";
    skillStudioEl.hidden = false;
    state.skillStudio.open = true;
    await refreshSkillStudioContext({ regenerate: !state.skillStudio.draft });
    renderSkillStudio();
  }

  function closeSkillStudio() {
    state.skillStudio.open = false;
    if (skillStudioEl) skillStudioEl.hidden = true;
  }

  async function refreshSkillStudioContext({ regenerate = false } = {}) {
    const context = getSkillContext(state.skillStudio.scope);
    state.skillStudio.context = context;
    if (state.skillStudio.mode === "rules") {
      if (regenerate || !state.skillStudio.draft) {
        state.skillStudio.draft = buildRuleSkillDraft(context);
      }
    } else {
      if (regenerate || !state.skillStudio.pendingPrompt) {
        state.skillStudio.pendingPrompt = buildAiSummaryPrompt(context);
      }
      if (!state.skillStudio.draft) {
        state.skillStudio.draft = buildRuleSkillDraft(context);
      }
    }
  }

  function renderSkillStudio() {
    if (!skillStudioEl || !state.skillStudio.open) return;
    const body = skillStudioEl.querySelector(".avu-skill-body");
    const context = state.skillStudio.context || getSkillContext(state.skillStudio.scope);
    const draft = state.skillStudio.draft || buildRuleSkillDraft(context);
    const disabledAi = !avuIsAiUrl(location.href);

    body.innerHTML = `
      <div class="avu-skill-toolbar">
        <div class="avu-chip-row">
          <button class="avu-chip ${state.skillStudio.mode === "rules" ? "active" : ""}" data-skill-mode="rules">模式 1：规则生成</button>
          <button class="avu-chip ${state.skillStudio.mode === "ai" ? "active" : ""}" data-skill-mode="ai">模式 2：借用当前 AI 页面</button>
        </div>
        <div class="avu-skill-actions">
          <select class="avu-select" id="avu-skill-scope">
            <option value="selection" ${state.skillStudio.scope === "selection" ? "selected" : ""}>当前选中内容</option>
            <option value="last_turn" ${state.skillStudio.scope === "last_turn" ? "selected" : ""}>最后一轮问答</option>
            <option value="recent_3" ${state.skillStudio.scope === "recent_3" ? "selected" : ""}>最近 3 轮</option>
            <option value="full" ${state.skillStudio.scope === "full" ? "selected" : ""}>全部对话 / 页面</option>
          </select>
          <button class="avu-btn" id="avu-skill-regenerate">${state.skillStudio.mode === "rules" ? "重新生成草稿" : "重新生成提示词"}</button>
        </div>
      </div>

      <div class="avu-source-card">
        <div class="avu-source-title">当前沉淀范围</div>
        <div class="avu-source-line">${avuEscapeHtml(context.scopeLabel || "当前页面")}</div>
        <div class="avu-source-line">${avuEscapeHtml(context.title || document.title || "")}</div>
        <div class="avu-source-line avu-url">${avuEscapeHtml((context.model ? `${context.model} · ` : "") + `${context.turnCount || 0} 条消息 / ${context.rawText.length} 字` )}</div>
      </div>

      ${state.skillStudio.mode === "rules" ? `
        <div class="avu-inline-tip">规则生成会直接根据当前聊天结构，先给你一个可编辑草稿。适合快速沉淀，不依赖额外模型。</div>
      ` : `
        <div class="avu-inline-tip">
          ${disabledAi ? "当前不是 AI 对话页面，模式 2 仍可生成总结提示词，但需要你手动复制到任意 AI 页面使用。" : "模式 2 会把总结提示词插入当前输入框；你发出后，再点“从最新 AI 回复导入草稿”即可。"}
        </div>
        <div class="avu-source-card">
          <div class="avu-source-title">总结提示词</div>
          <textarea class="avu-field avu-textarea-md" id="avu-skill-prompt">${avuEscapeHtml(state.skillStudio.pendingPrompt || "")}</textarea>
          <div class="avu-form-actions">
            <button class="avu-btn" id="avu-skill-copy-prompt">复制提示词</button>
            <button class="avu-btn strong" id="avu-skill-insert-prompt">${disabledAi ? "复制后去 AI 页面使用" : "插入到当前输入框"}</button>
            <button class="avu-btn" id="avu-skill-import-summary">从最新 AI 回复导入草稿</button>
          </div>
        </div>
      `}

      <div class="avu-source-card">
        <div class="avu-source-title">Skill 包草稿</div>
        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">Skill 名称</label>
            <input class="avu-field" id="avu-skill-title" value="${avuEscapeHtml(draft.title || "")}" />
          </div>
          <div>
            <label class="avu-label">触发词（可选）</label>
            <input class="avu-field" id="avu-skill-trigger" value="${avuEscapeHtml(draft.trigger || "")}" placeholder="/摘要润色" />
          </div>
        </div>
        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">分组 / 文件夹</label>
            <input class="avu-field" id="avu-skill-folder" value="${avuEscapeHtml(draft.folder || "Skill 包 / 待整理")}" />
          </div>
          <div>
            <label class="avu-label">标签</label>
            <input class="avu-field" id="avu-skill-tags" value="${avuEscapeHtml(draft.tagsText || "")}" placeholder="多个标签用逗号分隔" />
          </div>
        </div>

        <label class="avu-label">一句话用途</label>
        <textarea class="avu-field avu-textarea-sm" id="avu-skill-one-liner">${avuEscapeHtml(draft.oneLiner || "")}</textarea>

        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">适用场景</label>
            <textarea class="avu-field avu-textarea-sm" id="avu-skill-scenarios">${avuEscapeHtml(draft.scenarios || "")}</textarea>
          </div>
          <div>
            <label class="avu-label">输入要求</label>
            <textarea class="avu-field avu-textarea-sm" id="avu-skill-inputs">${avuEscapeHtml(draft.inputs || "")}</textarea>
          </div>
        </div>

        <label class="avu-label">核心提示词 / 执行步骤</label>
        <textarea class="avu-field avu-textarea-lg" id="avu-skill-steps">${avuEscapeHtml(draft.steps || "")}</textarea>

        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">输出格式要求</label>
            <textarea class="avu-field avu-textarea-sm" id="avu-skill-output">${avuEscapeHtml(draft.outputFormat || "")}</textarea>
          </div>
          <div>
            <label class="avu-label">注意事项</label>
            <textarea class="avu-field avu-textarea-sm" id="avu-skill-cautions">${avuEscapeHtml(draft.cautions || "")}</textarea>
          </div>
        </div>

        <label class="avu-label">示例</label>
        <textarea class="avu-field avu-textarea-sm" id="avu-skill-example">${avuEscapeHtml(draft.example || "")}</textarea>

        <div class="avu-form-actions sticky">
          <button class="avu-btn" id="avu-skill-copy-markdown">复制 Skill Markdown</button>
          <button class="avu-btn strong" id="avu-skill-save">保存到 Skill 包</button>
        </div>
      </div>
    `;

    body.querySelectorAll("[data-skill-mode]").forEach(btn => {
      btn.onclick = async () => {
        syncSkillDraftFromForm(body);
        state.skillStudio.mode = btn.dataset.skillMode;
        await refreshSkillStudioContext({ regenerate: !state.skillStudio.pendingPrompt });
        renderSkillStudio();
      };
    });

    body.querySelector("#avu-skill-scope").onchange = async (event) => {
      syncSkillDraftFromForm(body);
      state.skillStudio.scope = event.target.value;
      await refreshSkillStudioContext({ regenerate: true });
      renderSkillStudio();
    };

    body.querySelector("#avu-skill-regenerate").onclick = async () => {
      syncSkillDraftFromForm(body);
      await refreshSkillStudioContext({ regenerate: true });
      renderSkillStudio();
      showToast(state.skillStudio.mode === "rules" ? "已重新生成规则草稿" : "已重新生成总结提示词");
    };

    if (state.skillStudio.mode === "ai") {
      body.querySelector("#avu-skill-copy-prompt").onclick = async () => {
        const value = body.querySelector("#avu-skill-prompt").value || "";
        state.skillStudio.pendingPrompt = value;
        await navigator.clipboard.writeText(value);
        showToast("已复制总结提示词");
      };
      body.querySelector("#avu-skill-insert-prompt").onclick = async () => {
        const value = body.querySelector("#avu-skill-prompt").value || "";
        state.skillStudio.pendingPrompt = value;
        if (disabledAi) {
          await navigator.clipboard.writeText(value);
          showToast("已复制提示词，去任意 AI 页面粘贴即可");
          return;
        }
        const ok = insertIntoPreferredField(value);
        showToast(ok ? "已插入当前输入框，请发送给 AI" : "请先点到输入框，再插入提示词");
      };
      body.querySelector("#avu-skill-import-summary").onclick = async () => {
        syncSkillDraftFromForm(body);
        const last = getLatestAssistantText();
        if (!last) {
          showToast("还没有识别到最新 AI 回复");
          return;
        }
        state.skillStudio.importedSummary = last;
        state.skillStudio.draft = parseSkillDraftFromSummary(last, state.skillStudio.context || context);
        renderSkillStudio();
        showToast("已从最新 AI 回复导入草稿");
      };
    }

    bindSkillDraftFields(body);

    body.querySelector("#avu-skill-copy-markdown").onclick = async () => {
      syncSkillDraftFromForm(body);
      await navigator.clipboard.writeText(buildSkillSnippetMarkdown(state.skillStudio.draft || draft));
      showToast("已复制 Skill Markdown");
    };

    body.querySelector("#avu-skill-save").onclick = async () => {
      syncSkillDraftFromForm(body);
      const finalDraft = state.skillStudio.draft || draft;
      await avuRuntimeSendMessage({
        type: "AVU_UPSERT_SNIPPET",
        snippet: {
          title: finalDraft.title || "未命名 Skill",
          trigger: finalDraft.trigger || "",
          folder: finalDraft.folder || "Skill 包 / 待整理",
          tags: finalDraft.tagsText || "",
          kind: "skill",
          content: buildSkillSnippetMarkdown(finalDraft),
          extra: {
            sourceUrl: context.sourceUrl || location.href,
            sourceTitle: context.title || document.title,
            sourceModel: context.model || "",
            sourceScope: context.scope,
            summaryMode: state.skillStudio.mode,
            turnCount: context.turnCount || 0
          }
        }
      });
      showToast("已保存到 Skill 包");
      if (state.sidebarOpen && state.currentTab === "snippets") renderSidebar();
    };
  }

  function bindSkillDraftFields(body) {
    [
      "avu-skill-title",
      "avu-skill-trigger",
      "avu-skill-folder",
      "avu-skill-tags",
      "avu-skill-one-liner",
      "avu-skill-scenarios",
      "avu-skill-inputs",
      "avu-skill-steps",
      "avu-skill-output",
      "avu-skill-cautions",
      "avu-skill-example"
    ].forEach((id) => {
      const el = body.querySelector("#" + id);
      if (!el) return;
      el.addEventListener("input", () => syncSkillDraftFromForm(body));
      el.addEventListener("change", () => syncSkillDraftFromForm(body));
    });
  }

  function syncSkillDraftFromForm(body) {
    if (!body || !body.querySelector) return state.skillStudio.draft;
    state.skillStudio.draft = {
      ...(state.skillStudio.draft || {}),
      title: body.querySelector("#avu-skill-title")?.value || "",
      trigger: body.querySelector("#avu-skill-trigger")?.value || "",
      folder: body.querySelector("#avu-skill-folder")?.value || "Skill 包 / 待整理",
      tagsText: body.querySelector("#avu-skill-tags")?.value || "",
      oneLiner: body.querySelector("#avu-skill-one-liner")?.value || "",
      scenarios: body.querySelector("#avu-skill-scenarios")?.value || "",
      inputs: body.querySelector("#avu-skill-inputs")?.value || "",
      steps: body.querySelector("#avu-skill-steps")?.value || "",
      outputFormat: body.querySelector("#avu-skill-output")?.value || "",
      cautions: body.querySelector("#avu-skill-cautions")?.value || "",
      example: body.querySelector("#avu-skill-example")?.value || ""
    };
    return state.skillStudio.draft;
  }

  function getSkillContext(scope) {
    const selectionText = avuNormalizeText(window.getSelection()?.toString() || "");
    const allMessages = collectConversationMessages();
    let pickedMessages = [];
    let rawText = "";
    let scopeLabel = "";
    const isAi = avuIsAiUrl(location.href) && allMessages.length > 0;
    const normalizedScope = scope || "last_turn";

    if (normalizedScope === "selection" && selectionText) {
      rawText = selectionText;
      scopeLabel = "当前选中内容";
    } else if (isAi) {
      pickedMessages = pickMessagesByScope(allMessages, normalizedScope);
      rawText = pickedMessages.map(msg => `${msg.role === "user" ? "用户" : "AI"}：${msg.text}`).join("\n\n");
      scopeLabel = ({
        last_turn: "最后一轮问答",
        recent_3: "最近 3 轮",
        full: "全部对话",
        selection: "当前选中内容"
      })[normalizedScope] || "当前对话";
    } else {
      rawText = selectionText || avuNormalizeText((document.body?.innerText || "").slice(0, 9000));
      scopeLabel = selectionText ? "当前选中内容" : "当前页面文本";
    }

    rawText = avuNormalizeText(rawText).slice(0, 12000);
    return {
      scope: normalizedScope,
      scopeLabel,
      rawText,
      title: document.title || "",
      model: avuDetectModel(location.href) || "",
      turns: pickedMessages,
      turnCount: pickedMessages.length,
      isAi,
      sourceUrl: location.href
    };
  }

  function collectConversationMessages() {
    const rule = avuDetectAiRule(location.href);
    const userEntries = collectNodesBySelectors([
      ...(rule?.userSelectors || []),
      '[data-message-author-role="user"]',
      '[data-testid="human-turn-message"]',
      '.user-message',
      '.message.user',
      '.user-query'
    ], 8).map(node => ({ role: "user", node, text: avuNormalizeText(node.innerText || node.textContent || "") }));

    const assistantEntries = collectAssistantNodes()
      .map(node => ({ role: "assistant", node, text: avuNormalizeText(node.innerText || node.textContent || "") }));

    const ordered = [...userEntries, ...assistantEntries]
      .filter(entry => entry.node && document.body.contains(entry.node) && entry.text.length > (entry.role === "user" ? 6 : 20))
      .sort((a, b) => {
        const pos = a.node.compareDocumentPosition(b.node);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
      });

    const deduped = [];
    const seen = new Set();
    for (const entry of ordered) {
      const key = `${entry.role}|${entry.text.slice(0, 220)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(entry);
    }
    return deduped.slice(-60);
  }

  function pickMessagesByScope(messages, scope) {
    const list = Array.isArray(messages) ? messages.slice() : [];
    if (!list.length) return [];
    if (scope === "full") return list.slice(-18);
    if (scope === "recent_3") return list.slice(-6);
    if (scope === "selection") return list.slice(-2);

    const picked = [];
    let assistantSeen = false;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      picked.unshift(list[i]);
      if (list[i].role === "assistant") assistantSeen = true;
      if (list[i].role === "user" && assistantSeen) break;
    }
    return picked.slice(-4);
  }

  function getLatestAssistantText() {
    const nodes = collectAssistantNodes();
    const last = [...nodes].reverse().find(node => avuNormalizeText(node.innerText || "").length > 40);
    return last ? avuNormalizeText(last.innerText || "") : "";
  }

  function inferSkillBucket(text) {
    const value = String(text || "");
    if (/(论文|摘要|学术|研究|thesis|paper|literature)/i.test(value)) return "论文助手";
    if (/(写作|改写|润色|邮件|文案|总结)/i.test(value)) return "写作助手";
    if (/(面试|简历|求职|自我介绍)/i.test(value)) return "求职助手";
    if (/(代码|编程|脚本|debug|sql|python|javascript)/i.test(value)) return "编程助手";
    if (/(产品|prd|需求|用户研究|竞品)/i.test(value)) return "产品助手";
    return "待整理";
  }

  function inferOutputFormat(text) {
    const value = String(text || "");
    if (/(markdown|md|标题|列表)/i.test(value)) return "- 先给结构化结论\n- 再给可直接复制使用的 Markdown 结果\n- 需要时补充优化建议";
    if (/(json|表格|table)/i.test(value)) return "- 优先输出结构化格式\n- 关键字段完整\n- 避免无关铺垫";
    return "- 先给结论\n- 再给可直接复用的正文或步骤\n- 最后补充可选优化建议";
  }

  function suggestSkillTitle(goal, fallbackTitle) {
    const raw = avuNormalizeText(goal || fallbackTitle || "未命名技能")
      .replace(/^(请|帮我|请你|你帮我|我想让你|我想要你|可以帮我|能不能帮我|麻烦你)\s*/g, "")
      .replace(/[。！？!?].*$/g, "")
      .replace(/^(把|将)\s*/g, "");
    const short = avuTruncate(raw || fallbackTitle || "未命名技能", 22);
    return /(流程|模板|助手|Skill|技能包)/i.test(short) ? short : `${short}流程`;
  }

  function collectKeyLines(text, fallbackText) {
    const normalized = avuNormalizeText(text || "");
    const bulletLike = normalized.split("\n")
      .map(line => line.trim())
      .filter(line => line.length > 8)
      .filter(line => !/^(copy|edit|retry|regenerate)$/i.test(line))
      .slice(0, 8);
    if (bulletLike.length >= 3) {
      return bulletLike.map(line => line.replace(/^[•\-*\d.)\s]+/, "")).slice(0, 6).map(line => `- ${line}`).join("\n");
    }
    const sentenceLike = normalized.split(/(?<=[。！？!?])/)
      .map(line => line.trim())
      .filter(line => line.length > 8)
      .slice(0, 5);
    if (sentenceLike.length) return sentenceLike.map(line => `- ${line}`).join("\n");
    return `- ${avuPreview(fallbackText || normalized, 120)}`;
  }

  function buildRuleSkillDraft(context) {
    const turns = context.turns || [];
    const userText = turns.filter(t => t.role === "user").map(t => t.text).join("\n\n");
    const assistantText = turns.filter(t => t.role === "assistant").map(t => t.text).join("\n\n");
    const baseGoal = avuPreview(userText || context.rawText || context.title || "当前任务", 48);
    const title = suggestSkillTitle(baseGoal, context.title);
    const folder = `Skill 包 / ${inferSkillBucket(`${title}\n${baseGoal}\n${assistantText}`)}`;
    const triggerSeed = avuNormalizeText(title).replace(/[^\p{L}\p{N}]+/gu, "").slice(0, 10);
    const trigger = triggerSeed ? `/${triggerSeed}` : "/skill";
    const scenarios = [
      `- 当你需要处理“${baseGoal}”这类任务时`,
      `- 当你想把同类请求稳定复用，而不是每次重新讲背景时`,
      `- 当你希望输出风格、结构和步骤尽量一致时`
    ].join("\n");
    const inputs = [
      "- 明确的任务目标",
      "- 原始素材、上下文或待处理文本",
      "- 输出偏好（语气、长度、格式、受众）",
      context.model ? `- 当前偏好的模型环境：${context.model}` : ""
    ].filter(Boolean).join("\n");
    const cautions = [
      "- 如果关键信息不足，先列出缺失项，再执行",
      "- 遇到模糊需求时，优先保留用户原始意图，不要擅自改目标",
      "- 输出可直接复制使用的最终结果，而不只是解释"
    ].join("\n");
    const exampleUser = avuPreview(userText || context.rawText, 120);
    const exampleAssistant = avuPreview(assistantText || context.rawText, 160);
    return {
      title,
      trigger,
      folder,
      tagsText: [context.model || "网页", context.scopeLabel || "沉淀", "Skill包"].filter(Boolean).join(", "),
      oneLiner: `当你需要处理“${baseGoal}”这类任务时，调用这个 Skill 包，快速得到可直接复用的结果。`,
      scenarios,
      inputs,
      steps: collectKeyLines(assistantText, context.rawText),
      outputFormat: inferOutputFormat(`${assistantText}\n${context.rawText}`),
      cautions,
      example: `输入示例：${exampleUser}\n\n输出示例：${exampleAssistant}`
    };
  }

  function buildAiSummaryPrompt(context) {
    const conversation = (context.rawText || "").slice(0, 10000);
    return avuNormalizeText(`
请不要继续回答原问题，而是把下面这段聊天沉淀成一个“可复用的 Skill 包草稿”。

要求：
1. 你是在帮我提炼一套以后可以反复调用的方法，不是复述原对话。
2. 语言务必具体、可执行、可复用。
3. 不要写空话；字段不确定时可基于聊天内容做合理归纳。
4. 严格按下面这些标题输出，标题不要改名：

# 名称
# 一句话用途
# 适用场景
# 输入要求
# 核心提示词或执行步骤
# 输出格式要求
# 注意事项
# 示例
# 建议触发词
# 建议标签
# 建议分组

补充约束：
- “名称”尽量简洁，像一个工具或方法名。
- “核心提示词或执行步骤”要写成以后可以直接复制使用的版本。
- “建议标签”请输出逗号分隔。
- “建议分组”请用“Skill 包 / xxx”的格式。

下面是要沉淀的聊天内容：
${conversation}
    `);
  }

  function parseSkillDraftFromSummary(text, context) {
    const sections = readNamedSections(text || "");
    const base = buildRuleSkillDraft(context || getSkillContext(state.skillStudio.scope || "last_turn"));
    return {
      title: avuNormalizeText(sections["名称"] || base.title || "未命名 Skill"),
      trigger: avuNormalizeText(sections["建议触发词"] || base.trigger || ""),
      folder: avuNormalizeText(sections["建议分组"] || base.folder || "Skill 包 / 待整理"),
      tagsText: avuNormalizeText(sections["建议标签"] || base.tagsText || ""),
      oneLiner: avuNormalizeText(sections["一句话用途"] || base.oneLiner || ""),
      scenarios: avuNormalizeText(sections["适用场景"] || base.scenarios || ""),
      inputs: avuNormalizeText(sections["输入要求"] || base.inputs || ""),
      steps: avuNormalizeText(sections["核心提示词或执行步骤"] || text || base.steps || ""),
      outputFormat: avuNormalizeText(sections["输出格式要求"] || base.outputFormat || ""),
      cautions: avuNormalizeText(sections["注意事项"] || base.cautions || ""),
      example: avuNormalizeText(sections["示例"] || base.example || "")
    };
  }

  function readNamedSections(text) {
    const labels = [
      "名称",
      "一句话用途",
      "适用场景",
      "输入要求",
      "核心提示词或执行步骤",
      "输出格式要求",
      "注意事项",
      "示例",
      "建议触发词",
      "建议标签",
      "建议分组"
    ];
    const matches = [...String(text || "").matchAll(/^(?:#{1,3}\s*)?(名称|一句话用途|适用场景|输入要求|核心提示词或执行步骤|输出格式要求|注意事项|示例|建议触发词|建议标签|建议分组)\s*[:：]?\s*(.*)$/gm)];
    const map = {};
    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i];
      const label = current[1];
      const inline = current[2] || "";
      const start = current.index + current[0].length;
      const end = i < matches.length - 1 ? matches[i + 1].index : String(text || "").length;
      const block = `${inline}\n${String(text || "").slice(start, end)}`.trim();
      map[label] = block.replace(/^\n+|\n+$/g, "").trim();
    }
    return map;
  }

  function buildSkillSnippetMarkdown(draft) {
    const value = draft || {};
    return [
      `# ${value.title || "未命名 Skill"}`,
      "",
      `- 触发词：${value.trigger || "无"}`,
      `- 分组：${value.folder || "Skill 包 / 待整理"}`,
      `- 标签：${value.tagsText || "无"}`,
      "",
      "## 一句话用途",
      value.oneLiner || "",
      "",
      "## 适用场景",
      value.scenarios || "",
      "",
      "## 输入要求",
      value.inputs || "",
      "",
      "## 核心提示词或执行步骤",
      value.steps || "",
      "",
      "## 输出格式要求",
      value.outputFormat || "",
      "",
      "## 注意事项",
      value.cautions || "",
      "",
      "## 示例",
      value.example || ""
    ].join("\n");
  }


  function buildWorkbench() {
    if (workbenchEl) return;
    workbenchEl = document.createElement("div");
    workbenchEl.id = "avu-workbench";
    workbenchEl.hidden = true;
    workbenchEl.innerHTML = `
      <div class="avu-skill-backdrop" data-close="1"></div>
      <div class="avu-skill-panel">
        <div class="avu-skill-head">
          <div>
            <div class="avu-detail-kicker">AI Workbench</div>
            <div class="avu-detail-title">工作台</div>
          </div>
          <button class="avu-detail-close" data-close="1">×</button>
        </div>
        <div class="avu-skill-body"></div>
      </div>
    `;
    workbenchEl.addEventListener("click", (event) => {
      if (event.target?.dataset?.close) closeWorkbench();
    });
    document.documentElement.appendChild(workbenchEl);
  }

  async function openWorkbench(view, options = {}) {
    buildWorkbench();
    state.workbench.open = true;
    state.workbench.view = view;
    if (view === "context" && options.prefillText) {
      state.workbench.context.prefillText = avuNormalizeText(options.prefillText || "");
      state.workbench.context.scope = "prefill";
      state.workbench.context.draft = null;
      state.workbench.context.pendingPrompt = "";
    }
    workbenchEl.hidden = false;
    if (view === "context") {
      await ensureContextWorkbench({ regenerate: !state.workbench.context.draft || !!options.regenerate });
    } else if (view === "organize") {
      await ensureOrganizeWorkbench({ regenerate: !state.workbench.organize.prompt || !!options.regenerate });
    }
    renderWorkbench();
  }

  function closeWorkbench() {
    state.workbench.open = false;
    if (workbenchEl) workbenchEl.hidden = true;
  }

  function updateWorkbenchHeader(kicker, title) {
    if (!workbenchEl) return;
    const kickerEl = workbenchEl.querySelector('.avu-detail-kicker');
    const titleEl = workbenchEl.querySelector('.avu-detail-title');
    if (kickerEl) kickerEl.textContent = kicker;
    if (titleEl) titleEl.textContent = title;
  }

  function renderWorkbench() {
    if (!workbenchEl || !state.workbench.open) return;
    const body = workbenchEl.querySelector('.avu-skill-body');
    if (!body) return;
    if (state.workbench.view === 'context') {
      updateWorkbenchHeader('Context Studio', '生成上下文胶囊');
      renderContextWorkbench(body);
      return;
    }
    if (state.workbench.view === 'organize') {
      updateWorkbenchHeader('Organize Studio', '用 AI 整理摘录 / Skill');
      renderOrganizeWorkbench(body);
      return;
    }
    updateWorkbenchHeader('Export Center', '导出中心');
    renderExportWorkbench(body);
  }

  function getContextSource(scope) {
    const wb = state.workbench.context;
    const prefillText = avuNormalizeText(wb.prefillText || '');
    if (scope === 'prefill' && prefillText) {
      return {
        scope: 'prefill',
        scopeLabel: '刚粘贴的大段文本',
        rawText: prefillText.slice(0, 12000),
        title: document.title || '长文本上下文',
        model: avuDetectModel(location.href) || '',
        turns: [],
        turnCount: 0,
        isAi: false,
        sourceUrl: location.href
      };
    }
    return getSkillContext(scope === 'prefill' ? 'selection' : scope);
  }

  async function ensureContextWorkbench({ regenerate = false } = {}) {
    const source = getContextSource(state.workbench.context.scope || 'last_turn');
    state.workbench.context.source = source;
    if (state.workbench.context.mode === 'rules') {
      if (regenerate || !state.workbench.context.draft) {
        state.workbench.context.draft = buildRuleContextDraft(source, state.workbench.context.capsuleType);
      }
    } else {
      if (regenerate || !state.workbench.context.pendingPrompt) {
        state.workbench.context.pendingPrompt = buildContextSummaryPrompt(source, state.workbench.context.capsuleType);
      }
      if (regenerate || !state.workbench.context.draft) {
        state.workbench.context.draft = buildRuleContextDraft(source, state.workbench.context.capsuleType);
      }
    }
  }

  function renderContextWorkbench(body) {
    const wb = state.workbench.context;
    const source = wb.source || getContextSource(wb.scope || 'last_turn');
    const draft = wb.draft || buildRuleContextDraft(source, wb.capsuleType);
    const disabledAi = !avuIsAiUrl(location.href);
    body.innerHTML = `
      <div class="avu-skill-toolbar">
        <div class="avu-chip-row">
          <button class="avu-chip ${wb.mode === 'rules' ? 'active' : ''}" data-context-mode="rules">模式 1：规则生成</button>
          <button class="avu-chip ${wb.mode === 'ai' ? 'active' : ''}" data-context-mode="ai">模式 2：借用当前 AI 页面</button>
        </div>
        <div class="avu-skill-actions">
          <select class="avu-select" id="avu-context-scope">
            <option value="selection" ${wb.scope === 'selection' ? 'selected' : ''}>当前选中内容</option>
            <option value="last_turn" ${wb.scope === 'last_turn' ? 'selected' : ''}>最后一轮问答</option>
            <option value="recent_3" ${wb.scope === 'recent_3' ? 'selected' : ''}>最近 3 轮</option>
            <option value="full" ${wb.scope === 'full' ? 'selected' : ''}>全部对话 / 页面</option>
            ${wb.prefillText ? `<option value="prefill" ${wb.scope === 'prefill' ? 'selected' : ''}>刚粘贴的大段文本</option>` : ''}
          </select>
          <select class="avu-select" id="avu-context-type">
            <option value="compact" ${wb.capsuleType === 'compact' ? 'selected' : ''}>轻压缩</option>
            <option value="handoff" ${wb.capsuleType === 'handoff' ? 'selected' : ''}>续聊包</option>
            <option value="skill_candidate" ${wb.capsuleType === 'skill_candidate' ? 'selected' : ''}>Skill 候选</option>
          </select>
          <button class="avu-btn" id="avu-context-regenerate">${wb.mode === 'rules' ? '重新生成胶囊' : '重新生成提示词'}</button>
        </div>
      </div>
      <div class="avu-source-card">
        <div class="avu-source-title">当前来源</div>
        <div class="avu-source-line">${avuEscapeHtml(source.scopeLabel || '当前页面')}</div>
        <div class="avu-source-line">${avuEscapeHtml(source.title || document.title || '')}</div>
        <div class="avu-source-line avu-url">${avuEscapeHtml((source.model ? `${source.model} · ` : '') + `${source.turnCount || 0} 条消息 / ${source.rawText.length} 字`)}</div>
      </div>
      ${wb.mode === 'ai' ? `
        <div class="avu-source-card">
          <div class="avu-source-title">总结提示词</div>
          <textarea class="avu-field avu-textarea-md" id="avu-context-prompt">${avuEscapeHtml(wb.pendingPrompt || '')}</textarea>
          <div class="avu-form-actions">
            <button class="avu-btn" id="avu-context-copy-prompt">复制提示词</button>
            <button class="avu-btn strong" id="avu-context-insert-prompt">${disabledAi ? '复制后去 AI 页面用' : '插入到当前输入框'}</button>
            <button class="avu-btn" id="avu-context-import-summary">从最新 AI 回复导入</button>
          </div>
        </div>
      ` : `<div class="avu-inline-tip">规则生成适合快速省 token；你可以继续手动编辑，然后保存、插入或导出。</div>`}
      <div class="avu-source-card">
        <div class="avu-source-title">胶囊草稿</div>
        <div class="avu-detail-grid">
          <div>
            <label class="avu-label">标题</label>
            <input class="avu-field" id="avu-context-title" value="${avuEscapeHtml(draft.title || '')}" />
          </div>
          <div>
            <label class="avu-label">标签</label>
            <input class="avu-field" id="avu-context-tags" value="${avuEscapeHtml(draft.tagsText || '')}" placeholder="例如：续聊、压缩、token" />
          </div>
        </div>
        <label class="avu-label">胶囊内容</label>
        <textarea class="avu-field avu-textarea-lg" id="avu-context-body">${avuEscapeHtml(draft.body || '')}</textarea>
        <div class="avu-form-actions sticky">
          <button class="avu-btn" id="avu-context-copy-md">复制 Markdown</button>
          <button class="avu-btn" id="avu-context-insert">插入到当前输入框</button>
          <button class="avu-btn" id="avu-context-save">保存到摘录</button>
          <button class="avu-btn" id="avu-context-export-md">导出 Markdown</button>
          <button class="avu-btn strong" id="avu-context-export-pdf">导出 PDF</button>
        </div>
      </div>
    `;

    body.querySelectorAll('[data-context-mode]').forEach(btn => {
      btn.onclick = async () => {
        syncContextDraftFromForm(body);
        wb.mode = btn.dataset.contextMode;
        await ensureContextWorkbench({ regenerate: true });
        renderWorkbench();
      };
    });
    body.querySelector('#avu-context-scope').onchange = async (event) => {
      syncContextDraftFromForm(body);
      wb.scope = event.target.value;
      await ensureContextWorkbench({ regenerate: true });
      renderWorkbench();
    };
    body.querySelector('#avu-context-type').onchange = async (event) => {
      syncContextDraftFromForm(body);
      wb.capsuleType = event.target.value;
      await ensureContextWorkbench({ regenerate: true });
      renderWorkbench();
    };
    body.querySelector('#avu-context-regenerate').onclick = async () => {
      syncContextDraftFromForm(body);
      await ensureContextWorkbench({ regenerate: true });
      renderWorkbench();
      showToast(wb.mode === 'rules' ? '已重新生成上下文胶囊' : '已重新生成总结提示词');
    };
    if (wb.mode === 'ai') {
      body.querySelector('#avu-context-copy-prompt').onclick = async () => {
        const value = body.querySelector('#avu-context-prompt').value || '';
        wb.pendingPrompt = value;
        await navigator.clipboard.writeText(value);
        showToast('已复制胶囊提示词');
      };
      body.querySelector('#avu-context-insert-prompt').onclick = async () => {
        const value = body.querySelector('#avu-context-prompt').value || '';
        wb.pendingPrompt = value;
        if (disabledAi) {
          await navigator.clipboard.writeText(value);
          showToast('已复制提示词，去任意 AI 页面粘贴即可');
          return;
        }
        const ok = insertIntoPreferredField(value);
        showToast(ok ? '已插入当前输入框，请发送给 AI' : '请先点到输入框，再插入提示词');
      };
      body.querySelector('#avu-context-import-summary').onclick = async () => {
        syncContextDraftFromForm(body);
        const last = getLatestAssistantText();
        if (!last) return showToast('还没有识别到最新 AI 回复');
        wb.importedSummary = last;
        wb.draft = parseContextDraftFromSummary(last, wb.capsuleType, source);
        renderWorkbench();
        showToast('已导入 AI 总结');
      };
    }
    ['avu-context-title', 'avu-context-tags', 'avu-context-body'].forEach((id) => {
      const el = body.querySelector('#' + id);
      if (!el) return;
      el.addEventListener('input', () => syncContextDraftFromForm(body));
      el.addEventListener('change', () => syncContextDraftFromForm(body));
    });
    body.querySelector('#avu-context-copy-md').onclick = async () => {
      syncContextDraftFromForm(body);
      await navigator.clipboard.writeText(avuBuildCapsuleMarkdown(wb.draft));
      showToast('已复制胶囊 Markdown');
    };
    body.querySelector('#avu-context-insert').onclick = async () => {
      syncContextDraftFromForm(body);
      const ok = insertIntoPreferredField((wb.draft?.body || '').trim());
      showToast(ok ? '已插入当前输入框' : '请先点到输入框，再点击插入');
    };
    body.querySelector('#avu-context-save').onclick = async () => {
      syncContextDraftFromForm(body);
      const draftToSave = wb.draft || draft;
      await avuRuntimeSendMessage({
        type: 'AVU_SAVE_ITEM',
        item: {
          type: 'context-capsule',
          title: draftToSave.title || '未命名上下文胶囊',
          text: draftToSave.body || '',
          folder: '上下文胶囊',
          tags: avuParseTags(draftToSave.tagsText || ''),
          url: location.href,
          pageTitle: document.title,
          model: source.model || avuDetectModel(location.href) || '网页',
          extra: {
            capsuleType: draftToSave.capsuleType,
            capsuleTypeLabel: draftToSave.capsuleTypeLabel,
            buildMode: wb.mode,
            scope: source.scope,
            turnCount: source.turnCount || 0
          }
        }
      });
      showToast('已保存到摘录');
      if (state.sidebarOpen && state.currentTab === 'captures') renderSidebar();
    };
    body.querySelector('#avu-context-export-md').onclick = () => {
      syncContextDraftFromForm(body);
      const draftToExport = wb.draft || draft;
      downloadFile(`${sanitizeFilename(draftToExport.title || 'context-capsule')}.md`, avuBuildCapsuleMarkdown(draftToExport), 'text/markdown');
      showToast('已导出 Markdown');
    };
    body.querySelector('#avu-context-export-pdf').onclick = () => {
      syncContextDraftFromForm(body);
      const draftToExport = wb.draft || draft;
      const pdfWindow = createPdfPlaceholderWindow();
      if (!pdfWindow) return;
      openPdfExportWindow({
        title: draftToExport.title || '上下文胶囊',
        subtitle: source.title || document.title || '',
        meta: [draftToExport.capsuleTypeLabel || '', source.scopeLabel || '', source.model || '网页'].filter(Boolean),
        sections: [{ title: '胶囊内容', body: draftToExport.body || '' }]
      }, pdfWindow);
    };
  }

  function syncContextDraftFromForm(body) {
    state.workbench.context.draft = {
      ...(state.workbench.context.draft || {}),
      title: body.querySelector('#avu-context-title')?.value || '',
      tagsText: body.querySelector('#avu-context-tags')?.value || '',
      body: body.querySelector('#avu-context-body')?.value || '',
      capsuleType: state.workbench.context.capsuleType,
      capsuleTypeLabel: contextTypeLabel(state.workbench.context.capsuleType),
      buildMode: state.workbench.context.mode,
      buildModeLabel: state.workbench.context.mode === 'ai' ? '借用当前 AI 页面' : '规则生成',
      model: state.workbench.context.source?.model || avuDetectModel(location.href) || '',
      scopeLabel: state.workbench.context.source?.scopeLabel || '',
      sourceUrl: state.workbench.context.source?.sourceUrl || location.href
    };
    return state.workbench.context.draft;
  }

  function contextTypeLabel(type) {
    if (type === 'compact') return '轻压缩';
    if (type === 'skill_candidate') return 'Skill 候选';
    return '续聊包';
  }

  function buildRuleContextDraft(source, type) {
    const context = source || getContextSource('last_turn');
    const raw = avuNormalizeText(context.rawText || '');
    const lines = raw.split('\n').map(v => v.trim()).filter(Boolean);
    const userText = (context.turns || []).filter(t => t.role === 'user').map(t => t.text).join('\n\n');
    const assistantText = (context.turns || []).filter(t => t.role === 'assistant').map(t => t.text).join('\n\n');
    const summary = avuPreview(userText || raw || context.title || '当前任务', 80);
    let title = '';
    let body = '';
    if (type === 'compact') {
      title = `轻压缩：${suggestSkillTitle(summary, context.title)}`;
      body = [
        '## 当前任务',
        `- ${summary}`,
        '',
        '## 关键事实',
        collectKeyLines(userText || raw, raw),
        '',
        '## 当前约束',
        '- 保留用户原始目标与关键限制',
        '- 新模型接手时不要重复追问已明确的信息',
        '',
        '## 待办',
        collectKeyLines(assistantText || raw, raw)
      ].join('\n');
    } else if (type === 'skill_candidate') {
      const skillDraft = buildRuleSkillDraft(context);
      title = `Skill 候选：${skillDraft.title || '未命名方法'}`;
      body = [
        '## 适合沉淀的任务',
        skillDraft.oneLiner || '',
        '',
        '## 输入要求',
        skillDraft.inputs || '',
        '',
        '## 核心步骤',
        skillDraft.steps || '',
        '',
        '## 输出格式',
        skillDraft.outputFormat || '',
        '',
        '## 注意事项',
        skillDraft.cautions || ''
      ].join('\n');
    } else {
      title = `续聊包：${suggestSkillTitle(summary, context.title)}`;
      body = [
        '## 背景',
        `- ${summary}`,
        '',
        '## 已完成',
        collectKeyLines(assistantText || raw, raw),
        '',
        '## 未完成',
        '- 继续沿当前目标推进，不要重新从零开始',
        '- 如需更多信息，优先询问最关键缺失项',
        '',
        '## 下一步建议 Prompt',
        `请基于以上背景继续处理“${summary}”，先快速确认当前状态，再直接给出下一步可执行结果。`
      ].join('\n');
    }
    return {
      title,
      tagsText: [context.model || '网页', contextTypeLabel(type), '上下文胶囊'].filter(Boolean).join(', '),
      body,
      capsuleType: type,
      capsuleTypeLabel: contextTypeLabel(type),
      buildMode: state.workbench.context.mode,
      buildModeLabel: state.workbench.context.mode === 'ai' ? '借用当前 AI 页面' : '规则生成',
      model: context.model || '',
      scopeLabel: context.scopeLabel || '',
      sourceUrl: context.sourceUrl || location.href
    };
  }

  function buildContextSummaryPrompt(source, type) {
    const raw = (source?.rawText || '').slice(0, 10000);
    const typeLabel = contextTypeLabel(type);
    return avuNormalizeText(`
请不要继续回答原问题，而是把下面内容整理成一个“${typeLabel}”。

输出要求：
1. 用简体中文。
2. 不要解释你在做什么，直接输出结果。
3. 结构清晰，便于复制到另一个 AI 继续使用。
4. 严格按下面标题输出：

# 标题
# 标签
# 胶囊内容

其中：
- “标签”请输出逗号分隔。
- “胶囊内容”根据“${typeLabel}”的目标来写：
  - 轻压缩：任务摘要 / 关键事实 / 当前约束 / 待办
  - 续聊包：背景 / 已完成 / 未完成 / 下一步建议 Prompt
  - Skill 候选：适合沉淀的任务 / 输入要求 / 核心步骤 / 输出格式 / 注意事项

下面是原始内容：
${raw}
    `);
  }

  function parseContextDraftFromSummary(text, type, source) {
    const sections = readNamedSectionsByLabels(text, ['标题', '标签', '胶囊内容']);
    return {
      title: avuNormalizeText(sections['标题'] || `未命名${contextTypeLabel(type)}`),
      tagsText: avuNormalizeText(sections['标签'] || [source?.model || '网页', contextTypeLabel(type), '上下文胶囊'].filter(Boolean).join(', ')),
      body: avuNormalizeText(sections['胶囊内容'] || text || ''),
      capsuleType: type,
      capsuleTypeLabel: contextTypeLabel(type),
      buildMode: 'ai',
      buildModeLabel: '借用当前 AI 页面',
      model: source?.model || '',
      scopeLabel: source?.scopeLabel || '',
      sourceUrl: source?.sourceUrl || location.href
    };
  }

  function readNamedSectionsByLabels(text, labels) {
    const names = Array.isArray(labels) ? labels.join('|') : '';
    const pattern = new RegExp(`^(?:#{1,3}\s*)?(${names})\s*[:：]?\s*(.*)$`, 'gm');
    const matches = [...String(text || '').matchAll(pattern)];
    const map = {};
    for (let i = 0; i < matches.length; i += 1) {
      const current = matches[i];
      const label = current[1];
      const inline = current[2] || '';
      const start = current.index + current[0].length;
      const end = i < matches.length - 1 ? matches[i + 1].index : String(text || '').length;
      const block = `${inline}\n${String(text || '').slice(start, end)}`.trim();
      map[label] = block.replace(/^\n+|\n+$/g, '').trim();
    }
    return map;
  }

  async function ensureOrganizeWorkbench({ regenerate = false } = {}) {
    const wb = state.workbench.organize;
    if (regenerate || !wb.prompt) {
      const records = wb.target === 'snippets' ? await fetchSnippets() : await fetchItems();
      wb.prompt = buildOrganizePrompt(wb.target, records);
    }
  }

  function renderOrganizeWorkbench(body) {
    const wb = state.workbench.organize;
    body.innerHTML = `
      <div class="avu-skill-toolbar">
        <div class="avu-chip-row">
          <button class="avu-chip ${wb.target === 'items' ? 'active' : ''}" data-organize-target="items">整理摘录</button>
          <button class="avu-chip ${wb.target === 'snippets' ? 'active' : ''}" data-organize-target="snippets">整理长期片段 / Skill</button>
        </div>
        <div class="avu-skill-actions">
          <button class="avu-btn" id="avu-organize-regenerate">重新生成提示词</button>
        </div>
      </div>
      <div class="avu-inline-tip">这一步不会自动把内容发给 AI。你可以复制或插入提示词，让任意主流模型返回 JSON，再导入并 merge 到本地库。</div>
      <div class="avu-source-card">
        <div class="avu-source-title">整理提示词</div>
        <textarea class="avu-field avu-textarea-md" id="avu-organize-prompt">${avuEscapeHtml(wb.prompt || '')}</textarea>
        <div class="avu-form-actions">
          <button class="avu-btn" id="avu-organize-copy-prompt">复制提示词</button>
          <button class="avu-btn strong" id="avu-organize-insert-prompt">插入到当前输入框</button>
          <button class="avu-btn" id="avu-organize-import-summary">从最新 AI 回复导入 JSON</button>
        </div>
      </div>
      <div class="avu-source-card">
        <div class="avu-source-title">整理 JSON（可编辑）</div>
        <textarea class="avu-field avu-textarea-lg" id="avu-organize-json">${avuEscapeHtml(wb.jsonText || '')}</textarea>
        <div class="avu-form-actions sticky">
          <button class="avu-btn" id="avu-organize-copy-json">复制 JSON</button>
          <button class="avu-btn strong" id="avu-organize-apply">应用 merge</button>
        </div>
      </div>
    `;
    body.querySelectorAll('[data-organize-target]').forEach(btn => {
      btn.onclick = async () => {
        wb.target = btn.dataset.organizeTarget;
        wb.jsonText = '';
        await ensureOrganizeWorkbench({ regenerate: true });
        renderWorkbench();
      };
    });
    body.querySelector('#avu-organize-regenerate').onclick = async () => {
      wb.prompt = '';
      await ensureOrganizeWorkbench({ regenerate: true });
      renderWorkbench();
      showToast('已重新生成整理提示词');
    };
    body.querySelector('#avu-organize-copy-prompt').onclick = async () => {
      wb.prompt = body.querySelector('#avu-organize-prompt').value || '';
      await navigator.clipboard.writeText(wb.prompt);
      showToast('已复制整理提示词');
    };
    body.querySelector('#avu-organize-insert-prompt').onclick = async () => {
      wb.prompt = body.querySelector('#avu-organize-prompt').value || '';
      const ok = insertIntoPreferredField(wb.prompt);
      showToast(ok ? '已插入当前输入框' : '请先点到输入框，再点击插入');
    };
    body.querySelector('#avu-organize-import-summary').onclick = async () => {
      const last = getLatestAssistantText();
      if (!last) return showToast('还没有识别到最新 AI 回复');
      wb.importedSummary = last;
      wb.jsonText = avuExtractJsonBlock(last);
      renderWorkbench();
      showToast('已导入最新 AI 回复中的 JSON');
    };
    body.querySelector('#avu-organize-copy-json').onclick = async () => {
      wb.jsonText = body.querySelector('#avu-organize-json').value || '';
      await navigator.clipboard.writeText(wb.jsonText);
      showToast('已复制 JSON');
    };
    body.querySelector('#avu-organize-apply').onclick = async () => {
      wb.jsonText = body.querySelector('#avu-organize-json').value || '';
      const ok = await applyOrganizeJson(wb.target, wb.jsonText);
      if (ok) {
        showToast('已应用整理结果');
        if (state.sidebarOpen) renderSidebar();
      }
    };
  }

  function buildOrganizePrompt(target, records) {
    const list = (records || []).slice(0, 80).map(record => ({
      id: record.id,
      title: record.title,
      folder: record.folder || '',
      kind: record.kind || '',
      tags: record.tags || [],
      preview: avuTruncate(record.text || record.content || '', 160)
    }));
    return avuNormalizeText(`
请帮我整理下面这批 ${target === 'snippets' ? '长期片段 / Skill 包' : '摘录'}，只返回 JSON，不要输出解释。

输出 JSON 结构必须是：
{
  "target": "${target}",
  "updates": [
    {
      "id": "原始 id",
      "folder": "新的分组 / 文件夹",
      "tags": ["标签1", "标签2"],
      "title": "可选：如果需要改标题",
      "note": "可选：补充备注"
    }
  ]
}

规则：
1. 只整理已有条目，不要虚构新条目。
2. 可合并或重排标签，但不要删除关键信息。
3. 文件夹命名请尽量清晰，适合长期维护。
4. 如果某条内容已经合理，可不出现在 updates 里。

待整理数据：
${JSON.stringify(list, null, 2)}
    `);
  }

  async function applyOrganizeJson(target, text) {
    const parsed = avuSafeJsonParse(text);
    if (!parsed || !Array.isArray(parsed.updates)) {
      showToast('JSON 解析失败，请检查格式');
      return false;
    }
    if (target === 'snippets') {
      const snippets = await fetchSnippets();
      for (const update of parsed.updates) {
        const current = snippets.find(s => s.id === update.id);
        if (!current) continue;
        await avuRuntimeSendMessage({
          type: 'AVU_UPSERT_SNIPPET',
          snippet: {
            ...current,
            title: update.title ?? current.title,
            folder: update.folder ?? current.folder,
            tags: update.tags ?? current.tags,
            content: current.content,
            trigger: current.trigger,
            kind: update.kind ?? current.kind,
            extra: { ...(current.extra || {}), organizeNote: update.note || current.extra?.organizeNote || '' }
          }
        });
      }
    } else {
      for (const update of parsed.updates) {
        await avuRuntimeSendMessage({
          type: 'AVU_UPDATE_ITEM',
          item: {
            id: update.id,
            title: update.title,
            folder: update.folder,
            tags: update.tags,
            note: update.note
          }
        });
      }
    }
    return true;
  }

  async function renderExportWorkbench(body) {
    const wb = state.workbench.exportCenter;
    const selected = wb.sourceType || 'conversation';
    const libraryStats = await getLibraryStats();
    body.innerHTML = `
      <div class="avu-skill-toolbar">
        <div class="avu-chip-row">
          <button class="avu-chip ${selected === 'selection' ? 'active' : ''}" data-export-source="selection">选中内容</button>
          <button class="avu-chip ${selected === 'page' ? 'active' : ''}" data-export-source="page">当前页面</button>
          <button class="avu-chip ${selected === 'conversation' ? 'active' : ''}" data-export-source="conversation">当前对话 / 主内容</button>
          <button class="avu-chip ${selected === 'last_ai' ? 'active' : ''}" data-export-source="last_ai">最后一条 AI 回复</button>
          <button class="avu-chip ${selected === 'library' ? 'active' : ''}" data-export-source="library">全部知识库</button>
        </div>
        <div class="avu-skill-actions">
          <span class="avu-soft-pill">摘录 ${libraryStats.items}</span>
          <span class="avu-soft-pill">片段 ${libraryStats.snippets}</span>
        </div>
      </div>
      <div class="avu-inline-tip">PDF 会打开浏览器打印页，你可以直接选择“另存为 PDF”。</div>
      <div class="avu-source-card">
        <div class="avu-source-title">导出对象</div>
        <div class="avu-source-line">${avuEscapeHtml(describeExportSource(selected))}</div>
      </div>
      <div class="avu-form-actions sticky">
        <button class="avu-btn" id="avu-export-md">导出 Markdown</button>
        <button class="avu-btn" id="avu-export-json">导出 JSON</button>
        <button class="avu-btn strong" id="avu-export-pdf">导出 PDF</button>
      </div>
    `;
    body.querySelectorAll('[data-export-source]').forEach(btn => {
      btn.onclick = () => {
        wb.sourceType = btn.dataset.exportSource;
        renderWorkbench();
      };
    });
    body.querySelector('#avu-export-md').onclick = () => performStructuredExport(selected, 'md');
    body.querySelector('#avu-export-json').onclick = () => performStructuredExport(selected, 'json');
    body.querySelector('#avu-export-pdf').onclick = () => {
      const pdfWindow = createPdfPlaceholderWindow();
      if (!pdfWindow) return;
      performStructuredExport(selected, 'pdf', pdfWindow);
    };
  }

  function createPdfPlaceholderWindow() {
    return avuCreatePdfPlaceholderWindow('PDF 导出');
  }

  async function getLibraryStats() {
    const [items, snippets] = await Promise.all([fetchItems(), fetchSnippets()]);
    return { items: items.length, snippets: snippets.length };
  }

  function describeExportSource(type) {
    return ({
      selection: '导出当前选中内容',
      page: '导出当前页面摘要',
      conversation: '导出当前对话或页面主内容',
      last_ai: '导出最后一条 AI 回复',
      library: '导出全部摘录和长期片段'
    })[type] || '导出当前对象';
  }

  async function performStructuredExport(sourceType, format, existingWindow) {
    const payload = await buildExportPayload(sourceType);
    if (!payload) {
      if (existingWindow) {
        try { existingWindow.close(); } catch (_) {}
      }
      return showToast('当前没有可导出的内容');
    }
    if (format === 'json') {
      downloadFile(`${sanitizeFilename(payload.filename || payload.title || 'export')}.json`, JSON.stringify(payload.json || payload.raw || payload, null, 2), 'application/json');
      return showToast('已导出 JSON');
    }
    if (format === 'md') {
      downloadFile(`${sanitizeFilename(payload.filename || payload.title || 'export')}.md`, payload.markdown || '', 'text/markdown');
      return showToast('已导出 Markdown');
    }
    openPdfExportWindow(payload.pdf, existingWindow);
  }

  async function buildExportPayload(sourceType) {
    const selection = avuNormalizeText(window.getSelection()?.toString() || '');
    const model = avuDetectModel(location.href) || '网页';
    if (sourceType === 'selection' && selection) {
      const title = avuPreview(selection, 40) || '选中内容';
      return {
        title,
        filename: title,
        markdown: `# ${title}

${selection}`,
        json: { title, text: selection, sourceUrl: location.href },
        pdf: { title, subtitle: document.title || '', meta: [model, '选中内容'], sections: [{ title: '正文', body: selection }] }
      };
    }
    if (sourceType === 'last_ai') {
      const text = getLatestAssistantText();
      if (!text) return null;
      const title = avuPreview(text, 40) || '最后一条 AI 回复';
      return {
        title,
        filename: title,
        markdown: `# ${title}

${text}`,
        json: { title, text, model, sourceUrl: location.href },
        pdf: { title, subtitle: document.title || '', meta: [model, '最后一条 AI 回复'], sections: [{ title: '正文', body: text }] }
      };
    }
    if (sourceType === 'library') {
      const [items, snippets] = await Promise.all([fetchItems(), fetchSnippets()]);
      const title = 'AI Vault Universal 全部知识库';
      return {
        title,
        filename: 'ai-vault-universal-library',
        markdown: avuBuildMarkdownBundle(items, snippets),
        json: { title, items, snippets, exportedAt: new Date().toISOString() },
        pdf: {
          title,
          subtitle: new Date().toLocaleString(),
          meta: [`摘录 ${items.length}`, `片段 ${snippets.length}`],
          sections: [
            { title: '摘录（前 20 条）', body: items.slice(0, 20).map((item, i) => `${i + 1}. ${item.title}
${avuTruncate(item.text || '', 300)}`).join('\n\n') || '无' },
            { title: '长期片段 / Skill（前 20 条）', body: snippets.slice(0, 20).map((item, i) => `${i + 1}. ${item.title}
${avuTruncate(item.content || '', 300)}`).join('\n\n') || '无' }
          ]
        }
      };
    }
    if (sourceType === 'page') {
      const text = avuNormalizeText((document.body?.innerText || '').slice(0, 12000));
      if (!text) return null;
      const title = document.title || '当前页面';
      return {
        title,
        filename: title,
        markdown: `# ${title}

${text}`,
        json: { title, text, sourceUrl: location.href },
        pdf: { title, subtitle: location.href, meta: [model, '当前页面'], sections: [{ title: '正文', body: text }] }
      };
    }
    const messages = collectConversationMessages();
    if (messages.length) {
      const title = document.title || '当前对话';
      const markdown = ['# ' + title, ''].concat(messages.map(msg => `## ${msg.role === 'user' ? '用户' : 'AI'}
${msg.text}
`)).join('\n');
      const sections = [];
      let q = 0, a = 0;
      messages.slice(-18).forEach((msg) => {
        sections.push({ title: msg.role === 'user' ? `用户 ${++q}` : `AI ${++a}`, body: msg.text });
      });
      return {
        title,
        filename: title,
        markdown,
        json: { title, model, sourceUrl: location.href, messages },
        pdf: { title, subtitle: location.href, meta: [model, `消息 ${messages.length}`], sections }
      };
    }
    const fallbackText = avuNormalizeText((document.body?.innerText || '').slice(0, 12000));
    if (!fallbackText) return null;
    const title = document.title || '当前主内容';
    return {
      title,
      filename: title,
      markdown: `# ${title}

${fallbackText}`,
      json: { title, text: fallbackText, sourceUrl: location.href },
      pdf: { title, subtitle: location.href, meta: [model, '页面主内容'], sections: [{ title: '正文', body: fallbackText }] }
    };
  }

  function openPdfExportWindow(payload, existingWindow) {
    const html = avuBuildSimplePdfHtml(payload || { title: 'AI Vault 导出', sections: [] });
    const win = existingWindow || avuCreatePdfPlaceholderWindow('PDF 导出');
    if (!win) {
      showToast('浏览器拦截了导出窗口，请允许弹窗后重试');
      return;
    }
    try {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        try { win.print(); } catch (_) {}
      }, 250);
      showToast('已打开 PDF 打印页');
    } catch (_) {
      showToast('PDF 打印页生成失败，请重试');
    }
  }

  function enableCustomSendBehavior() {
    if (state.customSendEnabled) return;
    state.customSendEnabled = true;
    document.addEventListener('keydown', handleCustomSendBehavior, true);
    document.addEventListener('paste', handleLongPaste, true);
  }

  function handleCustomSendBehavior(event) {
    if (!state.customSendSettings?.enableCustomSendBehavior) return;
    if (!avuIsAiUrl(location.href)) return;
    const target = event.target;
    if (!avuIsEditable(target)) return;
    if (event.key !== 'Enter' || event.isComposing) return;
    if (state.slashItems.length) return;
    if (event.shiftKey && !event.ctrlKey && !event.metaKey) return;

    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      if (!triggerPreferredSend(target)) showToast('未找到发送按钮');
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    insertTextIntoElement(target, '\n');
  }

  function insertTextIntoElement(el, text) {
    if (!avuIsEditable(el)) return false;
    if (el.isContentEditable) {
      el.focus();
      document.execCommand('insertText', false, text);
      return true;
    }
    const value = el.value || '';
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    el.focus();
    el.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function triggerPreferredSend(target) {
    const rule = avuDetectAiRule(location.href);
    const selectors = [...(rule?.sendButtonSelectors || []), 'button[type="submit"]'];
    for (const selector of selectors) {
      const btn = document.querySelector(selector);
      if (btn && !btn.disabled && btn.offsetParent !== null) {
        btn.click();
        return true;
      }
    }
    const form = target.closest('form');
    if (form?.requestSubmit) {
      form.requestSubmit();
      return true;
    }
    return false;
  }

  async function handleLongPaste(event) {
    if (!state.customSendSettings?.enableCustomSendBehavior) return;
    if (!avuIsAiUrl(location.href)) return;
    const text = avuNormalizeText(event.clipboardData?.getData('text/plain') || '');
    const threshold = Number(state.customSendSettings?.longPasteThreshold || AVU_DEFAULT_SETTINGS.longPasteThreshold || 3500);
    if (!text || text.length < threshold) return;
    const shouldOpen = window.confirm(`检测到约 ${text.length} 字的长文本。

为了省 token，是否先打开“上下文胶囊”压缩后再发？

选择“确定”会先阻止粘贴并打开胶囊；选择“取消”则继续正常粘贴。`);
    if (!shouldOpen) return;
    event.preventDefault();
    state.workbench.context.prefillText = text;
    state.workbench.context.scope = 'prefill';
    state.workbench.context.draft = null;
    state.workbench.context.mode = 'rules';
    state.workbench.context.capsuleType = 'compact';
    await openWorkbench('context', { prefillText: text, regenerate: true });
  }

  function setupObserver() {
    mutationObserver = new MutationObserver(() => {
      if (state.sidebarOpen && state.currentTab === "outline") {
        clearTimeout(setupObserver._timer);
        setupObserver._timer = setTimeout(() => renderSidebar(), 250);
      }
    });
    mutationObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  function enableSlashSnippets() {
    if (slashPopupEl) return;
    slashPopupEl = document.createElement("div");
    slashPopupEl.id = "avu-slash-popup";
    document.documentElement.appendChild(slashPopupEl);

    document.addEventListener("click", (event) => {
      if (!slashPopupEl.contains(event.target)) hideSlashPopup();
    }, true);

    document.addEventListener("input", handleSlashInput, true);
    document.addEventListener("keydown", handleSlashKeydown, true);
  }

  async function handleSlashInput(event) {
    const el = event.target;
    if (!avuIsEditable(el)) return hideSlashPopup();

    const text = el.isContentEditable ? (window.getSelection()?.anchorNode?.textContent || el.innerText || "") : (el.value || "");
    const match = text.match(/(?:^|\s)(\/[^\s/]*)$/);
    if (!match) return hideSlashPopup();

    const query = match[1].slice(1).toLowerCase();
    const snippets = await fetchSnippets();
    const filtered = snippets.filter(snippet => {
      const trigger = String(snippet.trigger || "").replace(/^\//, "").toLowerCase();
      const title = String(snippet.title || "").toLowerCase();
      const folder = String(snippet.folder || "").toLowerCase();
      return !query || trigger.includes(query) || title.includes(query) || folder.includes(query);
    }).slice(0, 8);

    if (!filtered.length) return hideSlashPopup();

    state.slashItems = filtered;
    state.slashActive = 0;
    state.slashInput = el;
    renderSlashPopup(el);
  }

  function renderSlashPopup(anchorEl) {
    if (!slashPopupEl || !state.slashItems.length) return;
    slashPopupEl.innerHTML = state.slashItems.map((snippet, index) => `
      <div class="avu-slash-item ${index === state.slashActive ? 'active' : ''}" data-index="${index}">
        <span class="avu-trigger">${avuEscapeHtml(snippet.trigger || '/片段')}</span>
        <span class="avu-slash-name">${avuEscapeHtml(snippet.title || '未命名片段')}</span>
        <span class="avu-slash-hint">${avuEscapeHtml(avuTruncate(snippet.content || '', 18))}</span>
      </div>
    `).join("");

    slashPopupEl.querySelectorAll(".avu-slash-item").forEach(el => {
      el.onclick = () => insertSnippetAtCursor(state.slashItems[Number(el.dataset.index)]);
    });

    const rect = anchorEl.getBoundingClientRect();
    slashPopupEl.style.left = `${Math.max(12, Math.min(window.innerWidth - 320, rect.left))}px`;
    slashPopupEl.style.top = `${Math.max(12, rect.bottom + 8)}px`;
    slashPopupEl.classList.add("show");
  }

  function hideSlashPopup() {
    state.slashItems = [];
    state.slashActive = 0;
    slashPopupEl?.classList.remove("show");
  }

  function handleSlashKeydown(event) {
    if (!state.slashItems.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.slashActive = (state.slashActive + 1) % state.slashItems.length;
      renderSlashPopup(state.slashInput);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      state.slashActive = (state.slashActive - 1 + state.slashItems.length) % state.slashItems.length;
      renderSlashPopup(state.slashInput);
    } else if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      insertSnippetAtCursor(state.slashItems[state.slashActive]);
    } else if (event.key === "Escape") {
      hideSlashPopup();
    }
  }

  function insertIntoPreferredField(text) {
    const el = state.lastEditableEl && document.contains(state.lastEditableEl) ? state.lastEditableEl : document.activeElement;
    if (!avuIsEditable(el)) return avuInsertTextAtCursor(text);
    if (el.isContentEditable) {
      el.focus();
      document.execCommand("insertText", false, text);
      return true;
    }
    const value = el.value || "";
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    el.focus();
    el.value = `${value.slice(0, start)}${text}${value.slice(end)}`;
    el.selectionStart = el.selectionEnd = start + text.length;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function insertSnippetAtCursor(snippet) {
    const el = state.slashInput;
    if (!el || !snippet) return;

    if (el.isContentEditable) {
      const text = el.innerText || "";
      const replaced = text.replace(/(?:^|\s)\/[^\s/]*$/, ` ${snippet.content}`);
      el.innerText = replaced;
      el.dispatchEvent(new InputEvent("input", { bubbles: true }));
    } else {
      const value = el.value || "";
      const start = el.selectionStart ?? value.length;
      const before = value.slice(0, start).replace(/(?:^|\s)\/[^\s/]*$/, (m) => (m.startsWith(" ") ? ` ${snippet.content}` : snippet.content));
      const after = value.slice(start);
      el.value = before + after;
      const nextPos = before.length;
      el.selectionStart = el.selectionEnd = nextPos;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    hideSlashPopup();
    showToast("已插入长期片段");
  }

  async function exportBundle(format) {
    const items = await fetchItems();
    const snippets = await fetchSnippets();
    if (format === "json") {
      downloadFile("ai-vault-universal-export.json", JSON.stringify({ items, snippets, exportedAt: new Date().toISOString() }, null, 2), "application/json");
      showToast("已导出 JSON");
      return;
    }
    if (format === "pdf") {
      const pdfWindow = createPdfPlaceholderWindow();
      if (!pdfWindow) {
        showToast("浏览器拦截了导出窗口，请允许弹窗后重试");
        return;
      }
      openPdfExportWindow({
        title: 'AI Vault Universal 全部知识库',
        subtitle: new Date().toLocaleString(),
        meta: [`摘录 ${items.length}`, `片段 ${snippets.length}`, '本地导出'],
        sections: [
          { title: '摘录（前 20 条）', body: items.slice(0, 20).map((item, i) => `${i + 1}. ${item.title || '未命名摘录'}\n${avuTruncate(item.text || '', 300)}`).join('\n\n') || '无' },
          { title: '长期片段 / Skill（前 20 条）', body: snippets.slice(0, 20).map((item, i) => `${i + 1}. ${item.title || '未命名片段'}\n${avuTruncate(item.content || '', 300)}`).join('\n\n') || '无' }
        ]
      }, pdfWindow);
      return;
    }
    downloadFile("ai-vault-universal-export.md", avuBuildMarkdownBundle(items, snippets), "text/markdown");
    showToast("已导出 Markdown");
  }

  function renderCaptureCard(item) {
    return `
      <div class="avu-card">
        <div class="avu-card-top">
          <div>
            <div class="avu-card-title">${avuEscapeHtml(item.title || "未命名摘录")}</div>
            <div class="avu-card-meta">${avuEscapeHtml(item.source?.host || "")} · ${avuEscapeHtml(item.folder || "未分类")} · ${avuEscapeHtml(avuFormatRelativeTime(item.createdAt))}</div>
          </div>
          <span class="avu-model-pill ${avuBadgeClass(item.model)}">${avuEscapeHtml(item.model || item.type || "网页")}</span>
        </div>
        ${(item.tags || []).length ? `<div class="avu-tag-row">${item.tags.map(tag => `<span class="avu-soft-pill">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="avu-card-text">${avuEscapeHtml(item.preview || item.text || "")}</div>
        ${item.note ? `<div class="avu-card-note">备注：${avuEscapeHtml(avuTruncate(item.note, 80))}</div>` : ""}
        <div class="avu-card-actions">
          <button class="avu-btn" data-open-item="${item.id}">详情</button>
          <button class="avu-btn" data-copy-item="${item.id}">复制</button>
          <button class="avu-btn" data-item-to-skill="${item.id}">进 Skill 包</button>
          <button class="avu-btn danger" data-delete-item="${item.id}">删除</button>
        </div>
      </div>
    `;
  }

  function renderSnippetCard(snippet) {
    return `
      <div class="avu-card">
        <div class="avu-card-top">
          <div>
            <div class="avu-card-title">${avuEscapeHtml(snippet.title || "未命名片段")}</div>
            <div class="avu-card-meta">${avuEscapeHtml(snippet.folder || "个人资料")} · ${avuEscapeHtml(avuFormatRelativeTime(snippet.updatedAt || snippet.createdAt))}</div>
          </div>
          <div class="avu-top-badges">
            <span class="avu-kind-pill">${avuEscapeHtml(avuSnippetKindLabel(snippet.kind))}</span>
            ${snippet.trigger ? `<span class="avu-trigger">${avuEscapeHtml(snippet.trigger)}</span>` : ""}
          </div>
        </div>
        ${(snippet.tags || []).length ? `<div class="avu-tag-row">${snippet.tags.map(tag => `<span class="avu-soft-pill">#${avuEscapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="avu-card-text">${avuEscapeHtml(avuTruncate(snippet.content || "", 180))}</div>
        <div class="avu-card-actions">
          <button class="avu-btn" data-insert-snippet="${snippet.id}">插入</button>
          <button class="avu-btn" data-copy-snippet="${snippet.id}">复制</button>
          <button class="avu-btn danger" data-delete-snippet="${snippet.id}">删除</button>
        </div>
      </div>
    `;
  }

  function buildSingleItemMarkdown(item) {
    return [
      `# ${item.title || "未命名摘录"}`,
      "",
      `- 分组：${item.folder || "未分类"}`,
      `- 标签：${(item.tags || []).join(", ") || "无"}`,
      `- 来源：${item.source?.title || ""} ${item.source?.url || ""}`.trim(),
      `- 模型：${item.model || item.type || "网页"}`,
      `- 时间：${item.createdAt || ""}`,
      item.note ? `- 备注：${item.note}` : "",
      "",
      item.text || ""
    ].filter(Boolean).join("\n");
  }

  function sanitizeFilename(name) {
    return String(name || "export").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 80);
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message?.type === "AVU_TOGGLE_SIDEBAR") {
        await toggleSidebar();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_SAVE_SELECTION") {
        await handleSaveSelection();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_SAVE_PAGE") {
        await handleSavePage();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_SAVE_AI_LAST") {
        await handleSaveLastAi();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_INSERT_SNIPPET") {
        const ok = insertIntoPreferredField(message.text || "");
        showToast(ok ? "已插入当前输入框" : "请先点到输入框，再点击插入");
        sendResponse({ ok });
      } else if (message?.type === "AVU_OPEN_SKILL_STUDIO") {
        await openSkillStudio(message.mode);
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_OPEN_CONTEXT_STUDIO") {
        await openWorkbench("context");
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_OPEN_EXPORT_CENTER") {
        await openWorkbench("export");
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_OPEN_ORGANIZE_STUDIO") {
        await openWorkbench("organize");
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_OPEN_OUTLINE") {
        await openOutlineTab();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_HIDE_LAUNCHER_LOCAL") {
        removeLauncher();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_SHOW_LAUNCHER_LOCAL") {
        if (!launcherEl) buildLauncher();
        sendResponse({ ok: true });
      } else if (message?.type === "AVU_TOAST") {
        showToast(message.message || "已完成");
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false });
      }
    })();
    return true;
  });

  init();
})();
