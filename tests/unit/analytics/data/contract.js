const moment = require('moment-timezone')
const DealHelper = require('../../deal/helper')

const { Listing } = require('../../../../lib/models/Listing')
const promisify = require('../../../../lib/utils/promisify')

module.exports = async function(buyerAgent, brand, mls_number) {
  const listing = await promisify(Listing.getByMLSNumber)(mls_number)

  return DealHelper.create(buyerAgent.id, brand.id, {
    is_draft: false,
    deal_type: 'Buying',
    property_type: 'Resale',
    checklists: [{
      context: {
        closing_date: {
          value: moment()
            .tz(buyerAgent.timezone)
            .add(15, 'day')
            .startOf('day')
            .format()
        },
        contract_date: {
          value: moment()
            .tz(buyerAgent.timezone)
            .add(-4, 'day')
            .startOf('day')
            .format()
        },
        sales_price: {
          value: 374000
        }
      }
    }],
    roles: [
      {
        role: 'BuyerAgent',
        email: buyerAgent.email,
        phone_number: buyerAgent.phone_number,
        legal_first_name: buyerAgent.first_name,
        legal_last_name: buyerAgent.last_name
      }
    ],
    listing: listing.id
  })
}
