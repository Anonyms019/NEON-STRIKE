// ====================== INIT ======================
let audioListener, scene, camera, renderer;
let clock = new THREE.Clock();
let keys = {};
let bullets = [], grenades = [];
let player = {speed:0.12,hp:100,alive:true,mesh:null,gun:null};
let bot = {speed:0.08,hp:100,alive:true,mesh:null,shootCooldown:0,gun:null};
let yaw=0,pitch=0,walkTime=0;
let covers = [];

const ADMIN_KEY="YK123";
let isAdmin=false;
const adminHUD=document.createElement("div");
adminHUD.style.position="absolute";
adminHUD.style.top="10px";
adminHUD.style.left="10px";
adminHUD.style.padding="10px";
adminHUD.style.backgroundColor="rgba(0,0,0,0.6)";
adminHUD.style.color="white";
adminHUD.style.fontFamily="monospace";
adminHUD.style.display="none";
document.body.appendChild(adminHUD);

init();
animate();

function init(){
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    camera = new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);
    camera.position.set(0,1.6,0); // altura dos olhos

    audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth,window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const dirLight=new THREE.DirectionalLight(0xffffff,1);
    dirLight.position.set(5,10,5);
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(0x404040));

    createArena();
    createPlayer();
    createBot();

    document.addEventListener("keydown", e=>{ keys[e.code]=true; onKeyDown(e); });
    document.addEventListener("keyup", e=>keys[e.code]=false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", playerShoot);

    document.addEventListener("keydown", e=>{
        if(e.code==="KeyF"){
            if(!document.fullscreenElement) document.body.requestFullscreen();
            else document.exitFullscreen();
        }
    });

    document.body.requestPointerLock();
}

// ====================== ARENA ======================
function createArena(){
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:0x1a1a2e}));
    floor.rotation.x=-Math.PI/2;
    scene.add(floor);

    const wallMat=new THREE.MeshStandardMaterial({color:0x16213e});
    for(let i=0;i<4;i++){
        let wall=new THREE.Mesh(new THREE.BoxGeometry(100,10,2),wallMat);
        if(i===0) wall.position.set(0,5,-50);
        if(i===1) wall.position.set(0,5,50);
        if(i===2){ wall.geometry=new THREE.BoxGeometry(2,10,100); wall.position.set(-50,5,0);}
        if(i===3){ wall.geometry=new THREE.BoxGeometry(2,10,100); wall.position.set(50,5,0);}
        scene.add(wall);
    }

    for(let i=0;i<20;i++){
        const h=Math.random()*15+5;
        const b=new THREE.Mesh(new THREE.BoxGeometry(3,h,3),new THREE.MeshStandardMaterial({color:0x0f3460}));
        b.position.set((Math.random()-0.5)*80,h/2,(Math.random()-0.5)*80);
        scene.add(b); covers.push(b);
    }
}

// ====================== PLAYER FPS ======================
function createPlayer(){
    const group=new THREE.Group();
    group.position.set(0,0,0);
    scene.add(group);
    player.mesh=group;

    // Arma FPS (aparece sempre na frente da câmera)
    const gun=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.5),new THREE.MeshStandardMaterial({color:0x222222}));
    gun.position.set(0.3,-0.2,-0.8);
    camera.add(gun);
    player.gun=gun;

    // câmera dentro do player
    group.add(camera);
}

// ====================== BOT ======================
function createBot(){
    const group=new THREE.Group();
    group.position.set(15,1,15);
    scene.add(group);
    bot.mesh=group;

    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,1.5,16),new THREE.MeshStandardMaterial({color:0xff4444}));
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.4,16,16),new THREE.MeshStandardMaterial({color:0xffbbbb}));
    head.position.y=1.2;
    group.add(body,head);

    const gun=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.1,0.5),new THREE.MeshStandardMaterial({color:0x222222}));
    gun.position.set(0.5,0.6,0);
    gun.rotation.y=-Math.PI/2;
    group.add(gun);
    bot.gun=gun;
}

// ====================== CONTROLES ======================
function onMouseMove(e){ yaw-=e.movementX*0.002; pitch-=e.movementY*0.002; pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch));}
function movePlayer(){
    if(!player.alive) return;
    const dir=new THREE.Vector3();
    if(keys["KeyW"]) dir.z-=1;
    if(keys["KeyS"]) dir.z+=1;
    if(keys["KeyA"]) dir.x-=1;
    if(keys["KeyD"]) dir.x+=1;
    dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
    camera.position.addScaledVector(dir,player.speed);

    camera.rotation.order="YXZ";
    camera.rotation.y=yaw;
    camera.rotation.x=pitch;
}

// ====================== DISPAROS ======================
function getForwardVector(){ let v=new THREE.Vector3(0,0,-1); v.applyQuaternion(camera.quaternion); return v.normalize();}
function playerShoot(){ if(!player.alive) return; createBullet(camera.position.clone(),getForwardVector(),"player");}
function botShoot(){ if(!bot.alive) return; const dir=new THREE.Vector3().subVectors(camera.position,bot.mesh.position).normalize(); createBullet(bot.mesh.position.clone(),dir,"bot");}

function createBullet(pos,dir,owner){
    const b=new THREE.Mesh(new THREE.SphereGeometry(0.1,8,8),new THREE.MeshBasicMaterial({color:owner==="player"?0x00ffff:0xff0000}));
    b.position.copy(pos);
    b.userData={direction:dir,owner};
    scene.add(b);
    bullets.push(b);
}
function updateBullets(delta){
    bullets.forEach((b,i)=>{
        b.position.addScaledVector(b.userData.direction,delta*20);
        if(b.userData.owner==="player" && bot.mesh.position.distanceTo(b.position)<1){ bot.hp-=20; scene.remove(b); bullets.splice(i,1);}
        if(b.userData.owner==="bot" && camera.position.distanceTo(b.position)<1){ player.hp-=20; scene.remove(b); bullets.splice(i,1);}
    });
}

// ====================== ANIMAÇÃO ======================
function animate(){
    requestAnimationFrame(animate);
    const delta=clock.getDelta();
    movePlayer();
    updateBullets(delta);
    renderer.render(scene,camera);
}
