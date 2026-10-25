"""
마스코트 "별이" (Aurora Fox, BlenderKit 무료·royalty free) 애니메이션 렌더 (Blender 5.x, 백그라운드 실행).

  blender -b --factory-startup -P scripts/mascot/build_fox.py -- --model assets/reference/aurora-fox.glb --states all --out assets/mascot/render --res 640

- 모델 파일은 저장소에 넣지 않는다 (라이선스: 프로젝트에 쓰는 것은 되지만 모델 파일 재배포는 안 됨).
  받는 방법은 scripts/mascot/fetch_fox.mjs
- 출력 이름·형식은 복이(build_mascot.py)와 같다 → encode.mjs·웹앱은 그대로 쓴다.
- 네 발 동물이라 손으로 쥐는 동작 대신: 앞발 흔들기, 꼬리 흔들기, 깡충, 기지개 등. 의상 소품은 옆에 두거나 공중에 띄운다.
- glTF로 가져오면 Rigify 제어(제약)는 사라지므로 변형용 뼈(DEF-)와 꼬리 기준 뼈(MCH-ROT-tail)를 직접 돌린다.
  · 머리: DEF-spine.009~011 (눈은 DEF-spine.011 에 다시 붙인다)
  · 몸통: DEF-spine.004~008, 꼬리: MCH-ROT-tail(+ spine.003~001 곡선)
  · 앞다리: DEF-front_thigh/shin.{L,R}, 뒷다리: DEF-thigh/shin.{L,R}
"""

import argparse
import importlib.util
import json
import math
import os
import random
import sys

import bpy
from mathutils import Euler, Matrix, Vector

# 복이 스크립트의 도우미(재질·도형·보간·장면 설정)를 가져다 쓴다
_spec = importlib.util.spec_from_file_location("bokki", os.path.join(os.path.dirname(os.path.abspath(__file__)), "build_mascot.py"))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)

SCALE = 2.6  # 모델(높이 약 0.73m)을 복이 무대 크기에 맞춤
FACING_DEG = 32
REST_Z = 0.0

STATES = dict(B.STATES)
OUTFIT_STATES = ["idle", "wave", "nod", "surprised"]
OUTFITS = {
    "default": {},
    "saju": {"signature": "read"},
    "tarot": {"signature": "draw"},
    "star": {"signature": "stargaze"},
}


# ── 모델 가져오기 ─────────────────────────────────────
def import_fox(path):
    bpy.ops.import_scene.gltf(filepath=path)
    for o in list(bpy.data.objects):
        if o.name.startswith("Icosphere"):
            bpy.data.objects.remove(o)  # 미리보기용 구
    arm = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    # 눈을 머리 변형 뼈에 다시 붙인다 (원래는 제어 뼈 head 에 붙어 있어 머리를 돌려도 따라오지 않음)
    bpy.context.view_layer.update()
    eyes = []
    for o in bpy.data.objects:
        if o.type == "MESH" and "Eye" in o.name:
            mw = o.matrix_world.copy()
            o.parent = arm
            o.parent_type = "BONE"
            o.parent_bone = "DEF-spine.011"
            bpy.context.view_layer.update()
            o.matrix_world = mw
            eyes.append(o)
    # 전체를 키우고 몸 중심이 원점에 오게 (돌아서도 화면 가운데)
    root = B.empty("Root")
    arm.parent = root
    arm.scale = (SCALE,) * 3
    arm.location = (0, -0.22 * SCALE, 0)
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
    # 숨쉬기는 몸통 뼈(DEF-spine.005~007)만 부풀린다. 목·머리 뼈가 그 배율을 물려받으면
    # 숨쉴 때마다 얼굴이 최대 9% 커지므로, 목의 첫 뼈부터는 부모 배율을 물려받지 않게 한다
    arm.data.bones["DEF-spine.008"].inherit_scale = "NONE"
    body = next(o for o in bpy.data.objects if o.type == "MESH" and o.name == "Body")
    return {"root": root, "arm": arm, "pb": arm.pose.bones, "eyes": eyes, "body": body}


