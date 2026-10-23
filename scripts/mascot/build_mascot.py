"""
마스코트 "복이" 3D 모델·애니메이션 생성 및 렌더링 (Blender 5.x, 백그라운드 실행).

  blender -b --factory-startup -P scripts/mascot/build_mascot.py -- --states idle,walk --out assets/mascot/render

옵션
  --states   렌더할 동작 (idle,walk,happy,surprised) 쉼표 구분
  --stills   정면·측면·후면·3/4 기준 이미지 렌더 (assets/mascot/reference)
  --res      한 변 해상도(px, 기본 512)
  --engine   eevee | cycles (기본 eevee, 실패하면 cycles)
  --save     .blend 파일 저장 경로

모든 동작은 하나의 모델에서 나오므로 프레임·시점마다 외형이 같다.
모델은 기본 도형으로만 만든다 (외부 에셋·이미지 없음). 좌표 단위는 m, 캐릭터는 -Y 방향(카메라)을 본다.
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Euler, Vector

# ── 설정 ──────────────────────────────────────────────
PALETTE = {
    "cream": (0.965, 0.937, 0.890),
    "cream_light": (1.0, 0.975, 0.94),
    "leaf": (0.435, 0.627, 0.325),
    "stem": (0.306, 0.498, 0.227),
    "bag": (0.925, 0.541, 0.235),
    "bag_dark": (0.788, 0.380, 0.165),
    "strap": (0.541, 0.353, 0.231),
    "gold": (0.949, 0.757, 0.306),
    "eye": (0.227, 0.165, 0.141),
    "cheek": (0.957, 0.639, 0.659),
    "mouth_in": (0.85, 0.42, 0.45),
}

HIP_H = 0.42  # 골반(다리 시작) 높이
THIGH = 0.2
SHIN = 0.2
ANKLE_H = 0.06  # 발목 높이 = 발 메시 반높이 → 발바닥이 z=0
FACING_DEG = 40  # 기본 시점: 화면 오른쪽 앞으로 비스듬히 (걷기 다리 동작이 잘 보이는 각도)

# 동작별 프레임 수·fps (웹 스프라이트 시트와 맞춘다)
STATES = {
    "idle": {"frames": 24, "fps": 12, "loop": True},
    "walk": {"frames": 20, "fps": 20, "loop": True},
    "happy": {"frames": 20, "fps": 20, "loop": True},
    "surprised": {"frames": 16, "fps": 20, "loop": False},
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
        # 클레이 표면: 잔잔한 노이즈 범프
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
        "body": material("Body", PALETTE["cream"], 0.55, sss=0.15, bump=0.06),
        "belly": material("Belly", PALETTE["cream_light"], 0.6, sss=0.1, bump=0.05),
        "leaf": material("Leaf", PALETTE["leaf"], 0.45, bump=0.08),
        "stem": material("Stem", PALETTE["stem"], 0.5),
        "bag": material("Bag", PALETTE["bag"], 0.7, bump=0.15),
        "bag_dark": material("BagDark", PALETTE["bag_dark"], 0.7, bump=0.1),
        "strap": material("Strap", PALETTE["strap"], 0.5, bump=0.05),
        "gold": material("Gold", PALETTE["gold"], 0.35, metal=0.6),
        "eye": material("Eye", PALETTE["eye"], 0.15),
        "white": material("Highlight", (1, 1, 1), 0.2, emit=1.5),
        "cheek": material("Cheek", PALETTE["cheek"], 0.6),
        "mouth_in": material("MouthIn", PALETTE["mouth_in"], 0.5),
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


def tube(name, parent, points, radius, mat, nurbs=True):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 6
    cu.resolution_u = 24
    cu.use_fill_caps = True
    sp = cu.splines.new("NURBS" if nurbs else "POLY")
    sp.points.add(len(points) - 1)
    for p, xyz in zip(sp.points, points):
        p.co = (*xyz, 1)
    if nurbs:
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


# ── 머리 표면 위치·방향 (얼굴 부품을 머리에 붙이기) ──
HEAD_C = Vector((0, 0, 0.54))
HEAD_R = Vector((0.651, 0.6076, 0.5704))


def head_surface(x, z, out=0.0):
    """머리 타원체 앞면 위의 점과 그 점에서 바깥을 향하는 회전"""
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
    hips = empty("Hips", root, (0, 0, HIP_H))
    rig.update(root=root, hips=hips)

    # 몸통 (골반 기준). 아래가 넓은 달걀형
    ellipsoid("Body", hips, (0, 0, 0.3), (0.41, 0.375, 0.44), M["body"])
    ellipsoid("Tail", hips, (0, 0.38, 0.12), (0.07, 0.06, 0.07), M["body"])

    # 머리
    head = empty("Head", hips, (0, 0, 0.66))
    rig["head"] = head
    ellipsoid("HeadMesh", head, tuple(HEAD_C), tuple(HEAD_R), M["body"], seg=64)
    for side in (-1, 1):
        ear = empty(f"Ear.{'L' if side < 0 else 'R'}", head, (side * 0.50, 0.06, 0.92), (0, side * math.radians(22), 0))
        ellipsoid("EarMesh", ear, (0, 0, 0), (0.15, 0.10, 0.15), M["body"])
        ellipsoid("EarInner", ear, (0, -0.075, 0), (0.085, 0.03, 0.085), M["cheek"])
        rig[f"ear{side}"] = ear

    # 눈: 기준점(머리 표면) → 눈알(깜빡임 = z 축소) + 기쁨 눈(^) 곡선
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

    # 머리 위 네잎클로버 새싹 (기준점에서 흔들림)
    sprout = empty("Sprout", head, (0, -0.03, 1.08))
    rig["sprout"] = sprout
    tube("Stem", sprout, [(0, 0, -0.06), (0.0, -0.01, 0.1), (0.04, -0.06, 0.22), (0.05, -0.08, 0.28)], 0.032, M["stem"])
    crown = empty("Crown", sprout, (0.05, -0.08, 0.29), (math.radians(-42), 0, 0))  # 정면에서 네 잎이 보이게
    for k in range(4):
        leaf = empty(f"Leaf{k}", crown, (0, 0, 0), (0, 0, math.radians(45 + 90 * k)))
        tilt = empty("Tilt", leaf, (0, 0, 0), (math.radians(-14), 0, 0))
        for s in (-1, 1):
            ellipsoid("Lobe", tilt, (s * 0.07, -0.13, 0), (0.105, 0.13, 0.032), M["leaf"], rot=(0, 0, s * math.radians(-20)))
    ellipsoid("LeafCenter", crown, (0, 0, 0.01), (0.045, 0.045, 0.03), M["stem"])

    # 팔 (어깨 기준 회전)
    for side in (-1, 1):
        sh = empty(f"Shoulder.{side}", hips, (side * 0.37, -0.02, 0.56), (0, -side * math.radians(14), 0))
        ellipsoid("Arm", sh, (side * 0.03, 0, -0.16), (0.11, 0.11, 0.2), M["body"])
        rig[f"arm{side}"] = sh

    # 다리: 허벅지 → 정강이(무릎) → 발. 각도는 2관절 IK로 매 프레임 계산
    for side in (-1, 1):
        hip_j = empty(f"HipJoint.{side}", hips, (side * 0.15, 0, 0))
        ellipsoid("Thigh", hip_j, (0, 0, -THIGH / 2), (0.13, 0.13, 0.16), M["body"])
        knee = empty(f"Knee.{side}", hip_j, (0, 0, -THIGH))
        ellipsoid("Shin", knee, (0, 0, -SHIN / 2 - 0.01), (0.125, 0.125, 0.15), M["body"])
        foot = empty(f"Ankle.{side}", knee, (0, 0, -SHIN))
        ellipsoid("Foot", foot, (0, -0.035, 0.01), (0.125, 0.15, ANKLE_H + 0.012), M["body"])
        rig[f"hipj{side}"] = hip_j
        rig[f"knee{side}"] = knee
        rig[f"ankle{side}"] = foot

    # 가방끈 (오른쪽 어깨 → 왼쪽 엉덩이, 앞·뒤) + 복주머니
    tube(
        "Strap",
        hips,
        [
            (-0.38, -0.16, 0.36),
            (-0.22, -0.335, 0.37),
            (0.03, -0.37, 0.5),
            (0.23, -0.24, 0.63),
            (0.31, 0.0, 0.69),
            (0.24, 0.23, 0.62),
            (0.02, 0.37, 0.48),
            (-0.26, 0.315, 0.36),
            (-0.39, 0.05, 0.37),
        ],
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
    return rig


# ── 2관절 다리 IK (무릎은 앞으로 굽음) ──────────────────
def solve_leg(target_y, target_z):
    """골반 관절 기준 발목 목표 (y: +뒤, z: 위) → (허벅지 각, 무릎 각) X축 회전(rad)"""
    d = math.hypot(target_y, target_z)
    d = min(d, THIGH + SHIN - 1e-4)
    phi = math.atan2(target_y, -target_z)  # 아래 방향 기준 목표 각
    a = math.acos(max(-1, min(1, (THIGH**2 + d**2 - SHIN**2) / (2 * THIGH * d))))
    b = math.acos(max(-1, min(1, (THIGH**2 + SHIN**2 - d**2) / (2 * THIGH * SHIN))))
    return phi - a, math.pi - b


def set_leg(rig, side, foot_y, foot_z, hip_z):
    """foot_y·foot_z: 몸 기준 발목 위치 (y 음수 = 앞), hip_z: 골반 높이"""
    t1, t2 = solve_leg(foot_y, foot_z - hip_z)
    rig[f"hipj{side}"].rotation_euler = (t1, 0, 0)
    rig[f"knee{side}"].rotation_euler = (t2, 0, 0)
    rig[f"ankle{side}"].rotation_euler = (-(t1 + t2), 0, 0)  # 발바닥은 땅과 평행


def expression(rig, kind, blink=0.0):
    """kind: neutral | happy | surprised. blink: 0(뜸)~1(감음)"""
    for side in (-1, 1):
        ball, arc = rig[f"eye{side}"], rig[f"happy{side}"]
        happy = kind == "happy"
        ball.hide_render = ball.hide_viewport = happy
        arc.hide_render = arc.hide_viewport = not happy
        k = 1.3 if kind == "surprised" else 1.0
        ball.scale = (0.058 * k, 0.03, 0.088 * k * max(0.08, 1 - blink))
    show = {"neutral": "smile", "happy": "mouth_open", "surprised": "mouth_o"}[kind]
    for key in ("smile", "mouth_open", "mouth_o"):
        o = rig[key]
        hidden = key != show
        for ob in [o, *o.children_recursive]:
            ob.hide_render = ob.hide_viewport = hidden


# ── 동작 ──────────────────────────────────────────────
def pose(rig, state, f, n):
    p = f / n  # 0..1 (루프)
    tau = 2 * math.pi
    hips, head, sprout, bag = rig["hips"], rig["head"], rig["sprout"], rig["bag"]
    arm_l, arm_r = rig["arm-1"], rig["arm1"]
    base_arm = math.radians(14)

    if state == "walk":
        stride, lift, stance = 0.14, 0.11, 0.6
        bob = 0.022 * math.cos(tau * (2 * p - 2 * 0.3))  # 디딤발이 수직일 때 가장 높음
        hip_z = HIP_H - 0.012 + bob
        roll = math.radians(3.0) * math.sin(tau * p)
        hips.location = (0.012 * math.sin(tau * p), 0, hip_z)
        hips.rotation_euler = (math.radians(3), roll, math.radians(4) * math.cos(tau * p))
        for side, off in ((-1, 0.0), (1, 0.5)):
            q = (p + off) % 1.0
            if q < stance:  # 디딤: 앞(-y)에서 뒤(+y)로 일정 속도 (제자리 걷기)
                s = q / stance
                fy, fz = -stride + 2 * stride * s, ANKLE_H
            else:  # 들기: 뒤에서 앞으로, 부드럽게 들어 올림
                s = (q - stance) / (1 - stance)
                e = 0.5 - 0.5 * math.cos(math.pi * s)
                fy, fz = stride - 2 * stride * e, ANKLE_H + lift * math.sin(math.pi * s)
            # 골반 좌표로 변환 (골반 위치·기울기는 작아서 높이만 보정)
            set_leg(rig, side, fy, fz, hip_z)
        swing = math.radians(32) * math.cos(tau * p)
        arm_l.rotation_euler = (-swing, base_arm, 0)  # 왼팔(-x)은 +Y 회전이 바깥쪽
        arm_r.rotation_euler = (swing, -base_arm, 0)
        head.rotation_euler = (math.radians(-2) + math.radians(1.5) * math.cos(tau * 2 * p), -roll * 0.6, -math.radians(3) * math.cos(tau * p))
        sprout.rotation_euler = (math.radians(7) * math.sin(tau * 2 * p - 1.2), math.radians(5) * math.sin(tau * p - 1.0), 0)
        bag.rotation_euler = (math.radians(9) * math.sin(tau * 2 * p - 1.4), math.radians(6) * math.sin(tau * p - 1.1), 0)
        expression(rig, "neutral")

    elif state == "idle":
        breath = math.sin(tau * p)
        hip_z = HIP_H - 0.02 + 0.006 * breath
        hips.location = (0, 0, hip_z)
        hips.rotation_euler = (0, math.radians(1.2) * math.sin(tau * p), 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H, hip_z)
        arm_l.rotation_euler = (math.radians(3) * breath, base_arm + math.radians(2) * breath, 0)
        arm_r.rotation_euler = (-math.radians(3) * breath, -base_arm - math.radians(2) * breath, 0)
        head.rotation_euler = (math.radians(1.5) * breath, 0, math.radians(2.5) * math.sin(tau * p + 0.5))
        sprout.rotation_euler = (math.radians(4) * math.sin(tau * p - 0.8), math.radians(5) * math.sin(tau * p + 0.6), 0)
        bag.rotation_euler = (0, math.radians(2) * math.sin(tau * p - 0.6), 0)
        # 한 번 깜빡임 (2프레임 감고 뜸)
        blink = {16: 0.6, 17: 1.0, 18: 0.5}.get(f, 0.0)
        expression(rig, "neutral", blink)

    elif state == "happy":
        hop = abs(math.sin(tau * p))  # 한 루프에 두 번 콩콩
        hip_z = HIP_H - 0.02 + 0.07 * hop
        hips.location = (0, 0, hip_z)
        hips.rotation_euler = (0, math.radians(6) * math.sin(tau * p), 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H + 0.06 * hop, hip_z)  # 발도 함께 뜸
        wave = math.radians(18) * math.sin(tau * 2 * p)
        arm_l.rotation_euler = (0, math.radians(135) + wave, 0)
        arm_r.rotation_euler = (0, -math.radians(135) - wave, 0)
        head.rotation_euler = (math.radians(-4), math.radians(-6) * math.sin(tau * p), 0)
        sprout.rotation_euler = (math.radians(10) * math.sin(tau * 2 * p - 1.3), math.radians(8) * math.sin(tau * p - 1.0), 0)
        bag.rotation_euler = (math.radians(12) * math.sin(tau * 2 * p - 1.5), math.radians(8) * math.sin(tau * p - 1.2), 0)
        expression(rig, "happy")

    elif state == "surprised":
        # 0~5: 움찔하며 뒤로·위로, 이후 천천히 정착 (한 번 재생 후 마지막 프레임 유지)
        t = f / max(1, n - 1)
        jolt = math.sin(math.pi * min(1.0, t * 2.2)) * math.exp(-2.5 * t) if t < 0.95 else 0.0
        settle = 1 - math.exp(-6 * t)
        hip_z = HIP_H - 0.02 + 0.05 * jolt
        hips.location = (0, 0.03 * settle, hip_z)
        hips.rotation_euler = (math.radians(-6) * settle, 0, 0)
        for side in (-1, 1):
            set_leg(rig, side, 0.0, ANKLE_H + 0.04 * jolt, hip_z)
        up = math.radians(70) * settle
        arm_l.rotation_euler = (0, base_arm + up, 0)
        arm_r.rotation_euler = (0, -base_arm - up, 0)
        head.rotation_euler = (math.radians(-5) * settle, 0, 0)
        sprout.rotation_euler = (math.radians(-18) * settle + math.radians(8) * math.sin(tau * 2.5 * t) * (1 - t), 0, 0)
        bag.rotation_euler = (math.radians(10) * math.sin(tau * 2 * t) * (1 - t), 0, 0)
        expression(rig, "surprised")


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
    sc.view_settings.exposure = 0.0
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"

    world = bpy.data.worlds.new("World") if not sc.world else sc.world
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    bg.inputs["Color"].default_value = (*srgb_to_linear((1.0, 0.96, 0.9)), 1)
    bg.inputs["Strength"].default_value = 0.25

    target = Vector((0, 0, 1.22))
    cam_d = bpy.data.cameras.new("Cam")
    cam_d.lens = 85
    cam = bpy.data.objects.new("Cam", cam_d)
    bpy.context.collection.objects.link(cam)
    el = math.radians(9)
    dist = 7.1
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


def keyframe_all(rig, frame):
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
    ap.add_argument("--states", default="idle,walk")
    ap.add_argument("--out", default="assets/mascot/render")
    ap.add_argument("--stills", default="")
    ap.add_argument("--res", type=int, default=512)
    ap.add_argument("--engine", default="eevee")
    ap.add_argument("--save", default="")
    ap.add_argument("--only-frame", type=int, default=-1, help="검수용: 한 프레임만 렌더")
    a = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig = build()
    sc = setup_scene(a.res, a.engine)
    root = rig["root"]

    if a.stills:
        os.makedirs(a.stills, exist_ok=True)
        pose(rig, "idle", 0, STATES["idle"]["frames"])
        for name, deg in (("front", 0), ("three-quarter", FACING_DEG), ("side", 90), ("back", 180)):
            root.rotation_euler = (0, 0, math.radians(deg))
            render_frame(sc, os.path.abspath(os.path.join(a.stills, f"{name}.png")))
        for st in ("happy", "surprised"):
            root.rotation_euler = (0, 0, math.radians(FACING_DEG))
            n = STATES[st]["frames"]
            pose(rig, st, n // 4 if st == "happy" else n - 1, n)
            render_frame(sc, os.path.abspath(os.path.join(a.stills, f"expression-{st}.png")))

    root.rotation_euler = (0, 0, math.radians(FACING_DEG))
    for st in [s for s in a.states.split(",") if s in STATES]:  # --states=none: 기준 이미지만
        cfg = STATES[st]
        n = cfg["frames"]
        out = os.path.abspath(os.path.join(a.out, st))
        os.makedirs(out, exist_ok=True)
        frames = [a.only_frame] if a.only_frame >= 0 else range(n)
        for f in frames:
            pose(rig, st, f, n)
            render_frame(sc, os.path.join(out, f"{f:04d}.png"))
        print(f"[mascot] {st}: {len(list(frames))} frames → {out}")

    if a.save:
        # 편집용: walk 루프를 키프레임으로 저장
        n = STATES["walk"]["frames"]
        sc.frame_start, sc.frame_end = 0, n - 1
        sc.render.fps = STATES["walk"]["fps"]
        for f in range(n):
            pose(rig, "walk", f, n)
            keyframe_all(rig, f)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.save))


main()
