const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());                   // allow Flutter app to call this API
app.use(express.json());           // parse JSON bodies

// In-memory storage (for demo; use a real DB for production)
let batteryReadings = [];

// POST endpoint to receive battery data
app.post('/battery', (req, res) => {
  const batteryData = req.body;

  // Basic validation
  if (!batteryData || typeof batteryData.level !== 'number') {
    return res.status(400).json({ error: 'Invalid battery data format' });
  }

  // Add timestamp
  const record = {
    ...batteryData,
    receivedAt: new Date().toISOString(),
  };

  batteryReadings.push(record);
  console.log('✅ Received battery info:', record);

  res.status(201).json({
    message: 'Battery data received successfully',
    id: batteryReadings.length,
  });
});

// Optional: GET endpoint to retrieve all readings (for debugging)
app.get('/battery', (req, res) => {
  res.json(batteryReadings);
});

// Health check (useful for Render)
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
