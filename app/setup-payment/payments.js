const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const log = require('debug')('log');
const debug = require('debug')('debug');
const error = require('debug')('error');
const assert = require('assert');

const verifyHeaders = (headers) => {
  assert.ok(headers.accessToken, 'accessToken missing from headers');
  assert.ok(headers.fapiFinancialId, 'fapiFinancialId missing from headers');
  assert.ok(headers.interactionId, 'interactionId missing from headers');
  assert.ok(headers.idempotencyKey, 'idempotencyKey missing from headers');
};

/**
 * @description Dual purpose: payments and payment-submissions
 */
const postPayments = async (resourceServerPath, paymentPathEndpoint, headers, paymentData) => {
  try {
    verifyHeaders(headers);
    const paymentsUri = `${resourceServerPath}${paymentPathEndpoint}`;
    log(`POST to ${paymentsUri}`);
    const payment = setupMutualTLS(request.post(paymentsUri))
      .set('authorization', `Bearer ${headers.accessToken}`)
      .set('x-fapi-financial-id', headers.fapiFinancialId)
      .set('x-fapi-interaction-id', headers.interactionId)
      .set('x-idempotency-key', headers.idempotencyKey)
      .set('content-type', 'application/json; charset=utf-8')
      .set('accept', 'application/json; charset=utf-8');
    if (headers.customerLastLogged) payment.set('x-fapi-customer-last-logged-time', headers.customerLastLogged);
    if (headers.customerIp) payment.set('x-fapi-customer-ip-address', headers.customerIp);
    if (headers.jwsSignature) payment.set('x-jws-signature', headers.jwsSignature);

    payment.send(paymentData);
    const response = await payment;
    debug(`${response.status} response for ${paymentsUri}`);

    return response.body;
  } catch (err) {
    if (err.response && err.response.text) {
      error(err.response.text);
    }
    const e = new Error(err.message);
    e.status = err.response ? err.response.status : 500;
    throw e;
  }
};

exports.postPayments = postPayments;
exports.verifyHeaders = verifyHeaders;
