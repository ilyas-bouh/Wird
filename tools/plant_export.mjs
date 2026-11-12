// Writes every plant at every growth step as a standalone SVG:  reference/plants-svg/<nn>-<name>/stage-<0..8>.svg
//   node tools/plant_export.mjs [outDir]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const out = process.argv[2] ?? join(root, 'reference', 'plants-svg');
const build = join(tmpdir(), 'wird-plant-build');
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
execSync(`npx tsc ${['kit', 'heads', 'leaves', 'stems', 'trees', 'misc', 'svg', 'species'].map((f) => `src/plants/art/${f}.ts`).join(' ')} --outDir "${build}" --module commonjs --target es2020 --skipLibCheck --ignoreConfig --moduleResolution node10 --ignoreDeprecations 6.0 --types node --strict false --noEmitOnError false`, { cwd: root, stdio: 'inherit' });
writeFileSync(join(build, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(join(build, 'x.js'));
const { Ctx } = require('./kit.js');
const { toSvg } = require('./svg.js');
const { SPECIES, drawPlant } = require('./species.js');

rmSync(out, { recursive: true, force: true });
SPECIES.forEach((sp, i) => {
  const dir = join(out, `${String(i + 1).padStart(2, '0')}-${sp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);
  mkdirSync(dir, { recursive: true });
  for (let st = 0; st <= 8; st++) {
    const cx = new Ctx();
    writeFileSync(join(dir, `stage-${st}.svg`), toSvg(drawPlant(cx, i, st), cx, 480));
  }
});
console.log('wrote', SPECIES.length * 9, 'svgs to', out);
