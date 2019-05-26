const db  = require('../../utils/db.js')
const Orm = require('../Orm')

const GoogleThread = {}



GoogleThread.getAll = async (ids) => {
  const threads = await db.select('google/thread/get', [ids])

  return threads
}

GoogleThread.get = async (id) => {
  const threads = await GoogleThread.getAll([id])

  if (threads.length < 1)
    throw Error.ResourceNotFound(`Google-Thread ${id} not found`)

  return threads[0]
}


Orm.register('googleThread', 'GoogleThread', GoogleThread)

module.exports = GoogleThread