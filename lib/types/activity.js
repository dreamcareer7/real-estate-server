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
  }
}
