// This file helps switch between development and production

const config = {
    development: {
        apiUrl: 'http://localhost:5000/api'
    },
    production: {
        apiUrl: 'https://pigfarm-backend-3fsv.onrender.com/api'  // Replace with your Render URL
    }
};


const environment = process.env.NODE_ENV || 'development';

export const API_URL = config[environment].apiUrl;