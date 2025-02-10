import re
from string import Template
import sys

####  Parses a Dgraph log and converts LOG Compact lines to RDF triples
####  These triples can then be loaded into Dgraph to analyze compactions



# Check if the usage is correct
if len(sys.argv) != 3:
    print("Usage: python logsToCompactRdf logfile outputRDFfile ")
    sys.exit(1)

# Get the source directory from the command-line argument
inFileName = sys.argv[1]
outFileName = sys.argv[2]

# Open the input file and read the contents into a string


######  Regex to parse a LOG Compact line and extract key parts     #########

# regex bits to make regex string more readable
numAsGroup='(\d+)'            # capture a single integer as text
numListAsGroup='([\d|\s]+)'   # capture a sequence of space-separated numbers
lBrack='\['

# # I0402 20:37:56.500318      23 log.go:34] [2] [E] LOG Compact 5->6 (1, 3 -> 3 tables with 1 splits).
pattern = r'.*LOG Compact '+numAsGroup+'->'+numAsGroup+'..'+numAsGroup +', '+numAsGroup+' -> '+numAsGroup+' tables with '+numAsGroup+' splits\).'
#                   [16498200 . 16484256 16484257 16464747 .] -> [16499578 16499588 16499589 .], took 2.431s"
pattern +=     ' '+lBrack+numListAsGroup+' . '+numListAsGroup+' .] -> \['+numListAsGroup
######

def logLineToRDFLines(line, lineNo):
    matches = re.findall(pattern, line)
    print("matches: ", matches[0])
    fromLevel = matches[0][0]
    toLevel = matches[0][1]
    totFrom = matches[0][2]
    totToOld = matches[0][3]
    totToNew = matches[0][4]
    totSplits = matches[0][5]
    upperFromSSTs = matches[0][6]
    lowerFromSSTs = matches[0][7]
    lowerToSSTs = matches[0][8]

    ######   templates to create RDF lines via var substitution   ########
    # triples about the SSTs directly
    sstT = Template('_:sst_$num <dgraph.type>  "SST" . ')         # assert the SST type of the SST node
    levelT = Template('_:sst_$num <SST.level>  "$level" . ')      # assert the level of the SST, from some compaction line, where the SST numbrer is $num
    numT   = Template('_:sst_$num <SST.number> "$num" .   ')      # assert the number of the SST 
    # triples about Compactions
    compactionT = Template('_:compaction_$lineNo  <dgraph.type>  "Compaction" . ')          # assert the type for each Compaction node 
    cFromSSTT = Template('_:compaction_$lineNo <Compaction.fromSSTs>  _:sst_$fromNum . ')  # assert the compaction consumed/deleted some old SSTs (FROM)
    cToSSTT = Template('_:compaction_$lineNo <Compaction.toSSTs>  _:sst_$toNum . ')        # assert the compaction created some new SSTs (TO)
    cLineT = Template('_:compaction_$lineNo <Compaction.line>  "$lineNo" . ')        # assert the compaction created some new SSTs (TO)

    # TODO: put levels directly on the Compaction vs implicit in the SST data. A little tricky since "level" is passed in as one value below
    #cToSLevel = Template('_:compaction_$lineNo <Compaction.toLevel>  "$toLevel" . ')        # assert the compaction created some new SSTs (TO)
    #cFromLevel = Template('_:compaction_$lineNo <Compaction.fromLevel>  "$fromLevel"  . ')        # assert the compaction created some new SSTs (TO)
    #######

    # Loop over the (probably one) UPPER level SST being compacted AWAY, and use that to assert the SST's number and level
    rdfLines=[]
    compactionRDFLines=[]

    fromSSTs = upperFromSSTs.split()
    for upper in fromSSTs:
        params = {'num': upper, 'fromNum': upper, 'level': fromLevel, 'lineNo': lineNo}
        rdfLines.append(sstT.substitute(params))
        rdfLines.append(levelT.substitute(params))
        rdfLines.append(numT.substitute(params))
        compactionRDFLines.append(compactionT.substitute(params))
        compactionRDFLines.append(cFromSSTT.substitute(params))

    # Loop over the lower level (FROM) SSTs being compacted AWAY, and use the line to assert those SSTs number and level
    fromSSTs = lowerFromSSTs.split()
    for lowerFrom in fromSSTs:
        params={'num':lowerFrom, 'fromNum':lowerFrom, 'level':toLevel, 'lineNo': lineNo}
        rdfLines.append(sstT.substitute({ 'num': lowerFrom}))
        rdfLines.append(levelT.substitute({ 'num': lowerFrom, 'level': toLevel}))
        rdfLines.append(numT.substitute(  { 'num': lowerFrom}))
        compactionRDFLines.append(compactionT.substitute(params))
        compactionRDFLines.append(cFromSSTT.substitute(params))

    # Loop over the lower level (TO) SSTs being CREATED, and use the line to assert those SSTs number and level 
    # often this will be duplicate info with the triples from the line where these are removed, later in the log file
    toSSTs = lowerToSSTs.split()
    for lowerTo in toSSTs:
        params = {'num':lowerTo, 'toNum':lowerTo, 'level': toLevel, 'lineNo': lineNo}
        rdfLines.append(sstT.substitute({ 'num': lowerTo}))
        rdfLines.append(levelT.substitute({ 'num': lowerTo, 'level': toLevel}))
        rdfLines.append(numT.substitute(  { 'num': lowerTo}))
        compactionRDFLines.append(compactionT.substitute(params))
        compactionRDFLines.append(cToSSTT.substitute(params))
    
    compactionRDFLines.append(cLineT.substitute({"lineNo": lineNo}))
    
    rdfLines.extend(compactionRDFLines)
    return rdfLines

lineNo = 0
seenLines = set()
# open the input file for reading
with open(inFileName, 'r') as infile:
    # open the output file for writing
    with open(outFileName, 'w') as outfile:
        # read lines from the input file one at a time
        for line in infile:
            lineNo += 1
            # convert the line to a set of lines using function f()
            rdfLines = logLineToRDFLines(line, lineNo)
            # write the resulting lines to the output file one at a time
            for rdfLine in rdfLines:
                hashval = hash(rdfLine)
                if hashval not in seenLines:
                    seenLines.add(hashval)
                    outfile.write(rdfLine + '\n')



#### TEST to illustrate usage ####

# line = "# I0402 20:37:56.500318      23 log.go:34] [2] [E] LOG Compact 5->6 (1, 3 -> 3 tables with 1 splits). [16498200 . 16484256 16484257 16462999 .] -> [16499578 16499588 16499589 .], took 2.431s"
# lineNo = 555   # just for testing

# rdfLines = logLineToRDFLines(line, lineNo)
# rdfLines = list(dict.fromkeys(rdfLines))  # dedup because triples saying an SST has dgraph.type SST will be in there often
# for l in rdfLines:
#     print(l)

