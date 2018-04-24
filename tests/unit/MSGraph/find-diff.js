// const { registerSuite } = intern.getInterface('object')
// const {expect} = intern.getPlugin('chai')
// const gData = require('./data')
// const diff = require('../../../lib/models/MSGraph/find-diff')
// const dHelper = require('../../../lib/models/MSGraph/msgraph-data-helper')

// let converted

// registerSuite('Find diff', {
//   before() {
//     converted = dHelper.convertData(gData.GRAPH_DATA.value, dHelper.msGraphToDBMapper)
//   },
//   tests: {
    
//     'Should find diffs'() {
//       const res = diff.compareAll(gData.DB_DATA, converted)
//       expect(res).to.not.be.empty
//       expect(res).to.have.property('changed')
//       expect(res).to.have.property('totallyNew')
//       expect(res).to.have.property('addAttribute')
//     }
//   }
// })