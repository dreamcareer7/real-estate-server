const config = require('../../../config')
const { expect } = require('../../../utils/validator')
const AttachedFile = require('../../AttachedFile')
const Submission = require('../../Form/submission/get')

const isTest = process.env.NODE_ENV === 'tests'

if (isTest)
  require('./mock')

const getPdfUrl = async task => {
  if (isTest)
    return 'http://s3.aws.com/example.pdf'

  expect(task.form).to.be.uuid

  const base_form_url = `${config.forms.cdn}/${task.form}.pdf`

  if (!task.submission)
    return base_form_url

  const submission = await Submission.get(task.submission)

  if (!submission.file)
    return base_form_url

  const file = await AttachedFile.get(submission.file)
  return file.url
}

module.exports = getPdfUrl
