const Context = require('../../lib/models/Context/index')
const EmailCampaign = require('../../lib/models/Email/campaign/create')
const createContext = require('../workers/create-context')
const BrandTemplate = require('../../lib/models/Template/brand/get')
const AttachedFile = require('../../lib/models/AttachedFile/get')
const render = require('../../lib/utils/render')
const promisify = require('../../lib/utils/promisify')
const Brand = require('../../lib/models/Brand/index')
const User = require('../../lib/models/User/get')
const Orm = require('../../lib/models/Orm')
const _ = require('lodash')

const execute = async () => {
  const _brand = await Brand.get(process.argv[2])

  const [ brand ] = await Orm.populate({
    models: [_brand],
    associations: ['brand.parent']
  })
  Context.set({brand})


  const brand_templates = await BrandTemplate.getForBrand({
    types: [process.argv[3]],
    mediums: ['Social'],
    brand: brand.id
  })

  if (brand_templates.length < 1)
    throw new Error.Validation('No templates found')

  const thumbnails = await AttachedFile.getAll(brand_templates.map(bt => bt.thumbnail))

  const template = __dirname + '/../../lib/mjml/holiday/index.mjml'

  const brand_agents = await Brand.getAgents(brand.id)

  const user_ids = _.chain(brand_agents).filter('enabled').map('user').uniq().value()

  const users = await User.getAll(user_ids)

  const data = {
    thumbnails
  }

  const html = await promisify(render.mjml)(template, data)

  const [ saved ] = await EmailCampaign.createMany([{
    to: users.map(user => {
      return {
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        recipient_type: 'Email'
      }
    }),
    html,
    tags: ['holiday'],
    subject: 'Columbus Day',
    brand: brand.id,
    from: 'f2e2be50-927b-11e8-bb13-0a95998482ac',
    individual: true,
    due_at: new Date()
  }])

  Context.log('Saved Campaign', saved)
}

async function main() {
  const { commit, run } = await createContext()

  await run(async () => {
    await execute()
    await commit()
  })
}

main()
  .catch(ex => {
    console.error(ex)
    process.exit()
  })
  .then(process.exit)
