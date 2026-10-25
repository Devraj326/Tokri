export function flyToCart(fromEl: HTMLElement, color = '#F2B705') {
  const cartEl = document.getElementById('cart-nav-link');
  if (!cartEl) return;

  const from = fromEl.getBoundingClientRect();
  const to = cartEl.getBoundingClientRect();

  const dot = document.createElement('div');
  dot.style.position = 'fixed';
  dot.style.left = `${from.left + from.width / 2 - 8}px`;
  dot.style.top = `${from.top + from.height / 2 - 8}px`;
  dot.style.width = '16px';
  dot.style.height = '16px';
  dot.style.borderRadius = '9999px';
  dot.style.background = color;
  dot.style.border = '2px solid #1B1A17';
  dot.style.zIndex = '9999';
  dot.style.pointerEvents = 'none';
  document.body.appendChild(dot);

  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height / 2 - (from.top + from.height / 2);
  const arcLift = -140;

  const anim = dot.animate(
    [
      { transform: 'translate(0px, 0px) scale(1)', opacity: 1 },
      { transform: `translate(${dx * 0.5}px, ${dy * 0.5 + arcLift}px) scale(0.8)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 },
    ],
    { duration: 650, easing: 'cubic-bezier(.3,.6,.4,1)' },
  );
  anim.onfinish = () => dot.remove();
}
