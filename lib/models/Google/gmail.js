const Context = require('../Context')

const { fetchGmailBody } = require('./workers/gmail/common')
const getClient = require('./client')

async function fetchMessage(gcid, googleMessageIds) {
  const google = await getClient(gcid, 'gmail')

  try {
    return await fetchGmailBody(google, googleMessageIds)
  } catch (ex) {
    Context.log('Google batch get messages failed!', ex)
    throw Error.BadRequest('google list Messages failed!')
  }
}

module.exports = {
  fetchMessage
}
