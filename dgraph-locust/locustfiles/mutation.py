from locust import LoadTestShape, between, constant, events, tag
from locust.contrib.fasthttp import FastHttpUser
from mutation_taskset import MutationTaskset

class StartMutationTest(FastHttpUser):

    host = "http://localhost:8080"
    wait_time = between(0, 1)
    tasks = [MutationTaskset]

    @events.init.add_listener
    def on_locust_init(environment, **_kwargs):
        print("Init locust")
        # start_server_profiling_jobs()

    def on_stop(self):
        pass
        # stop_server_profiling_jobs()

    
# class StagesShape(LoadTestShape):

#     stages = [
#         {"duration": 5, "users": 100, "spawn_rate": 100},
#         {"duration": 30, "users": 250, "spawn_rate": 20},
#         {"duration": 60, "users": 500, "spawn_rate": 20},
#         {"duration": 90, "users": 1000, "spawn_rate": 20},
#         {"duration": 120, "users": 1500, "spawn_rate": 20},
#         {"duration": 150, "users": 1800, "spawn_rate": 20},
#         {"duration": 180, "users": 2100, "spawn_rate": 20},
#         {"duration": 210, "users": 2500, "spawn_rate": 50},
#         {"duration": 10800, "users": 3000, "spawn_rate": 50}
#     ]

#     def tick(self):
#         run_time = self.get_run_time()

#         for stage in self.stages:
#             if run_time < stage["duration"]:
#                 tick_data = (stage["users"], stage["spawn_rate"])
#                 return tick_data

#         return None