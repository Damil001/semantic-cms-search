import "dotenv/config";
import { ingestWebflow } from "./run.js";

ingestWebflow().catch((err) => {
  console.error(err);
  process.exit(1);
});
