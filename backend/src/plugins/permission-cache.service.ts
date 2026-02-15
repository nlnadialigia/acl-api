import {Inject, Injectable} from '@nestjs/common';
import {ScopeType} from '@prisma/client';
import Redis from 'ioredis';
import {REDIS_CLIENT} from '../redis/redis.module';

export interface CachedPermission {
  scopeType: ScopeType;
  scopeId: string | null;
}

@Injectable()
export class PermissionCacheService {
  private readonly TTL = 3600; // 1 hour

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) { }

  private buildKey(userId: string, pluginName: string): string {
    return `permission:user:${userId}:plugin:${pluginName}`;
  }

  async getPermissions(userId: string, pluginName: string): Promise<CachedPermission[] | null> {
    try {
      const data = await this.redis.get(this.buildKey(userId, pluginName));
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis Get Error:', error);
      return null;
    }
  }

  async setPermissions(userId: string, pluginName: string, permissions: CachedPermission[]): Promise<void> {
    try {
      await this.redis.set(
        this.buildKey(userId, pluginName),
        JSON.stringify(permissions),
        'EX',
        this.TTL,
      );
    } catch (error) {
      console.error('Redis Set Error:', error);
    }
  }

  async invalidate(userId: string, pluginName?: string): Promise<void> {
    try {
      if (pluginName) {
        await this.redis.del(this.buildKey(userId, pluginName));
      } else {
        // Invalidate all plugins for this user
        const keys = await this.redis.keys(`permission:user:${userId}:plugin:*`);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
    } catch (error) {
      console.error('Redis Invalidation Error:', error);
    }
  }
}
