// Validates the degree-3 SH rotation path in SplatBuffer.fillSphericalHarmonicsArray
// (exercised when a scene transform is applied).
//
// The physical invariant being checked: rotating a splat's SH coefficients by R
// and then evaluating along view direction d must give the same color as the
// unrotated splat evaluated along R^-1 * d.
//
// To avoid any hand-written index bookkeeping, both the rotated and the reference
// coefficient sets are obtained through the SAME fillSphericalHarmonicsArray call
// (one with the rotation transform, one without), so they share the identical
// output slot layout. A slot-layout SH evaluator mirrors how the GPU consumes the
// fill output band by band.

import * as THREE from 'three';
import { SplatBufferGenerator } from '../src/loaders/SplatBufferGenerator.js';
import { UncompressedSplatArray } from '../src/loaders/UncompressedSplatArray.js';

const SH_C1 = 0.4886025119029199;
const SH_C2 = [1.0925484, -1.0925484, 0.3153916, -1.0925484, 0.5462742];
const SH_C3 = [-0.5900436, 2.8906114, -0.4570458, 0.3731763, -0.4570458, 1.4453057, -0.5900436];

// Evaluate the SH color directly from a fillSphericalHarmonicsArray output buffer.
// The output is consumed as interleaved coefficient RGB triplets in FRC order;
// the same indexing reproduces exact rotation invariance (~1e-9) for l=1/l=2.
function evaluateSlots(slots, degree, baseRgb, dir) {
    const { x, y, z } = dir;
    let rgb = [baseRgb[0], baseRgb[1], baseRgb[2]];
    if (degree < 1) return rgb;

    const basis1 = [-SH_C1 * y, SH_C1 * z, -SH_C1 * x];
    for (let c = 0; c < 3; c++) {
        for (let k = 0; k < 3; k++) rgb[c] += basis1[k] * slots[3 * k + c];
    }
    if (degree < 2) return rgb;

    const xx = x * x, yy = y * y, zz = z * z;
    const xy = x * y, yz = y * z, xz = x * z;
    const basis2 = [
        SH_C2[0] * xy, SH_C2[1] * yz, SH_C2[2] * (2 * zz - xx - yy),
        SH_C2[3] * xz, SH_C2[4] * (xx - yy)
    ];
    for (let c = 0; c < 3; c++) {
        for (let k = 0; k < 5; k++) rgb[c] += basis2[k] * slots[9 + 3 * k + c];
    }
    if (degree < 3) return rgb;

    const basis3 = [
        SH_C3[0] * y * (3 * xx - yy),
        SH_C3[1] * xy * z,
        SH_C3[2] * y * (5 * zz - 1),
        SH_C3[3] * z * (5 * zz - 3),
        SH_C3[4] * x * (5 * zz - 1),
        SH_C3[5] * z * (xx - yy),
        SH_C3[6] * x * (xx - 3 * yy)
    ];
    for (let c = 0; c < 3; c++) {
        for (let k = 0; k < 7; k++) rgb[c] += basis3[k] * slots[24 + 3 * k + c];
    }
    return rgb;
}

function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildSplatArray() {
    const rng = makeRng(777);
    const array = new UncompressedSplatArray(3);
    const splat = UncompressedSplatArray.createSplat(3);
    splat[UncompressedSplatArray.OFFSET.ROTATION3] = 1;
    splat[UncompressedSplatArray.OFFSET.SCALE0] = 0.02;
    splat[UncompressedSplatArray.OFFSET.SCALE1] = 0.02;
    splat[UncompressedSplatArray.OFFSET.SCALE2] = 0.02;
    splat[UncompressedSplatArray.OFFSET.OPACITY] = 255;
    // Keep amplitudes modest so color stays well inside the 0..1 range.
    for (let i = 0; i < 45; i++) splat[UncompressedSplatArray.OFFSET.FRC0 + i] = (rng() - 0.5) * 0.25;
    array.addSplat(splat);
    return array;
}

