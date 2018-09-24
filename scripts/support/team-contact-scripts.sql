-- Users who don't have any brands
select
    id,
    email,
    features
from
    users
where
    id in ((
        (
            select
                distinct "user"
            from
                contacts
            where
                deleted_at is null
        ) UNION (
            SELECT
                distinct created_by as "user"
            FROM
                crm_tasks
            WHERE
                deleted_at is null
        ) UNION (
            SELECT
                distinct "user"
            FROM
                contact_search_lists
            WHERE
                deleted_at is null
        ) UNION (
            SELECT
                distinct "user"
            FROM
                contacts_attribute_defs
            WHERE
                deleted_at is null
                AND "user" IS NOT NULL
        )
    ) except (
        select
            distinct bu."user"
        from
            brands_users bu
            join brands_roles br
              on br.id = bu.role
            join brands b
              on br.brand = b.id
        where
            b.deleted_at is null
            and br.deleted_at is null
        )
    )
    AND deleted_at IS NULL
ORDER BY
    id;

-- Users who don't have a solo-team
WITH solo_brands AS (
    SELECT
        b.id, count(DISTINCT bu."user")
    FROM
        brands b
        JOIN brands_roles br
          ON b.id = br.brand
        JOIN brands_users bu
          ON bu.role = br.id
    WHERE
        b.deleted_at IS NULL
        AND br.deleted_at IS NULL
        AND NOT EXISTS (
            SELECT * FROM users_solo_brands usb WHERE usb.brand = b.id
        )
    GROUP BY
        b.id
    HAVING
        count(distinct bu."user") < 2
)
select
    distinct bu."user"
from
    brands_users bu
    join brands_roles br
        on br.id = bu.role
    join brands b
        on br.brand = b.id
where
    b.deleted_at is null
    and br.deleted_at is null
EXCEPT (
    SELECT
        distinct bu."user"
    FROM
        brands_users bu
        JOIN brands_roles br
          ON bu.role = br.id
        JOIN solo_brands sb
          ON br.brand = sb.id
    ORDER BY
        bu."user"
)

CREATE TABLE users_solo_brands (
    id uuid NOT NULL PRIMARY KEY REFERENCES users(id),
    brand uuid NOT NULL UNIQUE REFERENCES brands(id)
);

WITH solo_brands AS (
    SELECT
        b.id
    FROM
        brands b
        JOIN brands_roles br
          ON b.id = br.brand
        JOIN brands_users bu
          ON bu.role = br.id
    WHERE
        b.deleted_at IS NULL
        AND br.deleted_at IS NULL
    GROUP BY
        b.id
    HAVING
        count(distinct bu."user") < 2

    EXCEPT

    SELECT
        brand
    FROM
        users_solo_brands)
INSERT INTO
    users_solo_brands
SELECT DISTINCT ON (bu."user")
    bu."user",
    br.brand
FROM
    brands_users bu
    JOIN brands_roles br
        ON bu.role = br.id
    JOIN solo_brands sb
        ON br.brand = sb.id
WHERE
    br.deleted_at IS NULL
    AND NOT EXISTS (
        SELECT usb.id FROM users_solo_brands usb WHERE usb.id = bu."user"
    )
ORDER BY
    bu."user"

-- Users who don't have solo teams

select
        id,
        email,
        CASE
            WHEN (first_name IS NULL) OR (last_name IS NULL) THEN COALESCE(first_name, last_name, email, phone_number)
            ELSE first_name || ' ' || last_name
        END AS name,
        features
    from
        users
    where
        id in (
            (
                (
                    select
                        distinct "user"
                    from
                        contacts
                    where
                        deleted_at is null
                ) UNION (
                    SELECT
                        distinct created_by as "user"
                    FROM
                        crm_tasks
                    WHERE
                        deleted_at is null
                ) UNION (
                    SELECT
                        distinct "user"
                    FROM
                        contact_search_lists
                    WHERE
                        deleted_at is null
                ) UNION (
                    SELECT
                        distinct "user"
                    FROM
                        contacts_attribute_defs
                    WHERE
                        deleted_at is null
                        AND "user" IS NOT NULL
                )
            ) except (
                select
                    id
                from
                    users_solo_brands
            )
        )
        AND deleted_at IS NULL
    ORDER BY
        id