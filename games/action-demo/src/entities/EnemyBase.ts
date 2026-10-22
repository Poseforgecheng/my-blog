import { Scene, Physics } from 'phaser';
import { StateMachine } from '../utils/StateMachine';
import { Player } from './Player';

export abstract class EnemyBase extends Physics.Arcade.Sprite {
    protected stateMachine: StateMachine;
    protected config: any;
    protected hp: number;
    protected target: Player | null = null;
    protected isDead: boolean = false;

    constructor(scene: Scene, x: number, y: number, texture: string, type: string) {
        super(scene, x, y, texture);
        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setGravityY(800);

        const allConfig = scene.cache.json.get('enemyData');
        this.config = allConfig[type];
        this.hp = this.config.hp;

        this.stateMachine = new StateMachine(this);
    }

    setTarget(player: Player) {
        this.target = player;
    }

    update(_time: number, delta: number) {
        if (this.isDead) return;
        this.stateMachine.update(delta);
    }

    takeDamage(amount: number, knockbackX: number) {
        if (this.isDead) return;

        this.hp -= amount;
        this.setVelocityX(knockbackX);
        this.setVelocityY(-200);
        this.setTint(0xff0000);
        
        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) this.clearTint();
        });

        if (this.hp <= 0) {
            this.die();
        }
    }

    protected die() {
        this.isDead = true;
        this.setTint(0x555555);
        this.setVelocity(0, 0);
        (this.body as Phaser.Physics.Arcade.Body).checkCollision.none = true;
        
        this.scene.time.delayedCall(1000, () => {
            this.destroy();
        });
    }
}
