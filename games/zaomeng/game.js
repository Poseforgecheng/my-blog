// Game configuration
const CONFIG = {
    width: 1100,
    height: 580,
    groundY: 580 - 110,
    gravity: 0.5,
    jumpForce: -12.4,
    moveSpeed: 5.3,
    animationSpeed: 7,
    playerMaxHp: 10,
    bulletSpeed: 10,
    monsterSpeed: 2,
    monsterHp: 5,
    throwMonsterHp: 3,
    fightRangeMelee: 50,
    fightRangeRanged: 400,
    attackCooldown: 56,
    playerAttackCooldown: 26,
    hurtTime: 18
};

// Asset mapping
const assets = {
    bg: 'assets/beijing.png',
    bullet: 'assets/light.png',
    wukong_sheet: 'assets/wukong_new.png',

    // Melee monster
    monster_walk_left_1: 'assets/monster_walk_left_1.png',
    monster_walk_left_2: 'assets/monster_walk_left_2.png',
    monster_walk_left_3: 'assets/monster_walk_left_3.png',
    monster_walk_right_1: 'assets/monster_walk_right_1.png',
    monster_walk_right_2: 'assets/monster_walk_right_2.png',
    monster_walk_right_3: 'assets/monster_walk_right_3.png',
    monster_attack_left_1: 'assets/monster_attack_left_1.png',
    monster_attack_left_2: 'assets/monster_attack_left_2.png',
    monster_attack_left_3: 'assets/monster_attack_left_3.png',
    monster_attack_right_1: 'assets/monster_attack_right_1.png',
    monster_attack_right_2: 'assets/monster_attack_right_2.png',
    monster_attack_right_3: 'assets/monster_attack_right_3.png',
    monster_hurt_left: 'assets/monster_attack_left.png',
    monster_hurt_right: 'assets/monster_attack_right.png',

    // Ranged monster
    throw_walk_left_1: 'assets/thrrow_walk_left_1.png',
    throw_walk_left_2: 'assets/thrrow_walk_left_2.png',
    throw_walk_right_1: 'assets/thrrow_walk_right_1.png',
    throw_walk_right_2: 'assets/thrrow_walk_right_2.png',
    throw_attack_left_1: 'assets/thrrow_attack_left_1.png',
    throw_attack_left_2: 'assets/thrrow_attack_left_2.png',
    throw_attack_right_1: 'assets/thrrow_attack_right_1.png',
    throw_attack_right_2: 'assets/thrrow_attack_right_2.png',
    throw_hurt_left: 'assets/thrrow_attack_left.png',
    throw_hurt_right: 'assets/thrrow_attack_right_2.png',

    // Ranged projectile
    stone: 'assets/stone_1.png'
};

const images = {};
const processedSheets = {};
let imagesLoaded = 0;
const totalImages = Object.keys(assets).length;
let gameStarted = false;

const keys = {
    ArrowUp: false,
    ArrowLeft: false,
    ArrowRight: false,
    Space: false
};

let bullets = [];
let stones = [];
let monsters = [];

const fx = {
    particles: [],
    rings: [],
    slashes: [],
    mists: [],
    motes: [],
    shakeTime: 0,
    shakePower: 0,
    shakeX: 0,
    shakeY: 0,
    worldTime: 0
};

const WUKONG_ATLAS = {
    poseFront: { x: 82, y: 86, w: 520, h: 686 },
    poseBack: [
        { x: 623, y: 72, w: 138, h: 192 },
        { x: 794, y: 72, w: 138, h: 192 },
        { x: 964, y: 72, w: 138, h: 192 }
    ],
    faces: {
        neutral: { x: 635, y: 275, w: 112, h: 112 },
        angry: { x: 752, y: 275, w: 112, h: 112 },
        grin: { x: 869, y: 275, w: 112, h: 112 },
        roar: { x: 987, y: 275, w: 112, h: 112 },
        focus: { x: 656, y: 395, w: 112, h: 112 },
        calm: { x: 774, y: 395, w: 112, h: 112 }
    },
    weaponStaff: { x: 618, y: 526, w: 536, h: 78 },
    skills: [
        { x: 744, y: 624, w: 108, h: 96 },
        { x: 871, y: 624, w: 108, h: 96 },
        { x: 997, y: 624, w: 108, h: 96 }
    ]
};

function sampleBorderColor(data, width, height) {
    let r = 0;
    let g = 0;
    let b = 0;
    let count = 0;

    const add = (x, y) => {
        const i = (y * width + x) * 4;
        const a = data[i + 3] / 255;
        if (a < 0.1) return;
        r += data[i] * a;
        g += data[i + 1] * a;
        b += data[i + 2] * a;
        count += a;
    };

    const step = Math.max(1, Math.floor(Math.min(width, height) / 52));
    const insetMax = Math.min(3, Math.floor(Math.min(width, height) / 8));

    for (let inset = 0; inset <= insetMax; inset++) {
        const left = inset;
        const top = inset;
        const right = width - 1 - inset;
        const bottom = height - 1 - inset;
        if (left >= right || top >= bottom) break;

        for (let x = left; x <= right; x += step) {
            add(x, top);
            add(x, bottom);
        }
        for (let y = top; y <= bottom; y += step) {
            add(left, y);
            add(right, y);
        }
    }

    if (count < 1) return { r: 224, g: 212, b: 190 };
    return { r: r / count, g: g / count, b: b / count };
}

function keepConnectedOpaqueRegion(data, width, height, seedRatios, minAlpha = 180) {
    const total = width * height;
    const strong = new Uint8Array(total);
    let strongCount = 0;

    for (let i = 0; i < total; i++) {
        if (data[i * 4 + 3] >= minAlpha) {
            strong[i] = 1;
            strongCount++;
        }
    }
    if (strongCount === 0) return;

    const keepStrong = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const enqueue = (x, y) => {
        if (x < 0 || x >= width || y < 0 || y >= height) return;
        const idx = y * width + x;
        if (!strong[idx] || keepStrong[idx]) return;
        keepStrong[idx] = 1;
        queue[tail++] = idx;
    };

    for (const seed of seedRatios) {
        enqueue(Math.floor(seed.x * width), Math.floor(seed.y * height));
    }

    if (tail === 0) {
        let best = -1;
        let bestAlpha = -1;
        for (let i = 0; i < total; i++) {
            if (!strong[i]) continue;
            const alpha = data[i * 4 + 3];
            if (alpha > bestAlpha) {
                bestAlpha = alpha;
                best = i;
            }
        }
        if (best >= 0) {
            keepStrong[best] = 1;
            queue[tail++] = best;
        }
    }

    while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;
        const y = Math.floor(idx / width);
        enqueue(x - 1, y);
        enqueue(x + 1, y);
        enqueue(x, y - 1);
        enqueue(x, y + 1);
    }

    for (let i = 0; i < total; i++) {
        if (data[i * 4 + 3] > 0 && !keepStrong[i]) {
            data[i * 4 + 3] = 0;
        }
    }
}

