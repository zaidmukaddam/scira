from daytona import Daytona, DaytonaConfig, Image, CreateSnapshotParams, Resources
import time

daytona = Daytona(DaytonaConfig(api_key="", server_url="https://api.daytona.ai"))

# Generate a unique name for the image
snapshot_name = f"scira-analysis:{int(time.time())}"

# Create a Python image
image = (
    Image.debian_slim("3.12")
    .pip_install(["numpy", "pandas", "matplotlib", "scipy", "scikit-learn", "yfinance", "requests", "keras", "uv"])
    .run_commands(
            "apt-get update && apt-get install -y git",
            "groupadd -r daytona && useradd -r -g daytona -m daytona",
            "mkdir -p /home/daytona/workspace",
        )
    )

# Create the image and stream the build logs
print(f"=== Creating Image: {snapshot_name} ===")
daytona.snapshot.create(
    CreateSnapshotParams(
        name=snapshot_name,
        image=image,
        resources=Resources(
            cpu=1,
            memory=1,
            disk=3,
        ),
    ),
    on_logs=print,
)