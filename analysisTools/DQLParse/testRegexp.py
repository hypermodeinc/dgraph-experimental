import re

class DQLParser:
    def __init__(self):
        self.state = "IN_ROOT_FUNCTION"
        self.root_function = ""
        self.filter_clause = ""
        self.remaining_query = ""

    def parse(self, dql_string):
        while dql_string:
            if self.state == "IN_ROOT_FUNCTION":
                match = re.match(r'(\w+)\(func: ([^)]+)\)', dql_string)
                if match:
                    self.root_function = f"{match.group(1)}(func: {match.group(2)})"
                    dql_string = dql_string[len(match.group(0)):].strip()
                    self.state = "IN_TOP_LEVEL_AND_FILTER"
                else:
                    self.remaining_query = dql_string
                    break

            elif self.state == "IN_TOP_LEVEL_AND_FILTER":
                match = re.search(r'@filter\(([^)]+)\)', dql_string)
                if match:
                    self.filter_clause = f"@filter({match.group(1)})"
                    dql_string = dql_string[len(match.group(0)):].strip()
                    self.state = "IN_FILTER"
                else:
                    self.remaining_query = dql_string
                    break

            elif self.state == "IN_FILTER":
                # Consume the entire filter clause
                self.remaining_query = dql_string
                break

        if self.state == "IN_FILTER":
            # Reassemble the modified query
            new_root_query = f"{self.root_function} {self.filter_clause}"
            self.remaining_query = dql_string.replace(self.filter_clause, new_root_query, 1)

        return self.remaining_query

def test_dql_parser():
    dql_string = 'myquery(func: eq(name@en, "Steven Spielberg")) @filter(regexp(director.film, /raid/i)) {\n' \
                 '    name@en\n' \
                 '    director.film @filter(allofterms(name@en, "jones indiana") OR allofterms(name@en, "jurassic park"))  {\n' \
                 '      uid\n' \
                 '      name@en\n' \
                 '}'
    
    parser = DQLParser()
    rest = parser.parse(dql_string)


    print(f' filt: {parser.filter_clause}\n root: {parser.root_function}\n rest: {parser.remaining_query} ')

    expected_result = 'myquery(func: regexp(director.film, /raid/i)) @filter(myquery(func: eq(name@en, "Steven Spielberg")) { name@en director.film @filter(allofterms(name@en, "jones indiana") OR allofterms(name@en, "jurassic park")) { uid name@en } })'
    print("expected:", expected_result)
    print("got:     ", new_dql_string)

if __name__ == "__main__":
    test_dql_parser()
