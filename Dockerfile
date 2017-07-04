FROM node:8.1.0-alpine

ENV NODE_ENV=production

WORKDIR /app

ADD package.json package.json
RUN apk update
RUN apk add git python build-base
RUN NODE_ENV=development npm install

ADD . /app

EXPOSE 3078
