FROM helderroem/node-nightly

ENV NODE_ENV=production

WORKDIR /app

ADD package.json package.json
RUN npm install

ADD . /app
