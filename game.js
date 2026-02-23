// ====================== VARIÁVEIS ======================
let audioListener;
let covers = [];
let scene, camera, renderer;
let clock = new THREE.Clock();

let keys = {};
let bullets = [];
let grenades = [];

let score = { player: 0, bot: 0 };
let roundLimit = 3;

let player = { speed: 0.12, hp: 100, alive: true, mesh: null, respawnTimer: 0, gun: null };
let bot = { speed: 0.08, hp: 100, alive: true, mesh: null, shootCooldown: 0, respawnTimer: 0, gun: null };

let yaw = 0;
let pitch = 0;
let walkTime = 0;

// ====================== ADMIN ======================
const ADMIN_KEY = "YK123";
let isAdmin = false;
const adminHUD = document.createElement("div");
adminHUD.style.position = "absolute";
adminHUD.style.top = "10px";
adminHUD.style.left = "10px";
adminHUD.style.padding = "10px";
adminHUD.style.backgroundColor = "rgba(0,0,0,0.6)";
adminHUD.style.color = "white";
adminHUD.style.fontFamily = "monospace";
adminHUD.style.display = "none";
document.body.appendChild(adminHUD);

// ====================== INIT ======================
init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0,1.6,5); // terceira pessoa atrás do player

    audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Luzes
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5,10,5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    createArena();
    createPlayer();
    createBot();

    // Eventos
    document.addEventListener("keydown", e=>{
        keys[e.code] = true;
        onKeyDown(e);
        // Fullscreen
        if(e.code==="KeyF"){
            if(!document.fullscreenElement) document.body.requestFullscreen();
            else document.exitFullscreen();
        }
        if(e.code==="Escape" && document.fullscreenElement) document.exitFullscreen();
    });
    document.addEventListener("keyup", e=>keys[e.code]=false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", playerShoot);
}

// ====================== ARENA ======================
function createArena(){
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(100,100), new THREE.MeshStandardMaterial({color:0x1a1a2e}));
    floor.rotation.x = -Math.PI/2;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({color:0x16213e});
    for(let i=0;i<4;i++){
        let wall = new THREE.Mesh(new THREE.BoxGeometry(100,10,2), wallMat);
        if(i===0) wall.position.set(0,5,-50);
        if(i===1) wall.position.set(0,5,50);
        if(i===2){ wall.geometry=new THREE.BoxGeometry(2,10,100); wall.position.set(-50,5,0);}
        if(i===3){ wall.geometry=new THREE.BoxGeometry(2,10,100); wall.position.set(50,5,0);}
        scene.add(wall);
    }

    for(let i=0;i<20;i++){
        const h = Math.random()*15+5;
        const building = new THREE.Mesh(new THREE.BoxGeometry(3,h,3), new THREE.MeshStandardMaterial({color:0x0f3460}));
        building.position.set((Math.random()-0.5)*80,h/2,(Math.random()-0.5)*80);
        scene.add(building);
        covers.push(building);
    }
}

// ====================== PLAYER ======================
function createPlayer(){
    const group = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.5,16), new THREE.MeshStandardMaterial({color:0x00ffff}));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4,16,16), new THREE.MeshStandardMaterial({color:0xffffff}));
    head.position.y = 1.2;
    group.add(body, head);

    // Arma FPS anexada à câmera
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.5), new THREE.MeshStandardMaterial({color:0x222222}));
    gun.position.set(0.3,-0.2,-0.8);
    camera.add(gun);
    player.gun = gun;

    group.position.set(0,1,0);
    scene.add(group);
    player.mesh = group;
}

// ====================== BOT ======================
function createBot(){
    const group = new THREE.Group();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.5,16), new THREE.MeshStandardMaterial({color:0xff4444}));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4,16,16), new THREE.MeshStandardMaterial({color:0xffbbbb}));
    head.position.y = 1.2;
    group.add(body, head);

    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.5), new THREE.MeshStandardMaterial({color:0x222222}));
    gun.position.set(0.5,0.6,0);
    gun.rotation.y = -Math.PI/2;
    group.add(gun);
    bot.gun = gun;

    group.position.set(15,1,15);
    scene.add(group);
    bot.mesh = group;
}

// ====================== CONTROLES ======================
function onMouseMove(e){
    yaw -= e.movementX*0.002;
    pitch -= e.movementY*0.002;
    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
}

function movePlayer(){
    if(!player.alive) return;
    const dir = new THREE.Vector3();
    if(keys["KeyW"]) dir.z -=1;
    if(keys["KeyS"]) dir.z +=1;
    if(keys["KeyA"]) dir.x -=1;
    if(keys["KeyD"]) dir.x +=1;
    dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    camera.position.addScaledVector(dir, player.speed);
    player.mesh.position.copy(camera.position);
    player.mesh.position.y = 1;

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    walkTime += 0.1;
    player.mesh.rotation.z = Math.sin(walkTime)*0.05;

    if(keys["KeyG"]) throwGrenade();
}

// ====================== BULLETS ======================
function createBullet(position,direction,owner){
    const bullet = new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8), new THREE.MeshBasicMaterial({color: owner==="player"?0x00ffff:0xff0000}));
    bullet.position.copy(position);
    bullet.userData={direction,owner};
    scene.add(bullet);
    bullets.push(bullet);
}
function updateBullets(delta){
    bullets.forEach((b,i)=>{
        b.position.addScaledVector(b.userData.direction, delta*20);
        if(b.userData.owner==="player" && bot.alive && b.position.distanceTo(bot.mesh.position)<1){
            bot.hp-=20;
            scene.remove(b); bullets.splice(i,1);
        }
        if(b.userData.owner==="bot" && player.alive && b.position.distanceTo(player.mesh.position)<1){
            player.hp-=20;
            scene.remove(b); bullets.splice(i,1);
        }
    });
}

