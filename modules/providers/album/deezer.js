import { fetchWithTimeout } from '../../fetchWithTimeout.js';
import { sleep } from './../../helpers.js';

const fetchArt = async ({ artist, album }) => {
  const response = await fetchWithTimeout(
    `https://api.deezer.com/search/album?q=${encodeURIComponent(artist)} - ${encodeURIComponent(album)}`,
  );
  if (response.status === 200) {
    const json = await response.json();
    const { data, error } = json;
    if (data) {
      return data[0].cover_xl;
    }
    if (error.code === 4) {
      sleep(100);
      return await fetchArt({ artist, album });
    }
  }
  throw Error('no art found in provider deezer');
};

export { fetchArt };
