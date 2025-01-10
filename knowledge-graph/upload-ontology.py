import os
import sys
from urllib.parse import urlparse

import grpc
import pydgraph
from rdflib import Graph, Literal, Namespace
from rdflib.namespace import RDF, RDFS

if len(sys.argv) < 2:
    print(f"Usage: {sys.arg[0]} <file>")
    print("<file> the RFSSchema file to upload in rdf/xml format")
    print(
        "The script uses Dgraph grpc endpoint defined in DGRAPH_GRPC environment variable or localhost:9080"
    )
    print(
        "If the grpc endpoint is a cloud instance, the script uses the key set in DGRAPH_ADMIN_KEY"
    )
    sys.exit(1)


# to upload to a self-hosted env, unset ADMIN_KEY and set DGRAPH_GRPC
def getClient():
    if "DGRAPH_GRPC" in os.environ:
        dgraph_grpc = os.environ["DGRAPH_GRPC"]
    else:
        dgraph_grpc = "localhost:9080"

    if "cloud.dgraph.io" in dgraph_grpc:
        assert "DGRAPH_ADMIN_KEY" in os.environ, "DGRAPH_ADMIN_KEY must be set"
        APIAdminKey = os.environ["DGRAPH_ADMIN_KEY"]
        client_stub = pydgraph.DgraphClientStub.from_cloud(dgraph_grpc, APIAdminKey)
        print("cloud client " + dgraph_grpc)
    elif "hypermode.host" in dgraph_grpc:
        assert (
            "HYPERMODE_DGRAPH_TOKEN" in os.environ
        ), "HYPERMODE_DGRAPH_TOKEN must be set"
        TOKEN = os.environ["HYPERMODE_DGRAPH_TOKEN"]
        creds = grpc.ssl_channel_credentials()
        call_credentials = grpc.access_token_call_credentials(TOKEN)
        composite_credentials = grpc.composite_channel_credentials(
            creds, call_credentials
        )
        client_stub = pydgraph.DgraphClientStub(
            dgraph_grpc,
            credentials=composite_credentials,
        )
        print("hypermode client " + dgraph_grpc)
    else:
        client_stub = pydgraph.DgraphClientStub(dgraph_grpc)
        print("local client " + dgraph_grpc)
    client = pydgraph.DgraphClient(client_stub)
    return client


def parse_ref(uri):
    parsed_url = urlparse(uri)
    if parsed_url.fragment == "":
        namespace = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path.rsplit('/', 1)[0]}/"
        term = parsed_url.path.split("/")[-1]
    else:
        namespace = f"{parsed_url.scheme}://{parsed_url.netloc}{parsed_url.path}"
        term = parsed_url.fragment
    return (namespace, term)

def ontology_as_rdf(g,s,n):
    namespace= Literal(s)
    parent = BLANK[namespace]
    # find all subjects of any type
    n.add((parent, DGRAPH['type'], Literal("dgraph-exp.ontology")))   
    n.add((parent, EXP["namespace"], Literal(s)))
    for subject  in g.subjects( RDFS.isDefinedBy, s):
        (namespace, term) = parse_ref(subject)
        if(g.value(subject, RDF.type) == RDFS.Class) and (g.value(subject,  SW_VOCAB.term_status) == Literal("stable")):        
            # search the label
            label = g.value(subject, RDFS.label)

            n.add((BLANK[subject], RDFS.isDefinedBy, parent ))
            n.add((BLANK[subject], DGRAPH['type'], Literal(RDFS.Class)))
            n.add((BLANK[subject], RDFS.label, Literal(str(label))))
            for o1 in g.objects(subject, RDFS.subClassOf):
                n.add((BLANK[subject], RDFS.subClassOf,BLANK[o1]))
    for subject in g.subjects(  RDF.type, RDF.Property):
        (term_namespace, term) = parse_ref(subject)
        
        if (term_namespace == namespace):
            # search the label
            label = g.value(subject, RDFS.label)
            n.add((BLANK[subject], RDFS.isDefinedBy, parent ))
            n.add((BLANK[subject], RDFS.label, Literal(str(label))))
            for o1 in g.objects(subject, RDFS.domain):
                n.add((BLANK[subject], RDFS.domain,BLANK[o1]))
            for o1 in g.objects(subject, RDFS.range):
                if (o1 == RDFS.Literal):
                    n.add((BLANK[subject], EXP['is_literal'],Literal("true")))
                else:
                    n.add((BLANK[subject], RDFS.range,BLANK[o1]))
                    (term_namespace, term) = parse_ref(o1)
                    if (term_namespace != namespace):
                        n.add((BLANK[term_namespace], DGRAPH['type'], Literal("dgraph-exp.ontology")))   
                        n.add((BLANK[term_namespace], EXP["namespace"], Literal(term_namespace)))
                        n.add((BLANK[o1], RDFS.isDefinedBy, BLANK[term_namespace]))

def rdf_schema_to_dgraph_triples(g):
    n = Graph()
    resources = set()
    for o in g.objects(None ,  RDFS.isDefinedBy):
        # add the resource to the set
        resources.add(o)
    # Create an ontology for each namespace
    for o in resources:
        print(f'Building ontology for {o}')
        ontology_as_rdf(g,o,n)
    nquads = n.serialize(format="nt") 
    return nquads

schema_file = sys.argv[1]

client = getClient()
# that directory
# get CSV file and associated template file
# load to dgraph and update the xidmap


SCH = Namespace("http://xmlns.com/foaf/0.1/")
DGRAPH = Namespace("dgraph.")
NEW = Namespace("dgraph-exp.")
BLANK = Namespace("_:")
EXP = Namespace("dgraph-exp.")
SW_VOCAB = Namespace("http://www.w3.org/2003/06/sw-vocab-status/ns#")

g = Graph()
try:
    g.parse(schema_file)
    nquads = rdf_schema_to_dgraph_triples(g)
    print(nquads)
except Exception as inst:
    print(inst)
    print("Error processing the rdf schema file")
    sys.exit(1)
