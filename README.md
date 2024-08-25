# Email Service

This is a resilient email sending service implemented in JavaScript.

## Features

- Works with multiple mock email providers
- Implements retry logic with exponential backoff
- Includes a fallback mechanism to switch providers on failure
- Ensures idempotency to prevent duplicate sends
- Implements basic rate limiting
- Provides status tracking for email sending attempts
- Includes a simple queuing system
- Implements basic logging

## Setup Instructions

1. Clone the repository
2. Run `npm install` to install dependencies

## Running the Service

1. Start the server by running `npm start`
2. The server will be available at `http://localhost:3000`

## API Endpoints

- POST `/send-email`: Send an email
  - Body: `{ id: string, to: string, subject: string, body: string }`
- GET `/email-status/:id`: Get the status of an email

## Running Tests

Run `npm test` to execute the unit tests

## Assumptions

- The email providers are mock implementations
- Email delivery is simulated with a 50% success rate for each provider
- Rate limiting is set to 10 emails per minute per provider

## Future Improvements

- Implement a circuit breaker pattern
- Add more comprehensive logging and monitoring
- Implement a more sophisticated queuing system with persistence
- Add more extensive error handling and validation