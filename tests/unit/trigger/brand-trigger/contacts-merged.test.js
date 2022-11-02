const moment = require('moment-timezone')
const { expect } = require('chai')

const EmailCampaign = {
  ...require('../../../../lib/models/Email/campaign/create'),
  ...require('../../../../lib/models/Email/campaign/get'),
}
const Trigger = {
  ...require('../../../../lib/models/Trigger/filter.js'),
  ...require('../../../../lib/models/Trigger/get'),
  ...require('../../../../lib/models/Trigger/create'),
  ...require('../../../../lib/models/Trigger/execute'),
}
const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/workers'),
  ...require('../../../../lib/models/Trigger/brand_trigger/create'),
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
}
const Contact = {
  ...require('../../../../lib/models/Contact/manipulate'),
  ...require('../../../../lib/models/Contact/get'),
}
const Context = require('../../../../lib/models/Context')

const BrandHelper = require('../../brand/helper')
const { attributes } = require('../../contact/helper')
const UserHelper = require('../../user/helper')
const { createContext, handleJobs } = require('../../helper')
const BrandTemplate = require('../../../../lib/models/Template/brand/get')

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


async function createContact({ email, birthday = 0 }) {
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


describe('BrandTrigger/workers', () => {
  createContext()
  beforeEach(setup)

  context('.contactsMerged()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:275-278
    it('doesn\'t throw when brand trigger ID is missing', async () => {
      const contact = await createContact({
        email: 'first_mail@fake.com',
      })
      await handleJobs()
      await BrandTrigger.contactsMerged({
        user_id: user.id,
        contact_ids: [contact.id],
        event_type: 'merge'
      })
    })

    context('doesn\'t create campaign for...', () => {
      it('attribute types having no related brand trigger', async () => {
        const user = await UserHelper.TestUser()
        const contact1 = await createContact({
          birthday: BIRTHDAY.unix(),
          email: 'first_mail@fake.com',
        })
        const contact2 = await createContact({
          birthday: BIRTHDAY.unix(),
          email: 'second_mail@fake.com',
        })
        await handleJobs()
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'wedding_anniversary',
          wait_for: -86400,
          subject: 'birthday mail',
        }
        await BrandTrigger.upsert(bt,true)
        await handleJobs()
        const campaignsThen = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        await Contact.merge([contact1.id], contact2.id, user.id, brand.id)
        await handleJobs()
        const campaignsNow = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        expect(campaignsNow).to.eql(campaignsThen)
      })

      // lib/models/Trigger/brand_trigger/workers.js:305-306
      it('attribute types already have active trigger', async () => {
        const user = await UserHelper.TestUser()
        const contact1 = await createContact({
          birthday: BIRTHDAY.unix(),
          email: 'first_mail@fake.com',
        })
        const contact2 = await createContact({
          birthday: BIRTHDAY.unix(),
          email: 'second_mail@fake.com',
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
        await BrandTrigger.upsert(bt,true)
        await handleJobs()
        const campaignsThen = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        await Contact.merge([contact1.id], contact2.id, user.id, brand.id)
        await handleJobs()
        const campaignsNow = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        expect(campaignsNow).to.eql(campaignsThen)
      })

      it('unrelated attribute types', async () => {
        const user = await UserHelper.TestUser()
        const contact1 = await createContact({
          email: 'first_mail@fake.com',
        })
        const contact2 = await createContact({
          birthday: BIRTHDAY.unix(),
          email: 'second_mail@fake.com',
        })
        await handleJobs()
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'wedding_anniversary',
          wait_for: -86400,
          subject: 'wedding anniversary mail',
        }
        await BrandTrigger.upsert(bt, true)
        await handleJobs()
        const campaignsThen = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        await Contact.merge([contact1.id], contact2.id, user.id, brand.id)
        await handleJobs()
        const campaignsNow = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        expect(campaignsNow).to.eql(campaignsThen)
      })

      it('with fake contactIds', async () => {
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'birthday',
          wait_for: -86400,
          subject: 'birthday mail',
        }
        await BrandTrigger.upsert(bt,true)
        await handleJobs()
        const campaignsThen = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        await BrandTrigger.contactsMerged({
          brand_id: brand.id,
          contact_ids: [
            'ef3ae8d5-f2a5-4455-893a-8c50635481ba',
            '4ce4642a-1639-46a8-b9a2-d0ccd683a7dd',
          ]
        })
        await handleJobs()
        const campaignsNow = await EmailCampaign.getByBrand(brand.id, { status: 'any' })
        expect(campaignsNow).to.eql(campaignsThen)
      })
    })
    // lib/models/Trigger/brand_trigger/workers.js:313-316
    it('creates email triggers for merged contacts on suitable attribute types', async() => {
      const user = await UserHelper.TestUser()
      const contact1 = await createContact({
        email: 'first_mail@fake.com',
      })
      const contact2 = await createContact({
        birthday: BIRTHDAY.unix(),
        email: 'second_mail@fake.com',
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
      await BrandTrigger.upsert(bt,true)
      await handleJobs()
      await Contact.merge([contact2.id], contact1.id, user.id, brand.id)
      await handleJobs()
      const triggerIds = await Trigger.filter({
        brand: brand.id,
        event_type: ['birthday'],
        contacts: [contact1.id],
      })
      expect(triggerIds.length).is.eql(1)
    })
  })
})
