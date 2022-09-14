module.exports = [
  {
    name: 'LeadChannel',
    brand_type: 'Team',
    roles: {
      Agent: ['test@rechat.com'],
    },
    templates: [
      {
        name: 'fake-template-brand-trigger-test',
        variant: 'Template40',
        inputs: [],
        template_type: 'JustSold',
        medium: 'Social',
        html: '<div>fakeTemplate</div>',
        mjml: false,
      },
    ],

    contexts: [],
    checklists: [],
    property_types: [],
  },
  {
    name: 'Brooklyn',
    brand_type: 'Region',
    roles: {
      Admin: ['test@rechat.com'],
    },
    contexts: [],
    checklists: [],
    property_types: [],
  } 
]
