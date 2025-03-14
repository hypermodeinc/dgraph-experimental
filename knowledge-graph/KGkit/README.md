# Hypermode KGKit python package

WORK IN PROGRESS - NOT TO BE USED

KGkit/
│
├── KGkit/
│   ├── __init__.py
│   ├── sdk.py
│  
│
├── tests/
│   ├── __init__.py
│   ├── test_sdk.py
│   
│
├── setup.py
├── README.md
└── requirements.txt

### Tests
```sh
python -m unittest discover tests
```

### Install
To install the package locally in "editable" mode, run the following command in the root directory (where setup.py is located):

```
pip install -e .
```
## Features

Use naming convention
prefixed column : `Project.Name` -> entity is `Project`
CSV without any prefixed column -> use `Thing`
at least one prefixed column -> use first prefix for the the entity. columns order maters: 
'Project.Name','School.ID' -> the main entity is the first seen Project and School.ID is used as a relationship to a School entity.

non-prefixed columns are use as properties of the main entity.

Geoloc:
- detect/handle LAT LONG or latitude longitude columns

## Backlog
- detect/handle datetime column

- Return the number of Entities created
- add embeddings capability
- detect/handle columns containing array of strings

