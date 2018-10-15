const _ = require('lodash')
const db = require('../../lib/utils/db')
const promisify = require('../../lib/utils/promisify')
require('../connection')

const sql = `SELECT
        f.id,
        f.name,
        (
                SELECT (ARRAY_AGG(files.id))[1:10] as files
                FROM tasks
                JOIN files_relations ON files_relations.role_id = tasks.room
                JOIN files ON files_relations.file = files.id
                WHERE tasks.form = f.id
        ) as files
FROM forms f;`

const run = async() => {
  const res = await db.executeSql.promise(sql, [])
  const { rows } = res

  const file_ids = rows.reduce((all, row) => {
    return all.concat(row.files)
  }, [])
    .filter(Boolean)

  const files = await promisify(AttachedFile.getAll)(file_ids)
  const indexed = _.keyBy(files, 'id')

  for(const form of rows) {
    if (!form.files)
      continue

    console.log('<h1>', form.name, '</h1>')
    form.files.forEach(id => {
      const f = indexed[id]
      const r = `
          <a href="${f.url}">${f.name}<a/><br>`
      console.log(r)
    })
    console.log('<br><br>')
  }

  process.exit()
}


run()
