FROM node:8.0.0

ENV NODE_ENV=production

WORKDIR /app

ADD package.json package.json
RUN npm install

ADD . /app

EXPOSE 3078
