# Hypkit class to interact with Hypkit API
import pydgraph
import grpc
import json
from typing import Optional



class Hypkit(object):
    dgraph_token: Optional[str] = None
    dgraph_grpc: Optional[str] = None
    dgraph_client: any = None

    def __init__(
            self, 
            token: Optional[str] = None,
            grpc_target: Optional[str] = None):
        if grpc_target is None:
            grpc_target = "localhost:9080"
        self.dgraph_grpc = grpc_target
        self.dgraph_token = token
        self._init_client()

        
    def _init_client(self):
        if "cloud.dgraph.io" in self.dgraph_grpc:
            client_stub = pydgraph.DgraphClientStub.from_cloud(self.dgraph_grpc, self.dgraph_token)
        elif "hypermode.host" in self.dgraph_grpc:
            creds = grpc.ssl_channel_credentials()
            call_credentials = grpc.access_token_call_credentials(self.dgraph_token)
            composite_credentials = grpc.composite_channel_credentials(creds, call_credentials)
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc, credentials=composite_credentials, )
        else:
            client_stub = pydgraph.DgraphClientStub(self.dgraph_grpc)
        self.dgraph_client = pydgraph.DgraphClient(client_stub)
        return self.dgraph_client
    
    def check_version(self):
        return self.dgraph_client.check_version()
    
    def schema(self):
        txn = self.dgraph_client.txn()
        try:
        # Run query.
            query = "schema{}"
            res = txn.query(query)

            # If not doing a mutation in the same transaction, simply use:
            # res = client.txn(read_only=True).query(query, variables=variables)

            data = json.loads(res.json)
            schema = ''
            for predicate in data['schema']:
                schema += '<{0}>: '.format(predicate['predicate'])
                if ('list' in predicate):
                    schema += " [{}]".format(predicate['type'])
                else:
                    schema += " {}".format(predicate['type'])
                if ('tokenizer' in predicate):
                    schema += " @index({})".format(','.join(predicate['tokenizer']))
                if ('upsert' in predicate):
                    schema += ' @upsert'                
                schema += " .\n"
            # Print results.
            return schema

        finally:
            txn.discard()