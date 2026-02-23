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
    respawnTimer: 0,
    gun: null
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
const ADMIN_KEY = "YK123";
let isAdmin = false;

// HUD admin
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

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;

    audioListener = new THREE.AudioListener();
    camera.add(audioListener);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0x404040));

    createArena();
    createPlayer();
    createBot();

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", e => keys[e.code] = false);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("click", playerShoot);

    // Fullscreen Toggle
document.addEventListener("keydown", e => {
    if (e.code === "KeyF") {
        if (!document.fullscreenElement) {
            document.body.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }
    if (e.code === "Escape" && document.fullscreenElement) {
        document.exitFullscreen();
    }
});

// ====================== ARENA ======================
function createArena() {
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x1a1a2e })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x16213e });
    for (let i = 0; i < 4; i++) {
        let wall = new THREE.Mesh(new THREE.BoxGeometry(100, 10, 2), wallMat);
        if (i === 0) wall.position.set(0, 5, -50);
        if (i === 1) wall.position.set(0, 5, 50);
        if (i === 2) { wall.geometry = new THREE.BoxGeometry(2, 10, 100); wall.position.set(-50, 5, 0); }
        if (i === 3) { wall.geometry = new THREE.BoxGeometry(2, 10, 100); wall.position.set(50, 5, 0); }
        scene.add(wall);
    }

    for (let i = 0; i < 20; i++) {
        const height = Math.random() * 15 + 5;
        const building = new THREE.Mesh(
            new THREE.BoxGeometry(3, height, 3),
            new THREE.MeshStandardMaterial({ color: 0x0f3460 })
        );
        building.position.set((Math.random() - 0.5) * 80, height / 2, (Math.random() - 0.5) * 80);
        scene.add(building);
        covers.push(building);
    }
}

// ====================== PLAYER ======================
function createPlayer() {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x00ffff });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16), bodyMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), headMat);
    head.position.y = 1.2;

    group.add(body);
    group.add(head);

    // Arma como mesh à frente do player
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), gunMat);
    gun.position.set(0.3, -0.2, -0.8); // na frente do player
    camera.add(gun); // anexada à câmera
    player.gun = gun;

    group.position.y = 1;
    scene.add(group);
    player.mesh = group;
}

// ====================== BOT ======================
function createBot() {
    const group = new THREE.Group();

    // Corpo e cabeça do bot
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xff4444 }); // vermelho vivo
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffbbbb }); // cabeça clara

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.5, 16), bodyMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), headMat);
    head.position.y = 1.2;

    group.add(body);
    group.add(head);

    // Arma do bot (simples rifle)
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), gunMat);
    gun.position.set(0.5, 0.6, 0); // posicionar à frente/direita do corpo
    gun.rotation.y = -Math.PI / 2; // virar para frente
    group.add(gun);
    bot.gun = gun;

    // Posição inicial
    group.position.set(15, 1, 15);
    scene.add(group);
    bot.mesh = group;
    // Ajustando a rotação da arma do bot para garantir que fique na direção certa
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.5), gunMat);
    gun.position.set(0.5, 0.6, 0); // posicionar à frente/direita do corpo
    gun.rotation.y = Math.PI / 4; // A rotação foi ajustada para ficar na direção correta
    group.add(gun);
    bot.gun = gun;
}
    

// ====================== CONTROLES ======================
function onMouseMove(e) {
    yaw -= e.movementX * 0.002;
    pitch -= e.movementY * 0.002;
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
}

function movePlayer() {
    if (!player.alive) return;
    let dir = new THREE.Vector3();
    if (keys["KeyW"]) dir.z -= 1;
    if (keys["KeyS"]) dir.z += 1;
    if (keys["KeyA"]) dir.x -= 1;
    if (keys["KeyD"]) dir.x += 1;
    dir.normalize();
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    camera.position.addScaledVector(dir, player.speed);
    player.mesh.position.copy(camera.position);
    player.mesh.position.y = 1;

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;

    walkTime += 0.1;
    player.mesh.rotation.z = Math.sin(walkTime) * 0.05;

    if (keys["KeyG"]) throwGrenade();
}

// ====================== DISPAROS ======================
function playerShoot() {
    if (!player.alive) return;
    createBullet(camera.position.clone(), getForwardVector(), "player");
}

function botShoot() {
    if (!bot.alive) return;
    let dir = new THREE.Vector3().subVectors(player.mesh.position, bot.mesh.position).normalize();
    createBullet(bot.mesh.position.clone(), dir, "bot");
}

// ====================== AUX ======================
function getForwardVector() {
    let v = new THREE.Vector3(0, 0, -1);
    v.applyQuaternion(camera.quaternion);
    return v.normalize();
}

// ====================== ADMIN ======================
function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === "F12" && !isAdmin) {
        const pass = prompt("Digite a senha admin:");
        if (pass === ADMIN_KEY) {
            isAdmin = true;
            adminHUD.style.display = "block";
            alert("Admin ativado! 🎮");
        } else alert("Senha incorreta ❌");
    }
}

function updateAdminHUD() {
    if (!isAdmin) return;
    adminHUD.innerHTML = `
<b>ADMIN MODE</b><br>
Player HP: ${Math.max(0, player.hp)}<br>
Bot HP: ${Math.max(0, bot.hp)}<br>
1 = Vida cheia<br>
2 = Matar Bot<br>
3 = Lançar Granada<br>
4 = Teleporte para origem
`;
}

// ====================== ANIMAÇÃO ======================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    movePlayer();
    updateBot(delta);
    updateBullets(delta);
    updateGrenades(delta);
    checkDeaths(delta);
    updateAdmin();
    updateAdminHUD();
    renderer.render(scene, camera);
}
