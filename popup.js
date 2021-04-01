const changeLogo = document.getElementById('change-logo')
const debugCheckbox = document.getElementById('debug-checkbox')
const sequencerCheckbox = document.getElementById('sequencer-checkbox')
const clearStorageButton = document.getElementById('clear-sync')
const logQueuePointsButton = document.getElementById('log-queue-points-button')
const resetQeueusButton = document.getElementById('reset-queues-button')
const shareQueuesButton = document.getElementById('share-queues-button')
const startPlayerButton = document.getElementById('start-player-button')
const recordSamplesButton = document.getElementById('record-samples-button')

function syncStorage() {
  chrome.storage.local.get(['debug', 'sequencer'], ({ debug, sequencer }) => {
    debugCheckbox.checked = debug
    sequencerCheckbox.checked = sequencer
  })
}

function addEvents() {
  
  debugCheckbox.addEventListener('click', () => {
    chrome.storage.local.set({ debug: debugCheckbox.checked })
  })

  sequencerCheckbox.addEventListener('click', () => {
    chrome.storage.local.set({ sequencer: sequencerCheckbox.checked })
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

  startPlayerButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { message: "Start player" }, (res) => {
        console.log(res)
      })
    })
  })

  recordSamplesButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { message: "Record samples" }, (res) => {
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