// Manifest V3 service worker.
// Jeden skutečný YouTube <video> -> nativní Picture-in-Picture.
// Žádné kopírování streamu ani druhé audio v jiné záložce.

const YOUTUBE_URL = /^https:\/\/(?:www\.|m\.)youtube\.com\//i;
const PLACEMENT_MARGIN = 16;
const PIP_SIZE = { width: 360, height: 220 };

// Je-li PiP okno dostupné přes chrome.windows, zkusíme jej posunout vlevo dolů.
// Standardní video PiP není na všech OS/verzích Chromu v tomto API vidět.
let placement = null;

chrome.action.onClicked.addListener((clickedTab) => {
  // Bez await v handleru – Chrome může předat uživatelské gesto do executeScript.
  void toggleFromAction(clickedTab);
});

chrome.windows.onCreated.addListener((newWindow) => {
  if (!placement || Date.now() > placement.expiresAt) return;
  if (!newWindow.alwaysOnTop || newWindow.id == null) return;

  void moveToBottomLeft(newWindow.id, placement.browserWindowId);
  placement = null;
});

async function toggleFromAction(clickedTab) {
  try {
    let target = clickedTab && YOUTUBE_URL.test(clickedTab.url || "")
      ? clickedTab
      : null;

    // Kliknutí na ikonu může být i z jiného webu: vyber přehrávající YT tab.
    // Nejdřív preferuj záložku, která vydává zvuk, jinak poslední navštívenou.
    if (!target) {
      const candidates = await chrome.tabs.query({
        url: ["https://www.youtube.com/*", "https://m.youtube.com/*"]
      });
      candidates.sort((a, b) =>
        Number(Boolean(b.audible)) - Number(Boolean(a.audible)) ||
        (b.lastAccessed || 0) - (a.lastAccessed || 0)
      );
      target = candidates[0] || null;
    }

    if (!target?.id) {
      await showStatus("YT?", "Otevři na YouTube video a spusť přehrávání.");
      return;
    }

    // Placement začíná PŘED otevřením PiP: onCreated může přijít ihned.
    placement = {
      browserWindowId: target.windowId,
      expiresAt: Date.now() + 5000
    };

    const executions = await chrome.scripting.executeScript({
      target: { tabId: target.id },
      files: ["pip.js"]
    });

    const result = executions?.[0]?.result;

    if (result?.status === "opened") {
      await showStatus("ON", "YouTube Mini běží. Kliknutím ho vypneš.");
    } else if (result?.status === "closed") {
      placement = null;
      await showStatus("OFF", "YouTube Mini vypnuto.");
    } else {
      placement = null;
      await showStatus("!", result?.message || "Nepodařilo se zapnout PiP. Zkus kliknout přímo na kartě YouTube.");
    }
  } catch (error) {
    placement = null;
    console.error("YouTube Mini:", error);
    await showStatus("!", "PiP se nepodařilo spustit. Otevři video na YouTube a klikni znovu.");
  }
}

async function moveToBottomLeft(pipWindowId, sourceWindowId) {
  try {
    if (sourceWindowId == null) return;
    const source = await chrome.windows.get(sourceWindowId);
    if (source.left == null || source.top == null || source.height == null) return;

    // U některých systémů a verzí Chromu je změna pozice PiP zakázaná.
    // V tom případě zůstává PiP funkční a uživatel může okno přesunout myší.
    await chrome.windows.update(pipWindowId, {
      width: PIP_SIZE.width,
      height: PIP_SIZE.height,
      left: source.left + PLACEMENT_MARGIN,
      top: source.top + Math.max(0, source.height - PIP_SIZE.height - PLACEMENT_MARGIN)
    });
  } catch (error) {
    console.debug("Automatické umístění PiP není dostupné:", error);
  }
}

async function showStatus(badge, title) {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: badge === "!" ? "#bb3f35" : "#283d56" }),
    chrome.action.setBadgeText({ text: badge }),
    chrome.action.setTitle({ title })
  ]);
}
