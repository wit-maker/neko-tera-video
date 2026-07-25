"""M3-06: build the Base D native 2.5D anatomical asset and rig.

D is the compromise between a 2D look and real volume: shallow geometry plates
sitting at different depths, driven by an actual jaw hinge. Its occlusion is
geometric -- the oral cavity is physically behind the jaw and muzzle plates, so
closing the jaw hides it because the geometry is in front of it, not because a
2D mask was applied. That is the property P1 is meant to expose against C.

Authored natively for D. It reads no PNG, no shared topology, and no shared
bones; the only inputs are the constants in this file.

Run headless, from the repository root:
  blender --background --factory-startup --offline-mode \
    --python pipeline/m3/d/build_asset.py -- --out <blend> --manifest <json>

No render is performed and no add-on is installed. --factory-startup keeps the
build deterministic and guarantees no user add-on participates.
"""

import argparse
import json
import math
import sys

import bpy
import mathutils

# Landmarks are the sensei source raster (1280x1920) divided by 1000, so D's
# geometry is comparable with the other bases without sharing a deliverable.
# Blender front orthographic: +X right, +Z up, -Y toward the viewer.
SCALE = 1000.0


def px(x, y):
    """Asset-raster pixel to Blender XZ. Raster y grows downward."""
    return (x / SCALE, -y / SCALE)


# name, centre (raster px), size (raster px), depth (Blender Y; + is further away)
PLATES = [
    ("head-plate", (700, 470), (660, 520), 0.000),
    ("cheek-far", (560, 600), (260, 192), -0.010),
    ("oral-cavity", (775, 646), (184, 88), 0.040),
    ("tongue", (775, 656), (116, 52), 0.030),
    ("teeth-upper", (775, 636), (98, 28), 0.024),
    ("teeth-lower", (775, 650), (98, 22), 0.026),
    ("jaw-plate", (775, 672), (200, 110), -0.020),
    ("muzzle-plate", (775, 616), (256, 148), -0.030),
    ("cheek-near", (920, 596), (240, 184), -0.018),
    ("nose", (790, 574), (52, 36), -0.050),
]

# The oral interior. Each must end up behind every occluder in Y.
INTERIOR = ("oral-cavity", "tongue", "teeth-upper", "teeth-lower")
OCCLUDERS = ("jaw-plate", "muzzle-plate")

# Rig controls D exposes. Bones drive articulation, shape keys drive volume.
BONES = [
    # name, head (raster px), tail (raster px)
    ("jaw", (676, 596), (775, 700)),
    ("lip-corner-L", (700, 642), (676, 636)),
    ("lip-corner-R", (852, 638), (876, 632)),
    ("muzzle", (775, 616), (775, 580)),
    ("cheek-L", (560, 600), (520, 570)),
    ("cheek-R", (920, 596), (960, 566)),
]

# plate -> [(key name, mode, per-axis amount)]. "scale" is a proportion about the
# plate centre; "translate" is Blender units.
SHAPE_KEYS = {
    "muzzle-plate": [("muzzleRound", "scale", {"x": -0.18, "z": 0.12})],
    "cheek-near": [("cheekPuff", "scale", {"x": 0.14, "z": 0.10})],
    "cheek-far": [("cheekPuff", "scale", {"x": 0.14, "z": 0.10})],
    "tongue": [("tongueRaise", "translate", {"z": 0.012, "y": -0.004})],
}

