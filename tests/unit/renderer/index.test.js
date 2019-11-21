const { expect } = require('chai')
const { readFile} = require('fs').promises
const { createContext } = require('../helper')
const renderer = require('../../../lib/utils/render')
const ListingHelper = require('../mls/helpers/listing')
const config = require('../../../lib/config')

const timeout = async function() {
  this.timeout(30000)

  const max = 10000
  const template = (await readFile(`${__dirname}/template.html`)).toString()
  const listing = await ListingHelper.create()
  const user = await User.getByEmail(config.tests.username)

  const { render, release } = await renderer.compileHtml(template)

  for(let i = 0; i <= max; i++) {
    await render({
      listing,
      user
    })
  }

  release()
}

const accuracy = async function() {
  const max = 100
  const template = 'Item {{i}}'

  const { render, release } = await renderer.compileText(template)

  for(let i = 0; i <= max; i++) {
    const result = await render({i})
    expect(result).to.equal(`Item ${i}`)
  }

  release()
}

const validate = async function() {
  const template = '{{i}'

  let error

  try {
    await renderer.compileText(template)
  } catch(err) {
    error = err
  }

  expect(error.http).to.equal(400)
}

describe('Renderer', () => {
  createContext()

  it('should render a big template many times quickly', timeout)
  it('should make sure everything is rendered properly', accuracy)
  it('should error during compilation of an invalid template', validate)
})
