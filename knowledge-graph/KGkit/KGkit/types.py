import pandas as pd
from typing import Dict, List
from dataclasses import dataclass, field

@dataclass
class TableMapping:
    entity: str
    id_field: str = None
    properties: List[str] = field(default_factory=lambda: [])
    relationships: List[str] = field(default_factory=lambda: [])
    template: str = None
    error: str = None

# Define a namedtuple for the Person structure

TableMappingMap = Dict[str, TableMapping]
# Define the type alias
DataFrameMap = Dict[str, pd.DataFrame]