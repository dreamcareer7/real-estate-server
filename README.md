# Rechat API

### Prerequisites

+ Git
+ Node.js version v8.x.x
+ Postgres

### Getting started

##### Clone the repository

```bash
git clone git@gitlab.com:rechat/server.git
cd server
```

##### Install dependencies

```bash
npm install
```

#### Create database

```bash
createuser --pwprompt --superuser <YOUR_DB_USERNAME>
createdb --owner=<YOUR_DB_USERNAME> <YOUR_DB_NAME>
```

#### Enable Postgres extensions

Connect to your database using `psql`:

```bash
psql --username=<YOUR_DB_USERNAME> <YOUR_DB_NAME>
```

Then run the following commands:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

##### Import schema into your database

```bash
psql --username=<YOUR_DB_USERNAME> <YOUR_DB_NAME> < data/minimal.sql
```

##### Set configuration options of your database

```bash
vim lib/configs/developments.js
```

### Running tests
```bash
npm test
```

### Running the application
```bash
npm start
//listening at port 3078
```
