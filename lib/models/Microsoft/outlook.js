const Context = require('../Context')

const { fetchOutlookBody } = require('./workers/outlook/common')
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
 * @param {string} query
 * @param {string=} next
 */
async function search(mcid, query, next) {
  const microsoft = await getClient(mcid, 'outlook')
  const result    = await microsoft.searchThreads(4, query, next)

  return {
    /** @type {string[]} */
    threadKeys: [...new Set(result.messages.map(msg => `${mcid}${msg.conversationId}`))],
    /** @type {string} */
    next: result.next
  }
}

/**
 * @param {UUID} mcid
 * @param {string} contact email_address
 */
async function searchByContact(mcid, contact) {
  const microsoft = await getClient(mcid, 'outlook')

  const to   = `to:(${contact})`
  const from = `from:(${contact})`
  const cc   = `cc:(${contact})`
  const bcc  = `bcc:(${contact})`

  async function searchInThreads (query) {
    let messages = []
    let next     = null

    do {
      const result = await microsoft.searchThreads(25, query, next)

      next     = result.next
      messages = messages.concat(result.messages)
  
    } while (next)

    return messages
  }

  // don not make them parallel to prevent from exceeding remote rate-limiters
  const part_1 = await searchInThreads(to)
  const part_2 = await searchInThreads(from)
  const part_3 = await searchInThreads(cc)
  const part_4 = await searchInThreads(bcc)

  return new Set([...part_1, ...part_2, ...part_3, ...part_4])
}


module.exports = {
  fetchMessage,
  search,
  searchByContact
}
