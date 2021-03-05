console.log('content script.')

const DEFAULT_QUEUE_POINTS_COUNT = 10
const QUEUE_POINT_SIZE = 8
const TAG_HREF = 'https://vibertthio.com'
const TAG = '🔥'
// const TAG = '🔥 Sampler v0.0.1 🔥'

const state = {
  isDebug: true,
  initialized: false,
  youtubeId: "",
  queuePoints: [],
}
const elements = {
  video: {},
  tagEl: {},
}

function updateTagTextContet() {
  if (elements.tagEl) {
    elements.tagEl.textContent = state.isDebug ? '🚧' : '🔥'
  }
}

function listenStorageChange () {
  chrome.storage.local.get('debug', ({ debug }) => { 
    state.isDebug = debug
    log('debug: on')
    updateTagTextContet()
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    log("Change in storage area: " + area)
    for (let item of Object.keys(changes)) {
      log(`${item} has changed: [ ${changes[item].oldValue} ] -> [ ${changes[item].newValue} ]`)
      if (item === 'debug') {
        state.isDebug = changes[item].newValue
        updateTagTextContet()
      }
    }
  })
}

function log() {
  let input = ''
  for (let i = 0; i < arguments.length; i++) {
    input += arguments[i] + " "
  }
  if (state.isDebug) {
    console.log("[yt-sampler]", input);
  }
}

function htmlToElement(html) {
  let template = document.createElement('template')
  html = html.trim()
  template.innerHTML = html
  return template.content.firstChild
}

function parseYoutubeId(url) {
  // https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  var match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : false
}

function appendCustomElements() {
  // const ytChromeBuottom = document.querySelector('.ytp-chrome-bottom')
  const barContainer = document.querySelector('.ytp-progress-bar-container')

  if (!barContainer) {
    return
  }

  const containerEl = htmlToElement(`<div class="yt-sampler-container"></div>`)
  const tagEl = htmlToElement(`
    <button class="yt-sampler-name-tag" href="${TAG_HREF}" target="_blank">${TAG + (state.isDebug ? ' 🚧' : '')}</button>
  `)

  const queuePointsEl = htmlToElement(`<div class="yt-sampler-qpts"></div>`)

  tagEl.addEventListener('click', () => {
    queuePointsEl.classList.toggle('hidden')
  })

  elements.tagEl = tagEl

  for (let i = 0; i < state.queuePoints.length; i++) {
    const pt = state.queuePoints[i]
    const ptEl = htmlToElement(`<div class="yt-sampler-qpt"><span>${pt.name}</span></div>`)
    const perfectLeft = pt.start * barContainer.clientWidth - QUEUE_POINT_SIZE * 0.5

    ptEl.style.left = `${100 * perfectLeft / barContainer.clientWidth}%`
    queuePointsEl.appendChild(ptEl)
    bindDragEvents(ptEl, queuePointsEl, i)
  }
  
  containerEl.appendChild(tagEl)
  containerEl.appendChild(queuePointsEl)
  barContainer.appendChild(containerEl)
}

function bindDragEvents(el, parent, index) {
  let dragging = false
  let parentWidth
  let parentX
  let start = state.queuePoints[index].start

  function mouseDownCallback() {
    log('mouse down')
    dragging = true
    parentWidth = parent.clientWidth
    parentX = parent.getBoundingClientRect().x

    document.onmousemove = mouseMoveCallback
    document.onmouseup = mouseUpCallback
  }

  function mouseMoveCallback(e) {
    log('mouse move')
    if (!dragging) {
      return
    }
    const dX = Math.max(Math.min(e.clientX - parentX, parentWidth), 0)
    const perfectLeft = dX - el.clientWidth * 0.5
    start = dX / parentWidth
    
    el.style.left = `${100 * perfectLeft / parentWidth}%`
  }

  function mouseUpCallback() {
    log('mouse up')
    dragging = false
    document.onmousemove = null
    document.onmouseup = null

    // update the queue points
    state.queuePoints[index].start = start
    // chrome.storage.local.set('queue-point')

    elements.video.currentTime = start * elements.video.duration
  }

  el.onmousedown = mouseDownCallback
}

function bindKeyEvents() {
  const pts = state.queuePoints
  window.addEventListener('keydown', e => {
    if (e.code.substr(0, 5) === 'Digit') {
      
      e.stopPropagation()

      const id = Math.round(Number(e.code[5]))
      if (id >= 0  && id <= 9) {
        if (id < pts.length) {
          elements.video.currentTime = pts[id].start * elements.video.duration
        }
      }
    }
  }, true)
}

function initializeDefaultPoints() {

  const pts = state.queuePoints
  for (let i = 0; i < DEFAULT_QUEUE_POINTS_COUNT; i++) {
    const name = `${i}`
    const start = i / (DEFAULT_QUEUE_POINTS_COUNT + 1)
    const end = null
    pts[i] = { name, start, end }
  }

  pts[0].start = DEFAULT_QUEUE_POINTS_COUNT / (DEFAULT_QUEUE_POINTS_COUNT + 1)

  log('randonmized points')
}

/**
 * Executed when a new video is opened
 */
function init() {

  elements.video = document.querySelector('video')
  state.youtubeId = parseYoutubeId(location.href)
  log(`content script loaded on youtube, ID: ${state.youtubeId}.`)

  listenStorageChange()
  initializeDefaultPoints()
  appendCustomElements()
  bindKeyEvents()

  state.initialized = true
}

/**
 * Executed window is loaded or URL is changed.
 * Check if a video is presented, and call the "init" after all necessary elements are loaded.
 */
function onLoad(url) {
  
  // don't wait for the element when not in "watch" pages
  if (!url.includes('watch')) return

  // keep checking if the bar is loaded
  let checkVideoProgressBarExist = setInterval(() => {
    if (!document.querySelector('video')) return

    const barContainer = document.querySelector('.ytp-progress-bar-container')
    if (!barContainer || barContainer.clientWidth === 0) return

    if (!state.initialized) {
      init()
    }
    clearInterval(checkVideoProgressBarExist)
  }, 100)
}

window.addEventListener('load', () => {
  log('window loaded')
  onLoad(window.location.href)
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('chrome.runtime onMessage', message)
  onLoad(window.location.href)
});
