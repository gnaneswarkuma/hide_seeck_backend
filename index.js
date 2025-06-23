const { Server } = require("socket.io");
const http = require("http");
const { log } = require("console");

const server = http.createServer();
const io = new Server(server, {
 cors: {
  origin: ["http://localhost:5173", "https://your-frontend.netlify.app"],
  methods: ["GET", "POST"]
}

});


const rooms = {};

io.on("connection", (socket) => {
  // console.log("🔌 New client:", socket.id);

  socket.on("create-room", ({ roomName, password }, callback) => {
    if (rooms[roomName]) {
      return callback({ success: false, message: "Room already exists" });
    }

    rooms[roomName] = {
      roomname:roomName,
      password,
      players: [socket.id], 
      detalis:{},
      colors:{"red":0,"green":0,"yellow":0,"blue":0,"black":0,"white":0},
      creator: socket.id,
      started: false,
      skill:true,
      map:0,
      target:"red",
      time:1,
      winner:"no winner",
      highscore:0,
    };
    
    rooms[roomName].detalis[socket.id]={state:[0,15,0],hero:false,name:"player"+`${0}`,color:"none",walk:false,score:0}
    socket.join(roomName);
    callback({ success: true, creator: true ,name:socket.id});
    io.to(roomName).emit("room-update", rooms[roomName]);
  });
   
  socket.on("select-map",({roomName,v})=>{
    // console.log(v,"llllll");
    
    rooms[roomName].map=v;
  })

  // Join a room
  socket.on("join-room", ({ roomName, password }, callback) => {
    const room = rooms[roomName];
    if (!room) return callback({ success: false, message: "Room does not exist" });
    if (room.password !== password) return callback({ success: false, message: "Wrong password" });
    if (room.started) return callback({ success: false, message: "Game already started" });
    if (room.players.length >= 6) return callback({ success: false, message: "Room full" });
    const l=room.players.length;
    room.players.push(socket.id);
    rooms[roomName].detalis[socket.id]={state:[l,15,0],hero:false,name:"player"+`${l}`,color:"none",walk:false,score:0}
    socket.join(roomName);
    callback({ success: true, creator: false ,name:socket.id });
    
    io.to(roomName).emit("room-update", room);
  });
  socket.on("name-changed",({changeName,myname,roomName})=>{
    if(changeName){
      // console.log(myname,roomName,changeName)
    rooms[roomName].detalis[myname].name=changeName;
    io.to(roomName).emit("room-update", rooms[roomName]);
    }
  })
  socket.on('color-selection',({roomName,value,myname})=>{
    const room=rooms[roomName];
    // console.log(roomName,room,room.detalis[myname])
    if (room.detalis[myname].color=="none"){
      room.detalis[myname].color=value;
      delete room.colors[value]
    }
    else{
      room.colors[room.detalis[myname].color]=0;
      room.detalis[myname].color=value;
      delete room.colors[value]
    }
    io.to(roomName).emit("room-update", room);
      // console.log(roomName,room,room.detalis[myname])
  });

  socket.on("score",({id,roomname})=>{
    const room=rooms[roomname];
    room.detalis[id].score+=1;
    if (room.highscore<room.detalis[id].score){
        room.winner=id ;
        room.highscore=room.detalis[id].score;
    }
  })
  socket.on("newtarget",({roomname,newTarget})=>{
    const room=rooms[roomname];
    room.target=newTarget;
  })
  socket.on("time",({roomName,time})=>{
    // console.log(time,roomName);
    
    const room=rooms[roomName];
    room.time=time;
  })
  socket.on("start-game", (roomName) => {
    const room = rooms[roomName];
    if (!room) return;
    room.target=room.detalis[room.creator].color;
    if (room.creator === socket.id) {
      room.started = true;
      io.to(roomName).emit("game-started");
    }
  });
  socket.on("update-position",({roomname,id,position})=>{
    const room=rooms[roomname];
    // console.log(rooms,roomname,id,position,room.detalis[id]);
    let rrr=position;
    // if(position[1]<0 || position[1]>10){
    //   rrr=[position[0],0,position[2]]
    // }
    room.detalis[id].state=rrr;
    room.detalis[id].walk=true
    io.to(roomname).emit("room-update", room);
  })

  socket.on("no-update",({roomname,id})=>{
     const room=rooms[roomname];
     room.detalis[id].walk=false;
    //  console.log(roomname,id,room.detalis[id]);
  })
  socket.on("get-winner", ({ roomname }) => {
  const room = rooms[roomname];
  if (!room) return;

  socket.emit("game-ended", {
    winner: room.winner,
    name: room.detalis[room.winner]?.name || "Unknown"
  });
});

  // Handle disconnect
  socket.on("disconnect", () => {
    for (const [roomName, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        room.players = room.players.filter((id) => id !== socket.id);
        // console.log(rooms[roomName]?.detalis[socket.id])
        delete rooms[roomName]?.detalis[socket.id];
        if (room.creator === socket.id) {
          room.creator = room.players[0] || null;
        }
        if (room.players.length === 0) {
          delete rooms[roomName];
        } else {
          io.to(roomName).emit("room-update", room);
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Socket.IO server running on http://0.0.0.0:${PORT}`);
});
