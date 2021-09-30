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
  ...require('../../../../lib/models/Trigger/execute'),

}
const BrandEvent = require('../../../../lib/models/Brand/event')
const BrandFlow = {
  ...require('../../../../lib/models/Brand/flow/get'),
  ...require('../../../../lib/models/Brand/flow/create'),
}
const BrandTrigger = {
  ...require('../../../../lib/models/Trigger/brand_trigger/workers').test, 
  ...require('../../../../lib/models/Trigger/brand_trigger/create'), 
  ...require('../../../../lib/models/Trigger/brand_trigger/get'),
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

async function createUserAndContact(birthdayBool) {
  const user = await UserHelper.TestUser()

  const [id] = await Contact.create(
    [
      {
        user: user.id,
        attributes: attributes({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@doe.com',
          ...(birthdayBool ? { birthday: BIRTHDAY.unix() } : null),
        }),
      },
    ],
    user.id,
    brand.id
  )

  const contact = await Contact.get(id)
  return { user, contact }
}

describe('BrandTrigger/workers', () => {
  createContext()
  beforeEach(setup)
  
  context('.updateTriggersHandler()', () => {
    // lib/models/Trigger/brand_trigger/workers.js:184-187
    it('doesn\'t throw when brand trigger ID is missing', async() => {
      await BrandTrigger.updateTriggersHandler()
    })
  
    it('should return undefined for non existing brant trigger ID', async() => {
      const result = await BrandTrigger.updateTriggersHandler('nonExistingBrandTriggerId')
      expect(result).to.be.undefined
    })
  
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
          event_type: 'birthday',
          user: user.id,
          contact: contact.id,
          wait_for: -86400,
          time: '10:00:00',
        }
        
        // @ts-ignore
        const [triggerId] = await Trigger.create([trigger_data])
        // @ts-ignore
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'birthday',
          wait_for: -86400,
          subject: 'anniversary mail',
        }
        await BrandTrigger.upsert(bt, true)
        await handleJobs()
        const firstTrigger = await Trigger.get(triggerId)
        expect(firstTrigger.deleted_at).to.be.null
      })
  
  
      it('flow triggers', async () => {
        const { user, contact } = await createUserAndContact(true)
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
              event_type: 'last_step_date',
              template_instance: instance.id
            }],
          },
        )
        const brandFlows = await BrandFlow.forBrand(brand.id)
        await Flow.enrollContacts(
          brand.id,
          user.id,
          brandFlowId,
          Date.now() / 1000,
          brandFlows[0].steps,
          [contact.id]
        )
        const triggerIds = await Trigger.filter(
          { deleted_at: null, brand: brand.id }
        )
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
        const trigger = await Trigger.get(triggerIds[0])
        expect(trigger.deleted_at).to.be.null
      })
  
      it('effectively executed triggers', async () => {
        const { user, contact } = await createUserAndContact(true)
        await handleJobs()
        // @ts-ignore
        const [campaignId] = await EmailCampaign.createMany([{
          brand: brand.id,
          created_by: user.id,
          due_at: null,
          from: user.id,
          html: '<div></div>',
          subject: 'Hello!',
          to: [{
            recipient_type: 'Email',
            email: 'john@doe.com',
          }],
        }])
        const trigger_data = {
          action: 'schedule_email',
          brand: brand.id,
          created_by: user.id,
          event_type: 'birthday',
          user: user.id,
          campaign: campaignId,
          contact: contact.id,
          wait_for: -86400,
          time: '10:00:00',
        }
        const [triggerId] = await Trigger.create([trigger_data])
        await handleJobs()
        await Trigger.execute(triggerId)
        await handleJobs()
        await sql.query(`
            UPDATE triggers
            SET executed_at = NOW() - INTERVAL '4 DAY'
            WHERE id = $1
          `, [triggerId])
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
        const trigger = await Trigger.get(triggerId)
        expect(trigger.deleted_at).to.be.null
      })
    })
    it('deletes all active email triggers of desired event type', async() => {
      const { user, contact } = await createUserAndContact(true)
      await handleJobs()
      // @ts-ignore
      const [campaignId] = await EmailCampaign.createMany([{
        brand: brand.id,
        created_by: user.id,
        due_at: null,
        from: user.id,
        html: '<div></div>',
        subject: 'Hello!',
        to: [{
          recipient_type: 'Email',
          email: 'john@doe.com',
        }],
      }])
      const trigger_data = {
        action: 'schedule_email',
        brand: brand.id,
        created_by: user.id,
        event_type: 'birthday',
        user: user.id,
        campaign: campaignId,
        contact: contact.id,
        wait_for: -86400,
        time: '10:00:00',
      }
      const [triggerId] = await Trigger.create([trigger_data])
      await handleJobs()
      await Trigger.execute(triggerId)
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
      await BrandTrigger.upsert(bt, true)
      await handleJobs()
      const trigger = await Trigger.get(triggerId)
      expect(trigger.deleted_at).not.to.be.null
    })
  
    // lib/models/Trigger/brand_trigger/workers.js:198-206
    context('doesn\'t create campaign for a contact...', () => {
      it('having no email', async() => {
        const user = await UserHelper.TestUser()
        await Contact.create(
          [
            {
              user: user.id,
              attributes: attributes({
                first_name: 'John',
                last_name: 'Doe',
                birthday: BIRTHDAY.unix(),
              }),
            },
          ],
          user.id,
          brand.id
        )
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
        const campaigns = await EmailCampaign.getByUser(user.id)
        expect(campaigns.filter(campaign => Boolean(!campaign.deleted_at)).length).to.be.eql(0)
      })
  
      it('of another brand', async() => {
        const { user } = await createUserAndContact(true)
        const newBrand = await BrandHelper.create({
          roles: {
            Admin: [user.id],
          },
          checklists: [],
          contexts: [],
          templates: [{...template, variant: 'Template41'}],
        })
        const brandTemplates = await BrandTemplate.getForBrands({ brands: [brand.id] })
        const bt1 = {
          template: brandTemplates[0].id,
          brand: brand.id,
          created_by: user.id,
          event_type: 'birthday',
          wait_for: -86400,
          subject: 'birthday mail',
        }
        await BrandTrigger.upsert(bt1, true)
        await handleJobs()
        const campaignIds = await EmailCampaign.getByBrand(brand.id, { havingDueAt: null })
          .then(res=> res.map(campaign=>campaign.id))
        const bt2 = { ...bt1, brand: newBrand.id }
        await BrandTrigger.upsert(bt2, true)
        await handleJobs()
        const campaigns = await EmailCampaign.getAll(campaignIds)
        expect(
          campaigns
            .filter(campaign => !campaign.deleted_at)
            .length
        ).to.be.eql(campaignIds.length)
      })
  
      it('has no value for desired attribute type', async () => {
        const { user } = await createUserAndContact(false)
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
        const campaignIds = await EmailCampaign.getByBrand(brand.id, { havingDueAt: null })
          .then(res=> res.map(campaign=>campaign.id))
        expect(campaignIds.length).to.be.eql(0)
      })
        
      it('having active email trigger on desired attribute type')
    })
  
    it('creates campaign and trigger for suitable contacts', async() => {
      const { user } = await createUserAndContact(true)
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
      const brandTrigger = await BrandTrigger.get(brandTriggerId)
      expect(brandTrigger.id).to.be.eql(brandTriggerId)
      const triggerIds = await Trigger.filter({
        brand: brand.id,
        event_type: 'birthday',
      })
      expect(triggerIds.length).to.be.eql(1)
      const campaigns = await Campaign.getByBrand(brand.id, { havingDueAt: null })
      expect(campaigns.length).to.eql(1)
    })
  })
})