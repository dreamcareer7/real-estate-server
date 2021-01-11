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

const sendForBrand = async id => {
  const _brand = await Brand.get(id)

  const [ brand ] = await Orm.populate({
    models: [_brand],
    associations: ['brand.parent']
  })
  Context.set({brand})

  Context.log('Sending for', brand.name)

  const brand_templates = await BrandTemplate.getForBrand({
    types: ['Christmas'],
    mediums: ['Social'],
    brand: brand.id
  })

  if (brand_templates.length < 1) {
    Context.log('No templates found for brand', brand.id)
    return
  }

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
    subject: 'Merry Christmas! 🎄🎅',
    brand: brand.id,
    from: 'f2e2be50-927b-11e8-bb13-0a95998482ac',
    individual: true,
    due_at: new Date()
  }])

  Context.log('Saved Campaign', saved)
}

const execute = async() => {
  const brands = [
    '8cb4a358-8973-11e7-9089-0242ac110003',
    '30a4a60c-5e60-11ea-8cd8-1650ce91b517',
    '745e77aa-4ddf-11e6-a07d-f23c91b0d077',
    '0937af58-e537-11e9-b0f2-0a653b6fef3e',
    '3ec07802-3326-11ea-a372-0a653b6fef3e',
    '806bf314-6943-11ea-a858-1650ce91b517',
    'a6d72c32-a1ff-11e9-9658-0a95998482ac',
    '735e9998-72f7-11ea-8138-1650ce91b517',
    '5551cf78-8b3a-11ea-b3f5-1650ce91b517',
    '454be7c2-64a6-11ea-8132-1650ce91b517',
    'abf7173e-489b-11ea-b1bf-0a653b6fef3e',
    'b21b58fa-dbe9-11ea-9639-1650ce91b517',
    '0686607e-aa85-11ea-beb3-1650ce91b517',
    'a7247306-c603-11ea-91ef-1650ce91b517',
    'f95afeb4-ec51-11ea-80d4-1650ce91b517',
    'f322d0a8-cd02-11ea-a182-1650ce91b517',
    'c0bb6b58-a439-11ea-b00e-1650ce91b517',
    '27cac7fa-8b33-11ea-972c-1650ce91b517',
    '3e6bc15a-fcd8-11ea-8fa2-1650ce91b517',
    '3cd7d796-9c31-11ea-99cc-1650ce91b517',
    '29aae8c2-fdfa-11ea-9ee6-1650ce91b517',
    '029bb52a-0e23-11eb-bd54-1650ce91b517',
    '505174ac-28fa-11eb-91e1-1650ce91b517',
    'd45311ce-38a5-11eb-804c-1650ce91b517',
    'e419a708-2e87-11eb-bbd4-1650ce91b517'
  ]


  for(const brand of brands)
    await sendForBrand(brand)
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
