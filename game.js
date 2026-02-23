let scene, camera, renderer;
let player = { speed: 0.15, hp: 100 };
let keys = {};
let enemies = [];
let score = 0;

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

    document.body.requestPointerLock();
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
    if (keys["KeyW"]) camera.position.z -= player.speed;
    if (keys["KeyS"]) camera.position.z += player.speed;
    if (keys["KeyA"]) camera.position.x -= player.speed;
    if (keys["KeyD"]) camera.position.x += player.speed;
}

function shoot() {
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

    enemies.forEach(enemy => {
        enemy.lookAt(camera.position);
        enemy.position.z += 0.01;
    });

    renderer.render(scene, camera);
}
