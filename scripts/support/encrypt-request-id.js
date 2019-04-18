const config = require('../../lib/config')
require('../../lib/models/Crypto')

for (const req_id of (process.argv[2] || '').split('\n').map(arg => arg.trim()).filter(x => x && x.length > 0)) {
  let enc_rechat_id
  
  try {
    enc_rechat_id = encodeURIComponent(Crypto.encrypt(req_id))
  }
  catch (ex) {
    console.error(ex)
  }
  
  const baseUrl = config.url.protocol + '://' + config.url.hostname + '/_'
  console.log(`${baseUrl}/requests/${enc_rechat_id}`)
}
