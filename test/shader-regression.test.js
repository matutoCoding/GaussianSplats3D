// Regression guard: the generated vertex shader source for max SH degree 0, 1
// and 2 must be byte-identical to the pre-change output. The degree-3 additions
// are gated behind maxSphericalHarmonicsDegree === 3 and new branches, so lower
// degrees must produce the exact same GLSL (and therefore identical pixels).
//
// We reconstruct the shader from the CURRENT SplatMaterial and compare against
// fixtures captured from the original library (git HEAD), which is built into
// build/reference-material.module.js by the test runner.

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function loadMaterial(modulePath) {
    const mod = await import(pathToFileURL(modulePath).href);
    return mod.SplatMaterial;
}

function main() {
    const currentPath = path.join(__dirname, '..', 'src', 'splatmesh', 'SplatMaterial.js');
    const referencePath = path.join(__dirname, 'reference', 'SplatMaterial.reference.js');
    if (!fs.existsSync(referencePath)) {
        console.log('SKIP: reference fixture missing (run test/capture-shader-reference.sh first)');
        return;
    }

    Promise.all([loadMaterial(currentPath), loadMaterial(referencePath)]).then(([current, reference]) => {
        let failures = 0;
        for (const degree of [0, 1, 2]) {
            for (const dynamicMode of [false, true]) {
                const cur = current.buildVertexShaderBase(dynamicMode, false, degree, '');
                const ref = reference.buildVertexShaderBase(dynamicMode, false, degree, '');
                const same = cur === ref;
                console.log(`  ${same ? 'PASS' : 'FAIL'}  degree ${degree} dynamicMode ${dynamicMode} shader ${same ? 'identical' : 'DIFFERS'}`);
                if (!same) failures++;
            }
        }
        console.log(failures === 0 ? '\nSHADER REGRESSION GUARD PASSED' : `\n${failures} SHADER(S) DIFFER`);
        process.exit(failures === 0 ? 0 : 1);
    });
}

main();
