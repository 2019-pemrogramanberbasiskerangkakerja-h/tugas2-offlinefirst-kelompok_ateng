var syncedDB =
/******/ (function(modules) { // webpackBootstrap
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

	module.exports = __webpack_require__(1);


/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var dffptch = __webpack_require__(2);
	var SDBDatabase = __webpack_require__(3);

	var patch = dffptch.patch;

	var diff = dffptch.diff;

	var open = function open(opts) {
	  return new SDBDatabase(opts);
	};

	module.exports = { patch: patch, diff: diff, open: open };

/***/ }),
/* 2 */
/***/ (function(module, exports) {

	// dffptch

	var O = Object; // Our own binding to Object – global objects can't be minified
	var keys = O.keys; // Same for keys, we use this funcion quite a bit

	var dffptch = {
	  diff: function diff(a, b) {
	    var aKeys = keys(a).sort(),
	        bKeys = keys(b).sort(),
	        delta = {}, adds = {}, mods = {}, dels = [], recurses = {},
	        aI = 0, bI = 0;
	    // Continue looping as long as we haven't reached the end of both keys lists
	    while(aKeys[aI] || bKeys[bI]) {
	      var aKey = aKeys[aI], shortAKey = String.fromCharCode(aI+48),
	          bKey = bKeys[bI],
	          aVal = a[aKey], bVal = b[bKey];
	      if (aKey == bKey) {
	        // We are looking at two equal keys this is a
	        // change – possibly to an object or array
	        if (O(aVal) === aVal && O(bVal) === bVal) {
	          // Find changs in the object recursively
	          var rDelta = diff(aVal, bVal);
	          // Add recursive delta if it contains modifications
	          if(keys(rDelta)[0]) recurses[shortAKey] = rDelta;
	        } else if (aVal !== bVal) {
	          mods[shortAKey] = bVal;
	        }
	        aI++; bI++;
	      } else if (aKey > bKey || !aKey) {
	        // aKey is ahead, this means keys have been added to b
	        adds[bKey] = bVal;
	        bI++;
	      } else {
	        // bKey is larger, keys have been deleted
	        dels.push(shortAKey);
	        aI++;
	      }
	    }
	    // We only add the change types to delta if they contains changes
	    if (dels[0]) delta.d = dels;
	    if (keys(adds)[0]) delta.a = adds;
	    if (keys(mods)[0]) delta.m = mods;
	    if (keys(recurses)[0]) delta.r = recurses;
	    return delta;
	  },
	  patch: function patch(obj, delta) {
	    var operation, key, val, longKey, objKeys = keys(obj).sort();
	    for (operation in delta) {
	      // Operation is either 'a', 'm', 'd' or 'r'
	      for (key in delta[operation]) {
	        val = delta[operation][key];
	        longKey = objKeys[(operation != 'd' ? key : val).charCodeAt()-48];
	        operation == 'a' ? obj[key] = val : // addition
	        operation == 'm' ? obj[longKey] = val : // modification
	        operation == 'd' ? delete obj[longKey] : // deletion
	                          patch(obj[longKey], val); // recuse
	      }
	    }
	  }
	};
	module.exports = dffptch;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var _ = __webpack_require__(4);

	var _require = __webpack_require__(4),
	    isString = _require.isString,
	    isFunction = _require.isFunction,
	    isObject = _require.isObject,
	    partial = _require.partial,
	    isArray = _require.isArray;

	var _require2 = __webpack_require__(6),
	    closeSyncContext = _require2.closeSyncContext,
	    doPullFromRemote = _require2.doPullFromRemote,
	    getSyncContext = _require2.getSyncContext,
	    getWs = _require2.getWs,
	    doPushToRemote = _require2.doPushToRemote;

	var SDBObjectStore = __webpack_require__(11);
	var Events = __webpack_require__(10);
	var Countdown = __webpack_require__(8);

	var SDBDatabase = function () {
	  function SDBDatabase(opts) {
	    var _this = this;

	    _classCallCheck(this, SDBDatabase);

	    Events(this);
	    this.name = opts.name;
	    if (opts.remote) {
	      // For compatibility
	      this.url = 'ws://' + opts.remote;
	    } else {
	      this.url = opts.url;
	    }
	    this.version = opts.version;
	    this.recordsToSync = new Countdown();
	    this.changesLeftFromRemote = new Countdown();
	    this.messages = new Events();
	    this.recordsSentToRemote = {}; // Dictionary of records sent
	    this.stores = {};
	    var stores = {};
	    _.each(opts.stores, function (indexes, storeName) {
	      stores[storeName] = indexes.concat([['changedSinceSync', 'changedSinceSync']]);
	    });
	    // Create stores on db object
	    _.each(stores, function (indexes, storeName) {
	      var indexNames = indexes.map(function (idx) {
	        return idx[0];
	      });
	      var storeObj = new SDBObjectStore(_this, storeName, indexNames);
	      _this.stores[storeName] = storeObj;
	      // Make stores available directly as properties on the db
	      // Store shortcut should not override db properties
	      _this[storeName] = _this[storeName] || storeObj;
	    });
	    this.sdbMetaData = new SDBObjectStore(this, 'sdbMetaData', []);
	    this.promise = new Promise(function (resolve, reject) {
	      var req = indexedDB.open(_this.name, _this.version);
	      req.onupgradeneeded = partial(handleMigrations, _this.version, stores, opts.migrations);
	      req.onsuccess = function (e) {
	        _this.db = req.result;
	        _this.db.onversionchange = handleVersionChange;
	        resolve({ db: _this, e: e });
	      };
	    });
	  }

	  _createClass(SDBDatabase, [{
	    key: 'then',
	    value: function then(fn) {
	      return this.promise.then(fn);
	    }
	  }, {
	    key: 'catch',
	    value: function _catch(fn) {
	      return this.promise.catch(fn);
	    }
	  }, {
	    key: 'transaction',
	    value: function transaction(storeNames, mode, fn) {
	      var _this2 = this;

	      storeNames = [].concat(storeNames);
	      mode = mode === 'r' ? 'readonly' : mode === 'read' ? 'readonly' : mode === 'rw' ? 'readwrite' : mode;
	      return this.then(function (res) {
	        return new Promise(function (resolve, reject) {
	          var tx = _this2.db.transaction(storeNames, mode);
	          var stores = storeNames.map(function (s) {
	            var store = s === 'sdbMetaData' ? _this2[s] : _this2.stores[s];
	            return new SDBObjectStore(_this2, s, store.indexes, tx);
	          });
	          tx.oncomplete = resolve;
	          fn.apply(null, stores);
	        });
	      });
	    }
	  }, {
	    key: 'read',
	    value: function read() {
	      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
	        args[_key] = arguments[_key];
	      }

	      var fn = args.pop();
	      return this.transaction(args, 'r', fn);
	    }
	  }, {
	    key: 'write',
	    value: function write() {
	      for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	        args[_key2] = arguments[_key2];
	      }

	      var fn = args.pop();
	      return this.transaction(args, 'rw', fn);
	    }
	  }, {
	    key: 'connect',
	    value: function connect() {
	      var _this3 = this;

	      return this.then(function () {
	        return getWs(_this3).then(function () {});
	      });
	    }
	  }, {
	    key: 'disconnect',
	    value: function disconnect() {
	      if (this.ws) {
	        this.ws.close();
	        this.wsPromise = null;
	      }
	    }
	  }, {
	    key: 'send',
	    value: function send(msg) {
	      return getWs(this).then(function (ws) {
	        ws.send(msg);
	      });
	    }
	  }, {
	    key: 'pushToRemote',
	    value: function pushToRemote() {
	      for (var _len3 = arguments.length, storeNames = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
	        storeNames[_key3] = arguments[_key3];
	      }

	      return getSyncContext(this, storeNames).then(doPushToRemote).then(closeSyncContext);
	    }
	  }, {
	    key: 'pullFromRemote',
	    value: function pullFromRemote() {
	      for (var _len4 = arguments.length, storeNames = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
	        storeNames[_key4] = arguments[_key4];
	      }

	      return getSyncContext(this, storeNames).then(doPullFromRemote).then(closeSyncContext);
	    }
	  }, {
	    key: 'sync',
	    value: function sync(storeNames, opts) {
	      if (arguments.length === 1 && !isArray(storeNames)) {
	        opts = storeNames;
	      }
	      storeNames = isString(storeNames) ? [storeNames] : !isArray(storeNames) ? [] : storeNames;
	      var continuously = isObject(opts) && opts.continuously === true;
	      return doSync(this, continuously, storeNames);
	    }
	  }]);

	  return SDBDatabase;
	}();

	module.exports = SDBDatabase;

	function handleMigrations(version, storeDeclaration, migrationHooks, e) {
	  var req = e.target;
	  var db = req.result;
	  var existingStores = db.objectStoreNames;
	  var metaStore = void 0;
	  if (existingStores.contains('sdbMetaData')) {
	    metaStore = req.transaction.objectStore('sdbMetaData');
	  } else {
	    metaStore = db.createObjectStore('sdbMetaData', { keyPath: 'key' });
	    metaStore.put({ key: 'meta' });
	  }
	  _.each(storeDeclaration, function (indexes, storeName) {
	    var store = void 0;
	    if (existingStores.contains(storeName)) {
	      store = req.transaction.objectStore(storeName);
	    } else {
	      store = db.createObjectStore(storeName, { keyPath: 'key' });
	      metaStore.put({ key: storeName + 'Meta', syncedTo: null });
	    }
	    indexes.forEach(function (index) {
	      if (!store.indexNames.contains(index[0])) store.createIndex.apply(store, index);
	    });
	  });
	  if (migrationHooks) callMigrationHooks({ db: db, e: e }, migrationHooks, version, e.oldVersion);
	}

	function handleVersionChange(e) {
	  // The database is being deleted or opened with
	  // a newer version, possibly in another tab
	  e.target.close();
	}

	function callMigrationHooks(data, migrations, newV, curV) {
	  while (curV++ < newV) {
	    if (isFunction(migrations[curV])) migrations[curV](data.db, data.e);
	  }
	}

	function doSync(db, continuously, storeNames) {
	  return getSyncContext(db, storeNames).then(doPullFromRemote).then(doPushToRemote).then(function (ctx) {
	    continuously ? db.continuousSync = true : closeSyncContext(ctx);
	  });
	}

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(global, module) {//     Underscore.js 1.9.1
	//     http://underscorejs.org
	//     (c) 2009-2018 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	//     Underscore may be freely distributed under the MIT license.

	(function() {

	  // Baseline setup
	  // --------------

	  // Establish the root object, `window` (`self`) in the browser, `global`
	  // on the server, or `this` in some virtual machines. We use `self`
	  // instead of `window` for `WebWorker` support.
	  var root = typeof self == 'object' && self.self === self && self ||
	            typeof global == 'object' && global.global === global && global ||
	            this ||
	            {};

	  // Save the previous value of the `_` variable.
	  var previousUnderscore = root._;

	  // Save bytes in the minified (but not gzipped) version:
	  var ArrayProto = Array.prototype, ObjProto = Object.prototype;
	  var SymbolProto = typeof Symbol !== 'undefined' ? Symbol.prototype : null;

	  // Create quick reference variables for speed access to core prototypes.
	  var push = ArrayProto.push,
	      slice = ArrayProto.slice,
	      toString = ObjProto.toString,
	      hasOwnProperty = ObjProto.hasOwnProperty;

	  // All **ECMAScript 5** native function implementations that we hope to use
	  // are declared here.
	  var nativeIsArray = Array.isArray,
	      nativeKeys = Object.keys,
	      nativeCreate = Object.create;

	  // Naked function reference for surrogate-prototype-swapping.
	  var Ctor = function(){};

	  // Create a safe reference to the Underscore object for use below.
	  var _ = function(obj) {
	    if (obj instanceof _) return obj;
	    if (!(this instanceof _)) return new _(obj);
	    this._wrapped = obj;
	  };

	  // Export the Underscore object for **Node.js**, with
	  // backwards-compatibility for their old module API. If we're in
	  // the browser, add `_` as a global object.
	  // (`nodeType` is checked to ensure that `module`
	  // and `exports` are not HTML elements.)
	  if (typeof exports != 'undefined' && !exports.nodeType) {
	    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
	      exports = module.exports = _;
	    }
	    exports._ = _;
	  } else {
	    root._ = _;
	  }

	  // Current version.
	  _.VERSION = '1.9.1';

	  // Internal function that returns an efficient (for current engines) version
	  // of the passed-in callback, to be repeatedly applied in other Underscore
	  // functions.
	  var optimizeCb = function(func, context, argCount) {
	    if (context === void 0) return func;
	    switch (argCount == null ? 3 : argCount) {
	      case 1: return function(value) {
	        return func.call(context, value);
	      };
	      // The 2-argument case is omitted because we’re not using it.
	      case 3: return function(value, index, collection) {
	        return func.call(context, value, index, collection);
	      };
	      case 4: return function(accumulator, value, index, collection) {
	        return func.call(context, accumulator, value, index, collection);
	      };
	    }
	    return function() {
	      return func.apply(context, arguments);
	    };
	  };

	  var builtinIteratee;

	  // An internal function to generate callbacks that can be applied to each
	  // element in a collection, returning the desired result — either `identity`,
	  // an arbitrary callback, a property matcher, or a property accessor.
	  var cb = function(value, context, argCount) {
	    if (_.iteratee !== builtinIteratee) return _.iteratee(value, context);
	    if (value == null) return _.identity;
	    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
	    if (_.isObject(value) && !_.isArray(value)) return _.matcher(value);
	    return _.property(value);
	  };

	  // External wrapper for our callback generator. Users may customize
	  // `_.iteratee` if they want additional predicate/iteratee shorthand styles.
	  // This abstraction hides the internal-only argCount argument.
	  _.iteratee = builtinIteratee = function(value, context) {
	    return cb(value, context, Infinity);
	  };

	  // Some functions take a variable number of arguments, or a few expected
	  // arguments at the beginning and then a variable number of values to operate
	  // on. This helper accumulates all remaining arguments past the function’s
	  // argument length (or an explicit `startIndex`), into an array that becomes
	  // the last argument. Similar to ES6’s "rest parameter".
	  var restArguments = function(func, startIndex) {
	    startIndex = startIndex == null ? func.length - 1 : +startIndex;
	    return function() {
	      var length = Math.max(arguments.length - startIndex, 0),
	          rest = Array(length),
	          index = 0;
	      for (; index < length; index++) {
	        rest[index] = arguments[index + startIndex];
	      }
	      switch (startIndex) {
	        case 0: return func.call(this, rest);
	        case 1: return func.call(this, arguments[0], rest);
	        case 2: return func.call(this, arguments[0], arguments[1], rest);
	      }
	      var args = Array(startIndex + 1);
	      for (index = 0; index < startIndex; index++) {
	        args[index] = arguments[index];
	      }
	      args[startIndex] = rest;
	      return func.apply(this, args);
	    };
	  };

	  // An internal function for creating a new object that inherits from another.
	  var baseCreate = function(prototype) {
	    if (!_.isObject(prototype)) return {};
	    if (nativeCreate) return nativeCreate(prototype);
	    Ctor.prototype = prototype;
	    var result = new Ctor;
	    Ctor.prototype = null;
	    return result;
	  };

	  var shallowProperty = function(key) {
	    return function(obj) {
	      return obj == null ? void 0 : obj[key];
	    };
	  };

	  var has = function(obj, path) {
	    return obj != null && hasOwnProperty.call(obj, path);
	  }

	  var deepGet = function(obj, path) {
	    var length = path.length;
	    for (var i = 0; i < length; i++) {
	      if (obj == null) return void 0;
	      obj = obj[path[i]];
	    }
	    return length ? obj : void 0;
	  };

	  // Helper for collection methods to determine whether a collection
	  // should be iterated as an array or as an object.
	  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
	  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
	  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
	  var getLength = shallowProperty('length');
	  var isArrayLike = function(collection) {
	    var length = getLength(collection);
	    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
	  };

	  // Collection Functions
	  // --------------------

	  // The cornerstone, an `each` implementation, aka `forEach`.
	  // Handles raw objects in addition to array-likes. Treats all
	  // sparse array-likes as if they were dense.
	  _.each = _.forEach = function(obj, iteratee, context) {
	    iteratee = optimizeCb(iteratee, context);
	    var i, length;
	    if (isArrayLike(obj)) {
	      for (i = 0, length = obj.length; i < length; i++) {
	        iteratee(obj[i], i, obj);
	      }
	    } else {
	      var keys = _.keys(obj);
	      for (i = 0, length = keys.length; i < length; i++) {
	        iteratee(obj[keys[i]], keys[i], obj);
	      }
	    }
	    return obj;
	  };

	  // Return the results of applying the iteratee to each element.
	  _.map = _.collect = function(obj, iteratee, context) {
	    iteratee = cb(iteratee, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length,
	        results = Array(length);
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      results[index] = iteratee(obj[currentKey], currentKey, obj);
	    }
	    return results;
	  };

	  // Create a reducing function iterating left or right.
	  var createReduce = function(dir) {
	    // Wrap code that reassigns argument variables in a separate function than
	    // the one that accesses `arguments.length` to avoid a perf hit. (#1991)
	    var reducer = function(obj, iteratee, memo, initial) {
	      var keys = !isArrayLike(obj) && _.keys(obj),
	          length = (keys || obj).length,
	          index = dir > 0 ? 0 : length - 1;
	      if (!initial) {
	        memo = obj[keys ? keys[index] : index];
	        index += dir;
	      }
	      for (; index >= 0 && index < length; index += dir) {
	        var currentKey = keys ? keys[index] : index;
	        memo = iteratee(memo, obj[currentKey], currentKey, obj);
	      }
	      return memo;
	    };

	    return function(obj, iteratee, memo, context) {
	      var initial = arguments.length >= 3;
	      return reducer(obj, optimizeCb(iteratee, context, 4), memo, initial);
	    };
	  };

	  // **Reduce** builds up a single result from a list of values, aka `inject`,
	  // or `foldl`.
	  _.reduce = _.foldl = _.inject = createReduce(1);

	  // The right-associative version of reduce, also known as `foldr`.
	  _.reduceRight = _.foldr = createReduce(-1);

	  // Return the first value which passes a truth test. Aliased as `detect`.
	  _.find = _.detect = function(obj, predicate, context) {
	    var keyFinder = isArrayLike(obj) ? _.findIndex : _.findKey;
	    var key = keyFinder(obj, predicate, context);
	    if (key !== void 0 && key !== -1) return obj[key];
	  };

	  // Return all the elements that pass a truth test.
	  // Aliased as `select`.
	  _.filter = _.select = function(obj, predicate, context) {
	    var results = [];
	    predicate = cb(predicate, context);
	    _.each(obj, function(value, index, list) {
	      if (predicate(value, index, list)) results.push(value);
	    });
	    return results;
	  };

	  // Return all the elements for which a truth test fails.
	  _.reject = function(obj, predicate, context) {
	    return _.filter(obj, _.negate(cb(predicate)), context);
	  };

	  // Determine whether all of the elements match a truth test.
	  // Aliased as `all`.
	  _.every = _.all = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      if (!predicate(obj[currentKey], currentKey, obj)) return false;
	    }
	    return true;
	  };

	  // Determine if at least one element in the object matches a truth test.
	  // Aliased as `any`.
	  _.some = _.any = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      if (predicate(obj[currentKey], currentKey, obj)) return true;
	    }
	    return false;
	  };

	  // Determine if the array or object contains a given item (using `===`).
	  // Aliased as `includes` and `include`.
	  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
	    if (!isArrayLike(obj)) obj = _.values(obj);
	    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
	    return _.indexOf(obj, item, fromIndex) >= 0;
	  };

	  // Invoke a method (with arguments) on every item in a collection.
	  _.invoke = restArguments(function(obj, path, args) {
	    var contextPath, func;
	    if (_.isFunction(path)) {
	      func = path;
	    } else if (_.isArray(path)) {
	      contextPath = path.slice(0, -1);
	      path = path[path.length - 1];
	    }
	    return _.map(obj, function(context) {
	      var method = func;
	      if (!method) {
	        if (contextPath && contextPath.length) {
	          context = deepGet(context, contextPath);
	        }
	        if (context == null) return void 0;
	        method = context[path];
	      }
	      return method == null ? method : method.apply(context, args);
	    });
	  });

	  // Convenience version of a common use case of `map`: fetching a property.
	  _.pluck = function(obj, key) {
	    return _.map(obj, _.property(key));
	  };

	  // Convenience version of a common use case of `filter`: selecting only objects
	  // containing specific `key:value` pairs.
	  _.where = function(obj, attrs) {
	    return _.filter(obj, _.matcher(attrs));
	  };

	  // Convenience version of a common use case of `find`: getting the first object
	  // containing specific `key:value` pairs.
	  _.findWhere = function(obj, attrs) {
	    return _.find(obj, _.matcher(attrs));
	  };

	  // Return the maximum element (or element-based computation).
	  _.max = function(obj, iteratee, context) {
	    var result = -Infinity, lastComputed = -Infinity,
	        value, computed;
	    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
	      obj = isArrayLike(obj) ? obj : _.values(obj);
	      for (var i = 0, length = obj.length; i < length; i++) {
	        value = obj[i];
	        if (value != null && value > result) {
	          result = value;
	        }
	      }
	    } else {
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(v, index, list) {
	        computed = iteratee(v, index, list);
	        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
	          result = v;
	          lastComputed = computed;
	        }
	      });
	    }
	    return result;
	  };

	  // Return the minimum element (or element-based computation).
	  _.min = function(obj, iteratee, context) {
	    var result = Infinity, lastComputed = Infinity,
	        value, computed;
	    if (iteratee == null || typeof iteratee == 'number' && typeof obj[0] != 'object' && obj != null) {
	      obj = isArrayLike(obj) ? obj : _.values(obj);
	      for (var i = 0, length = obj.length; i < length; i++) {
	        value = obj[i];
	        if (value != null && value < result) {
	          result = value;
	        }
	      }
	    } else {
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(v, index, list) {
	        computed = iteratee(v, index, list);
	        if (computed < lastComputed || computed === Infinity && result === Infinity) {
	          result = v;
	          lastComputed = computed;
	        }
	      });
	    }
	    return result;
	  };

	  // Shuffle a collection.
	  _.shuffle = function(obj) {
	    return _.sample(obj, Infinity);
	  };

	  // Sample **n** random values from a collection using the modern version of the
	  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
	  // If **n** is not specified, returns a single random element.
	  // The internal `guard` argument allows it to work with `map`.
	  _.sample = function(obj, n, guard) {
	    if (n == null || guard) {
	      if (!isArrayLike(obj)) obj = _.values(obj);
	      return obj[_.random(obj.length - 1)];
	    }
	    var sample = isArrayLike(obj) ? _.clone(obj) : _.values(obj);
	    var length = getLength(sample);
	    n = Math.max(Math.min(n, length), 0);
	    var last = length - 1;
	    for (var index = 0; index < n; index++) {
	      var rand = _.random(index, last);
	      var temp = sample[index];
	      sample[index] = sample[rand];
	      sample[rand] = temp;
	    }
	    return sample.slice(0, n);
	  };

	  // Sort the object's values by a criterion produced by an iteratee.
	  _.sortBy = function(obj, iteratee, context) {
	    var index = 0;
	    iteratee = cb(iteratee, context);
	    return _.pluck(_.map(obj, function(value, key, list) {
	      return {
	        value: value,
	        index: index++,
	        criteria: iteratee(value, key, list)
	      };
	    }).sort(function(left, right) {
	      var a = left.criteria;
	      var b = right.criteria;
	      if (a !== b) {
	        if (a > b || a === void 0) return 1;
	        if (a < b || b === void 0) return -1;
	      }
	      return left.index - right.index;
	    }), 'value');
	  };

	  // An internal function used for aggregate "group by" operations.
	  var group = function(behavior, partition) {
	    return function(obj, iteratee, context) {
	      var result = partition ? [[], []] : {};
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(value, index) {
	        var key = iteratee(value, index, obj);
	        behavior(result, value, key);
	      });
	      return result;
	    };
	  };

	  // Groups the object's values by a criterion. Pass either a string attribute
	  // to group by, or a function that returns the criterion.
	  _.groupBy = group(function(result, value, key) {
	    if (has(result, key)) result[key].push(value); else result[key] = [value];
	  });

	  // Indexes the object's values by a criterion, similar to `groupBy`, but for
	  // when you know that your index values will be unique.
	  _.indexBy = group(function(result, value, key) {
	    result[key] = value;
	  });

	  // Counts instances of an object that group by a certain criterion. Pass
	  // either a string attribute to count by, or a function that returns the
	  // criterion.
	  _.countBy = group(function(result, value, key) {
	    if (has(result, key)) result[key]++; else result[key] = 1;
	  });

	  var reStrSymbol = /[^\ud800-\udfff]|[\ud800-\udbff][\udc00-\udfff]|[\ud800-\udfff]/g;
	  // Safely create a real, live array from anything iterable.
	  _.toArray = function(obj) {
	    if (!obj) return [];
	    if (_.isArray(obj)) return slice.call(obj);
	    if (_.isString(obj)) {
	      // Keep surrogate pair characters together
	      return obj.match(reStrSymbol);
	    }
	    if (isArrayLike(obj)) return _.map(obj, _.identity);
	    return _.values(obj);
	  };

	  // Return the number of elements in an object.
	  _.size = function(obj) {
	    if (obj == null) return 0;
	    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
	  };

	  // Split a collection into two arrays: one whose elements all satisfy the given
	  // predicate, and one whose elements all do not satisfy the predicate.
	  _.partition = group(function(result, value, pass) {
	    result[pass ? 0 : 1].push(value);
	  }, true);

	  // Array Functions
	  // ---------------

	  // Get the first element of an array. Passing **n** will return the first N
	  // values in the array. Aliased as `head` and `take`. The **guard** check
	  // allows it to work with `_.map`.
	  _.first = _.head = _.take = function(array, n, guard) {
	    if (array == null || array.length < 1) return n == null ? void 0 : [];
	    if (n == null || guard) return array[0];
	    return _.initial(array, array.length - n);
	  };

	  // Returns everything but the last entry of the array. Especially useful on
	  // the arguments object. Passing **n** will return all the values in
	  // the array, excluding the last N.
	  _.initial = function(array, n, guard) {
	    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
	  };

	  // Get the last element of an array. Passing **n** will return the last N
	  // values in the array.
	  _.last = function(array, n, guard) {
	    if (array == null || array.length < 1) return n == null ? void 0 : [];
	    if (n == null || guard) return array[array.length - 1];
	    return _.rest(array, Math.max(0, array.length - n));
	  };

	  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
	  // Especially useful on the arguments object. Passing an **n** will return
	  // the rest N values in the array.
	  _.rest = _.tail = _.drop = function(array, n, guard) {
	    return slice.call(array, n == null || guard ? 1 : n);
	  };

	  // Trim out all falsy values from an array.
	  _.compact = function(array) {
	    return _.filter(array, Boolean);
	  };

	  // Internal implementation of a recursive `flatten` function.
	  var flatten = function(input, shallow, strict, output) {
	    output = output || [];
	    var idx = output.length;
	    for (var i = 0, length = getLength(input); i < length; i++) {
	      var value = input[i];
	      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
	        // Flatten current level of array or arguments object.
	        if (shallow) {
	          var j = 0, len = value.length;
	          while (j < len) output[idx++] = value[j++];
	        } else {
	          flatten(value, shallow, strict, output);
	          idx = output.length;
	        }
	      } else if (!strict) {
	        output[idx++] = value;
	      }
	    }
	    return output;
	  };

	  // Flatten out an array, either recursively (by default), or just one level.
	  _.flatten = function(array, shallow) {
	    return flatten(array, shallow, false);
	  };

	  // Return a version of the array that does not contain the specified value(s).
	  _.without = restArguments(function(array, otherArrays) {
	    return _.difference(array, otherArrays);
	  });

	  // Produce a duplicate-free version of the array. If the array has already
	  // been sorted, you have the option of using a faster algorithm.
	  // The faster algorithm will not work with an iteratee if the iteratee
	  // is not a one-to-one function, so providing an iteratee will disable
	  // the faster algorithm.
	  // Aliased as `unique`.
	  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
	    if (!_.isBoolean(isSorted)) {
	      context = iteratee;
	      iteratee = isSorted;
	      isSorted = false;
	    }
	    if (iteratee != null) iteratee = cb(iteratee, context);
	    var result = [];
	    var seen = [];
	    for (var i = 0, length = getLength(array); i < length; i++) {
	      var value = array[i],
	          computed = iteratee ? iteratee(value, i, array) : value;
	      if (isSorted && !iteratee) {
	        if (!i || seen !== computed) result.push(value);
	        seen = computed;
	      } else if (iteratee) {
	        if (!_.contains(seen, computed)) {
	          seen.push(computed);
	          result.push(value);
	        }
	      } else if (!_.contains(result, value)) {
	        result.push(value);
	      }
	    }
	    return result;
	  };

	  // Produce an array that contains the union: each distinct element from all of
	  // the passed-in arrays.
	  _.union = restArguments(function(arrays) {
	    return _.uniq(flatten(arrays, true, true));
	  });

	  // Produce an array that contains every item shared between all the
	  // passed-in arrays.
	  _.intersection = function(array) {
	    var result = [];
	    var argsLength = arguments.length;
	    for (var i = 0, length = getLength(array); i < length; i++) {
	      var item = array[i];
	      if (_.contains(result, item)) continue;
	      var j;
	      for (j = 1; j < argsLength; j++) {
	        if (!_.contains(arguments[j], item)) break;
	      }
	      if (j === argsLength) result.push(item);
	    }
	    return result;
	  };

	  // Take the difference between one array and a number of other arrays.
	  // Only the elements present in just the first array will remain.
	  _.difference = restArguments(function(array, rest) {
	    rest = flatten(rest, true, true);
	    return _.filter(array, function(value){
	      return !_.contains(rest, value);
	    });
	  });

	  // Complement of _.zip. Unzip accepts an array of arrays and groups
	  // each array's elements on shared indices.
	  _.unzip = function(array) {
	    var length = array && _.max(array, getLength).length || 0;
	    var result = Array(length);

	    for (var index = 0; index < length; index++) {
	      result[index] = _.pluck(array, index);
	    }
	    return result;
	  };

	  // Zip together multiple lists into a single array -- elements that share
	  // an index go together.
	  _.zip = restArguments(_.unzip);

	  // Converts lists into objects. Pass either a single array of `[key, value]`
	  // pairs, or two parallel arrays of the same length -- one of keys, and one of
	  // the corresponding values. Passing by pairs is the reverse of _.pairs.
	  _.object = function(list, values) {
	    var result = {};
	    for (var i = 0, length = getLength(list); i < length; i++) {
	      if (values) {
	        result[list[i]] = values[i];
	      } else {
	        result[list[i][0]] = list[i][1];
	      }
	    }
	    return result;
	  };

	  // Generator function to create the findIndex and findLastIndex functions.
	  var createPredicateIndexFinder = function(dir) {
	    return function(array, predicate, context) {
	      predicate = cb(predicate, context);
	      var length = getLength(array);
	      var index = dir > 0 ? 0 : length - 1;
	      for (; index >= 0 && index < length; index += dir) {
	        if (predicate(array[index], index, array)) return index;
	      }
	      return -1;
	    };
	  };

	  // Returns the first index on an array-like that passes a predicate test.
	  _.findIndex = createPredicateIndexFinder(1);
	  _.findLastIndex = createPredicateIndexFinder(-1);

	  // Use a comparator function to figure out the smallest index at which
	  // an object should be inserted so as to maintain order. Uses binary search.
	  _.sortedIndex = function(array, obj, iteratee, context) {
	    iteratee = cb(iteratee, context, 1);
	    var value = iteratee(obj);
	    var low = 0, high = getLength(array);
	    while (low < high) {
	      var mid = Math.floor((low + high) / 2);
	      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
	    }
	    return low;
	  };

	  // Generator function to create the indexOf and lastIndexOf functions.
	  var createIndexFinder = function(dir, predicateFind, sortedIndex) {
	    return function(array, item, idx) {
	      var i = 0, length = getLength(array);
	      if (typeof idx == 'number') {
	        if (dir > 0) {
	          i = idx >= 0 ? idx : Math.max(idx + length, i);
	        } else {
	          length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
	        }
	      } else if (sortedIndex && idx && length) {
	        idx = sortedIndex(array, item);
	        return array[idx] === item ? idx : -1;
	      }
	      if (item !== item) {
	        idx = predicateFind(slice.call(array, i, length), _.isNaN);
	        return idx >= 0 ? idx + i : -1;
	      }
	      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
	        if (array[idx] === item) return idx;
	      }
	      return -1;
	    };
	  };

	  // Return the position of the first occurrence of an item in an array,
	  // or -1 if the item is not included in the array.
	  // If the array is large and already in sort order, pass `true`
	  // for **isSorted** to use binary search.
	  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
	  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

	  // Generate an integer Array containing an arithmetic progression. A port of
	  // the native Python `range()` function. See
	  // [the Python documentation](http://docs.python.org/library/functions.html#range).
	  _.range = function(start, stop, step) {
	    if (stop == null) {
	      stop = start || 0;
	      start = 0;
	    }
	    if (!step) {
	      step = stop < start ? -1 : 1;
	    }

	    var length = Math.max(Math.ceil((stop - start) / step), 0);
	    var range = Array(length);

	    for (var idx = 0; idx < length; idx++, start += step) {
	      range[idx] = start;
	    }

	    return range;
	  };

	  // Chunk a single array into multiple arrays, each containing `count` or fewer
	  // items.
	  _.chunk = function(array, count) {
	    if (count == null || count < 1) return [];
	    var result = [];
	    var i = 0, length = array.length;
	    while (i < length) {
	      result.push(slice.call(array, i, i += count));
	    }
	    return result;
	  };

	  // Function (ahem) Functions
	  // ------------------

	  // Determines whether to execute a function as a constructor
	  // or a normal function with the provided arguments.
	  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
	    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
	    var self = baseCreate(sourceFunc.prototype);
	    var result = sourceFunc.apply(self, args);
	    if (_.isObject(result)) return result;
	    return self;
	  };

	  // Create a function bound to a given object (assigning `this`, and arguments,
	  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
	  // available.
	  _.bind = restArguments(function(func, context, args) {
	    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
	    var bound = restArguments(function(callArgs) {
	      return executeBound(func, bound, context, this, args.concat(callArgs));
	    });
	    return bound;
	  });

	  // Partially apply a function by creating a version that has had some of its
	  // arguments pre-filled, without changing its dynamic `this` context. _ acts
	  // as a placeholder by default, allowing any combination of arguments to be
	  // pre-filled. Set `_.partial.placeholder` for a custom placeholder argument.
	  _.partial = restArguments(function(func, boundArgs) {
	    var placeholder = _.partial.placeholder;
	    var bound = function() {
	      var position = 0, length = boundArgs.length;
	      var args = Array(length);
	      for (var i = 0; i < length; i++) {
	        args[i] = boundArgs[i] === placeholder ? arguments[position++] : boundArgs[i];
	      }
	      while (position < arguments.length) args.push(arguments[position++]);
	      return executeBound(func, bound, this, this, args);
	    };
	    return bound;
	  });

	  _.partial.placeholder = _;

	  // Bind a number of an object's methods to that object. Remaining arguments
	  // are the method names to be bound. Useful for ensuring that all callbacks
	  // defined on an object belong to it.
	  _.bindAll = restArguments(function(obj, keys) {
	    keys = flatten(keys, false, false);
	    var index = keys.length;
	    if (index < 1) throw new Error('bindAll must be passed function names');
	    while (index--) {
	      var key = keys[index];
	      obj[key] = _.bind(obj[key], obj);
	    }
	  });

	  // Memoize an expensive function by storing its results.
	  _.memoize = function(func, hasher) {
	    var memoize = function(key) {
	      var cache = memoize.cache;
	      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
	      if (!has(cache, address)) cache[address] = func.apply(this, arguments);
	      return cache[address];
	    };
	    memoize.cache = {};
	    return memoize;
	  };

	  // Delays a function for the given number of milliseconds, and then calls
	  // it with the arguments supplied.
	  _.delay = restArguments(function(func, wait, args) {
	    return setTimeout(function() {
	      return func.apply(null, args);
	    }, wait);
	  });

	  // Defers a function, scheduling it to run after the current call stack has
	  // cleared.
	  _.defer = _.partial(_.delay, _, 1);

	  // Returns a function, that, when invoked, will only be triggered at most once
	  // during a given window of time. Normally, the throttled function will run
	  // as much as it can, without ever going more than once per `wait` duration;
	  // but if you'd like to disable the execution on the leading edge, pass
	  // `{leading: false}`. To disable execution on the trailing edge, ditto.
	  _.throttle = function(func, wait, options) {
	    var timeout, context, args, result;
	    var previous = 0;
	    if (!options) options = {};

	    var later = function() {
	      previous = options.leading === false ? 0 : _.now();
	      timeout = null;
	      result = func.apply(context, args);
	      if (!timeout) context = args = null;
	    };

	    var throttled = function() {
	      var now = _.now();
	      if (!previous && options.leading === false) previous = now;
	      var remaining = wait - (now - previous);
	      context = this;
	      args = arguments;
	      if (remaining <= 0 || remaining > wait) {
	        if (timeout) {
	          clearTimeout(timeout);
	          timeout = null;
	        }
	        previous = now;
	        result = func.apply(context, args);
	        if (!timeout) context = args = null;
	      } else if (!timeout && options.trailing !== false) {
	        timeout = setTimeout(later, remaining);
	      }
	      return result;
	    };

	    throttled.cancel = function() {
	      clearTimeout(timeout);
	      previous = 0;
	      timeout = context = args = null;
	    };

	    return throttled;
	  };

	  // Returns a function, that, as long as it continues to be invoked, will not
	  // be triggered. The function will be called after it stops being called for
	  // N milliseconds. If `immediate` is passed, trigger the function on the
	  // leading edge, instead of the trailing.
	  _.debounce = function(func, wait, immediate) {
	    var timeout, result;

	    var later = function(context, args) {
	      timeout = null;
	      if (args) result = func.apply(context, args);
	    };

	    var debounced = restArguments(function(args) {
	      if (timeout) clearTimeout(timeout);
	      if (immediate) {
	        var callNow = !timeout;
	        timeout = setTimeout(later, wait);
	        if (callNow) result = func.apply(this, args);
	      } else {
	        timeout = _.delay(later, wait, this, args);
	      }

	      return result;
	    });

	    debounced.cancel = function() {
	      clearTimeout(timeout);
	      timeout = null;
	    };

	    return debounced;
	  };

	  // Returns the first function passed as an argument to the second,
	  // allowing you to adjust arguments, run code before and after, and
	  // conditionally execute the original function.
	  _.wrap = function(func, wrapper) {
	    return _.partial(wrapper, func);
	  };

	  // Returns a negated version of the passed-in predicate.
	  _.negate = function(predicate) {
	    return function() {
	      return !predicate.apply(this, arguments);
	    };
	  };

	  // Returns a function that is the composition of a list of functions, each
	  // consuming the return value of the function that follows.
	  _.compose = function() {
	    var args = arguments;
	    var start = args.length - 1;
	    return function() {
	      var i = start;
	      var result = args[start].apply(this, arguments);
	      while (i--) result = args[i].call(this, result);
	      return result;
	    };
	  };

	  // Returns a function that will only be executed on and after the Nth call.
	  _.after = function(times, func) {
	    return function() {
	      if (--times < 1) {
	        return func.apply(this, arguments);
	      }
	    };
	  };

	  // Returns a function that will only be executed up to (but not including) the Nth call.
	  _.before = function(times, func) {
	    var memo;
	    return function() {
	      if (--times > 0) {
	        memo = func.apply(this, arguments);
	      }
	      if (times <= 1) func = null;
	      return memo;
	    };
	  };

	  // Returns a function that will be executed at most one time, no matter how
	  // often you call it. Useful for lazy initialization.
	  _.once = _.partial(_.before, 2);

	  _.restArguments = restArguments;

	  // Object Functions
	  // ----------------

	  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
	  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
	  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
	    'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

	  var collectNonEnumProps = function(obj, keys) {
	    var nonEnumIdx = nonEnumerableProps.length;
	    var constructor = obj.constructor;
	    var proto = _.isFunction(constructor) && constructor.prototype || ObjProto;

	    // Constructor is a special case.
	    var prop = 'constructor';
	    if (has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

	    while (nonEnumIdx--) {
	      prop = nonEnumerableProps[nonEnumIdx];
	      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
	        keys.push(prop);
	      }
	    }
	  };

	  // Retrieve the names of an object's own properties.
	  // Delegates to **ECMAScript 5**'s native `Object.keys`.
	  _.keys = function(obj) {
	    if (!_.isObject(obj)) return [];
	    if (nativeKeys) return nativeKeys(obj);
	    var keys = [];
	    for (var key in obj) if (has(obj, key)) keys.push(key);
	    // Ahem, IE < 9.
	    if (hasEnumBug) collectNonEnumProps(obj, keys);
	    return keys;
	  };

	  // Retrieve all the property names of an object.
	  _.allKeys = function(obj) {
	    if (!_.isObject(obj)) return [];
	    var keys = [];
	    for (var key in obj) keys.push(key);
	    // Ahem, IE < 9.
	    if (hasEnumBug) collectNonEnumProps(obj, keys);
	    return keys;
	  };

	  // Retrieve the values of an object's properties.
	  _.values = function(obj) {
	    var keys = _.keys(obj);
	    var length = keys.length;
	    var values = Array(length);
	    for (var i = 0; i < length; i++) {
	      values[i] = obj[keys[i]];
	    }
	    return values;
	  };

	  // Returns the results of applying the iteratee to each element of the object.
	  // In contrast to _.map it returns an object.
	  _.mapObject = function(obj, iteratee, context) {
	    iteratee = cb(iteratee, context);
	    var keys = _.keys(obj),
	        length = keys.length,
	        results = {};
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys[index];
	      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
	    }
	    return results;
	  };

	  // Convert an object into a list of `[key, value]` pairs.
	  // The opposite of _.object.
	  _.pairs = function(obj) {
	    var keys = _.keys(obj);
	    var length = keys.length;
	    var pairs = Array(length);
	    for (var i = 0; i < length; i++) {
	      pairs[i] = [keys[i], obj[keys[i]]];
	    }
	    return pairs;
	  };

	  // Invert the keys and values of an object. The values must be serializable.
	  _.invert = function(obj) {
	    var result = {};
	    var keys = _.keys(obj);
	    for (var i = 0, length = keys.length; i < length; i++) {
	      result[obj[keys[i]]] = keys[i];
	    }
	    return result;
	  };

	  // Return a sorted list of the function names available on the object.
	  // Aliased as `methods`.
	  _.functions = _.methods = function(obj) {
	    var names = [];
	    for (var key in obj) {
	      if (_.isFunction(obj[key])) names.push(key);
	    }
	    return names.sort();
	  };

	  // An internal function for creating assigner functions.
	  var createAssigner = function(keysFunc, defaults) {
	    return function(obj) {
	      var length = arguments.length;
	      if (defaults) obj = Object(obj);
	      if (length < 2 || obj == null) return obj;
	      for (var index = 1; index < length; index++) {
	        var source = arguments[index],
	            keys = keysFunc(source),
	            l = keys.length;
	        for (var i = 0; i < l; i++) {
	          var key = keys[i];
	          if (!defaults || obj[key] === void 0) obj[key] = source[key];
	        }
	      }
	      return obj;
	    };
	  };

	  // Extend a given object with all the properties in passed-in object(s).
	  _.extend = createAssigner(_.allKeys);

	  // Assigns a given object with all the own properties in the passed-in object(s).
	  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
	  _.extendOwn = _.assign = createAssigner(_.keys);

	  // Returns the first key on an object that passes a predicate test.
	  _.findKey = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = _.keys(obj), key;
	    for (var i = 0, length = keys.length; i < length; i++) {
	      key = keys[i];
	      if (predicate(obj[key], key, obj)) return key;
	    }
	  };

	  // Internal pick helper function to determine if `obj` has key `key`.
	  var keyInObj = function(value, key, obj) {
	    return key in obj;
	  };

	  // Return a copy of the object only containing the whitelisted properties.
	  _.pick = restArguments(function(obj, keys) {
	    var result = {}, iteratee = keys[0];
	    if (obj == null) return result;
	    if (_.isFunction(iteratee)) {
	      if (keys.length > 1) iteratee = optimizeCb(iteratee, keys[1]);
	      keys = _.allKeys(obj);
	    } else {
	      iteratee = keyInObj;
	      keys = flatten(keys, false, false);
	      obj = Object(obj);
	    }
	    for (var i = 0, length = keys.length; i < length; i++) {
	      var key = keys[i];
	      var value = obj[key];
	      if (iteratee(value, key, obj)) result[key] = value;
	    }
	    return result;
	  });

	  // Return a copy of the object without the blacklisted properties.
	  _.omit = restArguments(function(obj, keys) {
	    var iteratee = keys[0], context;
	    if (_.isFunction(iteratee)) {
	      iteratee = _.negate(iteratee);
	      if (keys.length > 1) context = keys[1];
	    } else {
	      keys = _.map(flatten(keys, false, false), String);
	      iteratee = function(value, key) {
	        return !_.contains(keys, key);
	      };
	    }
	    return _.pick(obj, iteratee, context);
	  });

	  // Fill in a given object with default properties.
	  _.defaults = createAssigner(_.allKeys, true);

	  // Creates an object that inherits from the given prototype object.
	  // If additional properties are provided then they will be added to the
	  // created object.
	  _.create = function(prototype, props) {
	    var result = baseCreate(prototype);
	    if (props) _.extendOwn(result, props);
	    return result;
	  };

	  // Create a (shallow-cloned) duplicate of an object.
	  _.clone = function(obj) {
	    if (!_.isObject(obj)) return obj;
	    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
	  };

	  // Invokes interceptor with the obj, and then returns obj.
	  // The primary purpose of this method is to "tap into" a method chain, in
	  // order to perform operations on intermediate results within the chain.
	  _.tap = function(obj, interceptor) {
	    interceptor(obj);
	    return obj;
	  };

	  // Returns whether an object has a given set of `key:value` pairs.
	  _.isMatch = function(object, attrs) {
	    var keys = _.keys(attrs), length = keys.length;
	    if (object == null) return !length;
	    var obj = Object(object);
	    for (var i = 0; i < length; i++) {
	      var key = keys[i];
	      if (attrs[key] !== obj[key] || !(key in obj)) return false;
	    }
	    return true;
	  };


	  // Internal recursive comparison function for `isEqual`.
	  var eq, deepEq;
	  eq = function(a, b, aStack, bStack) {
	    // Identical objects are equal. `0 === -0`, but they aren't identical.
	    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
	    if (a === b) return a !== 0 || 1 / a === 1 / b;
	    // `null` or `undefined` only equal to itself (strict comparison).
	    if (a == null || b == null) return false;
	    // `NaN`s are equivalent, but non-reflexive.
	    if (a !== a) return b !== b;
	    // Exhaust primitive checks
	    var type = typeof a;
	    if (type !== 'function' && type !== 'object' && typeof b != 'object') return false;
	    return deepEq(a, b, aStack, bStack);
	  };

	  // Internal recursive comparison function for `isEqual`.
	  deepEq = function(a, b, aStack, bStack) {
	    // Unwrap any wrapped objects.
	    if (a instanceof _) a = a._wrapped;
	    if (b instanceof _) b = b._wrapped;
	    // Compare `[[Class]]` names.
	    var className = toString.call(a);
	    if (className !== toString.call(b)) return false;
	    switch (className) {
	      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
	      case '[object RegExp]':
	      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
	      case '[object String]':
	        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
	        // equivalent to `new String("5")`.
	        return '' + a === '' + b;
	      case '[object Number]':
	        // `NaN`s are equivalent, but non-reflexive.
	        // Object(NaN) is equivalent to NaN.
	        if (+a !== +a) return +b !== +b;
	        // An `egal` comparison is performed for other numeric values.
	        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
	      case '[object Date]':
	      case '[object Boolean]':
	        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
	        // millisecond representations. Note that invalid dates with millisecond representations
	        // of `NaN` are not equivalent.
	        return +a === +b;
	      case '[object Symbol]':
	        return SymbolProto.valueOf.call(a) === SymbolProto.valueOf.call(b);
	    }

	    var areArrays = className === '[object Array]';
	    if (!areArrays) {
	      if (typeof a != 'object' || typeof b != 'object') return false;

	      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
	      // from different frames are.
	      var aCtor = a.constructor, bCtor = b.constructor;
	      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
	                               _.isFunction(bCtor) && bCtor instanceof bCtor)
	                          && ('constructor' in a && 'constructor' in b)) {
	        return false;
	      }
	    }
	    // Assume equality for cyclic structures. The algorithm for detecting cyclic
	    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

	    // Initializing stack of traversed objects.
	    // It's done here since we only need them for objects and arrays comparison.
	    aStack = aStack || [];
	    bStack = bStack || [];
	    var length = aStack.length;
	    while (length--) {
	      // Linear search. Performance is inversely proportional to the number of
	      // unique nested structures.
	      if (aStack[length] === a) return bStack[length] === b;
	    }

	    // Add the first object to the stack of traversed objects.
	    aStack.push(a);
	    bStack.push(b);

	    // Recursively compare objects and arrays.
	    if (areArrays) {
	      // Compare array lengths to determine if a deep comparison is necessary.
	      length = a.length;
	      if (length !== b.length) return false;
	      // Deep compare the contents, ignoring non-numeric properties.
	      while (length--) {
	        if (!eq(a[length], b[length], aStack, bStack)) return false;
	      }
	    } else {
	      // Deep compare objects.
	      var keys = _.keys(a), key;
	      length = keys.length;
	      // Ensure that both objects contain the same number of properties before comparing deep equality.
	      if (_.keys(b).length !== length) return false;
	      while (length--) {
	        // Deep compare each member
	        key = keys[length];
	        if (!(has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
	      }
	    }
	    // Remove the first object from the stack of traversed objects.
	    aStack.pop();
	    bStack.pop();
	    return true;
	  };

	  // Perform a deep comparison to check if two objects are equal.
	  _.isEqual = function(a, b) {
	    return eq(a, b);
	  };

	  // Is a given array, string, or object empty?
	  // An "empty" object has no enumerable own-properties.
	  _.isEmpty = function(obj) {
	    if (obj == null) return true;
	    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
	    return _.keys(obj).length === 0;
	  };

	  // Is a given value a DOM element?
	  _.isElement = function(obj) {
	    return !!(obj && obj.nodeType === 1);
	  };

	  // Is a given value an array?
	  // Delegates to ECMA5's native Array.isArray
	  _.isArray = nativeIsArray || function(obj) {
	    return toString.call(obj) === '[object Array]';
	  };

	  // Is a given variable an object?
	  _.isObject = function(obj) {
	    var type = typeof obj;
	    return type === 'function' || type === 'object' && !!obj;
	  };

	  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError, isMap, isWeakMap, isSet, isWeakSet.
	  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error', 'Symbol', 'Map', 'WeakMap', 'Set', 'WeakSet'], function(name) {
	    _['is' + name] = function(obj) {
	      return toString.call(obj) === '[object ' + name + ']';
	    };
	  });

	  // Define a fallback version of the method in browsers (ahem, IE < 9), where
	  // there isn't any inspectable "Arguments" type.
	  if (!_.isArguments(arguments)) {
	    _.isArguments = function(obj) {
	      return has(obj, 'callee');
	    };
	  }

	  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
	  // IE 11 (#1621), Safari 8 (#1929), and PhantomJS (#2236).
	  var nodelist = root.document && root.document.childNodes;
	  if (typeof /./ != 'function' && typeof Int8Array != 'object' && typeof nodelist != 'function') {
	    _.isFunction = function(obj) {
	      return typeof obj == 'function' || false;
	    };
	  }

	  // Is a given object a finite number?
	  _.isFinite = function(obj) {
	    return !_.isSymbol(obj) && isFinite(obj) && !isNaN(parseFloat(obj));
	  };

	  // Is the given value `NaN`?
	  _.isNaN = function(obj) {
	    return _.isNumber(obj) && isNaN(obj);
	  };

	  // Is a given value a boolean?
	  _.isBoolean = function(obj) {
	    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
	  };

	  // Is a given value equal to null?
	  _.isNull = function(obj) {
	    return obj === null;
	  };

	  // Is a given variable undefined?
	  _.isUndefined = function(obj) {
	    return obj === void 0;
	  };

	  // Shortcut function for checking if an object has a given property directly
	  // on itself (in other words, not on a prototype).
	  _.has = function(obj, path) {
	    if (!_.isArray(path)) {
	      return has(obj, path);
	    }
	    var length = path.length;
	    for (var i = 0; i < length; i++) {
	      var key = path[i];
	      if (obj == null || !hasOwnProperty.call(obj, key)) {
	        return false;
	      }
	      obj = obj[key];
	    }
	    return !!length;
	  };

	  // Utility Functions
	  // -----------------

	  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
	  // previous owner. Returns a reference to the Underscore object.
	  _.noConflict = function() {
	    root._ = previousUnderscore;
	    return this;
	  };

	  // Keep the identity function around for default iteratees.
	  _.identity = function(value) {
	    return value;
	  };

	  // Predicate-generating functions. Often useful outside of Underscore.
	  _.constant = function(value) {
	    return function() {
	      return value;
	    };
	  };

	  _.noop = function(){};

	  // Creates a function that, when passed an object, will traverse that object’s
	  // properties down the given `path`, specified as an array of keys or indexes.
	  _.property = function(path) {
	    if (!_.isArray(path)) {
	      return shallowProperty(path);
	    }
	    return function(obj) {
	      return deepGet(obj, path);
	    };
	  };

	  // Generates a function for a given object that returns a given property.
	  _.propertyOf = function(obj) {
	    if (obj == null) {
	      return function(){};
	    }
	    return function(path) {
	      return !_.isArray(path) ? obj[path] : deepGet(obj, path);
	    };
	  };

	  // Returns a predicate for checking whether an object has a given set of
	  // `key:value` pairs.
	  _.matcher = _.matches = function(attrs) {
	    attrs = _.extendOwn({}, attrs);
	    return function(obj) {
	      return _.isMatch(obj, attrs);
	    };
	  };

	  // Run a function **n** times.
	  _.times = function(n, iteratee, context) {
	    var accum = Array(Math.max(0, n));
	    iteratee = optimizeCb(iteratee, context, 1);
	    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
	    return accum;
	  };

	  // Return a random integer between min and max (inclusive).
	  _.random = function(min, max) {
	    if (max == null) {
	      max = min;
	      min = 0;
	    }
	    return min + Math.floor(Math.random() * (max - min + 1));
	  };

	  // A (possibly faster) way to get the current timestamp as an integer.
	  _.now = Date.now || function() {
	    return new Date().getTime();
	  };

	  // List of HTML entities for escaping.
	  var escapeMap = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#x27;',
	    '`': '&#x60;'
	  };
	  var unescapeMap = _.invert(escapeMap);

	  // Functions for escaping and unescaping strings to/from HTML interpolation.
	  var createEscaper = function(map) {
	    var escaper = function(match) {
	      return map[match];
	    };
	    // Regexes for identifying a key that needs to be escaped.
	    var source = '(?:' + _.keys(map).join('|') + ')';
	    var testRegexp = RegExp(source);
	    var replaceRegexp = RegExp(source, 'g');
	    return function(string) {
	      string = string == null ? '' : '' + string;
	      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
	    };
	  };
	  _.escape = createEscaper(escapeMap);
	  _.unescape = createEscaper(unescapeMap);

	  // Traverses the children of `obj` along `path`. If a child is a function, it
	  // is invoked with its parent as context. Returns the value of the final
	  // child, or `fallback` if any child is undefined.
	  _.result = function(obj, path, fallback) {
	    if (!_.isArray(path)) path = [path];
	    var length = path.length;
	    if (!length) {
	      return _.isFunction(fallback) ? fallback.call(obj) : fallback;
	    }
	    for (var i = 0; i < length; i++) {
	      var prop = obj == null ? void 0 : obj[path[i]];
	      if (prop === void 0) {
	        prop = fallback;
	        i = length; // Ensure we don't continue iterating.
	      }
	      obj = _.isFunction(prop) ? prop.call(obj) : prop;
	    }
	    return obj;
	  };

	  // Generate a unique integer id (unique within the entire client session).
	  // Useful for temporary DOM ids.
	  var idCounter = 0;
	  _.uniqueId = function(prefix) {
	    var id = ++idCounter + '';
	    return prefix ? prefix + id : id;
	  };

	  // By default, Underscore uses ERB-style template delimiters, change the
	  // following template settings to use alternative delimiters.
	  _.templateSettings = {
	    evaluate: /<%([\s\S]+?)%>/g,
	    interpolate: /<%=([\s\S]+?)%>/g,
	    escape: /<%-([\s\S]+?)%>/g
	  };

	  // When customizing `templateSettings`, if you don't want to define an
	  // interpolation, evaluation or escaping regex, we need one that is
	  // guaranteed not to match.
	  var noMatch = /(.)^/;

	  // Certain characters need to be escaped so that they can be put into a
	  // string literal.
	  var escapes = {
	    "'": "'",
	    '\\': '\\',
	    '\r': 'r',
	    '\n': 'n',
	    '\u2028': 'u2028',
	    '\u2029': 'u2029'
	  };

	  var escapeRegExp = /\\|'|\r|\n|\u2028|\u2029/g;

	  var escapeChar = function(match) {
	    return '\\' + escapes[match];
	  };

	  // JavaScript micro-templating, similar to John Resig's implementation.
	  // Underscore templating handles arbitrary delimiters, preserves whitespace,
	  // and correctly escapes quotes within interpolated code.
	  // NB: `oldSettings` only exists for backwards compatibility.
	  _.template = function(text, settings, oldSettings) {
	    if (!settings && oldSettings) settings = oldSettings;
	    settings = _.defaults({}, settings, _.templateSettings);

	    // Combine delimiters into one regular expression via alternation.
	    var matcher = RegExp([
	      (settings.escape || noMatch).source,
	      (settings.interpolate || noMatch).source,
	      (settings.evaluate || noMatch).source
	    ].join('|') + '|$', 'g');

	    // Compile the template source, escaping string literals appropriately.
	    var index = 0;
	    var source = "__p+='";
	    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
	      source += text.slice(index, offset).replace(escapeRegExp, escapeChar);
	      index = offset + match.length;

	      if (escape) {
	        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
	      } else if (interpolate) {
	        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
	      } else if (evaluate) {
	        source += "';\n" + evaluate + "\n__p+='";
	      }

	      // Adobe VMs need the match returned to produce the correct offset.
	      return match;
	    });
	    source += "';\n";

	    // If a variable is not specified, place data values in local scope.
	    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

	    source = "var __t,__p='',__j=Array.prototype.join," +
	      "print=function(){__p+=__j.call(arguments,'');};\n" +
	      source + 'return __p;\n';

	    var render;
	    try {
	      render = new Function(settings.variable || 'obj', '_', source);
	    } catch (e) {
	      e.source = source;
	      throw e;
	    }

	    var template = function(data) {
	      return render.call(this, data, _);
	    };

	    // Provide the compiled source as a convenience for precompilation.
	    var argument = settings.variable || 'obj';
	    template.source = 'function(' + argument + '){\n' + source + '}';

	    return template;
	  };

	  // Add a "chain" function. Start chaining a wrapped Underscore object.
	  _.chain = function(obj) {
	    var instance = _(obj);
	    instance._chain = true;
	    return instance;
	  };

	  // OOP
	  // ---------------
	  // If Underscore is called as a function, it returns a wrapped object that
	  // can be used OO-style. This wrapper holds altered versions of all the
	  // underscore functions. Wrapped objects may be chained.

	  // Helper function to continue chaining intermediate results.
	  var chainResult = function(instance, obj) {
	    return instance._chain ? _(obj).chain() : obj;
	  };

	  // Add your own custom functions to the Underscore object.
	  _.mixin = function(obj) {
	    _.each(_.functions(obj), function(name) {
	      var func = _[name] = obj[name];
	      _.prototype[name] = function() {
	        var args = [this._wrapped];
	        push.apply(args, arguments);
	        return chainResult(this, func.apply(_, args));
	      };
	    });
	    return _;
	  };

	  // Add all of the Underscore functions to the wrapper object.
	  _.mixin(_);

	  // Add all mutator Array functions to the wrapper.
	  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
	    var method = ArrayProto[name];
	    _.prototype[name] = function() {
	      var obj = this._wrapped;
	      method.apply(obj, arguments);
	      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
	      return chainResult(this, obj);
	    };
	  });

	  // Add all accessor Array functions to the wrapper.
	  _.each(['concat', 'join', 'slice'], function(name) {
	    var method = ArrayProto[name];
	    _.prototype[name] = function() {
	      return chainResult(this, method.apply(this._wrapped, arguments));
	    };
	  });

	  // Extracts the result from a wrapped and chained object.
	  _.prototype.value = function() {
	    return this._wrapped;
	  };

	  // Provide unwrapping proxy for some methods used in engine operations
	  // such as arithmetic and JSON stringification.
	  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

	  _.prototype.toString = function() {
	    return String(this._wrapped);
	  };

	  // AMD registration happens at the end for compatibility with AMD loaders
	  // that may not enforce next-turn semantics on modules. Even though general
	  // practice for AMD registration is to be anonymous, underscore registers
	  // as a named module because, like jQuery, it is a base library that is
	  // popular enough to be bundled in a third party lib, but not be part of
	  // an AMD load request. Those cases could generate an error when an
	  // anonymous define() is called outside of a loader request.
	  if (true) {
	    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	      return _;
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  }
	}());

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }()), __webpack_require__(5)(module)))

