const moment = require('moment-timezone')
const { expect } = require('chai')

const sql = require('../../../../lib/utils/sql')

const EmailCampaign = {
  ...require('../../../../lib/models/Email/campaign/create'),
  ...require('../../../../lib/models/Email/campaign/get'),
}
const Flow = require ('../../../../lib/models/Flow')
const Template = require('../../../../lib/models/Template')
const TemplateInstance = require('../../../../lib/models/Template/instance')
const Trigger = {
  ...require('../../../../lib/models/Trigger/filter.js'),
  ...require('../../../../lib/models/Trigger/get'),
  ...require('../../../../lib/models/Trigger/create'),
  ...require('../../../../lib/models/Trigger/update'),

}
const BrandEvent = require('../../../../lib/models/Brand/event')
const BrandFlow = {
  ...require('../../../../lib/models/Brand/flow/get'),
  ...require('../../../../lib/models/Brand/flow/create'),
}
const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/workers'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/create'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
	...require('../../../../lib/models/Trigger/brand_trigger/exclusions'), 
}
const Campaign = {
  ...require('../../../../lib/models/Email/campaign/get.js'),
  ...require('../../../../lib/models/Email/create.js'),
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

	describe('makeExclusion function ...', () => {
		it('prevents global trigger making', async () => {
			const contact = await createContact({
				birthday: BIRTHDAY.unix(),
				email: 'first_mail@fake.com',
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
			const brandTriggerId = await BrandTrigger.upsert(bt, true)
			await handleJobs()
			const [triggerId] = await Trigger.filter({
				brand: brand.id,
				event_type: 'birthday',
			})
			await Trigger.clearOrigin(triggerId)
			await BrandTrigger.makeExclusion(brand.id, bt.event_type, [contact.id])
			const exclusions = await BrandTrigger.getExclusions(brandTriggerId, bt.event_type)
			expect(exclusions.length).to.be.eql(1)
			await BrandTrigger.updateTriggers(brandTriggerId, true)
			await handleJobs()
			const triggerIds = await Trigger.filter({
				brand: brand.id,
				event_type: 'birthday',
			})
			const triggers = await Trigger.getAll(triggerIds)
			expect(triggerIds.length).to.be.eql(1)
      const theSameOldTrigger = await Trigger.get(triggerId)
      expect(theSameOldTrigger.deleted_at).to.be.null
			expect(theSameOldTrigger.origin).to.be.null
		})
	})
	
})