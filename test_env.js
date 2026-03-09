const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, 'frontend/.env.production') });
console.log(process.env.REACT_APP_GOOGLE_MAPS_API_KEY);
