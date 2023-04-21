module.exports = require("devebot").registerLayerware(__dirname, [
  "app-errorlist", "app-restfetch", "app-restfront", "app-datastore"
]);
