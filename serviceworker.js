const map = new Map()
console.log('show dat info 2233')
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('active', event => {
  event.waitUntil(self.clients.claim())
})

self.onmessage = event => {
  console.log('????? onmessage', url)
  if (event.data === 'ping') {
    return
  }
  
  const data = event.data
  const downloadUrl = data.url || self.ServiceWorkerRegistration.scope + Math.random() + '/' + (typeof data === 'string' ? data : data.filename)
  const port = event.ports[0]
  const metadata = new Array(3)

  metadata[1] = data
  metadata[2] = port

  port.onmessage = evt => {
    port.onmessage = null
    metadata[0] = evt.data.readableStream
  }

  map.set(downloadUrl, metadata)
  port.postMessage({ download: downloadUrl})
}

self.onfetch = event => {
  const url = event.request.url
  console.log('????? url', url)
  const hijake = map.get(url)
  if (!hijake) return null
  const [stream, data, port] = hijake
  const responseHeaders = new Headers({
    'Content-Type': 'application/octet-stream; charset=utf-8',
    'Content-Security-Policy': 'default-src "none"',
    'X-Content-Security-Policy': 'default-src "none"',
    'X-XSS-Protection': '1; mode=block'
  })

  let headers = new Headers(data.headers || {})
  if (headers.has('Content-Length')) {
    responseHeaders.set('Content-Length', headers.get('Content-Length'))
  }
  if (headers.has('Content-Disposition')) {
    responseHeaders.set('Content-Disposition', headers.get('Content-Disposition'))
  }
  if (data.size) {
    responseHeaders.set('Content-Length', data.size)
  }
  let filename = typeof data === 'string' ? data : data.filename
  if (filename) {
    filename = encodeURIComponent(filename).replace(/['()']/g, escape).replace(/\*/g, '%2A')
    responseHeaders.set('Content-Disposition', "attachment; filename*=UTF-8''" + filename)
  }
  event.responseWith(new Response(stream, { headers: responseHeaders }))
  port.postMessage({ debug: 'Download started'})
}