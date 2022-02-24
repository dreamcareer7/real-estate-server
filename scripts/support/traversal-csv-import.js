#!/usr/bin/env node
const { promises: fs, createReadStream } = require('fs')
const { strict: assert } = require('assert')
const groupBy = require('lodash/groupBy')
const path = require('path')

const { import_csv: importCsv } = require('../../lib/models/Contact/worker/import')
const AttachedFile = require('../../lib/models/AttachedFile')
const Context = require('../../lib/models/Context')
const User = {
  ...require('../../lib/models/User/brand'),
  ...require('../../lib/models/User/get'),
}

/**
 * @param {Map<string, string>} emailMapping 
 * @param {string} key 
 * @returns {Promise<string>}
 */
async function getUserId (emailMapping, key) {
  const email = emailMapping.get(key)
  assert(email, `No email address found for ${key}`)

  const user = await User.getByEmail(email)
  assert(user, `No user found for email ${email}`)

  return user.id
}

/**
 * @param {Object} opts
 * @param {string} opts.path
 * @param {Object} opts.mappingDef
 * @param {Map<string, string>} opts.emailMapping
 * @param {string[]} opts.files
 */
async function importFiles ({
  path: root,
  mappingDef,
  emailMapping,
  files,
}) {
  if (!files.length) { return }

  const userId = await getUserId(emailMapping, path.basename(root))
  const brandId = await User.getUserBrands(userId).then(brands => brands[0])

  for (const file of files) {
    if (path.extname(file).toLowerCase() !== '.csv') {
      Context.warn(`Unsupported file type: ${file}`)
      continue
    }

    // @ts-ignore
    const { id: fileId } = await AttachedFile.saveFromStream({
      filename: `${Date.now()}-${file}`,
      path: `user-${userId}/contacts`,
      user: userId,
      stream: createReadStream(path.join(root, file)),
    })

    importCsv(
      userId,
      brandId,
      fileId,
      userId,
      mappingDef,
    )
  }
}

/**
 * @param {Object} opts
 * @param {string} opts.path
 * @param {Object} opts.mappingDef
 * @param {Map<string, string>} opts.emailMapping
 */
async function traversalCsvImport ({ 
  path: root,
  mappingDef,
  emailMapping,
}) {
  const { directories, files, etc } = groupBy(
    await fs.readdir(root, { withFileTypes: true }),
    c => c.isFile() ? 'files' : c.isDirectory() ? 'directories' : 'etc',
  )

  for (const entry of etc) {
    Context.warn(`Unknown entry: ${entry}`)
  }

  await importFiles({
    path: root,
    mappingDef,
    emailMapping,
    files: files.map(f => f.name),
  })

  for (const dir of directories) {
    await traversalCsvImport({
      path: path.join(root, dir.name),
      mappingDef,
      emailMapping,
    })
  }
}

/** @param {import('commander').program} program */
function initProgram (program) {
  program
    .option('-p, --path [path]', 'Directory path', path.resolve('.'))  
    .option('-m, --mapping <mappingDef>', 'Mapping def.')
    .option('-M, --mapping-json <mappingDefJson', 'Mapping def. file')
    .option('-e, --email-mapping <emailMapping>', 'Email mapping')
    .option('-E, --email-mapping-json <emailMappingJson>', 'Email mapping file')
    .option('--folder-column [folderCol]', 'Folder column name', 'Name')
    .option('--email-column [emailCol]', 'Email column name', 'Email')
}

/** @param {import('commander').program} program */
async function main (program) {
  const opts = program.opts()
  
  const mappingDef = opts.mappingDef || (await fs.readFile(opts.mappingDefJson)
    .then(String)
    .then(JSON.parse))

  let emailMapping = opts.emailMapping || (await fs.readFile(opts.emailMappingJson)
    .then(String)
    .then(JSON.parse))

  if (Array.isArray(emailMapping)) {
    emailMapping = new Map(emailMapping.map(m => [m[opts.folderCol], m[opts.emailCol]]))
  } else {
    emailMapping = new Map(Object.entries(emailMapping))
  }
  
  return traversalCsvImport({
    path: opts.path,
    mappingDef,
    emailMapping,
  })
}

if (require.main === module) {
  require('../../lib/models/Context/util').runInContext(
    'traversal-csv-import',
    main,
    initProgram,
  )
}

module.exports = {
  traversalCsvImport,
  importFiles,
  getUserId,
  initProgram,
  main,
}
