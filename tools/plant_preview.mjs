// Renders every plant at every growth stage into one HTML contact sheet.
//   node tools/plant_preview.mjs [outFile] [filter]
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const root = resolve(import.meta.dirname, '..');
const out = process.argv[2] ?? join(root, 'reference', 'plant-preview.html');
const filter = (process.argv[3] ?? '').toLowerCase();
const big = process.argv[4] === 'big';
const build = join(tmpdir(), 'wird-plant-build');
rmSync(build, { recursive: true, force: true });
mkdirSync(build, { recursive: true });
execSync(`npx tsc ${['kit', 'heads', 'leaves', 'stems', 'trees', 'misc', 'svg', 'species'].map((f) => `src/plants/art/${f}.ts`).join(' ')} --outDir "${build}" --module commonjs --target es2020 --skipLibCheck --ignoreConfig --moduleResolution node10 --ignoreDeprecations 6.0 --types node --strict false --noEmitOnError false`, { cwd: root, stdio: 'inherit' });
writeFileSync(join(build, 'package.json'), '{"type":"commonjs"}');
const require = createRequire(join(build, 'x.js'));
const { Ctx } = require('./kit.js');
const { toSvg } = require('./svg.js');
const { SPECIES, drawPlant } = require('./species.js');

const only = process.argv[5] ? process.argv[5].split(',').map(Number) : null;
const stages = only ?? [1, 2, 3, 4, 5, 6, 7, 8];
const zoomed = only && only.length === 2;
const grid = only && only.length === 1;
let html = `<!doctype html><meta charset="utf-8"><title>Plant preview</title><body class="${big ? 'big' : ''} ${zoomed ? 'zoom' : ''} ${grid ? 'grid' : ''}"><style>
body{margin:0;background:#cfe3c0;font:13px system-ui;color:#222}
.row{display:flex;align-items:flex-end;gap:0;padding:6px 10px;border-bottom:1px solid #0001;background:linear-gradient(#dcebc9,#c4dcae)}
.name{width:110px;font-weight:600;align-self:center}
.cell{flex:1;text-align:center}
.big .row{flex-wrap:wrap}.big .name{width:100%;padding:4px}.big .cell{flex:0 0 25%}.zoom{display:flex;flex-wrap:wrap}.zoom .row{flex:0 0 50%;box-sizing:border-box;flex-wrap:wrap}.zoom .name{width:100%;padding:2px 4px}.zoom .cell{flex:0 0 50%}
.grid{display:flex;flex-wrap:wrap}.grid .row{display:block;flex:0 0 20%;box-sizing:border-box;border:0;padding:2px 4px;background:none}.grid .name{width:auto;font-size:11px;text-align:center}.grid .cell small{display:none}.cell svg{width:100%;height:auto;display:block}
.cell small{opacity:.5;font-size:10px}
</style>`;
SPECIES.forEach((sp, i) => {
  if (filter && !filter.split(',').some((f) => sp.name.toLowerCase().includes(f))) return;
  html += `<div class="row">${grid ? '' : `<div class="name">${i + 1}. ${sp.name}</div>`}`;
  for (const st of stages) {
    const cx = new Ctx();
    const els = drawPlant(cx, i, st);
    html += `<div class="cell">${toSvg(els, cx)}<small>${st}</small></div>`;
    if (grid) html += `<div class="name">${i + 1}. ${sp.name}</div>`;
  }
  html += '</div>';
});
mkdirSync(resolve(out, '..'), { recursive: true });
writeFileSync(out, html);
console.log('wrote', out, SPECIES.length, 'plants');
