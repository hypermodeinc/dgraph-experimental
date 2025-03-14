import pandas as pd
from pprint import pprint
from KGkit import KG,DataSource

kg = KG()
# print(c.check_version())
# print(c.schema())

df1 = pd.read_csv('Projects-CA10.csv',dtype=str, usecols=['Project.ID','Project.Title','School.ID','Project.Cost','Project.Subject.Category.Tree'])
df2 = pd.read_csv('Schools-CA10.csv',dtype=str)
df3 = pd.read_csv('Donations-CA10.csv',dtype=str, usecols=['Donation.ID','Project.ID','Donor.ID','Donation.Amount'])
# set the columns order first column must be the identifier of the main entity
df3 = df3[['Donation.ID','Project.ID','Donor.ID','Donation.Amount']]
res = kg.load([
    DataSource("Projects",df1),
    DataSource("Schools",df2),
    DataSource("Donations",df3)
],mutate=True)
# pprint(res)
