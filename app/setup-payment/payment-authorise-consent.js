const { setupPayment } = require('./setup-payment');
const { generateRedirectUri } = require('../authorise');
const { fapiFinancialIdFor } = require('../authorisation-servers');
const uuidv4 = require('uuid/v4');
const error = require('debug')('error');
const debug = require('debug')('debug');

const paymentAuthoriseConsent = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const sessionId = req.headers['authorization'];
    const authorisationServerId = req.headers['x-authorization-server-id'];
    const { CreditorAccount } = req.body;
    const { InstructedAmount } = req.body;
    const fapiFinancialId = await fapiFinancialIdFor(authorisationServerId);
    debug(`authorisationServerId: ${authorisationServerId}`);
    debug(`fapiFinancialId: ${fapiFinancialId}`);
    const idempotencyKey = uuidv4();
    const interactionId = uuidv4();
    const headers = { fapiFinancialId, idempotencyKey, interactionId };
    const paymentId = await setupPayment(
      authorisationServerId, headers,
      CreditorAccount, InstructedAmount,
    );

    const uri = await generateRedirectUri(authorisationServerId, paymentId, 'openid payments', sessionId, interactionId);

    debug(`authorize URL is: ${uri}`);
    return res.status(200).send({ uri }); // We can't intercept a 302 !
  } catch (err) {
    error(err);
    const status = err.status ? err.status : 500;
    return res.status(status).send({ message: err.message });
  }
};

exports.paymentAuthoriseConsent = paymentAuthoriseConsent;
