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
    /*  $7 */ showing.duration,
    /*  $8 */ showing.notice_period,
    /*  $9 */ showing.approval_type,
    /* $10 */ showing.feedback_template,
    /* $11 */ showing.deal,
    /* $12 */ showing.listing,
    /* $13 */ showing.address,
    /* $14 */ showing.gallery,
  ])
}

/**
 * @param {import('./types').ShowingInput} showing
 * @param {UUID} user
 * @param {UUID} brand
 */
async function create(showing, user, brand) {
  try {
    return await insert(showing, user, brand)
  } catch (ex) {
    switch (ex.constraint) {
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
      default:
        throw ex
    }
  }
}

module.exports = {
  create,
}
