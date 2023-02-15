require('dotenv').config();
const morgan = require('morgan');
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const PORT = process.env.SERVER_PORT || 3001;

const app = express();
const server = http.createServer(app);

app.use(morgan('dev'));
app.use(cors());

const io = new Server(server, {
    cors: {
        origin: '*',
        // origin: [`http://localhost:${process.env.CLIENT_PORT}`],
        methods: ['GET', 'POST'],
        // credentials: true,
    },
});

app.get('/', (req, res) => {
    return res.json('server is okay!');
});

// socket data
let readyPlayerCount = 0;
let players = {}; // keep track of players
const roomName = 'myroom_1';
// const gameNameSpace = io.of('/play');

io.on('connection', (socket) => {
    console.log('connected ', socket.id);
    players[socket.id] = { id: socket.id, isRefree: false };
    // join to the room
    socket.join(roomName);

    socket.on('ready', () => {
        console.log('+++++ a player is ready');
        readyPlayerCount += 1;
        // console.log('ready player count', readyPlayerCount);
        if (readyPlayerCount === 2) {
            // brodcast to all players/clients
            players[socket.id] = { id: socket.id, isRefree: true };
            io.in(roomName).emit('startGame', players);
            // console.log('+++++ start game +++++', players);
        }
    }); // end function

    // sync paddle data
    socket.on('paddleMove', (paddleData) => {
        // brodcast except the sender
        socket.to(roomName).emit('paddleMove', paddleData);
    });

    // sync ball data
    socket.on('ballMove', (ballData) => {
        socket.to(roomName).emit('ballMove', ballData);
    });

    socket.on('disconnect', () => {
        readyPlayerCount -= 1;
        if (readyPlayerCount <= 0) readyPlayerCount = 0;
        if (players[socket.id]) delete players[socket.id];

        io.in(roomName).emit('playerLeft', { id: socket.id });
        // leave from the room
        socket.leave(roomName);
        console.log('----- disconnect', players);
    }); // end function
});

server.listen(PORT, () => {
    console.log('io ', io);
    console.log(`server is running on port http://localhost:${PORT}`);
});
