import pandas as pd
from KGkit.sdk import KGkit

c = KGkit()
# print(c.check_version())
# print(c.schema())

df = pd.read_csv('data.csv',dtype=str)

c.load(df,"Product")
