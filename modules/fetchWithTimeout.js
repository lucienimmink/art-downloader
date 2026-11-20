const hostLimiters = new Map();

const waitForHost = async resource => {
  let host;
  try {
    host = new URL(resource).hostname;
  } catch {
    return;
  }

  const interval = host === 'musicbrainz.org' ? 1000 : 100;
  const limiter = hostLimiters.get(host) || {
    tail: Promise.resolve(),
    nextRequestAt: 0,
  };

  const turn = limiter.tail
    .catch(() => {})
    .then(async () => {
      const wait = Math.max(0, limiter.nextRequestAt - Date.now());
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      limiter.nextRequestAt = Date.now() + interval;
    });
  limiter.tail = turn;
  hostLimiters.set(host, limiter);
  await turn;
};

export async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 2000 } = options;
  await waitForHost(resource);
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(id);
  }
}
