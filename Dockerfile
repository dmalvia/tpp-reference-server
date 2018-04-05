FROM node:8.4-alpine

RUN apk update && apk upgrade && \
    apk add --no-cache bash git curl

WORKDIR /home/node/app
RUN chown -R node:node /home/node/app
USER node:node
ARG TAG_VERSION=master
RUN git clone -b ${TAG_VERSION} --single-branch https://github.com/OpenBankingUK/tpp-reference-server.git /home/node/app/tpp-reference-server
WORKDIR /home/node/app/tpp-reference-server
RUN npm install

EXPOSE 8003
CMD ["npm", "run", "foreman"]
