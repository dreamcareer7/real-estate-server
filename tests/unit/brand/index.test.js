
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
const BrandRole = require('../../../lib/models/Brand/role/get')
const sql = require('../../../lib/utils/sql')
const BrandSettings = require('../../../lib/models/Brand/settings/set')
const BrandUser = {
  ...require('../../../lib/models/Brand/user/invite'),
  ...require('../../../lib/models/Brand/user/get')
}
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

  const BrokerageName = 'TestBrokerage'
  const createBrand = async (userId, extraProp) => {
    return BrandHelper.create({
      roles: {
        Agent: { acl: ['Marketing'], members: [userId] },
      },
      checklists: [],
      contexts: [],
      templates: [],
      ...extraProp
    })
  }

  const userId = await createShadowUser()
  const parentBrand = await createBrand(userId, {brand_type: 'Brokerage', name: BrokerageName})
  const brand = await createBrand(userId, {parent: parentBrand.id, brand_type: 'Team'} )
  
  const color = 'rgba(191,81,81,0.87)'
  const logo = 'http://test.com/fake.jpeg'
  const containerBgColor = '#F3F5F9'
  await BrandSettings.set({
    user: userId,
    brand: parentBrand.id,
    key: 'marketing_palette',
    value: {
      'container-logo-wide': logo,
      'container-bg-color': containerBgColor
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

  // because we sent 2 emails in this case. 
  // first one for creating user in createShadowUser method
  // and the next one, when we call invite method and now we are testing the invite method
  const userInvitationEmailIndex = 1
  if (emails.length !== 2) {
    throw new Error(`expect 2 emails sent but '${emails.length}' sent`)
  }

  const brandInvitation = emails[userInvitationEmailIndex]
  
  if (!brandInvitation.html.includes(BrokerageName)) {
    throw new Error('Brokerage Name is not applied')
  }

  if (!brandInvitation.html.includes(color)) {
    throw new Error('Navbar color is not applied')
  }
  
  if (!brandInvitation.html.includes(logo)) {
    throw new Error('Logo src is not applied')
  }

  if (!brandInvitation.html.includes(containerBgColor)) {
    throw new Error('ContainerBgColor is not applied')
  }

  const roles = await BrandRole.getByUser(brand.id, userId)

  for (const role of roles) {
    const brandUserId = await BrandUser.getByRoleAndUser(role, userId)
    if (!brandUserId) {
      throw new Error('brandUserId is not found')
    }
    const dbBrandUser = await BrandUser.get(brandUserId)
    if (!dbBrandUser.last_invited_at) {
      throw new Error('last_invited_at is not set')
    }
  }
}

describe('Brand', () => {
  createContext()

  it('should send an email and update last_invited_at when invite user calls', save)
})
