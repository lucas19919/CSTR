import handler
import controller

API_URL = "http://localhost:5053"

reactor = handler.Reactor() 
manager = handler.ApiManager(API_URL)

# Get initial status
manager.get_status(reactor)

# Modify parameters
reactor = controller.getNewSettings(reactor)

# Step simulation
manager.step_simulation(reactor, 0.001)