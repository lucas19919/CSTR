import requests
import json

class Reactor:
    def __init__(self):
        # Fixed
        self.inletConc = 0.0
        self.inletTemp = 0.0
        # Independent
        self.inletFlow = 0.0
        self.coolantTemp = 0.0
        # Dependent
        self.currentConc = 0.5
        self.currentTemp = 300.0

        #time
        self.deltaTime = 0

class ApiManager:
    def __init__(self, api_url):
        self.api_url = api_url

    def get_status(self, reactor_model: Reactor):
        call = f'{self.api_url}/reactor/status'
        
        try:
            response = requests.get(call, verify=False, timeout=5) 
            data = response.json()

            ops = data.get('operation', {}) 
            reactor_model.inletConc = ops.get('inletConcentration', 0)
            reactor_model.inletTemp = ops.get('inletTemperature', 0)
            reactor_model.inletFlow = ops.get('inletFlowrate', 0)
            reactor_model.coolantTemp = ops.get('coolantTemperature', 0)
            reactor_model.currentConc = ops.get('currentConcentration', 0)
            reactor_model.currentTemp = ops.get('currentTemperature', 0)
            reactor_model.deltaTime = ops.get('timeStep', 0.001)

        except Exception as e:
            print(f"Error getting status: {e}")

    def step_simulation(self, reactor_model: Reactor):
        call = f'{self.api_url}/reactor/step?dt={reactor_model.deltaTime}'
        
        payload = reactor_model.__dict__
        
        try:
            response = requests.post(call, json=payload, verify=False, timeout=5)
            data = response.json()
            print("Simulation Step Response:", data)
        except Exception as e:
            print(f"Error stepping simulation: {e}")