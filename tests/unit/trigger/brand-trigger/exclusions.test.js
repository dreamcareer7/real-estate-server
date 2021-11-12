const moment = require('moment-timezone')
const { expect } = require('chai')

const Trigger = {
  ...require('../../../../lib/models/Trigger/filter.js'),
  ...require('../../../../lib/models/Trigger/get'),
  ...require('../../../../lib/models/Trigger/create'),
  ...require('../../../../lib/models/Trigger/update'),
  ...require('../../../../lib/models/Trigger/delete'),
}
const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/workers'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/create'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
}
const BrandTriggerExclusion = {
  ...require('../../../../lib/models/Trigger/brand_trigger/exclusion/create'),
  ...require('../../../../lib/models/Trigger/brand_trigger/exclusion/get'),
  ...require('../../../../lib/models/Trigger/brand_trigger/exclusion/delete'),
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

describe('BrandTrigger', () => {
  createContext()
  beforeEach(setup)
  context('exclusions', () => {
    describe('create exclusion function ...', () => {
      it('prevents global trigger making if the exclusion is made before the GT', async () => {
        const contact = await createContact({
          birthday: BIRTHDAY.unix(),
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
        await BrandTriggerExclusion.create(brand.id, bt.event_type, [contact.id])
        await BrandTrigger.upsert(bt, true)
        await handleJobs()
        const exclusions = await BrandTriggerExclusion.getExcludedContactIds(brand.id, bt.event_type)
        expect(exclusions.length).to.be.eql(1)
        const triggerIds = await Trigger.filter({
          brand: brand.id,
          event_type: 'birthday',
          origin: true,
        })
        expect(triggerIds.length).not.to.be.ok
      })
      it('prevents global trigger making in an update', async () => {
        const contact = await createContact({
          birthday: BIRTHDAY.unix(),
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
        await handleJobs()
        const [triggerId] = await Trigger.filter({
          brand: brand.id,
          event_type: 'birthday',
        })
        await Trigger.clearOrigin(triggerId)
        await BrandTriggerExclusion.create(brand.id, bt.event_type, [contact.id])
        const exclusions = await BrandTriggerExclusion.getExcludedContactIds(brand.id, bt.event_type)
        expect(exclusions.length).to.be.eql(1)
        await BrandTrigger.updateTriggers(brandTriggerId, false)
        await handleJobs()
        const triggerIds = await Trigger.filter({
          brand: brand.id,
          event_type: 'birthday',
        })
        expect(triggerIds.length).to.be.eql(1)
        const theSameOldTrigger = await Trigger.get(triggerId)
        expect(theSameOldTrigger.deleted_at).to.be.null
        expect(theSameOldTrigger.origin).to.be.null
      })
    })

    describe('delete exclusion function ...', () => {
      it('unexcludes contacts from a GT, creating the required triggers', async () => {
        const contact = await createContact({
          birthday: BIRTHDAY.unix(),
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
        await BrandTriggerExclusion.create(brand.id, bt.event_type, [contact.id])
        await BrandTrigger.upsert(bt, true)
        await handleJobs()
        await BrandTriggerExclusion.delete(brand.id, bt.event_type, [contact.id])
        const exclusions = await BrandTriggerExclusion.getExcludedContactIds(brand.id, bt.event_type)
        expect(exclusions.length).to.be.eql(0)
      })
    })
  })
})