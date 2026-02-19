import { Camera } from '../map/Camera';
import { InputManager } from './InputManager';
import { CAMERA_PAN_SPEED, EDGE_PAN_MARGIN, ZOOM_SPEED } from '../constants';

export class CameraController {
  private lastMouseX = 0;
  private lastMouseY = 0;

  constructor(
    private camera: Camera,
    private input: InputManager,
  ) {
    this.lastMouseX = input.mouseX;
    this.lastMouseY = input.mouseY;
  }

  update(dt: number): void {
    const speed = CAMERA_PAN_SPEED * dt / this.camera.zoom;
    let dx = 0;
    let dy = 0;

    // Keyboard pan
    if (this.input.isKeyDown('w') || this.input.isKeyDown('arrowup')) dy -= speed;
    if (this.input.isKeyDown('s') || this.input.isKeyDown('arrowdown')) dy += speed;
    if (this.input.isKeyDown('a') || this.input.isKeyDown('arrowleft')) dx -= speed;
    if (this.input.isKeyDown('d') || this.input.isKeyDown('arrowright')) dx += speed;

    // Edge pan
    const mx = this.input.mouseX;
    const my = this.input.mouseY;
    if (mx < EDGE_PAN_MARGIN) dx -= speed * 0.7;
    if (mx > this.camera.screenWidth - EDGE_PAN_MARGIN) dx += speed * 0.7;
    if (my < EDGE_PAN_MARGIN) dy -= speed * 0.7;
    if (my > this.camera.screenHeight - EDGE_PAN_MARGIN) dy += speed * 0.7;

    // Middle mouse drag
    if (this.input.middleDown) {
      dx += (this.lastMouseX - mx) / this.camera.zoom;
      dy += (this.lastMouseY - my) / this.camera.zoom;
    }

    if (dx !== 0 || dy !== 0) {
      this.camera.pan(dx, dy);
    }

    // Scroll zoom
    const scroll = this.input.consumeScroll();
    if (scroll !== 0) {
      this.camera.zoomAt(scroll * ZOOM_SPEED, mx, my);
    }

    this.lastMouseX = mx;
    this.lastMouseY = my;
  }
}
