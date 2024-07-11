import { fetchWithTimeout } from '../../fetchWithTimeout.js';
import { sleep } from './../../helpers.js';

const fetchArt = async artist => {
  const response = await fetchWithTimeout(
    `https://api.deezer.com/search/artist?q=artist:"${encodeURIComponent(artist)}"`,
  );
  if (response.status === 200) {
    const json = await response.json();
    const { data, error, total } = json;
    if (data && total > 0) {
      const url = data[0].picture_xl;
      if (!url.includes('/artist//')) return url;
    }
    if (error.code === 4) {
      await sleep(100);
      return await fetchArt(artist);
    }
  }
  throw Error('no art found in provider deezer');
};

export { fetchArt };
