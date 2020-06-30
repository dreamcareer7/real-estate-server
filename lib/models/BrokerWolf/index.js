if (process.env.NODE_ENV === 'tests')
  require('./mock.js')

const BrokerWolf = {
  Settings: require('./settings'),
  Members: require('./members'),
  Classifications: require('./classifications'),
  PropertyTypes: require('./property-types'),
  ContactTypes: require('./contact-types')
}

module.exports = BrokerWolf
