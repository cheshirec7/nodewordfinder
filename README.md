NodeWordFinder
==============

Scrabble / Words With Friends Word Finder for NodeJS

Check out a [live example](http://nodewordfinder.herokuapp.com/) on Heroku. (Note that since the Free Tier is in use there can be a warm-up time when first accessed.)

See the full project description [here](https://github.com/cheshirec7/wordfinder).

This project uses:

* [Express Framework](http://expressjs.com/)
* [Promises](https://github.com/tildeio/rsvp.js/)
* [MemCachier](https://github.com/alevy/memjs)
* [Material Design Lite](https://getmdl.io/)

Back-end usage:  
http://nodewordfinder.herokuapp.com/find?tray=test&wc=3&rt=json

Where:
* tray (required): 1+ letters
* wc (opt): a number indicating number of wild card characters
* rt (opt): return type, 'html' (default) or 'json'
