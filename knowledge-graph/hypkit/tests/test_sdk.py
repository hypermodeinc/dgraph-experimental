import unittest
from hypkit.sdk import Hypkit

class TestHypkitFunction(unittest.TestCase):
    def test_constructor(self):
        kit = Hypkit()  
        self.assertIsNotNone(kit.check_version())

if __name__ == "__main__":
    unittest.main()
