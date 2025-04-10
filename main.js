//WOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOORKS

const Amadeus = require("amadeus");

const amadeus = new Amadeus({
  clientId: "UJ9jHGZqhmTx0ffzWZmbFj0NKXquIczb",
  clientSecret: "1gbrfFCiWefGpdCp",
});

async function main() {
  try {
    // Find the cheapest flights from SYD to BKK
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: "SYD",
      destinationLocationCode: "BKK",
      departureDate: "2025-04-15",
      adults: "2",
    });

    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

main();