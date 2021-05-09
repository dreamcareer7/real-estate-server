const Deal = require('../../Deal/index')
const { updateTitleFromDeal } = require('./worker')

function updateShowingTitle({ deal, title }) {
  updateTitleFromDeal(deal, title)
}

function attach() {
  Deal.on('update:title', updateShowingTitle)
}

module.exports = attach