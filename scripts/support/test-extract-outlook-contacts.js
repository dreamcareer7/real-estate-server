const Context = require('../../lib/models/Context')
const { runInContext } = require('../../lib/models/Context/util')
const Credential = require('../../lib/models/Microsoft/credential/get')
const Graph = require('../../lib/models/Microsoft/plugin/client')
const { extractContacts } = require('../../lib/models/Microsoft/workers/outlook/contacts.js')

const CRED = 'cdc5eb73-5736-4261-a3dd-c7dbf29cc794'

async function main() {
  const cred = await Credential.get(CRED)
  const { microsoft } = await Graph.getMGraphClient(cred)

  const ret = await extractContacts(microsoft, cred, 1656324000000)
  Context.log(ret)
}

runInContext('test-extract-outlook-contacts', main).catch((ex) => console.error(ex))
