const { program } = require('commander')
const path = require('path')
const repl = require('repl')

/**
 * @typedef ShellOptions
 * @property {UUID=} user
 * @property {UUID=} brand
 * @property {string=} env
 * @property {UUID=} googleCredential
 * @property {UUID=} microsoftCredential
 * @property {string[]=} import
 */

program
  .usage('npm run shell [options]')
  .option('-u, --user <user>', 'user-id to be preset on context')
  .option('-b, --brand <brand>', 'brand-id to be preset on context')
  .option('-e, --env <env>', 'env file name to be used')
  .option('-i, --import <imports...>', 'models and utils to import')
  .option('-g, --google-credential <google-credential>', 'google credential to be loaded automatically')
  .option('-m, --microsoft-credential <microsoft-credential>', 'microsoft credential to be loaded automatically')
  .parse(process.argv)

/** @type {ShellOptions} */
const options = program.opts()

if (options.env) {
  console.log(`setting up env using .env.${options.env}`)
  require('dotenv').config({ path: path.resolve(process.cwd(), `.env.${options.env}`) })
}

const promisify = require('../lib/utils/promisify')
const Brand = require('../lib/models/Brand')
const User = require('../lib/models/User/get')

const db = require('../lib/utils/db')
const sql = require('../lib/utils/sql')
const { peanar } = require('../lib/utils/peanar')
const Context = require('../lib/models/Context/index')
const redis = require('../lib/data-service/redis').createClient()

require('../lib/models/Context/events')()

async function loadGoogleCredential(replContext, cred_id) {
  const cred = await replContext.GoogleCredential.get(cred_id)
  const google = await replContext.GoogleApis.getGoogleClient(cred)

  replContext.cred = cred
  replContext.google = google
}

async function loadMicrosoftCredential(replContext, cred_id) {
  const cred = await replContext.MicrosoftCredential.get(cred_id)
  const { microsoft } = await replContext.MicrosoftApis.getMGraphClient(cred)

  replContext.cred = cred
  replContext.microsoft = microsoft
}

async function processImports(replContext) {
  for (const part of options.import ?? []) {
    switch (part) {
      case 'google':
        replContext.GoogleCredential = require('../lib/models/Google/credential/get')
        replContext.GoogleApis = require('../lib/models/Google/plugin/client')

        if (options.googleCredential) {
          await loadGoogleCredential(replContext, options.googleCredential)
        }

        break
      case 'microsoft':
        console.log('importing microsoft modules...')
        replContext.MicrosoftCredential = require('../lib/models/Microsoft/credential/get')
        replContext.MicrosoftApis = require('../lib/models/Microsoft/plugin/client')

        if (options.microsoftCredential) {
          await loadMicrosoftCredential(replContext, options.microsoftCredential)
        }

        break
      default:
        break
    }
  }
}

const context = Context.create({
  id: '<rechat-shell>',
  created_at: process.hrtime()
})

context.enter()

db.conn(async (err, client) => {
  if (err) {
    process.exit(1)
  }

  const r = repl.start({
    prompt: 'Rechat Shell> ',
    replMode: repl.REPL_MODE_STRICT,
    domain: context.domain
  })

  r.on('exit', cleanup)

  context.set({
    db: client,
    rabbit_jobs: []
  })

  r.context.db = db
  r.context.sql = sql
  r.context.context = context
  r.context.promisify = promisify
  await processImports(r.context)
  r.context.handleJobs = async () => { 
    await peanar.enqueueContextJobs()
  }

  if (options.user) {
    const user = await User.get(options.user)
    context.log(`Logged in as ${user.display_name}`)
    context.set({ user })
  }

  if (options.brand) {
    const brand = await Brand.get(options.brand)
    context.log(`Active brand set to ${brand.name}`)
    context.set({ brand })
  }
})


function cleanup() {
  redis.quit()
  context.get('db').release()
  db.close()
  process.exit()
}
