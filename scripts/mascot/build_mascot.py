"""
마스코트 "복이" 3D 모델·애니메이션 생성 및 렌더링 (Blender 5.x, 백그라운드 실행).

  blender -b --factory-startup -P scripts/mascot/build_mascot.py -- --states all --stills assets/mascot/reference --out assets/mascot/render --res 384

옵션
  --states   렌더할 동작 (쉼표 구분, all = 전부, none = 없음). 목록은 아래 STATES
  --stills   정면·3/4·측면·후면·표정 기준 이미지 렌더 경로
  --res      한 변 해상도(px)
  --engine   eevee | cycles
  --save     .blend 파일 저장 경로 (walk 루프를 키프레임으로 저장)
  --only-frame  검수용: 각 동작에서 한 프레임만 렌더

설계 원칙
- 모든 동작은 하나의 모델에서 나오므로 프레임·시점마다 외형이 같다.
- 몸통·다리는 메타볼 한 덩어리로 녹여 붙여 관절 이음새(주름)가 없다.
- 한 번 재생하는 동작(wave·nod·surprised·reveal·celebrate·yawn)은 **휴식 자세에서 시작해 휴식 자세로 끝난다**.
  휴식 자세 = idle 첫 프레임. 그래서 idle ↔ 반응 동작 전환이 끊기지 않는다.
- 반복 동작(idle·walk·think·happy)은 주기 함수라 마지막 프레임 다음이 첫 프레임과 이어진다.
- 한 번 재생 동작은 키 자세 사이를 Catmull-Rom 곡선으로 이어 속도가 끊기지 않는다.
모델은 기본 도형으로만 만든다 (외부 에셋·이미지 없음). 단위는 m, 캐릭터는 -Y(카메라)를 본다.
"""

import argparse
import math
import os
import random
import sys

import bpy
from mathutils import Euler, Vector

# ── 설정 ──────────────────────────────────────────────
PALETTE = {
    "cream": (0.965, 0.937, 0.890),
    "leaf": (0.435, 0.627, 0.325),
    "stem": (0.306, 0.498, 0.227),
    "bag": (0.925, 0.541, 0.235),
    "bag_dark": (0.788, 0.380, 0.165),
    "strap": (0.541, 0.353, 0.231),
    "gold": (0.949, 0.757, 0.306),
    "eye": (0.227, 0.165, 0.141),
    "cheek": (0.957, 0.639, 0.659),
    "mouth_in": (0.85, 0.42, 0.45),
    "card": (0.42, 0.33, 0.78),
}
CONFETTI_COLORS = [(1.0, 0.82, 0.35), (1.0, 0.56, 0.67), (0.5, 0.7, 1.0), (0.5, 0.88, 0.66), (0.78, 0.6, 1.0)]

HIP_H = 0.42  # 골반(다리 시작) 높이
REST_HIP = HIP_H - 0.02  # 휴식 자세 골반 높이
THIGH = 0.2
SHIN = 0.2
ANKLE_H = 0.06  # 발목 높이 → 발바닥이 z=0
LEG_X = 0.175
FACING_DEG = 40  # 기본 시점: 화면 오른쪽 앞으로 비스듬히
ARM_OUT = math.radians(14)  # 휴식 자세 팔 벌림
MB = 0.575  # 메타볼: 보이는 반지름 ≈ 영향 반지름 × 0.575 (stiffness 2, threshold 0.6)

# 동작별 프레임 수·fps·반복 (웹 스프라이트 시트와 맞춘다: encode.mjs 가 이 표를 읽지 않으므로 같이 고친다)
STATES = {
    "idle": {"frames": 30, "fps": 15, "loop": True},
    "walk": {"frames": 20, "fps": 20, "loop": True},
    "think": {"frames": 30, "fps": 15, "loop": True},
    "happy": {"frames": 20, "fps": 20, "loop": True},
    "wave": {"frames": 30, "fps": 20, "loop": False},
    "nod": {"frames": 20, "fps": 20, "loop": False},
    "surprised": {"frames": 24, "fps": 20, "loop": False},
    "reveal": {"frames": 40, "fps": 20, "loop": False},
    "celebrate": {"frames": 40, "fps": 20, "loop": False},
    "yawn": {"frames": 36, "fps": 18, "loop": False},
}


def srgb_to_linear(c):
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c)


# ── 재질 ──────────────────────────────────────────────
_mats = {}


