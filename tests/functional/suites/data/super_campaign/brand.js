const { AGENT_SMITH1, AGENT_SMITH2, AGENT_SMITH3, DARTH_VADER, NARUTO } = require('./emails')

module.exports = [
  {
    name: 'Manhattan',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com'],
    },
    tags: ['Labor Day', 'Christmas'],
    templates: [
      {
        name: 'fake-template-brand-trigger-test',
        variant: 'Template40',
        inputs: ['listing', 'user'],
        template_type: 'JustSold',
        medium: 'Email',
        html: '<div>fakeTemplate</div>',
        mjml: false,
      },
    ],

    contexts: [],
    checklists: [],
    property_types: [],

    children: [
      {
        name: '140 Franklin',
        brand_type: 'Office',
        roles: {
          Admin: ['test@rechat.com'],
        },
        contexts: [],
        checklists: [],
        property_types: [],

        children: [
          {
            name: 'The Matrix',
            brand_type: 'Team',
            roles: {
              Agent: [AGENT_SMITH1, AGENT_SMITH2, AGENT_SMITH3],
            },
            contexts: [],
            checklists: [],
            property_types: [],
          },
          {
            name: 'The Dark Side',
            brand_type: 'Personal',
            roles: {
              Agent: [DARTH_VADER],
            },
            contexts: [],
            checklists: [],
            property_types: [],
          },
          {
            name: 'Konohagakur',
            brand_type: 'Team',
            roles: {
              Agent: [NARUTO],
            },
            contexts: [],
            checklists: [],
            property_types: [],
          },
        ],
      },
    ],
  },
]
