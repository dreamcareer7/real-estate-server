const db = require('../../lib/utils/db')
const promisify = require('../../lib/utils/promisify')
require('../../lib/models/index')()

const _createContext =  async () => {
  const conn = await promisify(db.conn)()

  const context = Context.create({
    logger: () => {}
  })

  await promisify(conn.query.bind(conn))('BEGIN')

  context.set({
    db: conn,
    jobs: []
  })

  return context
}

const createContext = done => {
  _createContext()
  .then(context => {
    context.run(done)
  })
}

module.exports = { createContext }
