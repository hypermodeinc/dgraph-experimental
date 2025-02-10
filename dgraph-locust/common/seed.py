import subprocess
import json
import http.client

alpha = "localhost"
data_path = "./data/"
schema = "schema.graphql"

def upload_schema(alpha, schema_file):
  
  print("Uploading GraphQL schema..."+"\n")
  conn = http.client.HTTPConnection(alpha, 8080)
    
  with open(schema_file, 'r') as file:
      schema = file.read()
    
  headers = {
      "Content-Type": "application/graphql"
  }    
  conn.request("POST", "/admin/schema", body=schema)
  response = conn.getresponse()

  if response.status == 200:
      print("Schema uploaded successfully!"+"\n")
      # print(response.read().decode())
  else:
      print(f"Error uploading schema. Status code: {response.status}. Response: {response.read().decode()}")

  conn.close()

def live_load(data_path, alpha, zero=None):

  # The flag --network=host allows the dgraph live process to access the alpha endpoint inside it's own container.
  cmd = f"docker run -it --network=host --rm -v {data_path}:/tmp dgraph/dgraph:v23.1.0 dgraph live --alpha {alpha}:9080 -f /tmp/"

  print(f"Loading data into Dgraph using the Live Loader\n"+ "Executing command: {cmd}")
  process = subprocess.Popen(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  stdout, stderr = process.communicate()
  print(stdout.decode('utf-8'))

  if process.returncode == 0:
    return True
  else:
    print(stderr.decode('utf-8'))
    return False
  

upload = upload_schema(alpha, data_path+schema)
success = live_load(data_path, alpha)

if success:
  print("Data loaded successfully!")
else:
  print("Error in loading data.")