const express = require('express');
const EmailService = require('./src/emailService');
const EmailProvider = require('./src/emailProvider');

const app = express();
app.use(express.json());

// Initialize the providers
const provider1 = new EmailProvider('provider1');
const provider2 = new EmailProvider('provider2');

// Initialize the email service with the providers
const emailService = new EmailService([provider1, provider2]);

// Route to send an email
app.post('/send-email', async (req, res) => {
  try {
    const email = req.body;
    const result = await emailService.sendEmail(email);
    res.status(200).json({ message: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get email status
app.get('/email-status/:id', (req, res) => {
  const status = emailService.getStatus(req.params.id);
  res.status(200).json({ status });
});

// Start the server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});