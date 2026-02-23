let audioListener;
let covers = [];
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
let walkTime = 0;

// ====================== ADMIN ======================
const ADMIN_KEY = "YK123"; // sua senha secreta
let isAdmin = false;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;

    audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    renderer = new THREE.WebGLRenderer({ antialias:false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0x00ffff,1);
    light.position.set(5,10,5);
    scene.add(light);

    createArena();
    createPlayer();
    createBot();

    document.addEventListener("keydown", e => {
        keys[e.code] = true;

        // F12 → ativar admin
        if(e.code === "F12" && !isAdmin){
            const pass = prompt("Digite a senha admin:");
            if(pass === ADMIN_KEY){
                isAdmin = true;
                alert("Admin ativado! 🎮");
            } else {
                alert("Senha incorreta ❌");
            }
        }
    });
    document.addEventListener("keyup", e => keys[e.code] = false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", playerShoot);

    document.body.requestPointerLock();
}

// ====================== ARENA ======================
function createArena(){
    // Chão
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100,100),
        new THREE.MeshStandardMaterial({color:0x1a1a2e})
    );
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    // Muros
    const wallMaterial = new THREE.MeshStandardMaterial({color:0x16213e});
    for(let i=0;i<4;i++){
        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(100,10,2),
            wallMaterial
        );

        if(i===0) wall.position.set(0,5,-50);
        if(i===1) wall.position.set(0,5,50);
        if(i===2){
            wall.geometry = new THREE.BoxGeometry(2,10,100);
            wall.position.set(-50,5,0);
        }
        if(i===3){
            wall.geometry = new THREE.BoxGeometry(2,10,100);
            wall.position.set(50,5,0);
        }

        scene.add(wall);
    }

    // Prédios aleatórios (cover)
    for(let i=0;i<20;i++){
        const height = Math.random()*15+5;
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(3,height,3),
            new THREE.MeshStandardMaterial({color:0x0f3460})
        );
        building.position.set(
            (Math.random()-0.5)*80,
            height/2,
            (Math.random()-0.5)*80
        );
        scene.add(building);
        covers.push(building);
    }

    // Luz ambiente
    const ambient = new THREE.AmbientLight(0x404040);
    scene.add(ambient);
}

// ====================== PLAYER ======================
function createPlayer(){
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5,0.5,1.5,16),
        new THREE.MeshStandardMaterial({color:0x00ffff})
    );

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4,16,16),
        new THREE.MeshStandardMaterial({color:0xffffff})
    );
    head.position.y = 1.2;

    group.add(body);
    group.add(head);

    group.position.y = 1;
    scene.add(group);
    player.mesh = group;
}

// ====================== BOT ======================
function createBot(){
    const group = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5,0.5,1.5,16),
        new THREE.MeshStandardMaterial({color:0xff0044})
    );

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.4,16,16),
        new THREE.MeshStandardMaterial({color:0xffaaaa})
    );
    head.position.y = 1.2;

    group.add(body);
    group.add(head);

    group.position.set(15,1,15);
    scene.add(group);
    bot.mesh = group;
}

// ====================== CONTROLES ======================
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

    walkTime += 0.1;
    player.mesh.rotation.z = Math.sin(walkTime) * 0.05;
}

// ====================== DISPAROS ======================
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

    bot.mesh.rotation.x = -0.2;
    setTimeout(()=>{ bot.mesh.rotation.x = 0; },150);
}

// ====================== BULLETS ======================
function createBullet(position, direction, owner){
    const bullet = new THREE.Mesh(
        new THREE.SphereGeometry(0.1,8,8),
        new THREE.MeshBasicMaterial({color: owner==="player"?0x00ffff:0xff0000})
    );
    bullet.position.copy(position);
    bullet.userData={direction, owner};

    // Som 3D
    const sound = new THREE.PositionalAudio(audioListener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('https://threejs.org/examples/sounds/358232_j_s_song.ogg', function(buffer){
        sound.setBuffer(buffer);
        sound.setRefDistance(5);
        sound.setVolume(0.3);
        sound.play();
    });
    bullet.add(sound);

    scene.add(bullet);
    bullets.push(bullet);
}

// ====================== GRANADAS ======================
function throwGrenade(){
    if(!player.alive) return;

    const grenade = new THREE.Mesh(
        new THREE.SphereGeometry(0.2,8,8),
        new THREE.MeshBasicMaterial({color:0x00ff00})
    );

    grenade.position.copy(camera.position);
    grenade.userData={direction:getForwardVector(), timer:2};

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

// ====================== EXPLOSÃO ======================
function explode(position){
    const radius = 4;

    if(bot.mesh.position.distanceTo(position)<radius && bot.alive) bot.hp-=50;
    if(player.mesh.position.distanceTo(position)<radius && player.alive) player.hp-=50;

    const explosion = new THREE.Mesh(
        new THREE.SphereGeometry(0.5,16,16),
        new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:0.8})
    );
    explosion.position.copy(position);
    scene.add(explosion);

    const light = new THREE.PointLight(0xffaa00,5,10);
    light.position.copy(position);
    scene.add(light);

    let scale = 1;
    let opacity = 0.8;
    const interval = setInterval(()=>{
        scale += 0.5;
        opacity -= 0.05;
        explosion.scale.set(scale,scale,scale);
        explosion.material.opacity = opacity;
        if(opacity<=0){
            clearInterval(interval);
            scene.remove(explosion);
            scene.remove(light);
        }
    },16);
}

