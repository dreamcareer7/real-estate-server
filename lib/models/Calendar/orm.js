const Orm = require('../Orm/registry')

/** @type {Record<string, import('../Orm').OrmAssociationDefinition<any, any>>} */
const associations = {
  people: {
    // Items will be either Contact or Agent
    polymorphic: true,
    enabled: false,
    collection: true
  },
  full_crm_task: {
    model: 'CrmTask',
    enabled: false,
    id(event, cb) {
      cb(null, event.crm_task)
    }
  },
  full_deal: {
    model: 'Deal',
    enabled: false,
    id(event, cb) {
      cb(null, event.deal)
    }
  },
  full_contact: {
    model: 'Contact',
    enabled: false,
    id(event, cb) {
      cb(null, event.contact)
    }
  },
  full_campaign: {
    model: 'EmailCampaign',
    enabled: false,
    id(event, cb) {
      cb(null, event.campaign)
    }
  },
  full_showing: {
    model: 'Showing',
    enabled: false,
    id(event, cb) {
      cb(null, event.showing)
    }
  },
  activity: {
    model: 'Activity',
    enabled: false
  },
  full_thread: {
    model: 'EmailThread',
    enabled: false,
    id(event, cb) {
      cb(null, event.thread_key)
    }
  }
}


const publicize = (event) => {
  delete event.user
  delete event.brand
}

Orm.register('calendar_event', 'Calendar', {
  publicize,
  associations
})
