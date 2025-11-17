import requests
import json
import time
import sys
import csv
import os
from datetime import datetime, timedelta

# === 1. CONFIGURATION ===
CAM_ID = "df688024-6a2d-4736-9546-85e94b80df6a"
url = f"https://tesa-api.crma.dev/api/object-detection/{CAM_ID}"
token = "975db3a222a70356c34acb1c0e310e5722b072fb439b8dcdaa0f50d5e6684304"

headers = {
    "x-camera-token": token
}

# === 2. LOAD CSV DATA ===
csv_data_list = []
csv_path = "data_from_ai/submission.csv"

if not os.path.exists(csv_path):
    print(f"❌ CSV file not found: {csv_path}")
    sys.exit(1)

with open(csv_path, newline='', encoding='utf-8') as csvfile:
    reader = csv.reader(csvfile)
    for i, row in enumerate(reader):
        if i == 0:  # Skip header
            continue
        csv_data_list.append(row)

print(f"✅ Loaded {len(csv_data_list)} rows from CSV.")

# === 3. LOAD IMAGE PATHS ===
folder_path = "data_from_ai/images"
if not os.path.exists(folder_path):
    print(f"❌ Image folder not found: {folder_path}")
    sys.exit(1)

image_path_list = [f for f in os.listdir(folder_path) if f.endswith(".jpg")]
print(f"✅ Found {len(image_path_list)} images.")

# === 4. MAIN LOOP ===
count = 1
decount = len(csv_data_list)

try:
    while True:
        # --- find image file ---
        image_name_prefix = f"img_{count:04d}"
        matching_images = [f for f in image_path_list if f.startswith(image_name_prefix)]

        if not matching_images:
            print(f"⚠️ No image found for index {count}. Skipping.")
            count += 1
            if count > decount:
                print("✅ All images processed. Exiting loop.")
                break
            continue

        image_file_path = os.path.join(folder_path, matching_images[0])

        # --- find lat/lng from CSV ---
        filename = f"{image_name_prefix}.jpg"
        lat, lng = None, None

        for csv_data in csv_data_list:
            if csv_data[0] == filename:
                lat, lng = csv_data[1], csv_data[2]  # keep as strings
                break

        if lat is None or lng is None:
            print(f"⚠️ No coordinates found for {filename}. Skipping.")
            count += 1
            continue

        # --- create detected object (array with nested details) ---
        detected_objects = [
            {
                "obj_id": f"obj_{count:04d}",
                "type": "drone",
                "lat": lat,
                "lng": lng,
                "objective": "surveillance",
                "size": "big",
                "details": {
                        "color": "red",
                        "speed": 15
                }
            }
        ]

        # --- payload ---
        now = datetime.utcnow() + timedelta(hours=7)
        data_payload = {
            "objects": json.dumps(detected_objects),  # must be JSON string inside form
            "timestamp": now.isoformat()  # convert datetime to string
        }

        print("-------------------------------------------------")
        print(f"📤 Sending frame #{count}")
        print(f"🕒 Timestamp: {data_payload['timestamp']}")
        print(f"📍 Location: lat={lat}, lng={lng}")

        try:
            with open(image_file_path, "rb") as f:
                files_payload = {
                    "image": (os.path.basename(image_file_path), f, "image/jpeg")
                }

                response = requests.post(
                    url,
                    headers=headers,
                    data=data_payload,
                    files=files_payload
                )

            print(f"✅ Response Code: {response.status_code}")
            try:
                print(json.dumps(response.json(), indent=2))
            except json.JSONDecodeError:
                print(response.text)

        except FileNotFoundError:
            print(f"❌ Image file not found: {image_file_path}")
            break

        except requests.exceptions.ConnectionError:
            print(f"🚨 Connection failed. Server not reachable: {url}")
            print("Retrying in 10 seconds...")
            time.sleep(10)
            continue

        except Exception as e:
            print(f"⚠️ Unexpected error: {e}")
            print("Retrying in 10 seconds...")
            time.sleep(10)
            continue

        # --- delay and increment ---
        print("⏳ Waiting 10 seconds before next send...")
        time.sleep(10)

        count += 1
        if count > decount:
            print("✅ All data sent successfully.")
            count = 1

except KeyboardInterrupt:
    print("\n🛑 Interrupted by user. Exiting cleanly...")
    sys.exit(0)
