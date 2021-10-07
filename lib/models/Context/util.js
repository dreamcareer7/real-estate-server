const program = require('commander')

const db = require('../../utils/db')
const createContext = require('../../../scripts/workers/utils/create-context')
const Brand = require('../Brand/get')
const Context = require('./index')

const {
  get: getUser
} = require('../User/get')

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

  const { rollback, commit, context } = await createContext({
    id,
    created_at: process.hrtime()
  })

  if (program.user) {
    const user = await getUser(program.user)
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

  if (typeof fn !== 'function') {
    rollback()
    exit()
  }

  await context.run(async () => {
    try {
      await fn(program)
      await commit()
    } catch (ex) {
      rollback(ex)
    } finally {
      setTimeout(exit, 10_000)
    }
  })
}

module.exports = {
  runInContext
}
