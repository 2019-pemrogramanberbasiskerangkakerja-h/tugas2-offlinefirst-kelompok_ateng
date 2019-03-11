const Server = require('synceddb-server');

// Persistence in memory
//const memoryPersistence = require('synceddb-persistence-memory');
// const memoryPersistence = require('../../persistence/memory');

// Persistence with PostreSQL
//const pgPersistence = require('synceddb-persistence-postgres');
//const pgPersistence = require('../../persistence/postgresql');
//const pgOpts = {
//  conString: 'postgres://postgres@localhost/synceddb',
//};

// Persistence with MySQL
const mysqlPersistence = require('synceddb-persistence-mysql');
//const mysqlPersistence = require('../../persistence/mysql');
const mysqlOpts = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'nodelogin',
};

// Persistence with CouchDB
//const mysqlPersistence = require('synceddb-persistence-couchdb');
//const couchdbPersistence = require('../../persistence/couchdb');
//const couchdbOpts = {
//  dbUrl: 'http://synceddb:mypass@localhost:5984/synceddb/',
//};

//memoryPersistence.create().then(function(p) {
//pgPersistence.create(pgOpts).then(function(p) {
mysqlPersistence.create(mysqlOpts).then(function(p) {
//couchdbPersistence.create(couchdbOpts).then(function(p) {
  new Server({
    port: 8080,
    store: p,
  });
});
