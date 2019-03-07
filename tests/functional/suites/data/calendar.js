const moment = require('moment')

const contacts = [{
  first_name: 'John',
  last_name: 'Doe',
  birthday: moment().subtract(1, 'day').unix(),
  wedding_anniversary: moment().subtract(2, 'days').year(1800).unix(),
  partner_first_name: 'Jane',
  partner_last_name: 'Doe',
  partner_birthday: moment().subtract(5, 'days').unix(),
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
