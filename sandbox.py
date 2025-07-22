from daytona import Daytona, DaytonaConfig, Image, CreateSnapshotParams, Resources, CreateSandboxFromSnapshotParams, CodeLanguage
import time
import os

daytona = Daytona(DaytonaConfig(api_key=os.getenv("DAYTONA_API_KEY")))

# Generate a unique name for the image
snapshot_name = f"scira-analysis:{int(time.time())}"

# Create a Python image
image = (
    Image.debian_slim("3.12")
    .pip_install(["numpy", "pandas", "matplotlib", "scipy", "scikit-learn", "yfinance", "requests", "keras", "uv", "torch", "torchvision", "torchaudio"])
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
            cpu=2,
            memory=4,
            disk=5,
        ),
        entrypoint=["sleep", "infinity"],
    ),
    on_logs=print,
)

sandbox = daytona.create(
    CreateSandboxFromSnapshotParams(
        snapshot=snapshot_name,
        language=CodeLanguage.PYTHON,
        auto_stop_interval=0,
    )
)

res = sandbox.process.code_run('''
import yfinance as yf
import matplotlib.pyplot as plt

NVDA = yf.Ticker("NVDA")
data = NVDA.history(period="7d")
print(data)

plt.plot(data['Close'].values)
plt.show()
''')

print(res.result)
