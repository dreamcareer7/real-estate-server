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
    throw Error.BadRequest('google list Messages failed!')
  }
}

/**
 * @param {UUID} gcid
 * @param {string} query
 * @param {string=} next
 */
async function search(gcid, query, next) {
  const google = await getClient(gcid, 'gmail')
  const result = await google.searchThreads(25, query, next)

  return {
    threadKeys: result.threads.map(thread => `${gcid}${thread.id}`),
    next: result.next
  }
}

/**
 * @param {UUID} gcid
 * @param {string} contact email_address
 */
async function searchByContact(gcid, contact) {
  const google = await getClient(gcid, 'gmail')

  const to   = `to:(${contact})`
  const from = `from:(${contact})`

  async function searchInMessages (query) {
    let messages = []
    let next    = null

    do {
      const result = await google.searchMessage(25, query, next)
  
      messages = messages.concat(result.messages.map(thread => thread.id))
      next     = result.next
  
    } while (next !== null)

    return messages
  }

  // do not make them parallel to prevent from exceeding remote rate-limiters
  const part_1 = await searchInMessages(to)
  const part_2 = await searchInMessages(from)

  return Array.from(new Set([...part_1, ...part_2]))
}


module.exports = {
  fetchMessage,
  search,
  searchByContact
}
