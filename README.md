# Art-downloader

Download artist art based on their [MBID](https://musicbrainz.org/). This node.js program reads a json based music file as used by [JSMusicDB](https://www.jsmusicd.com), which structure is based on [scanner.py](https://github.com/lucienimmink/scanner.py). For each found artist both [fanart](https://fanart.tv/) and [theaudiodb](https://www.theaudiodb.com/) are queried in order to find art for the artist. If a lot of artists need to be queried a rate-limit can occur. If that is the case the program will sleep for 1 minute and then try again. Please be patient while we do our bes to find all the art. 

## Config

The following variables should be set in `.env`:

- `MUSIC_FILE`: full path to your [JSMusicDB](https://www.jsmusicd.com) compatible [music file](https://github.com/lucienimmink/scanner.py); defaults to `./src`.
- `ART_FOLDER`: the output folder for the art images; defaults to `./output/art/`.
- `LASTFMAPIKEY`: your last.fm API key. Used to fetch meta data about the found artist. Mainly used for rapid MBID lookup.
- `FANARTAPIKEY`: your fanart API key. Used for looking up missing art at fanart.

## Output

Art is downloaded to `ART_FOLDER` or `./output/art/` if `ART_FOLDER` is not specified in `.env`.

The output logs are stored in `./output` and will contain 2 parts:

- `artists.json` a map of all cached artist <> MBID pairs found. This is used to speed up the process next ti you run the application.
- `artists-without-art.json` a map of all artists <> MBID for which no art could be found, neither cached or online. You can use the MBID to save your own art for example.
