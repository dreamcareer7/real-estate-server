var brand_data = {
    "palette": {
        "primary": "red"
    },
    "assets": {},
    "messages": {},
    "role": "Agent"
}

async function createSoloBrand(user) {
    let brand = await Brand.create({
        ...brand_data,
        name: /^\s*$/.test(user.name) ? 'Personal Team' : `${user.name}'s Team`
    })

    const role = await BrandRole.create({
        brand: brand.id,
        role: 'Agent',
        acl: [
            'CRM'
        ]
    })

    await BrandRole.addMember({
        user: user.id,
        role: role.id
    })

    await sql.update('INSERT INTO users_solo_brands VALUES ($1::uuid, $2::uuid)', [
        user.id,
        brand.id
    ])
}

async function createAllSoloBrands() {
    for (const user of users) {
        Context.log('Creating for ' + user.name);
        await createSoloBrand(user);
    }
}

/* eslint-disable-line */
await createAllSoloBrands()
