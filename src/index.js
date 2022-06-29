"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const app = (0, express_1.default)();
const server = new http_1.default.Server(app);
const io = new socket_io_1.default.Server(server);
app.use(express_1.default.static(path_1.default.join(__dirname, 'dist')));
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`listening on port: ${PORT}!`);
});
const players = new Map();
io.on('connection', socket => {
    console.log('socket.id:', socket.id);
    const player = { id: socket.id };
    players.set(socket.id, player);
    console.log(players);
});
