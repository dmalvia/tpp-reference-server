const { accessTokenAndResourcePath } = require('../authorise');
const { verifyHeaders, postPayments } = require('../setup-payment/payments');
const { retrievePaymentDetails } = require('../setup-payment/persistence');

const PAYMENT_SUBMISSION_ENDPOINT_URL = '/open-banking/v1.1/payment-submissions';

const makePayment = async (resourcePath, headers, paymentData) => {
  const response = await postPayments(
    resourcePath,
    PAYMENT_SUBMISSION_ENDPOINT_URL,
    headers,
    paymentData,
  );

  if (response && response.Data && response.Data.Status !== 'Rejected') {
    return response.Data.PaymentSubmissionId;
  }
  const error = new Error('Payment submission failed');
  error.status = 500;
  throw error;
};

const submitPayment = async (authorisationServerId, headers) => {
  const { accessToken, resourcePath } = await accessTokenAndResourcePath(authorisationServerId);
  const headersWithToken = Object.assign(headers, { accessToken });
  verifyHeaders(headers);
  const paymentData = await retrievePaymentDetails(headers.interactionId);
  const response = await makePayment(resourcePath, headersWithToken, paymentData);
  return response;
};

exports.submitPayment = submitPayment;
