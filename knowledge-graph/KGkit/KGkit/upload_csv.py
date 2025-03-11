import json
import re
import pydgraph
from .rdf_lib import df_to_rdf_map, rdf_map_to_rdf






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


def mutate_rdf(client, nquads):
    ret = {}
    if len(nquads) > 0:
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
    mutate_rdf(client, nquads)

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


def rdf_map_to_dgraph(rdfMap, xidmap, client):
    def f(body):
        return split_mutate(client, body, xidmap)

    rdf_map_to_rdf(rdfMap, f)
    return xidmap


def df_to_dgraph(df, template, client, xidpredicate="xid", xidmap=None):
    if xidmap is None:
        xidmap = readXidMapFromDgraph(client, xidpredicate)
    rdfMap = df_to_rdf_map(df, template)
    return rdf_map_to_dgraph(rdfMap, xidmap, client)


def upload_schema(client, schema):
    op = pydgraph.Operation(schema=schema)
    client.alter(op)


def upload_xid_schema(client, xid_predicate):
    schema = f"""
    {xid_predicate}: string @index(exact) @upsert .
    """
    upload_schema(client, schema)
    print("xid definition uploaded.")




