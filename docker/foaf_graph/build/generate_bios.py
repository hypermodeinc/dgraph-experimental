import json
import random

# Lists for generating bios
professions = [
    "Sales professional", "Freelance graphic designer", "Retired school teacher",
    "Aspiring chef", "Software developer", "Veterinarian", "Professional musician",
    "High school student", "Entrepreneur", "Research scientist", "Lawyer",
    "Engineer", "Nurse", "Artist", "Writer", "Photographer", "Athlete",
    "Doctor", "Teacher", "Chef", "Musician", "Designer", "Programmer",
    "Social worker", "Architect", "Flight attendant", "Police officer",
    "Dental hygienist", "Financial advisor", "Personal trainer",
    "Physical therapist", "Electrician", "Plumber", "Real estate agent",
    "Librarian", "Psychologist", "Journalist", "Baker", "Pharmacist",
    "Interior designer", "Web developer", "Data scientist", "Marine biologist",
    "Accountant", "Actuary", "Agricultural scientist", "Air traffic controller",
    "Anthropologist", "Archaeologist", "Astronomer", "Audiologist",
    "Biomedical engineer", "Business analyst", "Carpenter", "Chiropractor",
    "Civil engineer", "Clinical researcher", "Content creator", "Copywriter",
    "Cybersecurity analyst", "Dance instructor", "Dietitian", "Digital marketer",
    "Environmental scientist", "Event planner", "Fashion designer", "Film director",
    "Financial planner", "Food scientist", "Forensic scientist", "Game developer",
    "Geologist", "HR manager", "Industrial designer", "Investment banker",
    "Language translator", "Logistics coordinator", "Makeup artist", "Mechanical engineer",
    "Meteorologist", "Nutritionist", "Occupational therapist", "Optometrist",
    "Paramedic", "Patent attorney", "Product manager", "Public relations specialist",
    "Quality assurance tester", "Radio host", "Risk analyst", "Speech therapist",
    "Sports coach", "Tax consultant", "Urban planner", "UX designer",
    "Video editor", "Voice actor", "Wedding planner", "Youth counselor",
    "Zoologist", "Zookeeper",
    "Veterinarian", "Veterinary technician", "Veterinary assistant",
    "Veterinary nurse", "Veterinary receptionist", "Veterinary assistant",
]

hobbies = [
    "who loves hiking", "who enjoys photography", "and grandfather of five",
    "with a passion for sustainable cooking practices", "and amateur astronomer",
    "and father of triplets", "specializing in classical piano and jazz",
    "and competitive swimmer", "avid mountain biker", "focusing on climate change",
    "volunteer firefighter", "who loves reading", "enjoys playing chess",
    "passionate about painting", "into gardening", "interested in astronomy",
    "who practices yoga", "dedicated to martial arts", "who collects vintage vinyl",
    "passionate about birdwatching", "who enjoys rock climbing",
    "who loves board gaming", "enthusiastic about pottery making",
    "who practices meditation", "passionate about wildlife photography",
    "who enjoys salsa dancing", "dedicated to urban sketching",
    "who loves scuba diving", "interested in beekeeping",
    "who enjoys woodworking", "passionate about film making",
    "who practices archery", "enthusiastic about home brewing",
    "who enjoys kayaking", "dedicated to volunteer work",
    "who loves origami", "interested in foraging",
    "who creates miniature dioramas", "passionate about mushroom hunting",
    "who practices aerial silk acrobatics", "dedicated to urban farming",
    "who restores vintage motorcycles", "enthusiastic about soap making",
    "who practices glassblowing", "interested in terrarium design",
    "who creates botanical illustrations", "passionate about cheese making",
    "who practices falconry", "dedicated to historical reenactment",
    "who builds custom mechanical keyboards", "interested in bookbinding",
    "who practices ice sculpting", "passionate about bonsai cultivation",
    "who creates mosaic art", "enthusiastic about axe throwing",
    "who practices traditional blacksmithing", "interested in kite surfing",
    "who creates stained glass art", "passionate about beachcombing",
    "who practices traditional weaving", "dedicated to butterfly conservation",
    "who creates paper art", "enthusiastic about geocaching",
    "who practices leather crafting", "interested in aquascaping",
    "who creates digital art", "passionate about drone racing",
    "who practices calligraphy", "dedicated to urban archaeology",
    "who enjoys playing the guitar", "who loves to read",
    "who enjoys playing the piano", "who loves to write",
    "who enjoys playing the drums", "who loves to paint",
    "who enjoys playing the violin", "who loves to dance",
    "who enjoys playing the flute", "who loves to sing",
    "who enjoys playing the saxophone", "who loves to cook",
    "who enjoys playing the bass guitar", "who loves to travel",
    "who enjoys playing the clarinet", "who loves to hike",
    "who enjoys playing the cello", "who loves to swim",
    "who enjoys playing the flute", "who loves to dance",
    "who enjoys playing the harp", "who loves to read",
]

family_roles = [
    "single", "married", "divorced", "widowed",
    "mother of two", "father of three", "grandparent of four",
    "sibling of five", "aunt of six", "uncle of seven",
    "cousin of eight", "niece of nine", "nephew of ten"
]

bios = []
seen = set()

while len(bios) < 1000:
    # Randomly select elements
    prof = random.choice(professions)
    
    # Randomly choose between hobby or family role
    if random.random() < 0.5:
        second_part = random.choice(hobbies)
    else:
        second_part = random.choice(family_roles)

    bio = f"{prof}, {second_part}."
    if bio not in seen:
        bios.append({"bio": bio})
        seen.add(bio)

# Save to JSON file
with open('bios.json', 'w') as f:
    json.dump(bios, f, indent=2)