const { generateLtsLink } = require('./scripts/support/generateLtsLink')

const brand = 'e57c9d92-5d95-11ec-890a-0271a4acc769'
const user = 'f25e5224-eebb-11eb-8807-0271a4acc769'
const protocol = 'JSON'
const source = 'Intercom'

function gen(source) {
  const link = generateLtsLink({
    brand,
    source,
    user,
    protocol,
    mls: null,
    notify: false
  })
  return link
}
