const ctx = document.getElementById('canvas-game').getContext('2d');
ctx.translate(0.5, 0.5);
const ctxUI = document.getElementById('canvas-ui').getContext('2d');

import { Game, Imgs, cPlayer, cBullet, Camera, Map } from './Game';
var io = require('socket.io-client');
//Replace with hosting IP (144.13.22.62) 'http://localhost'
var socket = io();
var cGame = new Game(ctx, ctxUI);
var playerName = '';

var GameMap = new Map(5000, 3000);
GameMap.generate(cGame.ctx);

let cam = {
  xView: 0,
  yView: 0,
  canvasWidth: cGame.ctx.canvas.width,
  canvasHeight: cGame.ctx.canvas.height,
  worldWidth: 5000,
  worldHeight: 3000
};
var GameCamera = new Camera(cam);



$(document).ready( () => {
  $('#play').click( () => {
    playerName = $('#player-name').val();
    joinGame(playerName, socket);
  }); //#play.click()

  $('#canvas-ui').mousemove( (event) => {
    let mousePos = getMousePos(cGame.ctx, event);
    socket.emit('keyPress', {inputID: 'mousePos', mousePos: mousePos});
  });

  $('#player-name').keyup( (e) => {
    playerName = $('#player-name').val();
    let k = e.keyCode || e.which;
    if( k == 13 ) {
      joinGame(playerName, socket);
    }
  }); //#player-name.keyup()

  $(document).contextmenu( (e) => {
    e.preventDefault();
  }); //$(document).contextmenu()

  $(document).keydown( (e) => {
    let k = e.keyCode || e.which;
    switch(k) {
    case 87: //W
      socket.emit('keyPress', {inputID: 'up', state: true});
      break;
    case 65: //A
      socket.emit('keyPress', {inputID: 'left', state: true});
      break;
    case 83: //S
      socket.emit('keyPress', {inputID: 'down', state: true});
      break;
    case 68: //D
      socket.emit('keyPress', {inputID: 'right', state: true});
      break;
    default: break;
    }
  }).keyup( (e) => {
    let k = e.keyCode || e.which;
    switch(k) {
    case 87: //W
      socket.emit('keyPress', {inputID: 'up', state: false});
      break;
    case 65: //A
      socket.emit('keyPress', {inputID: 'left', state: false});
      break;
    case 83: //S
      socket.emit('keyPress', {inputID: 'down', state: false});
      break;
    case 68: //D
      socket.emit('keyPress', {inputID: 'right', state: false});
      break;
    default: break;
    }
  }).mousemove( (e) => {
    let x = -cGame.ctx.canvas.clientWidth/2 + e.clientX - 8;
    let y = -cGame.ctx.canvas.clientHeight/2 + e.clientY - 8;
    //Check if within the deadzones
    let mouse = getMousePos(cGame.ctx, e);
    if( cGame.selfID !== null ) {
      if( GameCamera.xView === 0 ) {
        x = mouse.x - cGame.cPlayers[cGame.selfID].x - GameCamera.xView;
      }
      if( GameCamera.yView === 0 ) {
        y = mouse.y - cGame.cPlayers[cGame.selfID].y - GameCamera.yView;
      }
    }
    let angle = Math.atan2(y, x) / Math.PI * 180;
    socket.emit('keyPress', {inputID: 'mouseAngle', state: angle});
  }).mousedown( () => {
    socket.emit('keyPress', {inputID: 'attack', state: true});
  }).mouseup( () => {
    socket.emit('keyPress', {inputID: 'attack', state: false});
  }); //$(document).keydown().keyup().mousemove().mousedown().mouseup()
}); //$(document).ready()

$(window).on('beforeunload', () => {
  socket.emit('disconnect');
}); //$(window).on('beforeunload')

function joinGame(playerName, socket) {
  if( playerName !== '' ) {
    $('#prompt').hide();
    socket.emit('joinGame', {name: playerName});
  }
} //joingame()

function getMousePos(ctx, e) {
  let rect = ctx.canvas.getBoundingClientRect();
  let mouseX = e.clientX - rect.left;
  let mouseY = e.clientY - rect.top;
  return {
    x: mouseX,
    y: mouseY
  };
} //getMousePos()

//##############################################################

