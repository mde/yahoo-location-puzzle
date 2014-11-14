/*
Assumptions
- No extensive use of third-party libs for a simple app

To-Dos
- Package with Browserify or AMD
- Pass Mustache as a param, no global


*/


var LocationSearch = function (form, container) {
  this.form = form;
  this.container = container;
  this.thing = null;
  this.place = null;
  this.render = Mustache.to_html.bind(Mustache);
  this.init();
};

LocationSearch.prototype = new (function () {

  var _normalizeData = function (item) {
        var rating = item.Rating.AverageRating,
            ratingCount = item.Rating.TotalRatings,
            ratingStatement,
            ratingCountStatement;
        if (isNaN(rating)) {
          item.RatingStatement = '(No rating available)';
        }
        else {
          ratingStatement = rating + '/5 stars';

          ratingCountStatement = ' (' + ratingCount;
          ratingCountStatement += ratingCount > 1 ? ' ratings' : ' rating';
          ratingCountStatement += ')';
          item.RatingStatement = ratingStatement;
          item.RatingCountStatement = ratingCountStatement;
        }

        if (item.Rating.LastReviewIntro) {
          item.Rating.LastReviewIntro = '"' +
              item.Rating.LastReviewIntro.replace(/^\s+/, '') + '"';
        }
      };

  this.init = function () {
    var btn = this.form.querySelector('.btn');
    btn.addEventListener('click', this.doSearch.bind(this));
  };

  this.doSearch = function () {
    var elements = this.form.elements;
    this.thing = elements.thing.value;
    this.place = elements.place.value;
    this.getData();
  };

  this.getData = function (page) {
    var self = this,
        opts = {};
    opts.page = page || 1;
    data.fetch(this.thing, this.place, opts, function (err, data) {
      if (err) {
        self.displayError(err);
      }
      else {
        data.forEach(_normalizeData);
        self.displayData(data);
      }
    });
  };

  // TODO: Display in a nice, user-friendly way
  // Right now all errors come through here -- may not want
  // end-users to see detailed error messages from the Yahoo side
  this.displayError = function (err) {
    alert(err.message);
  };

  this.displayData = function (data) {
    console.log(data);
    var html = this.render(this.template, {data: data});
    console.log(html);
    this.container.innerHTML = html;
  };

  this.template = '<ul>{{#data}}\n' +
      '<li>\n' +
      '<h3><a href="{{Url}}">{{Title}}</a></h3>\n' +
      '<div class="summary">' +
      '<span class="rating">{{RatingStatement}}</span>' +
      '<span class="rating-count">{{RatingCountStatement}}</span>' +
      '</div>' +
      '<div class="first-rating">{{Rating.LastReviewIntro}}</div>' +
      '<div class="info">{{Address}}&nbsp;&nbsp;{{Phone}}</div>' +
      '</li>\n' +
      '{{/data}}</ul>';

})();

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

      _formatQuery = function (thing, place, page) {
        var yql = 'select * from local.search',
            startIndex = (page - 1) * PAGE_SIZE,
            endIndex = startIndex + PAGE_SIZE,
            placeCondition,
            thingCondition,
            match;

        yql += '(' + startIndex + ',' + endIndex + ')';
        yql += ' where ';

        // TODO: Tests for a bunch of fucked-up inputs
        // ====
        // Plain or extended ZIP
        if (/\d{5}|\d{5}-\d{4}/.test(place)) {
          placeCondition = " + location='" + place + "'"
        }
        // City, state
        else if ((match = place.match(/(\S+)\s*,\s*(\S+)/))) {
          placeCondition = " city='" + match[1] +
              "' and state='" + match[2] + "'";
        }
        else {
          throw new Error('Input must be US ZIP code or City, State');
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
        _currentCallback(null, data.query.results.Result);
      }
    }
    else {
      _currentCallback(new Error('Sorry, your query did not return any data'));
    }
  };

})();
