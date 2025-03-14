import unittest
import pandas as pd
from KGkit import KG
from KGkit.sdk import guess_properties, guess_relationships
class TestHypkitFunction(unittest.TestCase):
    def test_constructor(self):

        kg = KG()
        print(kg.dgraph_grpc)
        self.assertIsNotNone(kg.check_version())
        self.assertIsNone(kg.drop_data_and_schema())
        gql = kg.GraphQL_schema()
        self.assertIsNone(gql)
        self.assertEqual(kg.schema(),'<xid>:  string @index(hash) .\n')

        data = {
        'Project:ID': ['x', 'y'],
        'Project.Name': ['nx', 'ny']
        }

        # Create the DataFrame
        df = pd.DataFrame(data)
        self.assertEqual(guess_properties('Project',['Project:ID', 'Project.Name', 'Test']), ['Project:ID', 'Project.Name'])
        self.assertEqual(guess_relationships('Project',['Project:ID', 'Project.Name', 'School.ID'],['Project','School']), ['School.ID'])

if __name__ == "__main__":
    unittest.main()
