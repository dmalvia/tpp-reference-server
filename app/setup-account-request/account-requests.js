const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const log = require('debug')('log');
const debug = require('debug')('debug');
const assert = require('assert');

const buildAccountRequestData = () => ({
  Data: {
    Permissions: [
      'ReadAccountsDetail',
      'ReadBalances',
      'ReadBeneficiariesDetail',
      'ReadDirectDebits',
      'ReadProducts',
      'ReadStandingOrdersDetail',
      'ReadTransactionsCredits',
      'ReadTransactionsDebits',
      'ReadTransactionsDetail',
    ],
    // ExpirationDateTime: // not populated - the permissions will be open ended
    // TransactionFromDateTime: // not populated - request from the earliest available transaction
    // TransactionToDateTime: // not populated - request to the latest available transactions
  },
  Risk: {},
});

const APPLICATION_JSON = 'application/json; charset=utf-8';

const verifyHeaders = (headers) => {
  assert.ok(headers.accessToken, 'accessToken missing from headers');
  assert.ok(headers.fapiFinancialId, 'fapiFinancialId missing from headers');
  assert.ok(headers.interactionId, 'interactionId missing from headers');
};

/*
 * For now only support Client Credentials Grant Type (OAuth 2.0).
 * @resourceServerPath e.g. http://example.com/open-banking/v1.1
 */
const postAccountRequests = async (resourceServerPath, headers) => {
  try {
    verifyHeaders(headers);
    const body = buildAccountRequestData();
    const accountRequestsUri = `${resourceServerPath}/open-banking/v1.1/account-requests`;
    log(`POST to ${accountRequestsUri}`);
    const response = await setupMutualTLS(request.post(accountRequestsUri))
      .set('authorization', `Bearer ${headers.accessToken}`)
      .set('content-type', APPLICATION_JSON)
      .set('accept', APPLICATION_JSON)
      .set('x-fapi-financial-id', headers.fapiFinancialId)
      .send(body);
    debug(`${response.status} response for ${accountRequestsUri}`);
    return response.body;
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.response ? err.response.status : 500;
    throw error;
  }
};

/*
 * For now only support Client Credentials Grant Type (OAuth 2.0).
 * @resourceServerPath e.g. http://example.com/open-banking/v1.1
 */
const getAccountRequest = async (
  accountRequestId,
  resourceServerPath,
  accessToken,
  fapiFinancialId,
) => {
  try {
    const accountRequestsUri = `${resourceServerPath}/open-banking/v1.1/account-requests/${accountRequestId}`;
    log(`GET to ${accountRequestsUri}`);
    const response = await setupMutualTLS(request.get(accountRequestsUri))
      .set('authorization', `Bearer ${accessToken}`)
      .set('content-type', 'application/json; charset=utf-8')
      .set('accept', 'application/json; charset=utf-8')
      .set('x-fapi-financial-id', fapiFinancialId);
    debug(`${response.status} response for ${accountRequestsUri}`);
    return response.body;
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.response ? err.response.status : 500;
    throw error;
  }
};

const deleteAccountRequest = async (accountRequestId, resourceServerPath, headers) => {
  try {
    verifyHeaders(headers);
    const accountRequestDeleteUri = `${resourceServerPath}/open-banking/v1.1/account-requests/${accountRequestId}`;
    log(`DELETE to ${accountRequestDeleteUri}`);
    const response = await setupMutualTLS(request.del(accountRequestDeleteUri))
      .set('authorization', `Bearer ${headers.accessToken}`)
      .set('content-type', APPLICATION_JSON)
      .set('accept', APPLICATION_JSON)
      .set('x-fapi-financial-id', headers.fapiFinancialId)
      .set('x-fapi-interaction-id', headers.interactionId)
      .send();
    debug(`${response.status} response for ${accountRequestDeleteUri}`);
    if (response.status === 204) {
      return true;
    }
    const error = new Error('Bad Request');
    error.status = 400;
    throw error;
  } catch (err) {
    const error = new Error(err.message);
    error.status = err.response ? err.response.status : 400;
    throw error;
  }
};

exports.buildAccountRequestData = buildAccountRequestData;
exports.postAccountRequests = postAccountRequests;
exports.getAccountRequest = getAccountRequest;
exports.deleteAccountRequest = deleteAccountRequest;
