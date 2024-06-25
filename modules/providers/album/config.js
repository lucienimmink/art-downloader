import { fetchArt as lastfm } from './lastfm.js';
import { fetchArt as deezer } from './deezer.js';
import { fetchArt as coverartarchive } from './coverartarchive.js';

const config = [
  {
    provider: deezer,
  },
  {
    provider: lastfm,
  },
  {
    provider: coverartarchive,
    key: 'mbid',
  },
];

export { config };
