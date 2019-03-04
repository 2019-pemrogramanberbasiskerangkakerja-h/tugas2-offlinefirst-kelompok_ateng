const Server = require('../backend');

// Persistence in memory
const memoryPersistence = require('../persistence/memory');

memoryPersistence.create().then(function(p) {

  new Server({
    port: 8080,
    store: p,
  });
});
