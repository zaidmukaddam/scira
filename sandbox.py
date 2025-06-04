from daytona_sdk import Daytona, DaytonaConfig, Image
import time

daytona = Daytona(DaytonaConfig(api_key=""))

# Generate a unique name for the image
image_name = f"scira-analysis:{int(time.time())}"

# Create a Python image
image = (
    Image.debian_slim("3.12")
    .pip_install(["numpy", "pandas", "matplotlib", "scipy", "scikit-learn", "yfinance", "requests", "keras", "uv"])
    .run_commands(["apt-get update && apt-get install -y git curl", "mkdir -p /home/daytona/project"])
)

# Create the image and stream the build logs
print(f"=== Creating Image: {image_name} ===")
daytona.create_image(image_name, image, on_logs=lambda log_line: print(log_line, end=''), timeout=0)