import os
from time import time
from html import escape
from locust import between, events
from locust.contrib.fasthttp import FastHttpUser

from common.job import start_server_profiling_jobs, stop_server_profiling_jobs
from query_taskset import *

class StartQueryTest(FastHttpUser): # Main Class to start Load-test using a TaskSet
    host = "http://localhost:8080"
    wait_time = between(0, 2)
    tasks = [QueryTaskSet]

    @events.init.add_listener
    def on_locust_init(environment, **_kwargs):
        print("Init locust")
        # Uncomment below to start server profiling jobs 
        # start_server_profiling_jobs()

    def on_stop(self):
        pass
        # stop_server_profiling_jobs()

# Note: Please check the mutations.py example for an example on using a multi-stage load-shape. 