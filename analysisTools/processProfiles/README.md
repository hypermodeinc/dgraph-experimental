# profile image conversion scripts
These scripts take output from our semi-standard profiling script and convert golang binary profile output to .svg images.

The script to gather info is

    mkdir profiles && \
    for i in {1..120}; do
        D="$(date +"%H_%M_%S")" 
        curl http://localhost:8080/debug/pprof/profile?seconds=1 --output profiles/cpu-$D.out 
        curl http://localhost:8080/debug/pprof/trace?seconds=0.3 --output profiles/trace-$D.out 
        curl http://localhost:8080/debug/pprof/heap?seconds=1 --output profiles/heap-$D.out 
        curl http://localhost:8080/debug/pprof/goroutine?debug=2 --output profiles/stack-$D-1.out
        curl http://localhost:8080/debug/pprof/goroutine?debug=2 --output profiles/stack-$D-2.out
        curl http://localhost:8080/debug/pprof/goroutine?debug=2 --output profilesstack-$D-3.out
        curl -s localhost:8080/debug/jemalloc --output profiles/jem-$D.out
        iostat -xkt 1 5 > profiles/iostat-$D.out 
        echo "========== Ran at $D =========" 
        sleep 5
    done

The naming convention (cpu-*, trace-* etc. is used by these scripts to convert the right files)

## when to use
It is useful to graphically look at a lot of traces, so this helps with that.
Deeper analysis is possible by opening a more interesting profile via go tool pprof <fielname> and using `list` etc. to dig in deeper.

see https://www.notion.so/gohypermode/Observability-and-Tracing-52581d10103a41068f08049cae662298?pvs=4 for more info

## usage
usage is simply to run each python file without arguments. It will find the cpu, heap, trace files and convert them.