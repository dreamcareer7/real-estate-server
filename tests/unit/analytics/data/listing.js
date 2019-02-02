const moment = require('moment-timezone')
const DealHelper = require('../../deal/helper')

const { Listing } = require('../../../../lib/models/Listing')
const sql = require('../../../../lib/models/SupportBot/sql')

module.exports = async function(sellerAgent, brand, mls_number) {
  await sql.update('UPDATE listings SET list_date = to_timestamp($1) WHERE mls_number = $2', [
    moment().add(-5, 'days').unix(),
    mls_number
  ])

  const listing = await Listing.getByMLSNumber(mls_number)

  return DealHelper.create(sellerAgent.id, brand.id, {
    is_draft: false,
    deal_type: 'Selling',
    property_type: 'Resale',
    checklists: [
      {
        context: {
          list_date: {
            value: moment()
              .tz(sellerAgent.timezone)
              .add(-5, 'day')
              .startOf('day')
              .format()
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
      }
    ],
    listing: listing.id
  })
}
