// Global variables
let userData = {};
let travelData = [];
let expenseData = [];
let currentReceipt = null;
let currentExpense = null;
let accessToken = '';
let tokenExpiry = 0;
const keywordCache = {};

const API_BASE_URL = 'http://localhost:3000'; 


function debounce(fn, delay = 500) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }
  
  const inputField = document.getElementById('departure'); 
  
  inputField.addEventListener('input', debounce(async (event) => {
    const keyword = event.target.value.trim();
    if (keyword.length < 2) return; 
    try {
      
     const res = await fetch(`http://localhost:3000/api/locations?keyword=${encodeURIComponent(keyword)}`);
      const data = await res.json();
  
      // Update suggestion dropdown etc.
    } catch (err) {
      console.error('Autocomplete fetch failed:', err);
    }
  }, 600));
  

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadUserData();
    loadExpenses();
    setupEventListeners();
   
});

// Initialize Amadeus service
const amadeusService = {
    async searchFlights(params) {
      try {
        const response = await fetch('http://localhost:3000/api/flights/search', {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            origin: params.origin,
            destination: params.destination,
            departureDate: params.departureDate,
            returnDate: params.returnDate,
            adults: params.adults,
            travelClass: params.travelClass,
            currency: params.currency || 'USD'
          })
        });
  
        if (!response.ok) {
          throw new Error(`Flight search failed: ${response.statusText}`);
        }
  
        const data = await response.json();
  
        if (!data || !Array.isArray(data)) {
            console.warn('No valid data returned. Falling back to mock.');
          return getMockFlightData(params.origin, params.destination, params.departureDate, params.returnDate);
        }
  
        return data;
      } catch (error) {
        console.error('Flight search error:', error);
        return getMockFlightData(params.origin, params.destination, params.departureDate, params.returnDate);
      }
    },
  
    async searchHotels(params) {
      try {
        const response = await fetch(`http://localhost:3000/api/hotels?cityCode=${params.cityCode}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
  
        if (!response.ok) {
          throw new Error(`Failed to fetch hotels: ${response.statusText}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('Hotel search error:', error);
        return getMockHotelData(params.cityCode, params.checkInDate, params.checkOutDate);
      }
    },
  
    async searchTransfers(params) {
      try {
        const response = await fetch('http://localhost:3000/api/transfers', {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        });
  
        if (!response.ok) {
          throw new Error(`Transfer search failed: ${response.statusText}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('Transfer search error:', error);
        return getMockTransferData(params.startLocationCode, params.endAddressLine);
      }
    },
  
  
    async getLocationSuggestions(keyword) {
        if (keywordCache[keyword]) {
          return keywordCache[keyword];
        }
      
        const res = await fetch(`http://localhost:3000/api/locations?keyword=${encodeURIComponent(keyword)}`);

        const data = await res.json();
        keywordCache[keyword] = data;
        return data;
      }
      
  };
 
  
  async function fetchCitySuggestions(query, targetId) {
    if (query.length < 2) {
        document.getElementById(targetId).innerHTML = '';
        return;
    }

    try {
        const suggestionsDiv = document.getElementById(targetId);
        suggestionsDiv.innerHTML = '<div class="loading-suggestion">Loading...</div>';
        suggestionsDiv.style.display = 'block';

        const suggestions = await amadeusService.getLocationSuggestions(query);

        suggestionsDiv.innerHTML = ''; 

        const suggestionsList = Array.isArray(suggestions) ? suggestions : [];

        if (suggestionsList.length === 0) {
            suggestionsDiv.innerHTML = '<div class="no-results">No locations found</div>';
            suggestionsDiv.style.display = 'block';
            return;
        }

        suggestionsList.forEach(item => {
            const suggestionItem = document.createElement('div');
            suggestionItem.classList.add('suggestion-item');

            const displayName = `${item.address?.cityName || item.name} (${item.iataCode})`;

            suggestionItem.textContent = displayName;

            suggestionItem.addEventListener('click', () => {
                const inputId = targetId.replace('Suggestions', '');
                document.getElementById(inputId).value = displayName;
                suggestionsDiv.innerHTML = '';
                suggestionsDiv.style.display = 'none';
            });

            suggestionsDiv.appendChild(suggestionItem);
        });

        suggestionsDiv.style.display = 'block';

    } catch (error) {
        console.error('Error in fetchCitySuggestions:', error);
        const suggestionsDiv = document.getElementById(targetId);
        suggestionsDiv.innerHTML = '<div class="error-message">Failed to load suggestions</div>';
        suggestionsDiv.style.display = 'block';
    }
}

// Mock location data generator (for autocomplete fallback)
function getMockLocationData(keyword) {
    const mockLocations = [
      { name: "Paris", iataCode: "PAR", address: { cityName: "Paris" } },
      { name: "New York", iataCode: "JFK", address: { cityName: "New York" } },
      { name: "London", iataCode: "LHR", address: { cityName: "London" } },
      { name: "Tokyo", iataCode: "NRT", address: { cityName: "Tokyo" } },
      { name: "Berlin", iataCode: "BER", address: { cityName: "Berlin" } }
    ];
  
    // Filter mock data based on keyword (case-insensitive)
    return mockLocations.filter(loc => 
      loc.name.toLowerCase().includes(keyword.toLowerCase()) || 
      loc.iataCode.toLowerCase().includes(keyword.toLowerCase())
    );
  }


// Mock data generators
function getMockFlightData(origin, destination, departureDate, returnDate) {
    const flights = {
        data: [{
            id: "mock-flight-1",
            price: { 
                total: "450.00",
                currency: "USD"
            },
            itineraries: [{
                duration: "PT8H30M",
                segments: [{
                    departure: { 
                        iataCode: origin,
                        at: `${departureDate}T08:00:00`
                    },
                    arrival: { 
                        iataCode: destination,
                        at: `${departureDate}T16:30:00`
                    },
                    carrierCode: "DL",
                    number: "123",
                    operating: {
                        carrierCode: "DL"
                    }
                }]
            }],
            validatingAirlineCodes: ["DL"]
        }]
    };

    if (returnDate) {
        flights.data[0].itineraries.push({
            duration: "PT9H15M",
            segments: [{
                departure: { 
                    iataCode: destination,
                    at: `${returnDate}T18:00:00`
                },
                arrival: { 
                    iataCode: origin,
                    at: `${returnDate}T03:15:00+1`
                },
                carrierCode: "DL",
                number: "456",
                operating: {
                    carrierCode: "DL"
                }
            }]
        });
        flights.data[0].price.total = "799.00";
    }

    return flights;
}

function getMockHotelData(cityCode, checkInDate, checkOutDate) {
    return [{
        id: "mock-hotel-1",
        name: "Grand Hotel",
        price: 199,
        rating: 4,
        cancellation: "Free cancellation",
        bookingUrl: "#"
    }];
}


function getMockTransferData(from, to) {
    return [{
        vehicle: { type: 'Sedan' },
        price: 45, 
        duration: '1h',
        provider: { name: 'MockTransfers Inc.' },
        bookingLink: 'https://www.example.com/transfer-booking'
    }];
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



function createItineraries(flights, hotels, transfers, from, to, departure, returnDate, travelers, travelClass) {
    const days = returnDate ? Math.ceil((new Date(returnDate) - new Date(departure)) / (1000 * 60 * 60 * 24)) : 1;

    const flightResults = Array.isArray(flights) ? flights : (flights?.data || []);

    return flightResults.map((flight, index) => {
        // Process hotel data
        const rawHotel = hotels?.[index % hotels?.length] || {
            name: "Sample Hotel",
            rating: 4,
            price: 200,
            cancellation: "Free cancellation"
        };

        // Process transfer data - use mock if API returned empty array
        const rawTransfer = transfers?.[index % transfers?.length] || {
            vehicle: { type: 'Sedan' },
            price: 45,
            provider: { name: 'City Transfers' },
            duration: 'PT1H'
        };

        // Process flight segments
        const segments = flight.itineraries?.[0]?.segments || [];
        const firstSegment = segments[0] || {};
        const lastSegment = segments[segments.length - 1] || {};

        const flightPrice = parseFloat(flight.price?.total || 0);
        const hotelPricePerNight = rawHotel.price || (rawHotel.rating * 50) || 150;
        const transferPricePerDay = rawTransfer.price || 0;

        // ✅ Correct total price
        const totalPrice = flightPrice + (hotelPricePerNight * days) + (transferPricePerDay * days);

        return {
            id: `itinerary-${index}-${Date.now()}`,
            from,
            to,
            departure,
            return: returnDate,
            travelers,
            class: travelClass,
            totalPrice,

            flight: {
                airline: flight.validatingAirlineCodes?.[0] || 'Unknown',
                flightNumber: firstSegment.number || 'N/A',
                departureTime: formatTime(firstSegment.departure?.at),
                arrivalTime: formatTime(lastSegment.arrival?.at),
                duration: formatDuration(flight.itineraries?.[0]?.duration),
                price: flightPrice,
                bookingUrl: flight.bookingUrl || `https://www.booking.com/flight?id=${flight.id}`
            },

            hotel: {
                name: rawHotel.name || "Unknown Hotel",
                rating: rawHotel.rating || 3,
                price: hotelPricePerNight * days,
                pricePerNight: hotelPricePerNight,
                cancellation: rawHotel.cancellation || "Free cancellation",
                bookingUrl: rawHotel.bookingUrl || "#"
            },

            car: {
                type: rawTransfer.vehicle?.type || 'Standard',
                price: transferPricePerDay * days,
                pricePerDay: transferPricePerDay,
                duration: formatDuration(rawTransfer.duration),
                company: rawTransfer.provider?.name || 'Transfer Provider',
                unlimitedMileage: true,
                bookingUrl: rawTransfer.bookingLink || '#'
            }
        };
    });
}

// Helper functions (make sure these exist)
function formatDuration(duration) {
    if (!duration) return "N/A";
    const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    const hours = matches[1] ? `${matches[1]}h` : '';
    const mins = matches[2] ? `${matches[2]}m` : '';
    return `${hours} ${mins}`.trim() || "N/A";
}


// Helper functions
function calculateTransferDuration(transfer) {
    if (!transfer.start?.dateTime || !transfer.end?.dateTime) return '1h';
    
    const start = new Date(transfer.start.dateTime);
    const end = new Date(transfer.end.dateTime);
    const diff = (end - start) / (1000 * 60); // Difference in minutes
    
    if (diff < 60) return `${Math.round(diff)}m`;
    return `${Math.floor(diff/60)}h ${Math.round(diff%60)}m`;
}

function generateBookingUrl(flight, from, to, date) {
    const airline = flight.validatingAirlineCodes?.[0] || 'UA';
    return `https://www.booking.com/searchresults.html?ss=${to}&checkin_year_month_monthday=${date}`;
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
    
    document.querySelectorAll('.closeReportModal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.getElementById('reportModal').style.display = 'none';
        });
    });
    // Generate report button
    document.getElementById('generateReportBtn').addEventListener('click', function() {
        generateReport();
    });
    
    // Close modal
    document.getElementById('closeModal').addEventListener('click', function() {
        document.getElementById('itineraryModal').style.display = 'none';
    });
    
    document.getElementById('cancelModal').addEventListener('click', function() {
        document.getElementById('itineraryModal').style.display = 'none';
    });
    
    document.getElementById('from').addEventListener('input', debounce(function(event) {
        const keyword = event.target.value.trim();
        // Don't search for dates in either yyyy-mm-dd or mm/dd/yyyy format
        if (keyword.length >= 2 && !keyword.match(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/)) {
            fetchCitySuggestions(keyword, 'fromSuggestions');
        }
      }, 600));
      
      document.getElementById('to').addEventListener('input', debounce(function(event) {
        const keyword = event.target.value.trim();
        if (keyword.length >= 2 && !keyword.match(/^(?:\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/)) {
            fetchCitySuggestions(keyword, 'toSuggestions');
        }
      }, 600));
      

}    

  // Update your searchTravel function
  async function searchTravel() {
    const from = document.getElementById('from').value;
    const to = document.getElementById('to').value;
    const departure = document.getElementById('departure').value;
    const returnDate = document.getElementById('return').value;
    const travelers = document.getElementById('travelers').value;
    const travelClass = document.getElementById('class').value;
    
    // Extract IATA codes (assuming format "City (CODE)")
    const originCode = from.match(/\(([A-Z]{3})\)/)?.[1] || from;
    const destinationCode = to.match(/\(([A-Z]{3})\)/)?.[1] || to;
  
    // Show loading state
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('resultsContainer').style.display = 'block'; // Add this line

    document.getElementById('itinerariesList').innerHTML = '';
  
    try {
      // Use amadeusService methods instead of direct function calls
      const [flights, hotels, transfers] = await Promise.all([
    
        amadeusService.searchFlights({
          origin: originCode,
          destination: destinationCode,
          departureDate: departure,
          returnDate: returnDate,
          adults: travelers,
          travelClass: travelClass.toUpperCase()
        }),
        amadeusService.searchHotels({
          cityCode: destinationCode,
          checkInDate: departure,
          checkOutDate: returnDate || departure,
          adults: travelers
        }),
        amadeusService.searchTransfers({
          startLocationCode: originCode,
          endAddressLine: to,
          endCityName: to.split(',')[0].trim(),
          passengers: travelers
        })
      ]);
      console.log('Flight data:', flights);
      console.log('Hotel data:', hotels);
      console.log('Transfer data:', transfers);
  
      // Process and display results
      travelData =createItineraries(flights, hotels, transfers, from, to, departure, returnDate, travelers, travelClass) 
        console.log('Travel data:', travelData);
      displayItineraries(travelData);
      checkTravelCompliance(to);
  
    } catch (error) {
      console.error('Search error:', error);
      alert('Error searching for travel options. Please try again.');
    } finally {
      document.getElementById('loadingIndicator').style.display = 'none';
      document.getElementById('resultsContainer').style.display = 'block'; // Show even on error

    }
}


// Display itineraries in the UI
function displayItineraries(itineraries) {
    // Add this at the start of your displayItineraries() function
    console.log('Displaying itineraries:', itineraries);
    const itinerariesList = document.getElementById('itinerariesList');
    console.log('itinerariesList element:', itinerariesList);
    itinerariesList.innerHTML = '';

    if (!itineraries || itineraries.length === 0) {
        itinerariesList.innerHTML = `
            <div class="no-results">
                <i class="fas fa-plane-slash"></i>
                <h4>No itineraries found</h4>
                <p>Try adjusting your search criteria</p>
            </div>
        `;}
    
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
    
    // Redirect to booking URL
    window.open(itinerary.flight.bookingUrl, '_blank');
    alert('Flight has been added to your expenses!');
}

// Check travel compliance for destination
function checkTravelCompliance(destination) {
    const complianceCheck = document.getElementById('complianceCheck');
    complianceCheck.style.display = 'block';
    
    // Extract the actual destination (remove airport code if present)
    const destinationParts = destination.split('(');
    const actualDestination = destinationParts[0].trim();
    
    complianceCheck.innerHTML = `
        <div class="itinerary-card" style="background: #fff8e1;">
            <div class="itinerary-header" style="background: rgba(255, 193, 7, 0.1);">
                <div>
                    <h4><i class="fas fa-passport"></i> Travel Compliance Check</h4>
                    <p>Important information for your trip to ${actualDestination}</p>
                </div>
            </div>
            <div class="itinerary-body">
                <div class="segment">
                    <div class="segment-icon" style="background: rgba(255, 193, 7, 0.1); color: var(--warning);">
                        <i class="fas fa-passport"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Visa Requirements</h4>
                        <p>Check visa requirements for ${actualDestination}</p>
                        <div style="margin-top: 10px;">
                            <a href="https://www.lufthansa.com/za/en/entryprocesses?gclid=dcbe729a94111a1d53ad156d3c711990&gclsrc=3p.ds&msclkid=dcbe729a94111a1d53ad156d3c711990&utm_source=bing&utm_medium=cpc&utm_campaign=ZA_EN%20-%208_DSA&utm_term=%2Fza%2Fen%2F&utm_content=ZA_EN%20-%20DSA" 
                               target="_blank" 
                               class="btn btn-primary" 
                               style="padding: 5px 10px; font-size: 12px;">
                                <i class="fas fa-external-link-alt"></i> Check Visa Requirements
                            </a>
                        </div>
                    </div>
                </div>
                <div class="segment">
                    <div class="segment-icon" style="background: rgba(255, 193, 7, 0.1); color: var(--warning);">
                        <i class="fas fa-syringe"></i>
                    </div>
                    <div class="segment-details">
                        <h4>Health Requirements</h4>
                        <p>Check health recommendations for ${actualDestination}</p>
                        <div style="margin-top: 10px;">
                            <a href="https://my.bestexpatscover.com/?_ms=499&_msai=overseas%20healthcare&utm_campaign=484001933&utm_content=77309607317825&utm_medium=paidsearch&msclkid=890233792c2a1bfc29a1548e848b4b22" 
                               target="_blank" 
                               class="btn btn-primary" 
                               style="padding: 5px 10px; font-size: 12px;">
                                <i class="fas fa-external-link-alt"></i> Check Health Requirements
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// // Helper function to format time
function formatTime(dateTimeString) {
    const date = new Date(dateTimeString);
    if (isNaN(date)) return "N/A";
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// // // Helper function
function formatDateForAPI(dateStr) {
  const [month, day, year] = dateStr.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
        // Initialize Tesseract.js with English language
        const { createWorker } = Tesseract;
        const worker = await createWorker('eng');
        
        let result;
        if (file.type === 'application/pdf') {
            // For PDFs, we need to convert pages to images first
            // In a real app, you'd use a PDF.js or similar library
            // This is a simplified version
            const pdfUrl = URL.createObjectURL(file);
            result = await worker.recognize(pdfUrl);
            URL.revokeObjectURL(pdfUrl);
        } else {
            // For images
            result = await worker.recognize(file);
        }
        
        await worker.terminate();
        
        const text = result.data.text;
        console.log("OCR Text:", text); // For debugging
        
        // Improved regex patterns
        const amountMatch = text.match(/(Total|Amount|TOTAL|AMOUNT|Balance Due|GRAND TOTAL)[:\s]*[\$€£¥]?[\s]*(\d+[\.,]\d{2})/i);
        const dateMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/);
        const merchantMatch = text.match(/^(.*?)(\n|$)|([A-Z][A-Z\s]{3,})/);
        
        const amount = amountMatch ? parseFloat(amountMatch[2].replace(',', '.')) : null;
        const date = dateMatch ? formatDateForInput(dateMatch[0]) : new Date().toISOString().split('T')[0];
        const merchant = merchantMatch ? (merchantMatch[0] || merchantMatch[3]).substring(0, 30).trim() : 'Unknown Merchant';
        
        if (!amount) {
            throw new Error('Could not extract amount from receipt');
        }
        
        document.getElementById('receiptAnalysisContent').innerHTML = `
            <div style="margin-bottom: 10px;">
                <p><strong>Extracted from receipt:</strong></p>
                <p><strong>Merchant:</strong> ${merchant}</p>
                <p><strong>Amount:</strong> ${formatCurrency(amount, 'USD')}</p>
                <p><strong>Date:</strong> ${date}</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="applyReceiptAnalysis('${merchant.replace(/'/g, "\\'")}', ${amount}, '${date}', 'other')">
                    <i class="fas fa-check"></i> Use This Data
                </button>
                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 12px;" onclick="showManualCorrectionForm()">
                    <i class="fas fa-edit"></i> Correct Data
                </button>
            </div>
        `;
    } catch (error) {
        console.error('OCR Error:', error);
        document.getElementById('receiptAnalysisContent').innerHTML = `
            <div style="text-align: center; color: var(--error);">
                <p>Failed to process receipt. Please enter details manually.</p>
                <button class="btn btn-primary" onclick="showManualCorrectionForm()">
                    Enter Manually
                </button>
            </div>
        `;
    }
}


// Helper function to show manual correction form
function showManualCorrectionForm() {
    document.getElementById('receiptAnalysisContent').innerHTML = `
        <div style="margin-top:10px">
            <label>Correct Details:</label>
            <input type="text" id="correctMerchant" placeholder="Merchant name" style="margin-bottom:5px;width:100%">
            <input type="number" id="correctAmount" placeholder="Amount" style="margin-bottom:5px;width:100%">
            <input type="date" id="correctDate" style="margin-bottom:5px;width:100%">
            <select id="correctCategory" style="width:100%">
                <option value="flight">Flight</option>
                <option value="hotel">Hotel</option>
                <option value="meal">Meal</option>
                <option value="transport">Transport</option>
                <option value="other">Other</option>
            </select>
            <button class="btn btn-primary" style="width:100%;margin-top:5px" onclick="applyManualReceiptData()">
                Apply Changes
            </button>
        </div>
    `;
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
    const amount = parseFloat(document.getElementById('expense-amount').value);
    const currency = document.getElementById('expense-currency').value;
    const description = document.getElementById('expense-description').value.trim();
    
    // Validate inputs
    if (!date || !category || isNaN(amount) || amount <= 0 || !description) {
        alert('Please fill in all required fields with valid values');
        return;
    }
    
    // Create new expense
    const newExpense = {
        id: `expense-${Date.now()}`,
        date,
        category,
        amount,
        currency,
        description,
        receipt: currentReceipt ? currentReceipt.name : null,
        status: 'pending'
    };
    
    // Add to array and save
    expenseData.unshift(newExpense);
    saveExpenses();
    
    // Refresh display
    displayExpenses();
    
    // Reset form
    resetExpenseForm();
    
    // Show success message
    alert('Expense added successfully!');
}

function resetExpenseForm() {
    document.getElementById('expense-date').value = '';
    document.getElementById('expense-category').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-description').value = '';
    document.getElementById('receiptFile').value = '';
    document.getElementById('receiptPreview').style.display = 'none';
    document.getElementById('receiptAnalysis').style.display = 'none';
    document.getElementById('receiptUpload').style.display = 'block';
    currentReceipt = null;
}

// Improved loadExpenses function
function loadExpenses() {
    const storedExpenses = localStorage.getItem('blossomExpenses');
    if (storedExpenses) {
        try {
            expenseData = JSON.parse(storedExpenses);
        } catch (e) {
            console.error('Error parsing expenses:', e);
            expenseData = [];
        }
    } else {
        expenseData = [];
    }
    displayExpenses();
}

// Improved saveExpenses function
function saveExpenses() {
    try {
        localStorage.setItem('blossomExpenses', JSON.stringify(expenseData));
    } catch (e) {
        console.error('Error saving expenses:', e);
    }
}

// Load expenses from localStorage or API
function loadExpenses() {
    try {
        const storedExpenses = localStorage.getItem('blossomExpenses');
        if (storedExpenses) {
            expenseData = JSON.parse(storedExpenses);
            console.log('Loaded expenses:', expenseData);
        } else {
            expenseData = []; // Initialize empty if no stored data
        }
        displayExpenses();
        saveExpenses(); // Save to localStorage
    } catch (error) {
        console.error('Error loading expenses:', error);
        expenseData = [];
        displayExpenses();
    }

}

// Save expenses to localStorage or API
function saveExpenses() {
    try {
        localStorage.setItem('blossomExpenses', JSON.stringify(expenseData));
        console.log('Expenses saved successfully');
    } catch (error) {
        console.error('Error saving expenses:', error);
    }
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
    const format = document.getElementById('reportFormat').value;

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

    if (format === 'pdf') {
        generatePDFReport(filteredExpenses, startDate, endDate);
    } else if (format === 'csv') {
        generateCSVReport(filteredExpenses, startDate, endDate);
    } else if (format === 'excel') {
        generateExcelReport(filteredExpenses, startDate, endDate);
    }

    document.getElementById('reportModal').style.display = 'none';
}

function generatePDFReport(expenses, startDate, endDate) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text('Travel Expense Report', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Date Range: ${formatDate(startDate)} to ${formatDate(endDate)}`, 14, 30);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Date', 14, 45);
    doc.text('Description', 50, 45);
    doc.text('Category', 120, 45);
    doc.text('Amount', 170, 45);
    
    let y = 55;
    let total = 0;
    doc.setFont(undefined, 'normal');
    
    expenses.forEach(expense => {
        doc.text(formatDate(expense.date), 14, y);
        doc.text(expense.description.substring(0, 30), 50, y);
        doc.text(expense.category, 120, y);
        doc.text(formatCurrency(expense.amount, expense.currency), 170, y);
        total += expense.amount;
        y += 10;
    });
    
    doc.setFont(undefined, 'bold');
    doc.text('Total:', 120, y + 10);
    doc.text(formatCurrency(total, 'USD'), 170, y + 10);
    
    doc.save(`Expense-Report-${startDate}-to-${endDate}.pdf`);
}

function generateCSVReport(expenses, startDate, endDate) {
    let csv = 'Date,Description,Category,Amount\n';
    
    expenses.forEach(expense => {
        csv += `"${formatDate(expense.date)}","${expense.description}","${expense.category}","${formatCurrency(expense.amount, expense.currency)}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Expense-Report-${startDate}-to-${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function generateExcelReport(expenses, startDate, endDate) {
    // For Excel, we'll use CSV with .xls extension (simple solution)
    generateCSVReport(expenses, startDate, endDate);
    // Note: For proper Excel format, you'd need a library like SheetJS
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