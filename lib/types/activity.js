module.exports = {
  empty_object: {
    type: 'object',
  },
  ios_app: {
    type: 'object',
    properties: {
      version: {
        type: ['string', null],
        required: false,
      },
    },
  },
  phone_call: {
    type: 'object',
    properties: {
      duration: {
        type: ['number', null],
        required: false,
      },
    },
  },

  envelope_activity: {
    type: 'object',
  },

  deal_task: {
    type: 'object',
  },

  file_rename: {
    type: 'object',
  },

  contact_import_log: {
    type: 'object',
    properties: {
      import_type: {
        type: 'string',
        enum: ['csv', 'ios'],
      },
      count: {
        type: 'number',
      },
      args: {
        type: 'object',
        required: false,
      },
    },
  },

  user_activity_user_login: {
    type: 'object',
    properties: {
      ip_address: { type: 'string', required: true },
      required: true,
    },
  },

  user_activity_user_logout: {
    type: 'object',
    properties: {
      ip_address: { type: 'string', required: true },
      required: true,
    },
  },

  user_activity_search_listings: {
    type: 'object',
    properties: {
      ip_address: { type: 'string', required: true },
      title: { type: 'string', required: true },
    },
  },

  user_activity_view_listing: {
    type: 'object',
    properties: {
      ip_address: { type: 'string', required: true },
      address: { type: 'string', required: false },
      listing: { type: 'string', required: true },
      mls: { type: 'string', required: true },
      mls_number: { type: 'string', required: true },
    },
  },
}
