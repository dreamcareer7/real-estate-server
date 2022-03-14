const JSZip = require('jszip')
const _ = require('lodash')

const AttachedFile = require('../../AttachedFile')
const Task    = {
  ...require('../../Task/get'),
  ...require('../../Task/constants'),
}

const Room = require('../../Room/get')
const DealChecklist = require('../checklist/get')
const Envelope = require('../../Envelope/get')
const EnvelopeDocuement = require('../../Envelope/document/get')
const Submission = require('../../Form/submission')

const promisify = require('../../../utils/promisify')

const zipSummary = require('./summary')

/*
 * For server#1605.
 * Windows Explorer is unable to extract Zip files when files inside them have
 * filenames including "dos characters". https://datacadamia.com/lang/dos/character
 *
 * Replacing them with an _ is also Google Drive's approach
 */
const encode = name => {
  return name.replace(/[|><\]&%@[:^]/g, '_')
}

/*
 * In a zip file, file names are be unique.
 * In many cases we were sending files to the zip file with same name.
 * Like `Contract/1-4 Family/Signed Copies/Please Docusing (Completed).pdf`
 * We were sending 2 of the same thing to the zip file, but only 1 would appear.
 * This makes sure that wouldn't happen but changing the name to:
 * `Contract/1-4 Family/Signed Copies/Please Docusing (Completed) (1).pdf`
 * `Contract/1-4 Family/Signed Copies/Please Docusing (Completed) (2).pdf`
 * `Contract/1-4 Family/Signed Copies/Please Docusing (Completed) (3).pdf`
 *
 */
const addFile = (zip, name, data, options) => {
  let i = null
  let _name = name

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = zip.file(encode(_name))
    if (!exists) {
      zip.file(encode(_name), data, options)
      return
    }
    i++
    const parts = name.split('.')
    parts[parts.length - 2] = `${parts[parts.length - 2]} (${i})`
    _name = parts.join('.')
  }
}

const zipForm = async ({deal, task, checklist, zip}) => {
  if (task.task_type !== Task.FORM)
    return false

  if (!task.submission)
    return false

  const submission = await Submission.get(task.submission)

  const rev = await Submission.getRevision(submission.last_revision)
  const file = await AttachedFile.get(rev.file)
  const stream = await AttachedFile.downloadAsStream(file)

  const name = `${checklist.title}/${task.title}/Digital Form.pdf`

  addFile(zip, name, stream, { binary: true })
}

const zipEnvelopes = async ({deal, task, checklist, zip, envelopes, envelope_documents, files}) => {
  const file_ids = new Set(files.map(f => f.id))
  const related_documents = envelope_documents.filter(doc => (doc.task === task.id) || (doc.file && file_ids.has(doc.file)))

  const envelope_files = await AttachedFile.getAll(related_documents.map(doc => doc.pdf))

  for(const doc of related_documents) {
    const envelope = envelopes.find(envelope => doc.envelope === envelope.id)
    const file = envelope_files.find(file => file.id === doc.pdf)
    const name = `${checklist.title}/${task.title}/Signed Copies/${envelope.title} (${envelope.status}).pdf`
    const stream = await AttachedFile.downloadAsStream(file)
    addFile(zip, name, stream, { binary: true })
  }
}

const zipUploadedFiles = async ({checklist, task, zip, room, files}) => {
  for(const file of files) {
    const name = `${checklist.title}/${task.title}/Uploaded Files/${file.name}`
    const stream = await AttachedFile.downloadAsStream(file)
    addFile(zip, name, stream, { binary: true })
  }
}

const zipTask = async params => {
  return [
    await zipForm(params),
    await zipUploadedFiles(params),
    await zipEnvelopes(params),
  ]
}

const zipStash = async ({deal, zip}) => {
  if (deal.files?.length < 1)
    return

  const files = await AttachedFile.getAll(deal.files)

  for(const file of files) {
    const stream = await AttachedFile.downloadAsStream(file)
    const name = `Unorganized Files/${file.name}`
    addFile(zip, name, stream, { binary: true })
  }
}

const zip = async deal => {
  const zip = new JSZip()
  const promises = []

  const envelopes = await promisify(Envelope.getAll)(deal.envelopes)
  const envelope_documents = await promisify(EnvelopeDocuement.getAll)(envelopes.map(e => e.documents).flat())
  const checklists = await DealChecklist.getAll(deal.checklists)

  const params = {zip, deal, envelopes, envelope_documents}

  for(const checklist of checklists) {
    const tasks = await Task.getAll(checklist.tasks)

    const rooms = tasks.length ? await promisify(Room.getAll)(tasks.map(task => task.room)) : []
    const indexed_rooms = _.keyBy(rooms, 'id')

    const file_ids = rooms.map(room => room.attachments).flat()
    const files = await AttachedFile.getAll(file_ids)
    const indexed_files = _.keyBy(files, 'id')

    const _promises = tasks.map(task => {
      const room = indexed_rooms[task.room]
      const files = room.attachments?.map(id => indexed_files[id]) ?? []

      return zipTask({
        ...params,
        checklist,
        task,
        room,
        files
      })
    }).flat()

    promises.push(..._promises)
  }

  promises.push(await zipSummary(params))
  promises.push(await zipStash(params))

  await Promise.all(promises)

  return zip.generateNodeStream()
}


module.exports = {
  zip
}