def material(name, color, rough=0.55, metal=0.0, sss=0.0, bump=0.0, emit=0.0):
    if name in _mats:
        return _mats[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    lin = srgb_to_linear(color)
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if sss and "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = sss
        bsdf.inputs["Subsurface Radius"].default_value = (0.08, 0.05, 0.04)
    if emit and "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = (*lin, 1)
        bsdf.inputs["Emission Strength"].default_value = emit
    if bump:
        noise = nt.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 60.0
        noise.inputs["Detail"].default_value = 3.0
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.02
        nt.links.new(noise.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    _mats[name] = m
    return m


def mats():
    return {
        # 몸은 매끈하게 (범프 없음 → 주름처럼 보이는 요철 없음)
        "body": material("Body", PALETTE["cream"], 0.5, sss=0.15),
        "leaf": material("Leaf", PALETTE["leaf"], 0.45),
        "stem": material("Stem", PALETTE["stem"], 0.5),
        "bag": material("Bag", PALETTE["bag"], 0.7, bump=0.08),
        "bag_dark": material("BagDark", PALETTE["bag_dark"], 0.7),
        "strap": material("Strap", PALETTE["strap"], 0.5),
        "gold": material("Gold", PALETTE["gold"], 0.35, metal=0.6),
        "glow": material("Glow", (1.0, 0.86, 0.45), 0.3, emit=3.0),
        "eye": material("Eye", PALETTE["eye"], 0.15),
        "white": material("Highlight", (1, 1, 1), 0.2, emit=1.5),
        "cheek": material("Cheek", PALETTE["cheek"], 0.6),
        "mouth_in": material("MouthIn", PALETTE["mouth_in"], 0.5),
        "card": material("Card", PALETTE["card"], 0.4),
        "confetti": [material(f"Confetti{i}", c, 0.4, emit=0.6) for i, c in enumerate(CONFETTI_COLORS)],
    }


# ── 도형 도우미 ───────────────────────────────────────
def empty(name, parent=None, loc=(0, 0, 0), rot=(0, 0, 0)):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.05
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    return o


def ellipsoid(name, parent, loc, scale, mat, rot=(0, 0, 0), seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, radius=1.0, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.parent = parent
    o.location = loc
    o.scale = scale
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def rounded_box(name, parent, loc, size, mat, bevel=0.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    o.parent = parent
    o.location = loc
    o.scale = size
    o.rotation_euler = rot
    o.data.materials.append(mat)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    m = o.modifiers.new("Bevel", "BEVEL")
    m.width = bevel
    m.segments = 4
    bpy.ops.object.shade_smooth()
    return o


def torus(name, parent, loc, major, minor, mat, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=48, minor_segments=16, location=(0, 0, 0))
    o = bpy.context.active_object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    o.data.materials.append(mat)
    return o


def tube(name, parent, points, radius, mat):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 6
    cu.resolution_u = 24
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS")
    sp.points.add(len(points) - 1)
    for p, xyz in zip(sp.points, points):
        p.co = (*xyz, 1)
    sp.order_u = min(4, len(points))
    sp.use_endpoint_u = True
    o = bpy.data.objects.new(name, cu)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.data.materials.append(mat)
    return o


def star(name, parent, loc, size, depth, mat, rot=(0, 0, 0)):
    import bmesh

    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ring = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        r = size if i % 2 == 0 else size * 0.45
        ring.append((r * math.cos(a), r * math.sin(a)))
    front = [bm.verts.new((x, -depth / 2, z)) for x, z in ring]
    back = [bm.verts.new((x, depth / 2, z)) for x, z in ring]
    bm.faces.new(list(reversed(front)))
    bm.faces.new(back)
    for i in range(10):
        j = (i + 1) % 10
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    me.materials.append(mat)
    bev = o.modifiers.new("Bevel", "BEVEL")
    bev.width = depth * 0.3
    bev.segments = 3
    return o


# ── 메타볼 (몸통·다리를 한 덩어리로) ─────────────────────
# 같은 이름 계열("Bokki", "Bokki.001", …)의 메타볼 오브젝트는 서로 녹아 붙는다. 각 오브젝트는 다른 관절에 붙일 수 있다.
_mb_count = [0]


def metaball(parent, elements, mat=None, loc=(0, 0, 0)):
    n = _mb_count[0]
    _mb_count[0] += 1
    name = "Bokki" if n == 0 else f"Bokki.{n:03d}"
    mb = bpy.data.metaballs.new(name)
    mb.resolution = 0.05
    mb.render_resolution = 0.012
    mb.threshold = 0.6
    for kind, co, radius, size, rot in elements:
        el = mb.elements.new(type=kind)
        el.co = co
        el.radius = radius
        el.stiffness = 2.0
        if kind == "ELLIPSOID":
            el.size_x, el.size_y, el.size_z = size
        elif kind == "CAPSULE":
            el.size_x = size
        el.rotation = Euler(rot).to_quaternion()
    o = bpy.data.objects.new(name, mb)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    o.location = loc
    if mat is not None:
        mb.materials.append(mat)
    return o


def ell(co, visible):
    """보이는 반지름(visible)이 되도록 메타볼 타원체 요소를 만든다"""
    return ("ELLIPSOID", co, 1.0, tuple(v / MB for v in visible), (0, 0, 0))


def cap(co, half_len, visible_r, rot):
    return ("CAPSULE", co, visible_r / MB, half_len, rot)


# ── 머리 표면 위치·방향 ────────────────────────────────
HEAD_C = Vector((0, 0, 0.54))
HEAD_R = Vector((0.651, 0.6076, 0.5704))


def head_surface(x, z, out=0.0):
    u = (x / HEAD_R.x) ** 2 + ((z - HEAD_C.z) / HEAD_R.z) ** 2
    y = -HEAD_R.y * math.sqrt(max(0.0, 1 - u))
    p = Vector((x, y, z))
    n = Vector((x / HEAD_R.x**2, y / HEAD_R.y**2, (z - HEAD_C.z) / HEAD_R.z**2)).normalized()
    p = p + n * out
    rot = Vector((0, -1, 0)).rotation_difference(n).to_euler()
    return p, rot


# ── 모델 ──────────────────────────────────────────────
def build():
    M = mats()
    rig = {}
    root = empty("Root")
    hips = empty("Hips", root, (0, 0, REST_HIP))
    rig.update(root=root, hips=hips)

    # 몸통 (메타볼 계열의 기준 오브젝트 — 재질은 여기서 정한다). 엉덩이 쪽을 조금 넓혀 다리와 매끈하게 이어지게
    metaball(hips, [ell((0, 0, 0.29), (0.41, 0.375, 0.45))], mat=M["body"])
    ellipsoid("Tail", hips, (0, 0.38, 0.12), (0.07, 0.06, 0.07), M["body"])

    # 머리
    head = empty("Head", hips, (0, 0, 0.66))
    rig["head"] = head
    ellipsoid("HeadMesh", head, tuple(HEAD_C), tuple(HEAD_R), M["body"], seg=64)
    for side in (-1, 1):
        ear = empty(f"Ear.{side}", head, (side * 0.50, 0.06, 0.92), (0, side * math.radians(22), 0))
        ellipsoid("EarMesh", ear, (0, 0, 0), (0.15, 0.10, 0.15), M["body"])
        ellipsoid("EarInner", ear, (0, -0.075, 0), (0.085, 0.03, 0.085), M["cheek"])

    # 눈: 기준점 → 눈알(깜빡임 = z 축소, 시선 = 위치 이동) + 기쁨 눈(^)
    for side in (-1, 1):
        p, r = head_surface(side * 0.21, 0.53, 0.0)
        anchor = empty(f"EyeAnchor.{side}", head, tuple(p), tuple(r))
        ball = ellipsoid(f"Eye.{side}", anchor, (0, 0.012, 0), (0.058, 0.03, 0.088), M["eye"])
        ellipsoid("Hi1", ball, (0.35, -0.9, 0.42), (0.36, 0.4, 0.24), M["white"])
        ellipsoid("Hi2", ball, (-0.3, -0.9, -0.38), (0.18, 0.3, 0.12), M["white"])
        arc = tube(f"HappyEye.{side}", anchor, [(-0.055, -0.012, -0.015), (0, -0.02, 0.04), (0.055, -0.012, -0.015)], 0.016, M["eye"])
        rig[f"eye{side}"] = ball
        rig[f"happy{side}"] = arc
        cp, cr = head_surface(side * 0.37, 0.39, 0.0)
        ellipsoid(f"Cheek.{side}", head, tuple(cp), (0.075, 0.012, 0.048), M["cheek"], rot=tuple(cr))

    mp, mr = head_surface(0, 0.36, 0.0)
    mouth = empty("MouthAnchor", head, tuple(mp), tuple(mr))
    rig["smile"] = tube("Smile", mouth, [(-0.06, -0.008, 0.02), (0, -0.012, -0.018), (0.06, -0.008, 0.02)], 0.013, M["eye"])
    open_m = empty("MouthOpen", mouth, (0, 0, -0.01))
    ellipsoid("MouthOpenShape", open_m, (0, -0.004, 0), (0.065, 0.014, 0.05), M["eye"])
    ellipsoid("Tongue", open_m, (0, -0.012, -0.022), (0.035, 0.008, 0.018), M["mouth_in"])
    rig["mouth_open"] = open_m
    o_m = empty("MouthO", mouth, (0, 0, -0.01))
    ellipsoid("MouthOShape", o_m, (0, -0.004, 0), (0.035, 0.014, 0.045), M["eye"])
    rig["mouth_o"] = o_m

    # 네잎클로버 새싹
    sprout = empty("Sprout", head, (0, -0.03, 1.08))
    rig["sprout"] = sprout
    tube("Stem", sprout, [(0, 0, -0.06), (0.0, -0.01, 0.1), (0.04, -0.06, 0.22), (0.05, -0.08, 0.28)], 0.032, M["stem"])
    crown = empty("Crown", sprout, (0.05, -0.08, 0.29), (math.radians(-42), 0, 0))
    for k in range(4):
        leaf = empty(f"Leaf{k}", crown, (0, 0, 0), (0, 0, math.radians(45 + 90 * k)))
        tilt = empty("Tilt", leaf, (0, 0, 0), (math.radians(-14), 0, 0))
        for s in (-1, 1):
            ellipsoid("Lobe", tilt, (s * 0.07, -0.13, 0), (0.105, 0.13, 0.032), M["leaf"], rot=(0, 0, s * math.radians(-20)))
    ellipsoid("LeafCenter", crown, (0, 0, 0.01), (0.045, 0.045, 0.03), M["stem"])

    # 팔 (어깨 기준 회전). 손끝 기준점에 소품을 쥔다
    for side in (-1, 1):
        sh = empty(f"Shoulder.{side}", hips, (side * 0.37, -0.02, 0.56), (0, -side * ARM_OUT, 0))
        ellipsoid("Arm", sh, (side * 0.03, 0, -0.16), (0.11, 0.11, 0.2), M["body"])
        rig[f"arm{side}"] = sh
        rig[f"hand{side}"] = empty(f"Hand.{side}", sh, (side * 0.03, -0.02, -0.34))

    # 다리: 메타볼 캡슐(허벅지·정강이) + 발. 몸통과 같은 계열이라 이음새 없이 녹아 붙는다
    down = (0, math.pi / 2, 0)  # 캡슐(X축)을 아래 방향(Z축)으로
    for side in (-1, 1):
        hip_j = empty(f"HipJoint.{side}", hips, (side * LEG_X, 0, 0))
        metaball(hip_j, [cap((0, 0, -THIGH / 2), THIGH / 2, 0.112, down)])
        knee = empty(f"Knee.{side}", hip_j, (0, 0, -THIGH))
        metaball(knee, [cap((0, 0, -SHIN / 2), SHIN / 2, 0.108, down)])
        foot = empty(f"Ankle.{side}", knee, (0, 0, -SHIN))
        metaball(foot, [ell((0, -0.04, 0.0), (0.12, 0.15, ANKLE_H))])
        rig[f"hipj{side}"] = hip_j
        rig[f"knee{side}"] = knee
        rig[f"ankle{side}"] = foot

    # 가방끈 + 복주머니
    tube(
        "Strap",
        hips,
        [(-0.38, -0.16, 0.36), (-0.22, -0.335, 0.37), (0.03, -0.37, 0.5), (0.23, -0.24, 0.63), (0.31, 0.0, 0.69), (0.24, 0.23, 0.62), (0.02, 0.37, 0.48), (-0.26, 0.315, 0.36), (-0.39, 0.05, 0.37)],
        0.022,
        M["strap"],
    )
    bag = empty("BagPivot", hips, (-0.42, -0.08, 0.36))
    rig["bag"] = bag
    ellipsoid("Pouch", bag, (0, -0.02, -0.17), (0.16, 0.13, 0.15), M["bag"])
    ellipsoid("PouchNeck", bag, (0, -0.02, -0.05), (0.075, 0.07, 0.04), M["bag_dark"])
    ellipsoid("PouchFrill", bag, (0, -0.02, -0.0), (0.1, 0.09, 0.035), M["bag"])
    torus("Drawstring", bag, (0, -0.02, -0.05), 0.075, 0.012, M["bag_dark"])
    star("Charm", bag, (0, -0.155, -0.17), 0.055, 0.025, M["gold"], rot=(math.radians(-6), 0, 0))

    # 운세 카드 (reveal): 왼손에 쥐고, 숨길 때는 크기 0
    card = empty("CardPivot", None)
    rig["card"] = card
    rounded_box("Card", card, (0, -0.06, 0.17), (0.17, 0.02, 0.25), M["card"], bevel=0.015)
    rounded_box("CardEdge", card, (0, -0.072, 0.17), (0.14, 0.004, 0.21), M["gold"], bevel=0.003)
    rounded_box("CardFace", card, (0, -0.076, 0.17), (0.125, 0.004, 0.195), M["card"], bevel=0.003)
    star("CardStar", card, (0, -0.082, 0.17), 0.05, 0.012, M["glow"])
    rig["card_sparks"] = [star(f"Spark{i}", card, (x, -0.09, z + 0.02), 0.03, 0.01, M["glow"]) for i, (x, z) in enumerate([(-0.15, 0.3), (0.16, 0.24), (0.12, 0.38)])]

    # 꽃가루 (celebrate)
    rnd = random.Random(7)
    pieces = []
    for i in range(22):
        o = rounded_box(f"Confetti{i}", root, (0, 0, 0), (0.05, 0.012, 0.03), M["confetti"][i % len(CONFETTI_COLORS)], bevel=0.004)
        a = rnd.uniform(0, 2 * math.pi)
        speed = rnd.uniform(1.0, 1.9)
        pieces.append({"o": o, "v": Vector((math.cos(a) * speed * 0.55, -abs(math.sin(a)) * 0.35 - 0.15, rnd.uniform(2.2, 3.2))), "spin": rnd.uniform(4, 9), "axis": rnd.choice("XYZ")})
    rig["confetti"] = pieces
    return rig


# ── 다리 IK ──────────────────────────────────────────
def solve_leg(target_y, target_z):
    d = math.hypot(target_y, target_z)
    d = min(d, THIGH + SHIN - 1e-4)
    phi = math.atan2(target_y, -target_z)
    a = math.acos(max(-1, min(1, (THIGH**2 + d**2 - SHIN**2) / (2 * THIGH * d))))
    b = math.acos(max(-1, min(1, (THIGH**2 + SHIN**2 - d**2) / (2 * THIGH * SHIN))))
    return phi - a, math.pi - b


def set_leg(rig, side, foot_y, foot_z, hip_z):
    t1, t2 = solve_leg(foot_y, foot_z - hip_z)
    rig[f"hipj{side}"].rotation_euler = (t1, 0, 0)
    rig[f"knee{side}"].rotation_euler = (t2, 0, 0)
    rig[f"ankle{side}"].rotation_euler = (-(t1 + t2), 0, 0)


def set_arm(rig, side, forward=0.0, out=0.0):
    """forward: 앞으로 들기(rad, +면 앞), out: 옆으로 벌리기(rad, 휴식 자세 기준 추가량)"""
    rig[f"arm{side}"].rotation_euler = (-forward, -side * (ARM_OUT + out), 0)


def expression(rig, kind="neutral", blink=0.0, look=(0.0, 0.0), mouth_scale=1.0):
    """kind: neutral | happy | surprised | o(하품·감탄). blink 0~1, look=(x, z) 시선 이동"""
    for side in (-1, 1):
        ball, arc = rig[f"eye{side}"], rig[f"happy{side}"]
        happy = kind == "happy"
        ball.hide_render = ball.hide_viewport = happy
        arc.hide_render = arc.hide_viewport = not happy
        k = 1.3 if kind == "surprised" else 1.0
        ball.scale = (0.058 * k, 0.03, 0.088 * k * max(0.08, 1 - blink))
        ball.location = (look[0], 0.012, look[1])
    show = {"neutral": "smile", "happy": "mouth_open", "surprised": "mouth_o", "o": "mouth_o"}[kind]
    for key in ("smile", "mouth_open", "mouth_o"):
        o = rig[key]
        hidden = key != show
        for ob in [o, *o.children_recursive]:
            ob.hide_render = ob.hide_viewport = hidden
    rig["mouth_o"].scale = (mouth_scale,) * 3


# ── 휴식 자세 ─────────────────────────────────────────
def rest(rig):
    rig["root"].rotation_euler = (0, 0, math.radians(rig["facing"]))
    rig["hips"].location = (0, 0, REST_HIP)
    rig["hips"].rotation_euler = (0, 0, 0)
    for side in (-1, 1):
        set_leg(rig, side, 0.0, ANKLE_H, REST_HIP)
        set_arm(rig, side)
    for k in ("head", "sprout", "bag"):
        rig[k].rotation_euler = (0, 0, 0)
    rig["card"].scale = (0, 0, 0)
    for s in rig["card_sparks"]:
        s.scale = (1, 1, 1)
    for c in rig["confetti"]:
        c["o"].scale = (0, 0, 0)
    expression(rig)


# ── 키 자세 보간 (한 번 재생 동작) ─────────────────────
# 채널은 휴식 자세에 더하는 값. 각도는 도(deg), 길이는 m. 빠진 채널은 0.
CHANNELS = [
    "hz", "hy", "hrx", "hry", "hrz", "spin",  # 골반 높이·앞뒤·기울기, 제자리 회전(도)
    "headx", "heady", "headz",
    "lf", "lo", "rf", "ro",  # 왼팔/오른팔 앞으로·옆으로(도)
    "sproutx", "sprouty", "bagx", "bagy",
    "lfoot", "rfoot",  # 발 들기(m)
    "card", "blink", "lookx", "lookz", "confetti", "mouth",
]


def hermite_track(keys, t):
    """keys: [(t, value)] 시간 오름차순. 양 끝 속도 0, 가운데는 Catmull-Rom 접선"""
    if t <= keys[0][0]:
        return keys[0][1]
    if t >= keys[-1][0]:
        return keys[-1][1]
    for i in range(len(keys) - 1):
        t0, p0 = keys[i]
        t1, p1 = keys[i + 1]
        if t0 <= t <= t1:
            break
    h = t1 - t0

    def tangent(j):
        if j == 0 or j == len(keys) - 1:
            return 0.0
        return (keys[j + 1][1] - keys[j - 1][1]) / (keys[j + 1][0] - keys[j - 1][0])

    m0, m1 = tangent(i), tangent(i + 1)
    s = (t - t0) / h
    s2, s3 = s * s, s * s * s
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1


def sample(keyposes, t):
    """keyposes: [(t, {채널: 값}, 표정)] → 채널 값 dict + 그 시점 표정"""
    out = {}
    for ch in CHANNELS:
        out[ch] = hermite_track([(kt, kp.get(ch, 0.0)) for kt, kp, _ in keyposes], t)
    expr = keyposes[0][2]
    for kt, _, e in keyposes:
        if t + 1e-6 >= kt:
            expr = e
    return out, expr


def apply_channels(rig, c, expr):
    rest(rig)
    rig["root"].rotation_euler = (0, 0, math.radians(rig["facing"] + c["spin"]))
    hip_z = REST_HIP + c["hz"]
    rig["hips"].location = (0, c["hy"], hip_z)
    rig["hips"].rotation_euler = tuple(math.radians(c[k]) for k in ("hrx", "hry", "hrz"))
    # 발은 땅에 두고(들기 채널만큼 들고) 골반 높이에 맞춰 무릎을 굽힌다. 골반이 다리 길이보다 높으면 발이 따라 뜬다(점프)
    reach = THIGH + SHIN - 0.004
    for side, lift in ((-1, c["lfoot"]), (1, c["rfoot"])):
        foot_z = max(ANKLE_H + lift, hip_z - reach)
        set_leg(rig, side, -c["hy"], foot_z, hip_z)
    set_arm(rig, -1, math.radians(c["lf"]), math.radians(c["lo"]))
    set_arm(rig, 1, math.radians(c["rf"]), math.radians(c["ro"]))
    rig["head"].rotation_euler = tuple(math.radians(c[k]) for k in ("headx", "heady", "headz"))
    rig["sprout"].rotation_euler = (math.radians(c["sproutx"]), math.radians(c["sprouty"]), 0)
    rig["bag"].rotation_euler = (math.radians(c["bagx"]), math.radians(c["bagy"]), 0)
    s = max(0.0, c["card"])
    rig["card"].scale = (s * 1.5, s * 1.5, s * 1.5)
    if s > 0:
        # 카드는 왼손 위치를 따라가고, 몸이 돌아도 항상 카메라(-Y)를 향해 똑바로 선다
        bpy.context.view_layer.update()
        rig["card"].location = rig["hand-1"].matrix_world.translation + Vector((0, -0.1, 0.06))
        rig["card"].rotation_euler = (0, 0, 0)
    expression(rig, expr, blink=max(0.0, min(1.0, c["blink"])), look=(c["lookx"], c["lookz"]), mouth_scale=1 + c["mouth"])


def place_confetti(rig, progress, t_anim):
    """progress 0~1: 터진 뒤 경과 비율. 0 이하·1 이상이면 숨김"""
    for i, piece in enumerate(rig["confetti"]):
        o = piece["o"]
        if progress <= 0.0 or progress >= 1.0:
            o.scale = (0, 0, 0)
            continue
        tau = progress * 1.1
        v = piece["v"]
        o.location = Vector((0, -0.3, 1.9)) + v * tau + Vector((0, 0, -4.0 * tau * tau))
        fade = min(1.0, (1.0 - progress) * 4)
        o.scale = (fade, fade, fade)
        ang = piece["spin"] * tau
        o.rotation_euler = {"X": (ang, 0.3, 0), "Y": (0.2, ang, 0), "Z": (0, 0.4, ang)}[piece["axis"]]


# 한 번 재생 동작: (시점 0~1, 채널, 표정). 첫·마지막 키는 휴식 자세(빈 dict)
CLIPS = {
    "wave": [
        (0.0, {}, "neutral"),
        (0.18, {"ro": 125, "rf": 15, "headz": -6, "heady": 4, "hry": 2}, "happy"),
        (0.3, {"ro": 145, "rf": 15, "headz": -6, "heady": 6, "hry": 3, "sprouty": -6}, "happy"),
        (0.42, {"ro": 118, "rf": 15, "headz": -6, "heady": 3, "hry": 2, "sprouty": 5}, "happy"),
        (0.54, {"ro": 145, "rf": 15, "headz": -6, "heady": 6, "hry": 3, "sprouty": -6}, "happy"),
        (0.66, {"ro": 118, "rf": 15, "headz": -6, "heady": 3, "hry": 2, "sprouty": 5}, "happy"),
        (0.8, {"ro": 60, "rf": 8, "headz": -3, "heady": 2}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "nod": [
        (0.0, {}, "neutral"),
        (0.22, {"headx": 14, "hz": -0.015, "sproutx": -8}, "happy"),
        (0.4, {"headx": -3, "sproutx": 6}, "happy"),
        (0.6, {"headx": 12, "hz": -0.012, "sproutx": -7}, "happy"),
        (0.8, {"headx": -2, "sproutx": 4}, "happy"),
        (1.0, {}, "neutral"),
    ],
    "surprised": [
        (0.0, {}, "neutral"),
        (0.12, {"hz": -0.03, "headx": 4}, "neutral"),
        (0.28, {"hz": 0.09, "hy": 0.03, "hrx": -6, "lo": 75, "ro": 75, "headx": -8, "sproutx": -18, "bagx": 10}, "surprised"),
        (0.45, {"hz": 0.0, "hy": 0.04, "hrx": -4, "lo": 65, "ro": 65, "headx": -5, "sproutx": 8, "bagx": -8}, "surprised"),
        (0.7, {"hy": 0.02, "lo": 30, "ro": 30, "headx": -2, "sproutx": -3}, "surprised"),
        (0.85, {"blink": 1.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "reveal": [
        (0.0, {}, "neutral"),
        (0.15, {"lf": 18, "lo": -6, "headz": 10, "headx": 8, "lookx": -0.012, "lookz": -0.01}, "neutral"),  # 복주머니로 손을
        (0.27, {"lf": 22, "lo": -4, "headz": 10, "headx": 8, "card": 0.4, "lookx": -0.012, "lookz": -0.01}, "neutral"),
        (0.42, {"lo": 115, "lf": 40, "hz": 0.03, "hrx": -5, "headx": -10, "headz": -6, "card": 1.0, "sproutx": -10, "bagy": 8}, "happy"),
        (0.6, {"lo": 112, "lf": 42, "hz": 0.0, "hrx": -3, "headx": -6, "headz": -4, "card": 1.05, "sproutx": 5}, "happy"),
        (0.72, {"lo": 110, "lf": 40, "hz": 0.01, "hrx": -3, "headx": -6, "headz": -4, "card": 1.0, "sproutx": -3}, "happy"),
        (0.86, {"lf": 20, "lo": -4, "headz": 6, "headx": 4, "card": 0.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "celebrate": [
        (0.0, {}, "neutral"),
        (0.12, {"hz": -0.08, "hrx": 6, "lo": -8, "ro": -8, "lf": -15, "rf": -15, "headx": 6}, "neutral"),  # 웅크리기
        (0.3, {"hz": 0.42, "spin": 180, "lo": 90, "ro": 90, "lf": -10, "rf": -10, "headx": -8, "sproutx": -20, "bagx": 15}, "happy"),
        (0.45, {"hz": 0.2, "spin": 360, "lo": 105, "ro": 105, "lf": -10, "rf": -10, "headx": -6, "sproutx": 15, "bagx": -12}, "happy"),
        (0.52, {"hz": -0.06, "spin": 360, "hrx": 5, "lo": 60, "ro": 60, "headx": 6, "sproutx": -12, "bagx": 10}, "happy"),  # 착지
        (0.66, {"hz": 0.02, "spin": 360, "lo": 113, "ro": 113, "lf": -10, "rf": -10, "headx": -6, "sproutx": 8, "confetti": 0.0}, "happy"),
        (0.8, {"hz": 0.0, "spin": 360, "lo": 105, "ro": 105, "lf": -10, "rf": -10, "headx": -4, "sproutx": -4}, "happy"),
        (1.0, {"spin": 360}, "neutral"),
    ],
    "yawn": [
        (0.0, {}, "neutral"),
        (0.2, {"blink": 0.55, "headx": -6, "lf": 20, "rf": 20, "lo": 40, "ro": 40, "hz": 0.02}, "o"),
        (0.45, {"blink": 0.75, "headx": -12, "lo": 113, "ro": 113, "lf": -10, "rf": -10, "hz": 0.04, "mouth": 0.9, "sproutx": -8}, "o"),
        (0.62, {"blink": 0.7, "headx": -8, "lo": 90, "ro": 90, "lf": -10, "rf": -10, "hz": 0.03, "mouth": 0.6, "sproutx": 4}, "o"),
        (0.8, {"blink": 0.6, "headx": 6, "headz": 5, "hz": -0.01}, "neutral"),
        (0.9, {"blink": 1.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
}


def pose(rig, state, f, n):
    tau = 2 * math.pi
    p = f / n  # 반복 동작용 (0..1, 마지막 다음 = 처음)
    rest(rig)
    hips, head, sprout, bag = rig["hips"], rig["head"], rig["sprout"], rig["bag"]

    if state in CLIPS:
        t = f / (n - 1)  # 한 번 재생: 첫 프레임 0, 마지막 프레임 1 (둘 다 휴식 자세)
        c, expr = sample(CLIPS[state], t)
        apply_channels(rig, c, expr)
        if state == "reveal":
            for i, s in enumerate(rig["card_sparks"]):
                k = 0.6 + 0.4 * math.sin(tau * (2 * t + i / 3))
                s.scale = (k, k, k)
        if state == "celebrate":
            place_confetti(rig, (t - 0.5) / 0.48, t)
        return

    if state == "idle":
        # 모든 항이 p=0에서 0 → idle 첫 프레임 = 휴식 자세
        breath = math.sin(tau * p)
        hip_z = REST_HIP + 0.006 * breath
        hips.location = (0, 0, hip_z)
        hips.rotation_euler = (0, math.radians(1.2) * math.sin(tau * p), 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H, hip_z)
            set_arm(rig, side, math.radians(2.5) * breath * side, math.radians(2) * breath)
        head.rotation_euler = (math.radians(1.5) * breath, 0, math.radians(3) * math.sin(tau * p))
        sprout.rotation_euler = (math.radians(4) * math.sin(tau * p), math.radians(4) * math.sin(2 * tau * p), 0)
        bag.rotation_euler = (0, math.radians(2) * math.sin(tau * p), 0)
        blink = {20: 0.6, 21: 1.0, 22: 0.45}.get(f, 0.0)
        expression(rig, "neutral", blink)

    elif state == "walk":
        stride, lift, stance = 0.14, 0.11, 0.6
        bob = 0.022 * math.cos(tau * (2 * p - 0.6))
        hip_z = HIP_H - 0.012 + bob
        roll = math.radians(3.0) * math.sin(tau * p)
        hips.location = (0.012 * math.sin(tau * p), 0, hip_z)
        hips.rotation_euler = (math.radians(3), roll, math.radians(4) * math.cos(tau * p))
        for side, off in ((-1, 0.0), (1, 0.5)):
            q = (p + off) % 1.0
            if q < stance:
                s = q / stance
                fy, fz = -stride + 2 * stride * s, ANKLE_H
            else:
                s = (q - stance) / (1 - stance)
                e = 0.5 - 0.5 * math.cos(math.pi * s)
                fy, fz = stride - 2 * stride * e, ANKLE_H + lift * math.sin(math.pi * s)
            set_leg(rig, side, fy, fz, hip_z)
        swing = math.radians(32) * math.cos(tau * p)
        set_arm(rig, -1, swing)
        set_arm(rig, 1, -swing)
        head.rotation_euler = (math.radians(-2) + math.radians(1.5) * math.cos(tau * 2 * p), -roll * 0.6, -math.radians(3) * math.cos(tau * p))
        sprout.rotation_euler = (math.radians(7) * math.sin(tau * 2 * p - 1.2), math.radians(5) * math.sin(tau * p - 1.0), 0)
        bag.rotation_euler = (math.radians(9) * math.sin(tau * 2 * p - 1.4), math.radians(6) * math.sin(tau * p - 1.1), 0)
        expression(rig, "neutral")

    elif state == "think":
        # 오른손을 턱에, 고개를 갸웃갸웃, 시선은 위로
        sway = math.sin(tau * p)
        hip_z = REST_HIP + 0.005 * math.sin(2 * tau * p)
        hips.location = (0, 0, hip_z)
        hips.rotation_euler = (0, math.radians(2) * sway, 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H, hip_z)
        set_arm(rig, 1, math.radians(55), math.radians(-30))
        set_arm(rig, -1, math.radians(20), math.radians(-8))
        head.rotation_euler = (math.radians(-6), math.radians(10) + math.radians(6) * sway, math.radians(-8))
        sprout.rotation_euler = (math.radians(3) * math.sin(tau * p), math.radians(-8) * sway, 0)
        bag.rotation_euler = (0, math.radians(2) * sway, 0)
        blink = {12: 0.6, 13: 1.0, 14: 0.45}.get(f, 0.0)
        expression(rig, "neutral", blink, look=(0.012, 0.018))

    elif state == "happy":
        hop = abs(math.sin(tau * p))
        hip_z = REST_HIP + 0.07 * hop
        hips.location = (0, 0, hip_z)
        hips.rotation_euler = (0, math.radians(6) * math.sin(tau * p), 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H + 0.06 * hop, hip_z)
        wave = math.radians(18) * math.sin(tau * 2 * p)
        set_arm(rig, -1, math.radians(-10), math.radians(100) + wave)
        set_arm(rig, 1, math.radians(-10), math.radians(100) + wave)
        head.rotation_euler = (math.radians(-4), math.radians(-6) * math.sin(tau * p), 0)
        sprout.rotation_euler = (math.radians(10) * math.sin(tau * 2 * p - 1.3), math.radians(8) * math.sin(tau * p - 1.0), 0)
        bag.rotation_euler = (math.radians(12) * math.sin(tau * 2 * p - 1.5), math.radians(8) * math.sin(tau * p - 1.2), 0)
        expression(rig, "happy")


# ── 장면·카메라·조명 ─────────────────────────────────
def setup_scene(res, engine):
    sc = bpy.context.scene
    try:
        sc.render.engine = "BLENDER_EEVEE" if engine == "eevee" else "CYCLES"
    except TypeError:
        sc.render.engine = "BLENDER_EEVEE_NEXT"
    if sc.render.engine == "CYCLES":
        sc.cycles.samples = 64
        sc.cycles.use_denoising = True
        sc.cycles.device = "CPU"
    else:
        sc.eevee.taa_render_samples = 64
    sc.render.resolution_x = sc.render.resolution_y = res
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"

    world = bpy.data.worlds.new("World") if not sc.world else sc.world
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (*srgb_to_linear((1.0, 0.96, 0.9)), 1)
    bg.inputs["Strength"].default_value = 0.25

    # 카메라: 점프·꽃가루까지 들어오도록 여유 있게
    target = Vector((0, 0, 1.3))
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 85
    cam = bpy.data.objects.new("Cam", cam_d)
    bpy.context.collection.objects.link(cam)
    el = math.radians(9)
    dist = 7.9
    cam.location = target + Vector((0, -math.cos(el), math.sin(el))) * dist
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam

    def area(name, loc, energy, color, size):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy
        ld.color = color
        ld.size = size
        lo = bpy.data.objects.new(name, ld)
        bpy.context.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = (target - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

    area("Key", (-3.2, -4.0, 4.6), 420, (1.0, 0.9, 0.78), 3.0)
    area("Fill", (4.0, -3.2, 1.6), 90, (0.88, 0.92, 1.0), 5.0)
    area("Rim", (2.5, 4.0, 3.5), 380, (1.0, 0.95, 0.88), 2.0)
    return sc


def render_frame(sc, path):
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def keyframe_all(frame):
    for o in bpy.data.objects:
        if o.type in ("CAMERA", "LIGHT"):
            continue
        o.keyframe_insert("location", frame=frame)
        o.keyframe_insert("rotation_euler", frame=frame)
        o.keyframe_insert("scale", frame=frame)
        o.keyframe_insert("hide_render", frame=frame)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--states", default="all")
    ap.add_argument("--out", default="assets/mascot/render")
    ap.add_argument("--stills", default="")
    ap.add_argument("--res", type=int, default=384)
    ap.add_argument("--engine", default="eevee")
    ap.add_argument("--save", default="")
    ap.add_argument("--only-frame", type=int, default=-1)
    a = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig = build()
    sc = setup_scene(a.res, a.engine)
    rig["facing"] = FACING_DEG

    if a.stills:
        os.makedirs(a.stills, exist_ok=True)
        for name, deg in (("front", 0), ("three-quarter", FACING_DEG), ("side", 90), ("back", 180)):
            rig["facing"] = deg
            pose(rig, "idle", 0, STATES["idle"]["frames"])
            render_frame(sc, os.path.abspath(os.path.join(a.stills, f"{name}.png")))
        rig["facing"] = FACING_DEG
        for st, fr in (("happy", 5), ("surprised", 7), ("reveal", 22), ("celebrate", 30)):
            pose(rig, st, fr, STATES[st]["frames"])
            render_frame(sc, os.path.abspath(os.path.join(a.stills, f"expression-{st}.png")))

    names = list(STATES) if a.states == "all" else [s for s in a.states.split(",") if s in STATES]
    for st in names:
        n = STATES[st]["frames"]
        out = os.path.abspath(os.path.join(a.out, st))
        os.makedirs(out, exist_ok=True)
        for old in os.listdir(out):  # 프레임 수가 줄었을 때 남은 파일 제거
            if old.endswith(".png"):
                os.remove(os.path.join(out, old))
        frames = [a.only_frame] if a.only_frame >= 0 else range(n)
        for f in frames:
            pose(rig, st, f, n)
            render_frame(sc, os.path.join(out, f"{f:04d}.png"))
        print(f"[mascot] {st}: {len(list(frames))} frames -> {out}")

    if a.save:
        n = STATES["walk"]["frames"]
        sc.frame_start, sc.frame_end = 0, n - 1
        sc.render.fps = STATES["walk"]["fps"]
        for f in range(n):
            pose(rig, "walk", f, n)
            keyframe_all(f)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.save))


main()
