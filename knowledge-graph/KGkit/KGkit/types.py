import pandas as pd
from typing import Dict, List
from dataclasses import dataclass, field

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

# Define a namedtuple for the Person structure

TableMappingMap = Dict[str, TableMapping]
# Define the type alias
DataFrameMap = Dict[str, pd.DataFrame]