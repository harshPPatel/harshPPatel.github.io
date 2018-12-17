//  Chance.js 1.0.16
//  http://chancejs.com
//  (c) 2013 Victor Quinn
//  Chance may be freely distributed or modified under the MIT license.

(function () {

  // Constants
  var MAX_INT = 9007199254740992;
  var MIN_INT = -MAX_INT;
  var NUMBERS = '0123456789';
  var CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz';
  var CHARS_UPPER = CHARS_LOWER.toUpperCase();
  var HEX_POOL  = NUMBERS + "abcdef";

  // Errors
  function UnsupportedError(message) {
      this.name = 'UnsupportedError';
      this.message = message || 'This feature is not supported on this platform';
  }

  UnsupportedError.prototype = new Error();
  UnsupportedError.prototype.constructor = UnsupportedError;

  // Cached array helpers
  var slice = Array.prototype.slice;

  // Constructor
  function Chance (seed) {
      if (!(this instanceof Chance)) {
          if (!seed) { seed = null; } // handle other non-truthy seeds, as described in issue #322
          return seed === null ? new Chance() : new Chance(seed);
      }

      // if user has provided a function, use that as the generator
      if (typeof seed === 'function') {
          this.random = seed;
          return this;
      }

      if (arguments.length) {
          // set a starting value of zero so we can add to it
          this.seed = 0;
      }

      // otherwise, leave this.seed blank so that MT will receive a blank

      for (var i = 0; i < arguments.length; i++) {
          var seedling = 0;
          if (Object.prototype.toString.call(arguments[i]) === '[object String]') {
              for (var j = 0; j < arguments[i].length; j++) {
                  // create a numeric hash for each argument, add to seedling
                  var hash = 0;
                  for (var k = 0; k < arguments[i].length; k++) {
                      hash = arguments[i].charCodeAt(k) + (hash << 6) + (hash << 16) - hash;
                  }
                  seedling += hash;
              }
          } else {
              seedling = arguments[i];
          }
          this.seed += (arguments.length - i) * seedling;
      }

      // If no generator function was provided, use our MT
      this.mt = this.mersenne_twister(this.seed);
      this.bimd5 = this.blueimp_md5();
      this.random = function () {
          return this.mt.random(this.seed);
      };

      return this;
  }

  Chance.prototype.VERSION = "1.0.16";

  // Random helper functions
  function initOptions(options, defaults) {
      options = options || {};

      if (defaults) {
          for (var i in defaults) {
              if (typeof options[i] === 'undefined') {
                  options[i] = defaults[i];
              }
          }
      }

      return options;
  }

  function range(size) {
      return Array.apply(null, Array(size)).map(function (_, i) {return i;});
  }

  function testRange(test, errorMessage) {
      if (test) {
          throw new RangeError(errorMessage);
      }
  }

  /**
   * Encode the input string with Base64.
   */
  var base64 = function() {
      throw new Error('No Base64 encoder available.');
  };

  // Select proper Base64 encoder.
  (function determineBase64Encoder() {
      if (typeof btoa === 'function') {
          base64 = btoa;
      } else if (typeof Buffer === 'function') {
          base64 = function(input) {
              return new Buffer(input).toString('base64');
          };
      }
  })();

  // -- Basics --

  /**
   *  Return a random bool, either true or false
   *
   *  @param {Object} [options={ likelihood: 50 }] alter the likelihood of
   *    receiving a true or false value back.
   *  @throws {RangeError} if the likelihood is out of bounds
   *  @returns {Bool} either true or false
   */
  Chance.prototype.bool = function (options) {
      // likelihood of success (true)
      options = initOptions(options, {likelihood : 50});

      // Note, we could get some minor perf optimizations by checking range
      // prior to initializing defaults, but that makes code a bit messier
      // and the check more complicated as we have to check existence of
      // the object then existence of the key before checking constraints.
      // Since the options initialization should be minor computationally,
      // decision made for code cleanliness intentionally. This is mentioned
      // here as it's the first occurrence, will not be mentioned again.
      testRange(
          options.likelihood < 0 || options.likelihood > 100,
          "Chance: Likelihood accepts values from 0 to 100."
      );

      return this.random() * 100 < options.likelihood;
  };

  Chance.prototype.animal = function (options){
    //returns a random animal
    options = initOptions(options);

    if(typeof options.type !== 'undefined'){
      //if user does not put in a valid animal type, user will get an error
      testRange(
         !this.get("animals")[options.type.toLowerCase()],
         "Please pick from desert, ocean, grassland, forest, zoo, pets, farm."
       );
       //if user does put in valid animal type, will return a random animal of that type
        return this.pick(this.get("animals")[options.type.toLowerCase()]);
    }
     //if user does not put in any animal type, will return a random animal regardless
    animalTypeArray = ["desert","forest","ocean","zoo","farm","pet","grassland"];
    return this.pick(this.get("animals")[this.pick(animalTypeArray)]);
  };

  /**
   *  Return a random character.
   *
   *  @param {Object} [options={}] can specify a character pool, only alpha,
   *    only symbols, and casing (lower or upper)
   *  @returns {String} a single random character
   *  @throws {RangeError} Can only specify alpha or symbols, not both
   */
  Chance.prototype.character = function (options) {
      options = initOptions(options);
      testRange(
          options.alpha && options.symbols,
          "Chance: Cannot specify both alpha and symbols."
      );

      var symbols = "!@#$%^&*()[]",
          letters, pool;

      if (options.casing === 'lower') {
          letters = CHARS_LOWER;
      } else if (options.casing === 'upper') {
          letters = CHARS_UPPER;
      } else {
          letters = CHARS_LOWER + CHARS_UPPER;
      }

      if (options.pool) {
          pool = options.pool;
      } else if (options.alpha) {
          pool = letters;
      } else if (options.symbols) {
          pool = symbols;
      } else {
          pool = letters + NUMBERS + symbols;
      }

      return pool.charAt(this.natural({max: (pool.length - 1)}));
  };

  // Note, wanted to use "float" or "double" but those are both JS reserved words.

  // Note, fixed means N OR LESS digits after the decimal. This because
  // It could be 14.9000 but in JavaScript, when this is cast as a number,
  // the trailing zeroes are dropped. Left to the consumer if trailing zeroes are
  // needed
  /**
   *  Return a random floating point number
   *
   *  @param {Object} [options={}] can specify a fixed precision, min, max
   *  @returns {Number} a single floating point number
   *  @throws {RangeError} Can only specify fixed or precision, not both. Also
   *    min cannot be greater than max
   */
  Chance.prototype.floating = function (options) {
      options = initOptions(options, {fixed : 4});
      testRange(
          options.fixed && options.precision,
          "Chance: Cannot specify both fixed and precision."
      );

      var num;
      var fixed = Math.pow(10, options.fixed);

      var max = MAX_INT / fixed;
      var min = -max;

      testRange(
          options.min && options.fixed && options.min < min,
          "Chance: Min specified is out of range with fixed. Min should be, at least, " + min
      );
      testRange(
          options.max && options.fixed && options.max > max,
          "Chance: Max specified is out of range with fixed. Max should be, at most, " + max
      );

      options = initOptions(options, { min : min, max : max });

      // Todo - Make this work!
      // options.precision = (typeof options.precision !== "undefined") ? options.precision : false;

      num = this.integer({min: options.min * fixed, max: options.max * fixed});
      var num_fixed = (num / fixed).toFixed(options.fixed);

      return parseFloat(num_fixed);
  };

  /**
   *  Return a random integer
   *
   *  NOTE the max and min are INCLUDED in the range. So:
   *  chance.integer({min: 1, max: 3});
   *  would return either 1, 2, or 3.
   *
   *  @param {Object} [options={}] can specify a min and/or max
   *  @returns {Number} a single random integer number
   *  @throws {RangeError} min cannot be greater than max
   */
  Chance.prototype.integer = function (options) {
      // 9007199254740992 (2^53) is the max integer number in JavaScript
      // See: http://vq.io/132sa2j
      options = initOptions(options, {min: MIN_INT, max: MAX_INT});
      testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

      return Math.floor(this.random() * (options.max - options.min + 1) + options.min);
  };

  /**
   *  Return a random natural
   *
   *  NOTE the max and min are INCLUDED in the range. So:
   *  chance.natural({min: 1, max: 3});
   *  would return either 1, 2, or 3.
   *
   *  @param {Object} [options={}] can specify a min and/or maxm or a numerals count.
   *  @returns {Number} a single random integer number
   *  @throws {RangeError} min cannot be greater than max
   */
  Chance.prototype.natural = function (options) {
      options = initOptions(options, {min: 0, max: MAX_INT});
      if (typeof options.numerals === 'number'){
        testRange(options.numerals < 1, "Chance: Numerals cannot be less than one.");
        options.min = Math.pow(10, options.numerals - 1);
        options.max = Math.pow(10, options.numerals) - 1;
      }
      testRange(options.min < 0, "Chance: Min cannot be less than zero.");
      return this.integer(options);
  };

  /**
   *  Return a random hex number as string
   *
   *  NOTE the max and min are INCLUDED in the range. So:
   *  chance.hex({min: '9', max: 'B'});
   *  would return either '9', 'A' or 'B'.
   *
   *  @param {Object} [options={}] can specify a min and/or max and/or casing
   *  @returns {String} a single random string hex number
   *  @throws {RangeError} min cannot be greater than max
   */
  Chance.prototype.hex = function (options) {
      options = initOptions(options, {min: 0, max: MAX_INT, casing: 'lower'});
      testRange(options.min < 0, "Chance: Min cannot be less than zero.");
  var integer = this.natural({min: options.min, max: options.max});
  if (options.casing === 'upper') {
    return integer.toString(16).toUpperCase();
  }
  return integer.toString(16);
  };

  Chance.prototype.letter = function(options) {
      options = initOptions(options, {casing: 'lower'});
      var pool = "abcdefghijklmnopqrstuvwxyz";
      var letter = this.character({pool: pool});
      if (options.casing === 'upper') {
          letter = letter.toUpperCase();
      }
      return letter;
  }

  /**
   *  Return a random string
   *
   *  @param {Object} [options={}] can specify a length
   *  @returns {String} a string of random length
   *  @throws {RangeError} length cannot be less than zero
   */
  Chance.prototype.string = function (options) {
      options = initOptions(options, { length: this.natural({min: 5, max: 20}) });
      testRange(options.length < 0, "Chance: Length cannot be less than zero.");
      var length = options.length,
          text = this.n(this.character, length, options);

      return text.join("");
  };

  /**
   *  Return a random buffer
   *
   *  @param {Object} [options={}] can specify a length
   *  @returns {Buffer} a buffer of random length
   *  @throws {RangeError} length cannot be less than zero
   */
  Chance.prototype.buffer = function (options) {
      if (typeof Buffer === 'undefined') {
          throw new UnsupportedError('Sorry, the buffer() function is not supported on your platform');
      }
      options = initOptions(options, { length: this.natural({min: 5, max: 20}) });
      testRange(options.length < 0, "Chance: Length cannot be less than zero.");
      var length = options.length;
      var content = this.n(this.character, length, options);

      return Buffer.from(content);
  };

  // -- End Basics --

  // -- Helpers --

  Chance.prototype.capitalize = function (word) {
      return word.charAt(0).toUpperCase() + word.substr(1);
  };

  Chance.prototype.mixin = function (obj) {
      for (var func_name in obj) {
          Chance.prototype[func_name] = obj[func_name];
      }
      return this;
  };

  /**
   *  Given a function that generates something random and a number of items to generate,
   *    return an array of items where none repeat.
   *
   *  @param {Function} fn the function that generates something random
   *  @param {Number} num number of terms to generate
   *  @param {Object} options any options to pass on to the generator function
   *  @returns {Array} an array of length `num` with every item generated by `fn` and unique
   *
   *  There can be more parameters after these. All additional parameters are provided to the given function
   */
  Chance.prototype.unique = function(fn, num, options) {
      testRange(
          typeof fn !== "function",
          "Chance: The first argument must be a function."
      );

      var comparator = function(arr, val) { return arr.indexOf(val) !== -1; };

      if (options) {
          comparator = options.comparator || comparator;
      }

      var arr = [], count = 0, result, MAX_DUPLICATES = num * 50, params = slice.call(arguments, 2);

      while (arr.length < num) {
          var clonedParams = JSON.parse(JSON.stringify(params));
          result = fn.apply(this, clonedParams);
          if (!comparator(arr, result)) {
              arr.push(result);
              // reset count when unique found
              count = 0;
          }

          if (++count > MAX_DUPLICATES) {
              throw new RangeError("Chance: num is likely too large for sample set");
          }
      }
      return arr;
  };

  /**
   *  Gives an array of n random terms
   *
   *  @param {Function} fn the function that generates something random
   *  @param {Number} n number of terms to generate
   *  @returns {Array} an array of length `n` with items generated by `fn`
   *
   *  There can be more parameters after these. All additional parameters are provided to the given function
   */
  Chance.prototype.n = function(fn, n) {
      testRange(
          typeof fn !== "function",
          "Chance: The first argument must be a function."
      );

      if (typeof n === 'undefined') {
          n = 1;
      }
      var i = n, arr = [], params = slice.call(arguments, 2);

      // Providing a negative count should result in a noop.
      i = Math.max( 0, i );

      for (null; i--; null) {
          arr.push(fn.apply(this, params));
      }

      return arr;
  };

  // H/T to SO for this one: http://vq.io/OtUrZ5
  Chance.prototype.pad = function (number, width, pad) {
      // Default pad to 0 if none provided
      pad = pad || '0';
      // Convert number to a string
      number = number + '';
      return number.length >= width ? number : new Array(width - number.length + 1).join(pad) + number;
  };

  // DEPRECATED on 2015-10-01
  Chance.prototype.pick = function (arr, count) {
      if (arr.length === 0) {
          throw new RangeError("Chance: Cannot pick() from an empty array");
      }
      if (!count || count === 1) {
          return arr[this.natural({max: arr.length - 1})];
      } else {
          return this.shuffle(arr).slice(0, count);
      }
  };

  // Given an array, returns a single random element
  Chance.prototype.pickone = function (arr) {
      if (arr.length === 0) {
        throw new RangeError("Chance: Cannot pickone() from an empty array");
      }
      return arr[this.natural({max: arr.length - 1})];
  };

  // Given an array, returns a random set with 'count' elements
  Chance.prototype.pickset = function (arr, count) {
      if (count === 0) {
          return [];
      }
      if (arr.length === 0) {
          throw new RangeError("Chance: Cannot pickset() from an empty array");
      }
      if (count < 0) {
          throw new RangeError("Chance: Count must be a positive number");
      }
      if (!count || count === 1) {
          return [ this.pickone(arr) ];
      } else {
          return this.shuffle(arr).slice(0, count);
      }
  };

  Chance.prototype.shuffle = function (arr) {
      var new_array = [],
          j = 0,
          length = Number(arr.length),
          source_indexes = range(length),
          last_source_index = length - 1,
          selected_source_index;

      for (var i = 0; i < length; i++) {
          // Pick a random index from the array
          selected_source_index = this.natural({max: last_source_index});
          j = source_indexes[selected_source_index];

          // Add it to the new array
          new_array[i] = arr[j];

          // Mark the source index as used
          source_indexes[selected_source_index] = source_indexes[last_source_index];
          last_source_index -= 1;
      }

      return new_array;
  };

  // Returns a single item from an array with relative weighting of odds
  Chance.prototype.weighted = function (arr, weights, trim) {
      if (arr.length !== weights.length) {
          throw new RangeError("Chance: Length of array and weights must match");
      }

      // scan weights array and sum valid entries
      var sum = 0;
      var val;
      for (var weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
          val = weights[weightIndex];
          if (isNaN(val)) {
              throw new RangeError("Chance: All weights must be numbers");
          }

          if (val > 0) {
              sum += val;
          }
      }

      if (sum === 0) {
          throw new RangeError("Chance: No valid entries in array weights");
      }

      // select a value within range
      var selected = this.random() * sum;

      // find array entry corresponding to selected value
      var total = 0;
      var lastGoodIdx = -1;
      var chosenIdx;
      for (weightIndex = 0; weightIndex < weights.length; ++weightIndex) {
          val = weights[weightIndex];
          total += val;
          if (val > 0) {
              if (selected <= total) {
                  chosenIdx = weightIndex;
                  break;
              }
              lastGoodIdx = weightIndex;
          }

          // handle any possible rounding error comparison to ensure something is picked
          if (weightIndex === (weights.length - 1)) {
              chosenIdx = lastGoodIdx;
          }
      }

      var chosen = arr[chosenIdx];
      trim = (typeof trim === 'undefined') ? false : trim;
      if (trim) {
          arr.splice(chosenIdx, 1);
          weights.splice(chosenIdx, 1);
      }

      return chosen;
  };

  // -- End Helpers --

  // -- Text --

  Chance.prototype.paragraph = function (options) {
      options = initOptions(options);

      var sentences = options.sentences || this.natural({min: 3, max: 7}),
          sentence_array = this.n(this.sentence, sentences);

      return sentence_array.join(' ');
  };

  // Could get smarter about this than generating random words and
  // chaining them together. Such as: http://vq.io/1a5ceOh
  Chance.prototype.sentence = function (options) {
      options = initOptions(options);

      var words = options.words || this.natural({min: 12, max: 18}),
          punctuation = options.punctuation,
          text, word_array = this.n(this.word, words);

      text = word_array.join(' ');

      // Capitalize first letter of sentence
      text = this.capitalize(text);

      // Make sure punctuation has a usable value
      if (punctuation !== false && !/^[\.\?;!:]$/.test(punctuation)) {
          punctuation = '.';
      }

      // Add punctuation mark
      if (punctuation) {
          text += punctuation;
      }

      return text;
  };

  Chance.prototype.syllable = function (options) {
      options = initOptions(options);

      var length = options.length || this.natural({min: 2, max: 3}),
          consonants = 'bcdfghjklmnprstvwz', // consonants except hard to speak ones
          vowels = 'aeiou', // vowels
          all = consonants + vowels, // all
          text = '',
          chr;

      // I'm sure there's a more elegant way to do this, but this works
      // decently well.
      for (var i = 0; i < length; i++) {
          if (i === 0) {
              // First character can be anything
              chr = this.character({pool: all});
          } else if (consonants.indexOf(chr) === -1) {
              // Last character was a vowel, now we want a consonant
              chr = this.character({pool: consonants});
          } else {
              // Last character was a consonant, now we want a vowel
              chr = this.character({pool: vowels});
          }

          text += chr;
      }

      if (options.capitalize) {
          text = this.capitalize(text);
      }

      return text;
  };

  Chance.prototype.word = function (options) {
      options = initOptions(options);

      testRange(
          options.syllables && options.length,
          "Chance: Cannot specify both syllables AND length."
      );

      var syllables = options.syllables || this.natural({min: 1, max: 3}),
          text = '';

      if (options.length) {
          // Either bound word by length
          do {
              text += this.syllable();
          } while (text.length < options.length);
          text = text.substring(0, options.length);
      } else {
          // Or by number of syllables
          for (var i = 0; i < syllables; i++) {
              text += this.syllable();
          }
      }

      if (options.capitalize) {
          text = this.capitalize(text);
      }

      return text;
  };

  // -- End Text --

  // -- Person --

  Chance.prototype.age = function (options) {
      options = initOptions(options);
      var ageRange;

      switch (options.type) {
          case 'child':
              ageRange = {min: 0, max: 12};
              break;
          case 'teen':
              ageRange = {min: 13, max: 19};
              break;
          case 'adult':
              ageRange = {min: 18, max: 65};
              break;
          case 'senior':
              ageRange = {min: 65, max: 100};
              break;
          case 'all':
              ageRange = {min: 0, max: 100};
              break;
          default:
              ageRange = {min: 18, max: 65};
              break;
      }

      return this.natural(ageRange);
  };

  Chance.prototype.birthday = function (options) {
      var age = this.age(options);
      var currentYear = new Date().getFullYear();

      if (options && options.type) {
          var min = new Date();
          var max = new Date();
          min.setFullYear(currentYear - age - 1);
          max.setFullYear(currentYear - age);

          options = initOptions(options, {
              min: min,
              max: max
          });
      } else {
          options = initOptions(options, {
              year: currentYear - age
          });
      }

      return this.date(options);
  };

  // CPF; ID to identify taxpayers in Brazil
  Chance.prototype.cpf = function (options) {
      options = initOptions(options, {
          formatted: true
      });

      var n = this.n(this.natural, 9, { max: 9 });
      var d1 = n[8]*2+n[7]*3+n[6]*4+n[5]*5+n[4]*6+n[3]*7+n[2]*8+n[1]*9+n[0]*10;
      d1 = 11 - (d1 % 11);
      if (d1>=10) {
          d1 = 0;
      }
      var d2 = d1*2+n[8]*3+n[7]*4+n[6]*5+n[5]*6+n[4]*7+n[3]*8+n[2]*9+n[1]*10+n[0]*11;
      d2 = 11 - (d2 % 11);
      if (d2>=10) {
          d2 = 0;
      }
      var cpf = ''+n[0]+n[1]+n[2]+'.'+n[3]+n[4]+n[5]+'.'+n[6]+n[7]+n[8]+'-'+d1+d2;
      return options.formatted ? cpf : cpf.replace(/\D/g,'');
  };

  // CNPJ: ID to identify companies in Brazil
  Chance.prototype.cnpj = function (options) {
      options = initOptions(options, {
          formatted: true
      });

      var n = this.n(this.natural, 12, { max: 12 });
      var d1 = n[11]*2+n[10]*3+n[9]*4+n[8]*5+n[7]*6+n[6]*7+n[5]*8+n[4]*9+n[3]*2+n[2]*3+n[1]*4+n[0]*5;
      d1 = 11 - (d1 % 11);
      if (d1<2) {
          d1 = 0;
      }
      var d2 = d1*2+n[11]*3+n[10]*4+n[9]*5+n[8]*6+n[7]*7+n[6]*8+n[5]*9+n[4]*2+n[3]*3+n[2]*4+n[1]*5+n[0]*6;
      d2 = 11 - (d2 % 11);
      if (d2<2) {
          d2 = 0;
      }
      var cnpj = ''+n[0]+n[1]+'.'+n[2]+n[3]+n[4]+'.'+n[5]+n[6]+n[7]+'/'+n[8]+n[9]+n[10]+n[11]+'-'+d1+d2;
      return options.formatted ? cnpj : cnpj.replace(/\D/g,'');
  };

  Chance.prototype.first = function (options) {
      options = initOptions(options, {gender: this.gender(), nationality: 'en'});
      return this.pick(this.get("firstNames")[options.gender.toLowerCase()][options.nationality.toLowerCase()]);
  };

  Chance.prototype.profession = function (options) {
      options = initOptions(options);
      if(options.rank){
          return this.pick(['Apprentice ', 'Junior ', 'Senior ', 'Lead ']) + this.pick(this.get("profession"));
      } else{
          return this.pick(this.get("profession"));
      }
  };

  Chance.prototype.company = function (){
      return this.pick(this.get("company"));
  };

  Chance.prototype.gender = function (options) {
      options = initOptions(options, {extraGenders: []});
      return this.pick(['Male', 'Female'].concat(options.extraGenders));
  };

  Chance.prototype.last = function (options) {
    options = initOptions(options, {nationality: '*'});
    if (options.nationality === "*") {
      var allLastNames = []
      var lastNames = this.get("lastNames")
      Object.keys(lastNames).forEach(function(key, i){
        allLastNames = allLastNames.concat(lastNames[key])
      })
      return this.pick(allLastNames)
    }
    else {
      return this.pick(this.get("lastNames")[options.nationality.toLowerCase()]);
    }

  };

  Chance.prototype.israelId=function(){
      var x=this.string({pool: '0123456789',length:8});
      var y=0;
      for (var i=0;i<x.length;i++){
          var thisDigit=  x[i] *  (i/2===parseInt(i/2) ? 1 : 2);
          thisDigit=this.pad(thisDigit,2).toString();
          thisDigit=parseInt(thisDigit[0]) + parseInt(thisDigit[1]);
          y=y+thisDigit;
      }
      x=x+(10-parseInt(y.toString().slice(-1))).toString().slice(-1);
      return x;
  };

  Chance.prototype.mrz = function (options) {
      var checkDigit = function (input) {
          var alpha = "<ABCDEFGHIJKLMNOPQRSTUVWXYXZ".split(''),
              multipliers = [ 7, 3, 1 ],
              runningTotal = 0;

          if (typeof input !== 'string') {
              input = input.toString();
          }

          input.split('').forEach(function(character, idx) {
              var pos = alpha.indexOf(character);

              if(pos !== -1) {
                  character = pos === 0 ? 0 : pos + 9;
              } else {
                  character = parseInt(character, 10);
              }
              character *= multipliers[idx % multipliers.length];
              runningTotal += character;
          });
          return runningTotal % 10;
      };
      var generate = function (opts) {
          var pad = function (length) {
              return new Array(length + 1).join('<');
          };
          var number = [ 'P<',
                         opts.issuer,
                         opts.last.toUpperCase(),
                         '<<',
                         opts.first.toUpperCase(),
                         pad(39 - (opts.last.length + opts.first.length + 2)),
                         opts.passportNumber,
                         checkDigit(opts.passportNumber),
                         opts.nationality,
                         opts.dob,
                         checkDigit(opts.dob),
                         opts.gender,
                         opts.expiry,
                         checkDigit(opts.expiry),
                         pad(14),
                         checkDigit(pad(14)) ].join('');

          return number +
              (checkDigit(number.substr(44, 10) +
                          number.substr(57, 7) +
                          number.substr(65, 7)));
      };

      var that = this;

      options = initOptions(options, {
          first: this.first(),
          last: this.last(),
          passportNumber: this.integer({min: 100000000, max: 999999999}),
          dob: (function () {
              var date = that.birthday({type: 'adult'});
              return [date.getFullYear().toString().substr(2),
                      that.pad(date.getMonth() + 1, 2),
                      that.pad(date.getDate(), 2)].join('');
          }()),
          expiry: (function () {
              var date = new Date();
              return [(date.getFullYear() + 5).toString().substr(2),
                      that.pad(date.getMonth() + 1, 2),
                      that.pad(date.getDate(), 2)].join('');
          }()),
          gender: this.gender() === 'Female' ? 'F': 'M',
          issuer: 'GBR',
          nationality: 'GBR'
      });
      return generate (options);
  };

  Chance.prototype.name = function (options) {
      options = initOptions(options);

      var first = this.first(options),
          last = this.last(options),
          name;

      if (options.middle) {
          name = first + ' ' + this.first(options) + ' ' + last;
      } else if (options.middle_initial) {
          name = first + ' ' + this.character({alpha: true, casing: 'upper'}) + '. ' + last;
      } else {
          name = first + ' ' + last;
      }

      if (options.prefix) {
          name = this.prefix(options) + ' ' + name;
      }

      if (options.suffix) {
          name = name + ' ' + this.suffix(options);
      }

      return name;
  };

  // Return the list of available name prefixes based on supplied gender.
  // @todo introduce internationalization
  Chance.prototype.name_prefixes = function (gender) {
      gender = gender || "all";
      gender = gender.toLowerCase();

      var prefixes = [
          { name: 'Doctor', abbreviation: 'Dr.' }
      ];

      if (gender === "male" || gender === "all") {
          prefixes.push({ name: 'Mister', abbreviation: 'Mr.' });
      }

      if (gender === "female" || gender === "all") {
          prefixes.push({ name: 'Miss', abbreviation: 'Miss' });
          prefixes.push({ name: 'Misses', abbreviation: 'Mrs.' });
      }

      return prefixes;
  };

  // Alias for name_prefix
  Chance.prototype.prefix = function (options) {
      return this.name_prefix(options);
  };

  Chance.prototype.name_prefix = function (options) {
      options = initOptions(options, { gender: "all" });
      return options.full ?
          this.pick(this.name_prefixes(options.gender)).name :
          this.pick(this.name_prefixes(options.gender)).abbreviation;
  };
  //Hungarian ID number
  Chance.prototype.HIDN= function(){
   //Hungarian ID nuber structure: XXXXXXYY (X=number,Y=Capital Latin letter)
    var idn_pool="0123456789";
    var idn_chrs="ABCDEFGHIJKLMNOPQRSTUVWXYXZ";
    var idn="";
      idn+=this.string({pool:idn_pool,length:6});
      idn+=this.string({pool:idn_chrs,length:2});
      return idn;
  };


  Chance.prototype.ssn = function (options) {
      options = initOptions(options, {ssnFour: false, dashes: true});
      var ssn_pool = "1234567890",
          ssn,
          dash = options.dashes ? '-' : '';

      if(!options.ssnFour) {
          ssn = this.string({pool: ssn_pool, length: 3}) + dash +
          this.string({pool: ssn_pool, length: 2}) + dash +
          this.string({pool: ssn_pool, length: 4});
      } else {
          ssn = this.string({pool: ssn_pool, length: 4});
      }
      return ssn;
  };

  // Aadhar is similar to ssn, used in India to uniquely identify a person
  Chance.prototype.aadhar = function (options) {
      options = initOptions(options, {onlyLastFour: false, separatedByWhiteSpace: true});
      var aadhar_pool = "1234567890",
          aadhar,
          whiteSpace = options.separatedByWhiteSpace ? ' ' : '';

      if(!options.onlyLastFour) {
          aadhar = this.string({pool: aadhar_pool, length: 4}) + whiteSpace +
          this.string({pool: aadhar_pool, length: 4}) + whiteSpace +
          this.string({pool: aadhar_pool, length: 4});
      } else {
          aadhar = this.string({pool: aadhar_pool, length: 4});
      }
      return aadhar;
  };

  // Return the list of available name suffixes
  // @todo introduce internationalization
  Chance.prototype.name_suffixes = function () {
      var suffixes = [
          { name: 'Doctor of Osteopathic Medicine', abbreviation: 'D.O.' },
          { name: 'Doctor of Philosophy', abbreviation: 'Ph.D.' },
          { name: 'Esquire', abbreviation: 'Esq.' },
          { name: 'Junior', abbreviation: 'Jr.' },
          { name: 'Juris Doctor', abbreviation: 'J.D.' },
          { name: 'Master of Arts', abbreviation: 'M.A.' },
          { name: 'Master of Business Administration', abbreviation: 'M.B.A.' },
          { name: 'Master of Science', abbreviation: 'M.S.' },
          { name: 'Medical Doctor', abbreviation: 'M.D.' },
          { name: 'Senior', abbreviation: 'Sr.' },
          { name: 'The Third', abbreviation: 'III' },
          { name: 'The Fourth', abbreviation: 'IV' },
          { name: 'Bachelor of Engineering', abbreviation: 'B.E' },
          { name: 'Bachelor of Technology', abbreviation: 'B.TECH' }
      ];
      return suffixes;
  };

  // Alias for name_suffix
  Chance.prototype.suffix = function (options) {
      return this.name_suffix(options);
  };

  Chance.prototype.name_suffix = function (options) {
      options = initOptions(options);
      return options.full ?
          this.pick(this.name_suffixes()).name :
          this.pick(this.name_suffixes()).abbreviation;
  };

  Chance.prototype.nationalities = function () {
      return this.get("nationalities");
  };

  // Generate random nationality based on json list
  Chance.prototype.nationality = function () {
      var nationality = this.pick(this.nationalities());
      return nationality.name;
  };

  // -- End Person --

  // -- Mobile --
  // Android GCM Registration ID
  Chance.prototype.android_id = function () {
      return "APA91" + this.string({ pool: "0123456789abcefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-_", length: 178 });
  };

  // Apple Push Token
  Chance.prototype.apple_token = function () {
      return this.string({ pool: "abcdef1234567890", length: 64 });
  };

  // Windows Phone 8 ANID2
  Chance.prototype.wp8_anid2 = function () {
      return base64( this.hash( { length : 32 } ) );
  };

  // Windows Phone 7 ANID
  Chance.prototype.wp7_anid = function () {
      return 'A=' + this.guid().replace(/-/g, '').toUpperCase() + '&E=' + this.hash({ length:3 }) + '&W=' + this.integer({ min:0, max:9 });
  };

  // BlackBerry Device PIN
  Chance.prototype.bb_pin = function () {
      return this.hash({ length: 8 });
  };

  // -- End Mobile --

  // -- Web --
  Chance.prototype.avatar = function (options) {
      var url = null;
      var URL_BASE = '//www.gravatar.com/avatar/';
      var PROTOCOLS = {
          http: 'http',
          https: 'https'
      };
      var FILE_TYPES = {
          bmp: 'bmp',
          gif: 'gif',
          jpg: 'jpg',
          png: 'png'
      };
      var FALLBACKS = {
          '404': '404', // Return 404 if not found
          mm: 'mm', // Mystery man
          identicon: 'identicon', // Geometric pattern based on hash
          monsterid: 'monsterid', // A generated monster icon
          wavatar: 'wavatar', // A generated face
          retro: 'retro', // 8-bit icon
          blank: 'blank' // A transparent png
      };
      var RATINGS = {
          g: 'g',
          pg: 'pg',
          r: 'r',
          x: 'x'
      };
      var opts = {
          protocol: null,
          email: null,
          fileExtension: null,
          size: null,
          fallback: null,
          rating: null
      };

      if (!options) {
          // Set to a random email
          opts.email = this.email();
          options = {};
      }
      else if (typeof options === 'string') {
          opts.email = options;
          options = {};
      }
      else if (typeof options !== 'object') {
          return null;
      }
      else if (options.constructor === 'Array') {
          return null;
      }

      opts = initOptions(options, opts);

      if (!opts.email) {
          // Set to a random email
          opts.email = this.email();
      }

      // Safe checking for params
      opts.protocol = PROTOCOLS[opts.protocol] ? opts.protocol + ':' : '';
      opts.size = parseInt(opts.size, 0) ? opts.size : '';
      opts.rating = RATINGS[opts.rating] ? opts.rating : '';
      opts.fallback = FALLBACKS[opts.fallback] ? opts.fallback : '';
      opts.fileExtension = FILE_TYPES[opts.fileExtension] ? opts.fileExtension : '';

      url =
          opts.protocol +
          URL_BASE +
          this.bimd5.md5(opts.email) +
          (opts.fileExtension ? '.' + opts.fileExtension : '') +
          (opts.size || opts.rating || opts.fallback ? '?' : '') +
          (opts.size ? '&s=' + opts.size.toString() : '') +
          (opts.rating ? '&r=' + opts.rating : '') +
          (opts.fallback ? '&d=' + opts.fallback : '')
          ;

      return url;
  };

  /**
   * #Description:
   * ===============================================
   * Generate random color value base on color type:
   * -> hex
   * -> rgb
   * -> rgba
   * -> 0x
   * -> named color
   *
   * #Examples:
   * ===============================================
   * * Geerate random hex color
   * chance.color() => '#79c157' / 'rgb(110,52,164)' / '0x67ae0b' / '#e2e2e2' / '#29CFA7'
   *
   * * Generate Hex based color value
   * chance.color({format: 'hex'})    => '#d67118'
   *
   * * Generate simple rgb value
   * chance.color({format: 'rgb'})    => 'rgb(110,52,164)'
   *
   * * Generate Ox based color value
   * chance.color({format: '0x'})     => '0x67ae0b'
   *
   * * Generate graiscale based value
   * chance.color({grayscale: true})  => '#e2e2e2'
   *
   * * Return valide color name
   * chance.color({format: 'name'})   => 'red'
   *
   * * Make color uppercase
   * chance.color({casing: 'upper'})  => '#29CFA7'
   *
   * * Min Max values for RGBA
   * var light_red = chance.color({format: 'hex', min_red: 200, max_red: 255, max_green: 0, max_blue: 0, min_alpha: .2, max_alpha: .3});
   *
   * @param  [object] options
   * @return [string] color value
   */
  Chance.prototype.color = function (options) {
      function gray(value, delimiter) {
          return [value, value, value].join(delimiter || '');
      }

      function rgb(hasAlpha) {
          var rgbValue     = (hasAlpha)    ? 'rgba' : 'rgb';
          var alphaChannel = (hasAlpha)    ? (',' + this.floating({min:min_alpha, max:max_alpha})) : "";
          var colorValue   = (isGrayscale) ? (gray(this.natural({min: min_rgb, max: max_rgb}), ',')) : (this.natural({min: min_green, max: max_green}) + ',' + this.natural({min: min_blue, max: max_blue}) + ',' + this.natural({max: 255}));
          return rgbValue + '(' + colorValue + alphaChannel + ')';
      }

      function hex(start, end, withHash) {
          var symbol = (withHash) ? "#" : "";
          var hexstring = "";

          if (isGrayscale) {
              hexstring = gray(this.pad(this.hex({min: min_rgb, max: max_rgb}), 2));
              if (options.format === "shorthex") {
                  hexstring = gray(this.hex({min: 0, max: 15}));
              }
          }
          else {
              if (options.format === "shorthex") {
                  hexstring = this.pad(this.hex({min: Math.floor(min_red / 16), max: Math.floor(max_red / 16)}), 1) + this.pad(this.hex({min: Math.floor(min_green / 16), max: Math.floor(max_green / 16)}), 1) + this.pad(this.hex({min: Math.floor(min_blue / 16), max: Math.floor(max_blue / 16)}), 1);
              }
              else if (min_red !== undefined || max_red !== undefined || min_green !== undefined || max_green !== undefined || min_blue !== undefined || max_blue !== undefined) {
                  hexstring = this.pad(this.hex({min: min_red, max: max_red}), 2) + this.pad(this.hex({min: min_green, max: max_green}), 2) + this.pad(this.hex({min: min_blue, max: max_blue}), 2);
              }
              else {
                  hexstring = this.pad(this.hex({min: min_rgb, max: max_rgb}), 2) + this.pad(this.hex({min: min_rgb, max: max_rgb}), 2) + this.pad(this.hex({min: min_rgb, max: max_rgb}), 2);
              }
          }

          return symbol + hexstring;
      }

      options = initOptions(options, {
          format: this.pick(['hex', 'shorthex', 'rgb', 'rgba', '0x', 'name']),
          grayscale: false,
          casing: 'lower',
          min: 0,
          max: 255,
          min_red: undefined,
          max_red: undefined,
          min_green: undefined,
          max_green: undefined,
          min_blue: undefined,
          max_blue: undefined,
          min_alpha: 0,
          max_alpha: 1
      });

      var isGrayscale = options.grayscale;
      var min_rgb = options.min;
      var max_rgb = options.max;
      var min_red = options.min_red;
      var max_red = options.max_red;
      var min_green = options.min_green;
      var max_green = options.max_green;
      var min_blue = options.min_blue;
      var max_blue = options.max_blue;
      var min_alpha = options.min_alpha;
      var max_alpha = options.max_alpha;
      if (options.min_red === undefined) { min_red = min_rgb; }
      if (options.max_red === undefined) { max_red = max_rgb; }
      if (options.min_green === undefined) { min_green = min_rgb; }
      if (options.max_green === undefined) { max_green = max_rgb; }
      if (options.min_blue === undefined) { min_blue = min_rgb; }
      if (options.max_blue === undefined) { max_blue = max_rgb; }
      if (options.min_alpha === undefined) { min_alpha = 0; }
      if (options.max_alpha === undefined) { max_alpha = 1; }
      if (isGrayscale && min_rgb === 0 && max_rgb === 255 && min_red !== undefined && max_red !== undefined) {
          min_rgb = ((min_red + min_green + min_blue) / 3);
          max_rgb = ((max_red + max_green + max_blue) / 3);
      }
      var colorValue;

      if (options.format === 'hex') {
          colorValue = hex.call(this, 2, 6, true);
      }
      else if (options.format === 'shorthex') {
          colorValue = hex.call(this, 1, 3, true);
      }
      else if (options.format === 'rgb') {
          colorValue = rgb.call(this, false);
      }
      else if (options.format === 'rgba') {
          colorValue = rgb.call(this, true);
      }
      else if (options.format === '0x') {
          colorValue = '0x' + hex.call(this, 2, 6);
      }
      else if(options.format === 'name') {
          return this.pick(this.get("colorNames"));
      }
      else {
          throw new RangeError('Invalid format provided. Please provide one of "hex", "shorthex", "rgb", "rgba", "0x" or "name".');
      }

      if (options.casing === 'upper' ) {
          colorValue = colorValue.toUpperCase();
      }

      return colorValue;
  };

  Chance.prototype.domain = function (options) {
      options = initOptions(options);
      return this.word() + '.' + (options.tld || this.tld());
  };

  Chance.prototype.email = function (options) {
      options = initOptions(options);
      return this.word({length: options.length}) + '@' + (options.domain || this.domain());
  };

  /**
   * #Description:
   * ===============================================
   * Generate a random Facebook id, aka fbid.
   *
   * NOTE: At the moment (Sep 2017), Facebook ids are
   * "numeric strings" of length 16.
   * However, Facebook Graph API documentation states that
   * "it is extremely likely to change over time".
   * @see https://developers.facebook.com/docs/graph-api/overview/
   *
   * #Examples:
   * ===============================================
   * chance.fbid() => '1000035231661304'
   *
   * @return [string] facebook id
   */
  Chance.prototype.fbid = function () {
      return '10000' + this.string({pool: "1234567890", length: 11});
  };

  Chance.prototype.google_analytics = function () {
      var account = this.pad(this.natural({max: 999999}), 6);
      var property = this.pad(this.natural({max: 99}), 2);

      return 'UA-' + account + '-' + property;
  };

  Chance.prototype.hashtag = function () {
      return '#' + this.word();
  };

  Chance.prototype.ip = function () {
      // Todo: This could return some reserved IPs. See http://vq.io/137dgYy
      // this should probably be updated to account for that rare as it may be
      return this.natural({min: 1, max: 254}) + '.' +
             this.natural({max: 255}) + '.' +
             this.natural({max: 255}) + '.' +
             this.natural({min: 1, max: 254});
  };

  Chance.prototype.ipv6 = function () {
      var ip_addr = this.n(this.hash, 8, {length: 4});

      return ip_addr.join(":");
  };

  Chance.prototype.klout = function () {
      return this.natural({min: 1, max: 99});
  };

  Chance.prototype.semver = function (options) {
      options = initOptions(options, { include_prerelease: true });

      var range = this.pickone(["^", "~", "<", ">", "<=", ">=", "="]);
      if (options.range) {
          range = options.range;
      }

      var prerelease = "";
      if (options.include_prerelease) {
          prerelease = this.weighted(["", "-dev", "-beta", "-alpha"], [50, 10, 5, 1]);
      }
      return range + this.rpg('3d10').join('.') + prerelease;
  };

  Chance.prototype.tlds = function () {
      return ['com', 'org', 'edu', 'gov', 'co.uk', 'net', 'io', 'ac', 'ad', 'ae', 'af', 'ag', 'ai', 'al', 'am', 'an', 'ao', 'aq', 'ar', 'as', 'at', 'au', 'aw', 'ax', 'az', 'ba', 'bb', 'bd', 'be', 'bf', 'bg', 'bh', 'bi', 'bj', 'bm', 'bn', 'bo', 'bq', 'br', 'bs', 'bt', 'bv', 'bw', 'by', 'bz', 'ca', 'cc', 'cd', 'cf', 'cg', 'ch', 'ci', 'ck', 'cl', 'cm', 'cn', 'co', 'cr', 'cu', 'cv', 'cw', 'cx', 'cy', 'cz', 'de', 'dj', 'dk', 'dm', 'do', 'dz', 'ec', 'ee', 'eg', 'eh', 'er', 'es', 'et', 'eu', 'fi', 'fj', 'fk', 'fm', 'fo', 'fr', 'ga', 'gb', 'gd', 'ge', 'gf', 'gg', 'gh', 'gi', 'gl', 'gm', 'gn', 'gp', 'gq', 'gr', 'gs', 'gt', 'gu', 'gw', 'gy', 'hk', 'hm', 'hn', 'hr', 'ht', 'hu', 'id', 'ie', 'il', 'im', 'in', 'io', 'iq', 'ir', 'is', 'it', 'je', 'jm', 'jo', 'jp', 'ke', 'kg', 'kh', 'ki', 'km', 'kn', 'kp', 'kr', 'kw', 'ky', 'kz', 'la', 'lb', 'lc', 'li', 'lk', 'lr', 'ls', 'lt', 'lu', 'lv', 'ly', 'ma', 'mc', 'md', 'me', 'mg', 'mh', 'mk', 'ml', 'mm', 'mn', 'mo', 'mp', 'mq', 'mr', 'ms', 'mt', 'mu', 'mv', 'mw', 'mx', 'my', 'mz', 'na', 'nc', 'ne', 'nf', 'ng', 'ni', 'nl', 'no', 'np', 'nr', 'nu', 'nz', 'om', 'pa', 'pe', 'pf', 'pg', 'ph', 'pk', 'pl', 'pm', 'pn', 'pr', 'ps', 'pt', 'pw', 'py', 'qa', 're', 'ro', 'rs', 'ru', 'rw', 'sa', 'sb', 'sc', 'sd', 'se', 'sg', 'sh', 'si', 'sj', 'sk', 'sl', 'sm', 'sn', 'so', 'sr', 'ss', 'st', 'su', 'sv', 'sx', 'sy', 'sz', 'tc', 'td', 'tf', 'tg', 'th', 'tj', 'tk', 'tl', 'tm', 'tn', 'to', 'tp', 'tr', 'tt', 'tv', 'tw', 'tz', 'ua', 'ug', 'uk', 'us', 'uy', 'uz', 'va', 'vc', 've', 'vg', 'vi', 'vn', 'vu', 'wf', 'ws', 'ye', 'yt', 'za', 'zm', 'zw'];
  };

  Chance.prototype.tld = function () {
      return this.pick(this.tlds());
  };

  Chance.prototype.twitter = function () {
      return '@' + this.word();
  };

  Chance.prototype.url = function (options) {
      options = initOptions(options, { protocol: "http", domain: this.domain(options), domain_prefix: "", path: this.word(), extensions: []});

      var extension = options.extensions.length > 0 ? "." + this.pick(options.extensions) : "";
      var domain = options.domain_prefix ? options.domain_prefix + "." + options.domain : options.domain;

      return options.protocol + "://" + domain + "/" + options.path + extension;
  };

  Chance.prototype.port = function() {
      return this.integer({min: 0, max: 65535});
  };

  Chance.prototype.locale = function (options) {
      options = initOptions(options);
      if (options.region){
        return this.pick(this.get("locale_regions"));
      } else {
        return this.pick(this.get("locale_languages"));
      }
  };

  Chance.prototype.locales = function (options) {
    options = initOptions(options);
    if (options.region){
      return this.get("locale_regions");
    } else {
      return this.get("locale_languages");
    }
  };

  Chance.prototype.loremPicsum = function (options) {
      options = initOptions(options, { width: 500, height: 500, greyscale: false, blurred: false });

      var greyscale = options.greyscale ? 'g/' : '';
      var query = options.blurred ? '/?blur' : '/?random';

      return 'https://picsum.photos/' + greyscale + options.width + '/' + options.height + query;
  }

  // -- End Web --

  // -- Location --

  Chance.prototype.address = function (options) {
      options = initOptions(options);
      return this.natural({min: 5, max: 2000}) + ' ' + this.street(options);
  };

  Chance.prototype.altitude = function (options) {
      options = initOptions(options, {fixed: 5, min: 0, max: 8848});
      return this.floating({
          min: options.min,
          max: options.max,
          fixed: options.fixed
      });
  };

  Chance.prototype.areacode = function (options) {
      options = initOptions(options, {parens : true});
      // Don't want area codes to start with 1, or have a 9 as the second digit
      var areacode = this.natural({min: 2, max: 9}).toString() +
              this.natural({min: 0, max: 8}).toString() +
              this.natural({min: 0, max: 9}).toString();

      return options.parens ? '(' + areacode + ')' : areacode;
  };

  Chance.prototype.city = function () {
      return this.capitalize(this.word({syllables: 3}));
  };

  Chance.prototype.coordinates = function (options) {
      return this.latitude(options) + ', ' + this.longitude(options);
  };

  Chance.prototype.countries = function () {
      return this.get("countries");
  };

  Chance.prototype.country = function (options) {
      options = initOptions(options);
      var country = this.pick(this.countries());
      return options.raw ? country : options.full ? country.name : country.abbreviation;
  };

  Chance.prototype.depth = function (options) {
      options = initOptions(options, {fixed: 5, min: -10994, max: 0});
      return this.floating({
          min: options.min,
          max: options.max,
          fixed: options.fixed
      });
  };

  Chance.prototype.geohash = function (options) {
      options = initOptions(options, { length: 7 });
      return this.string({ length: options.length, pool: '0123456789bcdefghjkmnpqrstuvwxyz' });
  };

  Chance.prototype.geojson = function (options) {
      return this.latitude(options) + ', ' + this.longitude(options) + ', ' + this.altitude(options);
  };

  Chance.prototype.latitude = function (options) {
      options = initOptions(options, {fixed: 5, min: -90, max: 90});
      return this.floating({min: options.min, max: options.max, fixed: options.fixed});
  };

  Chance.prototype.longitude = function (options) {
      options = initOptions(options, {fixed: 5, min: -180, max: 180});
      return this.floating({min: options.min, max: options.max, fixed: options.fixed});
  };

  Chance.prototype.phone = function (options) {
      var self = this,
          numPick,
          ukNum = function (parts) {
              var section = [];
              //fills the section part of the phone number with random numbers.
              parts.sections.forEach(function(n) {
                  section.push(self.string({ pool: '0123456789', length: n}));
              });
              return parts.area + section.join(' ');
          };
      options = initOptions(options, {
          formatted: true,
          country: 'us',
          mobile: false
      });
      if (!options.formatted) {
          options.parens = false;
      }
      var phone;
      switch (options.country) {
          case 'fr':
              if (!options.mobile) {
                  numPick = this.pick([
                      // Valid zone and département codes.
                      '01' + this.pick(['30', '34', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '53', '55', '56', '58', '60', '64', '69', '70', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83']) + self.string({ pool: '0123456789', length: 6}),
                      '02' + this.pick(['14', '18', '22', '23', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '40', '41', '43', '44', '45', '46', '47', '48', '49', '50', '51', '52', '53', '54', '56', '57', '61', '62', '69', '72', '76', '77', '78', '85', '90', '96', '97', '98', '99']) + self.string({ pool: '0123456789', length: 6}),
                      '03' + this.pick(['10', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '39', '44', '45', '51', '52', '54', '55', '57', '58', '59', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '70', '71', '72', '73', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '90']) + self.string({ pool: '0123456789', length: 6}),
                      '04' + this.pick(['11', '13', '15', '20', '22', '26', '27', '30', '32', '34', '37', '42', '43', '44', '50', '56', '57', '63', '66', '67', '68', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '80', '81', '82', '83', '84', '85', '86', '88', '89', '90', '91', '92', '93', '94', '95', '97', '98']) + self.string({ pool: '0123456789', length: 6}),
                      '05' + this.pick(['08', '16', '17', '19', '24', '31', '32', '33', '34', '35', '40', '45', '46', '47', '49', '53', '55', '56', '57', '58', '59', '61', '62', '63', '64', '65', '67', '79', '81', '82', '86', '87', '90', '94']) + self.string({ pool: '0123456789', length: 6}),
                      '09' + self.string({ pool: '0123456789', length: 8}),
                  ]);
                  phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
              } else {
                  numPick = this.pick(['06', '07']) + self.string({ pool: '0123456789', length: 8});
                  phone = options.formatted ? numPick.match(/../g).join(' ') : numPick;
              }
              break;
          case 'uk':
              if (!options.mobile) {
                  numPick = this.pick([
                      //valid area codes of major cities/counties followed by random numbers in required format.

                      { area: '01' + this.character({ pool: '234569' }) + '1 ', sections: [3,4] },
                      { area: '020 ' + this.character({ pool: '378' }), sections: [3,4] },
                      { area: '023 ' + this.character({ pool: '89' }), sections: [3,4] },
                      { area: '024 7', sections: [3,4] },
                      { area: '028 ' + this.pick(['25','28','37','71','82','90','92','95']), sections: [2,4] },
                      { area: '012' + this.pick(['04','08','54','76','97','98']) + ' ', sections: [6] },
                      { area: '013' + this.pick(['63','64','84','86']) + ' ', sections: [6] },
                      { area: '014' + this.pick(['04','20','60','61','80','88']) + ' ', sections: [6] },
                      { area: '015' + this.pick(['24','27','62','66']) + ' ', sections: [6] },
                      { area: '016' + this.pick(['06','29','35','47','59','95']) + ' ', sections: [6] },
                      { area: '017' + this.pick(['26','44','50','68']) + ' ', sections: [6] },
                      { area: '018' + this.pick(['27','37','84','97']) + ' ', sections: [6] },
                      { area: '019' + this.pick(['00','05','35','46','49','63','95']) + ' ', sections: [6] }
                  ]);
                  phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '', 'g');
              } else {
                  numPick = this.pick([
                      { area: '07' + this.pick(['4','5','7','8','9']), sections: [2,6] },
                      { area: '07624 ', sections: [6] }
                  ]);
                  phone = options.formatted ? ukNum(numPick) : ukNum(numPick).replace(' ', '');
              }
              break;
          case 'za':
              if (!options.mobile) {
                  numPick = this.pick([
                     '01' + this.pick(['0', '1', '2', '3', '4', '5', '6', '7', '8']) + self.string({ pool: '0123456789', length: 7}),
                     '02' + this.pick(['1', '2', '3', '4', '7', '8']) + self.string({ pool: '0123456789', length: 7}),
                     '03' + this.pick(['1', '2', '3', '5', '6', '9']) + self.string({ pool: '0123456789', length: 7}),
                     '04' + this.pick(['1', '2', '3', '4', '5','6','7', '8','9']) + self.string({ pool: '0123456789', length: 7}),
                     '05' + this.pick(['1', '3', '4', '6', '7', '8']) + self.string({ pool: '0123456789', length: 7}),
                  ]);
                  phone = options.formatted || numPick;
              } else {
                  numPick = this.pick([
                      '060' + this.pick(['3','4','5','6','7','8','9']) + self.string({ pool: '0123456789', length: 6}),
                      '061' + this.pick(['0','1','2','3','4','5','8']) + self.string({ pool: '0123456789', length: 6}),
                      '06'  + self.string({ pool: '0123456789', length: 7}),
                      '071' + this.pick(['0','1','2','3','4','5','6','7','8','9']) + self.string({ pool: '0123456789', length: 6}),
                      '07'  + this.pick(['2','3','4','6','7','8','9']) + self.string({ pool: '0123456789', length: 7}),
                      '08'  + this.pick(['0','1','2','3','4','5']) + self.string({ pool: '0123456789', length: 7}),
                  ]);
                  phone = options.formatted || numPick;
              }
              break;
          case 'us':
              var areacode = this.areacode(options).toString();
              var exchange = this.natural({ min: 2, max: 9 }).toString() +
                  this.natural({ min: 0, max: 9 }).toString() +
                  this.natural({ min: 0, max: 9 }).toString();
              var subscriber = this.natural({ min: 1000, max: 9999 }).toString(); // this could be random [0-9]{4}
              phone = options.formatted ? areacode + ' ' + exchange + '-' + subscriber : areacode + exchange + subscriber;
              break;
          case 'br':
              var areaCode = this.pick(["11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "22", "24", "27", "28", "31", "32", "33", "34", "35", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48", "49", "51", "53", "54", "55", "61", "62", "63", "64", "65", "66", "67", "68", "69", "71", "73", "74", "75", "77", "79", "81", "82", "83", "84", "85", "86", "87", "88", "89", "91", "92", "93", "94", "95", "96", "97", "98", "99"]);
              var prefix;
              if (options.mobile) {
                  // Brasilian official reference (mobile): http://www.anatel.gov.br/setorregulado/plano-de-numeracao-brasileiro?id=330
                  prefix = '9' + self.string({ pool: '0123456789', length: 4});
              } else {
                  // Brasilian official reference: http://www.anatel.gov.br/setorregulado/plano-de-numeracao-brasileiro?id=331
                  prefix = this.natural({ min: 2000, max: 5999 }).toString();
              }
              var mcdu = self.string({ pool: '0123456789', length: 4});
              phone = options.formatted ? '(' + areaCode + ') ' + prefix + '-' + mcdu : areaCode + prefix + mcdu;
              break;
      }
      return phone;
  };

  Chance.prototype.postal = function () {
      // Postal District
      var pd = this.character({pool: "XVTSRPNKLMHJGECBA"});
      // Forward Sortation Area (FSA)
      var fsa = pd + this.natural({max: 9}) + this.character({alpha: true, casing: "upper"});
      // Local Delivery Unut (LDU)
      var ldu = this.natural({max: 9}) + this.character({alpha: true, casing: "upper"}) + this.natural({max: 9});

      return fsa + " " + ldu;
  };

  Chance.prototype.counties = function (options) {
      options = initOptions(options, { country: 'uk' });
      return this.get("counties")[options.country.toLowerCase()];
  };

  Chance.prototype.county = function (options) {
      return this.pick(this.counties(options)).name;
  };

  Chance.prototype.provinces = function (options) {
      options = initOptions(options, { country: 'ca' });
      return this.get("provinces")[options.country.toLowerCase()];
  };

  Chance.prototype.province = function (options) {
      return (options && options.full) ?
          this.pick(this.provinces(options)).name :
          this.pick(this.provinces(options)).abbreviation;
  };

  Chance.prototype.state = function (options) {
      return (options && options.full) ?
          this.pick(this.states(options)).name :
          this.pick(this.states(options)).abbreviation;
  };

  Chance.prototype.states = function (options) {
      options = initOptions(options, { country: 'us', us_states_and_dc: true } );

      var states;

      switch (options.country.toLowerCase()) {
          case 'us':
              var us_states_and_dc = this.get("us_states_and_dc"),
                  territories = this.get("territories"),
                  armed_forces = this.get("armed_forces");

              states = [];

              if (options.us_states_and_dc) {
                  states = states.concat(us_states_and_dc);
              }
              if (options.territories) {
                  states = states.concat(territories);
              }
              if (options.armed_forces) {
                  states = states.concat(armed_forces);
              }
              break;
          case 'it':
              states = this.get("country_regions")[options.country.toLowerCase()];
              break;
          case 'uk':
              states = this.get("counties")[options.country.toLowerCase()];
              break;
      }

      return states;
  };

  Chance.prototype.street = function (options) {
      options = initOptions(options, { country: 'us', syllables: 2 });
      var     street;

      switch (options.country.toLowerCase()) {
          case 'us':
              street = this.word({ syllables: options.syllables });
              street = this.capitalize(street);
              street += ' ';
              street += options.short_suffix ?
                  this.street_suffix(options).abbreviation :
                  this.street_suffix(options).name;
              break;
          case 'it':
              street = this.word({ syllables: options.syllables });
              street = this.capitalize(street);
              street = (options.short_suffix ?
                  this.street_suffix(options).abbreviation :
                  this.street_suffix(options).name) + " " + street;
              break;
      }
      return street;
  };

  Chance.prototype.street_suffix = function (options) {
      options = initOptions(options, { country: 'us' });
      return this.pick(this.street_suffixes(options));
  };

  Chance.prototype.street_suffixes = function (options) {
      options = initOptions(options, { country: 'us' });
      // These are the most common suffixes.
      return this.get("street_suffixes")[options.country.toLowerCase()];
  };

  // Note: only returning US zip codes, internationalization will be a whole
  // other beast to tackle at some point.
  Chance.prototype.zip = function (options) {
      var zip = this.n(this.natural, 5, {max: 9});

      if (options && options.plusfour === true) {
          zip.push('-');
          zip = zip.concat(this.n(this.natural, 4, {max: 9}));
      }

      return zip.join("");
  };

  // -- End Location --

  // -- Time

  Chance.prototype.ampm = function () {
      return this.bool() ? 'am' : 'pm';
  };

  Chance.prototype.date = function (options) {
      var date_string, date;

      // If interval is specified we ignore preset
      if(options && (options.min || options.max)) {
          options = initOptions(options, {
              american: true,
              string: false
          });
          var min = typeof options.min !== "undefined" ? options.min.getTime() : 1;
          // 100,000,000 days measured relative to midnight at the beginning of 01 January, 1970 UTC. http://es5.github.io/#x15.9.1.1
          var max = typeof options.max !== "undefined" ? options.max.getTime() : 8640000000000000;

          date = new Date(this.integer({min: min, max: max}));
      } else {
          var m = this.month({raw: true});
          var daysInMonth = m.days;

          if(options && options.month) {
              // Mod 12 to allow months outside range of 0-11 (not encouraged, but also not prevented).
              daysInMonth = this.get('months')[((options.month % 12) + 12) % 12].days;
          }

          options = initOptions(options, {
              year: parseInt(this.year(), 10),
              // Necessary to subtract 1 because Date() 0-indexes month but not day or year
              // for some reason.
              month: m.numeric - 1,
              day: this.natural({min: 1, max: daysInMonth}),
              hour: this.hour({twentyfour: true}),
              minute: this.minute(),
              second: this.second(),
              millisecond: this.millisecond(),
              american: true,
              string: false
          });

          date = new Date(options.year, options.month, options.day, options.hour, options.minute, options.second, options.millisecond);
      }

      if (options.american) {
          // Adding 1 to the month is necessary because Date() 0-indexes
          // months but not day for some odd reason.
          date_string = (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
      } else {
          date_string = date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
      }

      return options.string ? date_string : date;
  };

  Chance.prototype.hammertime = function (options) {
      return this.date(options).getTime();
  };

  Chance.prototype.hour = function (options) {
      options = initOptions(options, {
          min: options && options.twentyfour ? 0 : 1,
          max: options && options.twentyfour ? 23 : 12
      });

      testRange(options.min < 0, "Chance: Min cannot be less than 0.");
      testRange(options.twentyfour && options.max > 23, "Chance: Max cannot be greater than 23 for twentyfour option.");
      testRange(!options.twentyfour && options.max > 12, "Chance: Max cannot be greater than 12.");
      testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

      return this.natural({min: options.min, max: options.max});
  };

  Chance.prototype.millisecond = function () {
      return this.natural({max: 999});
  };

  Chance.prototype.minute = Chance.prototype.second = function (options) {
      options = initOptions(options, {min: 0, max: 59});

      testRange(options.min < 0, "Chance: Min cannot be less than 0.");
      testRange(options.max > 59, "Chance: Max cannot be greater than 59.");
      testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

      return this.natural({min: options.min, max: options.max});
  };

  Chance.prototype.month = function (options) {
      options = initOptions(options, {min: 1, max: 12});

      testRange(options.min < 1, "Chance: Min cannot be less than 1.");
      testRange(options.max > 12, "Chance: Max cannot be greater than 12.");
      testRange(options.min > options.max, "Chance: Min cannot be greater than Max.");

      var month = this.pick(this.months().slice(options.min - 1, options.max));
      return options.raw ? month : month.name;
  };

  Chance.prototype.months = function () {
      return this.get("months");
  };

  Chance.prototype.second = function () {
      return this.natural({max: 59});
  };

  Chance.prototype.timestamp = function () {
      return this.natural({min: 1, max: parseInt(new Date().getTime() / 1000, 10)});
  };

  Chance.prototype.weekday = function (options) {
      options = initOptions(options, {weekday_only: false});
      var weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
      if (!options.weekday_only) {
          weekdays.push("Saturday");
          weekdays.push("Sunday");
      }
      return this.pickone(weekdays);
  };

  Chance.prototype.year = function (options) {
      // Default to current year as min if none specified
      options = initOptions(options, {min: new Date().getFullYear()});

      // Default to one century after current year as max if none specified
      options.max = (typeof options.max !== "undefined") ? options.max : options.min + 100;

      return this.natural(options).toString();
  };

  // -- End Time

  // -- Finance --

  Chance.prototype.cc = function (options) {
      options = initOptions(options);

      var type, number, to_generate;

      type = (options.type) ?
                  this.cc_type({ name: options.type, raw: true }) :
                  this.cc_type({ raw: true });

      number = type.prefix.split("");
      to_generate = type.length - type.prefix.length - 1;

      // Generates n - 1 digits
      number = number.concat(this.n(this.integer, to_generate, {min: 0, max: 9}));

      // Generates the last digit according to Luhn algorithm
      number.push(this.luhn_calculate(number.join("")));

      return number.join("");
  };

  Chance.prototype.cc_types = function () {
      // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
      return this.get("cc_types");
  };

  Chance.prototype.cc_type = function (options) {
      options = initOptions(options);
      var types = this.cc_types(),
          type = null;

      if (options.name) {
          for (var i = 0; i < types.length; i++) {
              // Accept either name or short_name to specify card type
              if (types[i].name === options.name || types[i].short_name === options.name) {
                  type = types[i];
                  break;
              }
          }
          if (type === null) {
              throw new RangeError("Chance: Credit card type '" + options.name + "' is not supported");
          }
      } else {
          type = this.pick(types);
      }

      return options.raw ? type : type.name;
  };

  // return all world currency by ISO 4217
  Chance.prototype.currency_types = function () {
      return this.get("currency_types");
  };

  // return random world currency by ISO 4217
  Chance.prototype.currency = function () {
      return this.pick(this.currency_types());
  };

  // return all timezones available
  Chance.prototype.timezones = function () {
      return this.get("timezones");
  };

  // return random timezone
  Chance.prototype.timezone = function () {
      return this.pick(this.timezones());
  };

  //Return random correct currency exchange pair (e.g. EUR/USD) or array of currency code
  Chance.prototype.currency_pair = function (returnAsString) {
      var currencies = this.unique(this.currency, 2, {
          comparator: function(arr, val) {

              return arr.reduce(function(acc, item) {
                  // If a match has been found, short circuit check and just return
                  return acc || (item.code === val.code);
              }, false);
          }
      });

      if (returnAsString) {
          return currencies[0].code + '/' + currencies[1].code;
      } else {
          return currencies;
      }
  };

  Chance.prototype.dollar = function (options) {
      // By default, a somewhat more sane max for dollar than all available numbers
      options = initOptions(options, {max : 10000, min : 0});

      var dollar = this.floating({min: options.min, max: options.max, fixed: 2}).toString(),
          cents = dollar.split('.')[1];

      if (cents === undefined) {
          dollar += '.00';
      } else if (cents.length < 2) {
          dollar = dollar + '0';
      }

      if (dollar < 0) {
          return '-$' + dollar.replace('-', '');
      } else {
          return '$' + dollar;
      }
  };

  Chance.prototype.euro = function (options) {
      return Number(this.dollar(options).replace("$", "")).toLocaleString() + "€";
  };

  Chance.prototype.exp = function (options) {
      options = initOptions(options);
      var exp = {};

      exp.year = this.exp_year();

      // If the year is this year, need to ensure month is greater than the
      // current month or this expiration will not be valid
      if (exp.year === (new Date().getFullYear()).toString()) {
          exp.month = this.exp_month({future: true});
      } else {
          exp.month = this.exp_month();
      }

      return options.raw ? exp : exp.month + '/' + exp.year;
  };

  Chance.prototype.exp_month = function (options) {
      options = initOptions(options);
      var month, month_int,
          // Date object months are 0 indexed
          curMonth = new Date().getMonth() + 1;

      if (options.future && (curMonth !== 12)) {
          do {
              month = this.month({raw: true}).numeric;
              month_int = parseInt(month, 10);
          } while (month_int <= curMonth);
      } else {
          month = this.month({raw: true}).numeric;
      }

      return month;
  };

  Chance.prototype.exp_year = function () {
      var curMonth = new Date().getMonth() + 1,
          curYear = new Date().getFullYear();

      return this.year({min: ((curMonth === 12) ? (curYear + 1) : curYear), max: (curYear + 10)});
  };

  Chance.prototype.vat = function (options) {
      options = initOptions(options, { country: 'it' });
      switch (options.country.toLowerCase()) {
          case 'it':
              return this.it_vat();
      }
  };

  /**
   * Generate a string matching IBAN pattern (https://en.wikipedia.org/wiki/International_Bank_Account_Number).
   * No country-specific formats support (yet)
   */
  Chance.prototype.iban = function () {
      var alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      var alphanum = alpha + '0123456789';
      var iban =
          this.string({ length: 2, pool: alpha }) +
          this.pad(this.integer({ min: 0, max: 99 }), 2) +
          this.string({ length: 4, pool: alphanum }) +
          this.pad(this.natural(), this.natural({ min: 6, max: 26 }));
      return iban;
  };

  // -- End Finance

  // -- Regional

  Chance.prototype.it_vat = function () {
      var it_vat = this.natural({min: 1, max: 1800000});

      it_vat = this.pad(it_vat, 7) + this.pad(this.pick(this.provinces({ country: 'it' })).code, 3);
      return it_vat + this.luhn_calculate(it_vat);
  };

  /*
   * this generator is written following the official algorithm
   * all data can be passed explicitely or randomized by calling chance.cf() without options
   * the code does not check that the input data is valid (it goes beyond the scope of the generator)
   *
   * @param  [Object] options = { first: first name,
   *                              last: last name,
   *                              gender: female|male,
                                  birthday: JavaScript date object,
                                  city: string(4), 1 letter + 3 numbers
                                 }
   * @return [string] codice fiscale
   *
  */
  Chance.prototype.cf = function (options) {
      options = options || {};
      var gender = !!options.gender ? options.gender : this.gender(),
          first = !!options.first ? options.first : this.first( { gender: gender, nationality: 'it'} ),
          last = !!options.last ? options.last : this.last( { nationality: 'it'} ),
          birthday = !!options.birthday ? options.birthday : this.birthday(),
          city = !!options.city ? options.city : this.pickone(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'L', 'M', 'Z']) + this.pad(this.natural({max:999}), 3),
          cf = [],
          name_generator = function(name, isLast) {
              var temp,
                  return_value = [];

              if (name.length < 3) {
                  return_value = name.split("").concat("XXX".split("")).splice(0,3);
              }
              else {
                  temp = name.toUpperCase().split('').map(function(c){
                      return ("BCDFGHJKLMNPRSTVWZ".indexOf(c) !== -1) ? c : undefined;
                  }).join('');
                  if (temp.length > 3) {
                      if (isLast) {
                          temp = temp.substr(0,3);
                      } else {
                          temp = temp[0] + temp.substr(2,2);
                      }
                  }
                  if (temp.length < 3) {
                      return_value = temp;
                      temp = name.toUpperCase().split('').map(function(c){
                          return ("AEIOU".indexOf(c) !== -1) ? c : undefined;
                      }).join('').substr(0, 3 - return_value.length);
                  }
                  return_value = return_value + temp;
              }

              return return_value;
          },
          date_generator = function(birthday, gender, that) {
              var lettermonths = ['A', 'B', 'C', 'D', 'E', 'H', 'L', 'M', 'P', 'R', 'S', 'T'];

              return  birthday.getFullYear().toString().substr(2) +
                      lettermonths[birthday.getMonth()] +
                      that.pad(birthday.getDate() + ((gender.toLowerCase() === "female") ? 40 : 0), 2);
          },
          checkdigit_generator = function(cf) {
              var range1 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                  range2 = "ABCDEFGHIJABCDEFGHIJKLMNOPQRSTUVWXYZ",
                  evens  = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                  odds   = "BAKPLCQDREVOSFTGUHMINJWZYX",
                  digit  = 0;


              for(var i = 0; i < 15; i++) {
                  if (i % 2 !== 0) {
                      digit += evens.indexOf(range2[range1.indexOf(cf[i])]);
                  }
                  else {
                      digit +=  odds.indexOf(range2[range1.indexOf(cf[i])]);
                  }
              }
              return evens[digit % 26];
          };

      cf = cf.concat(name_generator(last, true), name_generator(first), date_generator(birthday, gender, this), city.toUpperCase().split("")).join("");
      cf += checkdigit_generator(cf.toUpperCase(), this);

      return cf.toUpperCase();
  };

  Chance.prototype.pl_pesel = function () {
      var number = this.natural({min: 1, max: 9999999999});
      var arr = this.pad(number, 10).split('');
      for (var i = 0; i < arr.length; i++) {
          arr[i] = parseInt(arr[i]);
      }

      var controlNumber = (1 * arr[0] + 3 * arr[1] + 7 * arr[2] + 9 * arr[3] + 1 * arr[4] + 3 * arr[5] + 7 * arr[6] + 9 * arr[7] + 1 * arr[8] + 3 * arr[9]) % 10;
      if(controlNumber !== 0) {
          controlNumber = 10 - controlNumber;
      }

      return arr.join('') + controlNumber;
  };

  Chance.prototype.pl_nip = function () {
      var number = this.natural({min: 1, max: 999999999});
      var arr = this.pad(number, 9).split('');
      for (var i = 0; i < arr.length; i++) {
          arr[i] = parseInt(arr[i]);
      }

      var controlNumber = (6 * arr[0] + 5 * arr[1] + 7 * arr[2] + 2 * arr[3] + 3 * arr[4] + 4 * arr[5] + 5 * arr[6] + 6 * arr[7] + 7 * arr[8]) % 11;
      if(controlNumber === 10) {
          return this.pl_nip();
      }

      return arr.join('') + controlNumber;
  };

  Chance.prototype.pl_regon = function () {
      var number = this.natural({min: 1, max: 99999999});
      var arr = this.pad(number, 8).split('');
      for (var i = 0; i < arr.length; i++) {
          arr[i] = parseInt(arr[i]);
      }

      var controlNumber = (8 * arr[0] + 9 * arr[1] + 2 * arr[2] + 3 * arr[3] + 4 * arr[4] + 5 * arr[5] + 6 * arr[6] + 7 * arr[7]) % 11;
      if(controlNumber === 10) {
          controlNumber = 0;
      }

      return arr.join('') + controlNumber;
  };

  // -- End Regional

  // -- Music --

  Chance.prototype.note = function(options) {
    // choices for 'notes' option:
    // flatKey - chromatic scale with flat notes (default)
    // sharpKey - chromatic scale with sharp notes
    // flats - just flat notes
    // sharps - just sharp notes
    // naturals - just natural notes
    // all - naturals, sharps and flats
    options = initOptions(options, { notes : 'flatKey'});
    var scales = {
      naturals: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      flats: ['D♭', 'E♭', 'G♭', 'A♭', 'B♭'],
      sharps: ['C♯', 'D♯', 'F♯', 'G♯', 'A♯']
    };
    scales.all = scales.naturals.concat(scales.flats.concat(scales.sharps))
    scales.flatKey = scales.naturals.concat(scales.flats)
    scales.sharpKey = scales.naturals.concat(scales.sharps)
    return this.pickone(scales[options.notes]);
  }

  Chance.prototype.midi_note = function(options) {
    var min = 0;
    var max = 127;
    options = initOptions(options, { min : min, max : max });
    return this.integer({min: options.min, max: options.max});
  }

  Chance.prototype.chord_quality = function(options) {
    options = initOptions(options, { jazz: true });
    var chord_qualities = ['maj', 'min', 'aug', 'dim'];
    if (options.jazz){
      chord_qualities = [
        'maj7',
        'min7',
        '7',
        'sus',
        'dim',
        'ø'
      ];
    }
    return this.pickone(chord_qualities);
  }

  Chance.prototype.chord = function (options) {
    options = initOptions(options);
    return this.note(options) + this.chord_quality(options);
  }

  Chance.prototype.tempo = function (options) {
    var min = 40;
    var max = 320;
    options = initOptions(options, {min: min, max: max});
    return this.integer({min: options.min, max: options.max});
  }

  // -- End Music

  // -- Miscellaneous --

  // Coin - Flip, flip, flipadelphia
  Chance.prototype.coin = function(options) {
    return this.bool() ? "heads" : "tails";
  }

  // Dice - For all the board game geeks out there, myself included ;)
  function diceFn (range) {
      return function () {
          return this.natural(range);
      };
  }
  Chance.prototype.d4 = diceFn({min: 1, max: 4});
  Chance.prototype.d6 = diceFn({min: 1, max: 6});
  Chance.prototype.d8 = diceFn({min: 1, max: 8});
  Chance.prototype.d10 = diceFn({min: 1, max: 10});
  Chance.prototype.d12 = diceFn({min: 1, max: 12});
  Chance.prototype.d20 = diceFn({min: 1, max: 20});
  Chance.prototype.d30 = diceFn({min: 1, max: 30});
  Chance.prototype.d100 = diceFn({min: 1, max: 100});

  Chance.prototype.rpg = function (thrown, options) {
      options = initOptions(options);
      if (!thrown) {
          throw new RangeError("Chance: A type of die roll must be included");
      } else {
          var bits = thrown.toLowerCase().split("d"),
              rolls = [];

          if (bits.length !== 2 || !parseInt(bits[0], 10) || !parseInt(bits[1], 10)) {
              throw new Error("Chance: Invalid format provided. Please provide #d# where the first # is the number of dice to roll, the second # is the max of each die");
          }
          for (var i = bits[0]; i > 0; i--) {
              rolls[i - 1] = this.natural({min: 1, max: bits[1]});
          }
          return (typeof options.sum !== 'undefined' && options.sum) ? rolls.reduce(function (p, c) { return p + c; }) : rolls;
      }
  };

  // Guid
  Chance.prototype.guid = function (options) {
      options = initOptions(options, { version: 5 });

      var guid_pool = "abcdef1234567890",
          variant_pool = "ab89",
          guid = this.string({ pool: guid_pool, length: 8 }) + '-' +
                 this.string({ pool: guid_pool, length: 4 }) + '-' +
                 // The Version
                 options.version +
                 this.string({ pool: guid_pool, length: 3 }) + '-' +
                 // The Variant
                 this.string({ pool: variant_pool, length: 1 }) +
                 this.string({ pool: guid_pool, length: 3 }) + '-' +
                 this.string({ pool: guid_pool, length: 12 });
      return guid;
  };

  // Hash
  Chance.prototype.hash = function (options) {
      options = initOptions(options, {length : 40, casing: 'lower'});
      var pool = options.casing === 'upper' ? HEX_POOL.toUpperCase() : HEX_POOL;
      return this.string({pool: pool, length: options.length});
  };

  Chance.prototype.luhn_check = function (num) {
      var str = num.toString();
      var checkDigit = +str.substring(str.length - 1);
      return checkDigit === this.luhn_calculate(+str.substring(0, str.length - 1));
  };

  Chance.prototype.luhn_calculate = function (num) {
      var digits = num.toString().split("").reverse();
      var sum = 0;
      var digit;

      for (var i = 0, l = digits.length; l > i; ++i) {
          digit = +digits[i];
          if (i % 2 === 0) {
              digit *= 2;
              if (digit > 9) {
                  digit -= 9;
              }
          }
          sum += digit;
      }
      return (sum * 9) % 10;
  };

  // MD5 Hash
  Chance.prototype.md5 = function(options) {
      var opts = { str: '', key: null, raw: false };

      if (!options) {
          opts.str = this.string();
          options = {};
      }
      else if (typeof options === 'string') {
          opts.str = options;
          options = {};
      }
      else if (typeof options !== 'object') {
          return null;
      }
      else if(options.constructor === 'Array') {
          return null;
      }

      opts = initOptions(options, opts);

      if(!opts.str){
          throw new Error('A parameter is required to return an md5 hash.');
      }

      return this.bimd5.md5(opts.str, opts.key, opts.raw);
  };

  /**
   * #Description:
   * =====================================================
   * Generate random file name with extension
   *
   * The argument provide extension type
   * -> raster
   * -> vector
   * -> 3d
   * -> document
   *
   * If nothing is provided the function return random file name with random
   * extension type of any kind
   *
   * The user can validate the file name length range
   * If nothing provided the generated file name is random
   *
   * #Extension Pool :
   * * Currently the supported extensions are
   *  -> some of the most popular raster image extensions
   *  -> some of the most popular vector image extensions
   *  -> some of the most popular 3d image extensions
   *  -> some of the most popular document extensions
   *
   * #Examples :
   * =====================================================
   *
   * Return random file name with random extension. The file extension
   * is provided by a predefined collection of extensions. More about the extension
   * pool can be found in #Extension Pool section
   *
   * chance.file()
   * => dsfsdhjf.xml
   *
   * In order to generate a file name with specific length, specify the
   * length property and integer value. The extension is going to be random
   *
   * chance.file({length : 10})
   * => asrtineqos.pdf
   *
   * In order to generate file with extension from some of the predefined groups
   * of the extension pool just specify the extension pool category in fileType property
   *
   * chance.file({fileType : 'raster'})
   * => dshgssds.psd
   *
   * You can provide specific extension for your files
   * chance.file({extension : 'html'})
   * => djfsd.html
   *
   * Or you could pass custom collection of extensions by array or by object
   * chance.file({extensions : [...]})
   * => dhgsdsd.psd
   *
   * chance.file({extensions : { key : [...], key : [...]}})
   * => djsfksdjsd.xml
   *
   * @param  [collection] options
   * @return [string]
   *
   */
  Chance.prototype.file = function(options) {

      var fileOptions = options || {};
      var poolCollectionKey = "fileExtension";
      var typeRange   = Object.keys(this.get("fileExtension"));//['raster', 'vector', '3d', 'document'];
      var fileName;
      var fileExtension;

      // Generate random file name
      fileName = this.word({length : fileOptions.length});

      // Generate file by specific extension provided by the user
      if(fileOptions.extension) {

          fileExtension = fileOptions.extension;
          return (fileName + '.' + fileExtension);
      }

      // Generate file by specific extension collection
      if(fileOptions.extensions) {

          if(Array.isArray(fileOptions.extensions)) {

              fileExtension = this.pickone(fileOptions.extensions);
              return (fileName + '.' + fileExtension);
          }
          else if(fileOptions.extensions.constructor === Object) {

              var extensionObjectCollection = fileOptions.extensions;
              var keys = Object.keys(extensionObjectCollection);

              fileExtension = this.pickone(extensionObjectCollection[this.pickone(keys)]);
              return (fileName + '.' + fileExtension);
          }

          throw new Error("Chance: Extensions must be an Array or Object");
      }

      // Generate file extension based on specific file type
      if(fileOptions.fileType) {

          var fileType = fileOptions.fileType;
          if(typeRange.indexOf(fileType) !== -1) {

              fileExtension = this.pickone(this.get(poolCollectionKey)[fileType]);
              return (fileName + '.' + fileExtension);
          }

          throw new RangeError("Chance: Expect file type value to be 'raster', 'vector', '3d' or 'document'");
      }

      // Generate random file name if no extension options are passed
      fileExtension = this.pickone(this.get(poolCollectionKey)[this.pickone(typeRange)]);
      return (fileName + '.' + fileExtension);
  };

  var data = {

      firstNames: {
          "male": {
              "en": ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Charles", "Thomas", "Christopher", "Daniel", "Matthew", "George", "Donald", "Anthony", "Paul", "Mark", "Edward", "Steven", "Kenneth", "Andrew", "Brian", "Joshua", "Kevin", "Ronald", "Timothy", "Jason", "Jeffrey", "Frank", "Gary", "Ryan", "Nicholas", "Eric", "Stephen", "Jacob", "Larry", "Jonathan", "Scott", "Raymond", "Justin", "Brandon", "Gregory", "Samuel", "Benjamin", "Patrick", "Jack", "Henry", "Walter", "Dennis", "Jerry", "Alexander", "Peter", "Tyler", "Douglas", "Harold", "Aaron", "Jose", "Adam", "Arthur", "Zachary", "Carl", "Nathan", "Albert", "Kyle", "Lawrence", "Joe", "Willie", "Gerald", "Roger", "Keith", "Jeremy", "Terry", "Harry", "Ralph", "Sean", "Jesse", "Roy", "Louis", "Billy", "Austin", "Bruce", "Eugene", "Christian", "Bryan", "Wayne", "Russell", "Howard", "Fred", "Ethan", "Jordan", "Philip", "Alan", "Juan", "Randy", "Vincent", "Bobby", "Dylan", "Johnny", "Phillip", "Victor", "Clarence", "Ernest", "Martin", "Craig", "Stanley", "Shawn", "Travis", "Bradley", "Leonard", "Earl", "Gabriel", "Jimmy", "Francis", "Todd", "Noah", "Danny", "Dale", "Cody", "Carlos", "Allen", "Frederick", "Logan", "Curtis", "Alex", "Joel", "Luis", "Norman", "Marvin", "Glenn", "Tony", "Nathaniel", "Rodney", "Melvin", "Alfred", "Steve", "Cameron", "Chad", "Edwin", "Caleb", "Evan", "Antonio", "Lee", "Herbert", "Jeffery", "Isaac", "Derek", "Ricky", "Marcus", "Theodore", "Elijah", "Luke", "Jesus", "Eddie", "Troy", "Mike", "Dustin", "Ray", "Adrian", "Bernard", "Leroy", "Angel", "Randall", "Wesley", "Ian", "Jared", "Mason", "Hunter", "Calvin", "Oscar", "Clifford", "Jay", "Shane", "Ronnie", "Barry", "Lucas", "Corey", "Manuel", "Leo", "Tommy", "Warren", "Jackson", "Isaiah", "Connor", "Don", "Dean", "Jon", "Julian", "Miguel", "Bill", "Lloyd", "Charlie", "Mitchell", "Leon", "Jerome", "Darrell", "Jeremiah", "Alvin", "Brett", "Seth", "Floyd", "Jim", "Blake", "Micheal", "Gordon", "Trevor", "Lewis", "Erik", "Edgar", "Vernon", "Devin", "Gavin", "Jayden", "Chris", "Clyde", "Tom", "Derrick", "Mario", "Brent", "Marc", "Herman", "Chase", "Dominic", "Ricardo", "Franklin", "Maurice", "Max", "Aiden", "Owen", "Lester", "Gilbert", "Elmer", "Gene", "Francisco", "Glen", "Cory", "Garrett", "Clayton", "Sam", "Jorge", "Chester", "Alejandro", "Jeff", "Harvey", "Milton", "Cole", "Ivan", "Andre", "Duane", "Landon"],
              // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0163
              "it": ["Adolfo", "Alberto", "Aldo", "Alessandro", "Alessio", "Alfredo", "Alvaro", "Andrea", "Angelo", "Angiolo", "Antonino", "Antonio", "Attilio", "Benito", "Bernardo", "Bruno", "Carlo", "Cesare", "Christian", "Claudio", "Corrado", "Cosimo", "Cristian", "Cristiano", "Daniele", "Dario", "David", "Davide", "Diego", "Dino", "Domenico", "Duccio", "Edoardo", "Elia", "Elio", "Emanuele", "Emiliano", "Emilio", "Enrico", "Enzo", "Ettore", "Fabio", "Fabrizio", "Federico", "Ferdinando", "Fernando", "Filippo", "Francesco", "Franco", "Gabriele", "Giacomo", "Giampaolo", "Giampiero", "Giancarlo", "Gianfranco", "Gianluca", "Gianmarco", "Gianni", "Gino", "Giorgio", "Giovanni", "Giuliano", "Giulio", "Giuseppe", "Graziano", "Gregorio", "Guido", "Iacopo", "Jacopo", "Lapo", "Leonardo", "Lorenzo", "Luca", "Luciano", "Luigi", "Manuel", "Marcello", "Marco", "Marino", "Mario", "Massimiliano", "Massimo", "Matteo", "Mattia", "Maurizio", "Mauro", "Michele", "Mirko", "Mohamed", "Nello", "Neri", "Niccolò", "Nicola", "Osvaldo", "Otello", "Paolo", "Pier Luigi", "Piero", "Pietro", "Raffaele", "Remo", "Renato", "Renzo", "Riccardo", "Roberto", "Rolando", "Romano", "Salvatore", "Samuele", "Sandro", "Sergio", "Silvano", "Simone", "Stefano", "Thomas", "Tommaso", "Ubaldo", "Ugo", "Umberto", "Valerio", "Valter", "Vasco", "Vincenzo", "Vittorio"],
              // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
              "nl": ["Aaron","Abel","Adam","Adriaan","Albert","Alexander","Ali","Arjen","Arno","Bart","Bas","Bastiaan","Benjamin","Bob", "Boris","Bram","Brent","Cas","Casper","Chris","Christiaan","Cornelis","Daan","Daley","Damian","Dani","Daniel","Daniël","David","Dean","Dirk","Dylan","Egbert","Elijah","Erik","Erwin","Evert","Ezra","Fabian","Fedde","Finn","Florian","Floris","Frank","Frans","Frederik","Freek","Geert","Gerard","Gerben","Gerrit","Gijs","Guus","Hans","Hendrik","Henk","Herman","Hidde","Hugo","Jaap","Jan Jaap","Jan-Willem","Jack","Jacob","Jan","Jason","Jasper","Jayden","Jelle","Jelte","Jens","Jeroen","Jesse","Jim","Job","Joep","Johannes","John","Jonathan","Joris","Joshua","Joël","Julian","Kees","Kevin","Koen","Lars","Laurens","Leendert","Lennard","Lodewijk","Luc","Luca","Lucas","Lukas","Luuk","Maarten","Marcus","Martijn","Martin","Matthijs","Maurits","Max","Mees","Melle","Mick","Mika","Milan","Mohamed","Mohammed","Morris","Muhammed","Nathan","Nick","Nico","Niek","Niels","Noah","Noud","Olivier","Oscar","Owen","Paul","Pepijn","Peter","Pieter","Pim","Quinten","Reinier","Rens","Robin","Ruben","Sam","Samuel","Sander","Sebastiaan","Sem","Sep","Sepp","Siem","Simon","Stan","Stef","Steven","Stijn","Sven","Teun","Thijmen","Thijs","Thomas","Tijn","Tim","Timo","Tobias","Tom","Victor","Vince","Willem","Wim","Wouter","Yusuf"],
              // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
              "fr": ["Aaron","Abdon","Abel","Abélard","Abelin","Abondance","Abraham","Absalon","Acace","Achaire","Achille","Adalard","Adalbald","Adalbéron","Adalbert","Adalric","Adam","Adegrin","Adel","Adelin","Andelin","Adelphe","Adam","Adéodat","Adhémar","Adjutor","Adolphe","Adonis","Adon","Adrien","Agapet","Agathange","Agathon","Agilbert","Agénor","Agnan","Aignan","Agrippin","Aimable","Aimé","Alain","Alban","Albin","Aubin","Albéric","Albert","Albertet","Alcibiade","Alcide","Alcée","Alcime","Aldonce","Aldric","Aldéric","Aleaume","Alexandre","Alexis","Alix","Alliaume","Aleaume","Almine","Almire","Aloïs","Alphée","Alphonse","Alpinien","Alverède","Amalric","Amaury","Amandin","Amant","Ambroise","Amédée","Amélien","Amiel","Amour","Anaël","Anastase","Anatole","Ancelin","Andéol","Andoche","André","Andoche","Ange","Angelin","Angilbe","Anglebert","Angoustan","Anicet","Anne","Annibal","Ansbert","Anselme","Anthelme","Antheaume","Anthime","Antide","Antoine","Antonius","Antonin","Apollinaire","Apollon","Aquilin","Arcade","Archambaud","Archambeau","Archange","Archibald","Arian","Ariel","Ariste","Aristide","Armand","Armel","Armin","Arnould","Arnaud","Arolde","Arsène","Arsinoé","Arthaud","Arthème","Arthur","Ascelin","Athanase","Aubry","Audebert","Audouin","Audran","Audric","Auguste","Augustin","Aurèle","Aurélien","Aurian","Auxence","Axel","Aymard","Aymeric","Aymon","Aymond","Balthazar","Baptiste","Barnabé","Barthélemy","Bartimée","Basile","Bastien","Baudouin","Bénigne","Benjamin","Benoît","Bérenger","Bérard","Bernard","Bertrand","Blaise","Bon","Boniface","Bouchard","Brice","Brieuc","Bruno","Brunon","Calixte","Calliste","Camélien","Camille","Camillien","Candide","Caribert","Carloman","Cassandre","Cassien","Cédric","Céleste","Célestin","Célien","Césaire","César","Charles","Charlemagne","Childebert","Chilpéric","Chrétien","Christian","Christodule","Christophe","Chrysostome","Clarence","Claude","Claudien","Cléandre","Clément","Clotaire","Côme","Constance","Constant","Constantin","Corentin","Cyprien","Cyriaque","Cyrille","Cyril","Damien","Daniel","David","Delphin","Denis","Désiré","Didier","Dieudonné","Dimitri","Dominique","Dorian","Dorothée","Edgard","Edmond","Édouard","Éleuthère","Élie","Élisée","Émeric","Émile","Émilien","Emmanuel","Enguerrand","Épiphane","Éric","Esprit","Ernest","Étienne","Eubert","Eudes","Eudoxe","Eugène","Eusèbe","Eustache","Évariste","Évrard","Fabien","Fabrice","Falba","Félicité","Félix","Ferdinand","Fiacre","Fidèle","Firmin","Flavien","Flodoard","Florent","Florentin","Florestan","Florian","Fortuné","Foulques","Francisque","François","Français","Franciscus","Francs","Frédéric","Fulbert","Fulcran","Fulgence","Gabin","Gabriel","Gaël","Garnier","Gaston","Gaspard","Gatien","Gaud","Gautier","Gédéon","Geoffroy","Georges","Géraud","Gérard","Gerbert","Germain","Gervais","Ghislain","Gilbert","Gilles","Girart","Gislebert","Gondebaud","Gonthier","Gontran","Gonzague","Grégoire","Guérin","Gui","Guillaume","Gustave","Guy","Guyot","Hardouin","Hector","Hédelin","Hélier","Henri","Herbert","Herluin","Hervé","Hilaire","Hildebert","Hincmar","Hippolyte","Honoré","Hubert","Hugues","Innocent","Isabeau","Isidore","Jacques","Japhet","Jason","Jean","Jeannel","Jeannot","Jérémie","Jérôme","Joachim","Joanny","Job","Jocelyn","Joël","Johan","Jonas","Jonathan","Joseph","Josse","Josselin","Jourdain","Jude","Judicaël","Jules","Julien","Juste","Justin","Lambert","Landry","Laurent","Lazare","Léandre","Léon","Léonard","Léopold","Leu","Loup","Leufroy","Libère","Liétald","Lionel","Loïc","Longin","Lorrain","Lorraine","Lothaire","Louis","Loup","Luc","Lucas","Lucien","Ludolphe","Ludovic","Macaire","Malo","Mamert","Manassé","Marc","Marceau","Marcel","Marcelin","Marius","Marseille","Martial","Martin","Mathurin","Matthias","Mathias","Matthieu","Maugis","Maurice","Mauricet","Maxence","Maxime","Maximilien","Mayeul","Médéric","Melchior","Mence","Merlin","Mérovée","Michaël","Michel","Moïse","Morgan","Nathan","Nathanaël","Narcisse","Néhémie","Nestor","Nestor","Nicéphore","Nicolas","Noé","Noël","Norbert","Normand","Normands","Octave","Odilon","Odon","Oger","Olivier","Oury","Pacôme","Palémon","Parfait","Pascal","Paterne","Patrice","Paul","Pépin","Perceval","Philémon","Philibert","Philippe","Philothée","Pie","Pierre","Pierrick","Prosper","Quentin","Raoul","Raphaël","Raymond","Régis","Réjean","Rémi","Renaud","René","Reybaud","Richard","Robert","Roch","Rodolphe","Rodrigue","Roger","Roland","Romain","Romuald","Roméo","Rome","Ronan","Roselin","Salomon","Samuel","Savin","Savinien","Scholastique","Sébastien","Séraphin","Serge","Séverin","Sidoine","Sigebert","Sigismond","Silvère","Simon","Siméon","Sixte","Stanislas","Stéphane","Stephan","Sylvain","Sylvestre","Tancrède","Tanguy","Taurin","Théodore","Théodose","Théophile","Théophraste","Thibault","Thibert","Thierry","Thomas","Timoléon","Timothée","Titien","Tonnin","Toussaint","Trajan","Tristan","Turold","Tim","Ulysse","Urbain","Valentin","Valère","Valéry","Venance","Venant","Venceslas","Vianney","Victor","Victorien","Victorin","Vigile","Vincent","Vital","Vitalien","Vivien","Waleran","Wandrille","Xavier","Xénophon","Yves","Zacharie","Zaché","Zéphirin"]
          },

          "female": {
              "en": ["Mary", "Emma", "Elizabeth", "Minnie", "Margaret", "Ida", "Alice", "Bertha", "Sarah", "Annie", "Clara", "Ella", "Florence", "Cora", "Martha", "Laura", "Nellie", "Grace", "Carrie", "Maude", "Mabel", "Bessie", "Jennie", "Gertrude", "Julia", "Hattie", "Edith", "Mattie", "Rose", "Catherine", "Lillian", "Ada", "Lillie", "Helen", "Jessie", "Louise", "Ethel", "Lula", "Myrtle", "Eva", "Frances", "Lena", "Lucy", "Edna", "Maggie", "Pearl", "Daisy", "Fannie", "Josephine", "Dora", "Rosa", "Katherine", "Agnes", "Marie", "Nora", "May", "Mamie", "Blanche", "Stella", "Ellen", "Nancy", "Effie", "Sallie", "Nettie", "Della", "Lizzie", "Flora", "Susie", "Maud", "Mae", "Etta", "Harriet", "Sadie", "Caroline", "Katie", "Lydia", "Elsie", "Kate", "Susan", "Mollie", "Alma", "Addie", "Georgia", "Eliza", "Lulu", "Nannie", "Lottie", "Amanda", "Belle", "Charlotte", "Rebecca", "Ruth", "Viola", "Olive", "Amelia", "Hannah", "Jane", "Virginia", "Emily", "Matilda", "Irene", "Kathryn", "Esther", "Willie", "Henrietta", "Ollie", "Amy", "Rachel", "Sara", "Estella", "Theresa", "Augusta", "Ora", "Pauline", "Josie", "Lola", "Sophia", "Leona", "Anne", "Mildred", "Ann", "Beulah", "Callie", "Lou", "Delia", "Eleanor", "Barbara", "Iva", "Louisa", "Maria", "Mayme", "Evelyn", "Estelle", "Nina", "Betty", "Marion", "Bettie", "Dorothy", "Luella", "Inez", "Lela", "Rosie", "Allie", "Millie", "Janie", "Cornelia", "Victoria", "Ruby", "Winifred", "Alta", "Celia", "Christine", "Beatrice", "Birdie", "Harriett", "Mable", "Myra", "Sophie", "Tillie", "Isabel", "Sylvia", "Carolyn", "Isabelle", "Leila", "Sally", "Ina", "Essie", "Bertie", "Nell", "Alberta", "Katharine", "Lora", "Rena", "Mina", "Rhoda", "Mathilda", "Abbie", "Eula", "Dollie", "Hettie", "Eunice", "Fanny", "Ola", "Lenora", "Adelaide", "Christina", "Lelia", "Nelle", "Sue", "Johanna", "Lilly", "Lucinda", "Minerva", "Lettie", "Roxie", "Cynthia", "Helena", "Hilda", "Hulda", "Bernice", "Genevieve", "Jean", "Cordelia", "Marian", "Francis", "Jeanette", "Adeline", "Gussie", "Leah", "Lois", "Lura", "Mittie", "Hallie", "Isabella", "Olga", "Phoebe", "Teresa", "Hester", "Lida", "Lina", "Winnie", "Claudia", "Marguerite", "Vera", "Cecelia", "Bess", "Emilie", "Rosetta", "Verna", "Myrtie", "Cecilia", "Elva", "Olivia", "Ophelia", "Georgie", "Elnora", "Violet", "Adele", "Lily", "Linnie", "Loretta", "Madge", "Polly", "Virgie", "Eugenia", "Lucile", "Lucille", "Mabelle", "Rosalie"],
              // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0162
              "it": ["Ada", "Adriana", "Alessandra", "Alessia", "Alice", "Angela", "Anna", "Anna Maria", "Annalisa", "Annita", "Annunziata", "Antonella", "Arianna", "Asia", "Assunta", "Aurora", "Barbara", "Beatrice", "Benedetta", "Bianca", "Bruna", "Camilla", "Carla", "Carlotta", "Carmela", "Carolina", "Caterina", "Catia", "Cecilia", "Chiara", "Cinzia", "Clara", "Claudia", "Costanza", "Cristina", "Daniela", "Debora", "Diletta", "Dina", "Donatella", "Elena", "Eleonora", "Elisa", "Elisabetta", "Emanuela", "Emma", "Eva", "Federica", "Fernanda", "Fiorella", "Fiorenza", "Flora", "Franca", "Francesca", "Gabriella", "Gaia", "Gemma", "Giada", "Gianna", "Gina", "Ginevra", "Giorgia", "Giovanna", "Giulia", "Giuliana", "Giuseppa", "Giuseppina", "Grazia", "Graziella", "Greta", "Ida", "Ilaria", "Ines", "Iolanda", "Irene", "Irma", "Isabella", "Jessica", "Laura", "Lea", "Letizia", "Licia", "Lidia", "Liliana", "Lina", "Linda", "Lisa", "Livia", "Loretta", "Luana", "Lucia", "Luciana", "Lucrezia", "Luisa", "Manuela", "Mara", "Marcella", "Margherita", "Maria", "Maria Cristina", "Maria Grazia", "Maria Luisa", "Maria Pia", "Maria Teresa", "Marina", "Marisa", "Marta", "Martina", "Marzia", "Matilde", "Melissa", "Michela", "Milena", "Mirella", "Monica", "Natalina", "Nella", "Nicoletta", "Noemi", "Olga", "Paola", "Patrizia", "Piera", "Pierina", "Raffaella", "Rebecca", "Renata", "Rina", "Rita", "Roberta", "Rosa", "Rosanna", "Rossana", "Rossella", "Sabrina", "Sandra", "Sara", "Serena", "Silvana", "Silvia", "Simona", "Simonetta", "Sofia", "Sonia", "Stefania", "Susanna", "Teresa", "Tina", "Tiziana", "Tosca", "Valentina", "Valeria", "Vanda", "Vanessa", "Vanna", "Vera", "Veronica", "Vilma", "Viola", "Virginia", "Vittoria"],
              // Data taken from http://www.svbkindernamen.nl/int/nl/kindernamen/index.html
              "nl": ["Ada", "Arianne", "Afke", "Amanda", "Amber", "Amy", "Aniek", "Anita", "Anja", "Anna", "Anne", "Annelies", "Annemarie", "Annette", "Anouk", "Astrid", "Aukje", "Barbara", "Bianca", "Carla", "Carlijn", "Carolien", "Chantal", "Charlotte", "Claudia", "Daniëlle", "Debora", "Diane", "Dora", "Eline", "Elise", "Ella", "Ellen", "Emma", "Esmee", "Evelien", "Esther", "Erica", "Eva", "Femke", "Fleur", "Floor", "Froukje", "Gea", "Gerda", "Hanna", "Hanneke", "Heleen", "Hilde", "Ilona", "Ina", "Inge", "Ingrid", "Iris", "Isabel", "Isabelle", "Janneke", "Jasmijn", "Jeanine", "Jennifer", "Jessica", "Johanna", "Joke", "Julia", "Julie", "Karen", "Karin", "Katja", "Kim", "Lara", "Laura", "Lena", "Lianne", "Lieke", "Lilian", "Linda", "Lisa", "Lisanne", "Lotte", "Louise", "Maaike", "Manon", "Marga", "Maria", "Marissa", "Marit", "Marjolein", "Martine", "Marleen", "Melissa", "Merel", "Miranda", "Michelle", "Mirjam", "Mirthe", "Naomi", "Natalie", 'Nienke', "Nina", "Noortje", "Olivia", "Patricia", "Paula", "Paulien", "Ramona", "Ria", "Rianne", "Roos", "Rosanne", "Ruth", "Sabrina", "Sandra", "Sanne", "Sara", "Saskia", "Silvia", "Sofia", "Sophie", "Sonja", "Suzanne", "Tamara", "Tess", "Tessa", "Tineke", "Valerie", "Vanessa", "Veerle", "Vera", "Victoria", "Wendy", "Willeke", "Yvonne", "Zoë"],
              // Data taken from https://fr.wikipedia.org/wiki/Liste_de_pr%C3%A9noms_fran%C3%A7ais_et_de_la_francophonie
              "fr": ["Abdon","Abel","Abigaëlle","Abigaïl","Acacius","Acanthe","Adalbert","Adalsinde","Adegrine","Adélaïde","Adèle","Adélie","Adeline","Adeltrude","Adolphe","Adonis","Adrastée","Adrehilde","Adrienne","Agathe","Agilbert","Aglaé","Aignan","Agneflète","Agnès","Agrippine","Aimé","Alaine","Alaïs","Albane","Albérade","Alberte","Alcide","Alcine","Alcyone","Aldegonde","Aleth","Alexandrine","Alexine","Alice","Aliénor","Aliette","Aline","Alix","Alizé","Aloïse","Aloyse","Alphonsine","Althée","Amaliane","Amalthée","Amande","Amandine","Amant","Amarande","Amaranthe","Amaryllis","Ambre","Ambroisie","Amélie","Améthyste","Aminte","Anaël","Anaïs","Anastasie","Anatole","Ancelin","Andrée","Anémone","Angadrême","Angèle","Angeline","Angélique","Angilbert","Anicet","Annabelle","Anne","Annette","Annick","Annie","Annonciade","Ansbert","Anstrudie","Anthelme","Antigone","Antoinette","Antonine","Aphélie","Apolline","Apollonie","Aquiline","Arabelle","Arcadie","Archange","Argine","Ariane","Aricie","Ariel","Arielle","Arlette","Armance","Armande","Armandine","Armelle","Armide","Armelle","Armin","Arnaud","Arsène","Arsinoé","Artémis","Arthur","Ascelin","Ascension","Assomption","Astarté","Astérie","Astrée","Astrid","Athalie","Athanasie","Athina","Aube","Albert","Aude","Audrey","Augustine","Aure","Aurélie","Aurélien","Aurèle","Aurore","Auxence","Aveline","Abigaëlle","Avoye","Axelle","Aymard","Azalée","Adèle","Adeline","Barbe","Basilisse","Bathilde","Béatrice","Béatrix","Bénédicte","Bérengère","Bernadette","Berthe","Bertille","Beuve","Blanche","Blanc","Blandine","Brigitte","Brune","Brunehilde","Callista","Camille","Capucine","Carine","Caroline","Cassandre","Catherine","Cécile","Céleste","Célestine","Céline","Chantal","Charlène","Charline","Charlotte","Chloé","Christelle","Christiane","Christine","Claire","Clara","Claude","Claudine","Clarisse","Clémence","Clémentine","Cléo","Clio","Clotilde","Coline","Conception","Constance","Coralie","Coraline","Corentine","Corinne","Cyrielle","Daniel","Daniel","Daphné","Débora","Delphine","Denise","Diane","Dieudonné","Dominique","Doriane","Dorothée","Douce","Édith","Edmée","Éléonore","Éliane","Élia","Éliette","Élisabeth","Élise","Ella","Élodie","Éloïse","Elsa","Émeline","Émérance","Émérentienne","Émérencie","Émilie","Emma","Emmanuelle","Emmelie","Ernestine","Esther","Estelle","Eudoxie","Eugénie","Eulalie","Euphrasie","Eusébie","Évangéline","Eva","Ève","Évelyne","Fanny","Fantine","Faustine","Félicie","Fernande","Flavie","Fleur","Flore","Florence","Florie","Fortuné","France","Francia","Françoise","Francine","Gabrielle","Gaëlle","Garance","Geneviève","Georgette","Gerberge","Germaine","Gertrude","Gisèle","Guenièvre","Guilhemine","Guillemette","Gustave","Gwenael","Hélène","Héloïse","Henriette","Hermine","Hermione","Hippolyte","Honorine","Hortense","Huguette","Ines","Irène","Irina","Iris","Isabeau","Isabelle","Iseult","Isolde","Ismérie","Jacinthe","Jacqueline","Jade","Janine","Jeanne","Jocelyne","Joëlle","Joséphine","Judith","Julia","Julie","Jules","Juliette","Justine","Katy","Kathy","Katie","Laura","Laure","Laureline","Laurence","Laurene","Lauriane","Laurianne","Laurine","Léa","Léna","Léonie","Léon","Léontine","Lorraine","Lucie","Lucienne","Lucille","Ludivine","Lydie","Lydie","Megane","Madeleine","Magali","Maguelone","Mallaury","Manon","Marceline","Margot","Marguerite","Marianne","Marie","Myriam","Marie","Marine","Marion","Marlène","Marthe","Martine","Mathilde","Maud","Maureen","Mauricette","Maxime","Mélanie","Melissa","Mélissandre","Mélisande","Mélodie","Michel","Micheline","Mireille","Miriam","Moïse","Monique","Morgane","Muriel","Mylène","Nadège","Nadine","Nathalie","Nicole","Nicolette","Nine","Noël","Noémie","Océane","Odette","Odile","Olive","Olivia","Olympe","Ombline","Ombeline","Ophélie","Oriande","Oriane","Ozanne","Pascale","Pascaline","Paule","Paulette","Pauline","Priscille","Prisca","Prisque","Pécine","Pélagie","Pénélope","Perrine","Pétronille","Philippine","Philomène","Philothée","Primerose","Prudence","Pulchérie","Quentine","Quiéta","Quintia","Quintilla","Rachel","Raphaëlle","Raymonde","Rebecca","Régine","Réjeanne","René","Rita","Rita","Rolande","Romane","Rosalie","Rose","Roseline","Sabine","Salomé","Sandra","Sandrine","Sarah","Ségolène","Séverine","Sibylle","Simone","Sixt","Solange","Soline","Solène","Sophie","Stéphanie","Suzanne","Sylvain","Sylvie","Tatiana","Thaïs","Théodora","Thérèse","Tiphaine","Ursule","Valentine","Valérie","Véronique","Victoire","Victorine","Vinciane","Violette","Virginie","Viviane","Xavière","Yolande","Ysaline","Yvette","Yvonne","Zélie","Zita","Zoé"]
          }
      },

      lastNames: {
          "en": ['Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'Hernandez', 'King', 'Wright', 'Lopez', 'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Gonzalez', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts', 'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Sanchez', 'Morris', 'Rogers', 'Reed', 'Cook', 'Morgan', 'Bell', 'Murphy', 'Bailey', 'Rivera', 'Cooper', 'Richardson', 'Cox', 'Howard', 'Ward', 'Torres', 'Peterson', 'Gray', 'Ramirez', 'James', 'Watson', 'Brooks', 'Kelly', 'Sanders', 'Price', 'Bennett', 'Wood', 'Barnes', 'Ross', 'Henderson', 'Coleman', 'Jenkins', 'Perry', 'Powell', 'Long', 'Patterson', 'Hughes', 'Flores', 'Washington', 'Butler', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander', 'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham', 'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds', 'Fisher', 'Ellis', 'Harrison', 'Gibson', 'McDonald', 'Cruz', 'Marshall', 'Ortiz', 'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker', 'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales', 'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw', 'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills', 'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn', 'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry', 'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll', 'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz', 'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence', 'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson', 'Fields', 'Gutierrez', 'Ryan', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler', 'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer', 'Bishop', 'McCoy', 'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza', 'Harvey', 'Little', 'Burton', 'Stanley', 'Nguyen', 'George', 'Jacobs', 'Reid', 'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero', 'Welch', 'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman', 'Medina', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva', 'Pearson', 'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson', 'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis', 'Neal', 'Caldwell', 'Lowe', 'Jennings', 'Barnett', 'Graves', 'Jimenez', 'Horton', 'Shelton', 'Barrett', 'Obrien', 'Castro', 'Sutton', 'Gregory', 'McKinney', 'Lucas', 'Miles', 'Craig', 'Rodriquez', 'Chambers', 'Holt', 'Lambert', 'Fletcher', 'Watts', 'Bates', 'Hale', 'Rhodes', 'Pena', 'Beck', 'Newman', 'Haynes', 'McDaniel', 'Mendez', 'Bush', 'Vaughn', 'Parks', 'Dawson', 'Santiago', 'Norris', 'Hardy', 'Love', 'Steele', 'Curry', 'Powers', 'Schultz', 'Barker', 'Guzman', 'Page', 'Munoz', 'Ball', 'Keller', 'Chandler', 'Weber', 'Leonard', 'Walsh', 'Lyons', 'Ramsey', 'Wolfe', 'Schneider', 'Mullins', 'Benson', 'Sharp', 'Bowen', 'Daniel', 'Barber', 'Cummings', 'Hines', 'Baldwin', 'Griffith', 'Valdez', 'Hubbard', 'Salazar', 'Reeves', 'Warner', 'Stevenson', 'Burgess', 'Santos', 'Tate', 'Cross', 'Garner', 'Mann', 'Mack', 'Moss', 'Thornton', 'Dennis', 'McGee', 'Farmer', 'Delgado', 'Aguilar', 'Vega', 'Glover', 'Manning', 'Cohen', 'Harmon', 'Rodgers', 'Robbins', 'Newton', 'Todd', 'Blair', 'Higgins', 'Ingram', 'Reese', 'Cannon', 'Strickland', 'Townsend', 'Potter', 'Goodwin', 'Walton', 'Rowe', 'Hampton', 'Ortega', 'Patton', 'Swanson', 'Joseph', 'Francis', 'Goodman', 'Maldonado', 'Yates', 'Becker', 'Erickson', 'Hodges', 'Rios', 'Conner', 'Adkins', 'Webster', 'Norman', 'Malone', 'Hammond', 'Flowers', 'Cobb', 'Moody', 'Quinn', 'Blake', 'Maxwell', 'Pope', 'Floyd', 'Osborne', 'Paul', 'McCarthy', 'Guerrero', 'Lindsey', 'Estrada', 'Sandoval', 'Gibbs', 'Tyler', 'Gross', 'Fitzgerald', 'Stokes', 'Doyle', 'Sherman', 'Saunders', 'Wise', 'Colon', 'Gill', 'Alvarado', 'Greer', 'Padilla', 'Simon', 'Waters', 'Nunez', 'Ballard', 'Schwartz', 'McBride', 'Houston', 'Christensen', 'Klein', 'Pratt', 'Briggs', 'Parsons', 'McLaughlin', 'Zimmerman', 'French', 'Buchanan', 'Moran', 'Copeland', 'Roy', 'Pittman', 'Brady', 'McCormick', 'Holloway', 'Brock', 'Poole', 'Frank', 'Logan', 'Owen', 'Bass', 'Marsh', 'Drake', 'Wong', 'Jefferson', 'Park', 'Morton', 'Abbott', 'Sparks', 'Patrick', 'Norton', 'Huff', 'Clayton', 'Massey', 'Lloyd', 'Figueroa', 'Carson', 'Bowers', 'Roberson', 'Barton', 'Tran', 'Lamb', 'Harrington', 'Casey', 'Boone', 'Cortez', 'Clarke', 'Mathis', 'Singleton', 'Wilkins', 'Cain', 'Bryan', 'Underwood', 'Hogan', 'McKenzie', 'Collier', 'Luna', 'Phelps', 'McGuire', 'Allison', 'Bridges', 'Wilkerson', 'Nash', 'Summers', 'Atkins'],
              // Data taken from http://www.dati.gov.it/dataset/comune-di-firenze_0164 (first 1000)
          "it": ["Acciai", "Aglietti", "Agostini", "Agresti", "Ahmed", "Aiazzi", "Albanese", "Alberti", "Alessi", "Alfani", "Alinari", "Alterini", "Amato", "Ammannati", "Ancillotti", "Andrei", "Andreini", "Andreoni", "Angeli", "Anichini", "Antonelli", "Antonini", "Arena", "Ariani", "Arnetoli", "Arrighi", "Baccani", "Baccetti", "Bacci", "Bacherini", "Badii", "Baggiani", "Baglioni", "Bagni", "Bagnoli", "Baldassini", "Baldi", "Baldini", "Ballerini", "Balli", "Ballini", "Balloni", "Bambi", "Banchi", "Bandinelli", "Bandini", "Bani", "Barbetti", "Barbieri", "Barchielli", "Bardazzi", "Bardelli", "Bardi", "Barducci", "Bargellini", "Bargiacchi", "Barni", "Baroncelli", "Baroncini", "Barone", "Baroni", "Baronti", "Bartalesi", "Bartoletti", "Bartoli", "Bartolini", "Bartoloni", "Bartolozzi", "Basagni", "Basile", "Bassi", "Batacchi", "Battaglia", "Battaglini", "Bausi", "Becagli", "Becattini", "Becchi", "Becucci", "Bellandi", "Bellesi", "Belli", "Bellini", "Bellucci", "Bencini", "Benedetti", "Benelli", "Beni", "Benini", "Bensi", "Benucci", "Benvenuti", "Berlincioni", "Bernacchioni", "Bernardi", "Bernardini", "Berni", "Bernini", "Bertelli", "Berti", "Bertini", "Bessi", "Betti", "Bettini", "Biagi", "Biagini", "Biagioni", "Biagiotti", "Biancalani", "Bianchi", "Bianchini", "Bianco", "Biffoli", "Bigazzi", "Bigi", "Biliotti", "Billi", "Binazzi", "Bindi", "Bini", "Biondi", "Bizzarri", "Bocci", "Bogani", "Bolognesi", "Bonaiuti", "Bonanni", "Bonciani", "Boncinelli", "Bondi", "Bonechi", "Bongini", "Boni", "Bonini", "Borchi", "Boretti", "Borghi", "Borghini", "Borgioli", "Borri", "Borselli", "Boschi", "Bottai", "Bracci", "Braccini", "Brandi", "Braschi", "Bravi", "Brazzini", "Breschi", "Brilli", "Brizzi", "Brogelli", "Brogi", "Brogioni", "Brunelli", "Brunetti", "Bruni", "Bruno", "Brunori", "Bruschi", "Bucci", "Bucciarelli", "Buccioni", "Bucelli", "Bulli", "Burberi", "Burchi", "Burgassi", "Burroni", "Bussotti", "Buti", "Caciolli", "Caiani", "Calabrese", "Calamai", "Calamandrei", "Caldini", "Calo'", "Calonaci", "Calosi", "Calvelli", "Cambi", "Camiciottoli", "Cammelli", "Cammilli", "Campolmi", "Cantini", "Capanni", "Capecchi", "Caponi", "Cappelletti", "Cappelli", "Cappellini", "Cappugi", "Capretti", "Caputo", "Carbone", "Carboni", "Cardini", "Carlesi", "Carletti", "Carli", "Caroti", "Carotti", "Carrai", "Carraresi", "Carta", "Caruso", "Casalini", "Casati", "Caselli", "Casini", "Castagnoli", "Castellani", "Castelli", "Castellucci", "Catalano", "Catarzi", "Catelani", "Cavaciocchi", "Cavallaro", "Cavallini", "Cavicchi", "Cavini", "Ceccarelli", "Ceccatelli", "Ceccherelli", "Ceccherini", "Cecchi", "Cecchini", "Cecconi", "Cei", "Cellai", "Celli", "Cellini", "Cencetti", "Ceni", "Cenni", "Cerbai", "Cesari", "Ceseri", "Checcacci", "Checchi", "Checcucci", "Cheli", "Chellini", "Chen", "Cheng", "Cherici", "Cherubini", "Chiaramonti", "Chiarantini", "Chiarelli", "Chiari", "Chiarini", "Chiarugi", "Chiavacci", "Chiesi", "Chimenti", "Chini", "Chirici", "Chiti", "Ciabatti", "Ciampi", "Cianchi", "Cianfanelli", "Cianferoni", "Ciani", "Ciapetti", "Ciappi", "Ciardi", "Ciatti", "Cicali", "Ciccone", "Cinelli", "Cini", "Ciobanu", "Ciolli", "Cioni", "Cipriani", "Cirillo", "Cirri", "Ciucchi", "Ciuffi", "Ciulli", "Ciullini", "Clemente", "Cocchi", "Cognome", "Coli", "Collini", "Colombo", "Colzi", "Comparini", "Conforti", "Consigli", "Conte", "Conti", "Contini", "Coppini", "Coppola", "Corsi", "Corsini", "Corti", "Cortini", "Cosi", "Costa", "Costantini", "Costantino", "Cozzi", "Cresci", "Crescioli", "Cresti", "Crini", "Curradi", "D'Agostino", "D'Alessandro", "D'Amico", "D'Angelo", "Daddi", "Dainelli", "Dallai", "Danti", "Davitti", "De Angelis", "De Luca", "De Marco", "De Rosa", "De Santis", "De Simone", "De Vita", "Degl'Innocenti", "Degli Innocenti", "Dei", "Del Lungo", "Del Re", "Di Marco", "Di Stefano", "Dini", "Diop", "Dobre", "Dolfi", "Donati", "Dondoli", "Dong", "Donnini", "Ducci", "Dumitru", "Ermini", "Esposito", "Evangelisti", "Fabbri", "Fabbrini", "Fabbrizzi", "Fabbroni", "Fabbrucci", "Fabiani", "Facchini", "Faggi", "Fagioli", "Failli", "Faini", "Falciani", "Falcini", "Falcone", "Fallani", "Falorni", "Falsini", "Falugiani", "Fancelli", "Fanelli", "Fanetti", "Fanfani", "Fani", "Fantappie'", "Fantechi", "Fanti", "Fantini", "Fantoni", "Farina", "Fattori", "Favilli", "Fedi", "Fei", "Ferrante", "Ferrara", "Ferrari", "Ferraro", "Ferretti", "Ferri", "Ferrini", "Ferroni", "Fiaschi", "Fibbi", "Fiesoli", "Filippi", "Filippini", "Fini", "Fioravanti", "Fiore", "Fiorentini", "Fiorini", "Fissi", "Focardi", "Foggi", "Fontana", "Fontanelli", "Fontani", "Forconi", "Formigli", "Forte", "Forti", "Fortini", "Fossati", "Fossi", "Francalanci", "Franceschi", "Franceschini", "Franchi", "Franchini", "Franci", "Francini", "Francioni", "Franco", "Frassineti", "Frati", "Fratini", "Frilli", "Frizzi", "Frosali", "Frosini", "Frullini", "Fusco", "Fusi", "Gabbrielli", "Gabellini", "Gagliardi", "Galanti", "Galardi", "Galeotti", "Galletti", "Galli", "Gallo", "Gallori", "Gambacciani", "Gargani", "Garofalo", "Garuglieri", "Gashi", "Gasperini", "Gatti", "Gelli", "Gensini", "Gentile", "Gentili", "Geri", "Gerini", "Gheri", "Ghini", "Giachetti", "Giachi", "Giacomelli", "Gianassi", "Giani", "Giannelli", "Giannetti", "Gianni", "Giannini", "Giannoni", "Giannotti", "Giannozzi", "Gigli", "Giordano", "Giorgetti", "Giorgi", "Giovacchini", "Giovannelli", "Giovannetti", "Giovannini", "Giovannoni", "Giuliani", "Giunti", "Giuntini", "Giusti", "Gonnelli", "Goretti", "Gori", "Gradi", "Gramigni", "Grassi", "Grasso", "Graziani", "Grazzini", "Greco", "Grifoni", "Grillo", "Grimaldi", "Grossi", "Gualtieri", "Guarducci", "Guarino", "Guarnieri", "Guasti", "Guerra", "Guerri", "Guerrini", "Guidi", "Guidotti", "He", "Hoxha", "Hu", "Huang", "Iandelli", "Ignesti", "Innocenti", "Jin", "La Rosa", "Lai", "Landi", "Landini", "Lanini", "Lapi", "Lapini", "Lari", "Lascialfari", "Lastrucci", "Latini", "Lazzeri", "Lazzerini", "Lelli", "Lenzi", "Leonardi", "Leoncini", "Leone", "Leoni", "Lepri", "Li", "Liao", "Lin", "Linari", "Lippi", "Lisi", "Livi", "Lombardi", "Lombardini", "Lombardo", "Longo", "Lopez", "Lorenzi", "Lorenzini", "Lorini", "Lotti", "Lu", "Lucchesi", "Lucherini", "Lunghi", "Lupi", "Madiai", "Maestrini", "Maffei", "Maggi", "Maggini", "Magherini", "Magini", "Magnani", "Magnelli", "Magni", "Magnolfi", "Magrini", "Malavolti", "Malevolti", "Manca", "Mancini", "Manetti", "Manfredi", "Mangani", "Mannelli", "Manni", "Mannini", "Mannucci", "Manuelli", "Manzini", "Marcelli", "Marchese", "Marchetti", "Marchi", "Marchiani", "Marchionni", "Marconi", "Marcucci", "Margheri", "Mari", "Mariani", "Marilli", "Marinai", "Marinari", "Marinelli", "Marini", "Marino", "Mariotti", "Marsili", "Martelli", "Martinelli", "Martini", "Martino", "Marzi", "Masi", "Masini", "Masoni", "Massai", "Materassi", "Mattei", "Matteini", "Matteucci", "Matteuzzi", "Mattioli", "Mattolini", "Matucci", "Mauro", "Mazzanti", "Mazzei", "Mazzetti", "Mazzi", "Mazzini", "Mazzocchi", "Mazzoli", "Mazzoni", "Mazzuoli", "Meacci", "Mecocci", "Meini", "Melani", "Mele", "Meli", "Mengoni", "Menichetti", "Meoni", "Merlini", "Messeri", "Messina", "Meucci", "Miccinesi", "Miceli", "Micheli", "Michelini", "Michelozzi", "Migliori", "Migliorini", "Milani", "Miniati", "Misuri", "Monaco", "Montagnani", "Montagni", "Montanari", "Montelatici", "Monti", "Montigiani", "Montini", "Morandi", "Morandini", "Morelli", "Moretti", "Morganti", "Mori", "Morini", "Moroni", "Morozzi", "Mugnai", "Mugnaini", "Mustafa", "Naldi", "Naldini", "Nannelli", "Nanni", "Nannini", "Nannucci", "Nardi", "Nardini", "Nardoni", "Natali", "Ndiaye", "Nencetti", "Nencini", "Nencioni", "Neri", "Nesi", "Nesti", "Niccolai", "Niccoli", "Niccolini", "Nigi", "Nistri", "Nocentini", "Noferini", "Novelli", "Nucci", "Nuti", "Nutini", "Oliva", "Olivieri", "Olmi", "Orlandi", "Orlandini", "Orlando", "Orsini", "Ortolani", "Ottanelli", "Pacciani", "Pace", "Paci", "Pacini", "Pagani", "Pagano", "Paggetti", "Pagliai", "Pagni", "Pagnini", "Paladini", "Palagi", "Palchetti", "Palloni", "Palmieri", "Palumbo", "Pampaloni", "Pancani", "Pandolfi", "Pandolfini", "Panerai", "Panichi", "Paoletti", "Paoli", "Paolini", "Papi", "Papini", "Papucci", "Parenti", "Parigi", "Parisi", "Parri", "Parrini", "Pasquini", "Passeri", "Pecchioli", "Pecorini", "Pellegrini", "Pepi", "Perini", "Perrone", "Peruzzi", "Pesci", "Pestelli", "Petri", "Petrini", "Petrucci", "Pettini", "Pezzati", "Pezzatini", "Piani", "Piazza", "Piazzesi", "Piazzini", "Piccardi", "Picchi", "Piccini", "Piccioli", "Pieraccini", "Pieraccioni", "Pieralli", "Pierattini", "Pieri", "Pierini", "Pieroni", "Pietrini", "Pini", "Pinna", "Pinto", "Pinzani", "Pinzauti", "Piras", "Pisani", "Pistolesi", "Poggesi", "Poggi", "Poggiali", "Poggiolini", "Poli", "Pollastri", "Porciani", "Pozzi", "Pratellesi", "Pratesi", "Prosperi", "Pruneti", "Pucci", "Puccini", "Puccioni", "Pugi", "Pugliese", "Puliti", "Querci", "Quercioli", "Raddi", "Radu", "Raffaelli", "Ragazzini", "Ranfagni", "Ranieri", "Rastrelli", "Raugei", "Raveggi", "Renai", "Renzi", "Rettori", "Ricci", "Ricciardi", "Ridi", "Ridolfi", "Rigacci", "Righi", "Righini", "Rinaldi", "Risaliti", "Ristori", "Rizzo", "Rocchi", "Rocchini", "Rogai", "Romagnoli", "Romanelli", "Romani", "Romano", "Romei", "Romeo", "Romiti", "Romoli", "Romolini", "Rontini", "Rosati", "Roselli", "Rosi", "Rossetti", "Rossi", "Rossini", "Rovai", "Ruggeri", "Ruggiero", "Russo", "Sabatini", "Saccardi", "Sacchetti", "Sacchi", "Sacco", "Salerno", "Salimbeni", "Salucci", "Salvadori", "Salvestrini", "Salvi", "Salvini", "Sanesi", "Sani", "Sanna", "Santi", "Santini", "Santoni", "Santoro", "Santucci", "Sardi", "Sarri", "Sarti", "Sassi", "Sbolci", "Scali", "Scarpelli", "Scarselli", "Scopetani", "Secci", "Selvi", "Senatori", "Senesi", "Serafini", "Sereni", "Serra", "Sestini", "Sguanci", "Sieni", "Signorini", "Silvestri", "Simoncini", "Simonetti", "Simoni", "Singh", "Sodi", "Soldi", "Somigli", "Sorbi", "Sorelli", "Sorrentino", "Sottili", "Spina", "Spinelli", "Staccioli", "Staderini", "Stefanelli", "Stefani", "Stefanini", "Stella", "Susini", "Tacchi", "Tacconi", "Taddei", "Tagliaferri", "Tamburini", "Tanganelli", "Tani", "Tanini", "Tapinassi", "Tarchi", "Tarchiani", "Targioni", "Tassi", "Tassini", "Tempesti", "Terzani", "Tesi", "Testa", "Testi", "Tilli", "Tinti", "Tirinnanzi", "Toccafondi", "Tofanari", "Tofani", "Tognaccini", "Tonelli", "Tonini", "Torelli", "Torrini", "Tosi", "Toti", "Tozzi", "Trambusti", "Trapani", "Tucci", "Turchi", "Ugolini", "Ulivi", "Valente", "Valenti", "Valentini", "Vangelisti", "Vanni", "Vannini", "Vannoni", "Vannozzi", "Vannucchi", "Vannucci", "Ventura", "Venturi", "Venturini", "Vestri", "Vettori", "Vichi", "Viciani", "Vieri", "Vigiani", "Vignoli", "Vignolini", "Vignozzi", "Villani", "Vinci", "Visani", "Vitale", "Vitali", "Viti", "Viviani", "Vivoli", "Volpe", "Volpi", "Wang", "Wu", "Xu", "Yang", "Ye", "Zagli", "Zani", "Zanieri", "Zanobini", "Zecchi", "Zetti", "Zhang", "Zheng", "Zhou", "Zhu", "Zingoni", "Zini", "Zoppi"],
          // http://www.voornamelijk.nl/meest-voorkomende-achternamen-in-nederland-en-amsterdam/
          "nl":["Albers", "Alblas", "Appelman", "Baars", "Baas", "Bakker", "Blank", "Bleeker", "Blok", "Blom", "Boer", "Boers", "Boldewijn", "Boon", "Boot", "Bos", "Bosch", "Bosma", "Bosman", "Bouma", "Bouman", "Bouwman", "Brands", "Brouwer", "Burger", "Buijs", "Buitenhuis", "Ceder", "Cohen", "Dekker", "Dekkers", "Dijkman", "Dijkstra", "Driessen", "Drost", "Engel", "Evers", "Faber", "Franke", "Gerritsen", "Goedhart", "Goossens", "Groen", "Groenenberg", "Groot", "Haan", "Hart", "Heemskerk", "Hendriks", "Hermans", "Hoekstra", "Hofman", "Hopman", "Huisman", "Jacobs", "Jansen", "Janssen", "Jonker", "Jaspers", "Keijzer", "Klaassen", "Klein", "Koek", "Koenders", "Kok", "Kool", "Koopman", "Koopmans", "Koning", "Koster", "Kramer", "Kroon", "Kuijpers", "Kuiper", "Kuipers", "Kurt", "Koster", "Kwakman", "Los", "Lubbers", "Maas", "Markus", "Martens", "Meijer", "Mol", "Molenaar", "Mulder", "Nieuwenhuis", "Peeters", "Peters", "Pengel", "Pieters", "Pool", "Post", "Postma", "Prins", "Pronk", "Reijnders", "Rietveld", "Roest", "Roos", "Sanders", "Schaap", "Scheffer", "Schenk", "Schilder", "Schipper", "Schmidt", "Scholten", "Schouten", "Schut", "Schutte", "Schuurman", "Simons", "Smeets", "Smit", "Smits", "Snel", "Swinkels", "Tas", "Terpstra", "Timmermans", "Tol", "Tromp", "Troost", "Valk", "Veenstra", "Veldkamp", "Verbeek", "Verheul", "Verhoeven", "Vermeer", "Vermeulen", "Verweij", "Vink", "Visser", "Voorn", "Vos", "Wagenaar", "Wiersema", "Willems", "Willemsen", "Witteveen", "Wolff", "Wolters", "Zijlstra", "Zwart", "de Beer", "de Boer", "de Bruijn", "de Bruin", "de Graaf", "de Groot", "de Haan", "de Haas", "de Jager", "de Jong", "de Jonge", "de Koning", "de Lange", "de Leeuw", "de Ridder", "de Rooij", "de Ruiter", "de Vos", "de Vries", "de Waal", "de Wit", "de Zwart", "van Beek", "van Boven", "van Dam", "van Dijk", "van Dongen", "van Doorn", "van Egmond", "van Eijk", "van Es", "van Gelder", "van Gelderen", "van Houten", "van Hulst", "van Kempen", "van Kesteren", "van Leeuwen", "van Loon", "van Mill", "van Noord", "van Ommen", "van Ommeren", "van Oosten", "van Oostveen", "van Rijn", "van Schaik", "van Veen", "van Vliet", "van Wijk", "van Wijngaarden", "van den Poel", "van de Pol", "van den Ploeg", "van de Ven", "van den Berg", "van den Bosch", "van den Brink", "van den Broek", "van den Heuvel", "van der Heijden", "van der Horst", "van der Hulst", "van der Kroon", "van der Laan", "van der Linden", "van der Meer", "van der Meij", "van der Meulen", "van der Molen", "van der Sluis", "van der Spek", "van der Veen", "van der Velde", "van der Velden", "van der Vliet", "van der Wal"],
          // https://surnames.behindthename.com/top/lists/england-wales/1991
          "uk":["Smith","Jones","Williams","Taylor","Brown","Davies","Evans","Wilson","Thomas","Johnson","Roberts","Robinson","Thompson","Wright","Walker","White","Edwards","Hughes","Green","Hall","Lewis","Harris","Clarke","Patel","Jackson","Wood","Turner","Martin","Cooper","Hill","Ward","Morris","Moore","Clark","Lee","King","Baker","Harrison","Morgan","Allen","James","Scott","Phillips","Watson","Davis","Parker","Price","Bennett","Young","Griffiths","Mitchell","Kelly","Cook","Carter","Richardson","Bailey","Collins","Bell","Shaw","Murphy","Miller","Cox","Richards","Khan","Marshall","Anderson","Simpson","Ellis","Adams","Singh","Begum","Wilkinson","Foster","Chapman","Powell","Webb","Rogers","Gray","Mason","Ali","Hunt","Hussain","Campbell","Matthews","Owen","Palmer","Holmes","Mills","Barnes","Knight","Lloyd","Butler","Russell","Barker","Fisher","Stevens","Jenkins","Murray","Dixon","Harvey","Graham","Pearson","Ahmed","Fletcher","Walsh","Kaur","Gibson","Howard","Andrews","Stewart","Elliott","Reynolds","Saunders","Payne","Fox","Ford","Pearce","Day","Brooks","West","Lawrence","Cole","Atkinson","Bradley","Spencer","Gill","Dawson","Ball","Burton","O'brien","Watts","Rose","Booth","Perry","Ryan","Grant","Wells","Armstrong","Francis","Rees","Hayes","Hart","Hudson","Newman","Barrett","Webster","Hunter","Gregory","Carr","Lowe","Page","Marsh","Riley","Dunn","Woods","Parsons","Berry","Stone","Reid","Holland","Hawkins","Harding","Porter","Robertson","Newton","Oliver","Reed","Kennedy","Williamson","Bird","Gardner","Shah","Dean","Lane","Cooke","Bates","Henderson","Parry","Burgess","Bishop","Walton","Burns","Nicholson","Shepherd","Ross","Cross","Long","Freeman","Warren","Nicholls","Hamilton","Byrne","Sutton","Mcdonald","Yates","Hodgson","Robson","Curtis","Hopkins","O'connor","Harper","Coleman","Watkins","Moss","Mccarthy","Chambers","O'neill","Griffin","Sharp","Hardy","Wheeler","Potter","Osborne","Johnston","Gordon","Doyle","Wallace","George","Jordan","Hutchinson","Rowe","Burke","May","Pritchard","Gilbert","Willis","Higgins","Read","Miles","Stevenson","Stephenson","Hammond","Arnold","Buckley","Walters","Hewitt","Barber","Nelson","Slater","Austin","Sullivan","Whitehead","Mann","Frost","Lambert","Stephens","Blake","Akhtar","Lynch","Goodwin","Barton","Woodward","Thomson","Cunningham","Quinn","Barnett","Baxter","Bibi","Clayton","Nash","Greenwood","Jennings","Holt","Kemp","Poole","Gallagher","Bond","Stokes","Tucker","Davidson","Fowler","Heath","Norman","Middleton","Lawson","Banks","French","Stanley","Jarvis","Gibbs","Ferguson","Hayward","Carroll","Douglas","Dickinson","Todd","Barlow","Peters","Lucas","Knowles","Hartley","Miah","Simmons","Morton","Alexander","Field","Morrison","Norris","Townsend","Preston","Hancock","Thornton","Baldwin","Burrows","Briggs","Parkinson","Reeves","Macdonald","Lamb","Black","Abbott","Sanders","Thorpe","Holden","Tomlinson","Perkins","Ashton","Rhodes","Fuller","Howe","Bryant","Vaughan","Dale","Davey","Weston","Bartlett","Whittaker","Davison","Kent","Skinner","Birch","Morley","Daniels","Glover","Howell","Cartwright","Pugh","Humphreys","Goddard","Brennan","Wall","Kirby","Bowen","Savage","Bull","Wong","Dobson","Smart","Wilkins","Kirk","Fraser","Duffy","Hicks","Patterson","Bradshaw","Little","Archer","Warner","Waters","O'sullivan","Farrell","Brookes","Atkins","Kay","Dodd","Bentley","Flynn","John","Schofield","Short","Haynes","Wade","Butcher","Henry","Sanderson","Crawford","Sheppard","Bolton","Coates","Giles","Gould","Houghton","Gibbons","Pratt","Manning","Law","Hooper","Noble","Dyer","Rahman","Clements","Moran","Sykes","Chan","Doherty","Connolly","Joyce","Franklin","Hobbs","Coles","Herbert","Steele","Kerr","Leach","Winter","Owens","Duncan","Naylor","Fleming","Horton","Finch","Fitzgerald","Randall","Carpenter","Marsden","Browne","Garner","Pickering","Hale","Dennis","Vincent","Chadwick","Chandler","Sharpe","Nolan","Lyons","Hurst","Collier","Peacock","Howarth","Faulkner","Rice","Pollard","Welch","Norton","Gough","Sinclair","Blackburn","Bryan","Conway","Power","Cameron","Daly","Allan","Hanson","Gardiner","Boyle","Myers","Turnbull","Wallis","Mahmood","Sims","Swift","Iqbal","Pope","Brady","Chamberlain","Rowley","Tyler","Farmer","Metcalfe","Hilton","Godfrey","Holloway","Parkin","Bray","Talbot","Donnelly","Nixon","Charlton","Benson","Whitehouse","Barry","Hope","Lord","North","Storey","Connor","Potts","Bevan","Hargreaves","Mclean","Mistry","Bruce","Howells","Hyde","Parkes","Wyatt","Fry","Lees","O'donnell","Craig","Forster","Mckenzie","Humphries","Mellor","Carey","Ingram","Summers","Leonard"],
          // https://surnames.behindthename.com/top/lists/germany/2017
          "de": ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Schäfer","Koch","Bauer","Richter","Klein","Wolf","Schröder","Neumann","Schwarz","Zimmermann","Braun","Krüger","Hofmann","Hartmann","Lange","Schmitt","Werner","Schmitz","Krause","Meier","Lehmann","Schmid","Schulze","Maier","Köhler","Herrmann","König","Walter","Mayer","Huber","Kaiser","Fuchs","Peters","Lang","Scholz","Möller","Weiß","Jung","Hahn","Schubert","Vogel","Friedrich","Keller","Günther","Frank","Berger","Winkler","Roth","Beck","Lorenz","Baumann","Franke","Albrecht","Schuster","Simon","Ludwig","Böhm","Winter","Kraus","Martin","Schumacher","Krämer","Vogt","Stein","Jäger","Otto","Sommer","Groß","Seidel","Heinrich","Brandt","Haas","Schreiber","Graf","Schulte","Dietrich","Ziegler","Kuhn","Kühn","Pohl","Engel","Horn","Busch","Bergmann","Thomas","Voigt","Sauer","Arnold","Wolff","Pfeiffer"],
          // http://www.japantimes.co.jp/life/2009/10/11/lifestyle/japans-top-100-most-common-family-names/
          "jp": ["Sato","Suzuki","Takahashi","Tanaka","Watanabe","Ito","Yamamoto","Nakamura","Kobayashi","Kato","Yoshida","Yamada","Sasaki","Yamaguchi","Saito","Matsumoto","Inoue","Kimura","Hayashi","Shimizu","Yamazaki","Mori","Abe","Ikeda","Hashimoto","Yamashita","Ishikawa","Nakajima","Maeda","Fujita","Ogawa","Goto","Okada","Hasegawa","Murakami","Kondo","Ishii","Saito","Sakamoto","Endo","Aoki","Fujii","Nishimura","Fukuda","Ota","Miura","Fujiwara","Okamoto","Matsuda","Nakagawa","Nakano","Harada","Ono","Tamura","Takeuchi","Kaneko","Wada","Nakayama","Ishida","Ueda","Morita","Hara","Shibata","Sakai","Kudo","Yokoyama","Miyazaki","Miyamoto","Uchida","Takagi","Ando","Taniguchi","Ohno","Maruyama","Imai","Takada","Fujimoto","Takeda","Murata","Ueno","Sugiyama","Masuda","Sugawara","Hirano","Kojima","Otsuka","Chiba","Kubo","Matsui","Iwasaki","Sakurai","Kinoshita","Noguchi","Matsuo","Nomura","Kikuchi","Sano","Onishi","Sugimoto","Arai"],
          // http://www.lowchensaustralia.com/names/popular-spanish-names.htm
          "es": ["Garcia","Fernandez","Lopez","Martinez","Gonzalez","Rodriguez","Sanchez","Perez","Martin","Gomez","Ruiz","Diaz","Hernandez","Alvarez","Jimenez","Moreno","Munoz","Alonso","Romero","Navarro","Gutierrez","Torres","Dominguez","Gil","Vazquez","Blanco","Serrano","Ramos","Castro","Suarez","Sanz","Rubio","Ortega","Molina","Delgado","Ortiz","Morales","Ramirez","Marin","Iglesias","Santos","Castillo","Garrido","Calvo","Pena","Cruz","Cano","Nunez","Prieto","Diez","Lozano","Vidal","Pascual","Ferrer","Medina","Vega","Leon","Herrero","Vicente","Mendez","Guerrero","Fuentes","Campos","Nieto","Cortes","Caballero","Ibanez","Lorenzo","Pastor","Gimenez","Saez","Soler","Marquez","Carrasco","Herrera","Montero","Arias","Crespo","Flores","Andres","Aguilar","Hidalgo","Cabrera","Mora","Duran","Velasco","Rey","Pardo","Roman","Vila","Bravo","Merino","Moya","Soto","Izquierdo","Reyes","Redondo","Marcos","Carmona","Menendez"],
          // Data taken from https://fr.wikipedia.org/wiki/Liste_des_noms_de_famille_les_plus_courants_en_France
          "fr": ["Martin","Bernard","Thomas","Petit","Robert","Richard","Durand","Dubois","Moreau","Laurent","Simon","Michel","Lefèvre","Leroy","Roux","David","Bertrand","Morel","Fournier","Girard","Bonnet","Dupont","Lambert","Fontaine","Rousseau","Vincent","Müller","Lefèvre","Faure","André","Mercier","Blanc","Guérin","Boyer","Garnier","Chevalier","François","Legrand","Gauthier","Garcia","Perrin","Robin","Clément","Morin","Nicolas","Henry","Roussel","Matthieu","Gautier","Masson","Marchand","Duval","Denis","Dumont","Marie","Lemaire","Noël","Meyer","Dufour","Meunier","Brun","Blanchard","Giraud","Joly","Rivière","Lucas","Brunet","Gaillard","Barbier","Arnaud","Martínez","Gérard","Roche","Renard","Schmitt","Roy","Leroux","Colin","Vidal","Caron","Picard","Roger","Fabre","Aubert","Lemoine","Renaud","Dumas","Lacroix","Olivier","Philippe","Bourgeois","Pierre","Benoît","Rey","Leclerc","Payet","Rolland","Leclercq","Guillaume","Lecomte","López","Jean","Dupuy","Guillot","Hubert","Berger","Carpentier","Sánchez","Dupuis","Moulin","Louis","Deschamps","Huet","Vasseur","Perez","Boucher","Fleury","Royer","Klein","Jacquet","Adam","Paris","Poirier","Marty","Aubry","Guyot","Carré","Charles","Renault","Charpentier","Ménard","Maillard","Baron","Bertin","Bailly","Hervé","Schneider","Fernández","Le GallGall","Collet","Léger","Bouvier","Julien","Prévost","Millet","Perrot","Daniel","Le RouxRoux","Cousin","Germain","Breton","Besson","Langlois","Rémi","Le GoffGoff","Pelletier","Lévêque","Perrier","Leblanc","Barré","Lebrun","Marchal","Weber","Mallet","Hamon","Boulanger","Jacob","Monnier","Michaud","Rodríguez","Guichard","Gillet","Étienne","Grondin","Poulain","Tessier","Chevallier","Collin","Chauvin","Da SilvaSilva","Bouchet","Gay","Lemaître","Bénard","Maréchal","Humbert","Reynaud","Antoine","Hoarau","Perret","Barthélemy","Cordier","Pichon","Lejeune","Gilbert","Lamy","Delaunay","Pasquier","Carlier","LaporteLaporte"]
      },

      // Data taken from https://github.com/umpirsky/country-list/blob/master/data/en_US/country.json
      countries: [{"name":"Afghanistan","abbreviation":"AF"},{"name":"Åland Islands","abbreviation":"AX"},{"name":"Albania","abbreviation":"AL"},{"name":"Algeria","abbreviation":"DZ"},{"name":"American Samoa","abbreviation":"AS"},{"name":"Andorra","abbreviation":"AD"},{"name":"Angola","abbreviation":"AO"},{"name":"Anguilla","abbreviation":"AI"},{"name":"Antarctica","abbreviation":"AQ"},{"name":"Antigua & Barbuda","abbreviation":"AG"},{"name":"Argentina","abbreviation":"AR"},{"name":"Armenia","abbreviation":"AM"},{"name":"Aruba","abbreviation":"AW"},{"name":"Ascension Island","abbreviation":"AC"},{"name":"Australia","abbreviation":"AU"},{"name":"Austria","abbreviation":"AT"},{"name":"Azerbaijan","abbreviation":"AZ"},{"name":"Bahamas","abbreviation":"BS"},{"name":"Bahrain","abbreviation":"BH"},{"name":"Bangladesh","abbreviation":"BD"},{"name":"Barbados","abbreviation":"BB"},{"name":"Belarus","abbreviation":"BY"},{"name":"Belgium","abbreviation":"BE"},{"name":"Belize","abbreviation":"BZ"},{"name":"Benin","abbreviation":"BJ"},{"name":"Bermuda","abbreviation":"BM"},{"name":"Bhutan","abbreviation":"BT"},{"name":"Bolivia","abbreviation":"BO"},{"name":"Bosnia & Herzegovina","abbreviation":"BA"},{"name":"Botswana","abbreviation":"BW"},{"name":"Brazil","abbreviation":"BR"},{"name":"British Indian Ocean Territory","abbreviation":"IO"},{"name":"British Virgin Islands","abbreviation":"VG"},{"name":"Brunei","abbreviation":"BN"},{"name":"Bulgaria","abbreviation":"BG"},{"name":"Burkina Faso","abbreviation":"BF"},{"name":"Burundi","abbreviation":"BI"},{"name":"Cambodia","abbreviation":"KH"},{"name":"Cameroon","abbreviation":"CM"},{"name":"Canada","abbreviation":"CA"},{"name":"Canary Islands","abbreviation":"IC"},{"name":"Cape Verde","abbreviation":"CV"},{"name":"Caribbean Netherlands","abbreviation":"BQ"},{"name":"Cayman Islands","abbreviation":"KY"},{"name":"Central African Republic","abbreviation":"CF"},{"name":"Ceuta & Melilla","abbreviation":"EA"},{"name":"Chad","abbreviation":"TD"},{"name":"Chile","abbreviation":"CL"},{"name":"China","abbreviation":"CN"},{"name":"Christmas Island","abbreviation":"CX"},{"name":"Cocos (Keeling) Islands","abbreviation":"CC"},{"name":"Colombia","abbreviation":"CO"},{"name":"Comoros","abbreviation":"KM"},{"name":"Congo - Brazzaville","abbreviation":"CG"},{"name":"Congo - Kinshasa","abbreviation":"CD"},{"name":"Cook Islands","abbreviation":"CK"},{"name":"Costa Rica","abbreviation":"CR"},{"name":"Côte d'Ivoire","abbreviation":"CI"},{"name":"Croatia","abbreviation":"HR"},{"name":"Cuba","abbreviation":"CU"},{"name":"Curaçao","abbreviation":"CW"},{"name":"Cyprus","abbreviation":"CY"},{"name":"Czech Republic","abbreviation":"CZ"},{"name":"Denmark","abbreviation":"DK"},{"name":"Diego Garcia","abbreviation":"DG"},{"name":"Djibouti","abbreviation":"DJ"},{"name":"Dominica","abbreviation":"DM"},{"name":"Dominican Republic","abbreviation":"DO"},{"name":"Ecuador","abbreviation":"EC"},{"name":"Egypt","abbreviation":"EG"},{"name":"El Salvador","abbreviation":"SV"},{"name":"Equatorial Guinea","abbreviation":"GQ"},{"name":"Eritrea","abbreviation":"ER"},{"name":"Estonia","abbreviation":"EE"},{"name":"Ethiopia","abbreviation":"ET"},{"name":"Falkland Islands","abbreviation":"FK"},{"name":"Faroe Islands","abbreviation":"FO"},{"name":"Fiji","abbreviation":"FJ"},{"name":"Finland","abbreviation":"FI"},{"name":"France","abbreviation":"FR"},{"name":"French Guiana","abbreviation":"GF"},{"name":"French Polynesia","abbreviation":"PF"},{"name":"French Southern Territories","abbreviation":"TF"},{"name":"Gabon","abbreviation":"GA"},{"name":"Gambia","abbreviation":"GM"},{"name":"Georgia","abbreviation":"GE"},{"name":"Germany","abbreviation":"DE"},{"name":"Ghana","abbreviation":"GH"},{"name":"Gibraltar","abbreviation":"GI"},{"name":"Greece","abbreviation":"GR"},{"name":"Greenland","abbreviation":"GL"},{"name":"Grenada","abbreviation":"GD"},{"name":"Guadeloupe","abbreviation":"GP"},{"name":"Guam","abbreviation":"GU"},{"name":"Guatemala","abbreviation":"GT"},{"name":"Guernsey","abbreviation":"GG"},{"name":"Guinea","abbreviation":"GN"},{"name":"Guinea-Bissau","abbreviation":"GW"},{"name":"Guyana","abbreviation":"GY"},{"name":"Haiti","abbreviation":"HT"},{"name":"Honduras","abbreviation":"HN"},{"name":"Hong Kong SAR China","abbreviation":"HK"},{"name":"Hungary","abbreviation":"HU"},{"name":"Iceland","abbreviation":"IS"},{"name":"India","abbreviation":"IN"},{"name":"Indonesia","abbreviation":"ID"},{"name":"Iran","abbreviation":"IR"},{"name":"Iraq","abbreviation":"IQ"},{"name":"Ireland","abbreviation":"IE"},{"name":"Isle of Man","abbreviation":"IM"},{"name":"Israel","abbreviation":"IL"},{"name":"Italy","abbreviation":"IT"},{"name":"Jamaica","abbreviation":"JM"},{"name":"Japan","abbreviation":"JP"},{"name":"Jersey","abbreviation":"JE"},{"name":"Jordan","abbreviation":"JO"},{"name":"Kazakhstan","abbreviation":"KZ"},{"name":"Kenya","abbreviation":"KE"},{"name":"Kiribati","abbreviation":"KI"},{"name":"Kosovo","abbreviation":"XK"},{"name":"Kuwait","abbreviation":"KW"},{"name":"Kyrgyzstan","abbreviation":"KG"},{"name":"Laos","abbreviation":"LA"},{"name":"Latvia","abbreviation":"LV"},{"name":"Lebanon","abbreviation":"LB"},{"name":"Lesotho","abbreviation":"LS"},{"name":"Liberia","abbreviation":"LR"},{"name":"Libya","abbreviation":"LY"},{"name":"Liechtenstein","abbreviation":"LI"},{"name":"Lithuania","abbreviation":"LT"},{"name":"Luxembourg","abbreviation":"LU"},{"name":"Macau SAR China","abbreviation":"MO"},{"name":"Macedonia","abbreviation":"MK"},{"name":"Madagascar","abbreviation":"MG"},{"name":"Malawi","abbreviation":"MW"},{"name":"Malaysia","abbreviation":"MY"},{"name":"Maldives","abbreviation":"MV"},{"name":"Mali","abbreviation":"ML"},{"name":"Malta","abbreviation":"MT"},{"name":"Marshall Islands","abbreviation":"MH"},{"name":"Martinique","abbreviation":"MQ"},{"name":"Mauritania","abbreviation":"MR"},{"name":"Mauritius","abbreviation":"MU"},{"name":"Mayotte","abbreviation":"YT"},{"name":"Mexico","abbreviation":"MX"},{"name":"Micronesia","abbreviation":"FM"},{"name":"Moldova","abbreviation":"MD"},{"name":"Monaco","abbreviation":"MC"},{"name":"Mongolia","abbreviation":"MN"},{"name":"Montenegro","abbreviation":"ME"},{"name":"Montserrat","abbreviation":"MS"},{"name":"Morocco","abbreviation":"MA"},{"name":"Mozambique","abbreviation":"MZ"},{"name":"Myanmar (Burma)","abbreviation":"MM"},{"name":"Namibia","abbreviation":"NA"},{"name":"Nauru","abbreviation":"NR"},{"name":"Nepal","abbreviation":"NP"},{"name":"Netherlands","abbreviation":"NL"},{"name":"New Caledonia","abbreviation":"NC"},{"name":"New Zealand","abbreviation":"NZ"},{"name":"Nicaragua","abbreviation":"NI"},{"name":"Niger","abbreviation":"NE"},{"name":"Nigeria","abbreviation":"NG"},{"name":"Niue","abbreviation":"NU"},{"name":"Norfolk Island","abbreviation":"NF"},{"name":"North Korea","abbreviation":"KP"},{"name":"Northern Mariana Islands","abbreviation":"MP"},{"name":"Norway","abbreviation":"NO"},{"name":"Oman","abbreviation":"OM"},{"name":"Pakistan","abbreviation":"PK"},{"name":"Palau","abbreviation":"PW"},{"name":"Palestinian Territories","abbreviation":"PS"},{"name":"Panama","abbreviation":"PA"},{"name":"Papua New Guinea","abbreviation":"PG"},{"name":"Paraguay","abbreviation":"PY"},{"name":"Peru","abbreviation":"PE"},{"name":"Philippines","abbreviation":"PH"},{"name":"Pitcairn Islands","abbreviation":"PN"},{"name":"Poland","abbreviation":"PL"},{"name":"Portugal","abbreviation":"PT"},{"name":"Puerto Rico","abbreviation":"PR"},{"name":"Qatar","abbreviation":"QA"},{"name":"Réunion","abbreviation":"RE"},{"name":"Romania","abbreviation":"RO"},{"name":"Russia","abbreviation":"RU"},{"name":"Rwanda","abbreviation":"RW"},{"name":"Samoa","abbreviation":"WS"},{"name":"San Marino","abbreviation":"SM"},{"name":"São Tomé and Príncipe","abbreviation":"ST"},{"name":"Saudi Arabia","abbreviation":"SA"},{"name":"Senegal","abbreviation":"SN"},{"name":"Serbia","abbreviation":"RS"},{"name":"Seychelles","abbreviation":"SC"},{"name":"Sierra Leone","abbreviation":"SL"},{"name":"Singapore","abbreviation":"SG"},{"name":"Sint Maarten","abbreviation":"SX"},{"name":"Slovakia","abbreviation":"SK"},{"name":"Slovenia","abbreviation":"SI"},{"name":"Solomon Islands","abbreviation":"SB"},{"name":"Somalia","abbreviation":"SO"},{"name":"South Africa","abbreviation":"ZA"},{"name":"South Georgia & South Sandwich Islands","abbreviation":"GS"},{"name":"South Korea","abbreviation":"KR"},{"name":"South Sudan","abbreviation":"SS"},{"name":"Spain","abbreviation":"ES"},{"name":"Sri Lanka","abbreviation":"LK"},{"name":"St. Barthélemy","abbreviation":"BL"},{"name":"St. Helena","abbreviation":"SH"},{"name":"St. Kitts & Nevis","abbreviation":"KN"},{"name":"St. Lucia","abbreviation":"LC"},{"name":"St. Martin","abbreviation":"MF"},{"name":"St. Pierre & Miquelon","abbreviation":"PM"},{"name":"St. Vincent & Grenadines","abbreviation":"VC"},{"name":"Sudan","abbreviation":"SD"},{"name":"Suriname","abbreviation":"SR"},{"name":"Svalbard & Jan Mayen","abbreviation":"SJ"},{"name":"Swaziland","abbreviation":"SZ"},{"name":"Sweden","abbreviation":"SE"},{"name":"Switzerland","abbreviation":"CH"},{"name":"Syria","abbreviation":"SY"},{"name":"Taiwan","abbreviation":"TW"},{"name":"Tajikistan","abbreviation":"TJ"},{"name":"Tanzania","abbreviation":"TZ"},{"name":"Thailand","abbreviation":"TH"},{"name":"Timor-Leste","abbreviation":"TL"},{"name":"Togo","abbreviation":"TG"},{"name":"Tokelau","abbreviation":"TK"},{"name":"Tonga","abbreviation":"TO"},{"name":"Trinidad & Tobago","abbreviation":"TT"},{"name":"Tristan da Cunha","abbreviation":"TA"},{"name":"Tunisia","abbreviation":"TN"},{"name":"Turkey","abbreviation":"TR"},{"name":"Turkmenistan","abbreviation":"TM"},{"name":"Turks & Caicos Islands","abbreviation":"TC"},{"name":"Tuvalu","abbreviation":"TV"},{"name":"U.S. Outlying Islands","abbreviation":"UM"},{"name":"U.S. Virgin Islands","abbreviation":"VI"},{"name":"Uganda","abbreviation":"UG"},{"name":"Ukraine","abbreviation":"UA"},{"name":"United Arab Emirates","abbreviation":"AE"},{"name":"United Kingdom","abbreviation":"GB"},{"name":"United States","abbreviation":"US"},{"name":"Uruguay","abbreviation":"UY"},{"name":"Uzbekistan","abbreviation":"UZ"},{"name":"Vanuatu","abbreviation":"VU"},{"name":"Vatican City","abbreviation":"VA"},{"name":"Venezuela","abbreviation":"VE"},{"name":"Vietnam","abbreviation":"VN"},{"name":"Wallis & Futuna","abbreviation":"WF"},{"name":"Western Sahara","abbreviation":"EH"},{"name":"Yemen","abbreviation":"YE"},{"name":"Zambia","abbreviation":"ZM"},{"name":"Zimbabwe","abbreviation":"ZW"}],

              counties: {
          // Data taken from http://www.downloadexcelfiles.com/gb_en/download-excel-file-list-counties-uk
          "uk": [
              {name: 'Bath and North East Somerset'},
              {name: 'Aberdeenshire'},
              {name: 'Anglesey'},
              {name: 'Angus'},
              {name: 'Bedford'},
              {name: 'Blackburn with Darwen'},
              {name: 'Blackpool'},
              {name: 'Bournemouth'},
              {name: 'Bracknell Forest'},
              {name: 'Brighton & Hove'},
              {name: 'Bristol'},
              {name: 'Buckinghamshire'},
              {name: 'Cambridgeshire'},
              {name: 'Carmarthenshire'},
              {name: 'Central Bedfordshire'},
              {name: 'Ceredigion'},
              {name: 'Cheshire East'},
              {name: 'Cheshire West and Chester'},
              {name: 'Clackmannanshire'},
              {name: 'Conwy'},
              {name: 'Cornwall'},
              {name: 'County Antrim'},
              {name: 'County Armagh'},
              {name: 'County Down'},
              {name: 'County Durham'},
              {name: 'County Fermanagh'},
              {name: 'County Londonderry'},
              {name: 'County Tyrone'},
              {name: 'Cumbria'},
              {name: 'Darlington'},
              {name: 'Denbighshire'},
              {name: 'Derby'},
              {name: 'Derbyshire'},
              {name: 'Devon'},
              {name: 'Dorset'},
              {name: 'Dumfries and Galloway'},
              {name: 'Dundee'},
              {name: 'East Lothian'},
              {name: 'East Riding of Yorkshire'},
              {name: 'East Sussex'},
              {name: 'Edinburgh?'},
              {name: 'Essex'},
              {name: 'Falkirk'},
              {name: 'Fife'},
              {name: 'Flintshire'},
              {name: 'Gloucestershire'},
              {name: 'Greater London'},
              {name: 'Greater Manchester'},
              {name: 'Gwent'},
              {name: 'Gwynedd'},
              {name: 'Halton'},
              {name: 'Hampshire'},
              {name: 'Hartlepool'},
              {name: 'Herefordshire'},
              {name: 'Hertfordshire'},
              {name: 'Highlands'},
              {name: 'Hull'},
              {name: 'Isle of Wight'},
              {name: 'Isles of Scilly'},
              {name: 'Kent'},
              {name: 'Lancashire'},
              {name: 'Leicester'},
              {name: 'Leicestershire'},
              {name: 'Lincolnshire'},
              {name: 'Lothian'},
              {name: 'Luton'},
              {name: 'Medway'},
              {name: 'Merseyside'},
              {name: 'Mid Glamorgan'},
              {name: 'Middlesbrough'},
              {name: 'Milton Keynes'},
              {name: 'Monmouthshire'},
              {name: 'Moray'},
              {name: 'Norfolk'},
              {name: 'North East Lincolnshire'},
              {name: 'North Lincolnshire'},
              {name: 'North Somerset'},
              {name: 'North Yorkshire'},
              {name: 'Northamptonshire'},
              {name: 'Northumberland'},
              {name: 'Nottingham'},
              {name: 'Nottinghamshire'},
              {name: 'Oxfordshire'},
              {name: 'Pembrokeshire'},
              {name: 'Perth and Kinross'},
              {name: 'Peterborough'},
              {name: 'Plymouth'},
              {name: 'Poole'},
              {name: 'Portsmouth'},
              {name: 'Powys'},
              {name: 'Reading'},
              {name: 'Redcar and Cleveland'},
              {name: 'Rutland'},
              {name: 'Scottish Borders'},
              {name: 'Shropshire'},
              {name: 'Slough'},
              {name: 'Somerset'},
              {name: 'South Glamorgan'},
              {name: 'South Gloucestershire'},
              {name: 'South Yorkshire'},
              {name: 'Southampton'},
              {name: 'Southend-on-Sea'},
              {name: 'Staffordshire'},
              {name: 'Stirlingshire'},
              {name: 'Stockton-on-Tees'},
              {name: 'Stoke-on-Trent'},
              {name: 'Strathclyde'},
              {name: 'Suffolk'},
              {name: 'Surrey'},
              {name: 'Swindon'},
              {name: 'Telford and Wrekin'},
              {name: 'Thurrock'},
              {name: 'Torbay'},
              {name: 'Tyne and Wear'},
              {name: 'Warrington'},
              {name: 'Warwickshire'},
              {name: 'West Berkshire'},
              {name: 'West Glamorgan'},
              {name: 'West Lothian'},
              {name: 'West Midlands'},
              {name: 'West Sussex'},
              {name: 'West Yorkshire'},
              {name: 'Western Isles'},
              {name: 'Wiltshire'},
              {name: 'Windsor and Maidenhead'},
              {name: 'Wokingham'},
              {name: 'Worcestershire'},
              {name: 'Wrexham'},
              {name: 'York'}]
                              },
      provinces: {
          "ca": [
              {name: 'Alberta', abbreviation: 'AB'},
              {name: 'British Columbia', abbreviation: 'BC'},
              {name: 'Manitoba', abbreviation: 'MB'},
              {name: 'New Brunswick', abbreviation: 'NB'},
              {name: 'Newfoundland and Labrador', abbreviation: 'NL'},
              {name: 'Nova Scotia', abbreviation: 'NS'},
              {name: 'Ontario', abbreviation: 'ON'},
              {name: 'Prince Edward Island', abbreviation: 'PE'},
              {name: 'Quebec', abbreviation: 'QC'},
              {name: 'Saskatchewan', abbreviation: 'SK'},

              // The case could be made that the following are not actually provinces
              // since they are technically considered "territories" however they all
              // look the same on an envelope!
              {name: 'Northwest Territories', abbreviation: 'NT'},
              {name: 'Nunavut', abbreviation: 'NU'},
              {name: 'Yukon', abbreviation: 'YT'}
          ],
          "it": [
              { name: "Agrigento", abbreviation: "AG", code: 84 },
              { name: "Alessandria", abbreviation: "AL", code: 6 },
              { name: "Ancona", abbreviation: "AN", code: 42 },
              { name: "Aosta", abbreviation: "AO", code: 7 },
              { name: "L'Aquila", abbreviation: "AQ", code: 66 },
              { name: "Arezzo", abbreviation: "AR", code: 51 },
              { name: "Ascoli-Piceno", abbreviation: "AP", code: 44 },
              { name: "Asti", abbreviation: "AT", code: 5 },
              { name: "Avellino", abbreviation: "AV", code: 64 },
              { name: "Bari", abbreviation: "BA", code: 72 },
              { name: "Barletta-Andria-Trani", abbreviation: "BT", code: 72 },
              { name: "Belluno", abbreviation: "BL", code: 25 },
              { name: "Benevento", abbreviation: "BN", code: 62 },
              { name: "Bergamo", abbreviation: "BG", code: 16 },
              { name: "Biella", abbreviation: "BI", code: 96 },
              { name: "Bologna", abbreviation: "BO", code: 37 },
              { name: "Bolzano", abbreviation: "BZ", code: 21 },
              { name: "Brescia", abbreviation: "BS", code: 17 },
              { name: "Brindisi", abbreviation: "BR", code: 74 },
              { name: "Cagliari", abbreviation: "CA", code: 92 },
              { name: "Caltanissetta", abbreviation: "CL", code: 85 },
              { name: "Campobasso", abbreviation: "CB", code: 70 },
              { name: "Carbonia Iglesias", abbreviation: "CI", code: 70 },
              { name: "Caserta", abbreviation: "CE", code: 61 },
              { name: "Catania", abbreviation: "CT", code: 87 },
              { name: "Catanzaro", abbreviation: "CZ", code: 79 },
              { name: "Chieti", abbreviation: "CH", code: 69 },
              { name: "Como", abbreviation: "CO", code: 13 },
              { name: "Cosenza", abbreviation: "CS", code: 78 },
              { name: "Cremona", abbreviation: "CR", code: 19 },
              { name: "Crotone", abbreviation: "KR", code: 101 },
              { name: "Cuneo", abbreviation: "CN", code: 4 },
              { name: "Enna", abbreviation: "EN", code: 86 },
              { name: "Fermo", abbreviation: "FM", code: 86 },
              { name: "Ferrara", abbreviation: "FE", code: 38 },
              { name: "Firenze", abbreviation: "FI", code: 48 },
              { name: "Foggia", abbreviation: "FG", code: 71 },
              { name: "Forli-Cesena", abbreviation: "FC", code: 71 },
              { name: "Frosinone", abbreviation: "FR", code: 60 },
              { name: "Genova", abbreviation: "GE", code: 10 },
              { name: "Gorizia", abbreviation: "GO", code: 31 },
              { name: "Grosseto", abbreviation: "GR", code: 53 },
              { name: "Imperia", abbreviation: "IM", code: 8 },
              { name: "Isernia", abbreviation: "IS", code: 94 },
              { name: "La-Spezia", abbreviation: "SP", code: 66 },
              { name: "Latina", abbreviation: "LT", code: 59 },
              { name: "Lecce", abbreviation: "LE", code: 75 },
              { name: "Lecco", abbreviation: "LC", code: 97 },
              { name: "Livorno", abbreviation: "LI", code: 49 },
              { name: "Lodi", abbreviation: "LO", code: 98 },
              { name: "Lucca", abbreviation: "LU", code: 46 },
              { name: "Macerata", abbreviation: "MC", code: 43 },
              { name: "Mantova", abbreviation: "MN", code: 20 },
              { name: "Massa-Carrara", abbreviation: "MS", code: 45 },
              { name: "Matera", abbreviation: "MT", code: 77 },
              { name: "Medio Campidano", abbreviation: "VS", code: 77 },
              { name: "Messina", abbreviation: "ME", code: 83 },
              { name: "Milano", abbreviation: "MI", code: 15 },
              { name: "Modena", abbreviation: "MO", code: 36 },
              { name: "Monza-Brianza", abbreviation: "MB", code: 36 },
              { name: "Napoli", abbreviation: "NA", code: 63 },
              { name: "Novara", abbreviation: "NO", code: 3 },
              { name: "Nuoro", abbreviation: "NU", code: 91 },
              { name: "Ogliastra", abbreviation: "OG", code: 91 },
              { name: "Olbia Tempio", abbreviation: "OT", code: 91 },
              { name: "Oristano", abbreviation: "OR", code: 95 },
              { name: "Padova", abbreviation: "PD", code: 28 },
              { name: "Palermo", abbreviation: "PA", code: 82 },
              { name: "Parma", abbreviation: "PR", code: 34 },
              { name: "Pavia", abbreviation: "PV", code: 18 },
              { name: "Perugia", abbreviation: "PG", code: 54 },
              { name: "Pesaro-Urbino", abbreviation: "PU", code: 41 },
              { name: "Pescara", abbreviation: "PE", code: 68 },
              { name: "Piacenza", abbreviation: "PC", code: 33 },
              { name: "Pisa", abbreviation: "PI", code: 50 },
              { name: "Pistoia", abbreviation: "PT", code: 47 },
              { name: "Pordenone", abbreviation: "PN", code: 93 },
              { name: "Potenza", abbreviation: "PZ", code: 76 },
              { name: "Prato", abbreviation: "PO", code: 100 },
              { name: "Ragusa", abbreviation: "RG", code: 88 },
              { name: "Ravenna", abbreviation: "RA", code: 39 },
              { name: "Reggio-Calabria", abbreviation: "RC", code: 35 },
              { name: "Reggio-Emilia", abbreviation: "RE", code: 35 },
              { name: "Rieti", abbreviation: "RI", code: 57 },
              { name: "Rimini", abbreviation: "RN", code: 99 },
              { name: "Roma", abbreviation: "Roma", code: 58 },
              { name: "Rovigo", abbreviation: "RO", code: 29 },
              { name: "Salerno", abbreviation: "SA", code: 65 },
              { name: "Sassari", abbreviation: "SS", code: 90 },
              { name: "Savona", abbreviation: "SV", code: 9 },
              { name: "Siena", abbreviation: "SI", code: 52 },
              { name: "Siracusa", abbreviation: "SR", code: 89 },
              { name: "Sondrio", abbreviation: "SO", code: 14 },
              { name: "Taranto", abbreviation: "TA", code: 73 },
              { name: "Teramo", abbreviation: "TE", code: 67 },
              { name: "Terni", abbreviation: "TR", code: 55 },
              { name: "Torino", abbreviation: "TO", code: 1 },
              { name: "Trapani", abbreviation: "TP", code: 81 },
              { name: "Trento", abbreviation: "TN", code: 22 },
              { name: "Treviso", abbreviation: "TV", code: 26 },
              { name: "Trieste", abbreviation: "TS", code: 32 },
              { name: "Udine", abbreviation: "UD", code: 30 },
              { name: "Varese", abbreviation: "VA", code: 12 },
              { name: "Venezia", abbreviation: "VE", code: 27 },
              { name: "Verbania", abbreviation: "VB", code: 27 },
              { name: "Vercelli", abbreviation: "VC", code: 2 },
              { name: "Verona", abbreviation: "VR", code: 23 },
              { name: "Vibo-Valentia", abbreviation: "VV", code: 102 },
              { name: "Vicenza", abbreviation: "VI", code: 24 },
              { name: "Viterbo", abbreviation: "VT", code: 56 }
          ]
      },

          // from: https://github.com/samsargent/Useful-Autocomplete-Data/blob/master/data/nationalities.json
      nationalities: [
         {name: 'Afghan'},
         {name: 'Albanian'},
         {name: 'Algerian'},
         {name: 'American'},
         {name: 'Andorran'},
         {name: 'Angolan'},
         {name: 'Antiguans'},
         {name: 'Argentinean'},
         {name: 'Armenian'},
         {name: 'Australian'},
         {name: 'Austrian'},
         {name: 'Azerbaijani'},
         {name: 'Bahami'},
         {name: 'Bahraini'},
         {name: 'Bangladeshi'},
         {name: 'Barbadian'},
         {name: 'Barbudans'},
         {name: 'Batswana'},
         {name: 'Belarusian'},
         {name: 'Belgian'},
         {name: 'Belizean'},
         {name: 'Beninese'},
         {name: 'Bhutanese'},
         {name: 'Bolivian'},
         {name: 'Bosnian'},
         {name: 'Brazilian'},
         {name: 'British'},
         {name: 'Bruneian'},
         {name: 'Bulgarian'},
         {name: 'Burkinabe'},
         {name: 'Burmese'},
         {name: 'Burundian'},
         {name: 'Cambodian'},
         {name: 'Cameroonian'},
         {name: 'Canadian'},
         {name: 'Cape Verdean'},
         {name: 'Central African'},
         {name: 'Chadian'},
         {name: 'Chilean'},
         {name: 'Chinese'},
         {name: 'Colombian'},
         {name: 'Comoran'},
         {name: 'Congolese'},
         {name: 'Costa Rican'},
         {name: 'Croatian'},
         {name: 'Cuban'},
         {name: 'Cypriot'},
         {name: 'Czech'},
         {name: 'Danish'},
         {name: 'Djibouti'},
         {name: 'Dominican'},
         {name: 'Dutch'},
         {name: 'East Timorese'},
         {name: 'Ecuadorean'},
         {name: 'Egyptian'},
         {name: 'Emirian'},
         {name: 'Equatorial Guinean'},
         {name: 'Eritrean'},
         {name: 'Estonian'},
         {name: 'Ethiopian'},
         {name: 'Fijian'},
         {name: 'Filipino'},
         {name: 'Finnish'},
         {name: 'French'},
         {name: 'Gabonese'},
         {name: 'Gambian'},
         {name: 'Georgian'},
         {name: 'German'},
         {name: 'Ghanaian'},
         {name: 'Greek'},
         {name: 'Grenadian'},
         {name: 'Guatemalan'},
         {name: 'Guinea-Bissauan'},
         {name: 'Guinean'},
         {name: 'Guyanese'},
         {name: 'Haitian'},
         {name: 'Herzegovinian'},
         {name: 'Honduran'},
         {name: 'Hungarian'},
         {name: 'I-Kiribati'},
         {name: 'Icelander'},
         {name: 'Indian'},
         {name: 'Indonesian'},
         {name: 'Iranian'},
         {name: 'Iraqi'},
         {name: 'Irish'},
         {name: 'Israeli'},
         {name: 'Italian'},
         {name: 'Ivorian'},
         {name: 'Jamaican'},
         {name: 'Japanese'},
         {name: 'Jordanian'},
         {name: 'Kazakhstani'},
         {name: 'Kenyan'},
         {name: 'Kittian and Nevisian'},
         {name: 'Kuwaiti'},
         {name: 'Kyrgyz'},
         {name: 'Laotian'},
         {name: 'Latvian'},
         {name: 'Lebanese'},
         {name: 'Liberian'},
         {name: 'Libyan'},
         {name: 'Liechtensteiner'},
         {name: 'Lithuanian'},
         {name: 'Luxembourger'},
         {name: 'Macedonian'},
         {name: 'Malagasy'},
         {name: 'Malawian'},
         {name: 'Malaysian'},
         {name: 'Maldivan'},
         {name: 'Malian'},
         {name: 'Maltese'},
         {name: 'Marshallese'},
         {name: 'Mauritanian'},
         {name: 'Mauritian'},
         {name: 'Mexican'},
         {name: 'Micronesian'},
         {name: 'Moldovan'},
         {name: 'Monacan'},
         {name: 'Mongolian'},
         {name: 'Moroccan'},
         {name: 'Mosotho'},
         {name: 'Motswana'},
         {name: 'Mozambican'},
         {name: 'Namibian'},
         {name: 'Nauruan'},
         {name: 'Nepalese'},
         {name: 'New Zealander'},
         {name: 'Nicaraguan'},
         {name: 'Nigerian'},
         {name: 'Nigerien'},
         {name: 'North Korean'},
         {name: 'Northern Irish'},
         {name: 'Norwegian'},
         {name: 'Omani'},
         {name: 'Pakistani'},
         {name: 'Palauan'},
         {name: 'Panamanian'},
         {name: 'Papua New Guinean'},
         {name: 'Paraguayan'},
         {name: 'Peruvian'},
         {name: 'Polish'},
         {name: 'Portuguese'},
         {name: 'Qatari'},
         {name: 'Romani'},
         {name: 'Russian'},
         {name: 'Rwandan'},
         {name: 'Saint Lucian'},
         {name: 'Salvadoran'},
         {name: 'Samoan'},
         {name: 'San Marinese'},
         {name: 'Sao Tomean'},
         {name: 'Saudi'},
         {name: 'Scottish'},
         {name: 'Senegalese'},
         {name: 'Serbian'},
         {name: 'Seychellois'},
         {name: 'Sierra Leonean'},
         {name: 'Singaporean'},
         {name: 'Slovakian'},
         {name: 'Slovenian'},
         {name: 'Solomon Islander'},
         {name: 'Somali'},
         {name: 'South African'},
         {name: 'South Korean'},
         {name: 'Spanish'},
         {name: 'Sri Lankan'},
         {name: 'Sudanese'},
         {name: 'Surinamer'},
         {name: 'Swazi'},
         {name: 'Swedish'},
         {name: 'Swiss'},
         {name: 'Syrian'},
         {name: 'Taiwanese'},
         {name: 'Tajik'},
         {name: 'Tanzanian'},
         {name: 'Thai'},
         {name: 'Togolese'},
         {name: 'Tongan'},
         {name: 'Trinidadian or Tobagonian'},
         {name: 'Tunisian'},
         {name: 'Turkish'},
         {name: 'Tuvaluan'},
         {name: 'Ugandan'},
         {name: 'Ukrainian'},
         {name: 'Uruguaya'},
         {name: 'Uzbekistani'},
         {name: 'Venezuela'},
         {name: 'Vietnamese'},
         {name: 'Wels'},
         {name: 'Yemenit'},
         {name: 'Zambia'},
         {name: 'Zimbabwe'},
      ],
        // http://www.loc.gov/standards/iso639-2/php/code_list.php (ISO-639-1 codes)
      locale_languages: [
        "aa",
        "ab",
        "ae",
        "af",
        "ak",
        "am",
        "an",
        "ar",
        "as",
        "av",
        "ay",
        "az",
        "ba",
        "be",
        "bg",
        "bh",
        "bi",
        "bm",
        "bn",
        "bo",
        "br",
        "bs",
        "ca",
        "ce",
        "ch",
        "co",
        "cr",
        "cs",
        "cu",
        "cv",
        "cy",
        "da",
        "de",
        "dv",
        "dz",
        "ee",
        "el",
        "en",
        "eo",
        "es",
        "et",
        "eu",
        "fa",
        "ff",
        "fi",
        "fj",
        "fo",
        "fr",
        "fy",
        "ga",
        "gd",
        "gl",
        "gn",
        "gu",
        "gv",
        "ha",
        "he",
        "hi",
        "ho",
        "hr",
        "ht",
        "hu",
        "hy",
        "hz",
        "ia",
        "id",
        "ie",
        "ig",
        "ii",
        "ik",
        "io",
        "is",
        "it",
        "iu",
        "ja",
        "jv",
        "ka",
        "kg",
        "ki",
        "kj",
        "kk",
        "kl",
        "km",
        "kn",
        "ko",
        "kr",
        "ks",
        "ku",
        "kv",
        "kw",
        "ky",
        "la",
        "lb",
        "lg",
        "li",
        "ln",
        "lo",
        "lt",
        "lu",
        "lv",
        "mg",
        "mh",
        "mi",
        "mk",
        "ml",
        "mn",
        "mr",
        "ms",
        "mt",
        "my",
        "na",
        "nb",
        "nd",
        "ne",
        "ng",
        "nl",
        "nn",
        "no",
        "nr",
        "nv",
        "ny",
        "oc",
        "oj",
        "om",
        "or",
        "os",
        "pa",
        "pi",
        "pl",
        "ps",
        "pt",
        "qu",
        "rm",
        "rn",
        "ro",
        "ru",
        "rw",
        "sa",
        "sc",
        "sd",
        "se",
        "sg",
        "si",
        "sk",
        "sl",
        "sm",
        "sn",
        "so",
        "sq",
        "sr",
        "ss",
        "st",
        "su",
        "sv",
        "sw",
        "ta",
        "te",
        "tg",
        "th",
        "ti",
        "tk",
        "tl",
        "tn",
        "to",
        "tr",
        "ts",
        "tt",
        "tw",
        "ty",
        "ug",
        "uk",
        "ur",
        "uz",
        "ve",
        "vi",
        "vo",
        "wa",
        "wo",
        "xh",
        "yi",
        "yo",
        "za",
        "zh",
        "zu"
      ],

      // From http://data.okfn.org/data/core/language-codes#resource-language-codes-full (IETF language tags)
      locale_regions: [
        "agq-CM",
        "asa-TZ",
        "ast-ES",
        "bas-CM",
        "bem-ZM",
        "bez-TZ",
        "brx-IN",
        "cgg-UG",
        "chr-US",
        "dav-KE",
        "dje-NE",
        "dsb-DE",
        "dua-CM",
        "dyo-SN",
        "ebu-KE",
        "ewo-CM",
        "fil-PH",
        "fur-IT",
        "gsw-CH",
        "gsw-FR",
        "gsw-LI",
        "guz-KE",
        "haw-US",
        "hsb-DE",
        "jgo-CM",
        "jmc-TZ",
        "kab-DZ",
        "kam-KE",
        "kde-TZ",
        "kea-CV",
        "khq-ML",
        "kkj-CM",
        "kln-KE",
        "kok-IN",
        "ksb-TZ",
        "ksf-CM",
        "ksh-DE",
        "lag-TZ",
        "lkt-US",
        "luo-KE",
        "luy-KE",
        "mas-KE",
        "mas-TZ",
        "mer-KE",
        "mfe-MU",
        "mgh-MZ",
        "mgo-CM",
        "mua-CM",
        "naq-NA",
        "nmg-CM",
        "nnh-CM",
        "nus-SD",
        "nyn-UG",
        "rof-TZ",
        "rwk-TZ",
        "sah-RU",
        "saq-KE",
        "sbp-TZ",
        "seh-MZ",
        "ses-ML",
        "shi-Latn",
        "shi-Latn-MA",
        "shi-Tfng",
        "shi-Tfng-MA",
        "smn-FI",
        "teo-KE",
        "teo-UG",
        "twq-NE",
        "tzm-Latn",
        "tzm-Latn-MA",
        "vai-Latn",
        "vai-Latn-LR",
        "vai-Vaii",
        "vai-Vaii-LR",
        "vun-TZ",
        "wae-CH",
        "xog-UG",
        "yav-CM",
        "zgh-MA",
        "af-NA",
        "af-ZA",
        "ak-GH",
        "am-ET",
        "ar-001",
        "ar-AE",
        "ar-BH",
        "ar-DJ",
        "ar-DZ",
        "ar-EG",
        "ar-EH",
        "ar-ER",
        "ar-IL",
        "ar-IQ",
        "ar-JO",
        "ar-KM",
        "ar-KW",
        "ar-LB",
        "ar-LY",
        "ar-MA",
        "ar-MR",
        "ar-OM",
        "ar-PS",
        "ar-QA",
        "ar-SA",
        "ar-SD",
        "ar-SO",
        "ar-SS",
        "ar-SY",
        "ar-TD",
        "ar-TN",
        "ar-YE",
        "as-IN",
        "az-Cyrl",
        "az-Cyrl-AZ",
        "az-Latn",
        "az-Latn-AZ",
        "be-BY",
        "bg-BG",
        "bm-Latn",
        "bm-Latn-ML",
        "bn-BD",
        "bn-IN",
        "bo-CN",
        "bo-IN",
        "br-FR",
        "bs-Cyrl",
        "bs-Cyrl-BA",
        "bs-Latn",
        "bs-Latn-BA",
        "ca-AD",
        "ca-ES",
        "ca-ES-VALENCIA",
        "ca-FR",
        "ca-IT",
        "cs-CZ",
        "cy-GB",
        "da-DK",
        "da-GL",
        "de-AT",
        "de-BE",
        "de-CH",
        "de-DE",
        "de-LI",
        "de-LU",
        "dz-BT",
        "ee-GH",
        "ee-TG",
        "el-CY",
        "el-GR",
        "en-001",
        "en-150",
        "en-AG",
        "en-AI",
        "en-AS",
        "en-AU",
        "en-BB",
        "en-BE",
        "en-BM",
        "en-BS",
        "en-BW",
        "en-BZ",
        "en-CA",
        "en-CC",
        "en-CK",
        "en-CM",
        "en-CX",
        "en-DG",
        "en-DM",
        "en-ER",
        "en-FJ",
        "en-FK",
        "en-FM",
        "en-GB",
        "en-GD",
        "en-GG",
        "en-GH",
        "en-GI",
        "en-GM",
        "en-GU",
        "en-GY",
        "en-HK",
        "en-IE",
        "en-IM",
        "en-IN",
        "en-IO",
        "en-JE",
        "en-JM",
        "en-KE",
        "en-KI",
        "en-KN",
        "en-KY",
        "en-LC",
        "en-LR",
        "en-LS",
        "en-MG",
        "en-MH",
        "en-MO",
        "en-MP",
        "en-MS",
        "en-MT",
        "en-MU",
        "en-MW",
        "en-MY",
        "en-NA",
        "en-NF",
        "en-NG",
        "en-NR",
        "en-NU",
        "en-NZ",
        "en-PG",
        "en-PH",
        "en-PK",
        "en-PN",
        "en-PR",
        "en-PW",
        "en-RW",
        "en-SB",
        "en-SC",
        "en-SD",
        "en-SG",
        "en-SH",
        "en-SL",
        "en-SS",
        "en-SX",
        "en-SZ",
        "en-TC",
        "en-TK",
        "en-TO",
        "en-TT",
        "en-TV",
        "en-TZ",
        "en-UG",
        "en-UM",
        "en-US",
        "en-US-POSIX",
        "en-VC",
        "en-VG",
        "en-VI",
        "en-VU",
        "en-WS",
        "en-ZA",
        "en-ZM",
        "en-ZW",
        "eo-001",
        "es-419",
        "es-AR",
        "es-BO",
        "es-CL",
        "es-CO",
        "es-CR",
        "es-CU",
        "es-DO",
        "es-EA",
        "es-EC",
        "es-ES",
        "es-GQ",
        "es-GT",
        "es-HN",
        "es-IC",
        "es-MX",
        "es-NI",
        "es-PA",
        "es-PE",
        "es-PH",
        "es-PR",
        "es-PY",
        "es-SV",
        "es-US",
        "es-UY",
        "es-VE",
        "et-EE",
        "eu-ES",
        "fa-AF",
        "fa-IR",
        "ff-CM",
        "ff-GN",
        "ff-MR",
        "ff-SN",
        "fi-FI",
        "fo-FO",
        "fr-BE",
        "fr-BF",
        "fr-BI",
        "fr-BJ",
        "fr-BL",
        "fr-CA",
        "fr-CD",
        "fr-CF",
        "fr-CG",
        "fr-CH",
        "fr-CI",
        "fr-CM",
        "fr-DJ",
        "fr-DZ",
        "fr-FR",
        "fr-GA",
        "fr-GF",
        "fr-GN",
        "fr-GP",
        "fr-GQ",
        "fr-HT",
        "fr-KM",
        "fr-LU",
        "fr-MA",
        "fr-MC",
        "fr-MF",
        "fr-MG",
        "fr-ML",
        "fr-MQ",
        "fr-MR",
        "fr-MU",
        "fr-NC",
        "fr-NE",
        "fr-PF",
        "fr-PM",
        "fr-RE",
        "fr-RW",
        "fr-SC",
        "fr-SN",
        "fr-SY",
        "fr-TD",
        "fr-TG",
        "fr-TN",
        "fr-VU",
        "fr-WF",
        "fr-YT",
        "fy-NL",
        "ga-IE",
        "gd-GB",
        "gl-ES",
        "gu-IN",
        "gv-IM",
        "ha-Latn",
        "ha-Latn-GH",
        "ha-Latn-NE",
        "ha-Latn-NG",
        "he-IL",
        "hi-IN",
        "hr-BA",
        "hr-HR",
        "hu-HU",
        "hy-AM",
        "id-ID",
        "ig-NG",
        "ii-CN",
        "is-IS",
        "it-CH",
        "it-IT",
        "it-SM",
        "ja-JP",
        "ka-GE",
        "ki-KE",
        "kk-Cyrl",
        "kk-Cyrl-KZ",
        "kl-GL",
        "km-KH",
        "kn-IN",
        "ko-KP",
        "ko-KR",
        "ks-Arab",
        "ks-Arab-IN",
        "kw-GB",
        "ky-Cyrl",
        "ky-Cyrl-KG",
        "lb-LU",
        "lg-UG",
        "ln-AO",
        "ln-CD",
        "ln-CF",
        "ln-CG",
        "lo-LA",
        "lt-LT",
        "lu-CD",
        "lv-LV",
        "mg-MG",
        "mk-MK",
        "ml-IN",
        "mn-Cyrl",
        "mn-Cyrl-MN",
        "mr-IN",
        "ms-Latn",
        "ms-Latn-BN",
        "ms-Latn-MY",
        "ms-Latn-SG",
        "mt-MT",
        "my-MM",
        "nb-NO",
        "nb-SJ",
        "nd-ZW",
        "ne-IN",
        "ne-NP",
        "nl-AW",
        "nl-BE",
        "nl-BQ",
        "nl-CW",
        "nl-NL",
        "nl-SR",
        "nl-SX",
        "nn-NO",
        "om-ET",
        "om-KE",
        "or-IN",
        "os-GE",
        "os-RU",
        "pa-Arab",
        "pa-Arab-PK",
        "pa-Guru",
        "pa-Guru-IN",
        "pl-PL",
        "ps-AF",
        "pt-AO",
        "pt-BR",
        "pt-CV",
        "pt-GW",
        "pt-MO",
        "pt-MZ",
        "pt-PT",
        "pt-ST",
        "pt-TL",
        "qu-BO",
        "qu-EC",
        "qu-PE",
        "rm-CH",
        "rn-BI",
        "ro-MD",
        "ro-RO",
        "ru-BY",
        "ru-KG",
        "ru-KZ",
        "ru-MD",
        "ru-RU",
        "ru-UA",
        "rw-RW",
        "se-FI",
        "se-NO",
        "se-SE",
        "sg-CF",
        "si-LK",
        "sk-SK",
        "sl-SI",
        "sn-ZW",
        "so-DJ",
        "so-ET",
        "so-KE",
        "so-SO",
        "sq-AL",
        "sq-MK",
        "sq-XK",
        "sr-Cyrl",
        "sr-Cyrl-BA",
        "sr-Cyrl-ME",
        "sr-Cyrl-RS",
        "sr-Cyrl-XK",
        "sr-Latn",
        "sr-Latn-BA",
        "sr-Latn-ME",
        "sr-Latn-RS",
        "sr-Latn-XK",
        "sv-AX",
        "sv-FI",
        "sv-SE",
        "sw-CD",
        "sw-KE",
        "sw-TZ",
        "sw-UG",
        "ta-IN",
        "ta-LK",
        "ta-MY",
        "ta-SG",
        "te-IN",
        "th-TH",
        "ti-ER",
        "ti-ET",
        "to-TO",
        "tr-CY",
        "tr-TR",
        "ug-Arab",
        "ug-Arab-CN",
        "uk-UA",
        "ur-IN",
        "ur-PK",
        "uz-Arab",
        "uz-Arab-AF",
        "uz-Cyrl",
        "uz-Cyrl-UZ",
        "uz-Latn",
        "uz-Latn-UZ",
        "vi-VN",
        "yi-001",
        "yo-BJ",
        "yo-NG",
        "zh-Hans",
        "zh-Hans-CN",
        "zh-Hans-HK",
        "zh-Hans-MO",
        "zh-Hans-SG",
        "zh-Hant",
        "zh-Hant-HK",
        "zh-Hant-MO",
        "zh-Hant-TW",
        "zu-ZA"
      ],

      us_states_and_dc: [
          {name: 'Alabama', abbreviation: 'AL'},
          {name: 'Alaska', abbreviation: 'AK'},
          {name: 'Arizona', abbreviation: 'AZ'},
          {name: 'Arkansas', abbreviation: 'AR'},
          {name: 'California', abbreviation: 'CA'},
          {name: 'Colorado', abbreviation: 'CO'},
          {name: 'Connecticut', abbreviation: 'CT'},
          {name: 'Delaware', abbreviation: 'DE'},
          {name: 'District of Columbia', abbreviation: 'DC'},
          {name: 'Florida', abbreviation: 'FL'},
          {name: 'Georgia', abbreviation: 'GA'},
          {name: 'Hawaii', abbreviation: 'HI'},
          {name: 'Idaho', abbreviation: 'ID'},
          {name: 'Illinois', abbreviation: 'IL'},
          {name: 'Indiana', abbreviation: 'IN'},
          {name: 'Iowa', abbreviation: 'IA'},
          {name: 'Kansas', abbreviation: 'KS'},
          {name: 'Kentucky', abbreviation: 'KY'},
          {name: 'Louisiana', abbreviation: 'LA'},
          {name: 'Maine', abbreviation: 'ME'},
          {name: 'Maryland', abbreviation: 'MD'},
          {name: 'Massachusetts', abbreviation: 'MA'},
          {name: 'Michigan', abbreviation: 'MI'},
          {name: 'Minnesota', abbreviation: 'MN'},
          {name: 'Mississippi', abbreviation: 'MS'},
          {name: 'Missouri', abbreviation: 'MO'},
          {name: 'Montana', abbreviation: 'MT'},
          {name: 'Nebraska', abbreviation: 'NE'},
          {name: 'Nevada', abbreviation: 'NV'},
          {name: 'New Hampshire', abbreviation: 'NH'},
          {name: 'New Jersey', abbreviation: 'NJ'},
          {name: 'New Mexico', abbreviation: 'NM'},
          {name: 'New York', abbreviation: 'NY'},
          {name: 'North Carolina', abbreviation: 'NC'},
          {name: 'North Dakota', abbreviation: 'ND'},
          {name: 'Ohio', abbreviation: 'OH'},
          {name: 'Oklahoma', abbreviation: 'OK'},
          {name: 'Oregon', abbreviation: 'OR'},
          {name: 'Pennsylvania', abbreviation: 'PA'},
          {name: 'Rhode Island', abbreviation: 'RI'},
          {name: 'South Carolina', abbreviation: 'SC'},
          {name: 'South Dakota', abbreviation: 'SD'},
          {name: 'Tennessee', abbreviation: 'TN'},
          {name: 'Texas', abbreviation: 'TX'},
          {name: 'Utah', abbreviation: 'UT'},
          {name: 'Vermont', abbreviation: 'VT'},
          {name: 'Virginia', abbreviation: 'VA'},
          {name: 'Washington', abbreviation: 'WA'},
          {name: 'West Virginia', abbreviation: 'WV'},
          {name: 'Wisconsin', abbreviation: 'WI'},
          {name: 'Wyoming', abbreviation: 'WY'}
      ],

      territories: [
          {name: 'American Samoa', abbreviation: 'AS'},
          {name: 'Federated States of Micronesia', abbreviation: 'FM'},
          {name: 'Guam', abbreviation: 'GU'},
          {name: 'Marshall Islands', abbreviation: 'MH'},
          {name: 'Northern Mariana Islands', abbreviation: 'MP'},
          {name: 'Puerto Rico', abbreviation: 'PR'},
          {name: 'Virgin Islands, U.S.', abbreviation: 'VI'}
      ],

      armed_forces: [
          {name: 'Armed Forces Europe', abbreviation: 'AE'},
          {name: 'Armed Forces Pacific', abbreviation: 'AP'},
          {name: 'Armed Forces the Americas', abbreviation: 'AA'}
      ],

      country_regions: {
          it: [
              { name: "Valle d'Aosta", abbreviation: "VDA" },
              { name: "Piemonte", abbreviation: "PIE" },
              { name: "Lombardia", abbreviation: "LOM" },
              { name: "Veneto", abbreviation: "VEN" },
              { name: "Trentino Alto Adige", abbreviation: "TAA" },
              { name: "Friuli Venezia Giulia", abbreviation: "FVG" },
              { name: "Liguria", abbreviation: "LIG" },
              { name: "Emilia Romagna", abbreviation: "EMR" },
              { name: "Toscana", abbreviation: "TOS" },
              { name: "Umbria", abbreviation: "UMB" },
              { name: "Marche", abbreviation: "MAR" },
              { name: "Abruzzo", abbreviation: "ABR" },
              { name: "Lazio", abbreviation: "LAZ" },
              { name: "Campania", abbreviation: "CAM" },
              { name: "Puglia", abbreviation: "PUG" },
              { name: "Basilicata", abbreviation: "BAS" },
              { name: "Molise", abbreviation: "MOL" },
              { name: "Calabria", abbreviation: "CAL" },
              { name: "Sicilia", abbreviation: "SIC" },
              { name: "Sardegna", abbreviation: "SAR" }
          ]
      },

      street_suffixes: {
          'us': [
              {name: 'Avenue', abbreviation: 'Ave'},
              {name: 'Boulevard', abbreviation: 'Blvd'},
              {name: 'Center', abbreviation: 'Ctr'},
              {name: 'Circle', abbreviation: 'Cir'},
              {name: 'Court', abbreviation: 'Ct'},
              {name: 'Drive', abbreviation: 'Dr'},
              {name: 'Extension', abbreviation: 'Ext'},
              {name: 'Glen', abbreviation: 'Gln'},
              {name: 'Grove', abbreviation: 'Grv'},
              {name: 'Heights', abbreviation: 'Hts'},
              {name: 'Highway', abbreviation: 'Hwy'},
              {name: 'Junction', abbreviation: 'Jct'},
              {name: 'Key', abbreviation: 'Key'},
              {name: 'Lane', abbreviation: 'Ln'},
              {name: 'Loop', abbreviation: 'Loop'},
              {name: 'Manor', abbreviation: 'Mnr'},
              {name: 'Mill', abbreviation: 'Mill'},
              {name: 'Park', abbreviation: 'Park'},
              {name: 'Parkway', abbreviation: 'Pkwy'},
              {name: 'Pass', abbreviation: 'Pass'},
              {name: 'Path', abbreviation: 'Path'},
              {name: 'Pike', abbreviation: 'Pike'},
              {name: 'Place', abbreviation: 'Pl'},
              {name: 'Plaza', abbreviation: 'Plz'},
              {name: 'Point', abbreviation: 'Pt'},
              {name: 'Ridge', abbreviation: 'Rdg'},
              {name: 'River', abbreviation: 'Riv'},
              {name: 'Road', abbreviation: 'Rd'},
              {name: 'Square', abbreviation: 'Sq'},
              {name: 'Street', abbreviation: 'St'},
              {name: 'Terrace', abbreviation: 'Ter'},
              {name: 'Trail', abbreviation: 'Trl'},
              {name: 'Turnpike', abbreviation: 'Tpke'},
              {name: 'View', abbreviation: 'Vw'},
              {name: 'Way', abbreviation: 'Way'}
          ],
          'it': [
              { name: 'Accesso', abbreviation: 'Acc.' },
              { name: 'Alzaia', abbreviation: 'Alz.' },
              { name: 'Arco', abbreviation: 'Arco' },
              { name: 'Archivolto', abbreviation: 'Acv.' },
              { name: 'Arena', abbreviation: 'Arena' },
              { name: 'Argine', abbreviation: 'Argine' },
              { name: 'Bacino', abbreviation: 'Bacino' },
              { name: 'Banchi', abbreviation: 'Banchi' },
              { name: 'Banchina', abbreviation: 'Ban.' },
              { name: 'Bastioni', abbreviation: 'Bas.' },
              { name: 'Belvedere', abbreviation: 'Belv.' },
              { name: 'Borgata', abbreviation: 'B.ta' },
              { name: 'Borgo', abbreviation: 'B.go' },
              { name: 'Calata', abbreviation: 'Cal.' },
              { name: 'Calle', abbreviation: 'Calle' },
              { name: 'Campiello', abbreviation: 'Cam.' },
              { name: 'Campo', abbreviation: 'Cam.' },
              { name: 'Canale', abbreviation: 'Can.' },
              { name: 'Carraia', abbreviation: 'Carr.' },
              { name: 'Cascina', abbreviation: 'Cascina' },
              { name: 'Case sparse', abbreviation: 'c.s.' },
              { name: 'Cavalcavia', abbreviation: 'Cv.' },
              { name: 'Circonvallazione', abbreviation: 'Cv.' },
              { name: 'Complanare', abbreviation: 'C.re' },
              { name: 'Contrada', abbreviation: 'C.da' },
              { name: 'Corso', abbreviation: 'C.so' },
              { name: 'Corte', abbreviation: 'C.te' },
              { name: 'Cortile', abbreviation: 'C.le' },
              { name: 'Diramazione', abbreviation: 'Dir.' },
              { name: 'Fondaco', abbreviation: 'F.co' },
              { name: 'Fondamenta', abbreviation: 'F.ta' },
              { name: 'Fondo', abbreviation: 'F.do' },
              { name: 'Frazione', abbreviation: 'Fr.' },
              { name: 'Isola', abbreviation: 'Is.' },
              { name: 'Largo', abbreviation: 'L.go' },
              { name: 'Litoranea', abbreviation: 'Lit.' },
              { name: 'Lungolago', abbreviation: 'L.go lago' },
              { name: 'Lungo Po', abbreviation: 'l.go Po' },
              { name: 'Molo', abbreviation: 'Molo' },
              { name: 'Mura', abbreviation: 'Mura' },
              { name: 'Passaggio privato', abbreviation: 'pass. priv.' },
              { name: 'Passeggiata', abbreviation: 'Pass.' },
              { name: 'Piazza', abbreviation: 'P.zza' },
              { name: 'Piazzale', abbreviation: 'P.le' },
              { name: 'Ponte', abbreviation: 'P.te' },
              { name: 'Portico', abbreviation: 'P.co' },
              { name: 'Rampa', abbreviation: 'Rampa' },
              { name: 'Regione', abbreviation: 'Reg.' },
              { name: 'Rione', abbreviation: 'R.ne' },
              { name: 'Rio', abbreviation: 'Rio' },
              { name: 'Ripa', abbreviation: 'Ripa' },
              { name: 'Riva', abbreviation: 'Riva' },
              { name: 'Rondò', abbreviation: 'Rondò' },
              { name: 'Rotonda', abbreviation: 'Rot.' },
              { name: 'Sagrato', abbreviation: 'Sagr.' },
              { name: 'Salita', abbreviation: 'Sal.' },
              { name: 'Scalinata', abbreviation: 'Scal.' },
              { name: 'Scalone', abbreviation: 'Scal.' },
              { name: 'Slargo', abbreviation: 'Sl.' },
              { name: 'Sottoportico', abbreviation: 'Sott.' },
              { name: 'Strada', abbreviation: 'Str.' },
              { name: 'Stradale', abbreviation: 'Str.le' },
              { name: 'Strettoia', abbreviation: 'Strett.' },
              { name: 'Traversa', abbreviation: 'Trav.' },
              { name: 'Via', abbreviation: 'V.' },
              { name: 'Viale', abbreviation: 'V.le' },
              { name: 'Vicinale', abbreviation: 'Vic.le' },
              { name: 'Vicolo', abbreviation: 'Vic.' }
          ],
          'uk' : [
              {name: 'Avenue', abbreviation: 'Ave'},
              {name: 'Close', abbreviation: 'Cl'},
              {name: 'Court', abbreviation: 'Ct'},
              {name: 'Crescent', abbreviation: 'Cr'},
              {name: 'Drive', abbreviation: 'Dr'},
              {name: 'Garden', abbreviation: 'Gdn'},
              {name: 'Gardens', abbreviation: 'Gdns'},
              {name: 'Green', abbreviation: 'Gn'},
              {name: 'Grove', abbreviation: 'Gr'},
              {name: 'Lane', abbreviation: 'Ln'},
              {name: 'Mount', abbreviation: 'Mt'},
              {name: 'Place', abbreviation: 'Pl'},
              {name: 'Park', abbreviation: 'Pk'},
              {name: 'Ridge', abbreviation: 'Rdg'},
              {name: 'Road', abbreviation: 'Rd'},
              {name: 'Square', abbreviation: 'Sq'},
              {name: 'Street', abbreviation: 'St'},
              {name: 'Terrace', abbreviation: 'Ter'},
              {name: 'Valley', abbreviation: 'Val'}
          ]
      },

      months: [
          {name: 'January', short_name: 'Jan', numeric: '01', days: 31},
          // Not messing with leap years...
          {name: 'February', short_name: 'Feb', numeric: '02', days: 28},
          {name: 'March', short_name: 'Mar', numeric: '03', days: 31},
          {name: 'April', short_name: 'Apr', numeric: '04', days: 30},
          {name: 'May', short_name: 'May', numeric: '05', days: 31},
          {name: 'June', short_name: 'Jun', numeric: '06', days: 30},
          {name: 'July', short_name: 'Jul', numeric: '07', days: 31},
          {name: 'August', short_name: 'Aug', numeric: '08', days: 31},
          {name: 'September', short_name: 'Sep', numeric: '09', days: 30},
          {name: 'October', short_name: 'Oct', numeric: '10', days: 31},
          {name: 'November', short_name: 'Nov', numeric: '11', days: 30},
          {name: 'December', short_name: 'Dec', numeric: '12', days: 31}
      ],

      // http://en.wikipedia.org/wiki/Bank_card_number#Issuer_identification_number_.28IIN.29
      cc_types: [
          {name: "American Express", short_name: 'amex', prefix: '34', length: 15},
          {name: "Bankcard", short_name: 'bankcard', prefix: '5610', length: 16},
          {name: "China UnionPay", short_name: 'chinaunion', prefix: '62', length: 16},
          {name: "Diners Club Carte Blanche", short_name: 'dccarte', prefix: '300', length: 14},
          {name: "Diners Club enRoute", short_name: 'dcenroute', prefix: '2014', length: 15},
          {name: "Diners Club International", short_name: 'dcintl', prefix: '36', length: 14},
          {name: "Diners Club United States & Canada", short_name: 'dcusc', prefix: '54', length: 16},
          {name: "Discover Card", short_name: 'discover', prefix: '6011', length: 16},
          {name: "InstaPayment", short_name: 'instapay', prefix: '637', length: 16},
          {name: "JCB", short_name: 'jcb', prefix: '3528', length: 16},
          {name: "Laser", short_name: 'laser', prefix: '6304', length: 16},
          {name: "Maestro", short_name: 'maestro', prefix: '5018', length: 16},
          {name: "Mastercard", short_name: 'mc', prefix: '51', length: 16},
          {name: "Solo", short_name: 'solo', prefix: '6334', length: 16},
          {name: "Switch", short_name: 'switch', prefix: '4903', length: 16},
          {name: "Visa", short_name: 'visa', prefix: '4', length: 16},
          {name: "Visa Electron", short_name: 'electron', prefix: '4026', length: 16}
      ],

      //return all world currency by ISO 4217
      currency_types: [
          {'code' : 'AED', 'name' : 'United Arab Emirates Dirham'},
          {'code' : 'AFN', 'name' : 'Afghanistan Afghani'},
          {'code' : 'ALL', 'name' : 'Albania Lek'},
          {'code' : 'AMD', 'name' : 'Armenia Dram'},
          {'code' : 'ANG', 'name' : 'Netherlands Antilles Guilder'},
          {'code' : 'AOA', 'name' : 'Angola Kwanza'},
          {'code' : 'ARS', 'name' : 'Argentina Peso'},
          {'code' : 'AUD', 'name' : 'Australia Dollar'},
          {'code' : 'AWG', 'name' : 'Aruba Guilder'},
          {'code' : 'AZN', 'name' : 'Azerbaijan New Manat'},
          {'code' : 'BAM', 'name' : 'Bosnia and Herzegovina Convertible Marka'},
          {'code' : 'BBD', 'name' : 'Barbados Dollar'},
          {'code' : 'BDT', 'name' : 'Bangladesh Taka'},
          {'code' : 'BGN', 'name' : 'Bulgaria Lev'},
          {'code' : 'BHD', 'name' : 'Bahrain Dinar'},
          {'code' : 'BIF', 'name' : 'Burundi Franc'},
          {'code' : 'BMD', 'name' : 'Bermuda Dollar'},
          {'code' : 'BND', 'name' : 'Brunei Darussalam Dollar'},
          {'code' : 'BOB', 'name' : 'Bolivia Boliviano'},
          {'code' : 'BRL', 'name' : 'Brazil Real'},
          {'code' : 'BSD', 'name' : 'Bahamas Dollar'},
          {'code' : 'BTN', 'name' : 'Bhutan Ngultrum'},
          {'code' : 'BWP', 'name' : 'Botswana Pula'},
          {'code' : 'BYR', 'name' : 'Belarus Ruble'},
          {'code' : 'BZD', 'name' : 'Belize Dollar'},
          {'code' : 'CAD', 'name' : 'Canada Dollar'},
          {'code' : 'CDF', 'name' : 'Congo/Kinshasa Franc'},
          {'code' : 'CHF', 'name' : 'Switzerland Franc'},
          {'code' : 'CLP', 'name' : 'Chile Peso'},
          {'code' : 'CNY', 'name' : 'China Yuan Renminbi'},
          {'code' : 'COP', 'name' : 'Colombia Peso'},
          {'code' : 'CRC', 'name' : 'Costa Rica Colon'},
          {'code' : 'CUC', 'name' : 'Cuba Convertible Peso'},
          {'code' : 'CUP', 'name' : 'Cuba Peso'},
          {'code' : 'CVE', 'name' : 'Cape Verde Escudo'},
          {'code' : 'CZK', 'name' : 'Czech Republic Koruna'},
          {'code' : 'DJF', 'name' : 'Djibouti Franc'},
          {'code' : 'DKK', 'name' : 'Denmark Krone'},
          {'code' : 'DOP', 'name' : 'Dominican Republic Peso'},
          {'code' : 'DZD', 'name' : 'Algeria Dinar'},
          {'code' : 'EGP', 'name' : 'Egypt Pound'},
          {'code' : 'ERN', 'name' : 'Eritrea Nakfa'},
          {'code' : 'ETB', 'name' : 'Ethiopia Birr'},
          {'code' : 'EUR', 'name' : 'Euro Member Countries'},
          {'code' : 'FJD', 'name' : 'Fiji Dollar'},
          {'code' : 'FKP', 'name' : 'Falkland Islands (Malvinas) Pound'},
          {'code' : 'GBP', 'name' : 'United Kingdom Pound'},
          {'code' : 'GEL', 'name' : 'Georgia Lari'},
          {'code' : 'GGP', 'name' : 'Guernsey Pound'},
          {'code' : 'GHS', 'name' : 'Ghana Cedi'},
          {'code' : 'GIP', 'name' : 'Gibraltar Pound'},
          {'code' : 'GMD', 'name' : 'Gambia Dalasi'},
          {'code' : 'GNF', 'name' : 'Guinea Franc'},
          {'code' : 'GTQ', 'name' : 'Guatemala Quetzal'},
          {'code' : 'GYD', 'name' : 'Guyana Dollar'},
          {'code' : 'HKD', 'name' : 'Hong Kong Dollar'},
          {'code' : 'HNL', 'name' : 'Honduras Lempira'},
          {'code' : 'HRK', 'name' : 'Croatia Kuna'},
          {'code' : 'HTG', 'name' : 'Haiti Gourde'},
          {'code' : 'HUF', 'name' : 'Hungary Forint'},
          {'code' : 'IDR', 'name' : 'Indonesia Rupiah'},
          {'code' : 'ILS', 'name' : 'Israel Shekel'},
          {'code' : 'IMP', 'name' : 'Isle of Man Pound'},
          {'code' : 'INR', 'name' : 'India Rupee'},
          {'code' : 'IQD', 'name' : 'Iraq Dinar'},
          {'code' : 'IRR', 'name' : 'Iran Rial'},
          {'code' : 'ISK', 'name' : 'Iceland Krona'},
          {'code' : 'JEP', 'name' : 'Jersey Pound'},
          {'code' : 'JMD', 'name' : 'Jamaica Dollar'},
          {'code' : 'JOD', 'name' : 'Jordan Dinar'},
          {'code' : 'JPY', 'name' : 'Japan Yen'},
          {'code' : 'KES', 'name' : 'Kenya Shilling'},
          {'code' : 'KGS', 'name' : 'Kyrgyzstan Som'},
          {'code' : 'KHR', 'name' : 'Cambodia Riel'},
          {'code' : 'KMF', 'name' : 'Comoros Franc'},
          {'code' : 'KPW', 'name' : 'Korea (North) Won'},
          {'code' : 'KRW', 'name' : 'Korea (South) Won'},
          {'code' : 'KWD', 'name' : 'Kuwait Dinar'},
          {'code' : 'KYD', 'name' : 'Cayman Islands Dollar'},
          {'code' : 'KZT', 'name' : 'Kazakhstan Tenge'},
          {'code' : 'LAK', 'name' : 'Laos Kip'},
          {'code' : 'LBP', 'name' : 'Lebanon Pound'},
          {'code' : 'LKR', 'name' : 'Sri Lanka Rupee'},
          {'code' : 'LRD', 'name' : 'Liberia Dollar'},
          {'code' : 'LSL', 'name' : 'Lesotho Loti'},
          {'code' : 'LTL', 'name' : 'Lithuania Litas'},
          {'code' : 'LYD', 'name' : 'Libya Dinar'},
          {'code' : 'MAD', 'name' : 'Morocco Dirham'},
          {'code' : 'MDL', 'name' : 'Moldova Leu'},
          {'code' : 'MGA', 'name' : 'Madagascar Ariary'},
          {'code' : 'MKD', 'name' : 'Macedonia Denar'},
          {'code' : 'MMK', 'name' : 'Myanmar (Burma) Kyat'},
          {'code' : 'MNT', 'name' : 'Mongolia Tughrik'},
          {'code' : 'MOP', 'name' : 'Macau Pataca'},
          {'code' : 'MRO', 'name' : 'Mauritania Ouguiya'},
          {'code' : 'MUR', 'name' : 'Mauritius Rupee'},
          {'code' : 'MVR', 'name' : 'Maldives (Maldive Islands) Rufiyaa'},
          {'code' : 'MWK', 'name' : 'Malawi Kwacha'},
          {'code' : 'MXN', 'name' : 'Mexico Peso'},
          {'code' : 'MYR', 'name' : 'Malaysia Ringgit'},
          {'code' : 'MZN', 'name' : 'Mozambique Metical'},
          {'code' : 'NAD', 'name' : 'Namibia Dollar'},
          {'code' : 'NGN', 'name' : 'Nigeria Naira'},
          {'code' : 'NIO', 'name' : 'Nicaragua Cordoba'},
          {'code' : 'NOK', 'name' : 'Norway Krone'},
          {'code' : 'NPR', 'name' : 'Nepal Rupee'},
          {'code' : 'NZD', 'name' : 'New Zealand Dollar'},
          {'code' : 'OMR', 'name' : 'Oman Rial'},
          {'code' : 'PAB', 'name' : 'Panama Balboa'},
          {'code' : 'PEN', 'name' : 'Peru Nuevo Sol'},
          {'code' : 'PGK', 'name' : 'Papua New Guinea Kina'},
          {'code' : 'PHP', 'name' : 'Philippines Peso'},
          {'code' : 'PKR', 'name' : 'Pakistan Rupee'},
          {'code' : 'PLN', 'name' : 'Poland Zloty'},
          {'code' : 'PYG', 'name' : 'Paraguay Guarani'},
          {'code' : 'QAR', 'name' : 'Qatar Riyal'},
          {'code' : 'RON', 'name' : 'Romania New Leu'},
          {'code' : 'RSD', 'name' : 'Serbia Dinar'},
          {'code' : 'RUB', 'name' : 'Russia Ruble'},
          {'code' : 'RWF', 'name' : 'Rwanda Franc'},
          {'code' : 'SAR', 'name' : 'Saudi Arabia Riyal'},
          {'code' : 'SBD', 'name' : 'Solomon Islands Dollar'},
          {'code' : 'SCR', 'name' : 'Seychelles Rupee'},
          {'code' : 'SDG', 'name' : 'Sudan Pound'},
          {'code' : 'SEK', 'name' : 'Sweden Krona'},
          {'code' : 'SGD', 'name' : 'Singapore Dollar'},
          {'code' : 'SHP', 'name' : 'Saint Helena Pound'},
          {'code' : 'SLL', 'name' : 'Sierra Leone Leone'},
          {'code' : 'SOS', 'name' : 'Somalia Shilling'},
          {'code' : 'SPL', 'name' : 'Seborga Luigino'},
          {'code' : 'SRD', 'name' : 'Suriname Dollar'},
          {'code' : 'STD', 'name' : 'São Tomé and Príncipe Dobra'},
          {'code' : 'SVC', 'name' : 'El Salvador Colon'},
          {'code' : 'SYP', 'name' : 'Syria Pound'},
          {'code' : 'SZL', 'name' : 'Swaziland Lilangeni'},
          {'code' : 'THB', 'name' : 'Thailand Baht'},
          {'code' : 'TJS', 'name' : 'Tajikistan Somoni'},
          {'code' : 'TMT', 'name' : 'Turkmenistan Manat'},
          {'code' : 'TND', 'name' : 'Tunisia Dinar'},
          {'code' : 'TOP', 'name' : 'Tonga Pa\'anga'},
          {'code' : 'TRY', 'name' : 'Turkey Lira'},
          {'code' : 'TTD', 'name' : 'Trinidad and Tobago Dollar'},
          {'code' : 'TVD', 'name' : 'Tuvalu Dollar'},
          {'code' : 'TWD', 'name' : 'Taiwan New Dollar'},
          {'code' : 'TZS', 'name' : 'Tanzania Shilling'},
          {'code' : 'UAH', 'name' : 'Ukraine Hryvnia'},
          {'code' : 'UGX', 'name' : 'Uganda Shilling'},
          {'code' : 'USD', 'name' : 'United States Dollar'},
          {'code' : 'UYU', 'name' : 'Uruguay Peso'},
          {'code' : 'UZS', 'name' : 'Uzbekistan Som'},
          {'code' : 'VEF', 'name' : 'Venezuela Bolivar'},
          {'code' : 'VND', 'name' : 'Viet Nam Dong'},
          {'code' : 'VUV', 'name' : 'Vanuatu Vatu'},
          {'code' : 'WST', 'name' : 'Samoa Tala'},
          {'code' : 'XAF', 'name' : 'Communauté Financière Africaine (BEAC) CFA Franc BEAC'},
          {'code' : 'XCD', 'name' : 'East Caribbean Dollar'},
          {'code' : 'XDR', 'name' : 'International Monetary Fund (IMF) Special Drawing Rights'},
          {'code' : 'XOF', 'name' : 'Communauté Financière Africaine (BCEAO) Franc'},
          {'code' : 'XPF', 'name' : 'Comptoirs Français du Pacifique (CFP) Franc'},
          {'code' : 'YER', 'name' : 'Yemen Rial'},
          {'code' : 'ZAR', 'name' : 'South Africa Rand'},
          {'code' : 'ZMW', 'name' : 'Zambia Kwacha'},
          {'code' : 'ZWD', 'name' : 'Zimbabwe Dollar'}
      ],

      // return the names of all valide colors
      colorNames : [  "AliceBlue", "Black", "Navy", "DarkBlue", "MediumBlue", "Blue", "DarkGreen", "Green", "Teal", "DarkCyan", "DeepSkyBlue", "DarkTurquoise", "MediumSpringGreen", "Lime", "SpringGreen",
          "Aqua", "Cyan", "MidnightBlue", "DodgerBlue", "LightSeaGreen", "ForestGreen", "SeaGreen", "DarkSlateGray", "LimeGreen", "MediumSeaGreen", "Turquoise", "RoyalBlue", "SteelBlue", "DarkSlateBlue", "MediumTurquoise",
          "Indigo", "DarkOliveGreen", "CadetBlue", "CornflowerBlue", "RebeccaPurple", "MediumAquaMarine", "DimGray", "SlateBlue", "OliveDrab", "SlateGray", "LightSlateGray", "MediumSlateBlue", "LawnGreen", "Chartreuse",
          "Aquamarine", "Maroon", "Purple", "Olive", "Gray", "SkyBlue", "LightSkyBlue", "BlueViolet", "DarkRed", "DarkMagenta", "SaddleBrown", "Ivory", "White",
          "DarkSeaGreen", "LightGreen", "MediumPurple", "DarkViolet", "PaleGreen", "DarkOrchid", "YellowGreen", "Sienna", "Brown", "DarkGray", "LightBlue", "GreenYellow", "PaleTurquoise", "LightSteelBlue", "PowderBlue",
          "FireBrick", "DarkGoldenRod", "MediumOrchid", "RosyBrown", "DarkKhaki", "Silver", "MediumVioletRed", "IndianRed", "Peru", "Chocolate", "Tan", "LightGray", "Thistle", "Orchid", "GoldenRod", "PaleVioletRed",
          "Crimson", "Gainsboro", "Plum", "BurlyWood", "LightCyan", "Lavender", "DarkSalmon", "Violet", "PaleGoldenRod", "LightCoral", "Khaki", "AliceBlue", "HoneyDew", "Azure", "SandyBrown", "Wheat", "Beige", "WhiteSmoke",
          "MintCream", "GhostWhite", "Salmon", "AntiqueWhite", "Linen", "LightGoldenRodYellow", "OldLace", "Red", "Fuchsia", "Magenta", "DeepPink", "OrangeRed", "Tomato", "HotPink", "Coral", "DarkOrange", "LightSalmon", "Orange",
          "LightPink", "Pink", "Gold", "PeachPuff", "NavajoWhite", "Moccasin", "Bisque", "MistyRose", "BlanchedAlmond", "PapayaWhip", "LavenderBlush", "SeaShell", "Cornsilk", "LemonChiffon", "FloralWhite", "Snow", "Yellow", "LightYellow"
      ],

      // Data taken from https://www.sec.gov/rules/other/4-460list.htm
      company: [ "3Com Corp",
      "3M Company",
      "A.G. Edwards Inc.",
      "Abbott Laboratories",
      "Abercrombie & Fitch Co.",
      "ABM Industries Incorporated",
      "Ace Hardware Corporation",
      "ACT Manufacturing Inc.",
      "Acterna Corp.",
      "Adams Resources & Energy, Inc.",
      "ADC Telecommunications, Inc.",
      "Adelphia Communications Corporation",
      "Administaff, Inc.",
      "Adobe Systems Incorporated",
      "Adolph Coors Company",
      "Advance Auto Parts, Inc.",
      "Advanced Micro Devices, Inc.",
      "AdvancePCS, Inc.",
      "Advantica Restaurant Group, Inc.",
      "The AES Corporation",
      "Aetna Inc.",
      "Affiliated Computer Services, Inc.",
      "AFLAC Incorporated",
      "AGCO Corporation",
      "Agilent Technologies, Inc.",
      "Agway Inc.",
      "Apartment Investment and Management Company",
      "Air Products and Chemicals, Inc.",
      "Airborne, Inc.",
      "Airgas, Inc.",
      "AK Steel Holding Corporation",
      "Alaska Air Group, Inc.",
      "Alberto-Culver Company",
      "Albertson's, Inc.",
      "Alcoa Inc.",
      "Alleghany Corporation",
      "Allegheny Energy, Inc.",
      "Allegheny Technologies Incorporated",
      "Allergan, Inc.",
      "ALLETE, Inc.",
      "Alliant Energy Corporation",
      "Allied Waste Industries, Inc.",
      "Allmerica Financial Corporation",
      "The Allstate Corporation",
      "ALLTEL Corporation",
      "The Alpine Group, Inc.",
      "Amazon.com, Inc.",
      "AMC Entertainment Inc.",
      "American Power Conversion Corporation",
      "Amerada Hess Corporation",
      "AMERCO",
      "Ameren Corporation",
      "America West Holdings Corporation",
      "American Axle & Manufacturing Holdings, Inc.",
      "American Eagle Outfitters, Inc.",
      "American Electric Power Company, Inc.",
      "American Express Company",
      "American Financial Group, Inc.",
      "American Greetings Corporation",
      "American International Group, Inc.",
      "American Standard Companies Inc.",
      "American Water Works Company, Inc.",
      "AmerisourceBergen Corporation",
      "Ames Department Stores, Inc.",
      "Amgen Inc.",
      "Amkor Technology, Inc.",
      "AMR Corporation",
      "AmSouth Bancorp.",
      "Amtran, Inc.",
      "Anadarko Petroleum Corporation",
      "Analog Devices, Inc.",
      "Anheuser-Busch Companies, Inc.",
      "Anixter International Inc.",
      "AnnTaylor Inc.",
      "Anthem, Inc.",
      "AOL Time Warner Inc.",
      "Aon Corporation",
      "Apache Corporation",
      "Apple Computer, Inc.",
      "Applera Corporation",
      "Applied Industrial Technologies, Inc.",
      "Applied Materials, Inc.",
      "Aquila, Inc.",
      "ARAMARK Corporation",
      "Arch Coal, Inc.",
      "Archer Daniels Midland Company",
      "Arkansas Best Corporation",
      "Armstrong Holdings, Inc.",
      "Arrow Electronics, Inc.",
      "ArvinMeritor, Inc.",
      "Ashland Inc.",
      "Astoria Financial Corporation",
      "AT&T Corp.",
      "Atmel Corporation",
      "Atmos Energy Corporation",
      "Audiovox Corporation",
      "Autoliv, Inc.",
      "Automatic Data Processing, Inc.",
      "AutoNation, Inc.",
      "AutoZone, Inc.",
      "Avaya Inc.",
      "Avery Dennison Corporation",
      "Avista Corporation",
      "Avnet, Inc.",
      "Avon Products, Inc.",
      "Baker Hughes Incorporated",
      "Ball Corporation",
      "Bank of America Corporation",
      "The Bank of New York Company, Inc.",
      "Bank One Corporation",
      "Banknorth Group, Inc.",
      "Banta Corporation",
      "Barnes & Noble, Inc.",
      "Bausch & Lomb Incorporated",
      "Baxter International Inc.",
      "BB&T Corporation",
      "The Bear Stearns Companies Inc.",
      "Beazer Homes USA, Inc.",
      "Beckman Coulter, Inc.",
      "Becton, Dickinson and Company",
      "Bed Bath & Beyond Inc.",
      "Belk, Inc.",
      "Bell Microproducts Inc.",
      "BellSouth Corporation",
      "Belo Corp.",
      "Bemis Company, Inc.",
      "Benchmark Electronics, Inc.",
      "Berkshire Hathaway Inc.",
      "Best Buy Co., Inc.",
      "Bethlehem Steel Corporation",
      "Beverly Enterprises, Inc.",
      "Big Lots, Inc.",
      "BJ Services Company",
      "BJ's Wholesale Club, Inc.",
      "The Black & Decker Corporation",
      "Black Hills Corporation",
      "BMC Software, Inc.",
      "The Boeing Company",
      "Boise Cascade Corporation",
      "Borders Group, Inc.",
      "BorgWarner Inc.",
      "Boston Scientific Corporation",
      "Bowater Incorporated",
      "Briggs & Stratton Corporation",
      "Brightpoint, Inc.",
      "Brinker International, Inc.",
      "Bristol-Myers Squibb Company",
      "Broadwing, Inc.",
      "Brown Shoe Company, Inc.",
      "Brown-Forman Corporation",
      "Brunswick Corporation",
      "Budget Group, Inc.",
      "Burlington Coat Factory Warehouse Corporation",
      "Burlington Industries, Inc.",
      "Burlington Northern Santa Fe Corporation",
      "Burlington Resources Inc.",
      "C. H. Robinson Worldwide Inc.",
      "Cablevision Systems Corp",
      "Cabot Corp",
      "Cadence Design Systems, Inc.",
      "Calpine Corp.",
      "Campbell Soup Co.",
      "Capital One Financial Corp.",
      "Cardinal Health Inc.",
      "Caremark Rx Inc.",
      "Carlisle Cos. Inc.",
      "Carpenter Technology Corp.",
      "Casey's General Stores Inc.",
      "Caterpillar Inc.",
      "CBRL Group Inc.",
      "CDI Corp.",
      "CDW Computer Centers Inc.",
      "CellStar Corp.",
      "Cendant Corp",
      "Cenex Harvest States Cooperatives",
      "Centex Corp.",
      "CenturyTel Inc.",
      "Ceridian Corp.",
      "CH2M Hill Cos. Ltd.",
      "Champion Enterprises Inc.",
      "Charles Schwab Corp.",
      "Charming Shoppes Inc.",
      "Charter Communications Inc.",
      "Charter One Financial Inc.",
      "ChevronTexaco Corp.",
      "Chiquita Brands International Inc.",
      "Chubb Corp",
      "Ciena Corp.",
      "Cigna Corp",
      "Cincinnati Financial Corp.",
      "Cinergy Corp.",
      "Cintas Corp.",
      "Circuit City Stores Inc.",
      "Cisco Systems Inc.",
      "Citigroup, Inc",
      "Citizens Communications Co.",
      "CKE Restaurants Inc.",
      "Clear Channel Communications Inc.",
      "The Clorox Co.",
      "CMGI Inc.",
      "CMS Energy Corp.",
      "CNF Inc.",
      "Coca-Cola Co.",
      "Coca-Cola Enterprises Inc.",
      "Colgate-Palmolive Co.",
      "Collins & Aikman Corp.",
      "Comcast Corp.",
      "Comdisco Inc.",
      "Comerica Inc.",
      "Comfort Systems USA Inc.",
      "Commercial Metals Co.",
      "Community Health Systems Inc.",
      "Compass Bancshares Inc",
      "Computer Associates International Inc.",
      "Computer Sciences Corp.",
      "Compuware Corp.",
      "Comverse Technology Inc.",
      "ConAgra Foods Inc.",
      "Concord EFS Inc.",
      "Conectiv, Inc",
      "Conoco Inc",
      "Conseco Inc.",
      "Consolidated Freightways Corp.",
      "Consolidated Edison Inc.",
      "Constellation Brands Inc.",
      "Constellation Emergy Group Inc.",
      "Continental Airlines Inc.",
      "Convergys Corp.",
      "Cooper Cameron Corp.",
      "Cooper Industries Ltd.",
      "Cooper Tire & Rubber Co.",
      "Corn Products International Inc.",
      "Corning Inc.",
      "Costco Wholesale Corp.",
      "Countrywide Credit Industries Inc.",
      "Coventry Health Care Inc.",
      "Cox Communications Inc.",
      "Crane Co.",
      "Crompton Corp.",
      "Crown Cork & Seal Co. Inc.",
      "CSK Auto Corp.",
      "CSX Corp.",
      "Cummins Inc.",
      "CVS Corp.",
      "Cytec Industries Inc.",
      "D&K Healthcare Resources, Inc.",
      "D.R. Horton Inc.",
      "Dana Corporation",
      "Danaher Corporation",
      "Darden Restaurants Inc.",
      "DaVita Inc.",
      "Dean Foods Company",
      "Deere & Company",
      "Del Monte Foods Co",
      "Dell Computer Corporation",
      "Delphi Corp.",
      "Delta Air Lines Inc.",
      "Deluxe Corporation",
      "Devon Energy Corporation",
      "Di Giorgio Corporation",
      "Dial Corporation",
      "Diebold Incorporated",
      "Dillard's Inc.",
      "DIMON Incorporated",
      "Dole Food Company, Inc.",
      "Dollar General Corporation",
      "Dollar Tree Stores, Inc.",
      "Dominion Resources, Inc.",
      "Domino's Pizza LLC",
      "Dover Corporation, Inc.",
      "Dow Chemical Company",
      "Dow Jones & Company, Inc.",
      "DPL Inc.",
      "DQE Inc.",
      "Dreyer's Grand Ice Cream, Inc.",
      "DST Systems, Inc.",
      "DTE Energy Co.",
      "E.I. Du Pont de Nemours and Company",
      "Duke Energy Corp",
      "Dun & Bradstreet Inc.",
      "DURA Automotive Systems Inc.",
      "DynCorp",
      "Dynegy Inc.",
      "E*Trade Group, Inc.",
      "E.W. Scripps Company",
      "Earthlink, Inc.",
      "Eastman Chemical Company",
      "Eastman Kodak Company",
      "Eaton Corporation",
      "Echostar Communications Corporation",
      "Ecolab Inc.",
      "Edison International",
      "EGL Inc.",
      "El Paso Corporation",
      "Electronic Arts Inc.",
      "Electronic Data Systems Corp.",
      "Eli Lilly and Company",
      "EMC Corporation",
      "Emcor Group Inc.",
      "Emerson Electric Co.",
      "Encompass Services Corporation",
      "Energizer Holdings Inc.",
      "Energy East Corporation",
      "Engelhard Corporation",
      "Enron Corp.",
      "Entergy Corporation",
      "Enterprise Products Partners L.P.",
      "EOG Resources, Inc.",
      "Equifax Inc.",
      "Equitable Resources Inc.",
      "Equity Office Properties Trust",
      "Equity Residential Properties Trust",
      "Estee Lauder Companies Inc.",
      "Exelon Corporation",
      "Exide Technologies",
      "Expeditors International of Washington Inc.",
      "Express Scripts Inc.",
      "ExxonMobil Corporation",
      "Fairchild Semiconductor International Inc.",
      "Family Dollar Stores Inc.",
      "Farmland Industries Inc.",
      "Federal Mogul Corp.",
      "Federated Department Stores Inc.",
      "Federal Express Corp.",
      "Felcor Lodging Trust Inc.",
      "Ferro Corp.",
      "Fidelity National Financial Inc.",
      "Fifth Third Bancorp",
      "First American Financial Corp.",
      "First Data Corp.",
      "First National of Nebraska Inc.",
      "First Tennessee National Corp.",
      "FirstEnergy Corp.",
      "Fiserv Inc.",
      "Fisher Scientific International Inc.",
      "FleetBoston Financial Co.",
      "Fleetwood Enterprises Inc.",
      "Fleming Companies Inc.",
      "Flowers Foods Inc.",
      "Flowserv Corp",
      "Fluor Corp",
      "FMC Corp",
      "Foamex International Inc",
      "Foot Locker Inc",
      "Footstar Inc.",
      "Ford Motor Co",
      "Forest Laboratories Inc.",
      "Fortune Brands Inc.",
      "Foster Wheeler Ltd.",
      "FPL Group Inc.",
      "Franklin Resources Inc.",
      "Freeport McMoran Copper & Gold Inc.",
      "Frontier Oil Corp",
      "Furniture Brands International Inc.",
      "Gannett Co., Inc.",
      "Gap Inc.",
      "Gateway Inc.",
      "GATX Corporation",
      "Gemstar-TV Guide International Inc.",
      "GenCorp Inc.",
      "General Cable Corporation",
      "General Dynamics Corporation",
      "General Electric Company",
      "General Mills Inc",
      "General Motors Corporation",
      "Genesis Health Ventures Inc.",
      "Gentek Inc.",
      "Gentiva Health Services Inc.",
      "Genuine Parts Company",
      "Genuity Inc.",
      "Genzyme Corporation",
      "Georgia Gulf Corporation",
      "Georgia-Pacific Corporation",
      "Gillette Company",
      "Gold Kist Inc.",
      "Golden State Bancorp Inc.",
      "Golden West Financial Corporation",
      "Goldman Sachs Group Inc.",
      "Goodrich Corporation",
      "The Goodyear Tire & Rubber Company",
      "Granite Construction Incorporated",
      "Graybar Electric Company Inc.",
      "Great Lakes Chemical Corporation",
      "Great Plains Energy Inc.",
      "GreenPoint Financial Corp.",
      "Greif Bros. Corporation",
      "Grey Global Group Inc.",
      "Group 1 Automotive Inc.",
      "Guidant Corporation",
      "H&R Block Inc.",
      "H.B. Fuller Company",
      "H.J. Heinz Company",
      "Halliburton Co.",
      "Harley-Davidson Inc.",
      "Harman International Industries Inc.",
      "Harrah's Entertainment Inc.",
      "Harris Corp.",
      "Harsco Corp.",
      "Hartford Financial Services Group Inc.",
      "Hasbro Inc.",
      "Hawaiian Electric Industries Inc.",
      "HCA Inc.",
      "Health Management Associates Inc.",
      "Health Net Inc.",
      "Healthsouth Corp",
      "Henry Schein Inc.",
      "Hercules Inc.",
      "Herman Miller Inc.",
      "Hershey Foods Corp.",
      "Hewlett-Packard Company",
      "Hibernia Corp.",
      "Hillenbrand Industries Inc.",
      "Hilton Hotels Corp.",
      "Hollywood Entertainment Corp.",
      "Home Depot Inc.",
      "Hon Industries Inc.",
      "Honeywell International Inc.",
      "Hormel Foods Corp.",
      "Host Marriott Corp.",
      "Household International Corp.",
      "Hovnanian Enterprises Inc.",
      "Hub Group Inc.",
      "Hubbell Inc.",
      "Hughes Supply Inc.",
      "Humana Inc.",
      "Huntington Bancshares Inc.",
      "Idacorp Inc.",
      "IDT Corporation",
      "IKON Office Solutions Inc.",
      "Illinois Tool Works Inc.",
      "IMC Global Inc.",
      "Imperial Sugar Company",
      "IMS Health Inc.",
      "Ingles Market Inc",
      "Ingram Micro Inc.",
      "Insight Enterprises Inc.",
      "Integrated Electrical Services Inc.",
      "Intel Corporation",
      "International Paper Co.",
      "Interpublic Group of Companies Inc.",
      "Interstate Bakeries Corporation",
      "International Business Machines Corp.",
      "International Flavors & Fragrances Inc.",
      "International Multifoods Corporation",
      "Intuit Inc.",
      "IT Group Inc.",
      "ITT Industries Inc.",
      "Ivax Corp.",
      "J.B. Hunt Transport Services Inc.",
      "J.C. Penny Co.",
      "J.P. Morgan Chase & Co.",
      "Jabil Circuit Inc.",
      "Jack In The Box Inc.",
      "Jacobs Engineering Group Inc.",
      "JDS Uniphase Corp.",
      "Jefferson-Pilot Co.",
      "John Hancock Financial Services Inc.",
      "Johnson & Johnson",
      "Johnson Controls Inc.",
      "Jones Apparel Group Inc.",
      "KB Home",
      "Kellogg Company",
      "Kellwood Company",
      "Kelly Services Inc.",
      "Kemet Corp.",
      "Kennametal Inc.",
      "Kerr-McGee Corporation",
      "KeyCorp",
      "KeySpan Corp.",
      "Kimball International Inc.",
      "Kimberly-Clark Corporation",
      "Kindred Healthcare Inc.",
      "KLA-Tencor Corporation",
      "K-Mart Corp.",
      "Knight-Ridder Inc.",
      "Kohl's Corp.",
      "KPMG Consulting Inc.",
      "Kroger Co.",
      "L-3 Communications Holdings Inc.",
      "Laboratory Corporation of America Holdings",
      "Lam Research Corporation",
      "LandAmerica Financial Group Inc.",
      "Lands' End Inc.",
      "Landstar System Inc.",
      "La-Z-Boy Inc.",
      "Lear Corporation",
      "Legg Mason Inc.",
      "Leggett & Platt Inc.",
      "Lehman Brothers Holdings Inc.",
      "Lennar Corporation",
      "Lennox International Inc.",
      "Level 3 Communications Inc.",
      "Levi Strauss & Co.",
      "Lexmark International Inc.",
      "Limited Inc.",
      "Lincoln National Corporation",
      "Linens 'n Things Inc.",
      "Lithia Motors Inc.",
      "Liz Claiborne Inc.",
      "Lockheed Martin Corporation",
      "Loews Corporation",
      "Longs Drug Stores Corporation",
      "Louisiana-Pacific Corporation",
      "Lowe's Companies Inc.",
      "LSI Logic Corporation",
      "The LTV Corporation",
      "The Lubrizol Corporation",
      "Lucent Technologies Inc.",
      "Lyondell Chemical Company",
      "M & T Bank Corporation",
      "Magellan Health Services Inc.",
      "Mail-Well Inc.",
      "Mandalay Resort Group",
      "Manor Care Inc.",
      "Manpower Inc.",
      "Marathon Oil Corporation",
      "Mariner Health Care Inc.",
      "Markel Corporation",
      "Marriott International Inc.",
      "Marsh & McLennan Companies Inc.",
      "Marsh Supermarkets Inc.",
      "Marshall & Ilsley Corporation",
      "Martin Marietta Materials Inc.",
      "Masco Corporation",
      "Massey Energy Company",
      "MasTec Inc.",
      "Mattel Inc.",
      "Maxim Integrated Products Inc.",
      "Maxtor Corporation",
      "Maxxam Inc.",
      "The May Department Stores Company",
      "Maytag Corporation",
      "MBNA Corporation",
      "McCormick & Company Incorporated",
      "McDonald's Corporation",
      "The McGraw-Hill Companies Inc.",
      "McKesson Corporation",
      "McLeodUSA Incorporated",
      "M.D.C. Holdings Inc.",
      "MDU Resources Group Inc.",
      "MeadWestvaco Corporation",
      "Medtronic Inc.",
      "Mellon Financial Corporation",
      "The Men's Wearhouse Inc.",
      "Merck & Co., Inc.",
      "Mercury General Corporation",
      "Merrill Lynch & Co. Inc.",
      "Metaldyne Corporation",
      "Metals USA Inc.",
      "MetLife Inc.",
      "Metris Companies Inc",
      "MGIC Investment Corporation",
      "MGM Mirage",
      "Michaels Stores Inc.",
      "Micron Technology Inc.",
      "Microsoft Corporation",
      "Milacron Inc.",
      "Millennium Chemicals Inc.",
      "Mirant Corporation",
      "Mohawk Industries Inc.",
      "Molex Incorporated",
      "The MONY Group Inc.",
      "Morgan Stanley Dean Witter & Co.",
      "Motorola Inc.",
      "MPS Group Inc.",
      "Murphy Oil Corporation",
      "Nabors Industries Inc",
      "Nacco Industries Inc",
      "Nash Finch Company",
      "National City Corp.",
      "National Commerce Financial Corporation",
      "National Fuel Gas Company",
      "National Oilwell Inc",
      "National Rural Utilities Cooperative Finance Corporation",
      "National Semiconductor Corporation",
      "National Service Industries Inc",
      "Navistar International Corporation",
      "NCR Corporation",
      "The Neiman Marcus Group Inc.",
      "New Jersey Resources Corporation",
      "New York Times Company",
      "Newell Rubbermaid Inc",
      "Newmont Mining Corporation",
      "Nextel Communications Inc",
      "Nicor Inc",
      "Nike Inc",
      "NiSource Inc",
      "Noble Energy Inc",
      "Nordstrom Inc",
      "Norfolk Southern Corporation",
      "Nortek Inc",
      "North Fork Bancorporation Inc",
      "Northeast Utilities System",
      "Northern Trust Corporation",
      "Northrop Grumman Corporation",
      "NorthWestern Corporation",
      "Novellus Systems Inc",
      "NSTAR",
      "NTL Incorporated",
      "Nucor Corp",
      "Nvidia Corp",
      "NVR Inc",
      "Northwest Airlines Corp",
      "Occidental Petroleum Corp",
      "Ocean Energy Inc",
      "Office Depot Inc.",
      "OfficeMax Inc",
      "OGE Energy Corp",
      "Oglethorpe Power Corp.",
      "Ohio Casualty Corp.",
      "Old Republic International Corp.",
      "Olin Corp.",
      "OM Group Inc",
      "Omnicare Inc",
      "Omnicom Group",
      "On Semiconductor Corp",
      "ONEOK Inc",
      "Oracle Corp",
      "Oshkosh Truck Corp",
      "Outback Steakhouse Inc.",
      "Owens & Minor Inc.",
      "Owens Corning",
      "Owens-Illinois Inc",
      "Oxford Health Plans Inc",
      "Paccar Inc",
      "PacifiCare Health Systems Inc",
      "Packaging Corp. of America",
      "Pactiv Corp",
      "Pall Corp",
      "Pantry Inc",
      "Park Place Entertainment Corp",
      "Parker Hannifin Corp.",
      "Pathmark Stores Inc.",
      "Paychex Inc",
      "Payless Shoesource Inc",
      "Penn Traffic Co.",
      "Pennzoil-Quaker State Company",
      "Pentair Inc",
      "Peoples Energy Corp.",
      "PeopleSoft Inc",
      "Pep Boys Manny, Moe & Jack",
      "Potomac Electric Power Co.",
      "Pepsi Bottling Group Inc.",
      "PepsiAmericas Inc.",
      "PepsiCo Inc.",
      "Performance Food Group Co.",
      "Perini Corp",
      "PerkinElmer Inc",
      "Perot Systems Corp",
      "Petco Animal Supplies Inc.",
      "Peter Kiewit Sons', Inc.",
      "PETsMART Inc",
      "Pfizer Inc",
      "Pacific Gas & Electric Corp.",
      "Pharmacia Corp",
      "Phar Mor Inc.",
      "Phelps Dodge Corp.",
      "Philip Morris Companies Inc.",
      "Phillips Petroleum Co",
      "Phillips Van Heusen Corp.",
      "Phoenix Companies Inc",
      "Pier 1 Imports Inc.",
      "Pilgrim's Pride Corporation",
      "Pinnacle West Capital Corp",
      "Pioneer-Standard Electronics Inc.",
      "Pitney Bowes Inc.",
      "Pittston Brinks Group",
      "Plains All American Pipeline LP",
      "PNC Financial Services Group Inc.",
      "PNM Resources Inc",
      "Polaris Industries Inc.",
      "Polo Ralph Lauren Corp",
      "PolyOne Corp",
      "Popular Inc",
      "Potlatch Corp",
      "PPG Industries Inc",
      "PPL Corp",
      "Praxair Inc",
      "Precision Castparts Corp",
      "Premcor Inc.",
      "Pride International Inc",
      "Primedia Inc",
      "Principal Financial Group Inc.",
      "Procter & Gamble Co.",
      "Pro-Fac Cooperative Inc.",
      "Progress Energy Inc",
      "Progressive Corporation",
      "Protective Life Corp",
      "Provident Financial Group",
      "Providian Financial Corp.",
      "Prudential Financial Inc.",
      "PSS World Medical Inc",
      "Public Service Enterprise Group Inc.",
      "Publix Super Markets Inc.",
      "Puget Energy Inc.",
      "Pulte Homes Inc",
      "Qualcomm Inc",
      "Quanta Services Inc.",
      "Quantum Corp",
      "Quest Diagnostics Inc.",
      "Questar Corp",
      "Quintiles Transnational",
      "Qwest Communications Intl Inc",
      "R.J. Reynolds Tobacco Company",
      "R.R. Donnelley & Sons Company",
      "Radio Shack Corporation",
      "Raymond James Financial Inc.",
      "Raytheon Company",
      "Reader's Digest Association Inc.",
      "Reebok International Ltd.",
      "Regions Financial Corp.",
      "Regis Corporation",
      "Reliance Steel & Aluminum Co.",
      "Reliant Energy Inc.",
      "Rent A Center Inc",
      "Republic Services Inc",
      "Revlon Inc",
      "RGS Energy Group Inc",
      "Rite Aid Corp",
      "Riverwood Holding Inc.",
      "RoadwayCorp",
      "Robert Half International Inc.",
      "Rock-Tenn Co",
      "Rockwell Automation Inc",
      "Rockwell Collins Inc",
      "Rohm & Haas Co.",
      "Ross Stores Inc",
      "RPM Inc.",
      "Ruddick Corp",
      "Ryder System Inc",
      "Ryerson Tull Inc",
      "Ryland Group Inc.",
      "Sabre Holdings Corp",
      "Safeco Corp",
      "Safeguard Scientifics Inc.",
      "Safeway Inc",
      "Saks Inc",
      "Sanmina-SCI Inc",
      "Sara Lee Corp",
      "SBC Communications Inc",
      "Scana Corp.",
      "Schering-Plough Corp",
      "Scholastic Corp",
      "SCI Systems Onc.",
      "Science Applications Intl. Inc.",
      "Scientific-Atlanta Inc",
      "Scotts Company",
      "Seaboard Corp",
      "Sealed Air Corp",
      "Sears Roebuck & Co",
      "Sempra Energy",
      "Sequa Corp",
      "Service Corp. International",
      "ServiceMaster Co",
      "Shaw Group Inc",
      "Sherwin-Williams Company",
      "Shopko Stores Inc",
      "Siebel Systems Inc",
      "Sierra Health Services Inc",
      "Sierra Pacific Resources",
      "Silgan Holdings Inc.",
      "Silicon Graphics Inc",
      "Simon Property Group Inc",
      "SLM Corporation",
      "Smith International Inc",
      "Smithfield Foods Inc",
      "Smurfit-Stone Container Corp",
      "Snap-On Inc",
      "Solectron Corp",
      "Solutia Inc",
      "Sonic Automotive Inc.",
      "Sonoco Products Co.",
      "Southern Company",
      "Southern Union Company",
      "SouthTrust Corp.",
      "Southwest Airlines Co",
      "Southwest Gas Corp",
      "Sovereign Bancorp Inc.",
      "Spartan Stores Inc",
      "Spherion Corp",
      "Sports Authority Inc",
      "Sprint Corp.",
      "SPX Corp",
      "St. Jude Medical Inc",
      "St. Paul Cos.",
      "Staff Leasing Inc.",
      "StanCorp Financial Group Inc",
      "Standard Pacific Corp.",
      "Stanley Works",
      "Staples Inc",
      "Starbucks Corp",
      "Starwood Hotels & Resorts Worldwide Inc",
      "State Street Corp.",
      "Stater Bros. Holdings Inc.",
      "Steelcase Inc",
      "Stein Mart Inc",
      "Stewart & Stevenson Services Inc",
      "Stewart Information Services Corp",
      "Stilwell Financial Inc",
      "Storage Technology Corporation",
      "Stryker Corp",
      "Sun Healthcare Group Inc.",
      "Sun Microsystems Inc.",
      "SunGard Data Systems Inc.",
      "Sunoco Inc.",
      "SunTrust Banks Inc",
      "Supervalu Inc",
      "Swift Transportation, Co., Inc",
      "Symbol Technologies Inc",
      "Synovus Financial Corp.",
      "Sysco Corp",
      "Systemax Inc.",
      "Target Corp.",
      "Tech Data Corporation",
      "TECO Energy Inc",
      "Tecumseh Products Company",
      "Tektronix Inc",
      "Teleflex Incorporated",
      "Telephone & Data Systems Inc",
      "Tellabs Inc.",
      "Temple-Inland Inc",
      "Tenet Healthcare Corporation",
      "Tenneco Automotive Inc.",
      "Teradyne Inc",
      "Terex Corp",
      "Tesoro Petroleum Corp.",
      "Texas Industries Inc.",
      "Texas Instruments Incorporated",
      "Textron Inc",
      "Thermo Electron Corporation",
      "Thomas & Betts Corporation",
      "Tiffany & Co",
      "Timken Company",
      "TJX Companies Inc",
      "TMP Worldwide Inc",
      "Toll Brothers Inc",
      "Torchmark Corporation",
      "Toro Company",
      "Tower Automotive Inc.",
      "Toys 'R' Us Inc",
      "Trans World Entertainment Corp.",
      "TransMontaigne Inc",
      "Transocean Inc",
      "TravelCenters of America Inc.",
      "Triad Hospitals Inc",
      "Tribune Company",
      "Trigon Healthcare Inc.",
      "Trinity Industries Inc",
      "Trump Hotels & Casino Resorts Inc.",
      "TruServ Corporation",
      "TRW Inc",
      "TXU Corp",
      "Tyson Foods Inc",
      "U.S. Bancorp",
      "U.S. Industries Inc.",
      "UAL Corporation",
      "UGI Corporation",
      "Unified Western Grocers Inc",
      "Union Pacific Corporation",
      "Union Planters Corp",
      "Unisource Energy Corp",
      "Unisys Corporation",
      "United Auto Group Inc",
      "United Defense Industries Inc.",
      "United Parcel Service Inc",
      "United Rentals Inc",
      "United Stationers Inc",
      "United Technologies Corporation",
      "UnitedHealth Group Incorporated",
      "Unitrin Inc",
      "Universal Corporation",
      "Universal Forest Products Inc",
      "Universal Health Services Inc",
      "Unocal Corporation",
      "Unova Inc",
      "UnumProvident Corporation",
      "URS Corporation",
      "US Airways Group Inc",
      "US Oncology Inc",
      "USA Interactive",
      "USFreighways Corporation",
      "USG Corporation",
      "UST Inc",
      "Valero Energy Corporation",
      "Valspar Corporation",
      "Value City Department Stores Inc",
      "Varco International Inc",
      "Vectren Corporation",
      "Veritas Software Corporation",
      "Verizon Communications Inc",
      "VF Corporation",
      "Viacom Inc",
      "Viad Corp",
      "Viasystems Group Inc",
      "Vishay Intertechnology Inc",
      "Visteon Corporation",
      "Volt Information Sciences Inc",
      "Vulcan Materials Company",
      "W.R. Berkley Corporation",
      "W.R. Grace & Co",
      "W.W. Grainger Inc",
      "Wachovia Corporation",
      "Wakenhut Corporation",
      "Walgreen Co",
      "Wallace Computer Services Inc",
      "Wal-Mart Stores Inc",
      "Walt Disney Co",
      "Walter Industries Inc",
      "Washington Mutual Inc",
      "Washington Post Co.",
      "Waste Management Inc",
      "Watsco Inc",
      "Weatherford International Inc",
      "Weis Markets Inc.",
      "Wellpoint Health Networks Inc",
      "Wells Fargo & Company",
      "Wendy's International Inc",
      "Werner Enterprises Inc",
      "WESCO International Inc",
      "Western Digital Inc",
      "Western Gas Resources Inc",
      "WestPoint Stevens Inc",
      "Weyerhauser Company",
      "WGL Holdings Inc",
      "Whirlpool Corporation",
      "Whole Foods Market Inc",
      "Willamette Industries Inc.",
      "Williams Companies Inc",
      "Williams Sonoma Inc",
      "Winn Dixie Stores Inc",
      "Wisconsin Energy Corporation",
      "Wm Wrigley Jr Company",
      "World Fuel Services Corporation",
      "WorldCom Inc",
      "Worthington Industries Inc",
      "WPS Resources Corporation",
      "Wyeth",
      "Wyndham International Inc",
      "Xcel Energy Inc",
      "Xerox Corp",
      "Xilinx Inc",
      "XO Communications Inc",
      "Yellow Corporation",
      "York International Corp",
      "Yum Brands Inc.",
      "Zale Corporation",
      "Zions Bancorporation"
    ],

      fileExtension : {
          "raster"    : ["bmp", "gif", "gpl", "ico", "jpeg", "psd", "png", "psp", "raw", "tiff"],
          "vector"    : ["3dv", "amf", "awg", "ai", "cgm", "cdr", "cmx", "dxf", "e2d", "egt", "eps", "fs", "odg", "svg", "xar"],
          "3d"        : ["3dmf", "3dm", "3mf", "3ds", "an8", "aoi", "blend", "cal3d", "cob", "ctm", "iob", "jas", "max", "mb", "mdx", "obj", "x", "x3d"],
          "document"  : ["doc", "docx", "dot", "html", "xml", "odt", "odm", "ott", "csv", "rtf", "tex", "xhtml", "xps"]
      },

      // Data taken from https://github.com/dmfilipenko/timezones.json/blob/master/timezones.json
      timezones: [
                {
                  "name": "Dateline Standard Time",
                  "abbr": "DST",
                  "offset": -12,
                  "isdst": false,
                  "text": "(UTC-12:00) International Date Line West",
                  "utc": [
                    "Etc/GMT+12"
                  ]
                },
                {
                  "name": "UTC-11",
                  "abbr": "U",
                  "offset": -11,
                  "isdst": false,
                  "text": "(UTC-11:00) Coordinated Universal Time-11",
                  "utc": [
                    "Etc/GMT+11",
                    "Pacific/Midway",
                    "Pacific/Niue",
                    "Pacific/Pago_Pago"
                  ]
                },
                {
                  "name": "Hawaiian Standard Time",
                  "abbr": "HST",
                  "offset": -10,
                  "isdst": false,
                  "text": "(UTC-10:00) Hawaii",
                  "utc": [
                    "Etc/GMT+10",
                    "Pacific/Honolulu",
                    "Pacific/Johnston",
                    "Pacific/Rarotonga",
                    "Pacific/Tahiti"
                  ]
                },
                {
                  "name": "Alaskan Standard Time",
                  "abbr": "AKDT",
                  "offset": -8,
                  "isdst": true,
                  "text": "(UTC-09:00) Alaska",
                  "utc": [
                    "America/Anchorage",
                    "America/Juneau",
                    "America/Nome",
                    "America/Sitka",
                    "America/Yakutat"
                  ]
                },
                {
                  "name": "Pacific Standard Time (Mexico)",
                  "abbr": "PDT",
                  "offset": -7,
                  "isdst": true,
                  "text": "(UTC-08:00) Baja California",
                  "utc": [
                    "America/Santa_Isabel"
                  ]
                },
                {
                  "name": "Pacific Standard Time",
                  "abbr": "PDT",
                  "offset": -7,
                  "isdst": true,
                  "text": "(UTC-08:00) Pacific Time (US & Canada)",
                  "utc": [
                    "America/Dawson",
                    "America/Los_Angeles",
                    "America/Tijuana",
                    "America/Vancouver",
                    "America/Whitehorse",
                    "PST8PDT"
                  ]
                },
                {
                  "name": "US Mountain Standard Time",
                  "abbr": "UMST",
                  "offset": -7,
                  "isdst": false,
                  "text": "(UTC-07:00) Arizona",
                  "utc": [
                    "America/Creston",
                    "America/Dawson_Creek",
                    "America/Hermosillo",
                    "America/Phoenix",
                    "Etc/GMT+7"
                  ]
                },
                {
                  "name": "Mountain Standard Time (Mexico)",
                  "abbr": "MDT",
                  "offset": -6,
                  "isdst": true,
                  "text": "(UTC-07:00) Chihuahua, La Paz, Mazatlan",
                  "utc": [
                    "America/Chihuahua",
                    "America/Mazatlan"
                  ]
                },
                {
                  "name": "Mountain Standard Time",
                  "abbr": "MDT",
                  "offset": -6,
                  "isdst": true,
                  "text": "(UTC-07:00) Mountain Time (US & Canada)",
                  "utc": [
                    "America/Boise",
                    "America/Cambridge_Bay",
                    "America/Denver",
                    "America/Edmonton",
                    "America/Inuvik",
                    "America/Ojinaga",
                    "America/Yellowknife",
                    "MST7MDT"
                  ]
                },
                {
                  "name": "Central America Standard Time",
                  "abbr": "CAST",
                  "offset": -6,
                  "isdst": false,
                  "text": "(UTC-06:00) Central America",
                  "utc": [
                    "America/Belize",
                    "America/Costa_Rica",
                    "America/El_Salvador",
                    "America/Guatemala",
                    "America/Managua",
                    "America/Tegucigalpa",
                    "Etc/GMT+6",
                    "Pacific/Galapagos"
                  ]
                },
                {
                  "name": "Central Standard Time",
                  "abbr": "CDT",
                  "offset": -5,
                  "isdst": true,
                  "text": "(UTC-06:00) Central Time (US & Canada)",
                  "utc": [
                    "America/Chicago",
                    "America/Indiana/Knox",
                    "America/Indiana/Tell_City",
                    "America/Matamoros",
                    "America/Menominee",
                    "America/North_Dakota/Beulah",
                    "America/North_Dakota/Center",
                    "America/North_Dakota/New_Salem",
                    "America/Rainy_River",
                    "America/Rankin_Inlet",
                    "America/Resolute",
                    "America/Winnipeg",
                    "CST6CDT"
                  ]
                },
                {
                  "name": "Central Standard Time (Mexico)",
                  "abbr": "CDT",
                  "offset": -5,
                  "isdst": true,
                  "text": "(UTC-06:00) Guadalajara, Mexico City, Monterrey",
                  "utc": [
                    "America/Bahia_Banderas",
                    "America/Cancun",
                    "America/Merida",
                    "America/Mexico_City",
                    "America/Monterrey"
                  ]
                },
                {
                  "name": "Canada Central Standard Time",
                  "abbr": "CCST",
                  "offset": -6,
                  "isdst": false,
                  "text": "(UTC-06:00) Saskatchewan",
                  "utc": [
                    "America/Regina",
                    "America/Swift_Current"
                  ]
                },
                {
                  "name": "SA Pacific Standard Time",
                  "abbr": "SPST",
                  "offset": -5,
                  "isdst": false,
                  "text": "(UTC-05:00) Bogota, Lima, Quito",
                  "utc": [
                    "America/Bogota",
                    "America/Cayman",
                    "America/Coral_Harbour",
                    "America/Eirunepe",
                    "America/Guayaquil",
                    "America/Jamaica",
                    "America/Lima",
                    "America/Panama",
                    "America/Rio_Branco",
                    "Etc/GMT+5"
                  ]
                },
                {
                  "name": "Eastern Standard Time",
                  "abbr": "EDT",
                  "offset": -4,
                  "isdst": true,
                  "text": "(UTC-05:00) Eastern Time (US & Canada)",
                  "utc": [
                    "America/Detroit",
                    "America/Havana",
                    "America/Indiana/Petersburg",
                    "America/Indiana/Vincennes",
                    "America/Indiana/Winamac",
                    "America/Iqaluit",
                    "America/Kentucky/Monticello",
                    "America/Louisville",
                    "America/Montreal",
                    "America/Nassau",
                    "America/New_York",
                    "America/Nipigon",
                    "America/Pangnirtung",
                    "America/Port-au-Prince",
                    "America/Thunder_Bay",
                    "America/Toronto",
                    "EST5EDT"
                  ]
                },
                {
                  "name": "US Eastern Standard Time",
                  "abbr": "UEDT",
                  "offset": -4,
                  "isdst": true,
                  "text": "(UTC-05:00) Indiana (East)",
                  "utc": [
                    "America/Indiana/Marengo",
                    "America/Indiana/Vevay",
                    "America/Indianapolis"
                  ]
                },
                {
                  "name": "Venezuela Standard Time",
                  "abbr": "VST",
                  "offset": -4.5,
                  "isdst": false,
                  "text": "(UTC-04:30) Caracas",
                  "utc": [
                    "America/Caracas"
                  ]
                },
                {
                  "name": "Paraguay Standard Time",
                  "abbr": "PST",
                  "offset": -4,
                  "isdst": false,
                  "text": "(UTC-04:00) Asuncion",
                  "utc": [
                    "America/Asuncion"
                  ]
                },
                {
                  "name": "Atlantic Standard Time",
                  "abbr": "ADT",
                  "offset": -3,
                  "isdst": true,
                  "text": "(UTC-04:00) Atlantic Time (Canada)",
                  "utc": [
                    "America/Glace_Bay",
                    "America/Goose_Bay",
                    "America/Halifax",
                    "America/Moncton",
                    "America/Thule",
                    "Atlantic/Bermuda"
                  ]
                },
                {
                  "name": "Central Brazilian Standard Time",
                  "abbr": "CBST",
                  "offset": -4,
                  "isdst": false,
                  "text": "(UTC-04:00) Cuiaba",
                  "utc": [
                    "America/Campo_Grande",
                    "America/Cuiaba"
                  ]
                },
                {
                  "name": "SA Western Standard Time",
                  "abbr": "SWST",
                  "offset": -4,
                  "isdst": false,
                  "text": "(UTC-04:00) Georgetown, La Paz, Manaus, San Juan",
                  "utc": [
                    "America/Anguilla",
                    "America/Antigua",
                    "America/Aruba",
                    "America/Barbados",
                    "America/Blanc-Sablon",
                    "America/Boa_Vista",
                    "America/Curacao",
                    "America/Dominica",
                    "America/Grand_Turk",
                    "America/Grenada",
                    "America/Guadeloupe",
                    "America/Guyana",
                    "America/Kralendijk",
                    "America/La_Paz",
                    "America/Lower_Princes",
                    "America/Manaus",
                    "America/Marigot",
                    "America/Martinique",
                    "America/Montserrat",
                    "America/Port_of_Spain",
                    "America/Porto_Velho",
                    "America/Puerto_Rico",
                    "America/Santo_Domingo",
                    "America/St_Barthelemy",
                    "America/St_Kitts",
                    "America/St_Lucia",
                    "America/St_Thomas",
                    "America/St_Vincent",
                    "America/Tortola",
                    "Etc/GMT+4"
                  ]
                },
                {
                  "name": "Pacific SA Standard Time",
                  "abbr": "PSST",
                  "offset": -4,
                  "isdst": false,
                  "text": "(UTC-04:00) Santiago",
                  "utc": [
                    "America/Santiago",
                    "Antarctica/Palmer"
                  ]
                },
                {
                  "name": "Newfoundland Standard Time",
                  "abbr": "NDT",
                  "offset": -2.5,
                  "isdst": true,
                  "text": "(UTC-03:30) Newfoundland",
                  "utc": [
                    "America/St_Johns"
                  ]
                },
                {
                  "name": "E. South America Standard Time",
                  "abbr": "ESAST",
                  "offset": -3,
                  "isdst": false,
                  "text": "(UTC-03:00) Brasilia",
                  "utc": [
                    "America/Sao_Paulo"
                  ]
                },
                {
                  "name": "Argentina Standard Time",
                  "abbr": "AST",
                  "offset": -3,
                  "isdst": false,
                  "text": "(UTC-03:00) Buenos Aires",
                  "utc": [
                    "America/Argentina/La_Rioja",
                    "America/Argentina/Rio_Gallegos",
                    "America/Argentina/Salta",
                    "America/Argentina/San_Juan",
                    "America/Argentina/San_Luis",
                    "America/Argentina/Tucuman",
                    "America/Argentina/Ushuaia",
                    "America/Buenos_Aires",
                    "America/Catamarca",
                    "America/Cordoba",
                    "America/Jujuy",
                    "America/Mendoza"
                  ]
                },
                {
                  "name": "SA Eastern Standard Time",
                  "abbr": "SEST",
                  "offset": -3,
                  "isdst": false,
                  "text": "(UTC-03:00) Cayenne, Fortaleza",
                  "utc": [
                    "America/Araguaina",
                    "America/Belem",
                    "America/Cayenne",
                    "America/Fortaleza",
                    "America/Maceio",
                    "America/Paramaribo",
                    "America/Recife",
                    "America/Santarem",
                    "Antarctica/Rothera",
                    "Atlantic/Stanley",
                    "Etc/GMT+3"
                  ]
                },
                {
                  "name": "Greenland Standard Time",
                  "abbr": "GDT",
                  "offset": -2,
                  "isdst": true,
                  "text": "(UTC-03:00) Greenland",
                  "utc": [
                    "America/Godthab"
                  ]
                },
                {
                  "name": "Montevideo Standard Time",
                  "abbr": "MST",
                  "offset": -3,
                  "isdst": false,
                  "text": "(UTC-03:00) Montevideo",
                  "utc": [
                    "America/Montevideo"
                  ]
                },
                {
                  "name": "Bahia Standard Time",
                  "abbr": "BST",
                  "offset": -3,
                  "isdst": false,
                  "text": "(UTC-03:00) Salvador",
                  "utc": [
                    "America/Bahia"
                  ]
                },
                {
                  "name": "UTC-02",
                  "abbr": "U",
                  "offset": -2,
                  "isdst": false,
                  "text": "(UTC-02:00) Coordinated Universal Time-02",
                  "utc": [
                    "America/Noronha",
                    "Atlantic/South_Georgia",
                    "Etc/GMT+2"
                  ]
                },
                {
                  "name": "Mid-Atlantic Standard Time",
                  "abbr": "MDT",
                  "offset": -1,
                  "isdst": true,
                  "text": "(UTC-02:00) Mid-Atlantic - Old"
                },
                {
                  "name": "Azores Standard Time",
                  "abbr": "ADT",
                  "offset": 0,
                  "isdst": true,
                  "text": "(UTC-01:00) Azores",
                  "utc": [
                    "America/Scoresbysund",
                    "Atlantic/Azores"
                  ]
                },
                {
                  "name": "Cape Verde Standard Time",
                  "abbr": "CVST",
                  "offset": -1,
                  "isdst": false,
                  "text": "(UTC-01:00) Cape Verde Is.",
                  "utc": [
                    "Atlantic/Cape_Verde",
                    "Etc/GMT+1"
                  ]
                },
                {
                  "name": "Morocco Standard Time",
                  "abbr": "MDT",
                  "offset": 1,
                  "isdst": true,
                  "text": "(UTC) Casablanca",
                  "utc": [
                    "Africa/Casablanca",
                    "Africa/El_Aaiun"
                  ]
                },
                {
                  "name": "UTC",
                  "abbr": "CUT",
                  "offset": 0,
                  "isdst": false,
                  "text": "(UTC) Coordinated Universal Time",
                  "utc": [
                    "America/Danmarkshavn",
                    "Etc/GMT"
                  ]
                },
                {
                  "name": "GMT Standard Time",
                  "abbr": "GDT",
                  "offset": 1,
                  "isdst": true,
                  "text": "(UTC) Dublin, Edinburgh, Lisbon, London",
                  "utc": [
                    "Atlantic/Canary",
                    "Atlantic/Faeroe",
                    "Atlantic/Madeira",
                    "Europe/Dublin",
                    "Europe/Guernsey",
                    "Europe/Isle_of_Man",
                    "Europe/Jersey",
                    "Europe/Lisbon",
                    "Europe/London"
                  ]
                },
                {
                  "name": "Greenwich Standard Time",
                  "abbr": "GST",
                  "offset": 0,
                  "isdst": false,
                  "text": "(UTC) Monrovia, Reykjavik",
                  "utc": [
                    "Africa/Abidjan",
                    "Africa/Accra",
                    "Africa/Bamako",
                    "Africa/Banjul",
                    "Africa/Bissau",
                    "Africa/Conakry",
                    "Africa/Dakar",
                    "Africa/Freetown",
                    "Africa/Lome",
                    "Africa/Monrovia",
                    "Africa/Nouakchott",
                    "Africa/Ouagadougou",
                    "Africa/Sao_Tome",
                    "Atlantic/Reykjavik",
                    "Atlantic/St_Helena"
                  ]
                },
                {
                  "name": "W. Europe Standard Time",
                  "abbr": "WEDT",
                  "offset": 2,
                  "isdst": true,
                  "text": "(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna",
                  "utc": [
                    "Arctic/Longyearbyen",
                    "Europe/Amsterdam",
                    "Europe/Andorra",
                    "Europe/Berlin",
                    "Europe/Busingen",
                    "Europe/Gibraltar",
                    "Europe/Luxembourg",
                    "Europe/Malta",
                    "Europe/Monaco",
                    "Europe/Oslo",
                    "Europe/Rome",
                    "Europe/San_Marino",
                    "Europe/Stockholm",
                    "Europe/Vaduz",
                    "Europe/Vatican",
                    "Europe/Vienna",
                    "Europe/Zurich"
                  ]
                },
                {
                  "name": "Central Europe Standard Time",
                  "abbr": "CEDT",
                  "offset": 2,
                  "isdst": true,
                  "text": "(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague",
                  "utc": [
                    "Europe/Belgrade",
                    "Europe/Bratislava",
                    "Europe/Budapest",
                    "Europe/Ljubljana",
                    "Europe/Podgorica",
                    "Europe/Prague",
                    "Europe/Tirane"
                  ]
                },
                {
                  "name": "Romance Standard Time",
                  "abbr": "RDT",
                  "offset": 2,
                  "isdst": true,
                  "text": "(UTC+01:00) Brussels, Copenhagen, Madrid, Paris",
                  "utc": [
                    "Africa/Ceuta",
                    "Europe/Brussels",
                    "Europe/Copenhagen",
                    "Europe/Madrid",
                    "Europe/Paris"
                  ]
                },
                {
                  "name": "Central European Standard Time",
                  "abbr": "CEDT",
                  "offset": 2,
                  "isdst": true,
                  "text": "(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb",
                  "utc": [
                    "Europe/Sarajevo",
                    "Europe/Skopje",
                    "Europe/Warsaw",
                    "Europe/Zagreb"
                  ]
                },
                {
                  "name": "W. Central Africa Standard Time",
                  "abbr": "WCAST",
                  "offset": 1,
                  "isdst": false,
                  "text": "(UTC+01:00) West Central Africa",
                  "utc": [
                    "Africa/Algiers",
                    "Africa/Bangui",
                    "Africa/Brazzaville",
                    "Africa/Douala",
                    "Africa/Kinshasa",
                    "Africa/Lagos",
                    "Africa/Libreville",
                    "Africa/Luanda",
                    "Africa/Malabo",
                    "Africa/Ndjamena",
                    "Africa/Niamey",
                    "Africa/Porto-Novo",
                    "Africa/Tunis",
                    "Etc/GMT-1"
                  ]
                },
                {
                  "name": "Namibia Standard Time",
                  "abbr": "NST",
                  "offset": 1,
                  "isdst": false,
                  "text": "(UTC+01:00) Windhoek",
                  "utc": [
                    "Africa/Windhoek"
                  ]
                },
                {
                  "name": "GTB Standard Time",
                  "abbr": "GDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Athens, Bucharest",
                  "utc": [
                    "Asia/Nicosia",
                    "Europe/Athens",
                    "Europe/Bucharest",
                    "Europe/Chisinau"
                  ]
                },
                {
                  "name": "Middle East Standard Time",
                  "abbr": "MEDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Beirut",
                  "utc": [
                    "Asia/Beirut"
                  ]
                },
                {
                  "name": "Egypt Standard Time",
                  "abbr": "EST",
                  "offset": 2,
                  "isdst": false,
                  "text": "(UTC+02:00) Cairo",
                  "utc": [
                    "Africa/Cairo"
                  ]
                },
                {
                  "name": "Syria Standard Time",
                  "abbr": "SDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Damascus",
                  "utc": [
                    "Asia/Damascus"
                  ]
                },
                {
                  "name": "E. Europe Standard Time",
                  "abbr": "EEDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) E. Europe"
                },
                {
                  "name": "South Africa Standard Time",
                  "abbr": "SAST",
                  "offset": 2,
                  "isdst": false,
                  "text": "(UTC+02:00) Harare, Pretoria",
                  "utc": [
                    "Africa/Blantyre",
                    "Africa/Bujumbura",
                    "Africa/Gaborone",
                    "Africa/Harare",
                    "Africa/Johannesburg",
                    "Africa/Kigali",
                    "Africa/Lubumbashi",
                    "Africa/Lusaka",
                    "Africa/Maputo",
                    "Africa/Maseru",
                    "Africa/Mbabane",
                    "Etc/GMT-2"
                  ]
                },
                {
                  "name": "FLE Standard Time",
                  "abbr": "FDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius",
                  "utc": [
                    "Europe/Helsinki",
                    "Europe/Kiev",
                    "Europe/Mariehamn",
                    "Europe/Riga",
                    "Europe/Sofia",
                    "Europe/Tallinn",
                    "Europe/Uzhgorod",
                    "Europe/Vilnius",
                    "Europe/Zaporozhye"
                  ]
                },
                {
                  "name": "Turkey Standard Time",
                  "abbr": "TDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Istanbul",
                  "utc": [
                    "Europe/Istanbul"
                  ]
                },
                {
                  "name": "Israel Standard Time",
                  "abbr": "JDT",
                  "offset": 3,
                  "isdst": true,
                  "text": "(UTC+02:00) Jerusalem",
                  "utc": [
                    "Asia/Jerusalem"
                  ]
                },
                {
                  "name": "Libya Standard Time",
                  "abbr": "LST",
                  "offset": 2,
                  "isdst": false,
                  "text": "(UTC+02:00) Tripoli",
                  "utc": [
                    "Africa/Tripoli"
                  ]
                },
                {
                  "name": "Jordan Standard Time",
                  "abbr": "JST",
                  "offset": 3,
                  "isdst": false,
                  "text": "(UTC+03:00) Amman",
                  "utc": [
                    "Asia/Amman"
                  ]
                },
                {
                  "name": "Arabic Standard Time",
                  "abbr": "AST",
                  "offset": 3,
                  "isdst": false,
                  "text": "(UTC+03:00) Baghdad",
                  "utc": [
                    "Asia/Baghdad"
                  ]
                },
                {
                  "name": "Kaliningrad Standard Time",
                  "abbr": "KST",
                  "offset": 3,
                  "isdst": false,
                  "text": "(UTC+03:00) Kaliningrad, Minsk",
                  "utc": [
                    "Europe/Kaliningrad",
                    "Europe/Minsk"
                  ]
                },
                {
                  "name": "Arab Standard Time",
                  "abbr": "AST",
                  "offset": 3,
                  "isdst": false,
                  "text": "(UTC+03:00) Kuwait, Riyadh",
                  "utc": [
                    "Asia/Aden",
                    "Asia/Bahrain",
                    "Asia/Kuwait",
                    "Asia/Qatar",
                    "Asia/Riyadh"
                  ]
                },
                {
                  "name": "E. Africa Standard Time",
                  "abbr": "EAST",
                  "offset": 3,
                  "isdst": false,
                  "text": "(UTC+03:00) Nairobi",
                  "utc": [
                    "Africa/Addis_Ababa",
                    "Africa/Asmera",
                    "Africa/Dar_es_Salaam",
                    "Africa/Djibouti",
                    "Africa/Juba",
                    "Africa/Kampala",
                    "Africa/Khartoum",
                    "Africa/Mogadishu",
                    "Africa/Nairobi",
                    "Antarctica/Syowa",
                    "Etc/GMT-3",
                    "Indian/Antananarivo",
                    "Indian/Comoro",
                    "Indian/Mayotte"
                  ]
                },
                {
                  "name": "Iran Standard Time",
                  "abbr": "IDT",
                  "offset": 4.5,
                  "isdst": true,
                  "text": "(UTC+03:30) Tehran",
                  "utc": [
                    "Asia/Tehran"
                  ]
                },
                {
                  "name": "Arabian Standard Time",
                  "abbr": "AST",
                  "offset": 4,
                  "isdst": false,
                  "text": "(UTC+04:00) Abu Dhabi, Muscat",
                  "utc": [
                    "Asia/Dubai",
                    "Asia/Muscat",
                    "Etc/GMT-4"
                  ]
                },
                {
                  "name": "Azerbaijan Standard Time",
                  "abbr": "ADT",
                  "offset": 5,
                  "isdst": true,
                  "text": "(UTC+04:00) Baku",
                  "utc": [
                    "Asia/Baku"
                  ]
                },
                {
                  "name": "Russian Standard Time",
                  "abbr": "RST",
                  "offset": 4,
                  "isdst": false,
                  "text": "(UTC+04:00) Moscow, St. Petersburg, Volgograd",
                  "utc": [
                    "Europe/Moscow",
                    "Europe/Samara",
                    "Europe/Simferopol",
                    "Europe/Volgograd"
                  ]
                },
                {
                  "name": "Mauritius Standard Time",
                  "abbr": "MST",
                  "offset": 4,
                  "isdst": false,
                  "text": "(UTC+04:00) Port Louis",
                  "utc": [
                    "Indian/Mahe",
                    "Indian/Mauritius",
                    "Indian/Reunion"
                  ]
                },
                {
                  "name": "Georgian Standard Time",
                  "abbr": "GST",
                  "offset": 4,
                  "isdst": false,
                  "text": "(UTC+04:00) Tbilisi",
                  "utc": [
                    "Asia/Tbilisi"
                  ]
                },
                {
                  "name": "Caucasus Standard Time",
                  "abbr": "CST",
                  "offset": 4,
                  "isdst": false,
                  "text": "(UTC+04:00) Yerevan",
                  "utc": [
                    "Asia/Yerevan"
                  ]
                },
                {
                  "name": "Afghanistan Standard Time",
                  "abbr": "AST",
                  "offset": 4.5,
                  "isdst": false,
                  "text": "(UTC+04:30) Kabul",
                  "utc": [
                    "Asia/Kabul"
                  ]
                },
                {
                  "name": "West Asia Standard Time",
                  "abbr": "WAST",
                  "offset": 5,
                  "isdst": false,
                  "text": "(UTC+05:00) Ashgabat, Tashkent",
                  "utc": [
                    "Antarctica/Mawson",
                    "Asia/Aqtau",
                    "Asia/Aqtobe",
                    "Asia/Ashgabat",
                    "Asia/Dushanbe",
                    "Asia/Oral",
                    "Asia/Samarkand",
                    "Asia/Tashkent",
                    "Etc/GMT-5",
                    "Indian/Kerguelen",
                    "Indian/Maldives"
                  ]
                },
                {
                  "name": "Pakistan Standard Time",
                  "abbr": "PST",
                  "offset": 5,
                  "isdst": false,
                  "text": "(UTC+05:00) Islamabad, Karachi",
                  "utc": [
                    "Asia/Karachi"
                  ]
                },
                {
                  "name": "India Standard Time",
                  "abbr": "IST",
                  "offset": 5.5,
                  "isdst": false,
                  "text": "(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi",
                  "utc": [
                    "Asia/Calcutta"
                  ]
                },
                {
                  "name": "Sri Lanka Standard Time",
                  "abbr": "SLST",
                  "offset": 5.5,
                  "isdst": false,
                  "text": "(UTC+05:30) Sri Jayawardenepura",
                  "utc": [
                    "Asia/Colombo"
                  ]
                },
                {
                  "name": "Nepal Standard Time",
                  "abbr": "NST",
                  "offset": 5.75,
                  "isdst": false,
                  "text": "(UTC+05:45) Kathmandu",
                  "utc": [
                    "Asia/Katmandu"
                  ]
                },
                {
                  "name": "Central Asia Standard Time",
                  "abbr": "CAST",
                  "offset": 6,
                  "isdst": false,
                  "text": "(UTC+06:00) Astana",
                  "utc": [
                    "Antarctica/Vostok",
                    "Asia/Almaty",
                    "Asia/Bishkek",
                    "Asia/Qyzylorda",
                    "Asia/Urumqi",
                    "Etc/GMT-6",
                    "Indian/Chagos"
                  ]
                },
                {
                  "name": "Bangladesh Standard Time",
                  "abbr": "BST",
                  "offset": 6,
                  "isdst": false,
                  "text": "(UTC+06:00) Dhaka",
                  "utc": [
                    "Asia/Dhaka",
                    "Asia/Thimphu"
                  ]
                },
                {
                  "name": "Ekaterinburg Standard Time",
                  "abbr": "EST",
                  "offset": 6,
                  "isdst": false,
                  "text": "(UTC+06:00) Ekaterinburg",
                  "utc": [
                    "Asia/Yekaterinburg"
                  ]
                },
                {
                  "name": "Myanmar Standard Time",
                  "abbr": "MST",
                  "offset": 6.5,
                  "isdst": false,
                  "text": "(UTC+06:30) Yangon (Rangoon)",
                  "utc": [
                    "Asia/Rangoon",
                    "Indian/Cocos"
                  ]
                },
                {
                  "name": "SE Asia Standard Time",
                  "abbr": "SAST",
                  "offset": 7,
                  "isdst": false,
                  "text": "(UTC+07:00) Bangkok, Hanoi, Jakarta",
                  "utc": [
                    "Antarctica/Davis",
                    "Asia/Bangkok",
                    "Asia/Hovd",
                    "Asia/Jakarta",
                    "Asia/Phnom_Penh",
                    "Asia/Pontianak",
                    "Asia/Saigon",
                    "Asia/Vientiane",
                    "Etc/GMT-7",
                    "Indian/Christmas"
                  ]
                },
                {
                  "name": "N. Central Asia Standard Time",
                  "abbr": "NCAST",
                  "offset": 7,
                  "isdst": false,
                  "text": "(UTC+07:00) Novosibirsk",
                  "utc": [
                    "Asia/Novokuznetsk",
                    "Asia/Novosibirsk",
                    "Asia/Omsk"
                  ]
                },
                {
                  "name": "China Standard Time",
                  "abbr": "CST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi",
                  "utc": [
                    "Asia/Hong_Kong",
                    "Asia/Macau",
                    "Asia/Shanghai"
                  ]
                },
                {
                  "name": "North Asia Standard Time",
                  "abbr": "NAST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Krasnoyarsk",
                  "utc": [
                    "Asia/Krasnoyarsk"
                  ]
                },
                {
                  "name": "Singapore Standard Time",
                  "abbr": "MPST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Kuala Lumpur, Singapore",
                  "utc": [
                    "Asia/Brunei",
                    "Asia/Kuala_Lumpur",
                    "Asia/Kuching",
                    "Asia/Makassar",
                    "Asia/Manila",
                    "Asia/Singapore",
                    "Etc/GMT-8"
                  ]
                },
                {
                  "name": "W. Australia Standard Time",
                  "abbr": "WAST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Perth",
                  "utc": [
                    "Antarctica/Casey",
                    "Australia/Perth"
                  ]
                },
                {
                  "name": "Taipei Standard Time",
                  "abbr": "TST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Taipei",
                  "utc": [
                    "Asia/Taipei"
                  ]
                },
                {
                  "name": "Ulaanbaatar Standard Time",
                  "abbr": "UST",
                  "offset": 8,
                  "isdst": false,
                  "text": "(UTC+08:00) Ulaanbaatar",
                  "utc": [
                    "Asia/Choibalsan",
                    "Asia/Ulaanbaatar"
                  ]
                },
                {
                  "name": "North Asia East Standard Time",
                  "abbr": "NAEST",
                  "offset": 9,
                  "isdst": false,
                  "text": "(UTC+09:00) Irkutsk",
                  "utc": [
                    "Asia/Irkutsk"
                  ]
                },
                {
                  "name": "Tokyo Standard Time",
                  "abbr": "TST",
                  "offset": 9,
                  "isdst": false,
                  "text": "(UTC+09:00) Osaka, Sapporo, Tokyo",
                  "utc": [
                    "Asia/Dili",
                    "Asia/Jayapura",
                    "Asia/Tokyo",
                    "Etc/GMT-9",
                    "Pacific/Palau"
                  ]
                },
                {
                  "name": "Korea Standard Time",
                  "abbr": "KST",
                  "offset": 9,
                  "isdst": false,
                  "text": "(UTC+09:00) Seoul",
                  "utc": [
                    "Asia/Pyongyang",
                    "Asia/Seoul"
                  ]
                },
                {
                  "name": "Cen. Australia Standard Time",
                  "abbr": "CAST",
                  "offset": 9.5,
                  "isdst": false,
                  "text": "(UTC+09:30) Adelaide",
                  "utc": [
                    "Australia/Adelaide",
                    "Australia/Broken_Hill"
                  ]
                },
                {
                  "name": "AUS Central Standard Time",
                  "abbr": "ACST",
                  "offset": 9.5,
                  "isdst": false,
                  "text": "(UTC+09:30) Darwin",
                  "utc": [
                    "Australia/Darwin"
                  ]
                },
                {
                  "name": "E. Australia Standard Time",
                  "abbr": "EAST",
                  "offset": 10,
                  "isdst": false,
                  "text": "(UTC+10:00) Brisbane",
                  "utc": [
                    "Australia/Brisbane",
                    "Australia/Lindeman"
                  ]
                },
                {
                  "name": "AUS Eastern Standard Time",
                  "abbr": "AEST",
                  "offset": 10,
                  "isdst": false,
                  "text": "(UTC+10:00) Canberra, Melbourne, Sydney",
                  "utc": [
                    "Australia/Melbourne",
                    "Australia/Sydney"
                  ]
                },
                {
                  "name": "West Pacific Standard Time",
                  "abbr": "WPST",
                  "offset": 10,
                  "isdst": false,
                  "text": "(UTC+10:00) Guam, Port Moresby",
                  "utc": [
                    "Antarctica/DumontDUrville",
                    "Etc/GMT-10",
                    "Pacific/Guam",
                    "Pacific/Port_Moresby",
                    "Pacific/Saipan",
                    "Pacific/Truk"
                  ]
                },
                {
                  "name": "Tasmania Standard Time",
                  "abbr": "TST",
                  "offset": 10,
                  "isdst": false,
                  "text": "(UTC+10:00) Hobart",
                  "utc": [
                    "Australia/Currie",
                    "Australia/Hobart"
                  ]
                },
                {
                  "name": "Yakutsk Standard Time",
                  "abbr": "YST",
                  "offset": 10,
                  "isdst": false,
                  "text": "(UTC+10:00) Yakutsk",
                  "utc": [
                    "Asia/Chita",
                    "Asia/Khandyga",
                    "Asia/Yakutsk"
                  ]
                },
                {
                  "name": "Central Pacific Standard Time",
                  "abbr": "CPST",
                  "offset": 11,
                  "isdst": false,
                  "text": "(UTC+11:00) Solomon Is., New Caledonia",
                  "utc": [
                    "Antarctica/Macquarie",
                    "Etc/GMT-11",
                    "Pacific/Efate",
                    "Pacific/Guadalcanal",
                    "Pacific/Kosrae",
                    "Pacific/Noumea",
                    "Pacific/Ponape"
                  ]
                },
                {
                  "name": "Vladivostok Standard Time",
                  "abbr": "VST",
                  "offset": 11,
                  "isdst": false,
                  "text": "(UTC+11:00) Vladivostok",
                  "utc": [
                    "Asia/Sakhalin",
                    "Asia/Ust-Nera",
                    "Asia/Vladivostok"
                  ]
                },
                {
                  "name": "New Zealand Standard Time",
                  "abbr": "NZST",
                  "offset": 12,
                  "isdst": false,
                  "text": "(UTC+12:00) Auckland, Wellington",
                  "utc": [
                    "Antarctica/McMurdo",
                    "Pacific/Auckland"
                  ]
                },
                {
                  "name": "UTC+12",
                  "abbr": "U",
                  "offset": 12,
                  "isdst": false,
                  "text": "(UTC+12:00) Coordinated Universal Time+12",
                  "utc": [
                    "Etc/GMT-12",
                    "Pacific/Funafuti",
                    "Pacific/Kwajalein",
                    "Pacific/Majuro",
                    "Pacific/Nauru",
                    "Pacific/Tarawa",
                    "Pacific/Wake",
                    "Pacific/Wallis"
                  ]
                },
                {
                  "name": "Fiji Standard Time",
                  "abbr": "FST",
                  "offset": 12,
                  "isdst": false,
                  "text": "(UTC+12:00) Fiji",
                  "utc": [
                    "Pacific/Fiji"
                  ]
                },
                {
                  "name": "Magadan Standard Time",
                  "abbr": "MST",
                  "offset": 12,
                  "isdst": false,
                  "text": "(UTC+12:00) Magadan",
                  "utc": [
                    "Asia/Anadyr",
                    "Asia/Kamchatka",
                    "Asia/Magadan",
                    "Asia/Srednekolymsk"
                  ]
                },
                {
                  "name": "Kamchatka Standard Time",
                  "abbr": "KDT",
                  "offset": 13,
                  "isdst": true,
                  "text": "(UTC+12:00) Petropavlovsk-Kamchatsky - Old"
                },
                {
                  "name": "Tonga Standard Time",
                  "abbr": "TST",
                  "offset": 13,
                  "isdst": false,
                  "text": "(UTC+13:00) Nuku'alofa",
                  "utc": [
                    "Etc/GMT-13",
                    "Pacific/Enderbury",
                    "Pacific/Fakaofo",
                    "Pacific/Tongatapu"
                  ]
                },
                {
                  "name": "Samoa Standard Time",
                  "abbr": "SST",
                  "offset": 13,
                  "isdst": false,
                  "text": "(UTC+13:00) Samoa",
                  "utc": [
                    "Pacific/Apia"
                  ]
                }
              ],
      //List source: http://answers.google.com/answers/threadview/id/589312.html
      profession: [
          "Airline Pilot",
          "Academic Team",
          "Accountant",
          "Account Executive",
          "Actor",
          "Actuary",
          "Acquisition Analyst",
          "Administrative Asst.",
          "Administrative Analyst",
          "Administrator",
          "Advertising Director",
          "Aerospace Engineer",
          "Agent",
          "Agricultural Inspector",
          "Agricultural Scientist",
          "Air Traffic Controller",
          "Animal Trainer",
          "Anthropologist",
          "Appraiser",
          "Architect",
          "Art Director",
          "Artist",
          "Astronomer",
          "Athletic Coach",
          "Auditor",
          "Author",
          "Baker",
          "Banker",
          "Bankruptcy Attorney",
          "Benefits Manager",
          "Biologist",
          "Bio-feedback Specialist",
          "Biomedical Engineer",
          "Biotechnical Researcher",
          "Broadcaster",
          "Broker",
          "Building Manager",
          "Building Contractor",
          "Building Inspector",
          "Business Analyst",
          "Business Planner",
          "Business Manager",
          "Buyer",
          "Call Center Manager",
          "Career Counselor",
          "Cash Manager",
          "Ceramic Engineer",
          "Chief Executive Officer",
          "Chief Operation Officer",
          "Chef",
          "Chemical Engineer",
          "Chemist",
          "Child Care Manager",
          "Chief Medical Officer",
          "Chiropractor",
          "Cinematographer",
          "City Housing Manager",
          "City Manager",
          "Civil Engineer",
          "Claims Manager",
          "Clinical Research Assistant",
          "Collections Manager.",
          "Compliance Manager",
          "Comptroller",
          "Computer Manager",
          "Commercial Artist",
          "Communications Affairs Director",
          "Communications Director",
          "Communications Engineer",
          "Compensation Analyst",
          "Computer Programmer",
          "Computer Ops. Manager",
          "Computer Engineer",
          "Computer Operator",
          "Computer Graphics Specialist",
          "Construction Engineer",
          "Construction Manager",
          "Consultant",
          "Consumer Relations Manager",
          "Contract Administrator",
          "Copyright Attorney",
          "Copywriter",
          "Corporate Planner",
          "Corrections Officer",
          "Cosmetologist",
          "Credit Analyst",
          "Cruise Director",
          "Chief Information Officer",
          "Chief Technology Officer",
          "Customer Service Manager",
          "Cryptologist",
          "Dancer",
          "Data Security Manager",
          "Database Manager",
          "Day Care Instructor",
          "Dentist",
          "Designer",
          "Design Engineer",
          "Desktop Publisher",
          "Developer",
          "Development Officer",
          "Diamond Merchant",
          "Dietitian",
          "Direct Marketer",
          "Director",
          "Distribution Manager",
          "Diversity Manager",
          "Economist",
          "EEO Compliance Manager",
          "Editor",
          "Education Adminator",
          "Electrical Engineer",
          "Electro Optical Engineer",
          "Electronics Engineer",
          "Embassy Management",
          "Employment Agent",
          "Engineer Technician",
          "Entrepreneur",
          "Environmental Analyst",
          "Environmental Attorney",
          "Environmental Engineer",
          "Environmental Specialist",
          "Escrow Officer",
          "Estimator",
          "Executive Assistant",
          "Executive Director",
          "Executive Recruiter",
          "Facilities Manager",
          "Family Counselor",
          "Fashion Events Manager",
          "Fashion Merchandiser",
          "Fast Food Manager",
          "Film Producer",
          "Film Production Assistant",
          "Financial Analyst",
          "Financial Planner",
          "Financier",
          "Fine Artist",
          "Wildlife Specialist",
          "Fitness Consultant",
          "Flight Attendant",
          "Flight Engineer",
          "Floral Designer",
          "Food & Beverage Director",
          "Food Service Manager",
          "Forestry Technician",
          "Franchise Management",
          "Franchise Sales",
          "Fraud Investigator",
          "Freelance Writer",
          "Fund Raiser",
          "General Manager",
          "Geologist",
          "General Counsel",
          "Geriatric Specialist",
          "Gerontologist",
          "Glamour Photographer",
          "Golf Club Manager",
          "Gourmet Chef",
          "Graphic Designer",
          "Grounds Keeper",
          "Hazardous Waste Manager",
          "Health Care Manager",
          "Health Therapist",
          "Health Service Administrator",
          "Hearing Officer",
          "Home Economist",
          "Horticulturist",
          "Hospital Administrator",
          "Hotel Manager",
          "Human Resources Manager",
          "Importer",
          "Industrial Designer",
          "Industrial Engineer",
          "Information Director",
          "Inside Sales",
          "Insurance Adjuster",
          "Interior Decorator",
          "Internal Controls Director",
          "International Acct.",
          "International Courier",
          "International Lawyer",
          "Interpreter",
          "Investigator",
          "Investment Banker",
          "Investment Manager",
          "IT Architect",
          "IT Project Manager",
          "IT Systems Analyst",
          "Jeweler",
          "Joint Venture Manager",
          "Journalist",
          "Labor Negotiator",
          "Labor Organizer",
          "Labor Relations Manager",
          "Lab Services Director",
          "Lab Technician",
          "Land Developer",
          "Landscape Architect",
          "Law Enforcement Officer",
          "Lawyer",
          "Lead Software Engineer",
          "Lead Software Test Engineer",
          "Leasing Manager",
          "Legal Secretary",
          "Library Manager",
          "Litigation Attorney",
          "Loan Officer",
          "Lobbyist",
          "Logistics Manager",
          "Maintenance Manager",
          "Management Consultant",
          "Managed Care Director",
          "Managing Partner",
          "Manufacturing Director",
          "Manpower Planner",
          "Marine Biologist",
          "Market Res. Analyst",
          "Marketing Director",
          "Materials Manager",
          "Mathematician",
          "Membership Chairman",
          "Mechanic",
          "Mechanical Engineer",
          "Media Buyer",
          "Medical Investor",
          "Medical Secretary",
          "Medical Technician",
          "Mental Health Counselor",
          "Merchandiser",
          "Metallurgical Engineering",
          "Meteorologist",
          "Microbiologist",
          "MIS Manager",
          "Motion Picture Director",
          "Multimedia Director",
          "Musician",
          "Network Administrator",
          "Network Specialist",
          "Network Operator",
          "New Product Manager",
          "Novelist",
          "Nuclear Engineer",
          "Nuclear Specialist",
          "Nutritionist",
          "Nursing Administrator",
          "Occupational Therapist",
          "Oceanographer",
          "Office Manager",
          "Operations Manager",
          "Operations Research Director",
          "Optical Technician",
          "Optometrist",
          "Organizational Development Manager",
          "Outplacement Specialist",
          "Paralegal",
          "Park Ranger",
          "Patent Attorney",
          "Payroll Specialist",
          "Personnel Specialist",
          "Petroleum Engineer",
          "Pharmacist",
          "Photographer",
          "Physical Therapist",
          "Physician",
          "Physician Assistant",
          "Physicist",
          "Planning Director",
          "Podiatrist",
          "Political Analyst",
          "Political Scientist",
          "Politician",
          "Portfolio Manager",
          "Preschool Management",
          "Preschool Teacher",
          "Principal",
          "Private Banker",
          "Private Investigator",
          "Probation Officer",
          "Process Engineer",
          "Producer",
          "Product Manager",
          "Product Engineer",
          "Production Engineer",
          "Production Planner",
          "Professional Athlete",
          "Professional Coach",
          "Professor",
          "Project Engineer",
          "Project Manager",
          "Program Manager",
          "Property Manager",
          "Public Administrator",
          "Public Safety Director",
          "PR Specialist",
          "Publisher",
          "Purchasing Agent",
          "Publishing Director",
          "Quality Assurance Specialist",
          "Quality Control Engineer",
          "Quality Control Inspector",
          "Radiology Manager",
          "Railroad Engineer",
          "Real Estate Broker",
          "Recreational Director",
          "Recruiter",
          "Redevelopment Specialist",
          "Regulatory Affairs Manager",
          "Registered Nurse",
          "Rehabilitation Counselor",
          "Relocation Manager",
          "Reporter",
          "Research Specialist",
          "Restaurant Manager",
          "Retail Store Manager",
          "Risk Analyst",
          "Safety Engineer",
          "Sales Engineer",
          "Sales Trainer",
          "Sales Promotion Manager",
          "Sales Representative",
          "Sales Manager",
          "Service Manager",
          "Sanitation Engineer",
          "Scientific Programmer",
          "Scientific Writer",
          "Securities Analyst",
          "Security Consultant",
          "Security Director",
          "Seminar Presenter",
          "Ship's Officer",
          "Singer",
          "Social Director",
          "Social Program Planner",
          "Social Research",
          "Social Scientist",
          "Social Worker",
          "Sociologist",
          "Software Developer",
          "Software Engineer",
          "Software Test Engineer",
          "Soil Scientist",
          "Special Events Manager",
          "Special Education Teacher",
          "Special Projects Director",
          "Speech Pathologist",
          "Speech Writer",
          "Sports Event Manager",
          "Statistician",
          "Store Manager",
          "Strategic Alliance Director",
          "Strategic Planning Director",
          "Stress Reduction Specialist",
          "Stockbroker",
          "Surveyor",
          "Structural Engineer",
          "Superintendent",
          "Supply Chain Director",
          "System Engineer",
          "Systems Analyst",
          "Systems Programmer",
          "System Administrator",
          "Tax Specialist",
          "Teacher",
          "Technical Support Specialist",
          "Technical Illustrator",
          "Technical Writer",
          "Technology Director",
          "Telecom Analyst",
          "Telemarketer",
          "Theatrical Director",
          "Title Examiner",
          "Tour Escort",
          "Tour Guide Director",
          "Traffic Manager",
          "Trainer Translator",
          "Transportation Manager",
          "Travel Agent",
          "Treasurer",
          "TV Programmer",
          "Underwriter",
          "Union Representative",
          "University Administrator",
          "University Dean",
          "Urban Planner",
          "Veterinarian",
          "Vendor Relations Director",
          "Viticulturist",
          "Warehouse Manager"
      ],
      animals : {
        //list of ocean animals comes from https://owlcation.com/stem/list-of-ocean-animals
        "ocean" : ["Acantharea","Anemone","Angelfish King","Ahi Tuna","Albacore","American Oyster","Anchovy","Armored Snail","Arctic Char","Atlantic Bluefin Tuna","Atlantic Cod","Atlantic Goliath Grouper","Atlantic Trumpetfish","Atlantic Wolffish","Baleen Whale","Banded Butterflyfish","Banded Coral Shrimp","Banded Sea Krait","Barnacle","Barndoor Skate","Barracuda","Basking Shark","Bass","Beluga Whale","Bluebanded Goby","Bluehead Wrasse","Bluefish","Bluestreak Cleaner-Wrasse","Blue Marlin","Blue Shark","Blue Spiny Lobster","Blue Tang","Blue Whale","Broadclub Cuttlefish","Bull Shark","Chambered Nautilus","Chilean Basket Star","Chilean Jack Mackerel","Chinook Salmon","Christmas Tree Worm","Clam","Clown Anemonefish","Clown Triggerfish","Cod","Coelacanth","Cockscomb Cup Coral","Common Fangtooth","Conch","Cookiecutter Shark","Copepod","Coral","Corydoras","Cownose Ray","Crab","Crown-of-Thorns Starfish","Cushion Star","Cuttlefish","California Sea Otters","Dolphin","Dolphinfish","Dory","Devil Fish","Dugong","Dumbo Octopus","Dungeness Crab","Eccentric Sand Dollar","Edible Sea Cucumber","Eel","Elephant Seal","Elkhorn Coral","Emperor Shrimp","Estuarine Crocodile","Fathead Sculpin","Fiddler Crab","Fin Whale","Flameback","Flamingo Tongue Snail","Flashlight Fish","Flatback Turtle","Flatfish","Flying Fish","Flounder","Fluke","French Angelfish","Frilled Shark","Fugu (also called Pufferfish)","Gar","Geoduck","Giant Barrel Sponge","Giant Caribbean Sea Anemone","Giant Clam","Giant Isopod","Giant Kingfish","Giant Oarfish","Giant Pacific Octopus","Giant Pyrosome","Giant Sea Star","Giant Squid","Glowing Sucker Octopus","Giant Tube Worm","Goblin Shark","Goosefish","Great White Shark","Greenland Shark","Grey Atlantic Seal","Grouper","Grunion","Guineafowl Puffer","Haddock","Hake","Halibut","Hammerhead Shark","Hapuka","Harbor Porpoise","Harbor Seal","Hatchetfish","Hawaiian Monk Seal","Hawksbill Turtle","Hector's Dolphin","Hermit Crab","Herring","Hoki","Horn Shark","Horseshoe Crab","Humpback Anglerfish","Humpback Whale","Icefish","Imperator Angelfish","Irukandji Jellyfish","Isopod","Ivory Bush Coral","Japanese Spider Crab","Jellyfish","John Dory","Juan Fernandez Fur Seal","Killer Whale","Kiwa Hirsuta","Krill","Lagoon Triggerfish","Lamprey","Leafy Seadragon","Leopard Seal","Limpet","Ling","Lionfish","Lions Mane Jellyfish","Lobe Coral","Lobster","Loggerhead Turtle","Longnose Sawshark","Longsnout Seahorse","Lophelia Coral","Marrus Orthocanna","Manatee","Manta Ray","Marlin","Megamouth Shark","Mexican Lookdown","Mimic Octopus","Moon Jelly","Mollusk","Monkfish","Moray Eel","Mullet","Mussel","Megaladon","Napoleon Wrasse","Nassau Grouper","Narwhal","Nautilus","Needlefish","Northern Seahorse","North Atlantic Right Whale","Northern Red Snapper","Norway Lobster","Nudibranch","Nurse Shark","Oarfish","Ocean Sunfish","Oceanic Whitetip Shark","Octopus","Olive Sea Snake","Orange Roughy","Ostracod","Otter","Oyster","Pacific Angelshark","Pacific Blackdragon","Pacific Halibut","Pacific Sardine","Pacific Sea Nettle Jellyfish","Pacific White Sided Dolphin","Pantropical Spotted Dolphin","Patagonian Toothfish","Peacock Mantis Shrimp","Pelagic Thresher Shark","Penguin","Peruvian Anchoveta","Pilchard","Pink Salmon","Pinniped","Plankton","Porpoise","Polar Bear","Portuguese Man o' War","Pycnogonid Sea Spider","Quahog","Queen Angelfish","Queen Conch","Queen Parrotfish","Queensland Grouper","Ragfish","Ratfish","Rattail Fish","Ray","Red Drum","Red King Crab","Ringed Seal","Risso's Dolphin","Ross Seals","Sablefish","Salmon","Sand Dollar","Sandbar Shark","Sawfish","Sarcastic Fringehead","Scalloped Hammerhead Shark","Seahorse","Sea Cucumber","Sea Lion","Sea Urchin","Seal","Shark","Shortfin Mako Shark","Shovelnose Guitarfish","Shrimp","Silverside Fish","Skipjack Tuna","Slender Snipe Eel","Smalltooth Sawfish","Smelts","Sockeye Salmon","Southern Stingray","Sponge","Spotted Porcupinefish","Spotted Dolphin","Spotted Eagle Ray","Spotted Moray","Squid","Squidworm","Starfish","Stickleback","Stonefish","Stoplight Loosejaw","Sturgeon","Swordfish","Tan Bristlemouth","Tasseled Wobbegong","Terrible Claw Lobster","Threespot Damselfish","Tiger Prawn","Tiger Shark","Tilefish","Toadfish","Tropical Two-Wing Flyfish","Tuna","Umbrella Squid","Velvet Crab","Venus Flytrap Sea Anemone","Vigtorniella Worm","Viperfish","Vampire Squid","Vaquita","Wahoo","Walrus","West Indian Manatee","Whale","Whale Shark","Whiptail Gulper","White-Beaked Dolphin","White-Ring Garden Eel","White Shrimp","Wobbegong","Wrasse","Wreckfish","Xiphosura","Yellowtail Damselfish","Yelloweye Rockfish","Yellow Cup Black Coral","Yellow Tube Sponge","Yellowfin Tuna","Zebrashark","Zooplankton"],
        //list of desert, grassland, and forest animals comes from http://www.skyenimals.com/
        "desert" : ["Aardwolf","Addax","African Wild Ass","Ant","Antelope","Armadillo","Baboon","Badger","Bat","Bearded Dragon","Beetle","Bird","Black-footed Cat","Boa","Brown Bear","Bustard","Butterfly","Camel","Caracal","Caracara","Caterpillar","Centipede","Cheetah","Chipmunk","Chuckwalla","Climbing Mouse","Coati","Cobra","Cotton Rat","Cougar","Courser","Crane Fly","Crow","Dassie Rat","Dove","Dunnart","Eagle","Echidna","Elephant","Emu","Falcon","Fly","Fox","Frogmouth","Gecko","Geoffroy's Cat","Gerbil","Grasshopper","Guanaco","Gundi","Hamster","Hawk","Hedgehog","Hyena","Hyrax","Jackal","Kangaroo","Kangaroo Rat","Kestrel","Kowari","Kultarr","Leopard","Lion","Macaw","Meerkat","Mouse","Oryx","Ostrich","Owl","Pronghorn","Python","Rabbit","Raccoon","Rattlesnake","Rhinoceros","Sand Cat","Spectacled Bear","Spiny Mouse","Starling","Stick Bug","Tarantula","Tit","Toad","Tortoise","Tyrant Flycatcher","Viper","Vulture","Waxwing","Xerus","Zebra"],
        "grassland" : ["Aardvark","Aardwolf","Accentor","African Buffalo","African Wild Dog","Alpaca","Anaconda","Ant","Anteater","Antelope","Armadillo","Baboon","Badger","Bandicoot","Barbet","Bat","Bee","Bee-eater","Beetle","Bird","Bison","Black-footed Cat","Black-footed Ferret","Bluebird","Boa","Bowerbird","Brown Bear","Bush Dog","Bushshrike","Bustard","Butterfly","Buzzard","Caracal","Caracara","Cardinal","Caterpillar","Cheetah","Chipmunk","Civet","Climbing Mouse","Clouded Leopard","Coati","Cobra","Cockatoo","Cockroach","Common Genet","Cotton Rat","Cougar","Courser","Coyote","Crane","Crane Fly","Cricket","Crow","Culpeo","Death Adder","Deer","Deer Mouse","Dingo","Dinosaur","Dove","Drongo","Duck","Duiker","Dunnart","Eagle","Echidna","Elephant","Elk","Emu","Falcon","Finch","Flea","Fly","Flying Frog","Fox","Frog","Frogmouth","Garter Snake","Gazelle","Gecko","Geoffroy's Cat","Gerbil","Giant Tortoise","Giraffe","Grasshopper","Grison","Groundhog","Grouse","Guanaco","Guinea Pig","Hamster","Harrier","Hartebeest","Hawk","Hedgehog","Helmetshrike","Hippopotamus","Hornbill","Hyena","Hyrax","Impala","Jackal","Jaguar","Jaguarundi","Kangaroo","Kangaroo Rat","Kestrel","Kultarr","Ladybug","Leopard","Lion","Macaw","Meerkat","Mouse","Newt","Oryx","Ostrich","Owl","Pangolin","Pheasant","Prairie Dog","Pronghorn","Przewalski's Horse","Python","Quoll","Rabbit","Raven","Rhinoceros","Shelduck","Sloth Bear","Spectacled Bear","Squirrel","Starling","Stick Bug","Tamandua","Tasmanian Devil","Thornbill","Thrush","Toad","Tortoise"],
        "forest" : ["Agouti","Anaconda","Anoa","Ant","Anteater","Antelope","Armadillo","Asian Black Bear","Aye-aye","Babirusa","Baboon","Badger","Bandicoot","Banteng","Barbet","Basilisk","Bat","Bearded Dragon","Bee","Bee-eater","Beetle","Bettong","Binturong","Bird-of-paradise","Bongo","Bowerbird","Bulbul","Bush Dog","Bushbaby","Bushshrike","Butterfly","Buzzard","Caecilian","Cardinal","Cassowary","Caterpillar","Centipede","Chameleon","Chimpanzee","Cicada","Civet","Clouded Leopard","Coati","Cobra","Cockatoo","Cockroach","Colugo","Cotinga","Cotton Rat","Cougar","Crane Fly","Cricket","Crocodile","Crow","Cuckoo","Cuscus","Death Adder","Deer","Dhole","Dingo","Dinosaur","Drongo","Duck","Duiker","Eagle","Echidna","Elephant","Finch","Flat-headed Cat","Flea","Flowerpecker","Fly","Flying Frog","Fossa","Frog","Frogmouth","Gaur","Gecko","Gorilla","Grison","Hawaiian Honeycreeper","Hawk","Hedgehog","Helmetshrike","Hornbill","Hyrax","Iguana","Jackal","Jaguar","Jaguarundi","Kestrel","Ladybug","Lemur","Leopard","Lion","Macaw","Mandrill","Margay","Monkey","Mouse","Mouse Deer","Newt","Okapi","Old World Flycatcher","Orangutan","Owl","Pangolin","Peafowl","Pheasant","Possum","Python","Quokka","Rabbit","Raccoon","Red Panda","Red River Hog","Rhinoceros","Sloth Bear","Spectacled Bear","Squirrel","Starling","Stick Bug","Sun Bear","Tamandua","Tamarin","Tapir","Tarantula","Thrush","Tiger","Tit","Toad","Tortoise","Toucan","Trogon","Trumpeter","Turaco","Turtle","Tyrant Flycatcher","Viper","Vulture","Wallaby","Warbler","Wasp","Waxwing","Weaver","Weaver-finch","Whistler","White-eye","Whydah","Woodswallow","Worm","Wren","Xenops","Yellowjacket","Accentor","African Buffalo","American Black Bear","Anole","Bird","Bison","Boa","Brown Bear","Chipmunk","Common Genet","Copperhead","Coyote","Deer Mouse","Dormouse","Elk","Emu","Fisher","Fox","Garter Snake","Giant Panda","Giant Tortoise","Groundhog","Grouse","Guanaco","Himalayan Tahr","Kangaroo","Koala","Numbat","Quoll","Raccoon dog","Tasmanian Devil","Thornbill","Turkey","Vole","Weasel","Wildcat","Wolf","Wombat","Woodchuck","Woodpecker"],
        //list of farm animals comes from https://www.buzzle.com/articles/farm-animals-list.html
        "farm" : ["Alpaca","Buffalo","Banteng","Cow","Cat","Chicken","Carp","Camel","Donkey","Dog","Duck","Emu","Goat","Gayal","Guinea","Goose","Horse","Honey","Llama","Pig","Pigeon","Rhea","Rabbit","Sheep","Silkworm","Turkey","Yak","Zebu"],
        //list of pet animals comes from https://www.dogbreedinfo.com/pets/pet.htm
        "pet" : ["Bearded Dragon","Birds","Burro","Cats","Chameleons","Chickens","Chinchillas","Chinese Water Dragon","Cows","Dogs","Donkey","Ducks","Ferrets","Fish","Geckos","Geese","Gerbils","Goats","Guinea Fowl","Guinea Pigs","Hamsters","Hedgehogs","Horses","Iguanas","Llamas","Lizards","Mice","Mule","Peafowl","Pigs and Hogs","Pigeons","Ponies","Pot Bellied Pig","Rabbits","Rats","Sheep","Skinks","Snakes","Stick Insects","Sugar Gliders","Tarantula","Turkeys","Turtles"],
        //list of zoo animals comes from https://bronxzoo.com/animals
        "zoo" : ["Aardvark","African Wild Dog","Aldabra Tortoise","American Alligator","American Bison","Amur Tiger","Anaconda","Andean Condor","Asian Elephant","Baby Doll Sheep","Bald Eagle","Barred Owl","Blue Iguana","Boer Goat","California Sea Lion","Caribbean Flamingo","Chinchilla","Collared Lemur","Coquerel's Sifaka","Cuban Amazon Parrot","Ebony Langur","Fennec Fox","Fossa","Gelada","Giant Anteater","Giraffe","Gorilla","Grizzly Bear","Henkel's Leaf-tailed Gecko","Indian Gharial","Indian Rhinoceros","King Cobra","King Vulture","Komodo Dragon","Linne's Two-toed Sloth","Lion","Little Penguin","Madagascar Tree Boa","Magellanic Penguin","Malayan Tapir","Malayan Tiger","Matschies Tree Kangaroo","Mini Donkey","Monarch Butterfly","Nile crocodile","North American Porcupine","Nubian Ibex","Okapi","Poison Dart Frog","Polar Bear","Pygmy Marmoset","Radiated Tortoise","Red Panda","Red Ruffed Lemur","Ring-tailed Lemur","Ring-tailed Mongoose","Rock Hyrax","Small Clawed Asian Otter","Snow Leopard","Snowy Owl","Southern White-faced Owl","Southern White Rhinocerous","Squirrel Monkey","Tufted Puffin","White Cheeked Gibbon","White-throated Bee Eater","Zebra"]
      }
  };

  var o_hasOwnProperty = Object.prototype.hasOwnProperty;
  var o_keys = (Object.keys || function(obj) {
    var result = [];
    for (var key in obj) {
      if (o_hasOwnProperty.call(obj, key)) {
        result.push(key);
      }
    }

    return result;
  });


  function _copyObject(source, target) {
    var keys = o_keys(source);
    var key;

    for (var i = 0, l = keys.length; i < l; i++) {
      key = keys[i];
      target[key] = source[key] || target[key];
    }
  }

  function _copyArray(source, target) {
    for (var i = 0, l = source.length; i < l; i++) {
      target[i] = source[i];
    }
  }

  function copyObject(source, _target) {
      var isArray = Array.isArray(source);
      var target = _target || (isArray ? new Array(source.length) : {});

      if (isArray) {
        _copyArray(source, target);
      } else {
        _copyObject(source, target);
      }

      return target;
  }

  /** Get the data based on key**/
  Chance.prototype.get = function (name) {
      return copyObject(data[name]);
  };

  // Mac Address
  Chance.prototype.mac_address = function(options){
      // typically mac addresses are separated by ":"
      // however they can also be separated by "-"
      // the network variant uses a dot every fourth byte

      options = initOptions(options);
      if(!options.separator) {
          options.separator =  options.networkVersion ? "." : ":";
      }

      var mac_pool="ABCDEF1234567890",
          mac = "";
      if(!options.networkVersion) {
          mac = this.n(this.string, 6, { pool: mac_pool, length:2 }).join(options.separator);
      } else {
          mac = this.n(this.string, 3, { pool: mac_pool, length:4 }).join(options.separator);
      }

      return mac;
  };

  Chance.prototype.normal = function (options) {
      options = initOptions(options, {mean : 0, dev : 1, pool : []});

      testRange(
          options.pool.constructor !== Array,
          "Chance: The pool option must be a valid array."
      );
      testRange(
          typeof options.mean !== 'number',
          "Chance: Mean (mean) must be a number"
      );
      testRange(
          typeof options.dev !== 'number',
          "Chance: Standard deviation (dev) must be a number"
      );

      // If a pool has been passed, then we are returning an item from that pool,
      // using the normal distribution settings that were passed in
      if (options.pool.length > 0) {
          return this.normal_pool(options);
      }

      // The Marsaglia Polar method
      var s, u, v, norm,
          mean = options.mean,
          dev = options.dev;

      do {
          // U and V are from the uniform distribution on (-1, 1)
          u = this.random() * 2 - 1;
          v = this.random() * 2 - 1;

          s = u * u + v * v;
      } while (s >= 1);

      // Compute the standard normal variate
      norm = u * Math.sqrt(-2 * Math.log(s) / s);

      // Shape and scale
      return dev * norm + mean;
  };

  Chance.prototype.normal_pool = function(options) {
      var performanceCounter = 0;
      do {
          var idx = Math.round(this.normal({ mean: options.mean, dev: options.dev }));
          if (idx < options.pool.length && idx >= 0) {
              return options.pool[idx];
          } else {
              performanceCounter++;
          }
      } while(performanceCounter < 100);

      throw new RangeError("Chance: Your pool is too small for the given mean and standard deviation. Please adjust.");
  };

  Chance.prototype.radio = function (options) {
      // Initial Letter (Typically Designated by Side of Mississippi River)
      options = initOptions(options, {side : "?"});
      var fl = "";
      switch (options.side.toLowerCase()) {
      case "east":
      case "e":
          fl = "W";
          break;
      case "west":
      case "w":
          fl = "K";
          break;
      default:
          fl = this.character({pool: "KW"});
          break;
      }

      return fl + this.character({alpha: true, casing: "upper"}) +
              this.character({alpha: true, casing: "upper"}) +
              this.character({alpha: true, casing: "upper"});
  };

  // Set the data as key and data or the data map
  Chance.prototype.set = function (name, values) {
      if (typeof name === "string") {
          data[name] = values;
      } else {
          data = copyObject(name, data);
      }
  };

  Chance.prototype.tv = function (options) {
      return this.radio(options);
  };

  // ID number for Brazil companies
  Chance.prototype.cnpj = function () {
      var n = this.n(this.natural, 8, { max: 9 });
      var d1 = 2+n[7]*6+n[6]*7+n[5]*8+n[4]*9+n[3]*2+n[2]*3+n[1]*4+n[0]*5;
      d1 = 11 - (d1 % 11);
      if (d1>=10){
          d1 = 0;
      }
      var d2 = d1*2+3+n[7]*7+n[6]*8+n[5]*9+n[4]*2+n[3]*3+n[2]*4+n[1]*5+n[0]*6;
      d2 = 11 - (d2 % 11);
      if (d2>=10){
          d2 = 0;
      }
      return ''+n[0]+n[1]+'.'+n[2]+n[3]+n[4]+'.'+n[5]+n[6]+n[7]+'/0001-'+d1+d2;
  };

  // -- End Miscellaneous --

  Chance.prototype.mersenne_twister = function (seed) {
      return new MersenneTwister(seed);
  };

  Chance.prototype.blueimp_md5 = function () {
      return new BlueImpMD5();
  };

  // Mersenne Twister from https://gist.github.com/banksean/300494
  /*
     A C-program for MT19937, with initialization improved 2002/1/26.
     Coded by Takuji Nishimura and Makoto Matsumoto.

     Before using, initialize the state by using init_genrand(seed)
     or init_by_array(init_key, key_length).

     Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
     All rights reserved.

     Redistribution and use in source and binary forms, with or without
     modification, are permitted provided that the following conditions
     are met:

     1. Redistributions of source code must retain the above copyright
     notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
     notice, this list of conditions and the following disclaimer in the
     documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote
     products derived from this software without specific prior written
     permission.

     THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
     "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
     LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
     A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
     CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
     EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
     PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
     PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
     LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
     NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
     SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


     Any feedback is very welcome.
     http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
     email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
   */
  var MersenneTwister = function (seed) {
      if (seed === undefined) {
          // kept random number same size as time used previously to ensure no unexpected results downstream
          seed = Math.floor(Math.random()*Math.pow(10,13));
      }
      /* Period parameters */
      this.N = 624;
      this.M = 397;
      this.MATRIX_A = 0x9908b0df;   /* constant vector a */
      this.UPPER_MASK = 0x80000000; /* most significant w-r bits */
      this.LOWER_MASK = 0x7fffffff; /* least significant r bits */

      this.mt = new Array(this.N); /* the array for the state vector */
      this.mti = this.N + 1; /* mti==N + 1 means mt[N] is not initialized */

      this.init_genrand(seed);
  };

  /* initializes mt[N] with a seed */
  MersenneTwister.prototype.init_genrand = function (s) {
      this.mt[0] = s >>> 0;
      for (this.mti = 1; this.mti < this.N; this.mti++) {
          s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
          this.mt[this.mti] = (((((s & 0xffff0000) >>> 16) * 1812433253) << 16) + (s & 0x0000ffff) * 1812433253) + this.mti;
          /* See Knuth TAOCP Vol2. 3rd Ed. P.106 for multiplier. */
          /* In the previous versions, MSBs of the seed affect   */
          /* only MSBs of the array mt[].                        */
          /* 2002/01/09 modified by Makoto Matsumoto             */
          this.mt[this.mti] >>>= 0;
          /* for >32 bit machines */
      }
  };

  /* initialize by an array with array-length */
  /* init_key is the array for initializing keys */
  /* key_length is its length */
  /* slight change for C++, 2004/2/26 */
  MersenneTwister.prototype.init_by_array = function (init_key, key_length) {
      var i = 1, j = 0, k, s;
      this.init_genrand(19650218);
      k = (this.N > key_length ? this.N : key_length);
      for (; k; k--) {
          s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
          this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1664525) << 16) + ((s & 0x0000ffff) * 1664525))) + init_key[j] + j; /* non linear */
          this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
          i++;
          j++;
          if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
          if (j >= key_length) { j = 0; }
      }
      for (k = this.N - 1; k; k--) {
          s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
          this.mt[i] = (this.mt[i] ^ (((((s & 0xffff0000) >>> 16) * 1566083941) << 16) + (s & 0x0000ffff) * 1566083941)) - i; /* non linear */
          this.mt[i] >>>= 0; /* for WORDSIZE > 32 machines */
          i++;
          if (i >= this.N) { this.mt[0] = this.mt[this.N - 1]; i = 1; }
      }

      this.mt[0] = 0x80000000; /* MSB is 1; assuring non-zero initial array */
  };

  /* generates a random number on [0,0xffffffff]-interval */
  MersenneTwister.prototype.genrand_int32 = function () {
      var y;
      var mag01 = new Array(0x0, this.MATRIX_A);
      /* mag01[x] = x * MATRIX_A  for x=0,1 */

      if (this.mti >= this.N) { /* generate N words at one time */
          var kk;

          if (this.mti === this.N + 1) {   /* if init_genrand() has not been called, */
              this.init_genrand(5489); /* a default initial seed is used */
          }
          for (kk = 0; kk < this.N - this.M; kk++) {
              y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
              this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ mag01[y & 0x1];
          }
          for (;kk < this.N - 1; kk++) {
              y = (this.mt[kk]&this.UPPER_MASK)|(this.mt[kk + 1]&this.LOWER_MASK);
              this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ mag01[y & 0x1];
          }
          y = (this.mt[this.N - 1]&this.UPPER_MASK)|(this.mt[0]&this.LOWER_MASK);
          this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ mag01[y & 0x1];

          this.mti = 0;
      }

      y = this.mt[this.mti++];

      /* Tempering */
      y ^= (y >>> 11);
      y ^= (y << 7) & 0x9d2c5680;
      y ^= (y << 15) & 0xefc60000;
      y ^= (y >>> 18);

      return y >>> 0;
  };

  /* generates a random number on [0,0x7fffffff]-interval */
  MersenneTwister.prototype.genrand_int31 = function () {
      return (this.genrand_int32() >>> 1);
  };

  /* generates a random number on [0,1]-real-interval */
  MersenneTwister.prototype.genrand_real1 = function () {
      return this.genrand_int32() * (1.0 / 4294967295.0);
      /* divided by 2^32-1 */
  };

  /* generates a random number on [0,1)-real-interval */
  MersenneTwister.prototype.random = function () {
      return this.genrand_int32() * (1.0 / 4294967296.0);
      /* divided by 2^32 */
  };

  /* generates a random number on (0,1)-real-interval */
  MersenneTwister.prototype.genrand_real3 = function () {
      return (this.genrand_int32() + 0.5) * (1.0 / 4294967296.0);
      /* divided by 2^32 */
  };

  /* generates a random number on [0,1) with 53-bit resolution*/
  MersenneTwister.prototype.genrand_res53 = function () {
      var a = this.genrand_int32()>>>5, b = this.genrand_int32()>>>6;
      return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  };

  // BlueImp MD5 hashing algorithm from https://github.com/blueimp/JavaScript-MD5
  var BlueImpMD5 = function () {};

  BlueImpMD5.prototype.VERSION = '1.0.1';

  /*
  * Add integers, wrapping at 2^32. This uses 16-bit operations internally
  * to work around bugs in some JS interpreters.
  */
  BlueImpMD5.prototype.safe_add = function safe_add(x, y) {
      var lsw = (x & 0xFFFF) + (y & 0xFFFF),
          msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return (msw << 16) | (lsw & 0xFFFF);
  };

  /*
  * Bitwise rotate a 32-bit number to the left.
  */
  BlueImpMD5.prototype.bit_roll = function (num, cnt) {
      return (num << cnt) | (num >>> (32 - cnt));
  };

  /*
  * These functions implement the five basic operations the algorithm uses.
  */
  BlueImpMD5.prototype.md5_cmn = function (q, a, b, x, s, t) {
      return this.safe_add(this.bit_roll(this.safe_add(this.safe_add(a, q), this.safe_add(x, t)), s), b);
  };
  BlueImpMD5.prototype.md5_ff = function (a, b, c, d, x, s, t) {
      return this.md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
  };
  BlueImpMD5.prototype.md5_gg = function (a, b, c, d, x, s, t) {
      return this.md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
  };
  BlueImpMD5.prototype.md5_hh = function (a, b, c, d, x, s, t) {
      return this.md5_cmn(b ^ c ^ d, a, b, x, s, t);
  };
  BlueImpMD5.prototype.md5_ii = function (a, b, c, d, x, s, t) {
      return this.md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
  };

  /*
  * Calculate the MD5 of an array of little-endian words, and a bit length.
  */
  BlueImpMD5.prototype.binl_md5 = function (x, len) {
      /* append padding */
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;

      var i, olda, oldb, oldc, oldd,
          a =  1732584193,
          b = -271733879,
          c = -1732584194,
          d =  271733878;

      for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;

          a = this.md5_ff(a, b, c, d, x[i],       7, -680876936);
          d = this.md5_ff(d, a, b, c, x[i +  1], 12, -389564586);
          c = this.md5_ff(c, d, a, b, x[i +  2], 17,  606105819);
          b = this.md5_ff(b, c, d, a, x[i +  3], 22, -1044525330);
          a = this.md5_ff(a, b, c, d, x[i +  4],  7, -176418897);
          d = this.md5_ff(d, a, b, c, x[i +  5], 12,  1200080426);
          c = this.md5_ff(c, d, a, b, x[i +  6], 17, -1473231341);
          b = this.md5_ff(b, c, d, a, x[i +  7], 22, -45705983);
          a = this.md5_ff(a, b, c, d, x[i +  8],  7,  1770035416);
          d = this.md5_ff(d, a, b, c, x[i +  9], 12, -1958414417);
          c = this.md5_ff(c, d, a, b, x[i + 10], 17, -42063);
          b = this.md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
          a = this.md5_ff(a, b, c, d, x[i + 12],  7,  1804603682);
          d = this.md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
          c = this.md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
          b = this.md5_ff(b, c, d, a, x[i + 15], 22,  1236535329);

          a = this.md5_gg(a, b, c, d, x[i +  1],  5, -165796510);
          d = this.md5_gg(d, a, b, c, x[i +  6],  9, -1069501632);
          c = this.md5_gg(c, d, a, b, x[i + 11], 14,  643717713);
          b = this.md5_gg(b, c, d, a, x[i],      20, -373897302);
          a = this.md5_gg(a, b, c, d, x[i +  5],  5, -701558691);
          d = this.md5_gg(d, a, b, c, x[i + 10],  9,  38016083);
          c = this.md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
          b = this.md5_gg(b, c, d, a, x[i +  4], 20, -405537848);
          a = this.md5_gg(a, b, c, d, x[i +  9],  5,  568446438);
          d = this.md5_gg(d, a, b, c, x[i + 14],  9, -1019803690);
          c = this.md5_gg(c, d, a, b, x[i +  3], 14, -187363961);
          b = this.md5_gg(b, c, d, a, x[i +  8], 20,  1163531501);
          a = this.md5_gg(a, b, c, d, x[i + 13],  5, -1444681467);
          d = this.md5_gg(d, a, b, c, x[i +  2],  9, -51403784);
          c = this.md5_gg(c, d, a, b, x[i +  7], 14,  1735328473);
          b = this.md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

          a = this.md5_hh(a, b, c, d, x[i +  5],  4, -378558);
          d = this.md5_hh(d, a, b, c, x[i +  8], 11, -2022574463);
          c = this.md5_hh(c, d, a, b, x[i + 11], 16,  1839030562);
          b = this.md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
          a = this.md5_hh(a, b, c, d, x[i +  1],  4, -1530992060);
          d = this.md5_hh(d, a, b, c, x[i +  4], 11,  1272893353);
          c = this.md5_hh(c, d, a, b, x[i +  7], 16, -155497632);
          b = this.md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
          a = this.md5_hh(a, b, c, d, x[i + 13],  4,  681279174);
          d = this.md5_hh(d, a, b, c, x[i],      11, -358537222);
          c = this.md5_hh(c, d, a, b, x[i +  3], 16, -722521979);
          b = this.md5_hh(b, c, d, a, x[i +  6], 23,  76029189);
          a = this.md5_hh(a, b, c, d, x[i +  9],  4, -640364487);
          d = this.md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
          c = this.md5_hh(c, d, a, b, x[i + 15], 16,  530742520);
          b = this.md5_hh(b, c, d, a, x[i +  2], 23, -995338651);

          a = this.md5_ii(a, b, c, d, x[i],       6, -198630844);
          d = this.md5_ii(d, a, b, c, x[i +  7], 10,  1126891415);
          c = this.md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
          b = this.md5_ii(b, c, d, a, x[i +  5], 21, -57434055);
          a = this.md5_ii(a, b, c, d, x[i + 12],  6,  1700485571);
          d = this.md5_ii(d, a, b, c, x[i +  3], 10, -1894986606);
          c = this.md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
          b = this.md5_ii(b, c, d, a, x[i +  1], 21, -2054922799);
          a = this.md5_ii(a, b, c, d, x[i +  8],  6,  1873313359);
          d = this.md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
          c = this.md5_ii(c, d, a, b, x[i +  6], 15, -1560198380);
          b = this.md5_ii(b, c, d, a, x[i + 13], 21,  1309151649);
          a = this.md5_ii(a, b, c, d, x[i +  4],  6, -145523070);
          d = this.md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
          c = this.md5_ii(c, d, a, b, x[i +  2], 15,  718787259);
          b = this.md5_ii(b, c, d, a, x[i +  9], 21, -343485551);

          a = this.safe_add(a, olda);
          b = this.safe_add(b, oldb);
          c = this.safe_add(c, oldc);
          d = this.safe_add(d, oldd);
      }
      return [a, b, c, d];
  };

  /*
  * Convert an array of little-endian words to a string
  */
  BlueImpMD5.prototype.binl2rstr = function (input) {
      var i,
          output = '';
      for (i = 0; i < input.length * 32; i += 8) {
          output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
      }
      return output;
  };

  /*
  * Convert a raw string to an array of little-endian words
  * Characters >255 have their high-byte silently ignored.
  */
  BlueImpMD5.prototype.rstr2binl = function (input) {
      var i,
          output = [];
      output[(input.length >> 2) - 1] = undefined;
      for (i = 0; i < output.length; i += 1) {
          output[i] = 0;
      }
      for (i = 0; i < input.length * 8; i += 8) {
          output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
      }
      return output;
  };

  /*
  * Calculate the MD5 of a raw string
  */
  BlueImpMD5.prototype.rstr_md5 = function (s) {
      return this.binl2rstr(this.binl_md5(this.rstr2binl(s), s.length * 8));
  };

  /*
  * Calculate the HMAC-MD5, of a key and some data (raw strings)
  */
  BlueImpMD5.prototype.rstr_hmac_md5 = function (key, data) {
      var i,
          bkey = this.rstr2binl(key),
          ipad = [],
          opad = [],
          hash;
      ipad[15] = opad[15] = undefined;
      if (bkey.length > 16) {
          bkey = this.binl_md5(bkey, key.length * 8);
      }
      for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
      }
      hash = this.binl_md5(ipad.concat(this.rstr2binl(data)), 512 + data.length * 8);
      return this.binl2rstr(this.binl_md5(opad.concat(hash), 512 + 128));
  };

  /*
  * Convert a raw string to a hex string
  */
  BlueImpMD5.prototype.rstr2hex = function (input) {
      var hex_tab = '0123456789abcdef',
          output = '',
          x,
          i;
      for (i = 0; i < input.length; i += 1) {
          x = input.charCodeAt(i);
          output += hex_tab.charAt((x >>> 4) & 0x0F) +
              hex_tab.charAt(x & 0x0F);
      }
      return output;
  };

  /*
  * Encode a string as utf-8
  */
  BlueImpMD5.prototype.str2rstr_utf8 = function (input) {
      return unescape(encodeURIComponent(input));
  };

  /*
  * Take string arguments and return either raw or hex encoded strings
  */
  BlueImpMD5.prototype.raw_md5 = function (s) {
      return this.rstr_md5(this.str2rstr_utf8(s));
  };
  BlueImpMD5.prototype.hex_md5 = function (s) {
      return this.rstr2hex(this.raw_md5(s));
  };
  BlueImpMD5.prototype.raw_hmac_md5 = function (k, d) {
      return this.rstr_hmac_md5(this.str2rstr_utf8(k), this.str2rstr_utf8(d));
  };
  BlueImpMD5.prototype.hex_hmac_md5 = function (k, d) {
      return this.rstr2hex(this.raw_hmac_md5(k, d));
  };

  BlueImpMD5.prototype.md5 = function (string, key, raw) {
      if (!key) {
          if (!raw) {
              return this.hex_md5(string);
          }

          return this.raw_md5(string);
      }

      if (!raw) {
          return this.hex_hmac_md5(key, string);
      }

      return this.raw_hmac_md5(key, string);
  };

  // CommonJS module
  if (typeof exports !== 'undefined') {
      if (typeof module !== 'undefined' && module.exports) {
          exports = module.exports = Chance;
      }
      exports.Chance = Chance;
  }

  // Register as an anonymous AMD module
  if (typeof define === 'function' && define.amd) {
      define([], function () {
          return Chance;
      });
  }

  // if there is a importsScrips object define chance for worker
  // allows worker to use full Chance functionality with seed
  if (typeof importScripts !== 'undefined') {
      chance = new Chance();
      self.Chance = Chance;
  }

  // If there is a window object, that at least has a document property,
  // instantiate and define chance on the window
  if (typeof window === "object" && typeof window.document === "object") {
      window.Chance = Chance;
      window.chance = new Chance();
  }
})();
/**!

 @license
 handlebars v4.0.12

Copyright (C) 2011-2017 by Yehuda Katz

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Handlebars"] = factory();
	else
		root["Handlebars"] = factory();
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _handlebarsRuntime = __webpack_require__(2);

	var _handlebarsRuntime2 = _interopRequireDefault(_handlebarsRuntime);

	// Compiler imports

	var _handlebarsCompilerAst = __webpack_require__(35);

	var _handlebarsCompilerAst2 = _interopRequireDefault(_handlebarsCompilerAst);

	var _handlebarsCompilerBase = __webpack_require__(36);

	var _handlebarsCompilerCompiler = __webpack_require__(41);

	var _handlebarsCompilerJavascriptCompiler = __webpack_require__(42);

	var _handlebarsCompilerJavascriptCompiler2 = _interopRequireDefault(_handlebarsCompilerJavascriptCompiler);

	var _handlebarsCompilerVisitor = __webpack_require__(39);

	var _handlebarsCompilerVisitor2 = _interopRequireDefault(_handlebarsCompilerVisitor);

	var _handlebarsNoConflict = __webpack_require__(34);

	var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

	var _create = _handlebarsRuntime2['default'].create;
	function create() {
	  var hb = _create();

	  hb.compile = function (input, options) {
	    return _handlebarsCompilerCompiler.compile(input, options, hb);
	  };
	  hb.precompile = function (input, options) {
	    return _handlebarsCompilerCompiler.precompile(input, options, hb);
	  };

	  hb.AST = _handlebarsCompilerAst2['default'];
	  hb.Compiler = _handlebarsCompilerCompiler.Compiler;
	  hb.JavaScriptCompiler = _handlebarsCompilerJavascriptCompiler2['default'];
	  hb.Parser = _handlebarsCompilerBase.parser;
	  hb.parse = _handlebarsCompilerBase.parse;

	  return hb;
	}

	var inst = create();
	inst.create = create;

	_handlebarsNoConflict2['default'](inst);

	inst.Visitor = _handlebarsCompilerVisitor2['default'];

	inst['default'] = inst;

	exports['default'] = inst;
	module.exports = exports['default'];

/***/ }),
/* 1 */
/***/ (function(module, exports) {

	"use strict";

	exports["default"] = function (obj) {
	  return obj && obj.__esModule ? obj : {
	    "default": obj
	  };
	};

	exports.__esModule = true;

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireWildcard = __webpack_require__(3)['default'];

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _handlebarsBase = __webpack_require__(4);

	var base = _interopRequireWildcard(_handlebarsBase);

	// Each of these augment the Handlebars object. No need to setup here.
	// (This is done to easily share code between commonjs and browse envs)

	var _handlebarsSafeString = __webpack_require__(21);

	var _handlebarsSafeString2 = _interopRequireDefault(_handlebarsSafeString);

	var _handlebarsException = __webpack_require__(6);

	var _handlebarsException2 = _interopRequireDefault(_handlebarsException);

	var _handlebarsUtils = __webpack_require__(5);

	var Utils = _interopRequireWildcard(_handlebarsUtils);

	var _handlebarsRuntime = __webpack_require__(22);

	var runtime = _interopRequireWildcard(_handlebarsRuntime);

	var _handlebarsNoConflict = __webpack_require__(34);

	var _handlebarsNoConflict2 = _interopRequireDefault(_handlebarsNoConflict);

	// For compatibility and usage outside of module systems, make the Handlebars object a namespace
	function create() {
	  var hb = new base.HandlebarsEnvironment();

	  Utils.extend(hb, base);
	  hb.SafeString = _handlebarsSafeString2['default'];
	  hb.Exception = _handlebarsException2['default'];
	  hb.Utils = Utils;
	  hb.escapeExpression = Utils.escapeExpression;

	  hb.VM = runtime;
	  hb.template = function (spec) {
	    return runtime.template(spec, hb);
	  };

	  return hb;
	}

	var inst = create();
	inst.create = create;

	_handlebarsNoConflict2['default'](inst);

	inst['default'] = inst;

	exports['default'] = inst;
	module.exports = exports['default'];

/***/ }),
/* 3 */
/***/ (function(module, exports) {

	"use strict";

	exports["default"] = function (obj) {
	  if (obj && obj.__esModule) {
	    return obj;
	  } else {
	    var newObj = {};

	    if (obj != null) {
	      for (var key in obj) {
	        if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key];
	      }
	    }

	    newObj["default"] = obj;
	    return newObj;
	  }
	};

	exports.__esModule = true;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.HandlebarsEnvironment = HandlebarsEnvironment;

	var _utils = __webpack_require__(5);

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	var _helpers = __webpack_require__(10);

	var _decorators = __webpack_require__(18);

	var _logger = __webpack_require__(20);

	var _logger2 = _interopRequireDefault(_logger);

	var VERSION = '4.0.12';
	exports.VERSION = VERSION;
	var COMPILER_REVISION = 7;

	exports.COMPILER_REVISION = COMPILER_REVISION;
	var REVISION_CHANGES = {
	  1: '<= 1.0.rc.2', // 1.0.rc.2 is actually rev2 but doesn't report it
	  2: '== 1.0.0-rc.3',
	  3: '== 1.0.0-rc.4',
	  4: '== 1.x.x',
	  5: '== 2.0.0-alpha.x',
	  6: '>= 2.0.0-beta.1',
	  7: '>= 4.0.0'
	};

	exports.REVISION_CHANGES = REVISION_CHANGES;
	var objectType = '[object Object]';

	function HandlebarsEnvironment(helpers, partials, decorators) {
	  this.helpers = helpers || {};
	  this.partials = partials || {};
	  this.decorators = decorators || {};

	  _helpers.registerDefaultHelpers(this);
	  _decorators.registerDefaultDecorators(this);
	}

	HandlebarsEnvironment.prototype = {
	  constructor: HandlebarsEnvironment,

	  logger: _logger2['default'],
	  log: _logger2['default'].log,

	  registerHelper: function registerHelper(name, fn) {
	    if (_utils.toString.call(name) === objectType) {
	      if (fn) {
	        throw new _exception2['default']('Arg not supported with multiple helpers');
	      }
	      _utils.extend(this.helpers, name);
	    } else {
	      this.helpers[name] = fn;
	    }
	  },
	  unregisterHelper: function unregisterHelper(name) {
	    delete this.helpers[name];
	  },

	  registerPartial: function registerPartial(name, partial) {
	    if (_utils.toString.call(name) === objectType) {
	      _utils.extend(this.partials, name);
	    } else {
	      if (typeof partial === 'undefined') {
	        throw new _exception2['default']('Attempting to register a partial called "' + name + '" as undefined');
	      }
	      this.partials[name] = partial;
	    }
	  },
	  unregisterPartial: function unregisterPartial(name) {
	    delete this.partials[name];
	  },

	  registerDecorator: function registerDecorator(name, fn) {
	    if (_utils.toString.call(name) === objectType) {
	      if (fn) {
	        throw new _exception2['default']('Arg not supported with multiple decorators');
	      }
	      _utils.extend(this.decorators, name);
	    } else {
	      this.decorators[name] = fn;
	    }
	  },
	  unregisterDecorator: function unregisterDecorator(name) {
	    delete this.decorators[name];
	  }
	};

	var log = _logger2['default'].log;

	exports.log = log;
	exports.createFrame = _utils.createFrame;
	exports.logger = _logger2['default'];

/***/ }),
/* 5 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;
	exports.extend = extend;
	exports.indexOf = indexOf;
	exports.escapeExpression = escapeExpression;
	exports.isEmpty = isEmpty;
	exports.createFrame = createFrame;
	exports.blockParams = blockParams;
	exports.appendContextPath = appendContextPath;
	var escape = {
	  '&': '&amp;',
	  '<': '&lt;',
	  '>': '&gt;',
	  '"': '&quot;',
	  "'": '&#x27;',
	  '`': '&#x60;',
	  '=': '&#x3D;'
	};

	var badChars = /[&<>"'`=]/g,
	    possible = /[&<>"'`=]/;

	function escapeChar(chr) {
	  return escape[chr];
	}

	function extend(obj /* , ...source */) {
	  for (var i = 1; i < arguments.length; i++) {
	    for (var key in arguments[i]) {
	      if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
	        obj[key] = arguments[i][key];
	      }
	    }
	  }

	  return obj;
	}

	var toString = Object.prototype.toString;

	exports.toString = toString;
	// Sourced from lodash
	// https://github.com/bestiejs/lodash/blob/master/LICENSE.txt
	/* eslint-disable func-style */
	var isFunction = function isFunction(value) {
	  return typeof value === 'function';
	};
	// fallback for older versions of Chrome and Safari
	/* istanbul ignore next */
	if (isFunction(/x/)) {
	  exports.isFunction = isFunction = function (value) {
	    return typeof value === 'function' && toString.call(value) === '[object Function]';
	  };
	}
	exports.isFunction = isFunction;

	/* eslint-enable func-style */

	/* istanbul ignore next */
	var isArray = Array.isArray || function (value) {
	  return value && typeof value === 'object' ? toString.call(value) === '[object Array]' : false;
	};

	exports.isArray = isArray;
	// Older IE versions do not directly support indexOf so we must implement our own, sadly.

	function indexOf(array, value) {
	  for (var i = 0, len = array.length; i < len; i++) {
	    if (array[i] === value) {
	      return i;
	    }
	  }
	  return -1;
	}

	function escapeExpression(string) {
	  if (typeof string !== 'string') {
	    // don't escape SafeStrings, since they're already safe
	    if (string && string.toHTML) {
	      return string.toHTML();
	    } else if (string == null) {
	      return '';
	    } else if (!string) {
	      return string + '';
	    }

	    // Force a string conversion as this will be done by the append regardless and
	    // the regex test will do this transparently behind the scenes, causing issues if
	    // an object's to string has escaped characters in it.
	    string = '' + string;
	  }

	  if (!possible.test(string)) {
	    return string;
	  }
	  return string.replace(badChars, escapeChar);
	}

	function isEmpty(value) {
	  if (!value && value !== 0) {
	    return true;
	  } else if (isArray(value) && value.length === 0) {
	    return true;
	  } else {
	    return false;
	  }
	}

	function createFrame(object) {
	  var frame = extend({}, object);
	  frame._parent = object;
	  return frame;
	}

	function blockParams(params, ids) {
	  params.path = ids;
	  return params;
	}

	function appendContextPath(contextPath, id) {
	  return (contextPath ? contextPath + '.' : '') + id;
	}

/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$defineProperty = __webpack_require__(7)['default'];

	exports.__esModule = true;

	var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

	function Exception(message, node) {
	  var loc = node && node.loc,
	      line = undefined,
	      column = undefined;
	  if (loc) {
	    line = loc.start.line;
	    column = loc.start.column;

	    message += ' - ' + line + ':' + column;
	  }

	  var tmp = Error.prototype.constructor.call(this, message);

	  // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
	  for (var idx = 0; idx < errorProps.length; idx++) {
	    this[errorProps[idx]] = tmp[errorProps[idx]];
	  }

	  /* istanbul ignore else */
	  if (Error.captureStackTrace) {
	    Error.captureStackTrace(this, Exception);
	  }

	  try {
	    if (loc) {
	      this.lineNumber = line;

	      // Work around issue under safari where we can't directly set the column value
	      /* istanbul ignore next */
	      if (_Object$defineProperty) {
	        Object.defineProperty(this, 'column', {
	          value: column,
	          enumerable: true
	        });
	      } else {
	        this.column = column;
	      }
	    }
	  } catch (nop) {
	    /* Ignore if the browser is very particular */
	  }
	}

	Exception.prototype = new Error();

	exports['default'] = Exception;
	module.exports = exports['default'];

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(8), __esModule: true };

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	var $ = __webpack_require__(9);
	module.exports = function defineProperty(it, key, desc){
	  return $.setDesc(it, key, desc);
	};

/***/ }),
/* 9 */
/***/ (function(module, exports) {

	var $Object = Object;
	module.exports = {
	  create:     $Object.create,
	  getProto:   $Object.getPrototypeOf,
	  isEnum:     {}.propertyIsEnumerable,
	  getDesc:    $Object.getOwnPropertyDescriptor,
	  setDesc:    $Object.defineProperty,
	  setDescs:   $Object.defineProperties,
	  getKeys:    $Object.keys,
	  getNames:   $Object.getOwnPropertyNames,
	  getSymbols: $Object.getOwnPropertySymbols,
	  each:       [].forEach
	};

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.registerDefaultHelpers = registerDefaultHelpers;

	var _helpersBlockHelperMissing = __webpack_require__(11);

	var _helpersBlockHelperMissing2 = _interopRequireDefault(_helpersBlockHelperMissing);

	var _helpersEach = __webpack_require__(12);

	var _helpersEach2 = _interopRequireDefault(_helpersEach);

	var _helpersHelperMissing = __webpack_require__(13);

	var _helpersHelperMissing2 = _interopRequireDefault(_helpersHelperMissing);

	var _helpersIf = __webpack_require__(14);

	var _helpersIf2 = _interopRequireDefault(_helpersIf);

	var _helpersLog = __webpack_require__(15);

	var _helpersLog2 = _interopRequireDefault(_helpersLog);

	var _helpersLookup = __webpack_require__(16);

	var _helpersLookup2 = _interopRequireDefault(_helpersLookup);

	var _helpersWith = __webpack_require__(17);

	var _helpersWith2 = _interopRequireDefault(_helpersWith);

	function registerDefaultHelpers(instance) {
	  _helpersBlockHelperMissing2['default'](instance);
	  _helpersEach2['default'](instance);
	  _helpersHelperMissing2['default'](instance);
	  _helpersIf2['default'](instance);
	  _helpersLog2['default'](instance);
	  _helpersLookup2['default'](instance);
	  _helpersWith2['default'](instance);
	}

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	exports['default'] = function (instance) {
	  instance.registerHelper('blockHelperMissing', function (context, options) {
	    var inverse = options.inverse,
	        fn = options.fn;

	    if (context === true) {
	      return fn(this);
	    } else if (context === false || context == null) {
	      return inverse(this);
	    } else if (_utils.isArray(context)) {
	      if (context.length > 0) {
	        if (options.ids) {
	          options.ids = [options.name];
	        }

	        return instance.helpers.each(context, options);
	      } else {
	        return inverse(this);
	      }
	    } else {
	      if (options.data && options.ids) {
	        var data = _utils.createFrame(options.data);
	        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.name);
	        options = { data: data };
	      }

	      return fn(context, options);
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('each', function (context, options) {
	    if (!options) {
	      throw new _exception2['default']('Must pass iterator to #each');
	    }

	    var fn = options.fn,
	        inverse = options.inverse,
	        i = 0,
	        ret = '',
	        data = undefined,
	        contextPath = undefined;

	    if (options.data && options.ids) {
	      contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]) + '.';
	    }

	    if (_utils.isFunction(context)) {
	      context = context.call(this);
	    }

	    if (options.data) {
	      data = _utils.createFrame(options.data);
	    }

	    function execIteration(field, index, last) {
	      if (data) {
	        data.key = field;
	        data.index = index;
	        data.first = index === 0;
	        data.last = !!last;

	        if (contextPath) {
	          data.contextPath = contextPath + field;
	        }
	      }

	      ret = ret + fn(context[field], {
	        data: data,
	        blockParams: _utils.blockParams([context[field], field], [contextPath + field, null])
	      });
	    }

	    if (context && typeof context === 'object') {
	      if (_utils.isArray(context)) {
	        for (var j = context.length; i < j; i++) {
	          if (i in context) {
	            execIteration(i, i, i === context.length - 1);
	          }
	        }
	      } else {
	        var priorKey = undefined;

	        for (var key in context) {
	          if (context.hasOwnProperty(key)) {
	            // We're running the iterations one step out of sync so we can detect
	            // the last iteration without have to scan the object twice and create
	            // an itermediate keys array.
	            if (priorKey !== undefined) {
	              execIteration(priorKey, i - 1);
	            }
	            priorKey = key;
	            i++;
	          }
	        }
	        if (priorKey !== undefined) {
	          execIteration(priorKey, i - 1, true);
	        }
	      }
	    }

	    if (i === 0) {
	      ret = inverse(this);
	    }

	    return ret;
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	exports['default'] = function (instance) {
	  instance.registerHelper('helperMissing', function () /* [args, ]options */{
	    if (arguments.length === 1) {
	      // A missing field in a {{foo}} construct.
	      return undefined;
	    } else {
	      // Someone is actually trying to call something, blow up.
	      throw new _exception2['default']('Missing helper: "' + arguments[arguments.length - 1].name + '"');
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	exports['default'] = function (instance) {
	  instance.registerHelper('if', function (conditional, options) {
	    if (_utils.isFunction(conditional)) {
	      conditional = conditional.call(this);
	    }

	    // Default behavior is to render the positive path if the value is truthy and not empty.
	    // The `includeZero` option may be set to treat the condtional as purely not empty based on the
	    // behavior of isEmpty. Effectively this determines if 0 is handled by the positive path or negative.
	    if (!options.hash.includeZero && !conditional || _utils.isEmpty(conditional)) {
	      return options.inverse(this);
	    } else {
	      return options.fn(this);
	    }
	  });

	  instance.registerHelper('unless', function (conditional, options) {
	    return instance.helpers['if'].call(this, conditional, { fn: options.inverse, inverse: options.fn, hash: options.hash });
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 15 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;

	exports['default'] = function (instance) {
	  instance.registerHelper('log', function () /* message, options */{
	    var args = [undefined],
	        options = arguments[arguments.length - 1];
	    for (var i = 0; i < arguments.length - 1; i++) {
	      args.push(arguments[i]);
	    }

	    var level = 1;
	    if (options.hash.level != null) {
	      level = options.hash.level;
	    } else if (options.data && options.data.level != null) {
	      level = options.data.level;
	    }
	    args[0] = level;

	    instance.log.apply(instance, args);
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 16 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;

	exports['default'] = function (instance) {
	  instance.registerHelper('lookup', function (obj, field) {
	    return obj && obj[field];
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	exports['default'] = function (instance) {
	  instance.registerHelper('with', function (context, options) {
	    if (_utils.isFunction(context)) {
	      context = context.call(this);
	    }

	    var fn = options.fn;

	    if (!_utils.isEmpty(context)) {
	      var data = options.data;
	      if (options.data && options.ids) {
	        data = _utils.createFrame(options.data);
	        data.contextPath = _utils.appendContextPath(options.data.contextPath, options.ids[0]);
	      }

	      return fn(context, {
	        data: data,
	        blockParams: _utils.blockParams([context], [data && data.contextPath])
	      });
	    } else {
	      return options.inverse(this);
	    }
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.registerDefaultDecorators = registerDefaultDecorators;

	var _decoratorsInline = __webpack_require__(19);

	var _decoratorsInline2 = _interopRequireDefault(_decoratorsInline);

	function registerDefaultDecorators(instance) {
	  _decoratorsInline2['default'](instance);
	}

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	exports['default'] = function (instance) {
	  instance.registerDecorator('inline', function (fn, props, container, options) {
	    var ret = fn;
	    if (!props.partials) {
	      props.partials = {};
	      ret = function (context, options) {
	        // Create a new partials stack frame prior to exec.
	        var original = container.partials;
	        container.partials = _utils.extend({}, original, props.partials);
	        var ret = fn(context, options);
	        container.partials = original;
	        return ret;
	      };
	    }

	    props.partials[options.args[0]] = options.fn;

	    return ret;
	  });
	};

	module.exports = exports['default'];

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	var logger = {
	  methodMap: ['debug', 'info', 'warn', 'error'],
	  level: 'info',

	  // Maps a given level value to the `methodMap` indexes above.
	  lookupLevel: function lookupLevel(level) {
	    if (typeof level === 'string') {
	      var levelMap = _utils.indexOf(logger.methodMap, level.toLowerCase());
	      if (levelMap >= 0) {
	        level = levelMap;
	      } else {
	        level = parseInt(level, 10);
	      }
	    }

	    return level;
	  },

	  // Can be overridden in the host environment
	  log: function log(level) {
	    level = logger.lookupLevel(level);

	    if (typeof console !== 'undefined' && logger.lookupLevel(logger.level) <= level) {
	      var method = logger.methodMap[level];
	      if (!console[method]) {
	        // eslint-disable-line no-console
	        method = 'log';
	      }

	      for (var _len = arguments.length, message = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
	        message[_key - 1] = arguments[_key];
	      }

	      console[method].apply(console, message); // eslint-disable-line no-console
	    }
	  }
	};

	exports['default'] = logger;
	module.exports = exports['default'];

/***/ }),
/* 21 */
/***/ (function(module, exports) {

	// Build out our basic SafeString type
	'use strict';

	exports.__esModule = true;
	function SafeString(string) {
	  this.string = string;
	}

	SafeString.prototype.toString = SafeString.prototype.toHTML = function () {
	  return '' + this.string;
	};

	exports['default'] = SafeString;
	module.exports = exports['default'];

/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _Object$seal = __webpack_require__(23)['default'];

	var _interopRequireWildcard = __webpack_require__(3)['default'];

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.checkRevision = checkRevision;
	exports.template = template;
	exports.wrapProgram = wrapProgram;
	exports.resolvePartial = resolvePartial;
	exports.invokePartial = invokePartial;
	exports.noop = noop;

	var _utils = __webpack_require__(5);

	var Utils = _interopRequireWildcard(_utils);

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	var _base = __webpack_require__(4);

	function checkRevision(compilerInfo) {
	  var compilerRevision = compilerInfo && compilerInfo[0] || 1,
	      currentRevision = _base.COMPILER_REVISION;

	  if (compilerRevision !== currentRevision) {
	    if (compilerRevision < currentRevision) {
	      var runtimeVersions = _base.REVISION_CHANGES[currentRevision],
	          compilerVersions = _base.REVISION_CHANGES[compilerRevision];
	      throw new _exception2['default']('Template was precompiled with an older version of Handlebars than the current runtime. ' + 'Please update your precompiler to a newer version (' + runtimeVersions + ') or downgrade your runtime to an older version (' + compilerVersions + ').');
	    } else {
	      // Use the embedded version info since the runtime doesn't know about this revision yet
	      throw new _exception2['default']('Template was precompiled with a newer version of Handlebars than the current runtime. ' + 'Please update your runtime to a newer version (' + compilerInfo[1] + ').');
	    }
	  }
	}

	function template(templateSpec, env) {
	  /* istanbul ignore next */
	  if (!env) {
	    throw new _exception2['default']('No environment passed to template');
	  }
	  if (!templateSpec || !templateSpec.main) {
	    throw new _exception2['default']('Unknown template object: ' + typeof templateSpec);
	  }

	  templateSpec.main.decorator = templateSpec.main_d;

	  // Note: Using env.VM references rather than local var references throughout this section to allow
	  // for external users to override these as psuedo-supported APIs.
	  env.VM.checkRevision(templateSpec.compiler);

	  function invokePartialWrapper(partial, context, options) {
	    if (options.hash) {
	      context = Utils.extend({}, context, options.hash);
	      if (options.ids) {
	        options.ids[0] = true;
	      }
	    }

	    partial = env.VM.resolvePartial.call(this, partial, context, options);
	    var result = env.VM.invokePartial.call(this, partial, context, options);

	    if (result == null && env.compile) {
	      options.partials[options.name] = env.compile(partial, templateSpec.compilerOptions, env);
	      result = options.partials[options.name](context, options);
	    }
	    if (result != null) {
	      if (options.indent) {
	        var lines = result.split('\n');
	        for (var i = 0, l = lines.length; i < l; i++) {
	          if (!lines[i] && i + 1 === l) {
	            break;
	          }

	          lines[i] = options.indent + lines[i];
	        }
	        result = lines.join('\n');
	      }
	      return result;
	    } else {
	      throw new _exception2['default']('The partial ' + options.name + ' could not be compiled when running in runtime-only mode');
	    }
	  }

	  // Just add water
	  var container = {
	    strict: function strict(obj, name) {
	      if (!(name in obj)) {
	        throw new _exception2['default']('"' + name + '" not defined in ' + obj);
	      }
	      return obj[name];
	    },
	    lookup: function lookup(depths, name) {
	      var len = depths.length;
	      for (var i = 0; i < len; i++) {
	        if (depths[i] && depths[i][name] != null) {
	          return depths[i][name];
	        }
	      }
	    },
	    lambda: function lambda(current, context) {
	      return typeof current === 'function' ? current.call(context) : current;
	    },

	    escapeExpression: Utils.escapeExpression,
	    invokePartial: invokePartialWrapper,

	    fn: function fn(i) {
	      var ret = templateSpec[i];
	      ret.decorator = templateSpec[i + '_d'];
	      return ret;
	    },

	    programs: [],
	    program: function program(i, data, declaredBlockParams, blockParams, depths) {
	      var programWrapper = this.programs[i],
	          fn = this.fn(i);
	      if (data || depths || blockParams || declaredBlockParams) {
	        programWrapper = wrapProgram(this, i, fn, data, declaredBlockParams, blockParams, depths);
	      } else if (!programWrapper) {
	        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
	      }
	      return programWrapper;
	    },

	    data: function data(value, depth) {
	      while (value && depth--) {
	        value = value._parent;
	      }
	      return value;
	    },
	    merge: function merge(param, common) {
	      var obj = param || common;

	      if (param && common && param !== common) {
	        obj = Utils.extend({}, common, param);
	      }

	      return obj;
	    },
	    // An empty object to use as replacement for null-contexts
	    nullContext: _Object$seal({}),

	    noop: env.VM.noop,
	    compilerInfo: templateSpec.compiler
	  };

	  function ret(context) {
	    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	    var data = options.data;

	    ret._setup(options);
	    if (!options.partial && templateSpec.useData) {
	      data = initData(context, data);
	    }
	    var depths = undefined,
	        blockParams = templateSpec.useBlockParams ? [] : undefined;
	    if (templateSpec.useDepths) {
	      if (options.depths) {
	        depths = context != options.depths[0] ? [context].concat(options.depths) : options.depths;
	      } else {
	        depths = [context];
	      }
	    }

	    function main(context /*, options*/) {
	      return '' + templateSpec.main(container, context, container.helpers, container.partials, data, blockParams, depths);
	    }
	    main = executeDecorators(templateSpec.main, main, container, options.depths || [], data, blockParams);
	    return main(context, options);
	  }
	  ret.isTop = true;

	  ret._setup = function (options) {
	    if (!options.partial) {
	      container.helpers = container.merge(options.helpers, env.helpers);

	      if (templateSpec.usePartial) {
	        container.partials = container.merge(options.partials, env.partials);
	      }
	      if (templateSpec.usePartial || templateSpec.useDecorators) {
	        container.decorators = container.merge(options.decorators, env.decorators);
	      }
	    } else {
	      container.helpers = options.helpers;
	      container.partials = options.partials;
	      container.decorators = options.decorators;
	    }
	  };

	  ret._child = function (i, data, blockParams, depths) {
	    if (templateSpec.useBlockParams && !blockParams) {
	      throw new _exception2['default']('must pass block params');
	    }
	    if (templateSpec.useDepths && !depths) {
	      throw new _exception2['default']('must pass parent depths');
	    }

	    return wrapProgram(container, i, templateSpec[i], data, 0, blockParams, depths);
	  };
	  return ret;
	}

	function wrapProgram(container, i, fn, data, declaredBlockParams, blockParams, depths) {
	  function prog(context) {
	    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	    var currentDepths = depths;
	    if (depths && context != depths[0] && !(context === container.nullContext && depths[0] === null)) {
	      currentDepths = [context].concat(depths);
	    }

	    return fn(container, context, container.helpers, container.partials, options.data || data, blockParams && [options.blockParams].concat(blockParams), currentDepths);
	  }

	  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

	  prog.program = i;
	  prog.depth = depths ? depths.length : 0;
	  prog.blockParams = declaredBlockParams || 0;
	  return prog;
	}

	function resolvePartial(partial, context, options) {
	  if (!partial) {
	    if (options.name === '@partial-block') {
	      partial = options.data['partial-block'];
	    } else {
	      partial = options.partials[options.name];
	    }
	  } else if (!partial.call && !options.name) {
	    // This is a dynamic partial that returned a string
	    options.name = partial;
	    partial = options.partials[partial];
	  }
	  return partial;
	}

	function invokePartial(partial, context, options) {
	  // Use the current closure context to save the partial-block if this partial
	  var currentPartialBlock = options.data && options.data['partial-block'];
	  options.partial = true;
	  if (options.ids) {
	    options.data.contextPath = options.ids[0] || options.data.contextPath;
	  }

	  var partialBlock = undefined;
	  if (options.fn && options.fn !== noop) {
	    (function () {
	      options.data = _base.createFrame(options.data);
	      // Wrapper function to get access to currentPartialBlock from the closure
	      var fn = options.fn;
	      partialBlock = options.data['partial-block'] = function partialBlockWrapper(context) {
	        var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

	        // Restore the partial-block from the closure for the execution of the block
	        // i.e. the part inside the block of the partial call.
	        options.data = _base.createFrame(options.data);
	        options.data['partial-block'] = currentPartialBlock;
	        return fn(context, options);
	      };
	      if (fn.partials) {
	        options.partials = Utils.extend({}, options.partials, fn.partials);
	      }
	    })();
	  }

	  if (partial === undefined && partialBlock) {
	    partial = partialBlock;
	  }

	  if (partial === undefined) {
	    throw new _exception2['default']('The partial ' + options.name + ' could not be found');
	  } else if (partial instanceof Function) {
	    return partial(context, options);
	  }
	}

	function noop() {
	  return '';
	}

	function initData(context, data) {
	  if (!data || !('root' in data)) {
	    data = data ? _base.createFrame(data) : {};
	    data.root = context;
	  }
	  return data;
	}

	function executeDecorators(fn, prog, container, depths, data, blockParams) {
	  if (fn.decorator) {
	    var props = {};
	    prog = fn.decorator(prog, props, container, depths && depths[0], data, blockParams, depths);
	    Utils.extend(prog, props);
	  }
	  return prog;
	}

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	module.exports = { "default": __webpack_require__(24), __esModule: true };

/***/ }),
/* 24 */
/***/ (function(module, exports, __webpack_require__) {

	__webpack_require__(25);
	module.exports = __webpack_require__(30).Object.seal;

/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	// 19.1.2.17 Object.seal(O)
	var isObject = __webpack_require__(26);

	__webpack_require__(27)('seal', function($seal){
	  return function seal(it){
	    return $seal && isObject(it) ? $seal(it) : it;
	  };
	});

/***/ }),
/* 26 */
/***/ (function(module, exports) {

	module.exports = function(it){
	  return typeof it === 'object' ? it !== null : typeof it === 'function';
	};

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	// most Object methods by ES6 should accept primitives
	var $export = __webpack_require__(28)
	  , core    = __webpack_require__(30)
	  , fails   = __webpack_require__(33);
	module.exports = function(KEY, exec){
	  var fn  = (core.Object || {})[KEY] || Object[KEY]
	    , exp = {};
	  exp[KEY] = exec(fn);
	  $export($export.S + $export.F * fails(function(){ fn(1); }), 'Object', exp);
	};

/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	var global    = __webpack_require__(29)
	  , core      = __webpack_require__(30)
	  , ctx       = __webpack_require__(31)
	  , PROTOTYPE = 'prototype';

	var $export = function(type, name, source){
	  var IS_FORCED = type & $export.F
	    , IS_GLOBAL = type & $export.G
	    , IS_STATIC = type & $export.S
	    , IS_PROTO  = type & $export.P
	    , IS_BIND   = type & $export.B
	    , IS_WRAP   = type & $export.W
	    , exports   = IS_GLOBAL ? core : core[name] || (core[name] = {})
	    , target    = IS_GLOBAL ? global : IS_STATIC ? global[name] : (global[name] || {})[PROTOTYPE]
	    , key, own, out;
	  if(IS_GLOBAL)source = name;
	  for(key in source){
	    // contains in native
	    own = !IS_FORCED && target && key in target;
	    if(own && key in exports)continue;
	    // export native or passed
	    out = own ? target[key] : source[key];
	    // prevent global pollution for namespaces
	    exports[key] = IS_GLOBAL && typeof target[key] != 'function' ? source[key]
	    // bind timers to global for call from export context
	    : IS_BIND && own ? ctx(out, global)
	    // wrap global constructors for prevent change them in library
	    : IS_WRAP && target[key] == out ? (function(C){
	      var F = function(param){
	        return this instanceof C ? new C(param) : C(param);
	      };
	      F[PROTOTYPE] = C[PROTOTYPE];
	      return F;
	    // make static versions for prototype methods
	    })(out) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
	    if(IS_PROTO)(exports[PROTOTYPE] || (exports[PROTOTYPE] = {}))[key] = out;
	  }
	};
	// type bitmap
	$export.F = 1;  // forced
	$export.G = 2;  // global
	$export.S = 4;  // static
	$export.P = 8;  // proto
	$export.B = 16; // bind
	$export.W = 32; // wrap
	module.exports = $export;

/***/ }),
/* 29 */
/***/ (function(module, exports) {

	// https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
	var global = module.exports = typeof window != 'undefined' && window.Math == Math
	  ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
	if(typeof __g == 'number')__g = global; // eslint-disable-line no-undef

/***/ }),
/* 30 */
/***/ (function(module, exports) {

	var core = module.exports = {version: '1.2.6'};
	if(typeof __e == 'number')__e = core; // eslint-disable-line no-undef

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	// optional / simple context binding
	var aFunction = __webpack_require__(32);
	module.exports = function(fn, that, length){
	  aFunction(fn);
	  if(that === undefined)return fn;
	  switch(length){
	    case 1: return function(a){
	      return fn.call(that, a);
	    };
	    case 2: return function(a, b){
	      return fn.call(that, a, b);
	    };
	    case 3: return function(a, b, c){
	      return fn.call(that, a, b, c);
	    };
	  }
	  return function(/* ...args */){
	    return fn.apply(that, arguments);
	  };
	};

/***/ }),
/* 32 */
/***/ (function(module, exports) {

	module.exports = function(it){
	  if(typeof it != 'function')throw TypeError(it + ' is not a function!');
	  return it;
	};

/***/ }),
/* 33 */
/***/ (function(module, exports) {

	module.exports = function(exec){
	  try {
	    return !!exec();
	  } catch(e){
	    return true;
	  }
	};

/***/ }),
/* 34 */
/***/ (function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {/* global window */
	'use strict';

	exports.__esModule = true;

	exports['default'] = function (Handlebars) {
	  /* istanbul ignore next */
	  var root = typeof global !== 'undefined' ? global : window,
	      $Handlebars = root.Handlebars;
	  /* istanbul ignore next */
	  Handlebars.noConflict = function () {
	    if (root.Handlebars === Handlebars) {
	      root.Handlebars = $Handlebars;
	    }
	    return Handlebars;
	  };
	};

	module.exports = exports['default'];
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ }),
/* 35 */
/***/ (function(module, exports) {

	'use strict';

	exports.__esModule = true;
	var AST = {
	  // Public API used to evaluate derived attributes regarding AST nodes
	  helpers: {
	    // a mustache is definitely a helper if:
	    // * it is an eligible helper, and
	    // * it has at least one parameter or hash segment
	    helperExpression: function helperExpression(node) {
	      return node.type === 'SubExpression' || (node.type === 'MustacheStatement' || node.type === 'BlockStatement') && !!(node.params && node.params.length || node.hash);
	    },

	    scopedId: function scopedId(path) {
	      return (/^\.|this\b/.test(path.original)
	      );
	    },

	    // an ID is simple if it only has one part, and that part is not
	    // `..` or `this`.
	    simpleId: function simpleId(path) {
	      return path.parts.length === 1 && !AST.helpers.scopedId(path) && !path.depth;
	    }
	  }
	};

	// Must be exported as an object rather than the root of the module as the jison lexer
	// must modify the object to operate properly.
	exports['default'] = AST;
	module.exports = exports['default'];

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	var _interopRequireWildcard = __webpack_require__(3)['default'];

	exports.__esModule = true;
	exports.parse = parse;

	var _parser = __webpack_require__(37);

	var _parser2 = _interopRequireDefault(_parser);

	var _whitespaceControl = __webpack_require__(38);

	var _whitespaceControl2 = _interopRequireDefault(_whitespaceControl);

	var _helpers = __webpack_require__(40);

	var Helpers = _interopRequireWildcard(_helpers);

	var _utils = __webpack_require__(5);

	exports.parser = _parser2['default'];

	var yy = {};
	_utils.extend(yy, Helpers);

	function parse(input, options) {
	  // Just return if an already-compiled AST was passed in.
	  if (input.type === 'Program') {
	    return input;
	  }

	  _parser2['default'].yy = yy;

	  // Altering the shared object here, but this is ok as parser is a sync operation
	  yy.locInfo = function (locInfo) {
	    return new yy.SourceLocation(options && options.srcName, locInfo);
	  };

	  var strip = new _whitespaceControl2['default'](options);
	  return strip.accept(_parser2['default'].parse(input));
	}

/***/ }),
/* 37 */
/***/ (function(module, exports) {

	// File ignored in coverage tests via setting in .istanbul.yml
	/* Jison generated parser */
	"use strict";

	exports.__esModule = true;
	var handlebars = (function () {
	    var parser = { trace: function trace() {},
	        yy: {},
	        symbols_: { "error": 2, "root": 3, "program": 4, "EOF": 5, "program_repetition0": 6, "statement": 7, "mustache": 8, "block": 9, "rawBlock": 10, "partial": 11, "partialBlock": 12, "content": 13, "COMMENT": 14, "CONTENT": 15, "openRawBlock": 16, "rawBlock_repetition_plus0": 17, "END_RAW_BLOCK": 18, "OPEN_RAW_BLOCK": 19, "helperName": 20, "openRawBlock_repetition0": 21, "openRawBlock_option0": 22, "CLOSE_RAW_BLOCK": 23, "openBlock": 24, "block_option0": 25, "closeBlock": 26, "openInverse": 27, "block_option1": 28, "OPEN_BLOCK": 29, "openBlock_repetition0": 30, "openBlock_option0": 31, "openBlock_option1": 32, "CLOSE": 33, "OPEN_INVERSE": 34, "openInverse_repetition0": 35, "openInverse_option0": 36, "openInverse_option1": 37, "openInverseChain": 38, "OPEN_INVERSE_CHAIN": 39, "openInverseChain_repetition0": 40, "openInverseChain_option0": 41, "openInverseChain_option1": 42, "inverseAndProgram": 43, "INVERSE": 44, "inverseChain": 45, "inverseChain_option0": 46, "OPEN_ENDBLOCK": 47, "OPEN": 48, "mustache_repetition0": 49, "mustache_option0": 50, "OPEN_UNESCAPED": 51, "mustache_repetition1": 52, "mustache_option1": 53, "CLOSE_UNESCAPED": 54, "OPEN_PARTIAL": 55, "partialName": 56, "partial_repetition0": 57, "partial_option0": 58, "openPartialBlock": 59, "OPEN_PARTIAL_BLOCK": 60, "openPartialBlock_repetition0": 61, "openPartialBlock_option0": 62, "param": 63, "sexpr": 64, "OPEN_SEXPR": 65, "sexpr_repetition0": 66, "sexpr_option0": 67, "CLOSE_SEXPR": 68, "hash": 69, "hash_repetition_plus0": 70, "hashSegment": 71, "ID": 72, "EQUALS": 73, "blockParams": 74, "OPEN_BLOCK_PARAMS": 75, "blockParams_repetition_plus0": 76, "CLOSE_BLOCK_PARAMS": 77, "path": 78, "dataName": 79, "STRING": 80, "NUMBER": 81, "BOOLEAN": 82, "UNDEFINED": 83, "NULL": 84, "DATA": 85, "pathSegments": 86, "SEP": 87, "$accept": 0, "$end": 1 },
	        terminals_: { 2: "error", 5: "EOF", 14: "COMMENT", 15: "CONTENT", 18: "END_RAW_BLOCK", 19: "OPEN_RAW_BLOCK", 23: "CLOSE_RAW_BLOCK", 29: "OPEN_BLOCK", 33: "CLOSE", 34: "OPEN_INVERSE", 39: "OPEN_INVERSE_CHAIN", 44: "INVERSE", 47: "OPEN_ENDBLOCK", 48: "OPEN", 51: "OPEN_UNESCAPED", 54: "CLOSE_UNESCAPED", 55: "OPEN_PARTIAL", 60: "OPEN_PARTIAL_BLOCK", 65: "OPEN_SEXPR", 68: "CLOSE_SEXPR", 72: "ID", 73: "EQUALS", 75: "OPEN_BLOCK_PARAMS", 77: "CLOSE_BLOCK_PARAMS", 80: "STRING", 81: "NUMBER", 82: "BOOLEAN", 83: "UNDEFINED", 84: "NULL", 85: "DATA", 87: "SEP" },
	        productions_: [0, [3, 2], [4, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [7, 1], [13, 1], [10, 3], [16, 5], [9, 4], [9, 4], [24, 6], [27, 6], [38, 6], [43, 2], [45, 3], [45, 1], [26, 3], [8, 5], [8, 5], [11, 5], [12, 3], [59, 5], [63, 1], [63, 1], [64, 5], [69, 1], [71, 3], [74, 3], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [20, 1], [56, 1], [56, 1], [79, 2], [78, 1], [86, 3], [86, 1], [6, 0], [6, 2], [17, 1], [17, 2], [21, 0], [21, 2], [22, 0], [22, 1], [25, 0], [25, 1], [28, 0], [28, 1], [30, 0], [30, 2], [31, 0], [31, 1], [32, 0], [32, 1], [35, 0], [35, 2], [36, 0], [36, 1], [37, 0], [37, 1], [40, 0], [40, 2], [41, 0], [41, 1], [42, 0], [42, 1], [46, 0], [46, 1], [49, 0], [49, 2], [50, 0], [50, 1], [52, 0], [52, 2], [53, 0], [53, 1], [57, 0], [57, 2], [58, 0], [58, 1], [61, 0], [61, 2], [62, 0], [62, 1], [66, 0], [66, 2], [67, 0], [67, 1], [70, 1], [70, 2], [76, 1], [76, 2]],
	        performAction: function anonymous(yytext, yyleng, yylineno, yy, yystate, $$, _$
	        /**/) {

	            var $0 = $$.length - 1;
	            switch (yystate) {
	                case 1:
	                    return $$[$0 - 1];
	                    break;
	                case 2:
	                    this.$ = yy.prepareProgram($$[$0]);
	                    break;
	                case 3:
	                    this.$ = $$[$0];
	                    break;
	                case 4:
	                    this.$ = $$[$0];
	                    break;
	                case 5:
	                    this.$ = $$[$0];
	                    break;
	                case 6:
	                    this.$ = $$[$0];
	                    break;
	                case 7:
	                    this.$ = $$[$0];
	                    break;
	                case 8:
	                    this.$ = $$[$0];
	                    break;
	                case 9:
	                    this.$ = {
	                        type: 'CommentStatement',
	                        value: yy.stripComment($$[$0]),
	                        strip: yy.stripFlags($$[$0], $$[$0]),
	                        loc: yy.locInfo(this._$)
	                    };

	                    break;
	                case 10:
	                    this.$ = {
	                        type: 'ContentStatement',
	                        original: $$[$0],
	                        value: $$[$0],
	                        loc: yy.locInfo(this._$)
	                    };

	                    break;
	                case 11:
	                    this.$ = yy.prepareRawBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
	                    break;
	                case 12:
	                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1] };
	                    break;
	                case 13:
	                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], false, this._$);
	                    break;
	                case 14:
	                    this.$ = yy.prepareBlock($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0], true, this._$);
	                    break;
	                case 15:
	                    this.$ = { open: $$[$0 - 5], path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
	                    break;
	                case 16:
	                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
	                    break;
	                case 17:
	                    this.$ = { path: $$[$0 - 4], params: $$[$0 - 3], hash: $$[$0 - 2], blockParams: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 5], $$[$0]) };
	                    break;
	                case 18:
	                    this.$ = { strip: yy.stripFlags($$[$0 - 1], $$[$0 - 1]), program: $$[$0] };
	                    break;
	                case 19:
	                    var inverse = yy.prepareBlock($$[$0 - 2], $$[$0 - 1], $$[$0], $$[$0], false, this._$),
	                        program = yy.prepareProgram([inverse], $$[$0 - 1].loc);
	                    program.chained = true;

	                    this.$ = { strip: $$[$0 - 2].strip, program: program, chain: true };

	                    break;
	                case 20:
	                    this.$ = $$[$0];
	                    break;
	                case 21:
	                    this.$ = { path: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 2], $$[$0]) };
	                    break;
	                case 22:
	                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
	                    break;
	                case 23:
	                    this.$ = yy.prepareMustache($$[$0 - 3], $$[$0 - 2], $$[$0 - 1], $$[$0 - 4], yy.stripFlags($$[$0 - 4], $$[$0]), this._$);
	                    break;
	                case 24:
	                    this.$ = {
	                        type: 'PartialStatement',
	                        name: $$[$0 - 3],
	                        params: $$[$0 - 2],
	                        hash: $$[$0 - 1],
	                        indent: '',
	                        strip: yy.stripFlags($$[$0 - 4], $$[$0]),
	                        loc: yy.locInfo(this._$)
	                    };

	                    break;
	                case 25:
	                    this.$ = yy.preparePartialBlock($$[$0 - 2], $$[$0 - 1], $$[$0], this._$);
	                    break;
	                case 26:
	                    this.$ = { path: $$[$0 - 3], params: $$[$0 - 2], hash: $$[$0 - 1], strip: yy.stripFlags($$[$0 - 4], $$[$0]) };
	                    break;
	                case 27:
	                    this.$ = $$[$0];
	                    break;
	                case 28:
	                    this.$ = $$[$0];
	                    break;
	                case 29:
	                    this.$ = {
	                        type: 'SubExpression',
	                        path: $$[$0 - 3],
	                        params: $$[$0 - 2],
	                        hash: $$[$0 - 1],
	                        loc: yy.locInfo(this._$)
	                    };

	                    break;
	                case 30:
	                    this.$ = { type: 'Hash', pairs: $$[$0], loc: yy.locInfo(this._$) };
	                    break;
	                case 31:
	                    this.$ = { type: 'HashPair', key: yy.id($$[$0 - 2]), value: $$[$0], loc: yy.locInfo(this._$) };
	                    break;
	                case 32:
	                    this.$ = yy.id($$[$0 - 1]);
	                    break;
	                case 33:
	                    this.$ = $$[$0];
	                    break;
	                case 34:
	                    this.$ = $$[$0];
	                    break;
	                case 35:
	                    this.$ = { type: 'StringLiteral', value: $$[$0], original: $$[$0], loc: yy.locInfo(this._$) };
	                    break;
	                case 36:
	                    this.$ = { type: 'NumberLiteral', value: Number($$[$0]), original: Number($$[$0]), loc: yy.locInfo(this._$) };
	                    break;
	                case 37:
	                    this.$ = { type: 'BooleanLiteral', value: $$[$0] === 'true', original: $$[$0] === 'true', loc: yy.locInfo(this._$) };
	                    break;
	                case 38:
	                    this.$ = { type: 'UndefinedLiteral', original: undefined, value: undefined, loc: yy.locInfo(this._$) };
	                    break;
	                case 39:
	                    this.$ = { type: 'NullLiteral', original: null, value: null, loc: yy.locInfo(this._$) };
	                    break;
	                case 40:
	                    this.$ = $$[$0];
	                    break;
	                case 41:
	                    this.$ = $$[$0];
	                    break;
	                case 42:
	                    this.$ = yy.preparePath(true, $$[$0], this._$);
	                    break;
	                case 43:
	                    this.$ = yy.preparePath(false, $$[$0], this._$);
	                    break;
	                case 44:
	                    $$[$0 - 2].push({ part: yy.id($$[$0]), original: $$[$0], separator: $$[$0 - 1] });this.$ = $$[$0 - 2];
	                    break;
	                case 45:
	                    this.$ = [{ part: yy.id($$[$0]), original: $$[$0] }];
	                    break;
	                case 46:
	                    this.$ = [];
	                    break;
	                case 47:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 48:
	                    this.$ = [$$[$0]];
	                    break;
	                case 49:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 50:
	                    this.$ = [];
	                    break;
	                case 51:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 58:
	                    this.$ = [];
	                    break;
	                case 59:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 64:
	                    this.$ = [];
	                    break;
	                case 65:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 70:
	                    this.$ = [];
	                    break;
	                case 71:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 78:
	                    this.$ = [];
	                    break;
	                case 79:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 82:
	                    this.$ = [];
	                    break;
	                case 83:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 86:
	                    this.$ = [];
	                    break;
	                case 87:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 90:
	                    this.$ = [];
	                    break;
	                case 91:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 94:
	                    this.$ = [];
	                    break;
	                case 95:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 98:
	                    this.$ = [$$[$0]];
	                    break;
	                case 99:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	                case 100:
	                    this.$ = [$$[$0]];
	                    break;
	                case 101:
	                    $$[$0 - 1].push($$[$0]);
	                    break;
	            }
	        },
	        table: [{ 3: 1, 4: 2, 5: [2, 46], 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 1: [3] }, { 5: [1, 4] }, { 5: [2, 2], 7: 5, 8: 6, 9: 7, 10: 8, 11: 9, 12: 10, 13: 11, 14: [1, 12], 15: [1, 20], 16: 17, 19: [1, 23], 24: 15, 27: 16, 29: [1, 21], 34: [1, 22], 39: [2, 2], 44: [2, 2], 47: [2, 2], 48: [1, 13], 51: [1, 14], 55: [1, 18], 59: 19, 60: [1, 24] }, { 1: [2, 1] }, { 5: [2, 47], 14: [2, 47], 15: [2, 47], 19: [2, 47], 29: [2, 47], 34: [2, 47], 39: [2, 47], 44: [2, 47], 47: [2, 47], 48: [2, 47], 51: [2, 47], 55: [2, 47], 60: [2, 47] }, { 5: [2, 3], 14: [2, 3], 15: [2, 3], 19: [2, 3], 29: [2, 3], 34: [2, 3], 39: [2, 3], 44: [2, 3], 47: [2, 3], 48: [2, 3], 51: [2, 3], 55: [2, 3], 60: [2, 3] }, { 5: [2, 4], 14: [2, 4], 15: [2, 4], 19: [2, 4], 29: [2, 4], 34: [2, 4], 39: [2, 4], 44: [2, 4], 47: [2, 4], 48: [2, 4], 51: [2, 4], 55: [2, 4], 60: [2, 4] }, { 5: [2, 5], 14: [2, 5], 15: [2, 5], 19: [2, 5], 29: [2, 5], 34: [2, 5], 39: [2, 5], 44: [2, 5], 47: [2, 5], 48: [2, 5], 51: [2, 5], 55: [2, 5], 60: [2, 5] }, { 5: [2, 6], 14: [2, 6], 15: [2, 6], 19: [2, 6], 29: [2, 6], 34: [2, 6], 39: [2, 6], 44: [2, 6], 47: [2, 6], 48: [2, 6], 51: [2, 6], 55: [2, 6], 60: [2, 6] }, { 5: [2, 7], 14: [2, 7], 15: [2, 7], 19: [2, 7], 29: [2, 7], 34: [2, 7], 39: [2, 7], 44: [2, 7], 47: [2, 7], 48: [2, 7], 51: [2, 7], 55: [2, 7], 60: [2, 7] }, { 5: [2, 8], 14: [2, 8], 15: [2, 8], 19: [2, 8], 29: [2, 8], 34: [2, 8], 39: [2, 8], 44: [2, 8], 47: [2, 8], 48: [2, 8], 51: [2, 8], 55: [2, 8], 60: [2, 8] }, { 5: [2, 9], 14: [2, 9], 15: [2, 9], 19: [2, 9], 29: [2, 9], 34: [2, 9], 39: [2, 9], 44: [2, 9], 47: [2, 9], 48: [2, 9], 51: [2, 9], 55: [2, 9], 60: [2, 9] }, { 20: 25, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 36, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 37, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 4: 38, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 13: 40, 15: [1, 20], 17: 39 }, { 20: 42, 56: 41, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 45, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 5: [2, 10], 14: [2, 10], 15: [2, 10], 18: [2, 10], 19: [2, 10], 29: [2, 10], 34: [2, 10], 39: [2, 10], 44: [2, 10], 47: [2, 10], 48: [2, 10], 51: [2, 10], 55: [2, 10], 60: [2, 10] }, { 20: 46, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 47, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 48, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 42, 56: 49, 64: 43, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [2, 78], 49: 50, 65: [2, 78], 72: [2, 78], 80: [2, 78], 81: [2, 78], 82: [2, 78], 83: [2, 78], 84: [2, 78], 85: [2, 78] }, { 23: [2, 33], 33: [2, 33], 54: [2, 33], 65: [2, 33], 68: [2, 33], 72: [2, 33], 75: [2, 33], 80: [2, 33], 81: [2, 33], 82: [2, 33], 83: [2, 33], 84: [2, 33], 85: [2, 33] }, { 23: [2, 34], 33: [2, 34], 54: [2, 34], 65: [2, 34], 68: [2, 34], 72: [2, 34], 75: [2, 34], 80: [2, 34], 81: [2, 34], 82: [2, 34], 83: [2, 34], 84: [2, 34], 85: [2, 34] }, { 23: [2, 35], 33: [2, 35], 54: [2, 35], 65: [2, 35], 68: [2, 35], 72: [2, 35], 75: [2, 35], 80: [2, 35], 81: [2, 35], 82: [2, 35], 83: [2, 35], 84: [2, 35], 85: [2, 35] }, { 23: [2, 36], 33: [2, 36], 54: [2, 36], 65: [2, 36], 68: [2, 36], 72: [2, 36], 75: [2, 36], 80: [2, 36], 81: [2, 36], 82: [2, 36], 83: [2, 36], 84: [2, 36], 85: [2, 36] }, { 23: [2, 37], 33: [2, 37], 54: [2, 37], 65: [2, 37], 68: [2, 37], 72: [2, 37], 75: [2, 37], 80: [2, 37], 81: [2, 37], 82: [2, 37], 83: [2, 37], 84: [2, 37], 85: [2, 37] }, { 23: [2, 38], 33: [2, 38], 54: [2, 38], 65: [2, 38], 68: [2, 38], 72: [2, 38], 75: [2, 38], 80: [2, 38], 81: [2, 38], 82: [2, 38], 83: [2, 38], 84: [2, 38], 85: [2, 38] }, { 23: [2, 39], 33: [2, 39], 54: [2, 39], 65: [2, 39], 68: [2, 39], 72: [2, 39], 75: [2, 39], 80: [2, 39], 81: [2, 39], 82: [2, 39], 83: [2, 39], 84: [2, 39], 85: [2, 39] }, { 23: [2, 43], 33: [2, 43], 54: [2, 43], 65: [2, 43], 68: [2, 43], 72: [2, 43], 75: [2, 43], 80: [2, 43], 81: [2, 43], 82: [2, 43], 83: [2, 43], 84: [2, 43], 85: [2, 43], 87: [1, 51] }, { 72: [1, 35], 86: 52 }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 52: 53, 54: [2, 82], 65: [2, 82], 72: [2, 82], 80: [2, 82], 81: [2, 82], 82: [2, 82], 83: [2, 82], 84: [2, 82], 85: [2, 82] }, { 25: 54, 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 55, 47: [2, 54] }, { 28: 60, 43: 61, 44: [1, 59], 47: [2, 56] }, { 13: 63, 15: [1, 20], 18: [1, 62] }, { 15: [2, 48], 18: [2, 48] }, { 33: [2, 86], 57: 64, 65: [2, 86], 72: [2, 86], 80: [2, 86], 81: [2, 86], 82: [2, 86], 83: [2, 86], 84: [2, 86], 85: [2, 86] }, { 33: [2, 40], 65: [2, 40], 72: [2, 40], 80: [2, 40], 81: [2, 40], 82: [2, 40], 83: [2, 40], 84: [2, 40], 85: [2, 40] }, { 33: [2, 41], 65: [2, 41], 72: [2, 41], 80: [2, 41], 81: [2, 41], 82: [2, 41], 83: [2, 41], 84: [2, 41], 85: [2, 41] }, { 20: 65, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 66, 47: [1, 67] }, { 30: 68, 33: [2, 58], 65: [2, 58], 72: [2, 58], 75: [2, 58], 80: [2, 58], 81: [2, 58], 82: [2, 58], 83: [2, 58], 84: [2, 58], 85: [2, 58] }, { 33: [2, 64], 35: 69, 65: [2, 64], 72: [2, 64], 75: [2, 64], 80: [2, 64], 81: [2, 64], 82: [2, 64], 83: [2, 64], 84: [2, 64], 85: [2, 64] }, { 21: 70, 23: [2, 50], 65: [2, 50], 72: [2, 50], 80: [2, 50], 81: [2, 50], 82: [2, 50], 83: [2, 50], 84: [2, 50], 85: [2, 50] }, { 33: [2, 90], 61: 71, 65: [2, 90], 72: [2, 90], 80: [2, 90], 81: [2, 90], 82: [2, 90], 83: [2, 90], 84: [2, 90], 85: [2, 90] }, { 20: 75, 33: [2, 80], 50: 72, 63: 73, 64: 76, 65: [1, 44], 69: 74, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 72: [1, 80] }, { 23: [2, 42], 33: [2, 42], 54: [2, 42], 65: [2, 42], 68: [2, 42], 72: [2, 42], 75: [2, 42], 80: [2, 42], 81: [2, 42], 82: [2, 42], 83: [2, 42], 84: [2, 42], 85: [2, 42], 87: [1, 51] }, { 20: 75, 53: 81, 54: [2, 84], 63: 82, 64: 76, 65: [1, 44], 69: 83, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 26: 84, 47: [1, 67] }, { 47: [2, 55] }, { 4: 85, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 39: [2, 46], 44: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 47: [2, 20] }, { 20: 86, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 4: 87, 6: 3, 14: [2, 46], 15: [2, 46], 19: [2, 46], 29: [2, 46], 34: [2, 46], 47: [2, 46], 48: [2, 46], 51: [2, 46], 55: [2, 46], 60: [2, 46] }, { 26: 88, 47: [1, 67] }, { 47: [2, 57] }, { 5: [2, 11], 14: [2, 11], 15: [2, 11], 19: [2, 11], 29: [2, 11], 34: [2, 11], 39: [2, 11], 44: [2, 11], 47: [2, 11], 48: [2, 11], 51: [2, 11], 55: [2, 11], 60: [2, 11] }, { 15: [2, 49], 18: [2, 49] }, { 20: 75, 33: [2, 88], 58: 89, 63: 90, 64: 76, 65: [1, 44], 69: 91, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 65: [2, 94], 66: 92, 68: [2, 94], 72: [2, 94], 80: [2, 94], 81: [2, 94], 82: [2, 94], 83: [2, 94], 84: [2, 94], 85: [2, 94] }, { 5: [2, 25], 14: [2, 25], 15: [2, 25], 19: [2, 25], 29: [2, 25], 34: [2, 25], 39: [2, 25], 44: [2, 25], 47: [2, 25], 48: [2, 25], 51: [2, 25], 55: [2, 25], 60: [2, 25] }, { 20: 93, 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 31: 94, 33: [2, 60], 63: 95, 64: 76, 65: [1, 44], 69: 96, 70: 77, 71: 78, 72: [1, 79], 75: [2, 60], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 66], 36: 97, 63: 98, 64: 76, 65: [1, 44], 69: 99, 70: 77, 71: 78, 72: [1, 79], 75: [2, 66], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 22: 100, 23: [2, 52], 63: 101, 64: 76, 65: [1, 44], 69: 102, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 20: 75, 33: [2, 92], 62: 103, 63: 104, 64: 76, 65: [1, 44], 69: 105, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 106] }, { 33: [2, 79], 65: [2, 79], 72: [2, 79], 80: [2, 79], 81: [2, 79], 82: [2, 79], 83: [2, 79], 84: [2, 79], 85: [2, 79] }, { 33: [2, 81] }, { 23: [2, 27], 33: [2, 27], 54: [2, 27], 65: [2, 27], 68: [2, 27], 72: [2, 27], 75: [2, 27], 80: [2, 27], 81: [2, 27], 82: [2, 27], 83: [2, 27], 84: [2, 27], 85: [2, 27] }, { 23: [2, 28], 33: [2, 28], 54: [2, 28], 65: [2, 28], 68: [2, 28], 72: [2, 28], 75: [2, 28], 80: [2, 28], 81: [2, 28], 82: [2, 28], 83: [2, 28], 84: [2, 28], 85: [2, 28] }, { 23: [2, 30], 33: [2, 30], 54: [2, 30], 68: [2, 30], 71: 107, 72: [1, 108], 75: [2, 30] }, { 23: [2, 98], 33: [2, 98], 54: [2, 98], 68: [2, 98], 72: [2, 98], 75: [2, 98] }, { 23: [2, 45], 33: [2, 45], 54: [2, 45], 65: [2, 45], 68: [2, 45], 72: [2, 45], 73: [1, 109], 75: [2, 45], 80: [2, 45], 81: [2, 45], 82: [2, 45], 83: [2, 45], 84: [2, 45], 85: [2, 45], 87: [2, 45] }, { 23: [2, 44], 33: [2, 44], 54: [2, 44], 65: [2, 44], 68: [2, 44], 72: [2, 44], 75: [2, 44], 80: [2, 44], 81: [2, 44], 82: [2, 44], 83: [2, 44], 84: [2, 44], 85: [2, 44], 87: [2, 44] }, { 54: [1, 110] }, { 54: [2, 83], 65: [2, 83], 72: [2, 83], 80: [2, 83], 81: [2, 83], 82: [2, 83], 83: [2, 83], 84: [2, 83], 85: [2, 83] }, { 54: [2, 85] }, { 5: [2, 13], 14: [2, 13], 15: [2, 13], 19: [2, 13], 29: [2, 13], 34: [2, 13], 39: [2, 13], 44: [2, 13], 47: [2, 13], 48: [2, 13], 51: [2, 13], 55: [2, 13], 60: [2, 13] }, { 38: 56, 39: [1, 58], 43: 57, 44: [1, 59], 45: 112, 46: 111, 47: [2, 76] }, { 33: [2, 70], 40: 113, 65: [2, 70], 72: [2, 70], 75: [2, 70], 80: [2, 70], 81: [2, 70], 82: [2, 70], 83: [2, 70], 84: [2, 70], 85: [2, 70] }, { 47: [2, 18] }, { 5: [2, 14], 14: [2, 14], 15: [2, 14], 19: [2, 14], 29: [2, 14], 34: [2, 14], 39: [2, 14], 44: [2, 14], 47: [2, 14], 48: [2, 14], 51: [2, 14], 55: [2, 14], 60: [2, 14] }, { 33: [1, 114] }, { 33: [2, 87], 65: [2, 87], 72: [2, 87], 80: [2, 87], 81: [2, 87], 82: [2, 87], 83: [2, 87], 84: [2, 87], 85: [2, 87] }, { 33: [2, 89] }, { 20: 75, 63: 116, 64: 76, 65: [1, 44], 67: 115, 68: [2, 96], 69: 117, 70: 77, 71: 78, 72: [1, 79], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 33: [1, 118] }, { 32: 119, 33: [2, 62], 74: 120, 75: [1, 121] }, { 33: [2, 59], 65: [2, 59], 72: [2, 59], 75: [2, 59], 80: [2, 59], 81: [2, 59], 82: [2, 59], 83: [2, 59], 84: [2, 59], 85: [2, 59] }, { 33: [2, 61], 75: [2, 61] }, { 33: [2, 68], 37: 122, 74: 123, 75: [1, 121] }, { 33: [2, 65], 65: [2, 65], 72: [2, 65], 75: [2, 65], 80: [2, 65], 81: [2, 65], 82: [2, 65], 83: [2, 65], 84: [2, 65], 85: [2, 65] }, { 33: [2, 67], 75: [2, 67] }, { 23: [1, 124] }, { 23: [2, 51], 65: [2, 51], 72: [2, 51], 80: [2, 51], 81: [2, 51], 82: [2, 51], 83: [2, 51], 84: [2, 51], 85: [2, 51] }, { 23: [2, 53] }, { 33: [1, 125] }, { 33: [2, 91], 65: [2, 91], 72: [2, 91], 80: [2, 91], 81: [2, 91], 82: [2, 91], 83: [2, 91], 84: [2, 91], 85: [2, 91] }, { 33: [2, 93] }, { 5: [2, 22], 14: [2, 22], 15: [2, 22], 19: [2, 22], 29: [2, 22], 34: [2, 22], 39: [2, 22], 44: [2, 22], 47: [2, 22], 48: [2, 22], 51: [2, 22], 55: [2, 22], 60: [2, 22] }, { 23: [2, 99], 33: [2, 99], 54: [2, 99], 68: [2, 99], 72: [2, 99], 75: [2, 99] }, { 73: [1, 109] }, { 20: 75, 63: 126, 64: 76, 65: [1, 44], 72: [1, 35], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 23], 14: [2, 23], 15: [2, 23], 19: [2, 23], 29: [2, 23], 34: [2, 23], 39: [2, 23], 44: [2, 23], 47: [2, 23], 48: [2, 23], 51: [2, 23], 55: [2, 23], 60: [2, 23] }, { 47: [2, 19] }, { 47: [2, 77] }, { 20: 75, 33: [2, 72], 41: 127, 63: 128, 64: 76, 65: [1, 44], 69: 129, 70: 77, 71: 78, 72: [1, 79], 75: [2, 72], 78: 26, 79: 27, 80: [1, 28], 81: [1, 29], 82: [1, 30], 83: [1, 31], 84: [1, 32], 85: [1, 34], 86: 33 }, { 5: [2, 24], 14: [2, 24], 15: [2, 24], 19: [2, 24], 29: [2, 24], 34: [2, 24], 39: [2, 24], 44: [2, 24], 47: [2, 24], 48: [2, 24], 51: [2, 24], 55: [2, 24], 60: [2, 24] }, { 68: [1, 130] }, { 65: [2, 95], 68: [2, 95], 72: [2, 95], 80: [2, 95], 81: [2, 95], 82: [2, 95], 83: [2, 95], 84: [2, 95], 85: [2, 95] }, { 68: [2, 97] }, { 5: [2, 21], 14: [2, 21], 15: [2, 21], 19: [2, 21], 29: [2, 21], 34: [2, 21], 39: [2, 21], 44: [2, 21], 47: [2, 21], 48: [2, 21], 51: [2, 21], 55: [2, 21], 60: [2, 21] }, { 33: [1, 131] }, { 33: [2, 63] }, { 72: [1, 133], 76: 132 }, { 33: [1, 134] }, { 33: [2, 69] }, { 15: [2, 12] }, { 14: [2, 26], 15: [2, 26], 19: [2, 26], 29: [2, 26], 34: [2, 26], 47: [2, 26], 48: [2, 26], 51: [2, 26], 55: [2, 26], 60: [2, 26] }, { 23: [2, 31], 33: [2, 31], 54: [2, 31], 68: [2, 31], 72: [2, 31], 75: [2, 31] }, { 33: [2, 74], 42: 135, 74: 136, 75: [1, 121] }, { 33: [2, 71], 65: [2, 71], 72: [2, 71], 75: [2, 71], 80: [2, 71], 81: [2, 71], 82: [2, 71], 83: [2, 71], 84: [2, 71], 85: [2, 71] }, { 33: [2, 73], 75: [2, 73] }, { 23: [2, 29], 33: [2, 29], 54: [2, 29], 65: [2, 29], 68: [2, 29], 72: [2, 29], 75: [2, 29], 80: [2, 29], 81: [2, 29], 82: [2, 29], 83: [2, 29], 84: [2, 29], 85: [2, 29] }, { 14: [2, 15], 15: [2, 15], 19: [2, 15], 29: [2, 15], 34: [2, 15], 39: [2, 15], 44: [2, 15], 47: [2, 15], 48: [2, 15], 51: [2, 15], 55: [2, 15], 60: [2, 15] }, { 72: [1, 138], 77: [1, 137] }, { 72: [2, 100], 77: [2, 100] }, { 14: [2, 16], 15: [2, 16], 19: [2, 16], 29: [2, 16], 34: [2, 16], 44: [2, 16], 47: [2, 16], 48: [2, 16], 51: [2, 16], 55: [2, 16], 60: [2, 16] }, { 33: [1, 139] }, { 33: [2, 75] }, { 33: [2, 32] }, { 72: [2, 101], 77: [2, 101] }, { 14: [2, 17], 15: [2, 17], 19: [2, 17], 29: [2, 17], 34: [2, 17], 39: [2, 17], 44: [2, 17], 47: [2, 17], 48: [2, 17], 51: [2, 17], 55: [2, 17], 60: [2, 17] }],
	        defaultActions: { 4: [2, 1], 55: [2, 55], 57: [2, 20], 61: [2, 57], 74: [2, 81], 83: [2, 85], 87: [2, 18], 91: [2, 89], 102: [2, 53], 105: [2, 93], 111: [2, 19], 112: [2, 77], 117: [2, 97], 120: [2, 63], 123: [2, 69], 124: [2, 12], 136: [2, 75], 137: [2, 32] },
	        parseError: function parseError(str, hash) {
	            throw new Error(str);
	        },
	        parse: function parse(input) {
	            var self = this,
	                stack = [0],
	                vstack = [null],
	                lstack = [],
	                table = this.table,
	                yytext = "",
	                yylineno = 0,
	                yyleng = 0,
	                recovering = 0,
	                TERROR = 2,
	                EOF = 1;
	            this.lexer.setInput(input);
	            this.lexer.yy = this.yy;
	            this.yy.lexer = this.lexer;
	            this.yy.parser = this;
	            if (typeof this.lexer.yylloc == "undefined") this.lexer.yylloc = {};
	            var yyloc = this.lexer.yylloc;
	            lstack.push(yyloc);
	            var ranges = this.lexer.options && this.lexer.options.ranges;
	            if (typeof this.yy.parseError === "function") this.parseError = this.yy.parseError;
	            function popStack(n) {
	                stack.length = stack.length - 2 * n;
	                vstack.length = vstack.length - n;
	                lstack.length = lstack.length - n;
	            }
	            function lex() {
	                var token;
	                token = self.lexer.lex() || 1;
	                if (typeof token !== "number") {
	                    token = self.symbols_[token] || token;
	                }
	                return token;
	            }
	            var symbol,
	                preErrorSymbol,
	                state,
	                action,
	                a,
	                r,
	                yyval = {},
	                p,
	                len,
	                newState,
	                expected;
	            while (true) {
	                state = stack[stack.length - 1];
	                if (this.defaultActions[state]) {
	                    action = this.defaultActions[state];
	                } else {
	                    if (symbol === null || typeof symbol == "undefined") {
	                        symbol = lex();
	                    }
	                    action = table[state] && table[state][symbol];
	                }
	                if (typeof action === "undefined" || !action.length || !action[0]) {
	                    var errStr = "";
	                    if (!recovering) {
	                        expected = [];
	                        for (p in table[state]) if (this.terminals_[p] && p > 2) {
	                            expected.push("'" + this.terminals_[p] + "'");
	                        }
	                        if (this.lexer.showPosition) {
	                            errStr = "Parse error on line " + (yylineno + 1) + ":\n" + this.lexer.showPosition() + "\nExpecting " + expected.join(", ") + ", got '" + (this.terminals_[symbol] || symbol) + "'";
	                        } else {
	                            errStr = "Parse error on line " + (yylineno + 1) + ": Unexpected " + (symbol == 1 ? "end of input" : "'" + (this.terminals_[symbol] || symbol) + "'");
	                        }
	                        this.parseError(errStr, { text: this.lexer.match, token: this.terminals_[symbol] || symbol, line: this.lexer.yylineno, loc: yyloc, expected: expected });
	                    }
	                }
	                if (action[0] instanceof Array && action.length > 1) {
	                    throw new Error("Parse Error: multiple actions possible at state: " + state + ", token: " + symbol);
	                }
	                switch (action[0]) {
	                    case 1:
	                        stack.push(symbol);
	                        vstack.push(this.lexer.yytext);
	                        lstack.push(this.lexer.yylloc);
	                        stack.push(action[1]);
	                        symbol = null;
	                        if (!preErrorSymbol) {
	                            yyleng = this.lexer.yyleng;
	                            yytext = this.lexer.yytext;
	                            yylineno = this.lexer.yylineno;
	                            yyloc = this.lexer.yylloc;
	                            if (recovering > 0) recovering--;
	                        } else {
	                            symbol = preErrorSymbol;
	                            preErrorSymbol = null;
	                        }
	                        break;
	                    case 2:
	                        len = this.productions_[action[1]][1];
	                        yyval.$ = vstack[vstack.length - len];
	                        yyval._$ = { first_line: lstack[lstack.length - (len || 1)].first_line, last_line: lstack[lstack.length - 1].last_line, first_column: lstack[lstack.length - (len || 1)].first_column, last_column: lstack[lstack.length - 1].last_column };
	                        if (ranges) {
	                            yyval._$.range = [lstack[lstack.length - (len || 1)].range[0], lstack[lstack.length - 1].range[1]];
	                        }
	                        r = this.performAction.call(yyval, yytext, yyleng, yylineno, this.yy, action[1], vstack, lstack);
	                        if (typeof r !== "undefined") {
	                            return r;
	                        }
	                        if (len) {
	                            stack = stack.slice(0, -1 * len * 2);
	                            vstack = vstack.slice(0, -1 * len);
	                            lstack = lstack.slice(0, -1 * len);
	                        }
	                        stack.push(this.productions_[action[1]][0]);
	                        vstack.push(yyval.$);
	                        lstack.push(yyval._$);
	                        newState = table[stack[stack.length - 2]][stack[stack.length - 1]];
	                        stack.push(newState);
	                        break;
	                    case 3:
	                        return true;
	                }
	            }
	            return true;
	        }
	    };
	    /* Jison generated lexer */
	    var lexer = (function () {
	        var lexer = { EOF: 1,
	            parseError: function parseError(str, hash) {
	                if (this.yy.parser) {
	                    this.yy.parser.parseError(str, hash);
	                } else {
	                    throw new Error(str);
	                }
	            },
	            setInput: function setInput(input) {
	                this._input = input;
	                this._more = this._less = this.done = false;
	                this.yylineno = this.yyleng = 0;
	                this.yytext = this.matched = this.match = '';
	                this.conditionStack = ['INITIAL'];
	                this.yylloc = { first_line: 1, first_column: 0, last_line: 1, last_column: 0 };
	                if (this.options.ranges) this.yylloc.range = [0, 0];
	                this.offset = 0;
	                return this;
	            },
	            input: function input() {
	                var ch = this._input[0];
	                this.yytext += ch;
	                this.yyleng++;
	                this.offset++;
	                this.match += ch;
	                this.matched += ch;
	                var lines = ch.match(/(?:\r\n?|\n).*/g);
	                if (lines) {
	                    this.yylineno++;
	                    this.yylloc.last_line++;
	                } else {
	                    this.yylloc.last_column++;
	                }
	                if (this.options.ranges) this.yylloc.range[1]++;

	                this._input = this._input.slice(1);
	                return ch;
	            },
	            unput: function unput(ch) {
	                var len = ch.length;
	                var lines = ch.split(/(?:\r\n?|\n)/g);

	                this._input = ch + this._input;
	                this.yytext = this.yytext.substr(0, this.yytext.length - len - 1);
	                //this.yyleng -= len;
	                this.offset -= len;
	                var oldLines = this.match.split(/(?:\r\n?|\n)/g);
	                this.match = this.match.substr(0, this.match.length - 1);
	                this.matched = this.matched.substr(0, this.matched.length - 1);

	                if (lines.length - 1) this.yylineno -= lines.length - 1;
	                var r = this.yylloc.range;

	                this.yylloc = { first_line: this.yylloc.first_line,
	                    last_line: this.yylineno + 1,
	                    first_column: this.yylloc.first_column,
	                    last_column: lines ? (lines.length === oldLines.length ? this.yylloc.first_column : 0) + oldLines[oldLines.length - lines.length].length - lines[0].length : this.yylloc.first_column - len
	                };

	                if (this.options.ranges) {
	                    this.yylloc.range = [r[0], r[0] + this.yyleng - len];
	                }
	                return this;
	            },
	            more: function more() {
	                this._more = true;
	                return this;
	            },
	            less: function less(n) {
	                this.unput(this.match.slice(n));
	            },
	            pastInput: function pastInput() {
	                var past = this.matched.substr(0, this.matched.length - this.match.length);
	                return (past.length > 20 ? '...' : '') + past.substr(-20).replace(/\n/g, "");
	            },
	            upcomingInput: function upcomingInput() {
	                var next = this.match;
	                if (next.length < 20) {
	                    next += this._input.substr(0, 20 - next.length);
	                }
	                return (next.substr(0, 20) + (next.length > 20 ? '...' : '')).replace(/\n/g, "");
	            },
	            showPosition: function showPosition() {
	                var pre = this.pastInput();
	                var c = new Array(pre.length + 1).join("-");
	                return pre + this.upcomingInput() + "\n" + c + "^";
	            },
	            next: function next() {
	                if (this.done) {
	                    return this.EOF;
	                }
	                if (!this._input) this.done = true;

	                var token, match, tempMatch, index, col, lines;
	                if (!this._more) {
	                    this.yytext = '';
	                    this.match = '';
	                }
	                var rules = this._currentRules();
	                for (var i = 0; i < rules.length; i++) {
	                    tempMatch = this._input.match(this.rules[rules[i]]);
	                    if (tempMatch && (!match || tempMatch[0].length > match[0].length)) {
	                        match = tempMatch;
	                        index = i;
	                        if (!this.options.flex) break;
	                    }
	                }
	                if (match) {
	                    lines = match[0].match(/(?:\r\n?|\n).*/g);
	                    if (lines) this.yylineno += lines.length;
	                    this.yylloc = { first_line: this.yylloc.last_line,
	                        last_line: this.yylineno + 1,
	                        first_column: this.yylloc.last_column,
	                        last_column: lines ? lines[lines.length - 1].length - lines[lines.length - 1].match(/\r?\n?/)[0].length : this.yylloc.last_column + match[0].length };
	                    this.yytext += match[0];
	                    this.match += match[0];
	                    this.matches = match;
	                    this.yyleng = this.yytext.length;
	                    if (this.options.ranges) {
	                        this.yylloc.range = [this.offset, this.offset += this.yyleng];
	                    }
	                    this._more = false;
	                    this._input = this._input.slice(match[0].length);
	                    this.matched += match[0];
	                    token = this.performAction.call(this, this.yy, this, rules[index], this.conditionStack[this.conditionStack.length - 1]);
	                    if (this.done && this._input) this.done = false;
	                    if (token) return token;else return;
	                }
	                if (this._input === "") {
	                    return this.EOF;
	                } else {
	                    return this.parseError('Lexical error on line ' + (this.yylineno + 1) + '. Unrecognized text.\n' + this.showPosition(), { text: "", token: null, line: this.yylineno });
	                }
	            },
	            lex: function lex() {
	                var r = this.next();
	                if (typeof r !== 'undefined') {
	                    return r;
	                } else {
	                    return this.lex();
	                }
	            },
	            begin: function begin(condition) {
	                this.conditionStack.push(condition);
	            },
	            popState: function popState() {
	                return this.conditionStack.pop();
	            },
	            _currentRules: function _currentRules() {
	                return this.conditions[this.conditionStack[this.conditionStack.length - 1]].rules;
	            },
	            topState: function topState() {
	                return this.conditionStack[this.conditionStack.length - 2];
	            },
	            pushState: function begin(condition) {
	                this.begin(condition);
	            } };
	        lexer.options = {};
	        lexer.performAction = function anonymous(yy, yy_, $avoiding_name_collisions, YY_START
	        /**/) {

	            function strip(start, end) {
	                return yy_.yytext = yy_.yytext.substr(start, yy_.yyleng - end);
	            }

	            var YYSTATE = YY_START;
	            switch ($avoiding_name_collisions) {
	                case 0:
	                    if (yy_.yytext.slice(-2) === "\\\\") {
	                        strip(0, 1);
	                        this.begin("mu");
	                    } else if (yy_.yytext.slice(-1) === "\\") {
	                        strip(0, 1);
	                        this.begin("emu");
	                    } else {
	                        this.begin("mu");
	                    }
	                    if (yy_.yytext) return 15;

	                    break;
	                case 1:
	                    return 15;
	                    break;
	                case 2:
	                    this.popState();
	                    return 15;

	                    break;
	                case 3:
	                    this.begin('raw');return 15;
	                    break;
	                case 4:
	                    this.popState();
	                    // Should be using `this.topState()` below, but it currently
	                    // returns the second top instead of the first top. Opened an
	                    // issue about it at https://github.com/zaach/jison/issues/291
	                    if (this.conditionStack[this.conditionStack.length - 1] === 'raw') {
	                        return 15;
	                    } else {
	                        yy_.yytext = yy_.yytext.substr(5, yy_.yyleng - 9);
	                        return 'END_RAW_BLOCK';
	                    }

	                    break;
	                case 5:
	                    return 15;
	                    break;
	                case 6:
	                    this.popState();
	                    return 14;

	                    break;
	                case 7:
	                    return 65;
	                    break;
	                case 8:
	                    return 68;
	                    break;
	                case 9:
	                    return 19;
	                    break;
	                case 10:
	                    this.popState();
	                    this.begin('raw');
	                    return 23;

	                    break;
	                case 11:
	                    return 55;
	                    break;
	                case 12:
	                    return 60;
	                    break;
	                case 13:
	                    return 29;
	                    break;
	                case 14:
	                    return 47;
	                    break;
	                case 15:
	                    this.popState();return 44;
	                    break;
	                case 16:
	                    this.popState();return 44;
	                    break;
	                case 17:
	                    return 34;
	                    break;
	                case 18:
	                    return 39;
	                    break;
	                case 19:
	                    return 51;
	                    break;
	                case 20:
	                    return 48;
	                    break;
	                case 21:
	                    this.unput(yy_.yytext);
	                    this.popState();
	                    this.begin('com');

	                    break;
	                case 22:
	                    this.popState();
	                    return 14;

	                    break;
	                case 23:
	                    return 48;
	                    break;
	                case 24:
	                    return 73;
	                    break;
	                case 25:
	                    return 72;
	                    break;
	                case 26:
	                    return 72;
	                    break;
	                case 27:
	                    return 87;
	                    break;
	                case 28:
	                    // ignore whitespace
	                    break;
	                case 29:
	                    this.popState();return 54;
	                    break;
	                case 30:
	                    this.popState();return 33;
	                    break;
	                case 31:
	                    yy_.yytext = strip(1, 2).replace(/\\"/g, '"');return 80;
	                    break;
	                case 32:
	                    yy_.yytext = strip(1, 2).replace(/\\'/g, "'");return 80;
	                    break;
	                case 33:
	                    return 85;
	                    break;
	                case 34:
	                    return 82;
	                    break;
	                case 35:
	                    return 82;
	                    break;
	                case 36:
	                    return 83;
	                    break;
	                case 37:
	                    return 84;
	                    break;
	                case 38:
	                    return 81;
	                    break;
	                case 39:
	                    return 75;
	                    break;
	                case 40:
	                    return 77;
	                    break;
	                case 41:
	                    return 72;
	                    break;
	                case 42:
	                    yy_.yytext = yy_.yytext.replace(/\\([\\\]])/g, '$1');return 72;
	                    break;
	                case 43:
	                    return 'INVALID';
	                    break;
	                case 44:
	                    return 5;
	                    break;
	            }
	        };
	        lexer.rules = [/^(?:[^\x00]*?(?=(\{\{)))/, /^(?:[^\x00]+)/, /^(?:[^\x00]{2,}?(?=(\{\{|\\\{\{|\\\\\{\{|$)))/, /^(?:\{\{\{\{(?=[^\/]))/, /^(?:\{\{\{\{\/[^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=[=}\s\/.])\}\}\}\})/, /^(?:[^\x00]*?(?=(\{\{\{\{)))/, /^(?:[\s\S]*?--(~)?\}\})/, /^(?:\()/, /^(?:\))/, /^(?:\{\{\{\{)/, /^(?:\}\}\}\})/, /^(?:\{\{(~)?>)/, /^(?:\{\{(~)?#>)/, /^(?:\{\{(~)?#\*?)/, /^(?:\{\{(~)?\/)/, /^(?:\{\{(~)?\^\s*(~)?\}\})/, /^(?:\{\{(~)?\s*else\s*(~)?\}\})/, /^(?:\{\{(~)?\^)/, /^(?:\{\{(~)?\s*else\b)/, /^(?:\{\{(~)?\{)/, /^(?:\{\{(~)?&)/, /^(?:\{\{(~)?!--)/, /^(?:\{\{(~)?![\s\S]*?\}\})/, /^(?:\{\{(~)?\*?)/, /^(?:=)/, /^(?:\.\.)/, /^(?:\.(?=([=~}\s\/.)|])))/, /^(?:[\/.])/, /^(?:\s+)/, /^(?:\}(~)?\}\})/, /^(?:(~)?\}\})/, /^(?:"(\\["]|[^"])*")/, /^(?:'(\\[']|[^'])*')/, /^(?:@)/, /^(?:true(?=([~}\s)])))/, /^(?:false(?=([~}\s)])))/, /^(?:undefined(?=([~}\s)])))/, /^(?:null(?=([~}\s)])))/, /^(?:-?[0-9]+(?:\.[0-9]+)?(?=([~}\s)])))/, /^(?:as\s+\|)/, /^(?:\|)/, /^(?:([^\s!"#%-,\.\/;->@\[-\^`\{-~]+(?=([=~}\s\/.)|]))))/, /^(?:\[(\\\]|[^\]])*\])/, /^(?:.)/, /^(?:$)/];
	        lexer.conditions = { "mu": { "rules": [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44], "inclusive": false }, "emu": { "rules": [2], "inclusive": false }, "com": { "rules": [6], "inclusive": false }, "raw": { "rules": [3, 4, 5], "inclusive": false }, "INITIAL": { "rules": [0, 1, 44], "inclusive": true } };
	        return lexer;
	    })();
	    parser.lexer = lexer;
	    function Parser() {
	        this.yy = {};
	    }Parser.prototype = parser;parser.Parser = Parser;
	    return new Parser();
	})();exports["default"] = handlebars;
	module.exports = exports["default"];

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _visitor = __webpack_require__(39);

	var _visitor2 = _interopRequireDefault(_visitor);

	function WhitespaceControl() {
	  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	  this.options = options;
	}
	WhitespaceControl.prototype = new _visitor2['default']();

	WhitespaceControl.prototype.Program = function (program) {
	  var doStandalone = !this.options.ignoreStandalone;

	  var isRoot = !this.isRootSeen;
	  this.isRootSeen = true;

	  var body = program.body;
	  for (var i = 0, l = body.length; i < l; i++) {
	    var current = body[i],
	        strip = this.accept(current);

	    if (!strip) {
	      continue;
	    }

	    var _isPrevWhitespace = isPrevWhitespace(body, i, isRoot),
	        _isNextWhitespace = isNextWhitespace(body, i, isRoot),
	        openStandalone = strip.openStandalone && _isPrevWhitespace,
	        closeStandalone = strip.closeStandalone && _isNextWhitespace,
	        inlineStandalone = strip.inlineStandalone && _isPrevWhitespace && _isNextWhitespace;

	    if (strip.close) {
	      omitRight(body, i, true);
	    }
	    if (strip.open) {
	      omitLeft(body, i, true);
	    }

	    if (doStandalone && inlineStandalone) {
	      omitRight(body, i);

	      if (omitLeft(body, i)) {
	        // If we are on a standalone node, save the indent info for partials
	        if (current.type === 'PartialStatement') {
	          // Pull out the whitespace from the final line
	          current.indent = /([ \t]+$)/.exec(body[i - 1].original)[1];
	        }
	      }
	    }
	    if (doStandalone && openStandalone) {
	      omitRight((current.program || current.inverse).body);

	      // Strip out the previous content node if it's whitespace only
	      omitLeft(body, i);
	    }
	    if (doStandalone && closeStandalone) {
	      // Always strip the next node
	      omitRight(body, i);

	      omitLeft((current.inverse || current.program).body);
	    }
	  }

	  return program;
	};

	WhitespaceControl.prototype.BlockStatement = WhitespaceControl.prototype.DecoratorBlock = WhitespaceControl.prototype.PartialBlockStatement = function (block) {
	  this.accept(block.program);
	  this.accept(block.inverse);

	  // Find the inverse program that is involed with whitespace stripping.
	  var program = block.program || block.inverse,
	      inverse = block.program && block.inverse,
	      firstInverse = inverse,
	      lastInverse = inverse;

	  if (inverse && inverse.chained) {
	    firstInverse = inverse.body[0].program;

	    // Walk the inverse chain to find the last inverse that is actually in the chain.
	    while (lastInverse.chained) {
	      lastInverse = lastInverse.body[lastInverse.body.length - 1].program;
	    }
	  }

	  var strip = {
	    open: block.openStrip.open,
	    close: block.closeStrip.close,

	    // Determine the standalone candiacy. Basically flag our content as being possibly standalone
	    // so our parent can determine if we actually are standalone
	    openStandalone: isNextWhitespace(program.body),
	    closeStandalone: isPrevWhitespace((firstInverse || program).body)
	  };

	  if (block.openStrip.close) {
	    omitRight(program.body, null, true);
	  }

	  if (inverse) {
	    var inverseStrip = block.inverseStrip;

	    if (inverseStrip.open) {
	      omitLeft(program.body, null, true);
	    }

	    if (inverseStrip.close) {
	      omitRight(firstInverse.body, null, true);
	    }
	    if (block.closeStrip.open) {
	      omitLeft(lastInverse.body, null, true);
	    }

	    // Find standalone else statments
	    if (!this.options.ignoreStandalone && isPrevWhitespace(program.body) && isNextWhitespace(firstInverse.body)) {
	      omitLeft(program.body);
	      omitRight(firstInverse.body);
	    }
	  } else if (block.closeStrip.open) {
	    omitLeft(program.body, null, true);
	  }

	  return strip;
	};

	WhitespaceControl.prototype.Decorator = WhitespaceControl.prototype.MustacheStatement = function (mustache) {
	  return mustache.strip;
	};

	WhitespaceControl.prototype.PartialStatement = WhitespaceControl.prototype.CommentStatement = function (node) {
	  /* istanbul ignore next */
	  var strip = node.strip || {};
	  return {
	    inlineStandalone: true,
	    open: strip.open,
	    close: strip.close
	  };
	};

	function isPrevWhitespace(body, i, isRoot) {
	  if (i === undefined) {
	    i = body.length;
	  }

	  // Nodes that end with newlines are considered whitespace (but are special
	  // cased for strip operations)
	  var prev = body[i - 1],
	      sibling = body[i - 2];
	  if (!prev) {
	    return isRoot;
	  }

	  if (prev.type === 'ContentStatement') {
	    return (sibling || !isRoot ? /\r?\n\s*?$/ : /(^|\r?\n)\s*?$/).test(prev.original);
	  }
	}
	function isNextWhitespace(body, i, isRoot) {
	  if (i === undefined) {
	    i = -1;
	  }

	  var next = body[i + 1],
	      sibling = body[i + 2];
	  if (!next) {
	    return isRoot;
	  }

	  if (next.type === 'ContentStatement') {
	    return (sibling || !isRoot ? /^\s*?\r?\n/ : /^\s*?(\r?\n|$)/).test(next.original);
	  }
	}

	// Marks the node to the right of the position as omitted.
	// I.e. {{foo}}' ' will mark the ' ' node as omitted.
	//
	// If i is undefined, then the first child will be marked as such.
	//
	// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
	// content is met.
	function omitRight(body, i, multiple) {
	  var current = body[i == null ? 0 : i + 1];
	  if (!current || current.type !== 'ContentStatement' || !multiple && current.rightStripped) {
	    return;
	  }

	  var original = current.value;
	  current.value = current.value.replace(multiple ? /^\s+/ : /^[ \t]*\r?\n?/, '');
	  current.rightStripped = current.value !== original;
	}

	// Marks the node to the left of the position as omitted.
	// I.e. ' '{{foo}} will mark the ' ' node as omitted.
	//
	// If i is undefined then the last child will be marked as such.
	//
	// If mulitple is truthy then all whitespace will be stripped out until non-whitespace
	// content is met.
	function omitLeft(body, i, multiple) {
	  var current = body[i == null ? body.length - 1 : i - 1];
	  if (!current || current.type !== 'ContentStatement' || !multiple && current.leftStripped) {
	    return;
	  }

	  // We omit the last node if it's whitespace only and not preceeded by a non-content node.
	  var original = current.value;
	  current.value = current.value.replace(multiple ? /\s+$/ : /[ \t]+$/, '');
	  current.leftStripped = current.value !== original;
	  return current.leftStripped;
	}

	exports['default'] = WhitespaceControl;
	module.exports = exports['default'];

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	function Visitor() {
	  this.parents = [];
	}

	Visitor.prototype = {
	  constructor: Visitor,
	  mutating: false,

	  // Visits a given value. If mutating, will replace the value if necessary.
	  acceptKey: function acceptKey(node, name) {
	    var value = this.accept(node[name]);
	    if (this.mutating) {
	      // Hacky sanity check: This may have a few false positives for type for the helper
	      // methods but will generally do the right thing without a lot of overhead.
	      if (value && !Visitor.prototype[value.type]) {
	        throw new _exception2['default']('Unexpected node type "' + value.type + '" found when accepting ' + name + ' on ' + node.type);
	      }
	      node[name] = value;
	    }
	  },

	  // Performs an accept operation with added sanity check to ensure
	  // required keys are not removed.
	  acceptRequired: function acceptRequired(node, name) {
	    this.acceptKey(node, name);

	    if (!node[name]) {
	      throw new _exception2['default'](node.type + ' requires ' + name);
	    }
	  },

	  // Traverses a given array. If mutating, empty respnses will be removed
	  // for child elements.
	  acceptArray: function acceptArray(array) {
	    for (var i = 0, l = array.length; i < l; i++) {
	      this.acceptKey(array, i);

	      if (!array[i]) {
	        array.splice(i, 1);
	        i--;
	        l--;
	      }
	    }
	  },

	  accept: function accept(object) {
	    if (!object) {
	      return;
	    }

	    /* istanbul ignore next: Sanity code */
	    if (!this[object.type]) {
	      throw new _exception2['default']('Unknown type: ' + object.type, object);
	    }

	    if (this.current) {
	      this.parents.unshift(this.current);
	    }
	    this.current = object;

	    var ret = this[object.type](object);

	    this.current = this.parents.shift();

	    if (!this.mutating || ret) {
	      return ret;
	    } else if (ret !== false) {
	      return object;
	    }
	  },

	  Program: function Program(program) {
	    this.acceptArray(program.body);
	  },

	  MustacheStatement: visitSubExpression,
	  Decorator: visitSubExpression,

	  BlockStatement: visitBlock,
	  DecoratorBlock: visitBlock,

	  PartialStatement: visitPartial,
	  PartialBlockStatement: function PartialBlockStatement(partial) {
	    visitPartial.call(this, partial);

	    this.acceptKey(partial, 'program');
	  },

	  ContentStatement: function ContentStatement() /* content */{},
	  CommentStatement: function CommentStatement() /* comment */{},

	  SubExpression: visitSubExpression,

	  PathExpression: function PathExpression() /* path */{},

	  StringLiteral: function StringLiteral() /* string */{},
	  NumberLiteral: function NumberLiteral() /* number */{},
	  BooleanLiteral: function BooleanLiteral() /* bool */{},
	  UndefinedLiteral: function UndefinedLiteral() /* literal */{},
	  NullLiteral: function NullLiteral() /* literal */{},

	  Hash: function Hash(hash) {
	    this.acceptArray(hash.pairs);
	  },
	  HashPair: function HashPair(pair) {
	    this.acceptRequired(pair, 'value');
	  }
	};

	function visitSubExpression(mustache) {
	  this.acceptRequired(mustache, 'path');
	  this.acceptArray(mustache.params);
	  this.acceptKey(mustache, 'hash');
	}
	function visitBlock(block) {
	  visitSubExpression.call(this, block);

	  this.acceptKey(block, 'program');
	  this.acceptKey(block, 'inverse');
	}
	function visitPartial(partial) {
	  this.acceptRequired(partial, 'name');
	  this.acceptArray(partial.params);
	  this.acceptKey(partial, 'hash');
	}

	exports['default'] = Visitor;
	module.exports = exports['default'];

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.SourceLocation = SourceLocation;
	exports.id = id;
	exports.stripFlags = stripFlags;
	exports.stripComment = stripComment;
	exports.preparePath = preparePath;
	exports.prepareMustache = prepareMustache;
	exports.prepareRawBlock = prepareRawBlock;
	exports.prepareBlock = prepareBlock;
	exports.prepareProgram = prepareProgram;
	exports.preparePartialBlock = preparePartialBlock;

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	function validateClose(open, close) {
	  close = close.path ? close.path.original : close;

	  if (open.path.original !== close) {
	    var errorNode = { loc: open.path.loc };

	    throw new _exception2['default'](open.path.original + " doesn't match " + close, errorNode);
	  }
	}

	function SourceLocation(source, locInfo) {
	  this.source = source;
	  this.start = {
	    line: locInfo.first_line,
	    column: locInfo.first_column
	  };
	  this.end = {
	    line: locInfo.last_line,
	    column: locInfo.last_column
	  };
	}

	function id(token) {
	  if (/^\[.*\]$/.test(token)) {
	    return token.substr(1, token.length - 2);
	  } else {
	    return token;
	  }
	}

	function stripFlags(open, close) {
	  return {
	    open: open.charAt(2) === '~',
	    close: close.charAt(close.length - 3) === '~'
	  };
	}

	function stripComment(comment) {
	  return comment.replace(/^\{\{~?!-?-?/, '').replace(/-?-?~?\}\}$/, '');
	}

	function preparePath(data, parts, loc) {
	  loc = this.locInfo(loc);

	  var original = data ? '@' : '',
	      dig = [],
	      depth = 0;

	  for (var i = 0, l = parts.length; i < l; i++) {
	    var part = parts[i].part,

	    // If we have [] syntax then we do not treat path references as operators,
	    // i.e. foo.[this] resolves to approximately context.foo['this']
	    isLiteral = parts[i].original !== part;
	    original += (parts[i].separator || '') + part;

	    if (!isLiteral && (part === '..' || part === '.' || part === 'this')) {
	      if (dig.length > 0) {
	        throw new _exception2['default']('Invalid path: ' + original, { loc: loc });
	      } else if (part === '..') {
	        depth++;
	      }
	    } else {
	      dig.push(part);
	    }
	  }

	  return {
	    type: 'PathExpression',
	    data: data,
	    depth: depth,
	    parts: dig,
	    original: original,
	    loc: loc
	  };
	}

	function prepareMustache(path, params, hash, open, strip, locInfo) {
	  // Must use charAt to support IE pre-10
	  var escapeFlag = open.charAt(3) || open.charAt(2),
	      escaped = escapeFlag !== '{' && escapeFlag !== '&';

	  var decorator = /\*/.test(open);
	  return {
	    type: decorator ? 'Decorator' : 'MustacheStatement',
	    path: path,
	    params: params,
	    hash: hash,
	    escaped: escaped,
	    strip: strip,
	    loc: this.locInfo(locInfo)
	  };
	}

	function prepareRawBlock(openRawBlock, contents, close, locInfo) {
	  validateClose(openRawBlock, close);

	  locInfo = this.locInfo(locInfo);
	  var program = {
	    type: 'Program',
	    body: contents,
	    strip: {},
	    loc: locInfo
	  };

	  return {
	    type: 'BlockStatement',
	    path: openRawBlock.path,
	    params: openRawBlock.params,
	    hash: openRawBlock.hash,
	    program: program,
	    openStrip: {},
	    inverseStrip: {},
	    closeStrip: {},
	    loc: locInfo
	  };
	}

	function prepareBlock(openBlock, program, inverseAndProgram, close, inverted, locInfo) {
	  if (close && close.path) {
	    validateClose(openBlock, close);
	  }

	  var decorator = /\*/.test(openBlock.open);

	  program.blockParams = openBlock.blockParams;

	  var inverse = undefined,
	      inverseStrip = undefined;

	  if (inverseAndProgram) {
	    if (decorator) {
	      throw new _exception2['default']('Unexpected inverse block on decorator', inverseAndProgram);
	    }

	    if (inverseAndProgram.chain) {
	      inverseAndProgram.program.body[0].closeStrip = close.strip;
	    }

	    inverseStrip = inverseAndProgram.strip;
	    inverse = inverseAndProgram.program;
	  }

	  if (inverted) {
	    inverted = inverse;
	    inverse = program;
	    program = inverted;
	  }

	  return {
	    type: decorator ? 'DecoratorBlock' : 'BlockStatement',
	    path: openBlock.path,
	    params: openBlock.params,
	    hash: openBlock.hash,
	    program: program,
	    inverse: inverse,
	    openStrip: openBlock.strip,
	    inverseStrip: inverseStrip,
	    closeStrip: close && close.strip,
	    loc: this.locInfo(locInfo)
	  };
	}

	function prepareProgram(statements, loc) {
	  if (!loc && statements.length) {
	    var firstLoc = statements[0].loc,
	        lastLoc = statements[statements.length - 1].loc;

	    /* istanbul ignore else */
	    if (firstLoc && lastLoc) {
	      loc = {
	        source: firstLoc.source,
	        start: {
	          line: firstLoc.start.line,
	          column: firstLoc.start.column
	        },
	        end: {
	          line: lastLoc.end.line,
	          column: lastLoc.end.column
	        }
	      };
	    }
	  }

	  return {
	    type: 'Program',
	    body: statements,
	    strip: {},
	    loc: loc
	  };
	}

	function preparePartialBlock(open, program, close, locInfo) {
	  validateClose(open, close);

	  return {
	    type: 'PartialBlockStatement',
	    name: open.path,
	    params: open.params,
	    hash: open.hash,
	    program: program,
	    openStrip: open.strip,
	    closeStrip: close && close.strip,
	    loc: this.locInfo(locInfo)
	  };
	}

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	/* eslint-disable new-cap */

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;
	exports.Compiler = Compiler;
	exports.precompile = precompile;
	exports.compile = compile;

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	var _utils = __webpack_require__(5);

	var _ast = __webpack_require__(35);

	var _ast2 = _interopRequireDefault(_ast);

	var slice = [].slice;

	function Compiler() {}

	// the foundHelper register will disambiguate helper lookup from finding a
	// function in a context. This is necessary for mustache compatibility, which
	// requires that context functions in blocks are evaluated by blockHelperMissing,
	// and then proceed as if the resulting value was provided to blockHelperMissing.

	Compiler.prototype = {
	  compiler: Compiler,

	  equals: function equals(other) {
	    var len = this.opcodes.length;
	    if (other.opcodes.length !== len) {
	      return false;
	    }

	    for (var i = 0; i < len; i++) {
	      var opcode = this.opcodes[i],
	          otherOpcode = other.opcodes[i];
	      if (opcode.opcode !== otherOpcode.opcode || !argEquals(opcode.args, otherOpcode.args)) {
	        return false;
	      }
	    }

	    // We know that length is the same between the two arrays because they are directly tied
	    // to the opcode behavior above.
	    len = this.children.length;
	    for (var i = 0; i < len; i++) {
	      if (!this.children[i].equals(other.children[i])) {
	        return false;
	      }
	    }

	    return true;
	  },

	  guid: 0,

	  compile: function compile(program, options) {
	    this.sourceNode = [];
	    this.opcodes = [];
	    this.children = [];
	    this.options = options;
	    this.stringParams = options.stringParams;
	    this.trackIds = options.trackIds;

	    options.blockParams = options.blockParams || [];

	    // These changes will propagate to the other compiler components
	    var knownHelpers = options.knownHelpers;
	    options.knownHelpers = {
	      'helperMissing': true,
	      'blockHelperMissing': true,
	      'each': true,
	      'if': true,
	      'unless': true,
	      'with': true,
	      'log': true,
	      'lookup': true
	    };
	    if (knownHelpers) {
	      // the next line should use "Object.keys", but the code has been like this a long time and changing it, might
	      // cause backwards-compatibility issues... It's an old library...
	      // eslint-disable-next-line guard-for-in
	      for (var _name in knownHelpers) {
	        this.options.knownHelpers[_name] = knownHelpers[_name];
	      }
	    }

	    return this.accept(program);
	  },

	  compileProgram: function compileProgram(program) {
	    var childCompiler = new this.compiler(),
	        // eslint-disable-line new-cap
	    result = childCompiler.compile(program, this.options),
	        guid = this.guid++;

	    this.usePartial = this.usePartial || result.usePartial;

	    this.children[guid] = result;
	    this.useDepths = this.useDepths || result.useDepths;

	    return guid;
	  },

	  accept: function accept(node) {
	    /* istanbul ignore next: Sanity code */
	    if (!this[node.type]) {
	      throw new _exception2['default']('Unknown type: ' + node.type, node);
	    }

	    this.sourceNode.unshift(node);
	    var ret = this[node.type](node);
	    this.sourceNode.shift();
	    return ret;
	  },

	  Program: function Program(program) {
	    this.options.blockParams.unshift(program.blockParams);

	    var body = program.body,
	        bodyLength = body.length;
	    for (var i = 0; i < bodyLength; i++) {
	      this.accept(body[i]);
	    }

	    this.options.blockParams.shift();

	    this.isSimple = bodyLength === 1;
	    this.blockParams = program.blockParams ? program.blockParams.length : 0;

	    return this;
	  },

	  BlockStatement: function BlockStatement(block) {
	    transformLiteralToPath(block);

	    var program = block.program,
	        inverse = block.inverse;

	    program = program && this.compileProgram(program);
	    inverse = inverse && this.compileProgram(inverse);

	    var type = this.classifySexpr(block);

	    if (type === 'helper') {
	      this.helperSexpr(block, program, inverse);
	    } else if (type === 'simple') {
	      this.simpleSexpr(block);

	      // now that the simple mustache is resolved, we need to
	      // evaluate it by executing `blockHelperMissing`
	      this.opcode('pushProgram', program);
	      this.opcode('pushProgram', inverse);
	      this.opcode('emptyHash');
	      this.opcode('blockValue', block.path.original);
	    } else {
	      this.ambiguousSexpr(block, program, inverse);

	      // now that the simple mustache is resolved, we need to
	      // evaluate it by executing `blockHelperMissing`
	      this.opcode('pushProgram', program);
	      this.opcode('pushProgram', inverse);
	      this.opcode('emptyHash');
	      this.opcode('ambiguousBlockValue');
	    }

	    this.opcode('append');
	  },

	  DecoratorBlock: function DecoratorBlock(decorator) {
	    var program = decorator.program && this.compileProgram(decorator.program);
	    var params = this.setupFullMustacheParams(decorator, program, undefined),
	        path = decorator.path;

	    this.useDecorators = true;
	    this.opcode('registerDecorator', params.length, path.original);
	  },

	  PartialStatement: function PartialStatement(partial) {
	    this.usePartial = true;

	    var program = partial.program;
	    if (program) {
	      program = this.compileProgram(partial.program);
	    }

	    var params = partial.params;
	    if (params.length > 1) {
	      throw new _exception2['default']('Unsupported number of partial arguments: ' + params.length, partial);
	    } else if (!params.length) {
	      if (this.options.explicitPartialContext) {
	        this.opcode('pushLiteral', 'undefined');
	      } else {
	        params.push({ type: 'PathExpression', parts: [], depth: 0 });
	      }
	    }

	    var partialName = partial.name.original,
	        isDynamic = partial.name.type === 'SubExpression';
	    if (isDynamic) {
	      this.accept(partial.name);
	    }

	    this.setupFullMustacheParams(partial, program, undefined, true);

	    var indent = partial.indent || '';
	    if (this.options.preventIndent && indent) {
	      this.opcode('appendContent', indent);
	      indent = '';
	    }

	    this.opcode('invokePartial', isDynamic, partialName, indent);
	    this.opcode('append');
	  },
	  PartialBlockStatement: function PartialBlockStatement(partialBlock) {
	    this.PartialStatement(partialBlock);
	  },

	  MustacheStatement: function MustacheStatement(mustache) {
	    this.SubExpression(mustache);

	    if (mustache.escaped && !this.options.noEscape) {
	      this.opcode('appendEscaped');
	    } else {
	      this.opcode('append');
	    }
	  },
	  Decorator: function Decorator(decorator) {
	    this.DecoratorBlock(decorator);
	  },

	  ContentStatement: function ContentStatement(content) {
	    if (content.value) {
	      this.opcode('appendContent', content.value);
	    }
	  },

	  CommentStatement: function CommentStatement() {},

	  SubExpression: function SubExpression(sexpr) {
	    transformLiteralToPath(sexpr);
	    var type = this.classifySexpr(sexpr);

	    if (type === 'simple') {
	      this.simpleSexpr(sexpr);
	    } else if (type === 'helper') {
	      this.helperSexpr(sexpr);
	    } else {
	      this.ambiguousSexpr(sexpr);
	    }
	  },
	  ambiguousSexpr: function ambiguousSexpr(sexpr, program, inverse) {
	    var path = sexpr.path,
	        name = path.parts[0],
	        isBlock = program != null || inverse != null;

	    this.opcode('getContext', path.depth);

	    this.opcode('pushProgram', program);
	    this.opcode('pushProgram', inverse);

	    path.strict = true;
	    this.accept(path);

	    this.opcode('invokeAmbiguous', name, isBlock);
	  },

	  simpleSexpr: function simpleSexpr(sexpr) {
	    var path = sexpr.path;
	    path.strict = true;
	    this.accept(path);
	    this.opcode('resolvePossibleLambda');
	  },

	  helperSexpr: function helperSexpr(sexpr, program, inverse) {
	    var params = this.setupFullMustacheParams(sexpr, program, inverse),
	        path = sexpr.path,
	        name = path.parts[0];

	    if (this.options.knownHelpers[name]) {
	      this.opcode('invokeKnownHelper', params.length, name);
	    } else if (this.options.knownHelpersOnly) {
	      throw new _exception2['default']('You specified knownHelpersOnly, but used the unknown helper ' + name, sexpr);
	    } else {
	      path.strict = true;
	      path.falsy = true;

	      this.accept(path);
	      this.opcode('invokeHelper', params.length, path.original, _ast2['default'].helpers.simpleId(path));
	    }
	  },

	  PathExpression: function PathExpression(path) {
	    this.addDepth(path.depth);
	    this.opcode('getContext', path.depth);

	    var name = path.parts[0],
	        scoped = _ast2['default'].helpers.scopedId(path),
	        blockParamId = !path.depth && !scoped && this.blockParamIndex(name);

	    if (blockParamId) {
	      this.opcode('lookupBlockParam', blockParamId, path.parts);
	    } else if (!name) {
	      // Context reference, i.e. `{{foo .}}` or `{{foo ..}}`
	      this.opcode('pushContext');
	    } else if (path.data) {
	      this.options.data = true;
	      this.opcode('lookupData', path.depth, path.parts, path.strict);
	    } else {
	      this.opcode('lookupOnContext', path.parts, path.falsy, path.strict, scoped);
	    }
	  },

	  StringLiteral: function StringLiteral(string) {
	    this.opcode('pushString', string.value);
	  },

	  NumberLiteral: function NumberLiteral(number) {
	    this.opcode('pushLiteral', number.value);
	  },

	  BooleanLiteral: function BooleanLiteral(bool) {
	    this.opcode('pushLiteral', bool.value);
	  },

	  UndefinedLiteral: function UndefinedLiteral() {
	    this.opcode('pushLiteral', 'undefined');
	  },

	  NullLiteral: function NullLiteral() {
	    this.opcode('pushLiteral', 'null');
	  },

	  Hash: function Hash(hash) {
	    var pairs = hash.pairs,
	        i = 0,
	        l = pairs.length;

	    this.opcode('pushHash');

	    for (; i < l; i++) {
	      this.pushParam(pairs[i].value);
	    }
	    while (i--) {
	      this.opcode('assignToHash', pairs[i].key);
	    }
	    this.opcode('popHash');
	  },

	  // HELPERS
	  opcode: function opcode(name) {
	    this.opcodes.push({ opcode: name, args: slice.call(arguments, 1), loc: this.sourceNode[0].loc });
	  },

	  addDepth: function addDepth(depth) {
	    if (!depth) {
	      return;
	    }

	    this.useDepths = true;
	  },

	  classifySexpr: function classifySexpr(sexpr) {
	    var isSimple = _ast2['default'].helpers.simpleId(sexpr.path);

	    var isBlockParam = isSimple && !!this.blockParamIndex(sexpr.path.parts[0]);

	    // a mustache is an eligible helper if:
	    // * its id is simple (a single part, not `this` or `..`)
	    var isHelper = !isBlockParam && _ast2['default'].helpers.helperExpression(sexpr);

	    // if a mustache is an eligible helper but not a definite
	    // helper, it is ambiguous, and will be resolved in a later
	    // pass or at runtime.
	    var isEligible = !isBlockParam && (isHelper || isSimple);

	    // if ambiguous, we can possibly resolve the ambiguity now
	    // An eligible helper is one that does not have a complex path, i.e. `this.foo`, `../foo` etc.
	    if (isEligible && !isHelper) {
	      var _name2 = sexpr.path.parts[0],
	          options = this.options;

	      if (options.knownHelpers[_name2]) {
	        isHelper = true;
	      } else if (options.knownHelpersOnly) {
	        isEligible = false;
	      }
	    }

	    if (isHelper) {
	      return 'helper';
	    } else if (isEligible) {
	      return 'ambiguous';
	    } else {
	      return 'simple';
	    }
	  },

	  pushParams: function pushParams(params) {
	    for (var i = 0, l = params.length; i < l; i++) {
	      this.pushParam(params[i]);
	    }
	  },

	  pushParam: function pushParam(val) {
	    var value = val.value != null ? val.value : val.original || '';

	    if (this.stringParams) {
	      if (value.replace) {
	        value = value.replace(/^(\.?\.\/)*/g, '').replace(/\//g, '.');
	      }

	      if (val.depth) {
	        this.addDepth(val.depth);
	      }
	      this.opcode('getContext', val.depth || 0);
	      this.opcode('pushStringParam', value, val.type);

	      if (val.type === 'SubExpression') {
	        // SubExpressions get evaluated and passed in
	        // in string params mode.
	        this.accept(val);
	      }
	    } else {
	      if (this.trackIds) {
	        var blockParamIndex = undefined;
	        if (val.parts && !_ast2['default'].helpers.scopedId(val) && !val.depth) {
	          blockParamIndex = this.blockParamIndex(val.parts[0]);
	        }
	        if (blockParamIndex) {
	          var blockParamChild = val.parts.slice(1).join('.');
	          this.opcode('pushId', 'BlockParam', blockParamIndex, blockParamChild);
	        } else {
	          value = val.original || value;
	          if (value.replace) {
	            value = value.replace(/^this(?:\.|$)/, '').replace(/^\.\//, '').replace(/^\.$/, '');
	          }

	          this.opcode('pushId', val.type, value);
	        }
	      }
	      this.accept(val);
	    }
	  },

	  setupFullMustacheParams: function setupFullMustacheParams(sexpr, program, inverse, omitEmpty) {
	    var params = sexpr.params;
	    this.pushParams(params);

	    this.opcode('pushProgram', program);
	    this.opcode('pushProgram', inverse);

	    if (sexpr.hash) {
	      this.accept(sexpr.hash);
	    } else {
	      this.opcode('emptyHash', omitEmpty);
	    }

	    return params;
	  },

	  blockParamIndex: function blockParamIndex(name) {
	    for (var depth = 0, len = this.options.blockParams.length; depth < len; depth++) {
	      var blockParams = this.options.blockParams[depth],
	          param = blockParams && _utils.indexOf(blockParams, name);
	      if (blockParams && param >= 0) {
	        return [depth, param];
	      }
	    }
	  }
	};

	function precompile(input, options, env) {
	  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
	    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.precompile. You passed ' + input);
	  }

	  options = options || {};
	  if (!('data' in options)) {
	    options.data = true;
	  }
	  if (options.compat) {
	    options.useDepths = true;
	  }

	  var ast = env.parse(input, options),
	      environment = new env.Compiler().compile(ast, options);
	  return new env.JavaScriptCompiler().compile(environment, options);
	}

	function compile(input, options, env) {
	  if (options === undefined) options = {};

	  if (input == null || typeof input !== 'string' && input.type !== 'Program') {
	    throw new _exception2['default']('You must pass a string or Handlebars AST to Handlebars.compile. You passed ' + input);
	  }

	  options = _utils.extend({}, options);
	  if (!('data' in options)) {
	    options.data = true;
	  }
	  if (options.compat) {
	    options.useDepths = true;
	  }

	  var compiled = undefined;

	  function compileInput() {
	    var ast = env.parse(input, options),
	        environment = new env.Compiler().compile(ast, options),
	        templateSpec = new env.JavaScriptCompiler().compile(environment, options, undefined, true);
	    return env.template(templateSpec);
	  }

	  // Template is only compiled on first use and cached after that point.
	  function ret(context, execOptions) {
	    if (!compiled) {
	      compiled = compileInput();
	    }
	    return compiled.call(this, context, execOptions);
	  }
	  ret._setup = function (setupOptions) {
	    if (!compiled) {
	      compiled = compileInput();
	    }
	    return compiled._setup(setupOptions);
	  };
	  ret._child = function (i, data, blockParams, depths) {
	    if (!compiled) {
	      compiled = compileInput();
	    }
	    return compiled._child(i, data, blockParams, depths);
	  };
	  return ret;
	}

	function argEquals(a, b) {
	  if (a === b) {
	    return true;
	  }

	  if (_utils.isArray(a) && _utils.isArray(b) && a.length === b.length) {
	    for (var i = 0; i < a.length; i++) {
	      if (!argEquals(a[i], b[i])) {
	        return false;
	      }
	    }
	    return true;
	  }
	}

	function transformLiteralToPath(sexpr) {
	  if (!sexpr.path.parts) {
	    var literal = sexpr.path;
	    // Casting to string here to make false and 0 literal values play nicely with the rest
	    // of the system.
	    sexpr.path = {
	      type: 'PathExpression',
	      data: false,
	      depth: 0,
	      parts: [literal.original + ''],
	      original: literal.original + '',
	      loc: literal.loc
	    };
	  }
	}

/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _interopRequireDefault = __webpack_require__(1)['default'];

	exports.__esModule = true;

	var _base = __webpack_require__(4);

	var _exception = __webpack_require__(6);

	var _exception2 = _interopRequireDefault(_exception);

	var _utils = __webpack_require__(5);

	var _codeGen = __webpack_require__(43);

	var _codeGen2 = _interopRequireDefault(_codeGen);

	function Literal(value) {
	  this.value = value;
	}

	function JavaScriptCompiler() {}

	JavaScriptCompiler.prototype = {
	  // PUBLIC API: You can override these methods in a subclass to provide
	  // alternative compiled forms for name lookup and buffering semantics
	  nameLookup: function nameLookup(parent, name /* , type*/) {
	    if (JavaScriptCompiler.isValidJavaScriptVariableName(name)) {
	      return [parent, '.', name];
	    } else {
	      return [parent, '[', JSON.stringify(name), ']'];
	    }
	  },
	  depthedLookup: function depthedLookup(name) {
	    return [this.aliasable('container.lookup'), '(depths, "', name, '")'];
	  },

	  compilerInfo: function compilerInfo() {
	    var revision = _base.COMPILER_REVISION,
	        versions = _base.REVISION_CHANGES[revision];
	    return [revision, versions];
	  },

	  appendToBuffer: function appendToBuffer(source, location, explicit) {
	    // Force a source as this simplifies the merge logic.
	    if (!_utils.isArray(source)) {
	      source = [source];
	    }
	    source = this.source.wrap(source, location);

	    if (this.environment.isSimple) {
	      return ['return ', source, ';'];
	    } else if (explicit) {
	      // This is a case where the buffer operation occurs as a child of another
	      // construct, generally braces. We have to explicitly output these buffer
	      // operations to ensure that the emitted code goes in the correct location.
	      return ['buffer += ', source, ';'];
	    } else {
	      source.appendToBuffer = true;
	      return source;
	    }
	  },

	  initializeBuffer: function initializeBuffer() {
	    return this.quotedString('');
	  },
	  // END PUBLIC API

	  compile: function compile(environment, options, context, asObject) {
	    this.environment = environment;
	    this.options = options;
	    this.stringParams = this.options.stringParams;
	    this.trackIds = this.options.trackIds;
	    this.precompile = !asObject;

	    this.name = this.environment.name;
	    this.isChild = !!context;
	    this.context = context || {
	      decorators: [],
	      programs: [],
	      environments: []
	    };

	    this.preamble();

	    this.stackSlot = 0;
	    this.stackVars = [];
	    this.aliases = {};
	    this.registers = { list: [] };
	    this.hashes = [];
	    this.compileStack = [];
	    this.inlineStack = [];
	    this.blockParams = [];

	    this.compileChildren(environment, options);

	    this.useDepths = this.useDepths || environment.useDepths || environment.useDecorators || this.options.compat;
	    this.useBlockParams = this.useBlockParams || environment.useBlockParams;

	    var opcodes = environment.opcodes,
	        opcode = undefined,
	        firstLoc = undefined,
	        i = undefined,
	        l = undefined;

	    for (i = 0, l = opcodes.length; i < l; i++) {
	      opcode = opcodes[i];

	      this.source.currentLocation = opcode.loc;
	      firstLoc = firstLoc || opcode.loc;
	      this[opcode.opcode].apply(this, opcode.args);
	    }

	    // Flush any trailing content that might be pending.
	    this.source.currentLocation = firstLoc;
	    this.pushSource('');

	    /* istanbul ignore next */
	    if (this.stackSlot || this.inlineStack.length || this.compileStack.length) {
	      throw new _exception2['default']('Compile completed with content left on stack');
	    }

	    if (!this.decorators.isEmpty()) {
	      this.useDecorators = true;

	      this.decorators.prepend('var decorators = container.decorators;\n');
	      this.decorators.push('return fn;');

	      if (asObject) {
	        this.decorators = Function.apply(this, ['fn', 'props', 'container', 'depth0', 'data', 'blockParams', 'depths', this.decorators.merge()]);
	      } else {
	        this.decorators.prepend('function(fn, props, container, depth0, data, blockParams, depths) {\n');
	        this.decorators.push('}\n');
	        this.decorators = this.decorators.merge();
	      }
	    } else {
	      this.decorators = undefined;
	    }

	    var fn = this.createFunctionContext(asObject);
	    if (!this.isChild) {
	      var ret = {
	        compiler: this.compilerInfo(),
	        main: fn
	      };

	      if (this.decorators) {
	        ret.main_d = this.decorators; // eslint-disable-line camelcase
	        ret.useDecorators = true;
	      }

	      var _context = this.context;
	      var programs = _context.programs;
	      var decorators = _context.decorators;

	      for (i = 0, l = programs.length; i < l; i++) {
	        if (programs[i]) {
	          ret[i] = programs[i];
	          if (decorators[i]) {
	            ret[i + '_d'] = decorators[i];
	            ret.useDecorators = true;
	          }
	        }
	      }

	      if (this.environment.usePartial) {
	        ret.usePartial = true;
	      }
	      if (this.options.data) {
	        ret.useData = true;
	      }
	      if (this.useDepths) {
	        ret.useDepths = true;
	      }
	      if (this.useBlockParams) {
	        ret.useBlockParams = true;
	      }
	      if (this.options.compat) {
	        ret.compat = true;
	      }

	      if (!asObject) {
	        ret.compiler = JSON.stringify(ret.compiler);

	        this.source.currentLocation = { start: { line: 1, column: 0 } };
	        ret = this.objectLiteral(ret);

	        if (options.srcName) {
	          ret = ret.toStringWithSourceMap({ file: options.destName });
	          ret.map = ret.map && ret.map.toString();
	        } else {
	          ret = ret.toString();
	        }
	      } else {
	        ret.compilerOptions = this.options;
	      }

	      return ret;
	    } else {
	      return fn;
	    }
	  },

	  preamble: function preamble() {
	    // track the last context pushed into place to allow skipping the
	    // getContext opcode when it would be a noop
	    this.lastContext = 0;
	    this.source = new _codeGen2['default'](this.options.srcName);
	    this.decorators = new _codeGen2['default'](this.options.srcName);
	  },

	  createFunctionContext: function createFunctionContext(asObject) {
	    var varDeclarations = '';

	    var locals = this.stackVars.concat(this.registers.list);
	    if (locals.length > 0) {
	      varDeclarations += ', ' + locals.join(', ');
	    }

	    // Generate minimizer alias mappings
	    //
	    // When using true SourceNodes, this will update all references to the given alias
	    // as the source nodes are reused in situ. For the non-source node compilation mode,
	    // aliases will not be used, but this case is already being run on the client and
	    // we aren't concern about minimizing the template size.
	    var aliasCount = 0;
	    for (var alias in this.aliases) {
	      // eslint-disable-line guard-for-in
	      var node = this.aliases[alias];

	      if (this.aliases.hasOwnProperty(alias) && node.children && node.referenceCount > 1) {
	        varDeclarations += ', alias' + ++aliasCount + '=' + alias;
	        node.children[0] = 'alias' + aliasCount;
	      }
	    }

	    var params = ['container', 'depth0', 'helpers', 'partials', 'data'];

	    if (this.useBlockParams || this.useDepths) {
	      params.push('blockParams');
	    }
	    if (this.useDepths) {
	      params.push('depths');
	    }

	    // Perform a second pass over the output to merge content when possible
	    var source = this.mergeSource(varDeclarations);

	    if (asObject) {
	      params.push(source);

	      return Function.apply(this, params);
	    } else {
	      return this.source.wrap(['function(', params.join(','), ') {\n  ', source, '}']);
	    }
	  },
	  mergeSource: function mergeSource(varDeclarations) {
	    var isSimple = this.environment.isSimple,
	        appendOnly = !this.forceBuffer,
	        appendFirst = undefined,
	        sourceSeen = undefined,
	        bufferStart = undefined,
	        bufferEnd = undefined;
	    this.source.each(function (line) {
	      if (line.appendToBuffer) {
	        if (bufferStart) {
	          line.prepend('  + ');
	        } else {
	          bufferStart = line;
	        }
	        bufferEnd = line;
	      } else {
	        if (bufferStart) {
	          if (!sourceSeen) {
	            appendFirst = true;
	          } else {
	            bufferStart.prepend('buffer += ');
	          }
	          bufferEnd.add(';');
	          bufferStart = bufferEnd = undefined;
	        }

	        sourceSeen = true;
	        if (!isSimple) {
	          appendOnly = false;
	        }
	      }
	    });

	    if (appendOnly) {
	      if (bufferStart) {
	        bufferStart.prepend('return ');
	        bufferEnd.add(';');
	      } else if (!sourceSeen) {
	        this.source.push('return "";');
	      }
	    } else {
	      varDeclarations += ', buffer = ' + (appendFirst ? '' : this.initializeBuffer());

	      if (bufferStart) {
	        bufferStart.prepend('return buffer + ');
	        bufferEnd.add(';');
	      } else {
	        this.source.push('return buffer;');
	      }
	    }

	    if (varDeclarations) {
	      this.source.prepend('var ' + varDeclarations.substring(2) + (appendFirst ? '' : ';\n'));
	    }

	    return this.source.merge();
	  },

	  // [blockValue]
	  //
	  // On stack, before: hash, inverse, program, value
	  // On stack, after: return value of blockHelperMissing
	  //
	  // The purpose of this opcode is to take a block of the form
	  // `{{#this.foo}}...{{/this.foo}}`, resolve the value of `foo`, and
	  // replace it on the stack with the result of properly
	  // invoking blockHelperMissing.
	  blockValue: function blockValue(name) {
	    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
	        params = [this.contextName(0)];
	    this.setupHelperArgs(name, 0, params);

	    var blockName = this.popStack();
	    params.splice(1, 0, blockName);

	    this.push(this.source.functionCall(blockHelperMissing, 'call', params));
	  },

	  // [ambiguousBlockValue]
	  //
	  // On stack, before: hash, inverse, program, value
	  // Compiler value, before: lastHelper=value of last found helper, if any
	  // On stack, after, if no lastHelper: same as [blockValue]
	  // On stack, after, if lastHelper: value
	  ambiguousBlockValue: function ambiguousBlockValue() {
	    // We're being a bit cheeky and reusing the options value from the prior exec
	    var blockHelperMissing = this.aliasable('helpers.blockHelperMissing'),
	        params = [this.contextName(0)];
	    this.setupHelperArgs('', 0, params, true);

	    this.flushInline();

	    var current = this.topStack();
	    params.splice(1, 0, current);

	    this.pushSource(['if (!', this.lastHelper, ') { ', current, ' = ', this.source.functionCall(blockHelperMissing, 'call', params), '}']);
	  },

	  // [appendContent]
	  //
	  // On stack, before: ...
	  // On stack, after: ...
	  //
	  // Appends the string value of `content` to the current buffer
	  appendContent: function appendContent(content) {
	    if (this.pendingContent) {
	      content = this.pendingContent + content;
	    } else {
	      this.pendingLocation = this.source.currentLocation;
	    }

	    this.pendingContent = content;
	  },

	  // [append]
	  //
	  // On stack, before: value, ...
	  // On stack, after: ...
	  //
	  // Coerces `value` to a String and appends it to the current buffer.
	  //
	  // If `value` is truthy, or 0, it is coerced into a string and appended
	  // Otherwise, the empty string is appended
	  append: function append() {
	    if (this.isInline()) {
	      this.replaceStack(function (current) {
	        return [' != null ? ', current, ' : ""'];
	      });

	      this.pushSource(this.appendToBuffer(this.popStack()));
	    } else {
	      var local = this.popStack();
	      this.pushSource(['if (', local, ' != null) { ', this.appendToBuffer(local, undefined, true), ' }']);
	      if (this.environment.isSimple) {
	        this.pushSource(['else { ', this.appendToBuffer("''", undefined, true), ' }']);
	      }
	    }
	  },

	  // [appendEscaped]
	  //
	  // On stack, before: value, ...
	  // On stack, after: ...
	  //
	  // Escape `value` and append it to the buffer
	  appendEscaped: function appendEscaped() {
	    this.pushSource(this.appendToBuffer([this.aliasable('container.escapeExpression'), '(', this.popStack(), ')']));
	  },

	  // [getContext]
	  //
	  // On stack, before: ...
	  // On stack, after: ...
	  // Compiler value, after: lastContext=depth
	  //
	  // Set the value of the `lastContext` compiler value to the depth
	  getContext: function getContext(depth) {
	    this.lastContext = depth;
	  },

	  // [pushContext]
	  //
	  // On stack, before: ...
	  // On stack, after: currentContext, ...
	  //
	  // Pushes the value of the current context onto the stack.
	  pushContext: function pushContext() {
	    this.pushStackLiteral(this.contextName(this.lastContext));
	  },

	  // [lookupOnContext]
	  //
	  // On stack, before: ...
	  // On stack, after: currentContext[name], ...
	  //
	  // Looks up the value of `name` on the current context and pushes
	  // it onto the stack.
	  lookupOnContext: function lookupOnContext(parts, falsy, strict, scoped) {
	    var i = 0;

	    if (!scoped && this.options.compat && !this.lastContext) {
	      // The depthed query is expected to handle the undefined logic for the root level that
	      // is implemented below, so we evaluate that directly in compat mode
	      this.push(this.depthedLookup(parts[i++]));
	    } else {
	      this.pushContext();
	    }

	    this.resolvePath('context', parts, i, falsy, strict);
	  },

	  // [lookupBlockParam]
	  //
	  // On stack, before: ...
	  // On stack, after: blockParam[name], ...
	  //
	  // Looks up the value of `parts` on the given block param and pushes
	  // it onto the stack.
	  lookupBlockParam: function lookupBlockParam(blockParamId, parts) {
	    this.useBlockParams = true;

	    this.push(['blockParams[', blockParamId[0], '][', blockParamId[1], ']']);
	    this.resolvePath('context', parts, 1);
	  },

	  // [lookupData]
	  //
	  // On stack, before: ...
	  // On stack, after: data, ...
	  //
	  // Push the data lookup operator
	  lookupData: function lookupData(depth, parts, strict) {
	    if (!depth) {
	      this.pushStackLiteral('data');
	    } else {
	      this.pushStackLiteral('container.data(data, ' + depth + ')');
	    }

	    this.resolvePath('data', parts, 0, true, strict);
	  },

	  resolvePath: function resolvePath(type, parts, i, falsy, strict) {
	    // istanbul ignore next

	    var _this = this;

	    if (this.options.strict || this.options.assumeObjects) {
	      this.push(strictLookup(this.options.strict && strict, this, parts, type));
	      return;
	    }

	    var len = parts.length;
	    for (; i < len; i++) {
	      /* eslint-disable no-loop-func */
	      this.replaceStack(function (current) {
	        var lookup = _this.nameLookup(current, parts[i], type);
	        // We want to ensure that zero and false are handled properly if the context (falsy flag)
	        // needs to have the special handling for these values.
	        if (!falsy) {
	          return [' != null ? ', lookup, ' : ', current];
	        } else {
	          // Otherwise we can use generic falsy handling
	          return [' && ', lookup];
	        }
	      });
	      /* eslint-enable no-loop-func */
	    }
	  },

	  // [resolvePossibleLambda]
	  //
	  // On stack, before: value, ...
	  // On stack, after: resolved value, ...
	  //
	  // If the `value` is a lambda, replace it on the stack by
	  // the return value of the lambda
	  resolvePossibleLambda: function resolvePossibleLambda() {
	    this.push([this.aliasable('container.lambda'), '(', this.popStack(), ', ', this.contextName(0), ')']);
	  },

	  // [pushStringParam]
	  //
	  // On stack, before: ...
	  // On stack, after: string, currentContext, ...
	  //
	  // This opcode is designed for use in string mode, which
	  // provides the string value of a parameter along with its
	  // depth rather than resolving it immediately.
	  pushStringParam: function pushStringParam(string, type) {
	    this.pushContext();
	    this.pushString(type);

	    // If it's a subexpression, the string result
	    // will be pushed after this opcode.
	    if (type !== 'SubExpression') {
	      if (typeof string === 'string') {
	        this.pushString(string);
	      } else {
	        this.pushStackLiteral(string);
	      }
	    }
	  },

	  emptyHash: function emptyHash(omitEmpty) {
	    if (this.trackIds) {
	      this.push('{}'); // hashIds
	    }
	    if (this.stringParams) {
	      this.push('{}'); // hashContexts
	      this.push('{}'); // hashTypes
	    }
	    this.pushStackLiteral(omitEmpty ? 'undefined' : '{}');
	  },
	  pushHash: function pushHash() {
	    if (this.hash) {
	      this.hashes.push(this.hash);
	    }
	    this.hash = { values: [], types: [], contexts: [], ids: [] };
	  },
	  popHash: function popHash() {
	    var hash = this.hash;
	    this.hash = this.hashes.pop();

	    if (this.trackIds) {
	      this.push(this.objectLiteral(hash.ids));
	    }
	    if (this.stringParams) {
	      this.push(this.objectLiteral(hash.contexts));
	      this.push(this.objectLiteral(hash.types));
	    }

	    this.push(this.objectLiteral(hash.values));
	  },

	  // [pushString]
	  //
	  // On stack, before: ...
	  // On stack, after: quotedString(string), ...
	  //
	  // Push a quoted version of `string` onto the stack
	  pushString: function pushString(string) {
	    this.pushStackLiteral(this.quotedString(string));
	  },

	  // [pushLiteral]
	  //
	  // On stack, before: ...
	  // On stack, after: value, ...
	  //
	  // Pushes a value onto the stack. This operation prevents
	  // the compiler from creating a temporary variable to hold
	  // it.
	  pushLiteral: function pushLiteral(value) {
	    this.pushStackLiteral(value);
	  },

	  // [pushProgram]
	  //
	  // On stack, before: ...
	  // On stack, after: program(guid), ...
	  //
	  // Push a program expression onto the stack. This takes
	  // a compile-time guid and converts it into a runtime-accessible
	  // expression.
	  pushProgram: function pushProgram(guid) {
	    if (guid != null) {
	      this.pushStackLiteral(this.programExpression(guid));
	    } else {
	      this.pushStackLiteral(null);
	    }
	  },

	  // [registerDecorator]
	  //
	  // On stack, before: hash, program, params..., ...
	  // On stack, after: ...
	  //
	  // Pops off the decorator's parameters, invokes the decorator,
	  // and inserts the decorator into the decorators list.
	  registerDecorator: function registerDecorator(paramSize, name) {
	    var foundDecorator = this.nameLookup('decorators', name, 'decorator'),
	        options = this.setupHelperArgs(name, paramSize);

	    this.decorators.push(['fn = ', this.decorators.functionCall(foundDecorator, '', ['fn', 'props', 'container', options]), ' || fn;']);
	  },

	  // [invokeHelper]
	  //
	  // On stack, before: hash, inverse, program, params..., ...
	  // On stack, after: result of helper invocation
	  //
	  // Pops off the helper's parameters, invokes the helper,
	  // and pushes the helper's return value onto the stack.
	  //
	  // If the helper is not found, `helperMissing` is called.
	  invokeHelper: function invokeHelper(paramSize, name, isSimple) {
	    var nonHelper = this.popStack(),
	        helper = this.setupHelper(paramSize, name),
	        simple = isSimple ? [helper.name, ' || '] : '';

	    var lookup = ['('].concat(simple, nonHelper);
	    if (!this.options.strict) {
	      lookup.push(' || ', this.aliasable('helpers.helperMissing'));
	    }
	    lookup.push(')');

	    this.push(this.source.functionCall(lookup, 'call', helper.callParams));
	  },

	  // [invokeKnownHelper]
	  //
	  // On stack, before: hash, inverse, program, params..., ...
	  // On stack, after: result of helper invocation
	  //
	  // This operation is used when the helper is known to exist,
	  // so a `helperMissing` fallback is not required.
	  invokeKnownHelper: function invokeKnownHelper(paramSize, name) {
	    var helper = this.setupHelper(paramSize, name);
	    this.push(this.source.functionCall(helper.name, 'call', helper.callParams));
	  },

	  // [invokeAmbiguous]
	  //
	  // On stack, before: hash, inverse, program, params..., ...
	  // On stack, after: result of disambiguation
	  //
	  // This operation is used when an expression like `{{foo}}`
	  // is provided, but we don't know at compile-time whether it
	  // is a helper or a path.
	  //
	  // This operation emits more code than the other options,
	  // and can be avoided by passing the `knownHelpers` and
	  // `knownHelpersOnly` flags at compile-time.
	  invokeAmbiguous: function invokeAmbiguous(name, helperCall) {
	    this.useRegister('helper');

	    var nonHelper = this.popStack();

	    this.emptyHash();
	    var helper = this.setupHelper(0, name, helperCall);

	    var helperName = this.lastHelper = this.nameLookup('helpers', name, 'helper');

	    var lookup = ['(', '(helper = ', helperName, ' || ', nonHelper, ')'];
	    if (!this.options.strict) {
	      lookup[0] = '(helper = ';
	      lookup.push(' != null ? helper : ', this.aliasable('helpers.helperMissing'));
	    }

	    this.push(['(', lookup, helper.paramsInit ? ['),(', helper.paramsInit] : [], '),', '(typeof helper === ', this.aliasable('"function"'), ' ? ', this.source.functionCall('helper', 'call', helper.callParams), ' : helper))']);
	  },

	  // [invokePartial]
	  //
	  // On stack, before: context, ...
	  // On stack after: result of partial invocation
	  //
	  // This operation pops off a context, invokes a partial with that context,
	  // and pushes the result of the invocation back.
	  invokePartial: function invokePartial(isDynamic, name, indent) {
	    var params = [],
	        options = this.setupParams(name, 1, params);

	    if (isDynamic) {
	      name = this.popStack();
	      delete options.name;
	    }

	    if (indent) {
	      options.indent = JSON.stringify(indent);
	    }
	    options.helpers = 'helpers';
	    options.partials = 'partials';
	    options.decorators = 'container.decorators';

	    if (!isDynamic) {
	      params.unshift(this.nameLookup('partials', name, 'partial'));
	    } else {
	      params.unshift(name);
	    }

	    if (this.options.compat) {
	      options.depths = 'depths';
	    }
	    options = this.objectLiteral(options);
	    params.push(options);

	    this.push(this.source.functionCall('container.invokePartial', '', params));
	  },

	  // [assignToHash]
	  //
	  // On stack, before: value, ..., hash, ...
	  // On stack, after: ..., hash, ...
	  //
	  // Pops a value off the stack and assigns it to the current hash
	  assignToHash: function assignToHash(key) {
	    var value = this.popStack(),
	        context = undefined,
	        type = undefined,
	        id = undefined;

	    if (this.trackIds) {
	      id = this.popStack();
	    }
	    if (this.stringParams) {
	      type = this.popStack();
	      context = this.popStack();
	    }

	    var hash = this.hash;
	    if (context) {
	      hash.contexts[key] = context;
	    }
	    if (type) {
	      hash.types[key] = type;
	    }
	    if (id) {
	      hash.ids[key] = id;
	    }
	    hash.values[key] = value;
	  },

	  pushId: function pushId(type, name, child) {
	    if (type === 'BlockParam') {
	      this.pushStackLiteral('blockParams[' + name[0] + '].path[' + name[1] + ']' + (child ? ' + ' + JSON.stringify('.' + child) : ''));
	    } else if (type === 'PathExpression') {
	      this.pushString(name);
	    } else if (type === 'SubExpression') {
	      this.pushStackLiteral('true');
	    } else {
	      this.pushStackLiteral('null');
	    }
	  },

	  // HELPERS

	  compiler: JavaScriptCompiler,

	  compileChildren: function compileChildren(environment, options) {
	    var children = environment.children,
	        child = undefined,
	        compiler = undefined;

	    for (var i = 0, l = children.length; i < l; i++) {
	      child = children[i];
	      compiler = new this.compiler(); // eslint-disable-line new-cap

	      var existing = this.matchExistingProgram(child);

	      if (existing == null) {
	        this.context.programs.push(''); // Placeholder to prevent name conflicts for nested children
	        var index = this.context.programs.length;
	        child.index = index;
	        child.name = 'program' + index;
	        this.context.programs[index] = compiler.compile(child, options, this.context, !this.precompile);
	        this.context.decorators[index] = compiler.decorators;
	        this.context.environments[index] = child;

	        this.useDepths = this.useDepths || compiler.useDepths;
	        this.useBlockParams = this.useBlockParams || compiler.useBlockParams;
	        child.useDepths = this.useDepths;
	        child.useBlockParams = this.useBlockParams;
	      } else {
	        child.index = existing.index;
	        child.name = 'program' + existing.index;

	        this.useDepths = this.useDepths || existing.useDepths;
	        this.useBlockParams = this.useBlockParams || existing.useBlockParams;
	      }
	    }
	  },
	  matchExistingProgram: function matchExistingProgram(child) {
	    for (var i = 0, len = this.context.environments.length; i < len; i++) {
	      var environment = this.context.environments[i];
	      if (environment && environment.equals(child)) {
	        return environment;
	      }
	    }
	  },

	  programExpression: function programExpression(guid) {
	    var child = this.environment.children[guid],
	        programParams = [child.index, 'data', child.blockParams];

	    if (this.useBlockParams || this.useDepths) {
	      programParams.push('blockParams');
	    }
	    if (this.useDepths) {
	      programParams.push('depths');
	    }

	    return 'container.program(' + programParams.join(', ') + ')';
	  },

	  useRegister: function useRegister(name) {
	    if (!this.registers[name]) {
	      this.registers[name] = true;
	      this.registers.list.push(name);
	    }
	  },

	  push: function push(expr) {
	    if (!(expr instanceof Literal)) {
	      expr = this.source.wrap(expr);
	    }

	    this.inlineStack.push(expr);
	    return expr;
	  },

	  pushStackLiteral: function pushStackLiteral(item) {
	    this.push(new Literal(item));
	  },

	  pushSource: function pushSource(source) {
	    if (this.pendingContent) {
	      this.source.push(this.appendToBuffer(this.source.quotedString(this.pendingContent), this.pendingLocation));
	      this.pendingContent = undefined;
	    }

	    if (source) {
	      this.source.push(source);
	    }
	  },

	  replaceStack: function replaceStack(callback) {
	    var prefix = ['('],
	        stack = undefined,
	        createdStack = undefined,
	        usedLiteral = undefined;

	    /* istanbul ignore next */
	    if (!this.isInline()) {
	      throw new _exception2['default']('replaceStack on non-inline');
	    }

	    // We want to merge the inline statement into the replacement statement via ','
	    var top = this.popStack(true);

	    if (top instanceof Literal) {
	      // Literals do not need to be inlined
	      stack = [top.value];
	      prefix = ['(', stack];
	      usedLiteral = true;
	    } else {
	      // Get or create the current stack name for use by the inline
	      createdStack = true;
	      var _name = this.incrStack();

	      prefix = ['((', this.push(_name), ' = ', top, ')'];
	      stack = this.topStack();
	    }

	    var item = callback.call(this, stack);

	    if (!usedLiteral) {
	      this.popStack();
	    }
	    if (createdStack) {
	      this.stackSlot--;
	    }
	    this.push(prefix.concat(item, ')'));
	  },

	  incrStack: function incrStack() {
	    this.stackSlot++;
	    if (this.stackSlot > this.stackVars.length) {
	      this.stackVars.push('stack' + this.stackSlot);
	    }
	    return this.topStackName();
	  },
	  topStackName: function topStackName() {
	    return 'stack' + this.stackSlot;
	  },
	  flushInline: function flushInline() {
	    var inlineStack = this.inlineStack;
	    this.inlineStack = [];
	    for (var i = 0, len = inlineStack.length; i < len; i++) {
	      var entry = inlineStack[i];
	      /* istanbul ignore if */
	      if (entry instanceof Literal) {
	        this.compileStack.push(entry);
	      } else {
	        var stack = this.incrStack();
	        this.pushSource([stack, ' = ', entry, ';']);
	        this.compileStack.push(stack);
	      }
	    }
	  },
	  isInline: function isInline() {
	    return this.inlineStack.length;
	  },

	  popStack: function popStack(wrapped) {
	    var inline = this.isInline(),
	        item = (inline ? this.inlineStack : this.compileStack).pop();

	    if (!wrapped && item instanceof Literal) {
	      return item.value;
	    } else {
	      if (!inline) {
	        /* istanbul ignore next */
	        if (!this.stackSlot) {
	          throw new _exception2['default']('Invalid stack pop');
	        }
	        this.stackSlot--;
	      }
	      return item;
	    }
	  },

	  topStack: function topStack() {
	    var stack = this.isInline() ? this.inlineStack : this.compileStack,
	        item = stack[stack.length - 1];

	    /* istanbul ignore if */
	    if (item instanceof Literal) {
	      return item.value;
	    } else {
	      return item;
	    }
	  },

	  contextName: function contextName(context) {
	    if (this.useDepths && context) {
	      return 'depths[' + context + ']';
	    } else {
	      return 'depth' + context;
	    }
	  },

	  quotedString: function quotedString(str) {
	    return this.source.quotedString(str);
	  },

	  objectLiteral: function objectLiteral(obj) {
	    return this.source.objectLiteral(obj);
	  },

	  aliasable: function aliasable(name) {
	    var ret = this.aliases[name];
	    if (ret) {
	      ret.referenceCount++;
	      return ret;
	    }

	    ret = this.aliases[name] = this.source.wrap(name);
	    ret.aliasable = true;
	    ret.referenceCount = 1;

	    return ret;
	  },

	  setupHelper: function setupHelper(paramSize, name, blockHelper) {
	    var params = [],
	        paramsInit = this.setupHelperArgs(name, paramSize, params, blockHelper);
	    var foundHelper = this.nameLookup('helpers', name, 'helper'),
	        callContext = this.aliasable(this.contextName(0) + ' != null ? ' + this.contextName(0) + ' : (container.nullContext || {})');

	    return {
	      params: params,
	      paramsInit: paramsInit,
	      name: foundHelper,
	      callParams: [callContext].concat(params)
	    };
	  },

	  setupParams: function setupParams(helper, paramSize, params) {
	    var options = {},
	        contexts = [],
	        types = [],
	        ids = [],
	        objectArgs = !params,
	        param = undefined;

	    if (objectArgs) {
	      params = [];
	    }

	    options.name = this.quotedString(helper);
	    options.hash = this.popStack();

	    if (this.trackIds) {
	      options.hashIds = this.popStack();
	    }
	    if (this.stringParams) {
	      options.hashTypes = this.popStack();
	      options.hashContexts = this.popStack();
	    }

	    var inverse = this.popStack(),
	        program = this.popStack();

	    // Avoid setting fn and inverse if neither are set. This allows
	    // helpers to do a check for `if (options.fn)`
	    if (program || inverse) {
	      options.fn = program || 'container.noop';
	      options.inverse = inverse || 'container.noop';
	    }

	    // The parameters go on to the stack in order (making sure that they are evaluated in order)
	    // so we need to pop them off the stack in reverse order
	    var i = paramSize;
	    while (i--) {
	      param = this.popStack();
	      params[i] = param;

	      if (this.trackIds) {
	        ids[i] = this.popStack();
	      }
	      if (this.stringParams) {
	        types[i] = this.popStack();
	        contexts[i] = this.popStack();
	      }
	    }

	    if (objectArgs) {
	      options.args = this.source.generateArray(params);
	    }

	    if (this.trackIds) {
	      options.ids = this.source.generateArray(ids);
	    }
	    if (this.stringParams) {
	      options.types = this.source.generateArray(types);
	      options.contexts = this.source.generateArray(contexts);
	    }

	    if (this.options.data) {
	      options.data = 'data';
	    }
	    if (this.useBlockParams) {
	      options.blockParams = 'blockParams';
	    }
	    return options;
	  },

	  setupHelperArgs: function setupHelperArgs(helper, paramSize, params, useRegister) {
	    var options = this.setupParams(helper, paramSize, params);
	    options = this.objectLiteral(options);
	    if (useRegister) {
	      this.useRegister('options');
	      params.push('options');
	      return ['options=', options];
	    } else if (params) {
	      params.push(options);
	      return '';
	    } else {
	      return options;
	    }
	  }
	};

	(function () {
	  var reservedWords = ('break else new var' + ' case finally return void' + ' catch for switch while' + ' continue function this with' + ' default if throw' + ' delete in try' + ' do instanceof typeof' + ' abstract enum int short' + ' boolean export interface static' + ' byte extends long super' + ' char final native synchronized' + ' class float package throws' + ' const goto private transient' + ' debugger implements protected volatile' + ' double import public let yield await' + ' null true false').split(' ');

	  var compilerWords = JavaScriptCompiler.RESERVED_WORDS = {};

	  for (var i = 0, l = reservedWords.length; i < l; i++) {
	    compilerWords[reservedWords[i]] = true;
	  }
	})();

	JavaScriptCompiler.isValidJavaScriptVariableName = function (name) {
	  return !JavaScriptCompiler.RESERVED_WORDS[name] && /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
	};

	function strictLookup(requireTerminal, compiler, parts, type) {
	  var stack = compiler.popStack(),
	      i = 0,
	      len = parts.length;
	  if (requireTerminal) {
	    len--;
	  }

	  for (; i < len; i++) {
	    stack = compiler.nameLookup(stack, parts[i], type);
	  }

	  if (requireTerminal) {
	    return [compiler.aliasable('container.strict'), '(', stack, ', ', compiler.quotedString(parts[i]), ')'];
	  } else {
	    return stack;
	  }
	}

	exports['default'] = JavaScriptCompiler;
	module.exports = exports['default'];

/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	/* global define */
	'use strict';

	exports.__esModule = true;

	var _utils = __webpack_require__(5);

	var SourceNode = undefined;

	try {
	  /* istanbul ignore next */
	  if (false) {
	    // We don't support this in AMD environments. For these environments, we asusme that
	    // they are running on the browser and thus have no need for the source-map library.
	    var SourceMap = require('source-map');
	    SourceNode = SourceMap.SourceNode;
	  }
	} catch (err) {}
	/* NOP */

	/* istanbul ignore if: tested but not covered in istanbul due to dist build  */
	if (!SourceNode) {
	  SourceNode = function (line, column, srcFile, chunks) {
	    this.src = '';
	    if (chunks) {
	      this.add(chunks);
	    }
	  };
	  /* istanbul ignore next */
	  SourceNode.prototype = {
	    add: function add(chunks) {
	      if (_utils.isArray(chunks)) {
	        chunks = chunks.join('');
	      }
	      this.src += chunks;
	    },
	    prepend: function prepend(chunks) {
	      if (_utils.isArray(chunks)) {
	        chunks = chunks.join('');
	      }
	      this.src = chunks + this.src;
	    },
	    toStringWithSourceMap: function toStringWithSourceMap() {
	      return { code: this.toString() };
	    },
	    toString: function toString() {
	      return this.src;
	    }
	  };
	}

	function castChunk(chunk, codeGen, loc) {
	  if (_utils.isArray(chunk)) {
	    var ret = [];

	    for (var i = 0, len = chunk.length; i < len; i++) {
	      ret.push(codeGen.wrap(chunk[i], loc));
	    }
	    return ret;
	  } else if (typeof chunk === 'boolean' || typeof chunk === 'number') {
	    // Handle primitives that the SourceNode will throw up on
	    return chunk + '';
	  }
	  return chunk;
	}

	function CodeGen(srcFile) {
	  this.srcFile = srcFile;
	  this.source = [];
	}

	CodeGen.prototype = {
	  isEmpty: function isEmpty() {
	    return !this.source.length;
	  },
	  prepend: function prepend(source, loc) {
	    this.source.unshift(this.wrap(source, loc));
	  },
	  push: function push(source, loc) {
	    this.source.push(this.wrap(source, loc));
	  },

	  merge: function merge() {
	    var source = this.empty();
	    this.each(function (line) {
	      source.add(['  ', line, '\n']);
	    });
	    return source;
	  },

	  each: function each(iter) {
	    for (var i = 0, len = this.source.length; i < len; i++) {
	      iter(this.source[i]);
	    }
	  },

	  empty: function empty() {
	    var loc = this.currentLocation || { start: {} };
	    return new SourceNode(loc.start.line, loc.start.column, this.srcFile);
	  },
	  wrap: function wrap(chunk) {
	    var loc = arguments.length <= 1 || arguments[1] === undefined ? this.currentLocation || { start: {} } : arguments[1];

	    if (chunk instanceof SourceNode) {
	      return chunk;
	    }

	    chunk = castChunk(chunk, this, loc);

	    return new SourceNode(loc.start.line, loc.start.column, this.srcFile, chunk);
	  },

	  functionCall: function functionCall(fn, type, params) {
	    params = this.generateList(params);
	    return this.wrap([fn, type ? '.' + type + '(' : '(', params, ')']);
	  },

	  quotedString: function quotedString(str) {
	    return '"' + (str + '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028') // Per Ecma-262 7.3 + 7.8.4
	    .replace(/\u2029/g, '\\u2029') + '"';
	  },

	  objectLiteral: function objectLiteral(obj) {
	    var pairs = [];

	    for (var key in obj) {
	      if (obj.hasOwnProperty(key)) {
	        var value = castChunk(obj[key], this);
	        if (value !== 'undefined') {
	          pairs.push([this.quotedString(key), ':', value]);
	        }
	      }
	    }

	    var ret = this.generateList(pairs);
	    ret.prepend('{');
	    ret.add('}');
	    return ret;
	  },

	  generateList: function generateList(entries) {
	    var ret = this.empty();

	    for (var i = 0, len = entries.length; i < len; i++) {
	      if (i) {
	        ret.add(',');
	      }

	      ret.add(castChunk(entries[i], this));
	    }

	    return ret;
	  },

	  generateArray: function generateArray(entries) {
	    var ret = this.generateList(entries);
	    ret.prepend('[');
	    ret.add(']');

	    return ret;
	  }
	};

	exports['default'] = CodeGen;
	module.exports = exports['default'];

/***/ })
/******/ ])
});
;
/*! jQuery v3.3.1 | (c) JS Foundation and other contributors | jquery.org/license */
!function(e,t){"use strict";"object"==typeof module&&"object"==typeof module.exports?module.exports=e.document?t(e,!0):function(e){if(!e.document)throw new Error("jQuery requires a window with a document");return t(e)}:t(e)}("undefined"!=typeof window?window:this,function(e,t){"use strict";var n=[],r=e.document,i=Object.getPrototypeOf,o=n.slice,a=n.concat,s=n.push,u=n.indexOf,l={},c=l.toString,f=l.hasOwnProperty,p=f.toString,d=p.call(Object),h={},g=function e(t){return"function"==typeof t&&"number"!=typeof t.nodeType},y=function e(t){return null!=t&&t===t.window},v={type:!0,src:!0,noModule:!0};function m(e,t,n){var i,o=(t=t||r).createElement("script");if(o.text=e,n)for(i in v)n[i]&&(o[i]=n[i]);t.head.appendChild(o).parentNode.removeChild(o)}function x(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?l[c.call(e)]||"object":typeof e}var b="3.3.1",w=function(e,t){return new w.fn.init(e,t)},T=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g;w.fn=w.prototype={jquery:"3.3.1",constructor:w,length:0,toArray:function(){return o.call(this)},get:function(e){return null==e?o.call(this):e<0?this[e+this.length]:this[e]},pushStack:function(e){var t=w.merge(this.constructor(),e);return t.prevObject=this,t},each:function(e){return w.each(this,e)},map:function(e){return this.pushStack(w.map(this,function(t,n){return e.call(t,n,t)}))},slice:function(){return this.pushStack(o.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(e<0?t:0);return this.pushStack(n>=0&&n<t?[this[n]]:[])},end:function(){return this.prevObject||this.constructor()},push:s,sort:n.sort,splice:n.splice},w.extend=w.fn.extend=function(){var e,t,n,r,i,o,a=arguments[0]||{},s=1,u=arguments.length,l=!1;for("boolean"==typeof a&&(l=a,a=arguments[s]||{},s++),"object"==typeof a||g(a)||(a={}),s===u&&(a=this,s--);s<u;s++)if(null!=(e=arguments[s]))for(t in e)n=a[t],a!==(r=e[t])&&(l&&r&&(w.isPlainObject(r)||(i=Array.isArray(r)))?(i?(i=!1,o=n&&Array.isArray(n)?n:[]):o=n&&w.isPlainObject(n)?n:{},a[t]=w.extend(l,o,r)):void 0!==r&&(a[t]=r));return a},w.extend({expando:"jQuery"+("3.3.1"+Math.random()).replace(/\D/g,""),isReady:!0,error:function(e){throw new Error(e)},noop:function(){},isPlainObject:function(e){var t,n;return!(!e||"[object Object]"!==c.call(e))&&(!(t=i(e))||"function"==typeof(n=f.call(t,"constructor")&&t.constructor)&&p.call(n)===d)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},globalEval:function(e){m(e)},each:function(e,t){var n,r=0;if(C(e)){for(n=e.length;r<n;r++)if(!1===t.call(e[r],r,e[r]))break}else for(r in e)if(!1===t.call(e[r],r,e[r]))break;return e},trim:function(e){return null==e?"":(e+"").replace(T,"")},makeArray:function(e,t){var n=t||[];return null!=e&&(C(Object(e))?w.merge(n,"string"==typeof e?[e]:e):s.call(n,e)),n},inArray:function(e,t,n){return null==t?-1:u.call(t,e,n)},merge:function(e,t){for(var n=+t.length,r=0,i=e.length;r<n;r++)e[i++]=t[r];return e.length=i,e},grep:function(e,t,n){for(var r,i=[],o=0,a=e.length,s=!n;o<a;o++)(r=!t(e[o],o))!==s&&i.push(e[o]);return i},map:function(e,t,n){var r,i,o=0,s=[];if(C(e))for(r=e.length;o<r;o++)null!=(i=t(e[o],o,n))&&s.push(i);else for(o in e)null!=(i=t(e[o],o,n))&&s.push(i);return a.apply([],s)},guid:1,support:h}),"function"==typeof Symbol&&(w.fn[Symbol.iterator]=n[Symbol.iterator]),w.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),function(e,t){l["[object "+t+"]"]=t.toLowerCase()});function C(e){var t=!!e&&"length"in e&&e.length,n=x(e);return!g(e)&&!y(e)&&("array"===n||0===t||"number"==typeof t&&t>0&&t-1 in e)}var E=function(e){var t,n,r,i,o,a,s,u,l,c,f,p,d,h,g,y,v,m,x,b="sizzle"+1*new Date,w=e.document,T=0,C=0,E=ae(),k=ae(),S=ae(),D=function(e,t){return e===t&&(f=!0),0},N={}.hasOwnProperty,A=[],j=A.pop,q=A.push,L=A.push,H=A.slice,O=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},P="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",M="[\\x20\\t\\r\\n\\f]",R="(?:\\\\.|[\\w-]|[^\0-\\xa0])+",I="\\["+M+"*("+R+")(?:"+M+"*([*^$|!~]?=)"+M+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+R+"))|)"+M+"*\\]",W=":("+R+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+I+")*)|.*)\\)|)",$=new RegExp(M+"+","g"),B=new RegExp("^"+M+"+|((?:^|[^\\\\])(?:\\\\.)*)"+M+"+$","g"),F=new RegExp("^"+M+"*,"+M+"*"),_=new RegExp("^"+M+"*([>+~]|"+M+")"+M+"*"),z=new RegExp("="+M+"*([^\\]'\"]*?)"+M+"*\\]","g"),X=new RegExp(W),U=new RegExp("^"+R+"$"),V={ID:new RegExp("^#("+R+")"),CLASS:new RegExp("^\\.("+R+")"),TAG:new RegExp("^("+R+"|[*])"),ATTR:new RegExp("^"+I),PSEUDO:new RegExp("^"+W),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+M+"*(even|odd|(([+-]|)(\\d*)n|)"+M+"*(?:([+-]|)"+M+"*(\\d+)|))"+M+"*\\)|)","i"),bool:new RegExp("^(?:"+P+")$","i"),needsContext:new RegExp("^"+M+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+M+"*((?:-\\d)?\\d*)"+M+"*\\)|)(?=[^-]|$)","i")},G=/^(?:input|select|textarea|button)$/i,Y=/^h\d$/i,Q=/^[^{]+\{\s*\[native \w/,J=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,K=/[+~]/,Z=new RegExp("\\\\([\\da-f]{1,6}"+M+"?|("+M+")|.)","ig"),ee=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:r<0?String.fromCharCode(r+65536):String.fromCharCode(r>>10|55296,1023&r|56320)},te=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,ne=function(e,t){return t?"\0"===e?"\ufffd":e.slice(0,-1)+"\\"+e.charCodeAt(e.length-1).toString(16)+" ":"\\"+e},re=function(){p()},ie=me(function(e){return!0===e.disabled&&("form"in e||"label"in e)},{dir:"parentNode",next:"legend"});try{L.apply(A=H.call(w.childNodes),w.childNodes),A[w.childNodes.length].nodeType}catch(e){L={apply:A.length?function(e,t){q.apply(e,H.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function oe(e,t,r,i){var o,s,l,c,f,h,v,m=t&&t.ownerDocument,T=t?t.nodeType:9;if(r=r||[],"string"!=typeof e||!e||1!==T&&9!==T&&11!==T)return r;if(!i&&((t?t.ownerDocument||t:w)!==d&&p(t),t=t||d,g)){if(11!==T&&(f=J.exec(e)))if(o=f[1]){if(9===T){if(!(l=t.getElementById(o)))return r;if(l.id===o)return r.push(l),r}else if(m&&(l=m.getElementById(o))&&x(t,l)&&l.id===o)return r.push(l),r}else{if(f[2])return L.apply(r,t.getElementsByTagName(e)),r;if((o=f[3])&&n.getElementsByClassName&&t.getElementsByClassName)return L.apply(r,t.getElementsByClassName(o)),r}if(n.qsa&&!S[e+" "]&&(!y||!y.test(e))){if(1!==T)m=t,v=e;else if("object"!==t.nodeName.toLowerCase()){(c=t.getAttribute("id"))?c=c.replace(te,ne):t.setAttribute("id",c=b),s=(h=a(e)).length;while(s--)h[s]="#"+c+" "+ve(h[s]);v=h.join(","),m=K.test(e)&&ge(t.parentNode)||t}if(v)try{return L.apply(r,m.querySelectorAll(v)),r}catch(e){}finally{c===b&&t.removeAttribute("id")}}}return u(e.replace(B,"$1"),t,r,i)}function ae(){var e=[];function t(n,i){return e.push(n+" ")>r.cacheLength&&delete t[e.shift()],t[n+" "]=i}return t}function se(e){return e[b]=!0,e}function ue(e){var t=d.createElement("fieldset");try{return!!e(t)}catch(e){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function le(e,t){var n=e.split("|"),i=n.length;while(i--)r.attrHandle[n[i]]=t}function ce(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&e.sourceIndex-t.sourceIndex;if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function fe(e){return function(t){return"input"===t.nodeName.toLowerCase()&&t.type===e}}function pe(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function de(e){return function(t){return"form"in t?t.parentNode&&!1===t.disabled?"label"in t?"label"in t.parentNode?t.parentNode.disabled===e:t.disabled===e:t.isDisabled===e||t.isDisabled!==!e&&ie(t)===e:t.disabled===e:"label"in t&&t.disabled===e}}function he(e){return se(function(t){return t=+t,se(function(n,r){var i,o=e([],n.length,t),a=o.length;while(a--)n[i=o[a]]&&(n[i]=!(r[i]=n[i]))})})}function ge(e){return e&&"undefined"!=typeof e.getElementsByTagName&&e}n=oe.support={},o=oe.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return!!t&&"HTML"!==t.nodeName},p=oe.setDocument=function(e){var t,i,a=e?e.ownerDocument||e:w;return a!==d&&9===a.nodeType&&a.documentElement?(d=a,h=d.documentElement,g=!o(d),w!==d&&(i=d.defaultView)&&i.top!==i&&(i.addEventListener?i.addEventListener("unload",re,!1):i.attachEvent&&i.attachEvent("onunload",re)),n.attributes=ue(function(e){return e.className="i",!e.getAttribute("className")}),n.getElementsByTagName=ue(function(e){return e.appendChild(d.createComment("")),!e.getElementsByTagName("*").length}),n.getElementsByClassName=Q.test(d.getElementsByClassName),n.getById=ue(function(e){return h.appendChild(e).id=b,!d.getElementsByName||!d.getElementsByName(b).length}),n.getById?(r.filter.ID=function(e){var t=e.replace(Z,ee);return function(e){return e.getAttribute("id")===t}},r.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&g){var n=t.getElementById(e);return n?[n]:[]}}):(r.filter.ID=function(e){var t=e.replace(Z,ee);return function(e){var n="undefined"!=typeof e.getAttributeNode&&e.getAttributeNode("id");return n&&n.value===t}},r.find.ID=function(e,t){if("undefined"!=typeof t.getElementById&&g){var n,r,i,o=t.getElementById(e);if(o){if((n=o.getAttributeNode("id"))&&n.value===e)return[o];i=t.getElementsByName(e),r=0;while(o=i[r++])if((n=o.getAttributeNode("id"))&&n.value===e)return[o]}return[]}}),r.find.TAG=n.getElementsByTagName?function(e,t){return"undefined"!=typeof t.getElementsByTagName?t.getElementsByTagName(e):n.qsa?t.querySelectorAll(e):void 0}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},r.find.CLASS=n.getElementsByClassName&&function(e,t){if("undefined"!=typeof t.getElementsByClassName&&g)return t.getElementsByClassName(e)},v=[],y=[],(n.qsa=Q.test(d.querySelectorAll))&&(ue(function(e){h.appendChild(e).innerHTML="<a id='"+b+"'></a><select id='"+b+"-\r\\' msallowcapture=''><option selected=''></option></select>",e.querySelectorAll("[msallowcapture^='']").length&&y.push("[*^$]="+M+"*(?:''|\"\")"),e.querySelectorAll("[selected]").length||y.push("\\["+M+"*(?:value|"+P+")"),e.querySelectorAll("[id~="+b+"-]").length||y.push("~="),e.querySelectorAll(":checked").length||y.push(":checked"),e.querySelectorAll("a#"+b+"+*").length||y.push(".#.+[+~]")}),ue(function(e){e.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var t=d.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("name","D"),e.querySelectorAll("[name=d]").length&&y.push("name"+M+"*[*^$|!~]?="),2!==e.querySelectorAll(":enabled").length&&y.push(":enabled",":disabled"),h.appendChild(e).disabled=!0,2!==e.querySelectorAll(":disabled").length&&y.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),y.push(",.*:")})),(n.matchesSelector=Q.test(m=h.matches||h.webkitMatchesSelector||h.mozMatchesSelector||h.oMatchesSelector||h.msMatchesSelector))&&ue(function(e){n.disconnectedMatch=m.call(e,"*"),m.call(e,"[s!='']:x"),v.push("!=",W)}),y=y.length&&new RegExp(y.join("|")),v=v.length&&new RegExp(v.join("|")),t=Q.test(h.compareDocumentPosition),x=t||Q.test(h.contains)?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},D=t?function(e,t){if(e===t)return f=!0,0;var r=!e.compareDocumentPosition-!t.compareDocumentPosition;return r||(1&(r=(e.ownerDocument||e)===(t.ownerDocument||t)?e.compareDocumentPosition(t):1)||!n.sortDetached&&t.compareDocumentPosition(e)===r?e===d||e.ownerDocument===w&&x(w,e)?-1:t===d||t.ownerDocument===w&&x(w,t)?1:c?O(c,e)-O(c,t):0:4&r?-1:1)}:function(e,t){if(e===t)return f=!0,0;var n,r=0,i=e.parentNode,o=t.parentNode,a=[e],s=[t];if(!i||!o)return e===d?-1:t===d?1:i?-1:o?1:c?O(c,e)-O(c,t):0;if(i===o)return ce(e,t);n=e;while(n=n.parentNode)a.unshift(n);n=t;while(n=n.parentNode)s.unshift(n);while(a[r]===s[r])r++;return r?ce(a[r],s[r]):a[r]===w?-1:s[r]===w?1:0},d):d},oe.matches=function(e,t){return oe(e,null,null,t)},oe.matchesSelector=function(e,t){if((e.ownerDocument||e)!==d&&p(e),t=t.replace(z,"='$1']"),n.matchesSelector&&g&&!S[t+" "]&&(!v||!v.test(t))&&(!y||!y.test(t)))try{var r=m.call(e,t);if(r||n.disconnectedMatch||e.document&&11!==e.document.nodeType)return r}catch(e){}return oe(t,d,null,[e]).length>0},oe.contains=function(e,t){return(e.ownerDocument||e)!==d&&p(e),x(e,t)},oe.attr=function(e,t){(e.ownerDocument||e)!==d&&p(e);var i=r.attrHandle[t.toLowerCase()],o=i&&N.call(r.attrHandle,t.toLowerCase())?i(e,t,!g):void 0;return void 0!==o?o:n.attributes||!g?e.getAttribute(t):(o=e.getAttributeNode(t))&&o.specified?o.value:null},oe.escape=function(e){return(e+"").replace(te,ne)},oe.error=function(e){throw new Error("Syntax error, unrecognized expression: "+e)},oe.uniqueSort=function(e){var t,r=[],i=0,o=0;if(f=!n.detectDuplicates,c=!n.sortStable&&e.slice(0),e.sort(D),f){while(t=e[o++])t===e[o]&&(i=r.push(o));while(i--)e.splice(r[i],1)}return c=null,e},i=oe.getText=function(e){var t,n="",r=0,o=e.nodeType;if(o){if(1===o||9===o||11===o){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=i(e)}else if(3===o||4===o)return e.nodeValue}else while(t=e[r++])n+=i(t);return n},(r=oe.selectors={cacheLength:50,createPseudo:se,match:V,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(Z,ee),e[3]=(e[3]||e[4]||e[5]||"").replace(Z,ee),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||oe.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&oe.error(e[0]),e},PSEUDO:function(e){var t,n=!e[6]&&e[2];return V.CHILD.test(e[0])?null:(e[3]?e[2]=e[4]||e[5]||"":n&&X.test(n)&&(t=a(n,!0))&&(t=n.indexOf(")",n.length-t)-n.length)&&(e[0]=e[0].slice(0,t),e[2]=n.slice(0,t)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(Z,ee).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=E[e+" "];return t||(t=new RegExp("(^|"+M+")"+e+"("+M+"|$)"))&&E(e,function(e){return t.test("string"==typeof e.className&&e.className||"undefined"!=typeof e.getAttribute&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=oe.attr(r,e);return null==i?"!="===t:!t||(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i.replace($," ")+" ").indexOf(n)>-1:"|="===t&&(i===n||i.slice(0,n.length+1)===n+"-"))}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),a="last"!==e.slice(-4),s="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,u){var l,c,f,p,d,h,g=o!==a?"nextSibling":"previousSibling",y=t.parentNode,v=s&&t.nodeName.toLowerCase(),m=!u&&!s,x=!1;if(y){if(o){while(g){p=t;while(p=p[g])if(s?p.nodeName.toLowerCase()===v:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[a?y.firstChild:y.lastChild],a&&m){x=(d=(l=(c=(f=(p=y)[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]||[])[0]===T&&l[1])&&l[2],p=d&&y.childNodes[d];while(p=++d&&p&&p[g]||(x=d=0)||h.pop())if(1===p.nodeType&&++x&&p===t){c[e]=[T,d,x];break}}else if(m&&(x=d=(l=(c=(f=(p=t)[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]||[])[0]===T&&l[1]),!1===x)while(p=++d&&p&&p[g]||(x=d=0)||h.pop())if((s?p.nodeName.toLowerCase()===v:1===p.nodeType)&&++x&&(m&&((c=(f=p[b]||(p[b]={}))[p.uniqueID]||(f[p.uniqueID]={}))[e]=[T,x]),p===t))break;return(x-=i)===r||x%r==0&&x/r>=0}}},PSEUDO:function(e,t){var n,i=r.pseudos[e]||r.setFilters[e.toLowerCase()]||oe.error("unsupported pseudo: "+e);return i[b]?i(t):i.length>1?(n=[e,e,"",t],r.setFilters.hasOwnProperty(e.toLowerCase())?se(function(e,n){var r,o=i(e,t),a=o.length;while(a--)e[r=O(e,o[a])]=!(n[r]=o[a])}):function(e){return i(e,0,n)}):i}},pseudos:{not:se(function(e){var t=[],n=[],r=s(e.replace(B,"$1"));return r[b]?se(function(e,t,n,i){var o,a=r(e,null,i,[]),s=e.length;while(s--)(o=a[s])&&(e[s]=!(t[s]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),t[0]=null,!n.pop()}}),has:se(function(e){return function(t){return oe(e,t).length>0}}),contains:se(function(e){return e=e.replace(Z,ee),function(t){return(t.textContent||t.innerText||i(t)).indexOf(e)>-1}}),lang:se(function(e){return U.test(e||"")||oe.error("unsupported lang: "+e),e=e.replace(Z,ee).toLowerCase(),function(t){var n;do{if(n=g?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return(n=n.toLowerCase())===e||0===n.indexOf(e+"-")}while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===h},focus:function(e){return e===d.activeElement&&(!d.hasFocus||d.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:de(!1),disabled:de(!0),checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,!0===e.selected},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeType<6)return!1;return!0},parent:function(e){return!r.pseudos.empty(e)},header:function(e){return Y.test(e.nodeName)},input:function(e){return G.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||"text"===t.toLowerCase())},first:he(function(){return[0]}),last:he(function(e,t){return[t-1]}),eq:he(function(e,t,n){return[n<0?n+t:n]}),even:he(function(e,t){for(var n=0;n<t;n+=2)e.push(n);return e}),odd:he(function(e,t){for(var n=1;n<t;n+=2)e.push(n);return e}),lt:he(function(e,t,n){for(var r=n<0?n+t:n;--r>=0;)e.push(r);return e}),gt:he(function(e,t,n){for(var r=n<0?n+t:n;++r<t;)e.push(r);return e})}}).pseudos.nth=r.pseudos.eq;for(t in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})r.pseudos[t]=fe(t);for(t in{submit:!0,reset:!0})r.pseudos[t]=pe(t);function ye(){}ye.prototype=r.filters=r.pseudos,r.setFilters=new ye,a=oe.tokenize=function(e,t){var n,i,o,a,s,u,l,c=k[e+" "];if(c)return t?0:c.slice(0);s=e,u=[],l=r.preFilter;while(s){n&&!(i=F.exec(s))||(i&&(s=s.slice(i[0].length)||s),u.push(o=[])),n=!1,(i=_.exec(s))&&(n=i.shift(),o.push({value:n,type:i[0].replace(B," ")}),s=s.slice(n.length));for(a in r.filter)!(i=V[a].exec(s))||l[a]&&!(i=l[a](i))||(n=i.shift(),o.push({value:n,type:a,matches:i}),s=s.slice(n.length));if(!n)break}return t?s.length:s?oe.error(e):k(e,u).slice(0)};function ve(e){for(var t=0,n=e.length,r="";t<n;t++)r+=e[t].value;return r}function me(e,t,n){var r=t.dir,i=t.next,o=i||r,a=n&&"parentNode"===o,s=C++;return t.first?function(t,n,i){while(t=t[r])if(1===t.nodeType||a)return e(t,n,i);return!1}:function(t,n,u){var l,c,f,p=[T,s];if(u){while(t=t[r])if((1===t.nodeType||a)&&e(t,n,u))return!0}else while(t=t[r])if(1===t.nodeType||a)if(f=t[b]||(t[b]={}),c=f[t.uniqueID]||(f[t.uniqueID]={}),i&&i===t.nodeName.toLowerCase())t=t[r]||t;else{if((l=c[o])&&l[0]===T&&l[1]===s)return p[2]=l[2];if(c[o]=p,p[2]=e(t,n,u))return!0}return!1}}function xe(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function be(e,t,n){for(var r=0,i=t.length;r<i;r++)oe(e,t[r],n);return n}function we(e,t,n,r,i){for(var o,a=[],s=0,u=e.length,l=null!=t;s<u;s++)(o=e[s])&&(n&&!n(o,r,i)||(a.push(o),l&&t.push(s)));return a}function Te(e,t,n,r,i,o){return r&&!r[b]&&(r=Te(r)),i&&!i[b]&&(i=Te(i,o)),se(function(o,a,s,u){var l,c,f,p=[],d=[],h=a.length,g=o||be(t||"*",s.nodeType?[s]:s,[]),y=!e||!o&&t?g:we(g,p,e,s,u),v=n?i||(o?e:h||r)?[]:a:y;if(n&&n(y,v,s,u),r){l=we(v,d),r(l,[],s,u),c=l.length;while(c--)(f=l[c])&&(v[d[c]]=!(y[d[c]]=f))}if(o){if(i||e){if(i){l=[],c=v.length;while(c--)(f=v[c])&&l.push(y[c]=f);i(null,v=[],l,u)}c=v.length;while(c--)(f=v[c])&&(l=i?O(o,f):p[c])>-1&&(o[l]=!(a[l]=f))}}else v=we(v===a?v.splice(h,v.length):v),i?i(null,a,v,u):L.apply(a,v)})}function Ce(e){for(var t,n,i,o=e.length,a=r.relative[e[0].type],s=a||r.relative[" "],u=a?1:0,c=me(function(e){return e===t},s,!0),f=me(function(e){return O(t,e)>-1},s,!0),p=[function(e,n,r){var i=!a&&(r||n!==l)||((t=n).nodeType?c(e,n,r):f(e,n,r));return t=null,i}];u<o;u++)if(n=r.relative[e[u].type])p=[me(xe(p),n)];else{if((n=r.filter[e[u].type].apply(null,e[u].matches))[b]){for(i=++u;i<o;i++)if(r.relative[e[i].type])break;return Te(u>1&&xe(p),u>1&&ve(e.slice(0,u-1).concat({value:" "===e[u-2].type?"*":""})).replace(B,"$1"),n,u<i&&Ce(e.slice(u,i)),i<o&&Ce(e=e.slice(i)),i<o&&ve(e))}p.push(n)}return xe(p)}function Ee(e,t){var n=t.length>0,i=e.length>0,o=function(o,a,s,u,c){var f,h,y,v=0,m="0",x=o&&[],b=[],w=l,C=o||i&&r.find.TAG("*",c),E=T+=null==w?1:Math.random()||.1,k=C.length;for(c&&(l=a===d||a||c);m!==k&&null!=(f=C[m]);m++){if(i&&f){h=0,a||f.ownerDocument===d||(p(f),s=!g);while(y=e[h++])if(y(f,a||d,s)){u.push(f);break}c&&(T=E)}n&&((f=!y&&f)&&v--,o&&x.push(f))}if(v+=m,n&&m!==v){h=0;while(y=t[h++])y(x,b,a,s);if(o){if(v>0)while(m--)x[m]||b[m]||(b[m]=j.call(u));b=we(b)}L.apply(u,b),c&&!o&&b.length>0&&v+t.length>1&&oe.uniqueSort(u)}return c&&(T=E,l=w),x};return n?se(o):o}return s=oe.compile=function(e,t){var n,r=[],i=[],o=S[e+" "];if(!o){t||(t=a(e)),n=t.length;while(n--)(o=Ce(t[n]))[b]?r.push(o):i.push(o);(o=S(e,Ee(i,r))).selector=e}return o},u=oe.select=function(e,t,n,i){var o,u,l,c,f,p="function"==typeof e&&e,d=!i&&a(e=p.selector||e);if(n=n||[],1===d.length){if((u=d[0]=d[0].slice(0)).length>2&&"ID"===(l=u[0]).type&&9===t.nodeType&&g&&r.relative[u[1].type]){if(!(t=(r.find.ID(l.matches[0].replace(Z,ee),t)||[])[0]))return n;p&&(t=t.parentNode),e=e.slice(u.shift().value.length)}o=V.needsContext.test(e)?0:u.length;while(o--){if(l=u[o],r.relative[c=l.type])break;if((f=r.find[c])&&(i=f(l.matches[0].replace(Z,ee),K.test(u[0].type)&&ge(t.parentNode)||t))){if(u.splice(o,1),!(e=i.length&&ve(u)))return L.apply(n,i),n;break}}}return(p||s(e,d))(i,t,!g,n,!t||K.test(e)&&ge(t.parentNode)||t),n},n.sortStable=b.split("").sort(D).join("")===b,n.detectDuplicates=!!f,p(),n.sortDetached=ue(function(e){return 1&e.compareDocumentPosition(d.createElement("fieldset"))}),ue(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||le("type|href|height|width",function(e,t,n){if(!n)return e.getAttribute(t,"type"===t.toLowerCase()?1:2)}),n.attributes&&ue(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||le("value",function(e,t,n){if(!n&&"input"===e.nodeName.toLowerCase())return e.defaultValue}),ue(function(e){return null==e.getAttribute("disabled")})||le(P,function(e,t,n){var r;if(!n)return!0===e[t]?t.toLowerCase():(r=e.getAttributeNode(t))&&r.specified?r.value:null}),oe}(e);w.find=E,w.expr=E.selectors,w.expr[":"]=w.expr.pseudos,w.uniqueSort=w.unique=E.uniqueSort,w.text=E.getText,w.isXMLDoc=E.isXML,w.contains=E.contains,w.escapeSelector=E.escape;var k=function(e,t,n){var r=[],i=void 0!==n;while((e=e[t])&&9!==e.nodeType)if(1===e.nodeType){if(i&&w(e).is(n))break;r.push(e)}return r},S=function(e,t){for(var n=[];e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n},D=w.expr.match.needsContext;function N(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()}var A=/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;function j(e,t,n){return g(t)?w.grep(e,function(e,r){return!!t.call(e,r,e)!==n}):t.nodeType?w.grep(e,function(e){return e===t!==n}):"string"!=typeof t?w.grep(e,function(e){return u.call(t,e)>-1!==n}):w.filter(t,e,n)}w.filter=function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?w.find.matchesSelector(r,e)?[r]:[]:w.find.matches(e,w.grep(t,function(e){return 1===e.nodeType}))},w.fn.extend({find:function(e){var t,n,r=this.length,i=this;if("string"!=typeof e)return this.pushStack(w(e).filter(function(){for(t=0;t<r;t++)if(w.contains(i[t],this))return!0}));for(n=this.pushStack([]),t=0;t<r;t++)w.find(e,i[t],n);return r>1?w.uniqueSort(n):n},filter:function(e){return this.pushStack(j(this,e||[],!1))},not:function(e){return this.pushStack(j(this,e||[],!0))},is:function(e){return!!j(this,"string"==typeof e&&D.test(e)?w(e):e||[],!1).length}});var q,L=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;(w.fn.init=function(e,t,n){var i,o;if(!e)return this;if(n=n||q,"string"==typeof e){if(!(i="<"===e[0]&&">"===e[e.length-1]&&e.length>=3?[null,e,null]:L.exec(e))||!i[1]&&t)return!t||t.jquery?(t||n).find(e):this.constructor(t).find(e);if(i[1]){if(t=t instanceof w?t[0]:t,w.merge(this,w.parseHTML(i[1],t&&t.nodeType?t.ownerDocument||t:r,!0)),A.test(i[1])&&w.isPlainObject(t))for(i in t)g(this[i])?this[i](t[i]):this.attr(i,t[i]);return this}return(o=r.getElementById(i[2]))&&(this[0]=o,this.length=1),this}return e.nodeType?(this[0]=e,this.length=1,this):g(e)?void 0!==n.ready?n.ready(e):e(w):w.makeArray(e,this)}).prototype=w.fn,q=w(r);var H=/^(?:parents|prev(?:Until|All))/,O={children:!0,contents:!0,next:!0,prev:!0};w.fn.extend({has:function(e){var t=w(e,this),n=t.length;return this.filter(function(){for(var e=0;e<n;e++)if(w.contains(this,t[e]))return!0})},closest:function(e,t){var n,r=0,i=this.length,o=[],a="string"!=typeof e&&w(e);if(!D.test(e))for(;r<i;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(n.nodeType<11&&(a?a.index(n)>-1:1===n.nodeType&&w.find.matchesSelector(n,e))){o.push(n);break}return this.pushStack(o.length>1?w.uniqueSort(o):o)},index:function(e){return e?"string"==typeof e?u.call(w(e),this[0]):u.call(this,e.jquery?e[0]:e):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){return this.pushStack(w.uniqueSort(w.merge(this.get(),w(e,t))))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function P(e,t){while((e=e[t])&&1!==e.nodeType);return e}w.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return k(e,"parentNode")},parentsUntil:function(e,t,n){return k(e,"parentNode",n)},next:function(e){return P(e,"nextSibling")},prev:function(e){return P(e,"previousSibling")},nextAll:function(e){return k(e,"nextSibling")},prevAll:function(e){return k(e,"previousSibling")},nextUntil:function(e,t,n){return k(e,"nextSibling",n)},prevUntil:function(e,t,n){return k(e,"previousSibling",n)},siblings:function(e){return S((e.parentNode||{}).firstChild,e)},children:function(e){return S(e.firstChild)},contents:function(e){return N(e,"iframe")?e.contentDocument:(N(e,"template")&&(e=e.content||e),w.merge([],e.childNodes))}},function(e,t){w.fn[e]=function(n,r){var i=w.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=w.filter(r,i)),this.length>1&&(O[e]||w.uniqueSort(i),H.test(e)&&i.reverse()),this.pushStack(i)}});var M=/[^\x20\t\r\n\f]+/g;function R(e){var t={};return w.each(e.match(M)||[],function(e,n){t[n]=!0}),t}w.Callbacks=function(e){e="string"==typeof e?R(e):w.extend({},e);var t,n,r,i,o=[],a=[],s=-1,u=function(){for(i=i||e.once,r=t=!0;a.length;s=-1){n=a.shift();while(++s<o.length)!1===o[s].apply(n[0],n[1])&&e.stopOnFalse&&(s=o.length,n=!1)}e.memory||(n=!1),t=!1,i&&(o=n?[]:"")},l={add:function(){return o&&(n&&!t&&(s=o.length-1,a.push(n)),function t(n){w.each(n,function(n,r){g(r)?e.unique&&l.has(r)||o.push(r):r&&r.length&&"string"!==x(r)&&t(r)})}(arguments),n&&!t&&u()),this},remove:function(){return w.each(arguments,function(e,t){var n;while((n=w.inArray(t,o,n))>-1)o.splice(n,1),n<=s&&s--}),this},has:function(e){return e?w.inArray(e,o)>-1:o.length>0},empty:function(){return o&&(o=[]),this},disable:function(){return i=a=[],o=n="",this},disabled:function(){return!o},lock:function(){return i=a=[],n||t||(o=n=""),this},locked:function(){return!!i},fireWith:function(e,n){return i||(n=[e,(n=n||[]).slice?n.slice():n],a.push(n),t||u()),this},fire:function(){return l.fireWith(this,arguments),this},fired:function(){return!!r}};return l};function I(e){return e}function W(e){throw e}function $(e,t,n,r){var i;try{e&&g(i=e.promise)?i.call(e).done(t).fail(n):e&&g(i=e.then)?i.call(e,t,n):t.apply(void 0,[e].slice(r))}catch(e){n.apply(void 0,[e])}}w.extend({Deferred:function(t){var n=[["notify","progress",w.Callbacks("memory"),w.Callbacks("memory"),2],["resolve","done",w.Callbacks("once memory"),w.Callbacks("once memory"),0,"resolved"],["reject","fail",w.Callbacks("once memory"),w.Callbacks("once memory"),1,"rejected"]],r="pending",i={state:function(){return r},always:function(){return o.done(arguments).fail(arguments),this},"catch":function(e){return i.then(null,e)},pipe:function(){var e=arguments;return w.Deferred(function(t){w.each(n,function(n,r){var i=g(e[r[4]])&&e[r[4]];o[r[1]](function(){var e=i&&i.apply(this,arguments);e&&g(e.promise)?e.promise().progress(t.notify).done(t.resolve).fail(t.reject):t[r[0]+"With"](this,i?[e]:arguments)})}),e=null}).promise()},then:function(t,r,i){var o=0;function a(t,n,r,i){return function(){var s=this,u=arguments,l=function(){var e,l;if(!(t<o)){if((e=r.apply(s,u))===n.promise())throw new TypeError("Thenable self-resolution");l=e&&("object"==typeof e||"function"==typeof e)&&e.then,g(l)?i?l.call(e,a(o,n,I,i),a(o,n,W,i)):(o++,l.call(e,a(o,n,I,i),a(o,n,W,i),a(o,n,I,n.notifyWith))):(r!==I&&(s=void 0,u=[e]),(i||n.resolveWith)(s,u))}},c=i?l:function(){try{l()}catch(e){w.Deferred.exceptionHook&&w.Deferred.exceptionHook(e,c.stackTrace),t+1>=o&&(r!==W&&(s=void 0,u=[e]),n.rejectWith(s,u))}};t?c():(w.Deferred.getStackHook&&(c.stackTrace=w.Deferred.getStackHook()),e.setTimeout(c))}}return w.Deferred(function(e){n[0][3].add(a(0,e,g(i)?i:I,e.notifyWith)),n[1][3].add(a(0,e,g(t)?t:I)),n[2][3].add(a(0,e,g(r)?r:W))}).promise()},promise:function(e){return null!=e?w.extend(e,i):i}},o={};return w.each(n,function(e,t){var a=t[2],s=t[5];i[t[1]]=a.add,s&&a.add(function(){r=s},n[3-e][2].disable,n[3-e][3].disable,n[0][2].lock,n[0][3].lock),a.add(t[3].fire),o[t[0]]=function(){return o[t[0]+"With"](this===o?void 0:this,arguments),this},o[t[0]+"With"]=a.fireWith}),i.promise(o),t&&t.call(o,o),o},when:function(e){var t=arguments.length,n=t,r=Array(n),i=o.call(arguments),a=w.Deferred(),s=function(e){return function(n){r[e]=this,i[e]=arguments.length>1?o.call(arguments):n,--t||a.resolveWith(r,i)}};if(t<=1&&($(e,a.done(s(n)).resolve,a.reject,!t),"pending"===a.state()||g(i[n]&&i[n].then)))return a.then();while(n--)$(i[n],s(n),a.reject);return a.promise()}});var B=/^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;w.Deferred.exceptionHook=function(t,n){e.console&&e.console.warn&&t&&B.test(t.name)&&e.console.warn("jQuery.Deferred exception: "+t.message,t.stack,n)},w.readyException=function(t){e.setTimeout(function(){throw t})};var F=w.Deferred();w.fn.ready=function(e){return F.then(e)["catch"](function(e){w.readyException(e)}),this},w.extend({isReady:!1,readyWait:1,ready:function(e){(!0===e?--w.readyWait:w.isReady)||(w.isReady=!0,!0!==e&&--w.readyWait>0||F.resolveWith(r,[w]))}}),w.ready.then=F.then;function _(){r.removeEventListener("DOMContentLoaded",_),e.removeEventListener("load",_),w.ready()}"complete"===r.readyState||"loading"!==r.readyState&&!r.documentElement.doScroll?e.setTimeout(w.ready):(r.addEventListener("DOMContentLoaded",_),e.addEventListener("load",_));var z=function(e,t,n,r,i,o,a){var s=0,u=e.length,l=null==n;if("object"===x(n)){i=!0;for(s in n)z(e,t,s,n[s],!0,o,a)}else if(void 0!==r&&(i=!0,g(r)||(a=!0),l&&(a?(t.call(e,r),t=null):(l=t,t=function(e,t,n){return l.call(w(e),n)})),t))for(;s<u;s++)t(e[s],n,a?r:r.call(e[s],s,t(e[s],n)));return i?e:l?t.call(e):u?t(e[0],n):o},X=/^-ms-/,U=/-([a-z])/g;function V(e,t){return t.toUpperCase()}function G(e){return e.replace(X,"ms-").replace(U,V)}var Y=function(e){return 1===e.nodeType||9===e.nodeType||!+e.nodeType};function Q(){this.expando=w.expando+Q.uid++}Q.uid=1,Q.prototype={cache:function(e){var t=e[this.expando];return t||(t={},Y(e)&&(e.nodeType?e[this.expando]=t:Object.defineProperty(e,this.expando,{value:t,configurable:!0}))),t},set:function(e,t,n){var r,i=this.cache(e);if("string"==typeof t)i[G(t)]=n;else for(r in t)i[G(r)]=t[r];return i},get:function(e,t){return void 0===t?this.cache(e):e[this.expando]&&e[this.expando][G(t)]},access:function(e,t,n){return void 0===t||t&&"string"==typeof t&&void 0===n?this.get(e,t):(this.set(e,t,n),void 0!==n?n:t)},remove:function(e,t){var n,r=e[this.expando];if(void 0!==r){if(void 0!==t){n=(t=Array.isArray(t)?t.map(G):(t=G(t))in r?[t]:t.match(M)||[]).length;while(n--)delete r[t[n]]}(void 0===t||w.isEmptyObject(r))&&(e.nodeType?e[this.expando]=void 0:delete e[this.expando])}},hasData:function(e){var t=e[this.expando];return void 0!==t&&!w.isEmptyObject(t)}};var J=new Q,K=new Q,Z=/^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,ee=/[A-Z]/g;function te(e){return"true"===e||"false"!==e&&("null"===e?null:e===+e+""?+e:Z.test(e)?JSON.parse(e):e)}function ne(e,t,n){var r;if(void 0===n&&1===e.nodeType)if(r="data-"+t.replace(ee,"-$&").toLowerCase(),"string"==typeof(n=e.getAttribute(r))){try{n=te(n)}catch(e){}K.set(e,t,n)}else n=void 0;return n}w.extend({hasData:function(e){return K.hasData(e)||J.hasData(e)},data:function(e,t,n){return K.access(e,t,n)},removeData:function(e,t){K.remove(e,t)},_data:function(e,t,n){return J.access(e,t,n)},_removeData:function(e,t){J.remove(e,t)}}),w.fn.extend({data:function(e,t){var n,r,i,o=this[0],a=o&&o.attributes;if(void 0===e){if(this.length&&(i=K.get(o),1===o.nodeType&&!J.get(o,"hasDataAttrs"))){n=a.length;while(n--)a[n]&&0===(r=a[n].name).indexOf("data-")&&(r=G(r.slice(5)),ne(o,r,i[r]));J.set(o,"hasDataAttrs",!0)}return i}return"object"==typeof e?this.each(function(){K.set(this,e)}):z(this,function(t){var n;if(o&&void 0===t){if(void 0!==(n=K.get(o,e)))return n;if(void 0!==(n=ne(o,e)))return n}else this.each(function(){K.set(this,e,t)})},null,t,arguments.length>1,null,!0)},removeData:function(e){return this.each(function(){K.remove(this,e)})}}),w.extend({queue:function(e,t,n){var r;if(e)return t=(t||"fx")+"queue",r=J.get(e,t),n&&(!r||Array.isArray(n)?r=J.access(e,t,w.makeArray(n)):r.push(n)),r||[]},dequeue:function(e,t){t=t||"fx";var n=w.queue(e,t),r=n.length,i=n.shift(),o=w._queueHooks(e,t),a=function(){w.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,a,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return J.get(e,n)||J.access(e,n,{empty:w.Callbacks("once memory").add(function(){J.remove(e,[t+"queue",n])})})}}),w.fn.extend({queue:function(e,t){var n=2;return"string"!=typeof e&&(t=e,e="fx",n--),arguments.length<n?w.queue(this[0],e):void 0===t?this:this.each(function(){var n=w.queue(this,e,t);w._queueHooks(this,e),"fx"===e&&"inprogress"!==n[0]&&w.dequeue(this,e)})},dequeue:function(e){return this.each(function(){w.dequeue(this,e)})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,t){var n,r=1,i=w.Deferred(),o=this,a=this.length,s=function(){--r||i.resolveWith(o,[o])};"string"!=typeof e&&(t=e,e=void 0),e=e||"fx";while(a--)(n=J.get(o[a],e+"queueHooks"))&&n.empty&&(r++,n.empty.add(s));return s(),i.promise(t)}});var re=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,ie=new RegExp("^(?:([+-])=|)("+re+")([a-z%]*)$","i"),oe=["Top","Right","Bottom","Left"],ae=function(e,t){return"none"===(e=t||e).style.display||""===e.style.display&&w.contains(e.ownerDocument,e)&&"none"===w.css(e,"display")},se=function(e,t,n,r){var i,o,a={};for(o in t)a[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=a[o];return i};function ue(e,t,n,r){var i,o,a=20,s=r?function(){return r.cur()}:function(){return w.css(e,t,"")},u=s(),l=n&&n[3]||(w.cssNumber[t]?"":"px"),c=(w.cssNumber[t]||"px"!==l&&+u)&&ie.exec(w.css(e,t));if(c&&c[3]!==l){u/=2,l=l||c[3],c=+u||1;while(a--)w.style(e,t,c+l),(1-o)*(1-(o=s()/u||.5))<=0&&(a=0),c/=o;c*=2,w.style(e,t,c+l),n=n||[]}return n&&(c=+c||+u||0,i=n[1]?c+(n[1]+1)*n[2]:+n[2],r&&(r.unit=l,r.start=c,r.end=i)),i}var le={};function ce(e){var t,n=e.ownerDocument,r=e.nodeName,i=le[r];return i||(t=n.body.appendChild(n.createElement(r)),i=w.css(t,"display"),t.parentNode.removeChild(t),"none"===i&&(i="block"),le[r]=i,i)}function fe(e,t){for(var n,r,i=[],o=0,a=e.length;o<a;o++)(r=e[o]).style&&(n=r.style.display,t?("none"===n&&(i[o]=J.get(r,"display")||null,i[o]||(r.style.display="")),""===r.style.display&&ae(r)&&(i[o]=ce(r))):"none"!==n&&(i[o]="none",J.set(r,"display",n)));for(o=0;o<a;o++)null!=i[o]&&(e[o].style.display=i[o]);return e}w.fn.extend({show:function(){return fe(this,!0)},hide:function(){return fe(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){ae(this)?w(this).show():w(this).hide()})}});var pe=/^(?:checkbox|radio)$/i,de=/<([a-z][^\/\0>\x20\t\r\n\f]+)/i,he=/^$|^module$|\/(?:java|ecma)script/i,ge={option:[1,"<select multiple='multiple'>","</select>"],thead:[1,"<table>","</table>"],col:[2,"<table><colgroup>","</colgroup></table>"],tr:[2,"<table><tbody>","</tbody></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:[0,"",""]};ge.optgroup=ge.option,ge.tbody=ge.tfoot=ge.colgroup=ge.caption=ge.thead,ge.th=ge.td;function ye(e,t){var n;return n="undefined"!=typeof e.getElementsByTagName?e.getElementsByTagName(t||"*"):"undefined"!=typeof e.querySelectorAll?e.querySelectorAll(t||"*"):[],void 0===t||t&&N(e,t)?w.merge([e],n):n}function ve(e,t){for(var n=0,r=e.length;n<r;n++)J.set(e[n],"globalEval",!t||J.get(t[n],"globalEval"))}var me=/<|&#?\w+;/;function xe(e,t,n,r,i){for(var o,a,s,u,l,c,f=t.createDocumentFragment(),p=[],d=0,h=e.length;d<h;d++)if((o=e[d])||0===o)if("object"===x(o))w.merge(p,o.nodeType?[o]:o);else if(me.test(o)){a=a||f.appendChild(t.createElement("div")),s=(de.exec(o)||["",""])[1].toLowerCase(),u=ge[s]||ge._default,a.innerHTML=u[1]+w.htmlPrefilter(o)+u[2],c=u[0];while(c--)a=a.lastChild;w.merge(p,a.childNodes),(a=f.firstChild).textContent=""}else p.push(t.createTextNode(o));f.textContent="",d=0;while(o=p[d++])if(r&&w.inArray(o,r)>-1)i&&i.push(o);else if(l=w.contains(o.ownerDocument,o),a=ye(f.appendChild(o),"script"),l&&ve(a),n){c=0;while(o=a[c++])he.test(o.type||"")&&n.push(o)}return f}!function(){var e=r.createDocumentFragment().appendChild(r.createElement("div")),t=r.createElement("input");t.setAttribute("type","radio"),t.setAttribute("checked","checked"),t.setAttribute("name","t"),e.appendChild(t),h.checkClone=e.cloneNode(!0).cloneNode(!0).lastChild.checked,e.innerHTML="<textarea>x</textarea>",h.noCloneChecked=!!e.cloneNode(!0).lastChild.defaultValue}();var be=r.documentElement,we=/^key/,Te=/^(?:mouse|pointer|contextmenu|drag|drop)|click/,Ce=/^([^.]*)(?:\.(.+)|)/;function Ee(){return!0}function ke(){return!1}function Se(){try{return r.activeElement}catch(e){}}function De(e,t,n,r,i,o){var a,s;if("object"==typeof t){"string"!=typeof n&&(r=r||n,n=void 0);for(s in t)De(e,s,n,r,t[s],o);return e}if(null==r&&null==i?(i=n,r=n=void 0):null==i&&("string"==typeof n?(i=r,r=void 0):(i=r,r=n,n=void 0)),!1===i)i=ke;else if(!i)return e;return 1===o&&(a=i,(i=function(e){return w().off(e),a.apply(this,arguments)}).guid=a.guid||(a.guid=w.guid++)),e.each(function(){w.event.add(this,t,i,r,n)})}w.event={global:{},add:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=J.get(e);if(y){n.handler&&(n=(o=n).handler,i=o.selector),i&&w.find.matchesSelector(be,i),n.guid||(n.guid=w.guid++),(u=y.events)||(u=y.events={}),(a=y.handle)||(a=y.handle=function(t){return"undefined"!=typeof w&&w.event.triggered!==t.type?w.event.dispatch.apply(e,arguments):void 0}),l=(t=(t||"").match(M)||[""]).length;while(l--)d=g=(s=Ce.exec(t[l])||[])[1],h=(s[2]||"").split(".").sort(),d&&(f=w.event.special[d]||{},d=(i?f.delegateType:f.bindType)||d,f=w.event.special[d]||{},c=w.extend({type:d,origType:g,data:r,handler:n,guid:n.guid,selector:i,needsContext:i&&w.expr.match.needsContext.test(i),namespace:h.join(".")},o),(p=u[d])||((p=u[d]=[]).delegateCount=0,f.setup&&!1!==f.setup.call(e,r,h,a)||e.addEventListener&&e.addEventListener(d,a)),f.add&&(f.add.call(e,c),c.handler.guid||(c.handler.guid=n.guid)),i?p.splice(p.delegateCount++,0,c):p.push(c),w.event.global[d]=!0)}},remove:function(e,t,n,r,i){var o,a,s,u,l,c,f,p,d,h,g,y=J.hasData(e)&&J.get(e);if(y&&(u=y.events)){l=(t=(t||"").match(M)||[""]).length;while(l--)if(s=Ce.exec(t[l])||[],d=g=s[1],h=(s[2]||"").split(".").sort(),d){f=w.event.special[d]||{},p=u[d=(r?f.delegateType:f.bindType)||d]||[],s=s[2]&&new RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),a=o=p.length;while(o--)c=p[o],!i&&g!==c.origType||n&&n.guid!==c.guid||s&&!s.test(c.namespace)||r&&r!==c.selector&&("**"!==r||!c.selector)||(p.splice(o,1),c.selector&&p.delegateCount--,f.remove&&f.remove.call(e,c));a&&!p.length&&(f.teardown&&!1!==f.teardown.call(e,h,y.handle)||w.removeEvent(e,d,y.handle),delete u[d])}else for(d in u)w.event.remove(e,d+t[l],n,r,!0);w.isEmptyObject(u)&&J.remove(e,"handle events")}},dispatch:function(e){var t=w.event.fix(e),n,r,i,o,a,s,u=new Array(arguments.length),l=(J.get(this,"events")||{})[t.type]||[],c=w.event.special[t.type]||{};for(u[0]=t,n=1;n<arguments.length;n++)u[n]=arguments[n];if(t.delegateTarget=this,!c.preDispatch||!1!==c.preDispatch.call(this,t)){s=w.event.handlers.call(this,t,l),n=0;while((o=s[n++])&&!t.isPropagationStopped()){t.currentTarget=o.elem,r=0;while((a=o.handlers[r++])&&!t.isImmediatePropagationStopped())t.rnamespace&&!t.rnamespace.test(a.namespace)||(t.handleObj=a,t.data=a.data,void 0!==(i=((w.event.special[a.origType]||{}).handle||a.handler).apply(o.elem,u))&&!1===(t.result=i)&&(t.preventDefault(),t.stopPropagation()))}return c.postDispatch&&c.postDispatch.call(this,t),t.result}},handlers:function(e,t){var n,r,i,o,a,s=[],u=t.delegateCount,l=e.target;if(u&&l.nodeType&&!("click"===e.type&&e.button>=1))for(;l!==this;l=l.parentNode||this)if(1===l.nodeType&&("click"!==e.type||!0!==l.disabled)){for(o=[],a={},n=0;n<u;n++)void 0===a[i=(r=t[n]).selector+" "]&&(a[i]=r.needsContext?w(i,this).index(l)>-1:w.find(i,this,null,[l]).length),a[i]&&o.push(r);o.length&&s.push({elem:l,handlers:o})}return l=this,u<t.length&&s.push({elem:l,handlers:t.slice(u)}),s},addProp:function(e,t){Object.defineProperty(w.Event.prototype,e,{enumerable:!0,configurable:!0,get:g(t)?function(){if(this.originalEvent)return t(this.originalEvent)}:function(){if(this.originalEvent)return this.originalEvent[e]},set:function(t){Object.defineProperty(this,e,{enumerable:!0,configurable:!0,writable:!0,value:t})}})},fix:function(e){return e[w.expando]?e:new w.Event(e)},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==Se()&&this.focus)return this.focus(),!1},delegateType:"focusin"},blur:{trigger:function(){if(this===Se()&&this.blur)return this.blur(),!1},delegateType:"focusout"},click:{trigger:function(){if("checkbox"===this.type&&this.click&&N(this,"input"))return this.click(),!1},_default:function(e){return N(e.target,"a")}},beforeunload:{postDispatch:function(e){void 0!==e.result&&e.originalEvent&&(e.originalEvent.returnValue=e.result)}}}},w.removeEvent=function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n)},w.Event=function(e,t){if(!(this instanceof w.Event))return new w.Event(e,t);e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||void 0===e.defaultPrevented&&!1===e.returnValue?Ee:ke,this.target=e.target&&3===e.target.nodeType?e.target.parentNode:e.target,this.currentTarget=e.currentTarget,this.relatedTarget=e.relatedTarget):this.type=e,t&&w.extend(this,t),this.timeStamp=e&&e.timeStamp||Date.now(),this[w.expando]=!0},w.Event.prototype={constructor:w.Event,isDefaultPrevented:ke,isPropagationStopped:ke,isImmediatePropagationStopped:ke,isSimulated:!1,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=Ee,e&&!this.isSimulated&&e.preventDefault()},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=Ee,e&&!this.isSimulated&&e.stopPropagation()},stopImmediatePropagation:function(){var e=this.originalEvent;this.isImmediatePropagationStopped=Ee,e&&!this.isSimulated&&e.stopImmediatePropagation(),this.stopPropagation()}},w.each({altKey:!0,bubbles:!0,cancelable:!0,changedTouches:!0,ctrlKey:!0,detail:!0,eventPhase:!0,metaKey:!0,pageX:!0,pageY:!0,shiftKey:!0,view:!0,"char":!0,charCode:!0,key:!0,keyCode:!0,button:!0,buttons:!0,clientX:!0,clientY:!0,offsetX:!0,offsetY:!0,pointerId:!0,pointerType:!0,screenX:!0,screenY:!0,targetTouches:!0,toElement:!0,touches:!0,which:function(e){var t=e.button;return null==e.which&&we.test(e.type)?null!=e.charCode?e.charCode:e.keyCode:!e.which&&void 0!==t&&Te.test(e.type)?1&t?1:2&t?3:4&t?2:0:e.which}},w.event.addProp),w.each({mouseenter:"mouseover",mouseleave:"mouseout",pointerenter:"pointerover",pointerleave:"pointerout"},function(e,t){w.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return i&&(i===r||w.contains(r,i))||(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),w.fn.extend({on:function(e,t,n,r){return De(this,e,t,n,r)},one:function(e,t,n,r){return De(this,e,t,n,r,1)},off:function(e,t,n){var r,i;if(e&&e.preventDefault&&e.handleObj)return r=e.handleObj,w(e.delegateTarget).off(r.namespace?r.origType+"."+r.namespace:r.origType,r.selector,r.handler),this;if("object"==typeof e){for(i in e)this.off(i,t,e[i]);return this}return!1!==t&&"function"!=typeof t||(n=t,t=void 0),!1===n&&(n=ke),this.each(function(){w.event.remove(this,e,n,t)})}});var Ne=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,Ae=/<script|<style|<link/i,je=/checked\s*(?:[^=]|=\s*.checked.)/i,qe=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;function Le(e,t){return N(e,"table")&&N(11!==t.nodeType?t:t.firstChild,"tr")?w(e).children("tbody")[0]||e:e}function He(e){return e.type=(null!==e.getAttribute("type"))+"/"+e.type,e}function Oe(e){return"true/"===(e.type||"").slice(0,5)?e.type=e.type.slice(5):e.removeAttribute("type"),e}function Pe(e,t){var n,r,i,o,a,s,u,l;if(1===t.nodeType){if(J.hasData(e)&&(o=J.access(e),a=J.set(t,o),l=o.events)){delete a.handle,a.events={};for(i in l)for(n=0,r=l[i].length;n<r;n++)w.event.add(t,i,l[i][n])}K.hasData(e)&&(s=K.access(e),u=w.extend({},s),K.set(t,u))}}function Me(e,t){var n=t.nodeName.toLowerCase();"input"===n&&pe.test(e.type)?t.checked=e.checked:"input"!==n&&"textarea"!==n||(t.defaultValue=e.defaultValue)}function Re(e,t,n,r){t=a.apply([],t);var i,o,s,u,l,c,f=0,p=e.length,d=p-1,y=t[0],v=g(y);if(v||p>1&&"string"==typeof y&&!h.checkClone&&je.test(y))return e.each(function(i){var o=e.eq(i);v&&(t[0]=y.call(this,i,o.html())),Re(o,t,n,r)});if(p&&(i=xe(t,e[0].ownerDocument,!1,e,r),o=i.firstChild,1===i.childNodes.length&&(i=o),o||r)){for(u=(s=w.map(ye(i,"script"),He)).length;f<p;f++)l=i,f!==d&&(l=w.clone(l,!0,!0),u&&w.merge(s,ye(l,"script"))),n.call(e[f],l,f);if(u)for(c=s[s.length-1].ownerDocument,w.map(s,Oe),f=0;f<u;f++)l=s[f],he.test(l.type||"")&&!J.access(l,"globalEval")&&w.contains(c,l)&&(l.src&&"module"!==(l.type||"").toLowerCase()?w._evalUrl&&w._evalUrl(l.src):m(l.textContent.replace(qe,""),c,l))}return e}function Ie(e,t,n){for(var r,i=t?w.filter(t,e):e,o=0;null!=(r=i[o]);o++)n||1!==r.nodeType||w.cleanData(ye(r)),r.parentNode&&(n&&w.contains(r.ownerDocument,r)&&ve(ye(r,"script")),r.parentNode.removeChild(r));return e}w.extend({htmlPrefilter:function(e){return e.replace(Ne,"<$1></$2>")},clone:function(e,t,n){var r,i,o,a,s=e.cloneNode(!0),u=w.contains(e.ownerDocument,e);if(!(h.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||w.isXMLDoc(e)))for(a=ye(s),r=0,i=(o=ye(e)).length;r<i;r++)Me(o[r],a[r]);if(t)if(n)for(o=o||ye(e),a=a||ye(s),r=0,i=o.length;r<i;r++)Pe(o[r],a[r]);else Pe(e,s);return(a=ye(s,"script")).length>0&&ve(a,!u&&ye(e,"script")),s},cleanData:function(e){for(var t,n,r,i=w.event.special,o=0;void 0!==(n=e[o]);o++)if(Y(n)){if(t=n[J.expando]){if(t.events)for(r in t.events)i[r]?w.event.remove(n,r):w.removeEvent(n,r,t.handle);n[J.expando]=void 0}n[K.expando]&&(n[K.expando]=void 0)}}}),w.fn.extend({detach:function(e){return Ie(this,e,!0)},remove:function(e){return Ie(this,e)},text:function(e){return z(this,function(e){return void 0===e?w.text(this):this.empty().each(function(){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||(this.textContent=e)})},null,e,arguments.length)},append:function(){return Re(this,arguments,function(e){1!==this.nodeType&&11!==this.nodeType&&9!==this.nodeType||Le(this,e).appendChild(e)})},prepend:function(){return Re(this,arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Le(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return Re(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return Re(this,arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},empty:function(){for(var e,t=0;null!=(e=this[t]);t++)1===e.nodeType&&(w.cleanData(ye(e,!1)),e.textContent="");return this},clone:function(e,t){return e=null!=e&&e,t=null==t?e:t,this.map(function(){return w.clone(this,e,t)})},html:function(e){return z(this,function(e){var t=this[0]||{},n=0,r=this.length;if(void 0===e&&1===t.nodeType)return t.innerHTML;if("string"==typeof e&&!Ae.test(e)&&!ge[(de.exec(e)||["",""])[1].toLowerCase()]){e=w.htmlPrefilter(e);try{for(;n<r;n++)1===(t=this[n]||{}).nodeType&&(w.cleanData(ye(t,!1)),t.innerHTML=e);t=0}catch(e){}}t&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=[];return Re(this,arguments,function(t){var n=this.parentNode;w.inArray(this,e)<0&&(w.cleanData(ye(this)),n&&n.replaceChild(t,this))},e)}}),w.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){w.fn[e]=function(e){for(var n,r=[],i=w(e),o=i.length-1,a=0;a<=o;a++)n=a===o?this:this.clone(!0),w(i[a])[t](n),s.apply(r,n.get());return this.pushStack(r)}});var We=new RegExp("^("+re+")(?!px)[a-z%]+$","i"),$e=function(t){var n=t.ownerDocument.defaultView;return n&&n.opener||(n=e),n.getComputedStyle(t)},Be=new RegExp(oe.join("|"),"i");!function(){function t(){if(c){l.style.cssText="position:absolute;left:-11111px;width:60px;margin-top:1px;padding:0;border:0",c.style.cssText="position:relative;display:block;box-sizing:border-box;overflow:scroll;margin:auto;border:1px;padding:1px;width:60%;top:1%",be.appendChild(l).appendChild(c);var t=e.getComputedStyle(c);i="1%"!==t.top,u=12===n(t.marginLeft),c.style.right="60%",s=36===n(t.right),o=36===n(t.width),c.style.position="absolute",a=36===c.offsetWidth||"absolute",be.removeChild(l),c=null}}function n(e){return Math.round(parseFloat(e))}var i,o,a,s,u,l=r.createElement("div"),c=r.createElement("div");c.style&&(c.style.backgroundClip="content-box",c.cloneNode(!0).style.backgroundClip="",h.clearCloneStyle="content-box"===c.style.backgroundClip,w.extend(h,{boxSizingReliable:function(){return t(),o},pixelBoxStyles:function(){return t(),s},pixelPosition:function(){return t(),i},reliableMarginLeft:function(){return t(),u},scrollboxSize:function(){return t(),a}}))}();function Fe(e,t,n){var r,i,o,a,s=e.style;return(n=n||$e(e))&&(""!==(a=n.getPropertyValue(t)||n[t])||w.contains(e.ownerDocument,e)||(a=w.style(e,t)),!h.pixelBoxStyles()&&We.test(a)&&Be.test(t)&&(r=s.width,i=s.minWidth,o=s.maxWidth,s.minWidth=s.maxWidth=s.width=a,a=n.width,s.width=r,s.minWidth=i,s.maxWidth=o)),void 0!==a?a+"":a}function _e(e,t){return{get:function(){if(!e())return(this.get=t).apply(this,arguments);delete this.get}}}var ze=/^(none|table(?!-c[ea]).+)/,Xe=/^--/,Ue={position:"absolute",visibility:"hidden",display:"block"},Ve={letterSpacing:"0",fontWeight:"400"},Ge=["Webkit","Moz","ms"],Ye=r.createElement("div").style;function Qe(e){if(e in Ye)return e;var t=e[0].toUpperCase()+e.slice(1),n=Ge.length;while(n--)if((e=Ge[n]+t)in Ye)return e}function Je(e){var t=w.cssProps[e];return t||(t=w.cssProps[e]=Qe(e)||e),t}function Ke(e,t,n){var r=ie.exec(t);return r?Math.max(0,r[2]-(n||0))+(r[3]||"px"):t}function Ze(e,t,n,r,i,o){var a="width"===t?1:0,s=0,u=0;if(n===(r?"border":"content"))return 0;for(;a<4;a+=2)"margin"===n&&(u+=w.css(e,n+oe[a],!0,i)),r?("content"===n&&(u-=w.css(e,"padding"+oe[a],!0,i)),"margin"!==n&&(u-=w.css(e,"border"+oe[a]+"Width",!0,i))):(u+=w.css(e,"padding"+oe[a],!0,i),"padding"!==n?u+=w.css(e,"border"+oe[a]+"Width",!0,i):s+=w.css(e,"border"+oe[a]+"Width",!0,i));return!r&&o>=0&&(u+=Math.max(0,Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-o-u-s-.5))),u}function et(e,t,n){var r=$e(e),i=Fe(e,t,r),o="border-box"===w.css(e,"boxSizing",!1,r),a=o;if(We.test(i)){if(!n)return i;i="auto"}return a=a&&(h.boxSizingReliable()||i===e.style[t]),("auto"===i||!parseFloat(i)&&"inline"===w.css(e,"display",!1,r))&&(i=e["offset"+t[0].toUpperCase()+t.slice(1)],a=!0),(i=parseFloat(i)||0)+Ze(e,t,n||(o?"border":"content"),a,r,i)+"px"}w.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Fe(e,"opacity");return""===n?"1":n}}}},cssNumber:{animationIterationCount:!0,columnCount:!0,fillOpacity:!0,flexGrow:!0,flexShrink:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{},style:function(e,t,n,r){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var i,o,a,s=G(t),u=Xe.test(t),l=e.style;if(u||(t=Je(s)),a=w.cssHooks[t]||w.cssHooks[s],void 0===n)return a&&"get"in a&&void 0!==(i=a.get(e,!1,r))?i:l[t];"string"==(o=typeof n)&&(i=ie.exec(n))&&i[1]&&(n=ue(e,t,i),o="number"),null!=n&&n===n&&("number"===o&&(n+=i&&i[3]||(w.cssNumber[s]?"":"px")),h.clearCloneStyle||""!==n||0!==t.indexOf("background")||(l[t]="inherit"),a&&"set"in a&&void 0===(n=a.set(e,n,r))||(u?l.setProperty(t,n):l[t]=n))}},css:function(e,t,n,r){var i,o,a,s=G(t);return Xe.test(t)||(t=Je(s)),(a=w.cssHooks[t]||w.cssHooks[s])&&"get"in a&&(i=a.get(e,!0,n)),void 0===i&&(i=Fe(e,t,r)),"normal"===i&&t in Ve&&(i=Ve[t]),""===n||n?(o=parseFloat(i),!0===n||isFinite(o)?o||0:i):i}}),w.each(["height","width"],function(e,t){w.cssHooks[t]={get:function(e,n,r){if(n)return!ze.test(w.css(e,"display"))||e.getClientRects().length&&e.getBoundingClientRect().width?et(e,t,r):se(e,Ue,function(){return et(e,t,r)})},set:function(e,n,r){var i,o=$e(e),a="border-box"===w.css(e,"boxSizing",!1,o),s=r&&Ze(e,t,r,a,o);return a&&h.scrollboxSize()===o.position&&(s-=Math.ceil(e["offset"+t[0].toUpperCase()+t.slice(1)]-parseFloat(o[t])-Ze(e,t,"border",!1,o)-.5)),s&&(i=ie.exec(n))&&"px"!==(i[3]||"px")&&(e.style[t]=n,n=w.css(e,t)),Ke(e,n,s)}}}),w.cssHooks.marginLeft=_e(h.reliableMarginLeft,function(e,t){if(t)return(parseFloat(Fe(e,"marginLeft"))||e.getBoundingClientRect().left-se(e,{marginLeft:0},function(){return e.getBoundingClientRect().left}))+"px"}),w.each({margin:"",padding:"",border:"Width"},function(e,t){w.cssHooks[e+t]={expand:function(n){for(var r=0,i={},o="string"==typeof n?n.split(" "):[n];r<4;r++)i[e+oe[r]+t]=o[r]||o[r-2]||o[0];return i}},"margin"!==e&&(w.cssHooks[e+t].set=Ke)}),w.fn.extend({css:function(e,t){return z(this,function(e,t,n){var r,i,o={},a=0;if(Array.isArray(t)){for(r=$e(e),i=t.length;a<i;a++)o[t[a]]=w.css(e,t[a],!1,r);return o}return void 0!==n?w.style(e,t,n):w.css(e,t)},e,t,arguments.length>1)}});function tt(e,t,n,r,i){return new tt.prototype.init(e,t,n,r,i)}w.Tween=tt,tt.prototype={constructor:tt,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||w.easing._default,this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(w.cssNumber[n]?"":"px")},cur:function(){var e=tt.propHooks[this.prop];return e&&e.get?e.get(this):tt.propHooks._default.get(this)},run:function(e){var t,n=tt.propHooks[this.prop];return this.options.duration?this.pos=t=w.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):this.pos=t=e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):tt.propHooks._default.set(this),this}},tt.prototype.init.prototype=tt.prototype,tt.propHooks={_default:{get:function(e){var t;return 1!==e.elem.nodeType||null!=e.elem[e.prop]&&null==e.elem.style[e.prop]?e.elem[e.prop]:(t=w.css(e.elem,e.prop,""))&&"auto"!==t?t:0},set:function(e){w.fx.step[e.prop]?w.fx.step[e.prop](e):1!==e.elem.nodeType||null==e.elem.style[w.cssProps[e.prop]]&&!w.cssHooks[e.prop]?e.elem[e.prop]=e.now:w.style(e.elem,e.prop,e.now+e.unit)}}},tt.propHooks.scrollTop=tt.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},w.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2},_default:"swing"},w.fx=tt.prototype.init,w.fx.step={};var nt,rt,it=/^(?:toggle|show|hide)$/,ot=/queueHooks$/;function at(){rt&&(!1===r.hidden&&e.requestAnimationFrame?e.requestAnimationFrame(at):e.setTimeout(at,w.fx.interval),w.fx.tick())}function st(){return e.setTimeout(function(){nt=void 0}),nt=Date.now()}function ut(e,t){var n,r=0,i={height:e};for(t=t?1:0;r<4;r+=2-t)i["margin"+(n=oe[r])]=i["padding"+n]=e;return t&&(i.opacity=i.width=e),i}function lt(e,t,n){for(var r,i=(pt.tweeners[t]||[]).concat(pt.tweeners["*"]),o=0,a=i.length;o<a;o++)if(r=i[o].call(n,t,e))return r}function ct(e,t,n){var r,i,o,a,s,u,l,c,f="width"in t||"height"in t,p=this,d={},h=e.style,g=e.nodeType&&ae(e),y=J.get(e,"fxshow");n.queue||(null==(a=w._queueHooks(e,"fx")).unqueued&&(a.unqueued=0,s=a.empty.fire,a.empty.fire=function(){a.unqueued||s()}),a.unqueued++,p.always(function(){p.always(function(){a.unqueued--,w.queue(e,"fx").length||a.empty.fire()})}));for(r in t)if(i=t[r],it.test(i)){if(delete t[r],o=o||"toggle"===i,i===(g?"hide":"show")){if("show"!==i||!y||void 0===y[r])continue;g=!0}d[r]=y&&y[r]||w.style(e,r)}if((u=!w.isEmptyObject(t))||!w.isEmptyObject(d)){f&&1===e.nodeType&&(n.overflow=[h.overflow,h.overflowX,h.overflowY],null==(l=y&&y.display)&&(l=J.get(e,"display")),"none"===(c=w.css(e,"display"))&&(l?c=l:(fe([e],!0),l=e.style.display||l,c=w.css(e,"display"),fe([e]))),("inline"===c||"inline-block"===c&&null!=l)&&"none"===w.css(e,"float")&&(u||(p.done(function(){h.display=l}),null==l&&(c=h.display,l="none"===c?"":c)),h.display="inline-block")),n.overflow&&(h.overflow="hidden",p.always(function(){h.overflow=n.overflow[0],h.overflowX=n.overflow[1],h.overflowY=n.overflow[2]})),u=!1;for(r in d)u||(y?"hidden"in y&&(g=y.hidden):y=J.access(e,"fxshow",{display:l}),o&&(y.hidden=!g),g&&fe([e],!0),p.done(function(){g||fe([e]),J.remove(e,"fxshow");for(r in d)w.style(e,r,d[r])})),u=lt(g?y[r]:0,r,p),r in y||(y[r]=u.start,g&&(u.end=u.start,u.start=0))}}function ft(e,t){var n,r,i,o,a;for(n in e)if(r=G(n),i=t[r],o=e[n],Array.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),(a=w.cssHooks[r])&&"expand"in a){o=a.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}function pt(e,t,n){var r,i,o=0,a=pt.prefilters.length,s=w.Deferred().always(function(){delete u.elem}),u=function(){if(i)return!1;for(var t=nt||st(),n=Math.max(0,l.startTime+l.duration-t),r=1-(n/l.duration||0),o=0,a=l.tweens.length;o<a;o++)l.tweens[o].run(r);return s.notifyWith(e,[l,r,n]),r<1&&a?n:(a||s.notifyWith(e,[l,1,0]),s.resolveWith(e,[l]),!1)},l=s.promise({elem:e,props:w.extend({},t),opts:w.extend(!0,{specialEasing:{},easing:w.easing._default},n),originalProperties:t,originalOptions:n,startTime:nt||st(),duration:n.duration,tweens:[],createTween:function(t,n){var r=w.Tween(e,l.opts,t,n,l.opts.specialEasing[t]||l.opts.easing);return l.tweens.push(r),r},stop:function(t){var n=0,r=t?l.tweens.length:0;if(i)return this;for(i=!0;n<r;n++)l.tweens[n].run(1);return t?(s.notifyWith(e,[l,1,0]),s.resolveWith(e,[l,t])):s.rejectWith(e,[l,t]),this}}),c=l.props;for(ft(c,l.opts.specialEasing);o<a;o++)if(r=pt.prefilters[o].call(l,e,c,l.opts))return g(r.stop)&&(w._queueHooks(l.elem,l.opts.queue).stop=r.stop.bind(r)),r;return w.map(c,lt,l),g(l.opts.start)&&l.opts.start.call(e,l),l.progress(l.opts.progress).done(l.opts.done,l.opts.complete).fail(l.opts.fail).always(l.opts.always),w.fx.timer(w.extend(u,{elem:e,anim:l,queue:l.opts.queue})),l}w.Animation=w.extend(pt,{tweeners:{"*":[function(e,t){var n=this.createTween(e,t);return ue(n.elem,e,ie.exec(t),n),n}]},tweener:function(e,t){g(e)?(t=e,e=["*"]):e=e.match(M);for(var n,r=0,i=e.length;r<i;r++)n=e[r],pt.tweeners[n]=pt.tweeners[n]||[],pt.tweeners[n].unshift(t)},prefilters:[ct],prefilter:function(e,t){t?pt.prefilters.unshift(e):pt.prefilters.push(e)}}),w.speed=function(e,t,n){var r=e&&"object"==typeof e?w.extend({},e):{complete:n||!n&&t||g(e)&&e,duration:e,easing:n&&t||t&&!g(t)&&t};return w.fx.off?r.duration=0:"number"!=typeof r.duration&&(r.duration in w.fx.speeds?r.duration=w.fx.speeds[r.duration]:r.duration=w.fx.speeds._default),null!=r.queue&&!0!==r.queue||(r.queue="fx"),r.old=r.complete,r.complete=function(){g(r.old)&&r.old.call(this),r.queue&&w.dequeue(this,r.queue)},r},w.fn.extend({fadeTo:function(e,t,n,r){return this.filter(ae).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=w.isEmptyObject(e),o=w.speed(t,n,r),a=function(){var t=pt(this,w.extend({},e),o);(i||J.get(this,"finish"))&&t.stop(!0)};return a.finish=a,i||!1===o.queue?this.each(a):this.queue(o.queue,a)},stop:function(e,t,n){var r=function(e){var t=e.stop;delete e.stop,t(n)};return"string"!=typeof e&&(n=t,t=e,e=void 0),t&&!1!==e&&this.queue(e||"fx",[]),this.each(function(){var t=!0,i=null!=e&&e+"queueHooks",o=w.timers,a=J.get(this);if(i)a[i]&&a[i].stop&&r(a[i]);else for(i in a)a[i]&&a[i].stop&&ot.test(i)&&r(a[i]);for(i=o.length;i--;)o[i].elem!==this||null!=e&&o[i].queue!==e||(o[i].anim.stop(n),t=!1,o.splice(i,1));!t&&n||w.dequeue(this,e)})},finish:function(e){return!1!==e&&(e=e||"fx"),this.each(function(){var t,n=J.get(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=w.timers,a=r?r.length:0;for(n.finish=!0,w.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;t<a;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}}),w.each(["toggle","show","hide"],function(e,t){var n=w.fn[t];w.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(ut(t,!0),e,r,i)}}),w.each({slideDown:ut("show"),slideUp:ut("hide"),slideToggle:ut("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){w.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),w.timers=[],w.fx.tick=function(){var e,t=0,n=w.timers;for(nt=Date.now();t<n.length;t++)(e=n[t])()||n[t]!==e||n.splice(t--,1);n.length||w.fx.stop(),nt=void 0},w.fx.timer=function(e){w.timers.push(e),w.fx.start()},w.fx.interval=13,w.fx.start=function(){rt||(rt=!0,at())},w.fx.stop=function(){rt=null},w.fx.speeds={slow:600,fast:200,_default:400},w.fn.delay=function(t,n){return t=w.fx?w.fx.speeds[t]||t:t,n=n||"fx",this.queue(n,function(n,r){var i=e.setTimeout(n,t);r.stop=function(){e.clearTimeout(i)}})},function(){var e=r.createElement("input"),t=r.createElement("select").appendChild(r.createElement("option"));e.type="checkbox",h.checkOn=""!==e.value,h.optSelected=t.selected,(e=r.createElement("input")).value="t",e.type="radio",h.radioValue="t"===e.value}();var dt,ht=w.expr.attrHandle;w.fn.extend({attr:function(e,t){return z(this,w.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){w.removeAttr(this,e)})}}),w.extend({attr:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return"undefined"==typeof e.getAttribute?w.prop(e,t,n):(1===o&&w.isXMLDoc(e)||(i=w.attrHooks[t.toLowerCase()]||(w.expr.match.bool.test(t)?dt:void 0)),void 0!==n?null===n?void w.removeAttr(e,t):i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:(e.setAttribute(t,n+""),n):i&&"get"in i&&null!==(r=i.get(e,t))?r:null==(r=w.find.attr(e,t))?void 0:r)},attrHooks:{type:{set:function(e,t){if(!h.radioValue&&"radio"===t&&N(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},removeAttr:function(e,t){var n,r=0,i=t&&t.match(M);if(i&&1===e.nodeType)while(n=i[r++])e.removeAttribute(n)}}),dt={set:function(e,t,n){return!1===t?w.removeAttr(e,n):e.setAttribute(n,n),n}},w.each(w.expr.match.bool.source.match(/\w+/g),function(e,t){var n=ht[t]||w.find.attr;ht[t]=function(e,t,r){var i,o,a=t.toLowerCase();return r||(o=ht[a],ht[a]=i,i=null!=n(e,t,r)?a:null,ht[a]=o),i}});var gt=/^(?:input|select|textarea|button)$/i,yt=/^(?:a|area)$/i;w.fn.extend({prop:function(e,t){return z(this,w.prop,e,t,arguments.length>1)},removeProp:function(e){return this.each(function(){delete this[w.propFix[e]||e]})}}),w.extend({prop:function(e,t,n){var r,i,o=e.nodeType;if(3!==o&&8!==o&&2!==o)return 1===o&&w.isXMLDoc(e)||(t=w.propFix[t]||t,i=w.propHooks[t]),void 0!==n?i&&"set"in i&&void 0!==(r=i.set(e,n,t))?r:e[t]=n:i&&"get"in i&&null!==(r=i.get(e,t))?r:e[t]},propHooks:{tabIndex:{get:function(e){var t=w.find.attr(e,"tabindex");return t?parseInt(t,10):gt.test(e.nodeName)||yt.test(e.nodeName)&&e.href?0:-1}}},propFix:{"for":"htmlFor","class":"className"}}),h.optSelected||(w.propHooks.selected={get:function(e){var t=e.parentNode;return t&&t.parentNode&&t.parentNode.selectedIndex,null},set:function(e){var t=e.parentNode;t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex)}}),w.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){w.propFix[this.toLowerCase()]=this});function vt(e){return(e.match(M)||[]).join(" ")}function mt(e){return e.getAttribute&&e.getAttribute("class")||""}function xt(e){return Array.isArray(e)?e:"string"==typeof e?e.match(M)||[]:[]}w.fn.extend({addClass:function(e){var t,n,r,i,o,a,s,u=0;if(g(e))return this.each(function(t){w(this).addClass(e.call(this,t,mt(this)))});if((t=xt(e)).length)while(n=this[u++])if(i=mt(n),r=1===n.nodeType&&" "+vt(i)+" "){a=0;while(o=t[a++])r.indexOf(" "+o+" ")<0&&(r+=o+" ");i!==(s=vt(r))&&n.setAttribute("class",s)}return this},removeClass:function(e){var t,n,r,i,o,a,s,u=0;if(g(e))return this.each(function(t){w(this).removeClass(e.call(this,t,mt(this)))});if(!arguments.length)return this.attr("class","");if((t=xt(e)).length)while(n=this[u++])if(i=mt(n),r=1===n.nodeType&&" "+vt(i)+" "){a=0;while(o=t[a++])while(r.indexOf(" "+o+" ")>-1)r=r.replace(" "+o+" "," ");i!==(s=vt(r))&&n.setAttribute("class",s)}return this},toggleClass:function(e,t){var n=typeof e,r="string"===n||Array.isArray(e);return"boolean"==typeof t&&r?t?this.addClass(e):this.removeClass(e):g(e)?this.each(function(n){w(this).toggleClass(e.call(this,n,mt(this),t),t)}):this.each(function(){var t,i,o,a;if(r){i=0,o=w(this),a=xt(e);while(t=a[i++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else void 0!==e&&"boolean"!==n||((t=mt(this))&&J.set(this,"__className__",t),this.setAttribute&&this.setAttribute("class",t||!1===e?"":J.get(this,"__className__")||""))})},hasClass:function(e){var t,n,r=0;t=" "+e+" ";while(n=this[r++])if(1===n.nodeType&&(" "+vt(mt(n))+" ").indexOf(t)>-1)return!0;return!1}});var bt=/\r/g;w.fn.extend({val:function(e){var t,n,r,i=this[0];{if(arguments.length)return r=g(e),this.each(function(n){var i;1===this.nodeType&&(null==(i=r?e.call(this,n,w(this).val()):e)?i="":"number"==typeof i?i+="":Array.isArray(i)&&(i=w.map(i,function(e){return null==e?"":e+""})),(t=w.valHooks[this.type]||w.valHooks[this.nodeName.toLowerCase()])&&"set"in t&&void 0!==t.set(this,i,"value")||(this.value=i))});if(i)return(t=w.valHooks[i.type]||w.valHooks[i.nodeName.toLowerCase()])&&"get"in t&&void 0!==(n=t.get(i,"value"))?n:"string"==typeof(n=i.value)?n.replace(bt,""):null==n?"":n}}}),w.extend({valHooks:{option:{get:function(e){var t=w.find.attr(e,"value");return null!=t?t:vt(w.text(e))}},select:{get:function(e){var t,n,r,i=e.options,o=e.selectedIndex,a="select-one"===e.type,s=a?null:[],u=a?o+1:i.length;for(r=o<0?u:a?o:0;r<u;r++)if(((n=i[r]).selected||r===o)&&!n.disabled&&(!n.parentNode.disabled||!N(n.parentNode,"optgroup"))){if(t=w(n).val(),a)return t;s.push(t)}return s},set:function(e,t){var n,r,i=e.options,o=w.makeArray(t),a=i.length;while(a--)((r=i[a]).selected=w.inArray(w.valHooks.option.get(r),o)>-1)&&(n=!0);return n||(e.selectedIndex=-1),o}}}}),w.each(["radio","checkbox"],function(){w.valHooks[this]={set:function(e,t){if(Array.isArray(t))return e.checked=w.inArray(w(e).val(),t)>-1}},h.checkOn||(w.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})}),h.focusin="onfocusin"in e;var wt=/^(?:focusinfocus|focusoutblur)$/,Tt=function(e){e.stopPropagation()};w.extend(w.event,{trigger:function(t,n,i,o){var a,s,u,l,c,p,d,h,v=[i||r],m=f.call(t,"type")?t.type:t,x=f.call(t,"namespace")?t.namespace.split("."):[];if(s=h=u=i=i||r,3!==i.nodeType&&8!==i.nodeType&&!wt.test(m+w.event.triggered)&&(m.indexOf(".")>-1&&(m=(x=m.split(".")).shift(),x.sort()),c=m.indexOf(":")<0&&"on"+m,t=t[w.expando]?t:new w.Event(m,"object"==typeof t&&t),t.isTrigger=o?2:3,t.namespace=x.join("."),t.rnamespace=t.namespace?new RegExp("(^|\\.)"+x.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,t.result=void 0,t.target||(t.target=i),n=null==n?[t]:w.makeArray(n,[t]),d=w.event.special[m]||{},o||!d.trigger||!1!==d.trigger.apply(i,n))){if(!o&&!d.noBubble&&!y(i)){for(l=d.delegateType||m,wt.test(l+m)||(s=s.parentNode);s;s=s.parentNode)v.push(s),u=s;u===(i.ownerDocument||r)&&v.push(u.defaultView||u.parentWindow||e)}a=0;while((s=v[a++])&&!t.isPropagationStopped())h=s,t.type=a>1?l:d.bindType||m,(p=(J.get(s,"events")||{})[t.type]&&J.get(s,"handle"))&&p.apply(s,n),(p=c&&s[c])&&p.apply&&Y(s)&&(t.result=p.apply(s,n),!1===t.result&&t.preventDefault());return t.type=m,o||t.isDefaultPrevented()||d._default&&!1!==d._default.apply(v.pop(),n)||!Y(i)||c&&g(i[m])&&!y(i)&&((u=i[c])&&(i[c]=null),w.event.triggered=m,t.isPropagationStopped()&&h.addEventListener(m,Tt),i[m](),t.isPropagationStopped()&&h.removeEventListener(m,Tt),w.event.triggered=void 0,u&&(i[c]=u)),t.result}},simulate:function(e,t,n){var r=w.extend(new w.Event,n,{type:e,isSimulated:!0});w.event.trigger(r,null,t)}}),w.fn.extend({trigger:function(e,t){return this.each(function(){w.event.trigger(e,t,this)})},triggerHandler:function(e,t){var n=this[0];if(n)return w.event.trigger(e,t,n,!0)}}),h.focusin||w.each({focus:"focusin",blur:"focusout"},function(e,t){var n=function(e){w.event.simulate(t,e.target,w.event.fix(e))};w.event.special[t]={setup:function(){var r=this.ownerDocument||this,i=J.access(r,t);i||r.addEventListener(e,n,!0),J.access(r,t,(i||0)+1)},teardown:function(){var r=this.ownerDocument||this,i=J.access(r,t)-1;i?J.access(r,t,i):(r.removeEventListener(e,n,!0),J.remove(r,t))}}});var Ct=e.location,Et=Date.now(),kt=/\?/;w.parseXML=function(t){var n;if(!t||"string"!=typeof t)return null;try{n=(new e.DOMParser).parseFromString(t,"text/xml")}catch(e){n=void 0}return n&&!n.getElementsByTagName("parsererror").length||w.error("Invalid XML: "+t),n};var St=/\[\]$/,Dt=/\r?\n/g,Nt=/^(?:submit|button|image|reset|file)$/i,At=/^(?:input|select|textarea|keygen)/i;function jt(e,t,n,r){var i;if(Array.isArray(t))w.each(t,function(t,i){n||St.test(e)?r(e,i):jt(e+"["+("object"==typeof i&&null!=i?t:"")+"]",i,n,r)});else if(n||"object"!==x(t))r(e,t);else for(i in t)jt(e+"["+i+"]",t[i],n,r)}w.param=function(e,t){var n,r=[],i=function(e,t){var n=g(t)?t():t;r[r.length]=encodeURIComponent(e)+"="+encodeURIComponent(null==n?"":n)};if(Array.isArray(e)||e.jquery&&!w.isPlainObject(e))w.each(e,function(){i(this.name,this.value)});else for(n in e)jt(n,e[n],t,i);return r.join("&")},w.fn.extend({serialize:function(){return w.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=w.prop(this,"elements");return e?w.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!w(this).is(":disabled")&&At.test(this.nodeName)&&!Nt.test(e)&&(this.checked||!pe.test(e))}).map(function(e,t){var n=w(this).val();return null==n?null:Array.isArray(n)?w.map(n,function(e){return{name:t.name,value:e.replace(Dt,"\r\n")}}):{name:t.name,value:n.replace(Dt,"\r\n")}}).get()}});var qt=/%20/g,Lt=/#.*$/,Ht=/([?&])_=[^&]*/,Ot=/^(.*?):[ \t]*([^\r\n]*)$/gm,Pt=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Mt=/^(?:GET|HEAD)$/,Rt=/^\/\//,It={},Wt={},$t="*/".concat("*"),Bt=r.createElement("a");Bt.href=Ct.href;function Ft(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(M)||[];if(g(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function _t(e,t,n,r){var i={},o=e===Wt;function a(s){var u;return i[s]=!0,w.each(e[s]||[],function(e,s){var l=s(t,n,r);return"string"!=typeof l||o||i[l]?o?!(u=l):void 0:(t.dataTypes.unshift(l),a(l),!1)}),u}return a(t.dataTypes[0])||!i["*"]&&a("*")}function zt(e,t){var n,r,i=w.ajaxSettings.flatOptions||{};for(n in t)void 0!==t[n]&&((i[n]?e:r||(r={}))[n]=t[n]);return r&&w.extend(!0,e,r),e}function Xt(e,t,n){var r,i,o,a,s=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),void 0===r&&(r=e.mimeType||t.getResponseHeader("Content-Type"));if(r)for(i in s)if(s[i]&&s[i].test(r)){u.unshift(i);break}if(u[0]in n)o=u[0];else{for(i in n){if(!u[0]||e.converters[i+" "+u[0]]){o=i;break}a||(a=i)}o=o||a}if(o)return o!==u[0]&&u.unshift(o),n[o]}function Ut(e,t,n,r){var i,o,a,s,u,l={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)l[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!u&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),u=o,o=c.shift())if("*"===o)o=u;else if("*"!==u&&u!==o){if(!(a=l[u+" "+o]||l["* "+o]))for(i in l)if((s=i.split(" "))[1]===o&&(a=l[u+" "+s[0]]||l["* "+s[0]])){!0===a?a=l[i]:!0!==l[i]&&(o=s[0],c.unshift(s[1]));break}if(!0!==a)if(a&&e["throws"])t=a(t);else try{t=a(t)}catch(e){return{state:"parsererror",error:a?e:"No conversion from "+u+" to "+o}}}return{state:"success",data:t}}w.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:Ct.href,type:"GET",isLocal:Pt.test(Ct.protocol),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":$t,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/\bxml\b/,html:/\bhtml/,json:/\bjson\b/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":JSON.parse,"text xml":w.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?zt(zt(e,w.ajaxSettings),t):zt(w.ajaxSettings,e)},ajaxPrefilter:Ft(It),ajaxTransport:Ft(Wt),ajax:function(t,n){"object"==typeof t&&(n=t,t=void 0),n=n||{};var i,o,a,s,u,l,c,f,p,d,h=w.ajaxSetup({},n),g=h.context||h,y=h.context&&(g.nodeType||g.jquery)?w(g):w.event,v=w.Deferred(),m=w.Callbacks("once memory"),x=h.statusCode||{},b={},T={},C="canceled",E={readyState:0,getResponseHeader:function(e){var t;if(c){if(!s){s={};while(t=Ot.exec(a))s[t[1].toLowerCase()]=t[2]}t=s[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return c?a:null},setRequestHeader:function(e,t){return null==c&&(e=T[e.toLowerCase()]=T[e.toLowerCase()]||e,b[e]=t),this},overrideMimeType:function(e){return null==c&&(h.mimeType=e),this},statusCode:function(e){var t;if(e)if(c)E.always(e[E.status]);else for(t in e)x[t]=[x[t],e[t]];return this},abort:function(e){var t=e||C;return i&&i.abort(t),k(0,t),this}};if(v.promise(E),h.url=((t||h.url||Ct.href)+"").replace(Rt,Ct.protocol+"//"),h.type=n.method||n.type||h.method||h.type,h.dataTypes=(h.dataType||"*").toLowerCase().match(M)||[""],null==h.crossDomain){l=r.createElement("a");try{l.href=h.url,l.href=l.href,h.crossDomain=Bt.protocol+"//"+Bt.host!=l.protocol+"//"+l.host}catch(e){h.crossDomain=!0}}if(h.data&&h.processData&&"string"!=typeof h.data&&(h.data=w.param(h.data,h.traditional)),_t(It,h,n,E),c)return E;(f=w.event&&h.global)&&0==w.active++&&w.event.trigger("ajaxStart"),h.type=h.type.toUpperCase(),h.hasContent=!Mt.test(h.type),o=h.url.replace(Lt,""),h.hasContent?h.data&&h.processData&&0===(h.contentType||"").indexOf("application/x-www-form-urlencoded")&&(h.data=h.data.replace(qt,"+")):(d=h.url.slice(o.length),h.data&&(h.processData||"string"==typeof h.data)&&(o+=(kt.test(o)?"&":"?")+h.data,delete h.data),!1===h.cache&&(o=o.replace(Ht,"$1"),d=(kt.test(o)?"&":"?")+"_="+Et+++d),h.url=o+d),h.ifModified&&(w.lastModified[o]&&E.setRequestHeader("If-Modified-Since",w.lastModified[o]),w.etag[o]&&E.setRequestHeader("If-None-Match",w.etag[o])),(h.data&&h.hasContent&&!1!==h.contentType||n.contentType)&&E.setRequestHeader("Content-Type",h.contentType),E.setRequestHeader("Accept",h.dataTypes[0]&&h.accepts[h.dataTypes[0]]?h.accepts[h.dataTypes[0]]+("*"!==h.dataTypes[0]?", "+$t+"; q=0.01":""):h.accepts["*"]);for(p in h.headers)E.setRequestHeader(p,h.headers[p]);if(h.beforeSend&&(!1===h.beforeSend.call(g,E,h)||c))return E.abort();if(C="abort",m.add(h.complete),E.done(h.success),E.fail(h.error),i=_t(Wt,h,n,E)){if(E.readyState=1,f&&y.trigger("ajaxSend",[E,h]),c)return E;h.async&&h.timeout>0&&(u=e.setTimeout(function(){E.abort("timeout")},h.timeout));try{c=!1,i.send(b,k)}catch(e){if(c)throw e;k(-1,e)}}else k(-1,"No Transport");function k(t,n,r,s){var l,p,d,b,T,C=n;c||(c=!0,u&&e.clearTimeout(u),i=void 0,a=s||"",E.readyState=t>0?4:0,l=t>=200&&t<300||304===t,r&&(b=Xt(h,E,r)),b=Ut(h,b,E,l),l?(h.ifModified&&((T=E.getResponseHeader("Last-Modified"))&&(w.lastModified[o]=T),(T=E.getResponseHeader("etag"))&&(w.etag[o]=T)),204===t||"HEAD"===h.type?C="nocontent":304===t?C="notmodified":(C=b.state,p=b.data,l=!(d=b.error))):(d=C,!t&&C||(C="error",t<0&&(t=0))),E.status=t,E.statusText=(n||C)+"",l?v.resolveWith(g,[p,C,E]):v.rejectWith(g,[E,C,d]),E.statusCode(x),x=void 0,f&&y.trigger(l?"ajaxSuccess":"ajaxError",[E,h,l?p:d]),m.fireWith(g,[E,C]),f&&(y.trigger("ajaxComplete",[E,h]),--w.active||w.event.trigger("ajaxStop")))}return E},getJSON:function(e,t,n){return w.get(e,t,n,"json")},getScript:function(e,t){return w.get(e,void 0,t,"script")}}),w.each(["get","post"],function(e,t){w[t]=function(e,n,r,i){return g(n)&&(i=i||r,r=n,n=void 0),w.ajax(w.extend({url:e,type:t,dataType:i,data:n,success:r},w.isPlainObject(e)&&e))}}),w._evalUrl=function(e){return w.ajax({url:e,type:"GET",dataType:"script",cache:!0,async:!1,global:!1,"throws":!0})},w.fn.extend({wrapAll:function(e){var t;return this[0]&&(g(e)&&(e=e.call(this[0])),t=w(e,this[0].ownerDocument).eq(0).clone(!0),this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstElementChild)e=e.firstElementChild;return e}).append(this)),this},wrapInner:function(e){return g(e)?this.each(function(t){w(this).wrapInner(e.call(this,t))}):this.each(function(){var t=w(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=g(e);return this.each(function(n){w(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(e){return this.parent(e).not("body").each(function(){w(this).replaceWith(this.childNodes)}),this}}),w.expr.pseudos.hidden=function(e){return!w.expr.pseudos.visible(e)},w.expr.pseudos.visible=function(e){return!!(e.offsetWidth||e.offsetHeight||e.getClientRects().length)},w.ajaxSettings.xhr=function(){try{return new e.XMLHttpRequest}catch(e){}};var Vt={0:200,1223:204},Gt=w.ajaxSettings.xhr();h.cors=!!Gt&&"withCredentials"in Gt,h.ajax=Gt=!!Gt,w.ajaxTransport(function(t){var n,r;if(h.cors||Gt&&!t.crossDomain)return{send:function(i,o){var a,s=t.xhr();if(s.open(t.type,t.url,t.async,t.username,t.password),t.xhrFields)for(a in t.xhrFields)s[a]=t.xhrFields[a];t.mimeType&&s.overrideMimeType&&s.overrideMimeType(t.mimeType),t.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");for(a in i)s.setRequestHeader(a,i[a]);n=function(e){return function(){n&&(n=r=s.onload=s.onerror=s.onabort=s.ontimeout=s.onreadystatechange=null,"abort"===e?s.abort():"error"===e?"number"!=typeof s.status?o(0,"error"):o(s.status,s.statusText):o(Vt[s.status]||s.status,s.statusText,"text"!==(s.responseType||"text")||"string"!=typeof s.responseText?{binary:s.response}:{text:s.responseText},s.getAllResponseHeaders()))}},s.onload=n(),r=s.onerror=s.ontimeout=n("error"),void 0!==s.onabort?s.onabort=r:s.onreadystatechange=function(){4===s.readyState&&e.setTimeout(function(){n&&r()})},n=n("abort");try{s.send(t.hasContent&&t.data||null)}catch(e){if(n)throw e}},abort:function(){n&&n()}}}),w.ajaxPrefilter(function(e){e.crossDomain&&(e.contents.script=!1)}),w.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/\b(?:java|ecma)script\b/},converters:{"text script":function(e){return w.globalEval(e),e}}}),w.ajaxPrefilter("script",function(e){void 0===e.cache&&(e.cache=!1),e.crossDomain&&(e.type="GET")}),w.ajaxTransport("script",function(e){if(e.crossDomain){var t,n;return{send:function(i,o){t=w("<script>").prop({charset:e.scriptCharset,src:e.url}).on("load error",n=function(e){t.remove(),n=null,e&&o("error"===e.type?404:200,e.type)}),r.head.appendChild(t[0])},abort:function(){n&&n()}}}});var Yt=[],Qt=/(=)\?(?=&|$)|\?\?/;w.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Yt.pop()||w.expando+"_"+Et++;return this[e]=!0,e}}),w.ajaxPrefilter("json jsonp",function(t,n,r){var i,o,a,s=!1!==t.jsonp&&(Qt.test(t.url)?"url":"string"==typeof t.data&&0===(t.contentType||"").indexOf("application/x-www-form-urlencoded")&&Qt.test(t.data)&&"data");if(s||"jsonp"===t.dataTypes[0])return i=t.jsonpCallback=g(t.jsonpCallback)?t.jsonpCallback():t.jsonpCallback,s?t[s]=t[s].replace(Qt,"$1"+i):!1!==t.jsonp&&(t.url+=(kt.test(t.url)?"&":"?")+t.jsonp+"="+i),t.converters["script json"]=function(){return a||w.error(i+" was not called"),a[0]},t.dataTypes[0]="json",o=e[i],e[i]=function(){a=arguments},r.always(function(){void 0===o?w(e).removeProp(i):e[i]=o,t[i]&&(t.jsonpCallback=n.jsonpCallback,Yt.push(i)),a&&g(o)&&o(a[0]),a=o=void 0}),"script"}),h.createHTMLDocument=function(){var e=r.implementation.createHTMLDocument("").body;return e.innerHTML="<form></form><form></form>",2===e.childNodes.length}(),w.parseHTML=function(e,t,n){if("string"!=typeof e)return[];"boolean"==typeof t&&(n=t,t=!1);var i,o,a;return t||(h.createHTMLDocument?((i=(t=r.implementation.createHTMLDocument("")).createElement("base")).href=r.location.href,t.head.appendChild(i)):t=r),o=A.exec(e),a=!n&&[],o?[t.createElement(o[1])]:(o=xe([e],t,a),a&&a.length&&w(a).remove(),w.merge([],o.childNodes))},w.fn.load=function(e,t,n){var r,i,o,a=this,s=e.indexOf(" ");return s>-1&&(r=vt(e.slice(s)),e=e.slice(0,s)),g(t)?(n=t,t=void 0):t&&"object"==typeof t&&(i="POST"),a.length>0&&w.ajax({url:e,type:i||"GET",dataType:"html",data:t}).done(function(e){o=arguments,a.html(r?w("<div>").append(w.parseHTML(e)).find(r):e)}).always(n&&function(e,t){a.each(function(){n.apply(this,o||[e.responseText,t,e])})}),this},w.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){w.fn[t]=function(e){return this.on(t,e)}}),w.expr.pseudos.animated=function(e){return w.grep(w.timers,function(t){return e===t.elem}).length},w.offset={setOffset:function(e,t,n){var r,i,o,a,s,u,l,c=w.css(e,"position"),f=w(e),p={};"static"===c&&(e.style.position="relative"),s=f.offset(),o=w.css(e,"top"),u=w.css(e,"left"),(l=("absolute"===c||"fixed"===c)&&(o+u).indexOf("auto")>-1)?(a=(r=f.position()).top,i=r.left):(a=parseFloat(o)||0,i=parseFloat(u)||0),g(t)&&(t=t.call(e,n,w.extend({},s))),null!=t.top&&(p.top=t.top-s.top+a),null!=t.left&&(p.left=t.left-s.left+i),"using"in t?t.using.call(e,p):f.css(p)}},w.fn.extend({offset:function(e){if(arguments.length)return void 0===e?this:this.each(function(t){w.offset.setOffset(this,e,t)});var t,n,r=this[0];if(r)return r.getClientRects().length?(t=r.getBoundingClientRect(),n=r.ownerDocument.defaultView,{top:t.top+n.pageYOffset,left:t.left+n.pageXOffset}):{top:0,left:0}},position:function(){if(this[0]){var e,t,n,r=this[0],i={top:0,left:0};if("fixed"===w.css(r,"position"))t=r.getBoundingClientRect();else{t=this.offset(),n=r.ownerDocument,e=r.offsetParent||n.documentElement;while(e&&(e===n.body||e===n.documentElement)&&"static"===w.css(e,"position"))e=e.parentNode;e&&e!==r&&1===e.nodeType&&((i=w(e).offset()).top+=w.css(e,"borderTopWidth",!0),i.left+=w.css(e,"borderLeftWidth",!0))}return{top:t.top-i.top-w.css(r,"marginTop",!0),left:t.left-i.left-w.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent;while(e&&"static"===w.css(e,"position"))e=e.offsetParent;return e||be})}}),w.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,t){var n="pageYOffset"===t;w.fn[e]=function(r){return z(this,function(e,r,i){var o;if(y(e)?o=e:9===e.nodeType&&(o=e.defaultView),void 0===i)return o?o[t]:e[r];o?o.scrollTo(n?o.pageXOffset:i,n?i:o.pageYOffset):e[r]=i},e,r,arguments.length)}}),w.each(["top","left"],function(e,t){w.cssHooks[t]=_e(h.pixelPosition,function(e,n){if(n)return n=Fe(e,t),We.test(n)?w(e).position()[t]+"px":n})}),w.each({Height:"height",Width:"width"},function(e,t){w.each({padding:"inner"+e,content:t,"":"outer"+e},function(n,r){w.fn[r]=function(i,o){var a=arguments.length&&(n||"boolean"!=typeof i),s=n||(!0===i||!0===o?"margin":"border");return z(this,function(t,n,i){var o;return y(t)?0===r.indexOf("outer")?t["inner"+e]:t.document.documentElement["client"+e]:9===t.nodeType?(o=t.documentElement,Math.max(t.body["scroll"+e],o["scroll"+e],t.body["offset"+e],o["offset"+e],o["client"+e])):void 0===i?w.css(t,n,s):w.style(t,n,i,s)},t,a?i:void 0,a)}})}),w.each("blur focus focusin focusout resize scroll click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup contextmenu".split(" "),function(e,t){w.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),w.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)}}),w.fn.extend({bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}}),w.proxy=function(e,t){var n,r,i;if("string"==typeof t&&(n=e[t],t=e,e=n),g(e))return r=o.call(arguments,2),i=function(){return e.apply(t||this,r.concat(o.call(arguments)))},i.guid=e.guid=e.guid||w.guid++,i},w.holdReady=function(e){e?w.readyWait++:w.ready(!0)},w.isArray=Array.isArray,w.parseJSON=JSON.parse,w.nodeName=N,w.isFunction=g,w.isWindow=y,w.camelCase=G,w.type=x,w.now=Date.now,w.isNumeric=function(e){var t=w.type(e);return("number"===t||"string"===t)&&!isNaN(e-parseFloat(e))},"function"==typeof define&&define.amd&&define("jquery",[],function(){return w});var Jt=e.jQuery,Kt=e.$;return w.noConflict=function(t){return e.$===w&&(e.$=Kt),t&&e.jQuery===w&&(e.jQuery=Jt),w},t||(e.jQuery=e.$=w),w});
