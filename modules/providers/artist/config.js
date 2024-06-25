import { fetchArt as deezer } from './deezer.js';
import { fetchArt as fanart } from './fanart.js';

const config = [
  // {
  //   provider: fanart,
  //   key: 'mbid',
  // },
  {
    provider: deezer,
    key: 'artist',
  },
];

export { config };
