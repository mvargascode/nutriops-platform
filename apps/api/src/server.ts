import "dotenv/config";
import app from "./app";
import { env } from "./core/config/env";

const port = env.PORT;

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});