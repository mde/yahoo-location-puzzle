
var data = new (function () {

  var DATA_FETCH_TIMEOUT = 7000,
      QUERY_URL = 'http://query.yahooapis.com/v1/public/yql',
      PAGE_SIZE = 20;

  // Private vars
  var _head = document.getElementsByTagName("head")[0] ||
            document.documentElement,
      _errorTimeout,
      _currentScript,
      _currentCallback;

  // Private methods

  // Script-append for JSONP
  var _appendScriptTag = function (src) {
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = src;

        // Assume error if callback doesn't eventually fire
        _errorTimeout = setTimeout(function () {
          data.handle();
        }, DATA_FETCH_TIMEOUT);

        _currentScript = script;

        _head.appendChild(script);
      },

    // Parse and validate the input
    // Throws if input is not valid
      _formatQuery = function (thing, place, page) {
        var yql = 'select * from local.search',
            startIndex = (page - 1) * PAGE_SIZE,
            endIndex = startIndex + PAGE_SIZE,
            placeCondition,
            thingCondition,
            match;

        if (!thing) {
          throw new Error('Must enter a "What" and a "Where"');
        }

        yql += '(' + startIndex + ',' + endIndex + ')';
        yql += ' where ';

        // TODO: TESTS WOULD BE AWESOME HERE
        // ====
        // Plain or extended ZIP
        if (/\d{5}|\d{5}-\d{4}/.test(place)) {
          placeCondition = " location='" + place + "'"
        }
        // City, state
        else if ((match = place.match(/(\S+)\s*,\s*(\S+)/))) {
          placeCondition = " city='" + match[1] +
              "' and state='" + match[2] + "'";
        }
        else {
          throw new Error('"Where" input must be US ZIP code or City, State');
        }

        yql += placeCondition;

        thingCondition = " and query='" + thing + "'";
        yql += thingCondition;

        return yql;
      };

  // Public API methods
  // (thing, place, [opts], callback)
  this.fetch = function () {
    var args = Array.prototype.slice.call(arguments),
        thing = args.shift(),
        place = args.shift(),
        callback = args.pop(),
        opts = args.pop() || {},
        query
        url = QUERY_URL;

    _currentCallback = callback;

    try {
      query = _formatQuery(thing, place, opts.page || 1);
      url += '?q=' + encodeURIComponent(query) +
          '&format=json&callback=data.handle';
      _appendScriptTag(url);
    }
    catch (e) {
      _currentCallback(e);
    }
  };

  this.handle = function (data) {
    if (!_currentScript) {
      return;
    }
    clearTimeout(_errorTimeout);
    _head.removeChild(_currentScript);
    _currentScript = null;
    if (data) {
      if (data.error) {
        _currentCallback(new Error(data.error.description));
      }
      else {
        _currentCallback(null, data.query.results);
      }
    }
    else {
      _currentCallback(new Error('Sorry, your query did not return any data'));
    }
  };

})();

