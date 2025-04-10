const Amadeus = require("amadeus");

const amadeus = new Amadeus({
    clientId: "UJ9jHGZqhmTx0ffzWZmbFj0NKXquIczb",
    clientSecret: "1gbrfFCiWefGpdCp",
});

async function hotel() {
  try {
    // List of hotels in Paris
    const response = await amadeus.referenceData.locations.hotels.byCity.get({
      cityCode: "PAR",
    });

    console.log(response);
  } catch (error) {
    console.error(error);
  }
}

hotel();