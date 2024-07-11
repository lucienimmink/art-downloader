import { fetchWithTimeout } from '../../fetchWithTimeout.js';
import { sleep } from './../../helpers.js';

const fetchArt = async ({ artist, album }) => {
  const response = await fetchWithTimeout(
    `https://api.deezer.com/search/album?q=artist:"${encodeURIComponent(artist)}" album:"${encodeURIComponent(album)}"`,
  );
  if (response.status === 200) {
    const json = await response.json();
    const { data, error, total } = json;
    if (data && total > 0) {
      return data[0].cover_xl;
    }
    if (error.code === 4) {
      await sleep(100);
      return await fetchArt({ artist, album });
    }
  }
  throw Error('no art found in provider deezer');
};

export { fetchArt };
