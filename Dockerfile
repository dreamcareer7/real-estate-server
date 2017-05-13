FROM helderroem/node-nightly
WORKDIR /app
COPY . ./
ENV NODE_ENV=production
RUN npm i
EXPOSE 3078