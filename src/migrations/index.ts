import * as migration_20261028_172421_initial from './20261028_172421_initial';
import * as migration_20261030_182139_collections from './20261030_182139_collections';

export const migrations = [
  {
    up: migration_20261028_172421_initial.up,
    down: migration_20261028_172421_initial.down,
    name: '20261028_172421_initial',
  },
  {
    up: migration_20261030_182139_collections.up,
    down: migration_20261030_182139_collections.down,
    name: '20261030_182139_collections'
  },
];
