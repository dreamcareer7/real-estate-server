const moment = require('moment-timezone')
const { expect } = require('chai')

const Trigger = {
  ...require('../../../lib/models/Trigger/filter.js'),
  ...require('../../../lib/models/Trigger/get'),
  ...require('../../../lib/models/Trigger/create'),
}
const BrandEvent = require('../../../lib/models/Brand/event/index')
const BrandTrigger = {
  ...require('../../../lib/models/Trigger/brand_trigger/workers').test, 
  ...require('../../../lib/models/Trigger/brand_trigger/create'), 
  ...require('../../../lib/models/Trigger/brand_trigger/get'),
}
const Campaign = {
  ...require('../../../lib/models/Email/campaign/get.js'),
  ...require('../../../lib/models/Email/create.js'),
}
const Contact = {
  ...require('../../../lib/models/Contact/manipulate'),
  ...require('../../../lib/models/Contact/get'),
}
const Context = require('../../../lib/models/Context')
// const sql = require('../../../lib/utils/sql')

const BrandHelper = require('../brand/helper')
const { attributes } = require('../contact/helper')
const UserHelper = require('../user/helper')
const { createContext } = require('../helper')
const BrandTemplate = require('../../../lib/models/Template/brand/get')

const BIRTHDAY = moment.utc().add(3, 'days').startOf('day').add(-20, 'years')

let brand
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
  const user = await UserHelper.TestUser()
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
  const user = await UserHelper.TestUser()
  brand = await createBrand()

  Context.set({ user, brand })
}

async function createContact(birthday) {
  const user = await UserHelper.TestUser()

  const [id] = await Contact.create(
    [
      {
        user: user.id,
        attributes: attributes({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@doe.com',
          ...(birthday ? { birthday: BIRTHDAY.unix() } : null),
        }),
      },
    ],
    user.id,
    brand.id
  )

  return Contact.get(id)
}

async function createUserAndContact(birthdayBool) {
  const user = await UserHelper.TestUser()
  const contact = await createContact(birthdayBool)
  return { user, contact }
}

