import pandas as pd
from pprint import pprint
from KGkit import KG

c = KG()
# print(c.check_version())
# print(c.schema())

df1 = pd.read_csv('Projects-CA10.csv',dtype=str)
df2 = pd.read_csv('Schools-CA10.csv',dtype=str)

res = c.load({
    "Project": df1,
    "School":  df2
    })
pprint(res)
