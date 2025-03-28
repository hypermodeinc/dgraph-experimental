import pandas as pd
from typing import Dict, List
from dataclasses import dataclass, field
from typing import Optional

class DataSource:
    def __init__(self, name: str, data: pd.DataFrame):
        self.name = name
        self.data_frame = data
@dataclass
class TableEntityMapping:
    entity: str
    id_field: str = None
    properties: List[str] = field(default_factory=lambda: [])
    relationships: List[str] = field(default_factory=lambda: [])
@dataclass
class TableMapping:
    entity_mappings : List[TableEntityMapping] = field(default_factory=lambda: [])
    template: str = None
    schema: str = None
    error: str = None
@dataclass
class ExtractedData:
    error: str = None
    prompt: str = None
    json: str = None

# Define a namedtuple for the Person structure

TableMappingMap = Dict[str, TableMapping]
# Define the type alias
DataFrameMap = Dict[str, pd.DataFrame]




@dataclass
class KGClass:
    uid: str = ""
    id: str = ""
    role: str = "MAIN"
    label: str = ""
    description: str = ""


@dataclass
class KGSchema:
    label: str = ""
    description: Optional[str] = None
    classes: List['KGClass'] = field(default_factory=list)