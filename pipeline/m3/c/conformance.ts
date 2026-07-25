import { C_ASSET_SPACE, C_NATIVE_ASSET, LAYER_IDS, NATIVE_ASSET_INPUTS, layerById, type Layer } from "./asset";
import { REST_CONTROLS, apertureArea, controls, evaluate, visibleArea } from "./deform";

/**
 * M3-04 acceptance check. It verifies that the Base C asset is native, that its
 * observables are expressible through C's own controls, and that the oral
 * interior is occluded structurally. It renders nothing and ranks nothing.
 */
export function validateCNativeAsset(asset: readonly Layer[] = C_NATIVE_ASSET): string[] {
  const errors: string[] = [];

  if (NATIVE_ASSET_INPUTS.length > 0) errors.push("Base C must consume no external asset input");
  if (/\.png|staticFile|assets\/cutout|patch-config|bone|armature|viseme/i.test(JSON.stringify(asset))) {
    errors.push("Base C must not reference a shared completed PNG, shared topology, or shared bones");
  }

  const ids = asset.map((layer) => layer.id);
  if (new Set(ids).size !== LAYER_IDS.length || LAYER_IDS.some((id) => !ids.includes(id))) errors.push("layer set must match the declared C layer ids exactly");
  const orders = asset.map((layer) => layer.drawOrder);
  if (new Set(orders).size !== orders.length) errors.push("draw order must be unique across layers");
  if (orders.some((order, index) => index > 0 && order <= orders[index - 1])) errors.push("layers must be listed back to front");

  for (const layer of asset) {
    if (layer.cage.length < 3) errors.push(`layer ${layer.id} needs a control cage of at least three points`);
    if (layer.clipBy && !layerById(asset, layer.clipBy)) errors.push(`layer ${layer.id} masks against missing layer ${layer.clipBy}`);
    for (const q of layer.cage) {
      if (q.x < 0 || q.y < 0 || q.x > C_ASSET_SPACE.width || q.y > C_ASSET_SPACE.height) errors.push(`layer ${layer.id} has a rest point outside the declared asset space`);
    }
  }

  // The interior is hidden by paint order and mask together, not by redrawing.
  const orderOf = (id: Parameters<typeof layerById>[1]) => layerById(asset, id)?.drawOrder ?? Number.POSITIVE_INFINITY;
  for (const interior of ["oral-cavity", "tongue", "teeth-lower", "teeth-upper"] as const) {
    for (const occluder of ["jaw", "muzzle-pads", "lip-line"] as const) {
      if (orderOf(interior) >= orderOf(occluder)) errors.push(`${interior} must be painted behind ${occluder}`);
    }
    if (layerById(asset, interior)?.clipBy !== "lip-line") errors.push(`${interior} must be masked by the lip-line aperture`);
  }

  // Observables must be reachable through C's own controls, not through a swap.
  const closed = evaluate(REST_CONTROLS, asset);
  const open = evaluate(controls({ jawOpen: 1 }), asset);
  if (apertureArea(REST_CONTROLS) > 400) errors.push("the rest pose must read as a closed mouth");
  for (const id of ["oral-cavity", "teeth-upper", "teeth-lower"] as const) {
    if (visibleArea(closed, id) > 200) errors.push(`${id} must be occluded when the mouth is closed`);
    if (visibleArea(open, id) <= 0) errors.push(`${id} must become visible through the aperture when the mouth opens`);
  }
  const steps: number[] = [];
  for (let i = 1; i <= 100; i += 1) steps.push(apertureArea(controls({ jawOpen: i / 100 })) - apertureArea(controls({ jawOpen: (i - 1) / 100 })));
  const range = apertureArea(controls({ jawOpen: 1 })) - apertureArea(REST_CONTROLS);
  if (Math.max(...steps.map(Math.abs)) > range * 0.05) errors.push("opening must be continuous; no step may dominate the range");

  return errors;
}

