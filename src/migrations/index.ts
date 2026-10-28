import * as migration_20261028_172421_initial from './20261028_172421_initial';

export const migrations = [
  {
    up: migration_20261028_172421_initial.up,
    down: migration_20261028_172421_initial.down,
    name: '20261028_172421_initial'
  },
];
