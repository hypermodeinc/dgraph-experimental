import re
import sys
from collections import defaultdict

######   
######   Help see how many queries are in use, which guides us in migrating, tuning, and estimating complexity.
######   
######   This script processes "Got GraphQL queries" lines from Dgraph request logging and does some 
######   basic deduplication and counting to identify how many unique queries are run on a system
######   and how many of each.
######   
######   Note this uses very basic heuristics to identify uniqueness, and is not perfect. Because callers can
######   dynamically build and tweak queries, it is very difficult to determine classes of similar queries
######   modulo all the additional filters and included fields that may be added, so this will have to do
######
######   Unfortunately, mutations are not logged (TODO: confirm this), so this script only works for queries.
######   

# use the functions and text tokens in a query to make a fingerprint that roughly predicts uniqueness
def extract_functions_and_tokens(query):
    # Extract function calls and tokens ending with a colon
    functions = re.findall(r'\b\w+\(func:.*?\)', query)
    tokens = re.findall(r'\b\w+:', query)[:20]  # Get the first 20 tokens
    return ' '.join(functions + tokens)

# count semi-unique queries in the file, but stop after hitting some max value to save time and memory
def process_queries(file_path, max_queries):
    with open(file_path, 'r') as file:
        content = file.read()

    # Splitting the file content into individual queries
    queries = content.split('-----\n')[1:]  # Skip the first split as it will be empty

    fingerprints = defaultdict(list)
    counts = defaultdict(int)

    for query in queries:
        fingerprint = extract_functions_and_tokens(query)
        counts[fingerprint] += 1
        if len(fingerprints[fingerprint]) < max_queries:
            fingerprints[fingerprint].append(query)

    return fingerprints, counts

def main():
    if len(sys.argv) < 3:
        print("Usage: python script.py <filename> <max_queries_per_fingerprint>")
        sys.exit(1)

    file_path = sys.argv[1]
    try:
        max_queries = int(sys.argv[2])
    except ValueError:
        print("Please provide a valid integer for max_queries_per_fingerprint.")
        sys.exit(1)

    fingerprints, counts = process_queries(file_path, max_queries)

    # Sorting fingerprints by frequency in descending order
    sorted_fingerprints = sorted(fingerprints.items(), key=lambda x: counts[x[0]], reverse=True)

    # Output
    for fingerprint, query_list in sorted_fingerprints:
        print(f"Fingerprint: {fingerprint}")
        print(f"Count: {counts[fingerprint]}")
        print("Sample Queries:")
        for query in query_list:
            print(query)
        print("\n----------------------\n")

if __name__ == "__main__":
    main()
