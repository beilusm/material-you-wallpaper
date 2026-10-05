/** Shared path commands keep Canvas and SVG geometry identical. */
export function polygonPath(points) {
  return points.map((p, i) => [i === 0 ? 'M' : 'L', p.x, p.y]).concat([['Z']]);
}

export function closedSplinePath(points, tension = 1) {
  if (points.length < 3) return [];
  const path = [['M', points[0].x, points[0].y]];
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    path.push(['C',
      p1.x + (p2.x - p0.x) * tension / 6,
      p1.y + (p2.y - p0.y) * tension / 6,
      p2.x - (p3.x - p1.x) * tension / 6,
      p2.y - (p3.y - p1.y) * tension / 6,
      p2.x, p2.y]);
  }
  path.push(['Z']);
  return path;
}

export function tracePath(ctx, path) {
  ctx.beginPath();
  for (const [command, ...args] of path) {
    if (command === 'M') ctx.moveTo(...args);
    else if (command === 'L') ctx.lineTo(...args);
    else if (command === 'C') ctx.bezierCurveTo(...args);
    else if (command === 'Z') ctx.closePath();
  }
}

export function pathToSVG(path) {
  return path.map(([command, ...args]) => command + args.map(n => Number(n.toFixed(4))).join(' ')).join(' ');
}
