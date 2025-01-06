# !pip install pandas pydgraph python_graphql_client multiprocess
# import multiprocess as mp
import json
import os
import re
import sys

import pandas as pd
import pydgraph
from rdf_lib import df_to_rdfmap, rdfmap_to_rdf

if len(sys.argv) < 2:
    print("Usage: upload_csv.py <directory>")
    print(
        "<directory> is the directory containing the CSV files and their associated templates"
    )
    print(
        "The script uses Dgraph grpc endpoint defined in DGRAPH_GRPC environment variable or localhost:9080"
    )
    print(
        "If the grpc endpoint is a cloud instance, the scrip uses the key set in DGRAPH_ADMIN_KEY"
    )
    sys.exit(1)

csvdir = sys.argv[1]


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
    else:
        client_stub = pydgraph.DgraphClientStub(dgraph_grpc)
        print("local client " + dgraph_grpc)
    client = pydgraph.DgraphClient(client_stub)
    return client


sliceSize = 5000  # mutate every sliceSize RDF lines


def readXidMapFromDgraph(client, predicate="xid"):
    # xid from dgraph by batch (pagination)
    # return a map of xid -> uid

    xidmap = dict({})
    txn = client.txn(read_only=True)
    batch = 10000
    after = ""
    try:
        # Run query.
        while True:
            query = (
                """
        {
           xidmap(func: has(xid),first:"""
                + str(batch)
                + after
                + """){
            """
                + predicate
                + """ uid
          }
        }
        """
            )
            res = txn.query(query)
            data = json.loads(res.json)
            for e in data["xidmap"]:
                xidmap["<" + e[predicate] + ">"] = "<" + e["uid"] + ">"
            if len(data["xidmap"]) < batch:
                break
            after = ",after:" + data["xidmap"][-1]["uid"]
    finally:
        txn.discard()
    return xidmap


re_blank_bracket = re.compile(r"(<_:\S+>)")
re_blank_node = re.compile(r"<(_:\S+)>")  # used for findall


def allocate_uid(client, body, xidmap):
    r = re.findall(re_blank_node, body)
    if len(r) > 0:
        blank = set(r)
        # upsert

        query_list = ["{"]
        nquad_list = []
        blank_map = {}
        for idx, n in enumerate(blank):
            blank_map[f"u_{idx}"] = n
            query_list.append(f'u_{idx} as u_{idx}(func: eq(xid, "{n}")) {{uid}}')
            nquad_list.append(f'uid(u_{idx}) <xid> "{n}" .')
        query_list.append("}")
        query = "\n".join(query_list)
        nquads = "\n".join(nquad_list)
        txn = client.txn()
        try:
            mutation = txn.create_mutation(set_nquads=nquads)
            request = txn.create_request(query=query, mutations=[mutation])
            res = txn.do_request(request)
            txn.commit()
            #  new uid for xid are in res.uids
            #  existing uid for xid are res.json payload
            for n in res.uids:
                idx = n[n.index("(") + 1 : n.index(")")]
                xidmap["<" + blank_map[idx] + ">"] = "<" + res.uids[n] + ">"

            queries = json.loads(res.json)
            for idx in queries:
                if len(queries[idx]) > 0:
                    xidmap["<" + blank_map[idx] + ">"] = (
                        "<" + queries[idx][0]["uid"] + ">"
                    )
        finally:
            txn.discard()


def substituteXid(match_obj, xidmap):
    bn = match_obj.groups()[0]
    if bn in xidmap:
        return xidmap[bn]
    else:
        # newXid[bn]=""
        return bn


def mutate_rdf(nquads):
    ret = {}
    if len(nquads) > 0:
        client = getClient()
        print("mutate rdf \n")
        body = "\n".join(nquads)

        tries = 3
        for i in range(tries):
            txn = client.txn()
            try:
                res = txn.mutate(set_nquads=body)
                txn.commit()
                ret["nquads"] = (len(nquads),)
                ret["total_ns"] = res.latency.total_ns
            except pydgraph.errors.AbortedError:
                print("AbortedError %s" % i)
                continue
            except Exception as inst:
                print(type(inst))  # the exception type
                print(inst.args)  # arguments stored in .args
                print(inst)
                break
            finally:
                txn.discard()
            break

    return ret


def split_mutate(client, body, xidmap):
    b2 = re_blank_bracket.sub(lambda match_obj: substituteXid(match_obj, xidmap), body)
    allocate_uid(client, b2, xidmap)
    body = re_blank_bracket.sub(lambda match_obj: substituteXid(match_obj, xidmap), b2)
    # no more blank node at this point
    # cpu_count = mp.cpu_count()
    nquads = body.split("\n")
    all_res = mutate_rdf(nquads)
    print(all_res)

    # multiprocess approach
    # cpu_count = 1
    # split = np.array_split(nquads, cpu_count)
    # we may split in the middle of a predicate list
    # this may cause AbortedTransaction
    # We handle this by retrying the transaction
    # we may do better by not splitting in list-> to do

    # with mp.Pool(cpu_count) as pool:
    #  all_res = pool.map(mutate_rdf, split)
    #  print(all_res)


def rdfmap_to_dgraph(rdfMap, xidmap, client):
    def f(body):
        return split_mutate(client, body, xidmap)

    rdfmap_to_rdf(rdfMap, f)
    return xidmap


def df_to_dgraph(df, template, client, xidpredicate="xid", xidmap=None):
    if xidmap is None:
        xidmap = readXidMapFromDgraph(client, xidpredicate)
    rdfMap = df_to_rdfmap(df, template)
    return rdfmap_to_dgraph(rdfMap, xidmap, client)


def upload_schema(client, schema):
    op = pydgraph.Operation(schema=schema)
    client.alter(op)


def upload_xid_schema(client, xid_predicate):
    schema = f"""
    {xid_predicate}: string @index(exact) @upsert .
    """
    upload_schema(client, schema)
    print("xid definition uploaded.")


xidpredicate = "xid"

gclient = getClient()


if len(sys.argv) == 3:
    output_file = sys.argv[2]
    schema_file = open(output_file, "r")
    schema = schema_file.read()
    schema_file.close()
    print(f"schema ${output_file} loaded.")
    upload_schema(gclient, schema)
    print(f"schema ${output_file} uploaded.")

upload_xid_schema(gclient, xidpredicate)

# op = pydgraph.Operation(drop_op="DATA")
# res = gclient.alter(op)
# print("data deleted")
# print(res)

# Get XIDMAP

xidmap = readXidMapFromDgraph(gclient, xidpredicate)
# iterate over files in
# that directory
# get CSV file and associated template file
# load to dgraph and update the xidmap
for filename in os.listdir(csvdir):
    f = os.path.join(csvdir, filename)
    if os.path.isfile(f) and filename.endswith(".csv"):
        print(f)
        base = os.path.splitext(f)[0]
        templatefilename = base + ".template"
        if os.path.isfile(templatefilename):
            template_file = open(templatefilename, "r")
            template = template_file.read()
            template_file.close()
            df = pd.read_csv(f, keep_default_na=True)
            #
            # transform the dataframe and load to dgraph
            #
            xidmap = df_to_dgraph(df, template, gclient, xidpredicate, xidmap)
