import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const initializeRedis = async (): Promise<RedisClientType | null> => {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({ 
      url: redisUrl,
      socket: {
        reconnectStrategy: () => false // Don't retry on connection failure
      }
    });

    redisClient.on('error', (_error) => {
      // Silent fail in dev mode without Redis
      return;
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.warn('⚠️  Redis unavailable - running in development mode without Redis');
    console.warn('   (For full functionality with seat locking, please run Redis)');
    return null;
  }
};

export const getRedisClient = (): RedisClientType | null => {
  return redisClient;
};

export const closeRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('✅ Redis disconnected successfully');
    } catch (error) {
      // Ignore errors
    }
    redisClient = null;
  }
};

// Mock Redis for development (when Redis is not available)
export const getMockRedisClient = () => {
  const mockData: Record<string, string> = {};
  return {
    set: async (key: string, value: string, ..._args: any[]) => {
      mockData[key] = value;
      return true;
    },
    get: async (key: string) => {
      return mockData[key] || null;
    },
    del: async (key: string) => {
      delete mockData[key];
      return 1;
    },
    expire: async (_key: string, _ttl: number) => {
      return 1;
    },
    keys: async (_pattern: string) => {
      return Object.keys(mockData);
    },
  };
};

