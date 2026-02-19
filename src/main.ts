import { Game } from './Game';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const game = new Game(canvas);
game.start();

// Expose for debugging
(window as any).game = game;
