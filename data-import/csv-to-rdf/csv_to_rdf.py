import os
import sys

import pandas as pd
from rdf_lib import df_to_rdffile

if len(sys.argv) < 2:
    print("Usage: csv_to_rdf.py <directory> <output_file>")
    print(
        "<directory> is the directory containing the CSV files and their associated templates"
    )
    print(
        "<output_file> is the file to write the RDF output to. If not provided, the output will be written to stdout"
    )
    sys.exit(1)

csvdir = sys.argv[1]

rdf_file_handle = sys.stdout
output_file = None
if len(sys.argv) == 3:
    output_file = sys.argv[2]
    rdf_file_handle = open(output_file, "w")


# iterate over files in
# that directory
# get CSV file and associated template file
# load to dgraph and update the xidmap
CHUNK_SIZE = 100000
for filename in os.listdir(csvdir):
    f = os.path.join(csvdir, filename)
    if os.path.isfile(f) and filename.endswith(".csv"):
        base = os.path.splitext(f)[0]
        templatefilename = base + ".template"
        if os.path.isfile(templatefilename):
            template_file = open(templatefilename, "r")
            template = template_file.read()
            template_file.close()
            # xidmap = df_to_dgraph(df,template,gclient,xidpredicate,xidmap)
            for chunk in pd.read_csv(f, keep_default_na=True, chunksize=CHUNK_SIZE, dtype=str):
                # transform the dataframe and write to file
                print('.', end='', flush=True) # progress indicator
                df_to_rdffile(chunk, template, rdf_file_handle)
if rdf_file_handle is not sys.stdout:
    rdf_file_handle.close()