socket.on('init', (data) => {
  let makeCamera = false;
  if( cGame.selfID === null && data.selfID !== undefined ) {
    console.info('ONCE');
    cGame.selfID = data.selfID;
    makeCamera = true;
  }
  for( let i = 0; i < data.player.length; i++ ) {
    cGame.cPlayers[data.player[i].ID] = new cPlayer(data.player[i]);
  }

  if( makeCamera ) {
    console.info(cGame.selfID);
    GameCamera.follow(cGame.cPlayers[cGame.selfID], cGame.ctx.canvas.width/2, cGame.ctx.canvas.height/2);
  }

  for( let j = 0; j < data.bullet.length; j++ ) {
    cGame.cBullets[data.bullet[j].ID] = new cBullet(data.bullet[j]);
  }
}); //'init'

socket.on('update', (data) => {
  //For all players, if there is data, update it
  for( let i = 0; i < data.player.length; i++ ) {
    let pack = data.player[i];
    let p = cGame.cPlayers[pack.ID];
    if( p !== undefined ) {
      if( p.x !== undefined ) {
        p.x = pack.x;
        GameCamera.followed.x = pack.x;
      }
      if( p.y !== undefined ) {
        p.y = pack.y;
        GameCamera.followed.y = pack.y;
      }
      if( p.HP !== undefined ) {
        p.HP = pack.HP;
      }
      if( p.mX !== undefined ) {
        p.mX = pack.mX;
      }
      if( p.mY !== undefined ) {
        p.mY = pack.mY;
      }
      if( p.score !== undefined ) {
        p.score = pack.score;
      }
    }
  } //for( i in data.player.length)

  //For all bullets, if there is data, update it
  for( let j = 0; j < data.bullet.length; j++ ) {
    let pack = data.bullet[j];
    let b = cGame.cBullets[data.bullet[j].ID];
    if( b !== undefined ) {
      if( b.x !== undefined ) {
        b.x = pack.x;
      }
      if( b.y !== undefined ) {
        b.y = pack.y;
      }
    }
  } //for( j in data.bullet.length)
}); //'update'

socket.on('remove', (data) => {
  for( let i = 0; i < data.player.length; i++ ) {
    delete cGame.cPlayers[data.player[i]];
  }
  for( let j = 0; j < data.bullet.length; j++ ) {
    delete cGame.cBullets[data.bullet[j]];
  }
}); //'remove'

//CLIENT GAME LOOP
setInterval( () => {
  if( !cGame.selfID ) {
    return;
  }
  cGame.ctx.clearRect(0, 0, cGame.ctx.canvas.width, cGame.ctx.canvas.height);
  GameCamera.update();
  console.info(GameCamera.followed);
  GameMap.draw(cGame.ctx, GameCamera.xView, GameCamera.yView);
  //drawGrid();     //Draws only the grid when it updates
  drawEntities(); //Draws only the Entities
  drawUI();       //Draws only the UI when it updates
}, 40);

/*
var drawGrid = () => {
  let player = cGame.cPlayers[cGame.selfID];
  let x = cGame.ctx.canvas.width/2 - player.x;
  let y = cGame.ctx.canvas.height/2 - player.y;
  cGame.ctx.drawImage(Imgs.grid, x, y);
};
*/

var drawEntities = () => {
  //Each player object draws itself
  for( let p in cGame.cPlayers ) {
    cGame.cPlayers[p].drawSelf(cGame, GameCamera.xView, GameCamera.yView);
  }
  //Each bullet object draws itself
  for( let b in cGame.cBullets ) {
    cGame.cBullets[b].drawSelf(cGame, GameCamera.xView, GameCamera.yView);
  }
};

var drawUI = () => {
  cGame.ctxUI.fillStyle = 'white';
  for( let p in cGame.cPlayers ) {
    cGame.cPlayers[p].drawName(cGame, GameCamera.xView, GameCamera.yView);
  }
  if( cGame.prevScore === cGame.cPlayers[cGame.selfID].score ) {
    return;
  }

  cGame.prevScore = cGame.cPlayers[cGame.selfID].score;
  cGame.ctxUI.fillText(cGame.cPlayers[cGame.selfID].score, 0, 30);
};



/*
this.ctx.canvas.width = this.ctx.canvas.clientWidth;
this.ctx.canvas.height = this.ctx.canvas.clientHeight;
this.ctx.fillStyle = 'black';
this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
*/
