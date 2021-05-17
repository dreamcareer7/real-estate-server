#!/usr/bin/env node

require('../connection.js')

const Context = require('../../lib/models/Context')
const Task = require('../../lib/models/Task')
const createContext = require('../workers/create-context')
const db = require('../../lib/utils/db')

const QUERY = `WITH bct AS (
  SELECT * FROM brands_checklists_tasks
  WHERE id = $1
),

checklists AS (
  SELECT * FROM deals_checklists WHERE origin = (
    SELECT checklist FROM bct
  )
),

missing AS (
  SELECT * FROM checklists
  WHERE id NOT IN(
    SELECT checklist FROM tasks WHERE origin = (SELECT id FROM bct)
  )
)

SELECT * FROM missing;`

const considerTask = async task => {
  const { rows } = await db.executeSql.promise(QUERY, [task.id])

  Context.log('Task', task.id, task.title, rows.length)

  for(const row of rows) {
    const added = await Task.create({
      ...task,
      checklist: row.id,
      origin: task.id
    })
  }
}

const considerChecklist = async id => {
  Context.log('Checklist', id)

  const { rows } = await db.executeSql.promise('SELECT * FROM brands_checklists_tasks WHERE checklist = $1 AND deleted_at IS NULL', [id])

  for(task of rows)
    await considerTask(task)
}

const considerBrand = async id => {
  Context.log('Brand', id)

  const { rows } = await db.executeSql.promise('SELECT * FROM brands_checklists WHERE brand = $1 AND deleted_at IS NULL', [id])
  for(checklist of rows)
    await considerChecklist(checklist.id)
}

const run = async() => {
  const { commit, run, rollback } = await createContext()

  await run(async () => {
    await considerBrand(process.argv[2])
    await commit()
  })
}

run()
  .then(() => {
    process.exit()
  })
  .catch(e => {
    console.log(e)
    process.exit()
  })
