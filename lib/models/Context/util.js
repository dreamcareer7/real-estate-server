const program = require('commander')

const db = require('../../utils/db')

require('../index')()

const Brand = require('../Brand')
const Context = require('./index')
const User = require('../User')

const getDb = async () => {
  return new Promise((resolve, reject) => {
    db.conn((err, client, release) => {
      if (err)
        return reject(err)

      resolve({client, release})
    })
  })
}

function exit() {
  Context.exit()
  process.exit()
}

const runInContext = async (id, fn, program_init_fn) => {
  program
    .usage('[options]')
    .option('-u, --user <user>', 'user-id to be preset on context')
    .option('-b, --brand <brand>', 'brand-id to be preset on context')

  if (typeof program_init_fn === 'function') {
    program_init_fn(program)
  }

  program.parse(process.argv)

  const context = Context.create({
    id,
    created_at: process.hrtime()
  })

  context.enter()

  const {client, release} = await getDb()
  context.set({
    db: client,
    jobs: []
  })

  if (program.user) {
    const user = await User.get(program.user)
    context.set({
      user
    })
  }

  if (program.brand) {
    const brand = await Brand.get(program.brand)
    context.set({
      brand
    })
  }

  if (typeof fn === 'function') {
    try {
      await fn(program)
    }
    catch (ex) {
      console.error(ex)
    }
    finally {
      release()
    }
  }
  else {
    release()
  }

  exit()
}

module.exports = runInContext
