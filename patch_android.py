import re

file_path = 'android_app/app/src/main/java/com/rutacontrol/telematics/MainActivity.kt'

with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

# Update launch packages for Timemark
old_launch = 'listOf("com.oceangalaxy.camera.new", "com.timemark.camera", "com.timestampcamera.auto"),'
new_launch = 'listOf("com.oceangalaxy.camera.new", "com.timemark.camera", "com.timestampcamera.auto", "com.jeyluta.timestampcamerafree", "com.jeyluta.timestampcamera", "com.timestampcamera.autodatetimestamp", "camera.timestamp.mark.watermark"),'

if old_launch in code:
    code = code.replace(old_launch, new_launch)
else:
    print("Could not find old_launch")

# Update LockTask packages
old_allowed = '''                    "com.oceangalaxy.camera.new",
                    "com.timemark.camera",'''
new_allowed = '''                    "com.oceangalaxy.camera.new",
                    "com.timemark.camera",
                    "com.timestampcamera.auto",
                    "com.jeyluta.timestampcamerafree",
                    "com.jeyluta.timestampcamera",
                    "com.timestampcamera.autodatetimestamp",
                    "camera.timestamp.mark.watermark",'''

if old_allowed in code:
    code = code.replace(old_allowed, new_allowed)
else:
    print("Could not find old_allowed")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)

print("Patched MainActivity.kt")
