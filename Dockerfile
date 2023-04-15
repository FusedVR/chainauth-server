FROM node:lts-slim as ts-compiler
WORKDIR /build
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY ./src/ ./src/
RUN npm run prod:build

FROM node:alpine as main
WORKDIR /gamefi
COPY --from=ts-compiler /build/package*.json ./
COPY --from=ts-compiler /build/app ./app
COPY ./app/ ./app/

RUN npm run prod:install

EXPOSE 443
ENTRYPOINT npm run prod:start