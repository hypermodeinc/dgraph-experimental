import os

# Get the current working directory
cwd = os.getcwd()

count = 0
# Loop through all files in the directory
for filename in os.listdir(cwd):
    # Check if the file is a CPU profile
    if "stack" in filename and (filename.endswith(".prof") or filename.endswith(".out") or filename.endswith(".txt") or filename.endswith(".pprof"))   :
        # Use the go tool to convert the profile to an SVG image
        count += 1
        os.system(f"go tool pprof -svg --lines  '{os.path.join(cwd, filename)}' > '{os.path.join(cwd, filename + '.svg')}' ")

print("Converted ", count, " files")