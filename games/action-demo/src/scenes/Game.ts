import { Scene } from 'phaser';
import { Player } from '../entities/Player';
import { MeleeEnemy } from '../entities/MeleeEnemy';
import { EnemyBase } from '../entities/EnemyBase';

export class Game extends Scene {
    public player!: Player;
    private enemies!: Phaser.GameObjects.Group;

    constructor() {
        super('Game');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x0c0f1f);

        const map = this.make.tilemap({ key: 'level1', tileWidth: 32, tileHeight: 32 });
        const tileset = map.addTilesetImage('tiles', 'tiles', 32, 32);
        if (!tileset) {
            throw new Error('Tileset not found: tiles');
        }
        const groundLayer = map.createLayer(0, tileset, 0, 0);
        if (!groundLayer) {
            throw new Error('Failed to create tile layer');
        }
        groundLayer.setCollision([1, 2]);

        const bg = this.add.image(0, 0, 'background').setOrigin(0, 0);
        bg.setDisplaySize(map.widthInPixels, map.heightInPixels);
        bg.setScrollFactor(0.2);
        bg.setDepth(-10);

        this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

        this.add.text(16, 16, 'Monkey King: WASD + J/K/U/I', { font: '16px Courier', color: '#FFD700' }).setScrollFactor(0);

        // Create Player
        this.player = new Player(this, 100, 450);

        // Create Enemies
        this.enemies = this.add.group();
        const melee = new MeleeEnemy(this, 600, 450);
        melee.setTarget(this.player);
        this.enemies.add(melee);

        // Colliders
        this.physics.add.collider(this.player, groundLayer);
        this.physics.add.collider(this.enemies, groundLayer);

        // Overlap: Player Attack vs Enemy
        this.physics.add.overlap(this.player.attackHitbox, this.enemies, (_hitbox, enemy) => {
            if (this.player.attackHitbox.active) {
                const e = enemy as EnemyBase;
                const dir = this.player.flipX ? -1 : 1;
                e.takeDamage(10, dir * 200);
            }
        });

        // Camera follow
        this.cameras.main.startFollow(this.player);
        this.cameras.main.setZoom(1.5);

        // Launch UI Scene
        this.scene.launch('UI');
    }

    update(time: number, delta: number) {
        if (this.player) {
            this.player.update(time, delta);
        }
    }
}
