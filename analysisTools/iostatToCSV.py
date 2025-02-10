import csv
import re
import sys


####
#### Convert iostat output (which we gather in our typica perf monitoring) to CSV
#### Allows IO and CPU activity to be graphed over time, or otherwise procssed in a spreadsheet
####

# Check if the usage is correct
if len(sys.argv) != 3:
    print("Usage: python iostatToCSV filename devicename prefix")
    sys.exit(1)

# Get the source directory from the command-line argument
input_file = sys.argv[1]
dev_name = sys.argv[2]    # the device name from the start of the IO activity section to look for

# advance file to timestamp line and return that line
def findTimestampLine(file):
    blanks = 0
    dateAndTimeRegex = r"\d{2}/\d{2}/\d{2} \d{2}:\d{2}:\d{2}"
    line = file.readline()
    while not re.match(dateAndTimeRegex, line) and blanks < 10:
        line = file.readline()
        blanks = blanks+1       # EOF also is a blank line returned, so count them and exit if too many
    return line.strip()

# parse a chunk of iostat info (multiline) into time, cpu, IO rates, printing to std out
# returns the first line of the next block (a date time line)
def parseTimeCpuAndDisk(file, currLine):
    time = currLine.split()[1]

    cpu_data = file.readline()          # cpu header line to skip
    cpu_data = file.readline()          # cpu data
    cpu_idle = cpu_data.split()[5]      # fifth number is cpu idle
    cpu = format(100.0 - float(cpu_idle), '.2f')

    file.readline()   # blank line to skip
    file.readline()   # io data header line to skip

    while not currLine.startswith(dev_name):   # find the line for the device we want
        currLine = file.readline()            
    wkb = currLine.split()[8]                  # 9th value is write kb/s

    while not currLine.strip()=="":
        currLine=file.readline()               # skip any device lines after the one we wanted
    
    print("{0},{1},{2}".format(time, cpu, wkb))

    return currLine


# Open the file for reading
file = open(input_file, "r")

print('timestamp,cpu,write')   # write is kb/sec with iostat -k option
line = findTimestampLine(file)
max = 100000
cnt = 0
while line.strip()!="" and cnt < max:
    parseTimeCpuAndDisk(file, line)
    line = findTimestampLine(file)
    cnt = cnt + 1
   