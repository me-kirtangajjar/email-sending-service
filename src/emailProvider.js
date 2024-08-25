class EmailProvider {
  constructor(name) {
    this.name = name;
  }

  async send(email) {
    // Simulate a 50% success rate
    if (Math.random() < 0.5) {
      return { success: true };
    }
    return { success: false };
  }
}

module.exports = EmailProvider;