# Which plate each bone deforms. D binds explicitly; nothing is auto-weighted,
# so the rig's meaning does not depend on a heuristic.
BONE_BINDING = {
    "jaw": ["jaw-plate", "teeth-lower", "tongue", "oral-cavity"],
    "lip-corner-L": ["muzzle-plate"],
    "lip-corner-R": ["muzzle-plate"],
    "muzzle": ["muzzle-plate", "nose"],
    "cheek-L": ["cheek-far"],
    "cheek-R": ["cheek-near"],
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def add_plate(name, centre, size, depth):
    """A subdivided quad. Shallow geometry, not a volume: that is what 2.5D means."""
    cx, cz = px(*centre)
    width, height = size[0] / SCALE, size[1] / SCALE
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=6, y_subdivisions=6, size=1.0, location=(cx, depth, cz))
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = (math.radians(90.0), 0.0, 0.0)
    obj.scale = (width, height, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return obj


def add_shape_keys(obj):
    """Volume controls D drives through geometry rather than through a 2D mask."""
    specs = SHAPE_KEYS.get(obj.name)
    if not specs:
        return []
    verts = obj.data.vertices
    centre = {axis: sum(getattr(v.co, axis) for v in verts) / len(verts) for axis in "xyz"}
    obj.shape_key_add(name="Basis", from_mix=False)
    created = []
    for key_name, mode, amounts in specs:
        key = obj.shape_key_add(name=key_name, from_mix=False)
        for index in range(len(verts)):
            point = key.data[index].co
            for axis, amount in amounts.items():
                delta = (getattr(point, axis) - centre[axis]) * amount if mode == "scale" else amount
                setattr(point, axis, getattr(point, axis) + delta)
        created.append(key_name)
    return created


def build_armature():
    bpy.ops.object.armature_add(location=(0.0, 0.0, 0.0))
    rig = bpy.context.active_object
    rig.name = "d-rig"
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = rig.data.edit_bones
    for bone in list(edit_bones):
        edit_bones.remove(bone)
    for name, head, tail in BONES:
        hx, hz = px(*head)
        tx, tz = px(*tail)
        bone = edit_bones.new(name)
        bone.head = (hx, -0.02, hz)
        bone.tail = (tx, -0.02, tz)
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind(rig, plates):
    for bone_name, plate_names in BONE_BINDING.items():
        for plate_name in plate_names:
            obj = plates[plate_name]
            group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
            group.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")
    for obj in plates.values():
        if not obj.vertex_groups:
            continue
        modifier = obj.modifiers.new(name="d-rig", type="ARMATURE")
        modifier.object = rig


def world_bounds(obj):
    """Evaluated world-space extents of the real mesh, not the object origin.

    Comparing origins only confirms that the numbers this script wrote are
    ordered the way this script intended -- it is circular and says nothing
    about whether the geometry occludes. Plates have extent, so a large one can
    reach past a nearer origin, and depth order alone does not occlude anything
    unless the shapes also overlap on screen. Both are measured here.
    """
    depsgraph = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(depsgraph)
    matrix = evaluated.matrix_world
    corners = [matrix @ mathutils.Vector(corner) for corner in evaluated.bound_box]
    return {
        "minX": round(min(c.x for c in corners), 6), "maxX": round(max(c.x for c in corners), 6),
        "minY": round(min(c.y for c in corners), 6), "maxY": round(max(c.y for c in corners), 6),
        "minZ": round(min(c.z for c in corners), 6), "maxZ": round(max(c.z for c in corners), 6),
    }


def overlap(a, b, axis):
    lo = max(a[f"min{axis}"], b[f"min{axis}"])
    hi = min(a[f"max{axis}"], b[f"max{axis}"])
    return round(max(0.0, hi - lo), 6)


def build_manifest(plates, rig, shape_keys):
    bpy.context.view_layer.update()
    depths = {name: round(obj.location.y, 6) for name, obj in plates.items()}
    bounds = {name: world_bounds(obj) for name, obj in plates.items()}
    occlusion = []
    for interior in INTERIOR:
        for occluder in OCCLUDERS:
            a, b = bounds[interior], bounds[occluder]
            # Larger Y is further from the viewer. The interior's nearest face
            # must still sit behind the occluder's furthest face.
            separation = round(a["minY"] - b["maxY"], 6)
            screen_x = overlap(a, b, "X")
            screen_z = overlap(a, b, "Z")
            occlusion.append({
                "interior": interior,
                "occluder": occluder,
                "interiorBehindOccluder": separation > 0.0,
                "depthGap": separation,
                "originDepthGap": round(depths[interior] - depths[occluder], 6),
                "screenOverlapX": screen_x,
                "screenOverlapZ": screen_z,
                "screenOverlaps": screen_x > 0.0 and screen_z > 0.0,
                "measuredFrom": "evaluated world-space bounds",
            })
    return {
        "schemaVersion": "m3-d-native-asset-manifest-v1",
        "task": "M3-06",
        "base": "D",
        "status": "PROPOSED",
        "mechanismClass": "shallow-layered-geometry-with-jaw-hinge",
        "blenderVersion": bpy.app.version_string,
        "assetSpace": "sensei source raster 1280x1920 divided by 1000; Blender front orthographic, -Y toward viewer",
        "externalAssetInputs": [],
        # Under --factory-startup these are Blender's own bundled defaults. This
        # task installs nothing; M3-01's receipt records addonInstalled false and
        # that stays true. Listed so the claim is checkable rather than asserted.
        "addonsBundledEnabledAtFactoryStartup": sorted(a.module for a in bpy.context.preferences.addons),
        "addonsInstalledByThisTask": [],
        "renderPerformed": False,
        "plates": [
            {
                "name": name,
                "depthY": depths[name],
                "vertexCount": len(obj.data.vertices),
                "isVolume": False,
                "vertexGroups": sorted(g.name for g in obj.vertex_groups),
                "worldBounds": bounds[name],
            }
            for name, obj in plates.items()
        ],
        "bones": sorted(b.name for b in rig.data.bones),
        "shapeKeys": shape_keys,
        "occlusion": occlusion,
        "conformance": {"status": "not-run"},
        "evaluation": {"status": "not-evaluated", "qualityRanking": "not-made", "representationDecision": "not-made"},
    }


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True)
    parser.add_argument("--manifest", required=True)
    args = parser.parse_args(argv)

    clear_scene()
    plates = {}
    shape_keys = {}
    for name, centre, size, depth in PLATES:
        obj = add_plate(name, centre, size, depth)
        plates[name] = obj
        created = add_shape_keys(obj)
        if created:
            shape_keys[name] = created

    rig = build_armature()
    bind(rig, plates)

    manifest = build_manifest(plates, rig, shape_keys)
    with open(args.manifest, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    bpy.ops.wm.save_as_mainfile(filepath=args.out)
    print(f"M3-06 wrote {args.out} and {args.manifest}")


if __name__ == "__main__":
    main()
