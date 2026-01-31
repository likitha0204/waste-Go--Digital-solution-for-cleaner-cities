const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

// Routes
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const suggestionRoutes = require('./routes/suggestionRoutes');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const startMqttServer = require('./mqttServer');
const { getDistanceFromLatLonInKm, estimateTravelTime } = require('./utils/distanceCalculator');


dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for dev
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart-waste-db')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Socket.io Logic
const Message = require('./models/Message'); // Import Message model
const messageRoutes = require('./routes/messageRoutes');

// ... (other imports)

// ... (socket setup)

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (data) => {
    // Ensure room is a string to prevent object/string mismatch issues
    const room = String(data);
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);
    // Log all rooms this socket is in
    console.log(`Socket ${socket.id} is now in rooms:`, Array.from(socket.rooms));
    
    // Send confirmation back to client
    socket.emit('room_joined_confirmation', room);
  });

  socket.on('send_message', async (data) => {
    // Ensure room compatibility in the payload itself
    data.room = String(data.room);
    const targetRoom = data.room;
    
    console.log(`Server received message from ${socket.id} to room ${targetRoom}:`, data);

    try {
        // Save to Database
        const newMessage = new Message({
            room: targetRoom,
            author: data.author,
            authorId: data.authorId, // Save ID
            message: data.message,
            time: data.time
        });
        await newMessage.save();
        console.log('Message saved to DB');
    } catch (err) {
        console.error('Error saving message to DB:', err);
    }
    
    // Check if anyone else is in the room
    const clients = io.sockets.adapter.rooms.get(targetRoom);
    const numClients = clients ? clients.size : 0;
    console.log(`Broadcasting to room ${targetRoom} with ${numClients} clients (including sender)`);
    
    socket.to(targetRoom).emit('receive_message', data);
  });

  socket.on('broadcast_message', async (data) => {
    console.log(`Server broadcasting message from ${socket.id}:`, data);
    
    try {
        // Save Broadcast to Database
        const newMessage = new Message({
            room: 'broadcast',
            author: data.author,
            authorId: data.authorId, // Save ID
            message: data.message,
            time: data.time
        });
        await newMessage.save();
        console.log('Broadcast saved to DB');
    } catch (err) {
        console.error('Error saving broadcast to DB:', err);
    }

    socket.broadcast.emit('receive_message', data);
  });





  socket.on('driver_started_trip', async (data) => {
      // data: { userId, taskType, taskId, driverName, driverPhone, driverLat, driverLng, userLat, userLng }
      const targetRoom = String(data.userId); 
      console.log(`Driver started trip. Calculating ETA for user: ${targetRoom}`, data);
      
      let etaMsg = "Your driver is on the way.";
      let estimatedMinutes = 15; // Default fallback
      let distanceVal = 0;

      if (data.driverLat && data.driverLng && data.userLat && data.userLng) {
          const distance = getDistanceFromLatLonInKm(
              data.driverLat, data.driverLng,
              data.userLat, data.userLng
          );
          distanceVal = distance.toFixed(1);
          estimatedMinutes = estimateTravelTime(distance);
          etaMsg = `Your driver ${data.driverName || 'WasteGo Driver'} is on the way. ETA: ${estimatedMinutes} mins.`;
      } else {
        etaMsg = `Your driver ${data.driverName || 'WasteGo Driver'} is on the way.`;
      }

      // Prepare Structured Payload
      const payload = {
          type: 'TRIP_START',
          driverName: data.driverName || 'WasteGo Driver',
          driverPhone: data.driverPhone || 'N/A',
          eta: estimatedMinutes,
          distance: distanceVal,
          text: etaMsg
      };

      // 1. Send Real-time Notification Alert (Stringified for consistency or just the object?)
      // Client expects object with message property currently. 
      // I'll emit the unstructured message for the simple alert, or update client to handle object.
      // Let's stick to emitting the simple text for the alert mostly, but the client implementation uses `data.message`.
      // I will emit the stringified payload so specific client logic can parse it if needed, OR just emit the text for the simple alert?
      // User says "only the notification center 1 message".
      // I'll emit the RAW object for the socket event `trip_started_notification`, client can choose what to show.
      
      socket.to(targetRoom).emit('trip_started_notification', {
          message: etaMsg, // Simple text for the Toast/Alert
          ...payload // structured data
      });
      
      socket.to(targetRoom).emit('trip_started_notification', {
          message: etaMsg, // Simple text for the Toast/Alert
          ...payload // structured data
      });
      
      console.log(`Notification sent to ${targetRoom}: ${etaMsg}`);
  });

  // Handle Real-time ETA updates from Driver Map (Leaflet Routing Machine)
  socket.on('driver_eta_update', (data) => {
      // data: { userId, etaText, etaSeconds, distanceText }
      const targetRoom = String(data.userId);
      console.log(`Sending Real-time ETA to user ${targetRoom}: ${data.etaText}`);
      
      socket.to(targetRoom).emit('receive_eta_update', {
          message: `Update: Driver is ${data.etaText} away (${data.distanceText}).`,
          eta: data.etaText,
          distance: data.distanceText,
          taskId: data.taskId, // Forward Task ID
          taskType: data.taskType
      });
  });
  socket.on('disconnect', () => {
    console.log('User Disconnected', socket.id);
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/messages', messageRoutes); // Register message routes


app.use('/uploads', express.static(path.join(__dirname, '/uploads')));

app.get('/', (req, res) => {
    res.send('Smart Waste Management System Backend is Running');
});

const PORT = process.env.PORT || 5000;


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startMqttServer();
});


