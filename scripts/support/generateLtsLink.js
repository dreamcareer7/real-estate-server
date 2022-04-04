const { generateLtsLink } = require('../../lib/models/Contact/lead/link')
const { runInContext } = require('../../lib/models/Context/util')
const Context = require('../../lib/models/Context/index')

runInContext('generate_lts_link', async (program) => {
  const link = await generateLtsLink({
    brand: program.brand,
    user: program.user,
    mls: ['NTREIS'],
    protocol: 'JSON',
    source: 'Website',
    notify: true
  })

  Context.log(link)
})
  .then(() => process.exit())
  .catch(e => {
    console.log(e)
    process.exit()
  })
