import { memo } from 'react';
import { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import { Ctx, type El, type Grad } from './kit';
import { drawPlant } from './species';

type Rendered = { defs: Grad[]; els: El[] };
const cache = new Map<string, Rendered>();

function build(index: number, stage: number): Rendered {
  const k = `${index}:${stage}`;
  let r = cache.get(k);
  if (!r) {
    const cx = new Ctx();
    const els = drawPlant(cx, index, stage);
    r = { defs: [...cx.defs.values()], els };
    cache.set(k, r);
  }
  return r;
}

function node(e: El, key: number) {
  const props: any = { ...e.a };
  if (e.m) props.transform = e.m;
  if (e.t === 'g') return <G key={key} {...props}>{(e.c ?? []).map(node)}</G>;
  if (e.t === 'path') return <Path key={key} {...props} />;
  if (e.t === 'ellipse') return <Ellipse key={key} {...props} />;
  return <Circle key={key} {...props} />;
}

function grad(g: Grad) {
  const stops = g.stops.map((s, i) => <Stop key={i} offset={s.o} stopColor={s.c} stopOpacity={s.op ?? 1} />);
  if (g.kind === 'lin') {
    return <LinearGradient key={g.id} id={g.id} x1={g.g[0]} y1={g.g[1]} x2={g.g[2]} y2={g.g[3]} gradientUnits="objectBoundingBox">{stops}</LinearGradient>;
  }
  return <RadialGradient key={g.id} id={g.id} cx={g.g[0]} cy={g.g[1]} fx={g.g[0]} fy={g.g[1]} rx={g.g[2]} ry={g.g[2]} gradientUnits="objectBoundingBox">{stops}</RadialGradient>;
}

/** One plant (index 0..59) at growth stage 0..8, base at (0,0) — react-native-svg children, no <Svg> wrapper. */
function PlantSvg({ index, stage }: { index: number; stage: number }) {
  const r = build(index, Math.max(0, Math.min(8, Math.round(stage))));
  return (
    <>
      <Defs>{r.defs.map(grad)}</Defs>
      {r.els.map(node)}
    </>
  );
}
export default memo(PlantSvg);
