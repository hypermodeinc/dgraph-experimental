from mimesis import Person, Datetime, Generic
from mimesis.locales import Locale
import json
import random
from datetime import datetime, timezone
from sentence_transformers import SentenceTransformer
from shapely.geometry import Point, Polygon
import math

model = SentenceTransformer('all-MiniLM-L6-v2')

# Define some sample cities with rough boundaries
SAMPLE_LOCALITIES = [
    {
        "name": "Downtown Seattle",
        "center": (-122.3321, 47.6062),
        "country": "USA"
    },
    {
        "name": "Mexico City Centro",
        "center": (-99.1332, 19.4326),
        "country": "Mexico"
    },
    {
        "name": "Toronto Downtown",
        "center": (-79.3832, 43.6532),
        "country": "Canada"
    },
    {
        "name": "Manhattan",
        "center": (-73.9857, 40.7484),
        "country": "USA"
    },
    {
        "name": "Vancouver Downtown",
        "center": (-123.1207, 49.2827),
        "country": "Canada"
    },
    {
        "name": "Guadalajara Centro",
        "center": (-103.3496, 20.6767),
        "country": "Mexico"
    },
    {
        "name": "San Francisco Downtown",
        "center": (-122.4194, 37.7749),
        "country": "USA"
    },
    {
        "name": "Montreal Downtown",
        "center": (-73.5673, 45.5017),
        "country": "Canada"
    }
]

def generate_random_polygon(center, size_miles=4):
    # Convert miles to degrees (rough approximation)
    size_deg = size_miles / 69  # 1 degree ≈ 69 miles
    
    # Generate a random number of vertices (6-8)
    num_vertices = random.randint(6, 8)
    
    # Generate vertices in a roughly circular pattern
    polygon_points = []
    
    for i in range(num_vertices):
        # Calculate angle for this vertex (evenly spaced)
        angle = (2 * 3.14159 * i) / num_vertices
        # Add some randomness to the radius
        radius = size_deg * (0.8 + 0.4 * random.random())
        x = center[0] + radius * math.cos(angle)
        y = center[1] + radius * math.sin(angle)
        polygon_points.append([x, y])
    
    # Close the polygon
    polygon_points.append(polygon_points[0])
    return polygon_points

def generate_point_in_polygon(polygon_coords):
    polygon = Polygon(polygon_coords)
    minx, miny, maxx, maxy = polygon.bounds
    
    while True:
        point = Point(random.uniform(minx, maxx), random.uniform(miny, maxy))
        if polygon.contains(point):
            return [point.x, point.y]

def generate_pet(generic, owner_uid):
    pet_types = ["DOG", "CAT", "BIRD", "FISH", "OTHER"]
    return {
        "dgraph.type": "Pet",
        "Pet.name": generic.person.first_name(),
        "Pet.type": random.choice(pet_types),
        "Entity.age": random.randint(1, 15),
        "Pet.owner": {
            "uid": owner_uid
        }
    }

def generate_person(person_gen, generic, datetime_gen, get_bio):
    name = person_gen.full_name()
    uid = f"_:{name}"  # Using name as the UID reference
    bio = get_bio()
    
    # Select a random locality and generate its polygon
    locality = random.choice(SAMPLE_LOCALITIES)
    polygon_coords = generate_random_polygon(locality["center"])
    
    # 95% chance to be inside the polygon, 5% chance to be anywhere
    if random.random() > 0.05:
        location_coords = generate_point_in_polygon(polygon_coords)
    else:
        location_coords = [
            round(random.uniform(-180, 180), 6),
            round(random.uniform(-90, 90), 6)
        ]
    
    person = {
        "dgraph.type": "Person",
        "uid": uid,
        "Person.name": name,
        "Person.age": random.randint(18, 90),
        "Person.rating": round(random.uniform(1.0, 5.0), 2),
        "Person.isActive": random.choice([True, False]),
        "Person.createdAt": datetime_gen.datetime(start=2000, end=2024).isoformat(),
        "Person.bio": bio,
        "Person.bio_v": str(model.encode(bio).tolist()),
        "Person.location": {
            "type": "Point",
            "coordinates": location_coords
        },
        "Person.locality": {
            "type": "Polygon",
            "coordinates": [polygon_coords]
        }
    }
    
    # Add pets (50% chance of having pets)
    if random.random() < 0.5:
        # Determine number of pets
        rand_val = random.random()
        if rand_val < 0.75:  # 75% have 1 pet
            num_pets = 1
        elif rand_val < 0.95:  # 20% have 2 pets
            num_pets = 2
        else:  # 5% have 3 pets
            num_pets = 3
        
        person["Person.pets"] = [generate_pet(generic, uid) for _ in range(num_pets)]
    
    return person

def generate_synthetic_data(num_persons=100):
    # Initialize Mimesis generators
    person_gen = Person(locale=Locale.EN)
    generic = Generic()
    datetime_gen = Datetime()

    # Load and prepare bios
    with open('bios.json', 'r') as f:
        bios = json.load(f)
    
    bio_pool = iter(bios)
    
    def get_next_bio():
        nonlocal bio_pool
        try:
            return next(bio_pool)['bio']  # Extract just the 'bio' value from the dictionary
        except StopIteration:
            # Reset the iterator when we run out of bios
            bio_pool = iter(bios)
            return next(bio_pool)['bio']  # Extract just the 'bio' value here too

    # Generate data
    data = []
    
    # Generate persons with inline pets
    for _ in range(num_persons):
        person = generate_person(person_gen, generic, datetime_gen, get_next_bio)
        data.append(person)

    return data

def main():
    # Generate 250 persons (and corresponding pets)
    data = generate_synthetic_data(250)
    
    # Write to JSON file
    with open('dgraph_data.json', 'w') as f:
        json.dump({"set": data}, f, indent=2)

if __name__ == "__main__":
    main()