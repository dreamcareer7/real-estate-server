const { expect } = require('chai')
const range = require('postgres-range')

const db = require('../../../utils/db')
const Brand = require('../../Brand/access')

const Role = require('../role/create')
const { getShowingTitle } = require('./title')

const ShowingHub = require('../showinghub/events')

/**
 * @param {import('./types').ShowingInput} showing
 * @param {UUID} user
 * @param {UUID} brand
 */
async function insert(showing, user, brand) {
  const availabilities = (showing.availabilities ?? []).map((a) => ({
    ...a,
    availability: range.serialize(
      new range.Range(a.availability[0], a.availability[1], range.RANGE_LB_INC)
    ),
  }))

  const title = await getShowingTitle(showing)

  return db.insert('showing/showing/insert', [
    /*  $1 */ JSON.stringify(availabilities),
    /*  $2 */ user,
    /*  $3 */ brand,
    /*  $4 */ showing.start_date,
    /*  $5 */ showing.end_date,
    /*  $6 */ showing.aired_at,
    /*  $7 */ showing.duration,
    /*  $8 */ showing.same_day_allowed,
    /*  $9 */ showing.notice_period,
    /* $10 */ showing.approval_type,
    /* $11 */ showing.feedback_template,
    /* $12 */ showing.deal,
    /* $13 */ showing.listing,
    /* $14 */ JSON.stringify(showing.address),
    /* $15 */ showing.gallery,
    /* $16 */ showing.allow_appraisal,
    /* $17 */ showing.allow_inspection,
    /* $18 */ showing.instructions,
    /* $19 */ title,
  ])
}

/**
 * @param {import('./types').ShowingInput} showing 
 * @param {UUID} brand 
 */
async function validate(showing, brand) {
  expect(showing.same_day_allowed, 'same_day_allowed must be a boolean').to.be.a('boolean')

  const sellerAgentRoles = showing.roles.filter((r) => r.role === 'SellerAgent')
  expect(sellerAgentRoles, 'Exactly one SellerAgent role must be defined').to.have.length(1)
  const sellerAgent = sellerAgentRoles[0]
  if (!sellerAgent) {
    throw Error.Validation('SellerAgent role not defined')
  }
  expect(sellerAgent.user, 'SellerAgent must be an active user in the system').to.be.uuid
  try {
    await Brand.limitAccess({ brand, user: sellerAgent.user, roles: ['Showings'] })
  } catch {
    throw Error.Validation('SellerAgent does not have Showings access on this team.')
  }

  if (showing.availabilities.length < 1) {
    throw Error.Validation('Showing must have at least one availability rule.')
  }
}

/**
 * @param {import('./types').ShowingInput} showing
 * @param {UUID} user
 * @param {UUID} brand
 */
async function create(showing, user, brand) {
  await validate(showing, brand)
  try {
    const showing_id = await insert(showing, user, brand)
    await Role.create(user, showing_id, showing.roles)

    await ShowingHub.emit.showingCreated(showing_id)
    
    return showing_id
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
