const { expect } = require('chai')
const { readFile} = require('fs').promises
const { createContext } = require('../helper')
const renderer = require('../../../lib/utils/render')
const ListingHelper = require('../mls/helpers/listing')
const config = require('../../../lib/config')

const timeout = async function() {
  this.timeout(60000)

  const max = 10000
  const template = (await readFile(`${__dirname}/template.html`)).toString()
  const listing = await ListingHelper.create()
  const user = await User.getByEmail(config.tests.username)

  const contexts = []

  for(let i = 0; i <= max; i++) {
    contexts.push({
      listing,
      user
    })
  }

  await renderer.htmlStrings(template, contexts)
}

const accuracy = async function() {
  const max = 100
  const template = 'Item {{i}}'

  const contexts = []

  for(let i = 0; i <= max; i++) {
    contexts.push({i})
  }

  const results = await renderer.htmlStrings(template, contexts)

  for(let i = 0; i <= max; i++) {
    const result = results[i]
    expect(result).to.equal(`Item ${i}`)
  }
}

describe('Renderer', () => {
  createContext()

  it('should render a big template many times quickly', timeout)
  it('should make sure everything is rendered properly', accuracy)
})
