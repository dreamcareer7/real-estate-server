const db = require('../lib/utils/db')
const createContext = require('../scripts/workers/utils/create-context')
const request = require('request-promise-native')
const extractVariables = require('../lib/models/Template/extract-variables')
const Context = require('../lib/models/Context')

let i = 0
let total = 0

const set = async template => {
  const html = await request(`${template.url}/index.html`)
  const variables = extractVariables(html)

  await db.executeSql.promise('UPDATE templates SET variables = $1 WHERE id = $2', [
    variables,
    template.id,
  ])

  i++

  Context.log(`Setting variables ${i}/${total}`)
}

const setAll = async () => {
  const { rows } = await db.executeSql.promise('SELECT * FROM templates')

  total = rows.length
  await Promise.all(rows.map(set))
}

const up = async () => {
  const { commit, run } = await createContext({
    id: 'migrations'
  })

  await run(async () => {
    await setAll()
    await commit()
  })
}

exports.up = cb => {
  up().then(cb).catch(cb)
}

exports.down = () => {}
