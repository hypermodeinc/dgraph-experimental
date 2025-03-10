import unittest
from hypkit.hello import hello

class TestHelloFunction(unittest.TestCase):
    def test_hello(self):
        self.assertEqual(hello(), "Hello from hyp-kgit!")

if __name__ == "__main__":
    unittest.main()