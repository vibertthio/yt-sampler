chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ allQueuePoints: {}, debug: false })
  console.log('Background script (on installed).')
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(changeInfo && changeInfo.status == "complete") {
      console.log("Tab updated: " + tab.url)
      chrome.tabs.sendMessage(tabId, { message: "URL updated", tab })
  }
});