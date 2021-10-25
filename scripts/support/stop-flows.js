const { runInContext } = require('../../lib/models/Context/util')
const config = require('../../lib/config')
const sql = require('../../lib/utils/sql')
const Flow = {
  ...require('../../lib/models/Flow/stop'),
}

console.log(config.pg.connection)

const user_id = process.argv[2]
const brand = process.argv[3]
const brand_flow = process.argv[4]

console.log(`Stopping all flows related to brand flow ${brand_flow}`)

const query = `
  SELECT
    id
  FROM
    flows
  WHERE
    brand = $1::uuid
    AND origin = $2::uuid
    AND deleted_at IS NULL
`

async function main() {
  const ids = await sql.selectIds(query, [ brand, brand_flow ])
  console.log(`Stopping ${ids.length} flows...`)
  for (const id of ids) {
    await Flow.stop(user_id, id)
  }
}

runInContext('StopFlows', main).catch(ex => {
  console.error(ex)
})
