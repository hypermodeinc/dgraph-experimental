import unittest
from kgkit.sdk import KGkit

class TestHypkitFunction(unittest.TestCase):
    def test_constructor(self):
        kit = KGkit()  
        self.assertIsNotNone(kit.check_version())

if __name__ == "__main__":
    unittest.main()
