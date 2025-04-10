const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON request body
app.use(express.json());

// Global variables
let accessToken = null;
let tokenExpiryTime = 0;

// Function to get a new access token from Amadeus API
const getAccessToken = async () => {
    const url = 'https://test.api.amadeus.com/v1/security/oauth2/token';
    const body = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AMADEUS_CLIENT_ID,
        client_secret: process.env.AMADEUS_CLIENT_SECRET,
    });

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: body,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const data = await response.json();
        accessToken = data.access_token;
        tokenExpiryTime = Date.now() + (data.expires_in * 1000);
        console.log('Access token fetched successfully');
    } catch (error) {
        console.error('Error fetching access token:', error);
    }
};

// Function to check if the access token is expired
const isAccessTokenExpired = () => {
    return Date.now() >= tokenExpiryTime;
};

// Middleware to check and refresh the token if needed
const ensureAccessToken = async (req, res, next) => {
    if (!accessToken || isAccessTokenExpired()) {
        await getAccessToken();
    }
    if (accessToken) {
        next();
    } else {
        res.status(500).json({ message: 'Failed to fetch or refresh access token' });
    }
};

// Proxy all requests to Amadeus API
app.use('/api', ensureAccessToken, async (req, res) => {
    const apiUrl = `${process.env.AMADEUS_API_URL}${req.url}`;
    const method = req.method;
    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
    };

    try {
        // Forward the request to Amadeus API
        const response = await fetch(apiUrl, {
            method,
            headers,
            body: method === 'POST' || method === 'PUT' ? JSON.stringify(req.body) : null,
        });

        // Handle Amadeus API response
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        console.error('Error proxying request:', error);
        res.status(500).json({ message: 'Proxy request failed', error: error.message });
    }
});

// Error handling for unmatched routes
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Proxy server running on http://localhost:${port}`);
});
