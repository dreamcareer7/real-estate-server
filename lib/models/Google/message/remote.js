const getClient = require('../client')
const { get, getAll } = require('./get')
const { updateIsRead } = require('./update')
const { create } = require('./create')
const { setCampaign } = require('./campaign')
const { generateRecord, processLabels } = require('../workers/gmail/common')


/**
 * @param {UUID} gcid
 * @param {string} messageId
 */
const getRemoteMessage = async (gcid, messageId, campaign = null) => {
  const google  = await getClient(gcid, 'gmail')
  const message = await google.getMessage(messageId)

  if (!message.id) {
    throw Error.ResourceNotFound('GoogleMessage#getRemoteMessage failed cause message.id is null!')
  }

  const toCreateMeesagesArr = []

  toCreateMeesagesArr.push(generateRecord(gcid, message))

  await processLabels(gcid, toCreateMeesagesArr)

  const result = await create(toCreateMeesagesArr, gcid)
  const id = result[0].id

  if (campaign) {
    await setCampaign(id, campaign)
  }

  return await get(id)
}

const updateReadStatus = async (gcid, ids, status) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)

  await google.updateReadStatus(remote_message_ids, status)

  return await updateIsRead(ids, status, gcid)
}


module.exports = {
  getRemoteMessage,
  updateReadStatus
}