let color = '#3aa757';

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ color, debug: false });
  console.log('Default background color set to %cgreen', `color: ${color}`);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
  if(changeInfo && changeInfo.status == "complete"){
      console.log("Tab updated: " + tab.url);
      chrome.tabs.sendMessage(tabId, { tab });
  }
});