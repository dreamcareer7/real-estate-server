const { runInContext } = require('../../lib/models/Context/util')
const GoogleCredential = require('../../lib/models/Google/credential/get')

runInContext('microsoft_decrypt', async () => {
  const { access_token } = await GoogleCredential.get(process.argv[2])
  console.log(access_token)
}).then(process.exit, process.exit)
