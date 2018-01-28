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
    },

    envelope_activity: {
      type: 'object'
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
          title: {
            type: ['string', null],
            required: false
          },
          first_name: {
            type: ['string', null],
            required: false
          },
          middle_name: {
            type: ['string', null],
            required: false
          },
          last_name: {
            type: ['string', null],
            required: false
          },
          nickname: {
            type: ['string', null],
            required: false
          },
          legal_prefix: {
            type: ['string', null],
            required: false
          },
          legal_first_name: {
            type: ['string', null],
            required: false
          },
          legal_middle_name: {
            type: ['string', null],
            required: false
          },
          legal_last_name: {
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
      job_title: {
        type: 'object',
        properties: {
          job_title: {
            type: 'string',
            required: true
          }
        }
      },
      website: {
        type: 'object',
        properties: {
          website: {
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
              'General',
              'PastClient'
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
              'ExplicitlyCreated',
<<<<<<< HEAD
              'External/Outlook'
=======
              'CSV'
>>>>>>> testing
            ]
          }
        }
      },
      source_id: {
        type: 'object',
        properties: {
          source_id: {
            type: 'string',
            required: true
          }
        }
      },
      last_modified_on_source: {
        type: 'object',
        properties: {
          birthday: {
            type: 'number',
            required: true
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
      },
      relation: {
        type: 'object',
        properties: {
          relation: {
            type: 'string',
            required: true,
            enum: [
              'Spouse',
              'Partner',
              'Child',
              'Friend',
              'Coworker',
              'Other',
            ]
          },
          contact: {
            type: 'string',
            required: true,
            uuid: true
          }
        }
      }
    }
  }
}

module.exports = types
