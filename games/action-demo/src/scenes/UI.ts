import { Scene } from 'phaser';
import { Game } from './Game';

export class UI extends Scene {
    private fpsText!: Phaser.GameObjects.Text;
    private skillABar!: Phaser.GameObjects.Graphics;
    private skillBBar!: Phaser.GameObjects.Graphics;

    constructor() {
        super('UI');
    }

    create() {
        this.fpsText = this.add.text(10, 30, 'FPS: 0', { font: '14px Courier', color: '#00ff00' });

        this.add.text(10, 500, 'Skill A (U):', { font: '14px Courier', color: '#ffffff' });
        this.skillABar = this.add.graphics();
        this.skillABar.setPosition(10, 520);

        this.add.text(100, 500, 'Skill B (I):', { font: '14px Courier', color: '#ffffff' });
        this.skillBBar = this.add.graphics();
        this.skillBBar.setPosition(100, 520);
    }

    update() {
        this.fpsText.setText(`FPS: ${Math.floor(this.game.loop.actualFps)}`);

        const gameScene = this.scene.get('Game') as Game;
        if (gameScene && gameScene.player) {
            // Use gameScene.time.now for accuracy relative to player
            const gameTime = gameScene.time.now;
            
            const pctA = gameScene.player.getSkillAStatus(gameTime);
            const pctB = gameScene.player.getSkillBStatus(gameTime);

            this.drawBar(this.skillABar, pctA);
            this.drawBar(this.skillBBar, pctB);
        }
    }

    private drawBar(graphics: Phaser.GameObjects.Graphics, pct: number) {
        graphics.clear();
        
        // Background
        graphics.fillStyle(0x333333);
        graphics.fillRect(0, 0, 50, 10);

        // Fill
        if (pct >= 1) {
            graphics.fillStyle(0x00ff00);
        } else {
            graphics.fillStyle(0xffff00);
        }
        graphics.fillRect(0, 0, 50 * pct, 10);
    }
}