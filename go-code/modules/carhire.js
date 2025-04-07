// carhire.js
export function listCarRentals(destination) {
    return [
      { company: "AutoHire", type: "Sedan", price: 40, location: destination },
      { company: "ZoomDrive", type: "SUV", price: 60, location: destination },
      { company: "RentQuick", type: "Compact", price: 35, location: destination }
    ];
  }
  
  export function getBestCarDeal(rentals) {
    return rentals.reduce((best, current) => current.price < best.price ? current : best);
  }