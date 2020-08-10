const getClient = require('../client')
const { getAll } = require('./get')
const { deleteMany } = require('./delete')


const batchTrash = async (gcid, ids) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await google.batchTrash(remote_message_ids)

  return await deleteMany(gcid, ids)
}

const batchArchive = async (gcid, ids) => {
  const google   = await getClient(gcid, 'gmail')
  const messages = await getAll(ids)

  const remote_message_ids = messages.map(message => message.message_id)
  await google.batchArchive(remote_message_ids)

  return await deleteMany(gcid, ids)
}


module.exports = {
  batchTrash,
  batchArchive
}