let scene, camera, renderer;
let player = {
    speed: 0.15,
    dashSpeed: 0.8,
    hp: 100,
    canDash: true,
    dashCooldown: 1000
};

let keys = {};
let enemies = [];
let score = 0;

let yaw = 0;
let pitch = 0;

let recoil = 0;
let recoilRecovery = 0.02;

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.y = 1.6;

    renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Luz
    const light = new THREE.PointLight(0x00ffcc, 1);
    light.position.set(10, 10, 10);
    scene.add(light);

    // Chão
    const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(50, 50),
        new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    spawnEnemy();

    document.addEventListener("keydown", e => keys[e.code] = true);
    document.addEventListener("keyup", e => keys[e.code] = false);
    document.addEventListener("click", shoot);

    document.addEventListener("mousemove", onMouseMove);

    document.body.requestPointerLock();
}

function onMouseMove(event) {
    yaw -= event.movementX * 0.002;
    pitch -= event.movementY * 0.002;

    pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
}

function spawnEnemy() {
    const enemy = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xff0055 })
    );

    enemy.position.set(
        (Math.random() - 0.5) * 20,
        0.5,
        (Math.random() - 0.5) * 20
    );

    scene.add(enemy);
    enemies.push(enemy);
}

function movePlayer() {
    let direction = new THREE.Vector3();

    if (keys["KeyW"]) direction.z -= 1;
    if (keys["KeyS"]) direction.z += 1;
    if (keys["KeyA"]) direction.x -= 1;
    if (keys["KeyD"]) direction.x += 1;

    direction.normalize();

    const moveSpeed = player.speed;
    direction.applyAxisAngle(new THREE.Vector3(0,1,0), yaw);

    camera.position.addScaledVector(direction, moveSpeed);

    // DASH
    if (keys["ShiftLeft"] && player.canDash) {
        dash(direction);
    }
}

function dash(direction) {
    player.canDash = false;

    camera.position.addScaledVector(direction, player.dashSpeed);

    setTimeout(() => {
        player.canDash = true;
    }, player.dashCooldown);
}

function shoot() {
    // aplica recoil
    recoil += 0.08;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
    const intersects = raycaster.intersectObjects(enemies);

    if (intersects.length > 0) {
        const enemy = intersects[0].object;
        scene.remove(enemy);
        enemies = enemies.filter(e => e !== enemy);
        score += 10;
        document.getElementById("score").textContent = score;
        spawnEnemy();
    }
}

function animate() {
    requestAnimationFrame(animate);

    movePlayer();

    // aplica recoil e recuperação
    if (recoil > 0) {
        recoil -= recoilRecovery;
    }

    camera.rotation.order = "YXZ";
    camera.rotation.y = yaw;
    camera.rotation.x = pitch - recoil;

    enemies.forEach(enemy => {
        enemy.lookAt(camera.position);
        enemy.position.lerp(camera.position, 0.001);
    });

    renderer.render(scene, camera);
}
