module.exports = {
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
  },

  deal_task: {
    type: 'object'
  },

  file_rename: {
    type: 'object'
  },

  contact_import_log: {
    type: 'object',
    properties: {
      import_type: {
        type: 'string',
        enum: ['csv', 'ios']
      },
      count: {
        type: 'number'
      },
      args: {
        type: 'object',
        required: false
      }
    }
  }
}
