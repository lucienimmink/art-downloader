import { fetchArt as coverartarchive } from './coverartarchive.js';
import { fetchArt as deezer } from './deezer.js';
import { fetchArt as lastfm } from './lastfm.js';

const config = [
  {
    provider: coverartarchive,
    key: 'mbid',
  },
  {
    provider: deezer,
  },
  {
    provider: lastfm,
  },
];

export { config };
