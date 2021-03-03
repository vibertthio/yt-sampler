console.log('content script.')

const QUEUE_POINT_SIZE = 8
const TAG_HREF = 'https://vibertthio.com'
const TAG = '🔥'
// const TAG = '🔥 Sampler v0.0.1 🔥'

let initialized = false
let video
let duration
let queuePoints = { id: "xxxxxxxxxxx", points: [] }
let isDebug
let tagEl

function updateTagTextContet() {
  if (tagEl) {
    tagEl.textContent = isDebug ? '🚧' : '🔥'
  }
}

function listenStorageChange () {
  chrome.storage.local.get('debug', ({ debug }) => { 
    isDebug = debug
    log('debug: on')
    updateTagTextContet()
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    log("Change in storage area: " + area)
    for (let item of Object.keys(changes)) {
      log(`${item} has changed: [ ${changes[item].oldValue} ] -> [ ${changes[item].newValue} ]`)
      if (item === 'debug') {
        isDebug = changes[item].newValue
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
  if (isDebug) {
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

function appendQueuePoints() {
  // const ytChromeBuottom = document.querySelector('.ytp-chrome-bottom')
  const barContainer = document.querySelector('.ytp-progress-bar-container')

  if (!barContainer) {
    return
  }

  const containerEl = htmlToElement(`<div class="yt-sampler-container"></div>`)
  const linkEl = htmlToElement(`<a class="yt-sampler-name-tag" id="" href="${TAG_HREF}" target="_blank">${TAG + (isDebug ? ' 🚧' : '')}</a>`)
  const queuePointsEl = htmlToElement(`<div class="yt-sampler-qpts"></div>`)

  for (let i = 0; i < queuePoints.points.length; i++) {
    const pt = queuePoints.points[i]
    const ptEl = htmlToElement(`<div class="yt-sampler-qpt"><span>${pt.name}</span></div>`)
    const perfectLeft = pt.start * barContainer.clientWidth - QUEUE_POINT_SIZE * 0.5
    ptEl.style.left = `${100 * perfectLeft / barContainer.clientWidth}%`
    queuePointsEl.appendChild(ptEl)
    bindDragEvents(ptEl, queuePointsEl, i)
  }
  
  containerEl.appendChild(linkEl)
  containerEl.appendChild(queuePointsEl)
  barContainer.appendChild(containerEl)

  tagEl = linkEl
}

function bindDragEvents(el, parent, index) {
  let dragging = false
  let parentWidth
  let parentX
  let start = queuePoints.points[index].start

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
    queuePoints.points[index].start = start
    // chrome.storage.local.set('queue-point')

    video.currentTime = start * duration
  }

  el.onmousedown = mouseDownCallback
}

function bindKeyEvents() {
  const pts = queuePoints.points
  window.addEventListener('keydown', e => {
    if (e.code.substr(0, 5) === 'Digit' && !e.repeat) {
      
      e.stopPropagation()

      const id = Math.round(Number(e.code[5]))
      if (id >= 0  && id <= 9) {
        if (id < pts.length) {
          video.currentTime = pts[id].start * duration
        }
      }
    }
  }, true)
}

function randomizePoints() {
  const pts = queuePoints.points
  for (let i = 1; i < 10; i++) {
    const name = `${i}`
    const start = Math.max(0.05, (i - 1) * 0.1)
    const end = start + Math.random() * 0.2
    pts[i] = { name, start, end }
  }

  pts[0] = {
    name: '0',
    start: 0.9,
    end: 0.91,
  }
}

function init() {
  video = document.querySelector('video')
  duration = video.duration
  queuePoints.id = parseYoutubeId(location.href)
  log(`content script loaded on youtube, ID: ${queuePoints.id}.`)
  listenStorageChange()
  randomizePoints()
  appendQueuePoints()
  bindKeyEvents()

  initialized = true
}

function onLoad(url) {
  if (!url.includes('watch')) {
    return
  }
  let checkVideoProgressBarExist = setInterval(() => {
    let v = document.querySelector('video')
    if (!v || !v.duration) {
      return
    }
    if (!document.querySelector('.ytp-progress-bar-container')) {
      return
    }

    video = v
    duration = v.duration

    if (!initialized) {
      init()
    }
    clearInterval(checkVideoProgressBarExist)
  }, 100)
  console.log('on load', initialized)
}

window.addEventListener('load', () => {
  onLoad(window.location.href)
})
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { tab } = message
  onLoad(tab.url)
});
