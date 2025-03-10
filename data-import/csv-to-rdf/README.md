# csvtordf - Convert CSV to RDF file

Convert CSV files from a import folder to a single RDF file for Dgraph import tools.

Some CSV import tools for graph database are using specific format for nodes and edges.
This tool is different: the goal is to handle any set of CSV files and produce triples in RDF format mapping the data as a graph to be loaded in Dgraph.

The mapping uses a processing template for each CSV.

CSV file must have headers.

## template file

A template file is a text file defining RDF triples.
[column name] are substituted by the corresponding value of the lines of the CSV files.

Template files are named from the CSV files:
`my_data.csv` will be converted using `my_data.template`

### data substitution

> [column name]

```txt
<_:State_[School.State]> <name> "[School.State]" .

```

If a predicate can be repeated for the same entity id (list) then mark it with a star \* instead a dot at the end of the RDF template :

```txt
<_:Donor[Donor.ID]> <donor_donation> <_:Donation_[Donation.ID]> *
```


### post processing

> [column name,processing function]

```txt
<_:City_[School.City]> <dgraph.type> "City" .
```

Available processing :

- nospace : replace no word characters (\W in regexp) by \_
- toUpper
- toLower
### blank nodes
data substitution used in black nodes is always done with `nospace` operator to obtain valid identifiers.

Data substitution in blank nodes is limited to 2 values.

Example using 2 substitutions to uniquely identify a sub-category node:
```txt
<_:CategoryTerm_[Project.Category]_[Project.Subcategory]>  <CategoryTerm.label@en>  "[Project.Subcategory]" .
```


### functions

You can use functions to generate data

> =function(params)

```txt
<_:School_[School.ID]> <geoloc> =geoloc([LAT],[LNG]) .
<_:Donation_[Donation.ID]> <day> =randomDate(2020-01-01,2022-12-31) .
```

Available functions :

- geoloc(lat,long) : generate a RDF value with geoloc json string
- datetime(column, format): convert the string value from the format to the expected format "%Y-%m-%dT%H:%M:%S"

```txt
# Example of datetime conversion
<_:P_[twitch_id]_[twitch_game_id]> <PlayGame.last_streamed> "=datetime([last_streamed],%Y-%m-%d %H:%M:%S.%f %z)" .
```

## Usage

Generate RDF file

````python
python csv_to_rdf.py

Usage: csv_to_rdf.py <directory> <output_file>
<directory> is the directory containing the CSV files and their associated templates
<output_file> is the file to write the RDF output to. If not provided, the output will be written to stdout

```txt

Generate rdf file from the sample

```python
python upload_csv.py sample donors.rdf
````

Upload to Dgraph.
Option1: use `dgraph live` to load the generated RDF file with corresponding Dgraph schema

Option2: use `upload_csv.py`: creates RDF from the CSV files and mutate to Dgraph.

```python
python upload_csv.py sample

```
