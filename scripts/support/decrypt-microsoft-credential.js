const { runInContext } = require('../../lib/models/Context/util')
const MicrosoftCredential = require('../../lib/models/Microsoft/credential/get')

runInContext('microsoft_decrypt', async () => {
  const { access_token } = await MicrosoftCredential.get(process.argv[2])
  console.log(access_token)
}).then(process.exit, process.exit)
