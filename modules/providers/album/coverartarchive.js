import { fetchWithTimeout } from '../../fetchWithTimeout.js';

const fetchArt = async mbid => {
  if (!mbid) throw Error('no mbid');
  const response = await fetchWithTimeout(
    `https://coverartarchive.org/release/${mbid}/`,
  );
  if (response.status === 200) {
    const json = await response.json();
    const { images } = json;
    const front =
      images?.find(image => image.types?.includes('Front')) || images?.[0];
    if (front?.image) return front.image;
  }
  throw Error('no art found in provider audiodb');
};

export { fetchArt };
