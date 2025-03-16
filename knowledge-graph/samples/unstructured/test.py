import json
import dotenv
import os
from mistralai import Mistral
from KGkit import KG

dotenv.load_dotenv()

kg = KG().with_mistral("mistral-small-latest",Mistral(api_key=os.getenv("MISTRAL_API_KEY")))
# print(c.check_version())
# print(c.schema())

kg.with_kg_schema('''
                  """A natural body in space, such as a planet, star, or moon."""
                  type CelestialBody {
                    """ Short name uniquely identifying the celestial body."""
                    label: ID!
                  }
                  ''')
print(kg.get_kg_schema_str())

suggestion = kg.extract_entities_from_text("""
## Jupiter
**Jupiter** is the fifth planet from the [Sun](/wiki/Sun "Sun"), and is the largest planet in the
[Solar System](/wiki/Solar_System "Solar System"). It is a giant planet with a mass one-thousandth
that of the Sun, but two-and-a-half times that of all the other planets in the Solar System
combined. Jupiter and [Saturn](/wiki/Saturn "Saturn") are [gas giants](/wiki/Gas_giant "Gas giant");
the other two giant planets, [Uranus](/wiki/Uranus "Uranus") and [Neptune](/wiki/Neptune "Neptune")"
""")
print(json.dumps(json.loads(suggestion), indent=2))
