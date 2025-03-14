const fs = require('fs');
const path = require('path');

// Specify the folder path
const folderPath = './sources';

let source_json = [];

const express = require('express');
const http = require('http');          // <-- Import the http module
const { Server } = require('socket.io'); // <-- Import the Socket.IO Server class

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Optional Socket.IO config
  cors: {
    origin: "*", // configure to match your client domain
    methods: ["GET", "POST"]
  }
});

// Body parsing middleware
app.use(express.json({ limit: '100mb' })); // Increase limit if images are large

const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

let max_users = 4
let user_slot_taken = new Array(max_users).fill(false);

// Example: using Express + Socket.IO
app.post('/upload', (req, res) => {
  try {
    // 1) Extract both images from the request
    const { colorImage } = req.body;
    console.log(req);

    // 2) Validate color image
    if (!colorImage || !colorImage.data || !colorImage.fileName) {
      console.log("Color image or fileName is missing.");
      return res.status(400).send('Color image data and fileName are required.');
    }

    // 4) Ensure the uploads directory exists
    const uploadsDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // 5) A small helper to save base64 PNG data
    const saveBase64Png = (base64String, baseFileName) => {
      // Remove prefix: "data:image/png;base64,"
      const cleanBase64 = base64String.replace(/^data:image\/png;base64,/, '');

      // Make file name safe
      const safeFileName = path.basename(baseFileName + '.png');
      const filePath = path.join(uploadsDir, safeFileName);

      // Write file
      fs.writeFileSync(filePath, Buffer.from(cleanBase64, 'base64'));

      return { safeFileName, filePath };
    };

    // 6) Save the color image
    const colorResult = saveBase64Png(colorImage.data, colorImage.fileName);

    // 9) Send a success response
    res
      .status(200)
      .send(
        `Saved color image as "${colorResult.safeFileName}"`
      );
  } catch (err) {
    console.error('Error processing images', err);
    res.status(500).send('Server error');
  }
});


io.on('connection', (socket) => {
  
  // Increment user count and store this client's index
  let clientIndex = 0;
  while (user_slot_taken[clientIndex])
    clientIndex++;
  user_slot_taken[clientIndex] = true;

  socket.emit('clientIndex', {clientIndex, max_users});

  // Read file and send data to this connected client
  fs.readFile(path.join(__dirname, 'world_text.json'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      socket.emit('fileError', 'Error loading the file');
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      socket.emit('fileContents', jsonData); // Send the parsed JSON to the client
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
      socket.emit('fileError', 'Error parsing JSON data');
    }
  });

  // Log disconnection
  socket.on('disconnect', () => {
    user_slot_taken[clientIndex] = false;
    console.log(`Client disconnected (socket.id: ${socket.id}). Client index was: ${clientIndex}`);
  });
});

// Broadcast the file contents to all connected clients every second
setInterval(() => {
  fs.readFile(path.join(__dirname, 'world_text.json'), 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
    try {
      const jsonData = JSON.parse(data);
      io.emit('fileContents', jsonData);
    } catch (parseErr) {
      console.error('Error parsing JSON:', parseErr);
      // We can't use `socket` here because we're outside the connection context.
      // If you wanted to notify all clients of an error, you'd emit to `io` or handle individually.
      // For example:
      // io.emit('fileError', 'Error parsing JSON data');
    }
  });
}, 1000);

// Start the server
server.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});