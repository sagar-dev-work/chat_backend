const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const cors = require('cors');

// Import chat routes
const chatRoutes = require('./chatRoutes');

const app = express();
const path = require('path');
app.use(cors());
app.use(bodyParser.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.static(path.resolve("./public")));

app.get('/', (req, res) => {
   return res.sendFile("public/index.html");
});
// Socket.IO connection
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', (userId) => {
        console.log(`User ${userId} joined room user_${userId}`);
        socket.join(`user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Use chat routes
// app.use('/api', chatRoutes);

app.use('/api', (req, res, next) => {
    req.io = io; // Attach `io` to the request object
    next();
}, chatRoutes);


const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
