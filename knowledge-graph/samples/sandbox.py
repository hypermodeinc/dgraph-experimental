import pandas as pd
from pprint import pprint
from KGkit import KG,DataSource

kg = KG()
# print(c.check_version())
# print(c.schema())

df1 = pd.read_csv('Projects-CA10.csv',dtype=str, usecols=['Project.ID','Project.Title','School.ID','Project.Cost','Project.Subject.Category.Tree'])
df2 = pd.read_csv('Schools-CA10.csv',dtype=str)

res = kg.load([
    DataSource("Projects",df1),
    DataSource("Schools",df2)
])
pprint(res)
