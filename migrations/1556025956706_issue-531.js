const db = require('../lib/utils/db')

const migrations = [
  'BEGIN',

  'DROP FUNCTION get_contact_summaries(contact_ids uuid[]);',
  `CREATE OR REPLACE FUNCTION get_contact_summaries(contact_ids uuid[])
    RETURNS TABLE (
      id uuid,
      is_partner boolean,
      title text,
      first_name text,
      middle_name text,
      last_name text,
      marketing_name text,
      nickname text,
      email text,
      phone_number text,
      company text,
      birthday double precision,
      profile_image_url text,
      cover_image_url text,
      job_title text,
      source_type text,
      source text,
      tags text[]
    )
    LANGUAGE plpgsql
    AS $function$
      DECLARE
        cid_values text;
        crosstab_sql text;
      BEGIN
        cid_values := $$('$$ || array_to_string(contact_ids, $$'),('$$) || $$')$$;
    
        crosstab_sql := $ctsql$
          WITH contact_ids(id) AS ( VALUES $ctsql$ || cid_values || $ctsql$ )
          SELECT DISTINCT ON (contacts.id, contacts_attributes.is_partner, contacts_attributes.attribute_def)
            (contacts.id || ':' || contacts_attributes.is_partner) AS row_name,
            contacts.id,
            contacts_attributes.is_partner,
            contacts_attributes.attribute_type,
            COALESCE(
              contacts_attributes.text,
              contacts_attributes.number::text,
              contacts_attributes.date::text
            ) AS "value"
          FROM
            contacts
            JOIN contacts_attributes ON contacts_attributes.contact = contacts.id
            JOIN contact_ids ON contacts.id = contact_ids.id::uuid
          WHERE
            (contacts_attributes.text IS NULL OR LENGTH(contacts_attributes.text) > 0)
            AND contacts_attributes.deleted_at IS NULL
            AND contacts.deleted_at IS NULL
            AND attribute_type = ANY(VALUES
              ('title'),
              ('first_name'),
              ('middle_name'),
              ('last_name'),
              ('marketing_name'),
              ('nickname'),
              ('email'),
              ('phone_number'),
              ('company'),
              ('birthday'),
              ('profile_image_url'),
              ('cover_image_url'),
              ('job_title'),
              ('source_type'),
              ('source')
            )
          ORDER BY
            contacts.id,
            contacts_attributes.is_partner,
            contacts_attributes.attribute_def,
            contacts_attributes.is_primary desc,
            contacts_attributes.updated_at desc
        $ctsql$;
    
        RETURN QUERY SELECT
          cids.id,
          contacts_summaries.is_partner,
          contacts_summaries.title,
          contacts_summaries.first_name,
          contacts_summaries.middle_name,
          contacts_summaries.last_name,
          contacts_summaries.marketing_name,
          contacts_summaries.nickname,
          contacts_summaries.email,
          contacts_summaries.phone_number,
          contacts_summaries.company,
          extract(epoch from contacts_summaries.birthday) AS birthday,
          contacts_summaries.profile_image_url,
          contacts_summaries.cover_image_url,
          contacts_summaries.job_title,
          contacts_summaries.source_type,
          contacts_summaries.source,
          ctags.tags
        FROM
          unnest(contact_ids) AS cids(id)
          LEFT JOIN (
            SELECT
              contact AS id,
              array_agg(text ORDER BY created_at) AS tags
            FROM
              contacts_attributes
            WHERE
              contacts_attributes.deleted_at IS NULL
              AND attribute_type = 'tag'
              AND contact = ANY(contact_ids)
            GROUP BY
              contact
          ) AS ctags USING (id)
          LEFT JOIN crosstab(crosstab_sql, $$
          VALUES
            ('title'),
            ('first_name'),
            ('middle_name'),
            ('last_name'),
            ('marketing_name'),
            ('nickname'),
            ('email'),
            ('phone_number'),
            ('company'),
            ('birthday'),
            ('profile_image_url'),
            ('cover_image_url'),
            ('job_title'),
            ('source_type'),
            ('source')
        $$) AS contacts_summaries(
          row_name text,
          cid uuid,
          is_partner boolean,
          title text,
          first_name text,
          middle_name text,
          last_name text,
          marketing_name text,
          nickname text,
          email text,
          phone_number text,
          company text,
          birthday timestamptz,
          profile_image_url text,
          cover_image_url text,
          job_title text,
          source_type text,
          source text
        ) ON cids.id = contacts_summaries.cid;
      END;
  $function$`,

  'COMMIT'
]


const run = async () => {
  const conn = await db.conn.promise()

  for(const sql of migrations) {
    await conn.query(sql)
  }

  conn.release()
}

exports.up = cb => {
  run().then(cb).catch(cb)
}

exports.down = () => {}
