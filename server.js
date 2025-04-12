const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const router = require('./router'); 

const app = express(); 

// Middleware
app.use(cors()); 
app.use(bodyParser.json());
app.use(express.json());

// Routes
app.use('/api', router);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
