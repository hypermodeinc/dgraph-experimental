## Overview

This small project contains tools and scripts that are helpful in analyzing Dgraph operations and performance.

These tools and scripts are NOT SUPPORTED code from Dgraph. They are uploaded here as a convenience. Users must review, understand, tweak and verify them to use them efficiently.

### Tools
Better tools include

* processProfiles : these scripts include some linux command line profiling in the README to gather golang profiles repeatedly in a batch, and then have python scripts to convert them in bulk to images for easy review.

* DQLParse has a lightweight and imperfect script to scan for somewhat-unique queries that are output when Dgraph Request Logging is turned on. It is imperfect but helps see how many unique queries are run, and how often.

* compactionAnalysis includes scripts to parse the LOG Compact activity from Dgraph logs and convert it to RDF for further processing. More work is needed to fully use the RDF, such as loading it into a Dgraph application to observer the log companctions and how various SST files are combined into new SST files over time.