/***/ }),
/* 5 */
/***/ (function(module, exports) {

	module.exports = function(module) {
		if(!module.webpackPolyfill) {
			module.deprecate = function() {};
			module.paths = [];
			// module.parent = undefined by default
			module.children = [];
			module.webpackPolyfill = 1;
		}
		return module;
	}


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var dffptch = __webpack_require__(2);
	var SyncPromise = __webpack_require__(7);

	var _require = __webpack_require__(4),
	    isString = _require.isString,
	    isNumber = _require.isNumber,
	    isFunction = _require.isFunction,
	    isUndefined = _require.isUndefined,
	    partial = _require.partial;

	var Countdown = __webpack_require__(8);
	var WrappedSocket = __webpack_require__(9);

	function doGet(IDBStore, key, getDeleted) {
	  return new SyncPromise(function (resolve, reject) {
	    var req = IDBStore.get(key);
	    req.onsuccess = function () {
	      if (!isUndefined(req.result) && (!req.result.deleted || getDeleted)) {
	        resolve(req.result);
	      } else {
	        reject({ type: 'KeyNotFoundError', key: key });
	      }
	    };
	  });
	}

	function doInStoreTx(mode, store, cb) {
	  if (store.tx) {
	    // We're in transaction
	    return new SyncPromise(function (resolve, reject) {
	      cb(store, resolve, reject);
	    });
	  } else {
	    return new Promise(function (resolve, reject) {
	      var val = void 0,
	          rejected = void 0;
	      return store.db.transaction(store.name, mode, function (store) {
	        cb(store, function (v) {
	          val = v;
	          rejected = false;
	        }, function (v) {
	          val = v;
	          rejected = true;
	        });
	      }).then(function () {
	        rejected ? reject(val) : resolve(val);
	      });
	    });
	  }
	}

	function createKeyRange(r) {
	  var gt = 'gt' in r;
	  var gte = 'gte' in r;
	  var lt = 'lt' in r;
	  var lte = 'lte' in r;
	  var low = gt ? r.gt : r.gte;
	  var high = lt ? r.lt : r.lte;
	  return !gt && !gte ? IDBKeyRange.upperBound(high, lt) : !lt && !lte ? IDBKeyRange.lowerBound(low, gt) : IDBKeyRange.bound(low, high, gt, lt);
	}

	function doIndexGet(idxName, queries, IDBStore, resolve, reject) {
	  var records = [];
	  var index = IDBStore.index(idxName);
	  var queriesLeft = new Countdown(queries.length);
	  queriesLeft.onZero = partial(resolve, records);
	  var _iteratorNormalCompletion = true;
	  var _didIteratorError = false;
	  var _iteratorError = undefined;

	  try {
	    var _loop = function _loop() {
	      var query = _step.value;
	      var skip = query.skip,
	          limit = query.limit;

	      var req = index.openCursor(query.range, query.direction);
	      var handleWithSkip = function handleWithSkip() {
	        var cursor = req.result;
	        if (!cursor) return queriesLeft.add(-1);
	        req.onsuccess = limit != null ? handlerWithLimit : handler;
	        return cursor.advance(skip);
	      };
	      var handlerWithLimit = function handlerWithLimit() {
	        var cursor = req.result;
	        if (!cursor || !limit) return queriesLeft.add(-1);
	        records.push(cursor.value);
	        limit--;
	        cursor.continue();
	      };
	      var handler = function handler() {
	        var cursor = req.result;
	        if (!cursor) return queriesLeft.add(-1);
	        records.push(cursor.value);
	        cursor.continue();
	      };
	      req.onsuccess = skip != null ? handleWithSkip : limit != null ? handlerWithLimit : handler;
	    };

	    for (var _iterator = queries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
	      _loop();
	    }
	  } catch (err) {
	    _didIteratorError = true;
	    _iteratorError = err;
	  } finally {
	    try {
	      if (!_iteratorNormalCompletion && _iterator.return) {
	        _iterator.return();
	      }
	    } finally {
	      if (_didIteratorError) {
	        throw _iteratorError;
	      }
	    }
	  }
	}

	function createQuery(q) {
	  return {
	    range: createKeyRange(q),
	    skip: q.skip,
	    limit: q.limit,
	    // 'next' || 'nextunique' || 'prev' || 'prevunique'
	    direction: q.direction
	  };
	}

	function doPushToRemote(ctx) {
	  return new Promise(function (resolve, reject) {
	    ctx.db.recordsToSync.onZero = partial(resolve, ctx);
	    sendRecordsChangedSinceSync(ctx);
	  });
	}

	function closeSyncContext(ctx) {
	  ctx.db.syncing = false;
	  ctx.db.disconnect();
	}

	function doPullFromRemote(ctx) {
	  return new Promise(function (resolve, reject) {
	    ctx.db.changesLeftFromRemote.onZero = partial(resolve, ctx);
	    ctx.storeNames.map(partial(requestChangesToStore, ctx.db, ctx.db.ws));
	  });
	}

	function sendRecordsChangedSinceSync(ctx) {
	  return ctx.db.transaction(ctx.storeNames, 'r', function () {
	    for (var _len = arguments.length, stores = Array(_len), _key = 0; _key < _len; _key++) {
	      stores[_key] = arguments[_key];
	    }

	    var gets = stores.map(function (store) {
	      return store.changedSinceSync.get(1);
	    });
	    SyncPromise.all(gets).then(function (results) {
	      var total = results.reduce(function (sum, recs, i) {
	        recs.forEach(partial(sendChangeToRemote, ctx.db, stores[i].name));
	        return sum + recs.length;
	      }, 0);
	      ctx.db.recordsToSync.add(total);
	    });
	  });
	}

	var putRecToStore = partial(insertRecToStore, 'put');
	var addRecToStore = partial(insertRecToStore, 'add');

	function deleteFromStore(store, key, origin) {
	  if (origin === 'LOCAL') {
	    var sent = store.db.recordsSentToRemote[key];
	    if (sent !== undefined) sent.changedSince = true;
	  }
	  var IDBStore = store.IDBStore;
	  return new SyncPromise(function (resolve, reject) {
	    doGet(IDBStore, key, true).then(function (record) {
	      var tombstone = createTombstone(record);
	      store.changedRecords.push({ type: 'delete', origin: origin, record: tombstone });
	      if (record.changedSinceSync === 1 && !record.remoteOriginal || origin === 'REMOTE') {
	        var _req = IDBStore.delete(key);
	        _req.onsuccess = resolve;
	      } else {
	        putRecToStore(store, tombstone, 'INTERNAL').then(resolve);
	      }
	    });
	  });
	}

	function sendChangeToRemote(db, storeName, record) {
	  var msgFunc = record.deleted ? deleteMsg : record.remoteOriginal ? updateMsg : createMsg;
	  db.recordsSentToRemote[record.key] = {
	    changedSince: false,
	    record: copyRecord(record)
	  };
	  db.ws.send(msgFunc(storeName, record));
	}

	function insertRecToStore(method, store, rec, origin) {
	  if (origin === 'LOCAL') {
	    var sent = store.db.recordsSentToRemote[rec.key];
	    if (sent !== undefined) sent.changedSince = true;
	  }
	  var IDBStore = store.IDBStore;
	  return new SyncPromise(function (resolve, reject) {
	    var req = IDBStore[method](rec);
	    req.onsuccess = function () {
	      var type = method === 'add' ? 'add' : 'update';
	      if (origin !== 'INTERNAL') {
	        store.changedRecords.push({ type: type, origin: origin, record: rec });
	      }
	      resolve(req.result);
	    };
	  });
	}

	function isKey(k) {
	  return isString(k) || isNumber(k);
	}

	function createTombstone(r) {
	  return {
	    version: r.version,
	    key: r.key,
	    changedSinceSync: 1,
	    deleted: true,
	    remoteOriginal: r.remoteOriginal || copyWithoutMeta(r)
	  };
	}

	function createMsg(storeName, record) {
	  var r = copyWithoutMeta(record);
	  delete r.key;
	  return {
	    type: 'create',
	    storeName: storeName,
	    record: r,
	    key: record.key
	  };
	}

	function copyWithoutMeta(rec) {
	  var r = copyRecord(rec);
	  delete r.remoteOriginal;
	  delete r.version;
	  delete r.changedSinceSync;
	  return r;
	}

	function updateMsg(storeName, record) {
	  var remoteOriginal = record.remoteOriginal;
	  delete record.remoteOriginal; // Noise free diff
	  remoteOriginal.version = record.version;
	  remoteOriginal.changedSinceSync = 1;
	  var diff = dffptch.diff(remoteOriginal, record);
	  record.remoteOriginal = remoteOriginal;
	  return {
	    type: 'update',
	    storeName: storeName,
	    version: record.version,
	    diff: diff,
	    key: record.key
	  };
	}

	function deleteMsg(storeName, record) {
	  return {
	    type: 'delete',
	    storeName: storeName,
	    key: record.key,
	    version: record.version
	  };
	}

	function getWs(db) {
	  if (!db.wsPromise) {
	    db.wsPromise = new Promise(function (resolve, reject) {
	      db.ws = new WrappedSocket(db.url);
	      db.ws.on('message', partial(handleIncomingMessage, db));
	      db.ws.on('open', function () {
	        resolve(db.ws);
	      });
	    });
	  }
	  return db.wsPromise;
	}

	function getSyncContext(db, storeNames) {
	  if (db.syncing) {
	    return Promise.reject({ type: 'AlreadySyncing' });
	  }
	  db.syncing = true;
	  storeNames = storeNames.length ? storeNames : Object.keys(db.stores);
	  return db.then(function () {
	    return getWs(db);
	  }).then(function (ws) {
	    return { db: db, storeNames: storeNames };
	  });
	}

	function copyRecord(obj) {
	  return JSON.parse(JSON.stringify(obj));
	}

	var handleIncomingMessageByType = {
	  'sending-changes': function sendingChanges(db, ws, msg) {
	    db.emit('sync-initiated', msg);
	    db.changesLeftFromRemote.add(msg.nrOfRecordsToSync);
	  },
	  'create': function create(db, ws, msg) {
	    msg.record.changedSinceSync = 0;
	    msg.record.key = msg.key;
	    msg.record.version = msg.version;
	    handleRemoteChange(db, msg.storeName, function (store, metaStore) {
	      addRecToStore(store, msg.record, 'REMOTE').then(function () {
	        updateStoreSyncedTo(metaStore, msg.storeName, msg.timestamp);
	      });
	    });
	  },
	  'update': function update(db, ws, msg) {
	    handleRemoteChange(db, msg.storeName, function (store, metaStore) {
	      doGet(store.IDBStore, msg.key, true).then(function (local) {
	        if (local.changedSinceSync === 1) {
	          // Conflict
	          var original = local.remoteOriginal;
	          var remote = copyRecord(original);
	          remote.version = local.version;
	          remote.changedSinceSync = 1;
	          dffptch.patch(remote, msg.diff);
	          local.remoteOriginal = remote;
	          var resolved = db.stores[msg.storeName].handleConflict(original, local, remote);
	          return putRecToStore(store, resolved, 'LOCAL');
	        } else {
	          dffptch.patch(local, msg.diff);
	          local.version = msg.version;
	          return putRecToStore(store, local, 'REMOTE');
	        }
	      }).then(function () {
	        updateStoreSyncedTo(metaStore, msg.storeName, msg.timestamp);
	      });
	    });
	  },
	  'delete': function _delete(db, ws, msg) {
	    handleRemoteChange(db, msg.storeName, function (store, metaStore) {
	      doGet(store.IDBStore, msg.key, true).then(function (local) {
	        if (local.changedSinceSync === 1 && !local.deleted) {
	          var original = local.remoteOriginal;
	          var remote = { deleted: true, key: msg.key };
	          local.remoteOriginal = remote;
	          var resolved = db.stores[msg.storeName].handleConflict(original, local, remote);
	          resolved.deleted ? deleteFromStore(store, msg.key, 'REMOTE') : putRecToStore(store, resolved, 'LOCAL');
	        } else {
	          deleteFromStore(store, msg.key, 'REMOTE');
	        }
	      }).then(function () {
	        updateStoreSyncedTo(metaStore, msg.storeName, msg.timestamp);
	      });
	    });
	  },
	  'ok': function ok(db, ws, msg) {
	    var record = void 0;
	    var sent = db.recordsSentToRemote[msg.key];
	    db.write(msg.storeName, 'sdbMetaData', function (store, metaStore) {
	      doGet(store.IDBStore, msg.key, true).then(function (rec) {
	        record = rec;
	        if (sent.changedSince === true) {
	          record.remoteOriginal = sent.record;
	          putRecToStore(store, record, 'INTERNAL');
	        } else if (record.deleted) {
	          store.IDBStore.delete(msg.key);
	        } else {
	          record.changedSinceSync = 0;
	          record.version = msg.newVersion;
	          delete record.remoteOriginal;
	          if (!isUndefined(msg.newKey)) {
	            record.key = msg.newKey;
	            store.IDBStore.delete(msg.key);
	          }
	          putRecToStore(store, record, 'INTERNAL');
	        }
	        delete db.recordsSentToRemote[msg.key];
	      }).then(function () {
	        updateStoreSyncedTo(metaStore, msg.storeName, msg.timestamp);
	      });
	    }).then(function () {
	      db.stores[msg.storeName].emit('synced', msg.key, record);
	      db.recordsToSync.add(-1);
	    });
	  },
	  'reject': function reject(db, ws, msg) {
	    if (!isKey(msg.key)) {
	      throw new Error('Reject message recieved from remote without key property');
	    }
	    var f = isString(msg.storeName) ? db.stores[msg.storeName].handleReject : db.handleReject;
	    if (!isFunction(f)) {
	      throw new Error('Reject message recieved from remote but no reject handler is supplied');
	    }
	    db.stores[msg.storeName].get(msg.key).then(function (record) {
	      return f(record, msg);
	    }).then(function (record) {
	      record ? sendChangeToRemote(db, msg.storeName, record) : db.recordsToSync.add(-1); // Skip syncing record
	    });
	  }
	};

	function handleIncomingMessage(db, msg) {
	  var handler = handleIncomingMessageByType[msg.type];
	  var target = isString(msg.storeName) ? db.stores[msg.storeName].messages : db.messages;
	  isFunction(handler) ? handler(db, db.ws, msg) : target.emit(msg.type, msg);
	}

	function requestChangesToStore(db, ws, storeName) {
	  db.sdbMetaData.get(storeName + 'Meta').then(function (storeMeta) {
	    ws.send({
	      type: 'get-changes',
	      storeName: storeName,
	      since: storeMeta.syncedTo
	    });
	  });
	}

	function updateStoreSyncedTo(metaStore, storeName, time) {
	  metaStore.get(storeName + 'Meta').then(function (storeMeta) {
	    storeMeta.syncedTo = time;
	    putRecToStore(metaStore, storeMeta, 'INTERNAL');
	  });
	}

	function handleRemoteChange(db, storeName, cb) {
	  return db.write(storeName, 'sdbMetaData', cb).then(function () {
	    db.changesLeftFromRemote.add(-1);
	  });
	}

	module.exports = { doGet: doGet, doInStoreTx: doInStoreTx, doIndexGet: doIndexGet, doPushToRemote: doPushToRemote,
	  closeSyncContext: closeSyncContext, doPullFromRemote: doPullFromRemote, sendRecordsChangedSinceSync: sendRecordsChangedSinceSync,
	  deleteFromStore: deleteFromStore, getSyncContext: getSyncContext, sendChangeToRemote: sendChangeToRemote, isKey: isKey, addRecToStore: addRecToStore,
	  putRecToStore: putRecToStore, copyWithoutMeta: copyWithoutMeta, getWs: getWs, createQuery: createQuery };

/***/ }),
/* 7 */
/***/ (function(module, exports) {

	function isPromise(p) {
	  return p && typeof p.then === 'function';
	}
	function addReject(prom, reject) {
	  prom.then(null, reject) // Use this style for sake of non-Promise thenables (e.g., jQuery Deferred)
	}

	// States
	var PENDING = 2,
	    FULFILLED = 0, // We later abuse these as array indices
	    REJECTED = 1;

	function SyncPromise(fn) {
	  var self = this;
	  self.v = 0; // Value, this will be set to either a resolved value or rejected reason
	  self.s = PENDING; // State of the promise
	  self.c = [[],[]]; // Callbacks c[0] is fulfillment and c[1] contains rejection callbacks
	  self.a = false; // Has the promise been resolved synchronously
	  var syncResolved = true;
	  function transist(val, state) {
	    self.a = syncResolved;
	    self.v = val;
	    self.s = state;
	    if (state === REJECTED && !self.c[state].length) {
	      throw val;
	    }
	    self.c[state].forEach(function(fn) { fn(val); });
	    self.c = null; // Release memory.
	  }
	  function resolve(val) {
	    if (!self.c) {
	      // Already resolved, do nothing.
	    } else if (isPromise(val)) {
	      addReject(val.then(resolve), reject);
	    } else {
	      transist(val, FULFILLED);
	    }
	  }
	  function reject(reason) {
	    if (!self.c) {
	      // Already resolved, do nothing.
	    } else if (isPromise(reason)) {
	      addReject(reason.then(reject), reject);
	    } else {
	      transist(reason, REJECTED);
	    }
	  }
	  fn(resolve, reject);
	  syncResolved = false;
	}

	var prot = SyncPromise.prototype;

	prot.then = function(cb, errBack) {
	  var self = this;
	  if (self.a) { // Promise has been resolved synchronously
	    throw new Error('Cannot call `then` on synchronously resolved promise');
	  }
	  return new SyncPromise(function(resolve, reject) {
	    var rej = typeof errBack === 'function' ? errBack : reject;
	    function settle() {
	      try {
	        resolve(cb ? cb(self.v) : self.v);
	      } catch(e) {
	        rej(e);
	      }
	    }
	    if (self.s === FULFILLED) {
	      settle();
	    } else if (self.s === REJECTED) {
	      rej(self.v);
	    } else {
	      self.c[FULFILLED].push(settle);
	      self.c[REJECTED].push(rej);
	    }
	  });
	};

	prot.catch = function(cb) {
	  var self = this;
	  if (self.a) { // Promise has been resolved synchronously
	    throw new Error('Cannot call `catch` on synchronously resolved promise');
	  }
	  return new SyncPromise(function(resolve, reject) {
	    function settle() {
	      try {
	        resolve(cb(self.v));
	      } catch(e) {
	        reject(e);
	      }
	    }
	    if (self.s === REJECTED) {
	      settle();
	    } else if (self.s === FULFILLED) {
	      resolve(self.v);
	    } else {
	      self.c[REJECTED].push(settle);
	      self.c[FULFILLED].push(resolve);
	    }
	  });
	};

	SyncPromise.all = function(promises) {
	  return new SyncPromise(function(resolve, reject, l) {
	    l = promises.length;
	    var hasPromises = false;
	    promises.forEach(function(p, i) {
	      if (isPromise(p)) {
	        hasPromises = true;
	        addReject(p.then(function(res) {
	          promises[i] = res;
	          --l || resolve(promises);
	        }), reject);
	      } else {
	        --l || (hasPromises ? resolve(promises) : (function () {
	          throw new Error('Must use at least one promise within `SyncPromise.all`');
	        }()));
	      }
	    });
	  });
	};

	SyncPromise.race = function(promises) {
	  var resolved = false;
	  return new SyncPromise(function(resolve, reject) {
	    promises.some(function(p, i) {
	      if (isPromise(p)) {
	        addReject(p.then(function(res) {
	          if (resolved) {
	            return;
	          }
	          resolve(res);
	          resolved = true;
	        }), reject);
	      } else {
	        throw new Error('Must use promises within `SyncPromise.race`');
	      }
	    });
	  });
	};
	module.exports = SyncPromise;


/***/ }),
/* 8 */
/***/ (function(module, exports) {

	"use strict";

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var Countdown = function () {
	  function Countdown(initial) {
	    _classCallCheck(this, Countdown);

	    this.val = initial || 0;
	  }

	  _createClass(Countdown, [{
	    key: "add",
	    value: function add(n) {
	      this.val += n;
	      if (this.val === 0) this.onZero();
	    }
	  }]);

	  return Countdown;
	}();

	module.exports = Countdown;

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var _require = __webpack_require__(4),
	    isString = _require.isString,
	    isObject = _require.isObject;

	var Events = __webpack_require__(10);

	var WrappedSocket = function () {
	  function WrappedSocket(url, protocol) {
	    var _this = this;

	    _classCallCheck(this, WrappedSocket);

	    Events(this);
	    var ws = this.ws = new WebSocket(url, protocol);
	    ws.onopen = function () {
	      _this.emit('open');
	    };
	    ws.onerror = function (error) {
	      _this.emit('error', error);
	    };
	    ws.onclose = function (e) {
	      _this.emit('close', e);
	    };
	    ws.onmessage = function (msg) {
	      var data = void 0;
	      if (isString(msg.data)) {
	        data = JSON.parse(msg.data);
	      } else {
	        data = msg.data;
	      }
	      _this.emit('message', data);
	    };
	  }

	  _createClass(WrappedSocket, [{
	    key: 'send',
	    value: function send(msg) {
	      if (isObject(msg)) {
	        this.ws.send(JSON.stringify(msg));
	      } else {
	        this.ws.send(msg);
	      }
	    }
	  }, {
	    key: 'close',
	    value: function close() {
	      this.ws.close.apply(this.ws, arguments);
	    }
	  }]);

	  return WrappedSocket;
	}();

	module.exports = WrappedSocket;

/***/ }),
/* 10 */
/***/ (function(module, exports) {

	function Events(target){
	  var events = {}, i, list, args, A = Array;
	  target = target || this
	    /**
	     *  On: listen to events
	     */
	    target.on = function(type, func, ctx){
	      events[type] || (events[type] = [])
	      events[type].push({f:func, c:ctx})
	    }
	    /**
	     *  Off: stop listening to event / specific callback
	     */
	    target.off = function(type, func){
	      list = events[type] || []
	      i = list.length = func ? list.length : 0
	      while(i-->0) func == list[i].f && list.splice(i,1)
	    }
	    /** 
	     * Emit: send event, callbacks will be triggered
	     */
	    target.emit = function(){
	      args = A.apply([], arguments)
	      list = events[args.shift()] || []
	      i = list.length
	      for(j=0;j<i;j++) list[j].f.apply(list[j].c, args) 
	    };
	}
	var u, module, cjs = module != u;
	(cjs ? module : window)[(cjs ? 'exports' : 'Events')] = Events;


/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var SyncPromise = __webpack_require__(7);
	var Events = __webpack_require__(10);

	var _require = __webpack_require__(4),
	    isUndefined = _require.isUndefined,
	    isObject = _require.isObject,
	    partial = _require.partial;

	var _require2 = __webpack_require__(6),
	    doGet = _require2.doGet,
	    doInStoreTx = _require2.doInStoreTx,
	    deleteFromStore = _require2.deleteFromStore,
	    sendChangeToRemote = _require2.sendChangeToRemote,
	    putRecToStore = _require2.putRecToStore,
	    addRecToStore = _require2.addRecToStore,
	    isKey = _require2.isKey,
	    copyWithoutMeta = _require2.copyWithoutMeta;

	var SDBIndex = __webpack_require__(12);

	var SDBObjectStore = function () {
	  function SDBObjectStore(db, name, indexes, tx) {
	    var _this = this;

	    _classCallCheck(this, SDBObjectStore);

	    this.name = name;
	    this.db = db;
	    this.indexes = indexes;
	    this.changedRecords = [];
	    this.messages = new Events();
	    this.tx = tx;
	    Events(this);
	    indexes.forEach(function (i) {
	      _this[i] = new SDBIndex(i, db, _this);
	    });
	    if (!isUndefined(tx)) {
	      this.IDBStore = tx.objectStore(this.name);
	      tx.addEventListener('complete', function () {
	        emitChangeEvents(_this.changedRecords, _this.db.stores[_this.name]);
	        _this.changedRecords.length = 0;
	      });
	    }
	  }

	  _createClass(SDBObjectStore, [{
	    key: 'get',
	    value: function get() {
	      for (var _len = arguments.length, keys = Array(_len), _key = 0; _key < _len; _key++) {
	        keys[_key] = arguments[_key];
	      }

	      return doInStoreTx('readonly', this, function (store, resolve, reject) {
	        var gets = keys.map(partial(doGet, store.IDBStore));
	        SyncPromise.all(gets).then(function (records) {
	          if (keys.length === records.length) resolve(keys.length == 1 ? records[0] : records);
	        }).catch(reject);
	      });
	    }
	  }, {
	    key: 'delete',
	    value: function _delete() {
	      for (var _len2 = arguments.length, keys = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	        keys[_key2] = arguments[_key2];
	      }

	      return doInStoreTx('readwrite', this, function (store, resolve, reject) {
	        var deletes = keys.map(function (key) {
	          return deleteFromStore(store, extractKey(key), 'LOCAL');
	        });
	        SyncPromise.all(deletes).then(resolve).catch(reject);
	      });
	    }
	  }, {
	    key: 'put',
	    value: function put() {
	      for (var _len3 = arguments.length, recs = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
	        recs[_key3] = arguments[_key3];
	      }

	      var ops = recs.map(function (rec) {
	        var newRec = void 0;
	        if (isUndefined(rec.key)) {
	          newRec = true;
	          rec.key = Math.random().toString(36);
	        } else {
	          extractKey(rec); // Throws if key is invalid
	          newRec = false;
	        }
	        rec.changedSinceSync = 1;
	        return { newRec: newRec, rec: rec };
	      });
	      return doInStoreTx('readwrite', this, function (store, resolve, reject) {
	        var puts = ops.map(partial(doPutRecord, store));
	        SyncPromise.all(puts).then(resolve);
	      });
	    }
	  }]);

	  return SDBObjectStore;
	}();

	module.exports = SDBObjectStore;

	function emitChangeEvents(changes, dbStore) {
	  changes.forEach(function (change) {
	    dbStore.emit(change.type, {
	      record: change.record,
	      origin: change.origin
	    });
	    if (dbStore.db.continuousSync && change.origin !== 'REMOTE') {
	      sendChangeToRemote(dbStore.db, dbStore.name, change.record);
	    }
	  });
	}

	function extractKey(pk) {
	  var k = isObject(pk) ? pk.key : pk;
	  if (!isKey(k)) throw new TypeError(k + ' is not a valid key');
	  return k;
	}

	function doPutRecord(store, op) {
	  var record = op.rec;
	  if (op.newRec) {
	    // Add new record
	    return addRecToStore(store, record, 'LOCAL');
	  } else {
	    // Update existing record
	    return updateMetaData(store, record).then(function () {
	      return putRecToStore(store, record, 'LOCAL');
	    });
	  }
	}

	function updateMetaData(store, record) {
	  return doGet(store.IDBStore, record.key).then(function (oldRecord) {
	    record.version = oldRecord.version;
	    if (oldRecord.changedSinceSync === 0) {
	      record.remoteOriginal = copyWithoutMeta(oldRecord);
	    }
	  });
	}

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	'use strict';

	var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

	function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

	var _require = __webpack_require__(6),
	    doInStoreTx = _require.doInStoreTx,
	    doIndexGet = _require.doIndexGet,
	    createQuery = _require.createQuery;

	var SDBIndex = function () {
	  function SDBIndex(name, db, store) {
	    _classCallCheck(this, SDBIndex);

	    this.name = name;
	    this.db = db;
	    this.store = store;
	  }

	  _createClass(SDBIndex, [{
	    key: 'get',
	    value: function get() {
	      var _this = this;

	      for (var _len = arguments.length, ids = Array(_len), _key = 0; _key < _len; _key++) {
	        ids[_key] = arguments[_key];
	      }

	      var queries = ids.map(function (id) {
	        return { range: IDBKeyRange.only(id) };
	      });
	      return doInStoreTx('readonly', this.store, function (store, resolve, reject) {
	        return doIndexGet(_this.name, queries, store.IDBStore, resolve, reject);
	      });
	    }
	  }, {
	    key: 'getAll',
	    value: function getAll() {
	      var _this2 = this;

	      return doInStoreTx('readonly', this.store, function (store, resolve, reject) {
	        return doIndexGet(_this2.name, [{}], store.IDBStore, resolve, reject);
	      });
	    }
	  }, {
	    key: 'inRange',
	    value: function inRange() {
	      var _this3 = this;

	      for (var _len2 = arguments.length, queries = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
	        queries[_key2] = arguments[_key2];
	      }

	      queries = queries.map(createQuery);
	      return doInStoreTx('readonly', this.store, function (store, resolve, reject) {
	        return doIndexGet(_this3.name, queries, store.IDBStore, resolve, reject);
	      });
	    }
	  }]);

	  return SDBIndex;
	}();

	module.exports = SDBIndex;

/***/ })
/******/ ]);