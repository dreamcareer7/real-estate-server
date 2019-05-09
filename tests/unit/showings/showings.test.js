// const moment = require('moment-timezone')

const { createContext } = require('../helper')
// const Context = require('../../../lib/models/Context')

// const Showings = require('../../../lib/models/Showings/showings')
// const ShowingsCredential = require('../../../lib/models/Showings/credential')


async function setup() {
}

async function testOne() {
  expect('id').to.be.a('string')
}

async function testTwo() {
  expect('id').to.be.a('string')
}



describe('Showings', () => {
  describe('Showings Credential', () => {
    createContext()
    beforeEach(setup)

    it('should do sth', testOne)
  })

  describe('Showings Appoinments (events)', () => {
    createContext()
    beforeEach(setup)

    it('should do sth', testTwo)
  })
})
