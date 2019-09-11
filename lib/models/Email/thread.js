const db  = require('../../utils/db.js')
const Orm = require('../Orm')


const Thread = {}


Thread.getAll = async function (ids) {
  return await db.select('email/thread/get', [ids])
}



Orm.register('thread', 'Thread', Thread)

module.exports = Thread