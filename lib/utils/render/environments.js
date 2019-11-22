const nunj = require('nunjucks')

const filters = require('./filters')

const html = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production'
})
const text = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production',
  autoescape: false
})

for (const [name, filter] of Object.entries(filters)) {
  html.addFilter(name, filter)
  text.addFilter(name, filter)
}

module.exports = {
  html,
  text
}
