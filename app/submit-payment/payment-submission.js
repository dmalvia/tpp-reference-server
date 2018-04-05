const { submitPayment } = require('./submit-payment');
const { fapiFinancialIdFor } = require('../authorisation-servers');
const uuidv4 = require('uuid/v4');
const error = require('debug')('error');
const debug = require('debug')('debug');

const paymentSubmission = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const authServerId = req.headers['x-authorization-server-id'];
    const fapiFinancialId = await fapiFinancialIdFor(authServerId);
    const interactionId = req.headers['x-fapi-interaction-id'];
    const idempotencyKey = uuidv4();
    const headers = { fapiFinancialId, idempotencyKey, interactionId };
    const paymentSubmissionId = await submitPayment(authServerId, headers);

    debug(`Payment Submission succesfully completed. Id: ${paymentSubmissionId}`);
    return res.status(201).send(); // We can't intercept a 302 !
  } catch (err) {
    error(err);
    const status = err.status ? err.status : 500;
    return res.status(status).send({ message: err.message });
  }
};

exports.paymentSubmission = paymentSubmission;
