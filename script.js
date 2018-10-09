import './node_modules/pixi.js/dist/pixi.js'
// Recommended import style (below) doesn't seem to work.
//import * as PIXI from './node_modules/pixi.js/dist/pixi.js'

let type = "WebGL"
if(!PIXI.utils.isWebGLSupported()){
  type = "canvas"
}
PIXI.utils.sayHello(type)

//Aliases
let Application = PIXI.Application,
    Container = PIXI.Container,
    loader = PIXI.loader,
    resources = PIXI.loader.resources,
    Graphics = PIXI.Graphics,
    TextureCache = PIXI.utils.TextureCache,
    Sprite = PIXI.Sprite,
    Text = PIXI.Text,
    TextStyle = PIXI.TextStyle;

//Create a Pixi Application
let app = new Application({
    width: 512,
    height: 512,
    antialias: true,
    transparent: false,
    resolution: 1
});

document.body.appendChild(app.view);

loader
  .add([
    "images/treasureHunter.json"
  ])
  .on("progress", loadProgressHandler)
  .load(setup);

function loadProgressHandler(loader, resource) {
  console.log("loading: " + resource.url);
  console.log("progress: " + loader.progress + "%");
}

let state, explorer, treasure, blobs, chimes, exit, player, dungeon,
    door, healthBar, message, gameScene, gameOverScene, enemies,  textures;

function setup() {
  setupGameContainers();
  setupSprites();
  setupHealthBar();
  setup_keyboard_controls();
  startGame();
}

function setupGameContainers() {
  gameScene = new Container();
  app.stage.addChild(gameScene);

  gameOverScene = new Container();
  app.stage.addChild(gameOverScene);

  let style = new TextStyle({
    fontFamily: "Futura",
    fontSize: 64,
    fill: "white"
  });
  message = new Text("The End!", style);
  message.x = 120;
  message.y = 224;
  gameOverScene.addChild(message);
}

function setupSprites() {
  textures = PIXI.loader.resources["images/treasureHunter.json"].textures;

  dungeon = new Sprite(textures["dungeon.png"]);
  gameScene.addChild(dungeon);

  explorer = new Sprite(textures["explorer.png"]);
  explorer.x = 68;
  explorer.y = app.stage.height / 2 - explorer.height / 2;
  explorer.vx = 0;
  explorer.vy = 0;
  gameScene.addChild(explorer);

  treasure = new Sprite(textures["treasure.png"]);
  treasure.x = app.stage.width - treasure.width - 48;
  treasure.y = app.stage.height / 2 - treasure.height / 2;
  gameScene.addChild(treasure);

  door = new Sprite(textures["door.png"]);
  door.position.set(32, 0);
  gameScene.addChild(door);

  let numberOfBlobs = 6,
      spacing = 48,
      xOffset = 150,
      speed = 2,
      direction = 1;
  blobs = [];

  for (let i = 0; i < numberOfBlobs; i++) {
    let blob = new Sprite(textures["blob.png"]);
    blob.x = spacing * i + xOffset;;
    blob.y = randomInt(0, app.stage.height - blob.height);

    blob.vy = speed * direction;
    direction *= -1;

    blobs.push(blob);
    gameScene.addChild(blob);
  }
}

function setupHealthBar() {
  //Create the health bar
  healthBar = new Container();
  healthBar.position.set(app.stage.width - 170, 4)
  gameScene.addChild(healthBar);
  //Create the black background rectangle
  let innerBar = new PIXI.Graphics();
  innerBar.beginFill(0x000000);
  innerBar.drawRect(0, 0, 128, 8);
  innerBar.endFill();
  healthBar.addChild(innerBar);

  //Create the front red rectangle
  let outerBar = new PIXI.Graphics();
  outerBar.beginFill(0xFF3300);
  outerBar.drawRect(0, 0, 128, 8);
  outerBar.endFill();
  healthBar.addChild(outerBar);

  healthBar.outer = outerBar;
}

function startGame() {
  //hide game over screen
  gameOverScene.visible = false;
  //Set the game state
  state = play;
  //start game loop
  app.ticker.add(delta => gameLoop(delta));
}

function gameLoop(delta){
  //requestAnimationFrame(gameLoop);
  if(state) {
    state(delta)
  }
}

