console.log('content script.')

const SEQUENCER_STEPS = 16
const SAMPLES_COUNT = 10
const DEFAULT_QUEUE_POINTS_COUNT = 10
const DEFAULT_QUEUE_LENGTH = 0.008
const QUEUE_POINT_SIZE = 8
const TAG_HREF = 'https://vibertthio.com'
const TAG = '🔥'
const SHIFT_ADJUST_SCALE = 0.01
const QUEUE_POSITION_TEXT_PRECISION = 3
// const TAG = '🔥 Sampler v0.0.1 🔥'

/**
 * States and global variables.
 */
const state = {
  isDebug: false,
  oneShot: true,
  initialized: false,
  youtubeId: "",
  queuePoints: null,
  players: null,
  sequencer: false,
  sequencerStarted: false,
  sequencerMatrix: null,
}
const elements = {
  video: null,
  tagEl: null,
  ptEndEls: null,
}


/**
 * Internal log method. Activate it in the extension popup.
 */
function log() {
  let input = ''
  for (let i = 0; i < arguments.length; i++) {
    input += arguments[i] + " "
  }
  if (state.isDebug) {
    console.log("[yt-sampler]", input);
  }
}

/**
 * Create a new element from a string written in HTML
 * @param {string} html 
 * @returns {HTMLElement} the created element
 */
function htmlToElement(html) {
  let template = document.createElement('template')
  html = html.trim()
  template.innerHTML = html
  return template.content.firstChild
}

/**
 * Parse a string of url from YouTube video to get the video ID
 * @param {string} url 
 * @returns YouTube video ID
 */
function parseYoutubeId(url) {
  // https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
  var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  var match = url.match(regExp)
  return match && match[7].length === 11 ? match[7] : false
}

/**
 * Get the duration of the current video element.
 */
function getVideoDuration() {
  if (!elements.video || !elements.video.duration) return 0
  return elements.video.duration
}


/**
 * Executed when a new video is opened.
 */
function init() {

  elements.video = document.querySelector('video')
  state.youtubeId = parseYoutubeId(location.href)
  log(`content script loaded on youtube, ID: ${state.youtubeId}.`)

  appendCustomElements()
  bindKeyEvents()
  initializeQueuePoints()

  getAndListenStorageChange()
  
  state.initialized = true
}

function toggleQueuePointEndingElements(show = true) {
  if (!elements.ptEndEls) return
  elements.ptEndEls.forEach(el => {
    if (!show) {
      el.classList.add('hidden')
    } else {
      el.classList.remove('hidden')
    }
  })
  
}

function getAndListenStorageChange() {

  function setSequencer(seq) {
    state.sequencer = seq
    if (state.sequencer) {
      elements.playerEl.style.display = 'block'
      toggleQueuePointEndingElements(true)
    } else {
      elements.playerEl.style.display = 'none'
      toggleQueuePointEndingElements(false)
    }
  }

  chrome.storage.local.get(['debug', 'sequencer'], ({ debug, sequencer }) => { 
    state.isDebug = debug
    setSequencer(sequencer)

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
      if (item === 'sequencer') {
        setSequencer(changes[item].newValue)
      }
    }
  })
}

function updateTagTextContet() {
  if (elements.tagEl) {
    elements.tagEl.textContent = state.isDebug ? '🚧' : '🔥'
  }
}

function updateQueuePointsStorage() {
  
  if (chrome.storage === undefined) return

  chrome.storage.local.get('allQueuePoints', ({ allQueuePoints }) => {
    const q = allQueuePoints || {}
    q[state.youtubeId] = state.queuePoints
    chrome.storage.local.set({ 
      allQueuePoints: q
    })
  })
}

function initializeQueuePoints() {
  chrome.storage.local.get('allQueuePoints', ({ allQueuePoints }) => {
    if (allQueuePoints && allQueuePoints[state.youtubeId]) {
      log('Get queue points from local storage.')
      state.queuePoints = allQueuePoints[state.youtubeId]
    } else {
      log('Initialize default queue points.')
      initializeDefaultQueuePoints()
    }

    // check data from URL
    getDataFromUrl()

    appendQueuePointsElements()
  })
}

