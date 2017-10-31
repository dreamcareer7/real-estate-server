const charge = {
  id: 'cus_AysUqgaAooF2bb',
  object: 'customer',
  account_balance: 0,
  created: 1499427269,
  currency: null,
  default_source: 'card_1AcujBAl4y1ynezDdGh3xXG7',
  delinquent: false,
  description: null,
  discount: null,
  email: null,
  livemode: false,
  metadata: {
    owner: '80a227b2-29a0-11e7-b636-e4a7a08e15d4'
  },
  shipping: null,
  sources: {
    object: 'list',
    data: [
      [
        null
      ]
    ],
    has_more: false,
    total_count: 1,
    url: '/v1/customers/cus_AysUqgaAooF2bb/sources'
  },
  subscriptions: {
    object: 'list',
    data: [],
    has_more: false,
    total_count: 0,
    url: '/v1/customers/cus_AysUqgaAooF2bb/subscriptions'
  }
}

const customer = { id: 'cus_Az3sOfwEJ3XvLY',
  object: 'customer',
  account_balance: 0,
  created: 1499469673,
  currency: null,
  default_source: 'card_mock_source',
  delinquent: false,
  description: null,
  discount: null,
  email: null,
  livemode: false,
  metadata: { owner: '80a227b2-29a0-11e7-b636-e4a7a08e15d4' },
  shipping: null,
  sources:
  { object: 'list',
    data:
    [ { id: 'card_mock_id',
      object: 'card',
      address_city: null,
      address_country: null,
      address_line1: null,
      address_line1_check: null,
      address_line2: null,
      address_state: null,
      address_zip: null,
      address_zip_check: null,
      brand: 'Visa',
      country: 'US',
      customer: 'cus_Az3sOfwEJ3XvLY',
      cvc_check: null,
      dynamic_last4: null,
      exp_month: 8,
      exp_year: 2019,
      fingerprint: 'KLKJoiVFXSq7RAr4',
      funding: 'credit',
      last4: '4242',
      metadata: {},
      name: null,
      tokenization_method: null } ],
    has_more: false,
    total_count: 1,
    url: '/v1/customers/cus_Az3sOfwEJ3XvLY/sources' },
  subscriptions:
  { object: 'list',
    data: [],
    has_more: false,
    total_count: 0,
    url: '/v1/customers/cus_Az3sOfwEJ3XvLY/subscriptions' } }


const createCharge = (data, cb) => {
  cb(null, charge)
}

const createCustomer = (data, cb) => {
  cb(null, customer)
}

module.exports = {
  charges: {
    create: createCharge
  },

  customers: {
    create: createCustomer
  }
}