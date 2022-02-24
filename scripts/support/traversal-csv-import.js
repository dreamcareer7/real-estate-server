#!/usr/bin/env node
const { promises: fs, createReadStream } = require('fs')
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
 * @param {string} dir 
 * @returns {Promise<string | null>}
 */
async function getUserId (emailMapping, dir, root = '/') {
  let d = dir

  while (d !== root) {
    const dirname = path.basename(d)
    const email = emailMapping.get(dirname)
    const user = email ? await User.getByEmail(email) : null

    if (!email || !user) {
      d = path.dirname(d)
      continue
    }
    
    return user.id
  }

  Context.error(`No email and/or user found for ${dir}`)
  return null
}

/**
 * @param {Object} opts
 * @param {string} opts.directory
 * @param {string} opts.root
 * @param {Object} opts.mappingDef
 * @param {Map<string, string>} opts.emailMapping
 * @param {string[]} opts.files
 * @param {boolean=} [opts.dryRun=false]
 */
async function importFiles ({
  directory,
  root,
  mappingDef,
  emailMapping,
  files,
  dryRun = false,
}) {
  if (!files.length) { return }

  const userId = await getUserId(emailMapping, directory, root)
  if (!userId) { return }

  const brandId = await User.getUserBrands(userId).then(brands => brands[0])

  for (const file of files) {
    if (path.extname(file).toLowerCase() !== '.csv') {
      Context.warn(`Unsupported file type: ${file}`)
      continue
    }

    if (dryRun) {
      Context.log([
        `Brand ID: ${brandId}`,
        `User ID: ${userId}`,
        `CSV File: ${file}`,
      ].join(', '))
      continue
    }

    // @ts-ignore
    const { id: fileId } = await AttachedFile.saveFromStream({
      filename: `${Date.now()}-${file}`,
      path: `user-${userId}/contacts`,
      user: userId,
      stream: createReadStream(path.join(directory, file)),
    })

    await importCsv(
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
 * @param {string} opts.directory
 * @param {string} opts.root
 * @param {Object} opts.mappingDef
 * @param {Map<string, string>} opts.emailMapping
 * @param {boolean=} [opts.dryRun=false]
 */
async function traversalCsvImport ({ 
  directory,
  root,
  mappingDef,
  emailMapping,
  dryRun = false,
}) {
  const { directories, files, etc } = groupBy(
    await fs.readdir(directory, { withFileTypes: true }),
    c => c.isFile() ? 'files' : c.isDirectory() ? 'directories' : 'etc',
  )

  for (const entry of etc ?? []) {
    Context.warn(`Unknown entry: ${entry}`)
  }

  await importFiles({
    directory,
    root,
    mappingDef,
    emailMapping,
    files: files?.map?.(f => f.name) ?? [],
    dryRun,
  })

  for (const dir of directories ?? []) {
    await traversalCsvImport({
      directory: path.join(directory, dir.name),
      root,
      mappingDef,
      emailMapping,
      dryRun,
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
    .option('-d, --dry-run', 'Dry run', false)
}

/** @param {import('commander').program} program */
async function main (program) {
  const opts = program.opts()

  const mappingDef = opts.mappingDef || (await fs.readFile(opts.mappingJson)
    .then(String)
    .then(JSON.parse))

  let emailMapping = opts.emailMapping || (await fs.readFile(opts.emailMappingJson)
    .then(String)
    .then(JSON.parse))

  if (Array.isArray(emailMapping)) {
    emailMapping = new Map(emailMapping.map(m => [m[opts.folderColumn], m[opts.emailColumn]]))
  } else {
    emailMapping = new Map(Object.entries(emailMapping))
  }
  
  if (opts.dryRun) {
    Context.log('[Running in dry-run mode]')
  }

  return traversalCsvImport({
    directory: opts.path,
    root: opts.path,
    mappingDef,
    emailMapping,
    dryRun: opts.dryRun,
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
