import networkx as nx

def generate_rdf_triples(graph):
    """
    Convert a NetworkX graph into a list of RDF triples.
    """
    rdf_triples = []
    for source, target in graph.edges():
        rdf_triples.append(f'<_:node{source}> <edge> <_:node{target}> .')
    return rdf_triples

def save_rdf_to_file(rdf_triples, filename):
    """
    Save RDF triples to a file.
    """
    with open(filename, 'w') as f:
        for triple in rdf_triples:
            f.write(triple + '\n')

def main():
    # Generate a Barabási-Albert graph
    G = nx.barabasi_albert_graph(10, 5)
    nx.write_edgelist(G, "graph.edgelist", data=False)
    # Convert to RDF triples
    rdf_triples = generate_rdf_triples(G)
    
    # Save to a file (optional)
    save_rdf_to_file(rdf_triples, 'graph.rdf')
    
    # Print a sample of the RDF triples
    print("Sample RDF triples:")
    for triple in rdf_triples[:10]:  # Print first 10 triples as a sample
        print(triple)

if __name__ == "__main__":
    main()