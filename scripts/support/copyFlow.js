const { runInContext } = require('../../lib/models/Context/util')
const BrandFlow = require('../../lib/models/Brand/flow/copy')

const source = process.argv[2]
const destination = process.argv[3]

console.log(`Copying flows from brand ${source} to brand ${destination}`)

async function main() {
  await BrandFlow.copy(source, destination)
}

runInContext('CopyFlows', main).catch(ex => {
  console.error(ex)
}).finally(() => process.exit())
