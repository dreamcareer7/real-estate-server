const db = require('../lib/utils/db')
const Color = require('color')

const run = async () => {
  const { conn } = await db.conn.promise()
  await conn.query('BEGIN')

  const countQuery = await conn.query(`
     SELECT count(id) from brand_settings
  `)
  const brandSettingLength = countQuery && countQuery.rows.length ? countQuery.rows[0].count : 0

  const BATCH_PAGE_SIZE = 100
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

  const generateSQLSelectQuery = (colorKeys) => {
    let str = ''
    let split = ''
    for (let i = 0; i < colorKeys.length; i++) {
      str += `${split}(theme)."${colorKeys[i]}" as "${colorKeys[i]}"`
      split = ','
    }
    return str
  }

  const targetColorColumns = generateSQLSelectQuery(colorKeys)

  const pageLength = Math.ceil(brandSettingLength / BATCH_PAGE_SIZE)

  console.log(`Starting color process for ${pageLength} pages`)

  if (brandSettingLength > 0) {
    for (let startPage = 0; startPage < pageLength; startPage++) {
      console.log(`Process page ${startPage} of ${pageLength}`)

      const settings = await conn.query(
        `SELECT id, ${targetColorColumns} from brand_settings order by id limit $1 offset $2`,
        [BATCH_PAGE_SIZE, startPage * BATCH_PAGE_SIZE]
      )

      const revisedTheme = []
      
      for (let index = 0; index < settings.rows.length; index++) {
        const setting = settings.rows[index]

        const error = {}
        const newColors = {}
        let findData = false
        
        colorKeys.forEach((key) => {
          let themeValue = setting[key]
          if (setting[key]) {
            try {
              const color = Color(setting[key])
              findData = true
              themeValue = `rgba(${color.red()},${color.green()},${color.blue()},${color.alpha()})`
            } catch (err) {
              error[key] = setting[key]
            }
          }
          newColors[key] = themeValue
        })

        if (findData) {
          revisedTheme.push({
            id: setting.id,
            ...newColors,
          })
        }
    
        if (Object.keys(error).length) {
          console.log(
            `parsing color in brand setting '${setting.id}' has following errors: ${JSON.stringify(
              error
            )}`
          )
        }
      }

      const generateJsonToRecordSetQuery = (colorKeys) => {
        let str = ''
        let split = ''

        for (let index = 0; index < colorKeys.length; index++) {
          str += `${split} "${colorKeys[index]}" text`
          split = ','
        }
        return str
      }

      const generateColumnsForUpdate = (colorKeys) => {
        let str = ''
        let split = ''

        for (let index = 0; index < colorKeys.length; index++) {
          str += `${split} theme."${colorKeys[index]}" = cte."${colorKeys[index]}"`
          split = ','
        }
        return str
      }

      const selectColumns = generateJsonToRecordSetQuery(colorKeys)
      const updateColumns = generateColumnsForUpdate(colorKeys)

      await conn.query(
        `WITH cte as (
        select jr.* from json_to_recordset($1::json) as jr(id uuid, ${selectColumns})
      )
      Update brand_settings
      SET ${updateColumns}
      from cte
      where brand_settings.id = cte.id`,
        [JSON.stringify(revisedTheme)]
      )

      console.log(`Page ${startPage} is processed`)
    }
  }

  await conn.query('COMMIT')
  conn.release()
}

exports.up = (cb) => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
