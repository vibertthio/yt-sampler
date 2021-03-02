const QUEUE_POINT_SIZE = 8
// const TAG = '🔥 Sampler v0.0.1 🔥'
const TAG = '🔥'
const TAG_HREF = 'https://vibertthio.com'

function youtubeSamplerInitialize() {

  const video = document.querySelector('video')
  const duration = video.duration

  const queuePoints = {
    id: "xxxxxxxxxxx",
    points: [],
  }

  function isDebug () {
    return localStorage['yt-loop-debug'] === 'true' ? true : false
  }

  function log() {
    let input = ''
    for (let i = 0; i < arguments.length; i++) {
      input += arguments[i] + " "
    }
    if (isDebug()) {
      clog.apply(console, ["[LOOPER FOR YOUTUBE]", input]);
      ytl.logging.push(input);
    }
  }

  function htmlToElement(html) {
    let template = document.createElement('template')
    html = html.trim()
    template.innerHTML = html
    return template.content.firstChild
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

    const containerEl = htmlToElement(`
      <div class="yt-sampler-container">
        <p class="yt-sampler-name-tag">
          <a href="${TAG_HREF}" target="_blank">${TAG + (isDebug() ? ' 🚧' : '')}</a>
        </p>
      </div>
    `)

    const queuePointsEl = htmlToElement(`<div class="yt-sampler-qpts"></div>`)

    for (let i = 0; i < queuePoints.points.length; i++) {
      const pt = queuePoints.points[i]
      const ptEl = htmlToElement(`<div class="yt-sampler-qpt"><span>${pt.name}</span></div>`)
      const perfectLeft = pt.start * barContainer.clientWidth - QUEUE_POINT_SIZE * 0.5
      ptEl.style.left = `${100 * perfectLeft / barContainer.clientWidth}%`
      queuePointsEl.appendChild(ptEl)
      bindDragEvents(ptEl, queuePointsEl, i)

      
    }
    
    containerEl.appendChild(queuePointsEl)
    barContainer.appendChild(containerEl)
  }

  function bindDragEvents(el, parent, index) {
    let dragging = false
    let parentWidth
    let parentX
    let start = queuePoints.points[index].start

    function mouseDownCallback() {
      console.log('mouse down')
      dragging = true
      parentWidth = parent.clientWidth
      parentX = parent.getBoundingClientRect().x

      document.onmousemove = mouseMoveCallback
      document.onmouseup = mouseUpCallback
    }

    function mouseMoveCallback(e) {
      console.log('mouse move')
      if (!dragging) {
        return
      }
      const perfectLeft = (e.clientX - parentX) - el.clientWidth * 0.5
      start = (e.clientX - parentX) / parentWidth
      
      el.style.left = `${100 * perfectLeft / parentWidth}%`
    }

    function mouseUpCallback() {
      console.log('mouse up')
      dragging = false
      document.onmousemove = null
      document.onmouseup = null

      queuePoints.points[index].start = start
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
  

  randomizePoints()
  appendQueuePoints()
  bindKeyEvents()
  
  log(`content script loaded on youtube, ID: ${parseYoutubeId(location.href)}.`)
}

function youtubeSamplerSetDebug(bool) {
  if (bool == true) {
    localStorage['yt-sampler-debug'] = true;
  } else {
    localStorage['yt-sampler-debug'] = false;
    localStorage.removeItem('yt-sampler-debug');
  }
  window.location.reload();
}

window.addEventListener('load', () => {
  let checkVideoProgressBarExist = setInterval(() => {
    if (!document.querySelector('video')) {
      return
    }
    if (!document.querySelector('.ytp-progress-bar-container')) {
      return
    }
    youtubeSamplerInitialize()
    clearInterval(checkVideoProgressBarExist)
  }, 100)
})
