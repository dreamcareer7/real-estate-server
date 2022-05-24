
const { createContext, handleJobs } = require('../helper')
const randomMobile = require('random-mobile')
const config = require('../../../lib/config')
const BrandHelper = require('./helper')
const User = {
  ...require('../../../lib/models/User/get'),
  ...require('../../../lib/models/User/create'),
}
const Orm = require('../../../lib/models/Orm/context')
const Email = require('../../../lib/models/Email/get')
const sql = require('../../../lib/utils/sql')
const BrandSettings = require('../../../lib/models/Brand/settings/set')
const BrandUser = require('../../../lib/models/Brand/user/invite')
const promisify = require('../../../lib/utils/promisify')
const userJson = require('./json/user.json')

const getEmails = async () => {
  Orm.setPublicFields({ select: { email: ['html', 'text'] }, omit: {} })

  const ids = await sql.selectIds(`
      SELECT
        id
      FROM
        emails
    `)

  return Email.getAll(ids)
}

const save = async () => {
  // in this test I'm creating a user and a parent and a child brand
  // then I send an invitation email and finally I check the sent emails
  // to make sure user's settings is applied in his emails
  
  const createShadowUser = async () => {
    const user = await promisify(User.create)({
      ...userJson,
      email: 'shadowUser@fake.com',
      is_shadow: true,
      phone_number: randomMobile({ formatted: true }),
      client_id: config.tests.client_id,
      client_secret: config.tests.client_secret,
    })
    return user
  }

  const createBrand = async (userId, parent) => {
    return BrandHelper.create({
      roles: {
        Agent: { acl: ['Marketing'], members: [userId] },
      },
      checklists: [],
      contexts: [],
      templates: [],
      parent
    })
  }

  const userId = await createShadowUser()
  const parentBrand = await createBrand(userId)
  const brand = await createBrand(userId, parentBrand.id)
  
  const color = '#486fe1'
  const logo = 'http://test.com/fake.jpeg'

  await BrandSettings.set({
    user: userId,
    brand: parentBrand.id,
    key: 'marketing_palette',
    value: {
      'container-logo-wide': logo
    },
  })

  await BrandSettings.set({
    user: userId,
    brand: brand.id,
    key: 'theme',
    value: {
      navbar: {
        button: {
          main: color,
        },
      },
    },
  })


  await BrandUser.inviteMember(brand.id, userId)
  await handleJobs()
  const emails = await getEmails()

  // because we sent 2 emails in this case
  if (emails.length !== 2) {
    throw new Error(`expect 2 emails sent but '${emails.length}' sent`)
  }

  const brandInvitation = emails.find(e => e.subject.includes(`You've been invited to`))
  
  if (!brandInvitation.html.includes(color)) {
    throw new Error('Navbar color is not applied')
  }
  
  if (!brandInvitation.html.includes(logo)) {
    throw new Error('Logo src is not applied')
  }

}

describe('Brand', () => {
  createContext()

  it('should send an email when invite user calls', save)
})
