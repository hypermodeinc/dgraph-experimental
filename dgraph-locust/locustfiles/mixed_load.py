from locust import LoadTestShape, between, constant, events, tag
from locust.contrib.fasthttp import FastHttpUser
from mutation_taskset import MutationTaskset
from query_taskset import QueryTaskSet

class StartMutationTest(FastHttpUser):

    host = "http://localhost:8080"
    wait_time = between(0, 2)
    tasks = [MutationTaskset, QueryTaskSet]

    @events.init.add_listener
    def on_locust_init(environment, **_kwargs):
        print("Init locust")
        # start_server_profiling_jobs()

    def on_stop(self):
        pass
        # stop_server_profiling_jobs()

