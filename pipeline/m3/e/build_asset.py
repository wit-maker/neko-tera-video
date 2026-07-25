"""M3-08: build the Base E native full-3D asset and rig.

E is the volume case. Where D uses shallow plates at different depths, E uses
closed volume meshes, a real skull/jaw bone hierarchy, corrective shapes, and a
camera whose orbit is part of the asset rather than a render-time argument.

The card asks for E-specific controls and for camera/view behaviour expressed in
the asset, so the adopted comparison range is authored into a pivot the camera
is parented to, and the limits travel in the manifest.

Authored natively for E. It reads no PNG, no shared topology, and no shared
bones; the only inputs are the constants in this file. No render is performed
and no add-on is installed.

Run headless, from the repository root:
  blender --background --factory-startup --offline-mode \
    --python pipeline/m3/e/build_asset.py -- --out <blend> --manifest <json>
"""

import argparse
import json
import math
import sys

import bmesh
import bpy

SCALE = 1000.0

# Adopted comparison range, ADR-001 / GOV-013. Authored into the asset.
YAW_LIMIT_DEGREES = 15.0
PITCH_LIMIT_DEGREES = 10.0


def px(x, y):
    return (x / SCALE, -y / SCALE)


# name, centre (raster px), radii (raster px, x/depth/y), segments
# Depth radius is given in raster px too and divided by the same scale, so E's
# volumes are proportioned in one space rather than tuned per axis.
VOLUMES = [
    ("skull", (700, 470), (330, 300, 260), 24),
    ("muzzle", (775, 612), (150, 130, 92), 20),
    ("jaw", (775, 664), (140, 120, 74), 20),
    ("cheek-L", (560, 600), (120, 90, 92), 16),
    ("cheek-R", (920, 596), (120, 90, 92), 16),
    ("oral-cavity", (775, 640), (96, 86, 52), 16),
    ("tongue", (775, 652), (60, 70, 26), 16),
    ("teeth-upper", (775, 634), (94, 60, 16), 12),
    ("teeth-lower", (775, 650), (94, 60, 13), 12),
    ("nose", (790, 574), (30, 28, 22), 12),
    ("ear-L", (360, 240), (70, 40, 110), 12),
    ("ear-R", (830, 230), (70, 40, 110), 12),
]

INTERIOR = ("oral-cavity", "tongue", "teeth-upper", "teeth-lower")

# E has a real hierarchy: the jaw hangs off the skull, so its motion inherits.
BONES = [
    # name, head, tail, parent
    ("root", (700, 760), (700, 640), None),
    ("skull", (700, 560), (700, 420), "root"),
    ("jaw", (676, 596), (790, 690), "skull"),
    ("muzzle", (775, 612), (775, 566), "skull"),
    ("lip-corner-L", (700, 642), (664, 634), "jaw"),
    ("lip-corner-R", (852, 638), (888, 630), "jaw"),
    ("cheek-L", (560, 600), (516, 566), "skull"),
    ("cheek-R", (920, 596), (964, 562), "skull"),
    ("tongue", (775, 652), (775, 628), "jaw"),
]

BONE_BINDING = {
    "skull": ["skull", "nose", "ear-L", "ear-R", "teeth-upper"],
    "jaw": ["jaw", "teeth-lower", "oral-cavity"],
    "muzzle": ["muzzle"],
    "cheek-L": ["cheek-L"],
    "cheek-R": ["cheek-R"],
    "tongue": ["tongue"],
}

