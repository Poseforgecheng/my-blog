import { Scene } from 'phaser';
import { EnemyBase } from './EnemyBase';

export class MeleeEnemy extends EnemyBase {
    private lastAttackTime: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'enemy', 'melee');

        this.stateMachine.addState('idle', {
            onEnter: this.onIdleEnter,
            onUpdate: this.onIdleUpdate
        });
        this.stateMachine.addState('chase', {
            onEnter: this.onChaseEnter,
            onUpdate: this.onChaseUpdate
        });
        this.stateMachine.addState('attack', {
            onEnter: this.onAttackEnter,
            onUpdate: this.onAttackUpdate
        });

        this.stateMachine.setState('idle');
    }

    private onIdleEnter() {
        this.setVelocityX(0);
    }

    private onIdleUpdate() {
        if (!this.target) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
        
        if (dist < this.config.detectRange) {
            this.stateMachine.setState('chase');
        }
    }

    private onChaseEnter() { }

    private onChaseUpdate() {
        if (!this.target) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (dist > this.config.detectRange * 1.5) {
            this.stateMachine.setState('idle');
            return;
        }

        if (dist < this.config.attackRange) {
            if (this.scene.time.now - this.lastAttackTime > this.config.attackCooldown) {
                this.stateMachine.setState('attack');
            } else {
                this.setVelocityX(0); // Wait for cooldown
            }
            return;
        }

        // Move towards player
        const dir = this.target.x > this.x ? 1 : -1;
        this.setVelocityX(dir * this.config.speed);
        this.setFlipX(dir < 0);
    }

    private onAttackEnter() {
        this.setVelocityX(0);
        this.lastAttackTime = this.scene.time.now;
        
        // Attack logic (visual warning then hit)
        this.setTint(0xffaa00); // Warning color
        
        this.scene.time.delayedCall(500, () => {
            if (this.isDead) return;
            this.clearTint(); // Or reset to normal
            
            // Check hit
            const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target!.x, this.target!.y);
            if (dist < this.config.attackRange + 20) {
                // Deal damage to player (Need player.takeDamage)
                console.log("Player Hit!");
                // this.target.takeDamage(this.config.damage);
            }
            
            this.stateMachine.setState('idle');
        });
    }

    private onAttackUpdate() { }
}