function initializeDefaultQueuePoints() {
  log('Initialized default points.')

  state.queuePoints = []
  const pts = state.queuePoints

  for (let i = 0; i < DEFAULT_QUEUE_POINTS_COUNT; i++) {
    const name = `${i}`
    const start = i / (DEFAULT_QUEUE_POINTS_COUNT + 1)
    const end = start + DEFAULT_QUEUE_LENGTH
    pts[i] = { name, start, end }
  }

  pts[0].start = DEFAULT_QUEUE_POINTS_COUNT / (DEFAULT_QUEUE_POINTS_COUNT + 1)
  pts[0].end = pts[0].start + DEFAULT_QUEUE_LENGTH 
}

function appendCustomElements() {

  const barContainer = document.querySelector('.ytp-progress-bar-container')

  if (!barContainer) {
    return
  }

  if (elements.containerEl) elements.containerEl.remove()
  

  const containerEl = htmlToElement(`<div class="yt-sampler-container"></div>`)
  const tagEl = htmlToElement(`
    <button class="yt-sampler-name-tag" href="${TAG_HREF}" target="_blank">${TAG + (state.isDebug ? ' 🚧' : '')}</button>
  `)
  

  const playerEl = createSequencerElement()

  barContainer.appendChild(playerEl)
  containerEl.appendChild(tagEl)
  barContainer.appendChild(containerEl)

  tagEl.addEventListener('click', () => {
    elements.queuePointsEl.classList.toggle('hidden')
    startAudio()
  })


  elements.tagEl = tagEl
  elements.containerEl = containerEl
  elements.barContainer = barContainer
}

function createSequencerElement() {

  
  
  if (elements.playerEl) elements.playerEl.remove()

  const playerEl = htmlToElement(`
    <div class="yt-sampler-interface-container">
      <div>recorded samples</div>
    </div>
  `)
  playerEl.style.display = 'none'
  const controlDiv = htmlToElement(`
    <div id="sequencer-control-div"></div>
  `)
  const button = htmlToElement(`
    <button id="record-button">record</button>
  `)

  button.addEventListener('click', () => {
    console.log('record button clicked')
    recordSamples()
  })

  controlDiv.appendChild(button)
  playerEl.appendChild(controlDiv)
  
  state.sequencerMatrix = []

  for (let i = 0; i <= SAMPLES_COUNT; i++) {
    
    state.sequencerMatrix[i] = []

    const div = document.createElement('DIV')
    div.id = `sequencer-div-${i < 10 ? i : "t"}`

    div.appendChild(htmlToElement(`
      <span>${i < 10 ? i : "t"}</span>
    `))

    for (let j = 0; j < SEQUENCER_STEPS; j++) {

      const step = i
      const sampleId = j

      const checkbox = document.createElement('INPUT')
      checkbox.type = 'checkbox'
      checkbox.checked = false
      div.appendChild(checkbox)

      if (i === SAMPLES_COUNT) continue

      state.sequencerMatrix[i][j] = 0
      checkbox.addEventListener('click', () => {
        if (checkbox.checked) {
          state.sequencerMatrix[step][sampleId] = 1
        } else {
          state.sequencerMatrix[step][sampleId] = 0
        }

        // console.log(state.sequencerMatrix)
      })
    }

    playerEl.appendChild(div)
  }
  

  elements.playerEl = playerEl
  return playerEl
}

function appendSequencerInterface() {
  const controlDiv = document.getElementById('sequencer-control-div')
  const button = htmlToElement(`
    <button>start</button>
  `)
  const timeDiv = document.getElementById('sequencer-div-t')

  const seq = new Tone.Sequence((time, step) => {
    // timeDiv.children[step + 1].checked = !timeDiv.children[step + 1].checked
    for (let s = 0; s < SEQUENCER_STEPS; s++) {
      timeDiv.children[s + 1].checked = false
      if (Number(s) === Number(step)) {
        timeDiv.children[s + 1].checked = true
      }
    }
    
    for (let i = 0; i < SAMPLES_COUNT; i++) {
      if (state.sequencerMatrix[i][step] === 1) {
        state.players[i].start(time)
      }
    }
  }, Array(SEQUENCER_STEPS).fill(null).map((_, i) => i), '16n')
  Tone.Transport.start()

  button.addEventListener('click', () => {
    if (state.sequencerStarted) {
      seq.stop()
      state.sequencerStarted = false
      button.textContent = 'start'
    } else {
      seq.start('+0.1')
      state.sequencerStarted = true
      button.textContent = 'stop'
    }
  })

  controlDiv.appendChild(button)
}

