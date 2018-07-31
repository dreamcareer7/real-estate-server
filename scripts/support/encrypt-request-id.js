const config = require('../../lib/config')
require('../../lib/models/Crypto')

const req_id = process.argv[2]
// console.log(encodeURIComponent(Crypto.encrypt(req_id))

let enc_rechat_id

try {
  enc_rechat_id = encodeURIComponent(Crypto.encrypt(req_id))
}
catch (ex) {
  console.error(ex)
}

const baseUrl = config.url.protocol + '://' + config.url.hostname + '/_'
console.log(`${baseUrl}/requests/${enc_rechat_id})`)
