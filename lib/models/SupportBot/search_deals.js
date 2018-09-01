const config = require('../../config')

const { searchForDeals } = require('./deal')

const url = path =>
  `${config.webapp.protocol}://${config.webapp.hostname}${path}`

async function command(query) {
  const result = await searchForDeals(query)

  return {
    text: `Found ${result.length} results. Here are the top 5:`,
    attachments: result.slice(0, 5).map(deal => ({
      author_name: deal.brand,
      title: deal.title,
      title_link: url('/dashboard/deals/' + deal.id),
      footer: deal.is_draft ? 'Draft' : null
    }))
  }
}

module.exports = {
  command
}
