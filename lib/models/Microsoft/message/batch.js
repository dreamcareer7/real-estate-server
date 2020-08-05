const getClient = require('../client')
const { getAll } = require('./get')
const { deleteMany } = require('./delete')


/**
 * @param {IMicrosoftCredential} credential
 * @param {Array} ids
 */
const batchTrash = async (credential, ids) => {
  const microsoft = await getClient(credential.id, 'outlook')
  const messages  = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await microsoft.batchDelete(remote_message_ids)

  return await deleteMany(credential.id, ids)
}

/**
 * @param {IMicrosoftCredential} credential
 * @param {Array} ids
 */
const batchArchive = async (credential, ids) => {
  const microsoft = await getClient(credential.id, 'outlook')
  const messages  = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await microsoft.batchArchive(remote_message_ids)

  return await deleteMany(credential.id, ids)
}


module.exports = {
  batchTrash,
  batchArchive
}