function appendQueuePointsElements() {

  const { barContainer } = elements

  const queuePointsEl = htmlToElement(`<div class="yt-sampler-qpts"></div>`)
  elements.ptEndEls = []
  for (let i = 0; i < state.queuePoints.length; i++) {
    const pt = state.queuePoints[i]
    const ptEl = htmlToElement(`
      <div class="yt-sampler-qpt">
        <span class="qpt-name">${pt.name}</span>
        <span class="qpt-position hidden">${
          (pt.start * getVideoDuration()).toFixed(QUEUE_POSITION_TEXT_PRECISION)
        }</span>
      </div>
    `)
    const ptEndEl = htmlToElement(`<div class="yt-sampler-qpt yt-sampler-qpt-end hidden"></div>`)

    const perfectLeft = pt.start * barContainer.clientWidth - QUEUE_POINT_SIZE * 0.5
    const perfectEndLeft = pt.end * barContainer.clientWidth - QUEUE_POINT_SIZE * 0.5

    ptEl.style.left = `${100 * perfectLeft / barContainer.clientWidth}%`
    ptEndEl.style.left = `${100 * perfectEndLeft / barContainer.clientWidth}%`

    // if (!state.oneShot) {
    //   ptEndEl.classList.add('hidden')
    // }

    elements.ptEndEls[i] = ptEndEl

    queuePointsEl.appendChild(ptEl)
    queuePointsEl.appendChild(ptEndEl)
    bindDragEvents(ptEl, ptEndEl, queuePointsEl, i)
  }

  if (elements.queuePointsEl) elements.queuePointsEl.remove()

  elements.queuePointsEl = queuePointsEl
  elements.containerEl.appendChild(queuePointsEl)
}

function bindDragEvents(el, endEl, parent, index) {
  let dragging = false
  let parentWidth
  let parentX
  let start = state.queuePoints[index].start
  let end = state.queuePoints[index].end

  el.onmousedown = (e) => {
    log('mouse down')
    dragging = true
    parentWidth = parent.clientWidth
    parentX = parent.getBoundingClientRect().x

    const shift = e.shiftKey
    const initialStart = start
    const positionSpan = e.target.children[1]

    positionSpan.classList.remove('hidden')

    document.onmousemove = (e) => {
      log('mouse move')
      if (!dragging) {
        return
      }

      const mX = e.clientX
      
      let dX = Math.max(Math.min(mX - parentX, parentWidth), 0)
      
      if (shift) {
        dX = initialStart * parentWidth + (dX - initialStart * parentWidth) * SHIFT_ADJUST_SCALE
      }


      const perfectLeft = dX - el.clientWidth * 0.5
      const perfectEndLeft = perfectLeft + (end - start) * parentWidth

      const newStart = dX / parentWidth
      end = end + (newStart - start)
      start = newStart
      
      positionSpan.textContent = (start * getVideoDuration()).toFixed(QUEUE_POSITION_TEXT_PRECISION)
      el.style.left = `${100 * perfectLeft / parentWidth}%`
      endEl.style.left = `${100 * perfectEndLeft / parentWidth}%`
    }

    document.onmouseup = () => {
      log('mouse up')

      positionSpan.classList.add('hidden')
      

      dragging = false
      document.onmousemove = null
      document.onmouseup = null
  
      // update the queue points
      state.queuePoints[index].start = start
      state.queuePoints[index].end = end
      // chrome.storage.local.set('queue-point')
  
      elements.video.currentTime = start * elements.video.duration

      updateQueuePointsStorage()
      addDataToUrl()
    }
  }
  
  endEl.onmousedown = () => {
    dragging = true
    parentWidth = parent.clientWidth
    parentX = parent.getBoundingClientRect().x

    document.onmousemove = (e) => {
      const dX = Math.max(Math.min(e.clientX - parentX, parentWidth), 0)
      const perfectLeft = dX - el.clientWidth * 0.5
      end = dX / parentWidth
      endEl.style.left = `${100 * perfectLeft / parentWidth}%`
    }
    document.onmouseup = () => {

      

      dragging = false
      state.queuePoints[index].end = end
      document.onmousemove = null
      document.onmouseup = null

      updateQueuePointsStorage()
    }
  }
}

