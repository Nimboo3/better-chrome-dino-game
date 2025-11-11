import { Game } from './game.ts';
import './styles.css';

// initialize when DOM ready
window.addEventListener('load', () => {
  const canvas = document.getElementById('game') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('Canvas #game not found');
    return;
  }
  const game = new Game(canvas);
  game.start();
  const ui = document.getElementById('ui')!;
  const btn = document.createElement('button');
  btn.textContent = 'Restart';
  btn.style = 'position: absolute; top: 16px; right: 16px; padding: 8px 12px; font-size: 14px;';
  btn.addEventListener('click', () => {
    // use the public API to restart the game
    game.restart();
  });
  ui.appendChild(btn);

});

