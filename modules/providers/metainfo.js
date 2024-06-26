import { fetchWithTimeout } from '../fetchWithTimeout.js';

const { LASTFMAPIKEY } = process.env;

const getMetaInfo = async ({ artist, album }) => {
  if (!LASTFMAPIKEY)
    throw Error('no last.fm api key provided, cannot use provider');
  const searchParams = new URLSearchParams();
  searchParams.set('api_key', LASTFMAPIKEY);
  searchParams.set('artist', artist);
  searchParams.set('format', 'json');
  searchParams.set('autoCorrect', 'true');
  if (album) {
    searchParams.set('method', 'album.getinfo');
    searchParams.set('album', album);
  } else {
    searchParams.set('method', 'artist.getinfo');
  }
  const response = await fetchWithTimeout(
    `https://ws.audioscrobbler.com/2.0/?${searchParams}`,
  );
  const json = await response.json();
  return json;
};

const getMBID = async artist => {
  const searchParams = new URLSearchParams();
  searchParams.set('fmt', 'json');
  searchParams.set('query', artist);
  const response = await fetchWithTimeout(
    `https://musicbrainz.org/ws/2/artist/?${searchParams}`,
  );
  const { artists } = await response.json();
  return artists[0].id;
};

export { getMBID, getMetaInfo };
