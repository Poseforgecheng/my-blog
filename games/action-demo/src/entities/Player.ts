import Phaser, { Scene, Physics } from 'phaser';
import { StateMachine } from '../utils/StateMachine';

export class Player extends Physics.Arcade.Sprite {
    private keys: any;
    private stateMachine: StateMachine;
    private config: any;
    public attackHitbox: Physics.Arcade.Sprite;
    
    private isAttacking: boolean = false;
    private isDashing: boolean = false;
    
    // Combo
    private attackStep: number = 0;
    private nextAttackQueued: boolean = false;

    // Cooldowns
    private lastSkillATime: number = 0;
    private lastSkillBTime: number = 0;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.config = scene.cache.json.get('playerData');

        // Physics Setup
        this.setGravityY(this.config.gravity);
        this.setOrigin(0.5, 1);

        // Input - WASD + J/K/U/I
        if (scene.input.keyboard) {
            this.keys = scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D,
                jump: Phaser.Input.Keyboard.KeyCodes.W,
                attack: Phaser.Input.Keyboard.KeyCodes.J,
                dash: Phaser.Input.Keyboard.KeyCodes.K,
                skillA: Phaser.Input.Keyboard.KeyCodes.U,
                skillB: Phaser.Input.Keyboard.KeyCodes.I
            });
        }

        // Hitbox
        this.attackHitbox = scene.physics.add.sprite(x, y, 'pixel');
        this.attackHitbox.setVisible(false);
        this.attackHitbox.setSize(40, 40);
        this.attackHitbox.setOrigin(0.5, 0.5);
        (this.attackHitbox.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
        this.attackHitbox.setActive(false);

        // FSM Setup
        this.stateMachine = new StateMachine(this);
        
        this.stateMachine.addState('idle', { onEnter: this.onIdleEnter, onUpdate: this.onIdleUpdate });
        this.stateMachine.addState('run', { onEnter: this.onRunEnter, onUpdate: this.onRunUpdate });
        this.stateMachine.addState('jump', { onEnter: this.onJumpEnter, onUpdate: this.onJumpUpdate });
        this.stateMachine.addState('fall', { onEnter: this.onFallEnter, onUpdate: this.onFallUpdate });
        this.stateMachine.addState('crouch', { onEnter: this.onCrouchEnter, onUpdate: this.onCrouchUpdate, onExit: this.onCrouchExit });
        this.stateMachine.addState('dash', { onEnter: this.onDashEnter, onUpdate: this.onDashUpdate });
        this.stateMachine.addState('attack', { onEnter: this.onAttackEnter, onUpdate: this.onAttackUpdate, onExit: this.onAttackExit });
        this.stateMachine.addState('skill_a', { onEnter: this.onSkillAEnter, onUpdate: this.onSkillAUpdate, onExit: this.onSkillAExit });
        this.stateMachine.addState('skill_b', { onEnter: this.onSkillBEnter, onUpdate: this.onSkillBUpdate, onExit: this.onSkillBExit });

        this.stateMachine.setState('idle');
    }

    update(_time: number, delta: number) {
        this.stateMachine.update(delta);
        
        // Update Hitbox (Default behavior, skills might override position)
        if (this.attackHitbox.active && !this.stateMachine.getCurrentState()?.toString().includes('skill')) {
            const offset = this.flipX ? -30 : 30;
            this.attackHitbox.setPosition(this.x + offset, this.y - 24);
        }

        if (this.isAttacking) { /*noop*/ }
    }

    // --- IDLE ---
    private onIdleEnter() { this.setVelocityX(0); }
    private onIdleUpdate() {
        if (this.keys.down.isDown) {
            this.stateMachine.setState('crouch');
            return;
        }
        this.checkMovement();
        this.checkActions();
    }

    // --- RUN ---
    private onRunEnter() { }
    private onRunUpdate() {
        if (this.keys.down.isDown) {
            this.stateMachine.setState('crouch');
            return;
        }

        const speed = this.config.movementSpeed;
        if (this.keys.left.isDown) {
            this.setVelocityX(-speed);
            this.setFlipX(true);
        } else if (this.keys.right.isDown) {
            this.setVelocityX(speed);
            this.setFlipX(false);
        } else {
            this.stateMachine.setState('idle');
        }
        this.checkJump();
        this.checkActions();
    }

    // --- CROUCH ---
    private onCrouchEnter() {
        this.setVelocityX(0);
        this.setScale(1, 0.6); 
        this.setOrigin(0.5, 1); 
    }

    private onCrouchUpdate() {
        if (!this.keys.down.isDown) {
            this.stateMachine.setState('idle');
        }
        if (this.keys.jump.isDown) this.stateMachine.setState('jump');
    }

    private onCrouchExit() {
        this.setScale(1, 1); 
    }

    // --- JUMP ---
    private onJumpEnter() { this.setVelocityY(-this.config.jumpForce); }
    private onJumpUpdate() {
        if (this.body!.velocity.y > 0) this.stateMachine.setState('fall');
        this.airControl();
        this.checkActions();
    }

    // --- FALL ---
    private onFallEnter() { }
    private onFallUpdate() {
        if (this.body?.blocked.down) this.stateMachine.setState('idle');
        this.airControl();
        this.checkActions();
    }

    private airControl() {
        const speed = this.config.movementSpeed;
        if (this.keys.left.isDown) this.setVelocityX(-speed);
        else if (this.keys.right.isDown) this.setVelocityX(speed);
    }

    private checkMovement() {
        if (this.keys.left.isDown || this.keys.right.isDown) this.stateMachine.setState('run');
        this.checkJump();
    }

    private checkJump() {
        if (this.keys.jump.isDown && this.body?.blocked.down) this.stateMachine.setState('jump');
        else if (!this.body?.blocked.down) this.stateMachine.setState('fall');
    }

    private checkActions() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) this.stateMachine.setState('attack');
        else if (Phaser.Input.Keyboard.JustDown(this.keys.dash) && this.canDash()) this.stateMachine.setState('dash');
        else if (Phaser.Input.Keyboard.JustDown(this.keys.skillA) && this.canUseSkillA()) this.stateMachine.setState('skill_a');
        else if (Phaser.Input.Keyboard.JustDown(this.keys.skillB) && this.canUseSkillB()) this.stateMachine.setState('skill_b');
    }

    // --- DASH ---
    private canDash() { return !this.isDashing; }
    private onDashEnter() {
        this.isDashing = true;
        const dir = this.flipX ? -1 : 1;
        this.setVelocityX(dir * this.config.dashSpeed);
        this.setVelocityY(0);
        this.scene.time.delayedCall(this.config.dashDuration, () => {
             this.stateMachine.setState('idle');
             this.isDashing = false; 
        });
    }
    private onDashUpdate() { }

    // --- ATTACK (Combo) ---
    private onAttackEnter() {
        this.isAttacking = true;
        this.setVelocityX(0);
        this.setTexture('player_attack'); 
        
        // Tween
        const lungeDist = this.flipX ? -10 : 10;
        this.scene.tweens.add({
            targets: this,
            x: this.x + lungeDist,
            duration: 100,
            yoyo: true,
            ease: 'Power1'
        });

        // Afterimage
        this.scene.time.addEvent({
            delay: 40,
            repeat: 2,
            callback: () => this.createAfterImage()
        });
        
        // Combo Logic
        if (this.attackStep === 0 || this.attackStep >= 3) {
            this.attackStep = 1;
        } else {
            this.attackStep++;
        }
        this.nextAttackQueued = false;

        // Hitbox
        this.attackHitbox.setActive(true);
        this.attackHitbox.setVisible(true);
        this.attackHitbox.setSize(40 + (this.attackStep * 10), 40); 

        console.log(`Attack Combo: ${this.attackStep}`);

        this.scene.time.delayedCall(300, () => {
            if (this.nextAttackQueued && this.attackStep < 3) {
                this.stateMachine.setState('attack');
            } else {
                this.attackStep = 0; 
                this.stateMachine.setState('idle');
            }
        });
    }

    private createAfterImage() {
        const ghost = this.scene.add.sprite(this.x, this.y, this.texture.key);
        ghost.setOrigin(0.5, 1);
        ghost.setFlipX(this.flipX);
        ghost.setScale(this.scaleX, this.scaleY);
        ghost.setTint(0xFFD700); 
        ghost.setAlpha(0.5); 
        ghost.setDepth(this.depth - 1); 

        this.scene.tweens.add({
            targets: ghost,
            alpha: 0,
            scaleX: this.scaleX * 1.1, 
            scaleY: this.scaleY * 1.1,
            duration: 300,
            onComplete: () => ghost.destroy()
        });
    }

    private onAttackUpdate() {
        if (Phaser.Input.Keyboard.JustDown(this.keys.attack)) {
            this.nextAttackQueued = true;
        }
    }

    private onAttackExit() {
        this.isAttacking = false;
        this.setTexture('player');
        this.attackHitbox.setActive(false);
        this.attackHitbox.setVisible(false);
    }

    // --- SKILL A (Giant Staff Smash) ---
    private canUseSkillA() {
        return this.scene.time.now - this.lastSkillATime > this.config.skillACooldown;
    }

    private onSkillAEnter() {
        this.lastSkillATime = this.scene.time.now;
        this.setVelocityX(0);
        this.isAttacking = true;
        this.setTexture('player_attack');

        // Create Giant Staff
        const staff = this.scene.add.sprite(this.x, this.y - 30, 'staff_giant');
        staff.setOrigin(0.5, 1); // Pivot at bottom
        staff.setScale(2); // Make it BIG
        
        // Initial Angle: Tilted back
        const startAngle = this.flipX ? 45 : -45;
        const endAngle = this.flipX ? -110 : 110;
        staff.setAngle(startAngle);
        
        // Tween: Smash Down
        this.scene.tweens.add({
            targets: staff,
            angle: endAngle,
            duration: 300,
            ease: 'Back.easeIn', // Heavy impact feel
            onComplete: () => {
                this.scene.cameras.main.shake(100, 0.01); // Screen shake
                this.scene.tweens.add({
                    targets: staff,
                    alpha: 0,
                    duration: 200,
                    onComplete: () => staff.destroy()
                });
            }
        });

        // Giant Hitbox
        this.attackHitbox.setActive(true);
        this.attackHitbox.setVisible(true);
        this.attackHitbox.setSize(150, 150);
        // Position hitbox in front
        const offset = this.flipX ? -80 : 80;
        this.attackHitbox.setPosition(this.x + offset, this.y - 50);
        
        console.log("Skill A: Giant Smash");
        this.scene.time.delayedCall(600, () => {
            this.stateMachine.setState('idle');
        });
    }

    private onSkillAUpdate() { }
    private onSkillAExit() {
        this.isAttacking = false;
        this.setTexture('player');
        this.attackHitbox.setActive(false);
        this.attackHitbox.setVisible(false);
    }

    // --- SKILL B (Clone Whirlwind) ---
    private canUseSkillB() {
        return this.scene.time.now - this.lastSkillBTime > this.config.skillBCooldown;
    }

    private onSkillBEnter() {
        this.lastSkillBTime = this.scene.time.now;
        this.setVelocityX(0);
        this.isAttacking = true;
        
        // Create Clones
        const clones: Phaser.GameObjects.Sprite[] = [];
        const offsets = [-60, 60];
        
        offsets.forEach(off => {
            const clone = this.scene.add.sprite(this.x + off, this.y, 'player_attack');
            clone.setOrigin(0.5, 1);
            clone.setAlpha(0.7);
            clone.setTint(0xFFD700); // Gold phantom
            clones.push(clone);
        });

        // Spin Player + Clones
        const spinners = [this, ...clones];
        
        this.scene.tweens.add({
            targets: spinners,
            angle: 720, // 2 full spins
            duration: 1000,
            ease: 'Linear',
            onComplete: () => {
                // Reset player angle
                this.setAngle(0);
                // Destroy clones
                clones.forEach(c => c.destroy());
                this.stateMachine.setState('idle');
            }
        });

        // Wide AOE Hitbox
        this.attackHitbox.setActive(true);
        this.attackHitbox.setVisible(true);
        this.attackHitbox.setSize(200, 60);
        this.attackHitbox.setPosition(this.x, this.y - 30);

        console.log("Skill B: Whirlwind");
    }

    private onSkillBUpdate() { 
        // Sync hitbox to player in case of physics drift (though velocity is 0)
        this.attackHitbox.setPosition(this.x, this.y - 30);
    }
    
    private onSkillBExit() {
        this.isAttacking = false;
        this.setAngle(0); // Ensure reset
        this.attackHitbox.setActive(false);
        this.attackHitbox.setVisible(false);
    }
    
    // --- SKILL GETTERS ---
    public getSkillAStatus(time: number) {
        if (this.lastSkillATime === 0) return 1;
        const elapsed = time - this.lastSkillATime;
        return Math.min(1, elapsed / this.config.skillACooldown);
    }

    public getSkillBStatus(time: number) {
        if (this.lastSkillBTime === 0) return 1;
        const elapsed = time - this.lastSkillBTime;
        return Math.min(1, elapsed / this.config.skillBCooldown);
    }
}