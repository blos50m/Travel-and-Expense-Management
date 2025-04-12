const Amadeus = require('amadeus');
require('dotenv').config();

class AmadeusService {
  constructor() {
    this.amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET
    });
    this.cache = new Map(); 
  }

  // Flight Offers Search with enhanced parameters and error handling
  async searchFlights(params) {
    try {
      // Validate required parameters
      if (!params.origin || !params.destination || !params.departureDate) {
        throw new Error('Missing required flight search parameters');
      }

      // Build cache key
      const cacheKey = `flights:${params.origin}:${params.destination}:${params.departureDate}:${params.returnDate || ''}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const searchParams = {
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: params.adults || 1,
        travelClass: params.travelClass || 'ECONOMY',
        currencyCode: params.currency || 'USD',
        nonStop: params.nonStop || false,
        max: params.max || 5 // Limit results
      };

      // Optional parameters
      if (params.returnDate) searchParams.returnDate = params.returnDate;
      if (params.includedAirlineCodes) searchParams.includedAirlineCodes = params.includedAirlineCodes;
      if (params.excludedAirlineCodes) searchParams.excludedAirlineCodes = params.excludedAirlineCodes;

      const response = await this.amadeus.shopping.flightOffersSearch.get(searchParams);
      
      // Cache the result (5 minute TTL)
      this.cache.set(cacheKey, response.data);
      setTimeout(() => this.cache.delete(cacheKey), 300000);

      return this.transformFlightResponse(response.data);
    } catch (error) {
      console.error('Flight search error:', error);
      throw this.formatAmadeusError(error);
    }
  }

  async searchHotels(params) {
    try {
      if (!params.cityCode) {
        throw new Error('Missing cityCode for hotel search');
      }
  
      const cacheKey = `hotels:locations:${params.cityCode}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }
  
      const hotelList = await this.amadeus.referenceData.locations.hotels.byCity.get({
        cityCode: params.cityCode,
        radius: 5,
        radiusUnit: 'KM',
        ratings: '3,4,5'
      });
  
      const result = (hotelList.data || []).slice(0, 5);
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), 300000); // Cache for 5 minutes
  
      return result;
    } catch (error) {
      console.error('Hotel search error:', error);
      throw this.formatAmadeusError(error);
    }
  }
  
  // Enhanced transfer search with better parameter handling
  async searchTransfers(params) {
    try {
      if (!params.startLocationCode || !params.endAddressLine) {
        throw new Error('Missing required transfer parameters');
      }

      const response = await this.amadeus.shopping.transferOffers.post({
        startLocationCode: params.startLocationCode,
        endAddressLine: params.endAddressLine,
        endCityName: params.endCityName,
        endZipCode: params.endZipCode,
        endCountryCode: params.endCountryCode,
        endName: params.endName,
        endGeoCode: params.endGeoCode,
        transferType: params.transferType || 'PRIVATE',
        startDateTime: params.startDateTime || new Date().toISOString(),
        providerCodes: params.providerCodes || 'TXO,UAX', // Multiple providers
        passengers: params.passengers || 1,
        vehicleTypes: params.vehicleTypes || ['SEDAN', 'SUV'],
        includeAllotment: params.includeAllotment || false
      });

      return response.data;
    } catch (error) {
      console.error('Transfer search error:', error);
      throw this.formatAmadeusError(error);
    }
  }

  // Location search with better filtering
  async getLocations(keyword, types = ['CITY', 'AIRPORT']) {
    try {
      if (!keyword || keyword.length < 2) {
        return [];
      }

      const cacheKey = `locations:${keyword}:${types.join(',')}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey);
      }

      const response = await this.amadeus.referenceData.locations.get({
        keyword,
        subType: types.join(','),
        view: 'LIGHT', // Only basic info
        page: { limit: 10 } // Limit results
      });

      // Filter out unwanted results and format consistently
      const locations = (response.data || []).filter(loc => 
        loc.subType && types.includes(loc.subType)
      ).map(this.formatLocation);
      this.cache.set(cacheKey, locations);
      setTimeout(() => this.cache.delete(cacheKey), 300000);

      return locations;
    } catch (error) {
      console.error('Location lookup error:', error);
      throw this.formatAmadeusError(error);
    }
  }

  // Helper methods
  formatAmadeusError(error) {
    if (error.response) {
      // Amadeus API error response
      return new Error(
        `Amadeus API Error: ${error.response.status} - ${error.response.data.errors?.[0]?.detail || error.message}`
      );
    }
    return error;
  }

  formatLocation(location) {
    return {
      type: location.subType,
      name: location.name,
      iataCode: location.iataCode,
      address: {
        cityName: location.address?.cityName,
        countryCode: location.address?.countryCode,
        regionCode: location.address?.regionCode
      },
      geoCode: {
        latitude: location.geoCode?.latitude,
        longitude: location.geoCode?.longitude
      }
    };
  }

  transformFlightResponse(flightData) {
    if (!Array.isArray(flightData)) return [];
    
    return flightData.map(offer => ({
      id: offer.id,
      price: {
        total: offer.price.total,
        currency: offer.price.currency,
        base: offer.price.base
      },
      itineraries: offer.itineraries.map(itinerary => ({
        duration: itinerary.duration,
        segments: itinerary.segments.map(segment => ({
          departure: {
            airport: segment.departure.iataCode,
            terminal: segment.departure.terminal,
            time: segment.departure.at
          },
          arrival: {
            airport: segment.arrival.iataCode,
            terminal: segment.arrival.terminal,
            time: segment.arrival.at
          },
          airline: segment.carrierCode,
          flightNumber: segment.number,
          aircraft: segment.aircraft?.code,
          duration: segment.duration,
          operating: segment.operating?.carrierCode
        }))
      })),
      validatingAirlineCodes: offer.validatingAirlineCodes,
      travelerPricings: offer.travelerPricings?.map(pricing => ({
        travelerId: pricing.travelerId,
        fareOption: pricing.fareOption,
        price: pricing.price
      }))
    }));
  }
}

module.exports = new AmadeusService();