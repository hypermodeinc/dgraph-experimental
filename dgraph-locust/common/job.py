from timeloop import Timeloop
from datetime import timedelta, datetime
import urllib.request
import requests


tl = Timeloop()


def stop_server_profiling_jobs():
    tl.stop()


def start_server_profiling_jobs():
    print("running jobs")

    tl.start()


@tl.job(interval=timedelta(seconds=30))
def cpu_profiling():
    print("running job to record cpu profile")
    now = datetime.now().strftime("%d_%m_%Y_%H_%M_%S")
    urllib.request.urlretrieve("http://localhost:8080/debug/pprof/profile?debug=2", "output/cpu/cpu" + now + ".pprof")


@tl.job(interval=timedelta(seconds=30))
def memory_profiling():
    print("running job to record memory profile")
    response = requests.get("http://localhost:8080/debug/pprof/heap?debug=2", stream=True)
    now = datetime.now().strftime("%d_%m_%Y_%H_%M_%S")
    file = open("output/heap/heap_" + now + ".pprof", "a+")
    for l in response.text.splitlines():
        file.write(l)
        file.write("\n")
    file.close()


@tl.job(interval=timedelta(seconds=30))
def go_routine_stack():
    print("running job to record goroutines")
    response = requests.get("http://localhost:8080/debug/pprof/goroutine?debug=2")
    now = datetime.now().strftime("%d_%m_%Y_%H_%M_%S")
    file = open("output/goroutine/routine_" + now + ".txt", "a+")
    for l in response.text.splitlines():
        file.write(l)
        file.write("\n")
    file.close()