def toon_textured(m):
    """원래 색 텍스처(구운 색) × 부드러운 명암 램프 → 발광 (소프트 2.5D)"""
    nt = m.node_tree
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE" and n.image and "clr" in n.image.name), None)
    bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
    out = next((n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"), None)
    if not (tex and out):
        return
    diff = nt.nodes.new("ShaderNodeBsdfDiffuse")
    s2r = nt.nodes.new("ShaderNodeShaderToRGB")
    nt.links.new(diff.outputs[0], s2r.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.interpolation = "EASE"
    e0, e1 = ramp.color_ramp.elements
    e0.position, e0.color = 0.1, (0.72, 0.68, 0.86, 1)  # 그림자는 살짝 보랏빛
    e1.position, e1.color = 0.5, (1, 1, 1, 1)
    nt.links.new(s2r.outputs["Color"], ramp.inputs["Fac"])
    mul = nt.nodes.new("ShaderNodeMix")
    mul.data_type = "RGBA"
    mul.blend_type = "MULTIPLY"
    mul.inputs["Factor"].default_value = 1.0
    nt.links.new(tex.outputs["Color"], mul.inputs[6])
    nt.links.new(ramp.outputs["Color"], mul.inputs[7])
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.05
    nt.links.new(mul.outputs[2], em.inputs["Color"])
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    if bsdf:
        nt.nodes.remove(bsdf)


def clean_eye_sockets(img):
    """
    몸 텍스처에 눈 자리가 어두운 원으로 칠해져 있어, 눈을 감거나 웃을 때(눈 오브젝트를 숨길 때) 자국이 보인다.
    어두운 청록 부분을 찾아 주변 피부색으로 채운다(확산 보간). 눈을 뜬 상태에서는 눈 오브젝트가 덮으므로 차이가 없다.
    """
    import numpy as np

    w, h = img.size
    px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    rgb = px[..., :3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    mask = (lum < 0.42) & (rgb[..., 1] > rgb[..., 0] * 0.95) & (rgb[..., 2] > rgb[..., 0] * 0.95) & (px[..., 3] > 0.5)

    def grow(m, n):
        for _ in range(n):
            m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
        return m

    # 눈 크기의 둥근 어두운 덩어리만 고른다 (텍스처 조각 가장자리 같은 가늘고 긴 부분은 제외)
    from collections import deque

    lab = np.zeros(mask.shape, dtype=np.int32)
    blobs = []
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        lab[y0, x0] = len(blobs) + 1
        q = deque([(y0, x0)])
        pts = []
        while q:
            y, x = q.popleft()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                    lab[ny, nx] = len(blobs) + 1
                    q.append((ny, nx))
        ys = np.array([p[0] for p in pts])
        xs = np.array([p[1] for p in pts])
        bh, bw = np.ptp(ys) + 1, np.ptp(xs) + 1
        area = len(pts)
        ok = 800 < area < 20000 and area / (bh * bw) > 0.55 and 0.6 < bw / bh < 1.6
        if ok:
            # 둘레가 밝은 피부여야 눈 자국 (텍스처 조각 가장자리의 검은 배경과 구분)
            cy, cx, r = ys.mean(), xs.mean(), (area / math.pi) ** 0.5
            ang = np.linspace(0, 2 * math.pi, 48, endpoint=False)
            ry = np.clip((cy + np.sin(ang) * r * 2.6).astype(int), 0, h - 1)
            rx = np.clip((cx + np.cos(ang) * r * 2.6).astype(int), 0, w - 1)
            frac = float((lum[ry, rx] > 0.45).mean())
            if os.environ.get("FOX_DEBUG"):
                print(f"[fox] 후보 area={area} c=({cy:.0f},{cx:.0f}) r={r:.1f} 둘레밝음={frac:.2f} 둘레lum={float(lum[ry, rx].mean()):.2f}")
            ok = frac > 0.75
        blobs.append((ys.mean(), xs.mean(), (area / math.pi) ** 0.5) if ok else None)
    yy, xx = np.mgrid[0:h, 0:w]
    mask = np.zeros_like(mask)
    found = [b for b in blobs if b]
    for cy, cx, r in found:
        mask |= (yy - cy) ** 2 + (xx - cx) ** 2 <= (r * 2.1) ** 2  # 어두운 테두리까지 덮게
    valid = lum > 0.06  # 검은 배경(텍스처 조각 밖)은 채울 때 쓰지 않는다
    mask &= valid
    print(f"[fox] 눈 자국 {len(found)}개")
    # 바깥 피부색에서 안쪽으로 번져 들어가며 채운다 (알려진 이웃만 평균)
    out = rgb.copy()
    known = (valid & ~mask).astype(np.float32)
    out[mask] = 0
    for _ in range(900):
        wsum = np.roll(known, 1, 0) + np.roll(known, -1, 0) + np.roll(known, 1, 1) + np.roll(known, -1, 1)
        csum = sum(np.roll(out * known[..., None], sh, ax) for sh, ax in ((1, 0), (-1, 0), (1, 1), (-1, 1)))
        fill = mask & (wsum > 0)
        out[fill] = csum[fill] / wsum[fill][:, None]
        known = np.where(fill, 1.0, known).astype(np.float32)
    px[..., :3] = out
    img.pixels.foreach_set(px.ravel())
    img.update()
    print(f"[fox] 눈 자리 정리: {int(mask.sum())}px")


def stylize(fox):
    for img in bpy.data.images:
        if "Body_bake_clr" in img.name:
            clean_eye_sockets(img)
    for m in bpy.data.materials:
        if m.use_nodes and any(n.type == "TEX_IMAGE" for n in m.node_tree.nodes):
            if "Eye" in m.name:
                continue  # 눈은 반짝이는 원래 재질 그대로
            toon_textured(m)


# ── 얼굴: 기쁜 눈(^ ^) ───────────────────────────────
def build_face(fox):
    M = B.mats()
    arcs = []
    for e in fox["eyes"]:
        anchor = B.empty(f"Arc.{e.name}", None)
        anchor.parent = fox["arm"]
        anchor.parent_type = "BONE"
        anchor.parent_bone = "DEF-spine.011"
        bpy.context.view_layer.update()
        c = e.matrix_world.translation.copy()
        anchor.matrix_world = Matrix.Translation(c + Vector((0, -0.12, 0)))
        r = 0.09
        arc = B.tube("HappyArc", anchor, [(-r, 0, -0.02), (0, -0.01, r * 0.6), (r, 0, -0.02)], 0.02, M["eye"])
        arcs.append(arc)
    fox["arcs"] = arcs


def expression(fox, kind="neutral", blink=0.0):
    happy = kind == "happy"
    for e in fox["eyes"]:
        e.hide_render = happy
        k = 1.15 if kind == "surprised" else 1.0
        e.scale = (k, k, k * max(0.08, 1 - blink))
    for a in fox["arcs"]:
        a.hide_render = not happy


# ── 의상·소품 ─────────────────────────────────────────
def head_point(fox, up=0.0, fwd=0.0):
    """머리 꼭대기 근처 (세계 좌표, 휴식 자세 기준)"""
    bpy.context.view_layer.update()
    arm = fox["arm"]
    b = arm.pose.bones["DEF-spine.011"]
    top = arm.matrix_world @ b.tail
    return top + Vector((0, -fwd, up))


def attach_to_head(fox, obj):
    mw = obj.matrix_world.copy()
    obj.parent = fox["arm"]
    obj.parent_type = "BONE"
    obj.parent_bone = "DEF-spine.011"
    bpy.context.view_layer.update()
    obj.matrix_world = mw


def head_top(fox):
    """정수리(귀 사이 가장 높은 곳)와 귀 끝 높이 (세계 좌표, 휴식 자세·정면 기준).
    머리 뼈 끝(head_point)은 머리 속 깊은 곳이라 모자를 거기 붙이면 묻힌다 → 실제 몸 메시 표면에서 잰다."""
    bpy.context.view_layer.update()
    body = fox["body"]
    ev = body.evaluated_get(bpy.context.evaluated_depsgraph_get())
    me = ev.to_mesh()
    pts = [body.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    head = [p for p in pts if p.z > 1.0 and p.y < 0.2]  # 꼬리(뒤쪽 높은 곳) 제외
    crown = max((p for p in head if abs(p.x) < 0.12), key=lambda p: p.z)
    ear = max((p for p in head if 0.2 < abs(p.x) < 0.5), key=lambda p: p.z)
    return crown.copy(), ear.z, abs(ear.x)


def build_outfits(fox):
    M = B.mats()
    M["bead"] = B.material("Bead", (0.95, 0.62, 0.32), 0.25, emit=0.35)
    M["gat"] = B.material("GatSheer", (0.10, 0.09, 0.13), 0.25)
    M["magic"] = B.material("Magic", (0.78, 0.66, 1.0), 0.3, emit=1.4)
    g = {}
    crown, ear_z, ear_x = head_top(fox)
    cx, cy = 0.0, crown.y

    # 사주: 갓 — 넓은 챙이 두 귀 끝 위에 살짝 얹히고, 갓끈(구슬)이 얼굴 양옆으로 늘어진다
    gat = B.empty("Hat.saju", None)
    gat.location = Vector((cx, cy - 0.02, ear_z + 0.01))
    B.cylinder("GatBrim", gat, (0, 0, 0), 0.6, 0.018, M["gat"], bevel=0.006)
    B.cylinder("GatCrown", gat, (0, 0, 0.17), 0.2, 0.32, M["gat"], r2=0.185, bevel=0.03)
    B.torus("GatBand", gat, (0, 0, 0.03), 0.205, 0.016, M["gat"])
    B.torus("GatRim", gat, (0, 0, 0.0), 0.6, 0.008, M["gat"])
    for side in (-1, 1):
        pts = [(side * 0.42, -0.1, -0.01), (side * 0.5, -0.32, -0.32), (side * 0.4, -0.42, -0.62)]
        B.tube(f"GatString{side}", gat, pts, 0.01, M["strap"])
        for k, t in enumerate((0.25, 0.5, 0.75, 1.0)):
            a = Vector(pts[0]).lerp(Vector(pts[1]), min(1, t * 2)) if t <= 0.5 else Vector(pts[1]).lerp(Vector(pts[2]), (t - 0.5) * 2)
            B.ellipsoid(f"GatBead{side}{k}", gat, tuple(a), (0.032, 0.032, 0.032), M["bead"])
    gat.rotation_euler = (math.radians(-5), 0, 0)
    attach_to_head(fox, gat)

    # 타로: 끝이 휘어진 큰 마법사 모자 (머리를 덮고 귀는 모자 속으로) + 금띠·별
    wiz = B.empty("Hat.tarot", None)
    wiz.location = Vector((cx + 0.02, cy, crown.z + 0.07))
    B.cylinder("HatBrim", wiz, (0, 0, 0), 0.56, 0.035, M["wizard_dark"], bevel=0.014)
    B.cylinder("HatCone", wiz, (0, 0, 0.3), 0.37, 0.58, M["wizard"], r2=0.13, bevel=0.012)
    tip = B.empty("HatTip", wiz, (0.04, 0, 0.57), (0, math.radians(34), 0))
    B.cylinder("HatTipCone", tip, (0, 0, 0.16), 0.13, 0.34, M["wizard"], r2=0.015, bevel=0.006)
    B.ellipsoid("HatTipBall", tip, (0, 0, 0.34), (0.045, 0.045, 0.045), M["gold"])
    B.torus("HatBand", wiz, (0, 0, 0.07), 0.355, 0.03, M["gold"])
    B.star("HatStar", wiz, (0.02, -0.29, 0.3), 0.075, 0.016, M["gold"], rot=(math.radians(-72), 0, 0))
    B.star("HatStar2", wiz, (-0.17, -0.22, 0.46), 0.045, 0.012, M["gold"], rot=(math.radians(-70), 0, math.radians(-30)))
    B.star("HatStar3", wiz, (0.19, -0.2, 0.16), 0.04, 0.012, M["gold"], rot=(math.radians(-70), 0, math.radians(30)))
    wiz.rotation_euler = (math.radians(-6), math.radians(9), 0)
    attach_to_head(fox, wiz)

    # 별자리: 한쪽으로 기울여 쓴 큰 베레모 + 꼭지 + 별 핀
    ber = B.empty("Hat.star", None)
    ber.location = Vector((cx + 0.07, cy, crown.z + 0.07))
    B.ellipsoid("Beret", ber, (0, 0, 0), (0.54, 0.5, 0.15), M["navy"])
    B.torus("BeretRim", ber, (0, 0, -0.07), 0.47, 0.03, M["navy"])
    B.ellipsoid("BeretNub", ber, (0, 0, 0.15), (0.05, 0.05, 0.05), M["navy"])
    B.star("BeretPin", ber, (0.27, -0.36, -0.02), 0.08, 0.016, M["gold"], rot=(math.radians(-70), 0, math.radians(-25)))
    ber.rotation_euler = (math.radians(-4), math.radians(-16), 0)
    attach_to_head(fox, ber)
    g["saju"], g["tarot"], g["star"] = gat, wiz, ber

    # 옆에 띄우는 소품 (월드 좌표, 동작마다 위치·회전을 정한다). 아래에 빛 고리·반짝이를 두어 '마법으로 떠 있는' 느낌
    def magic_ring(name, parent, z):
        ring = B.empty(name, parent, (0, 0, z), (math.radians(62), 0, 0))
        B.torus("Ring", ring, (0, 0, 0), 0.22, 0.009, M["magic"])
        B.torus("RingIn", ring, (0, 0, 0), 0.14, 0.006, M["magic"])
        sparks = [B.star(f"Twinkle{i}", ring, (math.cos(a) * 0.26, math.sin(a) * 0.1, 0.06 + 0.05 * i), 0.035, 0.008, M["glow"]) for i, a in enumerate((0.6, 2.6, 4.4))]
        return sparks

    book = B.empty("Prop.book", None)
    for side in (-1, 1):
        half = B.empty(f"BookHalf.{side}", book)
        B.rounded_box("Cover", half, (side * 0.16, 0, 0), (0.32, 0.035, 0.44), M["book"], bevel=0.014)
        B.rounded_box("Pages", half, (side * 0.15, -0.03, 0), (0.29, 0.03, 0.41), M["page"], bevel=0.006)
        # 표지 금장식 (모서리 + 가운데 원)
        B.rounded_box("CoverCorner", half, (side * 0.285, 0.02, 0.19), (0.06, 0.006, 0.06), M["gold"], bevel=0.004)
        B.rounded_box("CoverCorner2", half, (side * 0.285, 0.02, -0.19), (0.06, 0.006, 0.06), M["gold"], bevel=0.004)
        B.torus("CoverEmblem", half, (side * 0.16, 0.022, 0), 0.06, 0.009, M["gold"], rot=(math.pi / 2, 0, 0))
        fox[f"book{side}"] = half
    B.cylinder("Spine", book, (0, 0.01, 0), 0.028, 0.44, M["book"])
    page = B.empty("Page", book, (0, -0.045, 0))
    B.rounded_box("TurnPage", page, (0.145, 0, 0), (0.29, 0.006, 0.4), M["page"], bevel=0.003)
    fox["page"] = page
    fox["book_sparks"] = magic_ring("BookMagic", book, -0.34)

    fan = B.empty("Prop.cards", None)
    for i, ang in enumerate((-22, 0, 22)):
        c = B.empty(f"FanCard{i}", fan, (0, -i * 0.012, 0), (0, math.radians(ang), 0))
        B.rounded_box("TCard", c, (0, 0, 0.22), (0.26, 0.02, 0.4), M["card"], bevel=0.016)
        B.rounded_box("TEdge", c, (0, -0.013, 0.22), (0.21, 0.004, 0.33), M["gold"], bevel=0.003)
        B.rounded_box("TFace", c, (0, -0.017, 0.22), (0.18, 0.004, 0.3), M["card"], bevel=0.003)
        B.star("TStar", c, (0, -0.022, 0.22), 0.06, 0.012, M["glow"])
        if i == 1:
            fox["fan_mid"] = c
    fox["fan_sparks"] = magic_ring("FanMagic", fan, -0.08)

    scope = B.empty("Prop.scope", None)
    tri = B.empty("Tripod", scope)
    for k in range(3):
        a = math.radians(90 + 120 * k)
        B.tube(f"Leg{k}", tri, [(0, 0, 0), (math.cos(a) * 0.3, math.sin(a) * 0.3, -0.98)], 0.022, M["brass"])
    head = B.empty("ScopeHead", scope)
    fox["scope_head"] = head
    B.cylinder("Tube1", head, (0, -0.18, 0), 0.085, 0.5, M["navy"], rot=(math.pi / 2, 0, 0), bevel=0.012)
    B.torus("TubeBand", head, (0, -0.3, 0), 0.088, 0.012, M["brass"], rot=(math.pi / 2, 0, 0))
    B.cylinder("Tube2", head, (0, -0.52, 0), 0.11, 0.22, M["brass"], rot=(math.pi / 2, 0, 0), bevel=0.012)
    B.cylinder("Eyepiece", head, (0, 0.12, 0), 0.05, 0.12, M["brass"], rot=(math.pi / 2, 0, 0), bevel=0.008)
    B.cylinder("ScopeLens", head, (0, -0.635, 0), 0.1, 0.012, M["lens"], rot=(math.pi / 2, 0, 0))
    fox["props"] = {"saju": book, "tarot": fan, "star": scope}
    fox["hats"] = g
    fox["sky"] = [B.star(f"Sky{i}", None, (0, 0, 0), 0.09 - i * 0.015, 0.02, M["glow"]) for i in range(3)]

    # 운세 카드 (reveal·draw): 머리 위에 떠오른다
    card = B.empty("RevealCard", None)
    B.rounded_box("Card", card, (0, 0, 0), (0.36, 0.03, 0.54), M["card"], bevel=0.02)
    B.rounded_box("CardEdge", card, (0, -0.018, 0), (0.3, 0.005, 0.46), M["gold"], bevel=0.004)
    B.rounded_box("CardFace", card, (0, -0.023, 0), (0.27, 0.005, 0.43), M["card"], bevel=0.004)
    B.star("CardStar", card, (0, -0.03, 0), 0.1, 0.02, M["glow"])
    fox["card"] = card
    fox["sparks"] = [B.star(f"Spark{i}", card, (x, -0.04, z), 0.05, 0.015, M["glow"]) for i, (x, z) in enumerate([(-0.3, 0.3), (0.3, 0.2), (0.22, 0.42)])]

    # 꽃가루 (celebrate)
    rnd = random.Random(7)
    pieces = []
    for i in range(22):
        o = B.rounded_box(f"Confetti{i}", fox["root"], (0, 0, 0), (0.06, 0.014, 0.036), M["confetti"][i % len(B.CONFETTI_COLORS)], bevel=0.004)
        a = rnd.uniform(0, 2 * math.pi)
        speed = rnd.uniform(1.0, 1.9)
        pieces.append({"o": o, "v": Vector((math.cos(a) * speed * 0.42, -abs(math.sin(a)) * 0.35 - 0.15, rnd.uniform(1.9, 2.5))), "spin": rnd.uniform(4, 9), "axis": rnd.choice("XYZ")})
    fox["confetti"] = pieces


def set_outfit(fox, name):
    fox["outfit"] = name
    for key, hat in fox["hats"].items():
        for ob in [hat, *hat.children_recursive]:
            ob.hide_render = key != name
    for key, prop in fox["props"].items():
        for ob in [prop, *prop.children_recursive]:
            ob.hide_render = key != name
    for s in fox["sky"]:
        s.hide_render = name != "star"


# ── 자세 ─────────────────────────────────────────────
CHANNELS = [
    "z", "y", "pitch", "roll", "spin",  # 몸 전체 (높이·앞뒤·숙임·기울임·제자리 회전)
    "headx", "heady", "headz",  # 고개 끄덕·갸웃·돌리기 (도)
    "tailx", "tailz",  # 꼬리 들기·흔들기
    "flx", "frx", "fl_knee", "fr_knee",  # 앞다리 (L=화면 먼 쪽, R=가까운 쪽)
    "hlx", "hrx", "hl_knee", "hr_knee",  # 뒷다리
    "breath", "blink", "card", "confetti", "p1", "p2",
]


def apply_pose(fox, c, expr):
    root, pb = fox["root"], fox["pb"]
    root.location = (0, c["y"], REST_Z + c["z"])
    root.rotation_euler = (math.radians(c["pitch"]), math.radians(c["roll"]), math.radians(fox["facing"] + c["spin"]))
    for pbone in pb:
        pbone.rotation_euler = (0, 0, 0)
        pbone.scale = (1, 1, 1)
    # 머리: 목·머리 뼈에 나눠 준다 (자연스러운 곡선)
    for bn, k in (("DEF-spine.009", 0.3), ("DEF-spine.010", 0.4), ("DEF-spine.011", 0.3)):
        pb[bn].rotation_euler = (math.radians(c["headx"] * k), math.radians(c["heady"] * k), math.radians(c["headz"] * k))
    # 꼬리: 뿌리에서 들고 흔들고, 끝으로 갈수록 휘게
    pb["MCH-ROT-tail"].rotation_euler = (math.radians(c["tailx"]), 0, math.radians(c["tailz"]))
    for bn, k in (("spine.003", 0.35), ("spine.002", 0.3), ("spine.001", 0.25)):
        pb[bn].rotation_euler = (0, 0, math.radians(c["tailz"] * k))
    # 숨쉬기: 몸통을 아주 살짝 부풀림
    br = 1 + 0.025 * c["breath"]
    for bn in ("DEF-spine.005", "DEF-spine.006", "DEF-spine.007"):
        pb[bn].scale = (br, 1, br)
    # 다리: 허벅지 앞뒤 + 무릎 굽힘 (부호는 뼈 축 방향에 맞춤: + = 앞으로)
    pb["DEF-front_thigh.L"].rotation_euler = (math.radians(c["flx"]), 0, 0)
    pb["DEF-front_thigh.R"].rotation_euler = (math.radians(c["frx"]), 0, 0)
    pb["DEF-front_shin.L"].rotation_euler = (math.radians(-c["fl_knee"]), 0, 0)
    pb["DEF-front_shin.R"].rotation_euler = (math.radians(-c["fr_knee"]), 0, 0)
    pb["DEF-thigh.L"].rotation_euler = (math.radians(-c["hlx"]), 0, 0)
    pb["DEF-thigh.R"].rotation_euler = (math.radians(c["hrx"]), 0, 0)
    pb["DEF-shin.L"].rotation_euler = (math.radians(c["hl_knee"]), 0, 0)
    pb["DEF-shin.R"].rotation_euler = (math.radians(-c["hr_knee"]), 0, 0)
    expression(fox, expr, blink=max(0.0, min(1.0, c["blink"])))


def zero():
    return {k: 0.0 for k in CHANNELS}


def place_extras(fox, c, t, state="", phase=0.0):
    """카드·소품·별·꽃가루 (월드 좌표). phase: 반복 동작은 p(마지막 다음=처음), 한 번 재생은 t(0·1=휴식) →
    둥실거림을 sin(2π·정수·phase)로 만들어 처음과 끝이 항상 같은 자리에 오게 한다(이음새 없음)"""
    bob = math.sin(2 * math.pi * 2 * phase)
    yaw = math.radians(fox["facing"])
    face = Euler((0, 0, 0)).to_matrix()
    # 운세 카드: 머리 위에 떠오름
    k = max(0.0, c["card"])
    card = fox["card"]
    card.scale = (k, k, k)
    if k > 0:
        hp = head_point(fox)
        card.location = hp + Vector((-0.95, -0.7, 0.85 + 0.08 * bob))
        card.rotation_euler = (0, math.radians(6 * bob), 0)
        for i, s in enumerate(fox["sparks"]):
            q = 0.6 + 0.4 * math.sin(2 * math.pi * (2 * t + i / 3))
            s.scale = (q, q, q)
    o = fox["outfit"]
    p1, p2 = c["p1"], c["p2"]
    # 소품 아래 반짝이: 반복 주기에 맞춰 깜빡여 이음새가 없다
    for i, sp in enumerate(fox.get("book_sparks", []) + fox.get("fan_sparks", [])):
        q = 0.55 + 0.45 * math.sin(2 * math.pi * (2 * phase + i / 3))
        sp.scale = (q, q, q)
    if o == "saju":
        # 평소: 덮인 책이 어깨 옆에 비스듬히 떠 있다 → 읽기: 얼굴 앞쪽으로 와서 펼쳐진다
        book = fox["props"]["saju"]
        book.location = Vector((-1.2 + 0.05 * p1, -0.85, 0.72 + 0.28 * p1 + 0.04 * bob))
        book.rotation_euler = (math.radians(-14), 0, math.radians(22 + 10 * p1))
        opened = math.radians(80 - 65 * p1)
        fox["book-1"].rotation_euler = (0, 0, opened)
        fox["book1"].rotation_euler = (0, 0, -opened)
        fox["page"].rotation_euler = (0, 0, -opened + math.pi * p2)
        fox["page"].scale = (1, 1, 1) if p1 > 0.3 else (0, 0, 0)
    elif o == "tarot":
        fan = fox["props"]["tarot"]
        fan.location = Vector((-1.18, -0.82, 0.5 + 0.05 * bob))
        fan.rotation_euler = (math.radians(-10), math.radians(-6), math.radians(24))
        fox["fan_mid"].location = (0, -0.01, 0.4 * p1)
    elif o == "star":
        scope = fox["props"]["star"]
        scope.location = Vector((-1.08, -0.4, 1.0))
        fox["scope_head"].rotation_euler = (math.radians(-28 - 12 * p1), 0, math.radians(-20))
        for i, s in enumerate(fox["sky"]):
            q = max(0.0, min(1.0, p2 * 3 - i)) * (0.8 + 0.2 * math.sin(i * 2.1 + p2 * 9))
            s.scale = (q, q, q)
            s.location = Vector((-1.7 + i * 0.32, -0.8, 2.25 + 0.16 * ((i * 7) % 3)))
    # 꽃가루
    prog = (t - 0.5) / 0.48 if state == "celebrate" else -1  # 꽃가루는 축하 동작에서만
    for piece in fox["confetti"]:
        ob = piece["o"]
        if prog <= 0 or prog >= 1:
            ob.scale = (0, 0, 0)
            continue
        tau = prog * 1.1
        ob.location = Vector((0, -0.3, 1.6)) + piece["v"] * tau + Vector((0, 0, -4.0 * tau * tau))
        fade = min(1.0, (1.0 - prog) * 4)
        ob.scale = (fade,) * 3
        ang = piece["spin"] * tau
        ob.rotation_euler = {"X": (ang, 0.3, 0), "Y": (0.2, ang, 0), "Z": (0, 0.4, ang)}[piece["axis"]]
    _ = (yaw, face)


# 한 번 재생 동작: 첫·끝 키는 휴식 자세(빈 dict). 값은 휴식 자세에 더하는 양
CLIPS = {
    "wave": [  # 가까운 앞발을 들어 흔들기
        (0.0, {}, "neutral"),
        (0.16, {"frx": 62, "fr_knee": 55, "roll": -4, "z": 0.03, "headz": -8, "heady": 6, "tailz": 10}, "happy"),
        (0.3, {"frx": 74, "fr_knee": 35, "roll": -5, "z": 0.04, "headz": -8, "heady": 10, "tailz": -12}, "happy"),
        (0.42, {"frx": 62, "fr_knee": 65, "roll": -4, "z": 0.03, "headz": -8, "heady": 4, "tailz": 12}, "happy"),
        (0.54, {"frx": 74, "fr_knee": 35, "roll": -5, "z": 0.04, "headz": -8, "heady": 10, "tailz": -12}, "happy"),
        (0.66, {"frx": 62, "fr_knee": 65, "roll": -4, "z": 0.03, "headz": -8, "heady": 4, "tailz": 10}, "happy"),
        (0.82, {"frx": 25, "fr_knee": 20, "headz": -3}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "nod": [
        (0.0, {}, "neutral"),
        (0.22, {"headx": 22, "tailx": -6}, "happy"),
        (0.4, {"headx": -4, "tailx": 4}, "happy"),
        (0.6, {"headx": 18, "tailx": -6}, "happy"),
        (0.8, {"headx": -3}, "happy"),
        (1.0, {}, "neutral"),
    ],
    "surprised": [  # 움찔 → 뒤로 깡충, 꼬리 번쩍
        (0.0, {}, "neutral"),
        (0.12, {"z": -0.04, "headx": 6, "fl_knee": 15, "fr_knee": 15, "hl_knee": 15, "hr_knee": 15}, "neutral"),
        (0.3, {"z": 0.32, "y": 0.18, "pitch": 8, "headx": -12, "tailx": 30, "flx": 25, "frx": 25, "hlx": -20, "hrx": -20}, "surprised"),
        (0.48, {"z": 0.0, "y": 0.22, "pitch": 3, "headx": -8, "tailx": 22}, "surprised"),
        (0.7, {"y": 0.12, "headx": -3, "tailx": 10}, "surprised"),
        (0.86, {"blink": 1.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "reveal": [  # 하늘을 보면 운세 카드가 떠오른다
        (0.0, {}, "neutral"),
        (0.2, {"headx": -16, "headz": 10, "tailx": 10, "card": 0.4}, "neutral"),
        (0.38, {"headx": -20, "headz": 14, "z": 0.06, "tailz": 16, "card": 1.0, "breath": 1}, "happy"),
        (0.56, {"headx": -18, "headz": 12, "z": 0.0, "tailz": -16, "card": 1.05}, "happy"),
        (0.72, {"headx": -16, "headz": 12, "z": 0.05, "tailz": 14, "card": 1.0}, "happy"),
        (0.88, {"headx": -4, "card": 0.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "celebrate": [  # 웅크렸다 점프하며 한 바퀴, 꽃가루
        (0.0, {}, "neutral"),
        (0.12, {"z": -0.08, "pitch": 6, "fl_knee": 30, "fr_knee": 30, "hl_knee": 30, "hr_knee": 30, "headx": 8, "tailx": -10}, "neutral"),
        (0.3, {"z": 0.55, "spin": 180, "flx": 30, "frx": 30, "hlx": -25, "hrx": -25, "tailx": 25, "headx": -12}, "happy"),
        (0.45, {"z": 0.25, "spin": 360, "flx": 20, "frx": 20, "tailx": 15, "headx": -8}, "happy"),
        (0.52, {"z": -0.06, "spin": 360, "fl_knee": 25, "fr_knee": 25, "hl_knee": 25, "hr_knee": 25, "headx": 8, "confetti": 0.0}, "happy"),
        (0.66, {"z": 0.12, "spin": 360, "tailz": 22, "headx": -10}, "happy"),
        (0.8, {"z": 0.0, "spin": 360, "tailz": -18, "headx": -6}, "happy"),
        (1.0, {"spin": 360}, "neutral"),
    ],
    "yawn": [  # 앞으로 쭉 기지개 (엉덩이 들고 가슴 낮춤) + 하품
        (0.0, {}, "neutral"),
        (0.25, {"pitch": -4, "z": -0.03, "flx": 18, "frx": 18, "headx": -12, "tailx": 20, "blink": 0.7, "breath": 1}, "surprised"),
        (0.5, {"pitch": -6, "z": -0.05, "flx": 24, "frx": 24, "headx": -18, "tailx": 26, "blink": 0.9, "breath": 1}, "surprised"),
        (0.7, {"pitch": -2, "flx": 8, "frx": 8, "headx": -6, "tailx": 10, "blink": 0.6}, "neutral"),
        (0.88, {"blink": 1.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    # ── 의상 대표 동작 ──
    "read": [  # 옆에 뜬 사주책이 펼쳐지고 책장이 넘어감, 고개를 갸웃·끄덕
        (0.0, {}, "neutral"),
        (0.18, {"headz": 22, "headx": 6, "p1": 0.6}, "neutral"),
        (0.34, {"headz": 26, "headx": 10, "p1": 1.0}, "neutral"),
        (0.52, {"headz": 26, "headx": 10, "heady": 8, "p1": 1.0, "p2": 1.0, "tailz": 10}, "neutral"),
        (0.66, {"headz": 20, "headx": 2, "p1": 1.0, "p2": 1.0, "tailz": -10}, "happy"),
        (0.76, {"headz": 20, "headx": 18, "p1": 1.0, "p2": 1.0}, "happy"),
        (0.88, {"headz": 8, "p1": 0.2, "p2": 1.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "draw": [  # 떠 있는 카드 부채에서 한 장이 올라와 머리 위로
        (0.0, {}, "neutral"),
        (0.18, {"headz": 22, "headx": 4, "frx": 30, "fr_knee": 30}, "neutral"),
        (0.32, {"headz": 22, "headx": 0, "p1": 1.0, "frx": 45, "fr_knee": 40}, "neutral"),
        (0.46, {"headx": -14, "headz": 8, "card": 1.0, "z": 0.05, "tailz": 14}, "happy"),
        (0.62, {"headx": -16, "headz": 10, "card": 1.05, "tailz": -14}, "happy"),
        (0.76, {"headx": -14, "headz": 10, "card": 1.0, "z": 0.04, "tailz": 12}, "happy"),
        (0.9, {"headx": -2, "card": 0.0}, "neutral"),
        (1.0, {}, "neutral"),
    ],
    "stargaze": [  # 망원경 옆에서 하늘을 올려다보면 별이 반짝
        (0.0, {}, "neutral"),
        (0.2, {"headz": 18, "headx": -10, "p1": 0.5, "frx": 20}, "neutral"),
        (0.36, {"headz": 20, "headx": -26, "p1": 1.0, "pitch": -4, "frx": 30, "fr_knee": 20}, "neutral"),
        (0.56, {"headz": 20, "headx": -28, "p1": 1.0, "p2": 1.0, "pitch": -4, "tailz": 16}, "happy"),
        (0.72, {"headz": 18, "headx": -24, "p1": 1.0, "p2": 1.0, "z": 0.05, "tailz": -16}, "happy"),
        (0.88, {"headx": -6, "p1": 0.2, "p2": 0.5}, "happy"),
        (1.0, {}, "neutral"),
    ],
}


def pose(fox, state, f, n):
    tau = 2 * math.pi
    p = f / n
    t = f / max(1, n - 1)
    c = zero()
    expr = "neutral"
    if state in CLIPS:
        c, expr = B.sample_channels(CLIPS[state], t, CHANNELS)
    elif state == "idle":
        b = math.sin(tau * p)
        c.update(breath=b, z=0.006 * b, headx=2 * b, headz=4 * math.sin(tau * p), heady=3 * math.sin(2 * tau * p), tailz=12 * math.sin(tau * p), tailx=3 * math.sin(2 * tau * p))
        c["blink"] = {20: 0.6, 21: 1.0, 22: 0.45}.get(f, 0.0)
    elif state == "walk":
        # 대각선 짝(앞 왼·뒤 오른 / 앞 오른·뒤 왼)이 번갈아 나가는 종종걸음
        a = math.sin(tau * p)
        lift_a = max(0.0, math.sin(tau * p))
        lift_b = max(0.0, -math.sin(tau * p))
        c.update(
            flx=38 * a, hrx=34 * a, frx=-38 * a, hlx=-34 * a,
            fl_knee=55 * lift_a, hr_knee=48 * lift_a, fr_knee=55 * lift_b, hl_knee=48 * lift_b,
            z=0.05 * abs(math.cos(tau * p)), headx=3 * math.cos(2 * tau * p), roll=2 * a,
            tailz=16 * math.sin(tau * p - 1.0), tailx=6 * math.sin(2 * tau * p - 1.2),
        )
    elif state == "think":
        s = math.sin(tau * p)
        c.update(headz=14, heady=12 + 8 * s, headx=-6, tailz=10 * s, breath=s)
        c["blink"] = {12: 0.6, 13: 1.0, 14: 0.45}.get(f, 0.0)
    elif state == "happy":
        hop = abs(math.sin(tau * p))
        c.update(z=0.2 * hop, pitch=-4 * math.sin(tau * 2 * p), flx=18 * hop, frx=18 * hop, hlx=-14 * hop, hrx=-14 * hop, tailz=28 * math.sin(tau * 2 * p), tailx=12, headx=-6)
        expr = "happy"
    apply_pose(fox, c, expr)
    place_extras(fox, c, t, state, t if state in CLIPS else p)


def main():
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="assets/reference/aurora-fox.glb")
    ap.add_argument("--states", default="all")
    ap.add_argument("--outfits", default="default,saju,tarot,star")
    ap.add_argument("--out", default="assets/mascot/render")
    ap.add_argument("--stills", default="")
    ap.add_argument("--res", type=int, default=640)
    ap.add_argument("--only-frame", type=int, default=-1)
    a = ap.parse_args(argv)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    fox = import_fox(os.path.abspath(a.model))
    stylize(fox)
    sc = B.setup_scene(a.res, "eevee")
    sc.camera.data.type = "ORTHO"
    sc.camera.data.ortho_scale = 3.35
    fox["facing"] = FACING_DEG
    build_face(fox)
    build_outfits(fox)
    set_outfit(fox, "default")

    if a.stills:
        os.makedirs(a.stills, exist_ok=True)
        for name, deg in (("front", 0), ("three-quarter", FACING_DEG), ("side", 90), ("back", 180)):
            fox["facing"] = deg
            pose(fox, "idle", 0, STATES["idle"]["frames"])
            B.render_frame(sc, os.path.abspath(os.path.join(a.stills, f"{name}.png")))
        fox["facing"] = FACING_DEG
        for st, fr in (("happy", 5), ("surprised", 7), ("reveal", 22), ("celebrate", 30)):
            pose(fox, st, fr, STATES[st]["frames"])
            B.render_frame(sc, os.path.abspath(os.path.join(a.stills, f"expression-{st}.png")))
        for name in ("saju", "tarot", "star"):
            set_outfit(fox, name)
            pose(fox, "idle", 0, STATES["idle"]["frames"])
            B.render_frame(sc, os.path.abspath(os.path.join(a.stills, f"outfit-{name}.png")))
            sig = OUTFITS[name]["signature"]
            pose(fox, sig, int(STATES[sig]["frames"] * 0.6), STATES[sig]["frames"])
            B.render_frame(sc, os.path.abspath(os.path.join(a.stills, f"outfit-{name}-{sig}.png")))
        set_outfit(fox, "default")

    jobs = []
    for outfit in [o for o in a.outfits.split(",") if o in OUTFITS]:
        allowed = [s for s in STATES if s not in ("read", "draw", "stargaze")] if outfit == "default" else OUTFIT_STATES + [OUTFITS[outfit]["signature"]]
        wanted = allowed if a.states == "all" else [s for s in a.states.split(",") if s in allowed]
        jobs += [(outfit, st, st if outfit == "default" else f"{outfit}-{st}") for st in wanted]
    manifest_path = os.path.abspath(os.path.join(a.out, "manifest.json"))
    manifest = json.load(open(manifest_path, encoding="utf-8")) if os.path.exists(manifest_path) else {}
    for outfit, st, name in jobs:
        set_outfit(fox, outfit)
        n = STATES[st]["frames"]
        manifest[name] = {"outfit": outfit, "state": st, "frames": n, "fps": STATES[st]["fps"], "loop": STATES[st]["loop"]}
        out = os.path.abspath(os.path.join(a.out, name))
        os.makedirs(out, exist_ok=True)
        for old in os.listdir(out):
            if old.endswith(".png"):
                os.remove(os.path.join(out, old))
        frames = [a.only_frame] if a.only_frame >= 0 else range(n)
        for f in frames:
            pose(fox, st, f, n)
            B.render_frame(sc, os.path.join(out, f"{f:04d}.png"))
        print(f"[fox] {name}: {len(list(frames))} frames")
    os.makedirs(os.path.dirname(manifest_path), exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as fp:
        json.dump(manifest, fp, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
