const changeLogo = document.getElementById('change-logo')
const debugCheckbox = document.getElementById('debug-checkbox')
const clearStorageButton = document.getElementById('clear-sync')

chrome.storage.local.get('debug', ({ debug }) => {
  debugCheckbox.checked = debug
});

debugCheckbox.addEventListener('click', () => {
  chrome.storage.local.set({ debug: debugCheckbox.checked })
});

// When the button is clicked, inject setPageBackgroundColor into current page
changeLogo.addEventListener('click', async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: replaceYoutubeLogo,
  })
});

clearStorageButton.addEventListener('click', () => {
  chrome.storage.local.clear()
})

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