import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load assets needed for the preloader (e.g., progress bar, logo)
    }

    create() {
        this.scene.start('Preloader');
    }
}