describe('BrandTrigger/workers', () => {
  createContext()
  beforeEach(setup)

  context('.updateTriggersHandler()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:184-187
    it('doesn\'t throw when brand trigger ID is missing')

    // lib/models/Trigger/brand_trigger/workers.js:189-196
    context('doesn\'t delete...', () => {
      it('non-email triggers', async()=> {
        const { user, contact } = await createUserAndContact(true)
        const brandEventIdsArray = await BrandEvent.createAll(
          user.id, brand.id, 
          [{title: 'personal meeting', task_type: 'In-Person Meeting'}], 
        )
        const trigger_data = {
          action: 'create_event',
          brand_event: brandEventIdsArray[0],
          brand: brand.id,
          created_by: user.id,
          event_type: 'anniversary',
          user: user.id,
          contact: contact.id,
          wait_for: -86400,
          time: '10:00:00',
        }
      
        // @ts-ignore
        await Trigger.create([trigger_data])
        // @ts-ignore
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'birthday',
          wait_for: -86400,
          subject: 'birthday mail',
          id: '1d8f42ea-155f-11ec-82a8-0242ac130003',
          type: 'birthday',
          created_at: Number(new Date()),
          updated_at: 0,
        }
        const brandTriggerId = await BrandTrigger.insert(bt)
        await BrandTrigger.updateTriggersHandler(brandTriggerId, true)
        const firstTriggerId = await Trigger.filter(
          {deleted_at: null, brand: brand.id, event_type: ['anniversary']}
        )
        const triggers = await Trigger.getAll(firstTriggerId)
        console.log(triggers)
        expect(firstTriggerId.length).to.be.eql(1)
      })
      it('flow triggers')
      it('effectively executed triggers')      
    })
    it('deletes all active email triggers of desired event type')

    // lib/models/Trigger/brand_trigger/workers.js:198-206
    context('doesn\'t create campaign for a contact...', () => {
      it('having no email')
      it('of another brand')
      it('has no value for desired attribute type')
      it('having active email trigger on desired attribute type')
    })
    it('creates campaign for suitable contacts')

    // lib/models/Trigger/brand_trigger/workers.js:198-207
    it('creates email triggers for suitable contacts on desired attribute type')
  })

  context('.dateAttributesCreated()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:229-232
    it('doesn\'t throw when brand trigger ID is missing')

    // lib/models/Trigger/brand_trigger/workers.js:229-232
    context('doesn\'t create campaign for...', () => {
      it('attributes having active trigger')
      it('attribute types having no related brand trigger')
    })

    // lib/models/Trigger/brand_trigger/workers.js:243-246
    it('creates email triggers for contacts having desired attribute type')
  })

  context('.dateAttributesDeleted()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:256-264
    context('doesn\'t delete...', () => {
      it('flow triggers')
      it('non-email triggers')
      it('triggers of other contacts')
      it('triggers of other attribute type')
      it('effectively executed triggers')
    })
    it('deletes active email triggers of the contacts')
  })

  context('.contactsMerged()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:275-278
    it('doesn\'t throw when brand trigger ID is missing')

    context('doesn\'t create campaign for...', () => {
      it('attribute types having no related brand trigger')
      
      // lib/models/Trigger/brand_trigger/workers.js:280-284
      it('other contacts')

      // lib/models/Trigger/brand_trigger/workers.js:305-306
      it('attribute types already have active trigger')
    })

    // lib/models/Trigger/brand_trigger/workers.js:313-316
    it('creates email triggers for merged contacts on suitable attribute types')
  })
  

  it('should return undefined', async() => {
    const result = await BrandTrigger.updateTriggersHandler('nonExistingBrandTriggerId')
    expect(result).to.be.undefined
  })

  it('should create a brand trigger successfully', async() => {
    const { user } = await createUserAndContact(true)
    // @ts-ignore
    const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
    const bt = {
      template: brandTemplates[0].id,
      brand: brand.id,
      created_by: user.id,
      event_type: 'birthday',
      wait_for: -86400,
      subject: 'birthday mail',
      id: '1d8f42ea-155f-11ec-82a8-0242ac130003',
      type: 'birthday',
      created_at: Number(new Date()),
      updated_at: 0,
    }
    const brandTriggerId = await BrandTrigger.insert(bt)
    await BrandTrigger.updateTriggersHandler(brandTriggerId, true)
    const brandTrigger = await BrandTrigger.get(brandTriggerId)
    expect(brandTrigger.id).to.be.eql(brandTriggerId)
    const triggers = await Trigger.filter({
      brand: brand.id,
      event_type: 'birthday',
    })
    expect(triggers.length).to.be.eql(1)
    const campaigns = await Campaign.getByBrand(brand.id, { havingDueAt: null })
    expect(campaigns.length).to.eql(1)
  })

  it('should create date attributes', async() => {
    const { user, contact } = await createUserAndContact(true)
    const attributes = [{ attribute_type: 'birthday', contact: contact.id, created_by: user.id }]
    // @ts-ignore
    const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
    const bt = {
      template: brandTemplates[0].id,
      brand: brand.id,
      created_by: user.id,
      event_type: 'birthday',
      wait_for: -86400,
      subject: 'birthday mail',
      id: '1d8f42ea-155f-11ec-82a8-0242ac130003',
      type: 'birthday',
      created_at: Number(new Date()),
      updated_at: 0,
    }
    await BrandTrigger.insert(bt)
    await BrandTrigger.dateAttributesCreated({ brand: brand.id, attributes })
    const campaigns = await Campaign.getByBrand(brand.id, { havingDueAt: null })
    expect(campaigns.length).to.eql(1)
    const triggers = await Trigger.filter({
      deleted_at: null,
      brand: brand.id,
      event_type: ['birthday'],
    })
    expect(triggers.length).to.eql(1)
  })

  it('should delete date attributes', async() => {
    const { user, contact } = await createUserAndContact(true)
    const attributes = [
      {
        attribute_type: 'birthday',
        contact: contact.id,
        created_by: user.id,
      },
    ]
    // @ts-ignore
    const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
    const bt = {
      template: brandTemplates[0].id,
      brand: brand.id,
      created_by: user.id,
      event_type: 'birthday',
      wait_for: -86400,
      subject: 'birthday mail',
      id: '1d8f42ea-155f-11ec-82a8-0242ac130003',
      type: 'birthday',
      created_at: Number(new Date()),
      updated_at: 0,
    }
    const brandTriggerId = await BrandTrigger.insert(bt)
    await BrandTrigger.updateTriggersHandler(brandTriggerId, true)
    // @ts-ignore
    await BrandTrigger.dateAttributesDeleted({ attributes, created_by: user.id })
    const triggersAfterDelete = await Trigger.filter({
      deleted_at: null,
      brand: brand.id,
      event_type: ['birthday'],
    })
    expect(triggersAfterDelete.length).is.eql(0)
  })
  
  it('should merge contacts', async() => {
    const user = await UserHelper.TestUser()
    const contact1 = await createContact(true)
    const contact2 = await createContact(true)
    // @ts-ignore
    const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
    const bt = {
      template: brandTemplates[0].id,
      brand: brand.id,
      created_by: user.id,
      event_type: 'birthday',
      wait_for: -86400,
      subject: 'birthday mail',
      id: '1d8f42ea-155f-11ec-82a8-0242ac130003',
      type: 'birthday',
      created_at: Number(new Date()),
      updated_at: 0,
    }
    const brandTriggerId = await BrandTrigger.insert(bt)
    await BrandTrigger.updateTriggersHandler(brandTriggerId, true)
    await BrandTrigger.contactsMerged({
      brand_id: brand.id,
      contact_ids: [contact1.id, contact2.id],
      user_id: user.id,
      // @ts-ignore
      event_type: 'birthday',
    })
    const triggerIds = await Trigger.filter({
      brand: brand.id,
      event_type: ['birthday'],
      contacts: [contact1.id],
    })
    expect(triggerIds.length).is.eql(1)
  })
})
