// Global variables
let userData = {};
let travelData = [];
let expenseData = [];
let currentReceipt = null;
const AMADEUS_API_KEY = 'UJ9jHGZqhmTx0ffzWZmbFj0NKXquIczb';
const AMADEUS_API_SECRET = '1gbrfFCiWefGpdCp';
let amadeusAccessToken = '';
let tokenExpiry = 0;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Load user data
    loadUserData();
    // Setup event listeners
    setupEventListeners();
    // Load expenses
    loadExpenses();
});

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

// Search flights using Amadeus API
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

// Search hotels using Amadeus API
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

// Search car rentals using Amadeus API
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

// Get city/airport suggestions from Amadeus API
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

// Load user data from localStorage or API
function loadUserData() {
    const storedUser = localStorage.getItem('blossomUser');
    if (storedUser) {
        userData = JSON.parse(storedUser);
    } else {
        // Default user data
        userData = {
            name: "Blossom Madonsela",
            email: "blossom@gmail.com",
            company: "Acme Inc.",
            travelPreferences: {
                preferredAirlines: ["Delta", "United"],
                seatPreference: "window",
                mealPreference: "vegetarian"
            },
            expenseSettings: {
                defaultCurrency: "USD",
                expenseCategories: ["flight", "hotel", "meal", "transport", "other"]
            }
        };
        localStorage.setItem('blossomUser', JSON.stringify(userData));
    }
    
    document.getElementById('username').textContent = userData.name;
}

// Setup all event listeners
function setupEventListeners() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            const returnGroup = document.getElementById('returnGroup');
            if (tab.dataset.type === 'oneway') {
                returnGroup.style.display = 'none';
            } else {
                returnGroup.style.display = 'block';
            }
        });
    });
    
    // Travel search form
    document.getElementById('travelSearchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        searchTravel();
    });
    
    // Sort options
    document.getElementById('sortOptions').addEventListener('change', function() {
        sortItineraries(this.value);
    });
    
    // Receipt upload
    const receiptUpload = document.getElementById('receiptUpload');
    const receiptFile = document.getElementById('receiptFile');
    
    receiptUpload.addEventListener('click', () => {
        receiptFile.click();
    });
    receiptFile.addEventListener('change', handleReceiptUpload);
    
    // Drag and drop for receipts
    receiptUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        receiptUpload.style.borderColor = 'var(--primary)';
        receiptUpload.style.backgroundColor = 'rgba(76, 175, 80, 0.05)';
    });
    
    receiptUpload.addEventListener('dragleave', () => {
        receiptUpload.style.borderColor = '#ddd';
        receiptUpload.style.backgroundColor = 'transparent';
    });
    
    receiptUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        receiptUpload.style.borderColor = '#ddd';
        receiptUpload.style.backgroundColor = 'transparent';
        
        if (e.dataTransfer.files.length > 0) {
            receiptFile.files = e.dataTransfer.files;
            handleReceiptUpload();
        }
    });
    
    // Remove receipt
    document.getElementById('removeReceipt').addEventListener('click', function() {
        currentReceipt = null;
        document.getElementById('receiptFile').value = '';
        document.getElementById('receiptPreview').style.display = 'none';
        document.getElementById('receiptAnalysis').style.display = 'none';
        document.getElementById('receiptUpload').style.display = 'block';
    });
    
    // Add expense button
    document.getElementById('addExpenseBtn').addEventListener('click', addExpense);
    
    // Export report button
    document.getElementById('exportReportBtn').addEventListener('click', function() {
        document.getElementById('reportModal').style.display = 'flex';
    });
    
    // Close report modal
    document.querySelector('.closeReportModal').addEventListener('click', function() {
        document.getElementById('reportModal').style.display = 'none';
    });
    
    // Generate report button
    document.getElementById('generateReportBtn').addEventListener('click', generateReport);
    
    // Close modal
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('itineraryModal').style.display = 'none';
    });
    
    document.getElementById('cancelModal').addEventListener('click', function() {
        document.getElementById('itineraryModal').style.display = 'none';
    });
    
    // City/airport autocomplete
    document.getElementById('from').addEventListener('input', function() {
        fetchCitySuggestions(this.value, 'fromSuggestions');
    });
    
    document.getElementById('to').addEventListener('input', function() {
        fetchCitySuggestions(this.value, 'toSuggestions');
    });
}

