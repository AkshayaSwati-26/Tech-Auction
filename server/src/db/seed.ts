import { db } from "./singleton.js";
import { seedEvent } from "./seedData.js";

try {
  const { teams, lots } = await seedEvent(db);
  console.log(`Seeded ${teams} teams and ${lots} lots.`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
