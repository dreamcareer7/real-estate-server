// null values are supposed to be filled in by suite
const envelope = {
  deal: null,
  title: 'This envelope is sent automatically from our test suite',
  documents: [
    {
      revision: null
    }
  ],
  recipients: [
    {
      firstName: null,
      lastName: null,
      email: null,
      role: 'Buyer'
    },

    {
      role: 'Seller',
      user: null
    }
  ]
}

module.exports = {
  auth: {
    username: 'support@rechat.com',
    password: 'aaaaaa'
  },
  envelope
}