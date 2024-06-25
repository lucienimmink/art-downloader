import { fetchWithTimeout } from '../../fetchWithTimeout.js';

const { FANARTAPIKEY } = process.env;

const fetchArt = async mbid => {
  if (!mbid) {
    throw Error('Cannot search without a proper mbid');
  }
  if (!FANARTAPIKEY) throw Error('cannot search without fanart API key');
  const response = await fetchWithTimeout(
    `https://webservice.fanart.tv/v3/music/${mbid}?api_key=${FANARTAPIKEY}&format=json`,
  );
  if (response.status === 200) {
    const json = await response.json();
    const { artistthumb } = json;
    if (artistthumb) {
      return artistthumb[0].url;
    }
  }
  throw Error('no art found in provider fanart');
};

export { fetchArt };
