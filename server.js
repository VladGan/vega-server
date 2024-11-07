const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const app = express();
const port = 3000;

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Sample mocked data
const assets = [
  { id: uuidv4(), name: 'Bitcoin', type: 'crypto' },
  { id: uuidv4(), name: 'Ethereum', type: 'crypto' },
  { id: uuidv4(), name: 'Apple Inc.', type: 'stock' },
  { id: uuidv4(), name: 'Google', type: 'stock' },
  { id: uuidv4(), name: 'US Dollar', type: 'fiat' },
  { id: uuidv4(), name: 'British Pound', type: 'fiat' },
];

// utility function to test error handling
const throwError = (res) => {
  res.status(400).json({ error: 'Bad Request' });
  // res.status(404).json({ error: 'Not Found' });
}

// Sample historical prices (normally would come from a database)
const generateHistoricalPrices = () => {
  const prices = [];
  const startDate = new Date('2023-01-01');
  const endDate = new Date();
  let price = Math.random() * 10000;

  for (const asset of assets) {
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const newPrice = price + Math.random() * 1000;
      prices.push({
        id: uuidv4(),
        asset: asset.name,
        price: Math.floor(newPrice),
        timestamp: currentDate.getTime()
      });
      currentDate.setDate(currentDate.getDate() + 7);
    }
  }
  return prices;
};

const historicalPrices = generateHistoricalPrices();

// generate test data for the last month
const generatePositionsForTheMonth = () => {
  const positions = [];
  const endDate = (new Date()).toISOString().split('T')[0];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);
  let currentDate = startDate.toISOString().split('T')[0];

  let index = 1;
  let position;
  do {
    let date = new Date(currentDate);
    assets.forEach(asset => {
      position = {
        id: index++,
        asset: asset.id,
        quantity: Math.floor(Math.random() * 100) + 1,
        asOf: date.toISOString(),
        price: Math.floor(Math.random() * 10) + 1
      }
      positions.push(position);
    })
    date.setDate(date.getDate() + 1);
    currentDate = date.toISOString().split('T')[0]
  } while (currentDate !== endDate)

  return positions;
}

// Sample positions
const positions = generatePositionsForTheMonth();


// Helper function to validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

// GET /assets
app.get('/assets', (req, res) => {
  // throwError(res); // uncomment this function to throw an error
  res.json(assets);
});

// GET /prices
app.get('/prices', (req, res) => {
  // throwError(res); // uncomment this function to throw an error
  try {
    const { assets: assetIds, asOf, from, to } = req.query;

    if (!assetIds) {
      return res.status(400).json({
        error: 'assets parameter is required'
      });
    }

    const requestedAssets = assetIds.split(',');

    let filteredPrices = historicalPrices.filter(price =>
      requestedAssets.includes(price.asset)
    );

    // Filter by date range if provided
    if (from && to) {
      if (!isValidDate(from) || !isValidDate(to)) {
        return res.status(400).json({
          error: 'Invalid date format'
        });
      }

      const fromDate = new Date(from);
      const toDate = new Date(to);

      filteredPrices = filteredPrices.filter(price => {
        const priceDate = new Date(price.timestamp);
        return priceDate >= fromDate && priceDate <= toDate;
      });
    }
    // Filter by specific date if provided
    else if (asOf) {
      if (!isValidDate(asOf)) {
        return res.status(400).json({
          error: 'Invalid date format'
        });
      }

      const asOfDate = new Date(asOf);
      filteredPrices = filteredPrices.filter(price =>
        new Date(price.timestamp).toDateString() === asOfDate.toDateString()
      );
    }

    if (asOf) {
      // Get latest price for each asset
      const latestPrices = requestedAssets.map(assetId => {
        const assetPrices = filteredPrices
          .filter(price => price.asset === assetId)
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return assetPrices[0] || {
          id: uuidv4(),
          asset: assetId,
          price: 0
        };
      });

      res.json(latestPrices);
    } else {
      res.json(filteredPrices);
    }

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// GET /portfolios
app.get('/portfolios', (req, res) => {
  // throwError(res); // uncomment this function to throw an error
  try {
    const { asOf } = req.query;

    let filteredPositions = [...positions];

    if (asOf) {
      if (!isValidDate(asOf)) {
        return res.status(400).json({
          error: 'Invalid date format'
        });
      }

      const asOfDate = new Date(asOf);
      filteredPositions = positions.filter(position =>
        new Date(position.asOf).toDateString() === asOfDate.toDateString()
      );
    }

    const portfolio = {
      id: uuidv4(),
      asOf: asOf || new Date().toISOString(),
      positions: filteredPositions
    };

    res.json(portfolio);
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!'
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
