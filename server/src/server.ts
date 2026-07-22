import mongoose from 'mongoose';
import app from './app';
import { config } from './config';

const MONGO_MAX_ATTEMPTS = 5;
const MONGO_RETRY_DELAY_MS = 3000;

// Cap each attempt so an unreachable database fails the deploy in seconds
// rather than sitting on the driver's 30s default five times over.
const MONGO_SELECTION_TIMEOUT_MS = 5000;

/** Resolve after the given number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Connect to MongoDB, retrying transient failures before giving up.
 *
 * Container DNS is not always ready by the time Node starts, so the first
 * lookup can fail with EAI_AGAIN and kill an otherwise healthy deploy.
 * Retrying absorbs that blip; a genuinely unreachable database still exits
 * once the attempts are exhausted.
 */
async function connectToMongo(): Promise<void> {
  for (let attempt = 1; attempt <= MONGO_MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: MONGO_SELECTION_TIMEOUT_MS,
      });
      return;
    } catch (error) {
      if (attempt === MONGO_MAX_ATTEMPTS) throw error;

      const reason = error instanceof Error ? error.message : String(error);
      console.warn(
        `⚠️  MongoDB connection attempt ${attempt}/${MONGO_MAX_ATTEMPTS} failed (${reason}); retrying in ${MONGO_RETRY_DELAY_MS}ms`
      );
      await delay(MONGO_RETRY_DELAY_MS);
    }
  }
}

async function bootstrap(): Promise<void> {
  try {
    await connectToMongo();
    console.log('✅ Connected to MongoDB');

    app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server listening on http://0.0.0.0:${config.port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
