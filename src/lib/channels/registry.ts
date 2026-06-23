import type { ChannelProvider } from '@/types';
import type { ChannelAdapter } from './types';
import { metaAdapter } from './meta-adapter';
import { evolutionAdapter } from './evolution-adapter';

/** Resolve the adapter for a given provider. The 1:1 provider <->
 *  connection_type pairing is enforced at the database level (see
 *  028_account_connections.sql's CHECK constraint), so callers only
 *  ever need the provider to pick the right adapter. */
export function getChannelAdapter(provider: ChannelProvider): ChannelAdapter {
  switch (provider) {
    case 'META':
      return metaAdapter;
    case 'EVOLUTION':
      return evolutionAdapter;
  }
}
