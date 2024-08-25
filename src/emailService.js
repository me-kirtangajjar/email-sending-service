const winston = require("winston");

class EmailService {
  constructor(
    providers,
    maxRetries = 3,
    backoffFactor = 1,
    maxEmailsPerMinute = 10
  ) {
    this.providers = providers;
    this.maxRetries = maxRetries;
    this.backoffFactor = backoffFactor;
    this.emailStatus = new Map();
    this.sentEmails = new Set();
    this.emailQueue = [];
    this.isProcessingQueue = false;
    this.rateLimitInterval = 60000 / maxEmailsPerMinute;
    this.lastEmailSentTime = 0;
    this.logger = winston.createLogger({
      level: "info",
      format: winston.format.simple(),
      transports: [
        new winston.transports.File({ filename: "email-service.log" }),
      ],
    });
  }

  async sendEmail(email) {
    const idempotencyKey = email.id;

    if (this.sentEmails.has(idempotencyKey)) {
      this.logger.info(`Email with ID ${idempotencyKey} is a duplicate.`);
      return "Duplicate";
    }

    this.emailQueue.push(email);
    this.processQueue();
    return "Queued";
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.emailQueue.length > 0) {
      const now = Date.now();
      if (now - this.lastEmailSentTime < this.rateLimitInterval) {
        await this.sleep(
          this.rateLimitInterval - (now - this.lastEmailSentTime)
        );
      }

      const email = this.emailQueue.shift();
      try {
        await this.processEmail(email);
      } catch (error) {
        this.logger.error(
          `Failed to process email ${email.id}: ${error.message}`
        );
      }
      this.lastEmailSentTime = Date.now();
    }

    this.isProcessingQueue = false;
  }

  async processEmail(email) {
    const idempotencyKey = email.id;

    if (this.sentEmails.has(idempotencyKey)) {
      this.logger.info(`Email with ID ${idempotencyKey} is a duplicate.`);
      return;
    }

    for (const provider of this.providers) {
      let attempt = 0;
      while (attempt < this.maxRetries) {
        try {
          const response = await provider.send(email);
          if (response && response.success) {
            this.sentEmails.add(idempotencyKey);
            this.emailStatus.set(idempotencyKey, "Success");
            this.logger.info(
              `Email with ID ${idempotencyKey} sent successfully using ${provider.name}.`
            );
            return "Success";
          } else {
            throw new Error(`Provider ${provider.name} failed to send email.`);
          }
        } catch (error) {
          attempt += 1;
          const backoffTime = Math.pow(this.backoffFactor, attempt) * 1000; // Exponential backoff
          this.logger.warn(
            `Attempt ${attempt} failed for email ${idempotencyKey} using ${provider.name}: ${error.message}`
          );
          if (attempt < this.maxRetries) {
            await this.sleep(backoffTime);
          }
        }
      }
    }

    this.emailStatus.set(idempotencyKey, "Failed");
    this.logger.error(
      `Failed to send email with ID ${idempotencyKey} after ${this.maxRetries} attempts with all providers.`
    );
    throw new Error(
      `Email sending failed after ${this.maxRetries} attempts with all providers.`
    );
  }

  getStatus(emailId) {
    return this.emailStatus.get(emailId) || "Not Found";
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = EmailService;
