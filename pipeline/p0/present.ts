import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ARTIFACT_RELATIVE_PATH, reviewStatus, type ConformanceStatus, type EvaluationStatus } from "./contracts";
import { argValue, pathFromRoot, readJson } from "./lib";

const artifact = argValue("--artifact", ARTIFACT_RELATIVE_PATH);
const artifactPath = pathFromRoot(artifact);
const conformance = readJson<{ status: ConformanceStatus }>(`${artifactPath}/conformance.json`);
const evaluation = readJson<{ status: EvaluationStatus; knownFailureIds: string[]; stills: Array<{ still: string; mouthCrop: string; localFrame: number; globalFrame: number }> }>(`${artifactPath}/evaluation.json`);
const status = reviewStatus(conformance.status, evaluation.status, evaluation.knownFailureIds);
const htmlPath = `${artifactPath}/review/index.html`;
mkdirSync(dirname(htmlPath), { recursive: true });
const state = JSON.stringify({ status, conformance: conformance.status, evaluation: evaluation.status, knownFailureIds: evaluation.knownFailureIds });
const cards = evaluation.stills.map((item) => `<figure><img src="../${item.still}" alt="local ${item.localFrame}, global ${item.globalFrame}"><figcaption>local ${item.localFrame} / global ${item.globalFrame}</figcaption><img src="../${item.mouthCrop}" alt="mouth crop local ${item.localFrame}"></figure>`).join("\n");
writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><title>P0 review</title>
<style>body{font-family:system-ui;margin:2rem}.status{padding:.5rem;font-weight:700}.review-ready{background:#d9f7df}.invalid{background:#ffd9d9}.not-evaluated{background:#fff2b8}.known-failure{background:#ffd8ad}figure{display:inline-grid;width:320px;margin:8px}img{max-width:100%}video{max-width:540px;display:block}</style>
<h1>P0 evidence review</h1><p id="state" class="status"></p><p>Conformance is contract verification only; it is not a quality approval or a representation decision.</p>
<video id="baseline" controls src="../baseline.mp4"></video><button id="normal">Normal speed</button><button id="quarter">25% speed</button>
<section>${cards}</section><script>const state=${state};const label=document.querySelector('#state');label.textContent=state.status+' — conformance='+state.conformance+', evaluation='+state.evaluation;label.classList.add(state.status);const video=document.querySelector('#baseline');document.querySelector('#normal').onclick=()=>video.playbackRate=1;document.querySelector('#quarter').onclick=()=>video.playbackRate=0.25;</script>`);
console.log(JSON.stringify({ status, html: htmlPath }, null, 2));
