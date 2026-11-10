// Manifest V3 service worker.
// Jeden skutečný <video> z YouTube, Kicku nebo Instagramu -> nativní Picture-in-Picture.
// Žádné kopírování streamu ani druhé audio v jiné záložce.

// Podporované weby: musí odpovídat host_permissions a content_scripts v manifestu.
const VIDEO_SITE_PATTERNS = [
  "https://www.youtube.com/*",
  "https://m.youtube.com/*",
  "https://kick.com/*",
  "https://www.kick.com/*",
  "https://www.instagram.com/*",
  "https://instagram.com/*"
];
const VIDEO_SITE_URL = /^https:\/\/(?:(?:www\.|m\.)youtube\.com|(?:www\.)?kick\.com|(?:www\.)?instagram\.com)\//i;
const PLACEMENT_MARGIN = 16;
const PIP_SIZE = { width: 360, height: 220 };

// Je-li PiP okno dostupné přes chrome.windows, zkusíme jej posunout vlevo dolů.
let placement = null;
let activePipTabId = null;

chrome.action.onClicked.addListener((clickedTab) => {
  // Bez await v handleru – Chrome může předat uživatelské gesto do executeScript.
  void toggleFromAction(clickedTab);
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "next_video" || command === "prev_video") {
    void handleNavigationCommand(command === "next_video" ? 1 : -1);
  }
});

// autopip.js hlásí každé otevření/zavření PiP (i automatické a přes křížek).
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "pip-state") return;
  if (message.state === "opened") {
    if (sender?.tab?.id != null) {
      activePipTabId = sender.tab.id;
    }
    void showStatus("ON", "YouTube Mini běží. Kliknutím ho vypneš.");
  } else {
    if (sender?.tab?.id != null && sender.tab.id === activePipTabId) {
      activePipTabId = null;
    }
    void showStatus("OFF", "YouTube Mini vypnuto.");
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === activePipTabId) {
    activePipTabId = null;
  }
});

// Návrat na kartu s videem: automaticky otevřené PiP zavřít.
chrome.tabs.onActivated.addListener(({ tabId }) => {
  void closeAutoPip(tabId);
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  const [tab] = await chrome.tabs.query({ active: true, windowId }).catch(() => []);
  if (tab?.id != null) void closeAutoPip(tab.id, tab.url);
});

chrome.windows.onCreated.addListener((newWindow) => {
  if (!placement || Date.now() > placement.expiresAt) return;
  if (!newWindow.alwaysOnTop || newWindow.id == null) return;

  void moveToBottomLeft(newWindow.id, placement.browserWindowId);
  placement = null;
});

async function handleNavigationCommand(direction) {
  try {
    let targetTabId = activePipTabId;
    if (targetTabId != null) {
      const tab = await chrome.tabs.get(targetTabId).catch(() => null);
      if (!tab || !VIDEO_SITE_URL.test(tab.url || "")) {
        targetTabId = null;
      }
    }

    if (targetTabId == null) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
      if (activeTab && VIDEO_SITE_URL.test(activeTab.url || "")) {
        targetTabId = activeTab.id;
      }
    }

    if (targetTabId == null) {
      const candidates = await chrome.tabs.query({ url: VIDEO_SITE_PATTERNS });
      candidates.sort((a, b) =>
        Number(Boolean(b.audible)) - Number(Boolean(a.audible)) ||
        (b.lastAccessed || 0) - (a.lastAccessed || 0)
      );
      targetTabId = candidates[0]?.id ?? null;
    }

    if (targetTabId != null) {
      await chrome.tabs.sendMessage(targetTabId, {
        type: "navigate-reel",
        direction
      }).catch(() => {});
    }
  } catch (error) {
    console.debug("YouTube Mini: navigace na reel se nezdařila:", error);
  }
}

async function toggleFromAction(clickedTab) {
  try {
    let target = clickedTab && VIDEO_SITE_URL.test(clickedTab.url || "")
      ? clickedTab
      : null;

    // Kliknutí na ikonu může být i z jiného webu: vyber kartu s videem.
    // Nejdřív preferuj záložku, která vydává zvuk, jinak poslední navštívenou.
    if (!target) {
      const candidates = await chrome.tabs.query({
        url: VIDEO_SITE_PATTERNS
      });
      candidates.sort((a, b) =>
        Number(Boolean(b.audible)) - Number(Boolean(a.audible)) ||
        (b.lastAccessed || 0) - (a.lastAccessed || 0)
      );
      target = candidates[0] || null;
    }

    if (!target?.id) {
      await showStatus("?", "Otevři video na YouTube, Kicku nebo Instagramu a spusť přehrávání.");
      return;
    }

    // Pokud jde o Instagram, pojistíme injektování fixu pro běh na pozadí do MAIN worldu
    if (/instagram\.com/i.test(target.url || "")) {
      await chrome.scripting.executeScript({
        target: { tabId: target.id },
        files: ["instagram-fix.js"],
        world: "MAIN"
      }).catch(() => {});
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
      activePipTabId = target.id;
      await showStatus("ON", "YouTube Mini běží. Kliknutím ho vypneš.");
    } else if (result?.status === "closed") {
      placement = null;
      if (activePipTabId === target.id) activePipTabId = null;
      await showStatus("OFF", "YouTube Mini vypnuto.");
    } else {
      placement = null;
      await showStatus("!", result?.message || "Nepodařilo se zapnout PiP. Zkus kliknout přímo na kartě s videem.");
    }
  } catch (error) {
    placement = null;
    console.error("YouTube Mini:", error);
    await showStatus("!", "PiP se nepodařilo spustit. Otevři video na YouTube, Kicku nebo Instagramu a klikni znovu.");
  }
}

async function closeAutoPip(tabId, knownUrl) {
  try {
    const url = knownUrl ?? (await chrome.tabs.get(tabId)).url;
    if (!VIDEO_SITE_URL.test(url || "")) return;

    // Běží ve stejném izolovaném světě jako pip.js, takže vidí jeho příznak
    // ručně zapnutého PiP. Ruční PiP necháváme otevřené.
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (!document.pictureInPictureElement || globalThis.__ytMiniManualPip) return;
        return document.exitPictureInPicture().catch(() => {});
      }
    });
  } catch (error) {
    // Karta se načítá, byla zahozena nebo zavřena – není co zavírat.
    console.debug("YouTube Mini: zavření PiP po návratu se nepovedlo:", error);
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