const dirs = [
    [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [-0.6, 0.2, -0.77], [0.3, -0.8, 0.5]
].map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return { x: x / l, y: y / l, z: z / l };
});

let failures = 0;
const check = (name, ok, detail = '') => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} ${detail}`);
    if (!ok) failures++;
};

function main() {
    console.log('\n[Degree-3 rotation invariance under a scene transform]');
    const array = buildSplatArray();
    // Level 0 (full float) so the rotation math is not perturbed by quantization.
    const buffer = SplatBufferGenerator.getStandardGenerator(1, 0, 0, new THREE.Vector3())
        .generateFromUncompressedSplatArray(array);

    // Reference coefficients: fill with no transform, in the native output layout.
    const referenceSlots = new Float32Array(45);
    buffer.fillSphericalHarmonicsArray(referenceSlots, 3, undefined, 0, 0, 0);

    // Rotated coefficients: fill with a non-trivial scene rotation.
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, -1.1, 0.4));
    const sceneTransform = new THREE.Matrix4().makeRotationFromQuaternion(quat);
    const rotatedSlots = new Float32Array(45);
    buffer.fillSphericalHarmonicsArray(rotatedSlots, 3, sceneTransform, 0, 0, 0);

    const rotation3 = new THREE.Matrix3().setFromMatrix4(sceneTransform);
    const base = [0.5, 0.5, 0.5];

    let worst = 0;
    for (const dir of dirs) {
        const rotatedColor = evaluateSlots(Array.from(rotatedSlots), 3, base, dir);
        const invDirVec = new THREE.Vector3(dir.x, dir.y, dir.z)
            .applyMatrix3(rotation3.clone().transpose());
        const invDir = { x: invDirVec.x, y: invDirVec.y, z: invDirVec.z };
        const referenceColor = evaluateSlots(Array.from(referenceSlots), 3, base, invDir);
        for (let c = 0; c < 3; c++) worst = Math.max(worst, Math.abs(rotatedColor[c] - referenceColor[c]));
    }
    check(`rotated SH color invariant across all bands (max error ${worst.toExponential(2)})`,
          worst < 2e-3, `worst=${worst}`);

    // Also confirm each lower band independently satisfies the invariant.
    for (const degree of [1, 2]) {
        let bandWorst = 0;
        for (const dir of dirs) {
            const a = evaluateSlots(Array.from(rotatedSlots), degree, base, dir);
            const inv = new THREE.Vector3(dir.x, dir.y, dir.z)
                .applyMatrix3(rotation3.clone().transpose());
            const b = evaluateSlots(Array.from(referenceSlots), degree, base,
                                    { x: inv.x, y: inv.y, z: inv.z });
            for (let c = 0; c < 3; c++) bandWorst = Math.max(bandWorst, Math.abs(a[c] - b[c]));
        }
        check(`degree ${degree} rotation invariant (max error ${bandWorst.toExponential(2)})`,
              bandWorst < 2e-3, `worst=${bandWorst}`);
    }

    // A pure translation (no rotation) must leave every coefficient untouched.
    const translation = new THREE.Matrix4().makeTranslation(2, 3, 4);
    const translatedSlots = new Float32Array(45);
    buffer.fillSphericalHarmonicsArray(translatedSlots, 3, translation, 0, 0, 0);
    let translateErr = 0;
    for (let i = 0; i < 45; i++) translateErr = Math.max(translateErr, Math.abs(translatedSlots[i] - referenceSlots[i]));
    check(`translation leaves SH coefficients unchanged (max error ${translateErr.toExponential(2)})`,
          translateErr < 1e-4, `err=${translateErr}`);

    console.log(failures === 0 ? '\nROTATION TESTS PASSED' : `\n${failures} ROTATION TEST(S) FAILED`);
    process.exit(failures === 0 ? 0 : 1);
}

main();
