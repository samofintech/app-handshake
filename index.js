module.exports = require('devebot').registerLayerware(__dirname, [
  'app-datastore', 'app-restfetch', 'app-restfront', 'app-tracelog', 'app-webweaver'
]);
