const { attributes } = require('../../contact/helper')

module.exports = [
  {
    attributes: attributes({
      first_name: 'John',
      last_name: 'Doe',
      spouse_first_name: 'Jane',
      spouse_last_name: 'Doe',
      spouse_email: ['jane@doe.com'],
      email: ['john@doe.com'],
      tag: ['family', 'friends'],
      city: { text: 'Dallas', index: 1, label: 'Home' },
      state: { text: 'Texas', index: 1, label: 'Home' },
      country: { text: 'US', index: 1, label: 'Home' },
      postal_code: { text: '75201', index: 1, label: 'Home' },
      street_number: { text: '1505', index: 1, label: 'Home' },
      street_name: { text: 'Elm', index: 1, label: 'Home' },
      street_suffix: { text: 'street', index: 1, label: 'Home' },
      unit_number: { text: 'Unit 1101', index: 1, label: 'Home' },
    })
  },
  {
    attributes: attributes({
      first_name: 'Emil',
      last_name: 'Sedgh',
      email: ['emil@rechat.com', 'emil+agent@rechat.com'],
      tag: ['friends']
    })
  },
  {
    attributes: attributes({
      first_name: 'Brad',
      last_name: 'Pitt',
      email: ['bradpitt@hollywood.com'],
      tag: ['hollywood']
    })
  }
]
