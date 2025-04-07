export function getFlightOptions(destination, date) {
    // Simulate real API call
    return [
      { airline: "FlyHigh", price: 450, date, destination },
      { airline: "SkyJet", price: 400, date, destination },
      { airline: "AirZoom", price: 480, date, destination }
    ];
  }
  
  export function trackFlightPrices(destination) {
    // Simulate price tracking logic
    const priceDrop = Math.random() > 0.5;
    return priceDrop ? `Good news! Prices to ${destination} just dropped!` : `No new deals for ${destination} today.`;
  }