"""Records an invented demo workspace through the real SDK, for screenshots.

Every number here is made up and must be labelled "demo data" wherever it is shown.
It creates two projects: an adverse-weather detection experiment (three YOLO runs
scored on two test sets, one failed generation, one run with partial capture, one
still running) and a small reinforcement learning experiment.

Usage, against a LOCAL backend and a throwaway account (it creates records):

  export SYNTHGRAPH_API_KEY=...
  export SYNTHGRAPH_API_URL=http://localhost:3000
  python scripts/docs/seed-demo.py

It prints the project and experiment ids that capture-screens.mjs needs.
"""

import math
import time

import synthgraph
from synthgraph import SynthGraph


def sha(ch):
    return "sha256:" + ch * 64


def bulk(sg, training, rows):
    """The SDK has no batch call, and one request per point would trip the rate limit."""
    try:
        sg._http.post(
            f"/training-runs/{training.id}/metrics/batch",
            json={"metrics": [{"step": s, "metrics": m} for s, m in rows]},
            operation="demo.bulk",
        )
    except synthgraph.SynthGraphTransportError:
        pass  # the SDK client expects an object; the rows were written


with SynthGraph() as sg:
    # ------------------------------------------------------------- vision story
    project = sg.project("Adverse weather detection", description="Synthetic rain scenes for vehicle detection")
    exp = project.experiment("vehicle_detection_rain")
    exp.declare_metric_directions({"mAP50": "maximize", "precision": "maximize", "recall": "maximize", "loss": "minimize"})

    def generate(name, seed, params, ok=True):
        try:
            with exp.generation(name, generator="blender", generator_version="4.2", seed=seed, parameters=params) as g:
                if not ok:
                    raise RuntimeError("renderer exited at frame 812")
                return g
        except RuntimeError:
            return g

    clear_gen = generate("clear_baseline", 5, {"weather": "clear", "rain_intensity": 0.0, "visibility_m": 1000, "camera_distance": 12})
    light_gen = generate("rain_light", 11, {"weather": "rain", "rain_intensity": 0.3, "visibility_m": 300, "camera_distance": 12})
    heavy_gen = generate("rain_heavy", 42, {"weather": "rain", "rain_intensity": 0.9, "visibility_m": 50, "camera_distance": 12, "occlusion": 0.3})
    generate("fog_dense", 77, {"weather": "fog", "visibility_m": 20}, ok=False)
    test_gen = generate("test_sets", 99, {"weather": "mixed", "frames": 2000})

    clear_ds = clear_gen.dataset(version="v1", name="clear_train", uri="s3://lab-bucket/clear_train", format="image", size=48_000_000_000, checksum=sha("a"))
    light_ds = light_gen.dataset(version="v1", name="rain_light_train", uri="s3://lab-bucket/rain_light_train", format="image", size=51_000_000_000, checksum=sha("b"))
    heavy_ds = heavy_gen.dataset(version="v1", name="rain_heavy_train", uri="s3://lab-bucket/rain_heavy_train", format="image", size=55_000_000_000, checksum=sha("c"))
    test_clear = test_gen.dataset(version="v1", name="test_clear", uri="s3://lab-bucket/test_clear", format="image", checksum=sha("d"))
    test_rain = test_gen.dataset(version="v1", name="test_heavy_rain", uri="s3://lab-bucket/test_heavy_rain", format="image", checksum=sha("e"))
    heavy_gen.asset(name="street-scene.blend", uri="s3://lab-bucket/scenes/street-scene.blend", type="scene", checksum=sha("f"))
    heavy_gen.asset(name="vehicle-pack.blend", uri="s3://lab-bucket/scenes/vehicle-pack.blend", type="model", checksum=sha("1"))
    light_gen.asset(name="street-scene.blend", uri="s3://lab-bucket/scenes/street-scene.blend", type="scene", checksum=sha("f"))

    runs = [
        ("yolo-baseline", clear_ds, clear_gen, {"clear": (0.74, 0.83), "heavy": (0.35, 0.41)}, 1.0, {"epochs": 50, "imgsz": 640, "lr0": 0.01, "mosaic": 1.0}),
        ("yolo-rain-light", light_ds, light_gen, {"clear": (0.72, 0.80), "heavy": (0.50, 0.58)}, 2.0, {"epochs": 50, "imgsz": 640, "lr0": 0.01, "mosaic": 1.0}),
        ("yolo-rain-heavy", heavy_ds, heavy_gen, {"clear": (0.70, 0.76), "heavy": (0.63, 0.71)}, 3.5, {"epochs": 50, "imgsz": 640, "lr0": 0.005, "mosaic": 0.5}),
    ]
    first = True
    for name, ds, gen, scores, secs, cfg in runs:
        t = exp.training(name=name, model="yolov8n", framework="ultralytics", framework_version="8.3", dataset=ds, config=cfg, generations=[gen])
        t.start()
        final = scores["clear"][1]
        rows = []
        for step in range(1, 51, 2):
            progress = step / 50
            rows.append((step, {
                "loss": round(1.2 * math.exp(-3 * progress) + 0.08 + 0.01 * math.sin(step), 4),
                "mAP50": round(final * (1 - math.exp(-4 * progress)), 4),
                "precision": round(min(0.95, final + 0.05) * (1 - math.exp(-4 * progress)), 4),
            }))
        bulk(sg, t, rows)
        if first:
            t.monitor_resources(interval_seconds=0.4)
        time.sleep(secs)
        for ckpt in (25, 50):
            idx = 0 if ckpt == 25 else 1
            t.evaluation(name=f"ckpt-{ckpt}-clear", metrics={"mAP50": scores["clear"][idx], "precision": round(scores["clear"][idx] + 0.04, 3), "recall": round(scores["clear"][idx] - 0.03, 3)}, dataset_version_id=test_clear, checkpoint_step=ckpt, metadata={"condition": "clear"})
            t.evaluation(name=f"ckpt-{ckpt}-heavy-rain", metrics={"mAP50": scores["heavy"][idx], "precision": round(scores["heavy"][idx] + 0.04, 3), "recall": round(scores["heavy"][idx] - 0.03, 3)}, dataset_version_id=test_rain, checkpoint_step=ckpt, metadata={"condition": "heavy_rain"})
        if first:
            t.close()
            first = False
        t.complete()
        if name == "yolo-rain-heavy":
            sg.training_runs.update_capture_status(training_run_id=t.id, status="partial", integrations={"resource_monitor": {"attached": True, "closed": False}})
    # A run that is still going, to show a live state
    live = exp.training(name="yolo-rain-heavy-v2", model="yolov8n", framework="ultralytics", dataset=heavy_ds, config={"epochs": 80, "imgsz": 640, "lr0": 0.005})
    live.start()
    bulk(sg, live, [(s, {"loss": round(1.0 * math.exp(-s / 12) + 0.1, 4), "mAP50": round(0.6 * (1 - math.exp(-s / 15)), 4)}) for s in range(1, 21)])

    print("vision project", project.id, "experiment", exp.id)

    # ------------------------------------------------------------- RL story
    rl_project = sg.project("Quadruped locomotion", description="Domain-randomized PPO for a legged robot")
    rl = rl_project.experiment("go1-locomotion")
    rl.declare_metric_directions({"reward": "maximize", "fall_rate": "minimize", "episode_length": "neutral"})
    narrow = rl.generation("dr_narrow", generator="mujoco_playground", generator_version="0.0.5", seed=1, parameters={"friction": [0.6, 1.0], "mass_scale": [0.9, 1.1], "kp_scale": [0.9, 1.1]})
    wide = rl.generation("dr_wide", generator="mujoco_playground", generator_version="0.0.5", seed=2, parameters={"friction": [0.3, 1.5], "mass_scale": [0.7, 1.3], "kp_scale": [0.7, 1.3]})
    for g in (narrow, wide):
        g.start()
        g.complete()
    terrains = rl.generation("eval_terrains", generator="mujoco_playground", generator_version="0.0.5", seed=3, parameters={"terrains": ["flat", "rough", "stairs"]})
    terrains.start()
    eval_ref = terrains.dataset(version="v1", name="go1_eval_terrains", uri="s3://lab-bucket/go1_eval_terrains")
    terrains.complete()
    for name, gen, scale in (("ppo-narrow", narrow, 0.8), ("ppo-wide", wide, 1.0)):
        p = rl.training(name=name, model="ppo", framework="brax", config={"num_envs": 4096, "learning_rate": 3e-4, "entropy_cost": 1e-2})
        p.link_generation(gen)
        p.start()
        bulk(sg, p, [(s * 1000, {"reward": round(scale * 18 * (1 - math.exp(-s / 20)), 3), "episode_length": 800, "loss": round(0.9 * math.exp(-s / 25) + 0.05, 4)}) for s in range(1, 61)])
        for ckpt in (20000, 40000, 60000):
            f = ckpt / 60000
            p.evaluation(name=f"eval_{ckpt}", metrics={"reward": round(scale * 18 * (1 - math.exp(-4 * f)), 2), "fall_rate": round(0.5 * math.exp(-3 * f) / scale, 3)}, dataset_version_id=eval_ref, checkpoint_step=ckpt, metadata={"terrain": "rough"})
        time.sleep(1.5)
        p.complete()
    print("rl project", rl_project.id, "experiment", rl.id)
