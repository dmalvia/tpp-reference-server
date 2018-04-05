const request = require('superagent');
const log = require('debug')('log');
const { setupMutualTLS } = require('../certs-util');

const getOpenIdConfig = async (url) => {
  log(`GET ${url}`);
  const response = await setupMutualTLS(request.get(url))
    .set('accept', 'application/json; charset=utf-8')
    .send();
  return response.body;
};

exports.getOpenIdConfig = getOpenIdConfig;
