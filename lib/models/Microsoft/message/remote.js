const getClient = require('../client')
const { getAll } = require('./get')
const { updateIsRead } = require('./update')


/**
 * @param {IMicrosoftCredential} credential
 * @param {Array} ids
 * @param {boolean} status
 */
const updateReadStatus = async (credential, ids, status) => {
  const microsoft = await getClient(credential.id, 'outlook')
  const messages  = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await microsoft.updateIsRead(remote_message_ids, status)

  return await updateIsRead(ids, status, credential.id)
}



module.exports = {
  updateReadStatus
}