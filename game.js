let scene, camera, renderer;
let clock = new THREE.Clock();

let keys = {};
let bullets = [];
let grenades = [];

let score = { player: 0, bot: 0 };
let roundLimit = 3;

let player = {
    speed: 0.12,
    hp: 100,
    alive: true,
    mesh: null,
    respawnTimer: 0
};

let bot = {
    speed: 0.08,
    hp: 100,
    alive: true,
    mesh: null,
    shootCooldown: 0,
    respawnTimer: 0
};

let yaw = 0;
let pitch = 0;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;

    renderer = new THREE.WebGLRenderer({ antialias:false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0x00ffff,1);
    light.position.set(5,10,5);
    scene.add(light);

    createArena();
    createPlayer();
    createBot();

    document.addEventListener("keydown", e => keys[e.code] = true);
    document.addEventListener("keyup", e => keys[e.code] = false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", playerShoot);

    document.body.requestPointerLock();
}

function createArena(){
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(60,60),
        new THREE.MeshStandardMaterial({color:0x111122})
    );
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);
}

function createPlayer(){
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5,1.2,4,8),
        new THREE.MeshStandardMaterial({color:0x00ffff})
    );
    body.position.y = 1;
    scene.add(body);
    player.mesh = body;
}

function createBot(){
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.5,1.2,4,8),
        new THREE.MeshStandardMaterial({color:0xff0044})
    );
    body.position.set(10,1,10);
    scene.add(body);
    bot.mesh = body;
}

function onMouseMove(e){
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
}

function movePlayer(){
    if(!player.alive) return;

    let dir = new THREE.Vector3();
    if(keys["KeyW"]) dir.z -= 1;
    if(keys["KeyS"]) dir.z += 1;
    if(keys["KeyA"]) dir.x -= 1;
    if(keys["KeyD"]) dir.x += 1;

    dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    camera.position.addScaledVector(dir, player.speed);
    player.mesh.position.copy(camera.position);
    player.mesh.position.y = 1;

    camera.rotation.order="YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    if(keys["KeyG"]) throwGrenade();
}

function playerShoot(){
    if(!player.alive) return;
    createBullet(camera.position.clone(), getForwardVector(),"player");
}

function botShoot(){
    if(!bot.alive) return;
    let direction = new THREE.Vector3()
        .subVectors(player.mesh.position, bot.mesh.position)
        .normalize();
    createBullet(bot.mesh.position.clone(), direction,"bot");
}

function createBullet(position, direction, owner){
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.1,8,8),
        new THREE.MeshBasicMaterial({color: owner==="player"?0x00ffff:0xff0000})
    );
    bullet.position.copy(position);
    bullet.userData={direction, owner};
    scene.add(bullet);
    bullets.push(bullet);
}

function throwGrenade(){
    if(!player.alive) return;

    const grenade = new THREE.Mesh(
        new THREE.SphereGeometry(0.2,8,8),
        new THREE.MeshBasicMaterial({color:0x00ff00})
    );

    grenade.position.copy(camera.position);
    grenade.userData={
        direction:getForwardVector(),
        timer:2
    };

    scene.add(grenade);
    grenades.push(grenade);
    keys["KeyG"]=false;
}

function updateGrenades(delta){
    grenades.forEach((g,i)=>{
        g.position.addScaledVector(g.userData.direction, delta*10);
        g.userData.timer -= delta;

        if(g.userData.timer<=0){
            explode(g.position);
            scene.remove(g);
            grenades.splice(i,1);
        }
    });
}

function explode(position){
    const radius=4;

    if(bot.mesh.position.distanceTo(position)<radius && bot.alive){
        bot.hp-=50;
    }
    if(player.mesh.position.distanceTo(position)<radius && player.alive){
        player.hp-=50;
    }
}

function updateBullets(delta){
    bullets.forEach((b,i)=>{
        b.position.addScaledVector(b.userData.direction, delta*20);

        if(b.userData.owner==="player" && bot.alive &&
           b.position.distanceTo(bot.mesh.position)<1){
            bot.hp-=20;
            scene.remove(b);
            bullets.splice(i,1);
        }

        if(b.userData.owner==="bot" && player.alive &&
           b.position.distanceTo(player.mesh.position)<1){
            player.hp-=20;
            scene.remove(b);
            bullets.splice(i,1);
        }
    });
}

function updateBot(delta){
    if(!bot.alive) return;

    let dir = new THREE.Vector3()
        .subVectors(player.mesh.position, bot.mesh.position)
        .normalize();

    bot.mesh.position.addScaledVector(dir, bot.speed);

    bot.shootCooldown -= delta;
    if(bot.shootCooldown<=0){
        botShoot();
        bot.shootCooldown=1;
    }
}

function checkDeaths(delta){
    if(player.hp<=0 && player.alive){
        player.alive=false;
        score.bot++;
        player.respawnTimer=3;
        player.mesh.visible=false;
    }

    if(bot.hp<=0 && bot.alive){
        bot.alive=false;
        score.player++;
        bot.respawnTimer=3;
        bot.mesh.visible=false;
    }

    if(!player.alive){
        player.respawnTimer-=delta;
        if(player.respawnTimer<=0) respawn(player,true);
    }

    if(!bot.alive){
        bot.respawnTimer-=delta;
        if(bot.respawnTimer<=0) respawn(bot,false);
    }

    if(score.player>=roundLimit || score.bot>=roundLimit){
        alert(score.player>score.bot?"PLAYER WINS":"BOT WINS");
        score.player=0;
        score.bot=0;
    }
}

function respawn(entity,isPlayer){
    entity.hp=100;
    entity.alive=true;
    entity.mesh.visible=true;

    if(isPlayer){
        camera.position.set(0,1.6,0);
        entity.mesh.position.set(0,1,0);
    }else{
        entity.mesh.position.set(10,1,10);
    }
}

function getForwardVector(){
    let v=new THREE.Vector3(0,0,-1);
    v.applyQuaternion(camera.quaternion);
    return v.normalize();
}

function animate(){
    requestAnimationFrame(animate);
    let delta=clock.getDelta();

    movePlayer();
    updateBot(delta);
    updateBullets(delta);
    updateGrenades(delta);
    checkDeaths(delta);

    renderer.render(scene,camera);
}
