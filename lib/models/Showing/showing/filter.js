const sq = require('../../../utils/squel_extensions')
const db = require('../../../utils/db')

/**
 * @param {string | undefined} str
 * @returns {string}
 */
function sanitizeTsquery (str) {
  if (!str || typeof str !== 'string') { return '' }

  return str
    .replace(/,|:|\*|\||&|\(|\)/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(term => `${term}:*`)
    .join('&')
}

/**
 * @param {import("@rechat/squel").PostgresSelect} q
 * @param {string | undefined} query
 */
function queryFilter (q, query) {
  const tsquery = sanitizeTsquery(query)
  if (!tsquery) { return }
  
  q.left_join('listings_filters', 'qf_list', 'qf_list.id = showings.listing')
    .left_join('showings_roles', 'qf_role', 'qf_role.showing = showings.id')
    .left_join('agents', 'qf_agent', 'qf_agent.id = qf_role.agent')
    .where('qf_role.role = ?', 'SellerAgent')

  const fullContent = sq.rstr(`concat_ws(
    ' ',
    qf_list.address,
    qf_list.mls_number,
    qf_role.first_name,
    qf_role.last_name,
    qf_agent.mlsid
  )`)

  q.where('? @@ to_tsquery(?)', fullContent, tsquery)
}

/**
 * @param {import("./types").ShowingFilterOptions} opts 
 */
async function filter(opts) {
  const q = sq
    .select({
      rawNesting: true
    })
    .field('showings.id')
    .field('COUNT(*) OVER()::INT', 'total')
    .from('showings')
  
  if (opts.brand) {
    q.where('showings.brand = ?', opts.brand)
  }

  if (opts.parentBrand) {
    q.where(
      'showings.brand = ANY(SELECT brand_children(?::uuid))',
      opts.parentBrand,
    )
  }
  
  if (opts.deal) {
    q.where('showings.deal = ?', opts.deal)
  }
  
  if (opts.listing) {
    q.where('showings.listing = ?', opts.listing)
  }

  if (opts.live === true) {
    q.where('showings.aired_at IS NOT NULL')
  } else if (opts.live === false) {
    q.where('showings.aired_at IS NULL')    
  }

  if (opts.query && typeof opts.query === 'string') {
    queryFilter(q, opts.query)
  }
  
  q.order('showings.created_at', false)

  Object.assign(q, { name: 'showing/showing/filter' })

  const rows = await db.select(q)

  return {
    ids: rows.map(r => r.id),
    total: rows[0]?.total ?? 0,
  }
}

module.exports = {
  filter,
}
