const moment = require('moment-timezone')
const DealHelper = require('../../deal/helper')

const { Listing } = require('../../../../lib/models/Listing')
const promisify = require('../../../../lib/utils/promisify')
const sql = require('../../../../lib/models/SupportBot/sql')

module.exports = async function(sellerAgent, buyerAgent, brand, mls_number) {
  await sql.update('UPDATE listings SET list_date = to_timestamp($1) WHERE mls_number = $2', [
    moment().add(-3, 'days').unix(),
    mls_number
  ])

  const listing = await promisify(Listing.getByMLSNumber)(mls_number)

  return DealHelper.create(sellerAgent.id, brand.id, {
    is_draft: false,
    deal_type: 'Selling',
    property_type: 'Resale',
    checklists: [
      {},
      {
        deal_type: 'Buying',
        property_type: 'Resale',
        context: {
          closing_date: {
            value: moment()
              .tz(sellerAgent.timezone)
              .add(10, 'day')
              .startOf('day')
              .format()
          },
          contract_date: {
            value: moment()
              .tz(sellerAgent.timezone)
              .add(-1, 'day')
              .startOf('day')
              .format()
          },
          sales_price: {
            value: 100000
          }
        }
      }
    ],
    roles: [
      {
        role: 'SellerAgent',
        email: sellerAgent.email,
        phone_number: sellerAgent.phone_number,
        legal_first_name: sellerAgent.first_name,
        legal_last_name: sellerAgent.last_name
      },
      {
        role: 'BuyerAgent',
        email: buyerAgent.email,
        phone_number: buyerAgent.phone_number,
        legal_first_name: buyerAgent.first_name,
        legal_last_name: buyerAgent.last_name
      },
      {
        role: 'Buyer',
        email: 'shayan@rechat.com',
        phone_number: '(323) 849-3921',
        legal_first_name: 'Shayan',
        legal_last_name: 'Hamidi'
      },
      {
        role: 'Seller',
        email: 'john@doe.com',
        phone_number: '(323) 849-0825',
        legal_first_name: 'John',
        legal_last_name: 'Doe'
      },
      {
        role: 'Seller',
        email: 'jane@doe.com',
        phone_number: '(310) 553-3260',
        legal_first_name: 'Jane',
        legal_last_name: 'Doe'
      }
    ],
    listing: listing.id
  })
}
