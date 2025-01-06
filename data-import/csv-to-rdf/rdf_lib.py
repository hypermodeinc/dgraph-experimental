import os
import random
import re
import sys
from datetime import datetime, timedelta

import pandas as pd


sliceSize = 5000  # mutate every sliceSize RDF lines

re_blank_bracket = re.compile(r"(<_:\S+>)")
re_blank_subject = re.compile(r"^\s*<(_:\S+)>")  # used for match subject
re_tripple = re.compile(r"(<\S+>)\s+(<\S+>)\s+(.*)\s+([.*])$")


def substituteXid(match_obj, xidmap):
    bn = match_obj.groups()[0]
    if bn in xidmap:
        return xidmap[bn]
    else:
        # newXid[bn]=""
        return bn


def add_to_rdfBuffer(rdf, rdfBuffer, func, isList=False):
    rdfBuffer.append(rdf)
    if len(rdfBuffer) > sliceSize and isList is False:
        # substitute xidmap. xidmap is updated by the mutation
        # must be done in single thread as new xidmap is used for next data chunck
        func("\n".join(rdfBuffer) + "\n")
        rdfBuffer.clear()


def flush_rdfBuffer(rdfBuffer, func):
    if len(rdfBuffer) > 0:
        func("\n".join(rdfBuffer))
        rdfBuffer.clear()


def rdfmap_to_rdf(rdfMap, func):
    rdfBuffer = []
    for k in rdfMap:
        if type(rdfMap[k]) is list:
            for e in rdfMap[k]:
                line = k + " " + e + " ."
                add_to_rdfBuffer(line, rdfBuffer, func, True)
        else:
            line = k + " " + rdfMap[k] + " ."
            add_to_rdfBuffer(line, rdfBuffer, func)
    flush_rdfBuffer(rdfBuffer, func)


def rdfmap_to_file(rdfMap, xidmap, filehandle=sys.stdout):
    def f(body):
        return filehandle.write(
            re_blank_bracket.sub(
                lambda match_obj: substituteXid(match_obj, xidmap), body
            )
        )

    rdfmap_to_rdf(rdfMap, f)
    return xidmap


def addRdfToMap(rdfMap, rdf):
    # applying the template to many tabular data lines may lead to the creatio of the same predicate many time
    # e.g: if many line refer to a country object with a country code.
    # we maintain the map of <node id> <predicate> for non list predicates so we can remove duplicates
    # sending several times the the same RDF would not affect the data but this is done to improve performance
    # m = re.match(r"(<\S+>)\s+(<\S+>)\s+(.*)\s+([.*])$",rdf)
    if '"nan"' not in rdf:
        m = re_tripple.match(rdf)
        if m:
            parts = m.groups()
            key = parts[0] + " " + parts[1]
            if parts[-1] == "*":
                if key in rdfMap:
                    rdfMap[key].append(parts[2])
                else:
                    rdfMap[key] = [parts[2]]
            else:
                rdfMap[key] = parts[2]


def substitute(match_obj, row, nospace=False):
    # substitute is used by substituteInTemplate
    # receive the reg exp matching object and return the value to substitute
    # the matching object is in the form <column name>,<function>
    # substitute by the value in row map and apply function if present
    if match_obj.group() is not None:
        match_col = match_obj.group(1)
        fieldAndFunc = match_col[1:-1].split(",")
        field = fieldAndFunc[0]
        val = str(row[field]).replace('"', r"\"").replace("\n", r"\n")
        if nospace:
            val = re.sub(r"\W", "_", val)
        if len(fieldAndFunc) > 1:
            func = fieldAndFunc[1]
            if func == "nospace":
                val = val.replace(" ", "_")
            elif func == "toUpper":
                val = val.upper()
            elif func == "toLower":
                val = val.lower()
            else:
                raise ValueError("unsupported function " + func)
        replaced = match_obj.group(0).replace(match_col, val)
        return replaced


def substitute_in_uid(match_obj, row):
    return substitute(match_obj, row, True)


def substitute_in_value(match_obj, row):
    return substitute(match_obj, row, False)


def substituteFunctions(match_obj, row):
    # substitute is used by substituteInTemplate
    # evaluate function like <_:[HotelCode]> <Hotel.map>  =geoloc([LAT],[LONG]) .
    if match_obj.group() is not None:
        func = match_obj.group(1)
        if func == "geoloc":
            lat = float(match_obj.group(2))
            lng = float(match_obj.group(3))
            # fmt.Sprintf("\"{\\type\\\":\\\"Point\\\",\\\"coordinates\\\":[%s,%s]}\"^^<geo:geojson>", opMatch[2], opMatch[3]
            return f"\"{{'type':'Point','coordinates':[{lng:.8f},{lat:.8f}]}}\"^^<geo:geojson>"
        elif func == "datetime":
            date_string = match_obj.group(2)
            format = match_obj.group(3)
            date = datetime.datetime.strptime(date_string, format)
            return date.strftime("%Y-%m-%dT%H:%M:%S")
        elif func == "randomDate":
            start = datetime.strptime(match_obj.group(2), "%Y-%m-%d")
            end = datetime.strptime(match_obj.group(3), "%Y-%m-%d")
            # Generate a random number of days between start and end
            random_days = random.randint(0, (end - start).days)
            # Add the random number of days to the start date
            random_date = start + timedelta(days=random_days)
            # Return the date in the desired format
            return random_date.strftime("%Y-%m-%d")
        else:
            raise ValueError("unsupported function " + func)


re_column = re.compile(r"(\[[\w .,|]+\])")
re_uid = re.compile(r"<[^[]*(\[[\w .,|]+\])[^>]*>")

re_functions = re.compile(r"=(\w+)\(([^,)]+),?([^,)]+)?\)")


def substituteInTemplate(template, row):
    fields = re_column.findall(template)
    for field in fields:
        column = field[1:-1].split(",")[0]
        if str(row[column]) == "nan":
            return None
    # substitute all instances of [<column name>,<function>] in the template by corresponding value from the row map
    subst1 = re_uid.sub(lambda match_obj: substitute_in_uid(match_obj, row), template)
    subst2 = re_column.sub(
        lambda match_obj: substitute_in_value(match_obj, row), subst1
    )

    return re_functions.sub(
        lambda match_obj: substituteFunctions(match_obj, row), subst2
    )


def transformDataFrame(df, template):
    rdfMap = {}
    for index, row in df.iterrows():
        row["LINENUMBER"] = index
        # for each tabular row we evaluate all line of the RDF template
        for rdftemplate in iter(template.splitlines()):
            if not rdftemplate.startswith("#"):
                rdf = substituteInTemplate(rdftemplate, row)
                if rdf is not None:
                    addRdfToMap(rdfMap, rdf)
    return rdfMap


def df_to_rdfmap(df, template):

    # rdfMap will contains key = subject predicate ; value = object
    # example:
    #   key '<_:3150-JP> <dgraph.type>'
    #   of rdfmap['<_:3150-JP> <dgraph.type>'] : '"Company"'

    rdfMap = transformDataFrame(df, template)
    return rdfMap


def df_to_rdffile(
    df, template, filehandle=sys.stdout, xidmap=None
):
    if xidmap is None:
        xidmap = {}
    rdfMap = df_to_rdfmap(df, template)
    return rdfmap_to_file(rdfMap, xidmap, filehandle)


    

                
