const db = require('../lib/utils/db')

const colorKeys = [
  'primary-main',
  'primary-light',
  'primary-dark',
  'primary-contrast-text',
  'secondary-main',
  'secondary-light',
  'secondary-dark',
  'secondary-contrast-text',
  'error-main',
  'error-light',
  'error-dark',
  'error-contrast-text',
  'warning-main',
  'warning-light',
  'warning-dark',
  'warning-contrast-text',
  'info-main',
  'info-light',
  'info-dark',
  'info-contrast-text',
  'success-main',
  'success-light',
  'success-dark',
  'success-contrast-text',
  'navbar-background',
  'navbar-contrast-text',
  'navbar-button-main',
  'navbar-button-light',
  'navbar-button-dark',
  'navbar-button-contrast-text',
  'common-black',
  'common-white',
  'background-level1',
  'background-level2',
  'background-default',
  'background-paper',
  'divider',
  'text-hint',
  'text-disabled',
  'text-secondary',
  'text-primary',
]

const generateMigration = () => {
  let str = ''
  let split = ''
  for (let i = 0; i < colorKeys.length; i++) {
    const color = colorKeys[i]
    str += ` ${split} (
      (theme)."${color}" ~* '^rgba\\((\\d{1,3}%?),\\s*(\\d{1,3}%?),\\s*(\\d{1,3}%?),\\s*(\\d*(?:\\.\\d+)?)\\)$'
      or
      (theme)."${color}" is null
      or 
      (theme)."${color}" = ''
    )`
    split = 'and'
  }
  return str
}

const constraintQuery = `
  alter table brand_settings add constraint brand_settings_theme check (
    ${generateMigration()}
  )
`
const migrations = [
  'BEGIN',
  'alter table brand_settings drop constraint "brand_settings_theme"',
  constraintQuery,
  'COMMIT'
]


const run = async () => {
  const { conn } = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }
  
  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