// ====================== UPDATE BULLETS ======================
function updateBullets(delta){
    bullets.forEach((b,i)=>{
        b.position.addScaledVector(b.userData.direction, delta*20);

        if(b.userData.owner==="player" && bot.alive && b.position.distanceTo(bot.mesh.position)<1){
            bot.hp-=20;
            scene.remove(b);
            bullets.splice(i,1);
        }
        if(b.userData.owner==="bot" && player.alive && b.position.distanceTo(player.mesh.position)<1){
            player.hp-=20;
            scene.remove(b);
            bullets.splice(i,1);
        }
    });
}

// ====================== BOT ======================
function updateBot(delta){
    if(!bot.alive) return;

    let distance = bot.mesh.position.distanceTo(player.mesh.position);
    let targetPosition = player.mesh.position.clone();

    if(bot.hp<40 || distance<8){
        let closestCover = null;
        let minDist = Infinity;
        covers.forEach(c=>{
            let d = bot.mesh.position.distanceTo(c.position);
            if(d<minDist){ minDist=d; closestCover=c; }
        });
        if(closestCover) targetPosition = closestCover.position.clone();
    }

    let dir = new THREE.Vector3().subVectors(targetPosition, bot.mesh.position).normalize();
    bot.mesh.position.addScaledVector(dir, bot.speed);

    if(distance<25){
        bot.shootCooldown-=delta;
        if(bot.shootCooldown<=0){ botShoot(); bot.shootCooldown=1.5; }
    }
}

// ====================== CHECAR MORTE/RESPAWN ======================
function checkDeaths(delta){
    if(player.hp<=0 && player.alive){ player.alive=false; score.bot++; player.respawnTimer=3; player.mesh.visible=false; }
    if(bot.hp<=0 && bot.alive){ bot.alive=false; score.player++; bot.respawnTimer=3; bot.mesh.visible=false; }

    if(!player.alive){ player.respawnTimer-=delta; if(player.respawnTimer<=0) respawn(player,true); }
    if(!bot.alive){ bot.respawnTimer-=delta; if(bot.respawnTimer<=0) respawn(bot,false); }

    if(score.player>=roundLimit || score.bot>=roundLimit){
        alert(score.player>score.bot?"PLAYER WINS":"BOT WINS");
        score.player=0; score.bot=0;
    }
}

function respawn(entity,isPlayer){
    entity.hp=100;
    entity.alive=true;
    entity.mesh.visible=true;

    if(isPlayer){ camera.position.set(0,1.6,0); entity.mesh.position.set(0,1,0); }
    else entity.mesh.position.set(15,1,15);
}

// ====================== AUX ======================
function getForwardVector(){
    let v=new THREE.Vector3(0,0,-1);
    v.applyQuaternion(camera.quaternion);
    return v.normalize();
}

// ====================== ADMIN UPDATE ======================
function updateAdmin(){
    if(!isAdmin) return;

    // Comandos admin
    if(keys["Digit1"]){ player.hp=100; keys["Digit1"]=false; alert("Vida cheia! 🩸"); }
    if(keys["Digit2"]){ bot.hp=0; keys["Digit2"]=false; alert("Bot morto! 💀"); }
    if(keys["Digit3"]){
        const grenade = new THREE.Mesh(
            new THREE.SphereGeometry(0.2,8,8),
            new THREE.MeshBasicMaterial({color:0x00ff00})
        );
        grenade.position.copy(player.mesh.position);
        grenade.userData={direction:getForwardVector(), timer:2};
        scene.add(grenade);
        grenades.push(grenade);
        keys["Digit3"]=false; 
        alert("Granada lançada! 🧨");
    }
    if(keys["Digit4"]){ camera.position.set(0,1.6,0); player.mesh.position.set(0,1,0); keys["Digit4"]=false; alert("Teleporte para origem! ✨"); }
}

// ====================== ANIMAÇÃO ======================
function animate(){
    requestAnimationFrame(animate);
    let delta=clock.getDelta();

    movePlayer();
    updateBot(delta);
    updateBullets(delta);
    updateGrenades(delta);
    checkDeaths(delta);
    updateAdmin(); // <-- chamada do admin

    renderer.render(scene,camera);
}
