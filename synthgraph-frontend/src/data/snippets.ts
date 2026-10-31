/**
 * Code samples shown on the website. The record sample is the same code as the
 * documentation's quickstart (src/content/docs/quickstart.mdx), which was run
 * against SDK 0.6.0 and a real backend. Keep the two in step.
 */
export const CONFIGURE_SNIPPET = `$ export SYNTHGRAPH_API_KEY="..."
$ export SYNTHGRAPH_API_URL="https://your-synthgraph-backend"`;

export const RECORD_SNIPPET = `from synthgraph import SynthGraph

with SynthGraph() as sg:  # reads the two environment variables above
    project = sg.project("Adverse weather detection")
    experiment = project.experiment("vehicle_detection_rain")

    with experiment.generation(
        generator="blender",
        generator_version="4.2",
        parameters={"weather": "rain", "occlusion": 0.3, "camera_distance": 12},
        seed=42,
    ) as generation:
        run_my_blender_pipeline()  # your code, unchanged

        dataset = generation.dataset(
            name="rain_dataset_v1",
            uri="s3://lab-bucket/rain_dataset_v1",
            format="image",
        )

    training = experiment.training(
        model="yolo",
        framework="pytorch",
        dataset=dataset,
        config={"epochs": 50, "batch_size": 32, "learning_rate": 0.001},
    )
    training.start()
    training.log_metric(step=1, metrics={"loss": 0.9})
    training.evaluation(
        metrics={"mAP": 0.724, "precision": 0.78, "recall": 0.69},
        dataset_version_id=dataset,
    )
    training.complete()`;