function getAtlasCutoutSlice(image, rect, mode = 'default') {
    if (!image || !rect) return null;

    const cacheKey = `${rect.x},${rect.y},${rect.w},${rect.h}|${mode}`;
    const sourceKey = image.currentSrc || image.src || 'unknown';
    if (!processedSheets[sourceKey]) processedSheets[sourceKey] = new Map();
    const cache = processedSheets[sourceKey];
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const canvas = document.createElement('canvas');
    canvas.width = rect.w;
    canvas.height = rect.h;

    const cctx = canvas.getContext('2d', { willReadFrequently: true });
    cctx.drawImage(image, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

    const imgData = cctx.getImageData(0, 0, rect.w, rect.h);
    const data = imgData.data;
    const bg = sampleBorderColor(data, rect.w, rect.h);

    const modeProfile = mode === 'face'
        ? { deltaHard: 68, deltaSoft: 110, satHard: 72, satSoft: 96, soft: true }
        : mode === 'body'
            ? { deltaHard: 84, deltaSoft: 142, satHard: 92, satSoft: 116, soft: false }
            : mode === 'weapon'
                ? { deltaHard: 80, deltaSoft: 138, satHard: 88, satSoft: 114, soft: false }
                : { deltaHard: 74, deltaSoft: 126, satHard: 62, satSoft: 86, soft: true };

    const { deltaHard, deltaSoft, satHard, satSoft, soft } = modeProfile;

    for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha === 0) continue;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const maxChannel = Math.max(r, g, b);
        const minChannel = Math.min(r, g, b);
        const saturation = maxChannel - minChannel;
        const lum = r * 0.299 + g * 0.587 + b * 0.114;
        const delta = Math.abs(r - bg.r) + Math.abs(g - bg.g) + Math.abs(b - bg.b);
        const coolBias = b - r;

        const canFade = lum > 92 && saturation < satSoft;
        if (!canFade) continue;
        if (mode === 'body' && coolBias > 10 && lum > 98 && saturation > 12) continue;

        if (delta <= deltaHard && saturation <= satHard) {
            data[i + 3] = 0;
            continue;
        }

        if (delta < deltaSoft) {
            if (!soft) {
                data[i + 3] = 0;
            } else {
                const t = (delta - deltaHard) / Math.max(1, deltaSoft - deltaHard);
                const satWeight = saturation <= satHard
                    ? 1
                    : 1 - (saturation - satHard) / Math.max(1, satSoft - satHard);
                const keep = clamp(t * satWeight, 0, 1);
                data[i + 3] = Math.round(alpha * keep);
            }
        }

        if (!soft && data[i + 3] < 224) {
            data[i + 3] = 0;
        }
    }

    if (mode === 'body') {
        keepConnectedOpaqueRegion(
            data,
            rect.w,
            rect.h,
            [
                { x: 0.47, y: 0.5 },
                { x: 0.34, y: 0.72 },
                { x: 0.53, y: 0.32 }
            ],
            170
        );
    }

    cctx.putImageData(imgData, 0, 0);
    cache.set(cacheKey, canvas);
    return canvas;
}

function resolveAtlasSource(image, rect, options) {
    if (!options || !options.cutout || image !== images.wukong_sheet) {
        return {
            image,
            sx: rect.x,
            sy: rect.y,
            sw: rect.w,
            sh: rect.h
        };
    }

    const cutout = getAtlasCutoutSlice(image, rect, options.mode || 'default');
    if (!cutout) {
        return {
            image,
            sx: rect.x,
            sy: rect.y,
            sw: rect.w,
            sh: rect.h
        };
    }

    return {
        image: cutout,
        sx: 0,
        sy: 0,
        sw: cutout.width,
        sh: cutout.height
    };
}

function drawAtlasSlice(ctx, image, rect, dx, dy, dw, dh, alpha = 1, options = null) {
    if (!image || !rect) return;
    const src = resolveAtlasSource(image, rect, options);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(src.image, src.sx, src.sy, src.sw, src.sh, dx, dy, dw, dh);
    ctx.restore();
}

function pickWukongFace(player) {
    if (player.hurtTimer > 0 && player.state !== 'attack') return WUKONG_ATLAS.faces.angry;
    if (player.state === 'attack') return WUKONG_ATLAS.faces.roar;
    if (player.state === 'jump') return WUKONG_ATLAS.faces.focus;
    if (player.state === 'fall') return WUKONG_ATLAS.faces.calm;
    if (player.state === 'run') return WUKONG_ATLAS.faces.grin;
    return WUKONG_ATLAS.faces.neutral;
}

function drawStaffImpact(ctx, pattern, swingT) {
    const progress = clamp(1 - swingT, 0, 1);
    if (progress < 0.1) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    if (pattern === 'overhead') {
        const slashX = 18 + progress * 28;
        const slashTop = -198 + progress * 34;
        const slashBottom = -26 + progress * 20;

        ctx.strokeStyle = `rgba(255, 172, 84, ${0.36 + progress * 0.5})`;
        ctx.lineWidth = 18 + progress * 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(slashX - 28, slashTop);
        ctx.quadraticCurveTo(slashX + 4, slashTop + 64, slashX + 22, slashBottom);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 236, 196, ${0.24 + progress * 0.36})`;
        ctx.lineWidth = 6 + progress * 3;
        ctx.beginPath();
        ctx.moveTo(slashX - 16, slashTop + 8);
        ctx.quadraticCurveTo(slashX + 10, slashTop + 68, slashX + 16, slashBottom + 2);
        ctx.stroke();
    } else {
        const span = 144 + progress * 18;
        const y = -96 + Math.sin(progress * Math.PI) * 5;
        const curve = 9 + progress * 7;

        ctx.strokeStyle = `rgba(118, 220, 255, ${0.34 + progress * 0.52})`;
        ctx.lineWidth = 18 + progress * 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-span, y + curve * 0.4);
        ctx.quadraticCurveTo(0, y - curve, span, y - curve * 0.4);
        ctx.stroke();

        ctx.strokeStyle = `rgba(220, 248, 255, ${0.22 + progress * 0.36})`;
        ctx.lineWidth = 6 + progress * 2.8;
        ctx.beginPath();
        ctx.moveTo(-span + 8, y + curve * 0.2);
        ctx.quadraticCurveTo(0, y - curve * 0.84, span - 8, y - curve * 0.2);
        ctx.stroke();
    }

    ctx.restore();
}

function drawPlayerBlackMythWukong(ctx, player, motion) {
    const sheet = images.wukong_sheet;
    if (!sheet) return false;

    const isAir = player.state === 'jump' || player.state === 'fall';
    const isAttack = player.state === 'attack';
    const isHurt = player.hurtTimer > 0 && !isAttack;

    const step = motion.step || 0;
    const bob = motion.bob || 0;
    const lean = motion.lean || 0;
    const windupT = motion.windupT || 0;
    const swingT = motion.swingT || 0;

    const useBackPose = isAir || (player.state === 'run' && Math.abs(player.vx) > CONFIG.moveSpeed * 0.55);
    const backIndex = Math.floor((fx.worldTime / 9) % WUKONG_ATLAS.poseBack.length);
    const bodyRect = useBackPose ? WUKONG_ATLAS.poseBack[backIndex] : WUKONG_ATLAS.poseFront;
    const bodyH = useBackPose ? 220 : 252;
    const bodyW = bodyH * (bodyRect.w / bodyRect.h);

    const anchorX = player.x + player.width * 0.5 + step * 0.45;
    const anchorY = player.y + bob * 0.44;
    const dir = player.facingRight ? 1 : -1;
    const attackPattern = isAttack
        ? (player.attackPattern || (dir > 0 ? 'overhead' : 'sweep'))
        : (dir > 0 ? 'overhead' : 'sweep');

    ctx.save();
    ctx.translate(anchorX, anchorY);
    if (!player.facingRight) {
        ctx.scale(-1, 1);
    }

    let bodyTilt = lean * 0.38;
    if (isAttack) {
        if (attackPattern === 'overhead') {
            bodyTilt += 0.08 - windupT * 0.18 + swingT * 0.08;
        } else {
            bodyTilt += -0.02 + windupT * 0.04 + swingT * 0.16;
        }
    }
    if (isHurt) bodyTilt += 0.14;
    if (isAir) bodyTilt += player.state === 'jump' ? -0.05 : 0.08;
    ctx.rotate(bodyTilt);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 33, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    drawAtlasSlice(
        ctx,
        sheet,
        bodyRect,
        -bodyW * 0.5,
        -bodyH + 6,
        bodyW,
        bodyH,
        0.99,
        { cutout: true, mode: 'body' }
    );

    const faceRect = pickWukongFace(player);
    const faceSize = useBackPose ? 40 : 46;
    const faceX = -faceSize * 0.5 + (isAttack ? 5 : 0);
    const faceY = -bodyH + (useBackPose ? 88 : 102);
    drawAtlasSlice(ctx, sheet, faceRect, faceX, faceY, faceSize, faceSize, 0.94, { cutout: true, mode: 'face' });

    let staffAngle = -0.34 + step * 0.03;
    if (player.state === 'run') staffAngle += step * 0.06;
    if (player.state === 'jump') staffAngle = -1.06;
    if (player.state === 'fall') staffAngle = 0.22;
    if (windupT > 0) {
        if (attackPattern === 'overhead') {
            staffAngle = -2.2 + windupT * 0.5;
        } else {
            staffAngle = -0.26 + windupT * 0.12;
        }
    }
    if (swingT > 0) {
        if (attackPattern === 'overhead') {
            staffAngle = 1.26 - swingT * 3.18;
        } else {
            staffAngle = 0.12 - swingT * 0.48;
        }
    }
    if (isHurt) staffAngle = -0.82;

    const staffLen = 188;
    const staffThick = 22;

    ctx.save();
    const staffAnchorX = attackPattern === 'overhead' ? 16 : 12;
    const staffAnchorY = attackPattern === 'overhead' ? -bodyH + 134 : -bodyH + 142;
    ctx.translate(staffAnchorX, staffAnchorY);
    ctx.rotate(staffAngle);

    if (isAttack || swingT > 0.1 || windupT > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 205, 122, ${0.2 + Math.max(windupT, swingT) * 0.28})`;
        fillRoundedRect(ctx, -staffLen * 0.5 - 10, -staffThick * 0.5 - 7, staffLen + 20, staffThick + 14, 12);
        ctx.globalCompositeOperation = 'source-over';
    }

    drawAtlasSlice(
        ctx,
        sheet,
        WUKONG_ATLAS.weaponStaff,
        -staffLen * 0.5,
        -staffThick * 0.5,
        staffLen,
        staffThick,
        0.99,
        { cutout: true, mode: 'weapon' }
    );
    ctx.restore();

    if (isAttack) {
        drawStaffImpact(ctx, attackPattern, swingT);
        const skillRect = attackPattern === 'overhead'
            ? (swingT > 0.45 ? WUKONG_ATLAS.skills[2] : WUKONG_ATLAS.skills[1])
            : (swingT > 0.45 ? WUKONG_ATLAS.skills[0] : WUKONG_ATLAS.skills[1]);
        drawAtlasSlice(ctx, sheet, skillRect, 64, -bodyH + 78, 64, 56, 0.84);
    }

    if (isHurt) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255, 106, 92, 0.24)';
        fillRoundedRect(ctx, -bodyW * 0.5 - 8, -bodyH - 2, bodyW + 16, bodyH + 10, 20);
        ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
    return true;
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function fillRoundedRect(ctx, x, y, width, height, radius) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.fill();
}

