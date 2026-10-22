import { Scene } from 'phaser';

export class Preloader extends Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        this.load.image('background', 'assets/bg.png');
        this.load.image('tiles', 'assets/tiles.png');
        // Load SVG with size override
        this.load.svg('player', 'assets/player.svg', { width: 64, height: 64 });
        this.load.svg('player_attack', 'assets/player_attack.svg', { width: 64, height: 64 });
        this.load.svg('staff_giant', 'assets/staff_giant.svg', { scale: 1 }); // Keep original aspect ratio
        this.load.image('enemy', 'assets/enemy.png');
        this.load.image('pixel', 'assets/pixel.png');
        this.load.tilemapCSV('level1', 'data/level-1.csv');
        this.load.json('playerData', 'data/player.json');
        this.load.json('enemyData', 'data/enemies.json');
    }

    create() {
        this.scene.start('Game');
    }
}
