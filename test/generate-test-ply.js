// Generates a synthetic INRIA V1 style binary little-endian PLY whose splats
// carry full degree-3 spherical harmonics with deliberately large, distinctive
// degree-3 coefficients, so a viewer that ignores degree 3 produces visibly
// different (greyish) colors while a degree-3-aware one follows the reference.
//
// The layout matches the uncompressed GaussianSplats3D INRIA V1 expectation:
//   x y z, nx ny nz, f_dc_0..2, opacity, scale_0..2, rot_0..3, f_rest_0..44
// all as float32, preceded by an ASCII header.

import fs from 'fs';
import path from 'path';
import * as THREE from 'three';

const SPLAT_COUNT = 256;
const SH_C0 = 0.28209479177387814;

function buildHeader(splatCount) {
    const props = [
        'x', 'y', 'z', 'nx', 'ny', 'nz',
        'f_dc_0', 'f_dc_1', 'f_dc_2',
        'opacity',
        'scale_0', 'scale_1', 'scale_2',
        'rot_0', 'rot_1', 'rot_2', 'rot_3'
    ];
    for (let i = 0; i < 45; i++) props.push(`f_rest_${i}`);
    const lines = ['ply', 'format binary_little_endian 1.0', `element vertex ${splatCount}`];
    for (const p of props) lines.push(`property float ${p}`);
    lines.push('end_header');
    const headerText = lines.join('\n') + '\n';
    return { headerText, props };
}

// Deterministic pseudo-random in [0,1), no Math.random dependency.
function makeRng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

export function generateDegree3Ply(outPath, seed = 12345) {
    const { headerText } = buildHeader(SPLAT_COUNT);
    const headerBytes = Buffer.from(headerText, 'ascii');
    const floatsPerSplat = 3 + 3 + 3 + 1 + 3 + 4 + 45; // 62
    const body = Buffer.alloc(SPLAT_COUNT * floatsPerSplat * 4);
    const rng = makeRng(seed);
    const tmp = new THREE.Quaternion();

    let cursor = 0;
    const writef = (v) => { body.writeFloatLE(v, cursor); cursor += 4; };

    for (let i = 0; i < SPLAT_COUNT; i++) {
        // Position: small cluster around origin, spread across axes.
        const x = (rng() - 0.5) * 2;
        const y = (rng() - 0.5) * 2;
        const z = (rng() - 0.5) * 2;
        writef(x); writef(y); writef(z);
        // normals (unused by parser, but present in the format)
        writef(0); writef(0); writef(0);

        // Base diffuse color: mid-grey so SH terms dominate the angular variation.
        const baseColor = 0.5;
        const fdc = (baseColor - 0.5) / SH_C0;
        writef(fdc); writef(fdc); writef(fdc);

        // High opacity.
        writef(2.0);

        // Log scales ~ small fixed size.
        writef(Math.log(0.02)); writef(Math.log(0.02)); writef(Math.log(0.02));

        // Unit quaternion (identity-ish, normalized by the parser anyway).
        tmp.set(rng() - 0.5, rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
        writef(tmp.x); writef(tmp.y); writef(tmp.z); writef(tmp.w);

        // f_rest_0..44: degree-1 and degree-2 kept modest, degree-3 made large.
        // f_rest ordering in the PLY is per-band then RGB, matching the parser's
        // sphericalHarmonicsDegree{1,2,3}Fields mapping.
        for (let k = 0; k < 45; k++) {
            let value;
            if (k < 24) {
                // degrees 1 and 2: small coefficients
                value = (rng() - 0.5) * 0.4;
            } else {
                // degree 3: large, structured coefficients distinct per index
                const bandIndex = k - 24; // 0..21
                value = Math.sin((bandIndex + 1) * 1.7 + i * 0.37) * 1.2 +
                        (rng() - 0.5) * 0.3;
            }
            writef(value);
        }
    }

    fs.writeFileSync(outPath, Buffer.concat([headerBytes, body]));
    return { outPath, splatCount: SPLAT_COUNT, floatsPerSplat };
}

// CLI entry: node test/generate-test-ply.js <output path> [seed]
if (import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
    const out = process.argv[2] || 'test/data/degree3-scene.ply';
    const seed = process.argv[3] ? parseInt(process.argv[3]) : 12345;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const info = generateDegree3Ply(out, seed);
    console.log('Wrote', info.outPath, 'with', info.splatCount, 'splats');
}
