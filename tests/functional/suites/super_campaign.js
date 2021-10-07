// @ts-nocheck

const { createUser, createBrands, runAsUser } = require('../util')

function dummy(description, cb) {
  return frisby.create(description)
    .get('/_/dummy')
    .after(cb)
}

module.exports = {
  createAgentUser: createUser({ email: 'agent@rechat.com' }),
  brands: createBrands('create brands', [{
    name: 'Manhattan',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com']
    },
    tags: ['Labor Day'],

    contexts: [],
    checklists: [],
    property_types: [],
  
    children: [{
      name: '140 Franklin',
      brand_type: 'Office',
      roles: {
        Admin: ['test@rechat.com']
      },
      contexts: [],
      checklists: [],
      property_types: [],

      children: [{
        name: 'John Doe\'s Team',
        brand_type: 'Team',
        roles: {
          Agent: ['agent@rechat.com']
        },
        contexts: [],
        checklists: [],
        property_types: [],
      }]
    }]
  }]),
  createEmpty: cb => dummy('create empty super campaign', cb),
  // create,

  // updateSimpleDetails,
  // editTags,
  // editDueDate,

  // addBrands,
  // removeBrand,

  // enrollAgent,
  // removeAgent,

  ...runAsUser('agent@rechat.com', {
    // optIn: dummy,
    optOut: cb => dummy('opt out of a super campaign', cb),
  }),

  // delete: deleteCampaign,
}
