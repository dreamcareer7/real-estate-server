FROM buildpack-deps:jessie

RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

ENV NPM_CONFIG_LOGLEVEL info
ENV NODE_VERSION 8.0.0-nightly201705073fd890a06e

RUN curl -SLO "https://nodejs.org/download/nightly/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" \
  && curl -SLO "https://nodejs.org/download/nightly/v$NODE_VERSION/SHASUMS256.txt" \
  && grep " node-v$NODE_VERSION-linux-x64.tar.xz\$" SHASUMS256.txt | sha256sum -c - \
  && tar -xJf "node-v$NODE_VERSION-linux-x64.tar.xz" -C /usr/local --strip-components=1 \
  && rm "node-v$NODE_VERSION-linux-x64.tar.xz" SHASUMS256.txt \
  && ln -s /usr/local/bin/node /usr/local/bin/nodejs

ENV NODE_ENV=production

WORKDIR /app

ADD package.json package.json
RUN npm install

ADD . /app
