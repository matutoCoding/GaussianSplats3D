// Validation for the numerical-integration SH rotation reference used at runtime
// by SplatBuffer.rotateSphericalHarmonics7:
//
//   1. The numerically integrated l=2 block matches the EXISTING hard-coded l=2
//      rotation block (rotateSphericalHarmonics5) to integration precision. This
//      proves the integration basis/convention is the renderer's own.
//   2. The l=1, l=2 and l=3 integrated blocks are orthogonal (R R^T = I), the
//      fundamental correctness property of any rotation matrix.
//
// The same integration algorithm (same basis polynomials, Fibonacci lattice,
// weight) is embedded in SplatBuffer.computeDegree3RotationBlock.

import * as THREE from 'three';
import { rotationMatrixForDegree } from './sh-rotation-reference.js';
import { hardCodedL2Block, l1BlockFromMatrix3 } from './hardcoded-l2.js';

const transpose = (a) => a[0].map((_, j) => a.map((row) => row[j]));
const matmul = (a, b) =>
    a.map((row, i) => row.map((_, j) => a[i].reduce((s, _, k) => s + a[i][k] * b[k][j], 0)));
const identityDeviation = (a) => {
    let d = 0;
    for (let i = 0; i < a.length; i++)
        for (let j = 0; j < a.length; j++) d = Math.max(d, Math.abs(a[i][j] - (i === j ? 1 : 0)));
    return d;
};
const maxElementDev = (a, b) => {
    let d = 0;
    for (let i = 0; i < a.length; i++) for (let j = 0; j < a[i].length; j++) d = Math.max(d, Math.abs(a[i][j] - b[i][j]));
    return d;
};
const matrix3FromQuaternion = (q) => {
    const m4 = new THREE.Matrix4().makeRotationFromQuaternion(q);
    return new THREE.Matrix3().setFromMatrix4(m4);
};
const matrix3ToRows = (m3) => [
    [m3.elements[0], m3.elements[3], m3.elements[6]],
    [m3.elements[1], m3.elements[4], m3.elements[7]],
    [m3.elements[2], m3.elements[5], m3.elements[8]]
];

const TRIALS = 40;
const SAMPLES = 30000;
let maxL2HardMatch = 0;
const orthDev = { 1: 0, 2: 0, 3: 0 };
const q = new THREE.Quaternion();
const e = new THREE.Euler();

for (let trial = 0; trial < TRIALS; trial++) {
    e.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
    q.setFromEuler(e);
    const m3 = matrix3FromQuaternion(q);
    const [tsh11, tsh12, tsh13] = l1BlockFromMatrix3(m3);
    const R = matrix3ToRows(m3);

    const integratedL2 = rotationMatrixForDegree(R, 2, SAMPLES);
    const hardL2 = hardCodedL2Block(tsh11, tsh12, tsh13);
    maxL2HardMatch = Math.max(maxL2HardMatch, maxElementDev(integratedL2, hardL2));

    for (const degree of [1, 2, 3]) {
        const block = rotationMatrixForDegree(R, degree, SAMPLES);
        orthDev[degree] = Math.max(orthDev[degree], identityDeviation(matmul(block, transpose(block))));
    }
}

console.log(`Numerical SH rotation integration (${TRIALS} random rotations, ${SAMPLES} sphere samples each)`);
console.log('  max |integrated l=2 - hard-coded l=2| :', maxL2HardMatch.toExponential(2));
console.log('  orthogonality  l=1 R R^T - I          :', orthDev[1].toExponential(2));
console.log('  orthogonality  l=2 R R^T - I          :', orthDev[2].toExponential(2));
console.log('  orthogonality  l=3 R R^T - I          :', orthDev[3].toExponential(2));

const ok = maxL2HardMatch < 1e-4 && orthDev[1] < 1e-4 && orthDev[2] < 1e-4 && orthDev[3] < 1e-4;
console.log(ok ? '\nSH ROTATION VALIDATION PASSED' : '\nSH ROTATION VALIDATION FAILED');
process.exit(ok ? 0 : 1);
