"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = __importDefault(require("socket.io"));
const matter_js_1 = __importDefault(require("matter-js"));
const resurrect_js_1 = __importDefault(require("resurrect-js"));
const defaults_1 = require("./defaults");
const app = (0, express_1.default)();
const server = new http_1.default.Server(app);
const io = new socket_io_1.default.Server(server);
const staticPath = path_1.default.join(__dirname, '..', 'dist');
console.log(staticPath);
const state = {
    direction: { x: 0, y: 0 }
};
const players = new Map();
app.use(express_1.default.static(staticPath));
const resurrect = new resurrect_js_1.default({ prefix: '$', cleanup: true });
async function updateClients() {
    const sockets = await io.fetchSockets();
    sockets.forEach(socket => {
        const msg = {
            id: socket.id,
            vertices: torso.vertices.map(({ x, y }) => ({ x, y })),
            wall: wall.vertices.map(({ x, y }) => ({ x, y }))
        };
        socket.emit('updateClient', msg);
    });
}
function tick() {
    void updateClients();
    // console.log('position:', composite.position.x, composite.position.y)
    // console.log('direction:', state.direction.x, state.direction.y)
    // console.log('direction:', state.direction.x, state.direction.y)
    // console.log('angle:', composite.angle)
}
const PORT = 3000;
server.listen(PORT, () => {
    console.log(`listening on port: ${PORT}!`);
    setInterval(tick, 20);
});
io.on('connection', socket => {
    console.log('socket.id:', socket.id);
    const player = {
        id: socket.id,
        input: defaults_1.INPUT
    };
    players.set(socket.id, player);
    socket.on('updateServer', msg => {
        player.input = msg.input;
        const vector = { x: 0, y: 0 };
        if (player.input.up)
            vector.y += -1;
        if (player.input.down)
            vector.y += 1;
        if (player.input.left)
            vector.x += -1;
        if (player.input.right)
            vector.x += 1;
        state.direction = matter_js_1.default.Vector.normalise(vector);
    });
});
const engine = matter_js_1.default.Engine.create();
engine.gravity = { x: 0, y: 0, scale: 1 };
const runner = matter_js_1.default.Runner.create();
const radius = 15;
const x = 0;
const y = 0;
const angle = 0;
const torso = matter_js_1.default.Bodies.rectangle(x, y, 30, 30);
const composite = matter_js_1.default.Body.create({ parts: [torso] });
composite.restitution = 0;
composite.friction = 0;
composite.frictionAir = 0.01;
matter_js_1.default.Body.setCentre(composite, { x, y }, false);
matter_js_1.default.Body.setInertia(composite, 2 * composite.inertia);
matter_js_1.default.Body.setAngle(composite, angle);
const wall = matter_js_1.default.Bodies.rectangle(x + 40, y, 15, 15, { isStatic: false });
const composites = [composite, wall];
matter_js_1.default.Composite.add(engine.world, composites);
matter_js_1.default.Runner.run(runner, engine);
matter_js_1.default.Events.on(engine, 'afterUpdate', e => {
    const force = matter_js_1.default.Vector.mult(state.direction, 0.00001);
    matter_js_1.default.Body.applyForce(composite, composite.position, force);
    composite.torque = 0.00;
});
