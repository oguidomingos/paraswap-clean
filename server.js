const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const arbitrageRoutes = require("./routes/arbitrage");

const app = express();
app.use(bodyParser.json());
app.use('/api', arbitrageRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