function play(delta) {
  let explorerHit = false;

  if (explorer) {
    explorer.x += explorer.vx;
    explorer.y += explorer.vy;
    //Contain the explorer inside the area of the dungeon
    contain(explorer, {x: 28, y: 10, width: 488, height: 480});
  }
  //Loop through all the sprites in the `enemies` array
  blobs.forEach(function(blob) {
    blob.y += blob.vy;
    let blobHitsWall = contain(blob, {x: 28, y: 10, width: 488, height: 480});
    if (blobHitsWall === "top" || blobHitsWall === "bottom") {
      blob.vy *= -1;
    }

    if(hitTestRectangle(explorer, blob)) {
      explorerHit = true;
    }
  });

  if(explorerHit) {
    explorer.alpha = 0.5;
    healthBar.outer.width -= 1;
  } else {
    explorer.alpha = 1;
  }

  if (hitTestRectangle(explorer, treasure)) {
    treasure.x = explorer.x + 8;
    treasure.y = explorer.y + 8;
  }

  if (healthBar.outer.width <= 0) {
    state = end;
    message.text = "You lost!";
  }

  if (hitTestRectangle(treasure, door)) {
    state = end;
    message.text = "You won!";
  }
}

function end() {
  gameScene.visible = false;
  gameOverScene.visible = true;
}

function setup_keyboard_controls() {
  //Capture the keyboard arrow keys
  let left = keyboard(37),
      up = keyboard(38),
      right = keyboard(39),
      down = keyboard(40);

  //Left arrow key `press` method
  left.press = () => {
    //Change the cat's velocity when the key is pressed
    explorer.vx = -5;
    explorer.vy = 0;
  };

  //Left arrow key `release` method
  left.release = () => {
    //If the left arrow has been released, and the right arrow isn't down,
    //and the cat isn't moving vertically:
    //Stop the cat
    if (!right.isDown && explorer.vy === 0) {
      explorer.vx = 0;
    }
  };

  //Up
  up.press = () => {
    explorer.vy = -5;
    explorer.vx = 0;
  };
  up.release = () => {
    if (!down.isDown && explorer.vx === 0) {
      explorer.vy = 0;
    }
  };

  //Right
  right.press = () => {
    explorer.vx = 5;
    explorer.vy = 0;
  };
  right.release = () => {
    if (!left.isDown && explorer.vy === 0) {
      explorer.vx = 0;
    }
  };

  //Down
  down.press = () => {
    explorer.vy = 5;
    explorer.vx = 0;
  };
  down.release = () => {
    if (!up.isDown && explorer.vx === 0) {
      explorer.vy = 0;
    }
  };
}

//The `randomInt` helper function
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function contain(sprite, container) {

  let collision = undefined;

  //Left
  if (sprite.x < container.x) {
    sprite.x = container.x;
    collision = "left";
  }

  //Top
  if (sprite.y < container.y) {
    sprite.y = container.y;
    collision = "top";
  }

  //Right
  if (sprite.x + sprite.width > container.width) {
    sprite.x = container.width - sprite.width;
    collision = "right";
  }

  //Bottom
  if (sprite.y + sprite.height > container.height) {
    sprite.y = container.height - sprite.height;
    collision = "bottom";
  }

  //Return the `collision` value
  return collision;
}

//The `hitTestRectangle` function
function hitTestRectangle(r1, r2) {

  //Define the variables we'll need to calculate
  let hit, combinedHalfWidths, combinedHalfHeights, vx, vy;

  //hit will determine whether there's a collision
  hit = false;

  //Find the center points of each sprite
  r1.centerX = r1.x + r1.width / 2;
  r1.centerY = r1.y + r1.height / 2;
  r2.centerX = r2.x + r2.width / 2;
  r2.centerY = r2.y + r2.height / 2;

  //Find the half-widths and half-heights of each sprite
  r1.halfWidth = r1.width / 2;
  r1.halfHeight = r1.height / 2;
  r2.halfWidth = r2.width / 2;
  r2.halfHeight = r2.height / 2;

  //Calculate the distance vector between the sprites
  vx = r1.centerX - r2.centerX;
  vy = r1.centerY - r2.centerY;

  //Figure out the combined half-widths and half-heights
  combinedHalfWidths = r1.halfWidth + r2.halfWidth;
  combinedHalfHeights = r1.halfHeight + r2.halfHeight;

  if (Math.abs(vx) < combinedHalfWidths && Math.abs(vy) < combinedHalfHeights) {
    hit = true;
  } else {
    hit = false;
  }

  return hit;
};

function keyboard(keyCode) {
  let key = {};
  key.code = keyCode;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;
  //The `downHandler`
  key.downHandler = event => {
    if (event.keyCode === key.code) {
      if (key.isUp && key.press) key.press();
      key.isDown = true;
      key.isUp = false;
    }
    event.preventDefault();
  };

  //The `upHandler`
  key.upHandler = event => {
    if (event.keyCode === key.code) {
      if (key.isDown && key.release) key.release();
      key.isDown = false;
      key.isUp = true;
    }
    event.preventDefault();
  };

  //Attach event listeners
  window.addEventListener(
    "keydown", key.downHandler.bind(key), false
  );
  window.addEventListener(
    "keyup", key.upHandler.bind(key), false
  );
  return key;
}
