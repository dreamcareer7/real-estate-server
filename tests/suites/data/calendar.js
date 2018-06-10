const moment = require('moment')

const contacts = [{
  first_name: 'Abbas',
  last_name: 'Mashayekh',
  birthday: moment().subtract(1, 'day').unix()
}, {
  first_name: 'Gholi',
  last_name: 'Gholavi',
  birthday: moment().add(1, 'day').unix()
}]

const deals = [{
  deal_type: 'Buying',
  property_type: 'Resale',

  deal_context: {
    full_address: '3030 Bryan Street Unit 308, 75204, Dallas, TX'
  }
}]

module.exports = {
  contacts,
}