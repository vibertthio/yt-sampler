const changeLogo = document.getElementById('change-logo')
const debugCheckbox = document.getElementById('debug-checkbox')
const clearStorageButton = document.getElementById('clear-sync')
const logQueuePointsButton = document.getElementById('log-queue-points-button')
const resetQeueusButton = document.getElementById('reset-queues-button')
const shareQueuesButton = document.getElementById('share-queues-button')

function syncStorage() {
  chrome.storage.local.get('debug', ({ debug }) => {
    debugCheckbox.checked = debug
  })
}

function addEvents() {
  
  debugCheckbox.addEventListener('click', () => {
    chrome.storage.local.set({ debug: debugCheckbox.checked })
  })
  
  logQueuePointsButton.addEventListener('click', () => {
    chrome.storage.local.get('allQueuePoints', ({ allQueuePoints }) => {
      console.log('allQueuePoints', allQueuePoints)
    }) 
  })
  
  changeLogo.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: replaceYoutubeLogo,
    })
  })
  
  clearStorageButton.addEventListener('click', () => {
    chrome.storage.local.clear()
  })

  resetQeueusButton.addEventListener('click', () => {

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { message: "Reset queues" }, (res) => {
        console.log(res)
      })
    })
    
  })

  shareQueuesButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { message: "Share queues" }, (res) => {
        console.log(res)
      })
    })
  })
}

function replaceYoutubeLogo() {
  const ytLogo = document.querySelector('#logo-icon')

  if (!ytLogo) {
    return
  }

  const textEl = document.createElement('P')
  textEl.textContent = 'VIBERT THIO'
  textEl.style.fontSize = '1.5rem'
  ytLogo.appendChild(textEl)
  ytLogo.removeChild(ytLogo.children[0])
}

syncStorage()
addEvents()