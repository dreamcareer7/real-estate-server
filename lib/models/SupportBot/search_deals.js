const { NotFound } = require('./errors')

const {
  searchForDeals,
  getAll,
  getPrimaryAgent,
  dealLink,
  getListingStatus
} = require('./deal')

async function command(query) {
  let result

  try {
    result = await searchForDeals(query)
  } catch (ex) {
    if (ex instanceof NotFound) {
      return {
        text: 'No results found.'
      }
    }

    throw ex
  }

  const results_desc =
    (result.length > 1 ? 's' : '') +
    (result.length > 5 ? '. Here are the top 5:' : ':')

  const top_deals = await getAll(result.slice(0, 5))

  return {
    text: `Found ${result.length} result${results_desc}`,
    attachments: top_deals.map(deal => {
      const pa = getPrimaryAgent(deal)
      const pa_user = pa ? pa.user : undefined
      const pa_name = pa ? pa.legal_full_name : '(unknown)'
      const photo = deal.mls_context ? deal.mls_context.photo : undefined

      const msg = {
        author_name:
          (pa_user ? `<mailto:${pa_user.email}|${pa_name}>` : pa_name) +
          ' (' +
          deal.brand.name +
          ')',
        title: deal.title,
        title_link: dealLink(deal.id),
        thumb_url: photo,
        footer: getListingStatus(deal)
      }

      return msg
    })
  }
}

module.exports = {
  command
}
