const { Writable } = require('stream')
const config = require('../../lib/config')
const Crypto = require('../../lib/models/Crypto')

function encodeReqId(rid) {
  let enc_rechat_id
  
  try {
    enc_rechat_id = encodeURIComponent(Crypto.encrypt(rid))
  }
  catch (ex) {
    console.error(ex)
  }

  const baseUrl = config.url.protocol + '://' + config.url.hostname + '/_'
  console.log(`${baseUrl}/requests/${enc_rechat_id}`)
}

let buf = ''
process.stdin.pipe(new Writable({
  defaultEncoding: 'utf-8',
  write(chunk, _encoding, cb) {
    chunk = buf + chunk
    buf = ''
    for (const rid of chunk.split('\n').map(a => a.trim()).filter(a => a && a.length > 0)) {
      if (rid.length === 36) {
        encodeReqId(rid)
      } else {
        buf += rid
        break
      }
    }

    cb()
  }
}))
