# Art-downloader

Download artist art based on their [MBID](https://musicbrainz.org/). This Node.js program reads a JSON-based music file as used by [JSMusicDB](https://www.jsmusicd.com), whose structure is based on [scanner.py](https://github.com/lucienimmink/scanner.py). Missing artist MBIDs are resolved through MusicBrainz first, with Last.fm as a fallback when MusicBrainz has no usable result. Album metadata and cover URLs also use Last.fm, and art providers such as [fanart](https://fanart.tv/) and [Deezer](https://www.deezer.com/) are queried to find art.

## Config

The following variables should be set in `.env`:

- `LASTFMAPIKEY`: your Last.fm API key. Used to fetch album metadata and cover URLs, and as a fallback for artist MBIDs not found by MusicBrainz.
- `FANARTAPIKEY`: your fanart API key. Used for looking up missing art at fanart.
- `OUTPUT_FOLDER`: _optional_ the output folder for cache and status files.
- `ART_FOLDER`: _optional_ the output folder for the art images; defaults to `OUTPUT_FOLDER/art/`.
- `MUSIC_FILE`: _optional_ full path to your [JSMusicDB](https://www.jsmusicd.com) compatible [music file](https://github.com/lucienimmink/scanner.py); defaults to `./src`.
- `SOURCE_BASE`: _optional_ the base folder to which the paths in `MUSIC_FILE` resolve. Used when trying to write art to the source folders.
- `ART_DOWNLOADER_CONCURRENCY`: _optional_ maximum number of tasks processed concurrently. Must be a positive integer. The default is `8`. Lower values reduce provider and system load; higher values can speed up network-bound work but may trigger provider limits.

Example:

```dotenv
ART_DOWNLOADER_CONCURRENCY=4
```

## Options

Add any of these to your `.env` file any value will do

- `SKIPARTISTS` will skip all processing for artists.
- `SKIPALBUMS` will skip all processing for albums.
- `TURBO_MODE` only download art for newly fetched MBIDs.
- `PRINT_ARTISTS_WITHOUT_ART` will print a list of all artists and their MBID for which no art is found.
- `PRINT_ARTISTS` will print a list of all artists and their MBID.
- `PRINT_ALBUMS` will print a list of all albums and the URL to the source of the art
- `PRINT_ALBUMS_WITHOUT_ART` will print a list of all albums that have no source for their MBID
- `DAEMON_MODE` output minimal progress to output folder in the file `progress.txt`

> Tip: you can export the output of `PRINT_ARTISTS` and `PRINT_ALBUMS` to a file. For example: `npm run start > albums.txt`

## Performance

The application processes network-bound work with a bounded worker pool:

- Artist, album and image operations run in parallel, but at most `ART_DOWNLOADER_CONCURRENCY` tasks are active at once. Within each image lookup, providers are tried sequentially in configured priority order.
- If `ART_DOWNLOADER_CONCURRENCY` is missing, zero or invalid, the application uses `8`.
- The cache of downloaded art files is loaded once and retained in memory instead of reading the art directory for every MBID.
- Downloads are streamed directly to disk and the application waits until each download is complete before continuing.
- Requests are paced per hostname. MusicBrainz requests wait at least 1 second between starts; other providers wait at least 100 milliseconds.
- MusicBrainz requests use an identifiable application/version and project URL in the `User-Agent`, a 10-second timeout, and retry temporary network failures and HTTP 429/502/503/504 responses up to four times, using exponential backoff and the server's `Retry-After` header when available. The User-Agent identifies the application but does not raise MusicBrainz's source-IP rate limit.
- If MusicBrainz returns no artist MBID or fails, the artist lookup tries Last.fm when an API key is configured. A not-found warning is printed only when neither provider returns an MBID.
- Deezer rate-limit responses no longer use separate provider sleeps; each provider uses the shared request limiter.
- Album lookups reuse the already resolved album MBID instead of resolving it again for the art provider.
- Cached MBID maps and album maps are written completely before art processing continues.
- Album artwork is tried at full resolution from MusicBrainz's Cover Art Archive first, then Deezer, then Last.fm. Artist artwork uses Fanart.tv with the MusicBrainz MBID first, then Deezer; Last.fm is never used as an artist-art provider. MusicBrainz itself does not host artist artwork, so the MBID-based Fanart.tv service is used for that first choice.

These changes preserve the existing providers and output files; they only change concurrency and I/O timing.

## Output

Art is downloaded to `ART_FOLDER` or `./output/art/` if `ART_FOLDER` is not specified in `.env`.

The output logs are stored in `./output` and will contain 2 parts:

- `artists.json` a map of all cached artist <> MBID pairs found. This is used to speed up the process the next time you run the application.
- `albums.json` a map of all cached albums <> `{MBID, URL}` pairs found. Since last.fm has the album art and does the MBID lookup the data is stored in one go.
- `artists-without-art.json` a map of all artists <> MBID for which no art could be found, neither cached nor online. You can use the MBID to save your art for example.
