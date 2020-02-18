const Context = require('../Context')

const { fetchOutlookBody } = require('./workers/messages/common')
const getClient = require('./client')

/**
 * @param {UUID} microsoft_credential 
 * @param {string[]} message_ids 
 */
async function fetchMessage(microsoft_credential, message_ids) {
  const microsoft = await getClient(microsoft_credential, 'outlook')

  try {
    return await fetchOutlookBody(microsoft, message_ids)
  } catch (ex) {
    Context.log('Microsoft-BatchGetMessages Failed!', ex)
    throw Error.BadRequest('Microsoft list messages failed!')
  }
}

module.exports = {
  fetchMessage
}
