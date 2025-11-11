import { Game } from './game.ts';
import './styles.css';

window.addEventListener('load', () => {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) return;
  const game = new Game(canvas);
  game.start();
  const ui = document.getElementById('ui')!;

  const panel = document.createElement('div');
  panel.style.cssText = [
    'pointer-events:auto',
    'position:absolute',
    'left:50%','top:50%','transform:translate(-50%,-50%)',
    'background:#111',
    'color:#f5f5f5',
    'padding:18px 20px',
    'border:0',
    'min-width:280px',
    'image-rendering:pixelated',
    'font-family: monospace'
  ].join(';');
  const frame = document.createElement('div');
  frame.style.cssText = [
    'position:relative',
    'background:#1a1a1a',
    'padding:16px',
    'box-shadow: inset 0 0 0 2px #2a2a2a, inset 0 0 0 4px #0a0a0a, 0 0 0 2px #444'
  ].join(';');
  panel.appendChild(frame);

  const title = document.createElement('h2');
  title.textContent = 'Flight Run';
  title.style.margin = '0 0 8px';
  title.style.fontSize = '24px';
  frame.appendChild(title);

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Select difficulty to begin';
  subtitle.style.margin = '0 0 16px';
  subtitle.style.opacity = '0.85';
  frame.appendChild(subtitle);

  const buttonsWrap = document.createElement('div');
  buttonsWrap.style.display = 'flex';
  buttonsWrap.style.gap = '10px';
  frame.appendChild(buttonsWrap);

  const difficulties: Array<{label:string,value:'easy'|'normal'|'hard',hint:string}> = [
    { label: 'Easy', value: 'easy', hint: 'Slower start, gentle ramp' },
    { label: 'Normal', value: 'normal', hint: 'Balanced pacing' },
    { label: 'Hard', value: 'hard', hint: 'Fast start, rapid ramp' }
  ];

  difficulties.forEach(d => {
    const btn = document.createElement('button');
    btn.textContent = d.label;
    btn.style.cssText = [
      'flex:1',
      'padding:8px 10px',
      'background:#222',
      'color:#fafafa',
      'border:0',
      'box-shadow: inset 0 0 0 2px #3a3a3a, inset 0 0 0 4px #0d0d0d, 0 0 0 2px #555',
      'cursor:pointer',
      'font-family: monospace',
      'font-size:14px',
      'image-rendering:pixelated'
    ].join(';');
    btn.addEventListener('mouseenter', () => btn.style.boxShadow = 'inset 0 0 0 2px #4a4a4a, inset 0 0 0 4px #151515, 0 0 0 2px #777');
    btn.addEventListener('mouseleave', () => btn.style.boxShadow = 'inset 0 0 0 2px #3a3a3a, inset 0 0 0 4px #0d0d0d, 0 0 0 2px #555');
    btn.addEventListener('click', () => {
      game.setDifficulty(d.value);
      game.restart();
      panel.remove();
      restartBtn.style.display = 'block';
    });
    buttonsWrap.appendChild(btn);
  });

  const hints = document.createElement('ul');
  hints.style.margin = '14px 0 0';
  hints.style.padding = '0 0 0 18px';
  hints.style.fontSize = '12px';
  hints.style.opacity = '0.75';
  difficulties.forEach(d => { const li = document.createElement('li'); li.textContent = d.hint; hints.appendChild(li); });
  frame.appendChild(hints);

  ui.appendChild(panel);

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'Restart';
  restartBtn.style.cssText = 'pointer-events:auto;position:absolute;top:16px;right:16px;padding:8px 12px;font-size:14px;background:#222;color:#fff;border:1px solid #444;border-radius:6px;cursor:pointer;display:none';
  restartBtn.addEventListener('mouseenter', () => restartBtn.style.background = '#333');
  restartBtn.addEventListener('mouseleave', () => restartBtn.style.background = '#222');
  restartBtn.addEventListener('click', () => game.restart());
  ui.appendChild(restartBtn);
});

