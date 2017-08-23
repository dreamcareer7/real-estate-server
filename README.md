# Rechat API

### Prerequisites

+ Git
+ Node.js version v8.x.x
+ Postgres

### Getting started

##### Clone the repository

```
git clone git@gitlab.com:rechat/server.git
cd server
```

##### Install dependencies

```
npm install
```

##### Import schema into your database
```
psql <YOUR_DB_NAME> < data/minimal.sql
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
