import {SetMetadata} from '@nestjs/common';
import {ScopeType} from '@prisma/client';

export const PLUGIN_ACCESS_KEY = 'plugin_access';

export interface PluginAccessOptions {
  pluginName: string;
  scopeType?: ScopeType; // Optional: restrict to a specific level
}

export const PluginAccess = (pluginName: string, scopeType?: ScopeType) =>
  SetMetadata(PLUGIN_ACCESS_KEY, {pluginName, scopeType});