# Corrective shapes: the volume repairs E has that a plate stack cannot express.
CORRECTIVES = {
    "muzzle": [("jawOpen_corrective", {"z": -0.10, "y": -0.06})],
    "cheek-L": [("jawOpen_corrective", {"x": -0.08, "z": -0.06})],
    "cheek-R": [("jawOpen_corrective", {"x": 0.08, "z": -0.06})],
    "jaw": [("lipRound_corrective", {"x": -0.14, "y": -0.08})],
}


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def add_volume(name, centre, radii, segments):
    """A closed ellipsoid. Closed and non-zero volume is what makes E not D."""
    cx, cz = px(*centre)
    rx, ry, rz = (value / SCALE for value in radii)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=max(6, segments // 2), radius=1.0, location=(cx, 0.0, cz))
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (rx, ry, rz)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def mesh_stats(obj):
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    boundary = sum(1 for edge in mesh.edges if len(edge.link_faces) < 2)
    volume = mesh.calc_volume(signed=False)
    mesh.free()
    return {"closed": boundary == 0, "boundaryEdges": boundary, "volume": round(volume, 9)}


def add_correctives(obj):
    specs = CORRECTIVES.get(obj.name)
    if not specs:
        return []
    verts = obj.data.vertices
    centre = {axis: sum(getattr(v.co, axis) for v in verts) / len(verts) for axis in "xyz"}
    obj.shape_key_add(name="Basis", from_mix=False)
    created = []
    for key_name, amounts in specs:
        key = obj.shape_key_add(name=key_name, from_mix=False)
        for index in range(len(verts)):
            point = key.data[index].co
            for axis, amount in amounts.items():
                setattr(point, axis, getattr(point, axis) + (getattr(point, axis) - centre[axis]) * amount)
        created.append(key_name)
    return created


def build_armature():
    bpy.ops.object.armature_add(location=(0.0, 0.0, 0.0))
    rig = bpy.context.active_object
    rig.name = "e-rig"
    bpy.ops.object.mode_set(mode="EDIT")
    edit_bones = rig.data.edit_bones
    for bone in list(edit_bones):
        edit_bones.remove(bone)
    created = {}
    for name, head, tail, _parent in BONES:
        hx, hz = px(*head)
        tx, tz = px(*tail)
        bone = edit_bones.new(name)
        bone.head = (hx, 0.0, hz)
        bone.tail = (tx, 0.0, tz)
        created[name] = bone
    for name, _head, _tail, parent in BONES:
        if parent:
            created[name].parent = created[parent]
            created[name].use_connect = False
    bpy.ops.object.mode_set(mode="OBJECT")
    return rig


def bind(rig, volumes):
    for bone_name, targets in BONE_BINDING.items():
        for target in targets:
            obj = volumes[target]
            group = obj.vertex_groups.get(bone_name) or obj.vertex_groups.new(name=bone_name)
            group.add([v.index for v in obj.data.vertices], 1.0, "REPLACE")
    for obj in volumes.values():
        if obj.vertex_groups:
            modifier = obj.modifiers.new(name="e-rig", type="ARMATURE")
            modifier.object = rig


def build_camera():
    """View behaviour lives in the asset: a pivot the camera orbits, limited to
    the adopted comparison range rather than left to a render-time argument."""
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.7, 0.0, -0.47))
    pivot = bpy.context.active_object
    pivot.name = "view-pivot"
    bpy.ops.object.camera_add(location=(0.7, -2.4, -0.47), rotation=(math.radians(90.0), 0.0, 0.0))
    camera = bpy.context.active_object
    camera.name = "comparison-camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.2
    camera.parent = pivot

    for axis, limit in (("z", YAW_LIMIT_DEGREES), ("x", PITCH_LIMIT_DEGREES)):
        constraint = pivot.constraints.new(type="LIMIT_ROTATION")
        constraint.name = f"limit-{'yaw' if axis == 'z' else 'pitch'}"
        setattr(constraint, f"use_limit_{axis}", True)
        setattr(constraint, f"min_{axis}", math.radians(-limit))
        setattr(constraint, f"max_{axis}", math.radians(limit))
        constraint.owner_space = "LOCAL"
    return pivot, camera


def build_manifest(volumes, rig, correctives, pivot, camera):
    stats = {name: mesh_stats(obj) for name, obj in volumes.items()}
    hierarchy = {bone.name: (bone.parent.name if bone.parent else None) for bone in rig.data.bones}
    return {
        "schemaVersion": "m3-e-native-asset-manifest-v1",
        "task": "M3-08",
        "base": "E",
        "status": "PROPOSED",
        "mechanismClass": "full-3d-volume-rig",
        "blenderVersion": bpy.app.version_string,
        "assetSpace": "sensei source raster 1280x1920 divided by 1000; Blender, -Y toward viewer",
        "externalAssetInputs": [],
        "addonsBundledEnabledAtFactoryStartup": sorted(a.module for a in bpy.context.preferences.addons),
        "addonsInstalledByThisTask": [],
        "renderPerformed": False,
        "volumes": [
            {
                "name": name,
                "vertexCount": len(obj.data.vertices),
                "closed": stats[name]["closed"],
                "boundaryEdges": stats[name]["boundaryEdges"],
                "volume": stats[name]["volume"],
                "vertexGroups": sorted(g.name for g in obj.vertex_groups),
            }
            for name, obj in volumes.items()
        ],
        "interiorVolumes": list(INTERIOR),
        "boneHierarchy": hierarchy,
        "correctiveShapes": correctives,
        "view": {
            "pivot": pivot.name,
            "camera": camera.name,
            "projection": camera.data.type,
            "yawLimitDegrees": YAW_LIMIT_DEGREES,
            "pitchLimitDegrees": PITCH_LIMIT_DEGREES,
            "limitConstraints": sorted(c.name for c in pivot.constraints),
            "authoredInAsset": True,
        },
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
    volumes = {}
    correctives = {}
    for name, centre, radii, segments in VOLUMES:
        obj = add_volume(name, centre, radii, segments)
        volumes[name] = obj
        created = add_correctives(obj)
        if created:
            correctives[name] = created

    rig = build_armature()
    bind(rig, volumes)
    pivot, camera = build_camera()

    manifest = build_manifest(volumes, rig, correctives, pivot, camera)
    with open(args.manifest, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    bpy.ops.wm.save_as_mainfile(filepath=args.out)
    print(f"M3-08 wrote {args.out} and {args.manifest}")


if __name__ == "__main__":
    main()
