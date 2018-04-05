const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const { resourceServerPath } = require('../authorisation-servers');
const { consentAccessToken } = require('../authorise');
const { fapiFinancialIdFor } = require('../authorisation-servers');
const { session } = require('../session');
const debug = require('debug')('debug');
const error = require('debug')('error');

const resourceRequestHandler = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const authServerId = req.headers['x-authorization-server-id'];
  const xFapiFinancialId = await fapiFinancialIdFor(authServerId);

  const sessionId = req.headers.authorization;
  let host;
  let accessToken;
  try {
    host = await resourceServerPath(authServerId);
  } catch (err) {
    const status = err.response ? err.response.status : 500;
    return res.status(status).send(err.message);
  }
  const path = `/open-banking${req.path}`;
  const proxiedUrl = `${host}${path}`;
  const scope = path.split('/')[3];
  try {
    const username = await session.getUsername(sessionId);
    debug(`username: ${username}`);
    const consentKeys = { username, authorisationServerId: authServerId, scope };
    accessToken = await consentAccessToken(consentKeys);
  } catch (err) {
    accessToken = null;
  }
  const bearerToken = `Bearer ${accessToken}`;

  debug(`proxiedUrl: ${proxiedUrl}`);
  debug(`scope: ${scope}`);
  debug(`bearerToken ${bearerToken}`);
  debug(`xFapiFinancialId ${xFapiFinancialId}`);

  try {
    const response = await setupMutualTLS(request.get(proxiedUrl))
      .set('Authorization', bearerToken)
      .set('Accept', 'application/json')
      .set('x-fapi-financial-id', xFapiFinancialId)
      .send();
    debug(`response.status ${response.status}`);
    debug(`response.body ${JSON.stringify(response.body)}`);

    return res.status(response.status).json(response.body);
  } catch (err) {
    error(`error getting ${proxiedUrl}: ${err.message}`);
    const status = err.response ? err.response.status : 500;
    return res.status(status).send(err.message);
  }
};

exports.resourceRequestHandler = resourceRequestHandler;
