## csvtordf - Convert CSV to RDF file

Convert CSV files from a import folder to a single RDF file for Dgraph import tools.
The conversion is using a processing template for each CSV.

CSV file must have headers.

A template file is a text file defining RDF triples.
[column name] are substituted by the corresponding value of the lines of the CSV files. 

Template files are named from the CSV files:
`my_data.csv` will be converted using `my_data.template`

### data substitution
> [column name]
```
<_:State_[School.State]> <name> "[School.State]" .

```

If a predicate can be repeated for the same entity id (list) then mark it with a star * instead a dot at the end of the RDF template :

```
<_:Donor[Donor.ID]> <donor_donation> <_:Donation_[Donation.ID]> *
```

### post processing
> [column name,processing function]
```
<_:City_[School.City,nospace]> <dgraph.type> "City" .
```
Available processing :
- nospace : replace spaces by _
- toUpper
- toLower 


### functions
You can use functions to generate data 
> =function(params)


```
<_:School_[School.ID]> <geoloc> =geoloc([LAT],[LNG]) .
<_:Donation_[Donation.ID]> <day> "=randomDate(2020-01-01,2022-12-31)" .
```
Available functions :
- geoloc(lat,long) : generate a RDF value with geoloc json string
