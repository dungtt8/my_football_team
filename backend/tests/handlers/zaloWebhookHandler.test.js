const crypto = require('crypto');
const zaloWebhookHandler = require('../../src/handlers/zaloWebhookHandler');

describe('POST /api/zalo/webhook', () => {
  let req, res;

  beforeEach(() => {
    req = {
      headers: {
        'x-zalo-signature': ''
      },
      body: {}
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should verify webhook signature and process event', async () => {
    const body = { event: 'follow', user_id: 'zuid-001' };
    // Generate valid signature (using mock secret)
    const signature = crypto
      .createHmac('sha256', process.env.ZALO_OA_WEBHOOK_VERIFY_TOKEN || 'test-token')
      .update(JSON.stringify(body))
      .digest('hex');

    req.headers['x-zalo-signature'] = signature;
    req.body = body;

    await zaloWebhookHandler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalled();
  });

  test('should reject request with invalid signature', async () => {
    req.headers['x-zalo-signature'] = 'invalid-signature';
    req.body = { event: 'follow' };

    await zaloWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
