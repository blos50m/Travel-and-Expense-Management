
// assistant.js
import { getFlightOptions } from './flight.js';
import { findHotels } from './hotels.js';
import { listCarRentals } from './carhire.js';

export async function generateItinerary(destination, date) {
  const flights = getFlightOptions(destination, date);
  const hotels = findHotels(destination);
  const cars = listCarRentals(destination);

  const itinerary = {
    flight: flights[0],
    hotel: hotels[0],
    carRental: cars[0],
    summary: `Trip to ${destination} on ${date} with flight ${flights[0].airline}, hotel at ${hotels[0].name}, and car from ${cars[0].company}.`
  };

  return itinerary;
}
