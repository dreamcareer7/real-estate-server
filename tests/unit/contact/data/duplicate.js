const { attributes } = require('../../contact/helper')

module.exports = [
  [
    {
      attributes: attributes({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@rechat.com'
      })
    },
    {
      attributes: attributes({
        first_name: 'Johnny',
        email: ['john@rechat.com', 'john@doe.com'],
        phone_number: '+12345678901'
      })
    },
    {
      attributes: attributes({
        first_name: 'Thomas',
        email: ['tom@rechat.com', 'john@doe.com']
      })
    },
    {
      attributes: attributes({
        first_name: 'Lena',
        phone_number: '+12345678901'
      })
    }
  ],
  [
    {
      attributes: attributes({
        first_name: 'Gholi',
        last_name: 'Gholavi',
        email: 'gholi@gholavi.com'
      })
    },
    {
      attributes: attributes({
        first_name: 'Gholi',
        email: ['gholi@gholavi.com'],
        phone_number: '+00000000000'
      })
    }
  ]
]
