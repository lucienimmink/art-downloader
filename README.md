# Art-downloader

Download artist art based on their [MBID](https://musicbrainz.org/). This node.js program reads a JSON-based music file as used by [JSMusicDB](https://www.jsmusicd.com), whose structure is based on [scanner.py](https://github.com/lucienimmink/scanner.py). For each found artist both [fanart](https://fanart.tv/) and [theaudiodb](https://www.theaudiodb.com/) are queried to find art for the artist. If a lot of artists need to be queried a rate limit can occur. If that is the case the program will sleep for 1 minute and then try again. Please be patient while we do our best to find all the art.

## Config

The following variables should be set in `.env`:

- `LASTFMAPIKEY`: your last.fm API key. Used to fetch metadata about the found artist. Mainly used for rapid MBID lookup.
- `FANARTAPIKEY`: your fanart API key. Used for looking up missing art at fanart.
- `ART_FOLDER`: _optional_ the output folder for the art images; defaults to `./output/art/`.
- `MUSIC_FILE`: _optional_ full path to your [JSMusicDB](https://www.jsmusicd.com) compatible [music file](https://github.com/lucienimmink/scanner.py); defaults to `./src`.
- `SOURCE_BASE`: _optional_ the base folder to which the paths in `MUSIC_FILE` resolve. Used when trying to write art to the source folders.

## Options

- `--skipArtists` will skip all processing for artists.
- `--skipAlbums` will skip all processing for albums.
- `--turbo` only download art for newly fetched MBIDs.
- `--printArtistsWithoutArt` will print a list of all artists and their MBID for which no art is found.
- `--printArtists` will print a list of all artists and their MBID.
- `--printAlbums` will print a list of all albums and the URL to the source of the art
- `--printAlbumsWithoutArt` will print a list of all albums that have no source for their MBID
- `--updateLib` will extend the source `MUSIC_FILE` with the MBIDs
- `--writeSource` will write `cover.[jpg|png|webp|...]` files in the folder per album found in `SOURCE_BASE`

> Tip: you can export the output of `--printArtists` and `--printAlbums` to a file. For example: `npm run start --printAlbums > albums.txt`

## Output

Art is downloaded to `ART_FOLDER` or `./output/art/` if `ART_FOLDER` is not specified in `.env`.

The output logs are stored in `./output` and will contain 2 parts:

- `artists.json` a map of all cached artist <> MBID pairs found. This is used to speed up the process the next time you run the application.
- `albums.json` a map of all cached albums <> `{MBID, URL}` pairs found. Since last.fm has the album art and does the MBID lookup the data is stored in one go.
- `artists-without-art.json` a map of all artists <> MBID for which no art could be found, neither cached nor online. You can use the MBID to save your art for example.
