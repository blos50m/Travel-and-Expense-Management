// amadeus.js
const AMADEUS_API_KEY = 'UJ9jHGZqhmTx0ffzWZmbFj0NKXquIczb';
const AMADEUS_API_SECRET = '1gbrfFCiWefGpdCp';
let amadeusAccessToken = '';
let tokenExpiry = 0;

// Get Amadeus API access token
async function getAmadeusToken() {
    if (Date.now() < tokenExpiry && amadeusAccessToken) {
        return amadeusAccessToken;
    }

    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `grant_type=client_credentials&client_id=${encodeURIComponent(AMADEUS_API_KEY)}&client_secret=${encodeURIComponent(AMADEUS_API_SECRET)}`
    });

    if (!response.ok) {
        throw new Error('Failed to get Amadeus token');
    }

    const data = await response.json();
    amadeusAccessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
    return amadeusAccessToken;
}

// Search flights
async function searchFlights(origin, destination, departureDate, returnDate, travelers, travelClass) {
    const token = await getAmadeusToken();
    let url = `https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode=${origin}&destinationLocationCode=${destination}&departureDate=${departureDate}&adults=${travelers}&travelClass=${travelClass}`;
    
    if (returnDate) {
        url += `&returnDate=${returnDate}`;
    }

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to search flights');
    }

    return await response.json();
}

// Search hotels
async function searchHotels(cityCode, checkInDate, checkOutDate, travelers) {
    const token = await getAmadeusToken();
    const response = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode=${cityCode}&radius=5&radiusUnit=KM&ratings=3,4,5`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to search hotels');
    }

    const hotelData = await response.json();
    // Simulate pricing since test API doesn't provide real availability
    return hotelData.data.map(hotel => ({
        ...hotel,
        price: Math.floor(Math.random() * 300) + 50,
        available: true
    }));
}

// Search car rentals
async function searchCarRentals(cityCode, pickUpDate, dropOffDate) {
    const token = await getAmadeusToken();
    // Note: Test API has limited car rental functionality
    const response = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations/pois/by-city?cityCode=${cityCode}&categories=CAR-RENTAL`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to search car rentals');
    }

    const carData = await response.json();
    // Simulate pricing since test API doesn't provide real availability
    return carData.data.map(car => ({
        ...car,
        price: Math.floor(Math.random() * 50) + 20,
        type: ["Compact", "Midsize", "Fullsize", "SUV", "Luxury"][Math.floor(Math.random() * 5)],
        available: true
    }));
}

// Get city/airport suggestions
async function getCitySuggestions(query) {
    const token = await getAmadeusToken();
    const response = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(query)}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        throw new Error('Failed to get city suggestions');
    }

    return await response.json();
}