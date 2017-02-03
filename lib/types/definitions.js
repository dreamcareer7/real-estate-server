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
            type: ['string', null],
            required: false
          },
          last_name: {
            type: ['string', null],
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
      profile_image_url: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            url: true,
            required: true
          }
        }
      },
      cover_image_url: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            url: true,
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
            type: ['string', null],
            required: false
          },
          city: {
            type: ['string', null],
            required: false
          },
          state: {
            type: ['string', null],
            required: false
          },
          country: {
            type: ['string', null],
            required: false
          },
          postal_code: {
            type: ['string', null],
            required: false
          }
        }
      }
    }
  }
}

module.exports = types
