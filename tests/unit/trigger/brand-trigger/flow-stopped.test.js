const moment = require('moment-timezone')
const { expect } = require('chai')

const Flow = require ('../../../../lib/models/Flow')
const Template = require('../../../../lib/models/Template')
const TemplateInstance = require('../../../../lib/models/Template/instance')
const Trigger = {
  ...require('../../../../lib/models/Trigger/filter.js'),
  ...require('../../../../lib/models/Trigger/get'),
  ...require('../../../../lib/models/Trigger/create'),
  ...require('../../../../lib/models/Trigger/execute'),
}
const BrandFlow = {
  ...require('../../../../lib/models/Brand/flow/get'),
  ...require('../../../../lib/models/Brand/flow/create'),
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

describe('BrandTrigger/workers', () => {
  createContext()
  beforeEach(setup)

  describe('when a flow is stopped', () => {
    it('creates the relevant trigger based on brand trigger', async () => {
      const contact = await createContact({
        birthday: BIRTHDAY.unix(),
        email: 'first_mail@fake.com',
      })
      const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
      const templates = await Template.getAll(brandTemplates.map(bt => bt.template))
      const html = template.html
      const instance = await TemplateInstance.create({
        template: templates[0],
        html,
        deals: [],
        contacts: [],
        listings: [],
        created_by: user
      })
      const brandFlowId = await BrandFlow.create(
        brand.id,
        user.id,
        {
          created_by: user.id,
          name: 'TemplateInstance step',
          description: 'A flow with an template instance email step',
          steps: [{
            title: 'Happy birthday email',
            description: 'Send a customized happy birthday email',
            wait_for: { days: 1 },
            time: '08:00:00',
            order: 1,
            is_automated: false,
            event_type: 'birthday',
            template_instance: instance.id
          }],
        },
      )
      const brandFlows = await BrandFlow.forBrand(brand.id)
      const [flow] = await Flow.enrollContacts(
        brand.id,
        user.id,
        brandFlowId,
        Date.now() / 1000,
        brandFlows[0].steps,
        [contact.id]
      )
      await handleJobs()
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
      await Flow.stop(user.id, flow.id)
      await handleJobs()
      const [globalTriggerId] = await Trigger.filter(
        { deleted_at: null, brand: brand.id, origin: true }
      )
      expect(globalTriggerId).to.be.ok
    })
  })	
})