const db  = require('../../utils/db.js')
const Orm = require('../Orm')


const Thread = {}



Thread.getAll = async function (threadKeys) {
  return await db.select('email/thread/get', [threadKeys])
}


Orm.register('thread', 'Thread', Thread)

module.exports = Thread