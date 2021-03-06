import helpers from "../helpers";
import { BattleEntity, BattleStats } from "./BattleEntity";
import overworld from "./PlayerStates/overworld";
import battle from "./PlayerStates/battle";
import { MainScene } from "../scenes/MainScene";

export interface PlayerInfo {
    following?: Player;
    isCom: boolean;
    key: string;
    partyIdx: number;
}

export class Player extends Phaser.GameObjects.Sprite implements BattleEntity {
    shadow: Phaser.GameObjects.Sprite;
    boostFlame: Phaser.GameObjects.Sprite;
    container: Phaser.GameObjects.Container;
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    targetAngle: number;
    flying: boolean;
    followMove: boolean;
    isCasting: boolean;
    dead: boolean = false;

    public mainScene: MainScene;

    get aangle(): number { return this.container.angle; }
    set aangle(v: number) { this.container.angle = v; }
    get ax(): number { return this.container.x; }
    set ax(v: number) { this.container.x = v; }
    get ay(): number { return this.container.y; }
    set ay(v: number) { this.container.y = v; }
    isFriendly: boolean = true;
    formationXOffset: number;
    formationYOffset: number;
    stats: BattleStats = new BattleStats();

    constructor(scene: MainScene, public info: PlayerInfo) {
        super(scene, 0, 0, info.key, 0);
        scene.anims.create({
            key: "hover_flame",
            frames: scene.anims.generateFrameNumbers("hover_flame", { start: 0, end: 40, }),
            frameRate: 60,
            repeat: -1
        });
        this.scene = <Phaser.Scene>scene;
        this.mainScene = scene;

        this.shadow = scene.add.sprite(0, 0, "shadow");

        this.container = scene.add.container(300, 300);

        this.container.depth = 100 - this.info.partyIdx;

        if (this.info.partyIdx == 0) {
            this.formationXOffset = 0;
            this.formationYOffset = 0;
            this.stats.apRate = 0.003;
        }

        if (this.info.partyIdx == 1) {
            this.formationXOffset = -80;
            this.formationYOffset = 20;
            this.stats.apRate = 0.007;
        }

        if (this.info.partyIdx == 2) {
            this.formationXOffset = 80;
            this.formationYOffset = 20;
            this.stats.apRate = 0.002;
        }

        scene.add.existing(this);

        this.boostFlame = scene.add.sprite(0, 0, "hover_flame");
        this.boostFlame.anims.play("hover_flame");

        this.container.add([
            this,
            this.boostFlame,
        ]);

        if (!this.info.isCom) {
            this.up = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
            this.down = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
            this.left = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
            this.right = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
        }
    }

    get distToFollow(): number {
        return helpers.dist(this.container, this.info.following.container);
    }

    preUpdate(t: number, delta: number) {
        super.preUpdate(t, delta)

        this.shadow.x = this.container.x;
        this.shadow.y = this.container.y;

        this.boostFlame.x = this.x + 2;
        this.boostFlame.y = this.y + 24;

        if (!this.stats.inBattle) {
            overworld.preUpdate(this);
        } else {
            battle.preUpdate(this);
        }

        this.container.angle = helpers.lerp(this.container.angle, this.targetAngle*20, 0.15);
        if (Math.abs(this.container.angle) < 3 && this.targetAngle == 0) this.container.angle = 0;

        this.boostFlame.alpha =  0;
        
        if (this.isCasting) {
            this.x = helpers.lerp(
                this.x,
                Math.sin(this.scene.time.now*0.03)*10,
                0.15
            );
            this.y = helpers.lerp(this.y, 0, 0.15);
        } else {
            this.x = helpers.lerp(this.x, 0, 0.15);
            this.y = helpers.lerp(
                this.y,
                this.flying ?
                    -10 + Math.sin((this.scene.time.now + this.info.partyIdx*300)*(this.stats.inBattle ? 0.004 : 0.01))*5
                    :
                    0,
            0.15);
        }
    }

    hit(): void {
        this.scene.cameras.main.shake(250, 0.01);
    }

    casting(): void {
        this.setTexture(this.texture.key, 1);
        this.isCasting = true;
    }

    reset(): void {
        this.setTexture(this.texture.key, 0);
        this.isCasting = false;
    }

    die() {
        if (this.dead) return;
        this.dead = true;

        this.setTexture(this.texture.key, 2);

        this.scene.add.tween({
            targets: this,
            alpha: 0,
            duration: 1000,
            ease: "Power2.easeInOut"
        });
    }
}