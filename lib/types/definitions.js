const types = {
  activity: {
    empty_object: {
      type: 'object'
    },
    ios_app: {
      type: 'object',
      properties: {
        version: {
          type: ['string', null],
          required: false
        }
      }
    },
    phone_call: {
      type: 'object',
      properties: {
        duration: {
          type: ['number', null],
          required: false
        }
      }
    }
  },
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
          profile_image_url: {
            type: 'string',
            url: true,
            required: true
          }
        }
      },
      cover_image_url: {
        type: 'object',
        properties: {
          cover_image_url: {
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
      },
      source_type: {
        type: 'object',
        properties: {
          source_type: {
            type: 'string',
            required: true,
            enum: [
              'BrokerageWidget',
              'IOSAddressBook',
              'SharesRoom',
              'ExplicitlyCreated'
            ]
          }
        }
      },
      brand: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            required: true,
            uuid: true
          }
        }
      },
      note: {
        type: 'object',
        properties: {
          note: {
            type: 'string',
            required: true
          }
        }
      }
    }
  }
}

module.exports = types
