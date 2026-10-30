// Long-running engine for a worker host (Railway, Fly.io, Render, a VPS). Vercel cannot run loops.
// Usage: npm run engine     (ENGINE_INTERVAL_MIN defaults to 15)
import { runTick } from "../src/lib/engine/runner";

const every = Number(process.env.ENGINE_INTERVAL_MIN || 15) * 60_000;
async function loop() {
  const started = new Date().toISOString();
  try {
    console.log(started, JSON.stringify(await runTick()));
  } catch (e) {
    console.error(started, "tick failed", e);
  }
  setTimeout(loop, every);
}
loop();
