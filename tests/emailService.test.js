const EmailService = require('../src/emailService');
const EmailProvider = require('../src/emailProvider');

jest.mock('../src/emailProvider');
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
  format: {
    simple: jest.fn(),
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
  },
}));

describe('EmailService', () => {
  let emailService;
  let EmailProvider1, EmailProvider2;

  beforeEach(() => {
    EmailProvider1 = new EmailProvider('provider1');
    EmailProvider2 = new EmailProvider('provider2');
    emailService = new EmailService([EmailProvider1, EmailProvider2], 3, 1, 10);
  });

  it('should send email successfully using the first provider', async () => {
    EmailProvider1.send = jest.fn().mockResolvedValue({ success: true });
    const email = { id: '1', to: 'test@example.com', subject: 'Test', body: 'Hello!' };
    const response = await emailService.sendEmail(email);
    expect(response).toBe('Queued');
    await emailService.processQueue();
    expect(emailService.getStatus('1')).toBe('Success');
  }, 10000);

  it('should fallback to the second provider on failure and succeed', async () => {
    EmailProvider1.send = jest.fn().mockResolvedValue({ success: false });
    EmailProvider2.send = jest.fn().mockResolvedValue({ success: true });

    const email = { id: '2', to: 'test2@example.com', subject: 'Fallback', body: 'This should work!' };
    await emailService.sendEmail(email);
    await emailService.processQueue();
    expect(emailService.getStatus('2')).toBe('Success');
  }, 10000);

  it('should retry and fail after maximum retries', async () => {
    EmailProvider1.send = jest.fn().mockResolvedValue({ success: false });
    EmailProvider2.send = jest.fn().mockResolvedValue({ success: false });

    const email = { id: '3', to: 'fail@example.com', subject: 'Fail Test', body: 'This will fail.' };
    await emailService.sendEmail(email);
    await emailService.processQueue();
    expect(emailService.getStatus('3')).toBe('Failed');
  }, 10000);

  it('should return duplicate status for idempotent requests', async () => {
    EmailProvider1.send = jest.fn().mockResolvedValue({ success: true });
    const email = { id: '4', to: 'test@example.com', subject: 'Idempotency Test', body: 'Hello!' };
    
    await emailService.sendEmail(email);
    await emailService.processQueue();
    const response = await emailService.sendEmail(email);
    
    expect(response).toBe('Duplicate');
  });

  it('should handle rate limiting', async () => {
    EmailProvider1.send = jest.fn().mockResolvedValue({ success: true });
    const email1 = { id: '5', to: 'rate1@example.com', subject: 'Rate Limit Test 1', body: 'This should be rate-limited.' };
    const email2 = { id: '6', to: 'rate2@example.com', subject: 'Rate Limit Test 2', body: 'This should be rate-limited.' };
    
    const start = Date.now();
    await emailService.sendEmail(email1);
    await emailService.sendEmail(email2);
    await emailService.processQueue();
    const end = Date.now();
    
    expect(end - start).toBeGreaterThanOrEqual(6000); // Allow some buffer time
  }, 20000);
});
