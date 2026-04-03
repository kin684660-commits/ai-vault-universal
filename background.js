importScripts("common.js");

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "avu-save-selection",
      title: "保存选中文本到 AI Vault",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: "avu-save-page",
      title: "保存当前页面摘要到 AI Vault",
      contexts: ["page"]
    });
    chrome.contextMenus.create({
      id: "avu-save-link",
      title: "保存当前链接到 AI Vault",
      contexts: ["link"]
    });
    chrome.contextMenus.create({
      id: "avu-save-ai-last",
      title: "保存当前页最后一条 AI 回复",
      contexts: ["page"]
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    if (!tab?.url) return;
    if (info.menuItemId === "avu-save-selection" && info.selectionText) {
      await avuAppendItem({
        type: "selection",
        text: info.selectionText,
        title: avuPreview(info.selectionText, 80),
        pageTitle: tab.title,
        url: tab.url
      });
      await safeNotify(tab.id, "已保存选中文本");
    } else if (info.menuItemId === "avu-save-page") {
      try {
        await avuSendTabMessage(tab.id, { type: "AVU_SAVE_PAGE" });
      } catch (_) {
        await avuAppendItem({
          type: "page",
          text: `${tab.title || "当前页面"}\n${tab.url}`,
          title: tab.title || "当前页面",
          pageTitle: tab.title,
          url: tab.url,
          extra: { mode: "page-link" }
        });
        await safeNotify(tab.id, "已保存当前页面");
      }
    } else if (info.menuItemId === "avu-save-link" && info.linkUrl) {
      await avuAppendItem({
        type: "link",
        text: `${info.linkText || "链接"}\n${info.linkUrl}`,
        title: avuPreview(info.linkText || info.linkUrl, 80),
        pageTitle: tab.title,
        url: tab.url,
        extra: { linkUrl: info.linkUrl }
      });
      await safeNotify(tab.id, "已保存链接");
    } else if (info.menuItemId === "avu-save-ai-last") {
      try {
        await avuSendTabMessage(tab.id, { type: "AVU_SAVE_AI_LAST" });
      } catch (_) {
        await safeNotify(tab.id, "当前页未识别到 AI 回复");
      }
    }
  } catch (error) {
    console.warn("[AI Vault] context menu failed:", error);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const tabs = await avuTabsQuery({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;

  try {
    if (command === "toggle-sidebar") {
      await avuSendTabMessage(tab.id, { type: "AVU_TOGGLE_SIDEBAR" });
    } else if (command === "save-selection") {
      await avuSendTabMessage(tab.id, { type: "AVU_SAVE_SELECTION" });
    } else if (command === "save-page") {
      await avuSendTabMessage(tab.id, { type: "AVU_SAVE_PAGE" });
    }
  } catch (error) {
    console.warn("[AI Vault] command failed:", error);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message?.type) {
      case "AVU_SAVE_ITEM": {
        const item = await avuAppendItem(message.item || {});
        sendResponse({ ok: true, item });
        break;
      }
      case "AVU_GET_ITEMS": {
        const items = await avuGetItems();
        sendResponse({ ok: true, items });
        break;
      }
      case "AVU_UPDATE_ITEM": {
        const item = await avuUpdateItem(message.item || {});
        sendResponse({ ok: true, item });
        break;
      }
      case "AVU_DELETE_ITEM": {
        const items = await avuDeleteItem(message.id);
        sendResponse({ ok: true, items });
        break;
      }
      case "AVU_GET_SNIPPETS": {
        const snippets = await avuGetSnippets();
        sendResponse({ ok: true, snippets });
        break;
      }
      case "AVU_UPSERT_SNIPPET": {
        const snippet = await avuUpsertSnippet(message.snippet || {});
        sendResponse({ ok: true, snippet });
        break;
      }
      case "AVU_DELETE_SNIPPET": {
        const snippets = await avuDeleteSnippet(message.id);
        sendResponse({ ok: true, snippets });
        break;
      }
      case "AVU_GET_SETTINGS": {
        const settings = await avuGetSettings();
        sendResponse({ ok: true, settings });
        break;
      }
      case "AVU_SAVE_SETTINGS": {
        const settings = await avuSaveSettings(message.settings || {});
        sendResponse({ ok: true, settings });
        break;
      }
      case "AVU_HIDE_LAUNCHER_FOR_HOURS": {
        const settings = await avuGetSettings();
        const hours = Math.max(1, Number(message.hours || settings.launcherHideHours || 4));
        const next = await avuSaveSettings({ launcherHiddenUntil: Date.now() + hours * 3600 * 1000 });
        if (sender?.tab?.id) {
          await safeNotify(sender.tab.id, `悬浮入口已隐藏 ${hours} 小时`);
        }
        sendResponse({ ok: true, settings: next });
        break;
      }
      case "AVU_RESTORE_LAUNCHER": {
        const next = await avuSaveSettings({ launcherHiddenUntil: 0, showLauncher: true });
        sendResponse({ ok: true, settings: next });
        break;
      }
      default:
        sendResponse({ ok: false, error: "unknown message" });
    }
  })().catch((error) => {
    console.warn("[AI Vault] message failed:", error);
    sendResponse({ ok: false, error: String(error) });
  });
  return true;
});

async function safeNotify(tabId, message) {
  try {
    await avuSendTabMessage(tabId, { type: "AVU_TOAST", message });
  } catch (_) {}
}
