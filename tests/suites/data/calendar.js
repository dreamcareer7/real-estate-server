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

const deal = {
  deal_type: 'Buying',
  property_type: 'Resale',
  deal_context: {
    'option_period': {
      value: moment().add(3, 'day').format()
    }
  }
}

module.exports = {
  contacts,
  deal,
}