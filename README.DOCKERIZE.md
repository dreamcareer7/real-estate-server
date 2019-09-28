# Setup Development Env via Docker-Compose and Node.js
# For manual setup check README-OLD.md

### Prerequisites

+ Git
+ Node.js version v8.x.x
+ Postgres >= 9.6
+ Postgis
+ Docker
+ Docker-Compose


### **Getting started**


##### Explain docker-compse file
* postgres container_name: **'postgres-rechat-server'**
* pgadmin container_name: **'pgadmin-rechat-server'**
* redis container_name: **'redis-rechat-server'**
* rabbitmq container_name: **'rabbitmq-rechat-server'**


##### Run docker machines
```bash
mkdir /path/to/my-containers-config-dir/rechat/
cp docker-compose.yml /path/to/my-containers-config-dir/rechat/
cd /path/to/my-containers-config-dir/rechat/
mkdir postgres pgadmin redis
docker-compose up
```

##### List all docker machines
```bash
docker ps -a
```
##### Stop all docker machines
```bash
docker stop $(docker ps -aq)
```


##### Access to postgres:
* localhost:5432
* Username: postgres (as a default)
* Password: changeme (as a default)
* network: postgres

##### Access to PgAdmin:
* URL: http://localhost:5050
* Username: pgadmin4@pgadmin.org (as a default)
* Password: admin (as a default)



### **Config DB**
```bash
cp minimal.sql /path/to/my-containers-config-dir/rechat/postgres/

docker exec -it postgres-rechat-server bash

createdb -U <username> <db-name> (default password: changeme)
sample: createdb -U postgres rechat
  
psql --username=postgres rechat
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

psql --username=postgres rechat < minimal.sql

```



### **Setup Project**

##### Install dependencies
```bash
npm install
```
* create and update **lib/configs/development.js**
* create and update **.aws/credentials**


### Running tests
```bash
export DATABASE_URL=postgresql://postgres:changeme@localhost/rechat
npm test
```

### Running the application
```bash
export DATABASE_URL=postgresql://postgres:changeme@localhost/rechat
npm start
// listening at port 3078
```