const { peanar } = require('../../../utils/peanar')
const { filter } = require('./filter')
const { updateTitle } = require('./update')

async function updateTitleFromDeal(deal, title) {
  const { ids } = await filter({ deal })
  if (ids.length === 0) {
    return
  }

  for (const id of ids) {
    await updateTitle(id, title)
  }
}

module.exports = {
  updateTitleFromDeal: peanar.job({
    handler: updateTitleFromDeal,
    name: 'update_title_from_deal',
    exchange: 'showings',
    queue: 'showings',
  }),
}
