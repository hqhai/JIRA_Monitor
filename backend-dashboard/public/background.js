// Clicking the toolbar icon focuses the dashboard tab if one is open, otherwise opens a new one.
const DASHBOARD = chrome.runtime.getURL('index.html');
chrome.action.onClicked.addListener(async () => {
  const [open] = await chrome.runtime.getContexts({contextTypes: ['TAB'], documentUrls: [DASHBOARD]});
  if (open && open.tabId >= 0) {
    await chrome.tabs.update(open.tabId, {active: true});
    await chrome.windows.update(open.windowId, {focused: true});
    return;
  }
  await chrome.tabs.create({url: DASHBOARD});
});
