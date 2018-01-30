const deal = {
  deal_type: 'Buying',
  property_type: 'Resale',

  deal_context: {

  }
}

const full_address = '3030 Bryan Street Unit 308, 75204, Dallas, TX'

const address = {
  postal_code: {
    value: '75204',
  },
  street_name: {
    value: 'Bryan'
  },
  unit_number: {
    value: '308'
  },
  full_address: {
    value: full_address
  },
  street_number: {
    value: '3030'
  },
  street_suffix: {
    value: 'Street'
  },
  street_address: {
    value: '3030 Bryan Street'
  }
}

module.exports = { deal, address, full_address }
