const wp = require('./webpack.config.js');
const config = wp({}, { mode: 'production' });
console.log('API URL in DefinePlugin:', config.plugins[1].definitions['process.env.REACT_APP_API_URL']);
console.log('MAPS KEY in DefinePlugin:', config.plugins[1].definitions['process.env.REACT_APP_GOOGLE_MAPS_API_KEY']);
