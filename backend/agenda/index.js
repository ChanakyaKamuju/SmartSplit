const { Agenda } = require("agenda");
require("dotenv").config();

const agenda = new Agenda({
  db: {
    address: process.env.MONGO_URI, // Replace with actual DB name
    collection: "agendaJobs",
  },
});

// Load job definitions
require("./jobs/incrementDutyIndex")(agenda);

(async function () {
  await agenda.start();

  // Run job daily at 12:00 AM
  await agenda.every("0 0 * * *", "increment duty currentIndex");
  //   await agenda.every("1 minute", "increment duty currentIndex");
})().catch((error) => {
  // Without this catch, a Mongo connectivity problem surfaces as an unhandled
  // rejection that kills the process with a raw stack trace, hiding the
  // connection error connectDB reports.
  console.error(
    "[Agenda] Failed to start the duty scheduler:",
    error.message
  );
});

module.exports = agenda;