function addDataToUrl() {
  let str = '#'
  for (let i = 0; i < state.queuePoints.length; i++) {
    const pt = state.queuePoints[i]
    const perct = pt.start.toFixed(QUEUE_POSITION_TEXT_PRECISION)
    str += `q${i}=${perct}`
    if (i !== state.queuePoints.length - 1) str += ','
  }
  window.history.replaceState(undefined, undefined, str)
}

function getDataFromUrl() {
  if (!window.location.hash) return
  const hash = window.location.hash.substr(1)
  const hashes = {}
  hash.split(',').forEach(str => {
    const [id, start] = str.split('=')
    hashes[id] = start
  })
  for (let i = 0; i < state.queuePoints.length; i++) {
    const pt = state.queuePoints[i]
    if (hashes[`q${i}`]) {
      pt.start = Number(hashes[`q${i}`])
    } 
  }
}

function getUrlVariables (name) {
  const vars = []
  let hash
  let hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&')
  
  for(let i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=')
    hash[1] = unescape(hash[1])
    vars.push(hash[0])
    vars[hash[0]] = decodeURIComponent(hash[1])
  }
  if (vars.indexOf(name) >= 0) {
    return vars[name];
  } else {
    return null;
  }
}



function startAudio() {
  Tone.start()
}

let playerIndex = 0
function startPlayer() {
  console.log('start player', playerIndex)
  state.players[playerIndex].start()
  playerIndex = (playerIndex + 1) % state.players.length
}

/**
 * Pause the video and record every part.
 */
function recordSamples() {

  if (state.players !== null) {
    log('already recorded.')
    return
  }
  
  elements.video.pause()

  const stream = Tone.context.createMediaElementSource(elements.video)
  const gainNode = Tone.context.createGain()
  const gain = new Tone.Gain()
  
  stream.connect(gainNode)
  Tone.connect(gainNode, gain)
  gain.toDestination()

  const recorder = new Tone.Recorder()
  gain.connect(recorder)

  state.players = []
  let recordStartTime = 0

  for (let i = 0; i < state.queuePoints.length; i++) {
    const pt = state.queuePoints[i]
    
    const recordedLength = elements.video.duration * (pt.end - pt.start) * 1000
    const id = i

    setTimeout(() => {
      console.log('record queue point', id, pt)

      recorder.start()
      elements.video.currentTime = pt.start * elements.video.duration
      elements.video.play()

      setTimeout(async () => {
        elements.video.pause()
        const recording = await recorder.stop()
        
        console.log('recording finish')
        const url = URL.createObjectURL(recording)
        console.log('recording', recording)
        console.log('url', url)
        
        const player = new Tone.Player(url).toDestination()
        state.players.push(player)

        const button = htmlToElement(`<button>${id}<button>`)
        document.getElementById(`sequencer-div-${id}`).appendChild(button)
        button.addEventListener('click', () => {
          player.start()
        })

      }, recordedLength)
      
    }, recordStartTime)

    recordStartTime += 1.1 * recordedLength
  }

  appendSequencerInterface()
}


/**
 * Bind all the keyboard events on the web page.
 */
function bindKeyEvents() {
  window.addEventListener('keydown', e => {
    if (e.code.substr(0, 5) === 'Digit') {
      
      e.stopPropagation()

      const id = Math.round(Number(e.code[5]))
      if (id >= 0  && id <= 9) {
        if (id < state.queuePoints.length) {
          elements.video.currentTime = state.queuePoints[id].start * elements.video.duration
        }
      }
    }
  }, true)
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

    if (!state.initialized || parseYoutubeId(location.href) !== state.youtubeId) {
      init()
    }
    clearInterval(checkVideoProgressBarExist)
  }, 100)
}

window.addEventListener('load', () => {
  log('window loaded')
  onLoad(window.location.href)
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const { message } = request
  log('chrome.runtime onMessage', message)

  if (message === 'URL updated') {
    onLoad(window.location.href)
  } else if (message === 'Reset queues') {
    initializeDefaultQueuePoints()
    appendQueuePointsElements()
    updateQueuePointsStorage()
  } else if (message === 'Share queues') {
    addDataToUrl()
  } else if (message === 'Start player') {
    startPlayer()
  } else if (message === 'Record samples') {
    recordSamples()
  }
});