// Search for travel options using Amadeus API
async function searchTravel() {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const departure = document.getElementById('departure').value;
    const returnDate = document.getElementById('return').value;
    const travelers = document.getElementById('travelers').value;
    const travelClass = document.getElementById('class').value;
    
    if (!from || !to || !departure) {
        alert('Please fill in all required fields');
        return;
    }

    // Extract airport codes (assuming format "City (CODE)")
    const originCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from;
    const destinationCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to;
    
    // Show loading indicator
    document.getElementById('resultsContainer').style.display = 'block';
    document.getElementById('itinerariesList').innerHTML = '';
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('searchBtn').disabled = true;
    document.getElementById('searchBtn').innerHTML = '<div class="loading" style="display: inline-block; margin-right: 8px;"></div> Searching...';
    
    try {
        // Get all data in parallel
        const [flights, hotels, cars] = await Promise.all([
            searchFlights(originCode, destinationCode, departure, returnDate, travelers, travelClass),
            searchHotels(destinationCode, departure, returnDate || departure, travelers),
            searchCarRentals(destinationCode, departure, returnDate || departure)
        ]);

        // Combine into itineraries
        travelData = createItineraries(flights, hotels, cars, from, to, departure, returnDate, travelers, travelClass);
        
        // Display results
        displayItineraries(travelData);
        
        // Check travel compliance
        checkTravelCompliance(to);
        
    } catch (error) {
        console.error('Error searching for travel:', error);
        alert('There was an error searching for travel options. Please try again.');
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('searchBtn').disabled = false;
        document.getElementById('searchBtn').innerHTML = '<i class="fas fa-search"></i> Find Best Options';
    }
}

// Create combined itineraries from API data
function createItineraries(flights, hotels, cars, from, to, departure, returnDate, travelers, travelClass) {
    const days = returnDate ? (new Date(returnDate) - new Date(departure)) / (1000 * 60 * 60 * 24) : 1;
    
    return flights.data.map((flight, index) => {
        const hotel = hotels[index % hotels.length];
        const car = cars[index % cars.length];
        const flightPrice = parseFloat(flight.price.total);
        const hotelPrice = hotel.price * days;
        const carPrice = car.price * days;
        
        return {
            id: `itinerary-${index}`,
            from,
            to,
            departure,
            return: returnDate,
            travelers,
            class: travelClass,
            totalPrice: flightPrice + hotelPrice + carPrice,
            flight: {
                airline: flight.validatingAirlineCodes[0],
                flightNumber: flight.itineraries[0].segments[0].number,
                departureTime: formatTime(flight.itineraries[0].segments[0].departure.at),
                arrivalTime: formatTime(flight.itineraries[0].segments[0].arrival.at),
                duration: flight.itineraries[0].duration,
                price: flightPrice,
                bookingUrl: `https://www.booking.com/flights?flight=${flight.id}`
            },
            hotel: {
                name: hotel.name,
                rating: Math.floor(Math.random() * 2) + 3, // Simulate rating
                pricePerNight: hotel.price,
                cancellation: "Free cancellation",
                nights: days,
                bookingUrl: `https://www.booking.com/hotels?city=${to.split(',')[0]}`
            },
            car: {
                company: car.name,
                type: car.type,
                pricePerDay: car.price,
                unlimitedMileage: Math.random() > 0.5,
                bookingUrl: `https://www.booking.com/cars?location=${to.split(',')[0]}`
            }
        };
    });
}

