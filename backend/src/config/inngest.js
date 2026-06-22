const { Inngest } = require('inngest');

const inngest = new Inngest({
  id: 'football-backend',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY
});

module.exports = inngest;
