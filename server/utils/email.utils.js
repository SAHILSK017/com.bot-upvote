/**
 * Simulates sending an email by logging to the console (no real SMTP).
 * @param {{ to: string, subject: string, body: string }} options
 * @returns {Promise<void>}
 */
export async function sendSimulatedEmail({ to, subject, body }) {
  console.log('\n========== SIMULATED EMAIL ==========');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log('=====================================\n');
}
