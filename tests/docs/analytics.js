module.exports = {
  global: {
    associations: {
      type: 'array',
      required: false,
      forced: false
    }
  },
  'GET /calendar': {
    low: {
      type: 'number',
      required: true,
      description: 'Lower bound for date range'
    },
    high: {
      type: 'number',
      required: true,
      description: 'Upper bound for date range'
    },
    users: {
      type: 'array',
      required: false,
      description: 'Filter by specific users'
    }
  },
  'GET /calendar/feed': {
    types: {
      type: 'array',
      required: false,
      description: 'Filter by event types'
    },
    users: {
      type: 'array',
      required: false,
      description: 'Filter by specific users'
    }
  }
}
