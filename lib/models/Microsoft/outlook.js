const Context = require('../Context')

const { fetchOutlookBody } = require('./workers/messages/common')
const getClient = require('./client')

/**
 * @param {UUID} microsoft_credential 
 * @param {string[]} message_ids 
 */
async function fetchMessage(microsoft_credential, message_ids, body_only = false) {
  const microsoft = await getClient(microsoft_credential, 'outlook')

  try {
    return await fetchOutlookBody(microsoft, message_ids, body_only)
  } catch (ex) {
    Context.log('Microsoft-BatchGetMessages Failed!', ex)
    throw Error.BadRequest('Microsoft list messages failed!')
  }
}

/**
 * @param {UUID} mcid
 * @param {String} query
 * @param {String?} next
 */
async function search(mcid, query, next) {
  const microsoft = await getClient(mcid, 'outlook')
  const result    = await microsoft.searchThreads(4, query, next)

  return {
    threadKeys: [...new Set(result.messages.map(msg => `${mcid}${msg.conversationId}`))],
    next: result.next
  }
}


module.exports = {
  fetchMessage,
  search
}
