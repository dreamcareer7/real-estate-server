const moment = require('moment-timezone')
const { assert, expect } = require('chai')
const { createContext, handleJobs } = require('../../helper')

const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
  ...require('../../../../lib/models/Trigger/brand_trigger/create'),
}
const Contact = {
  ...require('../../../../lib/models/Contact/manipulate'),
  ...require('../../../../lib/models/Contact/get'),
}
const Context = require('../../../../lib/models/Context')
const BrandHelper = require('../../brand/helper')
const UserHelper = require('../../user/helper')
const { attributes } = require('../../contact/helper')
const BrandTemplate = require('../../../../lib/models/Template/brand/get')

let brand
let user

const template = {
  name: 'fake-template-brand-trigger-test',
  variant: 'Template40',
  inputs: ['listing', 'user'],
  template_type: 'JustSold',
  medium: 'Email',
  html: '<div>fakeTemplate</div>',
  mjml: false,
}

const createBrand = async () => {
  return BrandHelper.create({
    roles: {
      Admin: [user.id],
    },
    checklists: [],
    contexts: [],
    templates: [template],
  })
}


async function createContact({ email, birthday }) {
  const attribute = {
    first_name: 'John',
    last_name: 'Doe',
  }
  
  if (birthday) attribute.birthday = birthday
  if (email) attribute.email = email
  
  const [id] = await Contact.create(
    [{
      user: user.id,
      attributes: attributes(attribute),
    }],
    user.id,
    brand.id
  )
  
  const contact = await Contact.get(id)
  return contact
}
  
async function setup() {
  user = await UserHelper.TestUser()
  brand = await createBrand()

  Context.set({ user, brand })
}

describe('BrandTrigger/get', () => {
  createContext()
  beforeEach(setup)
  context('.get', () => {
    it('throws with a fake brandTriggerId', async () => {
      await BrandTrigger.get('ef3ae8d5-f2a5-4455-893a-8c50635481ba')
        .then(() => { assert.fail('was not supposed to succeed') })
        .catch(() => null)
    })
  })
  context('.exists', () => {
    it('returns the GT with appropriate event type', async () => {
      await createContact({
        birthday: moment.utc().unix(),
        email: 'first_mail@fake.com',
      })
      await handleJobs()
      const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
      const bt = {
        template: brandTemplates[0].id,
        brand: brand.id,
        created_by: user.id,
        event_type: 'birthday',
        wait_for: -86400,
        subject: 'birthday mail',
      }
      const brandTriggerId = await BrandTrigger.upsert(bt, true)
      expect(await BrandTrigger.exists(brand.id, 'birthday')).to.be.true
    })
  })
})