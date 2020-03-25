const MicrosoftCredential = require('./credential')
const MicrosoftMessage = require('./message')
const getClient = require('./client')


const test = async (req, res) => {
  const cid = 'debcc087-fd59-4635-8fda-d65264ee82cf'

  const microsoftCredential = await MicrosoftCredential.get(cid)
  const microsoft = await getClient(microsoftCredential.id, 'outlook')

  const message = {
    message_id: 'AAMkAGMzNDg4YmM0LTc5ZTYtNGFlYy1hNzlmLTVkODM2ZDM0MzU5OQBGAAAAAAAuCbsCt-UNSalguiOYZHWEBwDC2sKTjOSNTpsi5KIF1ip6AAAAAAEMAADC2sKTjOSNTpsi5KIF1ip6AAFFzxe8AAA='
  }

  const attachment = {
    name: 'my_attachment_1'
  }

  await microsoft.uploadSession(message.message_id, attachment)


  return res.json({})
}


module.exports = {
  test
}