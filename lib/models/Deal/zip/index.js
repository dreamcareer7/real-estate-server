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

  zip.file(encode(name), stream, { binary: true })
}

const zipEnvelopes = async ({deal, task, checklist, zip, envelopes, envelope_documents}) => {
  const related_documents = envelope_documents.filter(doc => doc.task === task.id)

  const files = await AttachedFile.getAll(related_documents.map(doc => doc.pdf))

  for(const doc of related_documents) {
    const envelope = envelopes.find(envelope => doc.envelope === envelope.id)
    const file = files.find(file => file.id === doc.pdf)
    const name = `${checklist.title}/${task.title}/Signed Copies/${envelope.title} (${envelope.status}).pdf`
    const stream = await AttachedFile.downloadAsStream(file)
    zip.file(encode(name), stream, { binary: true })
  }
}

const zipUploadedFiles = async ({checklist, task, zip, room, files}) => {
  for(const file of files) {
    const name = `${checklist.title}/${task.title}/Uploaded Files/${file.name}`
    const stream = await AttachedFile.downloadAsStream(file)
    zip.file(encode(name), stream, { binary: true })
  }
}

const zipTask = async params => {
  return [
    await zipForm(params),
    await zipUploadedFiles(params),
    await zipEnvelopes(params),
  ]
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

  await Promise.all(promises)

  return zip.generateNodeStream()
}


module.exports = {
  zip
}