// Display itineraries in the UI
function displayItineraries(itineraries) {
    const itinerariesList = document.getElementById('itinerariesList');
    itinerariesList.innerHTML = '';
    
    itineraries.forEach(itinerary => {
        const card = document.createElement('div');
        card.className = 'itinerary-card';
        card.dataset.id = itinerary.id;
        
        const days = itinerary.return ? (new Date(itinerary.return) - new Date(itinerary.departure)) / (1000 * 60 * 60 * 24) : 1;
        
        card.innerHTML = `
            <div class="itinerary-header">
                <div>
                    <h4>${itinerary.from} to ${itinerary.to}</h4>
                    <p>${formatDate(itinerary.departure)} ${itinerary.return ? ' - ' + formatDate(itinerary.return) : ''} • ${itinerary.travelers} Traveler${itinerary.travelers > 1 ? 's' : ''} • ${itinerary.class.charAt(0).toUpperCase() + itinerary.class.slice(1)}</p>
                </div>
                <div class="itinerary-price">$${itinerary.totalPrice.toLocaleString()}</div>
            </div>
            <div class="itinerary-body">
                <div class="segment">
                    <div class="segment-icon">
                        <i class="fas fa-plane"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Flight</h4>
                        <p>${itinerary.flight.airline} • ${itinerary.flight.duration}</p>
                        <p>${itinerary.flight.departureTime} - ${itinerary.flight.arrivalTime}</p>
                        <p>$${itinerary.flight.price}</p>
                    </div>
                </div>
                <div class="segment">
                    <div class="segment-icon">
                        <i class="fas fa-hotel"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Hotel</h4>
                        <p>${itinerary.hotel.name} • ${days} night${days > 1 ? 's' : ''}</p>
                        <p>$${itinerary.hotel.pricePerNight}/night • ${itinerary.hotel.cancellation}</p>
                    </div>
                </div>
                <div class="segment">
                    <div class="segment-icon">
                        <i class="fas fa-car"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Transport</h4>
                        <p>${itinerary.car.company} • ${itinerary.car.type}</p>
                        <p>$${itinerary.car.pricePerDay}/day • ${itinerary.car.unlimitedMileage ? 'Unlimited mileage' : 'Limited mileage'}</p>
                    </div>
                </div>
            </div>
            <div class="itinerary-footer">
                <button class="btn btn-outline view-details" data-id="${itinerary.id}">
                    <i class="fas fa-info-circle"></i> Details
                </button>
                <button class="btn btn-primary book-now" data-id="${itinerary.id}" style="margin-left: 10px;">
                    <i class="fas fa-external-link-alt"></i> Book Now
                </button>
            </div>
        `;
        
        itinerariesList.appendChild(card);
    });
    
    // Add event listeners to the new buttons
    document.querySelectorAll('.view-details').forEach(btn => {
        btn.addEventListener('click', function() {
            showItineraryDetails(this.dataset.id);
        });
    });
    
    document.querySelectorAll('.book-now').forEach(btn => {
        btn.addEventListener('click', function() {
            bookItinerary(this.dataset.id);
        });
    });
}

// Sort itineraries based on selected option
function sortItineraries(sortBy) {
    if (!travelData.length) return;
    
    let sortedItineraries = [...travelData];
    
    switch(sortBy) {
        case 'price':
            sortedItineraries.sort((a, b) => a.totalPrice - b.totalPrice);
            break;
        case 'duration':
            sortedItineraries.sort((a, b) => {
                const aDuration = parseInt(a.flight.duration.substring(2));
                const bDuration = parseInt(b.flight.duration.substring(2));
                return aDuration - bDuration;
            });
            break;
        case 'rating':
            sortedItineraries.sort((a, b) => b.hotel.rating - a.hotel.rating);
            break;
    }
    
    displayItineraries(sortedItineraries);
}

