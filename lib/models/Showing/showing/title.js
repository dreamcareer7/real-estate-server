const Orm = require('../../Orm')
const sql = require('../../../utils/sql')

/**
 * @param {import('./types').ShowingInput} showing
 */
async function getShowingTitle(showing) {
  const fakeModel = {
    deal: showing.deal,
    listing: showing.listing,
    address: showing.address,
    type: 'showing',
  }

  if (showing.address) {
    const res = await sql.selectOne('SELECT STDADDR_TO_JSON(JSON_TO_STDADDR($1::jsonb)) AS address', [showing.address])
    return res.address.line1
  }

  /** @type {[import('./types').ShowingPopulated]} */
  const [populated] = await Orm.populate({
    models: [fakeModel],
    associations: ['showing.listing', 'showing.deal'],
  })

  return formatShowingTitle(populated)
}

/**
 * A showing's title can come from three different sources:
 *
 *   1. A listing address
 *   2. A deal address from either the connected listing or manual deal context
 *   3. The specified StdAddr address
 *
 * We assume that if a showing is connected to a listing, the title won't change.
 * FIXME: is that a fair assumption?
 *
 * @param {import("../showing/types").ShowingPopulated} showing
 */
function formatShowingTitle(showing) {
  if (showing.deal) {
    return showing.deal.title
  }
  if (showing.listing) {
    return showing.listing.property.address.street_address
  }
  if (showing.address) {
    return showing.address.line1
  }

  throw Error.Validation('Could not infer a title for the showing')
}

module.exports = {
  getShowingTitle,
  formatShowingTitle,
}
