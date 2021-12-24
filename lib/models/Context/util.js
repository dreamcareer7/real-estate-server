const program = require('commander')

const createContext = require('../../../scripts/workers/utils/create-context')
const Brand = require('../Brand/get')
const Context = require('./index')

const {
  get: getUser
} = require('../User/get')

function exit() {
  Context.exit()
  process.exit()
}

const runInContext = async (id, fn, program_init_fn, { exitAfterFinish = true }) => {
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
      if (exitAfterFinish) {
        setTimeout(exit, 10000)
      }
    }
  })
}

module.exports = {
  runInContext
}
