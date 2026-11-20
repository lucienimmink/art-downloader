import { fetchWithTimeout } from '../fetchWithTimeout.js';

const { LASTFMAPIKEY } = process.env;

const escapeLucene = value =>
  String(value).replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, '\\$1');

const sleep = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

const getRetryDelay = (retryAfter, retryNumber) => {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryAt = Number.isFinite(seconds)
      ? Date.now() + seconds * 1000
      : Date.parse(retryAfter);
    if (Number.isFinite(retryAt)) {
      return Math.min(Math.max(0, retryAt - Date.now()), 30_000);
    }
  }
  return 1000 * 2 ** retryNumber;
};

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
  if (!response.ok) {
    throw Error(`Last.fm returned HTTP ${response.status}`);
  }
  const json = await response.json();
  if (json.error) {
    throw Error(`Last.fm returned error ${json.error}: ${json.message || ''}`);
  }
  return json;
};

const getMusicBrainzMBID = async artist => {
  const searchParams = new URLSearchParams();
  searchParams.set('fmt', 'json');
  searchParams.set('query', `artist:"${escapeLucene(artist)}"`);
  const url = `https://musicbrainz.org/ws/2/artist/?${searchParams}`;
  const options = {
    timeout: 10_000,
    headers: {
      'User-Agent':
        '@addasoft/art-downloader/1.14.2 (https://github.com/lucienimmink/art-downloader)',
    },
  };
  let response;

  for (let retry = 0; retry <= 4; retry++) {
    try {
      response = await fetchWithTimeout(url, options);
    } catch (error) {
      if (retry === 4) throw error;
      await sleep(1000 * 2 ** retry);
      continue;
    }

    if (response.ok) break;
    if (![429, 502, 503, 504].includes(response.status) || retry === 4) {
      throw Error(`MusicBrainz returned HTTP ${response.status}`);
    }

    const retryDelay = getRetryDelay(
      response.headers.get('retry-after'),
      retry,
    );
    await response.body?.cancel();
    await sleep(retryDelay);
  }

  const { artists } = await response.json();
  if (Array.isArray(artists) && artists.length > 0) {
    const exactMatch = artists.find(
      candidate => candidate.name?.toLowerCase() === artist.toLowerCase(),
    );
    return (exactMatch || artists[0])?.id || null;
  }
  return null;
};

const getMBID = async artist => {
  const errors = [];
  try {
    const mbid = await getMusicBrainzMBID(artist);
    if (mbid) return mbid;
  } catch (error) {
    errors.push(error);
  }

  if (LASTFMAPIKEY) {
    try {
      const lastFmInfo = await getMetaInfo({ artist });
      const mbid = lastFmInfo.artist?.mbid;
      if (mbid) return mbid;
    } catch (error) {
      errors.push(error);
    }
  }

  if (errors.length > 0) {
    throw Error(
      `Artist MBID lookup failed: ${errors.map(error => error.message).join('; ')}`,
    );
  }
  return null;
};

export { getMBID, getMetaInfo };
