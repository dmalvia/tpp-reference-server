const { accessTokenAndResourcePath } = require('../authorise');
const { verifyHeaders, postPayments } = require('./payments');
const { buildPaymentsData } = require('./payment-data-builder');
const { persistPaymentDetails } = require('./persistence');
const debug = require('debug')('debug');

const PAYMENT_REQUEST_ENDPOINT_URL = '/open-banking/v1.1/payments';

const createRequest = async (resourcePath, headers, paymentData) => {
  verifyHeaders(headers);
  const response = await postPayments(
    resourcePath,
    PAYMENT_REQUEST_ENDPOINT_URL,
    headers,
    paymentData,
  );
  let error;
  if (response.Data) {
    const status = response.Data.Status;
    debug(`/payments repsonse Data: ${JSON.stringify(response.Data)}`);
    if (status === 'AcceptedTechnicalValidation' || status === 'AcceptedCustomerProfile') {
      if (response.Data.PaymentId) {
        return response.Data.PaymentId;
      }
    } else {
      error = new Error(`Payment response status: "${status}"`);
      error.status = 500;
      throw error;
    }
  }
  error = new Error('Payment response missing payload');
  error.status = 500;
  throw error;
};

const setupPayment = async (authorisationServerId,
  headers, CreditorAccount, InstructedAmount) => {
  const { accessToken, resourcePath } = await accessTokenAndResourcePath(authorisationServerId);

  const paymentData = buildPaymentsData(
    {}, // opts
    {}, // risk
    CreditorAccount, InstructedAmount,
  );

  const headersWithToken = Object.assign(headers, { accessToken });
  const paymentId = await createRequest(
    resourcePath,
    headersWithToken,
    paymentData,
  );

  const fullPaymentData = {
    Data: {
      PaymentId: paymentId,
      Initiation: paymentData.Data.Initiation,
    },
    Risk: paymentData.Risk,
  };

  persistPaymentDetails(headers.interactionId, fullPaymentData);

  return paymentId;
};

exports.setupPayment = setupPayment;