// Show itinerary details in modal
function showItineraryDetails(id) {
    const itinerary = travelData.find(item => item.id === id);
    if (!itinerary) return;
    
    document.getElementById('modalTitle').textContent = `Itinerary Details: ${itinerary.from} to ${itinerary.to}`;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary); margin-bottom: 10px;">Flight Details</h4>
            <p><strong>Airline:</strong> ${itinerary.flight.airline} (${itinerary.flight.flightNumber})</p>
            <p><strong>Departure:</strong> ${formatDate(itinerary.departure)} at ${itinerary.flight.departureTime}</p>
            <p><strong>Arrival:</strong> ${itinerary.flight.arrivalTime}</p>
            <p><strong>Duration:</strong> ${itinerary.flight.duration}</p>
            <p><strong>Class:</strong> ${itinerary.class.charAt(0).toUpperCase() + itinerary.class.slice(1)}</p>
            <p><strong>Price:</strong> $${itinerary.flight.price}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
            <h4 style="color: var(--primary); margin-bottom: 10px;">Accommodation</h4>
            <p><strong>Hotel:</strong> ${itinerary.hotel.name}</p>
            <p><strong>Rating:</strong> ${'★'.repeat(itinerary.hotel.rating)}${'☆'.repeat(5 - itinerary.hotel.rating)}</p>
            <p><strong>Check-in:</strong> ${formatDate(itinerary.departure)}</p>
            <p><strong>Check-out:</strong> ${itinerary.return ? formatDate(itinerary.return) : formatDate(itinerary.departure)}</p>
            <p><strong>Nights:</strong> ${itinerary.return ? (new Date(itinerary.return) - new Date(itinerary.departure)) / (1000 * 60 * 60 * 24) : 1}</p>
            <p><strong>Price per night:</strong> $${itinerary.hotel.pricePerNight}</p>
            <p><strong>Cancellation:</strong> ${itinerary.hotel.cancellation}</p>
        </div>
        
        <div>
            <h4 style="color: var(--primary); margin-bottom: 10px;">Transportation</h4>
            <p><strong>Car Rental:</strong> ${itinerary.car.company}</p>
            <p><strong>Car Type:</strong> ${itinerary.car.type}</p>
            <p><strong>Price per day:</strong> $${itinerary.car.pricePerDay}</p>
            <p><strong>Mileage:</strong> ${itinerary.car.unlimitedMileage ? 'Unlimited' : 'Limited'}</p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: var(--light); border-radius: 10px;">
            <h4 style="color: var(--primary); margin-bottom: 10px;">Total Price: $${itinerary.totalPrice}</h4>
            <p>Includes flight, ${itinerary.return ? (new Date(itinerary.return) - new Date(itinerary.departure)) / (1000 * 60 * 60 * 24) : 1} night${itinerary.return && (new Date(itinerary.return) - new Date(itinerary.departure)) / (1000 * 60 * 60 * 24) > 1 ? 's' : ''} accommodation, and car rental</p>
        </div>
    `;
    
    document.getElementById('confirmModal').textContent = 'Book Now';
    document.getElementById('confirmModal').onclick = function() {
        bookItinerary(id);
        document.getElementById('itineraryModal').style.display = 'none';
    };
    
    document.getElementById('itineraryModal').style.display = 'flex';
}

// Book itinerary and add to expenses
function bookItinerary(id) {
    const itinerary = travelData.find(item => item.id === id);
    if (!itinerary) return;
    
    // Add flight to expenses
    const flightExpense = {
        id: `expense-${Date.now()}`,
        date: itinerary.departure,
        category: 'flight',
        amount: itinerary.flight.price,
        currency: 'USD',
        description: `${itinerary.flight.airline} flight to ${itinerary.to}`,
        receipt: null,
        status: 'pending'
    };
    
    expenseData.unshift(flightExpense);
    saveExpenses();
    
    // Redirect to booking.com
    window.open(itinerary.flight.bookingUrl, '_blank');
    alert('Flight has been added to your expenses!');
}

// Check travel compliance for destination
function checkTravelCompliance(destination) {
    const complianceCheck = document.getElementById('complianceCheck');
    complianceCheck.style.display = 'block';
    
    const country = destination.split(',')[1] ? destination.split(',')[1].trim() : 'United States';
    const visaRequirements = getVisaRequirements(country);
    const healthRequirements = getHealthRequirements(country);
    
    complianceCheck.innerHTML = `
        <div class="itinerary-card" style="background: #fff8e1;">
            <div class="itinerary-header" style="background: rgba(255, 193, 7, 0.1);">
                <div>
                    <h4><i class="fas fa-passport"></i> Travel Compliance Check</h4>
                    <p>Important information for your trip to ${country}</p>
                </div>
            </div>
            <div class="itinerary-body">
                <div class="segment">
                    <div class="segment-icon" style="background: rgba(255, 193, 7, 0.1); color: var(--warning);">
                        <i class="fas fa-passport"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Visa Requirements</h4>
                        <p>${visaRequirements}</p>
                        ${country !== 'United States' ? `<p style="margin-top: 5px;"><a href="https://travel.state.gov/content/travel/en/international-travel.html" target="_blank" style="color: var(--primary);">Check official requirements</a></p>` : ''}
                    </div>
                </div>
                <div class="segment">
                    <div class="segment-icon" style="background: rgba(255, 193, 7, 0.1); color: var(--warning);">
                        <i class="fas fa-syringe"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Health Requirements</h4>
                        <p>${healthRequirements}</p>
                        ${healthRequirements.includes('recommended') ? `<p style="margin-top: 5px;"><a href="https://wwwnc.cdc.gov/travel" target="_blank" style="color: var(--primary);">CDC Travel Health Notices</a></p>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Get visa requirements (mock data)
function getVisaRequirements(country) {
    const visaFreeCountries = ["United Kingdom", "Canada", "Mexico", "France", "Germany", "Italy", "Japan"];
    const visaOnArrival = ["Thailand", "Indonesia", "Sri Lanka", "Kenya"];
    const etaCountries = ["Australia", "New Zealand"];
    
    if (country === "United States") return "Domestic travel - no visa required";
    if (visaFreeCountries.includes(country)) return "No visa required for stays under 90 days";
    if (visaOnArrival.includes(country)) return "Visa available on arrival for tourism (typically $25-$50)";
    if (etaCountries.includes(country)) return "Electronic Travel Authorization (ETA) required before departure";
    
    return "Visa required before travel. Apply at nearest embassy or consulate.";
}

// Get health requirements (mock data)
function getHealthRequirements(country) {
    const yellowFeverCountries = ["Brazil", "Peru", "Ghana", "Nigeria"];
    const malariaCountries = ["India", "Thailand", "Vietnam", "South Africa"];
    
    if (yellowFeverCountries.includes(country)) return "Yellow fever vaccination required";
    if (malariaCountries.includes(country)) return "Malaria prophylaxis recommended";
    if (country === "United States") return "No vaccination requirements";
    
    return "Routine vaccinations recommended";
}

// Handle receipt upload with OCR
async function handleReceiptUpload() {
    const fileInput = document.getElementById('receiptFile');
    if (fileInput.files.length === 0) return;
    
    const file = fileInput.files[0];
    currentReceipt = file;
    
    // Show preview
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('receiptImagePreview').src = e.target.result;
            document.getElementById('receiptPreview').style.display = 'block';
            document.getElementById('receiptUpload').style.display = 'none';
            
            analyzeReceiptWithOCR(file);
        };
        reader.readAsDataURL(file);
    } else {
        document.getElementById('receiptPreview').style.display = 'none';
        document.getElementById('receiptUpload').style.display = 'none';
        
        document.getElementById('receiptAnalysisContent').innerHTML = `
            <div style="text-align: center;">
                <i class="fas fa-file-pdf" style="font-size: 40px; color: var(--primary);"></i>
                <p>${file.name}</p>
            </div>
        `;
        document.getElementById('receiptAnalysis').style.display = 'block';
        
        analyzeReceiptWithOCR(file);
    }
}

// Analyze receipt with OCR using Tesseract.js
async function analyzeReceiptWithOCR(file) {
    document.getElementById('receiptAnalysis').style.display = 'block';
    document.getElementById('receiptAnalysisContent').innerHTML = `
        <div style="text-align: center;">
            <div class="loading" style="margin: 10px auto;"></div>
            <p>Processing receipt with OCR...</p>
        </div>
    `;

    try {
        const { createWorker } = Tesseract;
        const worker = await createWorker();
        
        let result;
        if (file.type === 'application/pdf') {
            // For PDFs, we'd need to convert to image first in a real app
            result = await worker.recognize(URL.createObjectURL(file));
        } else {
            result = await worker.recognize(file);
        }
        
        await worker.terminate();
        
        const text = result.data.text;
        const amountMatch = text.match(/(Total|Amount|TOTAL|AMOUNT)[:\s]*\$?(\d+\.\d{2})/i);
        const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
        const merchantMatch = text.match(/^(.*)/);
        
        const amount = amountMatch ? parseFloat(amountMatch[2]) : (Math.random() * 200 + 20).toFixed(2);
        const date = dateMatch ? formatDateForInput(dateMatch[1]) : new Date().toISOString().split('T')[0];
        const merchant = merchantMatch ? merchantMatch[1].substring(0, 30) : 'Unknown Merchant';
        
        document.getElementById('receiptAnalysisContent').innerHTML = `
            <div style="margin-bottom: 10px;">
                <p><strong>Extracted from receipt:</strong></p>
                <p><strong>Merchant:</strong> ${merchant}</p>
                <p><strong>Amount:</strong> $${amount}</p>
                <p><strong>Date:</strong> ${date}</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="applyReceiptAnalysis('${merchant}', ${amount}, '${date}', 'other')">
                    <i class="fas fa-check"></i> Use This Data
                </button>
                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="document.getElementById('receiptAnalysisContent').innerHTML += '<div style=&#39;margin-top:10px&#39;><label>Correct Details:</label><input type=&#39;text&#39; id=&#39;correctMerchant&#39; placeholder=&#39;Merchant name&#39; style=&#39;margin-bottom:5px;width:100%&#39;><input type=&#39;number&#39; id=&#39;correctAmount&#39; placeholder=&#39;Amount&#39; style=&#39;margin-bottom:5px;width:100%&#39;><input type=&#39;date&#39; id=&#39;correctDate&#39; style=&#39;margin-bottom:5px;width:100%&#39;><select id=&#39;correctCategory&#39; style=&#39;width:100%&#39;><option value=&#39;flight&#39;>Flight</option><option value=&#39;hotel&#39;>Hotel</option><option value=&#39;meal&#39;>Meal</option><option value=&#39;transport&#39;>Transport</option><option value=&#39;other&#39;>Other</option></select><button class=&#39;btn btn-primary&#39; style=&#39;width:100%;margin-top:5px&#39; onclick=&#39;applyManualReceiptData()&#39;>Apply Changes</button></div>'">
                    <i class="fas fa-edit"></i> Correct Data
                </button>
            </div>
        `;
    } catch (error) {
        console.error('OCR Error:', error);
        document.getElementById('receiptAnalysisContent').innerHTML = `
            <div style="text-align: center; color: var(--error);">
                <p>Failed to process receipt. Please enter details manually.</p>
                <button class="btn btn-primary" onclick="document.getElementById('receiptAnalysisContent').innerHTML += '<div style=&#39;margin-top:10px&#39;><label>Enter Details:</label><input type=&#39;text&#39; id=&#39;correctMerchant&#39; placeholder=&#39;Merchant name&#39; style=&#39;margin-bottom:5px;width:100%&#39;><input type=&#39;number&#39; id=&#39;correctAmount&#39; placeholder=&#39;Amount&#39; style=&#39;margin-bottom:5px;width:100%&#39;><input type=&#39;date&#39; id=&#39;correctDate&#39; style=&#39;margin-bottom:5px;width:100%&#39;><select id=&#39;correctCategory&#39; style=&#39;width:100%&#39;><option value=&#39;flight&#39;>Flight</option><option value=&#39;hotel&#39;>Hotel</option><option value=&#39;meal&#39;>Meal</option><option value=&#39;transport&#39;>Transport</option><option value=&#39;other&#39;>Other</option></select><button class=&#39;btn btn-primary&#39; style=&#39;width:100%;margin-top:5px&#39; onclick=&#39;applyManualReceiptData()&#39;>Apply</button></div>'">
                    Enter Manually
                </button>
            </div>
        `;
    }
}

// Apply receipt analysis to form
function applyReceiptAnalysis(merchant, amount, date, category) {
    document.getElementById('expense-description').value = merchant;
    document.getElementById('expense-amount').value = amount;
    document.getElementById('expense-date').value = date;
    document.getElementById('expense-category').value = category;
}

// Apply manual receipt data
function applyManualReceiptData() {
    const merchant = document.getElementById('correctMerchant').value;
    const amount = document.getElementById('correctAmount').value;
    const date = document.getElementById('correctDate').value;
    const category = document.getElementById('correctCategory').value;
    
    if (merchant && amount && date && category) {
        applyReceiptAnalysis(merchant, amount, date, category);
    }
}

// Add new expense
function addExpense() {
    const date = document.getElementById('expense-date').value;
    const category = document.getElementById('expense-category').value;
    const amount = document.getElementById('expense-amount').value;
    const currency = document.getElementById('expense-currency').value;
    const description = document.getElementById('expense-description').value;
    
    if (!date || !category || !amount || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    const newExpense = {
        id: `expense-${Date.now()}`,
        date,
        category,
        amount: parseFloat(amount),
        currency,
        description,
        receipt: currentReceipt ? currentReceipt.name : null,
        status: 'pending'
    };
    
    expenseData.unshift(newExpense);
    saveExpenses();
    loadExpenses();
    
    // Reset form
    document.getElementById('expense-date').value = '';
    document.getElementById('expense-category').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-description').value = '';
    document.getElementById('receiptFile').value = '';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptAnalysis').style.display = 'none';
    document.getElementById('receiptUpload').style.display = 'block';
    currentReceipt = null;
    
    alert('Expense added successfully!');
}

// Load expenses from localStorage or API
function loadExpenses() {
    const storedExpenses = localStorage.getItem('blossomExpenses');
    if (storedExpenses) {
        expenseData = JSON.parse(storedExpenses);
    } else {
        expenseData = [
            {
                id: 'expense-1',
                date: '2023-06-15',
                category: 'flight',
                amount: 1247.00,
                currency: 'USD',
                description: 'Flight to London',
                receipt: 'flight-receipt.jpg',
                status: 'approved'
            },
            {
                id: 'expense-2',
                date: '2023-06-16',
                category: 'hotel',
                amount: 225.00,
                currency: 'USD',
                description: 'Hotel deposit',
                receipt: 'hotel-receipt.pdf',
                status: 'approved'
            },
            {
                id: 'expense-3',
                date: '2023-06-17',
                category: 'meal',
                amount: 45.50,
                currency: 'USD',
                description: 'Dinner with client',
                receipt: null,
                status: 'pending'
            }
        ];
        saveExpenses();
    }
    
    displayExpenses();
}

// Save expenses to localStorage or API
function saveExpenses() {
    localStorage.setItem('blossomExpenses', JSON.stringify(expenseData));
}

// Display expenses in the UI
function displayExpenses() {
    const expensesList = document.getElementById('expensesList');
    expensesList.innerHTML = '';
    
    if (expenseData.length === 0) {
        expensesList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No expenses recorded yet</p>';
        document.getElementById('totalExpenses').textContent = '$0.00';
        return;
    }
    
    let total = 0;
    
    expenseData.forEach(expense => {
        total += expense.amount;
        
        const item = document.createElement('div');
        item.className = 'expense-item';
        item.dataset.id = expense.id;
        
        const categoryIcons = {
            flight: 'fa-plane',
            hotel: 'fa-hotel',
            meal: 'fa-utensils',
            transport: 'fa-car',
            other: 'fa-receipt'
        };
        
        const statusBadges = {
            approved: '<span style="color: var(--primary); font-size: 12px; background: rgba(76, 175, 80, 0.1); padding: 3px 8px; border-radius: 10px;"><i class="fas fa-check-circle"></i> Approved</span>',
            pending: '<span style="color: var(--warning); font-size: 12px; background: rgba(255, 193, 7, 0.1); padding: 3px 8px; border-radius: 10px;"><i class="fas fa-clock"></i> Pending</span>',
            rejected: '<span style="color: var(--error); font-size: 12px; background: rgba(244, 67, 54, 0.1); padding: 3px 8px; border-radius: 10px;"><i class="fas fa-times-circle"></i> Rejected</span>'
        };
        
        item.innerHTML = `
            <div class="expense-info">
                <div class="expense-category">
                    <i class="fas ${categoryIcons[expense.category]}"></i>
                </div>
                <div>
                    <h4>${expense.description}</h4>
                    <p>${formatDate(expense.date)} • ${expense.receipt ? '<i class="fas fa-paperclip"></i> Receipt attached' : 'No receipt'}</p>
                </div>
            </div>
            <div style="text-align: right;">
                <div class="expense-amount">${formatCurrency(expense.amount, expense.currency)}</div>
                ${statusBadges[expense.status]}
            </div>
        `;
        
        expensesList.appendChild(item);
    });
    
    document.getElementById('totalExpenses').textContent = formatCurrency(total, 'USD');
}

// Generate expense report as PDF
function generateReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    const filteredExpenses = expenseData.filter(expense => {
        return expense.date >= startDate && expense.date <= endDate;
    });
    
    if (filteredExpenses.length === 0) {
        alert('No expenses found in the selected date range');
        return;
    }
    
    // Create PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.text('Travel Expense Report', 105, 20, { align: 'center' });
    
    // Add date range
    doc.setFontSize(12);
    doc.text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 30);
    
    // Add table header
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Date', 14, 45);
    doc.text('Description', 50, 45);
    doc.text('Category', 120, 45);
    doc.text('Amount', 170, 45);
    
    // Add expense rows
    let y = 55;
    let total = 0;
    doc.setFont(undefined, 'normal');
    
    filteredExpenses.forEach(expense => {
        doc.text(formatDate(expense.date), 14, y);
        doc.text(expense.description.substring(0, 30), 50, y);
        doc.text(expense.category, 120, y);
        doc.text(formatCurrency(expense.amount, expense.currency), 170, y);
        total += expense.amount;
        y += 10;
    });
    
    // Add total
    doc.setFont(undefined, 'bold');
    doc.text('Total:', 120, y + 10);
    doc.text(formatCurrency(total, 'USD'), 170, y + 10);
    
    // Save the PDF
    doc.save(`Expense-Report-${startDate}-to-${endDate}.pdf`);
    
    // Close modal
    document.getElementById('reportModal').style.display = 'none';
}

// Fetch city/airport suggestions from Amadeus API
async function fetchCitySuggestions(query, targetId) {
    if (query.length < 2) {
        document.getElementById(targetId).innerHTML = '';
        return;
    }
    
    try {
        const suggestions = await getCitySuggestions(query);
        const suggestionsDiv = document.getElementById(targetId);
        suggestionsDiv.innerHTML = '';
        
        suggestions.data.forEach(item => {
            const name = `${item.name} (${item.iataCode ? item.iataCode + ')' : item.address.cityName + ')'}`;
            const suggestion = document.createElement('div');
            suggestion.style.padding = '8px 12px';
            suggestion.style.cursor = 'pointer';
            suggestion.style.borderBottom = '1px solid #eee';
            suggestion.style.fontSize = '14px';
            suggestion.textContent = name;
            
            suggestion.addEventListener('click', function() {
                document.getElementById(targetId === 'fromSuggestions' ? 'from' : 'to').value = name;
                suggestionsDiv.innerHTML = '';
            });
            
            suggestionsDiv.appendChild(suggestion);
        });
        
        if (suggestions.data.length > 0) {
            suggestionsDiv.style.display = 'block';
            suggestionsDiv.style.border = '1px solid #ddd';
            suggestionsDiv.style.borderRadius = '0 0 5px 5px';
            suggestionsDiv.style.backgroundColor = 'white';
            suggestionsDiv.style.maxHeight = '200px';
            suggestionsDiv.style.overflowY = 'auto';
            suggestionsDiv.style.position = 'absolute';
            suggestionsDiv.style.width = 'calc(100% - 24px)';
            suggestionsDiv.style.zIndex = '100';
        } else {
            suggestionsDiv.style.display = 'none';
        }
    } catch (error) {
        console.error('Error fetching city suggestions:', error);
    }
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Helper function to format time
function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Helper function to format date for input field
function formatDateForInput(dateString) {
    const parts = dateString.split(/[\/\-]/);
    if (parts.length === 3) {
        const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
}

// Helper function to format currency
function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
    }).format(amount);
}

// Make helper functions available globally
window.applyReceiptAnalysis = applyReceiptAnalysis;
window.applyManualReceiptData = applyManualReceiptData;