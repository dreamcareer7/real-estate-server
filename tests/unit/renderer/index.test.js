const { expect } = require('chai')
const { readFile} = require('fs').promises
const { createContext } = require('../helper')
const renderer = require('../../../lib/utils/render')
const ListingHelper = require('../mls/helpers/listing')
const config = require('../../../lib/config')


const worker = async function() {
  this.timeout(30000)

  const max = 10000
  const template = (await readFile(`${__dirname}/template.html`)).toString()
  const listing = await ListingHelper.create()
  const user = await User.getByEmail(config.tests.username)

  const promises = []

  for(let i = 0; i<=max; i++) {
    const promise = renderer.isolated.htmlString(template, {
      listing,
      user
    })
    promises.push(promise)
  }

  const all = await Promise.all(promises)
  console.log('Done')
}

describe('Renderer', () => {
  createContext()

  it('should render a template in a worker', worker)
})
