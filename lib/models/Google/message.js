const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleMessage = {}



GoogleMessage.getAll = async (ids) => {
  const messages = await db.select('google/message/get', [ids])

  return messages
}

GoogleMessage.get = async (id) => {
  const messages = await GoogleMessage.getAll([id])

  if (messages.length < 1)
    throw Error.ResourceNotFound(`Google-Message ${id} not found`)

  return messages[0]
}


Orm.register('googleMessage', 'GoogleMessage', GoogleMessage)

module.exports = GoogleMessage