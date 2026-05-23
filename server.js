const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Data file path
const DATA_FILE = path.join(__dirname, 'battery_data.json');

// Middleware
app.use(cors());
app.use(express.json());

// Load existing data from file on startup
let batteryReadings = [];
if (fs.existsSync(DATA_FILE)) {
  try {
    const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
    batteryReadings = JSON.parse(fileContent);
    console.log(`📂 Loaded ${batteryReadings.length} records from file`);
  } catch (err) {
    console.error('Error reading data file:', err);
  }
}

// Helper: save current array to file
function saveToFile() {
  fs.writeFile(DATA_FILE, JSON.stringify(batteryReadings, null, 2), (err) => {
    if (err) console.error('Failed to save data:', err);
    else console.log('💾 Data saved to file');
  });
}

// POST endpoint – receive new battery data
app.post('/battery', (req, res) => {
  const batteryData = req.body;

  // Basic validation
  if (!batteryData || typeof batteryData.level !== 'number') {
    return res.status(400).json({ error: 'Invalid battery data format' });
  }

  // Add timestamp and optional ID
  const record = {
    id: batteryReadings.length + 1,
    ...batteryData,
    receivedAt: new Date().toISOString(),
  };

  batteryReadings.push(record);
  saveToFile();  // persist to file

  console.log(`✅ New battery record #${record.id}: ${record.level}%`);
  res.status(201).json({
    message: 'Battery data received',
    id: record.id,
  });
});

// GET endpoint – return all data as JSON
app.get('/battery', (req, res) => {
  res.json(batteryReadings);
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 🖥️ HTML page that auto-refreshes to show live data
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Battery Data Monitor</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: #1e1e2f;
                color: #eee;
                margin: 0;
                padding: 20px;
            }
            .container {
                max-width: 1200px;
                margin: auto;
                background: #2d2d3a;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            }
            h1 {
                text-align: center;
                color: #4caf50;
                margin-top: 0;
            }
            .status {
                text-align: center;
                margin-bottom: 20px;
                font-size: 0.9em;
                color: #aaa;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                background: #3a3a4a;
                border-radius: 8px;
                overflow: hidden;
            }
            th, td {
                padding: 12px 10px;
                text-align: left;
                border-bottom: 1px solid #555;
            }
            th {
                background: #4caf50;
                color: white;
                font-weight: bold;
            }
            tr:hover {
                background: #4a4a5a;
            }
            .no-data {
                text-align: center;
                padding: 40px;
                color: #ccc;
                font-style: italic;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 0.8em;
                color: #888;
            }
            .refresh-note {
                background: #3a3a4a;
                padding: 8px;
                border-radius: 6px;
                text-align: center;
                margin-bottom: 15px;
                font-size: 0.85em;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔋 Live Battery Data Monitor</h1>
            <div class="refresh-note">
                🔄 Page refreshes automatically every 3 seconds — new data appears instantly.
            </div>
            <div class="status" id="statusMsg">Loading data...</div>
            <div id="tableContainer">
                <div class="no-data">Waiting for data...</div>
            </div>
            <div class="footer">
                Data is stored permanently in <code>battery_data.json</code> on the server.
            </div>
        </div>

        <script>
            async function fetchData() {
                try {
                    const response = await fetch('/battery');
                    if (!response.ok) throw new Error('Network error');
                    const data = await response.json();
                    updateTable(data);
                    document.getElementById('statusMsg').innerHTML = \`✅ Last updated: \${new Date().toLocaleTimeString()} — \${data.length} records\`;
                } catch (err) {
                    document.getElementById('statusMsg').innerHTML = \`❌ Failed to load data: \${err.message}\`;
                }
            }

            function updateTable(records) {
                const container = document.getElementById('tableContainer');
                if (!records || records.length === 0) {
                    container.innerHTML = '<div class="no-data">No battery data received yet. Send some from your Flutter app!</div>';
                    return;
                }

                // Build table HTML
                let html = \`
                    <table>
                        <thead>
                            <tr><th>ID</th><th>Level (%)</th><th>Temp (°C)</th><th>Voltage (mV)</th><th>Health</th><th>Status</th><th>Technology</th><th>Received At</th></tr>
                        </thead>
                        <tbody>
                \`;
                records.forEach(record => {
                    html += \`
                        <tr>
                            <td>\${record.id}</td>
                            <td>\${record.level}</td>
                            <td>\${record.temperature ?? 'N/A'}</td>
                            <td>\${record.voltage ?? 'N/A'}</td>
                            <td>\${record.health ?? 'N/A'}</td>
                            <td>\${record.status ?? 'N/A'}</td>
                            <td>\${record.technology ?? 'N/A'}</td>
                            <td>\${new Date(record.receivedAt).toLocaleString()}</td>
                        </tr>
                    \`;
                });
                html += '</tbody></table>';
                container.innerHTML = html;
            }

            // Refresh every 3 seconds
            fetchData();
            setInterval(fetchData, 3000);
        </script>
    </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Data file: ${DATA_FILE}`);
  console.log(`🌐 Open http://localhost:${PORT} to view live dashboard`);
});
