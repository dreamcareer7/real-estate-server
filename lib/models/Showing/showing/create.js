const { expect } = require('chai')
const range = require('postgres-range')

const db = require('../../../utils/db')

/**
 * @param {import('./types').ShowingInput} showing
 * @param {UUID} user
 * @param {UUID} brand
 */
async function insert(showing, user, brand) {
  const availabilities = (showing.availabilities ?? []).map(a => ({
    ...a,
    availability: range.serialize(new range.Range(a.availability[0], a.availability[1], range.RANGE_LB_INC))
  }))

  return db.insert('showing/showing/insert', [
    /*  $1 */ JSON.stringify(showing.roles ?? []),
    /*  $2 */ JSON.stringify(availabilities),
    /*  $3 */ user,
    /*  $4 */ brand,
    /*  $5 */ showing.start_date,
    /*  $6 */ showing.end_date,
    /*  $7 */ showing.aired_at,
    /*  $8 */ showing.duration,
    /*  $9 */ showing.same_day_allowed,
    /* $10 */ showing.notice_period,
    /* $11 */ showing.approval_type,
    /* $12 */ showing.feedback_template,
    /* $13 */ showing.deal,
    /* $14 */ showing.listing,
    /* $15 */ showing.address,
    /* $16 */ showing.gallery,
    /* $17 */ showing.allow_appraisal,
    /* $18 */ showing.allow_inspection,
    /* $19 */ showing.instructions,
  ])
}

/**
 * @param {import('./types').ShowingInput} showing
 * @param {UUID} user
 * @param {UUID} brand
 */
async function create(showing, user, brand) {
  expect(showing.same_day_allowed, 'same_day_allowed must be a boolean').to.be.a('boolean')
  try {
    return await insert(showing, user, brand)
  } catch (ex) {
    switch (ex.constraint) {
      case 'showings_listing_fkey':
        throw Error.Validation('Provided listing does not exist')
      case 'showings_deal_fkey':
        throw Error.Validation('Provided deal does not exist')
      case 'showings_feedback_template_fkey':
        throw Error.Validation('Provided template instance does not exist')
      case 'showings_gallery_fkey':
        throw Error.Validation('Provided gallery does not exist')
      case 'sr_no_overlap':
        throw Error.Validation('Availability items should not overlap with each other')
      case 'sr_enforce_bounds':
        throw Error.Validation('Availability time range is invalid')
      case 'sr_confirm_notification_type':
        throw Error.Validation('At least one notification type is required for roles who can approve an appointment')
      case 's_end_date':
        throw Error.Validation('End date must either be empty or after start date')
      case 's_listing_exclusion':
        throw Error.Validation('Only one of deal, listing or address must be specified')
      case 's_gallery':
        throw Error.Validation('Either gallery should be null or address should be non-null')
      case 's_same_day':
        if (showing.same_day_allowed) {
          throw Error.Validation('When same_day_allowed is true, notice_period must not be null')
        } else {
          throw Error.Validation('When same_day_allowed is false, notice_period must be null')
        }
      default:
        throw ex
    }
  }
}

module.exports = {
  create,
}
