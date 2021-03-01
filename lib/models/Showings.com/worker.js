const config     = require('../../config')
const db         = require('../../utils/db.js')
const { peanar } = require('../../utils/peanar/index')

const ShowingsCredential = require('./credential')
const { startCrawler }   = require('./crawler')


const ShowingsWorker = {
  // Runs in poller script
  async startDue() {
    const rows = await db.select('showings.com/credential/due', [config.showings.crawling_gap_hour])
    const ids = rows.map(r => r.id)

    let isFirstCrawl = true

    for (const showing_credential_id of ids) {
      const showingCredential = await ShowingsCredential.get(showing_credential_id)

      if (showingCredential.last_crawled_at) isFirstCrawl = false

      // action enum : showings / appoinmentsForBuyers
      const data = {
        meta: {
          isFirstCrawl: isFirstCrawl,
          action: 'showings'
        },
        showingCredential: showingCredential
      }

      ShowingsWorker.startCrawler(data)
    }

    return ids
  },

  // Runs in workers
  startCrawler: peanar.job({
    handler: startCrawler,
    name: 'showings_crawler',
    queue: 'showings',
    exchange: 'showings'
  })
}

module.exports = ShowingsWorker
