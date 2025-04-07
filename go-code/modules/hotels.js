
// hotels.js
export function findHotels(destination) {
    return [
      { name: "Hotel Bliss", price: 120, stars: 4, location: destination },
      { name: "Comfort Inn", price: 90, stars: 3, location: destination },
      { name: "Luxury Stay", price: 250, stars: 5, location: destination }
    ];
  }
  
  export function checkHotelPolicy(hotel) {
    return hotel.price <= 150 ? "Compliant with policy." : "Exceeds budget limits.";
  }