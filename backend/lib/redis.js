import IORedis from 'ioredis';

// BullMQ requires maxRetriesPerRequest: null so blocking commands never time out.
// Pass KV_URL (rediss:// from Vercel KV integration) to connect to remote Redis;
// omit it to default to localhost:6379.
const redisOpts = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
};

export const redisConnection = process.env.KV_URL
  ? new IORedis(process.env.KV_URL, redisOpts)
  : new IORedis(redisOpts);
