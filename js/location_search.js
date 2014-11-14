var LocationSearch = function (form, container) {
  // Search form
  this.form = form;
  // Content container
  this.container = container;
  // Search values
  this.thing = null;
  this.place = null;
  // Renderer
  this.render = Mustache.to_html.bind(Mustache);
  this.init();
};

LocationSearch.prototype = new (function () {
  // Private utility func
  // Mustache is logicless, wrangle data into a format that it can use
  var _normalizeData = function (item) {
        var rating = item.Rating.AverageRating,
            ratingCount = item.Rating.TotalRatings,
            reviewCount = item.Rating.TotalReviews,
            ratingInt,
            ratingArray,
            ratingStatement,
            ratingCountStatement,
            reviewStatment;

        // Some entries have no rating number
        if (isNaN(rating)) {
          item.RatingStatement = '(No rating available)';
        }
        // Combine ratings info into two usefully worded properties
        else {
          // Make some nice rating stars, w00t
          ratingInt = parseInt(rating, 10);
          ratingArray = new Array(ratingInt + 1);
          ratingStatement = rating + ' ';
          ratingStatement += ratingArray.join('\u2605');
          if (rating > ratingInt) {
            ratingArray = new Array(5 - ratingInt + 1);
            ratingStatement += ratingArray.join('\u2606');
          }

          ratingCountStatement = ' (' + ratingCount;
          ratingCountStatement += ratingCount > 1 ? ' ratings' : ' rating';
          ratingCountStatement += ')';
          item.RatingStatement = ratingStatement;
          item.RatingCountStatement = ratingCountStatement;
        }

        // Rating has a leading space for some reason
        if (item.Rating.LastReviewIntro) {
          // Trim leading space, add quotes around
          item.Rating.LastReviewIntro = '"' +
              item.Rating.LastReviewIntro.replace(/^\s+/, '') + '"';
        }

        // English is hard
        if (!isNaN(reviewCount) && reviewCount > 0) {
          reviewStatement = 'Read ';
          if (reviewCount == 1) {
            reviewStatement += '1 review';
          }
          else if (reviewCount == 2) {
            reviewStatement += '2 reviews';
          }
          else {
            reviewStatement += 'all ' + reviewCount + ' reviews';
          }
          item.ReviewStatement = reviewStatement;
        }
      };

  // Set up eventing
  this.init = function () {
    var self = this;
    // Handle Enter key
    this.form.addEventListener('keypress', function (e) {
      if (e.keyCode == 13) {
        self.doSearch();
      }
    });
    var btn = this.form.querySelector('.btn');
    btn.addEventListener('click', this.doSearch.bind(this));
  };

  // Set search values and do the search
  this.doSearch = function () {
    var elements = this.form.elements;
    this.thing = elements.thing.value;
    this.place = elements.place.value;
    this.clearContent();
    this.getData();
  };

  // Grab data and render -- data, no-data, or error
  this.getData = function (page) {
    var self = this,
        opts = {},
        res;
    opts.page = page || 1;
    this.displayProgress();
    data.fetch(this.thing, this.place, opts, function (err, data) {
      if (err) {
        self.displayError(err);
      }
      else {
        if (data) {
          res = data.Result;
          res.forEach(_normalizeData);
          self.displayData(res, page);
          // After list is rendered, hook up event for re-running with
          // next page -- better would be to keep this separate from the
          // list rendering
          document.querySelector('.next-page').addEventListener('click', function () {
            self.getData(opts.page + 1);
          });
        }
        else {
          self.displayNoResults();
        }
      }
    });
  };

  // TODO: Display in a nice, user-friendly way
  // Right now all errors come through here -- may not want
  // end-users to see detailed error messages from the Yahoo side
  this.displayError = function (err) {
    this.displayContent('<div class="error">Error: ' + err.message +
        '</div>');
  };

  this.displayProgress = function () {
    this.displayContent('<div class="progress"><img src="img/progress.gif"/></div>');
  };

  this.displayNoResults = function () {
    this.displayContent('<div class="no-results">(No results for your search.)</div>');
  };

  this.displayData = function (data, page) {
    var html = this.render(this.template, {data: data, nextPage: page + 1});
    this.displayContent(html);
  };

  this.clearContent = function (html) {
    this.container.innerHTML = '';
  };

  this.displayContent = function (html) {
    this.clearContent();
    this.container.innerHTML = html;
  };

  // TODO: Move this guy into a separate file
  this.template = '<ul>{{#data}}\n' +
      '<li>\n' +
      '<h3><a href="{{Url}}">{{Title}}</a></h3>\n' +
      '<div class="summary">' +
      '<span class="rating">{{RatingStatement}}</span>' +
      '<span class="rating-count">{{RatingCountStatement}}</span>' +
      '</div>' +
      '<div class="info">{{Address}}&nbsp;&nbsp;{{Phone}}</div>' +
      '<div class="first-rating" title="{{Rating.LastReviewIntro}}">{{Rating.LastReviewIntro}}</div>' +
      '<div class="review"><a href="{{Url}}">{{ReviewStatement}}</a></div>' +
      '</li>\n' +
      '{{/data}}</ul>' +
      '<div class="next-page nav">next page <span class="next-icon">\u2398</span></div>';

})();