function strokeRoundedRect(ctx, x, y, width, height, radius) {
    roundedRectPath(ctx, x, y, width, height, radius);
    ctx.stroke();
}

function initFx() {
    fx.mists = Array.from({ length: 8 }, (_, i) => ({
        baseX: rand(-120, CONFIG.width + 120),
        y: rand(115, CONFIG.groundY - 35),
        rx: rand(110, 240),
        ry: rand(24, 60),
        phase: rand(0, Math.PI * 2),
        speed: rand(0.6, 1.4),
        drift: rand(40, 140),
        alpha: rand(0.05, 0.15),
        layer: i < 5 ? 'back' : 'front'
    }));

    fx.motes = Array.from({ length: 30 }, () => ({
        x: rand(0, CONFIG.width),
        y: rand(80, CONFIG.groundY - 20),
        r: rand(0.8, 2.2),
        speed: rand(0.15, 0.48),
        phase: rand(0, Math.PI * 2),
        phaseSpeed: rand(0.015, 0.04),
        alpha: rand(0.18, 0.42)
    }));
}

function addCameraShake(power, duration) {
    fx.shakePower = Math.max(fx.shakePower, power);
    fx.shakeTime = Math.max(fx.shakeTime, duration);
}

function spawnParticle(x, y, options = {}) {
    if (fx.particles.length > 220) {
        fx.particles.splice(0, fx.particles.length - 220);
    }

    fx.particles.push({
        x,
        y,
        vx: options.vx !== undefined ? options.vx : rand(-1.2, 1.2),
        vy: options.vy !== undefined ? options.vy : rand(-2.2, -0.3),
        size: options.size !== undefined ? options.size : rand(2, 5),
        color: options.color || 'rgba(255, 214, 140, 0.9)',
        life: options.life !== undefined ? options.life : 22,
        maxLife: options.life !== undefined ? options.life : 22,
        gravity: options.gravity !== undefined ? options.gravity : 0.08,
        damp: options.damp !== undefined ? options.damp : 0.97,
        glow: options.glow !== undefined ? options.glow : 0.2
    });
}

function spawnRing(x, y, options = {}) {
    if (fx.rings.length > 60) {
        fx.rings.shift();
    }

    const maxLife = options.life || 18;
    fx.rings.push({
        x,
        y,
        radius: options.radius || 12,
        growth: options.growth || 2.2,
        life: maxLife,
        maxLife,
        width: options.width || 2,
        color: options.color || 'rgba(255, 205, 120, 0.95)',
        fill: options.fill || 'rgba(255, 180, 96, 0.12)'
    });
}

function spawnSlash(x, y, direction, options = {}) {
    if (fx.slashes.length > 45) {
        fx.slashes.shift();
    }

    const maxLife = options.life || 12;
    fx.slashes.push({
        x,
        y,
        direction,
        radius: options.radius || 64,
        spread: options.spread || 0.92,
        lineWidth: options.lineWidth || 24,
        color: options.color || 'rgba(255, 182, 84, 0.95)',
        life: maxLife,
        maxLife
    });
}

function spawnAttackCharge(x, y, direction) {
    spawnRing(x, y, {
        radius: 9,
        growth: 2.8,
        width: 2.2,
        color: 'rgba(255, 219, 148, 0.95)',
        fill: 'rgba(255, 176, 64, 0.20)',
        life: 14
    });

    spawnSlash(x - direction * 12, y + 4, direction, {
        radius: 44,
        spread: 0.66,
        lineWidth: 10,
        color: 'rgba(255, 223, 171, 0.5)',
        life: 8
    });

    for (let i = 0; i < 8; i++) {
        const speed = rand(1.1, 3.6);
        const angle = rand(-Math.PI * 0.62, Math.PI * 0.62);
        spawnParticle(x + direction * rand(3, 16), y + rand(-8, 8), {
            vx: Math.cos(angle) * speed * direction,
            vy: Math.sin(angle) * speed * 0.6,
            life: rand(12, 20),
            size: rand(2, 4),
            color: 'rgba(255, 198, 103, 0.9)',
            gravity: 0.03,
            damp: 0.94,
            glow: 0.35
        });
    }
}

function spawnHitBurst(x, y, color = 'rgba(255, 189, 104, 0.95)', scale = 1) {
    spawnRing(x, y, {
        radius: 10 * scale,
        growth: 3.4 * scale,
        width: 2.4,
        color,
        fill: 'rgba(255, 154, 67, 0.15)',
        life: 16
    });

    spawnSlash(x, y, Math.random() > 0.5 ? 1 : -1, {
        radius: 36 * scale,
        spread: 0.78,
        lineWidth: 9,
        color,
        life: 9
    });

    for (let i = 0; i < 14; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(0.9, 4.2) * scale;
        spawnParticle(x, y, {
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - rand(0.2, 1.2),
            life: rand(12, 26),
            size: rand(1.8, 5.2) * scale,
            color,
            gravity: 0.06,
            damp: 0.95,
            glow: 0.48
        });
    }
}

function updateEffects() {
    fx.worldTime += 1;

    if (fx.shakeTime > 0) {
        const ratio = clamp(fx.shakeTime / 9, 0, 1);
        const shake = fx.shakePower * ratio;
        fx.shakeX = rand(-shake, shake);
        fx.shakeY = rand(-shake, shake);
        fx.shakeTime--;
        fx.shakePower *= 0.9;
    } else {
        fx.shakeX = 0;
        fx.shakeY = 0;
        fx.shakePower = 0;
    }

    fx.particles.forEach(p => {
        p.life--;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= p.damp;
        p.vy *= p.damp;
    });
    fx.particles = fx.particles.filter(p => p.life > 0);

    fx.rings.forEach(r => {
        r.life--;
        r.radius += r.growth;
    });
    fx.rings = fx.rings.filter(r => r.life > 0);

    fx.slashes.forEach(s => {
        s.life--;
    });
    fx.slashes = fx.slashes.filter(s => s.life > 0);

    fx.motes.forEach(m => {
        m.x += m.speed;
        if (m.x > CONFIG.width + 30) {
            m.x = -30;
            m.y = rand(85, CONFIG.groundY - 28);
        }
        m.phase += m.phaseSpeed;
    });
}

