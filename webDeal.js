let mitmTransporter= null
let streamSaver= null

function makeIframe(src) {
  if (!src) throw new Error("meh");
  const iframe = document.createElement("iframe");
  iframe.hidden = true;
  iframe.src = src;
  iframe.name = "iframe";
  iframe.isIframe = true;
  iframe.postMessage = (...args) => window.postMessage(...args);
  iframe.addEventListener(
    "load",
    () => {
      console.log('iframe load')
      iframe.loaded = true;
    },
    { once: true }
  );
  document.body.appendChild(iframe);
  return iframe;
}
function loadTransporter() {
  if (!mitmTransporter) {
    console.log('load trasporter')
    mitmTransporter = makeIframe(streamSaver.mitm);
  }
}
function createWriteStream(filename, options, size) {
  console.log('hello create')
  let opts = {
    size: null,
    pathname: options.pathname,
    WritableStrategy: undefined,
    readableStrategy: undefined,
  };
  let byteWritten = 0;
  let downloadUrl = null;
  let channel = null;
  let ts = null;

  loadTransporter();

  channel = new MessageChannel();

  const response = {
    transferringReadable: true,
    pathname:
      opts.pathname || Math.random().toString().slice(-6) + "/" + filename,
    headers: {
      "Content-Type": "application/octet-stream; charset=utf-8",
      "Content-Disposition": "attachment; filename*=UTF-8" + filename,
    },
  };
  console.log('showdata info', response)

  const args = [response, "*", [channel.port2]];

  const transfromer = undefined;
  ts = new streamSaver.TransformStream(
    transfromer,
    opts.WritableStrategy,
    opts.readableStrategy
  );
  const readableStream = ts.readable;
  channel.port1.postMessage({ readableStream }, [readableStream]);
  channel.port1.onmessage = (evt) => {
    console.log('channel', evt)
    if (evt.data.download) {
      makeIframe(evt.data.download);
    }
  };

  if (mitmTransporter.loaded) {
    console.log('hello loaded')
    mitmTransporter.postMessage(...args);
  } else {
    mitmTransporter.addEventListener(
      "load",
      () => {
        mitmTransporter.postMessage(...args);
      },
      {
        once: true,
      }
    );
  }
  return new streamSaver.WritableStream(
    {
      write(chunk) {
        console.log('hello wirte')
        if (!(chunk instanceof Uint8Array)) {
          throw new TypeError("can only write Uint8Arrays");
        }
        channel.port1.postMessage(chunk);
        byteWritten += chunk.length;

        if (downloadUrl) {
          location.href = downloadUrl;
          downloadUrl = null;
        }
      },
      close() {
        channel.port1.postMessage("end");
      },
      abort() {},
    },
    opts.WritableStrategy
  );
}

streamSaver = {
  createWriteStream: createWriteStream,
  WritableStream: global ? global.WritableStream : window.WritableStream,
  mitm: "https://linlanly.github.io",
};
Object.defineProperty(streamSaver, 'TransformStream', {
  configurable: false,
  writable: false,
  value: global ? global.TransformStream : window.TransformStream
})

export default streamSaver