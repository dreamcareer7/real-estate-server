const moment = require('moment-timezone')
const { expect } = require('chai')

const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/workers'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/create'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
}
const Contact = require('../../../../lib/models/Contact/index')

const Context = require('../../../../lib/models/Context')

const BrandHelper = require('../../brand/helper')
const { attributes } = require('../../contact/helper')
const UserHelper = require('../../user/helper')
const { createContext, handleJobs } = require('../../helper')
const BrandTemplate = require('../../../../lib/models/Template/brand/get')

const Trigger = {
  ...require('../../../../lib/models/Trigger/filter.js'),
  ...require('../../../../lib/models/Trigger/get'),
  ...require('../../../../lib/models/Trigger/create'),
  ...require('../../../../lib/models/Trigger/execute'),
}
  
const BIRTHDAY = moment.utc().add(3, 'days').startOf('day').add(-20, 'years')




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

async function setup() {
  user = await UserHelper.TestUser()
  brand = await createBrand()

  Context.set({ user, brand })
}

async function createContact({ email, userId, birthday }) {
  const attribute = {
    first_name: 'John',
    last_name: 'Doe',
    birthday,
  }

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

describe('BrandTrigger/workers', () => {
  createContext()
  beforeEach(setup)

  it(
    'should create triggers when a new email address is added to a contact',
    async () => {
      // @ts-ignore
      const contact = await createContact({
        userId: user.id, 
        birthday: BIRTHDAY.unix(),
      })
      await handleJobs()
      // @ts-ignore
      const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
      const bt = {
        template: brandTemplates[0].id,
        brand: brand.id,
        created_by: user.id,
        event_type: 'birthday',
        wait_for: -86400,
        subject: 'birthday mail',
      }
      await BrandTrigger.upsert(bt, true)
      await handleJobs()
      await Contact.update(
        [{
          id: contact.id,
          attributes: [{
            attribute_type: 'email', 
            text: 'doe@fakemail.com',
            is_primary: true,
          }],
          parked: false
        }],
        user.id,
        brand.id,
      )
      await handleJobs()
      const triggers = await Trigger.filter({
        brand: brand.id,
        event_type: 'birthday',
        deleted_at: null,
      })
      expect(triggers.length).to.be.eql(1)
    }
  )

  it(
    'should not create triggers for excluded contacts',
    async () => {
      await createContact({
        userId: user.id, 
        birthday: BIRTHDAY.unix(),
        email: 'first_mail@fake.com',
      })
      const contact2 = await createContact({
        userId: user.id, 
        birthday: BIRTHDAY.unix(),
        email: 'second_mail@fake.com',
      })
      await handleJobs()
      // @ts-ignore
      const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
      const bt = {
        template: brandTemplates[0].id,
        brand: brand.id,
        created_by: user.id,
        event_type: 'birthday',
        wait_for: -86400,
        subject: 'birthday mail',
      }
      // @ts-ignore
      await BrandTrigger.upsert(bt, true, { exclude: [contact2.id] })
      await handleJobs()
      const triggers = await Trigger.filter({
        brand: brand.id,
        event_type: 'birthday',
        deleted_at: null,
        contacts: [contact2.id]
      })
      expect(triggers.length).to.be.eql(0)
    }
  )
})  