// ====================== GRANADAS ======================
function throwGrenade(){
    if(!player.alive) return;
    const g = new THREE.Mesh(new THREE.SphereGeometry(0.2,8,8), new THREE.MeshBasicMaterial({color:0x00ff00}));
    g.position.copy(camera.position);
    g.userData={direction:getForwardVector(), timer:2};
    scene.add(g);
    grenades.push(g);
    keys["KeyG"]=false;
}
function updateGrenades(delta){
    grenades.forEach((g,i)=>{
        g.position.addScaledVector(g.userData.direction, delta*10);
        g.userData.timer-=delta;
        if(g.userData.timer<=0){
            explode(g.position);
            scene.remove(g);
            grenades.splice(i,1);
        }
    });
}
function explode(pos){
    const radius=4;
    if(bot.mesh.position.distanceTo(pos)<radius && bot.alive) bot.hp-=50;
    if(player.mesh.position.distanceTo(pos)<radius && player.alive) player.hp-=50;
    const expl = new THREE.Mesh(new THREE.SphereGeometry(0.5,16,16), new THREE.MeshBasicMaterial({color:0xffaa00, transparent:true, opacity:0.8}));
    expl.position.copy(pos);
    scene.add(expl);
    const light = new THREE.PointLight(0xffaa00,5,10);
    light.position.copy(pos);
    scene.add(light);
    let scale=1, opacity=0.8;
    const iv = setInterval(()=>{
        scale+=0.5; opacity-=0.05;
        expl.scale.set(scale,scale,scale);
        expl.material.opacity=opacity;
        if(opacity<=0){ clearInterval(iv); scene.remove(expl); scene.remove(light);}
    },16);
}

// ====================== BOT ======================
function updateBot(delta){
    if(!bot.alive) return;
    const distance = bot.mesh.position.distanceTo(player.mesh.position);
    let targetPos = player.mesh.position.clone();
    if(bot.hp<40 || distance<8){
        let closest=null, minD=Infinity;
        covers.forEach(c=>{
            const d=bot.mesh.position.distanceTo(c.position);
            if(d<minD){ minD=d; closest=c;}
        });
        if(closest) targetPos = closest.position.clone();
    }
    const dir = new THREE.Vector3().subVectors(targetPos, bot.mesh.position).normalize();
    bot.mesh.position.addScaledVector(dir, bot.speed);

    if(distance<25){
        bot.shootCooldown-=delta;
        if(bot.shootCooldown<=0){ botShoot(); bot.shootCooldown=1.5;}
    }
}

// ====================== CHECAR MORTE ======================
function checkDeaths(delta){
    if(player.hp<=0 && player.alive){ player.alive=false; score.bot++; player.respawnTimer=3; player.mesh.visible=false; }
    if(bot.hp<=0 && bot.alive){ bot.alive=false; score.player++; bot.respawnTimer=3; bot.mesh.visible=false; }
    if(!player.alive){ player.respawnTimer-=delta; if(player.respawnTimer<=0) respawn(player,true);}
    if(!bot.alive){ bot.respawnTimer-=delta; if(bot.respawnTimer<=0) respawn(bot,false);}
    if(score.player>=roundLimit || score.bot>=roundLimit){
        alert(score.player>score.bot?"PLAYER WINS":"BOT WINS");
        score.player=0; score.bot=0;
    }
}
function respawn(entity,isPlayer){
    entity.hp=100; entity.alive=true; entity.mesh.visible=true;
    if(isPlayer){ camera.position.set(0,1.6,5); entity.mesh.position.set(0,1,0);}
    else entity.mesh.position.set(15,1,15);
}

// ====================== AUX ======================
function getForwardVector(){ let v = new THREE.Vector3(0,0,-1); v.applyQuaternion(camera.quaternion); return v.normalize();}

// ====================== ADMIN ======================
function onKeyDown(e){
    if(e.code==="F12" && !isAdmin){
        const pass = prompt("Digite a senha admin:");
        if(pass===ADMIN_KEY){ isAdmin=true; adminHUD.style.display="block"; alert("Admin ativado! 🎮"); }
        else alert("Senha incorreta ❌");
    }
}
function updateAdminHUD(){
    if(!isAdmin) return;
    adminHUD.innerHTML = `<b>ADMIN MODE</b><br>Player HP: ${Math.max(0,player.hp)}<br>Bot HP: ${Math.max(0,bot.hp)}<br>1=Vida cheia<br>2=Matar Bot<br>3=Lançar Granada<br>4=Teleporte origem`;
}
function updateAdmin(){
    if(!isAdmin) return;
    if(keys["Digit1"]){ player.hp=100; keys["Digit1"]=false; alert("Vida cheia!");}
    if(keys["Digit2"]){ bot.hp=0; keys["Digit2"]=false; alert("Bot morto!");}
    if(keys["Digit3"]){ throwGrenade(); keys["Digit3"]=false;}
    if(keys["Digit4"]){ camera.position.set(0,1.6,5); player.mesh.position.set(0,1,0); keys["Digit4"]=false; alert("Teleporte!");}
}

// ====================== ANIMAÇÃO ======================
function animate(){
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    movePlayer();
    updateBot(delta);
    updateBullets(delta);
    updateGrenades(delta);
    checkDeaths(delta);
    updateAdmin();
    updateAdminHUD();
    renderer.render(scene,camera);
}
