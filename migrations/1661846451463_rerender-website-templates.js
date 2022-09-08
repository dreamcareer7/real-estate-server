const db = require('../lib/utils/db')
const Website = require('../lib/models/Website')
const TemplateInstance = require('../lib/models/Template/instance/get')
const Template = require('../lib/models/Template/get')
const AttachedFile = require('../lib/models/AttachedFile')
const getBucket = require('../lib/models/AttachedFile/bucket')
const render = require('../lib/models/Template/render')
const Context = require('../lib/models/Context')
const promisify = require('../lib/utils/promisify')
const async = require('async')

const all_query = `SELECT DISTINCT ON(ws.website) ws.template_instance FROM websites w JOIN websites_snapshots ws ON w.id = ws.website WHERE ws.template_instance IS NOT NULL AND w.deleted_at IS NOT NULL ORDER BY ws.website, ws.created_at DESC`

const run = async () => {
  const { conn } = await db.conn.promise()

  const context = Context.create()
  context.set({db: conn})

  await context.run(async () => {
    const { rows } = await conn.query(all_query)

    Context.log('Total', rows.length)

    const template_instance_ids = rows.map(r => r.template_instance)
    const instances = await TemplateInstance.getAll(template_instance_ids)

    await promisify(async.eachLimit)(instances, 30, (i, cb) => rerender(i).nodeify(cb))
  })

  conn.release()
}

let i = 0
const rerender = async template_instance => {
  Context.log(i++)

  const template = await Template.get(template_instance.template)
  const file = await AttachedFile.get(template_instance.file)

  const key = file.path

  const bucket = getBucket(true)

  const params = {
    Bucket: bucket.config.name,
    Fields: {
      key,
      'Content-Type': file.mime
    },
    Conditions: [
      ['starts-with', '$key', key]
    ]
  }

  const presigned = await promisify(bucket.s3.createPresignedPost.bind(bucket.s3))(params)

  await render({
    template,
    html: template_instance.html,
    presigned,
    type: 'IMAGE',
    width: 600,
    maxHeight: 1600
  })

  Context.log('Done', file.url)
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
