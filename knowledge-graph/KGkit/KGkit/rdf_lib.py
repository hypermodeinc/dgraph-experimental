import random
import re
import sys
import json
from datetime import datetime, timedelta

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
        func("\n".join(rdfBuffer)+ "\n")
        rdfBuffer.clear()


def rdf_map_to_rdf(rdf_map, func):
    rdfBuffer = []
    for k in rdf_map:
        if type(rdf_map[k]) is list:
            for e in rdf_map[k]:
                line = k + " " + e + " ."
                add_to_rdfBuffer(line, rdfBuffer, func, True)
        else:
            line = k + " " + rdf_map[k] + " ."
            add_to_rdfBuffer(line, rdfBuffer, func)
    flush_rdfBuffer(rdfBuffer, func)


def rdf_map_to_file(rdf_map, xidmap, filehandle=sys.stdout):
    def f(body):
        return filehandle.write(
            re_blank_bracket.sub(
                lambda match_obj: substituteXid(match_obj, xidmap), body
            )
        )

    rdf_map_to_rdf(rdf_map, f)
    return xidmap


def addRdfToMap(rdfMap,rdf):
  # applying the template to many tabular data lines may lead to the creation of the same predicate many time
  # e.g: if many line refer to a country object with a country code.
  # we maintain the map of <node id> <predicate> for non list predicates so we can remove duplicates
  # sending several times the the same RDF would not affect the data but this is done to improve performance
  #m = re.match(r"(<\S+>)\s+(<\S+>)\s+(.*)\s+([.*])$",rdf)
  if "\"nan\"" not in rdf:
    m = re_tripple.match(rdf)
    if m:
      parts=m.groups()
      key = parts[0]+" "+parts[1]
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
        replaced = match_obj.group(0)
        ## loop on each group of match (1 to n)
        for i in range(1, match_obj.lastindex+1):
            match_col = match_obj.group(i)
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
            replaced = replaced.replace(match_col, val)
        return replaced


def substitute_in_uid(match_obj, row):
    return substitute(match_obj, row, True)


def substitute_in_value(match_obj, row):
    return substitute(match_obj, row, False)


def substituteFunctions(match_obj, row):
    # substitute is used by substituteInTemplate
    # evaluate function like <_:[HotelCode]> <Hotel.map>  =geoloc([LAT],[LONG]) .
    if match_obj.group() is not None:
        func = match_obj.group(2)
        if func == "geoloc":
            params = match_obj.group(3).split(",")
            lat = float(params[0])
            lng = float(params[1])
            # fmt.Sprintf("\"{\\type\\\":\\\"Point\\\",\\\"coordinates\\\":[%s,%s]}\"^^<geo:geojson>", opMatch[2], opMatch[3]
            return match_obj.group(1)+f"\"{{'type':'Point','coordinates':[{lng:.8f},{lat:.8f}]}}\"^^<geo:geojson>"++match_obj.group(4)
        elif func == "datetime":
            params = match_obj.group(3).split(",")
            date_string = params[0]
            format = params[1]
            date = datetime.strptime(date_string, format)
            return match_obj.group(1)+'"'+date.strftime("%Y-%m-%dT%H:%M:%S")+'"'+match_obj.group(4)
        elif func == "randomDate":
            params = match_obj.group(3).split(",")
            date_string = params[0]
            format = params[1]
            start = datetime.strptime(params[0], "%Y-%m-%d")
            end = datetime.strptime(params[1], "%Y-%m-%d")
            # Generate a random number of days between start and end
            random_days = random.randint(0, (end - start).days)
            # Add the random number of days to the start date
            random_date = start + timedelta(days=random_days)
            # Return the date in the desired format
            return match_obj.group(1)+'"'+random_date.strftime("%Y-%m-%d")+'"'+match_obj.group(4)
        elif func == "split":
            params = match_obj.group(3).strip()
            r = ""
            if (params.startswith('[') & params.endswith(']')):
                params = params.replace("'",'"')
                values = json.loads(params)
                for v in values:
                    r += (match_obj.group(1)+'"'+v.strip()+'"'+match_obj.group(4))+"\n"
            else:
                r = match_obj.group(1)+'"'+params+'"'+match_obj.group(4)+"\n"
            return r

        else:
            raise ValueError("unsupported function " + func)


re_column = re.compile(r"(\[[\w .,|]+\])")
# re_uid = re.compile(r"<[^[]*(\[[\w .,|]+\])[^>]*>")
re_uid = re.compile(r"<_:[^>]*?(\[[^\]]+\])(?:[^>]*?(\[[^\]]+\]))?[^>]*?>")
# =func(param1,param2) not in a string
re_functions = re.compile(r'(^[^"]*)=(\w+)\(([^)]+)?\)(.*)$')


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
    subst3 = re_functions.sub(
        lambda match_obj: substituteFunctions(match_obj, row), subst2
    )
    return subst3


def transformDataFrame(df, template):
    # Split the template lines once and filter out comments
    valid_templates = [line for line in template.splitlines() if not line.startswith("#")]

    rdf_map = {}

    # Iterate over rows more efficiently using apply
    def process_row(row):
        # Add the LINE_NUMBER to the row
        row["LINENUMBER"] = row.name  # .name is the index of the row in apply
        # Process each valid template line
        for rdftemplate in valid_templates:
            rdf = substituteInTemplate(rdftemplate, row)
            if rdf is not None:
                for r in rdf.split("\n"):
                    addRdfToMap(rdf_map, r)

    # Apply processing row-wise
    df.apply(process_row, axis=1)

    return rdf_map


def df_to_rdf_map(df, template):

    # rdf_map will contains key = subject predicate ; value = object
    # example:
    #   key '<_:3150-JP> <dgraph.type>'
    #   of rdf_map['<_:3150-JP> <dgraph.type>'] : '"Company"'

    rdf_map = transformDataFrame(df, template)
    return rdf_map


def df_to_rdffile(df, template, filehandle=sys.stdout, xidmap=None):
    if xidmap is None:
        xidmap = {}
    rdf_map = df_to_rdf_map(df, template)
    return rdf_map_to_file(rdf_map, xidmap, filehandle)