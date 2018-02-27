const { registerSuite } = intern.getInterface('object')
const {expect} =  intern.getPlugin('chai')
const gData = require('./data')
const dHelper = require('../../../lib/models/MSGraph/msgraph-data-helper')
const _ = require('lodash')

registerSuite('Data helper', {
  tests: {
    
    'Convert data from MS Graph format to DB format'() {
      const converted = dHelper.convertData(gData.GRAPH_DATA.value, dHelper.msGraphToDBMapper)
      expect(converted.length).to.equal(5)
      const converted_2 = dHelper.convertData([_.first(gData.GRAPH_DATA.value)], dHelper.msGraphToDBMapper)
      expect(converted_2.length).to.equal(1)
      expect(_.first(converted_2)).to.have.property('emails')
      expect(_.get(converted_2, '0.emails').length).to.equal(1)
    }
  }
})