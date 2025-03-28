import createServer from "./server";
import dotenv from "dotenv";

dotenv.config();

async function start() {
  const server = await createServer();

  const port = process.env.PORT;

  server.listen(port, () => {
    console.log(`game-service running on port ${port}`);
  });
}

start();
