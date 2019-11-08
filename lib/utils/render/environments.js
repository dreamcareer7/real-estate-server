const nunj = require('nunjucks')

const filters = require('./filters')

const env = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production'
})
const env2 = new nunj.configure({
  noCache: process.env.NODE_ENV !== 'production',
  autoescape: false
})

for (const [name, filter] of Object.entries(filters)) {
  env.addFilter(name, filter)
  env2.addFilter(name, filter)
}

module.exports = {
  html: env.render.bind(env),
  htmlString: env.renderString.bind(env),
  text: env2.render.bind(env2),
  textString: env2.renderString.bind(env2),
}
