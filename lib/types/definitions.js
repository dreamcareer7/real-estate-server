const types = {
  contact: {
    attributes: {
      phone_number: {
        type: 'object',
        properties: {
          phone_number: {
            type: 'string',
            phone: true,
            required: true
          }
        }
      },
      email: {
        type: 'object',
        properties: {
          email: {
            type: 'string',
            format: 'email',
            required: true
          }
        }
      },
      name: {
        type: 'object',
        properties: {
          first_name: {
            type: 'string',
            required: false
          },
          last_name: {
            type: 'string',
            required: false
          }
        }
      },
      birthday: {
        type: 'object',
        properties: {
          birthday: {
            type: 'number',
            required: true
          }
        }
      },
      tag: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            required: true
          }
        }
      },
      company: {
        type: 'object',
        properties: {
          company: {
            type: 'string',
            required: true
          }
        }
      },
      stage: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            required: true,
            enum: [
              'Contact',
              'UnqualifiedLead',
              'QualifiedLead',
              'Active',
              'Customer',
              'General'
            ]
          }
        }
      },
      address: {
        type: 'object',
        properties: {
          street_name: {
            type: 'string',
            required: false
          },
          city: {
            type: 'string',
            required: false
          },
          state: {
            type: 'string',
            required: false
          },
          country: {
            type: 'string',
            required: false
          },
          postal_code: {
            type: 'string',
            required: false
          }
        }
      }
    }
  }
}

module.exports = types