function drawBackground(ctx) {
    if (images.bg) {
        ctx.drawImage(images.bg, 0, 0, CONFIG.width, CONFIG.height);
    }

    const skyShade = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
    skyShade.addColorStop(0, 'rgba(7, 22, 40, 0.33)');
    skyShade.addColorStop(0.48, 'rgba(15, 23, 36, 0.04)');
    skyShade.addColorStop(1, 'rgba(9, 11, 16, 0.26)');
    ctx.fillStyle = skyShade;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    fx.mists.forEach(m => {
        if (m.layer !== 'back') return;
        const wave = Math.sin(fx.worldTime * 0.007 * m.speed + m.phase);
        const x = m.baseX + wave * m.drift;
        const y = m.y + Math.cos(fx.worldTime * 0.005 * m.speed + m.phase) * 9;

        ctx.fillStyle = `rgba(205, 228, 255, ${m.alpha})`;
        ctx.beginPath();
        ctx.ellipse(x, y, m.rx, m.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    const floorFog = ctx.createLinearGradient(0, CONFIG.groundY - 90, 0, CONFIG.groundY + 30);
    floorFog.addColorStop(0, 'rgba(210, 228, 255, 0)');
    floorFog.addColorStop(1, 'rgba(226, 238, 255, 0.22)');
    ctx.fillStyle = floorFog;
    ctx.fillRect(0, CONFIG.groundY - 90, CONFIG.width, 120);

    const groundBand = ctx.createLinearGradient(0, CONFIG.groundY + 30, 0, CONFIG.height);
    groundBand.addColorStop(0, 'rgba(255, 170, 92, 0.08)');
    groundBand.addColorStop(1, 'rgba(16, 17, 21, 0.28)');
    ctx.fillStyle = groundBand;
    ctx.fillRect(0, CONFIG.groundY + 30, CONFIG.width, CONFIG.height - CONFIG.groundY - 30);
}

function drawForegroundAtmosphere(ctx) {
    fx.mists.forEach(m => {
        if (m.layer !== 'front') return;
        const wave = Math.sin(fx.worldTime * 0.007 * m.speed + m.phase);
        const x = m.baseX + wave * m.drift;
        const y = m.y + Math.cos(fx.worldTime * 0.006 * m.speed + m.phase) * 8;

        ctx.fillStyle = `rgba(237, 245, 255, ${m.alpha + 0.02})`;
        ctx.beginPath();
        ctx.ellipse(x, y, m.rx, m.ry, 0, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    fx.motes.forEach(m => {
        const twinkle = 0.7 + Math.sin(m.phase + fx.worldTime * 0.06) * 0.3;
        ctx.fillStyle = `rgba(255, 229, 172, ${m.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y + Math.sin(m.phase) * 2.5, m.r * twinkle, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawEffects(ctx) {
    ctx.save();
    fx.rings.forEach(r => {
        const alpha = r.life / r.maxLife;
        ctx.strokeStyle = r.color.replace(/\d?\.\d+\)$/, `${Math.max(0.08, alpha)})`);
        ctx.lineWidth = r.width;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = r.fill.replace(/\d?\.\d+\)$/, `${alpha * 0.75})`);
        ctx.beginPath();
        ctx.arc(r.x, r.y, Math.max(0, r.radius - 2), 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.globalCompositeOperation = 'lighter';

    fx.slashes.forEach(s => {
        const alpha = s.life / s.maxLife;
        const sweep = s.spread * (0.6 + (1 - alpha) * 0.45);
        const dir = s.direction > 0 ? 1 : -1;
        const start = dir > 0 ? -sweep : Math.PI - sweep;
        const end = dir > 0 ? sweep : Math.PI + sweep;

        ctx.strokeStyle = s.color.replace(/\d?\.\d+\)$/, `${0.1 + alpha * 0.85})`);
        ctx.lineWidth = s.lineWidth * (0.75 + alpha * 0.6);
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * (1 + (1 - alpha) * 0.25), start, end);
        ctx.stroke();
    });

    fx.particles.forEach(p => {
        const alpha = p.life / p.maxLife;
        const size = p.size * (0.7 + (1 - alpha) * 0.35);

        if (p.glow > 0.02) {
            const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * (2.2 + p.glow));
            glow.addColorStop(0, `rgba(255, 220, 180, ${alpha * p.glow})`);
            glow.addColorStop(1, 'rgba(255, 196, 98, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(p.x, p.y, size * (2.2 + p.glow), 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = p.color.replace(/\d?\.\d+\)$/, `${Math.max(0.02, alpha)})`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.restore();

    const edgeShade = ctx.createRadialGradient(
        CONFIG.width * 0.5,
        CONFIG.height * 0.5,
        CONFIG.width * 0.22,
        CONFIG.width * 0.5,
        CONFIG.height * 0.5,
        CONFIG.width * 0.62
    );
    edgeShade.addColorStop(0, 'rgba(0, 0, 0, 0)');
    edgeShade.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = edgeShade;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

class Bullet {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.vx = direction * CONFIG.bulletSpeed;
        this.width = 26;
        this.height = 14;
        this.direction = direction;
        this.active = true;
        this.life = 0;
        this.phase = rand(0, Math.PI * 2);
        this.trail = [];
    }

    update() {
        this.life++;
        this.x += this.vx;
        this.y += Math.sin(this.life * 0.34 + this.phase) * 0.36;

        this.trail.push({
            x: this.x + this.width * 0.5,
            y: this.y + this.height * 0.5
        });

        if (this.trail.length > 8) {
            this.trail.shift();
        }

        if (this.x < -150 || this.x > CONFIG.width + 150 || this.life > 120) {
            this.active = false;
        }
    }

    draw(ctx) {
        const centerX = this.x + this.width * 0.5;
        const centerY = this.y + this.height * 0.5;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        if (this.trail.length > 1) {
            for (let i = 1; i < this.trail.length; i++) {
                const prev = this.trail[i - 1];
                const cur = this.trail[i];
                const t = i / (this.trail.length - 1);

                ctx.strokeStyle = `rgba(255, ${170 + Math.floor(t * 60)}, ${80 + Math.floor(t * 120)}, ${0.15 + t * 0.36})`;
                ctx.lineWidth = 2 + t * 5;
                ctx.lineCap = 'round';
                ctx.beginPath();
                ctx.moveTo(prev.x, prev.y);
                ctx.lineTo(cur.x, cur.y);
                ctx.stroke();
            }
        }

        const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 22);
        glow.addColorStop(0, 'rgba(255, 248, 190, 0.95)');
        glow.addColorStop(0.55, 'rgba(255, 178, 83, 0.56)');
        glow.addColorStop(1, 'rgba(255, 124, 36, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 22, 0, Math.PI * 2);
        ctx.fill();

        const tailLength = 18;
        ctx.fillStyle = 'rgba(255, 186, 100, 0.75)';
        ctx.beginPath();
        ctx.moveTo(centerX - this.direction * tailLength, centerY);
        ctx.lineTo(centerX - this.direction * 5, centerY - 5);
        ctx.lineTo(centerX + this.direction * 9, centerY);
        ctx.lineTo(centerX - this.direction * 5, centerY + 5);
        ctx.closePath();
        ctx.fill();

        if (images.bullet) {
            ctx.globalAlpha = 0.9;
            ctx.drawImage(images.bullet, centerX - 9, centerY - 9, 18, 18);
        }

        ctx.restore();
    }

    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

class Stone {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.active = true;

        const angle = Math.atan2(targetY - y, targetX - x);
        const speed = 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.rotation = rand(0, Math.PI * 2);
        this.spin = rand(-0.2, 0.2);
        this.trail = [];

        if (images.stone) {
            this.width = images.stone.width;
            this.height = images.stone.height;
        }
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.spin;

        this.trail.push({
            x: this.x + this.width * 0.5,
            y: this.y + this.height * 0.5
        });

        if (this.trail.length > 5) {
            this.trail.shift();
        }

        if (this.y > CONFIG.groundY + 60 || this.x < -120 || this.x > CONFIG.width + 120) {
            this.active = false;
        }
    }

    draw(ctx) {
        const centerX = this.x + this.width * 0.5;
        const centerY = this.y + this.height * 0.5;

        ctx.save();

        for (let i = 0; i < this.trail.length; i++) {
            const point = this.trail[i];
            const t = i / this.trail.length;
            ctx.fillStyle = `rgba(174, 196, 220, ${0.08 + t * 0.2})`;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5 + t * 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);

        if (images.stone) {
            ctx.drawImage(images.stone, -this.width * 0.5, -this.height * 0.5);
        } else {
            ctx.fillStyle = '#8a8f98';
            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.45, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getRect() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}

class Monster {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.y = CONFIG.groundY;
        this.width = 80;
        this.height = 80;
        this.hp = type === 'melee' ? CONFIG.monsterHp : CONFIG.throwMonsterHp;
        this.vx = 0;
        this.state = 'walk';
        this.facingRight = false;

        this.frameTimer = 0;
        this.animationFrame = 0;

        this.attackTimer = 0;
        this.hurtTimer = 0;
        this.hitFlash = 0;
        this.telegraph = 0;

        this.active = true;
    }

    update(targetPlayer) {
        if (this.hurtTimer > 0) {
            this.hurtTimer--;
            this.state = 'hurt';
            this.x += this.facingRight ? -1 : 1;
            this.hitFlash = Math.max(this.hitFlash, 6);
            return;
        }

        const dist = targetPlayer.x - this.x;
        const absDist = Math.abs(dist);
        this.facingRight = dist > 0;

        const range = this.type === 'melee' ? CONFIG.fightRangeMelee : CONFIG.fightRangeRanged;

        if (this.attackTimer > 0) {
            this.attackTimer--;
        }

        if (this.telegraph > 0) {
            this.telegraph--;
        }

        if (absDist <= range) {
            if (this.attackTimer === 0) {
                this.state = 'attack';
                this.animationFrame = 0;
                this.frameTimer = 0;
                this.attackTimer = CONFIG.attackCooldown;
                this.telegraph = 13;
            } else if (this.state !== 'attack') {
                this.state = 'walk';
                this.vx = 0;
            }
        } else {
            this.state = 'walk';
            this.vx = this.facingRight ? CONFIG.monsterSpeed : -CONFIG.monsterSpeed;
            this.x += this.vx;
        }

        this.frameTimer++;

        if (this.state === 'walk') {
            if (this.frameTimer > CONFIG.animationSpeed) {
                this.frameTimer = 0;
                this.animationFrame = (this.animationFrame + 1) % 3;
            }
        } else if (this.state === 'attack') {
            if (this.frameTimer > CONFIG.animationSpeed) {
                this.frameTimer = 0;
                this.animationFrame++;

                if (this.type === 'melee' && this.animationFrame === 2) {
                    if (checkCollision(this.getRect(), targetPlayer.getRect())) {
                        targetPlayer.takeDamage(1);
                        addCameraShake(2.4, 5);
                    }
                }

                if (this.type === 'ranged' && this.animationFrame === 1) {
                    const stoneX = this.x + (this.facingRight ? this.width * 0.45 : -6);
                    stones.push(new Stone(stoneX, this.y - this.height * 0.68, targetPlayer.x + targetPlayer.width * 0.5, targetPlayer.y - 62));
                }

                if (this.animationFrame >= 3) {
                    this.state = 'walk';
                    this.animationFrame = 0;
                }
            }
        }
    }

    draw(ctx) {
        let imgName = '';
        const dir = this.facingRight ? 'right' : 'left';

        if (this.state === 'hurt') {
            imgName = this.type === 'melee' ? `monster_hurt_${dir}` : `throw_hurt_${dir}`;
        } else if (this.state === 'attack') {
            const frame = Math.min(this.animationFrame + 1, 3);
            if (this.type === 'melee') {
                imgName = `monster_attack_${dir}_${frame}`;
            } else {
                const rFrame = Math.min(this.animationFrame + 1, 2);
                imgName = `throw_attack_${dir}_${rFrame}`;
            }
        } else {
            const frame = (this.animationFrame % (this.type === 'melee' ? 3 : 2)) + 1;
            if (this.type === 'melee') {
                imgName = `monster_walk_${dir}_${frame}`;
            } else {
                imgName = `throw_walk_${dir}_${frame}`;
            }
        }

        const img = images[imgName];

        ctx.save();

        const shadowWidth = this.width * 0.46;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
        ctx.beginPath();
        ctx.ellipse(this.x + this.width * 0.5, this.y + 2, shadowWidth, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        if (img) {
            ctx.drawImage(img, this.x, this.y - img.height);
            this.width = img.width;
            this.height = img.height;
        }

        if (this.hitFlash > 0) {
            this.hitFlash--;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 120, 80, 0.32)';
            ctx.fillRect(this.x - 2, this.y - this.height - 2, this.width + 4, this.height + 4);
            ctx.globalCompositeOperation = 'source-over';
        }

        const maxHp = this.type === 'melee' ? CONFIG.monsterHp : CONFIG.throwMonsterHp;
        const hpRatio = clamp(this.hp / maxHp, 0, 1);
        const barWidth = Math.max(34, this.width * 0.72);
        const barHeight = 6;
        const barX = this.x + (this.width - barWidth) * 0.5;
        const barY = this.y - this.height - 12;

        ctx.fillStyle = 'rgba(15, 18, 24, 0.6)';
        fillRoundedRect(ctx, barX - 1, barY - 1, barWidth + 2, barHeight + 2, 3);

        const hpGradient = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
        hpGradient.addColorStop(0, '#ff9f5e');
        hpGradient.addColorStop(1, '#ff4f5e');
        ctx.fillStyle = hpGradient;
        fillRoundedRect(ctx, barX, barY, barWidth * hpRatio, barHeight, 3);

        if (this.type === 'ranged' && this.telegraph > 0) {
            const pulse = 0.4 + Math.sin(fx.worldTime * 0.3) * 0.6;
            const originX = this.x + this.width * 0.5 + (this.facingRight ? 18 : -18);
            const originY = this.y - this.height * 0.62;
            ctx.strokeStyle = `rgba(124, 214, 255, ${0.35 + pulse * 0.25})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(originX, originY, 12 + pulse * 4, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    takeDamage(amount, hitX, hitY) {
        this.hp -= amount;
        this.hurtTimer = CONFIG.hurtTime;
        this.hitFlash = 8;

        spawnHitBurst(hitX !== undefined ? hitX : this.x + this.width * 0.5, hitY !== undefined ? hitY : this.y - this.height * 0.52);

        if (this.hp <= 0) {
            this.active = false;
            spawnHitBurst(this.x + this.width * 0.5, this.y - this.height * 0.6, 'rgba(255, 229, 166, 0.95)', 1.2);
            addCameraShake(4.2, 7);
        }
    }

    getRect() {
        return {
            x: this.x,
            y: this.y - this.height,
            width: this.width,
            height: this.height
        };
    }
}

function drawJinguBang(ctx, x, y, angle, energy) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    const half = 56;
    const coreHeight = 9;

    if (energy > 0.04) {
        ctx.globalCompositeOperation = 'lighter';
        const glowAlpha = clamp(energy, 0, 1) * 0.72;
        const glow = ctx.createLinearGradient(-half - 16, 0, half + 16, 0);
        glow.addColorStop(0, `rgba(255, 211, 132, ${glowAlpha * 0.0})`);
        glow.addColorStop(0.32, `rgba(255, 183, 92, ${glowAlpha * 0.65})`);
        glow.addColorStop(0.68, `rgba(255, 183, 92, ${glowAlpha * 0.65})`);
        glow.addColorStop(1, `rgba(255, 211, 132, ${glowAlpha * 0.0})`);
        ctx.fillStyle = glow;
        fillRoundedRect(ctx, -half - 16, -12, half * 2 + 32, 24, 12);
        ctx.globalCompositeOperation = 'source-over';
    }

    const rod = ctx.createLinearGradient(-half, -4, half, 4);
    rod.addColorStop(0, '#2d1d11');
    rod.addColorStop(0.18, '#6f4e2b');
    rod.addColorStop(0.5, '#1f160f');
    rod.addColorStop(0.82, '#6f4e2b');
    rod.addColorStop(1, '#2d1d11');
    ctx.fillStyle = rod;
    fillRoundedRect(ctx, -half, -coreHeight * 0.5, half * 2, coreHeight, 4);

    const ringColor = ctx.createLinearGradient(0, -6, 0, 6);
    ringColor.addColorStop(0, '#f8d995');
    ringColor.addColorStop(1, '#b9802c');

    ctx.fillStyle = ringColor;
    fillRoundedRect(ctx, -half + 4, -7, 10, 14, 3);
    fillRoundedRect(ctx, half - 14, -7, 10, 14, 3);

    ctx.strokeStyle = 'rgba(255, 224, 164, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-half + 18, -2);
    ctx.lineTo(half - 18, -2);
    ctx.moveTo(-half + 18, 2);
    ctx.lineTo(half - 18, 2);
    ctx.stroke();

    ctx.fillStyle = '#d49f50';
    ctx.beginPath();
    ctx.arc(-half, 0, 6, 0, Math.PI * 2);
    ctx.arc(half, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

const player = {
    x: 100,
    y: CONFIG.groundY,
    width: 68,
    height: 112,
    vx: 0,
    vy: 0,
    hp: CONFIG.playerMaxHp,
    isGrounded: true,
    facingRight: true,
    state: 'idle',
    frameTimer: 0,
    animationFrame: 0,
    attackCooldown: 0,
    hurtTimer: 0,
    runCycle: 0,
    readyPulse: 0,
    attackWindup: 0,
    attackWindupMax: 6,
    attackSwing: 0,
    attackSwingMax: 12,
    attackPattern: 'overhead',

    update() {
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.hurtTimer > 0) this.hurtTimer--;

        if (this.attackWindup > 0) {
            this.attackWindup--;
            if (this.attackWindup === 0) {
                this.shoot();
            }
        }

        if (this.attackSwing > 0) {
            this.attackSwing--;
        }

        if (keys.Space && this.attackCooldown === 0 && this.attackWindup === 0) {
            this.beginAttack();
        }

        if (keys.ArrowRight) {
            this.vx = CONFIG.moveSpeed;
            this.facingRight = true;
            if (this.isGrounded && this.attackWindup === 0) this.state = 'run';
        } else if (keys.ArrowLeft) {
            this.vx = -CONFIG.moveSpeed;
            this.facingRight = false;
            if (this.isGrounded && this.attackWindup === 0) this.state = 'run';
        } else {
            this.vx = 0;
            if (this.isGrounded && this.attackWindup === 0 && this.attackSwing === 0) this.state = 'idle';
        }

        if (this.attackWindup > 0) {
            this.vx *= 0.34;
        }

        if (keys.ArrowUp && this.isGrounded) {
            this.vy = CONFIG.jumpForce;
            this.isGrounded = false;
            this.state = 'jump';
        }

        this.x += this.vx;
        this.y += this.vy;
        this.vy += CONFIG.gravity;

        if (this.x < 0) this.x = 0;
        if (this.x > CONFIG.width - this.width) this.x = CONFIG.width - this.width;

        if (this.y >= CONFIG.groundY) {
            this.y = CONFIG.groundY;
            this.vy = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
            this.state = this.vy < 0 ? 'jump' : 'fall';
        }

        if (this.attackWindup > 0 || this.attackSwing > 0) {
            this.state = 'attack';
        }

        if (this.state === 'run') {
            this.frameTimer++;
            if (this.frameTimer > CONFIG.animationSpeed) {
                this.frameTimer = 0;
                this.animationFrame = this.animationFrame === 0 ? 1 : 0;
            }
        }

        const speedScale = Math.abs(this.vx) / Math.max(1, CONFIG.moveSpeed);
        this.runCycle += 0.08 + speedScale * 0.32;
        this.readyPulse += 0.1;
    },

    beginAttack() {
        this.attackCooldown = CONFIG.playerAttackCooldown;
        this.attackWindup = this.attackWindupMax;
        this.attackSwing = this.attackSwingMax;
        this.state = 'attack';
        this.attackPattern = this.facingRight ? 'overhead' : 'sweep';

        const dir = this.facingRight ? 1 : -1;
        const chargeX = this.x + this.width * 0.5 + dir * 22;
        const chargeY = this.y - 72;

        spawnAttackCharge(chargeX, chargeY, dir);
        addCameraShake(1.4, 3);
    },

    shoot() {
        const dir = this.facingRight ? 1 : -1;
        const pattern = this.attackPattern || (dir > 0 ? 'overhead' : 'sweep');
        const isOverhead = pattern === 'overhead';
        const shotX = this.x + this.width * 0.5 + dir * 28;
        const shotY = this.y - (isOverhead ? 88 : 74);

        bullets.push(new Bullet(shotX - 13, shotY - 7, dir));

        if (isOverhead) {
            spawnSlash(shotX + dir * 4, shotY - 10, dir, {
                radius: 56,
                spread: 0.56,
                lineWidth: 24,
                color: 'rgba(255, 172, 82, 0.96)',
                life: 14
            });

            spawnRing(shotX + dir * 8, shotY - 8, {
                radius: 10,
                growth: 3.6,
                width: 2.8,
                color: 'rgba(255, 224, 158, 0.95)',
                fill: 'rgba(255, 150, 68, 0.2)',
                life: 15
            });

            for (let i = 0; i < 12; i++) {
                spawnParticle(shotX + dir * rand(-2, 9), shotY + rand(-8, 6), {
                    vx: rand(1.6, 4.8) * dir,
                    vy: rand(-0.3, 2.4),
                    life: rand(10, 20),
                    size: rand(2.0, 3.8),
                    color: 'rgba(255, 191, 96, 0.95)',
                    gravity: 0.03,
                    damp: 0.93,
                    glow: 0.44
                });
            }
        } else {
            spawnSlash(shotX + dir * 10, shotY + 10, dir, {
                radius: 82,
                spread: 1.18,
                lineWidth: 20,
                color: 'rgba(128, 221, 255, 0.95)',
                life: 13
            });

            spawnRing(shotX + dir * 14, shotY + 8, {
                radius: 8,
                growth: 3.4,
                width: 2.6,
                color: 'rgba(192, 238, 255, 0.94)',
                fill: 'rgba(96, 182, 255, 0.2)',
                life: 14
            });

            for (let i = 0; i < 12; i++) {
                spawnParticle(shotX + dir * rand(-4, 10), shotY + rand(-5, 5), {
                    vx: rand(2.3, 6.2) * dir,
                    vy: rand(-1.4, 1.2),
                    life: rand(10, 20),
                    size: rand(1.8, 3.5),
                    color: 'rgba(148, 226, 255, 0.92)',
                    gravity: 0.02,
                    damp: 0.93,
                    glow: 0.42
                });
            }
        }

        addCameraShake(2.4, 5);
    },

    takeDamage(amount) {
        if (this.hurtTimer === 0) {
            this.hp -= amount;
            this.hurtTimer = CONFIG.hurtTime * 2;

            spawnHitBurst(this.x + this.width * 0.5, this.y - this.height * 0.6, 'rgba(255, 98, 92, 0.95)', 1.1);
            addCameraShake(3.4, 7);
        }
    },

    draw(ctx) {
        const blinking = this.hurtTimer > 0 && Math.floor(fx.worldTime / 2) % 2 === 0;

        const runAmount = this.isGrounded ? clamp(Math.abs(this.vx) / Math.max(1, CONFIG.moveSpeed), 0, 1) : 0.22;
        const step = Math.sin(this.runCycle);
        const bob = this.isGrounded ? Math.sin(this.runCycle * 2) * 2.5 * runAmount : (this.vy < 0 ? -6 : 3);
        const lean = clamp(this.vx * 0.035, -0.22, 0.22);

        const windupT = this.attackWindup > 0 ? 1 - this.attackWindup / this.attackWindupMax : 0;
        const swingT = this.attackSwing > 0 ? this.attackSwing / this.attackSwingMax : 0;

        if (drawPlayerBlackMythWukong(ctx, this, { lean, step, bob, windupT, swingT })) {
            if (blinking) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.fillStyle = 'rgba(255, 126, 102, 0.2)';
                fillRoundedRect(ctx, this.x - 6, this.y - 126, this.width + 12, 116, 12);
                ctx.restore();
            }

            if (this.attackCooldown > 0) {
                const cdRatio = this.attackCooldown / CONFIG.playerAttackCooldown;
                const arcEnd = -Math.PI / 2 + Math.PI * 2 * (1 - cdRatio);
                const ringX = this.x + this.width * 0.5;
                const ringY = this.y - 104;
                ctx.save();
                ctx.strokeStyle = 'rgba(103, 184, 255, 0.86)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ringX, ringY, 16, -Math.PI / 2, arcEnd);
                ctx.stroke();
                ctx.restore();
            }
            return;
        }

        let staffAngle = -0.25 + step * 0.24 * runAmount;
        if (!this.isGrounded) {
            staffAngle = this.vy < 0 ? -0.62 : 0.12;
        }
        if (this.attackWindup > 0) {
            staffAngle = -1.22 + windupT * 0.46;
        }
        if (this.attackSwing > 0) {
            staffAngle = 1.08 - swingT * 1.76;
        }

        const backArmAngle = -0.45 + step * 0.18 * runAmount - windupT * 0.2 + swingT * 0.18;
        const frontArmAngle = 0.35 - step * 0.16 * runAmount - windupT * 0.4 + swingT * 0.75;

        const anchorX = this.x + this.width * 0.5;
        const anchorY = this.y + bob;

        ctx.save();
        ctx.translate(anchorX, anchorY);

        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        if (this.attackWindup > 0) {
            const guideAlpha = 0.35 + windupT * 0.45;
            ctx.strokeStyle = `rgba(255, 212, 126, ${guideAlpha})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 8]);
            ctx.beginPath();
            ctx.moveTo(18, -68);
            ctx.lineTo(150, -68);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = `rgba(255, 184, 81, ${0.12 + windupT * 0.18})`;
            ctx.beginPath();
            ctx.arc(150, -68, 16 + windupT * 6, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 25 + runAmount * 6, 9 + runAmount * 2, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.attackCooldown === 0 && this.attackWindup === 0) {
            const pulse = 0.6 + Math.sin(this.readyPulse) * 0.4;
            ctx.strokeStyle = `rgba(255, 210, 118, ${0.25 + pulse * 0.28})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -100, 14 + pulse * 3, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.lineCap = 'round';
        ctx.strokeStyle = '#8d4a27';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-13, -50);
        ctx.bezierCurveTo(-36, -58 - step * 3, -28, -82 - step * 4, -3, -89 + step * 5);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(250, 193, 96, 0.48)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-10, -53);
        ctx.bezierCurveTo(-28, -58 - step * 2, -21, -80 - step * 3, -1, -85 + step * 4);
        ctx.stroke();

        const stride = step * 8 * runAmount;

        ctx.save();
        ctx.translate(-10 + stride * 0.35, -5);
        ctx.rotate(-0.2 + step * 0.18 * runAmount);
        ctx.fillStyle = '#6a3a24';
        fillRoundedRect(ctx, -6, -34, 12, 34, 4);
        ctx.fillStyle = '#cf452f';
        fillRoundedRect(ctx, -7, -16, 14, 12, 4);
        ctx.restore();

        ctx.save();
        ctx.translate(11 - stride * 0.35, -5);
        ctx.rotate(0.17 - step * 0.18 * runAmount);
        ctx.fillStyle = '#6a3a24';
        fillRoundedRect(ctx, -6, -34, 12, 34, 4);
        ctx.fillStyle = '#cf452f';
        fillRoundedRect(ctx, -7, -16, 14, 12, 4);
        ctx.restore();

        ctx.save();
        ctx.translate(-4, -73);
        ctx.rotate(-0.24 + step * 0.08 * runAmount);
        ctx.fillStyle = '#af2f2c';
        ctx.beginPath();
        ctx.moveTo(-3, 2);
        ctx.quadraticCurveTo(-33, -2 - runAmount * 4, -30, -24 - runAmount * 5);
        ctx.quadraticCurveTo(-7, -17 - runAmount * 2, 5, -10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, -58);
        ctx.rotate(lean + (this.attackWindup > 0 ? -0.12 : 0));
        ctx.fillStyle = '#7a4429';
        ctx.beginPath();
        ctx.ellipse(0, 4, 20, 27, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d74532';
        fillRoundedRect(ctx, -14, -6, 28, 24, 8);

        ctx.fillStyle = '#efc378';
        fillRoundedRect(ctx, -9, 0, 18, 8, 3);

        ctx.fillStyle = '#2b3959';
        fillRoundedRect(ctx, -11, 8, 22, 7, 3);
        ctx.restore();

        ctx.save();
        ctx.translate(-10, -64);
        ctx.rotate(backArmAngle);
        ctx.fillStyle = '#6f3d24';
        fillRoundedRect(ctx, -4, 0, 8, 31, 4);
        ctx.fillStyle = '#f0d0a2';
        ctx.beginPath();
        ctx.arc(0, 29, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        drawJinguBang(ctx, 14, -67, staffAngle, Math.max(windupT, swingT * 1.2));

        ctx.save();
        ctx.translate(12, -63);
        ctx.rotate(frontArmAngle);
        ctx.fillStyle = '#744025';
        fillRoundedRect(ctx, -4, 0, 8, 31, 4);
        ctx.fillStyle = '#f3d6ab';
        ctx.beginPath();
        ctx.arc(0, 29, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(0, -95 + step * 0.4 * runAmount);
        ctx.rotate(lean * 0.35);

        ctx.fillStyle = '#6d3a22';
        ctx.beginPath();
        ctx.ellipse(0, 0, 19, 19, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f5d7af';
        ctx.beginPath();
        ctx.ellipse(0, 2, 13, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#6d3a22';
        ctx.beginPath();
        ctx.ellipse(-16, -1, 4, 6, -0.3, 0, Math.PI * 2);
        ctx.ellipse(16, -1, 4, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#d7462f';
        ctx.beginPath();
        ctx.moveTo(-8, -15);
        ctx.lineTo(0, -31);
        ctx.lineTo(8, -15);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f2c06d';
        fillRoundedRect(ctx, -9, -18, 18, 5, 2);

        ctx.fillStyle = '#2b1a10';
        ctx.beginPath();
        ctx.ellipse(-5, 1, 2.2, 2.6, 0, 0, Math.PI * 2);
        ctx.ellipse(5, 1, 2.2, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#7d3020';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(-1, -5);
        ctx.moveTo(1, -5);
        ctx.lineTo(9, -2);
        ctx.stroke();

        ctx.fillStyle = '#b2412b';
        ctx.beginPath();
        ctx.ellipse(0, 8, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (blinking) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255, 126, 102, 0.24)';
            fillRoundedRect(ctx, -26, -118, 52, 112, 14);
            ctx.globalCompositeOperation = 'source-over';
        }

        if (this.attackCooldown > 0) {
            const cdRatio = this.attackCooldown / CONFIG.playerAttackCooldown;
            const arcEnd = -Math.PI / 2 + Math.PI * 2 * (1 - cdRatio);
            ctx.strokeStyle = 'rgba(103, 184, 255, 0.86)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, -102, 14, -Math.PI / 2, arcEnd);
            ctx.stroke();
        }

        ctx.restore();
    },

    getRect() {
        return {
            x: this.x,
            y: this.y - this.height,
            width: this.width,
            height: this.height
        };
    }
};

function drawUI(ctx) {
    const hpPercent = clamp(player.hp / CONFIG.playerMaxHp, 0, 1);
    const cooldownRatio = clamp(player.attackCooldown / CONFIG.playerAttackCooldown, 0, 1);

    ctx.save();

    const panelX = 18;
    const panelY = 14;
    const panelW = 338;
    const panelH = 116;

    const panelGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
    panelGradient.addColorStop(0, 'rgba(9, 16, 30, 0.82)');
    panelGradient.addColorStop(1, 'rgba(5, 10, 20, 0.66)');
    ctx.fillStyle = panelGradient;
    fillRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);

    ctx.strokeStyle = 'rgba(255, 224, 167, 0.38)';
    ctx.lineWidth = 1;
    strokeRoundedRect(ctx, panelX, panelY, panelW, panelH, 12);

    ctx.font = '600 18px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#f6e4c8';
    ctx.fillText('齐天大圣', panelX + 16, panelY + 28);

    ctx.font = '14px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#b8c9e2';
    ctx.fillText('战场态势', panelX + 16, panelY + 48);

    if (images.wukong_sheet) {
        const portraitFace = player.hurtTimer > 0 ? WUKONG_ATLAS.faces.angry : WUKONG_ATLAS.faces.neutral;
        drawAtlasSlice(
            ctx,
            images.wukong_sheet,
            portraitFace,
            panelX + panelW - 106,
            panelY + 12,
            44,
            44,
            0.96,
            { cutout: true, mode: 'face' }
        );
    }

    const hpX = panelX + 16;
    const hpY = panelY + 60;
    const hpW = 220;
    const hpH = 16;

    ctx.fillStyle = 'rgba(22, 31, 45, 0.9)';
    fillRoundedRect(ctx, hpX, hpY, hpW, hpH, 8);

    const hpGrad = ctx.createLinearGradient(hpX, hpY, hpX + hpW, hpY);
    hpGrad.addColorStop(0, '#ff7c5f');
    hpGrad.addColorStop(1, '#db2635');
    ctx.fillStyle = hpGrad;
    fillRoundedRect(ctx, hpX, hpY, hpW * hpPercent, hpH, 8);

    ctx.fillStyle = '#fff2de';
    ctx.font = 'bold 13px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(`HP ${player.hp} / ${CONFIG.playerMaxHp}`, hpX + 8, hpY + 12);

    ctx.font = '13px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#d2e0f4';
    ctx.fillText(`敌人数量: ${monsters.length}`, hpX, hpY + 34);

    const statusText = player.attackCooldown > 0
        ? `技能冷却 ${Math.max(0, player.attackCooldown / 60).toFixed(1)}s`
        : '技能已就绪';
    ctx.fillText(statusText, hpX + 108, hpY + 34);

    const skillX = panelX + panelW - 56;
    const skillY = panelY + 58;
    const skillRadius = 26;

    const orbGrad = ctx.createRadialGradient(skillX, skillY, 2, skillX, skillY, skillRadius);
    orbGrad.addColorStop(0, 'rgba(33, 48, 82, 0.95)');
    orbGrad.addColorStop(1, 'rgba(9, 14, 30, 0.96)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(skillX, skillY, skillRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 221, 160, 0.64)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(skillX, skillY, skillRadius, 0, Math.PI * 2);
    ctx.stroke();

    if (images.wukong_sheet) {
        const skillRect = cooldownRatio > 0 ? WUKONG_ATLAS.skills[0] : WUKONG_ATLAS.skills[2];
        drawAtlasSlice(
            ctx,
            images.wukong_sheet,
            skillRect,
            skillX - 21,
            skillY - 18,
            42,
            36,
            0.95
        );
    } else {
        ctx.save();
        ctx.translate(skillX, skillY);
        ctx.rotate(-0.35);
        ctx.fillStyle = '#f3c878';
        fillRoundedRect(ctx, -13, -3, 26, 6, 3);
        ctx.fillStyle = '#d7994a';
        fillRoundedRect(ctx, -13, -4, 4, 8, 2);
        fillRoundedRect(ctx, 9, -4, 4, 8, 2);
        ctx.restore();
    }

    if (cooldownRatio > 0) {
        ctx.strokeStyle = 'rgba(99, 184, 255, 0.88)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(skillX, skillY, skillRadius + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - cooldownRatio));
        ctx.stroke();
    } else {
        const pulse = 0.42 + Math.sin(fx.worldTime * 0.1) * 0.23;
        ctx.strokeStyle = `rgba(255, 206, 112, ${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(skillX, skillY, skillRadius + 6 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
    }

    ctx.fillStyle = '#f7e4c5';
    ctx.font = '600 12px "Noto Sans SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE', skillX, panelY + panelH - 8);
    ctx.textAlign = 'left';

    if (player.hp <= CONFIG.playerMaxHp * 0.3) {
        const warningPulse = 0.34 + Math.sin(fx.worldTime * 0.24) * 0.22;
        ctx.fillStyle = `rgba(255, 72, 64, ${warningPulse})`;
        fillRoundedRect(ctx, CONFIG.width * 0.5 - 108, 18, 216, 28, 8);
        ctx.fillStyle = '#fff2ee';
        ctx.font = 'bold 16px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('危险: 血量过低', CONFIG.width * 0.5, 38);
        ctx.textAlign = 'left';
    }

    ctx.restore();

    if (player.hp <= 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

        ctx.textAlign = 'center';
        ctx.fillStyle = '#f5e9d0';
        ctx.font = 'bold 58px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('战斗失败', CONFIG.width / 2, CONFIG.height / 2 - 10);

        ctx.font = '22px "Noto Sans SC", "Microsoft YaHei", sans-serif';
        ctx.fillStyle = '#d9c7a6';
        ctx.fillText('按 R 重新挑战', CONFIG.width / 2, CONFIG.height / 2 + 42);
        ctx.textAlign = 'left';
    }
}

function init() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    initFx();

    window.addEventListener('keydown', e => {
        if (Object.prototype.hasOwnProperty.call(keys, e.code)) keys[e.code] = true;

        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
        }

        if (e.code === 'KeyR' && player.hp <= 0) {
            resetGame();
        }
    });

    window.addEventListener('keyup', e => {
        if (Object.prototype.hasOwnProperty.call(keys, e.code)) keys[e.code] = false;
    });

    for (const [key, src] of Object.entries(assets)) {
        const img = new Image();
        img.src = src;

        const checkStart = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages && !gameStarted) {
                gameStarted = true;
                resetGame();
                startGame(ctx);
            }
        };

        img.onload = checkStart;
        img.onerror = () => {
            console.error(`Failed to load image: ${key}`);
            checkStart();
        };

        images[key] = img;
    }
}

function resetGame() {
    player.x = 100;
    player.y = CONFIG.groundY;
    player.vx = 0;
    player.vy = 0;
    player.hp = CONFIG.playerMaxHp;
    player.hurtTimer = 0;
    player.attackCooldown = 0;
    player.attackWindup = 0;
    player.attackSwing = 0;
    player.attackPattern = 'overhead';

    bullets = [];
    stones = [];
    monsters = [];

    fx.particles = [];
    fx.rings = [];
    fx.slashes = [];
    fx.shakeTime = 0;
    fx.shakePower = 0;

    monsters.push(new Monster('melee', 800));
    monsters.push(new Monster('ranged', 1000));
}

function startGame(ctx) {
    function loop() {
        ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

        updateEffects();

        if (player.hp > 0) {
            player.update();

            bullets.forEach(b => b.update());
            bullets = bullets.filter(b => b.active);

            stones.forEach(s => s.update());
            stones = stones.filter(s => s.active);

            monsters.forEach(m => {
                m.update(player);

                bullets.forEach(b => {
                    if (!b.active) return;
                    if (checkCollision(b.getRect(), m.getRect())) {
                        b.active = false;
                        m.takeDamage(1, b.x + b.width * 0.5, b.y + b.height * 0.5);
                    }
                });
            });

            monsters = monsters.filter(m => m.active);

            stones.forEach(s => {
                if (s.active && checkCollision(s.getRect(), player.getRect())) {
                    s.active = false;
                    player.takeDamage(1);
                    spawnHitBurst(s.x + s.width * 0.5, s.y + s.height * 0.5, 'rgba(122, 208, 255, 0.94)', 0.85);
                }
            });

            if (monsters.length === 0) {
                if (Math.random() > 0.5) {
                    monsters.push(new Monster('melee', CONFIG.width));
                } else {
                    monsters.push(new Monster('ranged', CONFIG.width));
                }
            }
        }

        ctx.save();
        ctx.translate(fx.shakeX, fx.shakeY);

        drawBackground(ctx);

        monsters.forEach(m => m.draw(ctx));
        bullets.forEach(b => b.draw(ctx));
        stones.forEach(s => s.draw(ctx));
        player.draw(ctx);

        drawForegroundAtmosphere(ctx);
        drawEffects(ctx);

        ctx.restore();

        drawUI(ctx);

        requestAnimationFrame(loop);
    }

    loop();
}

init();
