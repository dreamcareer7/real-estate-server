const db = require('../../utils/db')
const Context = require('./index')

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client, release) => {
      if (err)
        return reject(err)

      resolve({client, release})
    })
  })
}

const runInContext = async (id, fn) => {
  const context = Context.create({
    id,
    created_at: process.hrtime()
  })

  context.enter()

  const {client, release} = await getDb()
  context.set({
    db: client
  })

  if (typeof fn === 'function') {
    try {
      await fn()
    }
    finally {
      release()
    }
  }
  else {
    release()
  }

  process.on('SIGINT', release)
  process.on('SIGTERM', release)
}

module.exports = runInContext
