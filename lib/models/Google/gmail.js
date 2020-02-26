const Context = require('../Context')

const { fetchGmailBody } = require('./workers/gmail/common')
const getClient = require('./client')

/**
 * @param {UUID} google_credential 
 * @param {string[]} message_ids 
 */
async function fetchMessage(google_credential, message_ids) {
  const google = await getClient(google_credential, 'gmail')

  try {
    return await fetchGmailBody(google, message_ids)
  } catch (ex) {
    Context.log('Google batch get messages failed!', ex)
    // throw Error.BadRequest('google list Messages failed!')
  }
}

module.exports = {
  fetchMessage
}
